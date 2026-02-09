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
import parallaxFrag from '@/shaders/parallax.frag'

export const CARD_ASPECT = 733 / 1024 // width / height

const blackPixel = new DataTexture(
  new Uint8Array([0, 0, 0, 255]),
  1, 1, RGBAFormat, UnsignedByteType,
)
blackPixel.needsUpdate = true

export function buildCardMesh(
  dims: DerivedDimensions,
  cardTexture: Texture,
  maskTexture: Texture | null,
  foilTexture: Texture | null,
  config: AppConfig,
  shaderStyle: ShaderStyle = 'illustration-rare',
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
    } else if (shaderStyle === 'regular-holo') {
      fragmentShader = regularHoloFrag
    } else if (shaderStyle === 'illustration-rare') {
      fragmentShader = illustrationRareFrag
    }

    cardMat = new ShaderMaterial({
      uniforms: {
        uCardTex: { value: cardTexture },
        uMaskTex: { value: maskTexture || blackPixel },
        uFoilTex: { value: foilTexture || blackPixel },
        uHasFoil: { value: foilTexture ? 1.0 : 0.0 },
        uPointer: { value: new Vector2(0.5, 0.5) },
        uBackground: { value: new Vector2(0.5, 0.5) },
        uPointerFromCenter: { value: 0.0 },
        uCardOpacity: { value: config.holoIntensity || 0.75 },
        uTime: { value: 0.0 },
        uFade: { value: 1.0 },
      },
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
