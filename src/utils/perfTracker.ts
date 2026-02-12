import { reactive } from 'vue'

export interface PerfMetrics {
  // Navigation metrics (last navigation)
  assetLoadTime: number
  sceneRebuildTime: number
  totalNavigationTime: number

  // Frame metrics (rolling averages)
  fps: number
  frameTime: number

  // WebGL stats (from renderer.info)
  drawCalls: number
  triangles: number
  textures: number
  geometries: number
}

const ROLLING_WINDOW = 60

class PerfTracker {
  readonly metrics = reactive<PerfMetrics>({
    assetLoadTime: 0,
    sceneRebuildTime: 0,
    totalNavigationTime: 0,
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
  })

  private frameTimes: number[] = []
  private lastFrameTime = 0

  // Timing marks
  private navStartTime = 0
  private assetLoadStartTime = 0
  private rebuildStartTime = 0

  markNavigationStart(): void {
    this.navStartTime = performance.now()
  }

  markAssetLoadStart(): void {
    this.assetLoadStartTime = performance.now()
  }

  markAssetLoadEnd(): void {
    if (this.assetLoadStartTime > 0) {
      this.metrics.assetLoadTime = performance.now() - this.assetLoadStartTime
      this.assetLoadStartTime = 0
    }
  }

  markRebuildStart(): void {
    this.rebuildStartTime = performance.now()
  }

  markRebuildEnd(): void {
    if (this.rebuildStartTime > 0) {
      this.metrics.sceneRebuildTime = performance.now() - this.rebuildStartTime
      this.rebuildStartTime = 0
    }
  }

  markNavigationEnd(): void {
    if (this.navStartTime > 0) {
      this.metrics.totalNavigationTime = performance.now() - this.navStartTime
      this.navStartTime = 0
    }
  }

  /** Call once per frame to update FPS and frame time rolling averages. */
  sampleFrame(): void {
    const now = performance.now()
    if (this.lastFrameTime > 0) {
      const dt = now - this.lastFrameTime
      this.frameTimes.push(dt)
      if (this.frameTimes.length > ROLLING_WINDOW) {
        this.frameTimes.shift()
      }
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      this.metrics.frameTime = avg
      this.metrics.fps = avg > 0 ? 1000 / avg : 0
    }
    this.lastFrameTime = now
  }

  /** Sample renderer.info stats. */
  sampleRendererInfo(info: {
    render: { calls: number; triangles: number }
    memory: { textures: number; geometries: number }
  }): void {
    this.metrics.drawCalls = info.render.calls
    this.metrics.triangles = info.render.triangles
    this.metrics.textures = info.memory.textures
    this.metrics.geometries = info.memory.geometries
  }
}

export const perfTracker = new PerfTracker()
