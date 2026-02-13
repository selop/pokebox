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

// Master Ball configurable uniforms
uniform float uRainbowScale;
uniform float uRainbowShift;
uniform float uSparkleScale;
uniform float uSparkleIntensity;
uniform float uSparkleTiltSensitivity;
uniform float uSparkleTexMix;
uniform float uSparkle2Scale;
uniform float uSparkle2Intensity;
uniform float uSparkle2TiltSensitivity;
uniform float uSparkle2TexMix;
uniform float uRainbowOpacity;
uniform float uGlareOpacity;
uniform float uGlareContrast;
uniform float uGlareSaturation;
uniform float uEtchOpacity;
uniform float uEtchContrast;
uniform float uEtchStampOpacity;
uniform float uEtchStampHoloOpacity;
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

    // Sharpen foil mask with contrast curve, then apply etch visibility
    if (foil > 0.01) {
        foil = clamp(pow(foil, 1.0 / uEtchContrast), 0.0, 1.0);
        result = mix(result, result + vec3(foil), uEtchOpacity * uCardOpacity * 0.2);
    }

    // ── 2. Rainbow holo (mask-driven) ────────────────
    if (mask > 0.01) {
        float tiltOffset = (0.5 - bgY) * uRainbowShift;
        float rainbowT = uv.y * uRainbowScale + tiltOffset + sin(uTime * 0.3) * 0.5;
        vec3 rainbow = sunpillarGradient(rainbowT);

        result = mix(result, blendOverlay(result, rainbow), mask * uCardOpacity * uRainbowOpacity);
    }

    if (foil > 0.01) {
        // ── 3. Etch sparkle (foil-driven, top/bottom tilt) ─
        float glitter1 = uHasGlitter > 0.5 ? texture2D(uGlitterTex, uv * uSparkleScale).r : 1.0;
        float noise1 = uHasNoise > 0.5 ? texture2D(uNoiseTex, uv * uSparkleScale).r : 1.0;
        noise1 = smoothstep(0.45, 0.85, noise1);
        float sparkle = mix(glitter1, noise1, uSparkleTexMix);

        float tiltAmount = abs(bgY - 0.5) * 2.0;
        float sparkleReveal = smoothstep(uSparkleTiltSensitivity, uSparkleTiltSensitivity + 0.3, tiltAmount);

        result += vec3(sparkle * sparkleReveal) * foil * uSparkleIntensity * uCardOpacity;

        // ── 3b. Etch sparkle layer 2 (foil-driven, left/right tilt) ─
        float glitter2 = uHasGlitter > 0.5 ? texture2D(uGlitterTex, uv * uSparkle2Scale).r : 1.0;
        float noise2 = uHasNoise > 0.5 ? texture2D(uNoiseTex, uv * uSparkle2Scale).r : 1.0;
        noise2 = smoothstep(0.45, 0.85, noise2);
        float sparkle2 = mix(glitter2, noise2, uSparkle2TexMix);

        float tiltAmountX = abs(uBackground.x - 0.5) * 2.0;
        float sparkle2Reveal = smoothstep(uSparkle2TiltSensitivity, uSparkle2TiltSensitivity + 0.3, tiltAmountX);

        result += vec3(sparkle2 * sparkle2Reveal) * foil * uSparkle2Intensity * uCardOpacity;
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

    // ── 6. Etch stamp (darken where foil is dark + rainbow holo) ───
    if (uHasFoil > 0.25 && (uEtchStampOpacity > 0.01 || uEtchStampHoloOpacity > 0.01)) {
        float rawFoil = texture2D(uFoilTex, uv).r;
        result *= mix(vec3(1.0), vec3(rawFoil), uEtchStampOpacity * uCardOpacity);

        // Rainbow holo on etch stamp areas — screen blend brightens the
        // darkened etch with rainbow; (1-rawFoil) targets the dark etch lines
        if (uEtchStampHoloOpacity > 0.01) {
            float stampTiltOffset = (0.5 - bgY) * uRainbowShift;
            float stampRainbowT = uv.y * uRainbowScale + uv.x * 0.5 + stampTiltOffset;
            vec3 stampRainbow = sunpillarGradient(stampRainbowT);
            float etchMask = 1.0 - rawFoil;
            result = mix(result, blendScreen(result, stampRainbow), etchMask * uEtchStampHoloOpacity * uCardOpacity);
        }
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}