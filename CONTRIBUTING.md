# Contributing to Pokebox

Thanks for your interest in contributing to Pokebox! This guide will help you get set up and submit your first contribution.

## Getting Started

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Start the dev server:
   ```bash
   bun dev
   ```
4. Open <http://localhost:5173> in your browser

## Development Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b my-feature
   ```
2. Make your changes
3. Run lint and tests before pushing:
   ```bash
   bun run lint
   bun run format
   bun test:unit
   ```
4. Push and open a pull request targeting `main`

## Code Style

Code style is enforced by oxlint, eslint, and prettier:

```bash
bun run lint     # oxlint + eslint with auto-fix
bun run format   # prettier on src/
```

Key conventions:

- **Path alias**: `@/` maps to `src/`
- **Shader uniforms**: prefixed with `u` (e.g. `uCardTex`), varyings with `v` (e.g. `vUv`)
- **Three.js objects**: use `shallowRef` to avoid deep reactivity overhead
- **Scene units**: `worldScale` is `1.0` — one unit equals one centimeter

## Testing

Always use the specific test commands — **do not use bare `bun test`**, as it invokes Bun's built-in test runner which lacks the required Vite path aliases and plugin support.

| Command | What it runs |
|---------|-------------|
| `bun test:unit` | All unit tests (includes shader tests) |
| `bun test:shader` | Shader compilation and validation tests |
| `bun test:e2e` | Playwright end-to-end tests |
| `bun test:assets` | Texture file verification (optional — needs local card assets) |

## Shader Changes

If you modify any GLSL shader files:

1. **Always run `bun test:shader`** to catch compilation errors before runtime
2. **Update all related files in a single pass** when adding or modifying shader uniforms:
   - The shader file (`.glsl` / `.frag`)
   - `src/data/shaderRegistry.ts` (uniform-to-config mapping)
   - `src/data/defaults.ts` (default values)
   - `src/types/` (AppConfig type)
   - `src/components/ShaderControlsPanel.vue` (UI controls)
3. When modifying shared includes (`src/shaders/common/*.glsl`), be aware that changes affect **all** shaders that include them — run the full shader test suite and visually verify

See [`docs/SHADER-TESTING.md`](docs/SHADER-TESTING.md) for detailed testing documentation.

## Pull Requests

- Describe what your changes do and why
- Reference related issues (e.g. "Fixes #42")
- Make sure CI passes (lint, type-check, tests)
- All PRs target `main`
- **No 100% AI-generated PRs.** Using AI tools to help with your changes is fine, but it should be clear that a human understood, shaped, and reviewed the contribution. PRs that are entirely machine-generated with no visible human involvement will be closed.

## Issues

Use the provided issue templates when filing bugs or requesting features. Include as much detail as you can — steps to reproduce, browser/device info, and screenshots are especially helpful for visual bugs.

## Code of Conduct

Be respectful, constructive, and welcoming. We're all here because we like Pokemon cards and cool web tech. Harassment, discrimination, or abusive behavior will not be tolerated.
