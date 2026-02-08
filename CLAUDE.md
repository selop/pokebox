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
4. **Card shader** (`holo.frag`) composites multiple effect layers driven by the eye-to-card vector:
   - **Mask layer** (holo): rainbow sunpillar gradient + scanlines + diagonal bars + spotlight, blended via color-dodge / soft-light / overlay
   - **Foil layer** (etched): diagonal rainbow with high-frequency grain, blended via color-dodge + specular overlay
   - Both are masked by separate grayscale textures (`uMaskTex`, `uFoilTex`)

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

Each `CardCatalogEntry` defines three texture paths (relative to `public/`):
- `front` — base card image
- `mask` — grayscale holo area mask (white = rainbow effect)
- `foil` — grayscale etched foil mask (empty string = no foil)

`useCardLoader` loads all non-empty textures in parallel and resolves when all are ready. `buildCardMesh` uses `ShaderMaterial` when any effect texture is present, otherwise falls back to `MeshBasicMaterial`.

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
