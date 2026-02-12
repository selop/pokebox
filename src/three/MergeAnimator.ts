import type { Mesh } from 'three'
import { MeshBasicMaterial } from 'three'
import { CARD_ASPECT } from './buildCard'
import type { useAppStore } from '@/stores/app'

export const SINGLE_CARD_SIZE = 0.85

const MERGE_LERP_RATE = 0.06

/**
 * Animates the merge/explode transition of card layers in single-card mode.
 *
 * Single Responsibility: lerp-based layer spread animation + opacity control.
 * Dependency Inversion: receives store via constructor.
 */
export class MergeAnimator {
  private mergeTarget = 1 // 0 = exploded, 1 = merged
  private mergeProgress = 1

  constructor(private readonly store: ReturnType<typeof useAppStore>) {}

  /** Snap to merged state (e.g. after card navigation). */
  reset(): void {
    this.mergeTarget = 1
    this.mergeProgress = 1
  }

  /** Toggle between merged and exploded targets. */
  toggle(): void {
    this.mergeTarget = this.mergeTarget === 0 ? 1 : 0
  }

  /** Animate layer positions and opacity. Call once per frame. */
  tick(meshes: Mesh[]): void {
    if (this.store.cardDisplayMode !== 'single' || meshes.length <= 1) return

    this.mergeProgress += (this.mergeTarget - this.mergeProgress) * MERGE_LERP_RATE
    if (Math.abs(this.mergeProgress - this.mergeTarget) < 0.001) {
      this.mergeProgress = this.mergeTarget
    }

    const dims = this.store.dimensions
    const cardH = dims.screenH * SINGLE_CARD_SIZE
    const cardW = cardH * CARD_ASPECT
    const zGap = dims.boxD * 0.15
    const xGap = cardW * (meshes.length >= 4 ? 0.25 : 0.5)
    const spread = 1 - this.mergeProgress // 1 = exploded, 0 = merged
    const cx = (this.store.cardTransform.x / 100) * dims.screenW
    const cy = (this.store.cardTransform.y / 100) * dims.screenH
    const cz = -(this.store.cardTransform.z / 100) * dims.boxD

    // Rotation offset when exploded: -42 degrees
    const explodeRotation = ((-42 * Math.PI) / 180) * spread

    // Shift entire exploded composition left by 5% of screen width
    const explodeShiftX = -(5 / 100) * dims.screenW * spread

    meshes.forEach((mesh, i) => {
      const xOff = (i - 1) * xGap * spread
      mesh.position.set(cx + xOff + explodeShiftX, cy, cz - i * zGap * spread)

      // Store the explode rotation offset for the animation loop to use
      mesh.userData.explodeRotationY = explodeRotation

      // Fade non-composite layers (index > 0) when merging
      if (i > 0) {
        const mat = mesh.material as MeshBasicMaterial
        mat.opacity = spread
      }
    })
  }

  /** Handle keyboard events. Returns true if the event was consumed. */
  handleKeydown(e: KeyboardEvent, meshCount: number): boolean {
    if (e.key === 'm' && this.store.cardDisplayMode === 'single' && meshCount > 1) {
      this.toggle()
      return true
    }
    return false
  }
}
