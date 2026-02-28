export interface LightConfig {
  ambientIntensity: number
  directionalIntensity: number
  backlightIntensity: number
  spotlightIntensity: number
  spotlightX: number
  spotlightY: number
  spotlightAngle: number
  spotlightPenumbra: number
}

export interface DofConfig {
  enabled: boolean
  fStop: number
  maxBlur: number
  focusOffset: number
  exposure: number // EV compensation (0 = no change, +1 = 2× brighter, -1 = 0.5×)
}

export interface BloomConfig {
  enabled: boolean
  strength: number // 0–3, how bright the glow
  radius: number // 0–1, how spread/soft
  threshold: number // 0–1, luminance cutoff
}

export interface SceneConfig {
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
  webcamOffsetX: number // cm offset of webcam from screen centre (positive = right)
  webcamOffsetY: number // cm offset of webcam from screen centre (positive = up)
  lights: LightConfig
  dof: DofConfig
  bloom: BloomConfig
}

export interface IllustrationRareConfig {
  rainbowScale: number
  barAngle: number
  barDensity: number
  barDensity2: number
  barOffsetBgYMult: number
  bar2OffsetBgYMult: number
  barWidth: number
  barWidth2: number
  barIntensity: number
  barHue: number
  barMediumSaturation: number
  barMediumLightness: number
  barBrightSaturation: number
  barBrightLightness: number
  barIntensity2: number
  barHue2: number
  barMediumSaturation2: number
  barMediumLightness2: number
  barBrightSaturation2: number
  barBrightLightness2: number
  shine1Contrast: number
  shine1Saturation: number
  shine2Opacity: number
  glareOpacity: number
}

export interface SpecialIllustrationRareConfig {
  shineAngle: number
  shineFrequency: number
  shineBrightness: number
  shineContrast: number
  shineSaturation: number
  glitterContrast: number
  glitterSaturation: number
  washScale: number
  washTiltSensitivity: number
  washSaturation: number
  washContrast: number
  washOpacity: number
  tiltSparkleScale: number
  tiltSparkleIntensity: number
  tiltSparkleTiltSensitivity: number
  tiltSparkle2Scale: number
  tiltSparkle2Intensity: number
  tiltSparkle2TiltSensitivity: number
  baseBrightness: number
  baseContrast: number
}

export interface TeraRainbowRareConfig {
  holoOpacity: number
  rainbowScale: number
  rainbowShift: number
  maskThreshold: number
  sparkleIntensity: number
  sparkleRadius: number
  sparkleContrast: number
  sparkleColorShift: number
  etchSparkleScale: number
  etchSparkleIntensity: number
  etchSparkleTiltSensitivity: number
  etchSparkleTexMix: number
  etchSparkle2Scale: number
  etchSparkle2Intensity: number
  etchSparkle2TiltSensitivity: number
  etchSparkle2TexMix: number
  baseBrightness: number
  baseContrast: number
  baseSaturation: number
}

export interface UltraRareConfig {
  baseBrightness: number
  shineBrightness: number
  shineContrast: number
  shineSaturation: number
  shineAfterBrightness: number
  shineAfterContrast: number
  shineAfterSaturation: number
  shineBaseBrightness: number
  shineBaseContrast: number
  shineBaseSaturation: number
  glareContrast: number
  glare2Contrast: number
  rotateDelta: number
  angle1Mult: number
  angle2Mult: number
  bgYMult1: number
  bgYMult2: number
  barAngle: number
  barOffsetBgXMult: number
  barOffsetBgYMult: number
  barFrequency: number
  barIntensityStart1: number
  barIntensityEnd1: number
  barIntensityStart2: number
  barIntensityEnd2: number
  sparkleIntensity: number
  sparkleRadius: number
  sparkleContrast: number
  sparkleColorShift: number
}

export interface RainbowRareConfig {
  baseBrightness: number
  shineBrightness: number
  shineContrast: number
  shineSaturation: number
  shineBaseBrightness: number
  shineBaseContrast: number
  shineBaseSaturation: number
  glareContrast: number
  glare2Contrast: number
  sparkleIntensity: number
  sparkleRadius: number
  sparkleContrast: number
  sparkleColorShift: number
}

export interface ReverseHoloConfig {
  shineIntensity: number
  shineOpacity: number
  shineColorR: number
  shineColorG: number
  shineColorB: number
  specularRadius: number
  specularPower: number
  baseBrightness: number
  baseContrast: number
  baseSaturation: number
}

export interface FlatsilverReverseConfig {
  rainbowScale: number
  rainbowShift: number
  rainbowSaturation: number
  rainbowOpacity: number
  spotlightRadius: number
  spotlightIntensity: number
  grainScale: number
  grainIntensity: number
  baseBrightness: number
  baseContrast: number
  baseSaturation: number
}

