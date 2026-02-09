precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform sampler2D uBirthdayDankTex;      // Birthday holo dank texture
uniform sampler2D uBirthdayDank2Tex;     // Birthday holo dank 2 texture
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
vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}
vec3 blendDarken(vec3 base, vec3 blend) {
    return min(base, blend);
}
vec3 blendLighten(vec3 base, vec3 blend) {
    return max(base, blend);
}
vec3 blendHue(vec3 base, vec3 blend) {
    // Simplified hue blend - mix with reduced saturation
    return mix(base, blend, 0.5);
}
vec3 blendColorBurn(vec3 base, vec3 blend) {
    return 1.0 - min((1.0 - base) / max(blend, 0.001), vec3(1.0));
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

// ── Noise/grain texture ──────────────────────────────
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
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

    // ── Mask (white = effect areas) ──────────────────
    float mask = texture2D(uMaskTex, uv).r;

    // Skip compositing if no effect present
    if (uCardOpacity < 0.01 || mask < 0.01) {
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
        return;
    }

    // ── Pointer-driven offsets ───────────────────────
    float bgX = uBackground.x;
    float bgY = uBackground.y;
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;

    // Radial distance from pointer
    float spotDist = length(uv - vec2(ptrX, ptrY));
    float spotlight = 1.0 - smoothstep(0.0, 0.8, spotDist);

    // ── GLITTER LAYER ────────────────────────────────
    // Vertical repeating sunpillar gradient (matching illustration-rare)
    float glitterRainbowT = uv.y * 10.0
        + ((0.5 - bgY) * 3.5)
        + sin(uTime * 0.3) * 0.05;
    vec3 glitterRainbow = sunpillarGradient(glitterRainbowT);

    // Diagonal bars at 128.5deg (matching illustration-rare)
    float glitterBarAngle = 128.5 * 3.14159 / 180.0;
    float glitterBarCoord = dot(uv, vec2(cos(glitterBarAngle), sin(glitterBarAngle)));
    float glitterBarOffset = ((0.5 - bgX) * 1.65) + (bgY * 0.5);
    float glitterBarT = fract((glitterBarCoord + glitterBarOffset) * 4.0);
    float glitterBarIntensity = smoothstep(0.0, 0.7, glitterBarT) * (1.0 - smoothstep(0.28, 0.55, glitterBarT));
    vec3 glitterBarDark = vec3(0.055, 0.082, 0.18);    // #0e152e
    vec3 glitterBarBright = vec3(0.45, 0.76, 0.76);    // hsl(180, 29%, 66%)
    vec3 glitterBarColor = mix(glitterBarDark, glitterBarBright, glitterBarIntensity);

    // Combine rainbow with diagonal bars (hard-light blend)
    glitterRainbow = blendHardLight(glitterRainbow, glitterBarColor);

    // Apply spotlight
    glitterRainbow *= -0.5 + spotlight * 0.5;

    // Birthday dank textures (140% and 120% size)
    vec2 dankUV1 = uv * (1.0 / 1.6);  // 140% size = scale down UV
    vec2 dankUV2 = uv * (1.0 / 1.4);  // 120% size
    vec3 birthdayDank = texture2D(uBirthdayDankTex, dankUV1).rgb;
    vec3 birthdayDank2 = texture2D(uBirthdayDank2Tex, dankUV2).rgb;

    // Blend birthday textures into the rainbow base
    vec3 glitter = blendHue(glitterRainbow, birthdayDank);
    glitter = blendLighten(glitter, birthdayDank2);

    // CSS: filter: brightness(2) contrast(0.5) saturate(0.75)
    glitter = adjustBrightness(glitter, 2.0);
    glitter = adjustContrast(glitter, 0.5);
    glitter = adjustSaturate(glitter, 0.75);
    glitter = clamp(glitter, 0.0, 1.0);

    // ── SHINE LAYER :before ──────────────────────────
    // Grain texture
    vec2 grainUV = uv * 200.0;  // --imgsize: 200px
    float grain = noise(grainUV + uTime * 0.1);

    // Vertical rainbow gradient (200% x 700% = 3.5 repeats)
    float rainbowT = uv.y * 3.5 + bgY;
    vec3 rainbow = sunpillarGradient(rainbowT);

    // Diagonal bars (133deg)
    float barAngle = 133.0 * 3.14159 / 180.0;
    float barCoord = dot(uv, vec2(cos(barAngle), sin(barAngle)));
    float barT = fract((barCoord + bgX + bgY) * 3.0); // 300% x 100%

    // Bar pattern: #0e1221 -> cyan -> #0e1221
    vec3 barDark = vec3(0.055, 0.071, 0.129);    // #0e1221
    vec3 barLight = vec3(0.45, 0.76, 0.76);      // hsl(180, 10%, 60%) + hsl(180, 20.9%, 82.2%)
    float barMix = smoothstep(0.0, 0.028, barT) * (1.0 - smoothstep(0.035, 0.042, barT));
    vec3 bars = mix(barDark, barLight, barMix);

    // Radial gradient (darkening near pointer)
    vec3 radialDark = mix(
        vec3(0.1, 0.1, 0.1),   // 10% opacity black at center
        vec3(0.15),            // 15% at mid
        smoothstep(0.0, 0.12, spotDist)
    );
    radialDark = mix(radialDark, vec3(0.25), smoothstep(0.12, 1.2, spotDist));

    // Combine shine layers
    // CSS: background-blend-mode: screen, hue, hard-light
    vec3 shine = blendScreen(vec3(grain * 0.2), rainbow);
    shine = blendHue(shine, bars);
    shine = blendHardLight(shine, radialDark);

    // CSS: filter: brightness(1) contrast(1.5) saturate(2)
    shine = adjustBrightness(shine, 1.0);
    shine = adjustContrast(shine, 1.5);
    shine = adjustSaturate(shine, 2.0);
    shine = clamp(shine, 0.0, 1.0);

    // ── GLARE LAYERS ─────────────────────────────────
    // CSS: radial-gradient with color-burn blend
    vec3 glare1 = mix(
        vec3(0.4),  // hsl(0, 0%, 40%) at center
        vec3(0.54), // hsl(210, 3%, 54%) at mid
        smoothstep(0.0, 0.63, spotDist)
    );
    glare1 = mix(glare1, vec3(0.3), smoothstep(0.63, 1.5, spotDist));

    // CSS: filter: brightness(1.5) contrast(2)
    glare1 = adjustBrightness(glare1, 1.5);
    glare1 = adjustContrast(glare1, 2.0);
    glare1 = clamp(glare1, 0.0, 1.0);

    // CSS: opacity: calc(var(--card-opacity) * (var(--pointer-from-center) + 0.2))
    float glare1Opacity = uCardOpacity * (uPointerFromCenter + 0.2);

    // GLARE2 layer
    // CSS: radial-gradient with lighten blend
    vec3 glare2 = mix(
        vec3(0.9),  // hsl(0, 0%, 90%) at center
        vec3(0.2),  // hsl(0, 0%, 20%) at edge
        smoothstep(0.0, 0.1, spotDist)
    );
    glare2 = mix(glare2, vec3(0.0), smoothstep(0.1, 0.6, spotDist));

    // CSS: filter: brightness(1) contrast(1.4)
    glare2 = adjustBrightness(glare2, 1.0);
    glare2 = adjustContrast(glare2, 1.4);
    glare2 = clamp(glare2, 0.0, 1.0);

    // CSS: opacity: calc(var(--card-opacity) * var(--pointer-from-center) * 0.66)
    float glare2Opacity = uCardOpacity * uPointerFromCenter * 0.66;

    // ── Compose layers ───────────────────────────────
    vec3 base = cardColor.rgb;
    vec3 result = base;

    // Apply glitter with hard-light blend
    result = mix(result, blendHardLight(result, glitter), mask * uCardOpacity);

    // Apply shine with lighten blend
    result = mix(result, blendLighten(result, shine), mask * uCardOpacity);

    // Apply glare1 with color-burn blend
    result = mix(result, blendColorBurn(result, glare1), mask * glare1Opacity);

    // Apply glare2 with lighten blend
    result = mix(result, blendLighten(result, glare2), mask * glare2Opacity);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
