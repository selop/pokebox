import type { AppConfig, CardTransform } from '@/types'

export const DEFAULT_CONFIG: AppConfig = {
  screenWidthCm: 35.57,
  screenHeightCm: 24.81,
  viewingDistanceCm: 45,
  worldScale: 0.01,
  movementScale: 1.5,
  boxDepthRatio: 1.1,
  smoothing: 0.06,
  holoIntensity: 0.7,
  cardSize: 0.5,
  cardSpinSpeed: 0,
  nearPlane: 0.05,
  farPlane: 1000,
}

export const DEFAULT_CARD: CardTransform = {
  x: 0,
  y: -5,
  z: 25,
  rotY: 0,
}

export const CARD_DEFAULTS = {
  x: 0,
  y: -5,
  z: 25,
  rotY: 0,
  holoIntensity: 40,
  cardSpinSpeed: 20,
}
