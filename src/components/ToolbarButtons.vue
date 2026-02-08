<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useFullscreen } from '@/composables/useFullscreen'

const store = useAppStore()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
</script>

<template>
  <button class="toolbar-btn settings-btn" @click="store.togglePanel()">&#x2699; Settings</button>
  <button class="toolbar-btn fullscreen-btn" @click="toggleFullscreen">
    &#x26F6; {{ isFullscreen ? 'Exit FS' : 'Fullscreen' }}
  </button>
  <button
    class="toolbar-btn mode-btn"
    :class="{ solid: store.renderMode === 'solid' }"
    @click="store.toggleRenderMode()"
  >
    {{ store.renderMode === 'xray' ? '◈ X-Ray' : '◆ Solid' }}
  </button>
  <button
    v-show="store.sceneMode === 'furniture'"
    class="toolbar-btn randomize-btn"
    @click="store.randomizeSeed()"
  >
    &#x26A1; Randomize Interior
  </button>
</template>

<style scoped>
.toolbar-btn {
  position: fixed;
  top: 20px;
  z-index: 60;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 8px 14px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: #aaa;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  border-color: #00f5d4;
  color: #00f5d4;
}

.settings-btn {
  left: 20px;
}
.fullscreen-btn {
  left: 130px;
}
.mode-btn {
  left: 260px;
}
.mode-btn.solid {
  border-color: #f72585;
  color: #f72585;
}
.randomize-btn {
  left: 350px;
}
</style>
