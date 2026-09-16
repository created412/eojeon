// 방 안을 채우는 것들 — 「이 방이 무엇을 하는 방인가」를 물건으로 말한다.
//
// 선생님(2026-09-16): 「각 건물의 내부 디자인에 활용할 것들을 고려해서 만들어 넣어봐.
// 규장각에 책이 있어야하는 것처럼.」 그때까지 궁궐의 방은 규장각(서가) 하나를 빼면
// 전부 빈 상자였다 — 침전이든 서고든 창고든 들어가 보면 마룻바닥뿐이었다.
//
// 방마다 palaces.js 의 furnish 값 하나로 무엇을 놓을지 고른다. 값과 실제 쓰임:
//   library    규장각 — 서가 가득, 책상, 두루마리
//   archive    수정전 — 기록을 넣어 둔 궤와 서가(실록·의궤가 이런 데 있었다)
//   study      관물헌·성정각 — 임금이 글을 읽던 방: 서안·문방사우·책
//   sarang     연경당·낙선재·노안당·계동궁 — 사랑방: 서안·문갑·사방탁자·방석
//   bedchamber 희정당 — 침전: 병풍·요·머릿장·등잔
//   inner      대조전·노락당 — 안채: 장롱·경대·병풍·반짇고리
//   dowager    자경전 — 대비전: 보료·병풍·화로·문갑
//   shrine     선원전·북묘 — 제상·향로·촛대·위패
//   court      인정전·근정전·사정전 — 어전: 향로 한 쌍과 촛대(어좌는 palace.js)
//   storehouse 경우궁 행각 — 가마니·궤·항아리
//   guardroom  오조유의 영방 — 창 걸이·궤·방석
//   quarters   경우궁 정당 — 급히 든 거처: 방석·등잔·병풍
//
// 그리는 값은 싸게 잡는다. 물건 하나는 상자 몇 개지만, 방 하나를 다 짓고 나서
// **같은 재질끼리 하나로 합친다**(mergeByMaterial) — 방 하나가 서른 번이 아니라
// 예닐곱 번에 그려진다. 책은 InstancedMesh 라 처음부터 한 번이다.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const BASE_H = 0.04, FLOOR_H = 0.06
export const FLOOR_TOP = BASE_H + FLOOR_H        // 마루 윗면 — 모든 세간이 여기 얹힌다

// 색 — 옛 세간의 빛. 옻칠한 나무, 놋, 무명과 비단, 옹기.
const LACQUER = 0x3b2a1e, BRASS = 0x7e6531, IRON = 0x40403f
const FABRIC_RED = 0x7b2f2c, FABRIC_JADE = 0x2f5348, FABRIC_IND = 0x33405e
const STRAW = 0xbfa571, ONGGI = 0x5a4334, EMBER = 0xa8431a

export const FURNISH_KINDS = ['library', 'archive', 'study', 'sarang', 'bedchamber',
  'inner', 'dowager', 'shrine', 'court', 'storehouse', 'guardroom', 'quarters']

// ── 자잘한 만들기 도구 ────────────────────────────────────────────────────
function mats(THREE, tex) {
  const M = (opt) => new THREE.MeshLambertMaterial(opt)
  return {
    wood: M({ map: tex?.wood ?? null, color: 0xb08d63 }),
    dark: M({ map: tex?.wood ?? null, color: 0x6a4e35 }),
    lacquer: M({ color: LACQUER }),
    brass: M({ color: BRASS }),
    iron: M({ color: IRON }),
    paper: M({ map: tex?.paper ?? null, color: 0xf0e6d2 }),
    red: M({ color: FABRIC_RED }),
    jade: M({ color: FABRIC_JADE }),
    indigo: M({ color: FABRIC_IND }),
    straw: M({ color: STRAW }),
    onggi: M({ color: ONGGI }),
    ink: M({ color: 0x59605c }),
    ember: M({ color: EMBER, emissive: EMBER, emissiveIntensity: 0.45 }),
    flame: M({ color: 0xffd9a0, emissive: 0xffc46b, emissiveIntensity: 0.9 }),
  }
}

