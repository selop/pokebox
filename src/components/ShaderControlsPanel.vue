<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { CARD_CATALOG } from '@/data/cardCatalog'
import type { AppConfig } from '@/types'

const store = useAppStore()
const copied = ref(false)

type SliderDef = {
  label: string
  key: keyof AppConfig
  min: number
  max: number
  step: number
  suffix?: '°' | '%'
}

type SectionItem = SliderDef | { subsection: string }

function isSubsection(item: SectionItem): item is { subsection: string } {
  return 'subsection' in item
}

function displayValue(slider: SliderDef): string {
  const v = store.config[slider.key] as number
  if (slider.suffix === '%') return `${Math.round(v * 100)}%`
  const formatted = v % 1 === 0 ? String(v) : v.toFixed(2)
  return slider.suffix ? `${formatted}${slider.suffix}` : formatted
}

type ShaderSection = {
  id: string
  title: string
  icon: string
  items: SectionItem[]
}

const sections: ShaderSection[] = [
  {
    id: 'illustration-rare',
    title: 'Illustration Rare',
    icon: '✨',
    items: [
      { label: 'Rainbow scale', key: 'illustRareRainbowScale', min: 0.5, max: 5, step: 0.1 },
      { label: 'Bar angle', key: 'illustRareBarAngle', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Bar density', key: 'illustRareBarDensity', min: 0.5, max: 10, step: 0.1 },
      { subsection: 'Layer 1 Bars' },
      { label: 'Offset Y', key: 'illustRareBarOffsetBgYMult', min: -5, max: 5, step: 0.05 },
      { label: 'Width', key: 'illustRareBarWidth', min: 0.1, max: 10, step: 0.05 },
      { label: 'Intensity', key: 'illustRareBarIntensity', min: 0, max: 20, step: 0.05 },
      { label: 'Hue', key: 'illustRareBarHue', min: 0, max: 360, step: 1, suffix: '°' },
      {
        label: 'Med sat',
        key: 'illustRareBarMediumSaturation',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      {
        label: 'Med light',
        key: 'illustRareBarMediumLightness',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      {
        label: 'Bright sat',
        key: 'illustRareBarBrightSaturation',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      {
        label: 'Bright light',
        key: 'illustRareBarBrightLightness',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      { subsection: 'Layer 2 Bars' },
      { label: 'Density', key: 'illustRareBarDensity2', min: 0.5, max: 10, step: 0.1 },
      { label: 'Offset Y', key: 'illustRareBar2OffsetBgYMult', min: -5, max: 5, step: 0.05 },
      { label: 'Width', key: 'illustRareBarWidth2', min: 0.1, max: 10, step: 0.05 },
      { label: 'Intensity', key: 'illustRareBarIntensity2', min: 0, max: 20, step: 0.05 },
      { label: 'Hue', key: 'illustRareBarHue2', min: 0, max: 360, step: 1, suffix: '°' },
      {
        label: 'Med sat',
        key: 'illustRareBarMediumSaturation2',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      {
        label: 'Med light',
        key: 'illustRareBarMediumLightness2',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      {
        label: 'Bright sat',
        key: 'illustRareBarBrightSaturation2',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      {
        label: 'Bright light',
        key: 'illustRareBarBrightLightness2',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      { subsection: 'Shine & Glare' },
      { label: 'Shine contrast', key: 'illustRareShine1Contrast', min: 1, max: 5, step: 0.05 },
      { label: 'Shine saturate', key: 'illustRareShine1Saturation', min: 0, max: 2, step: 0.05 },
      { label: 'Shine 2 opacity', key: 'illustRareShine2Opacity', min: 0, max: 1, step: 0.05 },
      { label: 'Glare opacity', key: 'illustRareGlareOpacity', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: 'special-illustration-rare',
    title: 'Special IR',
    icon: '✦',
    items: [
      { subsection: 'Shine (Rainbow)' },
      { label: 'Angle', key: 'sirShineAngle', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Frequency', key: 'sirShineFrequency', min: 1, max: 30, step: 0.5 },
      { label: 'Brightness', key: 'sirShineBrightness', min: 0, max: 3, step: 0.05 },
      { label: 'Contrast', key: 'sirShineContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', key: 'sirShineSaturation', min: 0, max: 5, step: 0.05 },
      { subsection: 'Color Wash' },
      { label: 'Scale', key: 'sirWashScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Tilt sensitivity', key: 'sirWashTiltSensitivity', min: 0, max: 10, step: 0.1 },
      { label: 'Saturation', key: 'sirWashSaturation', min: 0, max: 5, step: 0.05 },
      { label: 'Contrast', key: 'sirWashContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Opacity', key: 'sirWashOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Glitter' },
      { label: 'Contrast', key: 'sirGlitterContrast', min: 0, max: 5, step: 0.1 },
      { label: 'Saturation', key: 'sirGlitterSaturation', min: 0, max: 5, step: 0.1 },
      { subsection: 'Overall' },
      { label: 'Base brightness', key: 'sirBaseBrightness', min: 0, max: 2, step: 0.05 },
      { label: 'Base contrast', key: 'sirBaseContrast', min: 0, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'ultra-rare',
    title: 'Ultra Rare',
    icon: '💎',
    items: [
      { label: 'Base brightness', key: 'ultraRareBaseBrightness', min: 0, max: 3, step: 0.05 },
      { subsection: 'Shine Before' },
      { label: 'Brightness', key: 'ultraRareShineBrightness', min: 0, max: 1, step: 0.005 },
      { label: 'Contrast', key: 'ultraRareShineContrast', min: 0, max: 1, step: 0.005 },
      { label: 'Saturation', key: 'ultraRareShineSaturation', min: 0, max: 20, step: 0.1 },
      { subsection: 'Shine After' },
      { label: 'Brightness', key: 'ultraRareShineAfterBrightness', min: 0, max: 3, step: 0.05 },
      { label: 'Contrast', key: 'ultraRareShineAfterContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', key: 'ultraRareShineAfterSaturation', min: 0, max: 3, step: 0.05 },
      { subsection: 'Shine Base' },
      { label: 'Brightness', key: 'ultraRareShineBaseBrightness', min: 0, max: 5, step: 0.05 },
      { label: 'Contrast', key: 'ultraRareShineBaseContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', key: 'ultraRareShineBaseSaturation', min: 0, max: 5, step: 0.05 },
      { subsection: 'Glare' },
      { label: 'Glare contrast', key: 'ultraRareGlareContrast', min: 0, max: 5, step: 0.05 },
      { label: 'Glare2 contrast', key: 'ultraRareGlare2Contrast', min: 0, max: 3, step: 0.05 },
      { subsection: 'Gradients' },
      {
        label: 'Rotate delta',
        key: 'ultraRareRotateDelta',
        min: 0,
        max: 360,
        step: 0.5,
        suffix: '°',
      },
      { label: 'Angle1 mult', key: 'ultraRareAngle1Mult', min: -5, max: 5, step: 0.05 },
      { label: 'Angle2 mult', key: 'ultraRareAngle2Mult', min: -5, max: 5, step: 0.05 },
      { label: 'BgY mult 1', key: 'ultraRareBgYMult1', min: -5, max: 5, step: 0.05 },
      { label: 'BgY mult 2', key: 'ultraRareBgYMult2', min: -5, max: 5, step: 0.05 },
      { subsection: 'Diagonal Bars' },
      { label: 'Bar angle', key: 'ultraRareBarAngle', min: 0, max: 360, step: 0.5, suffix: '°' },
      { label: 'Offset BgX mult', key: 'ultraRareBarOffsetBgXMult', min: -5, max: 5, step: 0.05 },
      { label: 'Offset BgY mult', key: 'ultraRareBarOffsetBgYMult', min: -5, max: 5, step: 0.05 },
      { label: 'Bar frequency', key: 'ultraRareBarFrequency', min: 0.5, max: 20, step: 0.1 },
      {
        label: 'Intensity start 1',
        key: 'ultraRareBarIntensityStart1',
        min: 0,
        max: 1,
        step: 0.01,
      },
      { label: 'Intensity end 1', key: 'ultraRareBarIntensityEnd1', min: 0, max: 1, step: 0.01 },
      {
        label: 'Intensity start 2',
        key: 'ultraRareBarIntensityStart2',
        min: 0,
        max: 1,
        step: 0.01,
      },
      { label: 'Intensity end 2', key: 'ultraRareBarIntensityEnd2', min: 0, max: 1, step: 0.01 },
      { subsection: 'Metallic Sparkle' },
      { label: 'Intensity', key: 'ultraRareSparkleIntensity', min: 0, max: 3, step: 0.05 },
      { label: 'Radius', key: 'ultraRareSparkleRadius', min: 0.1, max: 1.5, step: 0.05 },
      { label: 'Contrast', key: 'ultraRareSparkleContrast', min: 0.5, max: 10, step: 0.1 },
      { label: 'Color shift', key: 'ultraRareSparkleColorShift', min: 0, max: 5, step: 0.1 },
    ],
  },
  {
    id: 'rainbow-rare',
    title: 'Rainbow Rare',
    icon: '🌈',
    items: [
      { label: 'Base brightness', key: 'rainbowRareBaseBrightness', min: 0, max: 3, step: 0.05 },
      { subsection: 'Shine' },
      { label: 'Brightness', key: 'rainbowRareShineBrightness', min: 0, max: 1, step: 0.005 },
      { label: 'Contrast', key: 'rainbowRareShineContrast', min: 0, max: 1, step: 0.005 },
      { label: 'Saturation', key: 'rainbowRareShineSaturation', min: 0, max: 20, step: 0.1 },
      { subsection: 'Shine Base' },
      { label: 'Brightness', key: 'rainbowRareShineBaseBrightness', min: 0, max: 5, step: 0.05 },
      { label: 'Contrast', key: 'rainbowRareShineBaseContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', key: 'rainbowRareShineBaseSaturation', min: 0, max: 5, step: 0.05 },
      { subsection: 'Glare' },
      { label: 'Glare contrast', key: 'rainbowRareGlareContrast', min: 0, max: 5, step: 0.05 },
      { label: 'Glare2 contrast', key: 'rainbowRareGlare2Contrast', min: 0, max: 3, step: 0.05 },
      { subsection: 'Metallic Sparkle' },
      { label: 'Intensity', key: 'rainbowRareSparkleIntensity', min: 0, max: 3, step: 0.05 },
      { label: 'Radius', key: 'rainbowRareSparkleRadius', min: 0.1, max: 1.5, step: 0.05 },
      { label: 'Contrast', key: 'rainbowRareSparkleContrast', min: 0.5, max: 10, step: 0.1 },
      { label: 'Color shift', key: 'rainbowRareSparkleColorShift', min: 0, max: 5, step: 0.1 },
    ],
  },
  {
    id: 'master-ball',
    title: 'Master Ball',
    icon: '🔮',
    items: [
      { subsection: 'Rainbow' },
      { label: 'Scale', key: 'masterBallRainbowScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Tilt shift', key: 'masterBallRainbowShift', min: 0, max: 10, step: 0.1 },
      { subsection: 'Sparkle' },
      { label: 'Scale', key: 'masterBallSparkleScale', min: 0.5, max: 10, step: 0.1 },
      { label: 'Intensity', key: 'masterBallSparkleIntensity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Tilt sensitivity', key: 'masterBallSparkleTiltSensitivity', min: 0, max: 0.5, step: 0.01 },
      { subsection: 'Glare' },
      { label: 'Opacity', key: 'masterBallGlareOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Overall' },
      { label: 'Brightness', key: 'masterBallBaseBrightness', min: 0.5, max: 2, step: 0.05 },
      { label: 'Contrast', key: 'masterBallBaseContrast', min: 0.5, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'reverse-holo',
    title: 'Reverse Holo',
    icon: '🪞',
    items: [
      { subsection: 'Shine' },
      { label: 'Intensity', key: 'reverseHoloShineIntensity', min: 0, max: 5, step: 0.05 },
      { label: 'Opacity', key: 'reverseHoloShineOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Shine Color' },
      { label: 'Red', key: 'reverseHoloShineColorR', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Green', key: 'reverseHoloShineColorG', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Blue', key: 'reverseHoloShineColorB', min: 0, max: 1, step: 0.01, suffix: '%' },
      { subsection: 'Specular' },
      { label: 'Radius', key: 'reverseHoloSpecularRadius', min: 0.1, max: 1.5, step: 0.05 },
      { label: 'Power', key: 'reverseHoloSpecularPower', min: 0.5, max: 8, step: 0.1 },
      { subsection: 'Overall' },
      {
        label: 'Base brightness',
        key: 'reverseHoloBaseBrightness',
        min: 0.4,
        max: 1.0,
        step: 0.05,
      },
      { label: 'Base contrast', key: 'reverseHoloBaseContrast', min: 0, max: 5, step: 0.05 },
      { label: 'Base saturation', key: 'reverseHoloBaseSaturation', min: 0, max: 3, step: 0.05 },
    ],
  },
]

function sliderKeys(section: ShaderSection): (keyof AppConfig)[] {
  return section.items.filter((item): item is SliderDef => !isSubsection(item)).map((s) => s.key)
}

function onShaderSlider(key: keyof AppConfig, value: string) {
  ;(store.config as Record<string, number>)[key] = parseFloat(value)
}

function formatNum(v: number): string {
  return v % 1 === 0 ? v.toFixed(1) : parseFloat(v.toPrecision(6)).toString()
}

async function copyDefaults(section: ShaderSection) {
  const keys = sliderKeys(section)
  const lines = keys.map((k) => `  ${k}: ${formatNum(store.config[k] as number)},`)
  await navigator.clipboard.writeText(lines.join('\n'))
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const currentCardHoloType = computed(() => {
  const card = CARD_CATALOG.value.find((c) => c.id === store.currentCardId)
  return card?.holoType || 'illustration-rare'
})

const activeSection = computed(() => sections.find((s) => s.id === currentCardHoloType.value))

// Close panel when switching to triple mode
watch(
  () => store.cardDisplayMode,
  (mode) => {
    if (mode === 'triple') store.isShaderPanelOpen = false
  },
)
</script>

<template>
  <div class="shader-panel" :class="{ hidden: !store.isShaderPanelOpen }">
    <h3>Shader Controls</h3>

    <div v-if="activeSection" class="shader-section">
      <div class="shader-section-header">
        <div class="shader-section-title">{{ activeSection.icon }} {{ activeSection.title }}</div>
        <button class="shader-copy-btn" @click="copyDefaults(activeSection)">
          {{ copied ? 'Copied!' : 'Copy defaults' }}
        </button>
      </div>

      <template v-for="(item, i) in activeSection.items" :key="i">
        <div v-if="isSubsection(item)" class="shader-subsection">{{ item.subsection }}</div>
        <div v-else class="shader-row">
          <span class="shader-label">{{ item.label }}</span>
          <div class="shader-slider-wrap">
            <input
              type="range"
              class="shader-slider"
              :min="item.min"
              :max="item.max"
              :step="item.step"
              :value="store.config[item.key]"
              @input="onShaderSlider(item.key, ($event.target as HTMLInputElement).value)"
            />
            <span class="shader-value">{{ displayValue(item) }}</span>
          </div>
        </div>
      </template>
    </div>

    <div v-else class="shader-section">
      <div class="shader-section-title">{{ currentCardHoloType }}</div>
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

.shader-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.shader-section-title {
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #f72585;
}

.shader-copy-btn {
  font-size: 0.55rem;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(0, 245, 212, 0.3);
  background: rgba(0, 245, 212, 0.08);
  color: #00f5d4;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.shader-copy-btn:hover {
  background: rgba(0, 245, 212, 0.18);
  border-color: rgba(0, 245, 212, 0.5);
}

.shader-subsection {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #999;
  margin-top: 12px;
  margin-bottom: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
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
