import { Mesh, ShaderMaterial } from 'three'
import type { useAppStore } from '@/stores/app'
import type { CardSceneBuilder } from '@/three/CardSceneBuilder'

export interface TiltState {
  rotateX: number
  rotateY: number
}

interface FanZoomTransition {
  fanIndex: number
  startTime: number
  duration: number
  startPos: { x: number; y: number; z: number }
  midPos: { x: number; y: number; z: number } // slide-out waypoint
  startRotZ: number
  startScale: number
}

interface FanUnzoomTransition {
  fanIndex: number
  startTime: number
  duration: number
  startPos: { x: number; y: number; z: number }
  midPos: { x: number; y: number; z: number } // slide-out waypoint (= fan rest shifted -x)
  startScale: number
  restRotZ: number
  restScale: number
}

const FAN_ZOOM_DURATION = 1.2
const ACTIVATION_DURATION = 2.0
/** Seconds for the holo effect to blend in after the activation reveal finishes. */
const HOLO_BLEND_DURATION = 0.5
/** Z offset (toward viewer) for the zoomed card, in scene units (cm). */
const ZOOMED_Z_OFFSET = 4
/** Fraction of the zoom duration spent on the initial slide-out phase. */
const SLIDE_PHASE = 0.25
/** Seconds after intro finishes before auto-reveal begins (if no hover). */
const AUTO_REVEAL_DELAY = 1.5
/** Seconds between each card's auto-reveal activation. */
const AUTO_REVEAL_SPREAD = 0.2

/**
 * Handles fan mode animation: intro stagger, hover peek, zoom-in/out transitions,
 * activation progress driving, and pack opening cascade reset.
 *
 * Follows the established pattern of CardNavigator and MergeAnimator
 * (class with constructor injection, tick() method).
 */
export class FanAnimator {
  private fanZoomTransition: FanZoomTransition | null = null
  private fanUnzoomTransition: FanUnzoomTransition | null = null
  private _zoomedFanIndex: number | null = null

  /** Time when the fan intro animation finished (null = still playing or not started). */
  private introFinishedTime: number | null = null
  /** Set to true once any hover occurs after intro, cancelling auto-reveal. */
  private userHasHovered = false
  /** Number of cards that have been auto-reveal triggered so far. */
  private autoRevealCount = 0

  constructor(
    private readonly store: ReturnType<typeof useAppStore>,
    private readonly cardSceneBuilder: CardSceneBuilder,
    private readonly activateCard: (mesh: Mesh) => void,
  ) {}

  /** Start a zoom transition from a fan card to center. */
  startZoom(mesh: Mesh, fanIndex: number): void {
    // Slide-out waypoint: move card left by ~15% of screen width
    const slideX = this.store.dimensions.screenW * 0.15
    this.fanZoomTransition = {
      fanIndex,
      startTime: performance.now() * 0.001,
      duration: FAN_ZOOM_DURATION,
      startPos: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      midPos: { x: mesh.position.x - slideX, y: mesh.position.y, z: mesh.position.z },
      startRotZ: mesh.rotation.z,
      startScale: mesh.scale.x,
    }
  }

  /** Start the return-to-fan animation from the zoomed state. */
  startReturnToFan(meshes: Mesh[]): void {
    if (this._zoomedFanIndex === null) return
    const mesh = meshes.find((m) => m.userData.fanIndex === this._zoomedFanIndex)
    if (!mesh) {
      this._zoomedFanIndex = null
      return
    }
    const rest = mesh.userData.fanRest as
      | { x: number; y: number; z: number; rotZ: number; scale: number }
      | undefined
    if (!rest) {
      this._zoomedFanIndex = null
      return
    }
    // Mid waypoint: fan rest shifted left (same slide-out position as zoom-in)
    const slideX = this.store.dimensions.screenW * 0.15
    this.fanUnzoomTransition = {
      fanIndex: this._zoomedFanIndex,
      startTime: performance.now() * 0.001,
      duration: FAN_ZOOM_DURATION,
      startPos: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      midPos: { x: rest.x - slideX, y: rest.y, z: rest.z },
      startScale: mesh.scale.x,
      restRotZ: rest.rotZ,
      restScale: rest.scale,
    }
  }

