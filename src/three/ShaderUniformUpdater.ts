import { Mesh, ShaderMaterial, Vector2, Vector3 } from 'three'
import type { EyePosition, DerivedDimensions, CardDisplayMode } from '@/types'
import { CARD_ASPECT } from '@/three/buildCard'

/**
 * Push per-frame eye-based shader uniforms to all card meshes.
 * Extracted from the animate() loop in useThreeScene for single responsibility.
 */
export function updateShaderUniforms(
  meshes: Mesh[],
  time: number,
  eyePos: EyePosition,
  dims: DerivedDimensions,
  cardDisplayMode: CardDisplayMode,
  singleCardSize: number,
  cardSize: number,
): void {
  for (const mesh of meshes) {
    if (!(mesh.material as ShaderMaterial).isShaderMaterial) continue
    const u = (mesh.material as ShaderMaterial).uniforms
    u['uTime']!.value = time

    // Eye-based shader uniforms (face tracking / keyboard)
    mesh.updateMatrixWorld()
    const cardPos = new Vector3()
    mesh.getWorldPosition(cardPos)

    const eyeVec = new Vector3(eyePos.x, eyePos.y, eyePos.z)
    const dir = eyeVec.clone().sub(cardPos)

    const cardRight = new Vector3(1, 0, 0).applyQuaternion(mesh.quaternion)
    const cardUp = new Vector3(0, 1, 0).applyQuaternion(mesh.quaternion)

    const effectiveSize =
      cardDisplayMode === 'single'
        ? singleCardSize
        : cardDisplayMode === 'carousel'
          ? singleCardSize * 0.9
          : cardDisplayMode === 'fan'
            ? cardSize * 0.85
            : cardSize
    const cardH = dims.screenH * effectiveSize
    const cardW = cardH * CARD_ASPECT

    const localX = dir.dot(cardRight) / cardW + 0.5
    const localY = dir.dot(cardUp) / cardH + 0.5

    const px = Math.max(0, Math.min(1, localX))
    const py = Math.max(0, Math.min(1, localY))
    if (u['uPointer']) (u['uPointer']!.value as Vector2).set(px, py)

    if (u['uBackground']) {
      const bx = 0.37 + Math.max(0, Math.min(1, localX)) * 0.26
      const by = 0.37 + Math.max(0, Math.min(1, localY)) * 0.26
      ;(u['uBackground']!.value as Vector2).set(bx, by)
    }

    const dx = px - 0.5,
      dy = py - 0.5
    if (u['uPointerFromCenter'])
      u['uPointerFromCenter']!.value = Math.min(Math.sqrt(dx * dx + dy * dy) * 2.0, 1.0)

    // Additional uniforms for ultra-rare shader
    if (u['uPointerFromLeft']) u['uPointerFromLeft']!.value = px
    if (u['uPointerFromTop']) u['uPointerFromTop']!.value = py
    if (u['uRotateX']) u['uRotateX']!.value = mesh.rotation.y * (180 / Math.PI)
  }
}
