import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import type { Scene } from 'three'
import type { useAppStore } from '@/stores/app'
import type { useCardLoader } from '@/composables/useCardLoader'
import type { ShaderStyle } from '@/types'
import { buildCardMesh, CARD_ASPECT } from '@/three/buildCard'
import { CARD_CATALOG } from '@/data/cardCatalog'
import type { HeroCardEntry } from '@/data/heroShowcase'
import { buildFanLayout } from '@/three/FanLayoutBuilder'
import {
  buildCarouselLayout,
  updateCarouselTargets as updateCarouselTargetsImpl,
} from '@/three/CarouselLayoutBuilder'

type CardLoaderInstance = ReturnType<typeof useCardLoader>

export class CardSceneBuilder {
  constructor(
    private readonly store: ReturnType<typeof useAppStore>,
    private readonly cardLoader: () => CardLoaderInstance | null,
  ) {}

  /** Build card meshes and add them to the scene. Returns the created meshes. */
  build(
    scene: Scene,
    cardAngle: number,
    introOrigin?: { x: number; y: number; z: number } | null,
  ): Mesh[] {
    const loader = this.cardLoader()
    if (!loader) return []

    if (this.store.cardDisplayMode === 'single') {
      return this.buildSingleCard(scene, loader, cardAngle)
    } else if (this.store.cardDisplayMode === 'fan') {
      return buildFanLayout(scene, loader, this.store, introOrigin)
    } else if (this.store.cardDisplayMode === 'carousel') {
      return buildCarouselLayout(
        scene,
        loader,
        this.store,
        (l, s) => this.resolveExtraTextures(l, s),
        (id) => this.getEffectiveShaderForHero(id),
      )
    } else {
      return []
    }
  }

  private getEffectiveShader(cardId: string): ShaderStyle {
    const card = CARD_CATALOG.value.find((c) => c.id === cardId)
    return card?.holoType || 'illustration-rare'
  }

  private getEffectiveShaderForHero(compoundId: string): ShaderStyle {
    const hero = this.store.carouselHeroCatalog.find((h: HeroCardEntry) => h.id === compoundId)
    return hero?.holoType || 'illustration-rare'
  }

  private resolveExtraTextures(loader: CardLoaderInstance, effectiveShader: ShaderStyle) {
    const iriTextures =
      effectiveShader === 'special-illustration-rare' ||
      effectiveShader === 'ultra-rare' ||
      effectiveShader === 'rainbow-rare'
        ? loader.getIriTextures()
        : null
    const birthdayTextures = effectiveShader === 'double-rare' ? loader.getBirthdayTextures() : null
    const sparkleIriTextures =
      effectiveShader === 'special-illustration-rare' ? loader.getSparkleIriTextures() : null
    const glitterTexture = loader.getGlitterTexture()
    const noiseTexture = loader.getNoiseTexture()
    const cardBackTexture = loader.getCardBackTexture()
    return {
      iriTextures,
      birthdayTextures,
      sparkleIriTextures,
      glitterTexture,
      noiseTexture,
      cardBackTexture,
    }
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

    const cardH = dims.screenH * store.singleCardSize
    const cardW = cardH * CARD_ASPECT
    const zGap = dims.boxD * 0.08
    const xGap = cardW * 0.1

    const hasEffect = !!(tex.mask || tex.foil)
    const isEtched = !!(tex.mask && tex.foil)

    if (hasEffect) {
      // Layer 0 (front-left): full composited result (card + holo shader)
      const effectiveShader = this.getEffectiveShader(id)
      const {
        iriTextures,
        birthdayTextures,
        sparkleIriTextures,
        glitterTexture,
        noiseTexture,
        cardBackTexture,
      } = this.resolveExtraTextures(loader, effectiveShader)
      const compositeMesh = buildCardMesh(
        dims,
        tex.card,
        tex.mask,
        tex.foil,
        {
          ...store.config,
          cardSize: store.singleCardSize,
        },
        effectiveShader,
        iriTextures,
        birthdayTextures,
        glitterTexture,
        noiseTexture,
        cardBackTexture,
        sparkleIriTextures,
      )
      compositeMesh.geometry.dispose()
      compositeMesh.geometry = new PlaneGeometry(cardW, cardH)
      compositeMesh.position.set(centerX - xGap * (isEtched ? 0.4 : 1), cy, cz)
      compositeMesh.rotation.y = baseRotY
      compositeMesh.castShadow = true
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
        foilMesh.castShadow = true
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
      maskMesh.castShadow = true
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
    frontMesh.castShadow = true
    scene.add(frontMesh)
    meshes.push(frontMesh)

    return meshes
  }

  /** Update carousel slot targets on existing meshes when carouselIndex changes. */
  updateCarouselTargets(meshes: Mesh[]): void {
    updateCarouselTargetsImpl(meshes, this.store)
  }

  /**
   * Upgrade a fan card mesh to full ShaderMaterial (called once on first hover).
   * Replaces the MeshBasicMaterial in-place without a full scene rebuild.
   */
  upgradeFanCardShader(mesh: Mesh): void {
    if (mesh.userData.hasShaderMaterial) return
    const loader = this.cardLoader()
    if (!loader) return

    const id = mesh.userData.cardId as string
    const tex = loader.get(id)
    if (!tex) return

    const dims = this.store.dimensions
    const effectiveShader = this.getEffectiveShader(id)
    const {
      iriTextures,
      birthdayTextures,
      sparkleIriTextures,
      glitterTexture,
      noiseTexture,
      cardBackTexture,
    } = this.resolveExtraTextures(loader, effectiveShader)
    const tempMesh = buildCardMesh(
      dims,
      tex.card,
      tex.mask,
      tex.foil,
      { ...this.store.config, cardSize: this.store.config.cardSize * 0.85 },
      effectiveShader,
      iriTextures,
      birthdayTextures,
      glitterTexture,
      noiseTexture,
      cardBackTexture,
      sparkleIriTextures,
    )

    // Swap material only — keep mesh position/rotation/scale intact
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose())
    } else {
      mesh.material.dispose()
    }
    mesh.material = tempMesh.material
    mesh.userData.hasShaderMaterial = true

    // Dispose the temp mesh geometry (we keep our own)
    tempMesh.geometry.dispose()
  }
}
