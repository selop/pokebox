<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useFullscreen } from '@/composables/useFullscreen'
import { CARD_CATALOG } from '@/data/cardCatalog'

const store = useAppStore()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

const shareToast = ref(false)

function onCardChange(e: Event) {
  store.stopHeroShowcase()
  store.currentCardId = (e.target as HTMLSelectElement).value
}

function onDisplayModeChange(e: Event) {
  store.stopHeroShowcase()
  store.cardDisplayMode = (e.target as HTMLSelectElement).value as
    | 'single'
    | 'fan'
    | 'carousel'
    | 'stack'
}

async function copyToClipboard(url: string) {
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // Clipboard API blocked (e.g. PWA standalone) — legacy fallback
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  shareToast.value = true
  setTimeout(() => (shareToast.value = false), 2000)
}

async function shareCard() {
  const url = store.shareUrl()
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Pokebox', url })
    } catch (err) {
      // User cancelled — do nothing; any other error — fall back to clipboard
      if (err instanceof DOMException && err.name === 'AbortError') return
      await copyToClipboard(url)
    }
  } else {
    await copyToClipboard(url)
  }
}

const displayModes = [
  { value: 'single', label: '\u25A3 Single' },
  { value: 'fan', label: '\u{1F0CF} Fan' },
  { value: 'carousel', label: '\u{1F3A0} Carousel' },
]
</script>

<template>
  <div class="toolbar">
    <!-- Zone Left: Navigation -->
    <div class="zone zone-left">
      <select
        v-if="store.cardDisplayMode === 'single'"
        class="toolbar-select card-select mobile-order-1"
        :disabled="store.setLoading"
        :value="store.currentCardId"
        @change="onCardChange"
      >
        <option v-for="card in CARD_CATALOG" :key="card.id" :value="card.id">
          {{ card.label }}
        </option>
      </select>
      <span v-if="store.setLoading" class="toolbar-loading">Loading...</span>
      <button
        class="toolbar-btn mobile-order-5 mobile-hide-packs"
        title="Open Booster Packs"
        @click="store.toggleBoosterModal()"
      >
        &#x1F4E6; Packs
      </button>
      <select
        v-if="store.sceneMode === 'cards' && !store.isMobile"
        class="toolbar-select"
        :value="store.cardDisplayMode"
        @change="onDisplayModeChange"
      >
        <option v-for="mode in displayModes" :key="mode.value" :value="mode.value">
          {{ mode.label }}
        </option>
      </select>
      <button
        v-if="store.sceneMode === 'furniture'"
        class="toolbar-btn"
        @click="store.randomizeSeed()"
      >
        &#x26A1; Randomize Interior
      </button>
    </div>

    <div class="mobile-row-break" />

    <!-- Zone Right: View & Settings -->
    <div class="zone zone-right">
      <button
        class="toolbar-btn mobile-order-3"
        :class="{ accent: store.renderMode === 'solid' }"
        @click="store.toggleRenderMode()"
      >
        {{ store.renderMode === 'xray' ? '◈ X-Ray' : '◆ Solid' }}
      </button>
      <Transition name="btn-fade">
        <button
          v-if="store.renderMode === 'solid'"
          class="toolbar-btn mobile-order-4"
          :class="{ active: store.isDimmed }"
          @click="store.toggleDimLights()"
        >
          {{ store.isDimmed ? '&#x2600; Brighten' : '&#x263E; Dim' }}
        </button>
      </Transition>
      <span class="toolbar-sep" />
      <button
        v-if="!store.isMobile"
        class="toolbar-btn toolbar-btn--icon"
        :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'"
        @click="toggleFullscreen"
      >
        &#x26F6;
      </button>
      <button
        v-if="!store.isMobile"
        class="toolbar-btn toolbar-btn--icon"
        title="Settings"
        @click="store.togglePanel()"
      >
        &#x2699;
      </button>
      <button
        v-if="!store.isMobile"
        class="toolbar-btn toolbar-btn--icon"
        title="Graphics"
        @click="store.toggleGraphicsPanel()"
      >
        &#x2728;
      </button>
      <Transition name="btn-fade">
        <button
          v-if="
            store.sceneMode === 'cards' &&
            store.cardDisplayMode === 'single' &&
            !store.isMobile
          "
          class="toolbar-btn toolbar-btn--icon mobile-order-2"
          title="Shader Controls"
          @click="store.toggleShaderPanel()"
        >
          &#x2726;
        </button>
      </Transition>
    </div>

    <!-- Zone Bottom: Card actions -->
    <Transition name="zone-fade">
      <div
        v-if="store.sceneMode === 'cards' && store.cardDisplayMode === 'single'"
        class="zone zone-bottom"
      >
        <button
          class="toolbar-btn mobile-order-6"
          :class="{ accent: store.isSlideshowActive }"
          @click="store.toggleSlideshow()"
        >
          {{ store.isSlideshowActive ? '&#x23F9; Stop' : '&#x25B6; Slideshow' }}
        </button>
        <button
          class="toolbar-btn mobile-order-8"
          :class="{ accent: store.isIdleFloatActive }"
          @click="store.toggleIdleFloat()"
        >
          {{ store.isIdleFloatActive ? '&#x2693; Anchor' : '&#x2601; Float' }}
        </button>
        <button class="toolbar-btn mobile-order-9" @click="shareCard">
          &#x1F517; Share
        </button>
      </div>
    </Transition>
  </div>

  <Transition name="toast-fade">
    <div v-if="shareToast" class="share-toast">Link copied!</div>
  </Transition>

  <div v-show="store.sceneMode === 'cards'" class="nav-hint">
    <template v-if="store.cardDisplayMode === 'fan'">
      hover to preview &middot; click to inspect &middot; <kbd>B</kbd> prev &middot;
      <kbd>N</kbd> next
    </template>
    <template v-else-if="store.cardDisplayMode === 'carousel'">
      <kbd>B</kbd> prev &middot; <kbd>N</kbd> next &middot; auto-rotates every 4s
    </template>
    <template v-else>
      <kbd>B</kbd> prev &middot; <kbd>N</kbd> next
      <span v-show="store.cardDisplayMode === 'single'">&middot; <kbd>M</kbd> merge</span>
      &middot; <kbd>P</kbd> perf
    </template>
  </div>
