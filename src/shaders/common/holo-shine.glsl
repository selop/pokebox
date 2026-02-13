// ── Classic TCG holo shine (mask-driven rainbow overlay) ──

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
    // Feathered mask threshold
    float holoMask = smoothstep(maskThreshold - 0.05, maskThreshold + 0.05, mask);
    if (holoMask < 0.01 || holoOpacity < 0.01) return base;

    // Rainbow gradient driven by tilt + pointer
    float tiltOffset = (0.5 - bgY) * rainbowShift;
    float ptrOffset = (0.5 - pointer.y) * 0.5;
    float rainbowT = uv.y * rainbowScale + tiltOffset + ptrOffset;
    vec3 rainbow = sunpillarGradient(rainbowT);

    // Pointer-following spotlight
    float spotDist = length(uv - pointer);
    float spotlight = 0.5 + (0.75 - smoothstep(0.1, 0.7, spotDist)) * 0.5;
    rainbow *= spotlight;

    return mix(base, blendOverlay(base, rainbow), holoMask * holoOpacity * cardOpacity);
}
