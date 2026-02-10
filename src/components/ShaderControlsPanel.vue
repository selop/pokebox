<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const store = useAppStore()

function onShaderSlider(key: keyof typeof store.config, value: string) {
  ;(store.config as Record<string, number>)[key] = parseFloat(value)
}

function formatValue(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}
</script>

<template>
  <div class="shader-panel" :class="{ hidden: !store.isShaderPanelOpen }">
    <h3>Shader Controls</h3>

    <!-- Illustration Rare Shader -->
    <div v-show="store.shaderStyle === 'illustration-rare'" class="shader-section">
      <div class="shader-section-title">✨ Illustration Rare</div>

      <div class="shader-row">
        <span class="shader-label">Rainbow scale</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0.5" max="5" step="0.1"
            :value="store.config.illustRareRainbowScale"
            @input="onShaderSlider('illustRareRainbowScale', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareRainbowScale) }}</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar angle</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="360" step="1"
            :value="store.config.illustRareBarAngle"
            @input="onShaderSlider('illustRareBarAngle', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareBarAngle) }}°</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar density</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0.5" max="10" step="0.1"
            :value="store.config.illustRareBarDensity"
            @input="onShaderSlider('illustRareBarDensity', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareBarDensity) }}</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar width</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0.1" max="10" step="0.05"
            :value="store.config.illustRareBarWidth"
            @input="onShaderSlider('illustRareBarWidth', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareBarWidth) }}</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar intensity</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="20" step="0.05"
            :value="store.config.illustRareBarIntensity"
            @input="onShaderSlider('illustRareBarIntensity', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareBarIntensity) }}</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar hue</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="360" step="1"
            :value="store.config.illustRareBarHue"
            @input="onShaderSlider('illustRareBarHue', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareBarHue) }}°</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar med sat</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="1" step="0.01"
            :value="store.config.illustRareBarMediumSaturation"
            @input="onShaderSlider('illustRareBarMediumSaturation', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ Math.round(store.config.illustRareBarMediumSaturation * 100) }}%</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar med light</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="1" step="0.01"
            :value="store.config.illustRareBarMediumLightness"
            @input="onShaderSlider('illustRareBarMediumLightness', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ Math.round(store.config.illustRareBarMediumLightness * 100) }}%</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar bright sat</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="1" step="0.01"
            :value="store.config.illustRareBarBrightSaturation"
            @input="onShaderSlider('illustRareBarBrightSaturation', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ Math.round(store.config.illustRareBarBrightSaturation * 100) }}%</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Bar bright light</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="1" step="0.01"
            :value="store.config.illustRareBarBrightLightness"
            @input="onShaderSlider('illustRareBarBrightLightness', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ Math.round(store.config.illustRareBarBrightLightness * 100) }}%</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Shine contrast</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="1" max="5" step="0.05"
            :value="store.config.illustRareShine1Contrast"
            @input="onShaderSlider('illustRareShine1Contrast', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareShine1Contrast) }}</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Shine saturate</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="2" step="0.05"
            :value="store.config.illustRareShine1Saturation"
            @input="onShaderSlider('illustRareShine1Saturation', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareShine1Saturation) }}</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Shine 2 opacity</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="1" step="0.05"
            :value="store.config.illustRareShine2Opacity"
            @input="onShaderSlider('illustRareShine2Opacity', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareShine2Opacity) }}</span>
        </div>
      </div>

      <div class="shader-row">
        <span class="shader-label">Glare opacity</span>
        <div class="shader-slider-wrap">
          <input type="range" class="shader-slider" min="0" max="1" step="0.05"
            :value="store.config.illustRareGlareOpacity"
            @input="onShaderSlider('illustRareGlareOpacity', ($event.target as HTMLInputElement).value)" />
          <span class="shader-value">{{ formatValue(store.config.illustRareGlareOpacity) }}</span>
        </div>
      </div>
    </div>

    <!-- Placeholder for other shader types -->
    <div v-show="store.shaderStyle !== 'illustration-rare'" class="shader-section">
      <div class="shader-section-title">{{ store.shaderStyle }}</div>
      <p class="shader-placeholder">No controls available for this shader yet.</p>
    </div>
  </div>
</template>

<style scoped>
.shader-panel {
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

.shader-panel.hidden {
  opacity: 0;
  transform: translateX(10px);
  pointer-events: none;
}

.shader-panel h3 {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #00f5d4;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.shader-section {
  margin-bottom: 16px;
}

.shader-section-title {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #f72585;
  margin-bottom: 10px;
}

.shader-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 10px;
}

.shader-label {
  color: #888;
  font-size: 0.65rem;
  white-space: nowrap;
  min-width: 90px;
}

.shader-slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.shader-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  outline: none;
}

.shader-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00f5d4;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(0, 245, 212, 0.4);
}

.shader-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00f5d4;
  cursor: pointer;
  border: none;
}

.shader-value {
  color: #fff;
  font-variant-numeric: tabular-nums;
  font-size: 0.65rem;
  min-width: 38px;
  text-align: right;
}

.shader-placeholder {
  color: #666;
  font-size: 0.65rem;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}
</style>
