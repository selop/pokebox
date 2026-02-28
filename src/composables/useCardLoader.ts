import { LinearFilter, LinearMipmapLinearFilter, TextureLoader } from 'three'
import type { Texture, WebGLRenderer } from 'three'
import type { CardCatalogEntry } from '@/types'
import { CARD_CATALOG } from '@/data/cardCatalog'
import { HERO_ASSETS } from '@/data/heroAssets'
import { useAppStore } from '@/stores/app'
import { perfTracker } from '@/utils/perfTracker'
import { tracer } from '@/telemetry'
import { SpanStatusCode, context, trace } from '@opentelemetry/api'

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

export interface SparkleIriTextures {
  iri1: Texture
  iri2: Texture
}

export interface BirthdayTextures {
  dank: Texture
  dank2: Texture
}

export function useCardLoader(renderer: WebGLRenderer) {
  const loaded = new Map<string, CardTextures>()
  const loader = new TextureLoader()
  loader.setCrossOrigin('anonymous')
  let iriTextures: IriTextures | null = null
  let sparkleIriTextures: SparkleIriTextures | null = null
  let birthdayTextures: BirthdayTextures | null = null
  let glitterTexture: Texture | null = null
  let noiseTexture: Texture | null = null
  let grainTexture: Texture | null = null
  let cardBackTexture: Texture | null = null

  function clearCache(): void {
    for (const [key, textures] of loaded.entries()) {
      // Protect compound-keyed hero entries (setId:cardId) from cache clear
      if (key.includes(':')) continue
      textures.card.dispose()
      textures.mask?.dispose()
      textures.foil?.dispose()
      loaded.delete(key)
    }
  }

  function applyFilters(tex: Texture, aniso = false): void {
    tex.minFilter = LinearMipmapLinearFilter
    tex.magFilter = LinearFilter
    if (aniso) tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
  }

  function tracedLoad(
    url: string,
    spanName: string,
    onLoad: (tex: Texture) => void,
    onProgress?: undefined,
    onError?: () => void,
  ): void {
    const span = tracer.startSpan(spanName, { attributes: { 'http.url': url } })
    loader.load(
      url,
      (tex) => {
        span.end()
        onLoad(tex)
      },
      onProgress,
      (err) => {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })
        span.end()
        onError?.()
      },
    )
  }

  function loadCard(id: string): Promise<void> {
    if (loaded.has(id)) return Promise.resolve()

    const entry = CARD_CATALOG.value.find((c) => c.id === id)
    if (!entry) return Promise.resolve()

    // Use bundled hero textures when available (same-origin, SW-precached)
    const store = useAppStore()
    const hero = HERO_ASSETS[`${store.currentSetId}:${id}`]
    const frontUrl = hero?.front ?? entry.front
    const maskUrl = hero?.mask ?? entry.mask

    const hasMask = !!entry.mask
    const hasFoil = !!entry.foil
    const totalToLoad = 1 + (hasMask ? 1 : 0) + (hasFoil ? 1 : 0)

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

      tracedLoad(
        frontUrl,
        `load-texture card-front ${id}`,
        (tex) => {
          applyFilters(tex, true)
          cardTex = tex
          onReady()
        },
        undefined,
        () => {
          console.warn(`[useCardLoader] Failed to load front texture for card: ${entry.label ?? id}`)
          store.addToast(`Failed to load card asset: ${entry.label ?? id}`)
          onReady()
        },
      )

      if (hasMask) {
        tracedLoad(
          maskUrl,
          `load-texture holo-mask ${id}`,
          (tex) => {
            applyFilters(tex)
            maskTex = tex
            onReady()
          },
          undefined,
          () => {
            console.warn(`[useCardLoader] Failed to load mask texture for card: ${entry.label ?? id}`)
            store.addToast(`Failed to load card asset: ${entry.label ?? id}`)
            onReady()
          },
        )
      }

      if (hasFoil) {
        tracedLoad(
          entry.foil,
          `load-texture etch-foil ${id}`,
          (tex) => {
            applyFilters(tex, true)
            foilTex = tex
            onReady()
          },
          undefined,
          () => {
            console.warn(`[useCardLoader] Failed to load foil texture for card: ${entry.label ?? id}`)
            store.addToast(`Failed to load card asset: ${entry.label ?? id}`)
            onReady()
          },
        )
      }
    })
  }

  function loadCards(ids: string[]): Promise<void> {
    perfTracker.markAssetLoadStart()
    return tracer.startActiveSpan('load-card-set', (span) => {
      span.setAttribute('card.count', ids.length)
      return Promise.all(ids.map((id) => context.with(trace.setSpan(context.active(), span), () => loadCard(id)))).then(() => {
        perfTracker.markAssetLoadEnd()
        span.end()
      })
    })
  }

  /** Load a hero card using its full entry (bypasses CARD_CATALOG lookup). */
  function loadHeroCard(entry: CardCatalogEntry): Promise<void> {
    if (loaded.has(entry.id)) return Promise.resolve()

    const hasMask = !!entry.mask
    const hasFoil = !!entry.foil
    const totalToLoad = 1 + (hasMask ? 1 : 0) + (hasFoil ? 1 : 0)

    return new Promise<void>((resolve) => {
      let count = 0
      let cardTex: Texture | null = null
      let maskTex: Texture | null = null
      let foilTex: Texture | null = null

      const onReady = () => {
        if (++count >= totalToLoad) {
          loaded.set(entry.id, { card: cardTex!, mask: maskTex, foil: foilTex })
          resolve()
        }
      }

      const store = useAppStore()

      tracedLoad(
        entry.front,
        `load-texture hero-front ${entry.id}`,
        (tex) => {
          applyFilters(tex, true)
          cardTex = tex
          onReady()
        },
        undefined,
        () => {
          console.warn(`[useCardLoader] Failed to load front texture for hero card: ${entry.label ?? entry.id}`)
          store.addToast(`Failed to load card asset: ${entry.label ?? entry.id}`)
          onReady()
        },
      )

      if (hasMask) {
        tracedLoad(
          entry.mask,
          `load-texture hero-mask ${entry.id}`,
          (tex) => {
            applyFilters(tex)
            maskTex = tex
            onReady()
          },
          undefined,
          () => {
            console.warn(`[useCardLoader] Failed to load mask texture for hero card: ${entry.label ?? entry.id}`)
            store.addToast(`Failed to load card asset: ${entry.label ?? entry.id}`)
            onReady()
          },
        )
      }

      if (hasFoil) {
        tracedLoad(
          entry.foil,
          `load-texture hero-foil ${entry.id}`,
          (tex) => {
            applyFilters(tex, true)
            foilTex = tex
            onReady()
          },
          undefined,
          () => {
            console.warn(`[useCardLoader] Failed to load foil texture for hero card: ${entry.label ?? entry.id}`)
            store.addToast(`Failed to load card asset: ${entry.label ?? entry.id}`)
            onReady()
          },
        )
      }
    })
  }

  function loadHeroCards(entries: CardCatalogEntry[]): Promise<void> {
    return Promise.all(entries.map((e) => loadHeroCard(e))).then(() => {})
  }

  function get(id: string): CardTextures | undefined {
    return loaded.get(id)
  }

  function loadIriTextures(): Promise<IriTextures> {
    if (iriTextures) return Promise.resolve(iriTextures)

    const store = useAppStore()
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

      const onFail = (name: string) => () => {
        console.warn(`[useCardLoader] Failed to load texture: ${name}`)
        store.addToast(`Texture "${name}" could not be loaded`)
        onReady()
      }

      loader.load('img/151/iri-7.webp', (tex) => {
        applyFilters(tex)
        iri7 = tex
        onReady()
      }, undefined, onFail('iri-7.webp'))

      loader.load('img/151/iri-8.webp', (tex) => {
        applyFilters(tex)
        iri8 = tex
        onReady()
      }, undefined, onFail('iri-8.webp'))

      loader.load('img/151/iri-9.webp', (tex) => {
        applyFilters(tex)
        iri9 = tex
        onReady()
      }, undefined, onFail('iri-9.webp'))
    })
  }

  function getIriTextures(): IriTextures | null {
    return iriTextures
  }

  function loadSparkleIriTextures(): Promise<SparkleIriTextures> {
    if (sparkleIriTextures) return Promise.resolve(sparkleIriTextures)

    const store = useAppStore()
    return new Promise<SparkleIriTextures>((resolve) => {
      let count = 0
      let iri1: Texture | null = null
      let iri2: Texture | null = null

      const onReady = () => {
        if (++count >= 2) {
          sparkleIriTextures = { iri1: iri1!, iri2: iri2! }
          resolve(sparkleIriTextures)
        }
      }

      const onFail = (name: string) => () => {
        console.warn(`[useCardLoader] Failed to load texture: ${name}`)
        store.addToast(`Texture "${name}" could not be loaded`)
        onReady()
      }

      loader.load('img/151/iri-1.webp', (tex) => {
        applyFilters(tex)
        iri1 = tex
        onReady()
      }, undefined, onFail('iri-1.webp'))

      loader.load('img/151/iri-2.webp', (tex) => {
        applyFilters(tex)
        iri2 = tex
        onReady()
      }, undefined, onFail('iri-2.webp'))
    })
  }

  function getSparkleIriTextures(): SparkleIriTextures | null {
    return sparkleIriTextures
  }

  function loadBirthdayTextures(): Promise<BirthdayTextures> {
    if (birthdayTextures) return Promise.resolve(birthdayTextures)

    const store = useAppStore()
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

      const onFail = (name: string) => () => {
        console.warn(`[useCardLoader] Failed to load texture: ${name}`)
        store.addToast(`Texture "${name}" could not be loaded`)
        onReady()
      }

      loader.load('img/151/birthday-holo-dank.webp', (tex) => {
        applyFilters(tex)
        dank = tex
        onReady()
      }, undefined, onFail('birthday-holo-dank.webp'))

      loader.load('img/151/birthday-holo-dank-2.webp', (tex) => {
        applyFilters(tex)
        dank2 = tex
        onReady()
      }, undefined, onFail('birthday-holo-dank-2.webp'))
    })
  }

  function getBirthdayTextures(): BirthdayTextures | null {
    return birthdayTextures
  }

  function loadGlitterTexture(): Promise<Texture | null> {
    if (glitterTexture) return Promise.resolve(glitterTexture)

    const store = useAppStore()
    return new Promise<Texture | null>((resolve) => {
      loader.load(
        'img/glitter.png',
        (tex) => {
          applyFilters(tex)
          tex.wrapS = tex.wrapT = 1000 // RepeatWrapping
          glitterTexture = tex
          resolve(glitterTexture)
        },
        undefined,
        () => {
          console.warn('[useCardLoader] Failed to load texture: glitter.png')
          store.addToast('Texture "glitter.png" could not be loaded')
          resolve(null)
        },
      )
    })
  }

  function getGlitterTexture(): Texture | null {
    return glitterTexture
  }

  function loadNoiseTexture(): Promise<Texture | null> {
    if (noiseTexture) return Promise.resolve(noiseTexture)

    const store = useAppStore()
    return new Promise<Texture | null>((resolve) => {
      loader.load(
        'img/151/noise-base.webp',
        (tex) => {
          applyFilters(tex)
          tex.wrapS = tex.wrapT = 1000 // RepeatWrapping
          noiseTexture = tex
          resolve(noiseTexture)
        },
        undefined,
        () => {
          console.warn('[useCardLoader] Failed to load texture: noise-base.webp')
          store.addToast('Texture "noise-base.webp" could not be loaded')
          resolve(null)
        },
      )
    })
  }

  function getNoiseTexture(): Texture | null {
    return noiseTexture
  }

  function loadGrainTexture(): Promise<Texture | null> {
    if (grainTexture) return Promise.resolve(grainTexture)

    const store = useAppStore()
    return new Promise<Texture | null>((resolve) => {
      loader.load(
        'img/grain.webp',
        (tex) => {
          applyFilters(tex)
          tex.wrapS = tex.wrapT = 1000 // RepeatWrapping
          grainTexture = tex
          resolve(grainTexture)
        },
        undefined,
        () => {
          console.warn('[useCardLoader] Failed to load texture: grain.webp')
          store.addToast('Texture "grain.webp" could not be loaded')
          resolve(null)
        },
      )
    })
  }

  function getGrainTexture(): Texture | null {
    return grainTexture
  }

  function loadCardBackTexture(): Promise<Texture | null> {
    if (cardBackTexture) return Promise.resolve(cardBackTexture)

    const store = useAppStore()
    return new Promise<Texture | null>((resolve) => {
      loader.load(
        'img/card-back.webp',
        (tex) => {
          applyFilters(tex, true)
          cardBackTexture = tex
          resolve(cardBackTexture)
        },
        undefined,
        () => {
          console.warn('[useCardLoader] Failed to load texture: card-back.png')
          store.addToast('Texture "card-back.png" could not be loaded')
          resolve(null)
        },
      )
    })
  }

  function getCardBackTexture(): Texture | null {
    return cardBackTexture
  }

  return {
    loadCard,
    loadCards,
    loadHeroCard,
    loadHeroCards,
    get,
    clearCache,
    loadIriTextures,
    getIriTextures,
    loadSparkleIriTextures,
    getSparkleIriTextures,
    loadBirthdayTextures,
    getBirthdayTextures,
    loadGlitterTexture,
    getGlitterTexture,
    loadNoiseTexture,
    getNoiseTexture,
    loadGrainTexture,
    getGrainTexture,
    loadCardBackTexture,
    getCardBackTexture,
  }
}
