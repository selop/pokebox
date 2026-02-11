import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  AppConfig,
  CardDisplayMode,
  CardTransform,
  DerivedDimensions,
  EyePosition,
  RenderMode,
  SceneMode,
} from '@/types'
import { CARD_DEFAULTS, DEFAULT_CARD, DEFAULT_CONFIG } from '@/data/defaults'
import { CARD_CATALOG } from '@/data/cardCatalog'

export const useAppStore = defineStore('app', () => {
  // --- Config (reactive, slider-bound) ---
  const config = reactive<AppConfig>({ ...DEFAULT_CONFIG })

  // --- Card transform ---
  const cardTransform = reactive<CardTransform>({ ...DEFAULT_CARD })

  // --- Eye position ---
  const eyePos = reactive<EyePosition>({ x: 0, y: 0, z: 1 })
  const targetEye = reactive<EyePosition>({ x: 0, y: 0, z: 1 })

  // --- Scene state ---
  const sceneMode = ref<SceneMode>('cards')
  const renderMode = ref<RenderMode>('solid')
  const currentCardId = ref('170')
  const cardDisplayMode = ref<CardDisplayMode>('single')
  const sceneSeed = ref(Date.now())

  // --- UI state ---
  const isPanelOpen = ref(false)
  const isShaderPanelOpen = ref(false)
  const isTrackingActive = ref(false)
  const isSlideshowActive = ref(false)
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

  // --- Display card IDs (single = just center, triple = center + neighbors) ---
  const displayCardIds = computed(() => {
    const idx = CARD_CATALOG.findIndex((c) => c.id === currentCardId.value)
    if (cardDisplayMode.value === 'single') {
      return [currentCardId.value]
    }
    if (idx < 0) return CARD_CATALOG.slice(0, 3).map((c) => c.id)
    const prev = CARD_CATALOG[(idx - 1 + CARD_CATALOG.length) % CARD_CATALOG.length]!
    const next = CARD_CATALOG[(idx + 1) % CARD_CATALOG.length]!
    return [prev.id, currentCardId.value, next.id]
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
    Object.assign(config, DEFAULT_CONFIG)
    Object.assign(cardTransform, {
      x: CARD_DEFAULTS.x,
      y: CARD_DEFAULTS.y,
      z: CARD_DEFAULTS.z,
      rotY: CARD_DEFAULTS.rotY,
    })
    config.holoIntensity = CARD_DEFAULTS.holoIntensity / 100
    config.cardSpinSpeed = CARD_DEFAULTS.cardSpinSpeed
    currentCardId.value = '170'
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
    isPanelOpen,
    isShaderPanelOpen,
    isTrackingActive,
    isSlideshowActive,
    statusText,
    showInstructions,
    viewportWidth,
    viewportHeight,
    dimensions,
    displayCardIds,
    rebuildCounter,
    triggerRebuild,
    updateViewport,
    resetDefaults,
    randomizeSeed,
    toggleRenderMode,
    togglePanel,
    toggleShaderPanel,
    toggleSlideshow,
    setSceneMode,
  }
})
