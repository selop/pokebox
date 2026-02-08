import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AppConfig, CardTransform, DerivedDimensions, EyePosition, RenderMode, SceneMode } from '@/types'
import { CARD_DEFAULTS, DEFAULT_CARD, DEFAULT_CONFIG } from '@/data/defaults'

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
  const currentCardId = ref('009')
  const sceneSeed = ref(Date.now())

  // --- UI state ---
  const isPanelOpen = ref(false)
  const isTrackingActive = ref(false)
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
    currentCardId.value = '009'
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
    sceneSeed,
    isPanelOpen,
    isTrackingActive,
    statusText,
    showInstructions,
    viewportWidth,
    viewportHeight,
    dimensions,
    rebuildCounter,
    triggerRebuild,
    updateViewport,
    resetDefaults,
    randomizeSeed,
    toggleRenderMode,
    togglePanel,
    setSceneMode,
  }
})
