precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform sampler2D uGlitterTex;
uniform sampler2D uNoiseTex;
uniform float uHasFoil;
uniform float uHasGlitter;
uniform float uHasNoise;
uniform vec2 uPointer;
uniform vec2 uBackground;
uniform float uPointerFromCenter;
uniform float uCardOpacity;
uniform float uTime;
uniform float uFade;

// Tera Rainbow Rare configurable uniforms
uniform float uHoloOpacity;
uniform float uRainbowScale;
uniform float uRainbowShift;
uniform float uMaskThreshold;
// Metallic sparkle spotlight
uniform float uSparkleIntensity;
uniform float uSparkleRadius;
uniform float uSparkleContrast;
uniform float uSparkleColorShift;
// Etch sparkle (tilt-revealed, textured)
uniform float uEtchSparkleScale;
uniform float uEtchSparkleIntensity;
uniform float uEtchSparkleTiltSensitivity;
uniform float uEtchSparkleTexMix;
uniform float uEtchSparkle2Scale;
uniform float uEtchSparkle2Intensity;
uniform float uEtchSparkle2TiltSensitivity;
uniform float uEtchSparkle2TexMix;
// Base adjustments
uniform float uBaseBrightness;
uniform float uBaseContrast;
uniform float uBaseSaturation;

varying vec2 vUv;

#include "common/blend.glsl"
#include "common/filters.glsl"
#include "common/rainbow.glsl"
#include "common/holo-shine.glsl"
#include "common/base-adjust.glsl"

void main() {
    vec2 uv = vUv;

    // Back face: show card-back texture
    if (!gl_FrontFacing) {
        vec4 backColor = texture2D(uCardBackTex, uv);
        gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
        return;
    }

    // Base card
    vec4 cardColor = texture2D(uCardTex, uv);
    vec3 result = cardColor.rgb;

    // Mask & foil
    float mask = texture2D(uMaskTex, uv).r;
    float foil = uHasFoil > 0.1 ? texture2D(uFoilTex, uv).r : 0.0;

    // Etch foil overlay
    if (uHasFoil > 0.5) {
        vec4 foilColor = texture2D(uFoilTex, uv);
        float foilAlpha = foilColor.a * uCardOpacity * 0.3;
        result = mix(result, foilColor.rgb, foilAlpha);
    }

    // ── Classic TCG holo shine (mask-driven, 133° angle) ──────────
    result = holoShineAngled(
        result, uv, uPointer, uBackground.y, mask,
        uMaskThreshold, uRainbowScale, uRainbowShift,
        uHoloOpacity, uCardOpacity, 133.0
    );

    if (mask > 0.7) {
        float foil = texture2D(uFoilTex, uv).r;

        // Layer 1: top/bottom tilt
        float glitter1 = uHasGlitter > 0.5 ? texture2D(uGlitterTex, uv * uEtchSparkleScale).r : 1.0;
        float noise1 = uHasNoise > 0.5 ? texture2D(uNoiseTex, uv * uEtchSparkleScale).r : 1.0;
        noise1 = smoothstep(0.45, 0.85, noise1);
        float sparkle1 = mix(glitter1, noise1, uEtchSparkleTexMix);

        float tiltY = clamp(abs(uBackground.y - 0.5) * 7.7, 0.0, 1.0);
        float reveal1 = smoothstep(0.0, uEtchSparkleTiltSensitivity, tiltY);

        // Rainbow tint driven by UV + tilt
        float rainbowT1 = uv.y * uRainbowScale + uv.x * 0.3 + (0.5 - uBackground.y) * uRainbowShift;
        vec3 sparkleRgb1 = sunpillarGradient(rainbowT1) * sparkle1;

        result += sparkleRgb1 * reveal1 * mask * uEtchSparkleIntensity * uCardOpacity;

    }

    // ── Etch sparkle (foil-driven, tilt-revealed) ────────
    if (mask > 0.9) {
        
        // Layer 2: left/right tilt
        float glitter2 = uHasGlitter > 0.5 ? texture2D(uGlitterTex, uv * uEtchSparkle2Scale).r : 1.0;
        float noise2 = uHasNoise > 0.5 ? texture2D(uNoiseTex, uv * uEtchSparkle2Scale).r : 1.0;
        noise2 = smoothstep(0.45, 0.85, noise2);
        float sparkle2 = mix(glitter2, noise2, uEtchSparkle2TexMix);

        float tiltX = clamp(abs(uBackground.x - 0.5) * 7.7, 0.0, 1.0);
        float reveal2 = smoothstep(0.0, uEtchSparkle2TiltSensitivity, tiltX);

        // Rainbow tint driven by UV + tilt (offset phase for variety)
        float rainbowT2 = uv.x * uRainbowScale + uv.y * 0.3 + (0.5 - uBackground.x) * uRainbowShift;
        vec3 sparkleRgb2 = sunpillarGradient(rainbowT2) * sparkle2;

        result += sparkleRgb2 * reveal2 * mask * uEtchSparkle2Intensity * uCardOpacity;
    }

    // ── Metallic sparkle spotlight ──────────────────────
    if (uHasFoil > 0.2 && uSparkleIntensity > 0.01) {
        vec3 foilTex = texture2D(uFoilTex, uv).rgb;
        float ptrX = uPointer.x;
        float ptrY = uPointer.y;
        float spotDist = length(uv - vec2(ptrX, ptrY));

        // Radial spotlight falloff from pointer
        float sparkleSpotlight = 1.0 - smoothstep(0.0, uSparkleRadius, spotDist);
        sparkleSpotlight = pow(sparkleSpotlight, 2.0);

        // Enhance contrast for sparkle effect
        vec3 sparkleFoil = adjustContrast(foilTex, uSparkleContrast);

        // Iridescent color shift based on pointer angle
        float colorPhase = atan(ptrY - uv.y, ptrX - uv.x) / 3.14159;
        vec3 rainbow = vec3(
            0.5 + 0.5 * sin(colorPhase * 3.14159 * uSparkleColorShift),
            0.5 + 0.5 * sin(colorPhase * 3.14159 * uSparkleColorShift + 2.094),
            0.5 + 0.5 * sin(colorPhase * 3.14159 * uSparkleColorShift + 4.189)
        );
        vec3 sparkleColor = blendScreen(sparkleFoil, rainbow * 0.5);

        sparkleColor = adjustBrightness(sparkleColor, 1.0);
        sparkleColor = clamp(sparkleColor, 0.0, 1.0);

        vec3 metallic = sparkleColor * sparkleSpotlight * uSparkleIntensity;
        result = mix(result, blendPlusLighter(result, metallic), foil * uCardOpacity);
    }

    // ── Base adjustments ─────────────────────────────────
    result = baseAdjust(result, uBaseBrightness, uBaseContrast, uBaseSaturation);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
