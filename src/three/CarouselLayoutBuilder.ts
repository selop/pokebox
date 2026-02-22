import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three'
import type { Material, Scene } from 'three'
import type { useAppStore } from '@/stores/app'
import type { useCardLoader } from '@/composables/useCardLoader'
import type { ShaderStyle } from '@/types'
import { buildCardMesh, CARD_ASPECT } from '@/three/buildCard'

type CardLoaderInstance = ReturnType<typeof useCardLoader>

interface CarouselSlotTarget {
  x: number
  y: number
  z: number
  rotY: number
  scale: number
  renderOrder: number
}

/**
 * Compute carousel slot properties for a card given its hero index
 * and the current carousel center index.
 */
export function computeCarouselSlot(
  heroIndex: number,
  centerIndex: number,
  totalCards: number,
  centerCardW: number,
  baseY: number,
  baseZ: number,
  boxD: number,
  screenW: number,
): CarouselSlotTarget {
  // Elliptical merry-go-round: all cards placed on a ring in the XZ plane.
  const radiusX = screenW * 0.4
  const radiusZ = boxD * 0.25
  const ellipseCenterZ = baseZ - radiusZ // front card sits at baseZ

  // Angle for this card relative to center (front = 0, wraps around)
  let theta = ((2 * Math.PI) / totalCards) * (heroIndex - centerIndex)
  // Normalize to [-PI, PI]
  while (theta > Math.PI) theta -= 2 * Math.PI
  while (theta < -Math.PI) theta += 2 * Math.PI

  const x = Math.sin(theta) * radiusX
  const z = ellipseCenterZ + Math.cos(theta) * radiusZ
  const rotY = theta // face outward from ring

  // Depth-based scale: 1.0 at front (cos=1), 0.35 at back (cos=-1)
  const depthFraction = (Math.cos(theta) + 1) / 2
  const scale = 0.35 + 0.65 * depthFraction
  const renderOrder = Math.round(5 + 5 * depthFraction)

  return {
    x,
    y: baseY,
    z,
    rotY,
    scale,
    renderOrder,
  }
}

/**
 * Build a cover-flow carousel layout with ALL hero cards.
 * Cards are built once; when carouselIndex changes, only the targets
 * are updated (via updateCarouselTargets) and the animation loop
 * lerps meshes to their new positions — no rebuild needed.
 */
export function buildCarouselLayout(
  scene: Scene,
  loader: CardLoaderInstance,
  store: ReturnType<typeof useAppStore>,
  resolveExtraTextures: (
    loader: CardLoaderInstance,
    effectiveShader: ShaderStyle,
  ) => {
    iriTextures: ReturnType<CardLoaderInstance['getIriTextures']>
    birthdayTextures: ReturnType<CardLoaderInstance['getBirthdayTextures']>
    sparkleIriTextures: ReturnType<CardLoaderInstance['getSparkleIriTextures']>
    glitterTexture: ReturnType<CardLoaderInstance['getGlitterTexture']>
    noiseTexture: ReturnType<CardLoaderInstance['getNoiseTexture']>
    cardBackTexture: ReturnType<CardLoaderInstance['getCardBackTexture']>
  },
  getEffectiveShaderForHero: (compoundId: string) => ShaderStyle,
): Mesh[] {
  const dims = store.dimensions
  const meshes: Mesh[] = []
  const ids = store.displayCardIds
  if (ids.length === 0) return meshes

  // Card sizing — center card uses singleCardSize * 0.65 (smaller for merry-go-round fit)
  const centerCardH = dims.screenH * store.singleCardSize * 0.65
  const centerCardW = centerCardH * CARD_ASPECT

  const baseY = (store.cardTransform.y / 100) * dims.screenH
  const baseZ = -(store.cardTransform.z / 100) * dims.boxD

  ids.forEach((id: string, i: number) => {
    const tex = loader.get(id)
    if (!tex) return

    const effectiveShader = getEffectiveShaderForHero(id)
    const {
      iriTextures,
      birthdayTextures,
      sparkleIriTextures,
      glitterTexture,
      noiseTexture,
      cardBackTexture,
    } = resolveExtraTextures(loader, effectiveShader)

    const mesh = buildCardMesh(
      dims,
      tex.card,
      tex.mask,
      tex.foil,
      { ...store.config, cardSize: store.singleCardSize * 0.65 },
      effectiveShader,
      iriTextures,
      birthdayTextures,
      glitterTexture,
      noiseTexture,
      cardBackTexture,
      sparkleIriTextures,
    )

    // Replace geometry with a thin box so cards have visible thickness on the ring
    const cardDepth = centerCardH * 0.003
    const frontMat = mesh.material as Material
    const edgeMat = new MeshBasicMaterial({ color: 0xd4d0c8 })
    const backMat = new MeshBasicMaterial({ map: cardBackTexture ?? null })
    mesh.geometry.dispose()
    mesh.geometry = new BoxGeometry(centerCardW, centerCardH, cardDepth)
    // BoxGeometry groups: 0=+x, 1=-x, 2=+y, 3=-y, 4=+z(front), 5=-z(back)
    mesh.material = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat]

    mesh.castShadow = true
    mesh.userData.carouselHeroIndex = i
    mesh.userData.cardId = id

    // Compute initial position based on current carouselIndex
    const target = computeCarouselSlot(
      i,
      store.carouselIndex,
      ids.length,
      centerCardW,
      baseY,
      baseZ,
      dims.boxD,
      dims.screenW,
    )
    mesh.position.set(target.x, target.y, target.z)
    mesh.rotation.y = target.rotY
    mesh.scale.setScalar(target.scale)
    mesh.renderOrder = target.renderOrder
    mesh.userData.carouselTarget = target

    scene.add(mesh)
    meshes.push(mesh)
  })

  return meshes
}

/**
 * Update carousel slot targets on existing meshes when carouselIndex changes.
 * Called from useThreeScene's carouselIndex watcher — no rebuild needed.
 */
export function updateCarouselTargets(meshes: Mesh[], store: ReturnType<typeof useAppStore>): void {
  const dims = store.dimensions
  const catalog = store.carouselHeroCatalog
  if (catalog.length === 0) return

  const centerCardH = dims.screenH * store.singleCardSize * 0.65
  const centerCardW = centerCardH * CARD_ASPECT
  const baseY = (store.cardTransform.y / 100) * dims.screenH
  const baseZ = -(store.cardTransform.z / 100) * dims.boxD

  for (const mesh of meshes) {
    const heroIndex = mesh.userData.carouselHeroIndex as number | undefined
    if (heroIndex === undefined) continue
    const target = computeCarouselSlot(
      heroIndex,
      store.carouselIndex,
      catalog.length,
      centerCardW,
      baseY,
      baseZ,
      dims.boxD,
      dims.screenW,
    )
    mesh.userData.carouselTarget = target
    mesh.renderOrder = target.renderOrder
  }
}
