<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useFullscreen } from '@/composables/useFullscreen'
import { CARD_CATALOG, SET_REGISTRY } from '@/data/cardCatalog'

const store = useAppStore()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

function onSetChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  store.switchSet(value)
}

function onCardChange(e: Event) {
  store.currentCardId = (e.target as HTMLSelectElement).value
}
</script>

<template>
  <div class="toolbar">
    <!-- Set & card selector -->
    <div class="toolbar-group">
      <select class="toolbar-select" :disabled="store.setLoading" :value="store.currentSetId" @change="onSetChange">
        <option v-for="set in SET_REGISTRY" :key="set.id" :value="set.id">{{ set.label }}</option>
      </select>
      <select class="toolbar-select" :disabled="store.setLoading" :value="store.currentCardId" @change="onCardChange">
        <option v-for="card in CARD_CATALOG" :key="card.id" :value="card.id">{{ card.label }}</option>
      </select>
      <span v-if="store.setLoading" class="toolbar-loading">Loading...</span>
      <button class="toolbar-btn" @click="store.toggleBoosterModal()">&#x1F4E6; Packs</button>
    </div>

    <span class="toolbar-sep" />

    <!-- Global controls — always visible -->
    <div class="toolbar-group">
      <button class="toolbar-btn" @click="store.togglePanel()">&#x2699; Settings</button>
      <button class="toolbar-btn" @click="toggleFullscreen">
        &#x26F6; {{ isFullscreen ? 'Exit FS' : 'Fullscreen' }}
      </button>
    </div>

    <span class="toolbar-sep" />

    <!-- Render controls -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :class="{ accent: store.renderMode === 'solid' }"
        @click="store.toggleRenderMode()"
      >
        {{ store.renderMode === 'xray' ? '◈ X-Ray' : '◆ Solid' }}
      </button>
      <Transition name="btn-fade">
        <button
          v-if="store.renderMode === 'solid'"
          class="toolbar-btn"
          :class="{ active: store.isDimmed }"
          @click="store.toggleDimLights()"
        >
          {{ store.isDimmed ? '&#x2600; Brighten' : '&#x263E; Dim' }}
        </button>
      </Transition>
    </div>

    <!-- Card-mode controls -->
    <template v-if="store.sceneMode === 'cards'">
      <span class="toolbar-sep" />

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          @click="store.cardDisplayMode = store.cardDisplayMode === 'single' ? 'triple' : 'single'"
        >
          {{ store.cardDisplayMode === 'single' ? '&#x2630; Triple' : '&#x25A3; Single' }}
        </button>
        <Transition name="btn-fade">
          <button
            v-if="store.cardDisplayMode === 'single'"
            class="toolbar-btn"
            @click="store.toggleShaderPanel()"
          >
            &#x2699; Shader
          </button>
        </Transition>
        <button
          class="toolbar-btn"
          :class="{ accent: store.isSlideshowActive }"
          @click="store.toggleSlideshow()"
        >
          {{ store.isSlideshowActive ? '&#x23F9; Stop' : '&#x25B6; Slideshow' }}
        </button>
        <button class="toolbar-btn" @click="store.requestFlip()">&#x21BB; Flip</button>
      </div>
    </template>

    <!-- Furniture-mode controls -->
    <template v-if="store.sceneMode === 'furniture'">
      <span class="toolbar-sep" />

      <div class="toolbar-group">
        <button class="toolbar-btn" @click="store.randomizeSeed()">
          &#x26A1; Randomize Interior
        </button>
      </div>
    </template>
  </div>

  <div v-show="store.sceneMode === 'cards'" class="nav-hint">
    <kbd>B</kbd> prev &middot; <kbd>N</kbd> next
    <span v-show="store.cardDisplayMode === 'single'">&middot; <kbd>M</kbd> merge</span>
    &middot; <kbd>F</kbd> flip
    &middot; <kbd>P</kbd> perf
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
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
  transition: border-color 0.2s, color 0.2s;
}

.toolbar-select {
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
  transition: border-color 0.2s, color 0.2s;
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
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
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
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.btn-fade-enter-from,
.btn-fade-leave-to {
  opacity: 0;
  transform: scale(0.92);
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

@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    max-width: calc(100vw - 32px);
    gap: 4px;
  }

  .toolbar-sep {
    display: none;
  }

  .toolbar-btn,
  .toolbar-select {
    padding: 6px 8px;
    font-size: 0.58rem;
  }

  .nav-hint {
    display: none;
  }
}
</style>
