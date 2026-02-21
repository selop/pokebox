import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DataTexture, RGBAFormat, Scene, UnsignedByteType } from 'three'
import { CardSceneBuilder } from '../CardSceneBuilder'
import { CARD_CATALOG } from '@/data/cardCatalog'
import { DEFAULT_CONFIG, DEFAULT_CARD } from '@/data/defaults'
import type { CardCatalogEntry } from '@/types'
import type { useAppStore } from '@/stores/app'
import type { useCardLoader } from '@/composables/useCardLoader'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 1×1 black texture usable as a stand-in for card/mask/foil textures. */
function makeTex() {
  const t = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat, UnsignedByteType)
  t.needsUpdate = true
  return t
}

function makeCatalogEntry(
  id: string,
  holoType: CardCatalogEntry['holoType'] = 'illustration-rare',
): CardCatalogEntry {
  return {
    id,
    label: id,
    front: `fronts/${id}.webp`,
    mask: `masks/${id}.webp`,
    foil: '',
    holoType,
  }
}

const DIMS = {
  screenW: 0.3557,
  screenH: 0.2481,
  boxD: 0.2481 * 0.6,
  eyeDefaultZ: 0.6,
}

type MockStore = ReturnType<typeof useAppStore>
type MockLoader = ReturnType<typeof useCardLoader>

function makeStore(overrides: Partial<{
  cardDisplayMode: string
  displayCardIds: string[]
  config: typeof DEFAULT_CONFIG
  cardTransform: typeof DEFAULT_CARD
}>): MockStore {
  return {
    cardDisplayMode: 'single',
    displayCardIds: ['card-1'],
    config: { ...DEFAULT_CONFIG },
    cardTransform: { ...DEFAULT_CARD },
    dimensions: DIMS,
    singleCardSize: 0.85,
    ...overrides,
  } as unknown as MockStore
}

