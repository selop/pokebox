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

// ── Hash function for noise ───────────────────────────
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// ── Metallic reflection color ─────────────────────────
vec3 metallicReflection(vec2 uv, vec2 pointer, float timeOffset) {
    // Calculate angle from pointer to current pixel
    vec2 toPixel = uv - pointer;
    float angle = atan(toPixel.y, toPixel.x);
    float dist = length(toPixel);

    // Anisotropic brushed metal effect
    float brushPattern = sin(angle * 8.0 + uv.x * 20.0) * 0.5 + 0.5;
    brushPattern = pow(brushPattern, 3.0);

    // Specular highlight
    float specular = 1.0 - smoothstep(0.0, 0.4, dist);
    specular = pow(specular, 2.0);

    // Fresnel-like edge brightening
    vec2 fromCenter = uv - vec2(0.5);
    float edgeDist = length(fromCenter);
    float fresnel = smoothstep(0.2, 0.7, edgeDist) * 0.3;

    // Metallic base color - cool silver with slight warmth
    vec3 metalBase = vec3(0.8, 0.82, 0.85);

    // Add specular highlights
    vec3 highlight = vec3(1.0) * specular;

    // Combine with brush pattern
    vec3 metal = metalBase * (0.6 + brushPattern * 0.4);
    metal += highlight * 0.8;
    metal += fresnel;

    // Subtle animated shimmer
    float shimmer = sin(uv.x * 30.0 + uv.y * 30.0 + timeOffset * 2.0) * 0.5 + 0.5;
    shimmer = pow(shimmer, 10.0) * 0.2;
    metal += shimmer;

    return metal;
}

// ── Blend modes ───────────────────────────────────────
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

float blendSoftLightF(float base, float blend) {
    return (blend < 0.5) ?
        (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) :
        (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
}

vec3 blendSoftLight(vec3 base, vec3 blend) {
    return vec3(
        blendSoftLightF(base.r, blend.r),
        blendSoftLightF(base.g, blend.g),
        blendSoftLightF(base.b, blend.b)
    );
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

    vec3 result = cardColor.rgb;


    // ── Foil effect with metallic treatment ───────────
    if (foil > 0.01) {
        vec3 foilMetallic = metallicReflection(uv, uPointer, uTime * 0.5);

        // Add fine grain to foil
        vec2 grainUV = floor(uv * 200.0) / 200.0;
        float grain = hash21(grainUV);
        foilMetallic *= 0.85 + grain * 0.15;

        // Directional highlight on foil
        vec2 toPointer = uPointer - uv;
        float spotDist = length(toPointer);
        float spotlight = 1.0 - smoothstep(0.0, 0.6, spotDist);
        foilMetallic *= 0.6 + spotlight * 0.4;

        vec3 foilBlend = blendOverlay(result, foilMetallic, foil * uCardOpacity * 0.7);
        result = mix(result, foilBlend, foil * uCardOpacity);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
