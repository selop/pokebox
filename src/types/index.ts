export interface AppConfig {
  screenWidthCm: number
  screenHeightCm: number
  viewingDistanceCm: number
  worldScale: number
  movementScale: number
  boxDepthRatio: number
  smoothing: number
  holoIntensity: number
  cardSize: number
  cardSpinSpeed: number
  nearPlane: number
  farPlane: number
}

export interface CardTransform {
  x: number // -50..50 percent of screenW from centre
  y: number // -50..50 percent of screenH from centre
  z: number // 0..100 percent of boxD from opening
  rotY: number // -180..180 degrees
}

export interface CardCatalogEntry {
  id: string
  label: string
  front: string // path relative to public/
  mask: string // path relative to public/
  foil: string // path relative to public/
}

export interface EyePosition {
  x: number
  y: number
  z: number
}

export type SceneMode = 'furniture' | 'cards'
export type RenderMode = 'xray' | 'solid'
export type CardDisplayMode = 'single' | 'triple'
export type ShaderStyle = 'holo' | 'parallax'

export interface DerivedDimensions {
  screenW: number
  screenH: number
  boxD: number
  eyeDefaultZ: number
}
