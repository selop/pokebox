import { LinearFilter, LinearMipmapLinearFilter, TextureLoader } from 'three'
import type { Texture, WebGLRenderer } from 'three'
import { CARD_CATALOG } from '@/data/cardCatalog'
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
  let cardBackTexture: Texture | null = null

  function clearCache(): void {
    for (const textures of loaded.values()) {
      textures.card.dispose()
      textures.mask?.dispose()
      textures.foil?.dispose()
    }
    loaded.clear()
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

      tracedLoad(entry.front, `load-texture card-front ${id}`, (tex) => {
        applyFilters(tex, true)
        cardTex = tex
        onReady()
      })

      if (hasMask) {
        tracedLoad(
          entry.mask,
          `load-texture holo-mask ${id}`,
          (tex) => {
            applyFilters(tex)
            maskTex = tex
            onReady()
          },
          undefined,
          () => onReady(), // mask file missing — continue without it
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
          () => onReady(), // etch file missing — continue without it
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

  function loadSparkleIriTextures(): Promise<SparkleIriTextures> {
    if (sparkleIriTextures) return Promise.resolve(sparkleIriTextures)

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

      loader.load('img/151/iri-1.webp', (tex) => {
        applyFilters(tex)
        iri1 = tex
        onReady()
      })

      loader.load('img/151/iri-2.webp', (tex) => {
        applyFilters(tex)
        iri2 = tex
        onReady()
      })
    })
  }

  function getSparkleIriTextures(): SparkleIriTextures | null {
    return sparkleIriTextures
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

  function loadNoiseTexture(): Promise<Texture> {
    if (noiseTexture) return Promise.resolve(noiseTexture)

    return new Promise<Texture>((resolve) => {
      loader.load('img/151/noise-base.webp', (tex) => {
        applyFilters(tex)
        tex.wrapS = tex.wrapT = 1000 // RepeatWrapping
        noiseTexture = tex
        resolve(noiseTexture)
      })
    })
  }

  function getNoiseTexture(): Texture | null {
    return noiseTexture
  }

  function loadCardBackTexture(): Promise<Texture> {
    if (cardBackTexture) return Promise.resolve(cardBackTexture)

    return new Promise<Texture>((resolve) => {
      loader.load('img/card-back.png', (tex) => {
        applyFilters(tex, true)
        cardBackTexture = tex
        resolve(cardBackTexture)
      })
    })
  }

  function getCardBackTexture(): Texture | null {
    return cardBackTexture
  }

  return {
    loadCard,
    loadCards,
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
    loadCardBackTexture,
    getCardBackTexture,
  }
}
