import { useAppStore } from '@/stores/app'

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

  isSettled(epsilon = 0.001): boolean {
    return (
      Math.abs(this.position - this.target) < epsilon &&
      Math.abs(this.velocity) < epsilon
    )
  }
}

export interface MouseTiltState {
  pointerX: number
  pointerY: number
  rotateX: number
  rotateY: number
  backgroundX: number
  backgroundY: number
  pointerFromCenter: number
  isActive: boolean
}

export function useMouseTilt() {
  const store = useAppStore()

  const springs = {
    pointerX: new SpringValue(0.5),
    pointerY: new SpringValue(0.5),
    rotateX: new SpringValue(0),
    rotateY: new SpringValue(0),
    pointerFromCenter: new SpringValue(0),
  }
  const allSprings = Object.values(springs)

  const state: MouseTiltState = {
    pointerX: 0.5,
    pointerY: 0.5,
    rotateX: 0,
    rotateY: 0,
    backgroundX: 0.5,
    backgroundY: 0.5,
    pointerFromCenter: 0,
    isActive: false,
  }

  let canvas: HTMLElement | null = null

  function onPointerMove(e: PointerEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = 1 - (e.clientY - rect.top) / rect.height // Y-flipped for GL

    springs.pointerX.target = nx
    springs.pointerY.target = ny
    springs.rotateX.target = -(ny - 0.5) * MAX_TILT * 2
    springs.rotateY.target = (nx - 0.5) * MAX_TILT * 2

    const dx = nx - 0.5
    const dy = ny - 0.5
    springs.pointerFromCenter.target = Math.min(Math.sqrt(dx * dx + dy * dy) * 2, 1)

    state.isActive = true
  }

  function onPointerLeave() {
    springs.pointerX.target = 0.5
    springs.pointerY.target = 0.5
    springs.rotateX.target = 0
    springs.rotateY.target = 0
    springs.pointerFromCenter.target = 0
    state.isActive = false
  }

  function update(dt: number): void {
    for (const spring of allSprings) {
      spring.update(dt)
    }
    state.pointerX = springs.pointerX.position
    state.pointerY = springs.pointerY.position
    state.rotateX = springs.rotateX.position
    state.rotateY = springs.rotateY.position
    state.backgroundX = 0.37 + springs.pointerX.position * 0.26
    state.backgroundY = 0.37 + springs.pointerY.position * 0.26
    state.pointerFromCenter = springs.pointerFromCenter.position
  }

  function allSettled(): boolean {
    return allSprings.every((s) => s.isSettled())
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

  return { state, update, allSettled, attach, detach }
}
