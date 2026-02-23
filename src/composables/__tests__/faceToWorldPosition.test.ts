import { describe, it, expect } from 'vitest'
import { faceToWorldPosition } from '../useFaceTracking'

// Shared defaults matching a typical config
const screenW = 35.57
const screenH = 24.81
const eyeDefaultZ = 60
const movementScale = 1.5
const nearPlane = 5

describe('faceToWorldPosition', () => {
  it('returns origin when face is centred and offsets are zero', () => {
    const pos = faceToWorldPosition(0.5, 0.5, 0.25, screenW, screenH, eyeDefaultZ, movementScale, 0, 0, nearPlane)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(0)
  })

  it('shifts x by webcamOffsetX when face is centred', () => {
    const offset = 15 // webcam 15 cm right of screen centre
    const pos = faceToWorldPosition(0.5, 0.5, 0.25, screenW, screenH, eyeDefaultZ, movementScale, offset, 0, nearPlane)
    expect(pos.x).toBeCloseTo(15)
    expect(pos.y).toBeCloseTo(0)
  })

  it('shifts y by webcamOffsetY when face is centred', () => {
    const offset = -10 // webcam 10 cm below screen centre
    const pos = faceToWorldPosition(0.5, 0.5, 0.25, screenW, screenH, eyeDefaultZ, movementScale, 0, offset, nearPlane)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(-10)
  })

  it('combines face displacement with webcam offset', () => {
    const offsetX = 18
    // Face at fx=0.3 → displaced from centre by 0.2 to the left in video = rightward in world
    const pos = faceToWorldPosition(0.3, 0.5, 0.25, screenW, screenH, eyeDefaultZ, movementScale, offsetX, 0, nearPlane)
    const expectedX = -(0.3 - 0.5) * screenW * movementScale + offsetX
    expect(pos.x).toBeCloseTo(expectedX)
  })

  it('computes z from face width (depth)', () => {
    const pos = faceToWorldPosition(0.5, 0.5, 0.25, screenW, screenH, eyeDefaultZ, movementScale, 0, 0, nearPlane)
    // refFaceW / faceW = 0.25 / 0.25 = 1.0 → z = eyeDefaultZ
    expect(pos.z).toBeCloseTo(eyeDefaultZ)
  })

  it('clamps z above nearPlane + 1', () => {
    // Very large face width → depthScale very small → z would be tiny
    const pos = faceToWorldPosition(0.5, 0.5, 5.0, screenW, screenH, eyeDefaultZ, movementScale, 0, 0, nearPlane)
    expect(pos.z).toBe(nearPlane + 1)
  })

  it('clamps faceW floor at 0.05 to avoid division by zero', () => {
    const pos = faceToWorldPosition(0.5, 0.5, 0, screenW, screenH, eyeDefaultZ, movementScale, 0, 0, nearPlane)
    // 0.25 / 0.05 = 5 → z = 300
    expect(pos.z).toBeCloseTo(eyeDefaultZ * 5)
  })
})
