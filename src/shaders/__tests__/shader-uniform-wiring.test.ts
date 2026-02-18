import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Verifies that configurable shader uniforms are wired consistently across:
 *   1. buildCard.ts  — STYLE_UNIFORMS  (initial value at material creation)
 *   2. useThreeScene.ts — watchUniform   (live updates from UI sliders)
 *
 * A mismatch means a uniform either has no initial value or won't respond to
 * slider changes at runtime (the exact bug this test was born from).
 */

const buildCardSrc = readFileSync(
  resolve(__dirname, '../../three/buildCard.ts'),
  'utf-8',
)
const threeSceneSrc = readFileSync(
  resolve(__dirname, '../../composables/useThreeScene.ts'),
  'utf-8',
)

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Extract per-style uniform names from STYLE_UNIFORMS in buildCard.ts.
 * Matches blocks like:
 *   'master-ball': [
 *     ['uFoo', 'configKey'],
 *     ...
 *   ],
 */
function parseBuildCardUniforms(): Record<string, string[]> {
  const result: Record<string, string[]> = {}

  // Match each style block: 'style-name': [ ... ]
  // Use \n\s*\], to match the closing bracket on its own line (avoids
  // stopping at ], inside sub-array entries like ['uFoo', 'key'],)
  const styleBlockRe = /'([a-z][-a-z]+)':\s*\[([\s\S]*?)\n\s*\],/g
  // Only search within STYLE_UNIFORMS
  const styleUniformsMatch = buildCardSrc.match(
    /const STYLE_UNIFORMS[\s\S]*?^}/m,
  )
  if (!styleUniformsMatch) return result
  const block = styleUniformsMatch[0]

  let m: RegExpExecArray | null
  while ((m = styleBlockRe.exec(block)) !== null) {
    const style = m[1]!
    const entries = m[2]!
    const uniforms: string[] = []
    const entryRe = /\['(u[A-Za-z0-9]+)',/g
    let e: RegExpExecArray | null
    while ((e = entryRe.exec(entries)) !== null) {
      uniforms.push(e[1]!)
    }
    result[style] = uniforms
  }
  return result
}

/**
 * Extract per-style uniform names from watchUniform maps in useThreeScene.ts.
 * Matches blocks like:
 *   // Master-ball shader parameters
 *   const masterBallUniformMap: [() => number, string][] = [
 *     [() => store.config.masterBallFoo, 'uFoo'],
 *     ...
 *   ]
 */
function parseThreeSceneWatchers(): Record<string, string[]> {
  const result: Record<string, string[]> = {}

  // Match: comment header → const name = [ ... ]
  // Use "= [" to skip past the type annotation brackets.
  // Use "\n  \]" (closing bracket on its own line) to avoid stopping at
  // the ] inside sub-array entries like [() => ..., 'uFoo'].
  const mapBlockRe =
    /\/\/\s*([\w-]+)\s+shader parameters\s*\n\s*const\s+\w+UniformMap.*=\s*\[([\s\S]*?)\n\s*\](?!,)/g

  let m: RegExpExecArray | null
  while ((m = mapBlockRe.exec(threeSceneSrc)) !== null) {
    const rawLabel = m[1]!.trim()
    const styleId = normaliseStyleId(rawLabel)
    const entries = m[2]!
    const uniforms: string[] = []
    // Match: , 'uUniformName'  (the uniform name after the getter in each entry)
    const entryRe = /,\s*'(u[A-Za-z0-9]+)'/g
    let e: RegExpExecArray | null
    while ((e = entryRe.exec(entries)) !== null) {
      uniforms.push(e[1]!)
    }
    result[styleId] = uniforms
  }
  return result
}

function normaliseStyleId(raw: string): string {
  // "Illustration-rare" → "illustration-rare", "Master-ball" → "master-ball", etc.
  return raw.toLowerCase().replace(/\s+/g, '-')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const buildCardUniforms = parseBuildCardUniforms()
const watcherUniforms = parseThreeSceneWatchers()

// Sanity: make sure parsers found something
describe('Shader uniform wiring — parser sanity', () => {
  it('should find styles in buildCard STYLE_UNIFORMS', () => {
    expect(Object.keys(buildCardUniforms).length).toBeGreaterThanOrEqual(4)
  })

  it('should find styles in useThreeScene watchUniform maps', () => {
    expect(Object.keys(watcherUniforms).length).toBeGreaterThanOrEqual(4)
  })
})

describe('Shader uniform wiring — buildCard ↔ useThreeScene consistency', () => {
  for (const [style, buildUniforms] of Object.entries(buildCardUniforms)) {
    const watchUniforms = watcherUniforms[style]

    // Skip styles that intentionally share watchers (e.g. ultra-rare watchers
    // also cover rainbow-rare through the same uniform names)
    if (!watchUniforms) continue

    it(`${style}: every STYLE_UNIFORMS entry should have a watchUniform watcher`, () => {
      const missing = buildUniforms.filter((u) => !watchUniforms.includes(u))
      if (missing.length > 0) {
        expect.fail(
          `${style}: uniforms in STYLE_UNIFORMS (buildCard.ts) but missing from ` +
            `watchUniform map (useThreeScene.ts):\n  ${missing.join(', ')}\n\n` +
            `This means slider changes won't update these uniforms at runtime.`,
        )
      }
    })

    it(`${style}: every watchUniform watcher should have a STYLE_UNIFORMS entry`, () => {
      const extra = watchUniforms.filter((u) => !buildUniforms.includes(u))
      if (extra.length > 0) {
        expect.fail(
          `${style}: uniforms in watchUniform map (useThreeScene.ts) but missing from ` +
            `STYLE_UNIFORMS (buildCard.ts):\n  ${extra.join(', ')}\n\n` +
            `This means the uniform has no initial value at material creation.`,
        )
      }
    })
  }
})
