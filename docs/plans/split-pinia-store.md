# Plan: Split Pinia Store into Focused Stores

## Context

`useAppStore` in `src/stores/app.ts` (204 lines) is the single Pinia store for the entire app. It holds 12 distinct responsibilities: shader config, card transforms, eye tracking, scene mode, card selection, set management, 8 UI toggle booleans, viewport dimensions, derived dimensions, rebuild triggers, and a cache-clear callback. While 204 lines isn't enormous, the store is a god object — every component and composable imports the same store to access unrelated slices of state.

The most impactful first split is extracting UI state, which reduces noise for the majority of consumers that only care about scene/card/config state.

## Approach

Split into 3 stores. Keep the split minimal and pragmatic — don't over-fragment.

| Store | Responsibility | Consumers |
|-------|---------------|-----------|
| `useAppStore` | Scene config, eye tracking, viewport, dimensions, rebuild trigger, render mode | `useThreeScene`, `buildCard`, camera logic |
| `useCardStore` | Card selection, display mode, set management, catalog, navigation | `useThreeScene`, `CardNavigator`, toolbar, search |
| `useUIStore` | Panel toggles, slideshow, flip, dim, perf overlay, status text, instructions | Components (toolbar, panels, overlays) |

## Files to Create/Modify

### 1. `src/stores/ui.ts` — NEW

Extract all UI-specific state:

```typescript
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', () => {
  const isPanelOpen = ref(false)
  const isShaderPanelOpen = ref(false)
  const isTrackingActive = ref(false)
  const isSlideshowActive = ref(false)
  const isFlipRequested = ref(false)
  const isDimmed = ref(false)
  const isPerfOverlayOpen = ref(false)
  const statusText = ref('Waiting for camera')
  const showInstructions = ref(true)

  function togglePanel() { isPanelOpen.value = !isPanelOpen.value }
  function toggleShaderPanel() { isShaderPanelOpen.value = !isShaderPanelOpen.value }
  function toggleSlideshow() { isSlideshowActive.value = !isSlideshowActive.value }
  function requestFlip() { isFlipRequested.value = true }
  function toggleDimLights() { isDimmed.value = !isDimmed.value }
  function togglePerfOverlay() { isPerfOverlayOpen.value = !isPerfOverlayOpen.value }

  return {
    isPanelOpen, isShaderPanelOpen, isTrackingActive,
    isSlideshowActive, isFlipRequested, isDimmed,
    isPerfOverlayOpen, statusText, showInstructions,
    togglePanel, toggleShaderPanel, toggleSlideshow,
    requestFlip, toggleDimLights, togglePerfOverlay,
  }
})
```

### 2. `src/stores/card.ts` — NEW

Extract card selection, display mode, and set management:

```typescript
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CardDisplayMode } from '@/types'
import { CARD_CATALOG, loadSetCatalog, SET_REGISTRY } from '@/data/cardCatalog'

export const useCardStore = defineStore('card', () => {
  const currentCardId = ref('161')
  const cardDisplayMode = ref<CardDisplayMode>('single')
  const currentSetId = ref(SET_REGISTRY[1]!.id)
  const setLoading = ref(false)

  const displayCardIds = computed(() => {
    const catalog = CARD_CATALOG.value
    if (catalog.length === 0) return []
    const idx = catalog.findIndex((c) => c.id === currentCardId.value)
    const validIdx = idx >= 0 ? idx : 0
    const centerId = catalog[validIdx]!.id
    if (cardDisplayMode.value === 'single') {
      return [centerId]
    }
    const prev = catalog[(validIdx - 1 + catalog.length) % catalog.length]!
    const next = catalog[(validIdx + 1) % catalog.length]!
    return [prev.id, centerId, next.id]
  })

  /** Callback for clearing card texture cache — set by useCardLoader. */
  let clearCacheFn: (() => void) | null = null
  function registerCacheClear(fn: () => void) {
    clearCacheFn = fn
  }

  async function switchSet(setId: string) {
    if (setId === currentSetId.value && CARD_CATALOG.value.length > 0) return
    setLoading.value = true
    try {
      clearCacheFn?.()
      currentSetId.value = setId
      const catalog = await loadSetCatalog(setId)
      currentCardId.value = catalog.length > 0 ? catalog[0]!.id : '161'
      CARD_CATALOG.value = catalog
    } finally {
      setLoading.value = false
    }
  }

  return {
    currentCardId, cardDisplayMode, currentSetId, setLoading,
    displayCardIds, registerCacheClear, switchSet,
  }
})
```

