precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform float uHasFoil;
uniform vec2 uPointer;       // eye projected onto card UV (0-1)
uniform vec2 uBackground;    // constrained 0.37-0.63
uniform float uCardOpacity;  // holo intensity 0-1
uniform float uTime;
uniform float uFade;         // overall card opacity 0-1 (for transitions)

// Pillar parameters
uniform float uPillarDensity;    // number of rainbow bands across the card
uniform float uPillarSharpness;  // 0 = smooth gradient, 1 = hard-edged bands
uniform float uPillarTiltX;      // horizontal shift sensitivity (left-right tilt)
uniform float uPillarTiltY;      // hue shift sensitivity (up-down tilt)
uniform float uPillarBrightness; // brightness of the pillar rainbow
uniform float uPillarContrast;   // contrast of the pillar rainbow
uniform float uPillarSaturation; // saturation of the pillar rainbow

// Glare parameters
uniform float uGlareOpacity;     // spotlight glare opacity
uniform float uGlareRadius;      // spotlight glare radius

varying vec2 vUv;

#include "common/blend.glsl"
#include "common/filters.glsl"
#include "common/rainbow.glsl"

void main() {
    vec2 uv = vUv;

    // ── Base card ────────────────────────────────────
    vec4 cardColor = texture2D(uCardTex, uv);

    // Back face: show card without holo
    if (!gl_FrontFacing) {
        vec4 backColor = texture2D(uCardBackTex, uv);
        gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
        return;
    }

    // ── Mask & foil (white = effect areas) ───────────
    float mask = texture2D(uMaskTex, uv).r;
    float foil = uHasFoil > 0.5 ? texture2D(uFoilTex, uv).r : 0.0;

    // Skip compositing if no effect present
    if (uCardOpacity < 0.01 || (mask < 0.01 && foil < 0.01)) {
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
        return;
    }

    // ── Pointer-driven spotlight ─────────────────────
    float spotDist = length(uv - uPointer);

    // ── Vertical rainbow pillars ─────────────────────
    // Horizontal position drives which color band we're in;
    // tiltX shifts bands left-right, tiltY shifts hue up-down.
    float bgX = uBackground.x;
    float bgY = uBackground.y;

    float pillarT = uv.x * uPillarDensity
        + (0.5 - bgX) * uPillarTiltX
        + (0.5 - bgY) * uPillarTiltY;

    // Sharpness: interpolate between smooth gradient and hard-edged bands.
    // At sharpness=0, use raw fract for smooth blending.
    // At sharpness=1, snap each band to its center color.
    float f = fract(pillarT) * 6.0;
    int idx = int(floor(f));
    float blend = fract(f);
    // Sharpen the blend factor: push towards 0 or 1
    float sharpBlend = mix(blend, step(0.5, blend), uPillarSharpness);
    vec3 c0 = getSunColor(idx);
    vec3 c1 = getSunColor(int(mod(float(idx + 1), 6.0)));
    vec3 pillars = mix(c0, c1, sharpBlend);

    // Apply brightness, contrast, saturation
    pillars = adjustBrightness(pillars, uPillarBrightness);
    pillars = adjustContrast(pillars, uPillarContrast);
    pillars = adjustSaturate(pillars, uPillarSaturation);
    pillars = clamp(pillars, 0.0, 1.0);

    // ── Glare: radial spotlight from pointer ─────────
    float glare = 1.0 - smoothstep(0.0, uGlareRadius, spotDist);
    vec3 glareColor = vec3(glare);

    // ── Compose layers ───────────────────────────────
    vec3 result = cardColor.rgb;

    if (mask > 0.01) {
        // Apply pillar rainbow with overlay blend
        result = mix(result, blendOverlay(result, pillars), mask * uCardOpacity);

        // Apply glare with screen blend
        result = mix(result, blendScreen(result, glareColor), mask * uCardOpacity * uGlareOpacity);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
