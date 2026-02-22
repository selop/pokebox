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
  startRotZ: number
  startScale: number
}

const FAN_ZOOM_DURATION = 0.8
const ACTIVATION_DURATION = 1.0

/**
 * Handles fan mode animation: intro stagger, hover peek, zoom-to-single transition,
 * activation progress driving, and pack opening cascade reset.
 *
 * Follows the established pattern of CardNavigator and MergeAnimator
 * (class with constructor injection, tick() method).
 */
export class FanAnimator {
  private fanZoomTransition: FanZoomTransition | null = null

  constructor(
    private readonly store: ReturnType<typeof useAppStore>,
    private readonly cardSceneBuilder: CardSceneBuilder,
  ) {}

  /** Start a zoom transition from a fan card to single mode. */
  startZoom(mesh: Mesh, fanIndex: number): void {
    this.fanZoomTransition = {
      fanIndex,
      startTime: performance.now() * 0.001,
      duration: FAN_ZOOM_DURATION,
      startPos: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      startRotZ: mesh.rotation.z,
      startScale: mesh.scale.x,
    }
  }

  get isZooming(): boolean {
    return this.fanZoomTransition !== null
  }

  isIntroPlaying(meshes: Mesh[]): boolean {
    return meshes.some((m) => m.userData.fanIntro)
  }

  /** Reset zoom state (e.g. on scene rebuild). */
  reset(): void {
    this.fanZoomTransition = null
  }

  /** Animate fan cards. Call once per frame when in fan mode. */
  tick(meshes: Mesh[], time: number, dt: number, tilt: TiltState): void {
    const store = this.store
    const peekSpeed = 1 - Math.pow(0.001, dt)
    const hoveredIdx = store.hoveredFanCard
    const introPlaying = this.isIntroPlaying(meshes)

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

      // Skip normal peek if zoom transition is driving positions
      if (this.fanZoomTransition) continue

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

    // ── Fan-to-single zoom transition ──
    if (this.fanZoomTransition) {
      const zt = this.fanZoomTransition
      const elapsed = time - zt.startTime
      const rawT = Math.min(elapsed / zt.duration, 1.0)
      // Cubic ease-in-out
      const ease = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2

      const dims = store.dimensions
      const targetX = (store.cardTransform.x / 100) * dims.screenW
      const targetY = (store.cardTransform.y / 100) * dims.screenH
      const targetZ = -(store.cardTransform.z / 100) * dims.boxD
      const singleScale = store.singleCardSize / (store.config.cardSize * 0.85)

      for (const mesh of meshes) {
        const isFocused = mesh.userData.fanIndex === zt.fanIndex
        if (isFocused) {
          mesh.position.x = zt.startPos.x + (targetX - zt.startPos.x) * ease
          mesh.position.y = zt.startPos.y + (targetY - zt.startPos.y) * ease
          mesh.position.z = zt.startPos.z + (targetZ - zt.startPos.z) * ease
          mesh.rotation.z = zt.startRotZ * (1 - ease)
          mesh.rotation.y = ease * Math.PI * 2
          const s = zt.startScale + (singleScale - zt.startScale) * ease
          mesh.scale.setScalar(s)
          mesh.renderOrder = 200
        } else {
          const fadeScale = mesh.scale.x * (1 - ease * 0.5)
          mesh.scale.setScalar(Math.max(fadeScale, 0.01))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((mesh.material as any).opacity !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(mesh.material as any).opacity = 1 - ease
          }
        }
      }

      if (rawT >= 1.0) {
        store.selectFanCard(zt.fanIndex)
        this.fanZoomTransition = null
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
        mesh.userData.activationState = 'done'
      }
    }

    // Reset pack opening phase once fan intro animation finishes
    if (store.packOpeningPhase === 'cascade' && !introPlaying) {
      store.packOpeningPhase = 'idle'
    }
  }
}
