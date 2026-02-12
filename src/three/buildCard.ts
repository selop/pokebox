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
import illustrationRareFrag from '@/shaders/illustration-rare.frag'
import regularHoloFrag from '@/shaders/regular-holo.frag'
import specialIllustrationRareFrag from '@/shaders/special-illustration-rare.frag'
import doubleRareFrag from '@/shaders/double-rare.frag'
import ultraRareFrag from '@/shaders/ultra-rare.frag'
import rainbowRareFrag from '@/shaders/rainbow-rare.frag'
import reverseHoloFrag from '@/shaders/reverse-holo.frag'
import masterBallFrag from '@/shaders/master-ball.frag'

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
  'master-ball': masterBallFrag,
}

type UniformMapping = [uniformName: string, configKey: keyof AppConfig]

const STYLE_UNIFORMS: Partial<Record<ShaderStyle, UniformMapping[]>> = {
  'illustration-rare': [
    ['uRainbowScale', 'illustRareRainbowScale'],
    ['uBarAngle', 'illustRareBarAngle'],
    ['uBarDensity', 'illustRareBarDensity'],
    ['uBarDensity2', 'illustRareBarDensity2'],
    ['uBarOffsetBgYMult', 'illustRareBarOffsetBgYMult'],
    ['uBar2OffsetBgYMult', 'illustRareBar2OffsetBgYMult'],
    ['uBarWidth', 'illustRareBarWidth'],
    ['uBarWidth2', 'illustRareBarWidth2'],
    ['uBarIntensity', 'illustRareBarIntensity'],
    ['uBarIntensity2', 'illustRareBarIntensity2'],
    ['uBarHue', 'illustRareBarHue'],
    ['uBarMediumSaturation', 'illustRareBarMediumSaturation'],
    ['uBarMediumLightness', 'illustRareBarMediumLightness'],
    ['uBarBrightSaturation', 'illustRareBarBrightSaturation'],
    ['uBarBrightLightness', 'illustRareBarBrightLightness'],
    ['uBarHue2', 'illustRareBarHue2'],
    ['uBarMediumSaturation2', 'illustRareBarMediumSaturation2'],
    ['uBarMediumLightness2', 'illustRareBarMediumLightness2'],
    ['uBarBrightSaturation2', 'illustRareBarBrightSaturation2'],
    ['uBarBrightLightness2', 'illustRareBarBrightLightness2'],
    ['uShine1Contrast', 'illustRareShine1Contrast'],
    ['uShine1Saturation', 'illustRareShine1Saturation'],
    ['uShine2Opacity', 'illustRareShine2Opacity'],
    ['uGlareOpacity', 'illustRareGlareOpacity'],
  ],
  'special-illustration-rare': [
    ['uSirShineAngle', 'sirShineAngle'],
    ['uSirShineFrequency', 'sirShineFrequency'],
    ['uSirShineBrightness', 'sirShineBrightness'],
    ['uSirShineContrast', 'sirShineContrast'],
    ['uSirShineSaturation', 'sirShineSaturation'],
    ['uSirGlitterContrast', 'sirGlitterContrast'],
    ['uSirGlitterSaturation', 'sirGlitterSaturation'],
    ['uSirWashScale', 'sirWashScale'],
    ['uSirWashTiltSensitivity', 'sirWashTiltSensitivity'],
    ['uSirWashSaturation', 'sirWashSaturation'],
    ['uSirWashContrast', 'sirWashContrast'],
    ['uSirWashOpacity', 'sirWashOpacity'],
    ['uSirBaseBrightness', 'sirBaseBrightness'],
    ['uSirBaseContrast', 'sirBaseContrast'],
  ],
  'ultra-rare': [
    ['uBaseBrightness', 'ultraRareBaseBrightness'],
    ['uShineBrightness', 'ultraRareShineBrightness'],
    ['uShineContrast', 'ultraRareShineContrast'],
    ['uShineSaturation', 'ultraRareShineSaturation'],
    ['uShineAfterBrightness', 'ultraRareShineAfterBrightness'],
    ['uShineAfterContrast', 'ultraRareShineAfterContrast'],
    ['uShineAfterSaturation', 'ultraRareShineAfterSaturation'],
    ['uShineBaseBrightness', 'ultraRareShineBaseBrightness'],
    ['uShineBaseContrast', 'ultraRareShineBaseContrast'],
    ['uShineBaseSaturation', 'ultraRareShineBaseSaturation'],
    ['uGlareContrast', 'ultraRareGlareContrast'],
    ['uGlare2Contrast', 'ultraRareGlare2Contrast'],
    ['uRotateDelta', 'ultraRareRotateDelta'],
    ['uAngle1Mult', 'ultraRareAngle1Mult'],
    ['uAngle2Mult', 'ultraRareAngle2Mult'],
    ['uBgYMult1', 'ultraRareBgYMult1'],
    ['uBgYMult2', 'ultraRareBgYMult2'],
    ['uBarAngle', 'ultraRareBarAngle'],
    ['uBarOffsetBgXMult', 'ultraRareBarOffsetBgXMult'],
    ['uBarOffsetBgYMult', 'ultraRareBarOffsetBgYMult'],
    ['uBarFrequency', 'ultraRareBarFrequency'],
    ['uBarIntensityStart1', 'ultraRareBarIntensityStart1'],
    ['uBarIntensityEnd1', 'ultraRareBarIntensityEnd1'],
    ['uBarIntensityStart2', 'ultraRareBarIntensityStart2'],
    ['uBarIntensityEnd2', 'ultraRareBarIntensityEnd2'],
    ['uSparkleIntensity', 'ultraRareSparkleIntensity'],
    ['uSparkleRadius', 'ultraRareSparkleRadius'],
    ['uSparkleContrast', 'ultraRareSparkleContrast'],
    ['uSparkleColorShift', 'ultraRareSparkleColorShift'],
  ],
  'rainbow-rare': [
    ['uBaseBrightness', 'rainbowRareBaseBrightness'],
    ['uShineBrightness', 'rainbowRareShineBrightness'],
    ['uShineContrast', 'rainbowRareShineContrast'],
    ['uShineSaturation', 'rainbowRareShineSaturation'],
    ['uShineBaseBrightness', 'rainbowRareShineBaseBrightness'],
    ['uShineBaseContrast', 'rainbowRareShineBaseContrast'],
    ['uShineBaseSaturation', 'rainbowRareShineBaseSaturation'],
    ['uGlareContrast', 'rainbowRareGlareContrast'],
    ['uGlare2Contrast', 'rainbowRareGlare2Contrast'],
    ['uSparkleIntensity', 'rainbowRareSparkleIntensity'],
    ['uSparkleRadius', 'rainbowRareSparkleRadius'],
    ['uSparkleContrast', 'rainbowRareSparkleContrast'],
    ['uSparkleColorShift', 'rainbowRareSparkleColorShift'],
  ],
  'reverse-holo': [
    ['uShineIntensity', 'reverseHoloShineIntensity'],
    ['uShineOpacity', 'reverseHoloShineOpacity'],
    ['uShineColorR', 'reverseHoloShineColorR'],
    ['uShineColorG', 'reverseHoloShineColorG'],
    ['uShineColorB', 'reverseHoloShineColorB'],
    ['uSpecularRadius', 'reverseHoloSpecularRadius'],
    ['uSpecularPower', 'reverseHoloSpecularPower'],
    ['uBaseBrightness', 'reverseHoloBaseBrightness'],
    ['uBaseContrast', 'reverseHoloBaseContrast'],
    ['uBaseSaturation', 'reverseHoloBaseSaturation'],
  ],
  'master-ball': [
    ['uRainbowScale', 'masterBallRainbowScale'],
    ['uRainbowShift', 'masterBallRainbowShift'],
    ['uSparkleScale', 'masterBallSparkleScale'],
    ['uSparkleIntensity', 'masterBallSparkleIntensity'],
    ['uSparkleTiltSensitivity', 'masterBallSparkleTiltSensitivity'],
    ['uGlareOpacity', 'masterBallGlareOpacity'],
    ['uBaseBrightness', 'masterBallBaseBrightness'],
    ['uBaseContrast', 'masterBallBaseContrast'],
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
  cardBackTexture?: Texture | null,
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
    uHasFoil: { value: foilTexture ? 1.0 : 0.0 },
    uHasGlitter: { value: glitterTexture ? 1.0 : 0.0 },
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

  for (const [uniformName, configKey] of STYLE_UNIFORMS[shaderStyle] ?? []) {
    uniforms[uniformName] = { value: config[configKey] }
  }

  if (shaderStyle === 'special-illustration-rare') {
    addIriUniforms(uniforms, iriTextures)
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