function box(THREE, mat, w, h, d, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, FLOOR_TOP + y + h / 2, z)
  m.rotation.y = ry
  return m
}

function cyl(THREE, mat, r, h, x, y, z, { rx = 0, rz = 0, rTop = null } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop ?? r, r, h, 10), mat)
  m.position.set(x, FLOOR_TOP + y + h / 2, z)
  m.rotation.x = rx
  m.rotation.z = rz
  return m
}

// 서안(書案) — 낮은 책상. 임금도 신하도 방바닥에 앉아 이 앞에서 글을 읽었다.
function lowTable(THREE, M, x, z, ry = 0, w = 1.5) {
  const g = new THREE.Group()
  g.add(box(THREE, M.dark, w, 0.07, 0.62, 0, 0.42, 0))
  for (const sx of [-w / 2 + 0.1, w / 2 - 0.1]) g.add(box(THREE, M.dark, 0.09, 0.42, 0.5, sx, 0, 0))
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

function cushion(THREE, M, x, z, mat = M.red) { return box(THREE, mat, 0.72, 0.09, 0.72, x, 0, z) }

// 병풍 — 접어 세운 넉 폭. 방의 뒤를 막아 「앉는 자리」를 만든다.
function screen(THREE, M, x, z, ry = 0, panels = 4, h = 1.75) {
  const g = new THREE.Group()
  const pw = 0.82
  panels = Math.max(2, panels)
  for (let i = 0; i < panels; i++) {
    const a = (i % 2 ? -1 : 1) * 0.16
    const p = box(THREE, M.paper, pw, h, 0.05, (i - (panels - 1) / 2) * pw * 0.96, 0, Math.abs(a) * 0.4 * (i % 2 ? 1 : -1), a)
    g.add(p)
    g.add(box(THREE, M.dark, pw, 0.09, 0.07, p.position.x, h - 0.02, p.position.z, a))   // 위 테
    g.add(box(THREE, M.dark, pw, 0.07, 0.07, p.position.x, 0, p.position.z, a))          // 아래 테
    // 먹으로 그린 그림 — 흰 판이 아니라 그림 병풍으로 읽히게 아래쪽에 짙은 띠를 넣는다
    g.add(box(THREE, M.ink, pw * 0.86, h * 0.34, 0.02, p.position.x, h * 0.12, p.position.z + 0.04, a))
  }
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

// 궤·문갑 — 문서와 옷을 넣어 두는 나무 상자. 놋 장석을 박아 둔다.
function chest(THREE, M, x, z, ry = 0, w = 1.3, h = 0.72, d = 0.62) {
  const g = new THREE.Group()
  g.add(box(THREE, M.dark, w, h, d, 0, 0, 0))
  g.add(box(THREE, M.lacquer, w * 1.02, 0.06, d * 1.02, 0, h - 0.03, 0))          // 뚜껑
  for (const sx of [-w / 4, w / 4]) {
    g.add(box(THREE, M.brass, 0.14, 0.14, 0.02, sx, h * 0.62, d / 2))             // 장석
    g.add(cyl(THREE, M.brass, 0.05, 0.02, sx, h * 0.45, d / 2, { rx: Math.PI / 2 }))  // 고리
  }
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

// 궤 위에 얹은 궤 — 기록이 쌓여 있는 모습.
function stackedChest(THREE, M, x, z, y) {
  const g = chest(THREE, M, 0, 0, 0, 1.2, 0.5, 0.55)
  g.position.set(x, y, z)
  return g
}

// 사방탁자 — 네모 기둥 넷에 선반을 얹은 키 큰 가구. 사랑방의 얼굴이다.
function etagere(THREE, M, x, z, ry = 0) {
  const g = new THREE.Group()
  const w = 0.9, h = 1.9
  for (const [sx, sz] of [[-w / 2, -0.25], [w / 2, -0.25], [-w / 2, 0.25], [w / 2, 0.25]])
    g.add(box(THREE, M.dark, 0.07, h, 0.07, sx, 0, sz))
  for (let i = 0; i < 4; i++) g.add(box(THREE, M.dark, w, 0.05, 0.58, 0, i * (h / 3.6), 0))
  g.add(box(THREE, M.onggi, 0.3, 0.3, 0.3, 0.2, h / 3.6 + 0.05, 0))
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

// 화로 — 숯을 담아 방을 덥히던 놋그릇. 겨울 궁궐의 방에는 반드시 있었다.
function brazier(THREE, M, x, z) {
  const g = new THREE.Group()
  g.add(cyl(THREE, M.iron, 0.3, 0.26, 0, 0, 0, { rTop: 0.34 }))
  g.add(cyl(THREE, M.brass, 0.35, 0.04, 0, 0.25, 0))       // 전(테두리)
  g.add(cyl(THREE, M.ember, 0.27, 0.04, 0, 0.23, 0))       // 숯불
  for (const [dx, dz] of [[-0.22, 0.14], [0.22, 0.14], [0, -0.26]]) g.add(cyl(THREE, M.iron, 0.04, 0.1, dx, -0.0, dz))
  g.position.set(x, 0, z)
  return g
}

// 촛대 — 방바닥에 세우는 긴 등. 밤 장면에서 방 안을 알아보게 한다.
function candleStand(THREE, M, x, z, h = 1.15) {
  const g = new THREE.Group()
  g.add(cyl(THREE, M.dark, 0.22, 0.1, 0, 0, 0))
  g.add(cyl(THREE, M.dark, 0.06, h, 0, 0.1, 0))
  // 등롱 — 네모진 종이 갓. 안에서 불이 비친다.
  g.add(box(THREE, M.paper, 0.42, 0.5, 0.42, 0, h + 0.1, 0))
  g.add(box(THREE, M.flame, 0.16, 0.2, 0.16, 0, h + 0.25, 0))
  g.add(box(THREE, M.dark, 0.48, 0.05, 0.48, 0, h + 0.6, 0))
  g.position.set(x, 0, z)
  return g
}

// 향로 — 제사와 어전에 놓이는 세 발 놋그릇.
function censer(THREE, M, x, z, s = 1) {
  const g = new THREE.Group()
  g.add(cyl(THREE, M.brass, 0.28 * s, 0.3 * s, 0, 0.12 * s, 0))
  g.add(cyl(THREE, M.brass, 0.24 * s, 0.12 * s, 0, 0.42 * s, 0, { rTop: 0.1 * s }))
  for (const a of [0, 2.09, 4.19]) g.add(cyl(THREE, M.brass, 0.05 * s, 0.14 * s, Math.cos(a) * 0.2 * s, 0, Math.sin(a) * 0.2 * s))
  g.position.set(x, 0, z)
  return g
}

// 두루마리 더미 — 둘둘 만 종이. 서고와 기록 보관소의 살림이다.
function scrolls(THREE, M, x, z, n = 5, ry = 0) {
  const g = new THREE.Group()
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3)
    g.add(cyl(THREE, M.paper, 0.07, 0.72, (i % 3) * 0.17 - 0.17, row * 0.15, row * 0.04, { rz: Math.PI / 2 }))
  }
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

function bookStack(THREE, M, x, y, z, n = 4) {
  const g = new THREE.Group()
  const colors = [0x6b5a3e, 0x3f4a55, 0x8a7550, 0x5a4a3a]
  for (let i = 0; i < n; i++) {
    const m = box(THREE, new THREE.MeshLambertMaterial({ color: colors[i % colors.length] }), 0.34, 0.06, 0.24, (i % 2) * 0.02, y + i * 0.06, 0)
    g.add(m)
  }
  g.position.set(x, 0, z)
  return g
}

// 가마니 — 볏짚으로 짠 곡식 자루. 창고와 급료(무위영 열세 달 치)의 물건이다.
function sacks(THREE, M, x, z, n = 9) {
  const g = new THREE.Group()
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3), col = i % 3
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.52, 3, 7), M.straw)
    s.rotation.z = Math.PI / 2
    s.rotation.y = (col - 1) * 0.06
    s.position.set(col * 0.5 - 0.5, FLOOR_TOP + 0.21 + row * 0.43, (col % 2) * 0.12)
    g.add(s)
  }
  g.position.set(x, 0, z)
  return g
}

