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

// Shiny Rare configurable uniforms
uniform float uRainbowScale;
uniform float uRainbowShift;
uniform float uRainbowOpacity;
uniform float uGlareOpacity;
uniform float uGlareContrast;
uniform float uGlareSaturation;
uniform float uEtchOpacity;
uniform float uEtchContrast;
uniform float uEtchStampOpacity;
uniform float uEtchStampHoloOpacity;
uniform float uEtchStampHoloScale;
uniform float uEtchStampMaskThreshold;
uniform float uBaseBrightness;
uniform float uBaseContrast;

// Metal tilt uniforms
uniform float uMetalIntensity;
uniform float uMetalMaskThreshold;
uniform float uMetalTiltSensitivity;
uniform float uMetalTiltThreshold;
uniform float uMetalBrightness;
uniform float uMetalNoiseScale;
uniform float uMetalSaturation;

// Bar / sun-pillar uniforms
uniform float uBarAngle;
uniform float uBarDensity;
uniform float uBarOffsetBgYMult;
uniform float uBarWidth;
uniform float uBarIntensity;
uniform float uBarHue;
uniform float uBarMediumSaturation;
uniform float uBarMediumLightness;
uniform float uBarBrightSaturation;
uniform float uBarBrightLightness;
uniform float uBarDensity2;
uniform float uBar2OffsetBgYMult;
uniform float uBarWidth2;
uniform float uBarIntensity2;
uniform float uBarHue2;
uniform float uBarMediumSaturation2;
uniform float uBarMediumLightness2;
uniform float uBarBrightSaturation2;
uniform float uBarBrightLightness2;
uniform float uShine1Contrast;
uniform float uShine1Saturation;
uniform float uShine2Opacity;

varying vec2 vUv;

#include "common/blend.glsl"
#include "common/filters.glsl"
#include "common/rainbow.glsl"

// ── HSL to RGB conversion ────────────────────────────
vec3 hslToRgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0));
    float m = l - c / 2.0;

    vec3 rgb;
    if (h < 60.0) {
        rgb = vec3(c, x, 0.0);
    } else if (h < 120.0) {
        rgb = vec3(x, c, 0.0);
    } else if (h < 180.0) {
        rgb = vec3(0.0, c, x);
    } else if (h < 240.0) {
        rgb = vec3(0.0, x, c);
    } else if (h < 300.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }

    return rgb + m;
}

