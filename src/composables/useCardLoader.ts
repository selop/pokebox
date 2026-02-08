import { shallowRef } from 'vue'
import { LinearFilter, LinearMipmapLinearFilter, TextureLoader } from 'three'
import type { Texture, WebGLRenderer } from 'three'
import { CARD_CATALOG } from '@/data/cardCatalog'

export function useCardLoader(renderer: WebGLRenderer) {
  const cardTexture = shallowRef<Texture | null>(null)
  const maskTexture = shallowRef<Texture | null>(null)
  const foilTexture = shallowRef<Texture | null>(null)
  const loader = new TextureLoader()

  function loadCard(id: string): Promise<void> {
    const entry = CARD_CATALOG.find((c) => c.id === id)
    if (!entry) return Promise.resolve()

    cardTexture.value = null
    maskTexture.value = null
    foilTexture.value = null

    const hasFoil = !!entry.foil
    const totalToLoad = hasFoil ? 3 : 2

    return new Promise<void>((resolve) => {
      let loaded = 0
      const onReady = () => {
        if (++loaded >= totalToLoad) resolve()
      }

      loader.load(entry.front, (tex) => {
        tex.minFilter = LinearMipmapLinearFilter
        tex.magFilter = LinearFilter
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
        cardTexture.value = tex
        onReady()
      })

      loader.load(entry.mask, (tex) => {
        tex.minFilter = LinearMipmapLinearFilter
        tex.magFilter = LinearFilter
        maskTexture.value = tex
        onReady()
      })

      if (hasFoil) {
        loader.load(entry.foil, (tex) => {
          tex.minFilter = LinearMipmapLinearFilter
          tex.magFilter = LinearFilter
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
          foilTexture.value = tex
          onReady()
        })
      }
    })
  }

  return { cardTexture, maskTexture, foilTexture, loadCard }
}
