<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { perfTracker } from '@/utils/perfTracker'

const store = useAppStore()
const m = perfTracker.metrics
</script>

<template>
  <Transition name="perf-fade">
    <div v-if="store.isPerfOverlayOpen" class="perf-overlay">
      <div class="perf-section">
        <div class="perf-label">FRAME</div>
        <div class="perf-row">
          <span class="perf-key">FPS</span>
          <span class="perf-val">{{ m.fps.toFixed(1) }}</span>
        </div>
        <div class="perf-row">
          <span class="perf-key">Frame</span>
          <span class="perf-val">{{ m.frameTime.toFixed(2) }} ms</span>
        </div>
      </div>

      <div class="perf-section">
        <div class="perf-label">NAVIGATION</div>
        <div class="perf-row">
          <span class="perf-key">Load</span>
          <span class="perf-val">{{ m.assetLoadTime.toFixed(1) }} ms</span>
        </div>
        <div class="perf-row">
          <span class="perf-key">Rebuild</span>
          <span class="perf-val">{{ m.sceneRebuildTime.toFixed(1) }} ms</span>
        </div>
        <div class="perf-row">
          <span class="perf-key">Total</span>
          <span class="perf-val">{{ m.totalNavigationTime.toFixed(1) }} ms</span>
        </div>
      </div>

      <div class="perf-section">
        <div class="perf-label">WEBGL</div>
        <div class="perf-row">
          <span class="perf-key">Draw calls</span>
          <span class="perf-val">{{ m.drawCalls }}</span>
        </div>
        <div class="perf-row">
          <span class="perf-key">Triangles</span>
          <span class="perf-val">{{ m.triangles.toLocaleString() }}</span>
        </div>
        <div class="perf-row">
          <span class="perf-key">Textures</span>
          <span class="perf-val">{{ m.textures }}</span>
        </div>
        <div class="perf-row">
          <span class="perf-key">Geometries</span>
          <span class="perf-val">{{ m.geometries }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.perf-overlay {
  position: fixed;
  bottom: 52px;
  right: 20px;
  z-index: 60;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: 'Space Mono', monospace;
  font-size: 0.58rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.03em;
  min-width: 170px;
  pointer-events: none;
}

.perf-section {
  margin-bottom: 6px;
}

.perf-section:last-child {
  margin-bottom: 0;
}

.perf-label {
  color: #00f5d4;
  font-size: 0.5rem;
  letter-spacing: 0.12em;
  margin-bottom: 2px;
  opacity: 0.8;
}

.perf-row {
  display: flex;
  justify-content: space-between;
  line-height: 1.5;
}

.perf-key {
  color: rgba(255, 255, 255, 0.35);
}

.perf-val {
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
}

.perf-fade-enter-active,
.perf-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.perf-fade-enter-from,
.perf-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
