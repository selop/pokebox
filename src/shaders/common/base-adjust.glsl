// ── Base brightness / contrast / saturation adjustment ──

vec3 baseAdjust(vec3 c, float brightness, float contrast, float saturation) {
    c = adjustBrightness(c, brightness);
    c = adjustContrast(c, contrast);
    c = adjustSaturate(c, saturation);
    return c;
}
