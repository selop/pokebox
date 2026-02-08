import { onBeforeUnmount, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

export function useKeyboardControls() {
  const store = useAppStore()

  function onKeyDown(e: KeyboardEvent) {
    const dims = store.dimensions
    const step = dims.screenH * 0.08

    switch (e.key) {
      case 'ArrowLeft':
        store.targetEye.x -= step
        break
      case 'ArrowRight':
        store.targetEye.x += step
        break
      case 'ArrowUp':
        store.targetEye.y += step
        break
      case 'ArrowDown':
        store.targetEye.y -= step
        break
      case 'w':
      case 'W':
        store.targetEye.z -= step
        break
      case 's':
      case 'S':
        store.targetEye.z += step
        break
      default:
        return
    }

    if (store.targetEye.z < store.config.nearPlane + 0.01) {
      store.targetEye.z = store.config.nearPlane + 0.01
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown)
  })
}
