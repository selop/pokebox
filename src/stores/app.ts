import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  AppConfig,
  CardDisplayMode,
  CardTransform,
  DerivedDimensions,
  EyePosition,
  InputMode,
  RenderMode,
  SceneMode,
  ShaderConfigs,
} from '@/types'
import { CARD_DEFAULTS, DEFAULT_CARD, DEFAULT_CONFIG, STARTUP_CARD_ID } from '@/data/defaults'
import { CARD_CATALOG, loadSetCatalog, SET_REGISTRY } from '@/data/cardCatalog'
import { mulberry32 } from '@/three/utils'

/** Read URL search params to override initial set/card selection. */
function readUrlParams() {
  const params = new URLSearchParams(window.location.search)
  const set = params.get('set')
  const card = params.get('card')
  return {
    setId: set && SET_REGISTRY.some((s) => s.id === set) ? set : null,
    cardId: card ?? null,
  }
}

export const useAppStore = defineStore('app', () => {
  // --- Config (reactive, slider-bound) ---
  const config = reactive<AppConfig>({
    ...DEFAULT_CONFIG,
    shaders: Object.fromEntries(
      Object.entries(DEFAULT_CONFIG.shaders).map(([k, v]) => [k, { ...v }]),
    ) as ShaderConfigs,
  })

  // --- Card transform ---
  const cardTransform = reactive<CardTransform>({ ...DEFAULT_CARD })

  // --- Eye position ---
  const eyePos = reactive<EyePosition>({ x: 0, y: 0, z: 1 })
  const targetEye = reactive<EyePosition>({ x: 0, y: 0, z: 1 })

  // --- Mobile detection ---
  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && !matchMedia('(pointer: fine)').matches)

  // --- URL param overrides ---
  const urlParams = readUrlParams()

  // --- Scene state ---
  const sceneMode = ref<SceneMode>('cards')
  const renderMode = ref<RenderMode>('solid')
  const currentCardId = ref(urlParams.cardId ?? STARTUP_CARD_ID)
  const cardDisplayMode = ref<CardDisplayMode>(isMobile ? 'single' : 'fan')
  const sceneSeed = ref(Date.now())

  // --- Fan state ---
  const hoveredFanCard = ref<number | null>(null)

  // --- Set state ---
  const currentSetId = ref(urlParams.setId ?? SET_REGISTRY[0]!.id)
  const setLoading = ref(false)

  // --- Input mode ---
  const inputMode = ref<InputMode>('keyboard')

  // --- UI state ---
  const isPanelOpen = ref(false)
  const isShaderPanelOpen = ref(false)
  const isTrackingActive = ref(false)
  const isSlideshowActive = ref(false)
  const isFlipRequested = ref(false)
  const isDimmed = ref(false)
  const isPerfOverlayOpen = ref(false)
  const statusText = ref('Waiting for camera')
  const showInstructions = ref(true)
  const showBoosterModal = ref(false)

  // --- Viewport dimensions (updated on resize) ---
  const viewportWidth = ref(window.innerWidth)
  const viewportHeight = ref(window.innerHeight)

  // --- Derived dimensions (computed) ---
  const dimensions = computed<DerivedDimensions>(() => {
    const viewportAspect = viewportWidth.value / viewportHeight.value
    const screenH = config.screenHeightCm * config.worldScale
    const screenW = screenH * viewportAspect
    const boxD = screenH * config.boxDepthRatio
    const eyeDefaultZ = config.viewingDistanceCm * config.worldScale
    return { screenW, screenH, boxD, eyeDefaultZ }
  })

  // --- Single-card size (responsive to viewport aspect ratio) ---
  const singleCardSize = computed(() => {
    const aspect = viewportWidth.value / viewportHeight.value
    const cardAspect = 733 / 1024 // width / height — mirrors CARD_ASPECT in buildCard.ts
    // Cap so card width doesn't exceed 90% of screen width
    const maxByWidth = (aspect / cardAspect) * 0.9
    return Math.min(0.85, maxByWidth)
  })

  // --- Fan card IDs (7 random cards from catalog, seeded by sceneSeed) ---
  const FAN_COUNT = 7
  const fanCardIds = computed(() => {
    const catalog = CARD_CATALOG.value
    if (catalog.length === 0) return []
    const count = Math.min(FAN_COUNT, catalog.length)
    // Fisher-Yates shuffle with seeded PRNG for reproducible random selection
    const rng = mulberry32(sceneSeed.value)
    const indices = catalog.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
    }
    return indices.slice(0, count).map((i) => catalog[i]!.id)
  })

  // --- Display card IDs (single = just center, triple = center + neighbors, fan = 7-card hand) ---
  const displayCardIds = computed(() => {
    const catalog = CARD_CATALOG.value
    if (catalog.length === 0) return []

    if (cardDisplayMode.value === 'fan') {
      return fanCardIds.value
    }

    // Resolve current card — must exist in catalog
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

  // --- Rebuild trigger (incremented to signal watchers) ---
  const rebuildCounter = ref(0)

  function triggerRebuild() {
    rebuildCounter.value++
  }

  function updateViewport(w: number, h: number) {
    viewportWidth.value = w
    viewportHeight.value = h
  }

  function resetDefaults() {
    const { shaders, ...sceneDefaults } = DEFAULT_CONFIG
    Object.assign(config, sceneDefaults)
    for (const key of Object.keys(shaders) as (keyof ShaderConfigs)[]) {
      Object.assign(config.shaders[key], shaders[key])
    }
    Object.assign(cardTransform, {
      x: CARD_DEFAULTS.x,
      y: CARD_DEFAULTS.y,
      z: CARD_DEFAULTS.z,
      rotY: CARD_DEFAULTS.rotY,
    })
    config.holoIntensity = CARD_DEFAULTS.holoIntensity / 100
    config.cardSpinSpeed = CARD_DEFAULTS.cardSpinSpeed
    const catalog = CARD_CATALOG.value
    currentCardId.value = catalog.length > 0 ? catalog[0]!.id : STARTUP_CARD_ID
  }

  /** Callback for clearing card texture cache — set by useCardLoader. */
  let clearCacheFn: (() => void) | null = null
  function registerCacheClear(fn: () => void) {
    clearCacheFn = fn
  }

  async function switchSet(setId: string) {
    if (setId === currentSetId.value && CARD_CATALOG.value.length > 0) return
    setLoading.value = true
    try {
      // Clear texture cache before loading new set
      clearCacheFn?.()
      currentSetId.value = setId
      const catalog = await loadSetCatalog(setId)
      // Set card ID BEFORE catalog so the displayCardIds watcher
      // fires only once with a valid ID in the new catalog.
      // Preserve existing card ID if it exists in the new catalog (e.g. initial load).
      const keepCurrent = catalog.some((c) => c.id === currentCardId.value)
      if (!keepCurrent) {
        currentCardId.value = catalog.length > 0 ? catalog[0]!.id : STARTUP_CARD_ID
      }
      CARD_CATALOG.value = catalog
    } finally {
      setLoading.value = false
    }
  }

  function randomizeSeed() {
    sceneSeed.value = Date.now()
  }

  function toggleRenderMode() {
    renderMode.value = renderMode.value === 'xray' ? 'solid' : 'xray'
  }

  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value
  }

  function toggleShaderPanel() {
    isShaderPanelOpen.value = !isShaderPanelOpen.value
  }

  function toggleSlideshow() {
    isSlideshowActive.value = !isSlideshowActive.value
  }

  function requestFlip() {
    isFlipRequested.value = true
  }

  function toggleDimLights() {
    isDimmed.value = !isDimmed.value
  }

  function togglePerfOverlay() {
    isPerfOverlayOpen.value = !isPerfOverlayOpen.value
  }

  function toggleBoosterModal() {
    showBoosterModal.value = !showBoosterModal.value
  }

  function setSceneMode(mode: SceneMode) {
    sceneMode.value = mode
  }

  function setHoveredFanCard(index: number | null) {
    hoveredFanCard.value = index
  }

  function selectFanCard(fanIndex: number) {
    const ids = fanCardIds.value
    if (fanIndex >= 0 && fanIndex < ids.length) {
      currentCardId.value = ids[fanIndex]!
      cardDisplayMode.value = 'single'
    }
  }

  /** Build a shareable URL for the current card/set. */
  function shareUrl() {
    const url = new URL(window.location.origin + window.location.pathname)
    url.searchParams.set('set', currentSetId.value)
    url.searchParams.set('card', currentCardId.value)
    return url.toString()
  }

  // --- Sync URL bar on card/set changes ---
  watch([currentSetId, currentCardId], () => {
    const url = new URL(window.location.href)
    url.searchParams.set('set', currentSetId.value)
    url.searchParams.set('card', currentCardId.value)
    history.replaceState(null, '', url.toString())
  })

  return {
    config,
    cardTransform,
    eyePos,
    targetEye,
    isMobile,
    sceneMode,
    renderMode,
    currentCardId,
    cardDisplayMode,
    hoveredFanCard,
    fanCardIds,
    sceneSeed,
    inputMode,
    currentSetId,
    setLoading,
    isPanelOpen,
    isShaderPanelOpen,
    isTrackingActive,
    isSlideshowActive,
    isFlipRequested,
    isDimmed,
    isPerfOverlayOpen,
    statusText,
    showInstructions,
    showBoosterModal,
    viewportWidth,
    viewportHeight,
    dimensions,
    singleCardSize,
    displayCardIds,
    rebuildCounter,
    triggerRebuild,
    updateViewport,
    resetDefaults,
    registerCacheClear,
    switchSet,
    randomizeSeed,
    toggleRenderMode,
    togglePanel,
    toggleShaderPanel,
    toggleSlideshow,
    requestFlip,
    toggleDimLights,
    togglePerfOverlay,
    toggleBoosterModal,
    setSceneMode,
    setHoveredFanCard,
    selectFanCard,
    shareUrl,
  }
})