function jar(THREE, M, x, z, s = 1) {
  const g = new THREE.Group()
  g.add(cyl(THREE, M.onggi, 0.34 * s, 0.6 * s, 0, 0, 0, { rTop: 0.24 * s }))
  g.add(cyl(THREE, M.onggi, 0.16 * s, 0.07 * s, 0, 0.6 * s, 0))
  g.position.set(x, 0, z)
  return g
}

// 장롱 — 안채의 옷장. 위아래 두 칸에 놋 장석.
function wardrobe(THREE, M, x, z, ry = 0) {
  const g = new THREE.Group()
  const w = 1.7, h = 2.0, d = 0.66
  g.add(box(THREE, M.dark, w, h, d, 0, 0, 0))
  for (const y of [h * 0.28, h * 0.72]) {
    g.add(box(THREE, M.wood, w * 0.92, h * 0.4, 0.04, 0, y - h * 0.2, d / 2))
    g.add(cyl(THREE, M.brass, 0.08, 0.03, 0, y, d / 2 + 0.02, { rx: Math.PI / 2 }))
  }
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

// 경대 — 거울이 달린 작은 화장 상자.
function mirrorStand(THREE, M, x, z, ry = 0) {
  const g = new THREE.Group()
  g.add(box(THREE, M.dark, 0.6, 0.3, 0.42, 0, 0, 0))
  g.add(box(THREE, M.brass, 0.34, 0.42, 0.04, 0, 0.3, -0.12))
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

// 요와 이불 — 침전에 편 잠자리.
function bedding(THREE, M, x, z, ry = 0) {
  const g = new THREE.Group()
  g.add(box(THREE, M.paper, 2.1, 0.16, 1.5, 0, 0, 0))
  g.add(box(THREE, M.indigo, 2.0, 0.22, 0.9, 0, 0.16, 0.22))
  g.add(cyl(THREE, M.red, 0.16, 0.6, -0.6, 0.16, -0.5, { rz: Math.PI / 2 }))
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

// 제상 — 위패를 모시고 향을 피우는 상.
function altar(THREE, M, x, z, ry = 0) {
  const g = new THREE.Group()
  g.add(box(THREE, M.red, 2.4, 0.1, 0.9, 0, 0.78, 0))
  g.add(box(THREE, M.dark, 2.2, 0.78, 0.8, 0, 0, 0))
  g.add(box(THREE, M.lacquer, 0.3, 0.62, 0.12, 0, 0.88, -0.2))
  g.add(box(THREE, M.paper, 0.22, 0.4, 0.03, 0, 1.0, -0.13))
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

// 창 걸이 — 군사가 지키는 방의 무기 걸이.
function spearRack(THREE, M, x, z, ry = 0) {
  const g = new THREE.Group()
  for (const sx of [-0.9, 0.9]) g.add(box(THREE, M.dark, 0.1, 1.5, 0.1, sx, 0, 0))
  g.add(box(THREE, M.dark, 2.0, 0.09, 0.12, 0, 1.4, 0))
  for (let i = 0; i < 4; i++) {
    const sx = -0.7 + i * 0.47
    g.add(cyl(THREE, M.wood, 0.045, 2.1, sx, 0, 0.06, { rx: 0.06 }))
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), M.iron)
    head.position.set(sx, FLOOR_TOP + 2.25, 0.06)
    g.add(head)
  }
  g.position.set(x, 0, z)
  g.rotation.y = ry
  return g
}

// 서가 — 규장각·수정전을 책으로 채운다.
//
// 선생님(예전): "규장각 검서관은 건물 안에서 책이 가득한 곳에 있는게 맞는거 같아."
// 책은 InstancedMesh 하나로 그린다 — 백 권을 놓아도 드로우콜은 하나다.
function bookcases(THREE, M, spots) {
  const g = new THREE.Group()
  const CASE_W = 3.2, CASE_H = 2.6, CASE_D = 0.7
  const books = []
  for (const sp of spots) {
    const frame = new THREE.Group()
    for (const sx of [-CASE_W / 2 + 0.09, CASE_W / 2 - 0.09]) frame.add(box(THREE, M.wood, 0.18, CASE_H, CASE_D, sx, 0, 0))
    for (let i = 0; i < 4; i++) {
      frame.add(box(THREE, M.wood, CASE_W, 0.1, CASE_D, 0, i * (CASE_H / 3.4), 0))
      if (i === 3) continue
      let bx = -CASE_W / 2 + 0.3
      while (bx < CASE_W / 2 - 0.3) {
        const bw = 0.09 + Math.random() * 0.07
        const bh = 0.42 + Math.random() * 0.16
        books.push({
          x: sp.x + Math.cos(sp.ry) * bx, z: sp.z - Math.sin(sp.ry) * bx,
          y: FLOOR_TOP + 0.1 + i * (CASE_H / 3.4) + bh / 2, w: bw, h: bh, ry: sp.ry,
        })
        bx += bw + 0.015
      }
    }
    frame.position.set(sp.x, 0, sp.z)
    frame.rotation.y = sp.ry
    g.add(frame)
  }

  const PALETTE = [0x6b5a3e, 0x8a7550, 0x3f4a55, 0x5a4a3a, 0x7a6a4a, 0x4a4038, 0x9a8a63]
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.5), new THREE.MeshLambertMaterial(), books.length)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color()
  books.forEach((b, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.ry)
    v.set(b.x, b.y, b.z)
    sc.set(b.w, b.h, 0.44)
    m.compose(v, q, sc)
    inst.setMatrixAt(i, m)
    inst.setColorAt(i, col.setHex(PALETTE[i % PALETTE.length]))
  })
  inst.instanceMatrix.needsUpdate = true
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true
  g.add(inst)
  return g
}

