import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'
import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
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
  const mouseTilt = useMouseTilt()

  // Delegates
  const mergeAnimator = new MergeAnimator(store)
  const cardNavigator = new CardNavigator(
    store,
    () => scene,
    cardMeshes,
    () => mergeAnimator.reset(),
  )

  // Helper to get the effective shader for a card
  function getEffectiveShader(cardId: string): ShaderStyle {
    // Parallax mode overrides per-card shader
    if (store.shaderStyle === 'parallax') return 'parallax'

    // Otherwise use the card's holoType
    const card = CARD_CATALOG.find(c => c.id === cardId)
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
    buildBoxShell(scene, dims, renderMode)

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
        // Order: holo composite (front-left) → mask (middle) → card art (back-right)
        const id = store.displayCardIds[0]
        if (id) {
          const tex = cardLoader!.get(id)
          if (tex) {
            const cardH = dims.screenH * SINGLE_CARD_SIZE
            const cardW = cardH * CARD_ASPECT
            const zGap = dims.boxD * 0.08
            const xGap = cardW * 0.35

            const hasEffect = !!(tex.mask || tex.foil)

            if (hasEffect) {
              // Layer 0 (front-left): full composited result (card + holo shader)
              const effectiveShader = getEffectiveShader(id)
              const compositeMesh = buildCardMesh(dims, tex.card, tex.mask, tex.foil, {
                ...store.config,
                cardSize: SINGLE_CARD_SIZE,
              }, effectiveShader)
              compositeMesh.geometry.dispose()
              compositeMesh.geometry = new PlaneGeometry(cardW, cardH)
              compositeMesh.position.set(centerX - xGap, cy, cz)
              compositeMesh.rotation.y = baseRotY
              scene!.add(compositeMesh)
              meshes.push(compositeMesh)

              // Layer 1 (middle): mask texture
              const maskMat = new MeshBasicMaterial({
                map: tex.mask || tex.foil,
                transparent: true,
                side: DoubleSide,
              })
              const maskMesh = new Mesh(new PlaneGeometry(cardW, cardH), maskMat)
              maskMesh.position.set(centerX, cy, cz - zGap)
              maskMesh.rotation.y = baseRotY
              scene!.add(maskMesh)
              meshes.push(maskMesh)
            }

            // Layer 2 (back-right): card base art
            const cardMat = new MeshBasicMaterial({
              map: tex.card,
              transparent: true,
              side: DoubleSide,
            })
            const frontMesh = new Mesh(new PlaneGeometry(cardW, cardH), cardMat)
            frontMesh.position.set(centerX + (hasEffect ? xGap : 0), cy, hasEffect ? cz - zGap * 2 : cz)
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
          const mesh = buildCardMesh(dims, tex.card, tex.mask, tex.foil, store.config, effectiveShader)
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

    // Apply mouse tilt + rotation to all cards
    const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
    for (const mesh of meshes) {
      mesh.rotation.x = mouseTilt.state.rotateX
      mesh.rotation.y = baseRotY + mouseTilt.state.rotateY
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
      const effectiveSize = store.cardDisplayMode === 'single' ? SINGLE_CARD_SIZE : store.config.cardSize
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
    }

    // Animate card transitions (departing fade-out + push-back, arriving fade-in)
    cardNavigator.tick(time)

    // Animate merge/explode for single card layers
    mergeAnimator.tick(meshes)

    // Animate scene objects
    scene.traverse((obj) => {
      if (obj.userData.animate) obj.userData.animate(time)
    })

    renderer.render(scene, camera)
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (store.sceneMode !== 'cards') return
    if (e.key === 'h' || e.key === 'H') {
      store.toggleShaderStyle()
      return
    }
    if (!cardNavigator.handleKeydown(e)) {
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
      store.shaderStyle,
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

  function dispose() {
    if (animationId !== null) cancelAnimationFrame(animationId)
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
