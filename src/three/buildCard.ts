import {
  DataTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
} from 'three'
import type { Texture } from 'three'
import type { AppConfig, CardTransform, DerivedDimensions, ShaderStyle } from '@/types'
import holoVert from '@/shaders/holo.vert'
import activationFrag from '@/shaders/activation.frag'
import illustrationRareFrag from '@/shaders/illustration-rare.frag'
import regularHoloFrag from '@/shaders/regular-holo.frag'
import specialIllustrationRareFrag from '@/shaders/special-illustration-rare.frag'
import doubleRareFrag from '@/shaders/double-rare.frag'
import ultraRareFrag from '@/shaders/ultra-rare.frag'
import rainbowRareFrag from '@/shaders/rainbow-rare.frag'
import reverseHoloFrag from '@/shaders/reverse-holo.frag'
import teraRainbowRareFrag from '@/shaders/tera-rainbow-rare.frag'
import masterBallFrag from '@/shaders/master-ball.frag'
import teraShinyRareFrag from '@/shaders/tera-shiny-rare.frag'
import shinyRareFrag from '@/shaders/shiny-rare.frag'

export const CARD_ASPECT = 733 / 1024 // width / height

const blackPixel = new DataTexture(
  new Uint8Array([0, 0, 0, 255]),
  1,
  1,
  RGBAFormat,
  UnsignedByteType,
)
blackPixel.needsUpdate = true

const FRAGMENT_SHADERS: Record<ShaderStyle, string> = {
  'illustration-rare': illustrationRareFrag,
  'regular-holo': regularHoloFrag,
  'special-illustration-rare': specialIllustrationRareFrag,
  'double-rare': doubleRareFrag,
  'ultra-rare': ultraRareFrag,
  'rainbow-rare': rainbowRareFrag,
  'reverse-holo': reverseHoloFrag,
  'tera-rainbow-rare': teraRainbowRareFrag,
  'tera-shiny-rare': teraShinyRareFrag,
  'master-ball': masterBallFrag,
  'shiny-rare': shinyRareFrag,
}

type UniformMapping = [uniformName: string, getValue: (config: AppConfig) => number]

