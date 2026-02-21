import type { Mesh, Scene } from 'three'
import { MeshBasicMaterial, ShaderMaterial } from 'three'
import type { ShallowRef } from 'vue'
import { CARD_CATALOG } from '@/data/cardCatalog'
import type { useAppStore } from '@/stores/app'
import { perfTracker } from '@/utils/perfTracker'

const DEPART_DURATION = 0.6
const ARRIVE_DURATION = 0.5

/** Ease-out cubic: fast start, gentle landing. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t)
}

/** Ease-in-out sine: smooth start and end. */
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

/** Set the fade/opacity on a card mesh (works with both ShaderMaterial and MeshBasicMaterial). */
export function setCardFade(mesh: Mesh, fade: number): void {
  const mat = mesh.material as ShaderMaterial
  if (mat.isShaderMaterial && mat.uniforms['uFade']) {
    mat.uniforms['uFade']!.value = fade
  } else {
    ;(mesh.material as MeshBasicMaterial).opacity = fade
  }
}

/**
 * Handles prev/next card navigation and the departing-mesh fade transition.
 *
 * Uses two independent timelines to avoid the overlap bug where departing
 * and arriving meshes are the same objects before the async scene rebuild.
 *
 * Single Responsibility: card selection traversal + transition animation.
 * Dependency Inversion: receives store, scene accessor, and mesh ref via constructor.
 */
export class CardNavigator {
  private departingMeshes: { mesh: Mesh; startZ: number }[] = []
  private departStart = 0
  private arrivalStart = 0
  private arriving = false
  private forceArrival = false

  constructor(
    private readonly store: ReturnType<typeof useAppStore>,
    private readonly getScene: () => Scene | null,
    private readonly cardMeshes: ShallowRef<Mesh[]>,
    private readonly onNavigate?: () => void,
  ) {}

  /** Request a fade-in arrival animation on the next scene rebuild (no departure). */
  requestArrival(): void {
    this.forceArrival = true
  }

  navigate(dir: number): void {
    const idx = CARD_CATALOG.value.findIndex((c) => c.id === this.store.currentCardId)
    if (idx < 0) return

    perfTracker.markNavigationStart()

    // Notify dependents (e.g. reset merge state)
    this.onNavigate?.()

    // Finalize any in-progress transition
    this.finalizeDeparting()
    for (const mesh of this.cardMeshes.value) setCardFade(mesh, 1)

    // Capture current meshes as departing
    this.departingMeshes = this.cardMeshes.value.map((mesh) => ({
      mesh,
      startZ: mesh.position.z,
    }))
    this.departStart = performance.now() * 0.001
    // Don't start arrival yet — wait for onSceneRebuilt
    this.arriving = false

    // Advance selection — triggers displayCardIds watcher
    const newIdx = (idx + dir + CARD_CATALOG.value.length) % CARD_CATALOG.value.length
    this.store.currentCardId = CARD_CATALOG.value[newIdx]!.id
  }

  /** Re-add departing meshes after a scene rebuild so they can fade out visually. */
  onSceneRebuilt(): void {
    perfTracker.markNavigationEnd()
    const scene = this.getScene()
    for (const { mesh } of this.departingMeshes) scene?.add(mesh)
    if (this.departingMeshes.length > 0 || this.forceArrival) {
      // New meshes are ready — start arrival timeline now
      for (const mesh of this.cardMeshes.value) setCardFade(mesh, 0)
      this.arrivalStart = performance.now() * 0.001
      this.arriving = true
      this.forceArrival = false
    }
  }

  /** Animate departing/arriving card transition. Call once per frame. */
  tick(time: number): void {
    if (this.departingMeshes.length === 0 && !this.arriving) return

    // --- Departing meshes: fade out + push back ---
    if (this.departingMeshes.length > 0) {
      const dt = Math.min((time - this.departStart) / DEPART_DURATION, 1)
      const dEase = easeOutCubic(dt)

      const pushZ = this.store.dimensions.boxD * 0.25
      for (const { mesh, startZ } of this.departingMeshes) {
        setCardFade(mesh, 1 - dEase)
        mesh.position.z = startZ - dEase * pushZ
      }

      if (dt >= 1) this.finalizeDeparting()
    }

    // --- Arriving meshes: fade in (independent timeline) ---
    if (this.arriving) {
      const at = Math.min((time - this.arrivalStart) / ARRIVE_DURATION, 1)
      const aEase = easeInOutSine(at)

      for (const mesh of this.cardMeshes.value) {
        setCardFade(mesh, aEase)
      }

      if (at >= 1) this.arriving = false
    }
  }

  /** Handle keyboard events. Returns true if the event was consumed. */
  handleKeydown(e: KeyboardEvent): boolean {
    if (e.key === 'n') {
      this.navigate(1)
      return true
    }
    if (e.key === 'b') {
      this.navigate(-1)
      return true
    }
    return false
  }

  private finalizeDeparting(): void {
    const scene = this.getScene()
    for (const { mesh } of this.departingMeshes) scene?.remove(mesh)
    this.departingMeshes = []
  }
}
