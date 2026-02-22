import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  SpotLight,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from 'three'
import type { Texture } from 'three'
import { useAppStore } from '@/stores/app'
import { buildBoxShell } from '@/three/buildBox'
import { populateFurniture } from '@/three/buildFurniture'
import { CARD_ASPECT, buildActivationMaterial } from '@/three/buildCard'
import { mulberry32 } from '@/three/utils'
import { CardNavigator } from '@/three/CardNavigator'
import { MergeAnimator } from '@/three/MergeAnimator'
import { CardSceneBuilder } from '@/three/CardSceneBuilder'
import { FanAnimator } from '@/three/FanAnimator'
import { StackAnimator } from '@/three/StackAnimator'
import { updateShaderUniforms } from '@/three/ShaderUniformUpdater'
import { HERO_SHOWCASE } from '@/data/heroShowcase'
import { loadSetCatalog } from '@/data/cardCatalog'
import { useCardLoader } from './useCardLoader'
import { useUniformWatchers } from './useUniformWatchers'
import { useSceneTimers } from './useSceneTimers'
import { useMouseTilt } from './useMouseTilt'
import { useSwipeGesture } from './useSwipeGesture'
import { useGyroscope } from './useGyroscope'
import { perfTracker } from '@/utils/perfTracker'

export function useThreeScene(containerRef: Ref<HTMLElement | null>) {
  const store = useAppStore()

  let renderer: WebGLRenderer | null = null
  let scene: Scene | null = null
  let camera: PerspectiveCamera | null = null
  let animationId: number | null = null
  let lastTime = performance.now() * 0.001
  let dimStartTime = 0
  let wasDimmed = false

  // Card state
  const cardMeshes = shallowRef<Mesh[]>([])
  let cardAngle = 0
  let cardLoader: ReturnType<typeof useCardLoader> | null = null
  let wallTexture: Texture | null = null
  const mouseTilt = useMouseTilt()
  const gyroscope = useGyroscope()

  // Fan raycasting state
  const raycaster = new Raycaster()
  const mouseNDC = new Vector2()
  let lastHoveredFanIndex: number | null = null

  // Pack opening: custom intro origin for fan cards emerging from screen center
  let pendingIntroOrigin: { x: number; y: number; z: number } | null = null

  // Delegates
  const mergeAnimator = new MergeAnimator(store)
  const cardNavigator = new CardNavigator(
    store,
    () => scene,
    cardMeshes,
    () => mergeAnimator.reset(),
  )
  const cardSceneBuilder = new CardSceneBuilder(store, () => cardLoader)
  const fanAnimator = new FanAnimator(store, cardSceneBuilder, startCardActivation)
  const stackAnimator = new StackAnimator(store)
  const swipeGesture = useSwipeGesture({
    onSwipeUp: () => {
      if (store.cardDisplayMode !== 'stack') return
      if (stackAnimator.isIntroPlaying(cardMeshes.value) || stackAnimator.isSwiping) return
      stackAnimator.swipe(cardMeshes.value, 1)
    },
    onSwipeDown: () => {
      if (store.cardDisplayMode !== 'stack') return
      if (stackAnimator.isIntroPlaying(cardMeshes.value) || stackAnimator.isSwiping) return
      stackAnimator.swipe(cardMeshes.value, -1)
    },
  })

  function startCardActivation(mesh: Mesh) {
    if (mesh.userData.activationState !== 'pending') return
    const cardTex = mesh.userData.cardTexture as Texture
    const noiseTex = mesh.userData.noiseTexture as Texture | null
    const actMat = buildActivationMaterial(cardTex, noiseTex)
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose())
    } else {
      mesh.material.dispose()
    }
    mesh.material = actMat
    mesh.userData.activationState = 'activating'
    mesh.userData.activationStartTime = performance.now() * 0.001
  }

  function fanRaycast(clientX: number, clientY: number): number | null {
    if (store.cardDisplayMode !== 'fan' || !camera) return null
    mouseNDC.x = (clientX / window.innerWidth) * 2 - 1
    mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouseNDC, camera)
    const intersects = raycaster.intersectObjects(cardMeshes.value)
    return intersects.length > 0 ? (intersects[0]!.object.userData.fanIndex as number) : null
  }

  function isFanIntroPlaying(): boolean {
    return fanAnimator.isIntroPlaying(cardMeshes.value)
  }

  function onFanMouseMove(e: MouseEvent) {
    if (isFanIntroPlaying()) return
    // Disable hover peeks while a card is zoomed
    if (fanAnimator.zoomedFanIndex !== null) return
    const hit = fanRaycast(e.clientX, e.clientY)
    if (hit !== lastHoveredFanIndex) {
      lastHoveredFanIndex = hit
      store.setHoveredFanCard(hit ?? null)
      if (hit != null) {
        const mesh = cardMeshes.value.find((m) => m.userData.fanIndex === hit)
        if (mesh) startCardActivation(mesh)
      }
    }
  }

  function onFanTouchStart(e: TouchEvent) {
    if (store.cardDisplayMode !== 'fan' || !camera || isFanIntroPlaying()) return
    // If zoomed, touching anywhere returns to fan
    if (fanAnimator.zoomedFanIndex !== null) {
      fanAnimator.startReturnToFan(cardMeshes.value)
      return
    }
    const touch = e.touches[0]
    if (!touch) return
    const hit = fanRaycast(touch.clientX, touch.clientY)
    if (hit != null) {
      store.setHoveredFanCard(hit)
      const mesh = cardMeshes.value.find((m) => m.userData.fanIndex === hit)
      if (mesh) startCardActivation(mesh)
    }
  }

  function onFanClick(e: MouseEvent) {
    if (store.cardDisplayMode !== 'fan' || !camera || fanAnimator.isZooming) return
    if (isFanIntroPlaying()) return

    // If a card is zoomed, clicking anywhere returns to fan
    if (fanAnimator.zoomedFanIndex !== null) {
      fanAnimator.startReturnToFan(cardMeshes.value)
      return
    }

    const hit = fanRaycast(e.clientX, e.clientY)
    if (hit == null) return

    const mesh = cardMeshes.value.find((m) => m.userData.fanIndex === hit)
    if (!mesh) return

    // Ensure card is activated before zoom
    startCardActivation(mesh)

    // Start the zoom transition
    fanAnimator.startZoom(mesh, hit)
  }

  function onCarouselClick(e: MouseEvent) {
    if (store.cardDisplayMode !== 'carousel' || !camera) return
    if (e.button !== 0) return
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouseNDC, camera)
    const intersects = raycaster.intersectObjects(cardMeshes.value)
    if (intersects.length === 0) return
    const compoundId = intersects[0]!.object.userData.cardId as string | undefined
    if (compoundId && compoundId.includes(':')) {
      store.selectCarouselCard(compoundId)
    }
  }

  /** Click on empty box space → return to fan (desktop only). */
  function onSceneClick(e: MouseEvent) {
    if (store.isMobile) return
    if (e.button !== 0) return
    if (!camera) return

    // Fan mode with zoomed card: click empty space to un-zoom
    if (store.cardDisplayMode === 'fan' && fanAnimator.zoomedFanIndex !== null) {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(mouseNDC, camera)
      const hits = raycaster.intersectObjects(cardMeshes.value)
      if (hits.length > 0) return // card click handled by onFanClick
      fanAnimator.startReturnToFan(cardMeshes.value)
      return
    }

  }

  function init() {
    const container = containerRef.value
    if (!container) return

    scene = new Scene()
    scene.background = new Color(0x0a1628)

    renderer = new WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    mouseTilt.attach(renderer.domElement)
    swipeGesture.attach(renderer.domElement)

    camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      store.config.nearPlane,
      store.config.farPlane,
    )

    // Init card loader
    cardLoader = useCardLoader(renderer)

    // Register cache clear callback with the store
    store.registerCacheClear(() => cardLoader?.clearCache())

    // Load iridescent textures for special illustration rare cards
    cardLoader.loadIriTextures()
    cardLoader.loadSparkleIriTextures()

    // Load birthday textures for double rare cards
    cardLoader.loadBirthdayTextures()

    // Load glitter texture for illustration rare cards
    cardLoader.loadGlitterTexture()

    // Load noise texture for master ball sparkle layer 2
    cardLoader.loadNoiseTexture()

    // Load card-back texture
    cardLoader.loadCardBackTexture()

    // Load wall texture for box interior
    const textureLoader = new TextureLoader()
    textureLoader.setCrossOrigin('anonymous')
    textureLoader.load(
      '151-pattern-default.webp',
      (texture) => {
        wallTexture = texture
        rebuildScene()
      },
      undefined,
      () => {
        console.warn('[useThreeScene] Failed to load wall texture: 151-pattern-default.webp')
        store.addToast('Texture "151-pattern-default.webp" could not be loaded')
        rebuildScene()
      },
    )

    // Set initial eye position
    const dims = store.dimensions
    store.eyePos.x = 0
    store.eyePos.y = 0
    store.eyePos.z = dims.eyeDefaultZ
    store.targetEye.x = 0
    store.targetEye.y = 0
    store.targetEye.z = dims.eyeDefaultZ

    // Load initial set catalog — switchSet updates CARD_CATALOG + currentCardId,
    // which triggers the displayCardIds watcher to load textures and rebuild.
    store.switchSet(store.currentSetId)

    // Preload hero set JSONs (fire-and-forget) so cross-set transitions only need texture loads
    const heroSetIds = [...new Set(HERO_SHOWCASE.map((h) => h.setId))]
    for (const setId of heroSetIds) loadSetCatalog(setId).catch(() => {})

    // Also build immediately (without card textures if not ready yet)
    rebuildScene()

    // On HMR re-init, switchSet is a no-op (set already loaded) so the
    // displayCardIds watcher never fires. Load textures explicitly to restore cards.
    const ids = store.displayCardIds
    if (ids.length > 0) {
      cardLoader.loadCards(ids).then(() => rebuildScene())
    }

    // Start render loop
    lastTime = performance.now() * 0.001
    animate()

    // Resize handler
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKeydown)
    renderer.domElement.addEventListener('mousemove', onFanMouseMove)
    renderer.domElement.addEventListener('click', onFanClick)
    renderer.domElement.addEventListener('click', onCarouselClick)
    renderer.domElement.addEventListener('click', onSceneClick)
    renderer.domElement.addEventListener('touchstart', onFanTouchStart)
  }

  function rebuildScene() {
    if (!scene) return
    perfTracker.markRebuildStart()

    // Clear scene
    while (scene.children.length) scene.remove(scene.children[0]!)
    cardMeshes.value = []
    fanAnimator.reset()
    stackAnimator.reset()

    const dims = store.dimensions
    const renderMode = store.renderMode

    // Build box shell
    buildBoxShell(scene, dims, renderMode, wallTexture, store.config.lights)

    // Furniture mode
    if (store.sceneMode === 'furniture') {
      const origRandom = Math.random
      Math.random = mulberry32(store.sceneSeed)
      populateFurniture(scene, dims, renderMode)
      Math.random = origRandom
    }

    // Card mode
    if (store.sceneMode === 'cards') {
      const origin = pendingIntroOrigin
      pendingIntroOrigin = null
      cardMeshes.value = cardSceneBuilder.build(scene!, cardAngle, origin)
    }

    perfTracker.markRebuildEnd()
  }

  /** Remove only card meshes and rebuild them, preserving lights/box/furniture. */
  function rebuildCardsOnly() {
    if (!scene || store.sceneMode !== 'cards') return

    // Remove existing card meshes from scene
    for (const mesh of cardMeshes.value) {
      scene.remove(mesh)
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose())
      } else {
        mesh.material.dispose()
      }
      mesh.geometry.dispose()
    }
    cardMeshes.value = []
    fanAnimator.reset()
    stackAnimator.reset()

    // Rebuild card meshes only
    const origin = pendingIntroOrigin
    pendingIntroOrigin = null
    cardMeshes.value = cardSceneBuilder.build(scene, cardAngle, origin)
    cardNavigator.onSceneRebuilt()
  }

  function updateOffAxisCamera(ex: number, ey: number, ez: number) {
    if (!camera || ez <= 0) return

    const dims = store.dimensions
    const near = store.config.nearPlane
    const far = store.config.farPlane
    const { screenW, screenH } = dims

    const screenLeft = -screenW / 2
    const screenRight = screenW / 2
    const screenBottom = -screenH / 2
    const screenTop = screenH / 2

    const n_over_d = near / ez

    const left = (screenLeft - ex) * n_over_d
    const right = (screenRight - ex) * n_over_d
    const bottom = (screenBottom - ey) * n_over_d
    const top = (screenTop - ey) * n_over_d

    camera.position.set(ex, ey, ez)
    camera.lookAt(ex, ey, 0)
    camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far)
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  }

  function animate() {
    animationId = requestAnimationFrame(animate)
    if (!renderer || !scene || !camera) return

    const time = performance.now() * 0.001
    const dt = Math.min(time - lastTime, 0.1)
    lastTime = time

    // Smooth eye position toward target
    const s = store.config.smoothing
    store.eyePos.x += (store.targetEye.x - store.eyePos.x) * s
    store.eyePos.y += (store.targetEye.y - store.eyePos.y) * s
    store.eyePos.z += (store.targetEye.z - store.eyePos.z) * s

    // Update off-axis camera
    updateOffAxisCamera(store.eyePos.x, store.eyePos.y, store.eyePos.z)

    // Spotlight (fixed position — intensity updated below)
    const spotlight = scene.getObjectByName('headSpotlight') as SpotLight | undefined

    // Update tilt springs (gyroscope or mouse)
    const tilt = gyroscope.isActive.value ? gyroscope : mouseTilt
    tilt.update(dt)

    // Auto-rotate cards
    const meshes = cardMeshes.value
    if (meshes.length > 0 && store.config.cardSpinSpeed !== 0) {
      cardAngle += store.config.cardSpinSpeed * (Math.PI / 180) * dt
    }

    const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
    if (store.cardDisplayMode === 'carousel') {
      // Carousel mode: smooth slide animation — lerp each card toward its target slot
      const peekSpeed = 1 - Math.pow(0.001, dt)
      let frontMesh: Mesh | null = null
      let frontAbsRotY = Infinity
      for (const mesh of meshes) {
        const target = mesh.userData.carouselTarget as
          | { x: number; y: number; z: number; rotY: number; scale: number }
          | undefined
        if (!target) continue
        // Lerp position
        mesh.position.x += (target.x - mesh.position.x) * peekSpeed
        mesh.position.y += (target.y - mesh.position.y) * peekSpeed
        mesh.position.z += (target.z - mesh.position.z) * peekSpeed
        // Lerp scale
        const s = mesh.scale.x + (target.scale - mesh.scale.x) * peekSpeed
        mesh.scale.setScalar(s)
        // Lerp Y rotation (shortest path)
        let rotDiff = target.rotY - mesh.rotation.y
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
        mesh.rotation.y += rotDiff * peekSpeed
        // Gentle tilt from head tracking
        mesh.rotation.x = tilt.state.rotateX * 0.3
        // Track front card (smallest |rotY| = closest to viewer)
        const absRotY = Math.abs(target.rotY)
        if (absRotY < frontAbsRotY) {
          frontAbsRotY = absRotY
          frontMesh = mesh
        }
      }
      // Float animation on the front (prime spot) card
      if (frontMesh) {
        const dims = store.dimensions
        const amp = dims.screenH * 0.001
        frontMesh.rotation.y += Math.sin(time * 0.7) * 0.025
        frontMesh.rotation.x += Math.sin(time * 0.9 + 0.5) * 0.01
        frontMesh.position.x += Math.sin(time * 1.9) * amp * 1.0
        frontMesh.position.y += Math.sin(time * 1.4 + 1.0) * amp
      }
    } else if (store.cardDisplayMode === 'fan') {
      fanAnimator.tick(meshes, time, dt, tilt.state)
    } else if (store.cardDisplayMode === 'stack') {
      stackAnimator.tick(meshes, time, dt, tilt.state)
    } else {
      for (const mesh of meshes) {
        mesh.rotation.x = tilt.state.rotateX
        const explodeRotY = mesh.userData.explodeRotationY || 0
        mesh.rotation.y = baseRotY + tilt.state.rotateY + explodeRotY
      }
    }

    // Idle float rotation — applied before shader uniforms so the holo effect
    // sees the card's actual tilted orientation (position offsets applied later,
    // after merge animator which does absolute position.set())
    if (store.cardDisplayMode === 'single' && store.isIdleFloatActive) {
      for (const mesh of meshes) {
        mesh.rotation.y += Math.sin(time * 0.7) * 0.14
        mesh.rotation.x += Math.sin(time * 0.9 + 0.5) * 0.025
      }
    }

    // Update holo shader uniforms for all cards
    updateShaderUniforms(
      meshes,
      time,
      store.eyePos,
      store.dimensions,
      store.cardDisplayMode,
      store.singleCardSize,
      store.config.cardSize,
    )

    // Animate card transitions (departing fade-out + push-back, arriving fade-in)
    cardNavigator.tick(time)

    // Animate merge/explode for single card layers
    mergeAnimator.tick(meshes)

    // Idle float position offsets — applied after merge animator (which does absolute position.set())
    if (store.cardDisplayMode === 'single' && store.isIdleFloatActive) {
      const dims = store.dimensions
      const amp = dims.screenH * 0.012
      for (const mesh of meshes) {
        mesh.position.x += Math.sin(time * 1.9) * amp * 1.2
        mesh.position.y += 1.0 + Math.sin(time * 1.4 + 1.0) * amp
      }
    }

    // Animate scene objects
    scene.traverse((obj) => {
      if (obj.userData.animate) obj.userData.animate(time)
    })

    // Smooth dim/brighten lights in solid mode
    const dimRate = 0.03
    const ambient = scene.getObjectByName('solidAmbient') as AmbientLight | undefined
    const dirLight = scene.getObjectByName('solidDir') as DirectionalLight | undefined
    const back = scene.getObjectByName('solidBack') as PointLight | undefined
    if (ambient && dirLight && back) {
      const targetA = store.isDimmed ? 0.02 : store.config.lights.ambientIntensity
      const targetD = store.isDimmed ? 0.0 : store.config.lights.directionalIntensity
      const targetB = store.isDimmed ? 3.5 : store.config.lights.backlightIntensity
      ambient.intensity += (targetA - ambient.intensity) * dimRate
      dirLight.intensity += (targetD - dirLight.intensity) * dimRate
      back.intensity += (targetB - back.intensity) * dimRate
    }

    // Track dim transition for candle stagger timing
    if (store.isDimmed && !wasDimmed) dimStartTime = time
    wasDimmed = store.isDimmed

    // Animate candle lights + flames (staggered on, together off, with flicker)
    for (let i = 0; i < 5; i++) {
      const candle = scene.getObjectByName(`candle${i}`) as PointLight | undefined
      const flame = scene.getObjectByName(`candleFlame${i}`) as Mesh | undefined
      if (!candle) continue
      if (store.isDimmed) {
        const elapsed = time - dimStartTime
        const delay = i * 0.3
        const baseTarget = elapsed > delay ? 0.8 : 0
        const flicker = baseTarget * (0.9 + 0.1 * Math.sin(time * (3 + i * 0.7)))
        candle.intensity += (flicker - candle.intensity) * dimRate
        // Flame visibility + wobble
        if (flame) {
          const targetOpacity = baseTarget > 0 ? 0.9 : 0
          const mat = flame.material as { opacity: number }
          mat.opacity += (targetOpacity - mat.opacity) * dimRate
          const scaleFlicker = 0.85 + 0.15 * Math.sin(time * (4 + i * 1.1))
          flame.scale.set(scaleFlicker, 0.9 + 0.2 * Math.sin(time * (3.5 + i * 0.9)), scaleFlicker)
        }
      } else {
        candle.intensity += (0 - candle.intensity) * dimRate
        if (flame) {
          const mat = flame.material as { opacity: number }
          mat.opacity += (0 - mat.opacity) * dimRate
        }
      }
    }

    // Update spotlight from config
    if (spotlight) {
      const targetSpot = store.isDimmed ? 0 : store.config.lights.spotlightIntensity
      spotlight.intensity += (targetSpot - spotlight.intensity) * dimRate
      const { screenW, screenH, boxD } = store.dimensions
      const spotX = store.config.lights.spotlightX
      const spotY = store.config.lights.spotlightY
      spotlight.position.set(
        (screenW / 2) * spotX,
        (screenH / 2) * spotY,
        boxD * 0.1,
      )
      spotlight.target.position.set(
        -(screenW / 2) * spotX * 0.4,
        -(screenH / 2) * spotY * 0.2,
        -boxD * 0.6,
      )
      spotlight.target.updateMatrixWorld()
      spotlight.angle = (store.config.lights.spotlightAngle * Math.PI) / 180
      spotlight.penumbra = store.config.lights.spotlightPenumbra
    }

    renderer.render(scene, camera)

    perfTracker.sampleFrame()
    perfTracker.sampleRendererInfo(renderer.info)
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (store.sceneMode !== 'cards') return
    // Carousel mode: N/B rotate the carousel
    if (store.cardDisplayMode === 'carousel') {
      if (e.key === 'n') {
        store.advanceCarousel(1)
        sceneTimers.resetCarouselTimer()
      } else if (e.key === 'b') {
        store.advanceCarousel(-1)
        sceneTimers.resetCarouselTimer()
      }
      return
    }
    // Fan mode: if zoomed, N/B returns to fan; otherwise shuffles to a new hand
    if (store.cardDisplayMode === 'fan') {
      if (e.key === 'n' || e.key === 'b') {
        if (fanAnimator.zoomedFanIndex !== null) {
          fanAnimator.startReturnToFan(cardMeshes.value)
        } else {
          store.randomizeSeed()
        }
      }
      return
    }
    if (cardNavigator.handleKeydown(e)) {
      store.isSlideshowActive = false
      store.stopHeroShowcase()
    } else {
      mergeAnimator.handleKeydown(e, cardMeshes.value.length)
    }
  }

  function onResize() {
    if (!renderer) return
    store.updateViewport(window.innerWidth, window.innerHeight)
    renderer.setSize(window.innerWidth, window.innerHeight)
    rebuildScene()
  }

  // Watch for config changes that need rebuilds
  watch(
    () => [
      store.sceneMode,
      store.renderMode,
      store.sceneSeed,
      store.rebuildCounter,
      store.config.screenWidthCm,
      store.config.screenHeightCm,
      store.config.viewingDistanceCm,
      store.config.boxDepthRatio,
      store.config.cardSize,
      store.singleCardSize,
      store.cardDisplayMode,
    ],
    () => {
      // During pack opening, the cascade phase handles the rebuild with intro origin
      const phase = store.packOpeningPhase
      if (phase === 'css-anim' || phase === 'waiting-load') return
      rebuildScene()
    },
  )

  // Watch card transform changes (reposition all cards)
  watch(
    () => [
      store.cardTransform.x,
      store.cardTransform.y,
      store.cardTransform.z,
      store.cardTransform.rotY,
    ],
    () => {
      if (
        store.cardDisplayMode === 'fan' ||
        store.cardDisplayMode === 'carousel' ||
        store.cardDisplayMode === 'stack'
      )
        return
      const meshes = cardMeshes.value
      if (!meshes.length) return
      const dims = store.dimensions
      const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
      const centerX = (store.cardTransform.x / 100) * dims.screenW
      const cy = (store.cardTransform.y / 100) * dims.screenH
      const cz = -(store.cardTransform.z / 100) * dims.boxD

      const cardH = dims.screenH * store.singleCardSize
      const cardW = cardH * CARD_ASPECT
      const zGap = dims.boxD * 0.08
      const xGap = cardW * 0.35
      const n = meshes.length
      meshes.forEach((mesh, i) => {
        const xOff = n > 1 ? (i - 1) * xGap : 0
        mesh.position.set(centerX + xOff, cy, cz - i * zGap)
        mesh.rotation.y = baseRotY
      })
    },
  )

  // Watch display card selection changes (load + rebuild with transition)
  watch(
    () => store.displayCardIds,
    (ids) => {
      if (!cardLoader || ids.length === 0) return
      // During pack opening, the cascade phase handles the rebuild with intro origin
      const phase = store.packOpeningPhase
      if (phase === 'css-anim' || phase === 'waiting-load') return
      if (store.cardDisplayMode === 'carousel') {
        const entries = store.carouselHeroCatalog.filter((e) => ids.includes(e.id))
        cardLoader.loadHeroCards(entries).then(() => rebuildCardsOnly())
      } else {
        cardLoader.loadCards(ids).then(() => {
          rebuildCardsOnly()
        })
      }
    },
  )

  // Watch pack opening phase — set intro origin and trigger rebuild when cascade starts
  watch(
    () => store.packOpeningPhase,
    (phase) => {
      if (phase === 'cascade') {
        // Compute screen center in scene coordinates as the intro origin
        const dims = store.dimensions
        const centerX = (store.cardTransform.x / 100) * dims.screenW
        const centerY = (store.cardTransform.y / 100) * dims.screenH
        const centerZ = -(store.cardTransform.z / 100) * dims.boxD
        pendingIntroOrigin = { x: centerX, y: centerY, z: centerZ }

        // If textures are already loaded, trigger rebuild immediately
        if (cardLoader && store.displayCardIds.length > 0) {
          cardLoader.loadCards(store.displayCardIds).then(() => {
            rebuildCardsOnly()
          })
        }
      }
    },
  )

  // Watch carousel index — update slot targets on existing meshes (no rebuild)
  watch(
    () => store.carouselIndex,
    () => {
      if (store.cardDisplayMode !== 'carousel') return
      cardSceneBuilder.updateCarouselTargets(cardMeshes.value)
    },
  )

  // Register shader uniform watchers (push store config changes to shader uniforms)
  useUniformWatchers(store, cardMeshes)

  // Register slideshow, carousel, and hero showcase timers
  const sceneTimers = useSceneTimers(store, cardNavigator)

  function dispose() {
    if (animationId !== null) cancelAnimationFrame(animationId)
    sceneTimers.dispose()
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKeydown)
    renderer?.domElement.removeEventListener('mousemove', onFanMouseMove)
    renderer?.domElement.removeEventListener('click', onFanClick)
    renderer?.domElement.removeEventListener('click', onCarouselClick)
    renderer?.domElement.removeEventListener('click', onSceneClick)
    renderer?.domElement.removeEventListener('touchstart', onFanTouchStart)
    mouseTilt.detach()
    swipeGesture.detach()
    gyroscope.stop()
    renderer?.dispose()
  }

  onBeforeUnmount(() => {
    dispose()
  })

  // Expose card mesh data for e2e test introspection (dev only)
  if (import.meta.env.DEV) {
    ;(window as unknown as Record<string, unknown>).__POKEBOX_DEBUG__ = {
      getCardMeshes: () =>
        cardMeshes.value.map((m) => ({
          id: m.userData.cardId as string,
          heroIndex: m.userData.carouselHeroIndex as number | undefined,
          x: m.position.x,
          y: m.position.y,
          z: m.position.z,
          scaleX: m.scale.x,
          rotY: m.rotation.y,
          target: m.userData.carouselTarget as
            | { x: number; y: number; z: number; rotY: number; scale: number }
            | undefined,
        })),
    }
  }

  return { init, rebuildScene, dispose, gyroscope }
}
