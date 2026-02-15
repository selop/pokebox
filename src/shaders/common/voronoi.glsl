// ── Voronoi cell functions for mosaic effects ──

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

vec2 voronoiCell(vec2 uv) {
    vec2 cell = floor(uv);
    vec2 frac = fract(uv);

    float minDist = 10.0;
    float cellID = 0.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 neighbor = vec2(float(i), float(j));
            vec2 point = hash2(cell + neighbor);
            vec2 diff = neighbor + point - frac;
            float dist = dot(diff, diff);
            if (dist < minDist) {
                minDist = dist;
                cellID = dot(cell + neighbor, vec2(7.0, 157.0));
            }
        }
    }

    return vec2(cellID, sqrt(minDist));
}

float cellHash(float id) {
    return fract(sin(id * 127.1) * 43758.5453);
}
