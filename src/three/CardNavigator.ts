import type { Mesh, Scene } from 'three'
import { MeshBasicMaterial, ShaderMaterial } from 'three'
import type { ShallowRef } from 'vue'
import { CARD_CATALOG } from '@/data/cardCatalog'
import type { useAppStore } from '@/stores/app'

const TRANSITION_DURATION = 1.5

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
 * Single Responsibility: card selection traversal + transition animation.
 * Dependency Inversion: receives store, scene accessor, and mesh ref via constructor.
 */
export class CardNavigator {
  private departingMeshes: { mesh: Mesh; startZ: number }[] = []
  private transitionStart = 0
  private fadeInMeshes = false

  constructor(
    private readonly store: ReturnType<typeof useAppStore>,
    private readonly getScene: () => Scene | null,
    private readonly cardMeshes: ShallowRef<Mesh[]>,
    private readonly onNavigate?: () => void,
  ) {}

  navigate(dir: number): void {
    const idx = CARD_CATALOG.findIndex((c) => c.id === this.store.currentCardId)
    if (idx < 0) return

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
    this.transitionStart = performance.now() * 0.001
    this.fadeInMeshes = true

    // Advance selection — triggers displayCardIds watcher
    const newIdx = (idx + dir + CARD_CATALOG.length) % CARD_CATALOG.length
    this.store.currentCardId = CARD_CATALOG[newIdx]!.id
  }

  /** Re-add departing meshes after a scene rebuild so they can fade out visually. */
  onSceneRebuilt(): void {
    const scene = this.getScene()
    for (const { mesh } of this.departingMeshes) scene?.add(mesh)
    if (this.fadeInMeshes) {
      for (const mesh of this.cardMeshes.value) setCardFade(mesh, 0)
    }
  }

  /** Animate departing/arriving card transition. Call once per frame. */
  tick(time: number): void {
    if (this.departingMeshes.length === 0) return

    const elapsed = time - this.transitionStart
    const t = Math.min(elapsed / TRANSITION_DURATION, 1)
    const ease = 1 - (1 - t) * (1 - t) // ease-out quadratic

    const pushZ = this.store.dimensions.boxD * 0.3
    for (const { mesh, startZ } of this.departingMeshes) {
      setCardFade(mesh, 1 - ease)
      mesh.position.z = startZ - ease * pushZ
    }

    for (const mesh of this.cardMeshes.value) {
      setCardFade(mesh, ease)
    }

    if (t >= 1) this.finalizeDeparting()
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
    this.fadeInMeshes = false
  }
}
