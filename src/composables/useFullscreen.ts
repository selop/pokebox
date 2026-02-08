import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useFullscreen() {
  const isFullscreen = ref(false)

  function toggle() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen()
    }
  }

  function onFsChange() {
    isFullscreen.value = !!document.fullscreenElement
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFsChange)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFsChange)
  })

  return { isFullscreen, toggle }
}
