import { watch, type ShallowRef } from 'vue'
import { Mesh, ShaderMaterial } from 'three'
import type { useAppStore } from '@/stores/app'
import { SHADER_UNIFORM_REGISTRY, resolveConfigPath } from '@/data/shaderRegistry'

/**
 * Registers Vue watchers that push store config changes to shader uniforms
 * on all card meshes. Uses the shader registry as the single source of truth.
 */
export function useUniformWatchers(
  store: ReturnType<typeof useAppStore>,
  cardMeshes: ShallowRef<Mesh[]>,
): void {
  function pushUniform(uniformName: string, val: number) {
    for (const mesh of cardMeshes.value) {
      const mat = mesh.material as ShaderMaterial
      if (mat.isShaderMaterial && mat.uniforms[uniformName]) {
        mat.uniforms[uniformName]!.value = val
      }
    }
  }

  // Holo intensity (shared across all shader styles)
  watch(
    () => store.config.holoIntensity,
    (val) => pushUniform('uCardOpacity', val),
  )

  // Register a watcher for every uniform in the shader registry
  for (const defs of Object.values(SHADER_UNIFORM_REGISTRY)) {
    if (!defs) continue
    for (const def of defs) {
      watch(
        () => resolveConfigPath(store.config.shaders, def.configPath),
        (val) => pushUniform(def.uniform, val),
      )
    }
  }
}
