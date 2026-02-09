import { LinearFilter, LinearMipmapLinearFilter, TextureLoader } from 'three'
import type { Texture, WebGLRenderer } from 'three'
import { CARD_CATALOG } from '@/data/cardCatalog'

export interface CardTextures {
  card: Texture
  mask: Texture | null
  foil: Texture | null
}

export interface IriTextures {
  iri7: Texture
  iri8: Texture
  iri9: Texture
}

export interface BirthdayTextures {
  dank: Texture
  dank2: Texture
}

export function useCardLoader(renderer: WebGLRenderer) {
  const loaded = new Map<string, CardTextures>()
  const loader = new TextureLoader()
  let iriTextures: IriTextures | null = null
  let birthdayTextures: BirthdayTextures | null = null
  let glitterTexture: Texture | null = null

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

  function loadIriTextures(): Promise<IriTextures> {
    if (iriTextures) return Promise.resolve(iriTextures)

    return new Promise<IriTextures>((resolve) => {
      let count = 0
      let iri7: Texture | null = null
      let iri8: Texture | null = null
      let iri9: Texture | null = null

      const onReady = () => {
        if (++count >= 3) {
          iriTextures = { iri7: iri7!, iri8: iri8!, iri9: iri9! }
          resolve(iriTextures)
        }
      }

      loader.load('img/151/iri-7.webp', (tex) => {
        applyFilters(tex)
        iri7 = tex
        onReady()
      })

      loader.load('img/151/iri-8.webp', (tex) => {
        applyFilters(tex)
        iri8 = tex
        onReady()
      })

      loader.load('img/151/iri-9.webp', (tex) => {
        applyFilters(tex)
        iri9 = tex
        onReady()
      })
    })
  }

  function getIriTextures(): IriTextures | null {
    return iriTextures
  }

  function loadBirthdayTextures(): Promise<BirthdayTextures> {
    if (birthdayTextures) return Promise.resolve(birthdayTextures)

    return new Promise<BirthdayTextures>((resolve) => {
      let count = 0
      let dank: Texture | null = null
      let dank2: Texture | null = null

      const onReady = () => {
        if (++count >= 2) {
          birthdayTextures = { dank: dank!, dank2: dank2! }
          resolve(birthdayTextures)
        }
      }

      loader.load('img/151/birthday-holo-dank.webp', (tex) => {
        applyFilters(tex)
        dank = tex
        onReady()
      })

      loader.load('img/151/birthday-holo-dank-2.webp', (tex) => {
        applyFilters(tex)
        dank2 = tex
        onReady()
      })
    })
  }

  function getBirthdayTextures(): BirthdayTextures | null {
    return birthdayTextures
  }

  function loadGlitterTexture(): Promise<Texture> {
    if (glitterTexture) return Promise.resolve(glitterTexture)

    return new Promise<Texture>((resolve) => {
      loader.load('img/glitter.png', (tex) => {
        applyFilters(tex)
        tex.wrapS = tex.wrapT = 1000 // RepeatWrapping
        glitterTexture = tex
        resolve(glitterTexture)
      })
    })
  }

  function getGlitterTexture(): Texture | null {
    return glitterTexture
  }

  return { loadCard, loadCards, get, loadIriTextures, getIriTextures, loadBirthdayTextures, getBirthdayTextures, loadGlitterTexture, getGlitterTexture }
}
