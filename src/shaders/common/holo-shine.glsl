// ── Voronoi (needed by holoShineMosaic) ──
#include "voronoi.glsl"

// ── Classic TCG holo shine (mask-driven rainbow overlay) ──

vec3 holoShineAngled(
    vec3 base,
    vec2 uv,
    vec2 pointer,
    float bgY,
    float mask,
    float maskThreshold,
    float rainbowScale,
    float rainbowShift,
    float holoOpacity,
    float cardOpacity,
    float angleDeg
) {
    // Feathered mask threshold
    float holoMask = smoothstep(maskThreshold - 0.05, maskThreshold + 0.05, mask);
    if (holoMask < 0.01 || holoOpacity < 0.01) return base;

    // Rainbow gradient along specified angle
    float angleRad = angleDeg * 3.14159265 / 180.0;
    vec2 dir = vec2(cos(angleRad), sin(angleRad));
    float tiltOffset = (0.5 - bgY) * rainbowShift;
    float ptrOffset = (0.5 - pointer.y) * 0.5;
    float rainbowT = dot(uv, dir) * rainbowScale + tiltOffset + ptrOffset;
    vec3 rainbow = sunpillarGradient(rainbowT);

    // Pointer-following spotlight
    float spotDist = length(uv - pointer);
    float spotlight = 0.5 + (0.75 - smoothstep(0.1, 0.7, spotDist)) * 0.5;
    rainbow *= spotlight;

    return mix(base, blendOverlay(base, rainbow), holoMask * holoOpacity * cardOpacity);
}

vec3 holoShine(
    vec3 base,
    vec2 uv,
    vec2 pointer,
    float bgY,
    float mask,
    float maskThreshold,
    float rainbowScale,
    float rainbowShift,
    float holoOpacity,
    float cardOpacity
) {
    return holoShineAngled(base, uv, pointer, bgY, mask, maskThreshold,
        rainbowScale, rainbowShift, holoOpacity, cardOpacity, 90.0);
}

vec3 holoShineMosaic(
    vec3 base,
    vec2 uv,
    vec2 pointer,
    float bgY,
    float mask,
    float maskThreshold,
    float rainbowScale,
    float rainbowShift,
    float holoOpacity,
    float cardOpacity,
    float angleDeg,
    float mosaicScale,
    float mosaicIntensity,
    float mosaicSaturation,
    float mosaicContrast
) {
    // Feathered mask threshold
    float holoMask = smoothstep(maskThreshold - 0.05, maskThreshold + 0.05, mask);
    if (holoMask < 0.01 || holoOpacity < 0.01) return base;

    // Rainbow gradient along specified angle
    float angleRad = angleDeg * 3.14159265 / 180.0;
    vec2 dir = vec2(cos(angleRad), sin(angleRad));
    float tiltOffset = (0.5 - bgY) * rainbowShift;
    float ptrOffset = (0.5 - pointer.y) * 0.5;
    float rainbowT_base = dot(uv, dir) * rainbowScale + tiltOffset + ptrOffset;

    // Mosaic only on darker mask areas (etch islands), not pure white
    float mosaicMask = 1.0 - smoothstep(0.8, 1.0, mask);
    float effectiveMosaic = mosaicIntensity * mosaicMask;

    // Voronoi mosaic: per-cell random phase offset
    vec2 vr = voronoiCell(uv * mosaicScale);
    float cellPhaseOffset = cellHash(vr.x) * 6.0;
    float rainbowT_mosaic = rainbowT_base + cellPhaseOffset;

    // Blend between uniform and mosaic
    float rainbowT = mix(rainbowT_base, rainbowT_mosaic, effectiveMosaic);
    vec3 rainbow = sunpillarGradient(rainbowT);

    // Apply saturation and contrast to mosaic rainbow
    rainbow = adjustSaturate(rainbow, mosaicSaturation);
    rainbow = adjustContrast(rainbow, mosaicContrast);
    rainbow = clamp(rainbow, 0.0, 1.0);

    // Pointer-following spotlight
    float spotDist = length(uv - pointer);
    float spotlight = 0.5 + (0.75 - smoothstep(0.1, 0.7, spotDist)) * 0.5;
    rainbow *= spotlight;

    return mix(base, blendOverlay(base, rainbow), holoMask * holoOpacity * cardOpacity);
}