### 3. `src/stores/app.ts` — Slim down to scene/config/viewport

Remove everything extracted to `ui.ts` and `card.ts`. What remains:

```typescript
import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AppConfig, CardTransform, DerivedDimensions, EyePosition, RenderMode, SceneMode } from '@/types'
import { CARD_DEFAULTS, DEFAULT_CARD, DEFAULT_CONFIG } from '@/data/defaults'
import { CARD_CATALOG } from '@/data/cardCatalog'

export const useAppStore = defineStore('app', () => {
  const config = reactive<AppConfig>({ ...DEFAULT_CONFIG })
  const cardTransform = reactive<CardTransform>({ ...DEFAULT_CARD })
  const eyePos = reactive<EyePosition>({ x: 0, y: 0, z: 1 })
  const targetEye = reactive<EyePosition>({ x: 0, y: 0, z: 1 })

  const sceneMode = ref<SceneMode>('cards')
  const renderMode = ref<RenderMode>('solid')
  const sceneSeed = ref(Date.now())

  const viewportWidth = ref(window.innerWidth)
  const viewportHeight = ref(window.innerHeight)

  const dimensions = computed<DerivedDimensions>(() => {
    const viewportAspect = viewportWidth.value / viewportHeight.value
    const screenH = config.screenHeightCm * config.worldScale
    const screenW = screenH * viewportAspect
    const boxD = screenH * config.boxDepthRatio
    const eyeDefaultZ = config.viewingDistanceCm * config.worldScale
    return { screenW, screenH, boxD, eyeDefaultZ }
  })

  const rebuildCounter = ref(0)
  function triggerRebuild() { rebuildCounter.value++ }
  function updateViewport(w: number, h: number) {
    viewportWidth.value = w
    viewportHeight.value = h
  }

  function resetDefaults() {
    Object.assign(config, DEFAULT_CONFIG)
    Object.assign(cardTransform, {
      x: CARD_DEFAULTS.x, y: CARD_DEFAULTS.y,
      z: CARD_DEFAULTS.z, rotY: CARD_DEFAULTS.rotY,
    })
    config.holoIntensity = CARD_DEFAULTS.holoIntensity / 100
    config.cardSpinSpeed = CARD_DEFAULTS.cardSpinSpeed
    const catalog = CARD_CATALOG.value
    // Note: currentCardId now lives in card store — caller must reset it
  }

  function randomizeSeed() { sceneSeed.value = Date.now() }
  function toggleRenderMode() {
    renderMode.value = renderMode.value === 'xray' ? 'solid' : 'xray'
  }
  function setSceneMode(mode: SceneMode) { sceneMode.value = mode }

  return {
    config, cardTransform, eyePos, targetEye,
    sceneMode, renderMode, sceneSeed,
    viewportWidth, viewportHeight, dimensions,
    rebuildCounter, triggerRebuild, updateViewport,
    resetDefaults, randomizeSeed, toggleRenderMode, setSceneMode,
  }
})
```

### 4. Update all consumers

Every file that imports `useAppStore` and accesses extracted state needs updating. The changes are mechanical — add the new store import and change `store.` to the appropriate store reference.

**Components (UI state migration):**

| File | Properties to migrate | From → To |
|------|----------------------|-----------|
| `ToolbarButtons.vue` | `isPanelOpen`, `isShaderPanelOpen`, `isDimmed`, `isSlideshowActive`, `togglePanel`, `toggleShaderPanel`, `toggleDimLights`, `toggleSlideshow` | `store.` → `ui.` |
| `ToolbarButtons.vue` | `cardDisplayMode`, `currentSetId`, `switchSet` | `store.` → `card.` |
| `CalibrationPanel.vue` | `isPanelOpen`, `togglePanel` | `store.` → `ui.` |
| `ShaderControlsPanel.vue` | `isShaderPanelOpen` | `store.` → `ui.` |
| `App.vue` | `showInstructions` | `store.` → `ui.` |
| Any perf overlay | `isPerfOverlayOpen` | `store.` → `ui.` |

