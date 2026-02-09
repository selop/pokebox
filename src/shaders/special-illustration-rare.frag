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
uniform float uTime;
uniform float uFade;         // overall card opacity 0-1 (for transitions)

varying vec2 vUv;

// ── Blend modes (matching CSS blend modes) ──────────
vec3 blendColorDodge(vec3 base, vec3 blend) {
    return min(base / max(1.0 - blend, 0.001), vec3(1.0));
}
vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, base)
    );
}
vec3 blendHardLight(vec3 base, vec3 blend) {
    return blendOverlay(blend, base);
}
vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
}
vec3 blendExclusion(vec3 base, vec3 blend) {
    return base + blend - 2.0 * base * blend;
}
vec3 blendPlusLighter(vec3 base, vec3 blend) {
    return min(base + blend, vec3(1.0));
}
vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}

// ── Filter helpers ───────────────────────────────────
vec3 adjustBrightness(vec3 c, float b) {
    return c * b;
}
vec3 adjustContrast(vec3 c, float k) {
    return (c - 0.5) * k + 0.5;
}
vec3 adjustSaturate(vec3 c, float s) {
    float grey = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(grey), c, s);
}

// ── Sunpillar rainbow colors ─────────────────────────
vec3 getSunColor(int i) {
    if (i == 0) return vec3(1.0, 0.46, 0.46);   // hsl(2, 100%, 73%)
    if (i == 1) return vec3(1.0, 0.90, 0.38);   // hsl(53, 100%, 69%)
    if (i == 2) return vec3(0.58, 1.0, 0.38);   // hsl(93, 100%, 69%)
    if (i == 3) return vec3(0.52, 1.0, 0.92);   // hsl(176, 100%, 76%)
    if (i == 4) return vec3(0.48, 0.53, 1.0);   // hsl(228, 100%, 74%)
    return vec3(0.74, 0.46, 1.0);                // hsl(283, 100%, 73%)
}

