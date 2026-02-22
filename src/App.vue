<script setup lang="ts">
import { ref } from 'vue'
import ThreeCanvas from './components/ThreeCanvas.vue'
import VideoFeed from './components/VideoFeed.vue'
import StatusIndicator from './components/StatusIndicator.vue'
import TrackingData from './components/TrackingData.vue'
import ToolbarButtons from './components/ToolbarButtons.vue'
import CalibrationPanel from './components/CalibrationPanel.vue'
import ShaderControlsPanel from './components/ShaderControlsPanel.vue'
import InstructionsModal from './components/InstructionsModal.vue'
import BoosterPackModal from './components/BoosterPackModal.vue'
import CardSearch from './components/CardSearch.vue'
import PerfOverlay from './components/PerfOverlay.vue'
import { useFaceTracking } from './composables/useFaceTracking'
import { useAppStore } from './stores/app'

const store = useAppStore()

const videoFeedRef = ref<InstanceType<typeof VideoFeed> | null>(null)
const videoElRef = ref<HTMLVideoElement | null>(null)
const threeCanvasRef = ref<InstanceType<typeof ThreeCanvas> | null>(null)

// Lazy-init face tracking when camera is requested
let faceTrackingStarted = false
const faceTracking = useFaceTracking(videoElRef)

function onEnableCamera() {
  if (faceTrackingStarted) return
  faceTrackingStarted = true
  // Get the video element from the VideoFeed component
  if (videoFeedRef.value?.videoEl) {
    videoElRef.value = videoFeedRef.value.videoEl
  }
  faceTracking.start()
}

async function onEnableGyroscope() {
  const gyroscope = threeCanvasRef.value?.gyroscope
  if (!gyroscope) return
  const ok = await gyroscope.start()
  if (ok) {
    store.inputMode = 'gyroscope'
    store.isTrackingActive = true
    store.statusText = 'Gyroscope active'
    store.showInstructions = false
  }
}
</script>

<template>
  <ThreeCanvas ref="threeCanvasRef" />
  <VideoFeed v-show="store.isPanelOpen && store.isTrackingActive" ref="videoFeedRef" />
  <StatusIndicator v-if="store.isPanelOpen" />
  <TrackingData v-if="store.isPanelOpen && store.isTrackingActive" />
  <ToolbarButtons />
  <CalibrationPanel v-if="!store.isMobile" />
  <ShaderControlsPanel v-if="!store.isMobile" />
  <CardSearch v-if="store.cardDisplayMode !== 'carousel'" />
  <PerfOverlay />
  <BoosterPackModal />
  <InstructionsModal
    :is-mobile="store.isMobile"
    @enable-camera="onEnableCamera"
    @enable-gyroscope="onEnableGyroscope"
  />
</template>
