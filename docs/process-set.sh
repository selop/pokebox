#!/bin/bash
set -euo pipefail
#
# process-set.sh — Download, upscale, and process a card set for pokebox
#
# Produces the directory structure expected by cardCatalog.ts:
#   public/<setId>/fronts/{NNN}_front_2x.webp
#   public/<setId>/holo-masks/<setId>_{NNN}_{prefix}.foil_up.webp
#   public/<setId>/etch-foils/<setId>_{NNN}_{prefix}.etch_up.webp
#
# Usage:
#   ./process-set.sh <public_set_dir> [remote_json_url]
#
# Examples:
#   ./process-set.sh public/sv4-5_en https://example.com/sv-4-5.en-US.json
#   ./process-set.sh public/sv4-5_en   # reads local JSON from the set dir

ESRGAN="$HOME/Real-ESRGAN-0.3.0/inference_realesrgan.py"


# ── Validation ────────────────────────────────────────────────────────

if [[ -z "${1:-}" ]]; then
  echo "Usage: $0 <public_set_dir> [remote_json_url]"
  exit 1
fi

for cmd in jq magick cwebp python3 curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Missing required command: $cmd"
    exit 1
  fi
done

if [[ ! -f "$ESRGAN" ]]; then
  echo "Missing Real-ESRGAN at: $ESRGAN"
  exit 1
fi

FOLDER="$1"
REMOTE_JSON="${2:-}"
SET_ID="$(basename "$FOLDER")"


# ── Helpers ───────────────────────────────────────────────────────────

_log()  { echo "  $1 $2"; }
_step() { echo ""; echo "  $1 $2"; }
_sub()  { echo "    $1 $2"; }
_done() { echo "  $1 $2"; echo ""; }

# Extract prefix from longFormID: "Name_sv4-5_1_ph_Common_..." → "ph"
_get_prefix() {
  local result
  result="$(echo "$1" | sed -E 's/.*_[A-Za-z0-9][-A-Za-z0-9]*_[0-9]+_([a-z][a-z0-9]*)_.*/\1/')"
  if [[ "$result" == "$1" ]]; then
    echo "std"
  else
    echo "$result"
  fi
}

# Queue a URL+output pair into the curl config file
_queue_download() {
  local url="$1" output="$2" label="$3"
  if [[ -f "$output" ]]; then
    _sub "⏭️" "${label} (exists)"
  else
    _sub "🔻" "${label}"
    printf 'url="%s"\noutput="%s"\n\n' "$url" "$output" >> "$CURL_CONFIG"
  fi
}


# ── Create directories ───────────────────────────────────────────────

create_directories() {

  _step "📂" "Creating directories for ${SET_ID}"

  mkdir -p "$FOLDER/.staging"/{fronts,foils,etches,fronts_up,foils_up,etches_up}
  mkdir -p "$FOLDER"/{fronts,holo-masks,etch-foils}

}


# ── Fetch JSON ────────────────────────────────────────────────────────

