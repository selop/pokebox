# Plan: Restructure AppConfig into Hierarchical Nested Interfaces

## Context

`AppConfig` in `src/types/index.ts` is a flat interface with 154 properties. Properties like `masterBallEtchStampHoloScale` sit alongside `boxDepthRatio` and `smoothing`. This makes it hard to reason about which config belongs to which shader, creates extremely long property names to avoid collisions, and makes the store/defaults/controls harder to scan.

The existing naming convention already groups by prefix (`illustRare*`, `sir*`, `trr*`, `ultraRare*`, `rainbowRare*`, `reverseHolo*`, `masterBall*`) — the hierarchy is implicit in the names. This refactor makes it explicit.

## Approach

Nest config by shader type under a `shaders` key. Scene-level properties stay at the top level. Every consumer of `config.*` properties gets updated to use the new paths (e.g., `config.illustRareBarAngle` → `config.shaders.illustrationRare.barAngle`).

## Proposed Type Structure

```typescript
// src/types/index.ts

export interface SceneConfig {
  screenWidthCm: number
  screenHeightCm: number
  viewingDistanceCm: number
  worldScale: number
  movementScale: number
  boxDepthRatio: number
  smoothing: number
  holoIntensity: number
  cardSize: number
  cardSpinSpeed: number
  nearPlane: number
  farPlane: number
}

export interface IllustrationRareConfig {
  rainbowScale: number
  barAngle: number
  barDensity: number
  barDensity2: number
  barOffsetBgYMult: number
  bar2OffsetBgYMult: number
  barWidth: number
  barWidth2: number
  barIntensity: number
  barHue: number
  barMediumSaturation: number
  barMediumLightness: number
  barBrightSaturation: number
  barBrightLightness: number
  barIntensity2: number
  barHue2: number
  barMediumSaturation2: number
  barMediumLightness2: number
  barBrightSaturation2: number
  barBrightLightness2: number
  shine1Contrast: number
  shine1Saturation: number
  shine2Opacity: number
  glareOpacity: number
}

export interface SpecialIllustrationRareConfig {
  shineAngle: number
  shineFrequency: number
  shineBrightness: number
  shineContrast: number
  shineSaturation: number
  glitterContrast: number
  glitterSaturation: number
  washScale: number
  washTiltSensitivity: number
  washSaturation: number
  washContrast: number
  washOpacity: number
  baseBrightness: number
  baseContrast: number
}

// Similarly for: TeraRainbowRareConfig, UltraRareConfig,
// RainbowRareConfig, ReverseHoloConfig, MasterBallConfig

export interface ShaderConfigs {
  illustrationRare: IllustrationRareConfig
  specialIllustrationRare: SpecialIllustrationRareConfig
  teraRainbowRare: TeraRainbowRareConfig
  ultraRare: UltraRareConfig
  rainbowRare: RainbowRareConfig
  reverseHolo: ReverseHoloConfig
  masterBall: MasterBallConfig
}

export interface AppConfig extends SceneConfig {
  shaders: ShaderConfigs
}
```

## Files to Modify

### 1. `src/types/index.ts` — Replace flat AppConfig with nested structure

- Extract 7 per-shader config interfaces (as shown above)
- Add `ShaderConfigs` grouping interface
- Redefine `AppConfig` as `SceneConfig & { shaders: ShaderConfigs }`
- Keep `SceneConfig` exported for consumers that only need scene-level config

### 2. `src/data/defaults.ts` — Restructure DEFAULT_CONFIG

**Before:**
```typescript
export const DEFAULT_CONFIG: AppConfig = {
  screenWidthCm: 35.57,
  // ...scene props...
  illustRareRainbowScale: 0.5,
  illustRareBarAngle: 132.0,
  // ...154 flat properties...
}
```

**After:**
```typescript
export const DEFAULT_CONFIG: AppConfig = {
  screenWidthCm: 35.57,
  // ...scene props (12 properties)...
  shaders: {
    illustrationRare: {
      rainbowScale: 0.5,
      barAngle: 132.0,
      // ...shorter, clearer names...
    },
    specialIllustrationRare: {
      shineAngle: 90.0,
      // ...
    },
    // ...other shader configs...
  },
}
```

