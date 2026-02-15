precision highp float;

uniform sampler2D uCardTex;
uniform sampler2D uNoiseTex;
uniform float uProgress;    // 0→1 overall activation
uniform float uTime;
uniform vec2 uPointer;

varying vec2 vUv;

#include "common/blend.glsl"
#include "common/rainbow.glsl"

void main() {
    vec4 cardColor = texture2D(uCardTex, vUv);
    vec3 base = cardColor.rgb;

    // ── Phase 1: Gold sweep (uProgress 0→0.5) ──────────
    float sweepT = clamp(uProgress * 2.0, 0.0, 1.0);

    // Gold overlay color: warm gold tinted with rainbow shimmer
    vec3 goldBase = vec3(1.0, 0.84, 0.3);
    vec3 rainbow = sunpillarGradient(vUv.y * 2.0 + uTime * 0.5);
    vec3 goldColor = mix(goldBase, rainbow, 0.35);

    // Subtle horizontal shimmer
    float shimmer = sin(vUv.x * 40.0 + uTime * 3.0) * 0.08;
    goldColor += shimmer;

    // Gold overlay composited on card
    vec3 goldOverlay = blendOverlay(base, goldColor);
    vec3 goldComposite = mix(base, goldOverlay, 0.65);

    // Sweep mask: below sweepT line shows gold, above shows plain card
    float sweepEdge = smoothstep(sweepT - 0.02, sweepT, vUv.y);
    vec3 sweepResult = mix(goldComposite, base, sweepEdge);

    // Bright edge glow at sweep line
    float edgeGlow = smoothstep(0.03, 0.0, abs(vUv.y - sweepT)) * sweepT;
    sweepResult += vec3(1.0, 0.95, 0.7) * edgeGlow * 0.8;

    // ── Phase 2: Gold fracture (uProgress 0.5→1.0) ─────
    float fractureT = clamp((uProgress - 0.5) * 2.0, 0.0, 1.0);

    // Sample noise for dissolve pattern
    float noiseVal = texture2D(uNoiseTex, vUv * 3.0).r;

    // Where noise < fractureT: gold dissolved → show base card
    // Where noise >= fractureT: gold still intact
    float goldMask = step(fractureT, noiseVal);

    // Sparks at fracture edge
    float edgeDist = abs(noiseVal - fractureT);
    float sparkEdge = smoothstep(0.04, 0.0, edgeDist) * fractureT;
    float sparkPulse = sin(uTime * 15.0 + noiseVal * 20.0) * 0.5 + 0.5;
    vec3 sparkColor = vec3(1.0, 0.92, 0.6) * sparkEdge * sparkPulse;

    // During phase 2, blend between gold composite and plain card via noise dissolve
    vec3 fractureResult = mix(base, sweepResult, goldMask) + sparkColor;

    // Final output: phase 1 only if fractureT == 0, otherwise use fracture
    vec3 finalColor = mix(sweepResult, fractureResult, step(0.001, fractureT));

    gl_FragColor = vec4(finalColor, cardColor.a);
}
