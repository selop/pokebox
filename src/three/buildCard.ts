import {
  DataTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  PlaneGeometry,
  RGBADepthPacking,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
} from 'three'
import type { Texture } from 'three'
import type { AppConfig, CardTransform, DerivedDimensions, ShaderStyle } from '@/types'
import { SHADER_UNIFORM_REGISTRY, resolveConfigPath } from '@/data/shaderRegistry'
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

/** Build style-specific uniform values from the registry + config. */
function getStyleUniforms(
  style: ShaderStyle,
  config: AppConfig,
): Record<string, { value: number }> {
  const defs = SHADER_UNIFORM_REGISTRY[style]
  if (!defs) return {}
  const out: Record<string, { value: number }> = {}
  for (const def of defs) {
    out[def.uniform] = { value: resolveConfigPath(config.shaders, def.configPath) }
  }
  return out
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

  Object.assign(uniforms, getStyleUniforms(shaderStyle, config))

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

  const mesh = new Mesh(
    cardGeo,
    new ShaderMaterial({
      uniforms,
      vertexShader: holoVert,
      fragmentShader: FRAGMENT_SHADERS[shaderStyle],
      side: DoubleSide,
      transparent: true,
    }),
  )
  mesh.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking })
  return mesh
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
