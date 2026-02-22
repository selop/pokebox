import { describe, it, expect } from 'vitest'
import { SHADER_UNIFORM_REGISTRY, resolveConfigPath } from '@/data/shaderRegistry'
import { DEFAULT_CONFIG } from '@/data/defaults'

/**
 * Validates that every entry in SHADER_UNIFORM_REGISTRY resolves against
 * DEFAULT_CONFIG.shaders. Since both buildCard.ts (initial uniform values)
 * and useUniformWatchers.ts (reactive watcher bindings) derive from this
 * single registry, consistency is guaranteed by design.
 *
 * A failing test here means a registry configPath doesn't match the
 * corresponding key in defaults.ts — the uniform would get `undefined`
 * at material creation and slider changes would silently fail.
 */

describe('Shader uniform registry — sanity', () => {
  it('should have at least 4 shader styles registered', () => {
    const styles = Object.keys(SHADER_UNIFORM_REGISTRY)
    expect(styles.length).toBeGreaterThanOrEqual(4)
  })

  it('should have at least one uniform per registered style', () => {
    for (const [style, defs] of Object.entries(SHADER_UNIFORM_REGISTRY)) {
      expect(defs!.length, `${style} should have at least one uniform`).toBeGreaterThan(0)
    }
  })
})

describe('Shader uniform registry — config path resolution', () => {
  for (const [style, defs] of Object.entries(SHADER_UNIFORM_REGISTRY)) {
    if (!defs) continue

    for (const def of defs) {
      it(`${style}: ${def.uniform} (${def.configPath}) resolves to a number`, () => {
        const value = resolveConfigPath(DEFAULT_CONFIG.shaders, def.configPath)
        expect(typeof value, `${def.configPath} should resolve to a number`).toBe('number')
        expect(Number.isFinite(value), `${def.configPath} should be finite (got ${value})`).toBe(
          true,
        )
      })
    }
  }
})

describe('Shader uniform registry — uniform naming conventions', () => {
  for (const [style, defs] of Object.entries(SHADER_UNIFORM_REGISTRY)) {
    if (!defs) continue

    it(`${style}: all uniforms start with 'u' prefix`, () => {
      const bad = defs.filter((d) => !d.uniform.startsWith('u'))
      expect(bad, `Uniforms without 'u' prefix: ${bad.map((d) => d.uniform).join(', ')}`).toEqual(
        [],
      )
    })

    it(`${style}: no duplicate uniform names`, () => {
      const names = defs.map((d) => d.uniform)
      const dupes = names.filter((n, i) => names.indexOf(n) !== i)
      expect(dupes, `Duplicate uniforms: ${dupes.join(', ')}`).toEqual([])
    })

    it(`${style}: no duplicate config paths`, () => {
      const paths = defs.map((d) => d.configPath)
      const dupes = paths.filter((p, i) => paths.indexOf(p) !== i)
      expect(dupes, `Duplicate config paths: ${dupes.join(', ')}`).toEqual([])
    })
  }
})
