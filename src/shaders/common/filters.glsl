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
