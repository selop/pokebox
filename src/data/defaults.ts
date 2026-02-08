import type { AppConfig, CardTransform } from '@/types'

export const DEFAULT_CONFIG: AppConfig = {
  screenWidthCm: 35.57,
  screenHeightCm: 24.81,
  viewingDistanceCm: 45,
  worldScale: 0.01,
  movementScale: 1.5,
  boxDepthRatio: 1.1,
  smoothing: 0.06,
  holoIntensity: 0.55,
  cardSpinSpeed: 0,
  nearPlane: 0.05,
  farPlane: 1000,
}

export const DEFAULT_CARD: CardTransform = {
  x: 0,
  y: 0,
  z: 50,
  rotY: 0,
}

export const CARD_DEFAULTS = {
  x: 0,
  y: 0,
  z: 22,
  rotY: 0,
  holoIntensity: 75,
  cardSpinSpeed: 20,
}
