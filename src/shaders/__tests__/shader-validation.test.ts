import { describe, it, expect } from 'vitest'
import illustrationRareFrag from '../illustration-rare.frag'
import regularHoloFrag from '../regular-holo.frag'
import specialIllustrationRareFrag from '../special-illustration-rare.frag'
import doubleRareFrag from '../double-rare.frag'
import ultraRareFrag from '../ultra-rare.frag'
import rainbowRareFrag from '../rainbow-rare.frag'
import reverseHoloFrag from '../reverse-holo.frag'
import teraRainbowRareFrag from '../tera-rainbow-rare.frag'
import masterBallFrag from '../master-ball.frag'
import teraShinyRareFrag from '../tera-shiny-rare.frag'
import shinyRareFrag from '../shiny-rare.frag'

/**
 * Static analysis tests for shader code
 * Catches common mistakes without needing WebGL context
 */
describe('Shader Static Validation', () => {
  const shaders = {
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

  Object.entries(shaders).forEach(([name, shaderCode]) => {
    describe(name, () => {
      it('should not have undefined function calls', () => {
        // Extract all function calls: functionName(
        const functionCalls = Array.from(
          shaderCode.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g),
        ).map((match) => match[1])

        // Extract all function definitions: type functionName(
        const functionDefinitions = Array.from(
          shaderCode.matchAll(/^(?:vec[234]|float|int|bool|void|mat[234])\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm),
        ).map((match) => match[1])

        // Built-in GLSL functions and type constructors
        const builtInFunctions = [
          // Type constructors (used for casting)
          'vec2',
          'vec3',
          'vec4',
          'mat2',
          'mat3',
          'mat4',
          'float',
          'int',
          'bool',
          // GLSL keywords that look like functions in regex but aren't
          'return',
          'if',
          'else',
          'for',
          'while',
          // Built-in GLSL functions
          'texture2D',
          'mix',
          'clamp',
          'smoothstep',
          'step',
          'dot',
          'length',
          'normalize',
          'sin',
          'cos',
          'tan',
          'atan',
          'pow',
          'exp',
          'log',
          'sqrt',
          'abs',
          'floor',
          'ceil',
          'fract',
          'mod',
          'min',
          'max',
          'sign',
          'reflect',
          'refract',
          'cross',
          'distance',
          'radians',
          'degrees',
        ]

        // Check each function call is either defined or built-in
        const undefinedFunctions = functionCalls.filter(
          (func) =>
            !functionDefinitions.includes(func) &&
            !builtInFunctions.includes(func) &&
            func !== 'main', // main is special
        )

        if (undefinedFunctions.length > 0) {
          const uniqueUndefined = [...new Set(undefinedFunctions)]
          expect.fail(
            `Undefined functions found: ${uniqueUndefined.join(', ')}\n` +
              `Defined functions: ${functionDefinitions.join(', ')}`,
          )
        }
      })

      it('should declare all used uniforms', () => {
        // Extract uniform usage: uVariableName
        const uniformUsage = Array.from(shaderCode.matchAll(/\b(u[A-Z][a-zA-Z0-9]*)\b/g)).map(
          (match) => match[1],
        )

        // Extract uniform declarations: uniform type uName;
        const uniformDeclarations = Array.from(
          shaderCode.matchAll(/^uniform\s+(?:sampler2D|vec[234]|float|int|bool|mat[234])\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/gm),
        ).map((match) => match[1])

        const uniqueUsage = [...new Set(uniformUsage)]
        const undeclaredUniforms = uniqueUsage.filter(
          (u) => !uniformDeclarations.includes(u),
        )

        if (undeclaredUniforms.length > 0) {
          expect.fail(
            `Undeclared uniforms used: ${undeclaredUniforms.join(', ')}\n` +
              `Declared uniforms: ${uniformDeclarations.join(', ')}`,
          )
        }
      })

      it('should declare all used varyings', () => {
        // Extract varying usage
        const varyingUsage = Array.from(shaderCode.matchAll(/\b(v[A-Z][a-zA-Z0-9]*)\b/g)).map(
          (match) => match[1],
        )

        // Extract varying declarations
        const varyingDeclarations = Array.from(
          shaderCode.matchAll(/^varying\s+(?:vec[234]|float|int|bool|mat[234])\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/gm),
        ).map((match) => match[1])

        const uniqueUsage = [...new Set(varyingUsage)]
        const undeclaredVaryings = uniqueUsage.filter(
          (v) => !varyingDeclarations.includes(v),
        )

        if (undeclaredVaryings.length > 0) {
          expect.fail(
            `Undeclared varyings used: ${undeclaredVaryings.join(', ')}\n` +
              `Declared varyings: ${varyingDeclarations.join(', ')}`,
          )
        }
      })

      it('should have balanced braces', () => {
        const openBraces = (shaderCode.match(/{/g) || []).length
        const closeBraces = (shaderCode.match(/}/g) || []).length
        expect(openBraces).toBe(closeBraces)
      })

      it('should have balanced parentheses', () => {
        const openParens = (shaderCode.match(/\(/g) || []).length
        const closeParens = (shaderCode.match(/\)/g) || []).length
        expect(openParens).toBe(closeParens)
      })

      it('should set gl_FragColor', () => {
        expect(shaderCode).toContain('gl_FragColor')
      })

      it('should have precision declaration', () => {
        expect(shaderCode).toMatch(/precision\s+(lowp|mediump|highp)\s+float/)
      })
    })
  })
})