// 뒷벽과 두 옆벽을 따라 놓을 자리. 문이 있는 앞(+z)은 비운다.
function wallSpots(w, d, count = 6, depth = 0.7) {
  const spots = []
  const backZ = -d / 2 + depth / 2 + 0.5
  for (const x of [-w / 4, w / 4]) spots.push({ x, z: backZ, ry: 0 })
  const sideX = w / 2 - depth / 2 - 0.5
  for (const z of [-d / 6, d / 5]) {
    spots.push({ x: -sideX, z, ry: Math.PI / 2 })
    spots.push({ x: sideX, z, ry: -Math.PI / 2 })
  }
  return spots.slice(0, count)
}

// ── 방 종류마다 무엇을 놓는가 ─────────────────────────────────────────────
const LAYOUTS = {
  library: (THREE, M, { w, d }) => [
    bookcases(THREE, M, wallSpots(w, d)),
    lowTable(THREE, M, -w / 6, d / 6),
    cushion(THREE, M, -w / 6, d / 6 + 0.8, M.jade),
    bookStack(THREE, M, -w / 6, 0.49, d / 6),
    scrolls(THREE, M, w / 6, d / 5),
  ],
  archive: (THREE, M, { w, d }) => [
    bookcases(THREE, M, wallSpots(w, d, 2)),
    // 궤를 두 줄로 쌓아 둔다 — 실록과 의궤가 이런 궤에 담겨 있었다
    ...[-1.6, 0, 1.6].map(x => chest(THREE, M, x, -d / 2 + 2.6, 0, 1.4, 0.7)),
    ...[-1.6, 1.6].map(x => stackedChest(THREE, M, x, -d / 2 + 2.6, 0.7)),
    chest(THREE, M, -w / 2 + 1.4, 0, Math.PI / 2, 1.4, 0.7),
    chest(THREE, M, w / 2 - 1.4, 0, -Math.PI / 2, 1.4, 0.7),
    scrolls(THREE, M, -1.2, -d / 6 + 1.2, 6),
    lowTable(THREE, M, 1.4, -d / 6 + 1.2, Math.PI),
    bookStack(THREE, M, 1.4, 0.49, -d / 6 + 1.2),
  ],
  study: (THREE, M, { w, d }) => [
    lowTable(THREE, M, 0, -d / 8),
    cushion(THREE, M, 0, -d / 8 + 0.85, M.indigo),
    bookStack(THREE, M, -0.4, 0.49, -d / 8),
    box(THREE, M.lacquer, 0.3, 0.06, 0.2, 0.45, 0.49, -d / 8),      // 벼루
    cyl(THREE, M.dark, 0.03, 0.26, 0.55, 0.52, -d / 8, { rz: 1.2 }), // 붓
    chest(THREE, M, -w / 2 + 1.1, -d / 4, Math.PI / 2, 1.1, 0.6),
    screen(THREE, M, 0, -d / 2 + 0.9, 0, 4),
    candleStand(THREE, M, w / 2 - 1.2, -d / 4),
  ],
  sarang: (THREE, M, { w, d }) => [
    screen(THREE, M, 0, -d / 2 + 0.9, 0, 4),
    lowTable(THREE, M, -w / 8, -d / 8),
    cushion(THREE, M, -w / 8, -d / 8 + 0.85, M.red),
    cushion(THREE, M, w / 6, 0, M.jade),
    chest(THREE, M, -w / 2 + 1.1, d / 8, Math.PI / 2),
    etagere(THREE, M, w / 2 - 1.1, -d / 5, -Math.PI / 2),
    brazier(THREE, M, w / 8, -d / 4),
    candleStand(THREE, M, -w / 2 + 1.4, -d / 3, 0.95),
  ],
  bedchamber: (THREE, M, { w, d }) => [
    screen(THREE, M, -w / 6, -d / 2 + 0.9, 0, 6),
    bedding(THREE, M, -w / 6, -d / 5),
    chest(THREE, M, -w / 6 + 1.6, -d / 5, -Math.PI / 2, 0.9, 0.5, 0.5),
    candleStand(THREE, M, -w / 6 - 1.7, -d / 5),
    lowTable(THREE, M, w / 4, -d / 8, 0, 1.2),
    cushion(THREE, M, w / 4, -d / 8 + 0.8, M.indigo),
    brazier(THREE, M, w / 4 + 1.3, -d / 4),
  ],
  inner: (THREE, M, { w, d }) => [
    wardrobe(THREE, M, -w / 4, -d / 2 + 0.9),
    wardrobe(THREE, M, w / 4, -d / 2 + 0.9),
    screen(THREE, M, -w / 2 + 1.1, 0, Math.PI / 2, 3, 1.5),
    mirrorStand(THREE, M, w / 2 - 1.2, -d / 6, -Math.PI / 2),
    cushion(THREE, M, 0, 0, M.jade),
    box(THREE, M.red, 0.42, 0.24, 0.34, 0.7, 0, 0.2),   // 반짇고리
    brazier(THREE, M, -w / 4, d / 5),
  ],
  dowager: (THREE, M, { w, d }) => [
    screen(THREE, M, 0, -d / 2 + 0.9, 0, 6),
    box(THREE, M.red, 1.7, 0.14, 1.1, 0, 0, -d / 6),    // 보료
    cushion(THREE, M, -1.3, -d / 6, M.jade),
    lowTable(THREE, M, 0, -d / 6 + 1.1, Math.PI, 1.2),
    brazier(THREE, M, 1.6, -d / 6),
    chest(THREE, M, -w / 2 + 1.1, d / 8, Math.PI / 2, 1.2, 0.5),
    candleStand(THREE, M, w / 2 - 1.2, -d / 4),
  ],
  shrine: (THREE, M, { w, d }) => [
    altar(THREE, M, 0, -d / 2 + 1.3),
    censer(THREE, M, 0, -d / 2 + 2.3),
    candleStand(THREE, M, -1.5, -d / 2 + 2.2, 1.0),
    candleStand(THREE, M, 1.5, -d / 2 + 2.2, 1.0),
    cushion(THREE, M, 0, -d / 2 + 3.6, M.indigo),
  ],
  court: (THREE, M, { w, d }) => [
    censer(THREE, M, -w / 4, -d / 6, 1.2),
    censer(THREE, M, w / 4, -d / 6, 1.2),
    candleStand(THREE, M, -w / 4 - 0.9, -d / 6, 1.3),
    candleStand(THREE, M, w / 4 + 0.9, -d / 6, 1.3),
  ],
  storehouse: (THREE, M, { w, d }) => [
    sacks(THREE, M, -w / 4, -d / 2 + 1.2),
    sacks(THREE, M, w / 4, -d / 2 + 1.2, 3),
    jar(THREE, M, w / 2 - 1.1, 0),
    jar(THREE, M, w / 2 - 1.1, 1.0, 0.8),
    chest(THREE, M, -w / 2 + 1.1, d / 6, Math.PI / 2, 1.2, 0.6),
  ],
  guardroom: (THREE, M, { w, d }) => [
    spearRack(THREE, M, 0, -d / 2 + 0.7),
    chest(THREE, M, -w / 2 + 1.1, -d / 6, Math.PI / 2, 1.2, 0.6),
    cushion(THREE, M, w / 5, -d / 6, M.indigo),
    cushion(THREE, M, w / 5, d / 8, M.indigo),
    brazier(THREE, M, -w / 5, d / 6),
  ],
  quarters: (THREE, M, { w, d }) => [
    screen(THREE, M, 0, -d / 2 + 0.9, 0, 4, 1.6),
    cushion(THREE, M, -0.9, -d / 6, M.red),
    cushion(THREE, M, 0.9, -d / 6, M.indigo),
    lowTable(THREE, M, 0, -d / 6 + 1.0, Math.PI, 1.2),
    candleStand(THREE, M, w / 2 - 1.2, -d / 5, 0.9),
    chest(THREE, M, -w / 2 + 1.1, d / 8, Math.PI / 2, 1.0, 0.5, 0.5),
  ],
}

