precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform sampler2D uGrainTex;
uniform float uHasFoil;
uniform float uHasGrain;
uniform vec2 uPointer;
uniform vec2 uBackground;
uniform float uCardOpacity;
uniform float uTime;
uniform float uFade;

// Flatsilver-reverse specific uniforms
uniform float uRainbowScale;
uniform float uRainbowShift;
uniform float uRainbowSaturation;
uniform float uRainbowOpacity;
uniform float uSpotlightRadius;
uniform float uSpotlightIntensity;
uniform float uGrainScale;
uniform float uGrainIntensity;
uniform float uBaseBrightness;
uniform float uBaseContrast;
uniform float uBaseSaturation;

varying vec2 vUv;

#include "common/blend.glsl"
#include "common/filters.glsl"
#include "common/rainbow.glsl"

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
    // Mask already marks the reverse holo area (border/text = bright, artwork = dark)
    float mask = texture2D(uMaskTex, uv).r;
    float foil = uHasFoil > 0.5 ? texture2D(uFoilTex, uv).r : 0.0;

    // Skip compositing if no effect area
    float effectArea = max(mask, foil);
    if (uCardOpacity < 0.01 || effectArea < 0.01) {
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
        return;
    }

    // ── Pointer-driven spotlight ─────────────────────
    vec2 toPointer = uPointer - uv;
    float spotDist = length(toPointer);
    float spotlight = 1.0 - smoothstep(0.0, uSpotlightRadius, spotDist);
    spotlight = pow(spotlight, 1.5);

    // ── Rainbow gradient ─────────────────────────────
    // Smooth single-band rainbow that shifts with tilt and pointer
    float tiltOffset = (0.5 - uBackground.x) * uRainbowShift;
    float ptrOffset = (0.5 - uPointer.x) * uRainbowShift * 0.5;
    float rainbowT = uv.x * uRainbowScale + tiltOffset + ptrOffset
        + (0.5 - uBackground.y) * uRainbowShift * 0.3;
    vec3 rainbow = sunpillarGradient(rainbowT);

    // Desaturate to silvery tones
    rainbow = adjustSaturate(rainbow, uRainbowSaturation);
    rainbow = clamp(rainbow, 0.0, 1.0);

    // ── Grain texture with pseudo surface normals ────
    // Sample the grain texture (tiled) for surface roughness,
    // then use dFdx/dFdy as pseudo surface normals so the rainbow
    // follows the bumpy foil contours instead of appearing uniform.
    float grain = 0.0;
    float grainCatch = 0.0;
    if (uHasGrain > 0.5) {
        grain = texture2D(uGrainTex, uv * uGrainScale).r;

        // Surface gradient — approximates which direction each grain
        // bump "faces". Where the foil curves, the gradient points
        // along the slope so the rainbow band wraps around contours.
        vec2 grainGrad = vec2(dFdx(grain), dFdy(grain));

        // Tilt direction in UV space (centered at 0)
        vec2 tiltDir = vec2(uBackground.x - 0.5, uBackground.y - 0.5);

        // Dot product: grain facets whose gradient aligns with tilt catch light
        float catchAngle = dot(normalize(grainGrad + 0.001), normalize(tiltDir + 0.001));

        // Gradient magnitude gates the effect — flat grain areas
        // don't shimmer, only bumps with strong relief do
        float gradStrength = clamp(length(grainGrad) * 80.0, 0.0, 1.0);

        grainCatch = (0.5 + 0.5 * catchAngle) * gradStrength;
    }

    // ── Compose onto card ────────────────────────────
    vec3 result = cardColor.rgb;
    float effectStrength = mask * uCardOpacity;

    // Silver toning: darken and desaturate in mask areas.
    // The front texture has blown-out whites where foil covers on physical cards;
    // base adjustments bring these down to a flat silver tone.
    vec3 silverToned = adjustBrightness(result, uBaseBrightness);
    silverToned = adjustContrast(silverToned, uBaseContrast);
    silverToned = adjustSaturate(silverToned, uBaseSaturation);
    result = mix(result, silverToned, effectStrength);

    // Apply grain texture — adds bumpy surface detail to the silver foil
    if (uHasGrain > 0.5 && uGrainIntensity > 0.0) {
        float grainHighlight = grain * uGrainIntensity * effectStrength;
        result += grainHighlight;
    }

    // Rainbow overlay — spotlight reveals more colour under the pointer,
    // grain surface normals create per-texel shimmer variation
    float revealAmount = uRainbowOpacity * (0.3 + 0.7 * spotlight * uSpotlightIntensity);
    if (uHasGrain > 0.5 && foil > 0.5) {
        revealAmount *= (0.5 + grainCatch);
    }
    vec3 overlaid = blendOverlay(result, rainbow);
    result = mix(result, overlaid, effectStrength * revealAmount);

    // Foil emboss relief — dFdx/dFdy of foil as pseudo surface normals
    // so embossed contour edges (lightning bolt, etc.) catch light with tilt
    if (foil > 0.01) {
        vec2 foilGrad = vec2(dFdx(foil), dFdy(foil));
        vec2 tiltDir = vec2(uBackground.x - 0.5, uBackground.y - 0.5);
        float foilCatch = dot(normalize(foilGrad + 0.001), normalize(tiltDir + 0.001));
        float foilEdge = clamp(length(foilGrad) * 50.0, 0.0, 1.0);

        // Emboss edge highlights — contour edges facing the tilt glow
        float embossLight = (0.5 + 0.5 * foilCatch) * foilEdge;
        result += embossLight * foil * uCardOpacity * 1.2;

        // Embossed areas also get rainbow tint under spotlight
        vec3 foilOverlay = blendOverlay(result, rainbow);
        result = mix(result, foilOverlay, foil * uCardOpacity * spotlight * uSpotlightIntensity * 0.5);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
