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
import parallaxFrag from '@/shaders/parallax.frag'
import metallicFrag from '@/shaders/metallic.frag'

export const CARD_ASPECT = 733 / 1024 // width / height

const blackPixel = new DataTexture(
  new Uint8Array([0, 0, 0, 255]),
  1,
  1,
  RGBAFormat,
  UnsignedByteType,
)
blackPixel.needsUpdate = true

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

  let cardMat
  if (maskTexture || foilTexture) {
    // Select fragment shader based on style
    let fragmentShader = illustrationRareFrag
    if (shaderStyle === 'parallax') {
      fragmentShader = parallaxFrag
    } else if (shaderStyle === 'metallic') {
      fragmentShader = metallicFrag
    } else if (shaderStyle === 'regular-holo') {
      fragmentShader = regularHoloFrag
    } else if (shaderStyle === 'special-illustration-rare') {
      fragmentShader = specialIllustrationRareFrag
    } else if (shaderStyle === 'double-rare') {
      fragmentShader = doubleRareFrag
    } else if (shaderStyle === 'ultra-rare') {
      fragmentShader = ultraRareFrag
    } else if (shaderStyle === 'illustration-rare') {
      fragmentShader = illustrationRareFrag
    }

    const uniforms: any = {
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

    // Add illustration-rare shader-specific uniforms
    if (shaderStyle === 'illustration-rare') {
      uniforms.uRainbowScale = { value: config.illustRareRainbowScale }
      uniforms.uBarAngle = { value: config.illustRareBarAngle }
      uniforms.uBarDensity = { value: config.illustRareBarDensity }
      uniforms.uBarWidth = { value: config.illustRareBarWidth }
      uniforms.uBarIntensity = { value: config.illustRareBarIntensity }
      uniforms.uBarHue = { value: config.illustRareBarHue }
      uniforms.uBarMediumSaturation = { value: config.illustRareBarMediumSaturation }
      uniforms.uBarMediumLightness = { value: config.illustRareBarMediumLightness }
      uniforms.uBarBrightSaturation = { value: config.illustRareBarBrightSaturation }
      uniforms.uBarBrightLightness = { value: config.illustRareBarBrightLightness }
      uniforms.uShine1Contrast = { value: config.illustRareShine1Contrast }
      uniforms.uShine1Saturation = { value: config.illustRareShine1Saturation }
      uniforms.uShine2Opacity = { value: config.illustRareShine2Opacity }
      uniforms.uGlareOpacity = { value: config.illustRareGlareOpacity }
    }

    // Add iridescent textures for special illustration rare shader
    if (shaderStyle === 'special-illustration-rare' && iriTextures) {
      uniforms.uIri7Tex = { value: iriTextures.iri7 }
      uniforms.uIri8Tex = { value: iriTextures.iri8 }
      uniforms.uIri9Tex = { value: iriTextures.iri9 }
      uniforms.uHasIri7 = { value: 1.0 }
      uniforms.uHasIri8 = { value: 1.0 }
      uniforms.uHasIri9 = { value: 1.0 }
    } else if (shaderStyle === 'special-illustration-rare') {
      // Fallback to black pixels if textures not provided
      uniforms.uIri7Tex = { value: blackPixel }
      uniforms.uIri8Tex = { value: blackPixel }
      uniforms.uIri9Tex = { value: blackPixel }
      uniforms.uHasIri7 = { value: 0.0 }
      uniforms.uHasIri8 = { value: 0.0 }
      uniforms.uHasIri9 = { value: 0.0 }
    }

    // Add special illustration rare shader-specific uniforms
    if (shaderStyle === 'special-illustration-rare') {
      uniforms.uSirShineAngle = { value: config.sirShineAngle }
      uniforms.uSirShineFrequency = { value: config.sirShineFrequency }
      uniforms.uSirShineBrightness = { value: config.sirShineBrightness }
      uniforms.uSirShineContrast = { value: config.sirShineContrast }
      uniforms.uSirShineSaturation = { value: config.sirShineSaturation }
      uniforms.uSirBarFrequency = { value: config.sirBarFrequency }
      uniforms.uSirBarBrightness = { value: config.sirBarBrightness }
      uniforms.uSirBarContrast = { value: config.sirBarContrast }
      uniforms.uSirBarSaturation = { value: config.sirBarSaturation }
      uniforms.uSirSunpillarBrightness = { value: config.sirSunpillarBrightness }
      uniforms.uSirSunpillarContrast = { value: config.sirSunpillarContrast }
      uniforms.uSirSunpillarSaturation = { value: config.sirSunpillarSaturation }
      uniforms.uSirGlitterContrast = { value: config.sirGlitterContrast }
      uniforms.uSirGlitterSaturation = { value: config.sirGlitterSaturation }
      uniforms.uSirBaseBrightness = { value: config.sirBaseBrightness }
      uniforms.uSirBaseContrast = { value: config.sirBaseContrast }
    }

    // Add birthday textures for double rare shader
    if (shaderStyle === 'double-rare' && birthdayTextures) {
      uniforms.uBirthdayDankTex = { value: birthdayTextures.dank }
      uniforms.uBirthdayDank2Tex = { value: birthdayTextures.dank2 }
    } else if (shaderStyle === 'double-rare') {
      // Fallback to black pixels if textures not provided
      uniforms.uBirthdayDankTex = { value: blackPixel }
      uniforms.uBirthdayDank2Tex = { value: blackPixel }
    }

    // Add iridescent texture for ultra-rare shader
    if (shaderStyle === 'ultra-rare' && iriTextures) {
      uniforms.uIri7Tex = { value: iriTextures.iri7 }
    } else if (shaderStyle === 'ultra-rare') {
      uniforms.uIri7Tex = { value: blackPixel }
    }

    // Add ultra-rare shader-specific uniforms
    if (shaderStyle === 'ultra-rare') {
      uniforms.uBaseBrightness = { value: config.ultraRareBaseBrightness }
      uniforms.uShineBrightness = { value: config.ultraRareShineBrightness }
      uniforms.uShineContrast = { value: config.ultraRareShineContrast }
      uniforms.uShineSaturation = { value: config.ultraRareShineSaturation }
      uniforms.uShineAfterBrightness = { value: config.ultraRareShineAfterBrightness }
      uniforms.uShineAfterContrast = { value: config.ultraRareShineAfterContrast }
      uniforms.uShineAfterSaturation = { value: config.ultraRareShineAfterSaturation }
      uniforms.uShineBaseBrightness = { value: config.ultraRareShineBaseBrightness }
      uniforms.uShineBaseContrast = { value: config.ultraRareShineBaseContrast }
      uniforms.uShineBaseSaturation = { value: config.ultraRareShineBaseSaturation }
      uniforms.uGlareContrast = { value: config.ultraRareGlareContrast }
      uniforms.uGlare2Contrast = { value: config.ultraRareGlare2Contrast }
      uniforms.uRotateDelta = { value: config.ultraRareRotateDelta }
      uniforms.uAngle1Mult = { value: config.ultraRareAngle1Mult }
      uniforms.uAngle2Mult = { value: config.ultraRareAngle2Mult }
      uniforms.uBgYMult1 = { value: config.ultraRareBgYMult1 }
      uniforms.uBgYMult2 = { value: config.ultraRareBgYMult2 }
      uniforms.uBarAngle = { value: config.ultraRareBarAngle }
      uniforms.uBarOffsetBgXMult = { value: config.ultraRareBarOffsetBgXMult }
      uniforms.uBarOffsetBgYMult = { value: config.ultraRareBarOffsetBgYMult }
      uniforms.uBarFrequency = { value: config.ultraRareBarFrequency }
      uniforms.uBarIntensityStart1 = { value: config.ultraRareBarIntensityStart1 }
      uniforms.uBarIntensityEnd1 = { value: config.ultraRareBarIntensityEnd1 }
      uniforms.uBarIntensityStart2 = { value: config.ultraRareBarIntensityStart2 }
      uniforms.uBarIntensityEnd2 = { value: config.ultraRareBarIntensityEnd2 }
      uniforms.uSparkleIntensity = { value: config.ultraRareSparkleIntensity }
      uniforms.uSparkleRadius = { value: config.ultraRareSparkleRadius }
      uniforms.uSparkleContrast = { value: config.ultraRareSparkleContrast }
      uniforms.uSparkleColorShift = { value: config.ultraRareSparkleColorShift }
    }

    cardMat = new ShaderMaterial({
      uniforms,
      vertexShader: holoVert,
      fragmentShader,
      side: DoubleSide,
      transparent: true,
    })
  } else {
    cardMat = new MeshBasicMaterial({
      map: cardTexture,
      side: DoubleSide,
      transparent: true,
    })
  }

  return new Mesh(cardGeo, cardMat)
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
