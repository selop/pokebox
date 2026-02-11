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

vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
}

vec3 blendPlusLighter(vec3 base, vec3 blend) {
    return min(base + blend, vec3(1.0));
}

vec3 blendLuminosity(vec3 base, vec3 blend) {
    float baseLum = dot(base, vec3(0.2126, 0.7152, 0.0722));
    float blendLum = dot(blend, vec3(0.2126, 0.7152, 0.0722));
    return base + (blendLum - baseLum);
}

vec3 blendDarken(vec3 base, vec3 blend) {
    return min(base, blend);
}

vec3 blendLighten(vec3 base, vec3 blend) {
    return max(base, blend);
}

vec3 blendHue(vec3 base, vec3 blend) {
    return mix(base, blend, 0.5);
}

vec3 blendColorBurn(vec3 base, vec3 blend) {
    return 1.0 - min((1.0 - base) / max(blend, 0.001), vec3(1.0));
}
