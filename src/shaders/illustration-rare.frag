precision highp float;

uniform sampler2D uCardTex;
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
vec3 blendSoftLight(vec3 base, vec3 blend) {
    return (1.0 - 2.0 * blend) * base * base + 2.0 * blend * base;
}
vec3 blendHardLight(vec3 base, vec3 blend) {
    return blendOverlay(blend, base);
}
vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}
vec3 blendExclusion(vec3 base, vec3 blend) {
    return base + blend - 2.0 * base * blend;
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
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
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

    // ── Pointer-driven offsets ───────────────────────
    float bgX = uBackground.x;
    float bgY = uBackground.y;
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;

    // CSS: brightness(calc(pointer-from-center * 0.4 + 0.5))
    float ptrBrightness = uPointerFromCenter * 0.4 + 0.5;

    // Radial spotlight from pointer (shared by holo & foil)
    float spotDist = length(uv - vec2(ptrX, ptrY));
    float spotlight = 1.0 - smoothstep(0.0, 0.8, spotDist);

    // ── SHINE LAYER 1: Rainbow + bars (color-dodge) ──
    // CSS: repeating sunpillar gradient (0deg, 200% 700% ≈ 3.5 vertical repeats)
    float rainbowT = uv.y * 10.0
        + ((0.5 - bgY) * 3.5)
        + sin(uTime * 0.3) * 0.05;
    vec3 rainbow = sunpillarGradient(rainbowT);

    // CSS: repeating-linear-gradient(128.5deg, #0e152e → hsl(180,29%,66%) → #0e152e)
    float barAngle = 128.5 * 3.14159 / 180.0;
    float barCoord = dot(uv, vec2(cos(barAngle), sin(barAngle)));
    float barOffset = ((0.5 - bgX) * 1.65) + (bgY * 0.5);
    float barT = fract((barCoord + barOffset) * 4.0);
    // Narrow cyan band (0–32% of period), dark gap (32–100%)
    float barIntensity = smoothstep(0.0, 0.24, barT) * (1.0 - smoothstep(0.28, 0.55, barT));
    vec3 barDark = vec3(0.055, 0.082, 0.18);    // #0e152e
    vec3 barBright = vec3(0.45, 0.76, 0.76);    // hsl(180, 29%, 66%)
    vec3 barColor = mix(barDark, barBright, barIntensity);

    // CSS: background-blend-mode hard-light for bar layer
    rainbow = blendHardLight(rainbow, barColor);

    // Apply spotlight
    rainbow *= 0.5 + spotlight * 0.5;

    // CSS filter: brightness(pfc*0.4+0.5) contrast(2.5) saturate(0.66)
    vec3 shine1 = adjustBrightness(rainbow, ptrBrightness);
    shine1 = adjustContrast(shine1, 2.5);
    shine1 = adjustSaturate(shine1, 1.0);
    shine1 = clamp(shine1, 0.0, 1.0);

    // ── SHINE LAYER 2: Shifted copy (exclusion blend) ─
    // CSS :after: inverted positions, mix-blend-mode: exclusion
    float rainbow2T = uv.y * 8.0
        + ((0.5 - bgY) * -2.5)
        + cos(uTime * 0.25) * 0.04;
    vec3 rainbow2 = sunpillarGradient(rainbow2T);

    // Inverted bar offset
    float barOffset2 = ((0.5 - bgX) * -0.9) - (bgY * 0.75);
    float barT2 = fract((barCoord + barOffset2) * 4.0);
    float barIntensity2 = smoothstep(0.0, 0.24, barT2) * (1.0 - smoothstep(0.28, 0.55, barT2));
    vec3 barColor2 = mix(barDark, barBright, barIntensity2);
    rainbow2 = blendHardLight(rainbow2, barColor2);
    rainbow2 *= 0.5 + spotlight * 0.5;

    // CSS :after filter: brightness(pfc*0.4+0.5) contrast(1.66) saturate(1.0)
    vec3 shine2 = adjustBrightness(rainbow2, ptrBrightness);
    shine2 = adjustContrast(shine2, 1.66);
    shine2 = adjustSaturate(shine2, 1.0);
    shine2 = clamp(shine2, 0.0, 1.0);

    // ── GLARE: Warm-to-cool radial (hard-light) ─────
    // CSS: radial-gradient(farthest-corner at pointer,
    //   hsl(0,0%,75%) 5%, hsl(200,5%,35%) 70%, hsl(320,40%,10%) 150%)
    vec3 glareWhite = vec3(1.0);
    vec3 glareCool = vec3(0.32, 0.35, 0.37);
    vec3 glareWarm = vec3(0.14, 0.06, 0.10);
    float glareMix1 = smoothstep(0.0, 0.12, spotDist);
    float glareMix2 = smoothstep(0.12, 0.6, spotDist);
    vec3 glare = mix(glareWhite, glareCool, glareMix1);
    glare = mix(glare, glareWarm, glareMix2);

    // CSS filter: brightness(0.8)
    glare = adjustBrightness(glare, 1.0);
    glare = clamp(glare, 0.0, 1.0);

    // ── Compose layers ───────────────────────────────
    vec3 base = cardColor.rgb;
    vec3 result = base;

    // Holo mask layers (shine1 + shine2 + glare)
    if (mask > 0.01) {
        // Shine 1: color-dodge
        result = blendColorDodge(base, shine1 * mask * uCardOpacity);

        // Shine 2: exclusion (CSS :after mix-blend-mode)
        vec3 shine2Contrib = shine2 * mask * uCardOpacity;
        result = mix(result, blendExclusion(result, shine2Contrib), mask * uCardOpacity);

        // Glare: hard-light (CSS .card__glare mix-blend-mode)
        result = mix(result, blendHardLight(result, glare), mask * uCardOpacity * 0.8);
    }

    // ── FOIL: Etched foil shimmer ────────────────────
    if (foil > 0.01) {
        // Diagonal rainbow driven by UV and viewing angle
        float foilT = uv.y * 4.0 + uv.x * 3.0
            + ((0.5 - bgY) * 2.0)
            + ((0.5 - bgX) * 1.5)
            + sin(uTime * 0.15) * 0.03;
        vec3 foilColor = sunpillarGradient(foilT);

        // Spotlight modulation
        foilColor *= 0.1 + spotlight * 0.6;

        // High-frequency grain for etched texture
        vec2 grainUV = floor(uv * 250.0) / 250.0;
        float grain = fract(sin(dot(grainUV, vec2(12.9898, 78.233))) * 43758.5453);
        foilColor *= 0.8 + grain * 0.2;

        // Filter: subtler than main holo
        foilColor = adjustBrightness(foilColor, 0.75);
        foilColor = adjustContrast(foilColor, 2.0);
        foilColor = adjustSaturate(foilColor, 0.7);
        foilColor = clamp(foilColor, 0.0, 1.0);

        // Color-dodge blend for foil shimmer
        result = blendColorDodge(result, foilColor * foil * uCardOpacity * 0.5);

        // Subtle specular on foil areas
        vec3 foilGlare = mix(vec3(0.5), vec3(glare.r * 0.5 + 0.5), foil * uCardOpacity * 0.4);
        result = blendOverlay(result, foilGlare);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
