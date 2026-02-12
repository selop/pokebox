export interface AppConfig {
  screenWidthCm: number
  screenHeightCm: number
  viewingDistanceCm: number
  worldScale: number
  movementScale: number
  boxDepthRatio: number
  smoothing: number
  holoIntensity: number
  cardSize: number
  cardSpinSpeed: number
  nearPlane: number
  farPlane: number
  // Illustration Rare shader parameters
  illustRareRainbowScale: number
  illustRareBarAngle: number
  illustRareBarDensity: number
  illustRareBarOffsetBgXMult: number
  illustRareBarOffsetBgYMult: number
  illustRareBar2OffsetBgXMult: number
  illustRareBar2OffsetBgYMult: number
  illustRareBarWidth: number
  illustRareBarIntensity: number
  illustRareBarHue: number
  illustRareBarMediumSaturation: number
  illustRareBarMediumLightness: number
  illustRareBarBrightSaturation: number
  illustRareBarBrightLightness: number
  illustRareShine1Contrast: number
  illustRareShine1Saturation: number
  illustRareShine2Opacity: number
  illustRareGlareOpacity: number
  // Special Illustration Rare shader parameters
  sirShineAngle: number
  sirShineFrequency: number
  sirShineBrightness: number
  sirShineContrast: number
  sirShineSaturation: number
  sirGlitterContrast: number
  sirGlitterSaturation: number
  sirWashScale: number
  sirWashTiltSensitivity: number
  sirWashSaturation: number
  sirWashContrast: number
  sirWashOpacity: number
  sirBaseBrightness: number
  sirBaseContrast: number
  // Ultra Rare shader parameters
  ultraRareBaseBrightness: number
  ultraRareShineBrightness: number
  ultraRareShineContrast: number
  ultraRareShineSaturation: number
  ultraRareShineAfterBrightness: number
  ultraRareShineAfterContrast: number
  ultraRareShineAfterSaturation: number
  ultraRareShineBaseBrightness: number
  ultraRareShineBaseContrast: number
  ultraRareShineBaseSaturation: number
  ultraRareGlareContrast: number
  ultraRareGlare2Contrast: number
  ultraRareRotateDelta: number
  ultraRareAngle1Mult: number
  ultraRareAngle2Mult: number
  ultraRareBgYMult1: number
  ultraRareBgYMult2: number
  // Ultra Rare diagonal bar parameters
  ultraRareBarAngle: number
  ultraRareBarOffsetBgXMult: number
  ultraRareBarOffsetBgYMult: number
  ultraRareBarFrequency: number
  ultraRareBarIntensityStart1: number
  ultraRareBarIntensityEnd1: number
  ultraRareBarIntensityStart2: number
  ultraRareBarIntensityEnd2: number
  // Ultra Rare metallic sparkle parameters
  ultraRareSparkleIntensity: number
  ultraRareSparkleRadius: number
  ultraRareSparkleContrast: number
  ultraRareSparkleColorShift: number
}

export interface CardTransform {
  x: number // -50..50 percent of screenW from centre
  y: number // -50..50 percent of screenH from centre
  z: number // 0..100 percent of boxD from opening
  rotY: number // -180..180 degrees
}

export interface CardCatalogEntry {
  id: string
  label: string
  front: string // path relative to public/
  mask: string // path relative to public/
  foil: string // path relative to public/
  holoType: HoloType // which holo shader to use
  iri7?: string // iridescent texture 7 (for special-illustration-rare and ultra-rare)
  iri8?: string // iridescent texture 8 (for special-illustration-rare and ultra-rare)
  iri9?: string // iridescent texture 9 (for special-illustration-rare and ultra-rare)
}

export interface EyePosition {
  x: number
  y: number
  z: number
}

export type SceneMode = 'furniture' | 'cards'
export type RenderMode = 'xray' | 'solid'
export type CardDisplayMode = 'single' | 'triple'
export type ShaderStyle =
  | 'illustration-rare'
  | 'regular-holo'
  | 'special-illustration-rare'
  | 'double-rare'
  | 'ultra-rare'
  | 'reverse-holo'
export type HoloType =
  | 'illustration-rare'
  | 'regular-holo'
  | 'special-illustration-rare'
  | 'double-rare'
  | 'ultra-rare'
  | 'reverse-holo'

export interface DerivedDimensions {
  screenW: number
  screenH: number
  boxD: number
  eyeDefaultZ: number
}
