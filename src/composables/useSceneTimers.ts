import { watch } from 'vue'
import type { useAppStore } from '@/stores/app'
import type { CardNavigator } from '@/three/CardNavigator'
import { loadHeroCatalog } from '@/data/heroShowcase'

/**
 * Manages slideshow, carousel auto-advance, and hero showcase lifecycle timers.
 * Extracted from useThreeScene for single responsibility.
 */
export function useSceneTimers(
  store: ReturnType<typeof useAppStore>,
  cardNavigator: CardNavigator,
): { resetCarouselTimer: () => void; dispose: () => void } {
  let slideshowInterval: ReturnType<typeof setInterval> | null = null
  let carouselInterval: ReturnType<typeof setInterval> | null = null

  watch(
    () => store.isSlideshowActive,
    (active) => {
      if (slideshowInterval) {
        clearInterval(slideshowInterval)
        slideshowInterval = null
      }
      if (active) {
        slideshowInterval = setInterval(() => {
          cardNavigator.navigate(1)
        }, 3000)
      }
    },
  )

  function resetCarouselTimer() {
    if (carouselInterval) {
      clearInterval(carouselInterval)
      carouselInterval = null
    }
    if (store.cardDisplayMode === 'carousel') {
      carouselInterval = setInterval(() => {
        store.advanceCarousel(1)
      }, 4000)
    }
  }

  // Hero showcase: on desktop startup, load hero catalog and enter carousel mode
  watch(
    () => store.isHeroShowcaseActive,
    async (active) => {
      if (active) {
        const catalog = await loadHeroCatalog()
        store.carouselHeroCatalog = catalog
        store.cardDisplayMode = 'carousel'
      } else {
        if (carouselInterval) {
          clearInterval(carouselInterval)
          carouselInterval = null
        }
      }
    },
    { immediate: true },
  )

  // Watch carousel mode to manage auto-advance timer and ensure hero catalog is loaded
  watch(
    () => store.cardDisplayMode === 'carousel',
    async (isCarousel) => {
      if (carouselInterval) {
        clearInterval(carouselInterval)
        carouselInterval = null
      }
      if (isCarousel) {
        if (store.carouselHeroCatalog.length === 0) {
          const catalog = await loadHeroCatalog()
          store.carouselHeroCatalog = catalog
        }
        carouselInterval = setInterval(() => {
          store.advanceCarousel(1)
        }, 4000)
      }
    },
  )

  function dispose() {
    if (slideshowInterval) clearInterval(slideshowInterval)
    if (carouselInterval) clearInterval(carouselInterval)
  }

  return { resetCarouselTimer, dispose }
}
