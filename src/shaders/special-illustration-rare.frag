precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform sampler2D uIri7Tex;  // Iridescent texture layer 7
uniform sampler2D uIri8Tex;  // Iridescent texture layer 8
uniform sampler2D uIri9Tex;  // Iridescent texture layer 9
uniform float uHasFoil;
uniform vec2 uPointer;       // eye projected onto card UV (0-1)
uniform vec2 uBackground;    // constrained 0.37-0.63
uniform float uPointerFromCenter; // 0-1
uniform float uCardOpacity;  // holo intensity 0-1
uniform float uFade;         // overall card opacity 0-1 (for transitions)
// Special Illustration Rare tunable parameters
uniform float uSirShineAngle;
uniform float uSirShineFrequency;
uniform float uSirShineBrightness;
uniform float uSirShineContrast;
uniform float uSirShineSaturation;
uniform float uSirGlitterContrast;
uniform float uSirGlitterSaturation;
uniform float uSirWashScale;
uniform float uSirWashTiltSensitivity;
uniform float uSirWashSaturation;
uniform float uSirWashContrast;
uniform float uSirWashOpacity;
uniform float uSirBaseBrightness;
uniform float uSirBaseContrast;

varying vec2 vUv;

#include "common/blend.glsl"
#include "common/filters.glsl"
#include "common/rainbow.glsl"

// ── Iridescent texture sampling with tiling ──────────
vec3 sampleIriTexture(sampler2D iriTex, vec2 uv, float tileSize) {
    // Tile the texture for repeating pattern
    vec2 tiledUV = fract(uv * tileSize);
    vec4 iriSample = texture2D(iriTex, tiledUV);
    return iriSample.rgb;
}

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
        vec4 backColor = texture2D(uCardBackTex, uv);
        gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
        return;
    }

    // ── Pointer-driven offsets ───────────────────────
    float bgX = uBackground.x;
    float bgY = uBackground.y;
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;
    float ptrFromLeft = ptrX;
    float ptrFromTop = ptrY;

    // Radial distance from pointer
    float spotDist = length(uv - vec2(ptrX, ptrY));

    // ── SHINE LAYER :before - Diagonal rainbow ───────
    // CSS: repeating-linear-gradient(15deg, holo colors)
    // Much finer diagonal lines for subtle shimmer
    float shineAngle = uSirShineAngle * 3.14159 / 180.0;
    float shineCoord = dot(uv - 0.5, vec2(cos(shineAngle), sin(shineAngle)));
    float shineT = shineCoord * uSirShineFrequency;
    vec3 rainbow = sunpillarGradient(shineT);

    // Brighter and higher saturation for silvery shimmer
    vec3 shineBefore = adjustBrightness(rainbow, uSirShineBrightness);
    shineBefore = adjustContrast(shineBefore, uSirShineContrast);
    shineBefore = adjustSaturate(shineBefore, uSirShineSaturation);
    shineBefore = clamp(shineBefore, 0.0, 1.0);

    // ── TILT-RESPONSIVE RAINBOW COLOR WASH ──────────────
    // Vertical (90°) rainbow pillar that slides top-to-bottom with tilt
    float washT = uv.y * uSirWashScale + (bgY - 0.5) * uSirWashTiltSensitivity;
    vec3 iridescence = sunpillarGradient(washT);
    iridescence = adjustSaturate(iridescence, uSirWashSaturation);
    iridescence = adjustContrast(iridescence, uSirWashContrast);
    iridescence = clamp(iridescence, 0.0, 1.0);

    // ── IRIDESCENT GLITTER LAYERS (using textures) ──────
    float glitterTileSize = 300.0 / 1024.0;

    // Main glitter layer - iri9 texture
    vec3 glitter = sampleIriTexture(uIri9Tex, uv, 1.0 / glitterTileSize);
    glitter = adjustContrast(glitter, uSirGlitterContrast);
    glitter = adjustSaturate(glitter, uSirGlitterSaturation);
    glitter = clamp(glitter, 0.0, 1.0);

    float glitterOpacity = uCardOpacity * (1.0 + uPointerFromCenter * 0.5);

    // Glitter :before layer - iri8 texture (shifted by pointer)
    float shift = 3.0 / 1024.0; // 3px in UV space
    vec2 shiftedUV1 = uv + vec2(ptrFromLeft * shift, ptrFromTop * shift);
    vec3 glitterBefore = sampleIriTexture(uIri8Tex, shiftedUV1, 1.0 / glitterTileSize);

    glitterBefore = adjustContrast(glitterBefore, 1.8);
    glitterBefore = adjustSaturate(glitterBefore, 2.0);
    glitterBefore = clamp(glitterBefore, 0.0, 1.0);

    // Glitter :after layer - iri7 texture (shifted opposite direction)
    vec2 shiftedUV2 = uv - vec2(ptrFromLeft * shift, ptrFromTop * shift);
    vec3 glitterAfter = sampleIriTexture(uIri7Tex, shiftedUV2, 1.0 / glitterTileSize);

    glitterAfter = adjustContrast(glitterAfter, 1.2);
    glitterAfter = adjustSaturate(glitterAfter, 2.0);
    glitterAfter = clamp(glitterAfter, 0.0, 1.0);

    // ── GLARE ────────────────────────────────────────
    vec3 glareLight = vec3(5.0);   // Bright white center
    vec3 glareDark = vec3(0.85);   // Light gray edge

    float glareMix = smoothstep(0.0, 0.15, spotDist) + smoothstep(0.15, 0.8, spotDist);
    vec3 glare = mix(glareLight, glareDark, glareMix);

    glare = adjustContrast(glare, 1.1);
    glare = clamp(glare, 0.0, 1.0);

    // ── Compose layers ───────────────────────────────
    vec3 base = cardColor.rgb;
    vec3 result = base;

    if (mask > 0.01) {
        // Add bright silvery base first
        vec3 silverBase = vec3(0.85);
        result = mix(result, blendOverlay(result, silverBase), mask * uCardOpacity * 0.3);

        // Apply diagonal rainbow shine with overlay blend
        result = mix(result, blendOverlay(result, shineBefore), mask * uCardOpacity * 0.2);

        // Apply tilt-responsive rainbow color wash with soft-light blend
        result = mix(result, blendSoftLight(result, iridescence), mask * uCardOpacity * uSirWashOpacity);

        // Apply main glitter with plus-lighter blend
        result = mix(result, blendPlusLighter(result, glitter), mask * glitterOpacity * 0.8);

        // Apply glitter :before with overlay blend
        result = mix(result, blendOverlay(result, glitterBefore), mask * uCardOpacity * ptrFromTop * 0.9);

        // Apply glitter :after with overlay blend
        result = mix(result, blendOverlay(result, glitterAfter), mask * uCardOpacity * (1.0 - ptrFromTop) * 1.0);

        // Apply bright glare with multiply blend (subtle darkening)
        result = mix(result, blendMultiply(result, glare), mask * uCardOpacity * 0.2);

        // Apply glare2 (foil overlay) if foil texture present
        if (foil > 0.01) {
            result = mix(result, blendOverlay(result, vec3(1.0)), foil * uCardOpacity * 0.4);
        }
    }

    // Overall brighter filter for silvery holographic effect
    result = adjustBrightness(result, uSirBaseBrightness + uCardOpacity * 0.2);
    result = adjustContrast(result, uSirBaseContrast);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
