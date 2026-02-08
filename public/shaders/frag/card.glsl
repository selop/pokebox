#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
// --------------------------
varying vec2 vUv;
varying float vTime;
uniform float uProgress;
uniform float uClipNum;
uniform float uSplitNum;
uniform float uDissolveProgress;
uniform float uHover;
uniform float uSwitchPattern;
uniform vec2 uPointer;
uniform vec3 uEdgeColor;
uniform sampler2D uTextureBg;
uniform sampler2D uTextureCard;
uniform sampler2D uTextureColor;
uniform sampler2D uTextureHighlight;
uniform sampler2D uTextureNoise;
uniform sampler2D uPatternTexture;
uniform sampler2D uPatternEeveeTexture;
uniform sampler2D uDissolveTexture;

#include "../_chunk/blend/linear-dodge.glsl"
#include "../_chunk/blend/linear-burn.glsl"
#include "../_chunk/blend/add.glsl"
#include "../_chunk/blend/overlay.glsl"
#include "../_chunk/blend/phoenix.glsl"
#include "../_chunk/blend/linear-light.glsl"
#include "../_chunk/clipBorderRadius.glsl"
#include "../_chunk/rotate.glsl"
#include "../_chunk/PI.glsl"
// --------------------------
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
  vec2 uv = vUv;
  vec2 rotateUv = uv * rotate(PI * 0.2);

	mat3 scaleMat = mat3(
    1.0 / uSplitNum, 0.0, 0.0,
    0.0, 1.0, 0.0, 
    0.0, 0.0, 1.0
  );
  mat3 translateMat = mat3(
    1.0, 0.0, uClipNum - 1.0,
    0.0, 1.0, 0.0, 
    0.0, 0.0, 1.0
  );
  mat3 spriteMat = translateMat * scaleMat;
	vec3 spriteUv = vec3(uv, 1.0);
  spriteUv *= spriteMat;

  vec2 baseUv = uv;
	vec4 base = texture2D(uTextureCard, spriteUv.xy / spriteUv.z);

  vec2 backUv = vec2(1.0 - uv.x, uv.y);
  vec4 back = texture2D(uTextureBg, backUv);

  vec2 noiseUv = vec2(
    uv.x + 1.0 - uPointer.x * 0.02 - 0.02,
    uv.y + 1.0 - uPointer.y * 0.02 - 0.02
  );
  vec4 noise = texture2D(uTextureNoise, noiseUv);
  
  vec2 patternUv = vec2(
    uv.x + 1.0 - uPointer.x * 0.02 - 0.02,
    uv.y + 1.0 - uPointer.y * 0.02 - 0.02
  );
  vec4 pattern = texture2D(uPatternTexture, patternUv);
  vec4 patternEevee = texture2D(uPatternEeveeTexture, patternUv);

	pattern = mix(pattern, patternEevee, uSwitchPattern);

  float stepUv = 0.2;
  vec2 colorUv = vec2(
    rotateUv.x + (1.0 - uPointer.x * stepUv - stepUv),
    rotateUv.y + (1.0 - uPointer.y * stepUv - stepUv)
  );;
  colorUv += pattern.xy * 0.03;
  vec4 color = texture2D(uTextureColor, colorUv);
  color.rgb *= 0.8;

  vec2 colorUv2 = vec2(
    rotateUv.x - (1.0 + uPointer.x * stepUv - stepUv),
    (1.0 - rotateUv.y) - (1.0 + uPointer.y * stepUv - stepUv)
  );
  colorUv2 += pattern.xy * 0.03;
  vec4 color2 = texture2D(uTextureColor, colorUv2);
  color2.rgb *= 0.8;

  vec2 highlightUv = vec2(
    uv.x + 1.0 - uPointer.x - 1.0,
    uv.y + 1.0 - uPointer.y - 1.0
  );
  vec4 highlight = texture2D(uTextureHighlight, highlightUv);

  float pointerDistance = 1.0 - length(uPointer);

  float blendInterpolation1 = clamp(pointerDistance, 0.0, 1.0) - 0.5;
	blendInterpolation1 = clamp(blendInterpolation1, 0.0, 0.5);
  float blendInterpolation2 = clamp(1.0 - pointerDistance, 0.0, 1.0);

	vec4 blendColor1 = vec4(blendLinearLight(color.rgb, noise.rgb, blendInterpolation1), 1.0);
	vec4 blendColor2 = vec4(blendLinearLight(color2.rgb, noise.rgb, blendInterpolation1), 1.0);
  vec4 blendColor3 = vec4(blendPhoenix(base.rgb, blendColor1.rgb, blendInterpolation2), 1.0);
  vec4 blendColor4 = vec4(blendOverlay(blendColor3.rgb, blendColor2.rgb, blendInterpolation2), 1.0);
  vec4 blendColor5 = vec4(blendAdd(blendColor4.rgb, (highlight.rgb) - vec3(0.2), blendInterpolation2), 1.0);

  vec4 distFront = mix(base, blendColor5, uHover);
	vec4 distBack = back;

  vec4 diffuseColor = gl_FrontFacing ? distFront : distBack;

	float edgeWidth = 0.05;
	vec2 dissolveUv = uv;
	vec4 dissolveTexture = texture2D(uDissolveTexture, dissolveUv);
	float dissolveProgress = step(1.0 - uDissolveProgress, dissolveTexture.r);
	float edgeProgress = step(1.0 - (uDissolveProgress - edgeWidth), dissolveTexture.r);
	diffuseColor.rgb *= edgeProgress;
	if(diffuseColor.rgb == vec3(0.0) && edgeProgress < 1.0) diffuseColor.rgb = uEdgeColor;

	diffuseColor.a = dissolveProgress;

  if(!(clipBorderRadius(uv, vec2(1, 1.4), 6.0 * 0.01) > 0.0)) discard;

  // --------------------------

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecular;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + clearcoatSpecular * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}