// ── Shared shine layer computation ─────────────────
vec3 computeShine(
    vec3 rainbow, float barCoord, float barOffset, float density,
    float width, float intensity,
    float hue, float medSat, float medLight, float brightSat, float brightLight,
    float glitter, float spotlight, float ptrBrightness,
    float contrast, float saturation
) {
    float barT = fract((barCoord + barOffset) * density);
    float e1 = 0.028 * width;
    float e2 = 0.035 * width;
    float e3 = 0.042 * width;
    float barInt = smoothstep(0.0, e1, barT) * (1.0 - smoothstep(e2, e3, barT));

    vec3 barMed = hslToRgb(hue, medSat, medLight);
    vec3 barBri = hslToRgb(hue, brightSat, brightLight);
    vec3 barCol = mix(barMed, barBri, barInt * intensity);

    vec3 result = blendHardLight(rainbow, barCol);
    result *= 0.5 + glitter * 0.3;
    result *= 0.5 + spotlight * 0.5;

    result = adjustBrightness(result, ptrBrightness);
    result = adjustContrast(result, contrast);
    result = adjustSaturate(result, saturation);
    return clamp(result, 0.0, 1.0);
}

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
    float glitter = uHasGlitter > 0.5 ? texture2D(uGlitterTex, uv * 2.0).r : 1.0;

    // Sharpen foil mask with contrast curve, then apply etch visibility
    if (foil > 0.01) {
        foil = clamp(pow(foil, 1.0 / uEtchContrast), 0.0, 1.0);
        result = mix(result, result + vec3(foil), uEtchOpacity * uCardOpacity * 0.2);
    }

    // ── 2. Rainbow holo + sun-pillar bars (mask-driven) ─
    if (mask > 0.5) {
        // Pointer-driven values for shine layers
        float ptrBrightness = uPointerFromCenter * 0.4 + 0.5;
        float spotDist0 = length(uv - uPointer);
        float spotlight = 0.75 - smoothstep(0.1, 0.7, spotDist0);

        // Shared bar coordinate
        float barAngle = uBarAngle * 3.14159 / 180.0;
        float barCoord = dot(uv, vec2(cos(barAngle), sin(barAngle)));

        // Shine layer 1: color-dodge
        float shineRainbowT = uv.y * uRainbowScale
            + ((0.5 - bgY) * 3.5)
            + sin(uTime * 0.3) * 0.05
            + (4.0 / 6.0);
        vec3 shine1 = computeShine(
            sunpillarGradient(shineRainbowT), barCoord,
            bgY * uBarOffsetBgYMult, uBarDensity,
            uBarWidth, uBarIntensity,
            uBarHue, uBarMediumSaturation, uBarMediumLightness,
            uBarBrightSaturation, uBarBrightLightness,
            glitter, spotlight, ptrBrightness,
            uShine1Contrast, uShine1Saturation
        );
        result = mix(result, blendColorDodge(result, shine1), mask * uCardOpacity);

        // Shine layer 2: soft-light
        vec3 shine2 = computeShine(
            sunpillarGradient(shineRainbowT), barCoord,
            bgY * uBar2OffsetBgYMult, uBarDensity2,
            uBarWidth2, uBarIntensity2,
            uBarHue2, uBarMediumSaturation2, uBarMediumLightness2,
            uBarBrightSaturation2, uBarBrightLightness2,
            glitter, spotlight, ptrBrightness,
            uShine1Contrast, uShine1Saturation
        );
        result = mix(result, blendSoftLight(result, shine2), mask * uCardOpacity * uShine2Opacity);
    }

    // ── 3. Metal tilt foil (mask-driven, pure-white only) ─
    float metalMask = smoothstep(uMetalMaskThreshold - 0.05, uMetalMaskThreshold + 0.05, mask);
    if (metalMask > 0.01) {
        // Tilt amount: how far from center (0 = head-on, 1 = max tilt)
        float tiltX = abs(uBackground.x - 0.5) * 2.0;
        float tiltY = abs(bgY - 0.5) * 2.0;
        float tiltAmount = max(tiltX, tiltY);

        // Reveal: gradually fades in from threshold to full tilt
        float scaledTilt = tiltAmount * uMetalTiltSensitivity;
        float reveal = smoothstep(uMetalTiltThreshold, 1.0, scaledTilt);

        // Silver metallic sheen modulated by noise texture
        float noise = uHasNoise > 0.5 ? texture2D(uNoiseTex, uv * uMetalNoiseScale).r : 1.0;
        vec3 metalColor = vec3(uMetalBrightness * noise);

        // Boost saturation of underlying card + etch before applying metal sheen
        float metalAmount = reveal * metalMask * uCardOpacity;
        result = adjustSaturate(result, mix(1.0, uMetalSaturation, metalAmount));

        // Screen blend for bright metallic highlights
        result = mix(result, blendScreen(result, metalColor), metalAmount * uMetalIntensity);
    }

    // ── Pointer-driven values ────────────────────────
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;
    float spotDist = length(uv - vec2(ptrX, ptrY));
    // ── 4. Glare (pointer-following radial) ──────────
    vec3 glareCenter = vec3(0.6);
    vec3 glareEdge = vec3(0.3);
    vec3 glare = mix(glareCenter, glareEdge, smoothstep(0.1, 0.7, spotDist));

    glare = adjustBrightness(glare, 0.6);
    glare = adjustContrast(glare, uGlareContrast);
    glare = adjustSaturate(glare, uGlareSaturation);
    glare = clamp(glare, 0.0, 1.0);

    result = mix(result, blendOverlay(result, glare), foil * uCardOpacity * uGlareOpacity);

    // ── 5. Final adjustments ─────────────────────────
    result = adjustBrightness(result, uBaseBrightness);
    result = adjustContrast(result, uBaseContrast);

    // ── 6. Etch stamp (darken where foil is dark + rainbow holo) ───
    if (uHasFoil > 0.5 && (uEtchStampOpacity > 0.01 || uEtchStampHoloOpacity > 0.01)) {
        float rawFoil = texture2D(uFoilTex, uv).r;
        result *= mix(vec3(1.0), vec3(rawFoil), uEtchStampOpacity * uCardOpacity);

        // Rainbow holo on etch stamp areas — screen blend brightens the
        // darkened etch with rainbow; (1-rawFoil) targets the dark etch lines.
        // Pointer drives both the rainbow phase and a radial spotlight.
        if (uEtchStampHoloOpacity > 0.01) {
            float stampTiltOffset = (0.5 - bgY) * uRainbowShift;
            float stampPtrOffset = (0.5 - ptrY) * 0.5;
            float stampRainbowT = uv.y * uEtchStampHoloScale + uv.x * 0.5 + stampTiltOffset + stampPtrOffset;
            vec3 stampRainbow = sunpillarGradient(stampRainbowT);
            float stampSpotlight = 0.5 + (0.75 - smoothstep(0.1, 0.7, spotDist));
            stampRainbow *= stampSpotlight;
            // Only apply where mask is above threshold (white mask = holo area).
            // smoothstep gives a soft edge to avoid harsh cutoff artifacts.
            float stampMask = 1.0 - smoothstep(uEtchStampMaskThreshold - 0.05, uEtchStampMaskThreshold + 0.05, foil);
            float etchMask = (1.0 - rawFoil) * stampMask;
            result = mix(result, blendScreen(result, stampRainbow), etchMask * uEtchStampHoloOpacity * uCardOpacity);
        }
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}