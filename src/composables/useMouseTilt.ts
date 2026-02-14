import { MAX_TILT, SpringValue } from '@/utils/SpringValue'

export interface MouseTiltState {
  rotateX: number
  rotateY: number
}

export function useMouseTilt() {
  const springs = {
    rotateX: new SpringValue(0),
    rotateY: new SpringValue(0),
  }
  const allSprings = Object.values(springs)

  const state: MouseTiltState = {
    rotateX: 0,
    rotateY: 0,
  }

  let canvas: HTMLElement | null = null

  function onPointerMove(e: PointerEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = 1 - (e.clientY - rect.top) / rect.height // Y-flipped for GL

    // Inverted: hovering top tilts top towards user (+Z), hovering left tilts left towards user
    springs.rotateX.target = (ny - 0.5) * MAX_TILT * 2
    springs.rotateY.target = -(nx - 0.5) * MAX_TILT * 2
  }

  function onPointerLeave() {
    springs.rotateX.target = 0
    springs.rotateY.target = 0
  }

  function update(dt: number): void {
    for (const spring of allSprings) {
      spring.update(dt)
    }
    state.rotateX = springs.rotateX.position
    state.rotateY = springs.rotateY.position
  }

  function attach(el: HTMLElement): void {
    canvas = el
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
  }

  function detach(): void {
    if (!canvas) return
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    canvas = null
  }

  return { state, update, attach, detach }
}
