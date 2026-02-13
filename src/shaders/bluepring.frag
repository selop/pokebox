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

varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    // Back face: show card-back texture
    if (!gl_FrontFacing) {
        vec4 backColor = texture2D(uCardBackTex, uv);
        gl_FragColor = vec4(backColor.rgb, backColor.a * uFade);
        return;
    }

    // Base card
    vec4 cardColor = texture2D(uCardTex, uv);

    // Etch foil overlay
    if (uHasFoil > 0.5) {
        vec4 foilColor = texture2D(uFoilTex, uv);
        // Blend etch foil on top using alpha compositing
        float foilAlpha = foilColor.a * uCardOpacity * 0.3;
        cardColor.rgb = mix(cardColor.rgb, foilColor.rgb, foilAlpha);
    }

    gl_FragColor = vec4(cardColor.rgb, cardColor.a * uFade);
}