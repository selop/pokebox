precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform vec2 uPointer;       // eye projected onto card UV (0-1)
uniform vec2 uBackground;    // constrained 0.37-0.63
uniform float uCardOpacity;  // holo intensity 0-1
uniform float uFade;         // overall card opacity 0-1 (for transitions)
uniform float uRotateX;      // rotation angle for gradient calculations
// Ultra Rare shader parameters
uniform float uBaseBrightness;
uniform float uShineBrightness;
uniform float uShineContrast;
uniform float uShineSaturation;
uniform float uShineAfterBrightness;
uniform float uShineAfterContrast;
uniform float uShineAfterSaturation;
uniform float uShineBaseBrightness;
uniform float uShineBaseContrast;
uniform float uShineBaseSaturation;
uniform float uGlareContrast;
uniform float uGlare2Contrast;
uniform float uRotateDelta;
uniform float uAngle1Mult;
uniform float uAngle2Mult;
uniform float uBgYMult1;
uniform float uBgYMult2;

varying vec2 vUv;

// ── Blend modes (matching CSS blend modes) ──────────
vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, base)
    );
}
vec3 blendHardLight(vec3 base, vec3 blend) {
    return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, blend)
    );
}
vec3 blendExclusion(vec3 base, vec3 blend) {
    return base + blend - 2.0 * base * blend;
}
vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
}
vec3 blendPlusLighter(vec3 base, vec3 blend) {
    return min(base + blend, vec3(1.0));
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

// ── Linear gradient helper (angled) ──────────────────
// CSS: linear-gradient with stops: black 24%, gray 30%, black 36%
vec3 linearGradient(vec2 uv, float angle, float offset) {
    float rad = angle * 3.14159 / 180.0;
    float coord = dot(uv - 0.5, vec2(cos(rad), sin(rad))) + 0.5;
    coord += offset;
    coord = fract(coord / 3.0); // 300% size, normalized to 0-1

    vec3 black = vec3(0.0);
    vec3 gray = vec3(0.2); // #797979

    // Three-part gradient: black -> gray -> black
    // Stops: black 24%, gray 30%, black 36%
    if (coord < 0.24) return black;
    if (coord < 0.30) return mix(black, gray, (coord - 0.24) / 0.06);
    if (coord < 0.36) return mix(gray, black, (coord - 0.30) / 0.06);
    return black;
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

    // ── Mask & textures ──────────────────────────────
    float mask = texture2D(uMaskTex, uv).r;
    vec3 foilTex = texture2D(uFoilTex, uv).rgb;
    float foil = texture2D(uFoilTex, uv).r;

    // Skip compositing if no effect present
    if (uCardOpacity < 0.01 || mask < 0.01) {
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
        return;
    }

    // ── Pointer-driven values ────────────────────────
    float bgY = uBackground.y;
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;

    // Radial spotlight from pointer
    float spotDist = length(uv - vec2(ptrX, ptrY));

    // ── SHINE LAYER (before): Simple gradient overlay ─
    // CSS: repeating-linear-gradient(15deg, var(--holo))
    // Since CSS just uses var(--holo) which is the same color, this is essentially a solid with overlay
    vec3 shineBefore = vec3(1.5); // neutral gray for overlay blend
    shineBefore = adjustBrightness(shineBefore, uShineBrightness);
    shineBefore = adjustContrast(shineBefore, uShineContrast);
    shineBefore = adjustSaturate(shineBefore, uShineSaturation);
    shineBefore = clamp(shineBefore, 0.0, 1.0);

    // ── SHINE LAYER (after): Angled gradients with exclusion ─
    // CSS: Two linear gradients at different angles
    float rotateDelta = uRotateDelta;
    float angle1 = (uRotateX - rotateDelta) * uAngle1Mult;
    float angle2 = (uRotateX - rotateDelta) * uAngle2Mult;

    // First gradient: angle1, position bgY * 1.7
    vec3 grad1 = linearGradient(uv, angle1, bgY * uBgYMult1);

    // Second gradient: angle2, position bgY * -1.3
    vec3 grad2 = linearGradient(uv, angle2, bgY * uBgYMult2);

    // Exclusion blend between gradients
    vec3 shineAfter = blendExclusion(grad1, grad2);
    shineAfter = adjustBrightness(shineAfter, uShineAfterBrightness);
    shineAfter = adjustContrast(shineAfter, uShineAfterContrast);
    shineAfter = adjustSaturate(shineAfter, uShineAfterSaturation);
    shineAfter = clamp(shineAfter, 0.0, 1.0);

    // ── GLARE: Radial gradient (multiply) ────────────
    vec3 glareCenter = vec3(0.8); // hsl(0, 0%, 80%)
    vec3 glareEdge = vec3(0.5);   // hsl(0, 0%, 50%)
    vec3 glare = mix(glareCenter, glareEdge, smoothstep(0.1, 0.7, spotDist));
    glare = adjustContrast(glare, uGlareContrast);
    glare = clamp(glare, 0.0, 1.0);

    // ── GLARE2: White with foil mask (overlay) ───────
    vec3 glare2 = vec3(1.0);
    glare2 = adjustContrast(glare2, uGlare2Contrast);
    glare2 = clamp(glare2, 0.0, 1.0);

    // ── Compose layers (matching CSS layer stack) ────
    vec3 result = cardColor.rgb;
    float effectStrength = mask * uCardOpacity;

    if (mask > 0.01) {
        // Base shine filter: brightness(.6) contrast(1.5) saturate(1)
        vec3 shineBase = result;
        shineBase = adjustBrightness(shineBase, uShineBaseBrightness);
        shineBase = adjustContrast(shineBase, uShineBaseContrast);
        shineBase = adjustSaturate(shineBase, uShineBaseSaturation);

        // Apply shine before (overlay)
        shineBase = mix(shineBase, blendOverlay(shineBase, shineBefore), effectStrength);

        // Apply shine after (hard-light)
        result = mix(result, blendHardLight(shineBase, shineAfter), effectStrength * uCardOpacity);
        
        // Apply glare (multiply)
        result = mix(result, blendMultiply(result, glare), effectStrength);

        // Apply glare2 (overlay) with foil mask
        result = mix(result, blendOverlay(result, glare2), foil * effectStrength);
    }

    // Apply overall base brightness
    result = adjustBrightness(result, uBaseBrightness);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
