import { computed, reactive, ref } from 'vue'
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
import { CARD_DEFAULTS, DEFAULT_CARD, DEFAULT_CONFIG } from '@/data/defaults'
import { CARD_CATALOG, loadSetCatalog, SET_REGISTRY } from '@/data/cardCatalog'

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

  // --- Scene state ---
  const sceneMode = ref<SceneMode>('cards')
  const renderMode = ref<RenderMode>('solid')
  const currentCardId = ref('161')
  const cardDisplayMode = ref<CardDisplayMode>('single')
  const sceneSeed = ref(Date.now())

  // --- Set state ---
  const currentSetId = ref(SET_REGISTRY[1]!.id)
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

  // --- Display card IDs (single = just center, triple = center + neighbors) ---
  const displayCardIds = computed(() => {
    const catalog = CARD_CATALOG.value
    if (catalog.length === 0) return []
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
    currentCardId.value = catalog.length > 0 ? catalog[0]!.id : '161'
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
      currentCardId.value = catalog.length > 0 ? catalog[0]!.id : '161'
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

  function setSceneMode(mode: SceneMode) {
    sceneMode.value = mode
  }

  return {
    config,
    cardTransform,
    eyePos,
    targetEye,
    sceneMode,
    renderMode,
    currentCardId,
    cardDisplayMode,
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
    setSceneMode,
  }
})
