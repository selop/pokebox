/**
 * Vitest setup file
 * Runs before all tests to set up the test environment
 */

// Mock WebGL context for headless testing
// This is needed because Three.js shaders require a WebGL context
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      // Mock WebGL constants
      const mockContext = {
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        HIGH_FLOAT: 36338,
        MEDIUM_FLOAT: 36337,
        LOW_FLOAT: 36336,
        HIGH_INT: 36341,
        MEDIUM_INT: 36340,
        LOW_INT: 36339,
        VERSION: 0x1f02,
        SHADING_LANGUAGE_VERSION: 0x8b8c,
        // Return a mock WebGL context with essential methods
        getExtension: () => null,
        getParameter: function (param: number) {
          // Return string for version queries
          if (param === this.VERSION) return 'WebGL 2.0'
          if (param === this.SHADING_LANGUAGE_VERSION) return 'WebGL GLSL ES 3.00'
          // Return number for other parameters
          return 4096
        },
        createShader: () => ({}),
        shaderSource: () => {},
        compileShader: () => {},
        getShaderParameter: () => true,
        getShaderInfoLog: () => '',
        getShaderPrecisionFormat: () => ({
          precision: 23,
          rangeMin: 127,
          rangeMax: 127,
        }),
        createProgram: () => ({}),
        attachShader: () => {},
        linkProgram: () => {},
        getProgramParameter: () => true,
        getProgramInfoLog: () => '',
        deleteShader: () => {},
        deleteProgram: () => {},
        useProgram: () => {},
        getUniformLocation: () => ({}),
        getAttribLocation: () => 0,
        enableVertexAttribArray: () => {},
        vertexAttribPointer: () => {},
        createBuffer: () => ({}),
        bindBuffer: () => {},
        bufferData: () => {},
        viewport: () => {},
        clear: () => {},
        drawArrays: () => {},
        drawElements: () => {},
        enable: () => {},
        disable: () => {},
        blendFunc: () => {},
        depthFunc: () => {},
        clearColor: () => {},
        clearDepth: () => {},
        createTexture: () => ({}),
        bindTexture: () => {},
        texImage2D: () => {},
        texParameteri: () => {},
        activeTexture: () => {},
        uniform1f: () => {},
        uniform2f: () => {},
        uniform3f: () => {},
        uniform4f: () => {},
        uniform1i: () => {},
        uniformMatrix4fv: () => {},
      }
      return mockContext
    }
    return null
  }
}

// Suppress Three.js warnings during tests
if (typeof console !== 'undefined') {
  const originalWarn = console.warn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.warn = (...args: any[]) => {
    // Filter out Three.js WebGL context warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('THREE.WebGLRenderer') || args[0].includes('WebGL'))
    ) {
      return
    }
    originalWarn.apply(console, args)
  }
}
