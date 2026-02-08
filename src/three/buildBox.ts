import {
  AmbientLight,
  BufferGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  SphereGeometry,
  Vector3,
} from 'three'
import type { DerivedDimensions, RenderMode } from '@/types'

export function buildBoxShell(scene: Scene, dims: DerivedDimensions, renderMode: RenderMode): void {
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

  // Back wall
  drawGrid(
    new Vector3(-hw, -hh, -boxD),
    new Vector3(1, 0, 0),
    new Vector3(0, 1, 0),
    screenW,
    screenH,
    gridDensity,
    gridDensity,
  )
  // Floor
  drawGrid(
    new Vector3(-hw, -hh, 0),
    new Vector3(1, 0, 0),
    new Vector3(0, 0, -1),
    screenW,
    boxD,
    gridDensity,
    gridDensity,
  )
  // Ceiling
  drawGrid(
    new Vector3(-hw, hh, 0),
    new Vector3(1, 0, 0),
    new Vector3(0, 0, -1),
    screenW,
    boxD,
    gridDensity,
    gridDensity,
  )
  // Left wall
  drawGrid(
    new Vector3(-hw, -hh, 0),
    new Vector3(0, 0, -1),
    new Vector3(0, 1, 0),
    boxD,
    screenH,
    gridDensity,
    gridDensity,
  )
  // Right wall
  drawGrid(
    new Vector3(hw, -hh, -boxD),
    new Vector3(0, 0, 1),
    new Vector3(0, 1, 0),
    boxD,
    screenH,
    gridDensity,
    gridDensity,
  )

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
    color: isSolid ? 0x182848 : 0x112244,
    roughness: 1,
    transparent: !isSolid,
    opacity: isSolid ? 1.0 : 0.06,
  })
  const floorSurf = new MeshStandardMaterial({
    color: isSolid ? 0x141e38 : 0x112244,
    roughness: 0.95,
    transparent: !isSolid,
    opacity: isSolid ? 1.0 : 0.15,
  })

  const floor = new Mesh(new PlaneGeometry(screenW, boxD), floorSurf)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -hh, -boxD / 2)
  floor.receiveShadow = true
  scene.add(floor)

  const backW = new Mesh(new PlaneGeometry(screenW, screenH), ghostMat.clone())
  backW.position.set(0, 0, -boxD)
  backW.receiveShadow = true
  scene.add(backW)

  const ceilM = ghostMat.clone()
  ceilM.opacity = 0.04
  const ceiling = new Mesh(new PlaneGeometry(screenW, boxD), ceilM)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.set(0, hh, -boxD / 2)
  scene.add(ceiling)

  const wallPositions: [number, number][] = [
    [-hw, Math.PI / 2],
    [hw, -Math.PI / 2],
  ]
  wallPositions.forEach(([x, ry]) => {
    const w = new Mesh(new PlaneGeometry(boxD, screenH), ghostMat.clone())
    w.rotation.y = ry
    w.position.set(x, 0, -boxD / 2)
    w.receiveShadow = true
    scene.add(w)
  })

  // ── Hanging light ──
  createHangingLight(scene, dims, renderMode)

  // ── Ambient ──
  const ambIntensity = renderMode === 'solid' ? 0.35 : 0.15
  scene.add(new AmbientLight(0x223355, ambIntensity))
}

function createHangingLight(scene: Scene, dims: DerivedDimensions, renderMode: RenderMode): void {
  const { screenW, screenH, boxD } = dims
  const hh = screenH / 2
  const lightZ = -boxD * 0.45
  const ceilY = hh
  const cordLen = screenH * 0.3
  const bulbY = ceilY - cordLen

  // Cord
  scene.add(
    new Line(
      new BufferGeometry().setFromPoints([
        new Vector3(0, ceilY, lightZ),
        new Vector3(0, bulbY, lightZ),
      ]),
      new LineBasicMaterial({ color: 0x888888 }),
    ),
  )

  // Ceiling rose
  const rose = new Mesh(
    new CylinderGeometry(screenH * 0.015, screenH * 0.015, screenH * 0.008, 16),
    new MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.6 }),
  )
  rose.position.set(0, ceilY - screenH * 0.004, lightZ)
  //scene.add(rose)

  // Shade
  const shadeR1 = screenH * 0.02,
    shadeR2 = screenH * 0.08,
    shadeH = screenH * 0.09
  const shadeSolid = renderMode === 'solid'
  const shade = new Mesh(
    new CylinderGeometry(shadeR1, shadeR2, shadeH, 24, 1, !shadeSolid),
    new MeshStandardMaterial({
      color: 0xc8a882,
      roughness: 0.7,
      metalness: 0.1,
      side: 2, // DoubleSide
      transparent: !shadeSolid,
      opacity: shadeSolid ? 1.0 : 0.85,
    }),
  )
  shade.position.set(0, bulbY + shadeH * 0.35, lightZ)
  shade.castShadow = shadeSolid
  shade.receiveShadow = true
  scene.add(shade)

  const shadeWire = new LineSegments(
    new EdgesGeometry(new CylinderGeometry(shadeR1, shadeR2, shadeH, 24, 1, true)),
    new LineBasicMaterial({ color: 0x997755, transparent: true, opacity: 0.5 }),
  )
  shadeWire.position.copy(shade.position)
  scene.add(shadeWire)

  // Bulb
  const bulb = new Mesh(
    new SphereGeometry(screenH * 0.018, 16, 16),
    new MeshBasicMaterial({ color: 0xfff4d6 }),
  )
  bulb.position.set(0, bulbY, lightZ)
  scene.add(bulb)

  // Glow
  const glow = new Mesh(
    new SphereGeometry(screenH * 0.05, 16, 16),
    new MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.08 }),
  )
  glow.position.copy(bulb.position)
  scene.add(glow)

  // Point light
  const plIntensity = renderMode === 'solid' ? 2.0 : 1.2
  const pl = new PointLight(0xffe8c0, plIntensity, boxD * 3, 1.5)
  pl.position.set(0, bulbY, lightZ)
  pl.castShadow = true
  pl.shadow.mapSize.set(1024, 1024)
  pl.shadow.camera.near = 0.01
  pl.shadow.camera.far = boxD * 2
  pl.shadow.radius = 4
  scene.add(pl)

  // Sway animation
  const swayGroup = [shade, shadeWire, bulb, glow, pl]
  swayGroup.forEach((obj) => {
    const bx = obj.position.x
    obj.userData.animate = (t: number) => {
      obj.position.x = bx + Math.sin(t * 0.8) * screenW * 0.012
    }
  })
}
