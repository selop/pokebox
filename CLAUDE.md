# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview section

This project is a Vue 3 + TypeScript + Three.js Pokemon card viewer with GLSL shaders.

## Commands

```bash
bun dev              # Start Vite dev server with HMR
bun run build        # Type-check (vue-tsc) + production build (Vite)
bun run lint         # Run oxlint + eslint with auto-fix
bun run format       # Prettier on src/
bun test:unit        # Run all unit tests (includes shader tests)
bun test:assets      # Verify texture files match set JSON (optional — needs local assets)
bun test:shader      # Run shader compilation and validation tests
bun test:e2e         # Playwright end-to-end tests
```

**Do NOT use bare `bun test`** — it invokes Bun's built-in test runner which lacks Vite's `@/` path aliases, `vite-plugin-glsl` imports, and Playwright's test harness. Always use the specific commands above (`bun test:unit`, `bun test:shader`, `bun test:e2e`).

## Architecture

Pokebox is a Vue 3 + Three.js app that creates a parallax "window into a box" effect using real-time face tracking. The webcam tracks the user's head position and adjusts an off-axis perspective camera so the screen appears as a physical window into a 3D scene containing holographic Pokémon cards.

### Rendering pipeline

1. **Face tracking** (`useFaceTracking`) polls MediaPipe for head position → writes to `store.targetEye`
2. **Scene loop** (`useThreeScene.animate`) smoothly interpolates eye position, computes off-axis projection matrix, updates shader uniforms per frame
3. **Off-axis camera** maps real-world eye coordinates to an asymmetric frustum so the 3D scene responds to head movement
4. **Card shaders** — Each card uses one of several holo shader types, automatically selected based on card type:
   - **Illustration Rare** (`illustration-rare.frag`): Multiple vertical rainbow bands with diagonal bars + glare, matching Pokémon illustration rare holo cards
   - **Regular Holo** (`regular-holo.frag`): Diagonal rainbow gradient with rotating bar patterns + layered radial glare, matching standard holo cards
   - **Special Illustration Rare** (`special-illustration-rare.frag`): Diagonal rainbow + fine line texture + three iridescent texture layers (iri-7, iri-8, iri-9) with pointer-responsive shifts + derived-gradient sparkle on etch relief that uses dFdx/dFdy of the foil texture as pseudo surface normals so sparkle bands follow embossed contours rather than sweeping in straight lines, with iri-1/iri-2 textures for per-texel variation, matching special illustration rare cards with silvery holographic finish. See `docs/shaders/special-illustration-rare.md`.
   - **Double Rare** (`double-rare.frag`): Birthday holo with grain texture, dual dank textures, and tilt-revealed sparkles
   - **Ultra Rare** (`ultra-rare.frag`): Metallic sparkle with fully parameterized brightness/contrast/bar controls
   - **Rainbow Rare** (`rainbow-rare.frag`): Metallic sparkle spotlight + iridescent glitter from iri-7 texture, for etched SV_ULTRA double rares
   - **Tera Rainbow Rare** (`tera-rainbow-rare.frag`): Rainbow holo overlay + metallic sparkle spotlight + dual etch sparkle layers, for Tera-tagged special illustration rares
   - **Master Ball** (`master-ball.frag`): Etch foil composite on card base for RAINBOW+ETCHED masterball holo cards
   - Shared GLSL functions live in `src/shaders/common/` and are included via `#include` (resolved by `vite-plugin-glsl`):
     - `common/blend.glsl` — blend modes (overlay, screen, color-dodge, hard-light, etc.)
     - `common/filters.glsl` — adjustBrightness, adjustContrast, adjustSaturate
     - `common/rainbow.glsl` — getSunColor, sunpillarGradient (6-hue rainbow palette)
     - `common/base-adjust.glsl` — unified brightness/contrast/saturation adjustment helper
     - `common/holo-shine.glsl` — classic TCG holo shine with mask-driven rainbow overlay at configurable angles
   - All holo types use the same base uniforms and are masked by grayscale textures (`uMaskTex`, `uFoilTex`)
   - Special illustration rare, ultra rare, and rainbow rare use iridescent textures loaded from `public/img/151/iri-{7,8,9}.webp`
   - Special illustration rare additionally loads sparkle iri textures from `public/img/151/iri-{1,2}.webp` for the tilt sparkle effect (loaded via `useCardLoader.loadSparkleIriTextures()`)

