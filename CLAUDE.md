# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev              # Start Vite dev server with HMR
bun run build        # Type-check (vue-tsc) + production build (Vite)
bun run lint         # Run oxlint + eslint with auto-fix
bun run format       # Prettier on src/
bun run test:e2e     # Playwright end-to-end tests
```

## Architecture

Pokebox is a Vue 3 + Three.js app that creates a parallax "window into a box" effect using real-time face tracking. The webcam tracks the user's head position and adjusts an off-axis perspective camera so the screen appears as a physical window into a 3D scene containing holographic Pokémon cards.

### Rendering pipeline

1. **Face tracking** (`useFaceTracking`) polls MediaPipe for head position → writes to `store.targetEye`
2. **Scene loop** (`useThreeScene.animate`) smoothly interpolates eye position, computes off-axis projection matrix, updates shader uniforms per frame
3. **Off-axis camera** maps real-world eye coordinates to an asymmetric frustum so the 3D scene responds to head movement
4. **Card shaders** — Each card uses one of two holo shader types, automatically selected based on card type:
   - **Illustration Rare** (`illustration-rare.frag`): Multiple vertical rainbow bands with diagonal bars + glare, matching Pokémon illustration rare holo cards
   - **Regular Holo** (`regular-holo.frag`): Diagonal rainbow gradient with rotating bar patterns + layered radial glare, matching standard holo cards
   - **Parallax** (`parallax.frag`): Alternative shader with parallax offset effect (global toggle)
   - Both holo types use the same uniforms and are masked by grayscale textures (`uMaskTex`, `uFoilTex`)

### Shader selection logic

- Cards are assigned a `holoType` in `cardCatalog.ts` based on their card number:
  - Cards in `HOLO_SV_HOLO` set → `'regular-holo'`
  - Cards in `HOLO_SUN_PILLAR` set → `'illustration-rare'`
- The global shader toggle (H key / toolbar button) can override to `'parallax'` mode for all cards
- When not in parallax mode, each card uses its assigned `holoType`

### Key modules

| Directory | Role |
|-----------|------|
| `src/stores/app.ts` | Single Pinia store — all global state (config, eye position, card selection, scene mode) |
| `src/composables/` | Vue composables: `useThreeScene` (scene + render loop), `useCardLoader` (texture loading), `useFaceTracking` (MediaPipe), `useKeyboard`, `useFullscreen` |
| `src/three/` | Three.js builders: `buildCard` (card mesh + shader material), `buildBox` (shell geometry), `buildFurniture` (procedural objects), `geometryHelpers`, `utils` |
| `src/shaders/` | GLSL shaders imported as strings via `vite-plugin-glsl` |
| `src/data/` | `cardCatalog.ts` (card entries with front/mask/foil texture paths), `defaults.ts` (initial config values) |
| `src/types/` | TypeScript interfaces: `AppConfig`, `CardCatalogEntry`, `CardTransform`, `EyePosition`, `DerivedDimensions` |

### Card catalog & texture system

Each `CardCatalogEntry` defines texture paths and shader type (relative to `public/`):
- `front` — base card image
- `mask` — grayscale holo area mask (white = rainbow effect)
- `foil` — grayscale etched foil mask (empty string = no foil)
- `holoType` — which holo shader to use: `'illustration-rare'` or `'regular-holo'`

`useCardLoader` loads all non-empty textures in parallel and resolves when all are ready. `buildCardMesh` uses `ShaderMaterial` when any effect texture is present (selecting the appropriate fragment shader based on `holoType`), otherwise falls back to `MeshBasicMaterial`.

### State-driven rebuilds

The scene watches store properties and rebuilds accordingly:
- **Full rebuild** (clears scene): screen dimensions, box depth, scene mode, render mode changes
- **Transform update** (no rebuild): card position/rotation changes
- **Uniform update** (no rebuild): holo intensity, eye position, time

## Conventions

- Path alias `@/` → `src/`
- Shader uniforms prefixed `u` (e.g. `uCardTex`), varyings prefixed `v` (e.g. `vUv`)
- Use `shallowRef` for Three.js objects to avoid deep reactivity overhead
- Card assets live under `public/cards/{fronts,masks,foils}/`
- Seeded PRNG (`mulberry32`) for reproducible procedural layouts
- MediaPipe is dynamically imported to avoid bundling the full library
