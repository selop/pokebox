const MIN_DISTANCE = 50 // px
const MAX_DURATION = 500 // ms
const MIN_VELOCITY = 0.3 // px/ms

interface SwipeCallbacks {
  onSwipeUp: () => void
  onSwipeDown: () => void
}

/**
 * Vertical swipe gesture detector for touch devices.
 * Follows the attach/detach pattern of useMouseTilt.
 */
export function useSwipeGesture(callbacks: SwipeCallbacks) {
  let canvas: HTMLElement | null = null
  let startY = 0
  let startTime = 0
  let tracking = false

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    startY = touch.clientY
    startTime = performance.now()
    tracking = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking) return
    // Prevent page scroll when swiping on canvas
    e.preventDefault()
  }

  function onTouchEnd(e: TouchEvent) {
    if (!tracking) return
    tracking = false

    const touch = e.changedTouches[0]
    if (!touch) return

    const dy = touch.clientY - startY
    const duration = performance.now() - startTime
    const absDy = Math.abs(dy)
    const velocity = absDy / duration

    if (absDy < MIN_DISTANCE || duration > MAX_DURATION || velocity < MIN_VELOCITY) return

    if (dy < 0) {
      callbacks.onSwipeUp()
    } else {
      callbacks.onSwipeDown()
    }
  }

  function attach(el: HTMLElement): void {
    canvas = el
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: true })
  }

  function detach(): void {
    if (!canvas) return
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
    canvas = null
  }

  return { attach, detach }
}
