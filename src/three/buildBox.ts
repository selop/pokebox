import {
  AmbientLight,
  BufferGeometry,
  DirectionalLight,
  Line,
  LineDashedMaterial,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  Vector2,
  Vector3,
} from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
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

  const isSolid = renderMode === 'solid'

  if (isSolid) {
    // ── Dashed edge lines for solid/museum mode ──
    const edgeMat = new LineDashedMaterial({
      color: 0x2a3a5a,
      dashSize: 0.015,
      gapSize: 0.01,
      transparent: false,
      opacity: 1.0,
    })

    const c = {
      fbl: new Vector3(-hw, -hh, 0),
      fbr: new Vector3(hw, -hh, 0),
      ftr: new Vector3(hw, hh, 0),
      ftl: new Vector3(-hw, hh, 0),
      bbl: new Vector3(-hw, -hh, -boxD),
      bbr: new Vector3(hw, -hh, -boxD),
      btr: new Vector3(hw, hh, -boxD),
      btl: new Vector3(-hw, hh, -boxD),
    }

    const edges: [Vector3, Vector3][] = [
      [c.bbl, c.bbr],
      [c.bbr, c.btr],
      [c.btr, c.btl],
      [c.btl, c.bbl],
      [c.fbl, c.bbl],
      [c.fbr, c.bbr],
      [c.ftr, c.btr],
      [c.ftl, c.btl],
      [c.fbl, c.fbr],
      [c.fbr, c.ftr],
      [c.ftr, c.ftl],
      [c.ftl, c.fbl],
    ]

    edges.forEach(([start, end]) => {
      const geo = new BufferGeometry().setFromPoints([start, end])
      const line = new Line(geo, edgeMat.clone())
      line.computeLineDistances()
      scene.add(line)
    })
  } else {
    // ── Orange grid with glow for xray mode ──
    const res = new Vector2(window.innerWidth, window.innerHeight)

    // Core line material (bright border)
    const borderMat = new LineMaterial({
      color: 0xee8855,
      linewidth: 2.5,
      resolution: res,
    })
    // Core line material (dimmer interior)
    const innerMat = new LineMaterial({
      color: 0xcc7744,
      linewidth: 1.5,
      resolution: res,
      transparent: true,
      opacity: 0.85,
    })
    // Glow layer (wider, soft, transparent)
    const glowBorderMat = new LineMaterial({
      color: 0xff9944,
      linewidth: 7,
      resolution: res,
      transparent: true,
      opacity: 0.15,
    })
    const glowInnerMat = new LineMaterial({
      color: 0xff8833,
      linewidth: 5,
      resolution: res,
      transparent: true,
      opacity: 0.08,
    })

    function addFatLine(start: Vector3, end: Vector3, isBorder: boolean) {
      const positions = [start.x, start.y, start.z, end.x, end.y, end.z]

      // Glow layer (rendered first, behind)
      const glowGeo = new LineGeometry()
      glowGeo.setPositions(positions)
      scene.add(new Line2(glowGeo, isBorder ? glowBorderMat : glowInnerMat))

      // Core line
      const coreGeo = new LineGeometry()
      coreGeo.setPositions(positions)
      scene.add(new Line2(coreGeo, isBorder ? borderMat : innerMat))
    }

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
        addFatLine(start, end, isBorder)
      }

      for (let j = 0; j <= uDivs; j++) {
        const f = j / uDivs
        const isBorder = j === 0 || j === uDivs
        const start = origin.clone().add(u.clone().multiplyScalar(f * uLen))
        const end = start.clone().add(v.clone().multiplyScalar(vLen))
        addFatLine(start, end, isBorder)
      }
    }

    const gridDensity = 10
    // Small inward offset to prevent z-fighting with wall meshes
    const e = 0.001
    const gridSurfaces = [
      {
        origin: [-hw, -hh, -boxD + e],
        uDir: [1, 0, 0],
        vDir: [0, 1, 0],
        uLen: screenW,
        vLen: screenH,
      }, // back wall
      { origin: [-hw, -hh + e, 0], uDir: [1, 0, 0], vDir: [0, 0, -1], uLen: screenW, vLen: boxD }, // floor
      { origin: [-hw, hh - e, 0], uDir: [1, 0, 0], vDir: [0, 0, -1], uLen: screenW, vLen: boxD }, // ceiling
      { origin: [-hw + e, -hh, 0], uDir: [0, 0, -1], vDir: [0, 1, 0], uLen: boxD, vLen: screenH }, // left wall
      { origin: [hw - e, -hh, -boxD], uDir: [0, 0, 1], vDir: [0, 1, 0], uLen: boxD, vLen: screenH }, // right wall
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

    // Orange front frame (with glow)
    const framePts = [
      new Vector3(-hw, -hh, 0),
      new Vector3(hw, -hh, 0),
      new Vector3(hw, hh, 0),
      new Vector3(-hw, hh, 0),
    ]
    for (let i = 0; i < framePts.length; i++) {
      addFatLine(framePts[i], framePts[(i + 1) % framePts.length], true)
    }
  }

  // ── Wall surfaces ──
  // In xray mode, push wall surfaces back in the depth buffer so grid lines
  // always win — prevents z-fighting flicker with off-axis camera updates
  const polyOffset = !isSolid
  const backWallMat = new MeshStandardMaterial({
    map: wallTexture || undefined,
    color: wallTexture ? 0xffffff : isSolid ? 0xdde4f0 : 0x112244,
    emissive: isSolid ? 0x334455 : 0x000000,
    emissiveIntensity: isSolid ? 0.3 : 0,
    roughness: 0.9,
    transparent: !isSolid,
    opacity: isSolid ? 1.0 : 0.06,
    polygonOffset: polyOffset,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })

  const sideWallMat = new MeshStandardMaterial({
    map: wallTexture || undefined,
    color: wallTexture ? 0xffffff : isSolid ? 0x5b7faa : 0x112244,
    roughness: 1,
    transparent: !isSolid,
    opacity: isSolid ? 1.0 : 0.06,
    polygonOffset: polyOffset,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })

  const floorMat = new MeshStandardMaterial({
    map: wallTexture || undefined,
    color: wallTexture ? 0xffffff : isSolid ? 0x4a6a8a : 0x112244,
    roughness: isSolid ? 0.7 : 0.95,
    transparent: !isSolid,
    opacity: isSolid ? 1.0 : 0.15,
    polygonOffset: polyOffset,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })

  const ceilingMat = new MeshStandardMaterial({
    map: wallTexture || undefined,
    color: wallTexture ? 0xffffff : isSolid ? 0xd0d8e8 : 0x112244,
    roughness: 0.9,
    transparent: true,
    opacity: isSolid ? 0.85 : 0.04,
    polygonOffset: polyOffset,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })

  const surfaces: Array<{
    geometry: [number, number]
    material: MeshStandardMaterial
    rotation: { axis: 'x' | 'y' | 'z'; angle: number } | null
    position: [number, number, number]
  }> = [
    // floor
    {
      geometry: [screenW, boxD],
      material: floorMat,
      rotation: { axis: 'x', angle: -Math.PI / 2 },
      position: [0, -hh, -boxD / 2],
    },
    // back wall
    {
      geometry: [screenW, screenH],
      material: backWallMat,
      rotation: null,
      position: [0, 0, -boxD],
    },
    // ceiling
    {
      geometry: [screenW, boxD],
      material: ceilingMat,
      rotation: { axis: 'x', angle: Math.PI / 2 },
      position: [0, hh, -boxD / 2],
    },
    // left wall
    {
      geometry: [boxD, screenH],
      material: sideWallMat,
      rotation: { axis: 'y', angle: Math.PI / 2 },
      position: [-hw, 0, -boxD / 2],
    },
    // right wall
    {
      geometry: [boxD, screenH],
      material: sideWallMat,
      rotation: { axis: 'y', angle: -Math.PI / 2 },
      position: [hw, 0, -boxD / 2],
    },
  ]

  surfaces.forEach(({ geometry, material, rotation, position }) => {
    const mesh = new Mesh(new PlaneGeometry(geometry[0], geometry[1]), material)
    if (rotation) {
      mesh.rotation[rotation.axis] = rotation.angle
    }
    mesh.position.set(position[0], position[1], position[2])
    mesh.receiveShadow = true
    scene.add(mesh)
  })

  // ── Lighting ──
  if (isSolid) {
    // Bright ambient for diffuse base
    scene.add(new AmbientLight(0xffffff, 0.3))

    // Soft directional from above-front for natural illumination
    const dirLight = new DirectionalLight(0xffffff, 0.5)
    dirLight.position.set(0, hh * 0.8, boxD * 0.5)
    scene.add(dirLight)

    // Backlight to make the back wall glow
    const backLight = new PointLight(0xdde8ff, 0.16, boxD * 2)
    backLight.position.set(0, 0, -boxD * 0.7)
    scene.add(backLight)
  } else {
    scene.add(new AmbientLight(0xffffff, 0.25))
  }
}
