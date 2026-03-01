<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import type { BloomConfig, DofConfig, ToneMappingAlgorithm } from '@/types'

const store = useAppStore()

// Third-stop f-stop sequence matching Fujifilm aperture rings
const F_STOPS = [1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16]

function fStopToIndex(f: number): number {
  let best = 0
  let bestDist = Math.abs(F_STOPS[0]! - f)
  for (let i = 1; i < F_STOPS.length; i++) {
    const d = Math.abs(F_STOPS[i]! - f)
    if (d < bestDist) { best = i; bestDist = d }
  }
  return best
}

function onFStopSlider(value: string) {
  store.config.dof.fStop = F_STOPS[parseInt(value)]!
}

function onDofSlider(key: keyof DofConfig, value: string) {
  ;(store.config.dof[key] as number) = parseFloat(value)
}

function onBloomSlider(key: keyof BloomConfig, value: string) {
  ;(store.config.bloom[key] as number) = parseFloat(value)
}

function onToneMappingAlgorithm(value: string) {
  store.config.toneMapping.algorithm = value as ToneMappingAlgorithm
}

function onExposureSlider(value: string) {
  store.config.toneMapping.exposure = parseFloat(value)
}

function formatValue(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}

const toneMappingOptions: { value: ToneMappingAlgorithm; label: string }[] = [
  { value: 'aces', label: 'ACES Filmic' },
  { value: 'agx', label: 'AgX' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'none', label: 'None' },
]
</script>

