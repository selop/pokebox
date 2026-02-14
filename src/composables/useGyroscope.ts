import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { MAX_TILT, SpringValue } from '@/utils/SpringValue'

/** Tilt range in degrees from rest position to full deflection */
const TILT_RANGE = 15

interface DeviceOrientationEvtWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
}

export function useGyroscope() {
  const store = useAppStore()

  const isActive = ref(false)
  const isSupported = ref(typeof DeviceOrientationEvent !== 'undefined')

  const springs = {
    rotateX: new SpringValue(0),
    rotateY: new SpringValue(0),
  }

  const state = {
    rotateX: 0,
    rotateY: 0,
  }

  let restBeta = 45
  let calibrated = false

  function onDeviceOrientation(e: DeviceOrientationEvent) {
    if (e.beta == null || e.gamma == null) return

    // Calibrate rest position on first reading
    if (!calibrated) {
      restBeta = e.beta
      calibrated = true
    }

    let beta = e.beta
    let gamma = e.gamma

    // Adjust axes for landscape orientation
    const angle = screen.orientation?.angle ?? 0
    if (angle === 90) {
      const tmp = beta
      beta = -gamma
      gamma = tmp
    } else if (angle === 270 || angle === -90) {
      const tmp = beta
      beta = gamma
      gamma = -tmp
    } else if (angle === 180) {
      beta = -beta
      gamma = -gamma
    }

    // Normalize to [-1, 1] range
    const ny = Math.max(-1, Math.min(1, (beta - restBeta) / TILT_RANGE))
    const nx = Math.max(-1, Math.min(1, gamma / TILT_RANGE))

    // Drive parallax camera via store.targetEye
    const dims = store.dimensions
    store.targetEye.x = nx * dims.screenW * 0.5
    store.targetEye.y = -ny * dims.screenH * 0.5
    store.targetEye.z = dims.eyeDefaultZ

    // Drive card tilt springs (same convention as mouse tilt)
    springs.rotateX.target = -ny * MAX_TILT
    springs.rotateY.target = -nx * MAX_TILT
  }

  async function start(): Promise<boolean> {
    if (isActive.value) return true

    // iOS 13+ requires explicit permission from a user gesture
    const DOE = DeviceOrientationEvent as unknown as DeviceOrientationEvtWithPermission
    if (typeof DOE.requestPermission === 'function') {
      try {
        const permission = await DOE.requestPermission()
        if (permission !== 'granted') {
          store.statusText = 'Gyroscope permission denied'
          return false
        }
      } catch {
        store.statusText = 'Gyroscope permission error'
        return false
      }
    }

    if (!isSupported.value) {
      store.statusText = 'Gyroscope not supported'
      return false
    }

    calibrated = false
    window.addEventListener('deviceorientation', onDeviceOrientation)
    isActive.value = true
    return true
  }

  function stop() {
    window.removeEventListener('deviceorientation', onDeviceOrientation)
    isActive.value = false
    calibrated = false
  }

  function update(dt: number): void {
    springs.rotateX.update(dt)
    springs.rotateY.update(dt)
    state.rotateX = springs.rotateX.position
    state.rotateY = springs.rotateY.position
  }

  return { start, stop, update, isActive, isSupported, state }
}
