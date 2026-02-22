import { Mesh } from 'three'
import type { useAppStore } from '@/stores/app'
import type { TiltState } from '@/three/FanAnimator'
import { CARD_ASPECT } from '@/three/buildCard'

const SWIPE_DURATION = 0.45

interface SwipeTransition {
  direction: number // +1 = up (next), -1 = down (prev)
  startTime: number
  departingMesh: Mesh // direct reference to the mesh being swiped away
}

/**
 * Handles stack mode animation: intro stagger, swipe transitions, and tilt.
 * All cards are built with full ShaderMaterial from the start (no activation needed).
 *
 * Follows the established pattern of FanAnimator.
 */
export class StackAnimator {
  private swipeTransition: SwipeTransition | null = null

  constructor(private readonly store: ReturnType<typeof useAppStore>) {}

  get isSwiping(): boolean {
    return this.swipeTransition !== null
  }

  isIntroPlaying(meshes: Mesh[]): boolean {
    return meshes.some((m) => m.userData.stackIntro)
  }

  reset(): void {
    this.swipeTransition = null
  }

  /**
   * Start a swipe transition. Always swipes the top card (stackIndex 0).
   * @param meshes All stack card meshes
   * @param dir +1 = swipe up (reveal next), -1 = swipe down (reveal prev)
   */
  swipe(meshes: Mesh[], dir: number): void {
    if (this.isSwiping || meshes.length === 0) return

    const topMesh = meshes.find((m) => (m.userData.stackIndex as number) === 0)
    if (!topMesh) return

    this.swipeTransition = {
      direction: dir,
      startTime: performance.now() * 0.001,
      departingMesh: topMesh,
    }
  }

  /** Animate stack cards. Call once per frame when in stack mode. */
  tick(meshes: Mesh[], time: number, dt: number, tilt: TiltState): void {
    const n = meshes.length
    if (n === 0) return

    const introPlaying = this.isIntroPlaying(meshes)

    // ── Staggered intro animation ──
    for (const mesh of meshes) {
      const intro = mesh.userData.stackIntro as
        | {
            x: number; y: number; z: number; scale: number
            delay: number; duration: number; startTime: number
          }
        | undefined
      const rest = mesh.userData.stackRest as
        | { x: number; y: number; z: number; scale: number }
        | undefined
      if (!intro || !rest) continue

      const elapsed = time - intro.startTime - intro.delay
      if (elapsed < 0) {
        mesh.position.set(intro.x, intro.y, intro.z)
        mesh.scale.setScalar(intro.scale)
        mesh.rotation.x = 0
        mesh.rotation.y = 0
        continue
      }
      const t = Math.min(elapsed / intro.duration, 1)
      // Ease-out back: overshoot then settle
      const c1 = 1.70158
      const c3 = c1 + 1
      const ease = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)

      mesh.position.x = intro.x + (rest.x - intro.x) * ease
      mesh.position.y = intro.y + (rest.y - intro.y) * ease
      mesh.position.z = intro.z + (rest.z - intro.z) * ease
      const s = intro.scale + (rest.scale - intro.scale) * ease
      mesh.scale.setScalar(s)
      mesh.rotation.x = tilt.rotateX * 0.5 * ease
      mesh.rotation.y = tilt.rotateY * 0.3 * ease

      if (t >= 1) {
        delete mesh.userData.stackIntro
      }
    }