fetch_json() {

  if [[ -n "$REMOTE_JSON" ]]; then

    _step "📃" "Fetching JSON from $REMOTE_JSON"
    JSON_FILE="$(mktemp)"
    curl -fsSL "$REMOTE_JSON" -o "$JSON_FILE"

  else

    local candidates=("${FOLDER}"/*.json)
    if [[ -f "${candidates[0]}" ]]; then
      JSON_FILE="${candidates[0]}"
      _step "📃" "Reading local JSON: $JSON_FILE"
    else
      _log "⛔" "No JSON found in ${FOLDER} and no URL provided"
      exit 1
    fi

  fi

}


# ── Download images ──────────────────────────────────────────────────

download_images() {

  CURL_CONFIG="$(mktemp)"

  _step "🔻" "Downloading images for ${SET_ID}"

  # Single jq call extracts all needed fields as TSV — no base64/decode loop
  jq -r '
    .[] |
    select(.foil.type != null and .foil.type != "None") |
    [
      .collector_number.numerator,
      .ext.tcgl.longFormID,
      (.images.tcgl.png.front  // ""),
      (.images.tcgl.png.foil   // ""),
      (.images.tcgl.png.etch   // "")
    ] | @tsv
  ' "$JSON_FILE" |
  while IFS=$'\t' read -r NUMBER LONG_ID FRONT_IMG FOIL_IMG ETCH_IMG; do

    local PREFIX
    PREFIX="$(_get_prefix "$LONG_ID")"

    if [[ -n "$FRONT_IMG" ]]; then
      local FRONT_NAME="${NUMBER}_front.png"
      _queue_download "$FRONT_IMG" "${FOLDER}/.staging/fronts/${FRONT_NAME}" "front ${FRONT_NAME}"
    fi

    if [[ -n "$FOIL_IMG" ]]; then
      local FOIL_NAME="${SET_ID}_${NUMBER}_${PREFIX}.foil.png"
      _queue_download "$FOIL_IMG" "${FOLDER}/.staging/foils/${FOIL_NAME}" "foil ${FOIL_NAME}"
    fi

    if [[ -n "$ETCH_IMG" ]]; then
      local ETCH_NAME="${SET_ID}_${NUMBER}_${PREFIX}.etch.png"
      _queue_download "$ETCH_IMG" "${FOLDER}/.staging/etches/${ETCH_NAME}" "etch ${ETCH_NAME}"
    fi

  done

  if [[ -s "$CURL_CONFIG" ]]; then
    echo ""
    curl --parallel --parallel-immediate --parallel-max 20 -fsSL --config "$CURL_CONFIG"
    echo ""
  fi

  rm -f "$CURL_CONFIG"

  _done "✅" "Downloads complete"

}


# ── Upscale batch ────────────────────────────────────────────────────
#
# Unified upscale function. Calls Real-ESRGAN ONCE per folder (model
# loads once, processes all images), then applies magick post-processing.
#
#   upscale_batch <label> <staging_subdir> <up_subdir> <out_dir> <out_suffix> <magick_args...>

upscale_batch() {
  local label="$1" staging_subdir="$2" up_subdir="$3" out_dir="$4" out_suffix="$5"
  shift 5
  local -a process_args=("$@")

  local src_dir="${FOLDER}/.staging/${staging_subdir}"
  local up_dir="${FOLDER}/.staging/${up_subdir}"
  local final_dir="${FOLDER}/${out_dir}"

  # check if there are any PNGs to process
  local has_files=false
  for f in "${src_dir}"/*.png; do
    [[ -f "$f" ]] && has_files=true && break
  done
  if [[ "$has_files" == false ]]; then
    _log "⏭️" "No ${label} to upscale, skipping"
    return
  fi

  local count
  count="$(ls "${src_dir}"/*.png 2>/dev/null | wc -l | tr -d ' ')"

  # Step 1: Batch upscale entire folder with Real-ESRGAN
  _step "🔼" "Upscaling ${label} (${count} images, batch MPS)"

  if ! python3 "$ESRGAN" \
    -n RealESRGAN_x4plus_anime_6B \
    -i "${src_dir}" \
    -o "${up_dir}/" \
    --suffix up \
    --alpha_upsampler bicubic \
    2>&1; then
    _log "⛔" "Real-ESRGAN batch failed for ${label}"
    return
  fi

  # Step 2: Post-process each upscaled image with magick
  _step "🔵" "Post-processing ${label}"

  for file in "${src_dir}"/*.png; do
    [[ -f "$file" ]] || continue

    local filename
    filename="$(basename "${file}" .png)"

    local upscaled="${up_dir}/${filename}_up.png"
    local final_png="${final_dir}/${filename}${out_suffix}.png"
    local final_webp="${final_dir}/${filename}${out_suffix}.webp"

    if [[ -f "$final_webp" ]]; then
      _sub "⏭️" "${filename} (exists)"
      continue
    fi

    if [[ ! -f "$upscaled" ]]; then
      _sub "⚠️" "${upscaled##*/} not found, skipping"
      continue
    fi

    magick "${upscaled}" "${process_args[@]}" "${final_png}"
  done

  _done "✅" "Done: ${label}"
}


# ── Compress to WebP ─────────────────────────────────────────────────

compress() {

  _step "🌐" "Converting to WebP"

  find "${FOLDER}/fronts" "${FOLDER}/holo-masks" "${FOLDER}/etch-foils" \
    -name '*.png' 2>/dev/null |
  while IFS= read -r file; do
    cwebp "${file}" -m 6 -mt -q 56 -alpha_q 62 -quiet -o "${file%.png}.webp"
  done

  _done "✅" "WebP conversion complete"

}


# ── Magick processing arrays ─────────────────────────────────────────

FRONT_ARGS=(-colorspace LAB -filter Lanczos2 -distort resize 50% -colorspace sRGB)

MASK_ARGS=(
  -alpha set -background none -channel A -evaluate multiply 8 +channel
  -modulate 100x0
  -colorspace LAB -filter Lanczos2 -distort resize 50% -colorspace sRGB
)

ETCH_ARGS=(
  -alpha set -background none -channel A -evaluate multiply 8 +channel
  -channel RGB -brightness-contrast 32x52
  -modulate 100x0
  -colorspace LAB -filter Lanczos2 -distort resize 50% -colorspace sRGB
)


# ── Main ──────────────────────────────────────────────────────────────

echo ""
echo "  🃏 process-set: ${SET_ID}"
echo ""

time {

  create_directories

  fetch_json
  download_images

  upscale_batch "fronts"         "fronts"  "fronts_up"  "fronts"      "_2x" "${FRONT_ARGS[@]}"
  upscale_batch "foils → masks"  "foils"   "foils_up"   "holo-masks"  "_up" "${MASK_ARGS[@]}"
  upscale_batch "etches → foils" "etches"  "etches_up"  "etch-foils"  "_up" "${ETCH_ARGS[@]}"

  compress

}
