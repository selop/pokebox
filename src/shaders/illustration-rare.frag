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
uniform float uBarOffsetBgXMult;
uniform float uBarOffsetBgYMult;
uniform float uBar2OffsetBgXMult;
uniform float uBar2OffsetBgYMult;
uniform float uBarWidth;
uniform float uBarIntensity;
uniform float uBarHue;
uniform float uBarMediumSaturation;
uniform float uBarMediumLightness;
uniform float uBarBrightSaturation;
uniform float uBarBrightLightness;
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
    float bgX = uBackground.x;
    float bgY = uBackground.y;
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;

    // CSS: brightness(calc(pointer-from-center * 0.4 + 0.5))
    float ptrBrightness = uPointerFromCenter * 0.4 + 0.5;

    // Radial spotlight from pointer (shared by holo & foil)
    float spotDist = length(uv - vec2(ptrX, ptrY));
    float spotlight = 0.75 - smoothstep(0.1, 0.9, spotDist);

    // ── SHINE LAYER 1: Rainbow + bars (color-dodge) ──
    // CSS: repeating sunpillar gradient (0deg, 200% 700% ≈ 3.5 vertical repeats)
    float rainbowT = uv.y * uRainbowScale
        + ((0.5 - bgY) * 3.5)
        + sin(uTime * 0.3) * 0.05
        + (4.0 / 6.0); // CSS :before palette rotation (colors 5,6,1,2,3,4)
    vec3 rainbow = sunpillarGradient(rainbowT);

    // CSS: repeating-linear-gradient(133deg, bright saturated diagonal bars)
    // Pattern matching double-rare spacing with illustration-rare colors
    float barAngle = uBarAngle * 3.14159 / 180.0;
    float barCoord = dot(uv, vec2(cos(barAngle), sin(barAngle)));
    float barOffset = ((0.5 - bgX) * uBarOffsetBgXMult) + (bgY * uBarOffsetBgYMult);
    float barT = fract((barCoord + barOffset) * uBarDensity);

    // Bar pattern: controllable HSL colors
    vec3 barMedium = hslToRgb(uBarHue, uBarMediumSaturation, uBarMediumLightness);
    vec3 barBright = hslToRgb(uBarHue, uBarBrightSaturation, uBarBrightLightness);

    // Bar width control via adjustable smoothstep ranges
    float barEdge1 = 0.028 * uBarWidth;
    float barEdge2 = 0.035 * uBarWidth;
    float barEdge3 = 0.042 * uBarWidth;
    float barIntensity = smoothstep(0.0, barEdge1, barT) * (1.0 - smoothstep(barEdge2, barEdge3, barT));

    // Mix bar colors with intensity control
    vec3 barColor = mix(barMedium, barBright, barIntensity * uBarIntensity);

    // CSS: background-blend-mode hard-light for bar layer
    rainbow = blendHardLight(rainbow, barColor);

    // Apply glitter texture under the rainbow (creates sparkle base)
    rainbow *= 0.7 + glitter * 0.3;

    // Apply spotlight
    rainbow *= 0.5 + spotlight * 0.5;

    // CSS filter: brightness(.8) contrast(2.95) saturate(.65)
    vec3 shine1 = adjustBrightness(rainbow, ptrBrightness * 1.0);
    shine1 = adjustContrast(shine1, uShine1Contrast);
    shine1 = adjustSaturate(shine1, uShine1Saturation);
    shine1 = clamp(shine1, 0.0, 1.0);

    // ── SHINE LAYER 2: Shifted copy (exclusion blend) ─
    // CSS :after: inverted positions, mix-blend-mode: exclusion
    float rainbow2T = uv.y * (uRainbowScale * 1.75)
        + ((0.5 - bgY) * -2.5)
        + cos(uTime * 0.25) * 0.04
        + (5.0 / 6.0); // CSS :after palette rotation (colors 6,1,2,3,4,5)
    vec3 rainbow2 = sunpillarGradient(rainbow2T);

    // Inverted bar offset for second layer (matching double-rare pattern)
    float barOffset2 = ((0.5 - bgX) * uBar2OffsetBgXMult) + (bgY * uBar2OffsetBgYMult);
    float barT2 = fract((barCoord + barOffset2) * 15.0);
    float bar2Edge1 = barEdge1 * 5.3;
    float bar2Edge2 = barEdge2 * 5.3;
    float bar2Edge3 = barEdge3 * 5.3;
    float barIntensity2 = smoothstep(0.0, bar2Edge1, barT2) * (1.0 - smoothstep(bar2Edge2, bar2Edge3, barT2));
    vec3 barColor2 = mix(barMedium, barBright, barIntensity2 * uBarIntensity);
    rainbow2 = blendHardLight(rainbow2, barColor2);

    rainbow2 *= 0.5 + spotlight * 0.5;

    // CSS :after filter: brightness(1) contrast(2.5) saturate(1.75)
    vec3 shine2 = adjustBrightness(rainbow2, ptrBrightness);
    //shine2 = adjustContrast(shine2, 0.5);
    //shine2 = adjustSaturate(shine2, 0.75);
    shine2 = clamp(shine2, 0.0, 1.0);

    // ── GLARE: White-to-black radial (overlay) ──────
    // CSS: radial-gradient(farthest-corner circle at pointer,
    //   hsl(0,0%,100%) 0%, hsl(0,0%,0%) 100%)
    vec3 glare = mix(vec3(1.0), vec3(0.0), smoothstep(0.0, 0.85, spotDist));

    // CSS filter: brightness(.9) contrast(1.2)
    glare = adjustBrightness(glare, 0.7);
    glare = adjustContrast(glare, 1.2);
    glare = clamp(glare, 0.0, 1.0);

    // ── Compose layers ───────────────────────────────
    vec3 base = cardColor.rgb;
    vec3 result = base;

    // Holo mask layers (shine1 + shine2 + glare)
    if (mask > 0.01) {
        // Shine 1: color-dodge
        result = mix(result, blendColorDodge(result, shine1), mask * uCardOpacity);

        // Shine 2: soft-light (CSS :after mix-blend-mode: soft-light)
        result = mix(result, blendSoftLight(result, shine2), mask * uCardOpacity * uShine2Opacity);

        // Glare: overlay (CSS .card__glare mix-blend-mode: overlay)
        result = mix(result, blendOverlay(result, glare), mask * uCardOpacity * uGlareOpacity * 0.8);

        // Glare2: screen (CSS .card__glare2 mix-blend-mode: screen)
        // CSS: radial-gradient(farthest-corner circle at pointer, hsl(0,0%,100%) 5%, hsl(0,0%,0%) 120%)
        vec3 glare2 = mix(vec3(1.0), vec3(0.0), smoothstep(0.05, 0.85, spotDist));
        glare2 = adjustBrightness(glare2, 0.475);
        glare2 = adjustContrast(glare2, 1.5);
        glare2 = clamp(glare2, 0.0, 1.0);
        float glare2Opacity = uCardOpacity * uPointerFromCenter;
        result = mix(result, blendScreen(result, glare2), mask * glare2Opacity);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
