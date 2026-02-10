precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
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
vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}
vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
}
vec3 blendLuminosity(vec3 base, vec3 blend) {
    // Simplified luminosity blend
    float baseLum = dot(base, vec3(0.2126, 0.7152, 0.0722));
    float blendLum = dot(blend, vec3(0.2126, 0.7152, 0.0722));
    return base + (blendLum - baseLum);
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

// ── Rainbow gradient (vertical repeating) ────────────
vec3 sunpillarGradient(float t) {
    float f = fract(t) * 6.0;
    int idx = int(floor(f));
    float blend = fract(f);
    vec3 c0 = getSunColor(idx);
    vec3 c1 = getSunColor(int(mod(float(idx + 1), 6.0)));
    return mix(c0, c1, blend);
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

    // Radial spotlight from pointer
    float spotDist = length(uv - vec2(ptrX, ptrY));
    float spotlight = 1.0 - smoothstep(0.0, 0.8, spotDist);

    // ── SHINE LAYER: Rainbow gradient (10deg angle) ──
    // CSS: repeating-linear-gradient(10deg, holo colors)
    float angle = 10.0 * 3.14159 / 180.0;
    float rainbowCoord = dot(uv - 0.5, vec2(cos(angle), sin(angle)));
    float rainbowT = (rainbowCoord * 2.5)
        + ((0.5 - bgX) * 0.5)
        + ((0.5 - bgY) * 0.5);
    vec3 rainbow = sunpillarGradient(rainbowT);

    // CSS: background-position based on pointer
    // CSS: background-size 400% 400%
    // CSS: background-blend-mode: overlay
    // CSS: filter: brightness(1.25) contrast(3) saturate(0.75)
    // CSS: mix-blend-mode: overlay
    vec3 shine = adjustBrightness(rainbow, 1.5);
    shine = adjustContrast(shine, 3.0);
    shine = adjustSaturate(shine, 0.75);
    shine = clamp(shine, 0.0, 1.0);

    // ── SHINE LAYER :before - Diagonal bars ──────────
    // CSS: Two repeating-linear-gradient layers with rotating angles
    // CSS: background-blend-mode: screen, mix-blend-mode: multiply
    float rotateX = (bgX - 0.5) * 180.0; // simulate --rotate-x
    float rotateDelta = (bgY - 0.5) * 90.0;

    float barAngle1 = ((rotateX - rotateDelta) * 0.25) * 3.14159 / 180.0;
    float barCoord1 = dot(uv, vec2(cos(barAngle1), sin(barAngle1)));
    float barT1 = fract((barCoord1 + bgY * 1.2) * 0.4); // 5% bar spacing ≈ 0.4 freq

    // Create bar pattern: dark -> gray -> light -> gray -> dark
    vec3 barBg = vec3(0.0);
    vec3 barColor = vec3(0.7);
    float barMix1 = smoothstep(0.25, 0.325, barT1) * (1.0 - smoothstep(0.35, 0.375, barT1));
    vec3 bars1 = mix(barBg, barColor, barMix1);

    // Second bar layer (inverted direction)
    float barAngle2 = ((rotateX - rotateDelta) * -0.25) * 3.14159 / 180.0;
    float barCoord2 = dot(uv, vec2(cos(barAngle2), sin(barAngle2)));
    float barT2 = fract((barCoord2 - bgY * 1.2) * 0.4);
    float barMix2 = smoothstep(0.25, 0.325, barT2) * (1.0 - smoothstep(0.35, 0.375, barT2));
    vec3 bars2 = mix(barBg, barColor, barMix2);

    // Combine bar layers with screen blend
    vec3 bars = blendScreen(bars1, bars2);

    // Apply bars to shine with multiply blend
    shine = blendMultiply(shine, vec3(1.0) - bars * 0.5);

    // ── SHINE LAYER :after - Radial glare ────────────
    // CSS: radial-gradient from pointer
    // CSS: mix-blend-mode: luminosity, filter: brightness(1) contrast(3)
    vec3 glareWhite = vec3(0.9, 0.9, 0.9);  // hsl(0, 0%, 90%, 0.8)
    vec3 glareMid = vec3(0.78);             // hsl(0, 0%, 78%, 0.1)
    vec3 glareDark = vec3(0.35);            // hsl(0, 0%, 35%)

    float glareMix1 = smoothstep(0.0, 0.25, spotDist);
    float glareMix2 = smoothstep(0.25, 0.9, spotDist);
    vec3 shineGlare = mix(glareWhite, glareMid, glareMix1);
    shineGlare = mix(shineGlare, glareDark, glareMix2);

    shineGlare = adjustBrightness(shineGlare, 1.0);
    shineGlare = adjustContrast(shineGlare, 3.0);
    shineGlare = clamp(shineGlare, 0.0, 1.0);

    // ── GLARE LAYER ──────────────────────────────────
    // CSS: .card__glare - radial gradient
    // CSS: opacity: calc(var(--card-opacity) * 0.8)
    // CSS: mix-blend-mode: overlay
    vec3 glareCenter = vec3(1.0, 1.0, 1.0);  // hsl(0, 0%, 100%, 0.8)
    vec3 glareMid2 = vec3(1.0, 1.0, 1.0);    // hsl(0, 0%, 100%, 0.65)
    vec3 glareEdge = vec3(0.0);               // hsl(0, 0%, 0%, 0.5)

    float glareDist1 = smoothstep(0.0, 0.1, spotDist);
    float glareDist2 = smoothstep(0.1, 0.2, spotDist);
    vec3 mainGlare = mix(glareCenter * 0.8, glareMid2 * 0.65, glareDist1);
    mainGlare = mix(mainGlare, glareEdge * 0.5, glareDist2);

    // ── GLARE :after - Colored radial ────────────────
    // CSS: radial-gradient with cyan tint
    // CSS: mix-blend-mode: overlay, filter: brightness(0.6) contrast(3)
    vec3 cyanGlare = vec3(0.95, 1.0, 1.0);   // hsl(180, 100%, 95%)
    vec3 grayGlare = vec3(0.39, 0.39, 0.39); // hsl(0, 0%, 39%, 0.25)
    vec3 blueGlare = vec3(0.82, 0.91, 0.97); // hsl(205.6, 50%, 90%, 0.5)

    float cyanMix1 = smoothstep(0.0, 0.05, spotDist);
    float cyanMix2 = smoothstep(0.05, 0.55, spotDist);
    vec3 glareAfter = mix(cyanGlare, grayGlare, cyanMix1);
    glareAfter = mix(glareAfter, blueGlare, cyanMix2);

    glareAfter = adjustBrightness(glareAfter, 0.6);
    glareAfter = adjustContrast(glareAfter, 3.0);
    glareAfter = clamp(glareAfter, 0.0, 1.0);

    // ── Compose layers ───────────────────────────────
    vec3 base = cardColor.rgb;
    vec3 result = base;

    // Apply shine with overlay blend
    if (mask > 0.01) {
        result = mix(result, blendOverlay(result, shine), mask * uCardOpacity);

        // Apply shine glare with luminosity blend
        result = mix(result, blendLuminosity(result, shineGlare), mask * uCardOpacity * 0.5);

        // Apply main glare with overlay blend
        result = mix(result, blendOverlay(result, mainGlare), mask * uCardOpacity * 0.8);

        // Apply glare:after with overlay blend
        result = mix(result, blendOverlay(result, glareAfter), mask * uCardOpacity * 0.6);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
