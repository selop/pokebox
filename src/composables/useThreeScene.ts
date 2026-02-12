import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'
import {
  AmbientLight,
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Texture } from 'three'
import { useAppStore } from '@/stores/app'
import { buildBoxShell } from '@/three/buildBox'
import { populateFurniture } from '@/three/buildFurniture'
import { buildCardMesh, CARD_ASPECT } from '@/three/buildCard'
import { mulberry32 } from '@/three/utils'
import { CardNavigator } from '@/three/CardNavigator'
import { MergeAnimator, SINGLE_CARD_SIZE } from '@/three/MergeAnimator'
import { useCardLoader } from './useCardLoader'
import { useMouseTilt } from './useMouseTilt'
import { CARD_CATALOG } from '@/data/cardCatalog'
import type { ShaderStyle } from '@/types'
// Per-card offsets for staggering (x = fraction of spacing, z = fraction of boxD)
const CARD_X_OFFSETS = [0.3, 0, -0.3]
const CARD_Z_OFFSETS = [0.2, 0, -0.2]

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

  const FLIP_DURATION = 1.5
  let flipStartTime = -1

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

  // Helper to get the effective shader for a card (always uses card's assigned holoType)
  function getEffectiveShader(cardId: string): ShaderStyle {
    const card = CARD_CATALOG.find((c) => c.id === cardId)
    return card?.holoType || 'illustration-rare'
  }

  function cardLayout() {
    const dims = store.dimensions
    const cardH = dims.screenH * store.config.cardSize
    const cardW = cardH * CARD_ASPECT
    const gap = cardW * 0.08
    const spacing = cardW + gap
    const centerX = (store.cardTransform.x / 100) * dims.screenW
    const y = (store.cardTransform.y / 100) * dims.screenH
    const z = -(store.cardTransform.z / 100) * dims.boxD
    return { spacing, centerX, y, z, boxD: dims.boxD }
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

    // Load iridescent textures for special illustration rare cards
    cardLoader.loadIriTextures()

    // Load birthday textures for double rare cards
    cardLoader.loadBirthdayTextures()

    // Load glitter texture for illustration rare cards
    cardLoader.loadGlitterTexture()

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

    // Load all display cards then build
    cardLoader.loadCards(store.displayCardIds).then(() => {
      rebuildScene()
    })

    // Also build immediately (without card textures if not ready yet)
    rebuildScene()

    // Start render loop
    lastTime = performance.now() * 0.001
    animate()

    // Resize handler
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKeydown)
  }

  function rebuildScene() {
    if (!scene) return

    // Clear scene
    while (scene.children.length) scene.remove(scene.children[0]!)
    cardMeshes.value = []

    const dims = store.dimensions
    const renderMode = store.renderMode

    // Build box shell
    buildBoxShell(scene, dims, renderMode, wallTexture, store.isDimmed)

    // Furniture mode
    if (store.sceneMode === 'furniture') {
      const origRandom = Math.random
      Math.random = mulberry32(store.sceneSeed)
      populateFurniture(scene, dims, renderMode)
      Math.random = origRandom
    }

    // Card mode
    if (store.sceneMode === 'cards' && cardLoader) {
      const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
      const meshes: Mesh[] = []
      const centerX = (store.cardTransform.x / 100) * dims.screenW
      const cy = (store.cardTransform.y / 100) * dims.screenH
      const cz = -(store.cardTransform.z / 100) * dims.boxD

      if (store.cardDisplayMode === 'single') {
        // Exploded layer view — layers fan diagonally front-left → back-right
        // Order: holo composite (front-left) → mask → [etch foil if present] → card art (back-right)
        const id = store.displayCardIds[0]
        if (id) {
          const tex = cardLoader!.get(id)
          if (tex) {
            const cardH = dims.screenH * SINGLE_CARD_SIZE
            const cardW = cardH * CARD_ASPECT
            const zGap = dims.boxD * 0.08
            const xGap = cardW * 0.1

            const hasEffect = !!(tex.mask || tex.foil)
            const isEtched = !!(tex.mask && tex.foil) // Has both mask and etched foil

            if (hasEffect) {
              // Layer 0 (front-left): full composited result (card + holo shader)
              const effectiveShader = getEffectiveShader(id)
              const iriTextures =
                effectiveShader === 'special-illustration-rare' || effectiveShader === 'ultra-rare'
                  ? cardLoader!.getIriTextures()
                  : null
              const birthdayTextures =
                effectiveShader === 'double-rare' ? cardLoader!.getBirthdayTextures() : null
              const glitterTexture = cardLoader!.getGlitterTexture()
              const cardBackTexture = cardLoader!.getCardBackTexture()
              const compositeMesh = buildCardMesh(
                dims,
                tex.card,
                tex.mask,
                tex.foil,
                {
                  ...store.config,
                  cardSize: SINGLE_CARD_SIZE,
                },
                effectiveShader,
                iriTextures,
                birthdayTextures,
                glitterTexture,
                cardBackTexture,
              )
              compositeMesh.geometry.dispose()
              compositeMesh.geometry = new PlaneGeometry(cardW, cardH)
              compositeMesh.position.set(centerX - xGap * (isEtched ? 0.4 : 1), cy, cz)
              compositeMesh.rotation.y = baseRotY
              scene!.add(compositeMesh)
              meshes.push(compositeMesh)

              // Layer 1 (optional): etched foil texture (only if card has both mask and foil)
              if (isEtched) {
                const foilMat = new MeshBasicMaterial({
                  map: tex.foil,
                  transparent: true,
                  side: DoubleSide,
                })
                const foilMesh = new Mesh(new PlaneGeometry(cardW, cardH), foilMat)
                foilMesh.position.set(centerX + xGap * 0.15, cy, cz - zGap * 2)
                foilMesh.rotation.y = baseRotY
                scene!.add(foilMesh)
                meshes.push(foilMesh)
              }
              // Layer 2: holo mask texture
              const maskMat = new MeshBasicMaterial({
                map: tex.mask || tex.foil,
                transparent: true,
                side: DoubleSide,
              })
              const maskMesh = new Mesh(new PlaneGeometry(cardW, cardH), maskMat)
              maskMesh.position.set(centerX - xGap * (isEtched ? 0.15 : 0), cy, cz - zGap)
              maskMesh.rotation.y = baseRotY
              scene!.add(maskMesh)
              meshes.push(maskMesh)
            }

            // Layer 3 (or 2 if no etch): card base art (back-right)
            const cardMat = new MeshBasicMaterial({
              map: tex.card,
              transparent: true,
              side: DoubleSide,
            })
            const frontMesh = new Mesh(new PlaneGeometry(cardW, cardH), cardMat)
            const layerCount = isEtched ? 3 : 2
            frontMesh.position.set(
              centerX + (hasEffect ? xGap * (isEtched ? 0.4 : 1) : 0),
              cy,
              hasEffect ? cz - zGap * layerCount : cz,
            )
            frontMesh.rotation.y = baseRotY
            scene!.add(frontMesh)
            meshes.push(frontMesh)
          }
        }
      } else {
        // Triple card layout
        const { spacing, y, z, boxD } = cardLayout()
        store.displayCardIds.forEach((id: string, i: number) => {
          const tex = cardLoader!.get(id)
          if (!tex) return
          const effectiveShader = getEffectiveShader(id)
          const iriTextures =
            effectiveShader === 'special-illustration-rare' || effectiveShader === 'ultra-rare'
              ? cardLoader!.getIriTextures()
              : null
          const birthdayTextures =
            effectiveShader === 'double-rare' ? cardLoader!.getBirthdayTextures() : null
          const glitterTexture = cardLoader!.getGlitterTexture()
          const cardBackTexture = cardLoader!.getCardBackTexture()
          const mesh = buildCardMesh(
            dims,
            tex.card,
            tex.mask,
            tex.foil,
            store.config,
            effectiveShader,
            iriTextures,
            birthdayTextures,
            glitterTexture,
            cardBackTexture,
          )
          const xPos = centerX + (i - 1) * spacing + CARD_X_OFFSETS[i]! * spacing
          mesh.position.set(xPos, y, z + CARD_Z_OFFSETS[i]! * boxD)
          mesh.rotation.y = baseRotY
          scene!.add(mesh)
          meshes.push(mesh)
        })
      }

      cardMeshes.value = meshes
    }
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

    // Update mouse tilt springs
    mouseTilt.update(dt)

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
    for (const mesh of meshes) {
      mesh.rotation.x = mouseTilt.state.rotateX
      const explodeRotY = mesh.userData.explodeRotationY || 0
      mesh.rotation.y = baseRotY + mouseTilt.state.rotateY + explodeRotY + flipAngle
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
        store.cardDisplayMode === 'single' ? SINGLE_CARD_SIZE : store.config.cardSize
      const cardH = dims.screenH * effectiveSize
      const cardW = cardH * CARD_ASPECT

      const localX = dir.dot(cardRight) / cardW + 0.5
      const localY = dir.dot(cardUp) / cardH + 0.5

      const px = Math.max(0, Math.min(1, localX))
      const py = Math.max(0, Math.min(1, localY))
      ;(u['uPointer']!.value as Vector2).set(px, py)

      const bx = 0.37 + Math.max(0, Math.min(1, localX)) * 0.26
      const by = 0.37 + Math.max(0, Math.min(1, localY)) * 0.26
      ;(u['uBackground']!.value as Vector2).set(bx, by)

      const dx = px - 0.5,
        dy = py - 0.5
      u['uPointerFromCenter']!.value = Math.min(Math.sqrt(dx * dx + dy * dy) * 2.0, 1.0)

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
    const dir = scene.getObjectByName('solidDir') as DirectionalLight | undefined
    const back = scene.getObjectByName('solidBack') as PointLight | undefined
    if (ambient && dir && back) {
      const targetA = store.isDimmed ? 0.03 : 0.3
      const targetD = store.isDimmed ? 0.05 : 0.5
      const targetB = store.isDimmed ? 0.05 : 0.16
      ambient.intensity += (targetA - ambient.intensity) * dimRate
      dir.intensity += (targetD - dir.intensity) * dimRate
      back.intensity += (targetB - back.intensity) * dimRate
    }

    renderer.render(scene, camera)
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (store.sceneMode !== 'cards') return
    if (e.key === 'f') {
      triggerFlip()
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
      store.cardDisplayMode,
    ],
    () => {
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
      const meshes = cardMeshes.value
      if (!meshes.length) return
      const dims = store.dimensions
      const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
      const centerX = (store.cardTransform.x / 100) * dims.screenW
      const cy = (store.cardTransform.y / 100) * dims.screenH
      const cz = -(store.cardTransform.z / 100) * dims.boxD

      if (store.cardDisplayMode === 'single') {
        const cardH = dims.screenH * SINGLE_CARD_SIZE
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
        const { spacing, y, z, boxD } = cardLayout()
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
      if (!cardLoader) return
      cardLoader.loadCards(ids).then(() => {
        rebuildScene()
        cardNavigator.onSceneRebuilt()
      })
    },
  )

  // TODO: this is a lot repeating code which can be simplified and put into a dedicated class

  // Watch holo intensity (update uniform directly on all cards)
  watch(
    () => store.config.holoIntensity,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if ((mesh.material as ShaderMaterial).isShaderMaterial) {
          ;(mesh.material as ShaderMaterial).uniforms['uCardOpacity']!.value = val
        }
      }
    },
  )

  // Watch illustration-rare shader parameters
  watch(
    () => store.config.illustRareRainbowScale,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uRainbowScale']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uRainbowScale']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarAngle,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarAngle']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarAngle']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarDensity,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarDensity']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarDensity']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarDensity2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarDensity2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarDensity2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarOffsetBgYMult,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarOffsetBgYMult']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarOffsetBgYMult']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBar2OffsetBgYMult,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBar2OffsetBgYMult']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBar2OffsetBgYMult']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarWidth,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarWidth']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarWidth']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarWidth2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarWidth2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarWidth2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarIntensity,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarIntensity']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarIntensity']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarHue,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarHue']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarHue']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarMediumSaturation,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarMediumSaturation']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarMediumSaturation']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarMediumLightness,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarMediumLightness']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarMediumLightness']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarBrightSaturation,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarBrightSaturation']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarBrightSaturation']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarBrightLightness,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarBrightLightness']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarBrightLightness']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarIntensity2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarIntensity2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarIntensity2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarHue2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarHue2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarHue2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarMediumSaturation2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarMediumSaturation2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarMediumSaturation2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarMediumLightness2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarMediumLightness2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarMediumLightness2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarBrightSaturation2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarBrightSaturation2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarBrightSaturation2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareBarBrightLightness2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarBrightLightness2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarBrightLightness2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareShine1Contrast,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShine1Contrast']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShine1Contrast']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareShine1Saturation,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShine1Saturation']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShine1Saturation']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareShine2Opacity,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShine2Opacity']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShine2Opacity']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.illustRareGlareOpacity,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uGlareOpacity']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uGlareOpacity']!.value = val
        }
      }
    },
  )

  // Watch ultra-rare shader parameters
  watch(
    () => store.config.ultraRareBaseBrightness,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBaseBrightness']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBaseBrightness']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineBrightness,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineBrightness']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineBrightness']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineContrast,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineContrast']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineContrast']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineSaturation,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineSaturation']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineSaturation']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineAfterBrightness,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineAfterBrightness']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineAfterBrightness']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineAfterContrast,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineAfterContrast']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineAfterContrast']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineAfterSaturation,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineAfterSaturation']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineAfterSaturation']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineBaseBrightness,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineBaseBrightness']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineBaseBrightness']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineBaseContrast,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineBaseContrast']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineBaseContrast']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareShineBaseSaturation,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uShineBaseSaturation']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uShineBaseSaturation']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareGlareContrast,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uGlareContrast']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uGlareContrast']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareGlare2Contrast,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uGlare2Contrast']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uGlare2Contrast']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareRotateDelta,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uRotateDelta']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uRotateDelta']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareAngle1Mult,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uAngle1Mult']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uAngle1Mult']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareAngle2Mult,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uAngle2Mult']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uAngle2Mult']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBgYMult1,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBgYMult1']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBgYMult1']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBgYMult2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBgYMult2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBgYMult2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBarAngle,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarAngle']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarAngle']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBarOffsetBgXMult,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarOffsetBgXMult']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarOffsetBgXMult']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBarOffsetBgYMult,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarOffsetBgYMult']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarOffsetBgYMult']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBarFrequency,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarFrequency']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarFrequency']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBarIntensityStart1,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarIntensityStart1']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarIntensityStart1']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBarIntensityEnd1,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarIntensityEnd1']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarIntensityEnd1']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBarIntensityStart2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarIntensityStart2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarIntensityStart2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareBarIntensityEnd2,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uBarIntensityEnd2']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uBarIntensityEnd2']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareSparkleIntensity,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uSparkleIntensity']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uSparkleIntensity']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareSparkleRadius,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uSparkleRadius']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uSparkleRadius']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareSparkleContrast,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uSparkleContrast']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uSparkleContrast']!.value = val
        }
      }
    },
  )

  watch(
    () => store.config.ultraRareSparkleColorShift,
    (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms['uSparkleColorShift']
        ) {
          ;(mesh.material as ShaderMaterial).uniforms['uSparkleColorShift']!.value = val
        }
      }
    },
  )

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

  // Watch special-illustration-rare shader parameters
  const sirUniformMap: [() => number, string][] = [
    [() => store.config.sirShineAngle, 'uSirShineAngle'],
    [() => store.config.sirShineFrequency, 'uSirShineFrequency'],
    [() => store.config.sirShineBrightness, 'uSirShineBrightness'],
    [() => store.config.sirShineContrast, 'uSirShineContrast'],
    [() => store.config.sirShineSaturation, 'uSirShineSaturation'],
    [() => store.config.sirGlitterContrast, 'uSirGlitterContrast'],
    [() => store.config.sirGlitterSaturation, 'uSirGlitterSaturation'],
    [() => store.config.sirWashScale, 'uSirWashScale'],
    [() => store.config.sirWashTiltSensitivity, 'uSirWashTiltSensitivity'],
    [() => store.config.sirWashSaturation, 'uSirWashSaturation'],
    [() => store.config.sirWashContrast, 'uSirWashContrast'],
    [() => store.config.sirWashOpacity, 'uSirWashOpacity'],
    [() => store.config.sirBaseBrightness, 'uSirBaseBrightness'],
    [() => store.config.sirBaseContrast, 'uSirBaseContrast'],
  ]
  for (const [getter, uniformName] of sirUniformMap) {
    watch(getter, (val) => {
      for (const mesh of cardMeshes.value) {
        if (
          (mesh.material as ShaderMaterial).isShaderMaterial &&
          (mesh.material as ShaderMaterial).uniforms[uniformName]
        ) {
          ;(mesh.material as ShaderMaterial).uniforms[uniformName]!.value = val
        }
      }
    })
  }

  function dispose() {
    if (animationId !== null) cancelAnimationFrame(animationId)
    if (slideshowInterval) clearInterval(slideshowInterval)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKeydown)
    mouseTilt.detach()
    renderer?.dispose()
  }

  onBeforeUnmount(() => {
    dispose()
  })

  return { init, rebuildScene, dispose }
}
