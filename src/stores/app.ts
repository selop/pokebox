import { computed, reactive, ref, shallowRef, watch } from 'vue'
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
import type { HeroCardEntry } from '@/data/heroShowcase'

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

  // --- Carousel state ---
  const carouselHeroCatalog = shallowRef<HeroCardEntry[]>([])
  const carouselIndex = ref(0)

  /** All hero card IDs — used as displayCardIds so cards are built once, not rebuilt on each advance. */
  const carouselAllIds = computed(() => carouselHeroCatalog.value.map((e) => e.id))

  function advanceCarousel(dir: number) {
    const n = carouselHeroCatalog.value.length
    if (n === 0) return
    carouselIndex.value = ((carouselIndex.value + dir) % n + n) % n
  }

  // --- Set state ---
  const currentSetId = ref(urlParams.setId ?? SET_REGISTRY[0]!.id)
  const setLoading = ref(false)

  // --- Input mode ---
  const inputMode = ref<InputMode>('keyboard')

  // --- Hero showcase (auto-cycling curated cards on desktop startup) ---
  const isHeroShowcaseActive = ref(false)

  function stopHeroShowcase() {
    isHeroShowcaseActive.value = false
    if (cardDisplayMode.value === 'carousel') {
      cardDisplayMode.value = isMobile ? 'single' : 'fan'
    }
  }

  // --- UI state ---
  const isPanelOpen = ref(false)
  const isShaderPanelOpen = ref(false)
  const isTrackingActive = ref(false)
  const isSlideshowActive = ref(false)
  const isDimmed = ref(false)
  const isIdleFloatActive = ref(true)
  const isPerfOverlayOpen = ref(false)
  const statusText = ref('Waiting for camera')
  const showInstructions = ref(true)
  const showBoosterModal = ref(false)

  // --- Pack opening animation state ---
  const packOpeningPhase = ref<'idle' | 'css-anim' | 'waiting-load' | 'cascade'>('idle')

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

  // --- Stack card IDs (5 random cards from catalog, seeded by sceneSeed) ---
  const STACK_COUNT = 5
  const stackCardIds = computed(() => {
    const catalog = CARD_CATALOG.value
    if (catalog.length === 0) return []
    const count = Math.min(STACK_COUNT, catalog.length)
    const rng = mulberry32(sceneSeed.value ^ 0xbeef) // different seed offset from fan
    const indices = catalog.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
    }
    return indices.slice(0, count).map((i) => catalog[i]!.id)
  })

  // --- Fan card IDs (7 random cards from catalog, seeded by sceneSeed) ---
  // Picks one card per unique holoType first, then fills remaining slots randomly.
  // Duplicates are only allowed when the set has fewer than FAN_COUNT distinct shader types.
  const FAN_COUNT = 7
  const fanCardIds = computed(() => {
    const catalog = CARD_CATALOG.value
    if (catalog.length === 0) return []
    const count = Math.min(FAN_COUNT, catalog.length)
    const rng = mulberry32(sceneSeed.value)

    // Group indices by holoType
    const byType = new Map<string, number[]>()
    for (let i = 0; i < catalog.length; i++) {
      const ht = catalog[i]!.holoType
      let arr = byType.get(ht)
      if (!arr) {
        arr = []
        byType.set(ht, arr)
      }
      arr.push(i)
    }

    // Shuffle each group internally
    for (const arr of byType.values()) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
      }
    }

    // Shuffle the type keys to randomize which types are picked
    const types = [...byType.keys()]
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[types[i], types[j]] = [types[j]!, types[i]!]
    }

    // Pick one card per type until we have enough or exhaust types
    const picked = new Set<number>()
    const result: number[] = []
    for (const t of types) {
      if (result.length >= count) break
      const arr = byType.get(t)!
      const idx = arr.find((i) => !picked.has(i))
      if (idx !== undefined) {
        result.push(idx)
        picked.add(idx)
      }
    }

    // Fill remaining slots from unused cards (duplicates allowed now)
    if (result.length < count) {
      const remaining = catalog.map((_, i) => i).filter((i) => !picked.has(i))
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[remaining[i], remaining[j]] = [remaining[j]!, remaining[i]!]
      }
      for (const idx of remaining) {
        if (result.length >= count) break
        result.push(idx)
      }
    }

    return result.map((i) => catalog[i]!.id)
  })

  // --- Display card IDs (single = just center, fan = 7-card hand, carousel = 5-card coverflow) ---
  const displayCardIds = computed(() => {
    if (cardDisplayMode.value === 'carousel') {
      return carouselAllIds.value
    }

    const catalog = CARD_CATALOG.value
    if (catalog.length === 0) return []

    if (cardDisplayMode.value === 'fan') {
      return fanCardIds.value
    }

    if (cardDisplayMode.value === 'stack') {
      return stackCardIds.value
    }

    // Single mode — just the current card
    const idx = catalog.findIndex((c) => c.id === currentCardId.value)
    const validIdx = idx >= 0 ? idx : 0
    return [catalog[validIdx]!.id]
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

  /** Internal set-loading logic shared by switchSet and openPack. */
  async function switchSetInternal(setId: string) {
    setLoading.value = true
    try {
      clearCacheFn?.()
      currentSetId.value = setId
      const catalog = await loadSetCatalog(setId)
      const keepCurrent = catalog.some((c) => c.id === currentCardId.value)
      if (!keepCurrent) {
        currentCardId.value = catalog.length > 0 ? catalog[0]!.id : STARTUP_CARD_ID
      }
      CARD_CATALOG.value = catalog
    } finally {
      setLoading.value = false
    }
  }

  async function switchSet(setId: string) {
    if (setId === currentSetId.value && CARD_CATALOG.value.length > 0) return
    await switchSetInternal(setId)
  }

  /** Start the booster pack opening animation and load the set in parallel. */
  function openPack(setId: string) {
    if (packOpeningPhase.value !== 'idle') return
    packOpeningPhase.value = 'css-anim'

    // Stack mode on mobile, fan mode on desktop; refresh seed for new random cards
    cardDisplayMode.value = isMobile ? 'stack' : 'fan'
    sceneSeed.value = Date.now()

    // Start set loading in parallel (skip network if same set)
    // switchSetInternal manages setLoading ref — packCssAnimDone checks it
    if (setId !== currentSetId.value || CARD_CATALOG.value.length === 0) {
      switchSetInternal(setId)
    }
  }

  /** Called by modal when CSS animation phases (focus/shake/burst) finish. */
  function packCssAnimDone() {
    if (packOpeningPhase.value !== 'css-anim') return
    if (!setLoading.value) {
      // Load already finished — go straight to cascade
      packOpeningPhase.value = 'cascade'
      showBoosterModal.value = false
    } else {
      // Still loading — wait
      packOpeningPhase.value = 'waiting-load'
    }
  }

  // When load finishes during waiting-load, transition to cascade
  watch(
    () => setLoading.value,
    (loading) => {
      if (!loading && packOpeningPhase.value === 'waiting-load') {
        packOpeningPhase.value = 'cascade'
        showBoosterModal.value = false
      }
    },
  )

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
    stopHeroShowcase()
    isSlideshowActive.value = !isSlideshowActive.value
  }

  function toggleDimLights() {
    isDimmed.value = !isDimmed.value
  }

  function toggleIdleFloat() {
    isIdleFloatActive.value = !isIdleFloatActive.value
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
    stopHeroShowcase()
    const ids = fanCardIds.value
    if (fanIndex >= 0 && fanIndex < ids.length) {
      currentCardId.value = ids[fanIndex]!
      cardDisplayMode.value = 'single'
    }
  }

  /** Click a carousel card → load its set, navigate to it, enter single mode. */
  async function selectCarouselCard(compoundId: string) {
    const sep = compoundId.indexOf(':')
    if (sep < 0) return
    const setId = compoundId.slice(0, sep)
    const originalCardId = compoundId.slice(sep + 1)
    stopHeroShowcase()
    await switchSet(setId)
    currentCardId.value = originalCardId
    cardDisplayMode.value = 'single'
  }

  /** Build a shareable URL for the current card/set. */
  function shareUrl() {
    const url = new URL(window.location.origin + window.location.pathname)
    url.searchParams.set('set', currentSetId.value)
    url.searchParams.set('card', currentCardId.value)
    return url.toString()
  }

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
    stackCardIds,
    carouselHeroCatalog,
    carouselIndex,
    carouselAllIds,
    advanceCarousel,
    sceneSeed,
    inputMode,
    currentSetId,
    setLoading,
    isPanelOpen,
    isShaderPanelOpen,
    isTrackingActive,
    isHeroShowcaseActive,
    stopHeroShowcase,
    isSlideshowActive,
    isDimmed,
    isIdleFloatActive,
    isPerfOverlayOpen,
    statusText,
    showInstructions,
    showBoosterModal,
    packOpeningPhase,
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
    openPack,
    packCssAnimDone,
    randomizeSeed,
    toggleRenderMode,
    togglePanel,
    toggleShaderPanel,
    toggleSlideshow,
    toggleDimLights,
    toggleIdleFloat,
    togglePerfOverlay,
    toggleBoosterModal,
    setSceneMode,
    setHoveredFanCard,
    selectFanCard,
    selectCarouselCard,
    shareUrl,
  }
})