  get isZooming(): boolean {
    return this.fanZoomTransition !== null || this.fanUnzoomTransition !== null
  }

  get zoomedFanIndex(): number | null {
    return this._zoomedFanIndex
  }

  isIntroPlaying(meshes: Mesh[]): boolean {
    return meshes.some((m) => m.userData.fanIntro)
  }

  /** Reset zoom state (e.g. on scene rebuild). */
  reset(): void {
    this.fanZoomTransition = null
    this.fanUnzoomTransition = null
    this._zoomedFanIndex = null
    this.introFinishedTime = null
    this.userHasHovered = false
    this.autoRevealCount = 0
  }

  /** Compute the zoomed card's center target position and scale. */
  private zoomedTarget() {
    const store = this.store
    const dims = store.dimensions
    return {
      x: (store.cardTransform.x / 100) * dims.screenW,
      y: (store.cardTransform.y / 100) * dims.screenH,
      z: ZOOMED_Z_OFFSET, // bring card forward, in front of the fan
      scale: store.singleCardSize / (store.config.cardSize * 0.85),
    }
  }

  /** Animate fan cards. Call once per frame when in fan mode. */
  tick(meshes: Mesh[], time: number, dt: number, tilt: TiltState): void {
    const store = this.store
    const peekSpeed = 1 - Math.pow(0.001, dt)
    const hoveredIdx = store.hoveredFanCard
    const introPlaying = this.isIntroPlaying(meshes)

    // Track intro completion — delay until instructions modal is dismissed
    if (
      !introPlaying &&
      this.introFinishedTime === null &&
      meshes.length > 0 &&
      !store.showInstructions
    ) {
      if (meshes.some((m) => m.userData.fanRest)) {
        this.introFinishedTime = time
      }
    }

    // Cancel auto-reveal if user hovers any card
    if (hoveredIdx !== null && !this.userHasHovered) {
      this.userHasHovered = true
    }

    // Auto-reveal: staggered activation if no hover after delay
    if (
      this.introFinishedTime !== null &&
      !this.userHasHovered &&
      this.autoRevealCount < meshes.length
    ) {
      const elapsed = time - this.introFinishedTime - AUTO_REVEAL_DELAY
      if (elapsed >= 0) {
        const targetCount = Math.min(meshes.length, Math.floor(elapsed / AUTO_REVEAL_SPREAD) + 1)
        while (this.autoRevealCount < targetCount) {
          const mesh = meshes[this.autoRevealCount]
          if (mesh) this.activateCard(mesh)
          this.autoRevealCount++
        }
      }
    }

    for (const mesh of meshes) {
      const rest = mesh.userData.fanRest as
        | { x: number; y: number; z: number; rotZ: number; scale: number }
        | undefined
      const hover = mesh.userData.fanHover as
        | { x: number; y: number; z: number; rotZ: number; scale: number }
        | undefined
      const intro = mesh.userData.fanIntro as
        | {
            x: number
            y: number
            z: number
            rotZ: number
            scale: number
            delay: number
            duration: number
            startTime: number
          }
        | undefined
      if (!rest || !hover) continue

      // Staggered intro animation: ease from intro position to rest
      if (intro) {
        const elapsed = time - intro.startTime - intro.delay
        if (elapsed < 0) {
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
        mesh.rotation.x = tilt.rotateX * 0.5 * ease
        mesh.rotation.y = tilt.rotateY * 0.3 * ease

        if (t >= 1) {
          delete mesh.userData.fanIntro
        }
        continue
      }

      // Skip normal peek if any transition or zoomed state is active
      if (this.fanZoomTransition || this.fanUnzoomTransition || this._zoomedFanIndex !== null)
        continue

      const isHovered = mesh.userData.fanIndex === hoveredIdx && !introPlaying
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
      mesh.rotation.x = tilt.rotateX * 0.5
      mesh.rotation.y = tilt.rotateY * 0.3

      // Dynamic renderOrder: hovered card always on top
      const baseOrder = (mesh.userData.fanBaseRenderOrder as number) ?? n
      mesh.renderOrder = isHovered ? 100 : baseOrder
    }

    // ── Fan zoom-in transition (two phases: slide-out, then spin+zoom) ──
    if (this.fanZoomTransition) {
      const zt = this.fanZoomTransition
      const elapsed = time - zt.startTime
      const rawT = Math.min(elapsed / zt.duration, 1.0)

      const target = this.zoomedTarget()

      for (const mesh of meshes) {
        const isFocused = mesh.userData.fanIndex === zt.fanIndex
        if (!isFocused) continue

        if (rawT <= SLIDE_PHASE) {
          // Phase 1: slide card left to the midpoint
          const phaseT = rawT / SLIDE_PHASE
          // Ease-out quad for a snappy extraction
          const ease = 1 - (1 - phaseT) * (1 - phaseT)
          mesh.position.x = zt.startPos.x + (zt.midPos.x - zt.startPos.x) * ease
          mesh.position.y = zt.startPos.y + (zt.midPos.y - zt.startPos.y) * ease
          mesh.position.z = zt.startPos.z + (zt.midPos.z - zt.startPos.z) * ease
          // Flatten fan tilt during slide
          mesh.rotation.z = zt.startRotZ * (1 - ease)
          mesh.rotation.y = 0
          mesh.scale.setScalar(zt.startScale)
        } else {
          // Phase 2: spin + zoom from midpoint to center target
          const phaseT = (rawT - SLIDE_PHASE) / (1 - SLIDE_PHASE)
          // Cubic ease-in-out
          const ease =
            phaseT < 0.5 ? 4 * phaseT * phaseT * phaseT : 1 - Math.pow(-2 * phaseT + 2, 3) / 2
          mesh.position.x = zt.midPos.x + (target.x - zt.midPos.x) * ease
          mesh.position.y = zt.midPos.y + (target.y - zt.midPos.y) * ease
          mesh.position.z = zt.midPos.z + (target.z - zt.midPos.z) * ease
          mesh.rotation.z = 0
          mesh.rotation.y = ease * Math.PI * 2
          const s = zt.startScale + (target.scale - zt.startScale) * ease
          mesh.scale.setScalar(s)
        }
        mesh.renderOrder = 200
      }

      if (rawT >= 1.0) {
        // Enter zoomed rest state — set currentCardId directly, do NOT change cardDisplayMode
        this._zoomedFanIndex = zt.fanIndex
        const ids = store.fanCardIds
        if (zt.fanIndex >= 0 && zt.fanIndex < ids.length) {
          store.currentCardId = ids[zt.fanIndex]!
        }
        store.stopHeroShowcase()
        this.fanZoomTransition = null
      }
    }

    // ── Fan zoom-out (two phases: spin to mid, then slide right into fan) ──
    if (this.fanUnzoomTransition) {
      const ut = this.fanUnzoomTransition
      const elapsed = time - ut.startTime
      const rawT = Math.min(elapsed / ut.duration, 1.0)
      const spinPhase = 1 - SLIDE_PHASE // reverse: spin first, slide last

      for (const mesh of meshes) {
        const rest = mesh.userData.fanRest as
          | { x: number; y: number; z: number; rotZ: number; scale: number }
          | undefined
        if (!rest) continue

        const isFocused = mesh.userData.fanIndex === ut.fanIndex
        if (!isFocused) continue

        if (rawT <= spinPhase) {
          // Phase 1: spin from center to the slide-out midpoint
          const phaseT = rawT / spinPhase
          // Cubic ease-in-out
          const ease =
            phaseT < 0.5 ? 4 * phaseT * phaseT * phaseT : 1 - Math.pow(-2 * phaseT + 2, 3) / 2
          mesh.position.x = ut.startPos.x + (ut.midPos.x - ut.startPos.x) * ease
          mesh.position.y = ut.startPos.y + (ut.midPos.y - ut.startPos.y) * ease
          mesh.position.z = ut.startPos.z + (ut.midPos.z - ut.startPos.z) * ease
          mesh.rotation.z = 0
          mesh.rotation.y = -ease * Math.PI * 2
          const s = ut.startScale + (ut.restScale - ut.startScale) * ease
          mesh.scale.setScalar(s)
        } else {
          // Phase 2: slide right from midpoint back into fan rest
          const phaseT = (rawT - spinPhase) / (1 - spinPhase)
          // Ease-in quad for a settling feel
          const ease = phaseT * phaseT
          mesh.position.x = ut.midPos.x + (rest.x - ut.midPos.x) * ease
          mesh.position.y = ut.midPos.y + (rest.y - ut.midPos.y) * ease
          mesh.position.z = ut.midPos.z + (rest.z - ut.midPos.z) * ease
          // Re-apply fan tilt
          mesh.rotation.z = ut.restRotZ * ease
          mesh.rotation.y = 0
          mesh.scale.setScalar(ut.restScale)
        }
        mesh.renderOrder = 200
      }

      if (rawT >= 1.0) {
        this._zoomedFanIndex = null
        this.fanUnzoomTransition = null
      }
    }

    // ── Zoomed rest state (no transition active, card held at center) ──
    if (this._zoomedFanIndex !== null && !this.fanZoomTransition && !this.fanUnzoomTransition) {
      const target = this.zoomedTarget()
      const n = meshes.length

      for (const mesh of meshes) {
        const rest = mesh.userData.fanRest as
          | { x: number; y: number; z: number; rotZ: number; scale: number }
          | undefined
        if (!rest) continue

        const isFocused = mesh.userData.fanIndex === this._zoomedFanIndex
        if (isFocused) {
          // Hold at center with head-tracking tilt
          mesh.position.set(target.x, target.y, target.z)
          mesh.rotation.z = 0
          mesh.scale.setScalar(target.scale)
          mesh.rotation.x = tilt.rotateX
          mesh.rotation.y = tilt.rotateY
          mesh.renderOrder = 200
        } else {
          // Hold at normal fan rest position
          mesh.position.x += (rest.x - mesh.position.x) * peekSpeed
          mesh.position.y += (rest.y - mesh.position.y) * peekSpeed
          mesh.position.z += (rest.z - mesh.position.z) * peekSpeed
          mesh.rotation.z += (rest.rotZ - mesh.rotation.z) * peekSpeed
          mesh.scale.setScalar(rest.scale)
          mesh.rotation.x = tilt.rotateX * 0.5
          mesh.rotation.y = tilt.rotateY * 0.3
          const baseOrder = (mesh.userData.fanBaseRenderOrder as number) ?? n
          mesh.renderOrder = baseOrder
        }
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
        this.cardSceneBuilder.upgradeFanCardShader(mesh)
        // Start holo blend-in: zero-out holo intensity so it matches the plain card
        // the activation shader was showing, then animate it up.
        const newMat = mesh.material as ShaderMaterial
        if (newMat.isShaderMaterial && newMat.uniforms['uCardOpacity']) {
          newMat.uniforms['uCardOpacity']!.value = 0
        }
        mesh.userData.activationState = 'blending'
        mesh.userData.blendStartTime = time
      }
    }

    // ── Blend-in holo effect after shader upgrade ──
    for (const mesh of meshes) {
      if (mesh.userData.activationState !== 'blending') continue
      const blendStart = mesh.userData.blendStartTime as number
      const t = Math.min((time - blendStart) / HOLO_BLEND_DURATION, 1.0)
      // Ease-out quad: fast appearance then gentle settle
      const ease = 1 - (1 - t) * (1 - t)
      const mat = mesh.material as ShaderMaterial
      if (mat.isShaderMaterial && mat.uniforms['uCardOpacity']) {
        mat.uniforms['uCardOpacity']!.value = store.config.holoIntensity * ease
      }
      if (t >= 1.0) {
        mesh.userData.activationState = 'done'
      }
    }

    // Reset pack opening phase once fan intro animation finishes
    if (store.packOpeningPhase === 'cascade' && !introPlaying) {
      store.packOpeningPhase = 'idle'
    }
  }
}