### 3. `src/composables/useShaderUniforms.ts` — Update config paths

All uniform map getters change from:
```typescript
[() => store.config.illustRareBarAngle, 'uBarAngle']
```
to:
```typescript
[() => store.config.shaders.illustrationRare.barAngle, 'uBarAngle']
```

This is a mechanical find-and-replace within each uniform map block.

### 4. `src/three/buildCard.ts` — Update STYLE_UNIFORMS config keys

The `UniformMapping` type changes from `[string, keyof AppConfig]` to a path accessor. Two options:

**Option A (simpler):** Change the mapping to use a getter function instead of a key string:
```typescript
type UniformMapping = [uniformName: string, getValue: (config: AppConfig) => number]

const STYLE_UNIFORMS: Partial<Record<ShaderStyle, UniformMapping[]>> = {
  'illustration-rare': [
    ['uRainbowScale', (c) => c.shaders.illustrationRare.rainbowScale],
    ['uBarAngle', (c) => c.shaders.illustrationRare.barAngle],
    // ...
  ],
}
```

**Option B (keep string keys):** Use dot-path strings with a `get()` helper. More fragile, less type-safe.

**Recommendation: Option A.** Type-safe, refactor-friendly, minimal overhead (these run once at material creation, not per-frame).

### 5. `src/components/ShaderControlsPanel.vue` — Update slider bindings

Slider `v-model` bindings change from:
```vue
v-model.number="store.config.illustRareBarAngle"
```
to:
```vue
v-model.number="store.config.shaders.illustrationRare.barAngle"
```

This is a mechanical find-and-replace. The `sections` data structure that drives the panel can also be simplified — section keys can reference the shader config sub-object directly.

### 6. `src/stores/app.ts` — Update resetDefaults

The `resetDefaults()` function does `Object.assign(config, DEFAULT_CONFIG)`. With nested objects, this needs a deep assign or per-shader reassignment:

```typescript
function resetDefaults() {
  const { shaders, ...sceneDefaults } = DEFAULT_CONFIG
  Object.assign(config, sceneDefaults)
  for (const key of Object.keys(shaders) as (keyof ShaderConfigs)[]) {
    Object.assign(config.shaders[key], shaders[key])
  }
  // ...card transform reset...
}
```

Since `config` is `reactive()`, Vue's deep reactivity will track nested properties. The `reactive()` call already wraps the entire object deeply — no change needed there.

## Implementation Sequence

1. **Types first** — Define all sub-interfaces in `src/types/index.ts`
2. **Defaults** — Restructure `defaults.ts` to match new types (compile errors guide you)
3. **Store** — Update `resetDefaults()` in `app.ts`
4. **buildCard** — Update `STYLE_UNIFORMS` mapping to use getter functions
5. **useShaderUniforms** — Update all config paths in uniform maps
6. **ShaderControlsPanel** — Update all `v-model` bindings
7. **Verify** — `bun run build` for type-check, `bun test:shader`, visual test

## Ordering Note

If plan 1 (extract useShaderUniforms) is done first, step 5 only touches the new `useShaderUniforms.ts` file instead of `useThreeScene.ts`. This makes the diff cleaner. **Recommend doing plan 1 before plan 2.**

## Risk Assessment

**Medium risk.** This is a large mechanical refactor touching 6 files with many property references. The main risk is missing a reference during the rename. Mitigations:
- TypeScript compiler will catch every missed reference (the old flat keys won't exist on the new type)
- `bun run build` with `vue-tsc` will flag template binding errors
- No behavioral change — purely structural

## What NOT to Change

- Shader files (`.frag`, `.vert`) — uniforms stay as `uBarAngle` etc., the GLSL side is unaffected
- `cardCatalog.ts` — doesn't reference config
- `useCardLoader.ts` — doesn't reference config
- `useFaceTracking.ts` — doesn't reference config
