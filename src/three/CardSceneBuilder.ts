import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import type { Scene } from 'three'
import type { useAppStore } from '@/stores/app'
import type { useCardLoader } from '@/composables/useCardLoader'
import type { ShaderStyle } from '@/types'
import { buildCardMesh, CARD_ASPECT } from '@/three/buildCard'
import { SINGLE_CARD_SIZE } from '@/three/MergeAnimator'
import { CARD_CATALOG } from '@/data/cardCatalog'

// Per-card offsets for staggering (x = fraction of spacing, z = fraction of boxD)
export const CARD_X_OFFSETS = [0.3, 0, -0.3]
export const CARD_Z_OFFSETS = [0.2, 0, -0.2]

type CardLoaderInstance = ReturnType<typeof useCardLoader>

export class CardSceneBuilder {
  constructor(
    private readonly store: ReturnType<typeof useAppStore>,
    private readonly cardLoader: () => CardLoaderInstance | null,
  ) {}

  /** Build card meshes and add them to the scene. Returns the created meshes. */
  build(scene: Scene, cardAngle: number): Mesh[] {
    const loader = this.cardLoader()
    if (!loader) return []

    if (this.store.cardDisplayMode === 'single') {
      return this.buildSingleCard(scene, loader, cardAngle)
    } else {
      return this.buildTripleCards(scene, loader, cardAngle)
    }
  }

  private getEffectiveShader(cardId: string): ShaderStyle {
    const card = CARD_CATALOG.value.find((c) => c.id === cardId)
    return card?.holoType || 'illustration-rare'
  }

  private resolveExtraTextures(loader: CardLoaderInstance, effectiveShader: ShaderStyle) {
    const iriTextures =
      effectiveShader === 'special-illustration-rare' ||
      effectiveShader === 'ultra-rare' ||
      effectiveShader === 'rainbow-rare'
        ? loader.getIriTextures()
        : null
    const birthdayTextures =
      effectiveShader === 'double-rare' ? loader.getBirthdayTextures() : null
    const glitterTexture = loader.getGlitterTexture()
    const noiseTexture = loader.getNoiseTexture()
    const cardBackTexture = loader.getCardBackTexture()
    return { iriTextures, birthdayTextures, glitterTexture, noiseTexture, cardBackTexture }
  }

  cardLayout() {
    const dims = this.store.dimensions
    const cardH = dims.screenH * this.store.config.cardSize
    const cardW = cardH * CARD_ASPECT
    const gap = cardW * 0.08
    const spacing = cardW + gap
    const centerX = (this.store.cardTransform.x / 100) * dims.screenW
    const y = (this.store.cardTransform.y / 100) * dims.screenH
    const z = -(this.store.cardTransform.z / 100) * dims.boxD
    return { spacing, centerX, y, z, boxD: dims.boxD }
  }

  private buildSingleCard(scene: Scene, loader: CardLoaderInstance, cardAngle: number): Mesh[] {
    const store = this.store
    const dims = store.dimensions
    const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
    const meshes: Mesh[] = []
    const centerX = (store.cardTransform.x / 100) * dims.screenW
    const cy = (store.cardTransform.y / 100) * dims.screenH
    const cz = -(store.cardTransform.z / 100) * dims.boxD

    const id = store.displayCardIds[0]
    if (!id) return meshes

    const tex = loader.get(id)
    if (!tex) return meshes

    const cardH = dims.screenH * SINGLE_CARD_SIZE
    const cardW = cardH * CARD_ASPECT
    const zGap = dims.boxD * 0.08
    const xGap = cardW * 0.1

    const hasEffect = !!(tex.mask || tex.foil)
    const isEtched = !!(tex.mask && tex.foil)

    if (hasEffect) {
      // Layer 0 (front-left): full composited result (card + holo shader)
      const effectiveShader = this.getEffectiveShader(id)
      const { iriTextures, birthdayTextures, glitterTexture, noiseTexture, cardBackTexture } =
        this.resolveExtraTextures(loader, effectiveShader)
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
        noiseTexture,
        cardBackTexture,
      )
      compositeMesh.geometry.dispose()
      compositeMesh.geometry = new PlaneGeometry(cardW, cardH)
      compositeMesh.position.set(centerX - xGap * (isEtched ? 0.4 : 1), cy, cz)
      compositeMesh.rotation.y = baseRotY
      scene.add(compositeMesh)
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
        scene.add(foilMesh)
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
      scene.add(maskMesh)
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
    scene.add(frontMesh)
    meshes.push(frontMesh)

    return meshes
  }

  private buildTripleCards(scene: Scene, loader: CardLoaderInstance, cardAngle: number): Mesh[] {
    const store = this.store
    const dims = store.dimensions
    const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180
    const meshes: Mesh[] = []
    const centerX = (store.cardTransform.x / 100) * dims.screenW
    const { spacing, y, z, boxD } = this.cardLayout()

    store.displayCardIds.forEach((id: string, i: number) => {
      const tex = loader.get(id)
      if (!tex) return
      const effectiveShader = this.getEffectiveShader(id)
      const { iriTextures, birthdayTextures, glitterTexture, noiseTexture, cardBackTexture } =
        this.resolveExtraTextures(loader, effectiveShader)
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
        noiseTexture,
        cardBackTexture,
      )
      const xPos = centerX + (i - 1) * spacing + CARD_X_OFFSETS[i]! * spacing
      mesh.position.set(xPos, y, z + CARD_Z_OFFSETS[i]! * boxD)
      mesh.rotation.y = baseRotY
      scene.add(mesh)
      meshes.push(mesh)
    })

    return meshes
  }
}