const STYLE_UNIFORMS: Partial<Record<ShaderStyle, UniformMapping[]>> = {
  'illustration-rare': [
    ['uRainbowScale', (c) => c.shaders.illustrationRare.rainbowScale],
    ['uBarAngle', (c) => c.shaders.illustrationRare.barAngle],
    ['uBarDensity', (c) => c.shaders.illustrationRare.barDensity],
    ['uBarDensity2', (c) => c.shaders.illustrationRare.barDensity2],
    ['uBarOffsetBgYMult', (c) => c.shaders.illustrationRare.barOffsetBgYMult],
    ['uBar2OffsetBgYMult', (c) => c.shaders.illustrationRare.bar2OffsetBgYMult],
    ['uBarWidth', (c) => c.shaders.illustrationRare.barWidth],
    ['uBarWidth2', (c) => c.shaders.illustrationRare.barWidth2],
    ['uBarIntensity', (c) => c.shaders.illustrationRare.barIntensity],
    ['uBarIntensity2', (c) => c.shaders.illustrationRare.barIntensity2],
    ['uBarHue', (c) => c.shaders.illustrationRare.barHue],
    ['uBarMediumSaturation', (c) => c.shaders.illustrationRare.barMediumSaturation],
    ['uBarMediumLightness', (c) => c.shaders.illustrationRare.barMediumLightness],
    ['uBarBrightSaturation', (c) => c.shaders.illustrationRare.barBrightSaturation],
    ['uBarBrightLightness', (c) => c.shaders.illustrationRare.barBrightLightness],
    ['uBarHue2', (c) => c.shaders.illustrationRare.barHue2],
    ['uBarMediumSaturation2', (c) => c.shaders.illustrationRare.barMediumSaturation2],
    ['uBarMediumLightness2', (c) => c.shaders.illustrationRare.barMediumLightness2],
    ['uBarBrightSaturation2', (c) => c.shaders.illustrationRare.barBrightSaturation2],
    ['uBarBrightLightness2', (c) => c.shaders.illustrationRare.barBrightLightness2],
    ['uShine1Contrast', (c) => c.shaders.illustrationRare.shine1Contrast],
    ['uShine1Saturation', (c) => c.shaders.illustrationRare.shine1Saturation],
    ['uShine2Opacity', (c) => c.shaders.illustrationRare.shine2Opacity],
    ['uGlareOpacity', (c) => c.shaders.illustrationRare.glareOpacity],
  ],
  'special-illustration-rare': [
    ['uSirShineAngle', (c) => c.shaders.specialIllustrationRare.shineAngle],
    ['uSirShineFrequency', (c) => c.shaders.specialIllustrationRare.shineFrequency],
    ['uSirShineBrightness', (c) => c.shaders.specialIllustrationRare.shineBrightness],
    ['uSirShineContrast', (c) => c.shaders.specialIllustrationRare.shineContrast],
    ['uSirShineSaturation', (c) => c.shaders.specialIllustrationRare.shineSaturation],
    ['uSirGlitterContrast', (c) => c.shaders.specialIllustrationRare.glitterContrast],
    ['uSirGlitterSaturation', (c) => c.shaders.specialIllustrationRare.glitterSaturation],
    ['uSirWashScale', (c) => c.shaders.specialIllustrationRare.washScale],
    ['uSirWashTiltSensitivity', (c) => c.shaders.specialIllustrationRare.washTiltSensitivity],
    ['uSirWashSaturation', (c) => c.shaders.specialIllustrationRare.washSaturation],
    ['uSirWashContrast', (c) => c.shaders.specialIllustrationRare.washContrast],
    ['uSirWashOpacity', (c) => c.shaders.specialIllustrationRare.washOpacity],
    ['uSirTiltSparkleScale', (c) => c.shaders.specialIllustrationRare.tiltSparkleScale],
    ['uSirTiltSparkleIntensity', (c) => c.shaders.specialIllustrationRare.tiltSparkleIntensity],
    ['uSirTiltSparkleTiltSensitivity', (c) => c.shaders.specialIllustrationRare.tiltSparkleTiltSensitivity],
    ['uSirTiltSparkle2Scale', (c) => c.shaders.specialIllustrationRare.tiltSparkle2Scale],
    ['uSirTiltSparkle2Intensity', (c) => c.shaders.specialIllustrationRare.tiltSparkle2Intensity],
    ['uSirTiltSparkle2TiltSensitivity', (c) => c.shaders.specialIllustrationRare.tiltSparkle2TiltSensitivity],
    ['uSirBaseBrightness', (c) => c.shaders.specialIllustrationRare.baseBrightness],
    ['uSirBaseContrast', (c) => c.shaders.specialIllustrationRare.baseContrast],
  ],
  'tera-rainbow-rare': [
    ['uHoloOpacity', (c) => c.shaders.teraRainbowRare.holoOpacity],
    ['uRainbowScale', (c) => c.shaders.teraRainbowRare.rainbowScale],
    ['uRainbowShift', (c) => c.shaders.teraRainbowRare.rainbowShift],
    ['uMaskThreshold', (c) => c.shaders.teraRainbowRare.maskThreshold],
    ['uSparkleIntensity', (c) => c.shaders.teraRainbowRare.sparkleIntensity],
    ['uSparkleRadius', (c) => c.shaders.teraRainbowRare.sparkleRadius],
    ['uSparkleContrast', (c) => c.shaders.teraRainbowRare.sparkleContrast],
    ['uSparkleColorShift', (c) => c.shaders.teraRainbowRare.sparkleColorShift],
    ['uEtchSparkleScale', (c) => c.shaders.teraRainbowRare.etchSparkleScale],
    ['uEtchSparkleIntensity', (c) => c.shaders.teraRainbowRare.etchSparkleIntensity],
    ['uEtchSparkleTiltSensitivity', (c) => c.shaders.teraRainbowRare.etchSparkleTiltSensitivity],
    ['uEtchSparkleTexMix', (c) => c.shaders.teraRainbowRare.etchSparkleTexMix],
    ['uEtchSparkle2Scale', (c) => c.shaders.teraRainbowRare.etchSparkle2Scale],
    ['uEtchSparkle2Intensity', (c) => c.shaders.teraRainbowRare.etchSparkle2Intensity],
    ['uEtchSparkle2TiltSensitivity', (c) => c.shaders.teraRainbowRare.etchSparkle2TiltSensitivity],
    ['uEtchSparkle2TexMix', (c) => c.shaders.teraRainbowRare.etchSparkle2TexMix],
    ['uBaseBrightness', (c) => c.shaders.teraRainbowRare.baseBrightness],
    ['uBaseContrast', (c) => c.shaders.teraRainbowRare.baseContrast],
    ['uBaseSaturation', (c) => c.shaders.teraRainbowRare.baseSaturation],
  ],
  'tera-shiny-rare': [
    ['uHoloOpacity', (c) => c.shaders.teraShinyRare.holoOpacity],
    ['uRainbowScale', (c) => c.shaders.teraShinyRare.rainbowScale],
    ['uRainbowShift', (c) => c.shaders.teraShinyRare.rainbowShift],
    ['uMaskThreshold', (c) => c.shaders.teraShinyRare.maskThreshold],
    ['uSparkleIntensity', (c) => c.shaders.teraShinyRare.sparkleIntensity],
    ['uSparkleRadius', (c) => c.shaders.teraShinyRare.sparkleRadius],
    ['uSparkleContrast', (c) => c.shaders.teraShinyRare.sparkleContrast],
    ['uSparkleColorShift', (c) => c.shaders.teraShinyRare.sparkleColorShift],
    ['uEtchSparkleScale', (c) => c.shaders.teraShinyRare.etchSparkleScale],
    ['uEtchSparkleIntensity', (c) => c.shaders.teraShinyRare.etchSparkleIntensity],
    ['uEtchSparkleTiltSensitivity', (c) => c.shaders.teraShinyRare.etchSparkleTiltSensitivity],
    ['uEtchSparkleTexMix', (c) => c.shaders.teraShinyRare.etchSparkleTexMix],
    ['uEtchSparkle2Scale', (c) => c.shaders.teraShinyRare.etchSparkle2Scale],
    ['uEtchSparkle2Intensity', (c) => c.shaders.teraShinyRare.etchSparkle2Intensity],
    ['uEtchSparkle2TiltSensitivity', (c) => c.shaders.teraShinyRare.etchSparkle2TiltSensitivity],
    ['uEtchSparkle2TexMix', (c) => c.shaders.teraShinyRare.etchSparkle2TexMix],
    ['uBaseBrightness', (c) => c.shaders.teraShinyRare.baseBrightness],
    ['uBaseContrast', (c) => c.shaders.teraShinyRare.baseContrast],
    ['uBaseSaturation', (c) => c.shaders.teraShinyRare.baseSaturation],
    ['uMosaicScale', (c) => c.shaders.teraShinyRare.mosaicScale],
    ['uMosaicIntensity', (c) => c.shaders.teraShinyRare.mosaicIntensity],
    ['uMosaicSaturation', (c) => c.shaders.teraShinyRare.mosaicSaturation],
    ['uMosaicContrast', (c) => c.shaders.teraShinyRare.mosaicContrast],
    ['uMosaicFoilThreshold', (c) => c.shaders.teraShinyRare.mosaicFoilThreshold],
  ],
  'ultra-rare': [
    ['uBaseBrightness', (c) => c.shaders.ultraRare.baseBrightness],
    ['uShineBrightness', (c) => c.shaders.ultraRare.shineBrightness],
    ['uShineContrast', (c) => c.shaders.ultraRare.shineContrast],
    ['uShineSaturation', (c) => c.shaders.ultraRare.shineSaturation],
    ['uShineAfterBrightness', (c) => c.shaders.ultraRare.shineAfterBrightness],
    ['uShineAfterContrast', (c) => c.shaders.ultraRare.shineAfterContrast],
    ['uShineAfterSaturation', (c) => c.shaders.ultraRare.shineAfterSaturation],
    ['uShineBaseBrightness', (c) => c.shaders.ultraRare.shineBaseBrightness],
    ['uShineBaseContrast', (c) => c.shaders.ultraRare.shineBaseContrast],
    ['uShineBaseSaturation', (c) => c.shaders.ultraRare.shineBaseSaturation],
    ['uGlareContrast', (c) => c.shaders.ultraRare.glareContrast],
    ['uGlare2Contrast', (c) => c.shaders.ultraRare.glare2Contrast],
    ['uRotateDelta', (c) => c.shaders.ultraRare.rotateDelta],
    ['uAngle1Mult', (c) => c.shaders.ultraRare.angle1Mult],
    ['uAngle2Mult', (c) => c.shaders.ultraRare.angle2Mult],
    ['uBgYMult1', (c) => c.shaders.ultraRare.bgYMult1],
    ['uBgYMult2', (c) => c.shaders.ultraRare.bgYMult2],
    ['uBarAngle', (c) => c.shaders.ultraRare.barAngle],
    ['uBarOffsetBgXMult', (c) => c.shaders.ultraRare.barOffsetBgXMult],
    ['uBarOffsetBgYMult', (c) => c.shaders.ultraRare.barOffsetBgYMult],
    ['uBarFrequency', (c) => c.shaders.ultraRare.barFrequency],
    ['uBarIntensityStart1', (c) => c.shaders.ultraRare.barIntensityStart1],
    ['uBarIntensityEnd1', (c) => c.shaders.ultraRare.barIntensityEnd1],
    ['uBarIntensityStart2', (c) => c.shaders.ultraRare.barIntensityStart2],
    ['uBarIntensityEnd2', (c) => c.shaders.ultraRare.barIntensityEnd2],
    ['uSparkleIntensity', (c) => c.shaders.ultraRare.sparkleIntensity],
    ['uSparkleRadius', (c) => c.shaders.ultraRare.sparkleRadius],
    ['uSparkleContrast', (c) => c.shaders.ultraRare.sparkleContrast],
    ['uSparkleColorShift', (c) => c.shaders.ultraRare.sparkleColorShift],
  ],
  'rainbow-rare': [
    ['uBaseBrightness', (c) => c.shaders.rainbowRare.baseBrightness],
    ['uShineBrightness', (c) => c.shaders.rainbowRare.shineBrightness],
    ['uShineContrast', (c) => c.shaders.rainbowRare.shineContrast],
    ['uShineSaturation', (c) => c.shaders.rainbowRare.shineSaturation],
    ['uShineBaseBrightness', (c) => c.shaders.rainbowRare.shineBaseBrightness],
    ['uShineBaseContrast', (c) => c.shaders.rainbowRare.shineBaseContrast],
    ['uShineBaseSaturation', (c) => c.shaders.rainbowRare.shineBaseSaturation],
    ['uGlareContrast', (c) => c.shaders.rainbowRare.glareContrast],
    ['uGlare2Contrast', (c) => c.shaders.rainbowRare.glare2Contrast],
    ['uSparkleIntensity', (c) => c.shaders.rainbowRare.sparkleIntensity],
    ['uSparkleRadius', (c) => c.shaders.rainbowRare.sparkleRadius],
    ['uSparkleContrast', (c) => c.shaders.rainbowRare.sparkleContrast],
    ['uSparkleColorShift', (c) => c.shaders.rainbowRare.sparkleColorShift],
  ],
  'reverse-holo': [
    ['uShineIntensity', (c) => c.shaders.reverseHolo.shineIntensity],
    ['uShineOpacity', (c) => c.shaders.reverseHolo.shineOpacity],
    ['uShineColorR', (c) => c.shaders.reverseHolo.shineColorR],
    ['uShineColorG', (c) => c.shaders.reverseHolo.shineColorG],
    ['uShineColorB', (c) => c.shaders.reverseHolo.shineColorB],
    ['uSpecularRadius', (c) => c.shaders.reverseHolo.specularRadius],
    ['uSpecularPower', (c) => c.shaders.reverseHolo.specularPower],
    ['uBaseBrightness', (c) => c.shaders.reverseHolo.baseBrightness],
    ['uBaseContrast', (c) => c.shaders.reverseHolo.baseContrast],
    ['uBaseSaturation', (c) => c.shaders.reverseHolo.baseSaturation],
  ],
  'master-ball': [
    ['uRainbowScale', (c) => c.shaders.masterBall.rainbowScale],
    ['uRainbowShift', (c) => c.shaders.masterBall.rainbowShift],
    ['uSparkleScale', (c) => c.shaders.masterBall.sparkleScale],
    ['uSparkleIntensity', (c) => c.shaders.masterBall.sparkleIntensity],
    ['uSparkleTiltSensitivity', (c) => c.shaders.masterBall.sparkleTiltSensitivity],
    ['uSparkleTexMix', (c) => c.shaders.masterBall.sparkleTexMix],
    ['uSparkle2Scale', (c) => c.shaders.masterBall.sparkle2Scale],
    ['uSparkle2Intensity', (c) => c.shaders.masterBall.sparkle2Intensity],
    ['uSparkle2TiltSensitivity', (c) => c.shaders.masterBall.sparkle2TiltSensitivity],
    ['uSparkle2TexMix', (c) => c.shaders.masterBall.sparkle2TexMix],
    ['uEtchOpacity', (c) => c.shaders.masterBall.etchOpacity],
    ['uEtchContrast', (c) => c.shaders.masterBall.etchContrast],
    ['uEtchStampOpacity', (c) => c.shaders.masterBall.etchStampOpacity],
    ['uEtchStampHoloOpacity', (c) => c.shaders.masterBall.etchStampHoloOpacity],
    ['uEtchStampHoloScale', (c) => c.shaders.masterBall.etchStampHoloScale],
    ['uEtchStampMaskThreshold', (c) => c.shaders.masterBall.etchStampMaskThreshold],
    ['uRainbowOpacity', (c) => c.shaders.masterBall.rainbowOpacity],
    ['uMosaicScale', (c) => c.shaders.masterBall.mosaicScale],
    ['uMosaicIntensity', (c) => c.shaders.masterBall.mosaicIntensity],
    ['uMosaicSaturation', (c) => c.shaders.masterBall.mosaicSaturation],
    ['uMosaicContrast', (c) => c.shaders.masterBall.mosaicContrast],
    ['uMosaicFoilThreshold', (c) => c.shaders.masterBall.mosaicFoilThreshold],
    ['uGlareOpacity', (c) => c.shaders.masterBall.glareOpacity],
    ['uGlareContrast', (c) => c.shaders.masterBall.glareContrast],
    ['uGlareSaturation', (c) => c.shaders.masterBall.glareSaturation],
    ['uBaseBrightness', (c) => c.shaders.masterBall.baseBrightness],
    ['uBaseContrast', (c) => c.shaders.masterBall.baseContrast],
  ],
  'shiny-rare': [
    ['uRainbowScale', (c) => c.shaders.shinyRare.rainbowScale],
    ['uRainbowShift', (c) => c.shaders.shinyRare.rainbowShift],
    ['uEtchOpacity', (c) => c.shaders.shinyRare.etchOpacity],
    ['uEtchContrast', (c) => c.shaders.shinyRare.etchContrast],
    ['uEtchStampOpacity', (c) => c.shaders.shinyRare.etchStampOpacity],
    ['uEtchStampHoloOpacity', (c) => c.shaders.shinyRare.etchStampHoloOpacity],
    ['uEtchStampHoloScale', (c) => c.shaders.shinyRare.etchStampHoloScale],
    ['uEtchStampMaskThreshold', (c) => c.shaders.shinyRare.etchStampMaskThreshold],
    ['uRainbowOpacity', (c) => c.shaders.shinyRare.rainbowOpacity],
    ['uGlareOpacity', (c) => c.shaders.shinyRare.glareOpacity],
    ['uGlareContrast', (c) => c.shaders.shinyRare.glareContrast],
    ['uGlareSaturation', (c) => c.shaders.shinyRare.glareSaturation],
    ['uBaseBrightness', (c) => c.shaders.shinyRare.baseBrightness],
    ['uBaseContrast', (c) => c.shaders.shinyRare.baseContrast],
    ['uMetalIntensity', (c) => c.shaders.shinyRare.metalIntensity],
    ['uMetalMaskThreshold', (c) => c.shaders.shinyRare.metalMaskThreshold],
    ['uMetalTiltSensitivity', (c) => c.shaders.shinyRare.metalTiltSensitivity],
    ['uMetalTiltThreshold', (c) => c.shaders.shinyRare.metalTiltThreshold],
    ['uMetalBrightness', (c) => c.shaders.shinyRare.metalBrightness],
    ['uMetalNoiseScale', (c) => c.shaders.shinyRare.metalNoiseScale],
    ['uMetalSaturation', (c) => c.shaders.shinyRare.metalSaturation],
    ['uBarAngle', (c) => c.shaders.shinyRare.barAngle],
    ['uBarDensity', (c) => c.shaders.shinyRare.barDensity],
    ['uBarOffsetBgYMult', (c) => c.shaders.shinyRare.barOffsetBgYMult],
    ['uBarWidth', (c) => c.shaders.shinyRare.barWidth],
    ['uBarIntensity', (c) => c.shaders.shinyRare.barIntensity],
    ['uBarHue', (c) => c.shaders.shinyRare.barHue],
    ['uBarMediumSaturation', (c) => c.shaders.shinyRare.barMediumSaturation],
    ['uBarMediumLightness', (c) => c.shaders.shinyRare.barMediumLightness],
    ['uBarBrightSaturation', (c) => c.shaders.shinyRare.barBrightSaturation],
    ['uBarBrightLightness', (c) => c.shaders.shinyRare.barBrightLightness],
    ['uBarDensity2', (c) => c.shaders.shinyRare.barDensity2],
    ['uBar2OffsetBgYMult', (c) => c.shaders.shinyRare.bar2OffsetBgYMult],
    ['uBarWidth2', (c) => c.shaders.shinyRare.barWidth2],
    ['uBarIntensity2', (c) => c.shaders.shinyRare.barIntensity2],
    ['uBarHue2', (c) => c.shaders.shinyRare.barHue2],
    ['uBarMediumSaturation2', (c) => c.shaders.shinyRare.barMediumSaturation2],
    ['uBarMediumLightness2', (c) => c.shaders.shinyRare.barMediumLightness2],
    ['uBarBrightSaturation2', (c) => c.shaders.shinyRare.barBrightSaturation2],
    ['uBarBrightLightness2', (c) => c.shaders.shinyRare.barBrightLightness2],
    ['uShine1Contrast', (c) => c.shaders.shinyRare.shine1Contrast],
    ['uShine1Saturation', (c) => c.shaders.shinyRare.shine1Saturation],
    ['uShine2Opacity', (c) => c.shaders.shinyRare.shine2Opacity],
  ],
}