// ── Rainbow gradient (repeating) ─────────────────────
vec3 sunpillarGradient(float t) {
    float f = fract(t) * 6.0;
    int idx = int(floor(f));
    float blend = fract(f);
    vec3 c0 = getSunColor(idx);
    vec3 c1 = getSunColor(int(mod(float(idx + 1), 6.0)));
    return mix(c0, c1, blend);
}

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
    float shineAngle = 45.0 * 3.14159 / 180.0;
    float shineCoord = dot(uv - 0.5, vec2(cos(shineAngle), sin(shineAngle)));
    float shineT = shineCoord * 8.0; // Increased frequency for finer lines
    vec3 rainbow = sunpillarGradient(shineT);

    // Brighter and higher saturation for silvery shimmer
    // CSS: filter: brightness(1) contrast(0.75) saturate(1)
    // CSS: mix-blend-mode: overlay
    vec3 shineBefore = adjustBrightness(rainbow, 1.5);
    shineBefore = adjustContrast(shineBefore, 1.2);
    shineBefore = adjustSaturate(shineBefore, 1.5);
    shineBefore = clamp(shineBefore, 0.0, 1.0);

    // ── SHINE LAYER :after - Fine diagonal line texture ──────
    // Much higher frequency for fine etched line texture
    float rotateX = (bgX - 0.5) * 180.0;
    float rotateDelta = (bgY - 0.5) * 90.0;

    // Bar layer 1 (positive rotation) - very fine lines
    float barAngle1 = ((rotateX - rotateDelta) * 0.25) * 3.14159 / 180.0;
    float barCoord1 = dot(uv, vec2(cos(barAngle1), sin(barAngle1)));
    float barT1 = fract((barCoord1 + bgY * 1.7) * 40.0); // Much higher frequency

    // Subtle, fine lines with lower contrast
    float bar1 = smoothstep(0.4, 0.5, barT1) * (1.0 - smoothstep(0.5, 0.6, barT1));
    vec3 barColor1 = mix(vec3(0.7), vec3(0.95), bar1); // Light gray to near-white

    // Bar layer 2 (negative rotation) - very fine lines
    float barAngle2 = ((rotateX - rotateDelta) * -0.25) * 3.14159 / 180.0;
    float barCoord2 = dot(uv, vec2(cos(barAngle2), sin(barAngle2)));
    float barT2 = fract((barCoord2 - bgY * 1.3) * 40.0);

    float bar2 = smoothstep(0.4, 0.5, barT2) * (1.0 - smoothstep(0.5, 0.6, barT2));
    vec3 barColor2 = mix(vec3(0.7), vec3(0.95), bar2);

    // CSS: background-blend-mode: exclusion
    vec3 bars = blendExclusion(barColor1, barColor2);

    // Keep bright and low contrast for subtle texture
    // CSS: filter: brightness(1) contrast(0.75) saturate(1)
    // CSS: mix-blend-mode: hard-light
    vec3 shineAfter = adjustBrightness(bars, 1.2);
    shineAfter = adjustContrast(shineAfter, 0.6);
    shineAfter = adjustSaturate(shineAfter, 0.8);
    shineAfter = clamp(shineAfter, 0.0, 1.0);

    // ── TILT-REVEALED VERTICAL SUNPILLAR EFFECT ─────────
    // Vertical rainbow bars revealed by viewing angle (similar to illustration-rare 128.5° bars)
    // Oriented vertically (90° angle) and controlled by bgY tilt

    // Vertical bar angle (90 degrees = vertical bars)
    float sunpillarAngle = 90.0 * 3.14159 / 180.0;
    float sunpillarCoord = dot(uv, vec2(cos(sunpillarAngle), sin(sunpillarAngle)));

    // Layer 1: Controlled by vertical tilt (bgY)
    float sunpillarOffset1 = ((0.5 - bgY) * 2.5) + (bgX * 0.8);
    float sunpillar1T = (sunpillarCoord + sunpillarOffset1) * 2.0;

    // Generate rainbow gradient
    vec3 sunpillar1Color = sunpillarGradient(sunpillar1T);

    // Create bar pattern with gaps
    float sunpillar1Pattern = fract(sunpillar1T);
    float sunpillar1Mask = smoothstep(0.25, 0.35, sunpillar1Pattern) * (1.0 - smoothstep(0.45, 0.55, sunpillar1Pattern));
    sunpillar1Color *= sunpillar1Mask;

    // Layer 2: Inverted offset for dual-layer effect
    float sunpillarOffset2 = ((0.5 - bgY) * -1.8) - (bgX * 0.6);
    float sunpillar2T = (sunpillarCoord + sunpillarOffset2) * 1.0;

    vec3 sunpillar2Color = sunpillarGradient(sunpillar2T);

    float sunpillar2Pattern = fract(sunpillar2T);
    float sunpillar2Mask = smoothstep(0.25, 0.35, sunpillar2Pattern) * (1.0 - smoothstep(0.45, 0.55, sunpillar2Pattern));
    sunpillar2Color *= sunpillar2Mask;

    // Combine layers with screen blend (like illustration-rare bars)
    vec3 sunpillars = blendScreen(sunpillar1Color, sunpillar2Color);

    // Apply filters for holographic effect
    sunpillars = adjustBrightness(sunpillars, 1.8);
    sunpillars = adjustContrast(sunpillars, 2.2);
    sunpillars = adjustSaturate(sunpillars, 2.0);
    sunpillars = clamp(sunpillars, 0.2, 1.0);

    // ── IRIDESCENT GLITTER LAYERS (using textures) ──────
    // CSS var(--glitter-size): 150px 150px
    float glitterTileSize = 300.0 / 1024.0; // Assuming card is ~1024px height

    // Main glitter layer - iri9 texture
    // CSS: background-image: var(--iri9)
    // CSS: filter: brightness(1) contrast(2) saturate(1.2)
    // CSS: mix-blend-mode: plus-lighter
    vec3 glitter = sampleIriTexture(uIri9Tex, uv, 1.0 / glitterTileSize);
    glitter = adjustBrightness(glitter, 1.0);
    glitter = adjustContrast(glitter, 1.0);
    glitter = adjustSaturate(glitter, 1.2);
    glitter = clamp(glitter, 0.0, 1.0);

    // CSS: opacity: calc(var(--card-opacity) * (0.2 + var(--pointer-from-center) * 0.5))
    float glitterOpacity = uCardOpacity * (1.0 + uPointerFromCenter * 0.5);

    // Glitter :before layer - iri8 texture (shifted by pointer)
    // CSS: background-image: var(--iri8)
    // CSS: background-position: calc(50% + pointer-shift)
    float shift = 3.0 / 1024.0; // 3px in UV space
    vec2 shiftedUV1 = uv + vec2(ptrFromLeft * shift, ptrFromTop * shift);
    vec3 glitterBefore = sampleIriTexture(uIri8Tex, shiftedUV1, 1.0 / glitterTileSize);

    // CSS: filter: brightness(2) contrast(1.2) saturate(2)
    // CSS: mix-blend-mode: overlay
    // CSS: opacity: var(--pointer-from-top)
    glitterBefore = adjustBrightness(glitterBefore, 1.0);
    glitterBefore = adjustContrast(glitterBefore, 1.8);
    glitterBefore = adjustSaturate(glitterBefore, 2.0);
    glitterBefore = clamp(glitterBefore, 0.0, 1.0);

    // Glitter :after layer - iri7 texture (shifted opposite direction)
    // CSS: background-image: var(--iri7)
    // CSS: background-position: calc(50% + pointer-shift * -1)
    vec2 shiftedUV2 = uv - vec2(ptrFromLeft * shift, ptrFromTop * shift);
    vec3 glitterAfter = sampleIriTexture(uIri7Tex, shiftedUV2, 1.0 / glitterTileSize);

    // CSS: opacity: calc(var(--pointer-from-top) * -1 + 1)
    glitterAfter = adjustBrightness(glitterAfter, 1.0);
    glitterAfter = adjustContrast(glitterAfter, 1.2);
    glitterAfter = adjustSaturate(glitterAfter, 2.0);
    glitterAfter = clamp(glitterAfter, 0.0, 1.0);

    // ── GLARE ────────────────────────────────────────
    // Much brighter, more silvery glare
    // CSS: radial-gradient from pointer
    // CSS: hsl(0, 0%, 80%) 10%, hsl(0, 0%, 50%) 70%
    // CSS: mix-blend-mode: multiply, filter: contrast(1.5)
    vec3 glareLight = vec3(5.0);   // Bright white center
    vec3 glareDark = vec3(0.85);   // Light gray edge

    float glareMix = smoothstep(0.0, 0.15, spotDist) + smoothstep(0.15, 0.8, spotDist);
    vec3 glare = mix(glareLight, glareDark, glareMix);

    glare = adjustContrast(glare, 1.1);
    glare = clamp(glare, 0.0, 1.0);

    // GLARE2 (foil overlay) - bright silvery base
    // CSS: white masked by foil with overlay blend
    vec3 glare2 = vec3(1.0);
    glare2 = adjustContrast(glare2, 1.0);
    glare2 = clamp(glare2, 0.0, 1.0);

    // ── Compose layers ───────────────────────────────
    vec3 base = cardColor.rgb;
    vec3 result = base;

    if (mask > 0.01) {
        // Add bright silvery base first
        vec3 silverBase = vec3(0.85);
        result = mix(result, blendOverlay(result, silverBase), mask * uCardOpacity * 0.3);

        // Apply fine diagonal line texture with hard-light blend (subtle)
        result = mix(result, blendHardLight(result, shineAfter), mask * uCardOpacity * 0.4);

        // Apply diagonal rainbow shine with overlay blend
        result = mix(result, blendOverlay(result, shineBefore), mask * uCardOpacity * 0.2);

        // Apply animated vertical sunpillars with plus-lighter blend
        result = mix(result, blendPlusLighter(result, sunpillars), mask * uCardOpacity * 0.1);

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
            result = mix(result, blendOverlay(result, glare2), foil * uCardOpacity * 0.4);
        }
    }

    // Overall brighter filter for silvery holographic effect
    // CSS: .card__shine filter: brightness(0.6) contrast(1.5) saturate(1)
    result = adjustBrightness(result, 0.6 + uCardOpacity * 0.2);
    result = adjustContrast(result, 1.5);
    result = adjustSaturate(result, 1.0);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
