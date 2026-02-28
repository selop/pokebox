---
name: pokebox-fragment-shader
description: Edit Fragment Shader & Create UI Controls
---

## Step-by-step checklist

When adding or modifying a shader uniform with a UI slider, **always update all 6 files in a single pass**.

When **adding an entirely new shader**, also update `src/types/index.ts` (add to `ShaderStyle`, `HoloType` unions, add config interface, add to `ShaderConfigs`), `src/data/cardCatalog.ts` (map rarity to new holo type), and both test files (`shader-compilation.test.ts`, `shader-validation.test.ts`).

| #   | File                                     | What to do                                                                                                          |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/shaders/<shader>.frag`              | Declare `uniform float uMyParam;` and use it in shader logic                                                        |
| 2   | `src/types/index.ts`                     | Add `myParam: number` to the shader's config interface (e.g. `FlatsilverReverseConfig`), and add to `ShaderConfigs` |
| 3   | `src/data/defaults.ts`                   | Add `myParam: <default>,` to the shader's defaults section                                                          |
| 4   | `src/data/shaderRegistry.ts`             | Add `{ uniform: 'uMyParam', configPath: 'shaderKey.myParam' }` to the shader's registry entry                      |
| 5   | `src/three/buildCard.ts`                 | Import the shader frag and add to `FRAGMENT_SHADERS` map (only for new shaders)                                     |
| 6   | `src/components/ShaderControlsPanel.vue` | Add slider definition to the shader's `sections` entry — **this is the UI; without it the user has no controls**    |

## Naming conventions

- **Shader uniform**: `u` prefix, PascalCase — `uGlareContrast`
- **Config key**: camelCase property on the shader config interface — `glareContrast`
- **Registry configPath**: `shaderKey.propertyName` — `flatsilverReverse.rainbowScale`
- **Slider label**: Short human-readable — `'Glare contrast'`

## Shader prefixes by type

| Shader file                      | shaderKey (in types/defaults/registry) |
| -------------------------------- | -------------------------------------- |
| `illustration-rare.frag`         | `illustrationRare`                     |
| `special-illustration-rare.frag` | `specialIllustrationRare`              |
| `tera-rainbow-rare.frag`         | `teraRainbowRare`                      |
| `tera-shiny-rare.frag`           | `teraShinyRare`                        |
| `ultra-rare.frag`                | `ultraRare`                            |
| `rainbow-rare.frag`              | `rainbowRare`                          |
| `reverse-holo.frag`              | `reverseHolo`                          |
| `flatsilver-reverse.frag`        | `flatsilverReverse`                    |
| `master-ball.frag`               | `masterBall`                           |
| `shiny-rare.frag`                | `shinyRare`                            |

## Slider definition format

```ts
{ label: 'My param', prop: 'myParam', min: 0, max: 5, step: 0.05 }
// Optional suffix for display: suffix: '%' (multiplies by 100) or suffix: '°'
// Use { subsection: 'Section Name' } to group sliders visually
```

## Common pitfalls

1. **Forgetting `ShaderControlsPanel.vue`** — the shader will work but users will see "No controls available for this shader yet." instead of sliders. Every shader with configurable uniforms needs a `sections` entry in the Vue component.
2. **Forgetting `shaderRegistry.ts`** — the registry is the single source of truth. `buildCard.ts` reads initial values from it and `useUniformWatchers.ts` creates reactive watchers from it automatically. Without it, sliders won't update the shader in real-time.
3. **Forgetting `buildCard.ts`** — uniform will be `undefined` at material creation, causing shader errors or zero values
4. **Using `blendScreen` for additive effects** — screen blend with near-zero values is a no-op; use `result +=` for additive highlights
5. **`uBackground` range is compressed** — values are mapped to ~0.37–0.63 (see `useThreeScene.ts`), so `abs(bg - 0.5)` maxes at ~0.13, not 0.5. Multiply to normalize if using for thresholds

## Validation

Always run `bun test:shader` after shader changes. The test suite catches:

- Undefined functions (missing `#include`)
- Undeclared uniforms/varyings
- Syntax errors (unbalanced braces, missing semicolons)
- Missing `gl_FragColor` assignment