### Shader selection logic

Cards are assigned a `holoType` automatically by `mapHoloType()` in `cardCatalog.ts` based on the JSON metadata's `rarity.designation` and `foil.type`/`foil.mask` fields:

| Rarity | Foil Type | Shader |
|--------|-----------|--------|
| any | `RAINBOW` + `ETCHED` mask | `master-ball` |
| `SHINY_RARE` | any | `shiny-rare` |
| `SHINY_ULTRA_RARE` | any | `ultra-rare` |
| `SPECIAL_ILLUSTRATION_RARE` | `TERA` + `SHINY` tags | `tera-shiny-rare` |
| `SPECIAL_ILLUSTRATION_RARE` | `TERA` tag | `tera-rainbow-rare` |
| `SPECIAL_ILLUSTRATION_RARE` / `HYPER_RARE` / `MEGA_HYPER_RARE` | any | `special-illustration-rare` |
| `MEGA_ATTACK_RARE` | any | `tera-rainbow-rare` |
| `ULTRA_RARE` / `ACE_SPEC_RARE` | any | `ultra-rare` |
| `DOUBLE_RARE` | `TERA` or `MEGA_EVOLUTION` tag | `tera-rainbow-rare` |
| `DOUBLE_RARE` | `SUN_PILLAR` | `double-rare` |
| `DOUBLE_RARE` | `SV_ULTRA` + `ETCHED` mask | `rainbow-rare` |
| `DOUBLE_RARE` / `ILLUSTRATION_RARE` | other | `illustration-rare` |
| `RARE` | `SV_HOLO` | `regular-holo` |
| `COMMON` / `UNCOMMON` / `RARE` (other) | any | `reverse-holo` |

### Key modules

| Directory           | Role                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/stores/app.ts` | Single Pinia store — all global state (config, eye position, card selection, scene mode, set switching, mobile detection, pack opening animation state machine) |
| `src/composables/`  | Vue composables: `useThreeScene` (scene + render loop), `useCardLoader` (texture loading), `useFaceTracking` (MediaPipe), `useKeyboard`, `useFullscreen`     |
| `src/three/`        | Three.js builders: `buildCard` (card mesh + shader material), `buildBox` (shell geometry), `buildFurniture` (procedural objects), `CardSceneBuilder` (card scene orchestration), `CardNavigator` (card navigation), `MergeAnimator` (card transitions), `geometryHelpers`, `utils` |
| `src/shaders/`      | GLSL fragment shaders; shared functions in `common/` subdir, included via `#include` (resolved by `vite-plugin-glsl`)                                        |
| `src/data/`         | `cardCatalog.ts` (JSON-driven card catalog with `SET_REGISTRY` and `loadSetCatalog()`), `defaults.ts` (initial config values), `heroShowcase.ts` (curated cross-set hero cards for carousel) |
| `src/types/`        | TypeScript interfaces: `AppConfig`, `CardCatalogEntry`, `SetDefinition`, `SetCardJson`, `CardTransform`, `EyePosition`, `DerivedDimensions`, `HoloType`, `ShaderStyle` |
| `docs/`             | `CARD-SETS.md` (card set system documentation, adding new sets), `SHADER-TESTING.md`                                                                         |

### Card catalog & texture system

The card catalog is **JSON-driven and supports multiple sets**. Card sets are defined in `SET_REGISTRY` (`src/data/cardCatalog.ts`) and their metadata is fetched at runtime from JSON files under `public/<setId>/`.

- `CARD_CATALOG` is a `shallowRef<CardCatalogEntry[]>` that updates reactively when switching sets
- `loadSetCatalog(setId)` fetches the set's JSON, filters to foil-only entries, picks the best foil variant per card number (priority: RAINBOW > non-FLAT_SILVER > FLAT_SILVER), and builds texture paths
- File variant prefixes (e.g., `ph`, `std`, `mph`, `ph2`) are extracted from the JSON `longFormID` field by a set-code-agnostic regex in `extractPrefix()`

Each `CardCatalogEntry` defines texture paths and shader type (relative to `public/`):