function addIriUniforms(
  uniforms: Record<string, { value: unknown }>,
  iriTextures?: { iri7: Texture; iri8: Texture; iri9: Texture } | null,
  singleOnly = false,
) {
  if (iriTextures) {
    uniforms.uIri7Tex = { value: iriTextures.iri7 }
    if (!singleOnly) {
      uniforms.uIri8Tex = { value: iriTextures.iri8 }
      uniforms.uIri9Tex = { value: iriTextures.iri9 }
      uniforms.uHasIri7 = { value: 1.0 }
      uniforms.uHasIri8 = { value: 1.0 }
      uniforms.uHasIri9 = { value: 1.0 }
    }
  } else {
    uniforms.uIri7Tex = { value: blackPixel }
    if (!singleOnly) {
      uniforms.uIri8Tex = { value: blackPixel }
      uniforms.uIri9Tex = { value: blackPixel }
      uniforms.uHasIri7 = { value: 0.0 }
      uniforms.uHasIri8 = { value: 0.0 }
      uniforms.uHasIri9 = { value: 0.0 }
    }
  }
}

export function buildCardMesh(
  dims: DerivedDimensions,
  cardTexture: Texture,
  maskTexture: Texture | null,
  foilTexture: Texture | null,
  config: AppConfig,
  shaderStyle: ShaderStyle = 'illustration-rare',
  iriTextures?: { iri7: Texture; iri8: Texture; iri9: Texture } | null,
  birthdayTextures?: { dank: Texture; dank2: Texture } | null,
  glitterTexture?: Texture | null,
  noiseTexture?: Texture | null,
  cardBackTexture?: Texture | null,
  sparkleIriTextures?: { iri1: Texture; iri2: Texture } | null,
): Mesh {
  const cardH = dims.screenH * config.cardSize
  const cardW = cardH * CARD_ASPECT
  const cardGeo = new PlaneGeometry(cardW, cardH)

  if (!(maskTexture || foilTexture)) {
    return new Mesh(
      cardGeo,
      new MeshBasicMaterial({ map: cardTexture, side: DoubleSide, transparent: true }),
    )
  }

  const uniforms: Record<string, { value: unknown }> = {
    uCardTex: { value: cardTexture },
    uCardBackTex: { value: cardBackTexture || cardTexture },
    uMaskTex: { value: maskTexture || blackPixel },
    uFoilTex: { value: foilTexture || blackPixel },
    uGlitterTex: { value: glitterTexture || blackPixel },
    uNoiseTex: { value: noiseTexture || blackPixel },
    uHasFoil: { value: foilTexture ? 1.0 : 0.0 },
    uHasGlitter: { value: glitterTexture ? 1.0 : 0.0 },
    uHasNoise: { value: noiseTexture ? 1.0 : 0.0 },
    uPointer: { value: new Vector2(0.5, 0.5) },
    uBackground: { value: new Vector2(0.5, 0.5) },
    uPointerFromCenter: { value: 0.0 },
    uPointerFromLeft: { value: 0.5 },
    uPointerFromTop: { value: 0.5 },
    uCardOpacity: { value: config.holoIntensity || 0.75 },
    uTime: { value: 0.0 },
    uFade: { value: 1.0 },
    uRotateX: { value: 0.0 },
  }

  for (const [uniformName, getValue] of STYLE_UNIFORMS[shaderStyle] ?? []) {
    uniforms[uniformName] = { value: getValue(config) }
  }

  if (shaderStyle === 'special-illustration-rare') {
    addIriUniforms(uniforms, iriTextures)
    uniforms.uIri1Tex = { value: sparkleIriTextures?.iri1 ?? blackPixel }
    uniforms.uIri2Tex = { value: sparkleIriTextures?.iri2 ?? blackPixel }
  } else if (shaderStyle === 'ultra-rare' || shaderStyle === 'rainbow-rare') {
    addIriUniforms(uniforms, iriTextures, true)
  }

  if (shaderStyle === 'double-rare') {
    uniforms.uBirthdayDankTex = { value: birthdayTextures?.dank ?? blackPixel }
    uniforms.uBirthdayDank2Tex = { value: birthdayTextures?.dank2 ?? blackPixel }
  }

  return new Mesh(
    cardGeo,
    new ShaderMaterial({
      uniforms,
      vertexShader: holoVert,
      fragmentShader: FRAGMENT_SHADERS[shaderStyle],
      side: DoubleSide,
      transparent: true,
    }),
  )
}

export function buildActivationMaterial(
  cardTexture: Texture,
  noiseTexture: Texture | null,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uCardTex: { value: cardTexture },
      uNoiseTex: { value: noiseTexture || blackPixel },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uPointer: { value: new Vector2(0.5, 0.5) },
    },
    vertexShader: holoVert,
    fragmentShader: activationFrag,
    side: DoubleSide,
    transparent: true,
  })
}

export function applyCardTransform(
  cardMesh: Mesh,
  cardTransform: CardTransform,
  cardAngle: number,
  dims: DerivedDimensions,
): void {
  cardMesh.position.set(
    (cardTransform.x / 100) * dims.screenW,
    (cardTransform.y / 100) * dims.screenH,
    -(cardTransform.z / 100) * dims.boxD,
  )
  cardMesh.rotation.y = cardAngle + (cardTransform.rotY * Math.PI) / 180
}
