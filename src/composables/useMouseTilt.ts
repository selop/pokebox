const MAX_TILT = 25 * (Math.PI / 180) // 25 degrees in radians
const STIFFNESS = 0.15
const DAMPING = 0.7

class SpringValue {
  position: number
  velocity = 0
  target: number

  constructor(initial: number) {
    this.position = initial
    this.target = initial
  }

  update(dt: number): void {
    const step = Math.min(dt, 0.064)
    const accel = -STIFFNESS * (this.position - this.target) - DAMPING * this.velocity
    this.velocity += accel * step * 60
    this.position += this.velocity * step * 60
  }
}

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

    springs.rotateX.target = -(ny - 0.5) * MAX_TILT * 2
    springs.rotateY.target = (nx - 0.5) * MAX_TILT * 2
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
