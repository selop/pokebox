varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform sampler2D uTexture;
uniform vec3 uColor;

#include "../_chunk/noise.glsl"
#include "../_chunk/cellNoise.glsl"

void main( void ) {
  vec2 uv = vUv;
  float n = noise(uv) * 0.1;
  vec3 cell = cellNoise(uv);
  vec2 textureUv = vec2(
    uv.x + cell.r * cos(uTime) * 0.03,
    uv.y + cell.g * sin(uTime) * 0.03
  );
  textureUv.x *= uAspect;
  vec4 texture = texture2D(uTexture, textureUv);
  vec3 distColor = vec3(texture.rgb * vec3(0.05) + vec3(n) + uColor);
  gl_FragColor = vec4(distColor,1.0);
}
