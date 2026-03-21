<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { CARD_CATALOG } from '@/data/cardCatalog'
import type { ShaderConfigs } from '@/types'

const store = useAppStore()
const copied = ref(false)

type ShaderKey = keyof ShaderConfigs

type SliderDef = {
  label: string
  prop: string
  min: number
  max: number
  step: number
  suffix?: '°' | '%'
}

type SectionItem = SliderDef | { subsection: string }

function isSubsection(item: SectionItem): item is { subsection: string } {
  return 'subsection' in item
}

type ShaderSection = {
  id: string
  shaderKey: ShaderKey
  title: string
  icon: string
  items: SectionItem[]
}

function getShaderObj(section: ShaderSection): Record<string, number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return store.config.shaders[section.shaderKey] as any
}

function displayValue(section: ShaderSection, slider: SliderDef): string {
  const v = getShaderObj(section)[slider.prop]!
  if (slider.suffix === '%') return `${Math.round(v * 100)}%`
  const formatted = v % 1 === 0 ? String(v) : v.toFixed(2)
  return slider.suffix ? `${formatted}${slider.suffix}` : formatted
}

function getSliderValue(section: ShaderSection, slider: SliderDef): number {
  return getShaderObj(section)[slider.prop]!
}

function onShaderSlider(section: ShaderSection, prop: string, value: string) {
  getShaderObj(section)[prop] = parseFloat(value)
}

