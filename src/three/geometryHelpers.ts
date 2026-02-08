import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from 'three'
import type { RenderMode } from '@/types'

export function wireBox(
  w: number,
  h: number,
  d: number,
  mat: LineBasicMaterial,
  renderMode: RenderMode,
): Mesh | LineSegments {
  if (renderMode === 'solid') {
    const color = mat.color ? mat.color.getHex() : 0x888888
    const solidMat = new MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
    const m = new Mesh(new BoxGeometry(w, h, d), solidMat)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }
  return new LineSegments(new EdgesGeometry(new BoxGeometry(w, h, d)), mat)
}

export function wireCyl(
  r: number,
  h: number,
  segs: number,
  mat: LineBasicMaterial,
  renderMode: RenderMode,
): Mesh | LineSegments {
  if (renderMode === 'solid') {
    const color = mat.color ? mat.color.getHex() : 0x888888
    const solidMat = new MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
    const m = new Mesh(new CylinderGeometry(r, r, h, segs), solidMat)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }
  return new LineSegments(new EdgesGeometry(new CylinderGeometry(r, r, h, segs)), mat)
}

export function solidOrWireEdges(
  geo: BufferGeometry,
  lineMat: LineBasicMaterial,
  renderMode: RenderMode,
): Mesh | LineSegments {
  if (renderMode === 'solid') {
    const color = lineMat.color ? lineMat.color.getHex() : 0x888888
    const m = new Mesh(
      geo,
      new MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15 }),
    )
    m.castShadow = true
    m.receiveShadow = true
    return m
  }
  return new LineSegments(new EdgesGeometry(geo), lineMat)
}

export function rectLoop(
  w: number,
  h: number,
  z: number,
  col: number,
  renderMode: RenderMode,
): Mesh | Line {
  if (renderMode === 'solid') {
    const m = new Mesh(
      new PlaneGeometry(w, h),
      new MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0.1 }),
    )
    m.position.z = z
    m.castShadow = true
    return m
  }
  const pts = [
    new Vector3(-w / 2, h / 2, z),
    new Vector3(w / 2, h / 2, z),
    new Vector3(w / 2, -h / 2, z),
    new Vector3(-w / 2, -h / 2, z),
    new Vector3(-w / 2, h / 2, z),
  ]
  return new Line(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: col }))
}
