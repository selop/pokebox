<script setup lang="ts">
import { ref } from 'vue'
import ThreeCanvas from './components/ThreeCanvas.vue'
import VideoFeed from './components/VideoFeed.vue'
import StatusIndicator from './components/StatusIndicator.vue'
import TrackingData from './components/TrackingData.vue'
import ToolbarButtons from './components/ToolbarButtons.vue'
import CalibrationPanel from './components/CalibrationPanel.vue'
import InstructionsModal from './components/InstructionsModal.vue'
import { useFaceTracking } from './composables/useFaceTracking'

const videoFeedRef = ref<InstanceType<typeof VideoFeed> | null>(null)
const videoElRef = ref<HTMLVideoElement | null>(null)

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
</script>

<template>
  <ThreeCanvas />
  <VideoFeed ref="videoFeedRef" />
  <StatusIndicator />
  <TrackingData />
  <ToolbarButtons />
  <CalibrationPanel />
  <InstructionsModal @enable-camera="onEnableCamera" />
</template>
