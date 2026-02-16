precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform sampler2D uIri7Tex;  // Iridescent texture layer 7
uniform sampler2D uIri8Tex;  // Iridescent texture layer 8
uniform sampler2D uIri9Tex;  // Iridescent texture layer 9
uniform sampler2D uIri1Tex;  // Sparkle texture layer 1 (tilt sparkle vertical)
uniform sampler2D uIri2Tex;  // Sparkle texture layer 2 (tilt sparkle horizontal)
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
// Tilt sparkle parameters
uniform float uSirTiltSparkleScale;
uniform float uSirTiltSparkleIntensity;
uniform float uSirTiltSparkleTiltSensitivity;
uniform float uSirTiltSparkle2Scale;
uniform float uSirTiltSparkle2Intensity;
uniform float uSirTiltSparkle2TiltSensitivity;

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
    vec3 glareLight = vec3(3.0);   // Bright white center
    vec3 glareDark = vec3(0.85);   // Light gray edge

    float glareMix = smoothstep(0.0, 1.3, spotDist) + smoothstep(0.3, 1.8, spotDist);
    vec3 glare = mix(glareLight, glareDark, glareMix);

    glare = adjustContrast(glare, 0.8);
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

    if (foil > 0.01) {
        // ── TILT SPARKLE — contour-following sweep on etch relief ──────
        // Use the foil texture gradient (dFdx/dFdy) as a pseudo surface
        // normal so the sparkle band follows embossed contours (the bubble,
        // stars, etc.) instead of sweeping in a straight line.
        float etchMask = smoothstep(0.5, 0.9, foil);

        // Etch surface gradient — approximates which direction each etched
        // region "faces". Where the bubble curves, the gradient points
        // radially outward, so the band wraps around the contour.
        vec2 etchGrad = vec2(dFdx(foil), dFdy(foil));

        // Tilt direction in UV space (centered at 0)
        vec2 tiltDir = vec2(bgX - 0.5, bgY - 0.5);

        // Dot product: etch regions whose gradient aligns with tilt catch light.
        // Scale sensitivity controls how much tilt is needed to sweep fully.
        float catchAngle = dot(normalize(etchGrad + 0.001), normalize(tiltDir + 0.001));

        // Gradient magnitude gates the effect — flat etch areas (no contour)
        // don't sparkle, only edges/curves with strong relief do
        float gradStrength = length(etchGrad) * 80.0;
        gradStrength = clamp(gradStrength, 0.0, 1.0);

        // Iri textures add per-texel variation so it's not perfectly smooth
        float iri1Val = sampleIriTexture(uIri1Tex, uv, uSirTiltSparkleScale).r;
        float iri2Val = sampleIriTexture(uIri2Tex, uv, uSirTiltSparkle2Scale).r;

        // Layer 1: contour-following sparkle
        float band1 = smoothstep(1.0 - uSirTiltSparkleTiltSensitivity, 1.0, catchAngle);
        band1 *= gradStrength;

        vec3 sparkle1 = sampleIriTexture(uIri1Tex, uv, uSirTiltSparkleScale);
        sparkle1 = adjustContrast(sparkle1, 2.5);
        sparkle1 = adjustSaturate(sparkle1, 2.0);
        sparkle1 = clamp(sparkle1, 0.0, 1.0);

        float rainbowT1 = foil * 3.0 + uv.y * 1.5 + (0.5 - bgY) * 3.0;
        vec3 sparkleRgb1 = sunpillarGradient(rainbowT1) * sparkle1;
        result += sparkleRgb1 * band1 * etchMask * uSirTiltSparkleIntensity * uCardOpacity;

        // Layer 2: opposite-facing contours (catch light from the other side)
        float band2 = smoothstep(1.0 - uSirTiltSparkle2TiltSensitivity, 1.0, -catchAngle);
        band2 *= gradStrength;

        vec3 sparkle2 = sampleIriTexture(uIri2Tex, uv, uSirTiltSparkle2Scale);
        sparkle2 = adjustContrast(sparkle2, 2.5);
        sparkle2 = adjustSaturate(sparkle2, 2.0);
        sparkle2 = clamp(sparkle2, 0.0, 1.0);

        float rainbowT2 = foil * 3.0 + uv.x * 1.5 + (0.5 - bgX) * 3.0;
        vec3 sparkleRgb2 = sunpillarGradient(rainbowT2) * sparkle2;
        result += sparkleRgb2 * band2 * etchMask * uSirTiltSparkle2Intensity * uCardOpacity;
    }

    // Overall brighter filter for silvery holographic effect
    result = adjustBrightness(result, uSirBaseBrightness + uCardOpacity * 0.2);
    result = adjustContrast(result, uSirBaseContrast);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
