export function emberTexture(size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0.0, 'rgba(255,240,200,1)')
  grd.addColorStop(0.35, 'rgba(255,168,60,0.85)')
  grd.addColorStop(0.7, 'rgba(190,60,20,0.35)')
  grd.addColorStop(1.0, 'rgba(120,20,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  return c
}

export function createFire(THREE, { count = 160 } = {}) {
  const positions = new Float32Array(count * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const tex = new THREE.CanvasTexture(emberTexture(64))
  const mat = new THREE.PointsMaterial({
    map: tex,
    size: 4.2,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.visible = false

  // 입자마다 고정된 난수 — 프레임마다 새로 뽑으면 불이 지글거리지 않고 튄다
  const seed = Array.from({ length: count }, () => ({
    a: Math.random() * Math.PI * 2,
    r: Math.random(),
    speed: 0.6 + Math.random() * 1.1,
    phase: Math.random() * 1000,
    life: 1.1 + Math.random() * 1.4,
  }))

  let sources = []

  function setSources(list) {
    sources = list ?? []
    points.visible = sources.length > 0
  }

  function update(nowMs, reducedMotion = false) {
    if (!points.visible) return
    const t = reducedMotion ? 0 : nowMs / 1000
    for (let i = 0; i < count; i++) {
      const s = sources[i % sources.length]
      const k = seed[i]
      const spread = 5 + 7 * s.strength
      const age = ((t * k.speed + k.phase) % k.life) / k.life
      positions[i * 3 + 0] = s.x + Math.cos(k.a) * k.r * spread
      positions[i * 3 + 1] = 1 + age * (6 + 10 * s.strength)
      positions[i * 3 + 2] = s.z + Math.sin(k.a) * k.r * spread
    }
    geo.attributes.position.needsUpdate = true
    mat.opacity = reducedMotion ? .55 : 0.55 + 0.12 * Math.sin(t * 2)
  }

  function dispose() {
    geo.dispose()
    mat.dispose()
    tex.dispose()
  }

  return { object3D: points, setSources, update, dispose }
}
