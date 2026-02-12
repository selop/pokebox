precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform float uHasFoil;
uniform vec2 uPointer;
uniform float uCardOpacity;
uniform float uTime;
uniform float uFade;

// Reverse-holo specific uniforms
uniform float uShineIntensity;
uniform float uShineOpacity;
uniform float uShineColorR;
uniform float uShineColorG;
uniform float uShineColorB;
uniform float uSpecularRadius;
uniform float uSpecularPower;
uniform float uBaseBrightness;
uniform float uBaseContrast;
uniform float uBaseSaturation;

varying vec2 vUv;

#include "common/blend.glsl"
#include "common/filters.glsl"

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

    // ── Mask & foil textures ─────────────────────────
    float mask = texture2D(uMaskTex, uv).r;
    float foil = uHasFoil > 0.5 ? texture2D(uFoilTex, uv).r : 0.0;

    // Skip compositing if no effect present
    float effectArea = max(mask, foil);
    if (uCardOpacity < 0.01 || effectArea < 0.01) {
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
        return;
    }

    // ── Pointer-driven specular highlight ────────────
    vec2 toPointer = uPointer - uv;
    float spotDist = length(toPointer);

    // Primary specular: configurable radius and power
    float specular = 1.0 - smoothstep(0.0, uSpecularRadius, spotDist);
    specular = pow(specular, uSpecularPower * 0.5);

    // Broader secondary glow
    float glow = 1.0 - smoothstep(0.0, uSpecularRadius * 2.0, spotDist);
    glow = pow(glow, max(uSpecularPower * 0.5, 0.5)) * 0.5;

    float totalHighlight = specular + glow;

    // ── Build metallic shine layer ───────────────────
    vec3 shineColor = vec3(uShineColorR, uShineColorG, uShineColorB);

    // Modulate metallic layer by pointer proximity
    vec3 metallic = shineColor * (0.1 + totalHighlight * uShineIntensity);
    metallic = clamp(metallic, 0.0, 1.0);

    // ── Compose onto card ────────────────────────────
    vec3 result = cardColor.rgb;
    float effectStrength = effectArea * uCardOpacity;

    // Spotlight drives how much of the metallic overlay is visible:
    // base opacity away from cursor, ramping up under the pointer
    float spotlightReveal = uShineOpacity * (0.4 + 0.6 * totalHighlight);

    // Overlay blend the metallic layer onto card — stronger under cursor
    vec3 overlaid = blendOverlay(result, metallic);
    result = mix(result, overlaid, effectStrength * spotlightReveal);

    // Foil areas get extra metallic reveal under the spotlight
    if (mask > 0.01 && foil > 0.01) {
        vec3 foilOverlay = blendOverlay(result, metallic);
        result = mix(result, foilOverlay, mask * uCardOpacity * totalHighlight * uShineIntensity);
    }

    // Final brightness and saturation — fully configurable
    result = adjustBrightness(result, uBaseBrightness);
    result = adjustContrast(result, uBaseContrast);
    result = adjustSaturate(result, uBaseSaturation);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
