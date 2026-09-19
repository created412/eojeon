import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { buildRoofGeometry } from './roof.js'

// 마당의 낮은 돌길·물길은 발밑에 남아야 한다. 난간·정자는 따로 묶어 가림에 양보한다.
// 같은 재질을 한 메시로 합치되 물건끼리는 나눈다 — 다리를 가렸다고 후원까지 사라지면 안 된다.
export function buildYardFeatures(THREE, tex, def) {
  const root = new THREE.Group()
  root.name = 'yardFeatures'
  const yard = def.yard ?? {}
  function part(name, x, z) {
    const group = new THREE.Group()
    group.name = name
    group.position.set(x, 0, z)
    root.add(group)
    return group
  }
  function box(w, h, d, x, y, z) {
    return new THREE.BoxGeometry(w, h, d).translate(x, y, z)
  }
  function mesh(group, name, geometries, material, surface = false) {
    const geometry = mergeGeometries(geometries)
    geometries.forEach(g => g.dispose())
    const m = new THREE.Mesh(geometry, material)
    m.name = name
    if (surface) { m.userData.noOcclude = true; m.userData.surface = true }
    group.add(m)
    return m
  }
  // 마당 전체용 반복 텍스처를 작은 돌판에 씌우면 검은 줄무늬로 뭉친다 — 돌은 밝은 바탕색으로 읽게 한다.
  const stone = () => new THREE.MeshLambertMaterial({ color: 0xada899 })
  function water(g, w, d) {
    mesh(g, '물', [new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(0, .025, 0)],
      new THREE.MeshLambertMaterial({ color: 0x548c9b, transparent: true, opacity: .66, depthWrite: false }), true)
  }

  if (yard.bridge) {
    const b = yard.bridge, g = part(b.name, b.x, b.z)
    water(g, b.streamW, b.streamD)
    const banks = [], rail = []
    // 금천교·영제교는 궁의 물길을 건너는 돌다리다. 움직임 높이는 그대로라 판 윗면을 발 높이에 맞춘다.
    mesh(g, '다리 판', [box(b.w, .06, b.d, 0, .07, 0)], stone(), true)
    const bankW = (b.streamW - b.w) / 2
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) banks.push(box(bankW, .08, .15,
        side * (b.w / 2 + bankW / 2), .04, end * (b.streamD / 2 + .075)))
      const x = side * (b.w / 2 - .18)
      rail.push(box(.18, .15, b.d, x, .77, 0))
      const n = Math.max(2, Math.ceil(b.d / 1.2))
      for (let i = 0; i < n; i++) {
        const z = -b.d / 2 + .15 + i * (b.d - .3) / (n - 1)
        rail.push(box(.28, .85, .28, x, .525, z))
        rail.push(new THREE.SphereGeometry(.15, 6, 4).translate(x, .98, z))
      }
    }
    mesh(g, '개울 둑', banks, stone(), true)
    mesh(g, '난간', rail, stone())
  }

  for (const [i, r] of (yard.royalRoad ?? []).entries()) {
    const g = part(`삼도 ${i + 1}`, r.x, r.z), slabs = []
    // 삼도의 가운데는 임금이 지나는 어도다 — 세 줄을 서로 다른 높이·너비로 읽게 한다.
    const middle = r.w * .56, gap = .12, sideW = (r.w - middle - gap * 2) / 2
    const n = Math.ceil(r.d / .85), len = r.d / n
    for (let j = 0; j < n; j++) {
      const z = -r.d / 2 + len * (j + .5)
      slabs.push(box(middle, .08, len - .025, 0, .04, z))
      for (const side of [-1, 1]) slabs.push(box(sideW, .045, len - .025,
        side * (middle / 2 + gap + sideW / 2), .0225, z))
    }
    mesh(g, '어도와 양옆 길', slabs, stone(), true)
  }

  if (yard.pond) {
    const p = yard.pond, g = part('부용지', p.x, p.z), edge = .28
    water(g, p.w - edge * 2, p.d - edge * 2)
    const banks = []
    for (const side of [-1, 1]) {
      banks.push(box(p.w, .22, edge, 0, .11, side * (p.d - edge) / 2))
      banks.push(box(edge, .22, p.d - edge * 2, side * (p.w - edge) / 2, .11, 0))
    }
    mesh(g, '연못 석축', banks, stone(), true)
    mesh(g, '둥근 섬', [new THREE.CylinderGeometry(1.65, 1.8, .25, 24).translate(0, .125, 0)],
      new THREE.MeshLambertMaterial({ color: 0x68704d }), true)
    // 네모난 못 가운데 둥근 섬이라는 부용지의 구성을 작은 소나무 한 그루로 드러낸다.
    mesh(g, '소나무 줄기', [new THREE.CylinderGeometry(.14, .24, 3.2, 7).translate(0, 1.85, 0)],
      new THREE.MeshLambertMaterial({ color: 0x51402d }))
    const leaves = []
    for (let i = 0; i < 4; i++) leaves.push(new THREE.IcosahedronGeometry(1, 1)
      .scale(1.3 - i * .18, .45, 1.1 - i * .12).translate(Math.sin(i * 2) * .4, 2.7 + i * .48, 0))
    mesh(g, '소나무 잎', leaves, new THREE.MeshLambertMaterial({ color: 0x354d3d }))

    const v = p.pavilion, pavilion = part('부용정', v.x, v.z), wood = []
    // 부용정은 물가에 걸친 정자다 — 처마 전체를 자리 검사 범위에 넣고 기둥 둘은 못 위에 세운다.
    mesh(pavilion, '정자 마루', [box(v.w - .9, .16, v.d - .9, 0, .27, 0)],
      new THREE.MeshLambertMaterial({ color: 0x997749, map: tex?.maru ?? null }), true)
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      wood.push(new THREE.CylinderGeometry(.13, .16, 2.7, 8).translate(x * (v.w / 2 - .7), 1.6, z * (v.d / 2 - .7)))
    }
    wood.push(box(v.w - .9, .18, v.d - .9, 0, 2.96, 0))
    mesh(pavilion, '정자 기둥과 창방', wood,
      new THREE.MeshLambertMaterial({ color: 0x784d32, map: tex?.wood ?? null }))
    // 지붕은 궁의 다른 집과 같은 팔작지붕(render/roof.js)으로 — 네모뿔로 두었더니 검은 판처럼 보였다.
    mesh(pavilion, '정자 창방', [box(v.w - .5, .3, v.d - .5, 0, 3.0, 0)],
      new THREE.MeshLambertMaterial({ map: tex?.dancheong ?? null, color: tex?.dancheong ? 0xffffff : 0x3f6b5c }))
    const roof = buildRoofGeometry(v.w - 2.6, v.d - 2.6, 1.4)   // roof.js 는 처마를 1.7 씩 더 내민다 — 작은 정자에 맞춰 줄인다
    roof.translate(0, 3.1, 0)
    mesh(pavilion, '정자 지붕', [roof],
      new THREE.MeshStandardMaterial({ map: tex?.roof ?? null, color: 0xb9c0bd, roughness: .85, side: THREE.DoubleSide }))
  }

  for (const s of yard.smokeSources ?? []) {
    if (!s.buildChimney) continue
    const g = part('안채 굴뚝', s.x, s.z)
    // 운현궁에는 기존 굴뚝 모델이 없다 — 온돌 연기가 허공에서 시작하지 않게 작은 몸통부터 세운다.
    mesh(g, '굴뚝 벽돌', [box(.72, s.y - .25, .72, 0, (s.y - .25) / 2, 0),
      box(1, .16, 1, 0, s.y - .08, 0)], new THREE.MeshLambertMaterial({ color: 0x866c58 }))
  }
  return root
}
