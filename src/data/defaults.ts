import type { AppConfig, CardTransform } from '@/types'

export const DEFAULT_CONFIG: AppConfig = {
  screenWidthCm: 35.57,
  screenHeightCm: 24.81,
  viewingDistanceCm: 60,
  worldScale: 0.01,
  movementScale: 1.5,
  boxDepthRatio: 0.6,
  smoothing: 0.06,
  holoIntensity: 0.82,
  cardSize: 0.5,
  cardSpinSpeed: 0,
  nearPlane: 0.05,
  farPlane: 1000,
  // Illustration Rare shader defaults (from shader hardcoded values)
  illustRareRainbowScale: 0.4,
  illustRareBarAngle: 133,
  illustRareBarDensity: 2.4,
  illustRareBarWidth: 5.25,
  illustRareBarIntensity: 5.25,
  illustRareBarHue: 180, // cyan
  illustRareBarMediumSaturation: 0.1, // hsl(180, 10%, 60%)
  illustRareBarMediumLightness: 0.6,
  illustRareBarBrightSaturation: 0.5, // hsl(180, 50%, 68%)
  illustRareBarBrightLightness: 0.68,
  illustRareShine1Contrast: 3.7,
  illustRareShine1Saturation: 0.3,
  illustRareShine2Opacity: 0.9,
  illustRareGlareOpacity: 0.3,
  // Ultra Rare shader defaults (from shader hardcoded values)
  ultraRareBaseBrightness: 1.0,
  ultraRareShineBrightness: 0.65,
  ultraRareShineContrast: 4.1,
  ultraRareShineSaturation: 19.0,
  ultraRareShineAfterBrightness: 2.3,
  ultraRareShineAfterContrast: 1.6,
  ultraRareShineAfterSaturation: 1.0,
  ultraRareShineBaseBrightness: 2.15,
  ultraRareShineBaseContrast: 1.0,
  ultraRareShineBaseSaturation: 5.0,
  ultraRareGlareContrast: 0.55,
  ultraRareGlare2Contrast: 0.8,
  ultraRareRotateDelta: 99.0,
  ultraRareAngle1Mult: 0.65,
  ultraRareAngle2Mult: 0.65,
  ultraRareBgYMult1: 0.45,
  ultraRareBgYMult2: 1.2,
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
