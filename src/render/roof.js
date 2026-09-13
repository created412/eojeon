import * as THREE from 'three'

// Hipped tiled roof: broad, gently lifted eaves below a narrow horizontal ridge.
export function buildRoofGeometry(w, d, height = 3.4) {
  const positions = [], uv = [], indices = []
  const rings = 9
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1)
    const halfW = (w / 2 + 1.7) * (1-t) + w * .27 * t
    const halfD = (d / 2 + 1.7) * (1-t) + .22 * t
    const y = height * Math.pow(t, 1.55) + .2 * Math.pow(1-t, 12)
    for (const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
      positions.push(sx*halfW,y,sz*halfD)
      uv.push((sx*halfW/w+.5)*2, (sz*halfD/d+.5)*2)
    }
  }
  for (let i = 0; i < rings - 1; i++) {
    for (let side = 0; side < 4; side++) {
      const a = i*4+side, b = i*4+(side+1)%4, c = b+4, e = a+4
      indices.push(a,e,b,b,e,c)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2))
  geo.setIndex(indices); geo.computeVertexNormals()
  return geo
}
