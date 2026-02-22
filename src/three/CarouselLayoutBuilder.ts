import { Mesh, PlaneGeometry } from 'three'
import type { Scene } from 'three'
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
  // Fit outermost cards (slot ±2) inside the box.
  const maxSpacing = (screenW / 2 - (0.55 * centerCardW) / 2) / 2
  const idealSpacing = centerCardW * 0.75
  const spacing = Math.min(idealSpacing, maxSpacing)

  // Compute offset from center (-N/2 .. +N/2, wrapping)
  let offset = heroIndex - centerIndex
  const half = Math.floor(totalCards / 2)
  if (offset > half) offset -= totalCards
  if (offset < -half) offset += totalCards

  // Visible range: -2 to +2. Cards outside are hidden off-screen.
  const absOffset = Math.abs(offset)
  if (absOffset > 2) {
    const sign = offset > 0 ? 1 : -1
    return {
      x: sign * (screenW / 2 + centerCardW * 0.3),
      y: baseY,
      z: baseZ - boxD * 0.5,
      rotY: (sign * (-70 * Math.PI)) / 180,
      scale: 0.3,
      renderOrder: 5,
    }
  }

  // Slot parameters for visible positions
  const slotScale = [0.55, 0.75, 1.0, 0.75, 0.55][offset + 2]!
  const slotRotDeg = [50, 25, 0, -25, -50][offset + 2]!
  const slotZFrac = [-0.35, -0.18, 0, -0.18, -0.35][offset + 2]!
  const slotOrder = [8, 9, 10, 9, 8][offset + 2]!

  return {
    x: offset * spacing,
    y: baseY,
    z: baseZ + slotZFrac * boxD,
    rotY: (slotRotDeg * Math.PI) / 180,
    scale: slotScale,
    renderOrder: slotOrder,
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

  // Card sizing — center card uses singleCardSize * 0.9
  const centerCardH = dims.screenH * store.singleCardSize * 0.9
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
      { ...store.config, cardSize: store.singleCardSize * 0.9 },
      effectiveShader,
      iriTextures,
      birthdayTextures,
      glitterTexture,
      noiseTexture,
      cardBackTexture,
      sparkleIriTextures,
    )

    // Replace geometry with center card size (scale handles per-slot sizing)
    mesh.geometry.dispose()
    mesh.geometry = new PlaneGeometry(centerCardW, centerCardH)

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
export function updateCarouselTargets(
  meshes: Mesh[],
  store: ReturnType<typeof useAppStore>,
): void {
  const dims = store.dimensions
  const catalog = store.carouselHeroCatalog
  if (catalog.length === 0) return

  const centerCardH = dims.screenH * store.singleCardSize * 0.9
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