**Composables (card state migration):**

| File | Properties to migrate | From → To |
|------|----------------------|-----------|
| `useThreeScene.ts` | `currentCardId`, `cardDisplayMode`, `displayCardIds` | `store.` → `cardStore.` |
| `useThreeScene.ts` | `isDimmed`, `isFlipRequested`, `isSlideshowActive` | `store.` → `ui.` |
| `useThreeScene.ts` | `registerCacheClear` | `store.` → `cardStore.` |
| `useCardLoader.ts` | (if it accesses store) | check and update |
| `CardNavigator.ts` | `currentCardId`, `cardDisplayMode` | constructor param or direct import |
| `CardSceneBuilder.ts` | `cardDisplayMode`, `displayCardIds` | constructor param or direct import |

### 5. Cross-store coordination: `resetDefaults`

The current `resetDefaults()` resets both config and card state. After splitting:

**Option A (recommended):** Keep `resetDefaults` in `useAppStore` for config/transform, add `resetCard` in `useCardStore`. Have the UI button call both:
```typescript
// In component:
appStore.resetDefaults()
cardStore.currentCardId = CARD_CATALOG.value[0]?.id ?? '161'
```

**Option B:** Create a `useResetAll()` composable that coordinates across stores. Overkill for now.

### 6. Cross-store coordination: `isDimmed` in rebuildScene

`rebuildScene()` passes `store.isDimmed` to `buildBoxShell()`. After the split, this becomes `ui.isDimmed`. The scene rebuild watcher should also watch `ui.isDimmed`:

```typescript
watch(
  () => [/* ...existing scene triggers... */, ui.isDimmed],
  () => rebuildScene(),
)
```

### 7. Cross-store coordination: `registerCacheClear`

The `registerCacheClear` callback pattern moves to `useCardStore` since it's used by `switchSet`. This also makes the coupling more explicit — it's `useCardLoader` registering with `useCardStore`, not with a generic app store.

**Future improvement (out of scope):** Replace the callback with a direct call. `switchSet` could accept a `clearCache` parameter, or `useCardLoader` could expose a reactive `currentSetId` watcher that clears cache automatically.

## Implementation Sequence

1. **Create `src/stores/ui.ts`** — copy UI state + toggles from `app.ts`
2. **Create `src/stores/card.ts`** — copy card/set state + `displayCardIds` + `switchSet`
3. **Slim `src/stores/app.ts`** — remove extracted state and functions
4. **Update components** — add `useUIStore()` / `useCardStore()` imports, update template bindings
5. **Update composables** — add store imports in `useThreeScene`, `CardNavigator`, `CardSceneBuilder`
6. **Fix `resetDefaults`** — split across stores or coordinate from caller
7. **Verify** — `bun run build`, `bun test:shader`, full visual test

## Ordering Note

This refactor is independent of plans 1 and 2, but is easiest to do **after** plan 1 (extract useShaderUniforms). With uniform watching already extracted, `useThreeScene.ts` is shorter and the store migration diff is smaller.

If done after plan 2 (hierarchical config), the `config` object is already nested, which means `useAppStore` stays clean with just `config` (containing nested `shaders`) rather than 154 flat properties.

**Recommended order: Plan 1 → Plan 2 → Plan 3.**

## Risk Assessment

**Medium risk.** Many files touched, but each change is mechanical (rename `store.isPanelOpen` → `ui.isPanelOpen`). TypeScript catches every missed reference at compile time. The main risk is runtime issues from forgetting to update a watcher dependency or cross-store coordination.

Mitigations:
- `bun run build` catches all type errors including template bindings (via `vue-tsc`)
- Each store is independently testable
- Can be done incrementally (extract UI store first, verify, then card store)

## What NOT to Change

- `config` stays in `useAppStore` — it's the core scene/shader config and splitting it further is plan 2's concern
- `eyePos` / `targetEye` stay in `useAppStore` — they're tightly coupled with camera/scene logic
- `dimensions` stays in `useAppStore` — it's derived from config + viewport, both in `useAppStore`
- No new dependencies added between stores (stores don't import each other)
