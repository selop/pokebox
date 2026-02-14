export const MAX_TILT = 25 * (Math.PI / 180) // 25 degrees in radians
export const STIFFNESS = 0.15
export const DAMPING = 0.7

export class SpringValue {
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
