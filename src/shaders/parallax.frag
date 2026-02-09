precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform float uHasFoil;
uniform vec2 uPointer;
uniform vec2 uBackground;
uniform float uPointerFromCenter;
uniform float uCardOpacity;
uniform float uTime;
uniform float uFade;

varying vec2 vUv;

const float PI = 3.14159265359;

// ── UV rotation (from reference rotate.glsl) ──────────
mat2 rotate(float rad) {
    float c = cos(rad);
    float s = sin(rad);
    return mat2(c, s, -s, c);
}

// ── Procedural noise ──────────────────────────────────
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    v += 0.5 * valueNoise(p);
    v += 0.25 * valueNoise(p * 2.0 + vec2(1.7, 9.2));
    return v / 0.75;
}

// ── Procedural rainbow gradient ───────────────────────
vec3 rainbowGradient(vec2 uv, vec2 pointer, float timeOffset) {
    float t = uv.x * 0.7 + uv.y * 0.3 + pointer.x * 0.3 + pointer.y * 0.2 + timeOffset;
    vec3 col;
    col.r = 0.5 + 0.5 * sin(t * 6.2832 + 0.0);
    col.g = 0.5 + 0.5 * sin(t * 6.2832 + 2.094);
    col.b = 0.5 + 0.5 * sin(t * 6.2832 + 4.189);
    return col;
}

// ── Blend modes (from reference blend chain) ──────────
float blendLinearLightF(float base, float blend) {
    return blend < 0.5
        ? max(base + 2.0 * blend - 1.0, 0.0)
        : min(base + 2.0 * (blend - 0.5), 1.0);
}

vec3 blendLinearLight(vec3 base, vec3 blend) {
    return vec3(
        blendLinearLightF(base.r, blend.r),
        blendLinearLightF(base.g, blend.g),
        blendLinearLightF(base.b, blend.b)
    );
}

vec3 blendLinearLight(vec3 base, vec3 blend, float opacity) {
    return blendLinearLight(base, blend) * opacity + base * (1.0 - opacity);
}

vec3 blendPhoenix(vec3 base, vec3 blend) {
    return min(base, blend) - max(base, blend) + vec3(1.0);
}

vec3 blendPhoenix(vec3 base, vec3 blend, float opacity) {
    return blendPhoenix(base, blend) * opacity + base * (1.0 - opacity);
}

float blendOverlayF(float base, float blend) {
    return base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
    return vec3(
        blendOverlayF(base.r, blend.r),
        blendOverlayF(base.g, blend.g),
        blendOverlayF(base.b, blend.b)
    );
}

vec3 blendOverlay(vec3 base, vec3 blend, float opacity) {
    return blendOverlay(base, blend) * opacity + base * (1.0 - opacity);
}

vec3 blendAdd(vec3 base, vec3 blend, float opacity) {
    return min(base + blend, vec3(1.0)) * opacity + base * (1.0 - opacity);
}

void main() {
    vec2 uv = vUv;

    vec4 cardColor = texture2D(uCardTex, uv);

    if (!gl_FrontFacing) {
        vec4 backColor = texture2D(uCardBackTex, uv);
        gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
        return;
    }

    float mask = texture2D(uMaskTex, uv).r;
    float foil = uHasFoil > 0.5 ? texture2D(uFoilTex, uv).r : 0.0;

    if (uCardOpacity < 0.01 || (mask < 0.01 && foil < 0.01)) {
        vec4 backColor = texture2D(uCardBackTex, uv);
        gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
        return;
    }

    // ── Pointer-parallax UV shifts ─────────────────────
    float parallaxStrength = 0.02;
    vec2 shiftedUv = vec2(
        uv.x + 1.0 - uPointer.x * parallaxStrength - parallaxStrength,
        uv.y + 1.0 - uPointer.y * parallaxStrength - parallaxStrength
    );

    vec2 rotatedUv = uv * rotate(PI * 0.2);

    // ── Procedural noise ───────────────────────────────
    vec3 noise = vec3(fbm(shiftedUv * 8.0 + uTime * 0.1));

    // ── Color layers with parallax offset ──────────────
    float stepUv = 0.2;
    vec2 colorUv1 = vec2(
        rotatedUv.x + (1.0 - uPointer.x * stepUv - stepUv),
        rotatedUv.y + (1.0 - uPointer.y * stepUv - stepUv)
    );
    vec3 color1 = rainbowGradient(colorUv1, uPointer, sin(uTime * 0.2) * 0.1) * 0.8;

    vec2 colorUv2 = vec2(
        rotatedUv.x - (1.0 + uPointer.x * stepUv - stepUv),
        (1.0 - rotatedUv.y) - (1.0 + uPointer.y * stepUv - stepUv)
    );
    vec3 color2 = rainbowGradient(colorUv2, uPointer, cos(uTime * 0.15) * 0.1) * 0.8;

    // ── Radial highlight from pointer ──────────────────
    float highlightDist = length(uv - uPointer);
    vec3 highlight = vec3(smoothstep(0.8, 0.0, highlightDist) * 0.6);

    // ── Blend chain: linearLight → phoenix → overlay → add
    float blendInterp1 = clamp(1.0 - uPointerFromCenter - 0.5, 0.0, 0.5);
    float blendInterp2 = clamp(uPointerFromCenter, 0.0, 1.0);

    vec3 blend1 = blendLinearLight(color1, noise, blendInterp1);
    vec3 blend2 = blendLinearLight(color2, noise, blendInterp1);
    vec3 blend3 = blendPhoenix(cardColor.rgb, blend1, blendInterp2);
    vec3 blend4 = blendOverlay(blend3, blend2, blendInterp2);
    vec3 blend5 = blendAdd(blend4, highlight - vec3(0.2), blendInterp2);

    // ── Apply with mask ────────────────────────────────
    vec3 result = cardColor.rgb;

    if (mask > 0.01) {
        result = mix(cardColor.rgb, blend5, mask * uCardOpacity);
    }

    // ── Foil: parallax-shifted rainbow with grain ──────
    if (foil > 0.01) {
        vec2 foilShiftedUv = vec2(
            uv.x + 1.0 - uPointer.x * 0.015 - 0.015,
            uv.y + 1.0 - uPointer.y * 0.015 - 0.015
        );
        vec3 foilColor = rainbowGradient(foilShiftedUv, uPointer, uTime * 0.05);

        vec2 grainUV = floor(uv * 250.0) / 250.0;
        float grain = hash21(grainUV);
        foilColor *= 0.8 + grain * 0.2;

        float spotDist = length(uv - uPointer);
        float spotlight = 1.0 - smoothstep(0.0, 0.8, spotDist);
        foilColor *= 0.4 + spotlight * 0.6;

        vec3 foilBlend = blendLinearLight(result, foilColor, foil * uCardOpacity * 0.5);
        result = mix(result, foilBlend, foil * uCardOpacity);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
