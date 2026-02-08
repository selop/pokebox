import { LinearFilter, LinearMipmapLinearFilter, TextureLoader } from 'three'
import type { Texture, WebGLRenderer } from 'three'
import { CARD_CATALOG } from '@/data/cardCatalog'

export interface CardTextures {
  card: Texture
  mask: Texture | null
  foil: Texture | null
}

export function useCardLoader(renderer: WebGLRenderer) {
  const loaded = new Map<string, CardTextures>()
  const loader = new TextureLoader()

  function applyFilters(tex: Texture, aniso = false): void {
    tex.minFilter = LinearMipmapLinearFilter
    tex.magFilter = LinearFilter
    if (aniso) tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
  }

  function loadCard(id: string): Promise<void> {
    if (loaded.has(id)) return Promise.resolve()

    const entry = CARD_CATALOG.find((c) => c.id === id)
    if (!entry) return Promise.resolve()

    const hasFoil = !!entry.foil
    const totalToLoad = hasFoil ? 3 : 2

    return new Promise<void>((resolve) => {
      let count = 0
      let cardTex: Texture | null = null
      let maskTex: Texture | null = null
      let foilTex: Texture | null = null

      const onReady = () => {
        if (++count >= totalToLoad) {
          loaded.set(id, { card: cardTex!, mask: maskTex, foil: foilTex })
          resolve()
        }
      }

      loader.load(entry.front, (tex) => {
        applyFilters(tex, true)
        cardTex = tex
        onReady()
      })

      loader.load(entry.mask, (tex) => {
        applyFilters(tex)
        maskTex = tex
        onReady()
      })

      if (hasFoil) {
        loader.load(entry.foil, (tex) => {
          applyFilters(tex, true)
          foilTex = tex
          onReady()
        })
      }
    })
  }

  function loadCards(ids: string[]): Promise<void> {
    return Promise.all(ids.map(loadCard)).then(() => {})
  }

  function get(id: string): CardTextures | undefined {
    return loaded.get(id)
  }

  return { loadCard, loadCards, get }
}
