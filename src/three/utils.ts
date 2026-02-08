/**
 * Seeded PRNG (Mulberry32) for deterministic furniture layouts.
 */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Random color between two hex values (interpolated per-channel).
 */
export function randColor(lo: number, hi: number): number {
  const lr = (lo >> 16) & 0xff,
    lg = (lo >> 8) & 0xff,
    lb = lo & 0xff
  const hr = (hi >> 16) & 0xff,
    hg = (hi >> 8) & 0xff,
    hb = hi & 0xff
  const t = Math.random()
  const r = Math.floor(lr + t * (hr - lr))
  const g = Math.floor(lg + t * (hg - lg))
  const b = Math.floor(lb + t * (hb - lb))
  return (r << 16) | (g << 8) | b
}

/**
 * Pick a random element from an array.
 */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/**
 * Set position on a Three.js Object3D and return it.
 */
export function posAt<T extends { position: { set: (x: number, y: number, z: number) => void } }>(
  obj: T,
  x: number,
  y: number,
  z: number,
): T {
  obj.position.set(x, y, z)
  return obj
}
