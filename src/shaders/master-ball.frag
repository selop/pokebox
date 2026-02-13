precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform sampler2D uGlitterTex;
uniform float uHasFoil;
uniform float uHasGlitter;
uniform vec2 uPointer;
uniform vec2 uBackground;
uniform float uPointerFromCenter;
uniform float uCardOpacity;
uniform float uTime;
uniform float uFade;

// Master Ball configurable uniforms
uniform float uRainbowScale;
uniform float uRainbowShift;
uniform float uSparkleScale;
uniform float uSparkleIntensity;
uniform float uSparkleTiltSensitivity;
uniform float uRainbowOpacity;
uniform float uGlareOpacity;
uniform float uGlareContrast;
uniform float uGlareSaturation;
uniform float uEtchOpacity;
uniform float uBaseBrightness;
uniform float uBaseContrast;

varying vec2 vUv;

#include "common/blend.glsl"
#include "common/filters.glsl"
#include "common/rainbow.glsl"

void main() {
    vec2 uv = vUv;

    // Back face: show card-back texture
    if (!gl_FrontFacing) {
        vec4 backColor = texture2D(uCardBackTex, uv);
        gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
        return;
    }

    // ── 1. Base card ─────────────────────────────────
    vec4 cardColor = texture2D(uCardTex, uv);
    float mask = texture2D(uMaskTex, uv).r;
    float foil = uHasFoil > 0.5 ? texture2D(uFoilTex, uv).r : 0.0;

    // Skip compositing if no effect present
    if (uCardOpacity < 0.01 || (mask < 0.01 && foil < 0.01)) {
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
        return;
    }

    vec3 result = cardColor.rgb;
    float bgY = uBackground.y;

    // ── 2. Rainbow holo (mask-driven) ────────────────
    if (mask > 0.01) {
        float tiltOffset = (0.5 - bgY) * uRainbowShift;
        float rainbowT = uv.y * uRainbowScale + tiltOffset + sin(uTime * 0.3) * 0.5;
        vec3 rainbow = sunpillarGradient(rainbowT);

        result = mix(result, blendOverlay(result, rainbow), mask * uCardOpacity * uRainbowOpacity);
    }

    // ── 3. Etch sparkle (foil-driven) ────────────────
    if (foil > 0.01) {
        // Sample glitter texture at scaled UV
        float glitter = uHasGlitter > 0.5
            ? texture2D(uGlitterTex, uv * uSparkleScale).r
            : 1.0;

        // Tilt reveal: sparkles appear as card tilts away from center
        float tiltAmount = abs(bgY - 0.5) * 2.0; // normalize to 0–1 range
        float sparkleReveal = smoothstep(uSparkleTiltSensitivity, uSparkleTiltSensitivity + 0.3, tiltAmount);

        // Additive blend so even dim glitter values produce visible highlights
        result += vec3(glitter * sparkleReveal) * foil * uSparkleIntensity * uCardOpacity;
    }

    // ── Pointer-driven values ────────────────────────
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;
    float spotDist = length(uv - vec2(ptrX, ptrY));
    // ── 4. Glare (pointer-following radial) ──────────
    vec3 glareCenter = vec3(0.8);
    vec3 glareEdge = vec3(0.6); 
    vec3 glare = mix(glareCenter, glareEdge, smoothstep(0.1, 0.7, spotDist));
    
    glare = adjustBrightness(glare, 0.7);
    glare = adjustContrast(glare, uGlareContrast);
    glare = adjustSaturate(glare, uGlareSaturation);
    glare = clamp(glare, 0.0, 1.0);

    result = mix(result, blendOverlay(result, glare), foil * uCardOpacity * uGlareOpacity);

    // ── 5. Final adjustments ─────────────────────────
    result = adjustBrightness(result, uBaseBrightness);
    result = adjustContrast(result, uBaseContrast);

        // Etch foil overlay
    // if (uHasFoil > 0.5) {
    //     vec4 foilColor = texture2D(uFoilTex, uv);
    //     // Blend etch foil on top using alpha compositing
    //     float foilAlpha = foilColor.a * uCardOpacity * 0.3;
    //     cardColor.rgb = mix(cardColor.rgb, foilColor.rgb, foilAlpha);
    // }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}

// TODO start from scratch

// precision highp float;

// uniform sampler2D uCardTex;
// uniform sampler2D uCardBackTex;
// uniform sampler2D uMaskTex;
// uniform sampler2D uFoilTex;
// uniform float uHasFoil;
// uniform vec2 uPointer;
// uniform float uCardOpacity;
// uniform float uTime;
// uniform float uFade;

// varying vec2 vUv;

// void main() {
//     vec2 uv = vUv;

//     // Back face: show card-back texture
//     if (!gl_FrontFacing) {
//         vec4 backColor = texture2D(uCardBackTex, uv);
//         gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
//         return;
//     }

//     // Base card
//     vec4 cardColor = texture2D(uCardTex, uv);

//     // Etch foil overlay
//     if (uHasFoil > 0.5) {
//         vec4 foilColor = texture2D(uFoilTex, uv);
//         // Blend etch foil on top using alpha compositing
//         float foilAlpha = foilColor.a * uCardOpacity * 0.3;
//         cardColor.rgb = mix(cardColor.rgb, foilColor.rgb, foilAlpha);
//     }

//     gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
// }