// 같은 재질을 쓰는 메시를 하나로 합친다. 세간은 한 번 놓으면 움직이지 않으므로
// 월드 행렬을 지오메트리에 구워 넣어도 된다. InstancedMesh(책)는 그대로 둔다.
function mergeByMaterial(THREE, group) {
  const out = new THREE.Group()
  const byMaterial = new Map()
  group.updateMatrixWorld(true)
  group.traverse(o => {
    if (o.isInstancedMesh) { out.add(o); return }
    if (!o.isMesh || !o.geometry) return
    const g = o.geometry.clone()
    g.applyMatrix4(o.matrixWorld)
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name)
    if (!byMaterial.has(o.material)) byMaterial.set(o.material, [])
    byMaterial.get(o.material).push(g)
  })
  for (const [material, geometries] of byMaterial) {
    const merged = mergeGeometries(geometries, false)
    geometries.forEach(g => g.dispose())
    if (!merged) continue
    out.add(new THREE.Mesh(merged, material))
  }
  return out
}

/**
 * 방 하나를 채운다.
 *   kind  palaces.js 의 furnish 값(FURNISH_KINDS)
 *   size  { w, d } — 이미 ROOM_SHRINK 를 먹인 방 안쪽 크기
 * 모르는 값이면 빈 그룹을 준다(방이 비어 있을 뿐, 터지지 않는다).
 */
export function buildInterior(THREE, tex, kind, { w, d }) {
  const g = new THREE.Group()
  const make = LAYOUTS[kind]
  if (!make) return g
  for (const part of make(THREE, mats(THREE, tex), { w, d })) g.add(part)
  return mergeByMaterial(THREE, g)
}