export interface MasterBallConfig {
  rainbowScale: number
  rainbowShift: number
  sparkleScale: number
  sparkleIntensity: number
  sparkleTiltSensitivity: number
  sparkleTexMix: number
  sparkle2Scale: number
  sparkle2Intensity: number
  sparkle2TiltSensitivity: number
  sparkle2TexMix: number
  etchOpacity: number
  etchContrast: number
  etchStampOpacity: number
  etchStampHoloOpacity: number
  etchStampHoloScale: number
  etchStampMaskThreshold: number
  rainbowOpacity: number
  mosaicScale: number
  mosaicIntensity: number
  mosaicSaturation: number
  mosaicContrast: number
  mosaicFoilThreshold: number
  glareOpacity: number
  glareContrast: number
  glareSaturation: number
  baseBrightness: number
  baseContrast: number
}

export interface ShinyRareConfig {
  rainbowScale: number
  rainbowShift: number
  etchOpacity: number
  etchContrast: number
  etchStampOpacity: number
  etchStampHoloOpacity: number
  etchStampHoloScale: number
  etchStampMaskThreshold: number
  rainbowOpacity: number
  glareOpacity: number
  glareContrast: number
  glareSaturation: number
  baseBrightness: number
  baseContrast: number
  metalIntensity: number
  metalMaskThreshold: number
  metalTiltSensitivity: number
  metalTiltThreshold: number
  metalBrightness: number
  metalNoiseScale: number
  metalSaturation: number
  barAngle: number
  barDensity: number
  barOffsetBgYMult: number
  barWidth: number
  barIntensity: number
  barHue: number
  barMediumSaturation: number
  barMediumLightness: number
  barBrightSaturation: number
  barBrightLightness: number
  barDensity2: number
  bar2OffsetBgYMult: number
  barWidth2: number
  barIntensity2: number
  barHue2: number
  barMediumSaturation2: number
  barMediumLightness2: number
  barBrightSaturation2: number
  barBrightLightness2: number
  shine1Contrast: number
  shine1Saturation: number
  shine2Opacity: number
}

export interface TeraShinyRareConfig extends TeraRainbowRareConfig {
  mosaicScale: number
  mosaicIntensity: number
  mosaicSaturation: number
  mosaicContrast: number
  mosaicFoilThreshold: number
}

export interface ShaderConfigs {
  illustrationRare: IllustrationRareConfig
  specialIllustrationRare: SpecialIllustrationRareConfig
  teraRainbowRare: TeraRainbowRareConfig
  teraShinyRare: TeraShinyRareConfig
  ultraRare: UltraRareConfig
  rainbowRare: RainbowRareConfig
  reverseHolo: ReverseHoloConfig
  flatsilverReverse: FlatsilverReverseConfig
  masterBall: MasterBallConfig
  shinyRare: ShinyRareConfig
}

export interface AppConfig extends SceneConfig {
  shaders: ShaderConfigs
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

export type InputMode = 'camera' | 'gyroscope' | 'keyboard'
export type SceneMode = 'furniture' | 'cards'
export type RenderMode = 'xray' | 'solid'
export type CardDisplayMode = 'single' | 'fan' | 'carousel' | 'stack'
export type ShaderStyle =
  | 'illustration-rare'
  | 'regular-holo'
  | 'special-illustration-rare'
  | 'tera-rainbow-rare'
  | 'tera-shiny-rare'
  | 'double-rare'
  | 'ultra-rare'
  | 'rainbow-rare'
  | 'reverse-holo'
  | 'flatsilver-reverse'
  | 'master-ball'
  | 'shiny-rare'
export type HoloType =
  | 'illustration-rare'
  | 'regular-holo'
  | 'special-illustration-rare'
  | 'tera-rainbow-rare'
  | 'tera-shiny-rare'
  | 'double-rare'
  | 'ultra-rare'
  | 'rainbow-rare'
  | 'reverse-holo'
  | 'flatsilver-reverse'
  | 'master-ball'
  | 'shiny-rare'

export interface DerivedDimensions {
  screenW: number
  screenH: number
  boxD: number
  eyeDefaultZ: number
}

export interface SetDefinition {
  id: string
  label: string
  jsonFile: string
  /** When true, prefer FLAT_SILVER+REVERSE over SV_HOLO for cards with both variants. */
  preferReverse?: boolean
}

export interface SetCardJson {
  name: string
  collector_number: { numerator: string; numeric: number }
  rarity: { designation: string }
  foil?: { type: string; mask: string }
  tags?: string[]
  ext: { tcgl: { longFormID: string } }
}
