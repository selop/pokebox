---
name: pokebox-fragment-shader
description: Edit Fragment Shader & Create UI Controls
---

## Step-by-step checklist

When adding or modifying a shader uniform with a UI slider, **always update all 6 files in a single pass**:

| #   | File                                     | What to do                                                                                                          |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/shaders/<shader>.frag`              | Declare `uniform float uMyParam;` and use it in shader logic                                                        |
| 2   | `src/types/index.ts`                     | Add `<shaderPrefix>MyParam: number` to `AppConfig`                                                                  |
| 3   | `src/data/defaults.ts`                   | Add `<shaderPrefix>MyParam: <default>,` with the hardcoded value being replaced                                     |
| 4   | `src/three/buildCard.ts`                 | Add `['uMyParam', '<shaderPrefix>MyParam']` to the shader's entry in the uniform mapping object                     |
| 5   | `src/composables/useThreeScene.ts`       | Add `[() => store.config.<shaderPrefix>MyParam, 'uMyParam']` to the shader's `UniformMap` array                     |
| 6   | `src/components/ShaderControlsPanel.vue` | Add slider definition `{ label: 'My param', key: '<shaderPrefix>MyParam', min, max, step }` to the shader's section |

## Naming conventions

- **Shader uniform**: `u` prefix, PascalCase — `uGlareContrast`
- **Config key**: shader prefix + PascalCase — `masterBallGlareContrast`, `illustRareBarAngle`, `sirShineFrequency`
- **Slider label**: Short human-readable — `'Glare contrast'`

## Shader prefixes by type

| Shader file                      | Config prefix |
| -------------------------------- | ------------- |
| `illustration-rare.frag`         | `illustRare`  |
| `special-illustration-rare.frag` | `sir`         |
| `ultra-rare.frag`                | `ultraRare`   |
| `rainbow-rare.frag`              | `rainbowRare` |
| `master-ball.frag`               | `masterBall`  |
| `reverse-holo.frag`              | `reverseHolo` |

## Slider definition format

```ts
{ label: 'My param', key: 'prefixMyParam', min: 0, max: 5, step: 0.05 }
// Optional suffix for display: suffix: '%' (multiplies by 100) or suffix: '°'
// Use { subsection: 'Section Name' } to group sliders visually
```

## Common pitfalls

1. **Forgetting `useThreeScene.ts`** — sliders will appear to work on load but won't update in real-time when dragged
2. **Forgetting `buildCard.ts`** — uniform will be `undefined` at material creation, causing shader errors or zero values
3. **Using `blendScreen` for additive effects** — screen blend with near-zero values is a no-op; use `result +=` for additive highlights
4. **`uBackground` range is compressed** — values are mapped to ~0.37–0.63 (see `useThreeScene.ts` lines 272-273), so `abs(bg - 0.5)` maxes at ~0.13, not 0.5. Multiply to normalize if using for thresholds

## Validation

Always run `bun test:shader` after shader changes. The test suite catches:

- Undefined functions (missing `#include`)
- Undeclared uniforms/varyings
- Syntax errors (unbalanced braces, missing semicolons)
- Missing `gl_FragColor` assignment
