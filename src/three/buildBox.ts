import {
  AmbientLight,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
} from 'three'
import type { Texture } from 'three'
import type { DerivedDimensions, RenderMode } from '@/types'

export function buildBoxShell(
  scene: Scene,
  dims: DerivedDimensions,
  renderMode: RenderMode,
  wallTexture?: Texture | null,
): void {
  const { screenW, screenH, boxD } = dims
  const hw = screenW / 2
  const hh = screenH / 2

  // ── Grid materials ──
  const gridColor = 0xcc7744
  const gridColorDim = 0x884422
  const gridMat = new LineBasicMaterial({ color: gridColor })
  const gridMatDim = new LineBasicMaterial({
    color: gridColorDim,
    transparent: true,
    opacity: 0.9,
  })

  function drawGrid(
    origin: Vector3,
    uDir: Vector3,
    vDir: Vector3,
    uLen: number,
    vLen: number,
    uDivs: number,
    vDivs: number,
  ) {
    const u = uDir.clone().normalize()
    const v = vDir.clone().normalize()

    for (let i = 0; i <= vDivs; i++) {
      const f = i / vDivs
      const isBorder = i === 0 || i === vDivs
      const start = origin.clone().add(v.clone().multiplyScalar(f * vLen))
      const end = start.clone().add(u.clone().multiplyScalar(uLen))
      const geo = new BufferGeometry().setFromPoints([start, end])
      scene.add(new Line(geo, isBorder ? gridMat : gridMatDim))
    }

    for (let j = 0; j <= uDivs; j++) {
      const f = j / uDivs
      const isBorder = j === 0 || j === uDivs
      const start = origin.clone().add(u.clone().multiplyScalar(f * uLen))
      const end = start.clone().add(v.clone().multiplyScalar(vLen))
      const geo = new BufferGeometry().setFromPoints([start, end])
      scene.add(new Line(geo, isBorder ? gridMat : gridMatDim))
    }
  }

  const gridDensity = 10

  // Grid configuration for all surfaces
  const gridSurfaces = [
    { origin: [-hw, -hh, -boxD], uDir: [1, 0, 0], vDir: [0, 1, 0], uLen: screenW, vLen: screenH },
    { origin: [-hw, -hh, 0], uDir: [1, 0, 0], vDir: [0, 0, -1], uLen: screenW, vLen: boxD },
    { origin: [-hw, hh, 0], uDir: [1, 0, 0], vDir: [0, 0, -1], uLen: screenW, vLen: boxD },
    { origin: [-hw, -hh, 0], uDir: [0, 0, -1], vDir: [0, 1, 0], uLen: boxD, vLen: screenH },
    { origin: [hw, -hh, -boxD], uDir: [0, 0, 1], vDir: [0, 1, 0], uLen: boxD, vLen: screenH },
  ]

  gridSurfaces.forEach(({ origin, uDir, vDir, uLen, vLen }) => {
    drawGrid(
      new Vector3(...origin),
      new Vector3(...uDir),
      new Vector3(...vDir),
      uLen,
      vLen,
      gridDensity,
      gridDensity,
    )
  })

  // ── Front frame ──
  const frameMat = new LineBasicMaterial({ color: 0xee8855 })
  const framePts = [
    new Vector3(-hw, -hh, 0),
    new Vector3(hw, -hh, 0),
    new Vector3(hw, hh, 0),
    new Vector3(-hw, hh, 0),
    new Vector3(-hw, -hh, 0),
  ]
  scene.add(new Line(new BufferGeometry().setFromPoints(framePts), frameMat))

  // ── Wall surfaces ──
  const isSolid = renderMode === 'solid'
  const ghostMat = new MeshStandardMaterial({
    map: wallTexture || undefined,
    color: wallTexture ? 0xffffff : isSolid ? 0x182848 : 0x112244,
    roughness: 1,
    transparent: !isSolid,
    opacity: isSolid ? 1.0 : 0.06,
  })
  const floorSurf = new MeshStandardMaterial({
    map: wallTexture || undefined,
    color: wallTexture ? 0xffffff : isSolid ? 0x141e38 : 0x112244,
    roughness: 0.95,
    transparent: !isSolid,
    opacity: isSolid ? 1.0 : 0.15,
  })

  // Surface configuration for all walls, floor, and ceiling
  const surfaces: Array<{
    geometry: [number, number]
    material: MeshStandardMaterial
    rotation: { axis: 'x' | 'y' | 'z'; angle: number } | null
    position: [number, number, number]
    opacity?: number
  }> = [
    {
      geometry: [screenW, boxD],
      material: floorSurf,
      rotation: { axis: 'x', angle: -Math.PI / 2 },
      position: [0, -hh, -boxD / 2],
    },
    { geometry: [screenW, screenH], material: ghostMat, rotation: null, position: [0, 0, -boxD] },
    {
      geometry: [screenW, boxD],
      material: ghostMat,
      rotation: { axis: 'x', angle: Math.PI / 2 },
      position: [0, hh, -boxD / 2],
      opacity: 0.04,
    },
    {
      geometry: [boxD, screenH],
      material: ghostMat,
      rotation: { axis: 'y', angle: Math.PI / 2 },
      position: [-hw, 0, -boxD / 2],
    },
    {
      geometry: [boxD, screenH],
      material: ghostMat,
      rotation: { axis: 'y', angle: -Math.PI / 2 },
      position: [hw, 0, -boxD / 2],
    },
  ]

  surfaces.forEach(({ geometry, material, rotation, position, opacity }) => {
    const mat = material.clone()
    if (opacity !== undefined) mat.opacity = opacity
    const mesh = new Mesh(new PlaneGeometry(geometry[0], geometry[1]), mat)
    if (rotation) {
      const axis = rotation.axis as 'x' | 'y' | 'z'
      mesh.rotation[axis] = rotation.angle
    }
    mesh.position.set(position[0], position[1], position[2])
    mesh.receiveShadow = true
    scene.add(mesh)
  })

  // ── Ambient light (only light source) ──
  const ambIntensity = renderMode === 'solid' ? 0.1 : 0.5
  scene.add(new AmbientLight(0xffffff, ambIntensity))
}
