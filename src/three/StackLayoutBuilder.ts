import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import type { Scene, Texture } from 'three'
import type { useAppStore } from '@/stores/app'
import type { useCardLoader } from '@/composables/useCardLoader'
import type { ShaderStyle } from '@/types'
import { buildCardMesh, CARD_ASPECT } from '@/three/buildCard'
import { CARD_CATALOG } from '@/data/cardCatalog'

type CardLoaderInstance = ReturnType<typeof useCardLoader>

/**
 * Build a stacked card layout for mobile.
 * Cards pile on top of each other with visible edges (offset x/y/z per depth level).
 * The top card is centered; each subsequent card peeks out slightly.
 * All cards are built with full ShaderMaterial from the start.
 */
export function buildStackLayout(
  scene: Scene,
  loader: CardLoaderInstance,
  store: ReturnType<typeof useAppStore>,
  introOrigin?: { x: number; y: number; z: number } | null,
  resolveExtraTextures?: (loader: CardLoaderInstance, shader: ShaderStyle) => {
    iriTextures: { iri7: Texture; iri8: Texture; iri9: Texture } | null
    birthdayTextures: { dank: Texture; dank2: Texture } | null
    sparkleIriTextures: { iri1: Texture; iri2: Texture } | null
    glitterTexture: Texture | null
    noiseTexture: Texture | null
    cardBackTexture: Texture | null
  },
): Mesh[] {
  const dims = store.dimensions
  const meshes: Mesh[] = []
  const ids = store.displayCardIds
  if (ids.length === 0) return meshes

  const n = ids.length

  // Card sizing — same as single mode (full mobile viewport)
  const cardH = dims.screenH * store.singleCardSize
  const cardW = cardH * CARD_ASPECT

  // Base position (center of scene)
  const baseX = (store.cardTransform.x / 100) * dims.screenW
  const baseY = (store.cardTransform.y / 100) * dims.screenH
  const baseZ = -(store.cardTransform.z / 100) * dims.boxD

  ids.forEach((id: string, i: number) => {
    const tex = loader.get(id)
    if (!tex) return

    // Stack positioning: top card (i=0) is centered,
    // each card below is offset to reveal edges
    const restX = baseX + i * cardW * 0.02
    const restY = baseY - i * cardH * 0.015
    const restZ = baseZ - i * dims.boxD * 0.02
    const restScale = 1.0 - i * 0.015

    // Build mesh with full ShaderMaterial if card has effects
    const hasEffect = !!(tex.mask || tex.foil)
    let mesh: Mesh

    if (hasEffect && resolveExtraTextures) {
      const card = CARD_CATALOG.value.find((c) => c.id === id)
      const effectiveShader: ShaderStyle = card?.holoType || 'illustration-rare'
      const extras = resolveExtraTextures(loader, effectiveShader)
      const shaderMesh = buildCardMesh(
        dims,
        tex.card,
        tex.mask,
        tex.foil,
        { ...store.config, cardSize: store.singleCardSize },
        effectiveShader,
        extras.iriTextures,
        extras.birthdayTextures,
        extras.glitterTexture,
        extras.noiseTexture,
        extras.cardBackTexture,
        extras.sparkleIriTextures,
      )
      // Replace geometry with our sized one
      shaderMesh.geometry.dispose()
      shaderMesh.geometry = new PlaneGeometry(cardW, cardH)
      mesh = shaderMesh
    } else {
      const cardMat = new MeshBasicMaterial({ map: tex.card, transparent: true, side: DoubleSide })
      mesh = new Mesh(new PlaneGeometry(cardW, cardH), cardMat)
    }

    // Intro start position: custom origin (pack burst) or default (below screen)
    const introX = introOrigin?.x ?? baseX
    const introY = introOrigin?.y ?? baseY - cardH * 0.8
    const introZ = introOrigin?.z ?? baseZ
    const introScale = introOrigin ? 0.15 : 0.4

    // Start at intro position
    mesh.position.set(introX, introY, introZ)
    mesh.scale.setScalar(introScale)
    mesh.castShadow = true
    // Reverse render order: top card (i=0) renders last (on top)
    mesh.renderOrder = n - i

    // Staggered intro: back card (last) pops first, top card last
    const introDelay = (n - 1 - i) * 0.06
    const introDuration = 0.45

    // Store animation data in userData
    mesh.userData.stackIndex = i
    mesh.userData.cardId = id
    mesh.userData.stackIntro = {
      x: introX,
      y: introY,
      z: introZ,
      scale: introScale,
      delay: introDelay,
      duration: introDuration,
      startTime: performance.now() * 0.001,
    }
    mesh.userData.stackRest = {
      x: restX,
      y: restY,
      z: restZ,
      scale: restScale,
    }

    scene.add(mesh)
    meshes.push(mesh)
  })

  return meshes
}
