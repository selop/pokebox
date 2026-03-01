<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import type { LightConfig, SceneConfig } from '@/types'

const store = useAppStore()

function onConfigSlider(key: keyof SceneConfig, value: string, rebuild: boolean) {
  ;(store.config[key] as number) = parseFloat(value)
  if (rebuild) store.triggerRebuild()
}

function onLightSlider(key: keyof LightConfig, value: string) {
  store.config.lights[key] = parseFloat(value)
}

function onCardSlider(key: keyof typeof store.cardTransform, value: string) {
  ;(store.cardTransform as Record<string, number>)[key] = parseFloat(value)
}

function onHoloIntensity(value: string) {
  store.config.holoIntensity = parseFloat(value) / 100
}

function onSceneMode(value: string) {
  store.setSceneMode(value as 'furniture' | 'cards')
}

function formatValue(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}
</script>

<template>
  <div class="calibration-panel" :class="{ hidden: !store.isPanelOpen }">
    <h3>Calibration &amp; Adjustments</h3>

    <!-- Scene mode -->
    <div class="cal-section">
      <div class="cal-section-title">Scene</div>
      <div class="cal-row">
        <span class="cal-label">Mode</span>
        <select class="cal-select" :value="store.sceneMode" @change="onSceneMode(($event.target as HTMLSelectElement).value)">
          <option value="furniture">Furnished Room</option>
          <option value="cards">Pokemon Cards</option>
        </select>
      </div>
    </div>

    <!-- Screen (physical) -->
    <div class="cal-section">
      <div class="cal-section-title">Screen (physical)</div>
      <div class="cal-row">
        <span class="cal-label">Width (cm)</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="15" max="100" step="0.1"
            :value="store.config.screenWidthCm"
            @input="onConfigSlider('screenWidthCm', ($event.target as HTMLInputElement).value, true)" />
          <span class="cal-value">{{ formatValue(store.config.screenWidthCm) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Height (cm)</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="10" max="60" step="0.1"
            :value="store.config.screenHeightCm"
            @input="onConfigSlider('screenHeightCm', ($event.target as HTMLInputElement).value, true)" />
          <span class="cal-value">{{ formatValue(store.config.screenHeightCm) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">View dist (cm)</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="20" max="150" step="1"
            :value="store.config.viewingDistanceCm"
            @input="onConfigSlider('viewingDistanceCm', ($event.target as HTMLInputElement).value, true)" />
          <span class="cal-value">{{ formatValue(store.config.viewingDistanceCm) }}</span>
        </div>
      </div>
    </div>

    <!-- Box -->
    <div class="cal-section">
      <div class="cal-section-title">Box</div>
      <div class="cal-row">
        <span class="cal-label">Depth</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0.5" max="6" step="0.1"
            :value="store.config.boxDepthRatio"
            @input="onConfigSlider('boxDepthRatio', ($event.target as HTMLInputElement).value, true)" />
          <span class="cal-value">{{ formatValue(store.config.boxDepthRatio) }}</span>
        </div>
      </div>
    </div>

    <!-- Tracking -->
    <div class="cal-section">
      <div class="cal-section-title">Tracking</div>
      <div class="cal-row">
        <span class="cal-label">Move scale</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0.2" max="4" step="0.1"
            :value="store.config.movementScale"
            @input="onConfigSlider('movementScale', ($event.target as HTMLInputElement).value, false)" />
          <span class="cal-value">{{ formatValue(store.config.movementScale) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Smoothing</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0.02" max="0.5" step="0.01"
            :value="store.config.smoothing"
            @input="onConfigSlider('smoothing', ($event.target as HTMLInputElement).value, false)" />
          <span class="cal-value">{{ formatValue(store.config.smoothing) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Cam offset X</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="-30" max="30" step="0.5"
            :value="store.config.webcamOffsetX"
            @input="onConfigSlider('webcamOffsetX', ($event.target as HTMLInputElement).value, false)" />
          <span class="cal-value">{{ formatValue(store.config.webcamOffsetX) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Cam offset Y</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="-30" max="30" step="0.5"
            :value="store.config.webcamOffsetY"
            @input="onConfigSlider('webcamOffsetY', ($event.target as HTMLInputElement).value, false)" />
          <span class="cal-value">{{ formatValue(store.config.webcamOffsetY) }}</span>
        </div>
      </div>
    </div>

    <!-- Lighting -->
    <div class="cal-section">
      <div class="cal-section-title">Lighting</div>
      <div class="cal-row">
        <span class="cal-label">Ambient</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0" max="5" step="0.1"
            :value="store.config.lights.ambientIntensity"
            @input="onLightSlider('ambientIntensity', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ formatValue(store.config.lights.ambientIntensity) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Directional</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0" max="3" step="0.1"
            :value="store.config.lights.directionalIntensity"
            @input="onLightSlider('directionalIntensity', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ formatValue(store.config.lights.directionalIntensity) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Backlight</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0" max="15" step="0.1"
            :value="store.config.lights.backlightIntensity"
            @input="onLightSlider('backlightIntensity', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ formatValue(store.config.lights.backlightIntensity) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Spotlight</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0" max="20" step="0.1"
            :value="store.config.lights.spotlightIntensity"
            @input="onLightSlider('spotlightIntensity', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ formatValue(store.config.lights.spotlightIntensity) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Spot X</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="-1" max="1" step="0.05"
            :value="store.config.lights.spotlightX"
            @input="onLightSlider('spotlightX', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ formatValue(store.config.lights.spotlightX) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Spot Y</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="-1" max="1" step="0.05"
            :value="store.config.lights.spotlightY"
            @input="onLightSlider('spotlightY', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ formatValue(store.config.lights.spotlightY) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Spot angle</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="10" max="90" step="1"
            :value="store.config.lights.spotlightAngle"
            @input="onLightSlider('spotlightAngle', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ formatValue(store.config.lights.spotlightAngle) }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Spot soft</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0" max="1" step="0.05"
            :value="store.config.lights.spotlightPenumbra"
            @input="onLightSlider('spotlightPenumbra', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ formatValue(store.config.lights.spotlightPenumbra) }}</span>
        </div>
      </div>
    </div>

    <!-- Card -->
    <div v-show="store.sceneMode === 'cards'" class="cal-section">
      <div class="cal-section-title">Card</div>
      <div class="cal-row">
        <span class="cal-label">X pos</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="-50" max="50" step="1"
            :value="store.cardTransform.x"
            @input="onCardSlider('x', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ store.cardTransform.x }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Y pos</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="-50" max="50" step="1"
            :value="store.cardTransform.y"
            @input="onCardSlider('y', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ store.cardTransform.y }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Z depth</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0" max="100" step="1"
            :value="store.cardTransform.z"
            @input="onCardSlider('z', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ store.cardTransform.z }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Y rotation</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="-180" max="180" step="1"
            :value="store.cardTransform.rotY"
            @input="onCardSlider('rotY', ($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ store.cardTransform.rotY }}</span>
        </div>
      </div>
      <div class="cal-row">
        <span class="cal-label">Holo intensity</span>
        <div class="cal-slider-wrap">
          <input type="range" class="cal-slider" min="0" max="100" step="1"
            :value="Math.round(store.config.holoIntensity * 100)"
            @input="onHoloIntensity(($event.target as HTMLInputElement).value)" />
          <span class="cal-value">{{ Math.round(store.config.holoIntensity * 100) }}</span>
        </div>
      </div>
    </div>

    <button class="cal-reset" @click="store.resetDefaults(); store.triggerRebuild()">Reset Defaults</button>
  </div>
</template>

<style scoped>
.calibration-panel {
  position: fixed;
  top: 60px;
  left: 20px;
  z-index: 55;
  background: rgba(0, 0, 0, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border-radius: 14px;
  padding: 20px 22px 16px;
  width: 300px;
  font-size: 0.7rem;
  transition: all 0.3s ease;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}

.calibration-panel.hidden {
  opacity: 0;
  transform: translateX(-10px);
  pointer-events: none;
}

.calibration-panel h3 {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #00f5d4;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cal-section {
  margin-bottom: 16px;
}

.cal-section-title {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #f72585;
  margin-bottom: 10px;
}

.cal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 10px;
}

.cal-label {
  color: #888;
  font-size: 0.65rem;
  white-space: nowrap;
  min-width: 80px;
}

.cal-slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.cal-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  outline: none;
}

.cal-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00f5d4;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(0, 245, 212, 0.4);
}

.cal-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00f5d4;
  cursor: pointer;
  border: none;
}

.cal-value {
  color: #fff;
  font-variant-numeric: tabular-nums;
  font-size: 0.65rem;
  min-width: 38px;
  text-align: right;
}

.cal-select {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 5px 8px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: #fff;
  cursor: pointer;
  outline: none;
}

.cal-select:hover {
  border-color: #00f5d4;
}

.cal-select option {
  background: #111;
  color: #fff;
}

.cal-reset {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: #888;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: all 0.2s;
}

.cal-reset:hover {
  border-color: #f72585;
  color: #f72585;
}

@media (max-width: 768px) {
  .calibration-panel {
    width: calc(100vw - 32px);
    left: 16px;
    top: 50px;
    padding: 16px;
    max-height: calc(100vh - 66px);
  }
}
</style>