- `front` — base card image (`<setId>/fronts/{NNN}_front_2x.webp`)
- `mask` — grayscale holo area mask (`<setId>/holo-masks/<setId>_{NNN}_{prefix}.foil_up.webp`)
- `foil` — grayscale etched foil texture (empty string = no etch; `<setId>/etch-foils/<setId>_{NNN}_{prefix}.etch_up.webp`)
- `holoType` — which holo shader to use (see shader selection logic above)

`useCardLoader` loads all non-empty textures in parallel with error callbacks for graceful fallback on missing files. `buildCardMesh` uses `ShaderMaterial` when any effect texture is present (selecting the appropriate fragment shader based on `holoType`), otherwise falls back to `MeshBasicMaterial`. The texture cache is cleared when switching sets to free GPU memory.

See `docs/CARD-SETS.md` for detailed documentation on the set system, JSON format, and how to add new sets.

### Cross-origin asset loading (CORS)

In production, card assets are served from Hetzner Object Storage (`pokebox-assets.fsn1.your-objectstorage.com`) while the app runs on `pokebox.lopatkin.net`. The `VITE_ASSET_BASE_URL` env var (set in CI) prefixes all asset paths via `assetUrl()` in `src/utils/assetUrl.ts`.

**CORS bucket policy** is configured on the S3 bucket to allow `GET`/`HEAD` from the app origin. To update:

```bash
rclone backend setxml hetzner:pokebox-assets/?cors - <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://pokebox.lopatkin.net</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>86400</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
EOF
```

**Client-side CORS requirements:**

- Three.js v0.182+ `TextureLoader` defaults to `crossOrigin: 'anonymous'`, so WebGL texture loads automatically send the `Origin` header
- **Any `<img>` tag that loads an asset URL MUST include `crossorigin="anonymous"`** — without it, the browser caches the response from a no-cors request (no `Access-Control-Allow-Origin` header), and when Three.js later requests the same URL with CORS, the browser serves the stale cached response and fails. This cache-poisoning bug is subtle: it only manifests when an `<img>` loads an asset before the TextureLoader does (e.g., search thumbnails in `CardSearch.vue`)

### Asset processing scripts

- **`process-set.sh`** — Main unified pipeline: downloads card images, upscales with Real-ESRGAN, and produces the `public/<setId>/` directory structure (fronts, holo-masks, etch-foils) expected by `cardCatalog.ts`

### Booster pack opening animation

Clicking a booster pack in the modal triggers a cinematic "tear open" sequence coordinated across CSS and Three.js:

1. **CSS phases** (`BoosterPackModal.vue`): focus (0.5s slide-to-center + golden glow) → shake (0.3s wobble) → burst (0.4s scale-up + radial flash)
2. **Set loading** runs in parallel with CSS animation via `store.openPack(setId)`
3. **Cascade** (`useThreeScene`): once CSS finishes and set is loaded, `packOpeningPhase` transitions to `'cascade'`, closing the modal and triggering a fan rebuild with `introOrigin` at screen center — cards burst from a single point
4. **State machine** (`store.packOpeningPhase`): `idle` → `css-anim` → `cascade` → `idle` (or `css-anim` → `waiting-load` → `cascade` on slow networks)

The config/displayCardIds watchers in `useThreeScene` skip rebuilds during `css-anim`/`waiting-load` phases to prevent the fan intro from firing twice.

**Fan ↔ single interaction**: Click a fan card to zoom into single mode. Click empty box space (miss the card) in single mode to return to fan. The toolbar dropdown `switchSet()` bypasses the animation entirely.

### Hero carousel

On desktop startup (when no URL params override), the app enters a hero showcase carousel — a cover-flow layout with 5 visible cards from curated `HERO_SHOWCASE` entries spanning multiple sets. The center card is full-size and face-on, side cards are progressively smaller, Y-rotated, and Z-recessed. All hero cards are built once (not rebuilt on each advance); `updateCarouselTargets()` updates lerp targets and the animation loop smoothly slides cards to new positions. Auto-rotates every 4s; N/B keys rotate manually and reset the timer. Any user interaction (set change, card select, toolbar click) exits carousel via `stopHeroShowcase()`.

### State-driven rebuilds

The scene watches store properties and rebuilds accordingly:

- **Full rebuild** (clears scene): screen dimensions, box depth, scene mode, render mode changes
- **Transform update** (no rebuild): card position/rotation changes
- **Uniform update** (no rebuild): holo intensity, eye position, time

### Deployment

The app is containerized with Docker (`Dockerfile` + `docker-compose.yml`):
- Multi-stage build: Node 22 builder → Nginx Alpine serving the Vite production bundle
- Nginx exposes `/health` (healthcheck) and `/nginx_status` (metrics scraping, Docker-internal only)
- The app container joins an external `monitoring` Docker network
- Watchtower label enabled for automatic image updates
- Monitoring stack (Prometheus + Grafana) lives in a separate repo (`pokebox-observability`)

## Conventions

- Path alias `@/` → `src/`
- Shader uniforms prefixed `u` (e.g. `uCardTex`), varyings prefixed `v` (e.g. `vUv`)
- Use `shallowRef` for Three.js objects to avoid deep reactivity overhead
- `worldScale` is `1.0` — scene units equal centimeters
- Card assets live under `public/<setId>/{fronts,holo-masks,etch-foils}/` (one directory per set)
- Seeded PRNG (`mulberry32`) for reproducible procedural layouts
- MediaPipe is dynamically imported to avoid bundling the full library
- Mobile detection (`store.isMobile`) is evaluated once in the Pinia store; on mobile, `cardDisplayMode` defaults to `'single'` and the display mode dropdown is hidden
- Card display modes: `single` (one card), `fan` (7-card hand), `carousel` (cover-flow hero showcase across multiple sets)
- Hero carousel uses compound IDs (`setId:cardId`) and `loadHeroCatalog()` to resolve cards across different sets; compound-keyed textures are protected from `clearCache()` on set switch

## Testing

### Shader Testing

**IMPORTANT**: Always run shader tests after modifying GLSL shaders to catch compilation errors before runtime.

```bash
bun test:shader  # Run all shader tests (~1 second)
```

The shader test suite (`src/shaders/__tests__/`) includes:

1. **Static Validation** (`shader-validation.test.ts`)
   - Detects undefined function calls (e.g., missing blend mode functions)
   - Validates all uniforms and varyings are declared
   - Checks for balanced braces and parentheses
   - Verifies `gl_FragColor` is set and precision is declared
   - Runs instantly without WebGL context

2. **Compilation Tests** (`shader-compilation.test.ts`)
   - Creates ShaderMaterial for each shader variant
   - Verifies Three.js can parse shaders without errors
   - Validates uniform configuration

**When adding new shaders**:

1. Use shared includes (`#include "common/blend.glsl"`, etc.) instead of copy-pasting blend modes/filters
2. Add shader to both test files
3. List required uniforms in compilation test
4. Run `bun test:shader` to verify
5. Add uniforms to `AppConfig` type, `defaults.ts`, and `buildCard.ts`

**When modifying shader uniforms**:

or adding new visual controls, ALWAYS update all related files in a single pass: the shader (.glsl/.frag), the Vue component (ShaderControlsPanel.vue), the defaults file (defaults.ts), and the store. Do not consider the task complete until all four are updated.

**When modifying shared includes** (`src/shaders/common/*.glsl`):

- Changes affect ALL shaders that include them — run `bun test:shader` and visually verify
- Never remove a function from a shared include without checking all consuming shaders

**Common errors caught by tests**:

- Undefined blend mode functions (e.g., `blendScreen` not defined)
- Missing uniform declarations
- Type mismatches in GLSL operations
- Syntax errors (missing semicolons, unbalanced braces)

See `docs/SHADER-TESTING.md` for detailed testing documentation.

### Asset Integrity Testing

```bash
bun test:assets  # Optional — requires card assets in public/
```

The asset integrity test (`src/data/__tests__/asset-integrity.test.ts`) verifies that every texture path generated by the card catalog logic has a matching file on disk. For each set in `SET_REGISTRY`, it reads the set JSON, runs the same `pickBestFoilEntry` + `extractPrefix` logic as the runtime, and checks that front, holo-mask, and etch-foil files exist under `public/`. This test is **excluded from `bun test:unit`** because contributors typically don't have the full card asset sets locally. Run it after processing a new set or renaming asset files.
