import {
  BufferGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { DerivedDimensions, RenderMode } from '@/types'
import { wireBox, wireCyl, solidOrWireEdges, rectLoop } from './geometryHelpers'
import { randColor, posAt, pick } from './utils'
import type { Object3D } from 'three'

type FurnitureFactory = (
  hw: number,
  hh: number,
  floorY: number,
  posX: number,
  posZ: number,
  screenW: number,
  screenH: number,
  boxD: number,
  renderMode: RenderMode,
) => Object3D[]

const FURNITURE_CATALOG: Record<string, FurnitureFactory> = {
  armchair(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const g = new Group()
    const chW = screenW * 0.14,
      chD = screenW * 0.12
    const seatH = screenH * 0.13,
      backH = screenH * 0.16
    const col = randColor(0x664422, 0xbb8844)
    const lm = new LineBasicMaterial({ color: col })

    const seat = wireBox(chW, screenH * 0.035, chD, lm, renderMode)
    seat.position.y = seatH
    g.add(seat)

    const back = wireBox(chW, backH, screenH * 0.025, lm, renderMode)
    back.position.set(0, seatH + backH / 2, -chD / 2)
    g.add(back)

    ;[-1, 1].forEach((s) => {
      const arm = wireBox(screenH * 0.02, screenH * 0.07, chD, lm, renderMode)
      arm.position.set(s * (chW / 2), seatH + screenH * 0.035, 0)
      g.add(arm)
    })
    ;(
      [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as [number, number][]
    ).forEach(([sx, sz]) => {
      const leg = wireCyl(screenH * 0.005, seatH, 6, lm, renderMode)
      leg.position.set(sx * chW * 0.4, seatH / 2, sz * chD * 0.4)
      g.add(leg)
    })

    g.position.set(posX, floorY, posZ)
    return [g]
  },

  sofa(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const g = new Group()
    const sW = screenW * 0.3,
      sD = screenW * 0.12,
      seatH = screenH * 0.11
    const col = randColor(0x555577, 0x8888aa)
    const lm = new LineBasicMaterial({ color: col })

    g.add(posAt(wireBox(sW, screenH * 0.04, sD, lm, renderMode), 0, seatH, 0))
    g.add(
      posAt(
        wireBox(sW, screenH * 0.18, screenH * 0.025, lm, renderMode),
        0,
        seatH + screenH * 0.09,
        -sD / 2,
      ),
    )
    ;[-1, 1].forEach((s) => {
      g.add(
        posAt(
          wireBox(screenH * 0.025, screenH * 0.08, sD, lm, renderMode),
          s * (sW / 2),
          seatH + screenH * 0.04,
          0,
        ),
      )
    })
    ;(
      [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as [number, number][]
    ).forEach(([sx, sz]) => {
      g.add(
        posAt(wireCyl(screenH * 0.006, seatH, 6, lm, renderMode), sx * sW * 0.45, seatH / 2, sz * sD * 0.4),
      )
    })

    g.position.set(posX, floorY, posZ)
    return [g]
  },

  coffeeTable(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const g = new Group()
    const tW = screenW * 0.15,
      tH = screenH * 0.1,
      tD = screenW * 0.08
    const col = randColor(0x775533, 0xaa7744)
    const lm = new LineBasicMaterial({ color: col })

    g.add(posAt(wireBox(tW, screenH * 0.012, tD, lm, renderMode), 0, tH, 0))
    ;(
      [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as [number, number][]
    ).forEach(([sx, sz]) => {
      g.add(
        posAt(wireCyl(screenH * 0.004, tH, 6, lm, renderMode), sx * tW * 0.42, tH / 2, sz * tD * 0.42),
      )
    })

    g.position.set(posX, floorY, posZ)
    return [g]
  },

  bookshelf(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const g = new Group()
    const bW = screenW * 0.12,
      bH = screenH * 0.5,
      bD = screenW * 0.05
    const col = randColor(0x664422, 0x886633)
    const lm = new LineBasicMaterial({ color: col })

    g.add(posAt(wireBox(bW, bH, bD, lm, renderMode), 0, bH / 2, 0))
    const shelves = 4
    for (let i = 1; i < shelves; i++) {
      const sy = (i / shelves) * bH
      g.add(posAt(wireBox(bW * 0.95, screenH * 0.005, bD * 0.9, lm, renderMode), 0, sy, 0))
      const nBooks = 2 + Math.floor(Math.random() * 4)
      for (let b = 0; b < nBooks; b++) {
        const bookH = screenH * (0.04 + Math.random() * 0.04)
        const bookW = screenW * (0.008 + Math.random() * 0.008)
        const bookCol = randColor(0x883333, 0x3388aa)
        const bk = wireBox(
          bookW,
          bookH,
          bD * 0.7,
          new LineBasicMaterial({ color: bookCol }),
          renderMode,
        )
        bk.position.set(-bW * 0.35 + b * bW * 0.16, sy + bookH / 2, 0)
        g.add(bk)
      }
    }

    g.position.set(posX, floorY, posZ)
    return [g]
  },

  plant(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const items: Object3D[] = []
    const potH = screenH * 0.06
    const potR = screenH * 0.03
    const col = randColor(0x884422, 0xbb6633)
    const lm = new LineBasicMaterial({ color: col })

    const pot = wireCyl(potR, potH, 8, lm, renderMode)
    pot.position.set(posX, floorY + potH / 2, posZ)
    items.push(pot)

    const leafCol = randColor(0x227733, 0x55bb55)
    const leafMat = new LineBasicMaterial({
      color: leafCol,
      transparent: true,
      opacity: 0.7,
    })
    const nClusters = 2 + Math.floor(Math.random() * 3)
    for (let c = 0; c < nClusters; c++) {
      const r = screenH * (0.02 + Math.random() * 0.03)
      const geo = new IcosahedronGeometry(r, 0)
      const m = solidOrWireEdges(geo, leafMat, renderMode)
      m.position.set(
        posX + (Math.random() - 0.5) * potR,
        floorY + potH + r + Math.random() * screenH * 0.04,
        posZ + (Math.random() - 0.5) * potR,
      )
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      items.push(m)
    }
    return items
  },

  floorLamp(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const items: Object3D[] = []
    const poleH = screenH * (0.4 + Math.random() * 0.15)
    const baseR = screenH * 0.025
    const col = 0x777777
    const lm = new LineBasicMaterial({ color: col })

    const base = wireCyl(baseR, screenH * 0.008, 16, lm, renderMode)
    base.position.set(posX, floorY + screenH * 0.004, posZ)
    items.push(base)

    const pole = new Line(
      new BufferGeometry().setFromPoints([
        new Vector3(posX, floorY, posZ),
        new Vector3(posX, floorY + poleH, posZ),
      ]),
      lm,
    )
    items.push(pole)

    const shadeCol = randColor(0x998866, 0xccaa88)
    const shade = solidOrWireEdges(
      new CylinderGeometry(screenH * 0.01, screenH * 0.04, screenH * 0.05, 12, 1, true),
      new LineBasicMaterial({ color: shadeCol }),
      renderMode,
    )
    shade.position.set(posX, floorY + poleH - screenH * 0.01, posZ)
    items.push(shade)

    const light = new PointLight(randColor(0xffddaa, 0xffeebb), 0.3, boxD * 1.2, 2)
    light.position.set(posX, floorY + poleH - screenH * 0.03, posZ)
    items.push(light)

    return items
  },

  sideTable(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const g = new Group()
    const tW = screenW * 0.08,
      tH = screenH * 0.18,
      tD = screenW * 0.08
    const col = randColor(0x775533, 0x997744)
    const lm = new LineBasicMaterial({ color: col })

    g.add(posAt(wireBox(tW, tH, tD, lm, renderMode), 0, tH / 2, 0))

    const topObj = Math.random()
    if (topObj < 0.33) {
      // Vase
      const vPts: Vector2[] = []
      for (let i = 0; i <= 8; i++) {
        const t = i / 8
        const r = screenH * 0.015 * (1 + 0.5 * Math.sin(t * Math.PI * 1.5))
        vPts.push(new Vector2(r, t * screenH * 0.07))
      }
      vPts.push(new Vector2(0, screenH * 0.07))
      const vase = solidOrWireEdges(
        new LatheGeometry(vPts, 10),
        new LineBasicMaterial({ color: randColor(0x44aa77, 0x77bbaa) }),
        renderMode,
      )
      vase.position.y = tH
      g.add(vase)
    } else if (topObj < 0.66) {
      // Clock face
      const clockPts: Vector3[] = []
      const cr = screenH * 0.025
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI * 2
        clockPts.push(
          new Vector3(Math.cos(a) * cr, cr + screenH * 0.005, Math.sin(a) * cr * 0.15),
        )
      }
      const clock = new Line(
        new BufferGeometry().setFromPoints(clockPts),
        new LineBasicMaterial({ color: 0xdddddd }),
      )
      clock.position.y = tH
      g.add(clock)
    } else {
      // Candle
      const candle = wireCyl(
        screenH * 0.008,
        screenH * 0.05,
        8,
        new LineBasicMaterial({ color: 0xeedd99 }),
        renderMode,
      )
      candle.position.set(0, tH + screenH * 0.025, 0)
      g.add(candle)
    }

    g.position.set(posX, floorY, posZ)
    return [g]
  },

  pictureFrame(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const items: Object3D[] = []
    const fw = screenW * (0.08 + Math.random() * 0.12)
    const fhh = screenH * (0.1 + Math.random() * 0.15)
    const fy = hh * (0.1 + Math.random() * 0.5)
    const col = randColor(0x886633, 0xbb9955)

    const outer = rectLoop(fw, fhh, -boxD + 0.001, col, renderMode)
    outer.position.set(posX, fy, 0)
    items.push(outer)

    const m = screenH * 0.012
    const inner = rectLoop(
      fw - m * 2,
      fhh - m * 2,
      -boxD + 0.002,
      randColor(0x556677, 0x889999),
      renderMode,
    )
    inner.position.copy(outer.position)
    items.push(inner)

    return items
  },

  rug(hw, hh, floorY, posX, posZ, screenW, _screenH, _boxD, _renderMode) {
    const items: Object3D[] = []
    const rw = screenW * (0.15 + Math.random() * 0.15)
    const rd = screenW * (0.08 + Math.random() * 0.1)
    const col = randColor(0x773322, 0xbb6644)
    const pts: Vector3[] = []
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2
      pts.push(
        new Vector3(
          posX + (Math.cos(a) * rw) / 2,
          floorY + 0.0003,
          posZ + (Math.sin(a) * rd) / 2,
        ),
      )
    }
    items.push(
      new Line(
        new BufferGeometry().setFromPoints(pts),
        new LineBasicMaterial({ color: col, transparent: true, opacity: 0.5 }),
      ),
    )
    const pts2: Vector3[] = []
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2
      pts2.push(
        new Vector3(
          posX + (Math.cos(a) * rw * 0.6) / 2,
          floorY + 0.0004,
          posZ + (Math.sin(a) * rd * 0.6) / 2,
        ),
      )
    }
    items.push(
      new Line(
        new BufferGeometry().setFromPoints(pts2),
        new LineBasicMaterial({ color: col, transparent: true, opacity: 0.3 }),
      ),
    )
    return items
  },

  pendantLight(hw, hh, floorY, posX, posZ, screenW, screenH, boxD, renderMode) {
    const items: Object3D[] = []
    const ceilY = hh
    const cordLen = screenH * (0.15 + Math.random() * 0.2)
    const bulbY = ceilY - cordLen
    const shadeCol = randColor(0xaa8855, 0xddbb88)

    const cord = new Line(
      new BufferGeometry().setFromPoints([
        new Vector3(posX, ceilY, posZ),
        new Vector3(posX, bulbY, posZ),
      ]),
      new LineBasicMaterial({ color: 0x888888 }),
    )
    items.push(cord)

    const shade = solidOrWireEdges(
      new CylinderGeometry(screenH * 0.012, screenH * 0.04, screenH * 0.04, 12, 1, true),
      new LineBasicMaterial({ color: shadeCol }),
      renderMode,
    )
    shade.position.set(posX, bulbY + screenH * 0.015, posZ)
    items.push(shade)

    const bulb = new Mesh(
      new SphereGeometry(screenH * 0.01, 8, 8),
      new MeshBasicMaterial({ color: 0xfff4d6 }),
    )
    bulb.position.set(posX, bulbY, posZ)
    items.push(bulb)

    const pl = new PointLight(randColor(0xffddaa, 0xffeebb), 0.35, boxD * 1, 2)
    pl.position.set(posX, bulbY, posZ)
    items.push(pl)

    return items
  },
}

export function populateFurniture(
  scene: Scene,
  dims: DerivedDimensions,
  renderMode: RenderMode,
): void {
  const { screenW, screenH, boxD } = dims
  const hw = screenW / 2
  const hh = screenH / 2
  const floorY = -hh

  const slots = [
    { x: -hw * 0.6, z: -boxD * 0.7 },
    { x: hw * 0.6, z: -boxD * 0.7 },
    { x: -hw * 0.7, z: -boxD * 0.35 },
    { x: hw * 0.7, z: -boxD * 0.35 },
    { x: 0, z: -boxD * 0.55 },
    { x: -hw * 0.3, z: -boxD * 0.85 },
    { x: hw * 0.3, z: -boxD * 0.85 },
  ]

  const floorTypes = [
    'armchair',
    'sofa',
    'coffeeTable',
    'bookshelf',
    'plant',
    'floorLamp',
    'sideTable',
  ]
  const usedSlots = new Set<number>()
  const nFloor = 4 + Math.floor(Math.random() * 3)

  for (let i = 0; i < nFloor && i < slots.length; i++) {
    let si: number
    do {
      si = Math.floor(Math.random() * slots.length)
    } while (usedSlots.has(si))
    usedSlots.add(si)
    const slot = slots[si]!
    const type = pick(floorTypes)
    const factory = FURNITURE_CATALOG[type]!
    const items = factory(hw, hh, floorY, slot.x, slot.z, screenW, screenH, boxD, renderMode)
    items.forEach((obj) => scene.add(obj))
  }

  // Wall items — 1-3 picture frames
  const nFrames = 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < nFrames; i++) {
    const px = (Math.random() - 0.5) * screenW * 0.7
    const items = FURNITURE_CATALOG['pictureFrame']!(
      hw,
      hh,
      floorY,
      px,
      -boxD,
      screenW,
      screenH,
      boxD,
      renderMode,
    )
    items.forEach((obj) => scene.add(obj))
  }

  // Rug — 60% chance
  if (Math.random() < 0.6) {
    const items = FURNITURE_CATALOG['rug']!(
      hw,
      hh,
      floorY,
      (Math.random() - 0.5) * screenW * 0.2,
      -boxD * (0.35 + Math.random() * 0.3),
      screenW,
      screenH,
      boxD,
      renderMode,
    )
    items.forEach((obj) => scene.add(obj))
  }

  // Extra pendant light — 40% chance
  if (Math.random() < 0.4) {
    const items = FURNITURE_CATALOG['pendantLight']!(
      hw,
      hh,
      floorY,
      (Math.random() - 0.5) * screenW * 0.4,
      -boxD * (0.2 + Math.random() * 0.5),
      screenW,
      screenH,
      boxD,
      renderMode,
    )
    items.forEach((obj) => scene.add(obj))
  }
}
