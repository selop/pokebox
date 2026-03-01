import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import type { Scene } from 'three'
import type { useAppStore } from '@/stores/app'
import type { useCardLoader } from '@/composables/useCardLoader'
import { CARD_ASPECT } from '@/three/buildCard'

type CardLoaderInstance = ReturnType<typeof useCardLoader>

/**
 * Build a fanned poker-hand layout.
 * Cards arc around a pivot below the visible area, overlapping naturally.
 * The center card (index 3 of 7) is the "selected" card and lifts slightly.
 *
 * All cards start at their rest positions. The animate loop lerps toward
 * hover targets stored in userData, producing a smooth "peek" animation.
 */
export function buildFanLayout(
  scene: Scene,
  loader: CardLoaderInstance,
  store: ReturnType<typeof useAppStore>,
  introOrigin?: { x: number; y: number; z: number } | null,
): Mesh[] {
  const dims = store.dimensions
  const meshes: Mesh[] = []
  const ids = store.displayCardIds
  if (ids.length === 0) return meshes

  const n = ids.length
  const centerIdx = Math.floor(n / 2)

  // Card sizing — slightly smaller than single mode
  const cardH = dims.screenH * store.config.cardSize * 0.85
  const cardW = cardH * CARD_ASPECT

  // Fan arc parameters
  const totalArcDeg = 36 // total arc spread in degrees
  const arcPerCard = n > 1 ? totalArcDeg / (n - 1) : 0
  const pivotRadius = cardH * 3.2 // radius from pivot to card center
  // Pivot is below screen center — cards fan upward
  const pivotY = (store.cardTransform.y / 100) * dims.screenH - pivotRadius + cardH * 0.15
  const pivotX = (store.cardTransform.x / 100) * dims.screenW
  const baseZ = -(store.cardTransform.z / 100) * dims.boxD - 2

  ids.forEach((id: string, i: number) => {
    const tex = loader.get(id)
    if (!tex) return

    // Angle from center: negative = left, positive = right
    const angleDeg = (i - centerIdx) * arcPerCard
    const angleRad = (angleDeg * Math.PI) / 180

    // Position on arc (pivot at bottom, cards fan upward)
    const arcX = pivotX + Math.sin(angleRad) * pivotRadius
    const arcY = pivotY + Math.cos(angleRad) * pivotRadius

    // Z-spread: fan cards across the box depth (left=back wall, right=front)
    const zSpread = n > 1 ? (i / (n - 1)) * dims.boxD * 0.45 : 0

    // Rest state (no hover)
    const restX = arcX
    const restY = arcY
    const restZ = baseZ + zSpread
    const restRotZ = -angleRad
    const restScale = 1.0

    // Hover target state — slides upward only
    const hoverX = arcX
    const hoverY = arcY + cardH * 0.18
    const hoverZ = restZ
    const hoverRotZ = -angleRad * 0.2
    const hoverScale = 1.08

    // Build mesh with lightweight MeshBasicMaterial placeholder
    // (real ShaderMaterial is applied later during gold activation animation)
    const cardMat = new MeshBasicMaterial({ map: tex.card, transparent: true, side: DoubleSide })
    const mesh = new Mesh(new PlaneGeometry(cardW, cardH), cardMat)

    // Intro start position: custom origin (pack burst) or default (below pivot)
    const introX = introOrigin?.x ?? pivotX
    const introY = introOrigin?.y ?? pivotY - cardH * 0.5
    const introZ = introOrigin?.z ?? baseZ
    const introRotZ = 0
    const introScale = introOrigin ? 0.15 : 0.4

    // Start at intro position (hidden below)
    mesh.position.set(introX, introY, introZ)
    mesh.rotation.z = introRotZ
    mesh.scale.setScalar(introScale)
    mesh.castShadow = true
    mesh.renderOrder = i

    // Staggered intro: back card (i=0) pops first, front card last
    const introDelay = i * 0.07 // seconds between each card
    const introDuration = 0.35 // seconds for each card's pop-up

    // Store animation targets in userData
    mesh.userData.fanIndex = i
    mesh.userData.cardId = id
    mesh.userData.activationState = 'pending' // 'pending' | 'activating' | 'done'
    mesh.userData.activationProgress = 0
    mesh.userData.cardTexture = tex.card
    mesh.userData.noiseTexture = loader.getNoiseTexture()
    mesh.userData.fanIntro = {
      x: introX,
      y: introY,
      z: introZ,
      rotZ: introRotZ,
      scale: introScale,
      delay: introDelay,
      duration: introDuration,
      startTime: performance.now() * 0.001,
    }
    mesh.userData.fanRest = { x: restX, y: restY, z: restZ, rotZ: restRotZ, scale: restScale }
    mesh.userData.fanHover = {
      x: hoverX,
      y: hoverY,
      z: hoverZ,
      rotZ: hoverRotZ,
      scale: hoverScale,
    }
    mesh.userData.fanBaseRenderOrder = i

    scene.add(mesh)
    meshes.push(mesh)
  })

  return meshes
}
