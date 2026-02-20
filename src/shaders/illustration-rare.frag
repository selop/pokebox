precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform sampler2D uGlitterTex;
uniform float uHasFoil;
uniform float uHasGlitter;
uniform vec2 uPointer;       // eye projected onto card UV (0-1)
uniform vec2 uBackground;    // constrained 0.37-0.63
uniform float uPointerFromCenter; // 0-1
uniform float uCardOpacity;  // holo intensity 0-1
uniform float uTime;
uniform float uFade;         // overall card opacity 0-1 (for transitions)

// Illustration Rare shader parameters
uniform float uRainbowScale;
uniform float uBarAngle;
uniform float uBarDensity;
uniform float uBarDensity2;
uniform float uBarOffsetBgYMult;
uniform float uBar2OffsetBgYMult;
uniform float uBarWidth;
uniform float uBarWidth2;
uniform float uBarIntensity;
uniform float uBarIntensity2;
uniform float uBarHue;
uniform float uBarMediumSaturation;
uniform float uBarMediumLightness;
uniform float uBarBrightSaturation;
uniform float uBarBrightLightness;
uniform float uBarHue2;
uniform float uBarMediumSaturation2;
uniform float uBarMediumLightness2;
uniform float uBarBrightSaturation2;
uniform float uBarBrightLightness2;
uniform float uShine1Contrast;
uniform float uShine1Saturation;
uniform float uShine2Opacity;
uniform float uGlareOpacity;

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
// Applies bar pattern over rainbow, then glitter, spotlight, and color grading.
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
    float e3 = 0.063 * width;
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

    // ── Base card ────────────────────────────────────
    vec4 cardColor = texture2D(uCardTex, uv);

    // Back face: show card-back texture
    if (!gl_FrontFacing) {
        vec4 backColor = texture2D(uCardBackTex, uv);
        gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
        return;
    }

    // ── Mask & foil (white = effect areas) ───────────
    float mask = texture2D(uMaskTex, uv).r;
    float foil = uHasFoil > 0.5 ? texture2D(uFoilTex, uv).r : 0.0;
    float glitter = uHasGlitter > 0.5 ? texture2D(uGlitterTex, uv * 2.0).r : 1.0;

    // Skip compositing if no effect present
    if (uCardOpacity < 0.01 || (mask < 0.01 && foil < 0.01)) {
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
        return;
    }

    // ── Pointer-driven offsets ───────────────────────
    float bgY = uBackground.y;
    float ptrBrightness = uPointerFromCenter * 0.4 + 0.5;
    float spotDist = length(uv - uPointer);
    float spotlight = 0.75 - smoothstep(0.1, 0.7, spotDist);

    // Shared bar coordinate
    float barAngle = uBarAngle * 3.14159 / 180.0;
    float barCoord = dot(uv, vec2(cos(barAngle), sin(barAngle)));

    // ── SHINE LAYER 1 ──────────────────────────────
    float rainbowT = uv.y * uRainbowScale
        + ((0.5 - bgY) * 3.5)
        + sin(uTime * 0.3) * 0.05
        + (4.0 / 6.0);
    vec3 shine1 = computeShine(
        sunpillarGradient(rainbowT), barCoord,
        bgY * uBarOffsetBgYMult, uBarDensity,
        uBarWidth, uBarIntensity,
        uBarHue, uBarMediumSaturation, uBarMediumLightness,
        uBarBrightSaturation, uBarBrightLightness,
        glitter, spotlight, ptrBrightness,
        uShine1Contrast, uShine1Saturation
    );

    // ── SHINE LAYER 2 ──────────────────────────────
    float rainbow2T = uv.y * uRainbowScale
        + ((0.5 - bgY) * 3.5)
        + sin(uTime * 0.3) * 0.05
        + (4.0 / 6.0);
    vec3 shine2 = computeShine(
        sunpillarGradient(rainbow2T), barCoord,
        bgY * uBar2OffsetBgYMult, uBarDensity2,
        uBarWidth2, uBarIntensity2,
        uBarHue2, uBarMediumSaturation2, uBarMediumLightness2,
        uBarBrightSaturation2, uBarBrightLightness2,
        glitter, spotlight, ptrBrightness,
        uShine1Contrast, uShine1Saturation
    );

    // ── GLARE: White-to-black radial (overlay) ──────
    // CSS: radial-gradient(farthest-corner circle at pointer,
    //   hsl(0,0%,100%) 0%, hsl(0,0%,0%) 100%)
    vec3 glare = mix(vec3(1.0), vec3(0.0), smoothstep(0.0, 0.85, spotDist));

    // CSS filter: brightness(.9) contrast(1.2)
    glare = adjustBrightness(glare, 0.9);
    glare = adjustContrast(glare, 1.0);
    glare = clamp(glare, 0.0, 1.0);

    // ── Compose layers ───────────────────────────────
    vec3 base = cardColor.rgb;
    vec3 result = base;

    // Holo mask layers (shine1 + shine2 + glare)
    if (mask > 0.01) {
        // Shine 1: color-dodge
        result = mix(result, blendColorDodge(result, shine1), mask * uCardOpacity);

        // Shine 2: soft-light (CSS :after mix-blend-mode: soft-light)
        result = mix(result, blendSoftLight(result, shine2), mask * uCardOpacity);

        // Glare: overlay (CSS .card__glare mix-blend-mode: overlay)
        result = mix(result, blendOverlay(result, glare), mask * uCardOpacity * uGlareOpacity * 0.8);

        // Glare2: screen (CSS .card__glare2 mix-blend-mode: screen)
        // CSS: radial-gradient(farthest-corner circle at pointer, hsl(0,0%,100%) 5%, hsl(0,0%,0%) 120%)
        vec3 glare2 = mix(vec3(1.0), vec3(0.0), smoothstep(0.05, 0.85, spotDist));
        glare2 = adjustBrightness(glare2, 0.475);
        glare2 = adjustContrast(glare2, 1.2);
        glare2 = clamp(glare2, 0.0, 1.0);
        float glare2Opacity = uCardOpacity * uPointerFromCenter;
        result = mix(result, blendScreen(result, glare2), mask * glare2Opacity);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