</template>

<style scoped>
/* Desktop: toolbar is transparent, zones are independently positioned */
.toolbar {
  display: contents;
}

.zone {
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 60;
}

.zone-left {
  position: fixed;
  top: 16px;
  left: 16px;
}

.zone-right {
  position: fixed;
  top: 16px;
  right: 16px;
}

.zone-bottom {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.mobile-row-break {
  display: none;
}

.toolbar-btn {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 7px 12px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: #aaa;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
  transition:
    border-color 0.2s,
    color 0.2s;
}

.toolbar-btn--icon {
  padding: 7px 10px;
  font-size: 0.8rem;
  line-height: 1;
}

.toolbar-select {
  display: initial;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 7px 12px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: #aaa;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  outline: none;
  transition:
    border-color 0.2s,
    color 0.2s;
}

.toolbar-select:hover:not(:disabled) {
  border-color: #00f5d4;
  color: #00f5d4;
}

.toolbar-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-loading {
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: #00f5d4;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.toolbar-select option {
  background: #111;
  color: #fff;
}

.toolbar-btn:hover {
  border-color: #00f5d4;
  color: #00f5d4;
}

.toolbar-btn.accent {
  border-color: #f72585;
  color: #f72585;
}

.toolbar-btn.active {
  border-color: #7b61ff;
  color: #7b61ff;
}

/* fade transition for conditional buttons */
.btn-fade-enter-active,
.btn-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.btn-fade-enter-from,
.btn-fade-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
.btn-fade-leave-active {
  pointer-events: none;
}

/* fade + slide-up transition for bottom zone */
.zone-fade-enter-active,
.zone-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.zone-fade-enter-from,
.zone-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
.zone-fade-leave-active {
  pointer-events: none;
}

.nav-hint {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 60;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 6px 12px;
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.05em;
}

.nav-hint kbd {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.6);
}

.share-toast {
  position: fixed;
  bottom: 130px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #00f5d4;
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 8px 16px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: #00f5d4;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  pointer-events: none;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

@media (max-width: 768px) {
  .toolbar {
    position: fixed;
    top: 16px;
    left: 16px;
    display: flex;
    flex-wrap: wrap;
    max-width: calc(100vw - 32px);
    gap: 4px;
  }

  .zone {
    display: contents;
  }

  .toolbar-sep {
    display: none;
  }

  .toolbar-btn,
  .toolbar-select {
    padding: 6px 8px;
    font-size: 0.58rem;
  }

  .toolbar-btn--icon {
    padding: 6px 8px;
    font-size: 0.7rem;
  }

  .toolbar-select {
    display: initial;
  }

  .toolbar-select.card-select {
    display: initial;
    max-width: 45vw;
  }

  .mobile-order-1 {
    order: 1;
  }
  .mobile-order-2 {
    order: 2;
  }
  .mobile-order-3 {
    order: 3;
  }
  .mobile-order-4 {
    order: 4;
  }
  .mobile-row-break {
    display: block;
    order: 5;
    flex-basis: 100%;
    height: 0;
  }
  .mobile-order-5 {
    order: 6;
  }
  .mobile-order-6 {
    order: 7;
  }
  .mobile-order-7 {
    order: 8;
  }
  .mobile-order-9 {
    order: 9;
  }

  .mobile-hide-packs {
    display: none;
  }

  .nav-hint {
    display: none;
  }
}
</style>