const sections: ShaderSection[] = [
  {
    id: 'regular-holo',
    shaderKey: 'regularHolo',
    title: 'Regular Holo',
    icon: '\u{1F308}',
    items: [
      { subsection: 'Pillars' },
      { label: 'Density', prop: 'pillarDensity', min: 1, max: 20, step: 0.5 },
      { label: 'Sharpness', prop: 'pillarSharpness', min: 0, max: 1, step: 0.05 },
      { label: 'Tilt X', prop: 'pillarTiltX', min: 0, max: 10, step: 0.1 },
      { label: 'Tilt Y', prop: 'pillarTiltY', min: 0, max: 10, step: 0.1 },
      { subsection: 'Color' },
      { label: 'Brightness', prop: 'pillarBrightness', min: 0.5, max: 3, step: 0.05 },
      { label: 'Contrast', prop: 'pillarContrast', min: 0.5, max: 5, step: 0.05 },
      { label: 'Saturation', prop: 'pillarSaturation', min: 0, max: 2, step: 0.05 },
      { subsection: 'Glare' },
      { label: 'Opacity', prop: 'glareOpacity', min: 0, max: 1, step: 0.05 },
      { label: 'Radius', prop: 'glareRadius', min: 0.1, max: 2, step: 0.05 },
    ],
  },
  {
    id: 'illustration-rare',
    shaderKey: 'illustrationRare',
    title: 'Illustration Rare',
    icon: '✨',
    items: [
      { label: 'Rainbow scale', prop: 'rainbowScale', min: 0.5, max: 5, step: 0.1 },
      { label: 'Bar angle', prop: 'barAngle', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Bar density', prop: 'barDensity', min: 0.5, max: 10, step: 0.1 },
      { subsection: 'Layer 1 Bars' },
      { label: 'Offset Y', prop: 'barOffsetBgYMult', min: -5, max: 5, step: 0.05 },
      { label: 'Width', prop: 'barWidth', min: 0.1, max: 10, step: 0.05 },
      { label: 'Intensity', prop: 'barIntensity', min: 0, max: 20, step: 0.05 },
      { label: 'Hue', prop: 'barHue', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Med sat', prop: 'barMediumSaturation', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Med light', prop: 'barMediumLightness', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Bright sat', prop: 'barBrightSaturation', min: 0, max: 1, step: 0.01, suffix: '%' },
      {
        label: 'Bright light',
        prop: 'barBrightLightness',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      { subsection: 'Layer 2 Bars' },
      { label: 'Density', prop: 'barDensity2', min: 0.5, max: 10, step: 0.1 },
      { label: 'Offset Y', prop: 'bar2OffsetBgYMult', min: -5, max: 5, step: 0.05 },
      { label: 'Width', prop: 'barWidth2', min: 0.1, max: 10, step: 0.05 },
      { label: 'Intensity', prop: 'barIntensity2', min: 0, max: 20, step: 0.05 },
      { label: 'Hue', prop: 'barHue2', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Med sat', prop: 'barMediumSaturation2', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Med light', prop: 'barMediumLightness2', min: 0, max: 1, step: 0.01, suffix: '%' },
      {
        label: 'Bright sat',
        prop: 'barBrightSaturation2',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      {
        label: 'Bright light',
        prop: 'barBrightLightness2',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      { subsection: 'Shine & Glare' },
      { label: 'Shine contrast', prop: 'shine1Contrast', min: 1, max: 5, step: 0.05 },
      { label: 'Shine saturate', prop: 'shine1Saturation', min: 0, max: 2, step: 0.05 },
      { label: 'Shine 2 opacity', prop: 'shine2Opacity', min: 0, max: 1, step: 0.05 },
      { label: 'Glare opacity', prop: 'glareOpacity', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: 'special-illustration-rare',
    shaderKey: 'specialIllustrationRare',
    title: 'Special IR',
    icon: '✦',
    items: [
      { subsection: 'Shine (Rainbow)' },
      { label: 'Angle', prop: 'shineAngle', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Frequency', prop: 'shineFrequency', min: 1, max: 30, step: 0.5 },
      { label: 'Brightness', prop: 'shineBrightness', min: 0, max: 3, step: 0.05 },
      { label: 'Contrast', prop: 'shineContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', prop: 'shineSaturation', min: 0, max: 5, step: 0.05 },
      { subsection: 'Color Wash' },
      { label: 'Scale', prop: 'washScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Tilt sensitivity', prop: 'washTiltSensitivity', min: 0, max: 10, step: 0.1 },
      { label: 'Saturation', prop: 'washSaturation', min: 0, max: 5, step: 0.05 },
      { label: 'Contrast', prop: 'washContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Opacity', prop: 'washOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Glitter' },
      { label: 'Contrast', prop: 'glitterContrast', min: 0, max: 5, step: 0.1 },
      { label: 'Saturation', prop: 'glitterSaturation', min: 0, max: 5, step: 0.1 },
      { subsection: 'Tilt Sparkle (Vertical)' },
      { label: 'Scale', prop: 'tiltSparkleScale', min: 0.5, max: 20, step: 0.5 },
      { label: 'Intensity', prop: 'tiltSparkleIntensity', min: 0, max: 2, step: 0.05 },
      { label: 'Tilt sensitivity', prop: 'tiltSparkleTiltSensitivity', min: 0.05, max: 3, step: 0.05 },
      { subsection: 'Tilt Sparkle (Horizontal)' },
      { label: 'Scale', prop: 'tiltSparkle2Scale', min: 0.5, max: 20, step: 0.5 },
      { label: 'Intensity', prop: 'tiltSparkle2Intensity', min: 0, max: 2, step: 0.05 },
      { label: 'Tilt sensitivity', prop: 'tiltSparkle2TiltSensitivity', min: 0.05, max: 3, step: 0.05 },
      { subsection: 'Overall' },
      { label: 'Base brightness', prop: 'baseBrightness', min: 0, max: 2, step: 0.05 },
      { label: 'Base contrast', prop: 'baseContrast', min: 0, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'tera-rainbow-rare',
    shaderKey: 'teraRainbowRare',
    title: 'Tera Rainbow',
    icon: '💠',
    items: [
      { subsection: 'Holo Shine' },
      { label: 'Holo opacity', prop: 'holoOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Rainbow scale', prop: 'rainbowScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Rainbow shift', prop: 'rainbowShift', min: 0, max: 10, step: 0.1 },
      { label: 'Mask threshold', prop: 'maskThreshold', min: 0, max: 1, step: 0.01 },
      { subsection: 'Metallic Sparkle' },
      { label: 'Intensity', prop: 'sparkleIntensity', min: 0, max: 2, step: 0.05 },
      { label: 'Radius', prop: 'sparkleRadius', min: 0.1, max: 3, step: 0.1 },
      { label: 'Contrast', prop: 'sparkleContrast', min: 0, max: 5, step: 0.1 },
      { label: 'Color shift', prop: 'sparkleColorShift', min: 0, max: 10, step: 0.1 },
      { subsection: 'Etch Sparkle (T/B)' },
      { label: 'Scale', prop: 'etchSparkleScale', min: 0.5, max: 10, step: 0.1 },
      { label: 'Intensity', prop: 'etchSparkleIntensity', min: 0, max: 2, step: 0.05 },
      {
        label: 'Tilt sensitivity',
        prop: 'etchSparkleTiltSensitivity',
        min: 0.0,
        max: 1.0,
        step: 0.01,
      },
      { label: 'Tex mix', prop: 'etchSparkleTexMix', min: 0, max: 1, step: 0.05 },
      { subsection: 'Etch Sparkle (L/R)' },
      { label: 'Scale', prop: 'etchSparkle2Scale', min: 0.5, max: 10, step: 0.1 },
      { label: 'Intensity', prop: 'etchSparkle2Intensity', min: 0, max: 2, step: 0.05 },
      {
        label: 'Tilt sensitivity',
        prop: 'etchSparkle2TiltSensitivity',
        min: 0,
        max: 1,
        step: 0.01,
      },
      { label: 'Tex mix', prop: 'etchSparkle2TexMix', min: 0, max: 1, step: 0.05 },
      { subsection: 'Base' },
      { label: 'Brightness', prop: 'baseBrightness', min: 0, max: 3, step: 0.05 },
      { label: 'Contrast', prop: 'baseContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', prop: 'baseSaturation', min: 0, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'tera-shiny-rare',
    shaderKey: 'teraShinyRare',
    title: 'Tera Shiny',
    icon: '✨',
    items: [
      { subsection: 'Holo Shine' },
      { label: 'Holo opacity', prop: 'holoOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Rainbow scale', prop: 'rainbowScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Rainbow shift', prop: 'rainbowShift', min: 0, max: 10, step: 0.1 },
      { label: 'Mask threshold', prop: 'maskThreshold', min: 0, max: 1, step: 0.01 },
      { subsection: 'Mosaic Effect' },
      { label: 'Cell size', prop: 'mosaicScale', min: 0.5, max: 50, step: 0.5 },
      { label: 'Intensity', prop: 'mosaicIntensity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Saturation', prop: 'mosaicSaturation', min: 0, max: 5, step: 0.05 },
      { label: 'Contrast', prop: 'mosaicContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Foil threshold', prop: 'mosaicFoilThreshold', min: 0, max: 1, step: 0.01 },
      { subsection: 'Metallic Sparkle' },
      { label: 'Intensity', prop: 'sparkleIntensity', min: 0, max: 2, step: 0.05 },
      { label: 'Radius', prop: 'sparkleRadius', min: 0.1, max: 3, step: 0.1 },
      { label: 'Contrast', prop: 'sparkleContrast', min: 0, max: 5, step: 0.1 },
      { label: 'Color shift', prop: 'sparkleColorShift', min: 0, max: 10, step: 0.1 },
      { subsection: 'Etch Sparkle (T/B)' },
      { label: 'Scale', prop: 'etchSparkleScale', min: 0.5, max: 10, step: 0.1 },
      { label: 'Intensity', prop: 'etchSparkleIntensity', min: 0, max: 2, step: 0.05 },
      {
        label: 'Tilt sensitivity',
        prop: 'etchSparkleTiltSensitivity',
        min: 0.0,
        max: 1.0,
        step: 0.01,
      },
      { label: 'Tex mix', prop: 'etchSparkleTexMix', min: 0, max: 1, step: 0.05 },
      { subsection: 'Etch Sparkle (L/R)' },
      { label: 'Scale', prop: 'etchSparkle2Scale', min: 0.5, max: 10, step: 0.1 },
      { label: 'Intensity', prop: 'etchSparkle2Intensity', min: 0, max: 2, step: 0.05 },
      {
        label: 'Tilt sensitivity',
        prop: 'etchSparkle2TiltSensitivity',
        min: 0,
        max: 1,
        step: 0.01,
      },
      { label: 'Tex mix', prop: 'etchSparkle2TexMix', min: 0, max: 1, step: 0.05 },
      { subsection: 'Base' },
      { label: 'Brightness', prop: 'baseBrightness', min: 0, max: 3, step: 0.05 },
      { label: 'Contrast', prop: 'baseContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', prop: 'baseSaturation', min: 0, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'ultra-rare',
    shaderKey: 'ultraRare',
    title: 'Ultra Rare',
    icon: '💎',
    items: [
      { label: 'Base brightness', prop: 'baseBrightness', min: 0, max: 3, step: 0.05 },
      { subsection: 'Shine Before' },
      { label: 'Brightness', prop: 'shineBrightness', min: 0, max: 1, step: 0.005 },
      { label: 'Contrast', prop: 'shineContrast', min: 0, max: 1, step: 0.005 },
      { label: 'Saturation', prop: 'shineSaturation', min: 0, max: 20, step: 0.1 },
      { subsection: 'Shine After' },
      { label: 'Brightness', prop: 'shineAfterBrightness', min: 0, max: 3, step: 0.05 },
      { label: 'Contrast', prop: 'shineAfterContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', prop: 'shineAfterSaturation', min: 0, max: 3, step: 0.05 },
      { subsection: 'Shine Base' },
      { label: 'Brightness', prop: 'shineBaseBrightness', min: 0, max: 5, step: 0.05 },
      { label: 'Contrast', prop: 'shineBaseContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', prop: 'shineBaseSaturation', min: 0, max: 5, step: 0.05 },
      { subsection: 'Glare' },
      { label: 'Glare contrast', prop: 'glareContrast', min: 0, max: 5, step: 0.05 },
      { label: 'Glare2 contrast', prop: 'glare2Contrast', min: 0, max: 3, step: 0.05 },
      { subsection: 'Gradients' },
      { label: 'Rotate delta', prop: 'rotateDelta', min: 0, max: 360, step: 0.5, suffix: '°' },
      { label: 'Angle1 mult', prop: 'angle1Mult', min: -5, max: 5, step: 0.05 },
      { label: 'Angle2 mult', prop: 'angle2Mult', min: -5, max: 5, step: 0.05 },
      { label: 'BgY mult 1', prop: 'bgYMult1', min: -5, max: 5, step: 0.05 },
      { label: 'BgY mult 2', prop: 'bgYMult2', min: -5, max: 5, step: 0.05 },
      { subsection: 'Diagonal Bars' },
      { label: 'Bar angle', prop: 'barAngle', min: 0, max: 360, step: 0.5, suffix: '°' },
      { label: 'Offset BgX mult', prop: 'barOffsetBgXMult', min: -5, max: 5, step: 0.05 },
      { label: 'Offset BgY mult', prop: 'barOffsetBgYMult', min: -5, max: 5, step: 0.05 },
      { label: 'Bar frequency', prop: 'barFrequency', min: 0.5, max: 20, step: 0.1 },
      { label: 'Intensity start 1', prop: 'barIntensityStart1', min: 0, max: 1, step: 0.01 },
      { label: 'Intensity end 1', prop: 'barIntensityEnd1', min: 0, max: 1, step: 0.01 },
      { label: 'Intensity start 2', prop: 'barIntensityStart2', min: 0, max: 1, step: 0.01 },
      { label: 'Intensity end 2', prop: 'barIntensityEnd2', min: 0, max: 1, step: 0.01 },
      { subsection: 'Metallic Sparkle' },
      { label: 'Intensity', prop: 'sparkleIntensity', min: 0, max: 3, step: 0.05 },
      { label: 'Radius', prop: 'sparkleRadius', min: 0.1, max: 1.5, step: 0.05 },
      { label: 'Contrast', prop: 'sparkleContrast', min: 0.5, max: 10, step: 0.1 },
      { label: 'Color shift', prop: 'sparkleColorShift', min: 0, max: 5, step: 0.1 },
    ],
  },
  {
    id: 'rainbow-rare',
    shaderKey: 'rainbowRare',
    title: 'Rainbow Rare',
    icon: '🌈',
    items: [
      { label: 'Base brightness', prop: 'baseBrightness', min: 0, max: 3, step: 0.05 },
      { subsection: 'Shine' },
      { label: 'Brightness', prop: 'shineBrightness', min: 0, max: 1, step: 0.005 },
      { label: 'Contrast', prop: 'shineContrast', min: 0, max: 1, step: 0.005 },
      { label: 'Saturation', prop: 'shineSaturation', min: 0, max: 20, step: 0.1 },
      { subsection: 'Shine Base' },
      { label: 'Brightness', prop: 'shineBaseBrightness', min: 0, max: 5, step: 0.05 },
      { label: 'Contrast', prop: 'shineBaseContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', prop: 'shineBaseSaturation', min: 0, max: 5, step: 0.05 },
      { subsection: 'Glare' },
      { label: 'Glare contrast', prop: 'glareContrast', min: 0, max: 5, step: 0.05 },
      { label: 'Glare2 contrast', prop: 'glare2Contrast', min: 0, max: 3, step: 0.05 },
      { subsection: 'Metallic Sparkle' },
      { label: 'Intensity', prop: 'sparkleIntensity', min: 0, max: 3, step: 0.05 },
      { label: 'Radius', prop: 'sparkleRadius', min: 0.1, max: 1.5, step: 0.05 },
      { label: 'Contrast', prop: 'sparkleContrast', min: 0.5, max: 10, step: 0.1 },
      { label: 'Color shift', prop: 'sparkleColorShift', min: 0, max: 5, step: 0.1 },
    ],
  },
  {
    id: 'master-ball',
    shaderKey: 'masterBall',
    title: 'Master Ball',
    icon: '🔮',
    items: [
      { subsection: 'Rainbow' },
      { label: 'Scale', prop: 'rainbowScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Tilt shift', prop: 'rainbowShift', min: 0, max: 10, step: 0.1 },
      { label: 'Opacity', prop: 'rainbowOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Mosaic Effect' },
      { label: 'Cell size', prop: 'mosaicScale', min: 0.5, max: 20, step: 0.5 },
      { label: 'Intensity', prop: 'mosaicIntensity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Saturation', prop: 'mosaicSaturation', min: 0, max: 5, step: 0.05 },
      { label: 'Contrast', prop: 'mosaicContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Foil threshold', prop: 'mosaicFoilThreshold', min: 0, max: 1, step: 0.01 },
      { subsection: 'Etch' },
      { label: 'Opacity', prop: 'etchOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Contrast', prop: 'etchContrast', min: 0.1, max: 5, step: 0.1 },
      { label: 'Stamp', prop: 'etchStampOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      {
        label: 'Stamp holo',
        prop: 'etchStampHoloOpacity',
        min: 0,
        max: 1,
        step: 0.05,
        suffix: '%',
      },
      { label: 'Stamp holo scale', prop: 'etchStampHoloScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Stamp mask threshold', prop: 'etchStampMaskThreshold', min: 0, max: 1, step: 0.01 },
      { subsection: 'Sparkle (T/B)' },
      { label: 'Scale', prop: 'sparkleScale', min: 0.5, max: 5.0, step: 0.05 },
      { label: 'Intensity', prop: 'sparkleIntensity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Tilt sensitivity', prop: 'sparkleTiltSensitivity', min: 0, max: 0.5, step: 0.01 },
      { label: 'Tex mix', prop: 'sparkleTexMix', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Sparkle 2 (L/R)' },
      { label: 'Scale', prop: 'sparkle2Scale', min: 0.5, max: 5.0, step: 0.05 },
      { label: 'Intensity', prop: 'sparkle2Intensity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Tilt sensitivity', prop: 'sparkle2TiltSensitivity', min: 0, max: 0.5, step: 0.01 },
      { label: 'Tex mix', prop: 'sparkle2TexMix', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Glare' },
      { label: 'Opacity', prop: 'glareOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Contrast', prop: 'glareContrast', min: 0, max: 5, step: 0.05 },
      { label: 'Saturation', prop: 'glareSaturation', min: 0, max: 3, step: 0.05 },
      { subsection: 'Overall' },
      { label: 'Brightness', prop: 'baseBrightness', min: 0.5, max: 2, step: 0.05 },
      { label: 'Contrast', prop: 'baseContrast', min: 0.5, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'shiny-rare',
    shaderKey: 'shinyRare',
    title: 'Shiny Rare',
    icon: '🌟',
    items: [
      { subsection: 'Rainbow' },
      { label: 'Scale', prop: 'rainbowScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Tilt shift', prop: 'rainbowShift', min: 0, max: 10, step: 0.1 },
      { label: 'Opacity', prop: 'rainbowOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Metal Tilt' },
      { label: 'Intensity', prop: 'metalIntensity', min: 0, max: 2, step: 0.05 },
      { label: 'Mask threshold', prop: 'metalMaskThreshold', min: 0.5, max: 1, step: 0.01 },
      { label: 'Tilt sensitivity', prop: 'metalTiltSensitivity', min: 0, max: 10, step: 0.1 },
      { label: 'Tilt threshold', prop: 'metalTiltThreshold', min: 0, max: 1, step: 0.05 },
      { label: 'Brightness', prop: 'metalBrightness', min: 0, max: 3, step: 0.05 },
      { label: 'Noise scale', prop: 'metalNoiseScale', min: 0.5, max: 10, step: 0.1 },
      { label: 'Saturation', prop: 'metalSaturation', min: 0, max: 5, step: 0.1 },
      { subsection: 'Layer 1 Bars' },
      { label: 'Bar angle', prop: 'barAngle', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Density', prop: 'barDensity', min: 0.5, max: 10, step: 0.1 },
      { label: 'Offset Y', prop: 'barOffsetBgYMult', min: -5, max: 5, step: 0.05 },
      { label: 'Width', prop: 'barWidth', min: 0.1, max: 10, step: 0.05 },
      { label: 'Intensity', prop: 'barIntensity', min: 0, max: 20, step: 0.05 },
      { label: 'Hue', prop: 'barHue', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Med sat', prop: 'barMediumSaturation', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Med light', prop: 'barMediumLightness', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Bright sat', prop: 'barBrightSaturation', min: 0, max: 1, step: 0.01, suffix: '%' },
      {
        label: 'Bright light',
        prop: 'barBrightLightness',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      { subsection: 'Layer 2 Bars' },
      { label: 'Density', prop: 'barDensity2', min: 0.5, max: 10, step: 0.1 },
      { label: 'Offset Y', prop: 'bar2OffsetBgYMult', min: -5, max: 5, step: 0.05 },
      { label: 'Width', prop: 'barWidth2', min: 0.1, max: 10, step: 0.05 },
      { label: 'Intensity', prop: 'barIntensity2', min: 0, max: 20, step: 0.05 },
      { label: 'Hue', prop: 'barHue2', min: 0, max: 360, step: 1, suffix: '°' },
      { label: 'Med sat', prop: 'barMediumSaturation2', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Med light', prop: 'barMediumLightness2', min: 0, max: 1, step: 0.01, suffix: '%' },
      {
        label: 'Bright sat',
        prop: 'barBrightSaturation2',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      {
        label: 'Bright light',
        prop: 'barBrightLightness2',
        min: 0,
        max: 1,
        step: 0.01,
        suffix: '%',
      },
      { subsection: 'Shine & Glare' },
      { label: 'Shine contrast', prop: 'shine1Contrast', min: 1, max: 5, step: 0.05 },
      { label: 'Shine saturate', prop: 'shine1Saturation', min: 0, max: 2, step: 0.05 },
      { label: 'Shine 2 opacity', prop: 'shine2Opacity', min: 0, max: 1, step: 0.05 },
      { subsection: 'Etch' },
      { label: 'Opacity', prop: 'etchOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Contrast', prop: 'etchContrast', min: 0.1, max: 5, step: 0.1 },
      { label: 'Stamp', prop: 'etchStampOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      {
        label: 'Stamp holo',
        prop: 'etchStampHoloOpacity',
        min: 0,
        max: 1,
        step: 0.05,
        suffix: '%',
      },
      { label: 'Stamp holo scale', prop: 'etchStampHoloScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Stamp mask threshold', prop: 'etchStampMaskThreshold', min: 0, max: 1, step: 0.01 },
      { subsection: 'Glare' },
      { label: 'Opacity', prop: 'glareOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { label: 'Contrast', prop: 'glareContrast', min: 0, max: 5, step: 0.05 },
      { label: 'Saturation', prop: 'glareSaturation', min: 0, max: 3, step: 0.05 },
      { subsection: 'Overall' },
      { label: 'Brightness', prop: 'baseBrightness', min: 0.5, max: 2, step: 0.05 },
      { label: 'Contrast', prop: 'baseContrast', min: 0.5, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'reverse-holo',
    shaderKey: 'reverseHolo',
    title: 'Reverse Holo',
    icon: '🪞',
    items: [
      { subsection: 'Shine' },
      { label: 'Intensity', prop: 'shineIntensity', min: 0, max: 5, step: 0.05 },
      { label: 'Opacity', prop: 'shineOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Shine Color' },
      { label: 'Red', prop: 'shineColorR', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Green', prop: 'shineColorG', min: 0, max: 1, step: 0.01, suffix: '%' },
      { label: 'Blue', prop: 'shineColorB', min: 0, max: 1, step: 0.01, suffix: '%' },
      { subsection: 'Specular' },
      { label: 'Radius', prop: 'specularRadius', min: 0.1, max: 1.5, step: 0.05 },
      { label: 'Power', prop: 'specularPower', min: 0.5, max: 8, step: 0.1 },
      { subsection: 'Overall' },
      { label: 'Base brightness', prop: 'baseBrightness', min: 0.4, max: 1.0, step: 0.05 },
      { label: 'Base contrast', prop: 'baseContrast', min: 0, max: 5, step: 0.05 },
      { label: 'Base saturation', prop: 'baseSaturation', min: 0, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'flatsilver-reverse',
    shaderKey: 'flatsilverReverse',
    title: 'Flat Silver Reverse',
    icon: '🪩',
    items: [
      { subsection: 'Rainbow' },
      { label: 'Scale', prop: 'rainbowScale', min: 0.1, max: 5, step: 0.1 },
      { label: 'Tilt shift', prop: 'rainbowShift', min: 0, max: 5, step: 0.1 },
      { label: 'Saturation', prop: 'rainbowSaturation', min: 0, max: 2, step: 0.05 },
      { label: 'Opacity', prop: 'rainbowOpacity', min: 0, max: 1, step: 0.05, suffix: '%' },
      { subsection: 'Spotlight' },
      { label: 'Radius', prop: 'spotlightRadius', min: 0.1, max: 2, step: 0.05 },
      { label: 'Intensity', prop: 'spotlightIntensity', min: 0, max: 3, step: 0.05 },
      { subsection: 'Grain' },
      { label: 'Scale', prop: 'grainScale', min: 0.1, max: 2.0, step: 0.01 },
      { label: 'Intensity', prop: 'grainIntensity', min: 0, max: 1, step: 0.01 },
      { subsection: 'Overall' },
      { label: 'Brightness', prop: 'baseBrightness', min: 0.5, max: 2, step: 0.05 },
      { label: 'Contrast', prop: 'baseContrast', min: 0, max: 3, step: 0.05 },
      { label: 'Saturation', prop: 'baseSaturation', min: 0, max: 3, step: 0.05 },
    ],
  },
]

function sliderProps(section: ShaderSection): string[] {
  return section.items.filter((item): item is SliderDef => !isSubsection(item)).map((s) => s.prop)
}

function formatNum(v: number): string {
  return v % 1 === 0 ? v.toFixed(1) : parseFloat(v.toPrecision(6)).toString()
}

async function copyDefaults(section: ShaderSection) {
  const props = sliderProps(section)
  const shaderConfig = getShaderObj(section)
  const lines = props.map((p) => `  ${p}: ${formatNum(shaderConfig[p]!)},`)
  await navigator.clipboard.writeText(lines.join('\n'))
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const currentCardHoloType = computed(() => {
  const card = CARD_CATALOG.value.find((c) => c.id === store.currentCardId)
  return card?.holoType || 'illustration-rare'
})

const activeSection = computed(() => sections.find((s) => s.id === currentCardHoloType.value))

// Close panel when leaving single mode
watch(
  () => store.cardDisplayMode,
  (mode) => {
    if (mode !== 'single') store.isShaderPanelOpen = false
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
              :value="getSliderValue(activeSection, item)"
              @input="
                onShaderSlider(activeSection, item.prop, ($event.target as HTMLInputElement).value)
              "
            />
            <span class="shader-value">{{ displayValue(activeSection, item) }}</span>
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

@media (max-width: 768px) {
  .shader-panel {
    width: calc(100vw - 32px);
    right: 16px;
    top: 50px;
    padding: 16px;
    max-height: calc(100vh - 66px);
  }
}
</style>
