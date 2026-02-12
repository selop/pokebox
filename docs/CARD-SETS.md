# Card Set System

Pokebox uses a JSON-driven catalog system that loads card sets at runtime. Each set is self-contained under `public/<setId>/` and described by a metadata JSON file.

## Current Sets

| Set ID | Label | Cards | JSON File |
|--------|-------|-------|-----------|
| `sv3-5_en` | SV 151 | 207 | `sv3-5.en-US.json` |
| `sv8-5_en` | SV Prismatic | 180 | `sv8-5.en-US.json` |

## Directory Structure

Each set lives under `public/<setId>/`:

```
public/
  sv3-5_en/
    sv3-5.en-US.json          # Set metadata (card names, rarities, foil types)
    fronts/
      001_front_2x.webp       # Card art images
      002_front_2x.webp
      ...
    holo-masks/
      sv3-5_en_001_ph.foil_up.webp    # Holographic effect masks
      sv3-5_en_003_std.foil_up.webp
      ...
    etch-foils/
      sv3-5_en_182_std.etch_up.webp   # Etched foil textures (subset of cards)
      ...
```

### File Naming Conventions

- **Fronts**: `{cardNum}_front_2x.webp` — zero-padded 3-digit card number
- **Holo masks**: `{setId}_{cardNum}_{prefix}.foil_up.webp` — prefix is the variant (`ph`, `std`, `mph`)
- **Etch foils**: `{setId}_{cardNum}_{prefix}.etch_up.webp` — same prefix as mask

The `prefix` (variant) is extracted from the JSON metadata's `longFormID` field, which encodes it as the 4th segment: `Name_setCode_num_PREFIX_Rarity_FoilType_FoilMask`.

## JSON Metadata Format

The set JSON file is an array of card entries. Each card number can have multiple entries (non-foil, reverse holo, masterball holo, etc.). The catalog system **only loads entries that have a `foil` attribute** — non-foil variants are skipped.

### Key Fields Used

```json
{
  "name": "Ivysaur",
  "collector_number": {
    "numerator": "002",
    "numeric": 2
  },
  "rarity": {
    "designation": "UNCOMMON"
  },
  "foil": {
    "type": "FLAT_SILVER",
    "mask": "REVERSE"
  },
  "ext": {
    "tcgl": {
      "longFormID": "Ivysaur_sv3-5_2_ph_Uncommon_FlatSilver_Reverse"
    }
  }
}
```

- **`foil`** — Must be present (non-null) for the entry to be included. Entries without `foil` are non-holo variants and are filtered out.
- **`foil.type`** — Determines holo shader type (see mapping below)
- **`foil.mask`** — `ETCHED` entries get etch foil textures loaded; `REVERSE`/`HOLO` do not
- **`rarity.designation`** — Combined with foil type to select the shader
- **`longFormID`** — File variant prefix is extracted from this (e.g., `ph`, `std`, `mph`)

### Foil Priority

When a card number has multiple foil entries, the best one is selected:

1. `RAINBOW` foil (masterball holo) — highest priority
2. Any non-`FLAT_SILVER` foil (SUN_PILLAR, SV_HOLO, SV_ULTRA, etc.)
3. `FLAT_SILVER` foil (standard reverse holo) — fallback

## Rarity-to-Shader Mapping

The combination of `rarity.designation` and `foil.type`/`foil.mask` determines which GLSL shader renders the card:

| Rarity | Foil Type | Foil Mask | Shader |
|--------|-----------|-----------|--------|
| any | `RAINBOW` | `ETCHED` | `master-ball` |
| `SPECIAL_ILLUSTRATION_RARE` | any | any | `special-illustration-rare` |
| `HYPER_RARE` | any | any | `special-illustration-rare` |
| `ULTRA_RARE` | any | any | `ultra-rare` |
| `ACE_SPEC_RARE` | any | any | `ultra-rare` |
| `DOUBLE_RARE` | `SUN_PILLAR` | any | `double-rare` |
| `DOUBLE_RARE` | other | any | `illustration-rare` |
| `ILLUSTRATION_RARE` | any | any | `illustration-rare` |
| `RARE` | `SV_HOLO` | any | `regular-holo` |
| `RARE` | other | any | `reverse-holo` |
| `COMMON` / `UNCOMMON` | `FLAT_SILVER` | any | `reverse-holo` |

## Adding a New Set

### 1. Prepare Assets

Create the directory structure under `public/`:

```
public/<setId>/
  <setCode>.en-US.json
  fronts/
  holo-masks/
  etch-foils/       # only if the set has etched cards
```

- **Set ID** format: `<setCode>_en` (e.g., `sv7_en`)
- **Fronts**: one `{NNN}_front_2x.webp` per card
- **Holo masks**: one `{setId}_{NNN}_{prefix}.foil_up.webp` per card
- **Etch foils**: one `{setId}_{NNN}_{prefix}.etch_up.webp` per etched card

### 2. Register the Set

Add an entry to `SET_REGISTRY` in `src/data/cardCatalog.ts`:

```ts
export const SET_REGISTRY: SetDefinition[] = [
  { id: 'sv3-5_en', label: 'SV 151', jsonFile: 'sv3-5_en/sv3-5.en-US.json' },
  { id: 'sv8-5_en', label: 'SV Prismatic', jsonFile: 'sv8-5_en/sv8-5.en-US.json' },
  // Add new set here:
  { id: 'sv7_en', label: 'SV Crown Zenith', jsonFile: 'sv7_en/sv7.en-US.json' },
]
```

Fields:

| Field | Description |
|-------|-------------|
| `id` | Directory name under `public/`, used in all texture paths |
| `label` | Display name shown in the toolbar dropdown |
| `jsonFile` | Path to JSON metadata file, relative to `public/` |

### 3. Handle Prefix Mapping (if needed)

If the JSON `longFormID` uses a prefix that doesn't match the actual filenames (e.g., JSON says `sph` but files use `mph`), add a mapping in `extractPrefix` / the mask prefix logic in `loadSetCatalog`:

```ts
// In loadSetCatalog, after extractPrefix:
const maskPrefix = jsonPrefix === 'sph' ? 'mph' : jsonPrefix
```

### 4. Verify

```bash
bun dev                # Check set loads in toolbar dropdown
bun run build          # Verify TypeScript compilation
bun test:shader        # Verify shaders still pass
```

Navigate through the new set's cards to confirm textures load correctly. Cards with missing mask/etch files will gracefully fall back to rendering without holo effects.

## Architecture

### Runtime Flow

1. User selects a set from the toolbar dropdown
2. `store.switchSet(setId)` is called
3. `loadSetCatalog(setId)` fetches the JSON (cached after first load), filters to foil-only entries, groups by card number, picks the best foil variant per card, and builds `CardCatalogEntry[]`
4. `CARD_CATALOG` (a `shallowRef`) is updated with the new entries
5. `displayCardIds` recomputes, triggering the texture loader
6. `useCardLoader` loads front + mask + etch textures for visible cards
7. Scene rebuilds with the new card meshes

### Key Files

| File | Role |
|------|------|
| `src/data/cardCatalog.ts` | `SET_REGISTRY`, `CARD_CATALOG` ref, `loadSetCatalog()` |
| `src/types/index.ts` | `SetDefinition`, `SetCardJson`, `CardCatalogEntry`, `HoloType` |
| `src/stores/app.ts` | `currentSetId`, `switchSet()`, `displayCardIds` |
| `src/composables/useCardLoader.ts` | Texture loading with cache + error handling |
| `src/components/ToolbarButtons.vue` | Set selector dropdown UI |
