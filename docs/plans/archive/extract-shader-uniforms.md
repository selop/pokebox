# Plan: Extract useShaderUniforms from useThreeScene

## Context

`useThreeScene.ts` is 647 lines with 15+ responsibilities. The largest single block of code (~210 lines, lines 412–630) is dedicated to watching store config values and pushing them to shader uniforms on card meshes. This is a self-contained concern that can be extracted cleanly into its own composable, cutting the god composable by ~30%.

The pattern is repetitive: for each shader type, a `[() => number, string][]` uniform map is defined, then iterated with `watchUniform()`. The `watchUniform` helper itself is only 9 lines. All of this has zero dependency on the scene, camera, renderer, or animation loop — it only needs the `cardMeshes` ref.

## Approach

Extract all uniform-watching logic into `src/composables/useShaderUniforms.ts`. The new composable receives the `cardMeshes` shallowRef and the store, and sets up all the watchers. `useThreeScene` calls it once during setup.

## Files to Modify

### 1. `src/composables/useShaderUniforms.ts` — NEW

Create a composable that encapsulates all shader uniform watching:

```typescript
import { watch, type ShallowRef } from 'vue'
import type { Mesh } from 'three'
import { ShaderMaterial } from 'three'
import { useAppStore } from '@/stores/app'

export function useShaderUniforms(cardMeshes: ShallowRef<Mesh[]>) {
  const store = useAppStore()

  // Helper: watch a store config getter and push to a uniform on all card meshes
  function watchUniform(getter: () => number, uniformName: string) {
    watch(getter, (val) => {
      for (const mesh of cardMeshes.value) {
        const mat = mesh.material as ShaderMaterial
        if (mat.isShaderMaterial && mat.uniforms[uniformName]) {
          mat.uniforms[uniformName]!.value = val
        }
      }
    })
  }

  // Helper: register an entire uniform map at once
  function watchUniformMap(map: [() => number, string][]) {
    for (const [getter, uniformName] of map) {
      watchUniform(getter, uniformName)
    }
  }

  // --- Global ---
  watchUniform(() => store.config.holoIntensity, 'uCardOpacity')

  // --- Illustration Rare ---
  watchUniformMap([
    [() => store.config.illustRareRainbowScale, 'uRainbowScale'],
    [() => store.config.illustRareBarAngle, 'uBarAngle'],
    // ... all 23 illustration-rare entries (lines 427–455 of current useThreeScene)
  ])

  // --- Ultra Rare ---
  watchUniformMap([
    [() => store.config.ultraRareBaseBrightness, 'uBaseBrightness'],
    // ... all 28 ultra-rare entries (lines 458–491)
  ])

  // --- Special Illustration Rare ---
  watchUniformMap([
    [() => store.config.sirShineAngle, 'uSirShineAngle'],
    // ... all 14 SIR entries (lines 520–538)
  ])

  // --- Tera Rainbow Rare ---
  watchUniformMap([
    [() => store.config.trrHoloOpacity, 'uHoloOpacity'],
    // ... all 19 TRR entries (lines 541–564)
  ])

  // --- Reverse Holo ---
  watchUniformMap([
    [() => store.config.reverseHoloShineIntensity, 'uShineIntensity'],
    // ... all 10 reverse-holo entries (lines 567–581)
  ])

  // --- Rainbow Rare ---
  watchUniformMap([
    [() => store.config.rainbowRareBaseBrightness, 'uBaseBrightness'],
    // ... all 13 rainbow-rare entries (lines 584–601)
  ])

  // --- Master Ball ---
  watchUniformMap([
    [() => store.config.masterBallRainbowScale, 'uRainbowScale'],
    // ... all 22 master-ball entries (lines 604–630)
  ])
}
```

**Key design decisions:**
- `watchUniformMap` helper removes the repeated `for (const [getter, uniformName] of ...Map) { watchUniform(getter, uniformName) }` boilerplate (currently repeated 7 times)
- The composable takes `cardMeshes` as a parameter rather than importing it, keeping it testable
- Store access via `useAppStore()` inside the composable (standard Pinia pattern in Vue composables)

### 2. `src/composables/useThreeScene.ts` — Remove uniform watching code

**Remove** (lines 411–630, ~220 lines):
- The `watchUniform` helper function
- All 7 uniform map arrays (`illustRareUniformMap`, `ultraRareUniformMap`, `sirUniformMap`, `trrUniformMap`, `reverseHoloUniformMap`, `rainbowRareUniformMap`, `masterBallUniformMap`)
- All 7 `for` loops that call `watchUniform`
- The `watchUniform(() => store.config.holoIntensity, 'uCardOpacity')` line

**Add** (near top, after `cardMeshes` is declared on line 40):
```typescript
import { useShaderUniforms } from './useShaderUniforms'
// ...
const cardMeshes = shallowRef<Mesh[]>([])
useShaderUniforms(cardMeshes)
```

No other changes needed — the uniform maps reference `store.config.*` and `cardMeshes.value`, both of which remain available.

## What NOT to Change

- The per-frame uniform updates in `animate()` (lines 246–287) stay in `useThreeScene` — these depend on `time`, `eyePos`, mesh world position, and camera math. They're animation-loop concerns, not config-watch concerns.
- The `STYLE_UNIFORMS` mapping in `buildCard.ts` stays — that's for initial uniform values at material creation time, not for watching changes.

## Verification

1. `bun run build` — type-check passes
2. `bun test:shader` — shader tests still pass (no shader changes)
3. Visual: adjust any slider in ShaderControlsPanel → uniform updates still propagate to cards in real-time
4. Visual: navigate between cards → new cards pick up current config values (handled by `buildCard.ts`, unchanged)

## Risk Assessment

**Low risk.** This is a pure mechanical extraction — moving code from one file to another with zero behavioral change. The uniform maps are self-contained (no references to scene, camera, renderer, or animation state). The only coupling is `cardMeshes` (passed in) and `store.config` (accessed via Pinia).
