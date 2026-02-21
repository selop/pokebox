import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import type { Scene } from 'three'
import type { useAppStore } from '@/stores/app'
import type { useCardLoader } from '@/composables/useCardLoader'
import type { ShaderStyle } from '@/types'
import { buildCardMesh, CARD_ASPECT } from '@/three/buildCard'
import { CARD_CATALOG } from '@/data/cardCatalog'
import type { HeroCardEntry } from '@/data/heroShowcase'

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
      return this.buildFanCards(scene, loader)
    } else if (this.store.cardDisplayMode === 'carousel') {
      return this.buildCarouselCards(scene, loader)
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
      const {
        iriTextures,
        birthdayTextures,
        sparkleIriTextures,
        glitterTexture,
        noiseTexture,
        cardBackTexture,
      } = this.resolveExtraTextures(loader, effectiveShader)
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
        sparkleIriTextures,
      )
      const xPos = centerX + (i - 1) * spacing + CARD_X_OFFSETS[i]! * spacing
      mesh.position.set(xPos, y, z + CARD_Z_OFFSETS[i]! * boxD)
      mesh.rotation.y = baseRotY
      mesh.castShadow = true
      scene.add(mesh)
      meshes.push(mesh)
    })

    return meshes
  }

  /**
   * Build a fanned poker-hand layout.
   * Cards arc around a pivot below the visible area, overlapping naturally.
   * The center card (index 3 of 7) is the "selected" card and lifts slightly.
   *
   * All cards start at their rest positions. The animate loop lerps toward
   * hover targets stored in userData, producing a smooth "peek" animation.
   */
  private buildFanCards(
    scene: Scene,
    loader: CardLoaderInstance,
    introOrigin?: { x: number; y: number; z: number } | null,
  ): Mesh[] {
    const store = this.store
    const dims = store.dimensions
    const meshes: Mesh[] = []
    const ids = store.displayCardIds
    if (ids.length === 0) return meshes

    const n = ids.length
    const centerIdx = Math.floor(n / 2)

    // Card sizing — slightly smaller than triple mode
    const cardH = dims.screenH * store.config.cardSize * 0.85
    const cardW = cardH * CARD_ASPECT

    // Fan arc parameters
    const totalArcDeg = 36 // total arc spread in degrees
    const arcPerCard = n > 1 ? totalArcDeg / (n - 1) : 0
    const pivotRadius = cardH * 3.2 // radius from pivot to card center
    // Pivot is below screen center — cards fan upward
    const pivotY = (store.cardTransform.y / 100) * dims.screenH - pivotRadius + cardH * 0.15
    const pivotX = (store.cardTransform.x / 100) * dims.screenW
    const baseZ = -(store.cardTransform.z / 100) * dims.boxD

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
      const zSpread = n > 1 ? (i / (n - 1)) * dims.boxD * 0.55 : 0

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
      const introY = introOrigin?.y ?? (pivotY - cardH * 0.5)
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
      const introDuration = 0.45 // seconds for each card's pop-up

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

  private getEffectiveShaderForHero(compoundId: string): ShaderStyle {
    const hero = this.store.carouselHeroCatalog.find(
      (h: HeroCardEntry) => h.id === compoundId,
    )
    return hero?.holoType || 'illustration-rare'
  }

  /**
   * Build a cover-flow carousel layout with ALL hero cards.
   * Cards are built once; when carouselIndex changes, only the targets
   * are updated (via updateCarouselTargets) and the animation loop
   * lerps meshes to their new positions — no rebuild needed.
   */
  private buildCarouselCards(scene: Scene, loader: CardLoaderInstance): Mesh[] {
    const store = this.store
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

      const effectiveShader = this.getEffectiveShaderForHero(id)
      const {
        iriTextures,
        birthdayTextures,
        sparkleIriTextures,
        glitterTexture,
        noiseTexture,
        cardBackTexture,
      } = this.resolveExtraTextures(loader, effectiveShader)

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
      const target = this.computeCarouselSlot(i, store.carouselIndex, ids.length, centerCardW, baseY, baseZ, dims.boxD, dims.screenW)
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
   * Compute carousel slot properties for a card given its hero index
   * and the current carousel center index.
   */
  private computeCarouselSlot(
    heroIndex: number,
    centerIndex: number,
    totalCards: number,
    centerCardW: number,
    baseY: number,
    baseZ: number,
    boxD: number,
    screenW: number,
  ) {
    // Fit outermost cards (slot ±2) inside the box.
    // Outer card edge = |offset| * spacing + scaledCardW/2 ≤ screenW/2
    // At slot ±2 with scale 0.55: 2*spacing + 0.55*centerCardW/2 ≤ screenW/2
    const maxSpacing = (screenW / 2 - 0.55 * centerCardW / 2) / 2
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
      // Park just beyond the box edge so they slide in/out naturally
      const sign = offset > 0 ? 1 : -1
      return {
        x: sign * (screenW / 2 + centerCardW * 0.3),
        y: baseY,
        z: baseZ - boxD * 0.5,
        rotY: sign * (-70 * Math.PI) / 180,
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
   * Update carousel slot targets on existing meshes when carouselIndex changes.
   * Called from useThreeScene's carouselIndex watcher — no rebuild needed.
   */
  updateCarouselTargets(meshes: Mesh[]): void {
    const store = this.store
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
      const target = this.computeCarouselSlot(
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
