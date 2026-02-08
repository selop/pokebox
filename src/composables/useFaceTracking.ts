import type { Ref } from 'vue'
import { useAppStore } from '@/stores/app'

// MediaPipe types (loaded from CDN-style npm package)
declare class FaceDetection {
  constructor(opts: { locateFile: (file: string) => string })
  setOptions(opts: { model: string; minDetectionConfidence: number }): void
  onResults(cb: (results: FaceDetectionResults) => void): void
  send(opts: { image: HTMLVideoElement }): Promise<void>
}

interface FaceDetectionResults {
  detections?: Array<{
    boundingBox: {
      xCenter?: number
      yCenter?: number
      width?: number
      height?: number
      originX?: number
      originY?: number
    }
  }>
}

export function useFaceTracking(videoRef: Ref<HTMLVideoElement | null>) {
  const store = useAppStore()
  let faceDetector: FaceDetection | null = null
  let detecting = false

  async function start() {
    const videoElement = videoRef.value
    if (!videoElement) return

    // Dynamically import mediapipe — the npm package exposes global-style modules
    const { FaceDetection: FD } = await import('@mediapipe/face_detection')
    faceDetector = new FD({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    })
    faceDetector.setOptions({ model: 'short', minDetectionConfidence: 0.5 })
    faceDetector.onResults(onFaceResults)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      videoElement.srcObject = stream
      await new Promise<void>((r) => {
        videoElement.onloadedmetadata = () => r()
      })

      store.isTrackingActive = true
      store.statusText = 'Tracking active'
      store.showInstructions = false
      detecting = true
      detectLoop()
    } catch (err) {
      console.error('Camera error:', err)
      store.statusText = 'Camera denied / error'
    }
  }

  async function detectLoop() {
    if (!detecting || !faceDetector || !videoRef.value) return
    if (videoRef.value.readyState >= 2) {
      await faceDetector.send({ image: videoRef.value })
    }
    requestAnimationFrame(detectLoop)
  }

  function onFaceResults(results: FaceDetectionResults) {
    if (!results.detections || results.detections.length === 0) return

    const det = results.detections[0]!
    const bbox = det.boundingBox

    let fx: number, fy: number, faceW: number
    if (bbox.xCenter !== undefined) {
      fx = bbox.xCenter
      fy = bbox.yCenter ?? 0.5
      faceW = bbox.width || 0.2
    } else {
      const w = bbox.width || 0.2
      const h = bbox.height || 0.2
      fx = (bbox.originX || 0) + w / 2
      fy = (bbox.originY || 0) + h / 2
      faceW = w
    }

    const dims = store.dimensions
    const headXWorld = -(fx - 0.5) * dims.screenW * store.config.movementScale
    const headYWorld = -(fy - 0.5) * dims.screenH * store.config.movementScale

    const refFaceW = 0.25
    const depthScale = refFaceW / Math.max(faceW, 0.05)
    const headZWorld = dims.eyeDefaultZ * depthScale

    store.targetEye.x = headXWorld
    store.targetEye.y = headYWorld
    store.targetEye.z = Math.max(headZWorld, store.config.nearPlane + 0.01)
  }

  function stop() {
    detecting = false
  }

  return { start, stop }
}
