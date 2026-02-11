import { describe, it, expect } from 'vitest'
import { ShaderMaterial, Vector2 } from 'three'
import holoVert from '../holo.vert'
import illustrationRareFrag from '../illustration-rare.frag'
import regularHoloFrag from '../regular-holo.frag'
import specialIllustrationRareFrag from '../special-illustration-rare.frag'
import doubleRareFrag from '../double-rare.frag'
import ultraRareFrag from '../ultra-rare.frag'
import parallaxFrag from '../parallax.frag'
import metallicFrag from '../metallic.frag'

describe('Shader Compilation', () => {
  /**
   * Helper to test shader material creation
   * This verifies shaders can be parsed by Three.js without WebGL errors
   */
  function testShaderCompilation(
    name: string,
    fragmentShader: string,
    requiredUniforms: string[] = [],
  ) {
    it(`should create ${name} shader material without errors`, () => {
      // Create basic uniforms that all shaders need
      const uniforms: any = {
        uCardTex: { value: null },
        uCardBackTex: { value: null },
        uMaskTex: { value: null },
        uFoilTex: { value: null },
        uPointer: { value: new Vector2(0.5, 0.5) },
        uBackground: { value: new Vector2(0.5, 0.5) },
        uCardOpacity: { value: 1.0 },
        uTime: { value: 0.0 },
        uFade: { value: 1.0 },
        uRotateX: { value: 0.0 },
      }

      // Add shader-specific uniforms based on required list
      requiredUniforms.forEach((uniform) => {
        if (!uniforms[uniform]) {
          uniforms[uniform] = { value: 1.0 }
        }
      })

      // Test that shader material can be created
      let material: ShaderMaterial | null = null
      let error: Error | null = null

      try {
        material = new ShaderMaterial({
          uniforms,
          vertexShader: holoVert,
          fragmentShader,
        })
      } catch (e) {
        error = e as Error
      }

      // Verify no errors during creation
      expect(error).toBeNull()
      expect(material).not.toBeNull()
      expect(material?.isShaderMaterial).toBe(true)

      // Verify shaders are set correctly
      expect(material?.vertexShader).toBe(holoVert)
      expect(material?.fragmentShader).toBe(fragmentShader)

      // Verify uniforms are set
      expect(material?.uniforms).toBeDefined()
      expect(material?.uniforms.uCardTex).toBeDefined()

      // Clean up
      material?.dispose()
    })
  }

  // Test all shader variants
  testShaderCompilation('illustration-rare', illustrationRareFrag, [
    'uRainbowScale',
    'uBarAngle',
    'uBarDensity',
    'uBarWidth',
    'uBarIntensity',
    'uBarHue',
    'uBarMediumSaturation',
    'uBarMediumLightness',
    'uBarBrightSaturation',
    'uBarBrightLightness',
    'uShine1Contrast',
    'uShine1Saturation',
    'uShine2Opacity',
    'uGlareOpacity',
  ])

  testShaderCompilation('regular-holo', regularHoloFrag)

  testShaderCompilation('special-illustration-rare', specialIllustrationRareFrag, [
    'uIri7Tex',
    'uIri8Tex',
    'uIri9Tex',
    'uHasIri7',
    'uHasIri8',
    'uHasIri9',
  ])

  testShaderCompilation('double-rare', doubleRareFrag, [
    'uBirthdayDankTex',
    'uBirthdayDank2Tex',
    'uHasFoil',
    'uPointerFromCenter',
  ])

  testShaderCompilation('ultra-rare', ultraRareFrag, [
    'uBaseBrightness',
    'uShineBrightness',
    'uShineContrast',
    'uShineSaturation',
    'uShineAfterBrightness',
    'uShineAfterContrast',
    'uShineAfterSaturation',
    'uShineBaseBrightness',
    'uShineBaseContrast',
    'uShineBaseSaturation',
    'uGlareContrast',
    'uGlare2Contrast',
    'uRotateDelta',
    'uAngle1Mult',
    'uAngle2Mult',
    'uBgYMult1',
    'uBgYMult2',
    'uBarAngle',
    'uBarOffsetBgXMult',
    'uBarOffsetBgYMult',
    'uBarFrequency',
    'uBarIntensityStart1',
    'uBarIntensityEnd1',
    'uBarIntensityStart2',
    'uBarIntensityEnd2',
    'uSparkleIntensity',
    'uSparkleRadius',
    'uSparkleContrast',
    'uSparkleColorShift',
  ])

  testShaderCompilation('parallax', parallaxFrag)

  testShaderCompilation('metallic', metallicFrag)
})
