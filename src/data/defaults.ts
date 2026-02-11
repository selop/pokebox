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
  ultraRareBaseBrightness: 1.4,
  ultraRareShineBrightness: 0.75,
  ultraRareShineContrast: 1.95,
  ultraRareShineSaturation: 16.6,
  ultraRareShineAfterBrightness: 2.3,
  ultraRareShineAfterContrast: 0.4,
  ultraRareShineAfterSaturation: 1.85,
  ultraRareShineBaseBrightness: 3.45,
  ultraRareShineBaseContrast: 1.2,
  ultraRareShineBaseSaturation: 4.2,
  ultraRareGlareContrast: 0.65,
  ultraRareGlare2Contrast: 0.6,
  ultraRareRotateDelta: 99.0,
  ultraRareAngle1Mult: 0.65,
  ultraRareAngle2Mult: 0.65,
  ultraRareBgYMult1: 0.45,
  ultraRareBgYMult2: 1.2,
  ultraRareBarAngle: 128.5,
  ultraRareBarOffsetBgXMult: 0.9,
  ultraRareBarOffsetBgYMult: 1.1,
  ultraRareBarFrequency: 4.5,
  ultraRareBarIntensityStart1: 0.0,
  ultraRareBarIntensityEnd1: 0.47,
  ultraRareBarIntensityStart2: 0.11,
  ultraRareBarIntensityEnd2: 0.82,
  ultraRareSparkleIntensity: 0.6,
  ultraRareSparkleRadius: 0.7,
  ultraRareSparkleContrast: 2.3,
  ultraRareSparkleColorShift: 5.0,
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
