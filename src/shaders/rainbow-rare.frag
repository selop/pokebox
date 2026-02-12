precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uCardBackTex;
uniform sampler2D uMaskTex;
uniform sampler2D uFoilTex;
uniform sampler2D uIri7Tex;  // Iridescent glitter texture
uniform vec2 uPointer;       // eye projected onto card UV (0-1)
uniform vec2 uBackground;    // constrained 0.37-0.63
uniform float uCardOpacity;  // holo intensity 0-1
uniform float uFade;         // overall card opacity 0-1 (for transitions)
uniform float uRotateX;      // rotation angle for gradient calculations
// Rainbow Rare shader parameters
uniform float uBaseBrightness;
uniform float uShineBrightness;
uniform float uShineContrast;
uniform float uShineSaturation;
uniform float uShineBaseBrightness;
uniform float uShineBaseContrast;
uniform float uShineBaseSaturation;
uniform float uGlareContrast;
uniform float uGlare2Contrast;
// Metallic sparkle spotlight parameters
uniform float uSparkleIntensity;
uniform float uSparkleRadius;
uniform float uSparkleContrast;
uniform float uSparkleColorShift;

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

    // ── Mask & textures ──────────────────────────────
    float mask = texture2D(uMaskTex, uv).r;
    vec3 foilTex = texture2D(uFoilTex, uv).rgb;
    float foil = texture2D(uFoilTex, uv).r;

    // Skip compositing if no effect present
    if (uCardOpacity < 0.01 || mask < 0.01) {
        gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
        return;
    }

    // ── Pointer-driven values ────────────────────────
    float ptrX = uPointer.x;
    float ptrY = uPointer.y;

    // Radial spotlight from pointer
    float spotDist = length(uv - vec2(ptrX, ptrY));

    // ── METALLIC SPARKLE SPOTLIGHT ──────────────────────
    // Radial spotlight falloff from pointer
    float sparkleSpotlight = 1.0 - smoothstep(0.0, uSparkleRadius, spotDist);
    sparkleSpotlight = pow(sparkleSpotlight, 2.0); // Sharper falloff

    // Use foil texture for metallic pattern
    vec3 sparkleFoil = foilTex;

    // Enhance contrast for sparkle effect
    sparkleFoil = adjustContrast(sparkleFoil, uSparkleContrast);

    // Add color shift based on pointer position for iridescent effect
    vec3 sparkleColor = sparkleFoil;
    float colorPhase = atan(ptrY - uv.y, ptrX - uv.x) / 3.14159; // -1 to 1
    vec3 rainbow = vec3(
        0.5 + 0.5 * sin(colorPhase * 3.14159 * uSparkleColorShift),
        0.5 + 0.5 * sin(colorPhase * 3.14159 * uSparkleColorShift + 2.094),
        0.5 + 0.5 * sin(colorPhase * 3.14159 * uSparkleColorShift + 4.189)
    );
    sparkleColor = blendScreen(sparkleFoil, rainbow * 0.3);

    // Boost brightness for sparkle
    sparkleColor = adjustBrightness(sparkleColor, 3.0);
    sparkleColor = clamp(sparkleColor, 0.0, 1.0);

    // Combine with spotlight falloff
    vec3 metallic = sparkleColor * sparkleSpotlight * uSparkleIntensity;

    // ── SHINE LAYER: Simple gradient overlay ─────────
    vec3 shineBefore = vec3(1.5); // neutral gray for overlay blend
    shineBefore = adjustBrightness(shineBefore, uShineBrightness);
    shineBefore = adjustContrast(shineBefore, uShineContrast);
    shineBefore = adjustSaturate(shineBefore, uShineSaturation);
    shineBefore = clamp(shineBefore, 0.0, 1.0);

    // ── GLARE: Radial gradient (multiply) ────────────
    vec3 glareCenter = vec3(0.8); // hsl(0, 0%, 80%)
    vec3 glareEdge = vec3(0.5);   // hsl(0, 0%, 50%)
    vec3 glare = mix(glareCenter, glareEdge, smoothstep(0.1, 0.7, spotDist));
    glare = adjustContrast(glare, uGlareContrast);
    glare = clamp(glare, 0.0, 1.0);

    // ── GLARE2: White with foil mask (overlay) ───────
    vec3 glare2 = vec3(1.0);
    glare2 = adjustContrast(glare2, uGlare2Contrast);
    glare2 = clamp(glare2, 0.0, 1.0);

    // ── Compose layers ──────────────────────────────
    vec3 result = cardColor.rgb;
    float effectStrength = mask * uCardOpacity;

    if (mask > 0.01) {
        // Base shine filter
        vec3 shineBase = result;
        shineBase = adjustBrightness(shineBase, uShineBaseBrightness);
        shineBase = adjustContrast(shineBase, uShineBaseContrast);
        shineBase = adjustSaturate(shineBase, uShineBaseSaturation);

        // Apply shine (overlay)
        result = mix(shineBase, blendOverlay(shineBase, shineBefore), effectStrength);

        // Apply metallic sparkle spotlight (plus-lighter for bright sparkles)
        result = mix(result, blendPlusLighter(result, metallic), foil * effectStrength);

        // ── Iridescent glitter from iri-7 texture ──────────
        float glitterTileSize = 300.0 / 1024.0;
        vec2 tiledUV = fract(uv * (1.0 / glitterTileSize));
        vec3 glitter = texture2D(uIri7Tex, tiledUV).rgb;
        glitter = adjustContrast(glitter, 1.8);
        glitter = adjustSaturate(glitter, 2.5);
        glitter = clamp(glitter, 0.0, 1.0);
        result = mix(result, blendScreen(result, glitter), effectStrength * 0.33);

        // Apply glare (multiply)
        result = mix(result, blendMultiply(result, glare), effectStrength);

        // Apply glare2 (overlay) with foil mask
        result = mix(result, blendOverlay(result, glare2), foil * effectStrength);
    }

    // Apply overall base brightness
    result = adjustBrightness(result, uBaseBrightness);
    result = adjustContrast(result, 1.0);
    result = adjustSaturate(result, 1.0);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), cardColor.a * uFade);
}
