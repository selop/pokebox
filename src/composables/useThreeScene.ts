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
  ShaderMaterial,
  SpotLight,
  TextureLoader,
  Vector2,
  Vector3,
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
import { CardSceneBuilder, CARD_X_OFFSETS, CARD_Z_OFFSETS } from '@/three/CardSceneBuilder'
import { useCardLoader } from './useCardLoader'
import { useMouseTilt } from './useMouseTilt'
import { useGyroscope } from './useGyroscope'
import { perfTracker } from '@/utils/perfTracker'

export function useThreeScene(containerRef: Ref<HTMLElement | null>) {
  const store = useAppStore()

  let renderer: WebGLRenderer | null = null
  let scene: Scene | null = null
  let camera: PerspectiveCamera | null = null
  let animationId: number | null = null
  let lastTime = performance.now() * 0.001

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

  const FLIP_DURATION = 1.5
  let flipStartTime = -1
  const ACTIVATION_DURATION = 1.0

  // Fan-to-single zoom transition state
  let fanZoomTransition: {
    fanIndex: number
    startTime: number
    duration: number
    // Snapshot of the clicked card's starting transform
    startPos: { x: number; y: number; z: number }
    startRotZ: number
    startScale: number
  } | null = null
  const FAN_ZOOM_DURATION = 0.8

  function triggerFlip() {
    if (flipStartTime < 0) {
      flipStartTime = performance.now() * 0.001
    }
  }

  // Delegates
  const mergeAnimator = new MergeAnimator(store)
  const cardNavigator = new CardNavigator(
    store,
    () => scene,
    cardMeshes,
    () => mergeAnimator.reset(),
  )
  const cardSceneBuilder = new CardSceneBuilder(store, () => cardLoader)

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
    return cardMeshes.value.some((m) => m.userData.fanIntro)
  }

  function onFanMouseMove(e: MouseEvent) {
    if (isFanIntroPlaying()) return
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
    if (store.cardDisplayMode !== 'fan' || !camera || fanZoomTransition) return
    if (isFanIntroPlaying()) return
    const hit = fanRaycast(e.clientX, e.clientY)
    if (hit == null) return

    const mesh = cardMeshes.value.find((m) => m.userData.fanIndex === hit)
    if (!mesh) return

    // Ensure card is activated before zoom
    startCardActivation(mesh)

    // Snapshot current transform and start the zoom transition
    fanZoomTransition = {
      fanIndex: hit,
      startTime: performance.now() * 0.001,
      duration: FAN_ZOOM_DURATION,
      startPos: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      startRotZ: mesh.rotation.z,
      startScale: mesh.scale.x,
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
    textureLoader.load('151-pattern-default.webp', (texture) => {
      wallTexture = texture
      rebuildScene()
    })

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
    renderer.domElement.addEventListener('touchstart', onFanTouchStart)
  }

  function rebuildScene() {
    if (!scene) return
    perfTracker.markRebuildStart()

    // Clear scene
    while (scene.children.length) scene.remove(scene.children[0]!)
    cardMeshes.value = []
    fanZoomTransition = null

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
      cardMeshes.value = cardSceneBuilder.build(scene!, cardAngle)
    }

    perfTracker.markRebuildEnd()
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

    // Update head-tracked spotlight position
    const spotlight = scene.getObjectByName('headSpotlight') as SpotLight | undefined
    if (spotlight) {
      spotlight.position.set(store.eyePos.x * 0.8, store.eyePos.y * 0.8, store.eyePos.z * 0.6)
      spotlight.target.position.set(0, 0, -store.dimensions.boxD * 0.5)
      spotlight.target.updateMatrixWorld()
    }

    // Update tilt springs (gyroscope or mouse)
    const tilt = gyroscope.isActive.value ? gyroscope : mouseTilt
    tilt.update(dt)

    // Auto-rotate cards
    const meshes = cardMeshes.value
    if (meshes.length > 0 && store.config.cardSpinSpeed !== 0) {
      cardAngle += store.config.cardSpinSpeed * (Math.PI / 180) * dt
    }

    let flipAngle = 0
    if (flipStartTime >= 0) {
      const t = Math.min((time - flipStartTime) / FLIP_DURATION, 1)
      // Cubic ease-in-out: accelerates then decelerates like a figure skater spin
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      flipAngle = ease * Math.PI * 2
      if (t >= 1) flipStartTime = -1
    }

    const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
    if (store.cardDisplayMode === 'fan') {
      // Fan mode: smooth peek animation — lerp each card toward rest or hover target
      const peekSpeed = 1 - Math.pow(0.001, dt) // ~0.12 per frame at 60fps, frame-rate independent
      const hoveredIdx = store.hoveredFanCard
      for (const mesh of meshes) {
        const rest = mesh.userData.fanRest as
          | { x: number; y: number; z: number; rotZ: number; scale: number }
          | undefined
        const hover = mesh.userData.fanHover as
          | { x: number; y: number; z: number; rotZ: number; scale: number }
          | undefined
        const intro = mesh.userData.fanIntro as
          | {
              x: number; y: number; z: number; rotZ: number; scale: number
              delay: number; duration: number; startTime: number
            }
          | undefined
        if (!rest || !hover) continue

        // Staggered intro animation: ease from intro position to rest
        if (intro) {
          const elapsed = time - intro.startTime - intro.delay
          if (elapsed < 0) {
            // Not started yet — stay at intro position
            mesh.position.set(intro.x, intro.y, intro.z)
            mesh.rotation.z = intro.rotZ
            mesh.scale.setScalar(intro.scale)
            mesh.rotation.x = 0
            mesh.rotation.y = 0
            continue
          }
          const t = Math.min(elapsed / intro.duration, 1)
          // Ease-out back: overshoots slightly then settles (pop feel)
          const c1 = 1.70158
          const c3 = c1 + 1
          const ease = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)

          mesh.position.x = intro.x + (rest.x - intro.x) * ease
          mesh.position.y = intro.y + (rest.y - intro.y) * ease
          mesh.position.z = intro.z + (rest.z - intro.z) * ease
          mesh.rotation.z = intro.rotZ + (rest.rotZ - intro.rotZ) * ease
          const s = intro.scale + (rest.scale - intro.scale) * ease
          mesh.scale.setScalar(s)
          mesh.rotation.x = tilt.state.rotateX * 0.5 * ease
          mesh.rotation.y = tilt.state.rotateY * 0.3 * ease

          if (t >= 1) {
            // Intro complete — remove intro data so normal hover takes over
            delete mesh.userData.fanIntro
          }
          continue
        }

        // Skip normal peek if zoom transition is driving positions
        if (fanZoomTransition) continue

        const isHovered = mesh.userData.fanIndex === hoveredIdx && !isFanIntroPlaying()
        const target = isHovered ? hover : rest
        const n = meshes.length

        // Lerp position
        mesh.position.x += (target.x - mesh.position.x) * peekSpeed
        mesh.position.y += (target.y - mesh.position.y) * peekSpeed
        mesh.position.z += (target.z - mesh.position.z) * peekSpeed

        // Lerp rotation.z (fan tilt)
        mesh.rotation.z += (target.rotZ - mesh.rotation.z) * peekSpeed

        // Lerp scale
        const s = mesh.scale.x + (target.scale - mesh.scale.x) * peekSpeed
        mesh.scale.setScalar(s)

        // Gentle head-tracking tilt on x/y axes
        mesh.rotation.x = tilt.state.rotateX * 0.5
        mesh.rotation.y = tilt.state.rotateY * 0.3

        // Dynamic renderOrder: hovered card always on top
        const baseOrder = (mesh.userData.fanBaseRenderOrder as number) ?? n
        mesh.renderOrder = isHovered ? 100 : baseOrder
      }

      // ── Fan-to-single zoom transition ──────────────────
      if (fanZoomTransition) {
        const zt = fanZoomTransition
        const elapsed = time - zt.startTime
        const rawT = Math.min(elapsed / zt.duration, 1.0)
        // Cubic ease-in-out
        const ease = rawT < 0.5
          ? 4 * rawT * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 3) / 2

        // Target: center of the scene, scaled up to single card size
        const dims = store.dimensions
        const targetX = (store.cardTransform.x / 100) * dims.screenW
        const targetY = (store.cardTransform.y / 100) * dims.screenH
        const targetZ = -(store.cardTransform.z / 100) * dims.boxD
        const singleScale = store.singleCardSize / (store.config.cardSize * 0.85)

        for (const mesh of meshes) {
          const isFocused = mesh.userData.fanIndex === zt.fanIndex
          if (isFocused) {
            // Zoom + flip to center
            mesh.position.x = zt.startPos.x + (targetX - zt.startPos.x) * ease
            mesh.position.y = zt.startPos.y + (targetY - zt.startPos.y) * ease
            mesh.position.z = zt.startPos.z + (targetZ - zt.startPos.z) * ease
            mesh.rotation.z = zt.startRotZ * (1 - ease)
            mesh.rotation.y = ease * Math.PI * 2 // full flip
            const s = zt.startScale + (singleScale - zt.startScale) * ease
            mesh.scale.setScalar(s)
            mesh.renderOrder = 200
          } else {
            // Fade out other cards by scaling down and becoming transparent
            const fadeScale = mesh.scale.x * (1 - ease * 0.5)
            mesh.scale.setScalar(Math.max(fadeScale, 0.01))
            if ((mesh.material as any).opacity !== undefined) {
              ;(mesh.material as any).opacity = 1 - ease
            }
          }
        }

        if (rawT >= 1.0) {
          // Transition complete — switch to single mode
          store.selectFanCard(zt.fanIndex)
          fanZoomTransition = null
        }
      }

      // ── Drive activation progress for cards being activated ──
      for (const mesh of meshes) {
        if (mesh.userData.activationState !== 'activating') continue
        const startTime = mesh.userData.activationStartTime as number
        const progress = Math.min((time - startTime) / ACTIVATION_DURATION, 1.0)
        const mat = mesh.material as ShaderMaterial
        if (mat.isShaderMaterial && mat.uniforms['uProgress']) {
          mat.uniforms['uProgress']!.value = progress
        }
        if (progress >= 1.0) {
          cardSceneBuilder.upgradeFanCardShader(mesh)
          mesh.userData.activationState = 'done'
        }
      }
    } else {
      for (const mesh of meshes) {
        mesh.rotation.x = tilt.state.rotateX
        const explodeRotY = mesh.userData.explodeRotationY || 0
        mesh.rotation.y = baseRotY + tilt.state.rotateY + explodeRotY + flipAngle
      }
    }

    // Update holo shader uniforms for all cards
    for (const mesh of meshes) {
      if (!(mesh.material as ShaderMaterial).isShaderMaterial) continue
      const u = (mesh.material as ShaderMaterial).uniforms
      u['uTime']!.value = time

      // Eye-based shader uniforms (face tracking / keyboard)
      mesh.updateMatrixWorld()
      const cardPos = new Vector3()
      mesh.getWorldPosition(cardPos)

      const eyeVec = new Vector3(store.eyePos.x, store.eyePos.y, store.eyePos.z)
      const dir = eyeVec.clone().sub(cardPos)

      const cardRight = new Vector3(1, 0, 0).applyQuaternion(mesh.quaternion)
      const cardUp = new Vector3(0, 1, 0).applyQuaternion(mesh.quaternion)

      const dims = store.dimensions
      const effectiveSize =
        store.cardDisplayMode === 'single'
          ? store.singleCardSize
          : store.cardDisplayMode === 'fan'
            ? store.config.cardSize * 0.85
            : store.config.cardSize
      const cardH = dims.screenH * effectiveSize
      const cardW = cardH * CARD_ASPECT

      const localX = dir.dot(cardRight) / cardW + 0.5
      const localY = dir.dot(cardUp) / cardH + 0.5

      const px = Math.max(0, Math.min(1, localX))
      const py = Math.max(0, Math.min(1, localY))
      if (u['uPointer']) (u['uPointer']!.value as Vector2).set(px, py)

      if (u['uBackground']) {
        const bx = 0.37 + Math.max(0, Math.min(1, localX)) * 0.26
        const by = 0.37 + Math.max(0, Math.min(1, localY)) * 0.26
        ;(u['uBackground']!.value as Vector2).set(bx, by)
      }

      const dx = px - 0.5,
        dy = py - 0.5
      if (u['uPointerFromCenter']) u['uPointerFromCenter']!.value = Math.min(Math.sqrt(dx * dx + dy * dy) * 2.0, 1.0)

      // Additional uniforms for ultra-rare shader
      if (u['uPointerFromLeft']) u['uPointerFromLeft']!.value = px
      if (u['uPointerFromTop']) u['uPointerFromTop']!.value = py
      if (u['uRotateX']) u['uRotateX']!.value = mesh.rotation.y * (180 / Math.PI)
    }

    // Animate card transitions (departing fade-out + push-back, arriving fade-in)
    cardNavigator.tick(time)

    // Animate merge/explode for single card layers
    mergeAnimator.tick(meshes)

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

    // Update spotlight intensity from config
    if (spotlight) {
      spotlight.intensity += (store.config.lights.spotlightIntensity - spotlight.intensity) * dimRate
    }

    renderer.render(scene, camera)

    perfTracker.sampleFrame()
    perfTracker.sampleRendererInfo(renderer.info)
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (store.sceneMode !== 'cards') return
    if (e.key === 'f') {
      triggerFlip()
      return
    }
    // Fan mode: N/B shuffle to a new random hand
    if (store.cardDisplayMode === 'fan') {
      if (e.key === 'n' || e.key === 'b') {
        store.randomizeSeed()
      }
      return
    }
    if (cardNavigator.handleKeydown(e)) {
      store.isSlideshowActive = false
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
      rebuildScene()
    },
  )

  // Auto-dim lights when transitioning from fan to single mode (after rebuild so lights animate)
  watch(
    () => store.cardDisplayMode,
    (mode, oldMode) => {
      if (oldMode === 'fan' && mode === 'single') {
        store.isDimmed = true
      }
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
      if (store.cardDisplayMode === 'fan') return
      const meshes = cardMeshes.value
      if (!meshes.length) return
      const dims = store.dimensions
      const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
      const centerX = (store.cardTransform.x / 100) * dims.screenW
      const cy = (store.cardTransform.y / 100) * dims.screenH
      const cz = -(store.cardTransform.z / 100) * dims.boxD

      if (store.cardDisplayMode === 'single') {
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
      } else {
        const { spacing, y, z, boxD } = cardSceneBuilder.cardLayout()
        meshes.forEach((mesh, i) => {
          const xPos = centerX + (i - 1) * spacing + CARD_X_OFFSETS[i]! * spacing
          mesh.position.set(xPos, y, z + CARD_Z_OFFSETS[i]! * boxD)
          mesh.rotation.y = baseRotY
        })
      }
    },
  )

  // Watch display card selection changes (load + rebuild with transition)
  watch(
    () => store.displayCardIds,
    (ids) => {
      if (!cardLoader || ids.length === 0) return
      cardLoader.loadCards(ids).then(() => {
        rebuildScene()
        cardNavigator.onSceneRebuilt()
      })
    },
  )

  // Helper: watch a store config getter and push its value to a shader uniform on all card meshes
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

  // Holo intensity
  watchUniform(() => store.config.holoIntensity, 'uCardOpacity')

  // Illustration-rare shader parameters
  const illustRareUniformMap: [() => number, string][] = [
    [() => store.config.shaders.illustrationRare.rainbowScale, 'uRainbowScale'],
    [() => store.config.shaders.illustrationRare.barAngle, 'uBarAngle'],
    [() => store.config.shaders.illustrationRare.barDensity, 'uBarDensity'],
    [() => store.config.shaders.illustrationRare.barDensity2, 'uBarDensity2'],
    [() => store.config.shaders.illustrationRare.barOffsetBgYMult, 'uBarOffsetBgYMult'],
    [() => store.config.shaders.illustrationRare.bar2OffsetBgYMult, 'uBar2OffsetBgYMult'],
    [() => store.config.shaders.illustrationRare.barWidth, 'uBarWidth'],
    [() => store.config.shaders.illustrationRare.barWidth2, 'uBarWidth2'],
    [() => store.config.shaders.illustrationRare.barIntensity, 'uBarIntensity'],
    [() => store.config.shaders.illustrationRare.barHue, 'uBarHue'],
    [() => store.config.shaders.illustrationRare.barMediumSaturation, 'uBarMediumSaturation'],
    [() => store.config.shaders.illustrationRare.barMediumLightness, 'uBarMediumLightness'],
    [() => store.config.shaders.illustrationRare.barBrightSaturation, 'uBarBrightSaturation'],
    [() => store.config.shaders.illustrationRare.barBrightLightness, 'uBarBrightLightness'],
    [() => store.config.shaders.illustrationRare.barIntensity2, 'uBarIntensity2'],
    [() => store.config.shaders.illustrationRare.barHue2, 'uBarHue2'],
    [() => store.config.shaders.illustrationRare.barMediumSaturation2, 'uBarMediumSaturation2'],
    [() => store.config.shaders.illustrationRare.barMediumLightness2, 'uBarMediumLightness2'],
    [() => store.config.shaders.illustrationRare.barBrightSaturation2, 'uBarBrightSaturation2'],
    [() => store.config.shaders.illustrationRare.barBrightLightness2, 'uBarBrightLightness2'],
    [() => store.config.shaders.illustrationRare.shine1Contrast, 'uShine1Contrast'],
    [() => store.config.shaders.illustrationRare.shine1Saturation, 'uShine1Saturation'],
    [() => store.config.shaders.illustrationRare.shine2Opacity, 'uShine2Opacity'],
    [() => store.config.shaders.illustrationRare.glareOpacity, 'uGlareOpacity'],
  ]
  for (const [getter, uniformName] of illustRareUniformMap) {
    watchUniform(getter, uniformName)
  }

  // Ultra-rare shader parameters
  const ultraRareUniformMap: [() => number, string][] = [
    [() => store.config.shaders.ultraRare.baseBrightness, 'uBaseBrightness'],
    [() => store.config.shaders.ultraRare.shineBrightness, 'uShineBrightness'],
    [() => store.config.shaders.ultraRare.shineContrast, 'uShineContrast'],
    [() => store.config.shaders.ultraRare.shineSaturation, 'uShineSaturation'],
    [() => store.config.shaders.ultraRare.shineAfterBrightness, 'uShineAfterBrightness'],
    [() => store.config.shaders.ultraRare.shineAfterContrast, 'uShineAfterContrast'],
    [() => store.config.shaders.ultraRare.shineAfterSaturation, 'uShineAfterSaturation'],
    [() => store.config.shaders.ultraRare.shineBaseBrightness, 'uShineBaseBrightness'],
    [() => store.config.shaders.ultraRare.shineBaseContrast, 'uShineBaseContrast'],
    [() => store.config.shaders.ultraRare.shineBaseSaturation, 'uShineBaseSaturation'],
    [() => store.config.shaders.ultraRare.glareContrast, 'uGlareContrast'],
    [() => store.config.shaders.ultraRare.glare2Contrast, 'uGlare2Contrast'],
    [() => store.config.shaders.ultraRare.rotateDelta, 'uRotateDelta'],
    [() => store.config.shaders.ultraRare.angle1Mult, 'uAngle1Mult'],
    [() => store.config.shaders.ultraRare.angle2Mult, 'uAngle2Mult'],
    [() => store.config.shaders.ultraRare.bgYMult1, 'uBgYMult1'],
    [() => store.config.shaders.ultraRare.bgYMult2, 'uBgYMult2'],
    [() => store.config.shaders.ultraRare.barAngle, 'uBarAngle'],
    [() => store.config.shaders.ultraRare.barOffsetBgXMult, 'uBarOffsetBgXMult'],
    [() => store.config.shaders.ultraRare.barOffsetBgYMult, 'uBarOffsetBgYMult'],
    [() => store.config.shaders.ultraRare.barFrequency, 'uBarFrequency'],
    [() => store.config.shaders.ultraRare.barIntensityStart1, 'uBarIntensityStart1'],
    [() => store.config.shaders.ultraRare.barIntensityEnd1, 'uBarIntensityEnd1'],
    [() => store.config.shaders.ultraRare.barIntensityStart2, 'uBarIntensityStart2'],
    [() => store.config.shaders.ultraRare.barIntensityEnd2, 'uBarIntensityEnd2'],
    [() => store.config.shaders.ultraRare.sparkleIntensity, 'uSparkleIntensity'],
    [() => store.config.shaders.ultraRare.sparkleRadius, 'uSparkleRadius'],
    [() => store.config.shaders.ultraRare.sparkleContrast, 'uSparkleContrast'],
    [() => store.config.shaders.ultraRare.sparkleColorShift, 'uSparkleColorShift'],
  ]
  for (const [getter, uniformName] of ultraRareUniformMap) {
    watchUniform(getter, uniformName)
  }

  watch(
    () => store.isFlipRequested,
    (requested) => {
      if (requested) {
        triggerFlip()
        store.isFlipRequested = false
      }
    },
  )

  let slideshowInterval: ReturnType<typeof setInterval> | null = null
  watch(
    () => store.isSlideshowActive,
    (active) => {
      if (slideshowInterval) {
        clearInterval(slideshowInterval)
        slideshowInterval = null
      }
      if (active) {
        slideshowInterval = setInterval(() => {
          cardNavigator.navigate(1)
        }, 3000)
      }
    },
  )

  // Special-illustration-rare shader parameters
  const sirUniformMap: [() => number, string][] = [
    [() => store.config.shaders.specialIllustrationRare.shineAngle, 'uSirShineAngle'],
    [() => store.config.shaders.specialIllustrationRare.shineFrequency, 'uSirShineFrequency'],
    [() => store.config.shaders.specialIllustrationRare.shineBrightness, 'uSirShineBrightness'],
    [() => store.config.shaders.specialIllustrationRare.shineContrast, 'uSirShineContrast'],
    [() => store.config.shaders.specialIllustrationRare.shineSaturation, 'uSirShineSaturation'],
    [() => store.config.shaders.specialIllustrationRare.glitterContrast, 'uSirGlitterContrast'],
    [() => store.config.shaders.specialIllustrationRare.glitterSaturation, 'uSirGlitterSaturation'],
    [() => store.config.shaders.specialIllustrationRare.washScale, 'uSirWashScale'],
    [
      () => store.config.shaders.specialIllustrationRare.washTiltSensitivity,
      'uSirWashTiltSensitivity',
    ],
    [() => store.config.shaders.specialIllustrationRare.washSaturation, 'uSirWashSaturation'],
    [() => store.config.shaders.specialIllustrationRare.washContrast, 'uSirWashContrast'],
    [() => store.config.shaders.specialIllustrationRare.washOpacity, 'uSirWashOpacity'],
    [() => store.config.shaders.specialIllustrationRare.baseBrightness, 'uSirBaseBrightness'],
    [() => store.config.shaders.specialIllustrationRare.baseContrast, 'uSirBaseContrast'],
  ]
  for (const [getter, uniformName] of sirUniformMap) {
    watchUniform(getter, uniformName)
  }

  // Tera-rainbow-rare shader parameters
  const trrUniformMap: [() => number, string][] = [
    [() => store.config.shaders.teraRainbowRare.holoOpacity, 'uHoloOpacity'],
    [() => store.config.shaders.teraRainbowRare.rainbowScale, 'uRainbowScale'],
    [() => store.config.shaders.teraRainbowRare.rainbowShift, 'uRainbowShift'],
    [() => store.config.shaders.teraRainbowRare.maskThreshold, 'uMaskThreshold'],
    [() => store.config.shaders.teraRainbowRare.sparkleIntensity, 'uSparkleIntensity'],
    [() => store.config.shaders.teraRainbowRare.sparkleRadius, 'uSparkleRadius'],
    [() => store.config.shaders.teraRainbowRare.sparkleContrast, 'uSparkleContrast'],
    [() => store.config.shaders.teraRainbowRare.sparkleColorShift, 'uSparkleColorShift'],
    [() => store.config.shaders.teraRainbowRare.etchSparkleScale, 'uEtchSparkleScale'],
    [() => store.config.shaders.teraRainbowRare.etchSparkleIntensity, 'uEtchSparkleIntensity'],
    [
      () => store.config.shaders.teraRainbowRare.etchSparkleTiltSensitivity,
      'uEtchSparkleTiltSensitivity',
    ],
    [() => store.config.shaders.teraRainbowRare.etchSparkleTexMix, 'uEtchSparkleTexMix'],
    [() => store.config.shaders.teraRainbowRare.etchSparkle2Scale, 'uEtchSparkle2Scale'],
    [() => store.config.shaders.teraRainbowRare.etchSparkle2Intensity, 'uEtchSparkle2Intensity'],
    [
      () => store.config.shaders.teraRainbowRare.etchSparkle2TiltSensitivity,
      'uEtchSparkle2TiltSensitivity',
    ],
    [() => store.config.shaders.teraRainbowRare.etchSparkle2TexMix, 'uEtchSparkle2TexMix'],
    [() => store.config.shaders.teraRainbowRare.baseBrightness, 'uBaseBrightness'],
    [() => store.config.shaders.teraRainbowRare.baseContrast, 'uBaseContrast'],
    [() => store.config.shaders.teraRainbowRare.baseSaturation, 'uBaseSaturation'],
  ]
  for (const [getter, uniformName] of trrUniformMap) {
    watchUniform(getter, uniformName)
  }

  // Tera-shiny-rare shader parameters
  const tsrUniformMap: [() => number, string][] = [
    [() => store.config.shaders.teraShinyRare.holoOpacity, 'uHoloOpacity'],
    [() => store.config.shaders.teraShinyRare.rainbowScale, 'uRainbowScale'],
    [() => store.config.shaders.teraShinyRare.rainbowShift, 'uRainbowShift'],
    [() => store.config.shaders.teraShinyRare.maskThreshold, 'uMaskThreshold'],
    [() => store.config.shaders.teraShinyRare.sparkleIntensity, 'uSparkleIntensity'],
    [() => store.config.shaders.teraShinyRare.sparkleRadius, 'uSparkleRadius'],
    [() => store.config.shaders.teraShinyRare.sparkleContrast, 'uSparkleContrast'],
    [() => store.config.shaders.teraShinyRare.sparkleColorShift, 'uSparkleColorShift'],
    [() => store.config.shaders.teraShinyRare.etchSparkleScale, 'uEtchSparkleScale'],
    [() => store.config.shaders.teraShinyRare.etchSparkleIntensity, 'uEtchSparkleIntensity'],
    [
      () => store.config.shaders.teraShinyRare.etchSparkleTiltSensitivity,
      'uEtchSparkleTiltSensitivity',
    ],
    [() => store.config.shaders.teraShinyRare.etchSparkleTexMix, 'uEtchSparkleTexMix'],
    [() => store.config.shaders.teraShinyRare.etchSparkle2Scale, 'uEtchSparkle2Scale'],
    [() => store.config.shaders.teraShinyRare.etchSparkle2Intensity, 'uEtchSparkle2Intensity'],
    [
      () => store.config.shaders.teraShinyRare.etchSparkle2TiltSensitivity,
      'uEtchSparkle2TiltSensitivity',
    ],
    [() => store.config.shaders.teraShinyRare.etchSparkle2TexMix, 'uEtchSparkle2TexMix'],
    [() => store.config.shaders.teraShinyRare.baseBrightness, 'uBaseBrightness'],
    [() => store.config.shaders.teraShinyRare.baseContrast, 'uBaseContrast'],
    [() => store.config.shaders.teraShinyRare.baseSaturation, 'uBaseSaturation'],
    [() => store.config.shaders.teraShinyRare.mosaicScale, 'uMosaicScale'],
    [() => store.config.shaders.teraShinyRare.mosaicIntensity, 'uMosaicIntensity'],
    [() => store.config.shaders.teraShinyRare.mosaicSaturation, 'uMosaicSaturation'],
    [() => store.config.shaders.teraShinyRare.mosaicContrast, 'uMosaicContrast'],
    [() => store.config.shaders.teraShinyRare.mosaicFoilThreshold, 'uMosaicFoilThreshold'],
  ]
  for (const [getter, uniformName] of tsrUniformMap) {
    watchUniform(getter, uniformName)
  }

  // Reverse-holo shader parameters
  const reverseHoloUniformMap: [() => number, string][] = [
    [() => store.config.shaders.reverseHolo.shineIntensity, 'uShineIntensity'],
    [() => store.config.shaders.reverseHolo.shineOpacity, 'uShineOpacity'],
    [() => store.config.shaders.reverseHolo.shineColorR, 'uShineColorR'],
    [() => store.config.shaders.reverseHolo.shineColorG, 'uShineColorG'],
    [() => store.config.shaders.reverseHolo.shineColorB, 'uShineColorB'],
    [() => store.config.shaders.reverseHolo.specularRadius, 'uSpecularRadius'],
    [() => store.config.shaders.reverseHolo.specularPower, 'uSpecularPower'],
    [() => store.config.shaders.reverseHolo.baseBrightness, 'uBaseBrightness'],
    [() => store.config.shaders.reverseHolo.baseContrast, 'uBaseContrast'],
    [() => store.config.shaders.reverseHolo.baseSaturation, 'uBaseSaturation'],
  ]
  for (const [getter, uniformName] of reverseHoloUniformMap) {
    watchUniform(getter, uniformName)
  }

  // Rainbow-rare shader parameters
  const rainbowRareUniformMap: [() => number, string][] = [
    [() => store.config.shaders.rainbowRare.baseBrightness, 'uBaseBrightness'],
    [() => store.config.shaders.rainbowRare.shineBrightness, 'uShineBrightness'],
    [() => store.config.shaders.rainbowRare.shineContrast, 'uShineContrast'],
    [() => store.config.shaders.rainbowRare.shineSaturation, 'uShineSaturation'],
    [() => store.config.shaders.rainbowRare.shineBaseBrightness, 'uShineBaseBrightness'],
    [() => store.config.shaders.rainbowRare.shineBaseContrast, 'uShineBaseContrast'],
    [() => store.config.shaders.rainbowRare.shineBaseSaturation, 'uShineBaseSaturation'],
    [() => store.config.shaders.rainbowRare.glareContrast, 'uGlareContrast'],
    [() => store.config.shaders.rainbowRare.glare2Contrast, 'uGlare2Contrast'],
    [() => store.config.shaders.rainbowRare.sparkleIntensity, 'uSparkleIntensity'],
    [() => store.config.shaders.rainbowRare.sparkleRadius, 'uSparkleRadius'],
    [() => store.config.shaders.rainbowRare.sparkleContrast, 'uSparkleContrast'],
    [() => store.config.shaders.rainbowRare.sparkleColorShift, 'uSparkleColorShift'],
  ]
  for (const [getter, uniformName] of rainbowRareUniformMap) {
    watchUniform(getter, uniformName)
  }

  // Master-ball shader parameters
  const masterBallUniformMap: [() => number, string][] = [
    [() => store.config.shaders.masterBall.rainbowScale, 'uRainbowScale'],
    [() => store.config.shaders.masterBall.rainbowShift, 'uRainbowShift'],
    [() => store.config.shaders.masterBall.rainbowOpacity, 'uRainbowOpacity'],
    [() => store.config.shaders.masterBall.etchOpacity, 'uEtchOpacity'],
    [() => store.config.shaders.masterBall.etchContrast, 'uEtchContrast'],
    [() => store.config.shaders.masterBall.etchStampOpacity, 'uEtchStampOpacity'],
    [() => store.config.shaders.masterBall.etchStampHoloOpacity, 'uEtchStampHoloOpacity'],
    [() => store.config.shaders.masterBall.etchStampHoloScale, 'uEtchStampHoloScale'],
    [() => store.config.shaders.masterBall.etchStampMaskThreshold, 'uEtchStampMaskThreshold'],
    [() => store.config.shaders.masterBall.sparkleScale, 'uSparkleScale'],
    [() => store.config.shaders.masterBall.sparkleIntensity, 'uSparkleIntensity'],
    [() => store.config.shaders.masterBall.sparkleTiltSensitivity, 'uSparkleTiltSensitivity'],
    [() => store.config.shaders.masterBall.sparkleTexMix, 'uSparkleTexMix'],
    [() => store.config.shaders.masterBall.sparkle2Scale, 'uSparkle2Scale'],
    [() => store.config.shaders.masterBall.sparkle2Intensity, 'uSparkle2Intensity'],
    [() => store.config.shaders.masterBall.sparkle2TiltSensitivity, 'uSparkle2TiltSensitivity'],
    [() => store.config.shaders.masterBall.sparkle2TexMix, 'uSparkle2TexMix'],
    [() => store.config.shaders.masterBall.mosaicScale, 'uMosaicScale'],
    [() => store.config.shaders.masterBall.mosaicIntensity, 'uMosaicIntensity'],
    [() => store.config.shaders.masterBall.mosaicSaturation, 'uMosaicSaturation'],
    [() => store.config.shaders.masterBall.mosaicContrast, 'uMosaicContrast'],
    [() => store.config.shaders.masterBall.mosaicFoilThreshold, 'uMosaicFoilThreshold'],
    [() => store.config.shaders.masterBall.glareOpacity, 'uGlareOpacity'],
    [() => store.config.shaders.masterBall.glareContrast, 'uGlareContrast'],
    [() => store.config.shaders.masterBall.glareSaturation, 'uGlareSaturation'],
    [() => store.config.shaders.masterBall.baseBrightness, 'uBaseBrightness'],
    [() => store.config.shaders.masterBall.baseContrast, 'uBaseContrast'],
  ]
  for (const [getter, uniformName] of masterBallUniformMap) {
    watchUniform(getter, uniformName)
  }

  // Shiny-rare shader parameters
  const shinyRareUniformMap: [() => number, string][] = [
    [() => store.config.shaders.shinyRare.rainbowScale, 'uRainbowScale'],
    [() => store.config.shaders.shinyRare.rainbowShift, 'uRainbowShift'],
    [() => store.config.shaders.shinyRare.rainbowOpacity, 'uRainbowOpacity'],
    [() => store.config.shaders.shinyRare.etchOpacity, 'uEtchOpacity'],
    [() => store.config.shaders.shinyRare.etchContrast, 'uEtchContrast'],
    [() => store.config.shaders.shinyRare.etchStampOpacity, 'uEtchStampOpacity'],
    [() => store.config.shaders.shinyRare.etchStampHoloOpacity, 'uEtchStampHoloOpacity'],
    [() => store.config.shaders.shinyRare.etchStampHoloScale, 'uEtchStampHoloScale'],
    [() => store.config.shaders.shinyRare.etchStampMaskThreshold, 'uEtchStampMaskThreshold'],
    [() => store.config.shaders.shinyRare.glareOpacity, 'uGlareOpacity'],
    [() => store.config.shaders.shinyRare.glareContrast, 'uGlareContrast'],
    [() => store.config.shaders.shinyRare.glareSaturation, 'uGlareSaturation'],
    [() => store.config.shaders.shinyRare.baseBrightness, 'uBaseBrightness'],
    [() => store.config.shaders.shinyRare.baseContrast, 'uBaseContrast'],
    [() => store.config.shaders.shinyRare.metalIntensity, 'uMetalIntensity'],
    [() => store.config.shaders.shinyRare.metalMaskThreshold, 'uMetalMaskThreshold'],
    [() => store.config.shaders.shinyRare.metalTiltSensitivity, 'uMetalTiltSensitivity'],
    [() => store.config.shaders.shinyRare.metalTiltThreshold, 'uMetalTiltThreshold'],
    [() => store.config.shaders.shinyRare.metalBrightness, 'uMetalBrightness'],
    [() => store.config.shaders.shinyRare.metalNoiseScale, 'uMetalNoiseScale'],
    [() => store.config.shaders.shinyRare.metalSaturation, 'uMetalSaturation'],
    [() => store.config.shaders.shinyRare.barAngle, 'uBarAngle'],
    [() => store.config.shaders.shinyRare.barDensity, 'uBarDensity'],
    [() => store.config.shaders.shinyRare.barOffsetBgYMult, 'uBarOffsetBgYMult'],
    [() => store.config.shaders.shinyRare.barWidth, 'uBarWidth'],
    [() => store.config.shaders.shinyRare.barIntensity, 'uBarIntensity'],
    [() => store.config.shaders.shinyRare.barHue, 'uBarHue'],
    [() => store.config.shaders.shinyRare.barMediumSaturation, 'uBarMediumSaturation'],
    [() => store.config.shaders.shinyRare.barMediumLightness, 'uBarMediumLightness'],
    [() => store.config.shaders.shinyRare.barBrightSaturation, 'uBarBrightSaturation'],
    [() => store.config.shaders.shinyRare.barBrightLightness, 'uBarBrightLightness'],
    [() => store.config.shaders.shinyRare.barDensity2, 'uBarDensity2'],
    [() => store.config.shaders.shinyRare.bar2OffsetBgYMult, 'uBar2OffsetBgYMult'],
    [() => store.config.shaders.shinyRare.barWidth2, 'uBarWidth2'],
    [() => store.config.shaders.shinyRare.barIntensity2, 'uBarIntensity2'],
    [() => store.config.shaders.shinyRare.barHue2, 'uBarHue2'],
    [() => store.config.shaders.shinyRare.barMediumSaturation2, 'uBarMediumSaturation2'],
    [() => store.config.shaders.shinyRare.barMediumLightness2, 'uBarMediumLightness2'],
    [() => store.config.shaders.shinyRare.barBrightSaturation2, 'uBarBrightSaturation2'],
    [() => store.config.shaders.shinyRare.barBrightLightness2, 'uBarBrightLightness2'],
    [() => store.config.shaders.shinyRare.shine1Contrast, 'uShine1Contrast'],
    [() => store.config.shaders.shinyRare.shine1Saturation, 'uShine1Saturation'],
    [() => store.config.shaders.shinyRare.shine2Opacity, 'uShine2Opacity'],
  ]
  for (const [getter, uniformName] of shinyRareUniformMap) {
    watchUniform(getter, uniformName)
  }

  function dispose() {
    if (animationId !== null) cancelAnimationFrame(animationId)
    if (slideshowInterval) clearInterval(slideshowInterval)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKeydown)
    renderer?.domElement.removeEventListener('mousemove', onFanMouseMove)
    renderer?.domElement.removeEventListener('click', onFanClick)
    renderer?.domElement.removeEventListener('touchstart', onFanTouchStart)
    mouseTilt.detach()
    gyroscope.stop()
    renderer?.dispose()
  }

  onBeforeUnmount(() => {
    dispose()
  })

  return { init, rebuildScene, dispose, gyroscope }
}