<template>
  <div class="gfx-panel" :class="{ hidden: !store.isGraphicsPanelOpen }">
    <h3>Graphics</h3>

    <!-- Tone Mapping -->
    <div class="gfx-section">
      <div class="gfx-section-title">Tone Mapping</div>
      <div class="gfx-row">
        <span class="gfx-label">Algorithm</span>
        <select
          class="gfx-select"
          :value="store.config.toneMapping.algorithm"
          @change="onToneMappingAlgorithm(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in toneMappingOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <div class="gfx-row">
        <span class="gfx-label">Exposure</span>
        <div class="gfx-slider-wrap">
          <input type="range" class="gfx-slider" min="-3" max="3" step="0.1"
            :value="store.config.toneMapping.exposure"
            @input="onExposureSlider(($event.target as HTMLInputElement).value)" />
          <span class="gfx-value">{{ store.config.toneMapping.exposure >= 0 ? '+' : '' }}{{ store.config.toneMapping.exposure.toFixed(1) }} EV</span>
        </div>
      </div>
    </div>

    <!-- Depth of Field -->
    <div class="gfx-section">
      <div class="gfx-section-title">Depth of Field</div>
      <div class="gfx-row">
        <span class="gfx-label">Enable</span>
        <label class="gfx-toggle">
          <input type="checkbox" :checked="store.config.dof.enabled"
            @change="store.config.dof.enabled = ($event.target as HTMLInputElement).checked" />
          <span class="gfx-toggle-slider"></span>
        </label>
      </div>
      <div v-show="store.config.dof.enabled" class="gfx-row">
        <span class="gfx-label">Aperture</span>
        <div class="gfx-slider-wrap">
          <input type="range" class="gfx-slider" min="0" :max="F_STOPS.length - 1" step="1"
            :value="fStopToIndex(store.config.dof.fStop)"
            @input="onFStopSlider(($event.target as HTMLInputElement).value)" />
          <span class="gfx-value">f/{{ store.config.dof.fStop }}</span>
        </div>
      </div>
      <div v-show="store.config.dof.enabled" class="gfx-row">
        <span class="gfx-label">Max blur</span>
        <div class="gfx-slider-wrap">
          <input type="range" class="gfx-slider" min="0" max="0.02" step="0.001"
            :value="store.config.dof.maxBlur"
            @input="onDofSlider('maxBlur', ($event.target as HTMLInputElement).value)" />
          <span class="gfx-value">{{ store.config.dof.maxBlur.toFixed(3) }}</span>
        </div>
      </div>
      <div v-show="store.config.dof.enabled" class="gfx-row">
        <span class="gfx-label">Focus offset</span>
        <div class="gfx-slider-wrap">
          <input type="range" class="gfx-slider" min="-30" max="30" step="0.5"
            :value="store.config.dof.focusOffset"
            @input="onDofSlider('focusOffset', ($event.target as HTMLInputElement).value)" />
          <span class="gfx-value">{{ formatValue(store.config.dof.focusOffset) }}</span>
        </div>
      </div>
    </div>

    <!-- Bloom -->
    <div class="gfx-section">
      <div class="gfx-section-title">Bloom</div>
      <div class="gfx-row">
        <span class="gfx-label">Enable</span>
        <label class="gfx-toggle">
          <input type="checkbox" :checked="store.config.bloom.enabled"
            @change="store.config.bloom.enabled = ($event.target as HTMLInputElement).checked" />
          <span class="gfx-toggle-slider"></span>
        </label>
      </div>
      <div v-show="store.config.bloom.enabled" class="gfx-row">
        <span class="gfx-label">Strength</span>
        <div class="gfx-slider-wrap">
          <input type="range" class="gfx-slider" min="0" max="3" step="0.05"
            :value="store.config.bloom.strength"
            @input="onBloomSlider('strength', ($event.target as HTMLInputElement).value)" />
          <span class="gfx-value">{{ store.config.bloom.strength.toFixed(2) }}</span>
        </div>
      </div>
      <div v-show="store.config.bloom.enabled" class="gfx-row">
        <span class="gfx-label">Radius</span>
        <div class="gfx-slider-wrap">
          <input type="range" class="gfx-slider" min="0" max="1" step="0.05"
            :value="store.config.bloom.radius"
            @input="onBloomSlider('radius', ($event.target as HTMLInputElement).value)" />
          <span class="gfx-value">{{ store.config.bloom.radius.toFixed(2) }}</span>
        </div>
      </div>
      <div v-show="store.config.bloom.enabled" class="gfx-row">
        <span class="gfx-label">Threshold</span>
        <div class="gfx-slider-wrap">
          <input type="range" class="gfx-slider" min="0" max="1" step="0.01"
            :value="store.config.bloom.threshold"
            @input="onBloomSlider('threshold', ($event.target as HTMLInputElement).value)" />
          <span class="gfx-value">{{ store.config.bloom.threshold.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gfx-panel {
  position: fixed;
  top: 60px;
  right: 20px;
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

.gfx-panel.hidden {
  opacity: 0;
  transform: translateX(10px);
  pointer-events: none;
}

.gfx-panel h3 {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #00f5d4;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.gfx-section {
  margin-bottom: 16px;
}

.gfx-section-title {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #f72585;
  margin-bottom: 10px;
}

.gfx-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 10px;
}

.gfx-label {
  color: #888;
  font-size: 0.65rem;
  white-space: nowrap;
  min-width: 80px;
}

.gfx-slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.gfx-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  outline: none;
}

.gfx-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00f5d4;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(0, 245, 212, 0.4);
}

.gfx-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00f5d4;
  cursor: pointer;
  border: none;
}

.gfx-value {
  color: #fff;
  font-variant-numeric: tabular-nums;
  font-size: 0.65rem;
  min-width: 38px;
  text-align: right;
}

.gfx-select {
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

.gfx-select:hover {
  border-color: #00f5d4;
}

.gfx-select option {
  background: #111;
  color: #fff;
}

.gfx-toggle {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
  cursor: pointer;
}

.gfx-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.gfx-toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  transition: background 0.2s;
}

.gfx-toggle-slider::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 14px;
  height: 14px;
  background: #888;
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}

.gfx-toggle input:checked + .gfx-toggle-slider {
  background: rgba(0, 245, 212, 0.3);
}

.gfx-toggle input:checked + .gfx-toggle-slider::before {
  transform: translateX(16px);
  background: #00f5d4;
}

@media (max-width: 768px) {
  .gfx-panel {
    width: calc(100vw - 32px);
    right: 16px;
    top: 50px;
    padding: 16px;
    max-height: calc(100vh - 66px);
  }
}
</style>
