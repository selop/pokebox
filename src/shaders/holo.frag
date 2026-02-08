precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uMaskTex;
uniform vec2 uPointer;       // eye projected onto card UV (0-1)
uniform vec2 uBackground;    // constrained 0.37-0.63
uniform float uPointerFromCenter; // 0-1
uniform float uCardOpacity;  // holo intensity 0-1
uniform float uTime;

varying vec2 vUv;

// ── Blend modes ──────────────────────────────────────
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
vec3 blendSoftLight(vec3 base, vec3 blend) {
    return (1.0 - 2.0 * blend) * base * base + 2.0 * blend * base;
}
vec3 blendHardLight(vec3 base, vec3 blend) {
    return blendOverlay(blend, base);
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
        gl_FragColor = cardColor;
        return;
    }

    // ── Mask (white = holo areas) ────────────────────
    float mask = texture2D(uMaskTex, uv).r;

    // Skip holo compositing if no effect or no mask
    if (uCardOpacity < 0.01 || mask < 0.01) {
        gl_FragColor = cardColor;
        return;
    }

    // ── Pointer-driven offsets ───────────────────────
    float bgX = uBackground.x;
    float bgY = uBackground.y;
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;

    // ── SHINE LAYER 1: Rainbow stripes (color-dodge) ─
    float rainbowSpeed = 2.6;
    float rainbowT = uv.y * 3.0
        + ((0.5 - bgY) * rainbowSpeed)
        + sin(uTime * 0.3) * 0.05;
    vec3 rainbow = sunpillarGradient(rainbowT);

    // Scanline overlay — fine horizontal lines
    float scanFreq = 200.0;
    float scan = smoothstep(0.3, 0.5, fract(uv.y * scanFreq));
    vec3 scanlines = mix(vec3(0.0), vec3(0.4), scan);
    rainbow = blendOverlay(rainbow, scanlines);

    // Diagonal bar pattern (133 deg)
    float barAngle = 133.0 * 3.14159 / 180.0;
    float barCoord = dot(uv, vec2(cos(barAngle), sin(barAngle)));
    float barOffset = ((0.5 - bgX) * 1.65) + (bgY * 0.5);
    float barT = fract((barCoord + barOffset) * 12.0);
    float bar = smoothstep(0.2, 0.25, barT) * (1.0 - smoothstep(0.35, 0.4, barT))
              + smoothstep(0.5, 0.55, barT) * (1.0 - smoothstep(0.85, 0.9, barT));
    vec3 barColor = mix(vec3(0.0), vec3(0.7), bar * 0.6);
    rainbow = blendScreen(rainbow, barColor);

    // Radial spotlight from pointer
    float spotDist = length(uv - vec2(ptrX, ptrY));
    float spotlight = 1.0 - smoothstep(0.0, 0.8, spotDist);
    rainbow *= 0.5 + spotlight * 0.5;

    // Filter: brightness(0.85) contrast(2.75) saturate(0.65)
    vec3 shine1 = adjustBrightness(rainbow, 0.85);
    shine1 = adjustContrast(shine1, 2.75);
    shine1 = adjustSaturate(shine1, 0.65);
    shine1 = clamp(shine1, 0.0, 1.0);

    // ── SHINE LAYER 2: Shifted copy (soft-light) ─────
    float rainbow2T = uv.y * 3.0
        + ((0.5 - bgY) * -1.8)
        + cos(uTime * 0.25) * 0.04;
    vec3 rainbow2 = sunpillarGradient(rainbow2T);

    // Different bar offset
    float barOffset2 = ((0.5 - bgX) * -0.9) - (bgY * 0.75);
    float barT2 = fract((barCoord + barOffset2) * 10.0);
    float bar2 = smoothstep(0.2, 0.25, barT2) * (1.0 - smoothstep(0.35, 0.4, barT2))
               + smoothstep(0.5, 0.55, barT2) * (1.0 - smoothstep(0.85, 0.9, barT2));
    rainbow2 = blendScreen(rainbow2, mix(vec3(0.0), vec3(0.7), bar2 * 0.5));
    rainbow2 *= 0.5 + spotlight * 0.5;

    // Filter: brightness(1.0) contrast(2.5) saturate(1.75)
    vec3 shine2 = adjustBrightness(rainbow2, 1.0);
    shine2 = adjustContrast(shine2, 2.5);
    shine2 = adjustSaturate(shine2, 1.75);
    shine2 = clamp(shine2, 0.0, 1.0);

    // ── GLARE: Radial white specular ─────────────────
    float glareDist = length(uv - vec2(ptrX, ptrY));
    float glareCore = smoothstep(0.6, 0.0, glareDist);
    float glareEdge = smoothstep(1.0, 0.3, glareDist) * 0.1;
    vec3 glare = vec3(glareCore * 0.9 + glareEdge);

    // Glare filter: brightness(0.8) contrast(1.5)
    glare = adjustBrightness(glare, 0.8);
    glare = adjustContrast(glare, 1.5);
    glare = clamp(glare, 0.0, 1.0);

    // ── Compose layers ───────────────────────────────
    vec3 base = cardColor.rgb;

    // Shine 1: color-dodge blend
    vec3 result = blendColorDodge(base, shine1 * mask * uCardOpacity);

    // Shine 2: soft-light blend
    vec3 shine2Masked = mix(vec3(0.5), shine2, mask * uCardOpacity);
    result = blendSoftLight(result, shine2Masked);

    // Glare: overlay blend
    vec3 glareMasked = mix(vec3(0.5), glare, mask * uCardOpacity * 0.8);
    result = blendOverlay(result, glareMasked);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a);
}