function makeLoader(cards: Record<string, { card: ReturnType<typeof makeTex>; mask: ReturnType<typeof makeTex> | null; foil: ReturnType<typeof makeTex> | null }>): MockLoader {
  return {
    get: vi.fn((id: string) => cards[id] ?? null),
    getIriTextures: vi.fn(() => ({ iri7: makeTex(), iri8: makeTex(), iri9: makeTex() })),
    getSparkleIriTextures: vi.fn(() => ({ iri1: makeTex(), iri2: makeTex() })),
    getBirthdayTextures: vi.fn(() => ({ dank: makeTex(), dank2: makeTex() })),
    getGlitterTexture: vi.fn(() => makeTex()),
    getNoiseTexture: vi.fn(() => makeTex()),
    getCardBackTexture: vi.fn(() => makeTex()),
  } as unknown as MockLoader
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CardSceneBuilder', () => {
  let scene: Scene

  beforeEach(() => {
    scene = new Scene()
    // Reset CARD_CATALOG to a known state
    CARD_CATALOG.value = []
  })

  // -----------------------------------------------------------------------
  // build() — basic routing
  // -----------------------------------------------------------------------
  describe('build', () => {
    it('returns empty array when cardLoader returns null', () => {
      const store = makeStore({})
      const builder = new CardSceneBuilder(store, () => null)

      const meshes = builder.build(scene, 0)
      expect(meshes).toEqual([])
      expect(scene.children.length).toBe(0)
    })

    it('delegates to single-card mode when cardDisplayMode is "single"', () => {
      const tex = makeTex()
      const loader = makeLoader({ 'card-1': { card: tex, mask: makeTex(), foil: null } })
      CARD_CATALOG.value = [makeCatalogEntry('card-1')]

      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      const meshes = builder.build(scene, 0)
      // Single mode with mask → composite + mask layer + card art = 3 meshes
      expect(meshes.length).toBe(3)
    })

  })

  // -----------------------------------------------------------------------
  // Single-card mode
  // -----------------------------------------------------------------------
  describe('single-card mode', () => {
    it('returns empty when displayCardIds is empty', () => {
      const loader = makeLoader({})
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: [] })
      const builder = new CardSceneBuilder(store, () => loader)

      expect(builder.build(scene, 0)).toEqual([])
    })

    it('returns empty when card textures are not loaded', () => {
      const loader = makeLoader({})
      CARD_CATALOG.value = [makeCatalogEntry('missing')]
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['missing'] })
      const builder = new CardSceneBuilder(store, () => loader)

      expect(builder.build(scene, 0)).toEqual([])
    })

    it('creates 1 mesh for card without effect textures (no mask, no foil)', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: null, foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      const meshes = builder.build(scene, 0)
      // Only card art layer
      expect(meshes.length).toBe(1)
      expect(scene.children.length).toBe(1)
    })

    it('creates 3 meshes for card with mask only (composite + mask + art)', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      const meshes = builder.build(scene, 0)
      expect(meshes.length).toBe(3)
      expect(scene.children.length).toBe(3)
    })

    it('creates 4 meshes for etched card (composite + foil + mask + art)', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1', 'master-ball')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: makeTex() } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      const meshes = builder.build(scene, 0)
      expect(meshes.length).toBe(4)
      expect(scene.children.length).toBe(4)
    })

    it('applies cardAngle + rotY to mesh rotation', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: null, foil: null } })
      const rotY = 45
      const store = makeStore({
        cardDisplayMode: 'single',
        displayCardIds: ['card-1'],
        cardTransform: { ...DEFAULT_CARD, rotY },
      })
      const builder = new CardSceneBuilder(store, () => loader)
      const cardAngle = 0.5

      const meshes = builder.build(scene, cardAngle)
      const expectedRotY = cardAngle + (rotY * Math.PI) / 180
      expect(meshes[0]!.rotation.y).toBeCloseTo(expectedRotY, 5)
    })

    it('positions card art at center when no effect textures', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: null, foil: null } })
      const store = makeStore({
        cardDisplayMode: 'single',
        displayCardIds: ['card-1'],
        cardTransform: { x: 0, y: 0, z: 0, rotY: 0 },
      })
      const builder = new CardSceneBuilder(store, () => loader)

      const meshes = builder.build(scene, 0)
      // centerX = 0, cy = 0, cz = 0, no offset when hasEffect is false
      expect(meshes[0]!.position.x).toBeCloseTo(0)
      expect(meshes[0]!.position.y).toBeCloseTo(0)
      expect(meshes[0]!.position.z).toBeCloseTo(0)
    })
  })

  // -----------------------------------------------------------------------
  // resolveExtraTextures (tested indirectly via loader calls)
  // -----------------------------------------------------------------------
  describe('extra texture resolution', () => {
    it('requests iri textures for special-illustration-rare cards', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1', 'special-illustration-rare')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      builder.build(scene, 0)
      expect(loader.getIriTextures).toHaveBeenCalled()
    })

    it('requests iri textures for ultra-rare cards', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1', 'ultra-rare')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      builder.build(scene, 0)
      expect(loader.getIriTextures).toHaveBeenCalled()
    })

    it('requests iri textures for rainbow-rare cards', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1', 'rainbow-rare')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      builder.build(scene, 0)
      expect(loader.getIriTextures).toHaveBeenCalled()
    })

    it('does not request iri textures for illustration-rare cards', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1', 'illustration-rare')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      builder.build(scene, 0)
      expect(loader.getIriTextures).not.toHaveBeenCalled()
    })

    it('requests birthday textures for double-rare cards', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1', 'double-rare')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      builder.build(scene, 0)
      expect(loader.getBirthdayTextures).toHaveBeenCalled()
    })

    it('does not request birthday textures for non-double-rare cards', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1', 'ultra-rare')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      builder.build(scene, 0)
      expect(loader.getBirthdayTextures).not.toHaveBeenCalled()
    })

    it('always requests glitter and cardBack textures', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      builder.build(scene, 0)
      expect(loader.getGlitterTexture).toHaveBeenCalled()
      expect(loader.getCardBackTexture).toHaveBeenCalled()
    })

    it('requests iri textures for rainbow-rare in single mode', () => {
      CARD_CATALOG.value = [makeCatalogEntry('card-1', 'rainbow-rare')]
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      builder.build(scene, 0)
      expect(loader.getIriTextures).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // getEffectiveShader (tested indirectly via fallback)
  // -----------------------------------------------------------------------
  describe('shader selection', () => {
    it('defaults to illustration-rare when card is not in catalog', () => {
      // Empty catalog — card won't be found
      CARD_CATALOG.value = []
      const loader = makeLoader({ 'card-1': { card: makeTex(), mask: makeTex(), foil: null } })
      const store = makeStore({ cardDisplayMode: 'single', displayCardIds: ['card-1'] })
      const builder = new CardSceneBuilder(store, () => loader)

      // Should not throw; falls back to 'illustration-rare' shader
      const meshes = builder.build(scene, 0)
      expect(meshes.length).toBeGreaterThan(0)
    })
  })

})