    // ── Swipe transition ──
    if (this.swipeTransition) {
      const st = this.swipeTransition
      const elapsed = time - st.startTime
      const rawT = Math.min(elapsed / SWIPE_DURATION, 1.0)
      // Cubic ease-in-out
      const ease = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2

      const dims = this.store.dimensions
      const cardH = dims.screenH * this.store.singleCardSize
      const flyOffY = cardH * 1.5 * st.direction

      const departing = st.departingMesh
      const rest = departing.userData.stackRest as { x: number; y: number; z: number; scale: number }

      // Departing card: fly off screen
      departing.position.y = rest.y + flyOffY * ease
      departing.scale.setScalar(rest.scale * (1 - ease * 0.3))

      // Remaining cards: shift toward their new (promoted) positions
      for (const mesh of meshes) {
        if (mesh === departing) continue
        const stackIdx = mesh.userData.stackIndex as number
        // Preview the promoted position (one slot up)
        const previewIdx = Math.max(0, stackIdx - 1)
        const previewRest = this.computeRestForIndex(previewIdx, n, cardH)
        const currentRest = mesh.userData.stackRest as { x: number; y: number; z: number; scale: number }
        // Lerp from current rest toward promoted rest by swipe progress
        mesh.position.x = currentRest.x + (previewRest.x - currentRest.x) * ease
        mesh.position.y = currentRest.y + (previewRest.y - currentRest.y) * ease
        mesh.position.z = currentRest.z + (previewRest.z - currentRest.z) * ease
        const s = currentRest.scale + (previewRest.scale - currentRest.scale) * ease
        mesh.scale.setScalar(s)
      }

      if (rawT >= 1.0) {
        // Swipe complete: reorder the stack
        this.reorderStack(meshes, departing, n, cardH)
        this.swipeTransition = null
      }
    }

    // ── Steady-state positioning (non-intro, non-swipe) ──
    if (!introPlaying && !this.swipeTransition) {
      for (const mesh of meshes) {
        const rest = mesh.userData.stackRest as
          | { x: number; y: number; z: number; scale: number }
          | undefined
        if (!rest || mesh.userData.stackIntro) continue

        const lerpSpeed = 1 - Math.pow(0.001, dt)
        mesh.position.x += (rest.x - mesh.position.x) * lerpSpeed
        mesh.position.y += (rest.y - mesh.position.y) * lerpSpeed
        mesh.position.z += (rest.z - mesh.position.z) * lerpSpeed
        const s = mesh.scale.x + (rest.scale - mesh.scale.x) * lerpSpeed
        mesh.scale.setScalar(s)

        // Tilt: top card gets full tilt, cards below get reduced
        const stackIdx = mesh.userData.stackIndex as number
        const tiltFactor = stackIdx === 0 ? 1.0 : Math.max(0.1, 1.0 - stackIdx * 0.25)
        mesh.rotation.x = tilt.rotateX * 0.5 * tiltFactor
        mesh.rotation.y = tilt.rotateY * 0.3 * tiltFactor
      }
    }

    // Reset pack opening phase once stack intro finishes
    if (this.store.packOpeningPhase === 'cascade' && !introPlaying) {
      this.store.packOpeningPhase = 'idle'
    }
  }

  /** Compute rest position for a given stack index. */
  private computeRestForIndex(
    idx: number,
    _n: number,
    cardH: number,
  ): { x: number; y: number; z: number; scale: number } {
    const dims = this.store.dimensions
    const cardW = cardH * CARD_ASPECT
    const baseX = (this.store.cardTransform.x / 100) * dims.screenW
    const baseY = (this.store.cardTransform.y / 100) * dims.screenH
    const baseZ = -(this.store.cardTransform.z / 100) * dims.boxD
    return {
      x: baseX + idx * cardW * 0.02,
      y: baseY - idx * cardH * 0.015,
      z: baseZ - idx * dims.boxD * 0.02,
      scale: 1.0 - idx * 0.015,
    }
  }

  /** Reorder stack: departed card goes to bottom, everyone else moves up one slot. */
  private reorderStack(meshes: Mesh[], departed: Mesh, n: number, cardH: number): void {
    for (const mesh of meshes) {
      const oldIdx = mesh.userData.stackIndex as number
      let newIdx: number
      if (mesh === departed) {
        newIdx = n - 1
      } else {
        // Everyone above the departed (stackIndex > 0) moves up one slot
        newIdx = oldIdx - 1
      }

      mesh.userData.stackIndex = newIdx
      mesh.renderOrder = n - newIdx

      // Update rest targets
      mesh.userData.stackRest = this.computeRestForIndex(newIdx, n, cardH)
    }

    // Snap departed card to its new bottom position immediately
    // (it was off-screen from the fly-off, so no visual pop)
    const bottomRest = departed.userData.stackRest as { x: number; y: number; z: number; scale: number }
    departed.position.set(bottomRest.x, bottomRest.y, bottomRest.z)
    departed.scale.setScalar(bottomRest.scale)
  }
}
