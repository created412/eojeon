import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ROOM_SHRINK, WALL_THICKNESS } from '../data/hall-geometry.js'
export { ROOM_SHRINK } from '../data/hall-geometry.js'
import { buildRoofGeometry } from './roof.js'
import { buildPalaceGarden, makeHallSign } from './palace-garden.js'
import { buildInterior } from './interiors.js'
import { buildYardProps } from './yard-props.js'
import { buildYardFeatures } from './yard-features.js'
import { woodGrain, dancheong, roofTile, baksok, changhoji, maru } from './film-textures.js'

export function makeTextures(THREE) {
  const wrap = (canvas, repeatX = 1, repeatY = 1) => {
    const t = new THREE.CanvasTexture(canvas)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeatX, repeatY)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  return {
    wood: wrap(woodGrain(512), 1, 3),
    dancheong: wrap(dancheong(512), 3, 1),
    roof: wrap(roofTile(512), 6, 2),
    ground: wrap(baksok(512), 16, 18),
    paper: wrap(changhoji(256), 2, 1),
    maru: wrap(maru(512), 5, 5),
  }
}

// 기단 높이. 예전에는 1.2 였는데, 그러면 마루가 학생 머리 높이 근처에 뜨고 학생은
// **그 아래 땅바닥을 지나간다.** 「방에 들어간다」가 기하학적으로 성립하지 않았다 —
// 인정전에 들어가도 발밑은 마당의 박석이었고, 가림 처리가 건물을 지워 빈 마당만 남았다.
// 문지방 높이로 낮춰서, 걸어 들어가면 실제로 마루 위에 서게 한다.
// 임금의 발은 y=0.10 에 있다(scene.js 의 player.y 1.9 − glb-person 의 FOOT_DROP 1.8).
// 기단과 마루를 합친 높이가 정확히 그 값이라야 **임금이 마루 위에 선다.** 예전에는
// 0.12+0.18=0.30 이어서 임금이 마루에 20cm 잠겨 있었고, 발로 쏘는 가림 광선이
// 마루를 뚫고 지나갔다.
const BASE_H = 0.04
const FLOOR_H = 0.06          // 기단 위에 얹혀 윗면이 0.10 이 된다

export function buildHall(THREE, tex, { w, d, h = 7, bays = 5, burnt = false, label = '', grand = false, gate = false }) {
  const g = new THREE.Group()

  const charred = () => new THREE.MeshLambertMaterial({ color: 0x2a2622 })

  // 기단
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w + 3, BASE_H, d + 3),
    new THREE.MeshLambertMaterial({ color: burnt ? 0x6f6a60 : 0x9a9384 })
  )
  base.position.y = BASE_H / 2
  base.userData.noOcclude = true     // 바닥은 임금을 가릴 수 없다 (occlusion.js)
  g.add(base)

  // 기둥 — InstancedMesh 로 드로우콜을 아낀다
  const colGeo = new THREE.CylinderGeometry(0.42, 0.46, burnt ? h * 0.45 : h, 8)
  const colMat = burnt ? charred() : new THREE.MeshStandardMaterial({ map: tex.wood, bumpMap: tex.wood, bumpScale: .035, roughness: .92 })
  // 기둥은 칸의 **경계**에 선다 — 다섯 칸이면 기둥 여섯이고, 가운데에는 없다.
  // 예전에는 칸 수만큼 세우면서 x=0 에 한 그루를 박았고, 그래서 정전에 들어서면
  // 어좌와 일월오봉도 정면을 기둥이 세로로 가로질렀다.
  //
  // 그리고 **앞줄은 가운데를 비운다**(OPEN_FRONT). 실제 정전도 어칸이 드나드는 자리라
  // 그 앞이 트여 있지만, 여기서는 그보다 더 실질적인 까닭이 있다: 카메라가 임금 뒤
  // 낮은 자리에 있어서(CAM_HEIGHT 7.5) 앞줄 기둥이 화면을 세로로 가르고 그 뒤에 선
  // 사람을 통째로 가린다. 실제로 곁에 선 대원군이 기둥 뒤에 숨어 안 보였다.
  const OPEN_FRONT = 0.2
  const xs = []
  for (let b = 0; b <= bays; b++) xs.push(-w / 2 + (w / bays) * b)
  const frontXs = xs.filter(x => Math.abs(x) > w * OPEN_FRONT)
  const backXs = gate ? frontXs : xs
  const cols = new THREE.InstancedMesh(colGeo, colMat, backXs.length + frontXs.length)
  const m = new THREE.Matrix4()
  const colY = BASE_H + (burnt ? h * 0.225 : h / 2)
  let i = 0
  for (const x of backXs) {
    m.makeTranslation(x, colY, -d / 2)
    cols.setMatrixAt(i++, m)
  }
  for (const x of frontXs) {
    m.makeTranslation(x, colY, d / 2)
    cols.setMatrixAt(i++, m)
  }
  cols.instanceMatrix.needsUpdate = true
  g.add(cols)

  if (burnt) return g   // 벽·창방·지붕은 타 없어졌다

  // 마루 — 기단 위에 깔리는 나무 바닥. 이게 있어야 「방에 들어왔다」가 눈에 보인다.
  // 예전에는 방이 속이 꽉 찬 상자여서, 방에 들어가면 가림 처리가 그 상자를 통째로
  // 지웠고 학생은 **빈 포장돌 위에 서 있었다.** 안이라는 감각이 아예 없었다.
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(w, FLOOR_H, d),
    new THREE.MeshStandardMaterial({ map: tex.maru, bumpMap: tex.maru, bumpScale: .025, roughness: .87 })
  )
  floor.position.y = BASE_H + FLOOR_H / 2
  floor.userData.noOcclude = true    // 이걸 안 하면 발로 쏘는 광선에 걸려 매 프레임 지워진다
  g.add(floor)

  // 벽 (창호지) — 상자 하나가 아니라 **세 면**이다. 카메라를 마주 보는 앞면(+z)은
  // 비워 둔다: 그래야 밖에서 안이 들여다보이고, 안에 서면 기둥과 뒷벽이 둘러싼다.
  // 세 면을 하나로 합쳐 드로우콜은 그대로 하나만 쓴다.
  const wt = WALL_THICKNESS, wh = h * 0.72, wy = wh / 2
  const panel = (sw, sh, sd, px, pz) => {
    const b = new THREE.BoxGeometry(sw, sh, sd)
    b.translate(px, wy, pz)
    return b
  }
  const walls = new THREE.Mesh(
    mergeGeometries([
      ...(!gate ? [panel(w, wh, wt, 0, -d / 2 + wt / 2)] : []),
      panel(wt, wh, d, -w / 2 + wt / 2, 0),        // 왼쪽
      panel(wt, wh, d, w / 2 - wt / 2, 0),         // 오른쪽
    ], false),
    new THREE.MeshLambertMaterial({ map: tex.paper })
  )
  walls.position.y = BASE_H
  g.add(walls)
  g.userData.walls = walls      // 벽걸이 세간(족자·휘장)이 이 벽과 함께 보였다 사라진다(scene.js)

  // 창방 (단청 띠)
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(w + 1.5, 0.9, d + 1.5),
    new THREE.MeshLambertMaterial({ map: tex.dancheong })
  )
  beam.position.y = BASE_H + h - 0.45
  g.add(beam)

  // 공포(栱包) — 기둥머리에서 처마를 받치는 나무 짜임. 한옥이 한옥으로 보이는
  // 가장 큰 요소인데 지금까지 없었다. 사실적으로 짜지 않고, 이 게임이 단청에서부터
  // 써 온 것과 같은 추상화 수준으로 「기둥마다 밖으로 뻗은 짧은 팔」로 줄인다.
  // 지오메트리를 하나로 합쳐 드로우콜은 하나만 쓴다.
  const brackets = []
  const armGeo = () => new THREE.BoxGeometry(0.34, 0.26, 1.5)
  const by = BASE_H + h - 1.0
  for (let b = 0; b < bays; b++) {
    const x = -w / 2 + (w / (bays - 1)) * b
    for (const z of [-d / 2, d / 2]) {
      const a = armGeo(); a.translate(x, by, z + (z < 0 ? -0.5 : 0.5))
      brackets.push(a)
      const a2 = armGeo(); a2.rotateY(Math.PI / 2); a2.translate(x, by + 0.34, z)
      brackets.push(a2)
    }
  }
  const gong = new THREE.Mesh(
    mergeGeometries(brackets, false),
    new THREE.MeshLambertMaterial({ color: 0x5b4632 })
  )
  g.add(gong)

  // 지붕 — 팔작지붕. 예전에는 사각뿔대 하나였다(위에서 보면 검은 마름모).
  // 실제 팔작지붕은 **처마가 아래로 내려오다 끝에서 살짝 들린다**. 그 곡선이
  // 없으면 한옥이 아니라 천막으로 보인다. 층을 여럿 쌓아 곡선을 흉내 내고
  // 하나로 합쳐 드로우콜 하나로 그린다.
  const yy = 3.1
  const roof = new THREE.Mesh(
    buildRoofGeometry(w, d, yy),
    new THREE.MeshStandardMaterial({ map: tex.roof, bumpMap: tex.roof, bumpScale: .06, roughness: .84, side: THREE.DoubleSide })
  )
  roof.position.y = BASE_H + h - 0.2
  g.add(roof)

  // 용마루 — 지붕 꼭대기를 가로지르는 굵은 마루. 이것 하나로 실루엣이 팔작지붕이 된다.
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.55, 0.5, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x2f3237 })
  )
  ridge.position.y = BASE_H + h - 0.2 + yy
  g.add(ridge)

  if (grand) {
    const upper=new THREE.Mesh(new THREE.BoxGeometry(w*.70,1.8,d*.50),new THREE.MeshLambertMaterial({map:tex.dancheong}))
    upper.position.y=h+1.7;g.add(upper)
    const crown=new THREE.Mesh(buildRoofGeometry(w*.72,d*.55,2.35),new THREE.MeshLambertMaterial({map:tex.roof,side:THREE.DoubleSide}))
    crown.position.y=h+2.55;g.add(crown)
    const crownRidge=new THREE.Mesh(new THREE.BoxGeometry(w*.4,.28,.48),new THREE.MeshLambertMaterial({color:0x879a91}))
    crownRidge.position.y=h+4.9;g.add(crownRidge)
  }
  // A pale raised hip and small ridge-end ornaments pick out the tiled silhouette.
  const ridgeMaterial=new THREE.MeshLambertMaterial({color:0x8e9d91})
  for(const side of [-1,1]) {
    const finial=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),ridgeMaterial)
    finial.position.set(side*w*.27,h+3.3,0);finial.scale.set(.65,1.5,.7);g.add(finial)
  }

  if (label) {
    const sign = makeHallSign(label)
    sign.position.set(0,h-1.2,d/2+.52)
    g.add(sign)
  }
  // Pale stone column feet and jade-green bracket tips articulate the façade.
  const feetGeo = new THREE.CylinderGeometry(.57,.62,.24,8)
  const feet = new THREE.InstancedMesh(feetGeo,new THREE.MeshLambertMaterial({color:0xb0b1a4}),backXs.length+frontXs.length)
  let footIndex=0
  for(const z of [-d/2,d/2]) for(const x of z<0?backXs:frontXs) {
    feet.setMatrixAt(footIndex++,new THREE.Matrix4().makeTranslation(x,.18,z))
  }
  g.add(feet)
  const tipMat=new THREE.MeshLambertMaterial({color:0x496f61})
  const ornament=[]
  for(const x of xs) for(const z of [-d/2,d/2]) {
    const b=new THREE.BoxGeometry(.62,.15,1.6);b.translate(x,h-.9,z);ornament.push(b)
  }
  g.add(new THREE.Mesh(mergeGeometries(ornament,false),tipMat))
  ornament.forEach(b=>b.dispose())

  return g
}

// 어좌(御座)와 일월오봉도(日月五峰圖).
//
// 어전회의가 열리는 방이 텅 빈 마루였다. 이 게임의 이름이 「어전 御前」인데
// 정작 임금 앞에 아무것도 없었다. 임금이 앉는 자리와 그 뒤에 반드시 서는 병풍 —
// 해와 달과 다섯 봉우리 — 을 세운다. 이 병풍은 임금이 있는 곳에만 놓였으므로,
// 이것이 서 있는 방이 곧 어전이라는 표시가 된다.
//
// 그림을 사실적으로 그리지 않는다. 이 게임이 단청·흉배에서 써 온 것과 같은
// 추상화 수준으로 — 붉은 해, 흰 달, 다섯 봉우리의 실루엣.
// 발(簾)의 결을 그리던 baltex() 가 여기 있었다 — 조대비와 함께 걷어 냈다(2026-09-26).

function ilwolobongdo(THREE) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 160
  const g = c.getContext('2d')
  g.fillStyle = '#123a2e'; g.fillRect(0, 0, 256, 160)          // 청록 바탕
  g.fillStyle = '#c9302c'; g.beginPath(); g.arc(66, 34, 13, 0, Math.PI * 2); g.fill()   // 해
  g.fillStyle = '#e8e2d4'; g.beginPath(); g.arc(190, 34, 13, 0, Math.PI * 2); g.fill()  // 달
  // 다섯 봉우리
  const peaks = [[24, 96], [72, 74], [128, 62], [184, 74], [232, 96]]
  g.fillStyle = '#2f5d4a'
  for (const [x, top] of peaks) {
    g.beginPath(); g.moveTo(x - 34, 128); g.lineTo(x, top); g.lineTo(x + 34, 128); g.closePath(); g.fill()
  }
  g.fillStyle = '#0e2b22'; g.fillRect(0, 128, 256, 32)          // 물결
  g.strokeStyle = '#2f5d4a'; g.lineWidth = 2
  for (let i = 0; i < 6; i++) {
    g.beginPath(); g.moveTo(i * 44, 140); g.quadraticCurveTo(i * 44 + 22, 132, i * 44 + 44, 140); g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// 어좌가 차지하는 깊이(뒤벽에서부터). 신하가 어좌를 밟고 서지 않게
// **뒤벽에 바짝 붙인다** — 처음엔 방 안쪽으로 3.2 나와 있었고, 경복궁 사정전에서
// 신헌(z=-18)이 어좌(z=-18.2) 위에 올라서 있었다. 임금의 자리에 신하가 서 있는
// 그림은 이 게임에서 그냥 넘길 자리가 아니다. tests/data/throne.test.js 가 붙든다.
// 방을 실제로 짓는 비율. palaces.js 의 w·d 는 배치도의 칸이고, 3D 로 세워지는
// 전각은 그 0.72 배다 — 처마가 칸 밖으로 넓게 퍼져 나오기 때문이다.
// **이 값은 여기 한 번만 적는다.** 예전에는 이 아래 buildPalace 와 어좌 시험이
// 각자 0.72 를 따로 적고 있었다 — 두 벌이 된 규칙은 반드시 갈린다.
// 어좌 자리(systems/audience.js)와 tests/data/throne.test.js 가 이것을 가져다 쓴다.

export const THRONE_FROM_BACK = 1.3
export const THRONE_DEPTH = 2.2
export const THRONE_WIDTH = 5.2

function buildThrone(THREE, tex, { w, d }) {
  const g = new THREE.Group()
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b2320 })
  const z0 = -d / 2 + THRONE_FROM_BACK

  // 어좌를 올리는 단
  const dais = new THREE.Mesh(
    new THREE.BoxGeometry(THRONE_WIDTH, 0.5, THRONE_DEPTH),
    new THREE.MeshLambertMaterial({ color: 0x7a2b26 })
  )
  dais.position.set(0, BASE_H + 0.25, z0)
  dais.userData.noOcclude = true
  g.add(dais)

  // 단으로 오르는 계단 — 앞면 가운데. 이 세 단이 있어야 「올라앉는 자리」로 보인다.
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x8a8477 })
  for (let i = 0; i < 3; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.17, 0.34), stoneMat)
    st.position.set(0, BASE_H + 0.085 + i * 0.17, z0 + THRONE_DEPTH / 2 + 0.5 - i * 0.34)
    st.userData.noOcclude = true
    g.add(st)
  }

  // 의자 — 앉는 판, 등받이, 팔걸이
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 1.4), wood)
  seat.position.set(0, BASE_H + 0.85, z0)
  g.add(seat)
  const backRest = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.6, 0.18), wood)
  backRest.position.set(0, BASE_H + 1.7, z0 - 0.6)
  g.add(backRest)
  for (const sx of [-0.95, 0.95]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 1.4), wood)
    arm.position.set(sx, BASE_H + 1.2, z0)
    g.add(arm)
  }

  // 곡병(曲屛) — 등받이를 감싸 도는 세 폭 병풍. 어좌를 「의자 하나」가 아니라
  // 「자리」로 만드는 것이 이것이다.
  const gokbyeong = new THREE.MeshLambertMaterial({ color: 0x8b2f22 })
  for (const [sx, ang] of [[-1, 0.55], [1, -0.55]]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.1), gokbyeong)
    wing.position.set(sx * 1.28, BASE_H + 1.65, z0 - 0.42)
    wing.rotation.y = ang
    g.add(wing)
  }

  // 닫집(唐家) — 어좌 위에 따로 얹는 작은 지붕. 임금의 자리 위에만 있는 것이라,
  // 이 하나가 「여기가 어전이다」를 화면에서 가장 크게 말한다. 실제 근정전·인정전
  // 어좌 위에 있는 그것이다(선생님 지적 8번: "용상을 완벽하게 구현해야 해").
  const canopyY = BASE_H + 3.15
  const dan = new THREE.Group()
  const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 2.6),
    new THREE.MeshLambertMaterial({ map: tex.roof }))
  canopyRoof.position.y = canopyY + 0.5
  dan.add(canopyRoof)
  const canopyEave = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.16, 3.1),
    new THREE.MeshLambertMaterial({ map: tex.roof }))
  canopyEave.position.y = canopyY + 0.3
  dan.add(canopyEave)
  // 단청 띠 — 처마 밑을 두르는 색. 카메라가 아래에서 보므로 이 띠가 제일 잘 보인다.
  const band = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.34, 3.0),
    new THREE.MeshLambertMaterial({ map: tex.dancheong }))
  band.position.y = canopyY + 0.04
  dan.add(band)
  // 네 기둥
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 3.0, 6), wood)
      post.position.set(sx * 1.5, BASE_H + 1.6, z0 + sz * 1.15)
      dan.add(post)
    }
  }
  dan.position.z = z0
  dan.userData.noOcclude = true   // 어좌 위에 붙은 것이다 — 가림 판정이 지우면 어좌만 뜬다
  g.add(dan)

  // 수렴청정의 발(簾)이 어좌 앞에 걸려 있었다. 선생님(2026-09-26)이 조대비를 걷어 내라
  // 하시면서 발도 함께 사라졌다 — 드리울 사람이 없다. 발이라는 물건 자체는 방 안 물건
  // 카드로 남는다(data/artifacts.js 의 'yeom' — 수렴청정이 무엇이었는지 거기서 읽는다).

  // 어좌 앞의 등불 하나. 정전 안은 해가 직접 들지 않아 어두운데, 이 게임에서 가장
  // 중요한 자리가 바로 여기다 — 임금과 그 앞에 선 사람의 얼굴이 보여야 한다.
  // 세기와 거리를 작게 잡아 방 안만 덥히고 마당으로는 새지 않게 한다.
  const lamp = new THREE.PointLight(0xffdcab, 2.6, 26, 2)
  lamp.position.set(0, BASE_H + 3.6, z0 + 3.2)
  g.add(lamp)

  // 일월오봉도 — 어좌 바로 뒤, 뒤벽에 붙어 선다
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 4.0),
    new THREE.MeshLambertMaterial({ map: ilwolobongdo(THREE) })
  )
  // 벽 판이 -d/2 부터 두께 0.45 를 차지한다 — 0.35 에 두면 **벽 속에 묻혀** 안 보인다.
  // 어좌를 뒤로 밀면서 실제로 그렇게 됐고, 병풍이 화면에서 사라졌다.
  screen.position.set(0, BASE_H + 2.2, -d / 2 + 0.62)
  g.add(screen)

  return g
}

// 2단계 — 담. 궁을 압축한 것만으로는 「안에 있다」는 느낌이 안 산다 — 하늘에서
// 본 배치도가 조금 작아졌을 뿐이다. 지면 가장자리를 두르는 낮은 담을 세워 걷는
// 사람이 실제로 벽 안에 있다고 느끼게 한다. 지오메트리 하나(단위 정육면체)와
// 머티리얼 하나를 네 변이 함께 쓴다 — 드로우콜 넷을 더할 뿐, 예산(100)에 비하면 작다.
function buildWall(THREE, ground) {
  const g = new THREE.Group()
  const h = 3.4, t = 0.7
  const geo = new THREE.BoxGeometry(1, 1, 1)
  const mat = new THREE.MeshLambertMaterial({ color: 0xb6b19c })
  const side = (sx, sy, sz, px, py, pz) => {
    const m = new THREE.Mesh(geo, mat)
    m.scale.set(sx, sy, sz)
    m.position.set(px, py, pz)
    g.add(m)
  }
  side(ground.w + t, h, t, 0, h / 2, ground.d / 2)
  side(ground.w + t, h, t, 0, h / 2, -ground.d / 2)
  side(t, h, ground.d + t, ground.w / 2, h / 2, 0)
  side(t, h, ground.d + t, -ground.w / 2, h / 2, 0)
  const coping=new THREE.MeshLambertMaterial({color:0x3b5055})
  for (const [w,d,x,z] of [[ground.w+1.4,1.2,0,ground.d/2],[ground.w+1.4,1.2,0,-ground.d/2],[1.2,ground.d+1.4,ground.w/2,0],[1.2,ground.d+1.4,-ground.w/2,0]]) {
    const cap=new THREE.Mesh(new THREE.BoxGeometry(w,.25,d),coping);cap.position.set(x,h+.12,z);g.add(cap)
    const base=new THREE.Mesh(new THREE.BoxGeometry(w,.62,d),new THREE.MeshLambertMaterial({color:0x898e82}));base.position.set(x,.31,z);g.add(base)
  }
  return g
}

// ── 마당의 것들 ────────────────────────────────────────────────────────────
// 두 궁이 서로 달라 보이게 하는 자리다. 집은 같은 방식으로 짓지만(그것이 조선 궁궐의
// 사실이기도 하다), 마당은 다르다 — 경복궁은 회랑이 두른 조정, 창덕궁은 나무.
// 무엇을 어디에 둘지는 data/palaces.js 의 def.yard 가 정한다.

// 소나무 한 그루. 줄기 하나에 잎 덩이 셋 — 멀리서 「나무」로 읽히면 된다.
function buildTree(THREE, seed = 0) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, 3.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x4a3a28 }))
  trunk.position.y = 1.8
  g.add(trunk)
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x344236 })
  const puff = (r, y, dx, dz) => {
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0), leafMat, 34)
    const transform=new THREE.Object3D()
    for(let k=0;k<34;k++) {
      const a=k*2.399, spread=r*Math.sqrt(j(k+50))
      transform.position.set(dx+Math.cos(a)*spread,y+(j(k+70)-.4)*r*.44,dz+Math.sin(a)*spread)
      transform.scale.set(.32+j(k+80)*.38,.25+j(k+90)*.26,.35+j(k+100)*.4)
      transform.rotation.set(0,a,.1);transform.updateMatrix();m.setMatrixAt(k,transform.matrix)
    }
    m.instanceMatrix.needsUpdate=true
    g.add(m)
  }
  // seed 로 조금씩 다르게 — 열 그루가 똑같으면 심어 놓은 말뚝으로 보인다
  const j = (n) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  puff(1.9 + j(1) * 0.5, 4.2, (j(2) - 0.5) * 0.9, (j(3) - 0.5) * 0.9)
  puff(1.4 + j(4) * 0.4, 5.4, (j(5) - 0.5) * 1.2, (j(6) - 0.5) * 1.2)
  puff(1.1 + j(7) * 0.3, 3.3, (j(8) - 0.5) * 1.8, (j(9) - 0.5) * 1.8)
  return g
}

// 회랑 — 조정을 두른 행각. 낮은 기단 위에 기둥이 늘어서고 그 위에 지붕 띠가 얹힌다.
// 걷는 길(가운데 축)은 비워 둔다: 양옆 두 줄만 세운다.
function buildColonnade(THREE, tex, spec) {
  const g = new THREE.Group()
  const { halfW, z0, z1 } = spec
  const len = z1 - z0
  const zc = (z0 + z1) / 2
  const wood = new THREE.MeshLambertMaterial({ map: tex.wood })
  const stone = new THREE.MeshLambertMaterial({ color: 0x7d7666 })
  const roofMat = new THREE.MeshLambertMaterial({ map: tex.roof })
  for (const sx of [-1, 1]) {
    const x = sx * halfW
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, len), stone)
    base.position.set(x, 0.25, zc)
    g.add(base)
    // 안쪽 벽 — 마당에서 보면 회랑 너머가 가려진다
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.0, len),
      new THREE.MeshLambertMaterial({ color: 0xb9a887 }))
    wall.position.set(x + sx * 1.4, 2.0, zc)
    g.add(wall)
    const n = Math.max(2, Math.round(len / 3))
    for (let i = 0; i <= n; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.2, 7), wood)
      col.position.set(x - sx * 1.0, 2.1, z0 + (len * i) / n)
      g.add(col)
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, len + 1.2), roofMat)
    roof.position.set(x, 3.9, zc)
    g.add(roof)
    const eave = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.22, len + 1.6), roofMat)
    eave.position.set(x, 3.62, zc)
    g.add(eave)
  }
  return g
}

// 품계석 — 신하가 품계에 따라 제 돌 옆에 서던 자리. 조정 가운데로 두 줄이다.
function buildRankStones(THREE, spec) {
  const g = new THREE.Group()
  const { halfW, z0, z1, pairs } = spec
  const mat = new THREE.MeshLambertMaterial({ color: 0x8c8577 })
  const geo = new THREE.BoxGeometry(0.42, 1.05, 0.32)
  for (let i = 0; i < pairs; i++) {
    const z = z0 + ((z1 - z0) * i) / Math.max(1, pairs - 1)
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(sx * halfW, 0.55, z)
      g.add(m)
    }
  }
  return g
}

function buildYard(THREE, tex, def) {
  const g = new THREE.Group()
  g.add(buildYardFeatures(THREE, tex, def))
  const y = def.yard ?? {}
  ;(y.trees ?? []).forEach(([x, z], i) => {
    const t = buildTree(THREE, i + 1)
    t.position.set(x, 0, z)
    g.add(t)
  })
  if (y.colonnade) {
    const room = def.rooms.find(r => r.id === y.colonnade.room)
    if (room) {
      const c = buildColonnade(THREE, tex, y.colonnade)
      c.position.x = room.x
      g.add(c)
    }
  }
  // 마당 물건 — 가마·척화비·해치·드무·굴뚝·해시계·우물·장독대(render/yard-props.js).
  {
    const props = buildYardProps(THREE, def)
    props.userData.yardProps = true
    g.add(props)
  }
  if (y.rankStones) {
    const room = def.rooms.find(r => r.id === y.rankStones.room)
    if (room) {
      const rs = buildRankStones(THREE, y.rankStones)
      rs.position.x = room.x
      g.add(rs)
    }
  }
  return g
}

export function buildPalace(THREE, tex, def) {
  const root = new THREE.Group()

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(def.ground.w, def.ground.d),
    new THREE.MeshStandardMaterial({ map: tex.ground, bumpMap: tex.ground, bumpScale: .05, roughness: .98 })
  )
  ground.rotation.x = -Math.PI / 2
  root.add(ground)
  root.add(buildWall(THREE, def.ground))
  root.add(buildYard(THREE, tex, def))
  root.add(buildPalaceGarden(def))

  for (const r of def.rooms) {
    const hall = buildHall(THREE, tex, {
      w: r.w * ROOM_SHRINK,
      d: r.d * ROOM_SHRINK,
      // 집 높이. 10·7 이던 것을 7.5·5.5 로 낮춘다 — 궁을 「사람 크기」로 줄일 때
      // (방을 0.72배로) 높이는 그대로 두어, 카메라에서 지붕이 늘 시야 위로 잘렸다.
      // 선생님: "지금 게임에는 건물에 뚜껑(지붕)이 없어." 지붕은 지어져 있었고,
      // 집이 너무 높아서 안 보였던 것이다. 5.5m 는 임금 키(2.9)의 두 배 남짓이라
      // 화면에서 「집」으로 읽히고 지붕까지 한 화면에 들어온다.
      h: r.id === 'injeongjeon' || r.id === 'geunjeongjeon' ? 7.5 : 5.5,
      bays: r.w > 24 ? 7 : 5,
      burnt: r.burnt === true,
      gate: r.gate === true,
      label: r.name,
      grand: r.id === 'injeongjeon' || r.id === 'geunjeongjeon',
    })
    hall.position.set(r.x, 0, r.z)
    hall.userData.roomId = r.id
    hall.userData.occlusionShell = true
    // 어전회의가 열리는 방에만 어좌와 일월오봉도를 세운다 — 이 병풍이 서 있는
    // 자리가 곧 어전이다.
    // 방 안을 채우는 것 — 쓰임에 맞는 세간(render/interiors.js). 불탄 방은 비워 둔다.
    if (r.furnish && !r.burnt) {
      const inside = buildInterior(THREE, tex, r.furnish, { w: r.w * ROOM_SHRINK, d: r.d * ROOM_SHRINK })
      inside.position.set(r.x, 0, r.z)
      inside.userData.roomId = r.id
      root.add(inside)
      // 벽걸이는 벽이 보일 때만 보인다 — scene.js 가 매 프레임 hall.userData.walls 를 따라 맞춘다.
      const mounted = inside.getObjectByName('wallMounted')
      if (mounted) hall.userData.wallItems = mounted
    }
    // 어좌 — 정전과 어전회의 방에만 세운다. 그 병풍(일월오봉도)이 서 있는 자리가 곧 어전이다.
    //
    // 「어전회의가 열리는 방」만으로 고르면 안 된다: 갑신정변에 임금이 급히 옮겨 간
    // 경우궁·계동궁·북묘·오조유의 영방도 그 궁의 councilRoom 이라, 군졸이 자던 방에
    // 일월오봉도와 어좌가 서 있었다. 임시로 든 거처에 어좌를 들고 갈 수는 없다.
    // 그래서 조건을 furnish 로 바꾼다 — 어전(court)으로 꾸민 방과 정전(throne)만이다.
    const isThroneRoom = r.throne === true || (r.id === def.councilRoom && r.furnish === 'court')
    if (isThroneRoom && !r.burnt && def.private !== true) {
      const th = buildThrone(THREE, tex, { w: r.w * ROOM_SHRINK, d: r.d * ROOM_SHRINK })
      th.position.set(r.x, 0, r.z)
      th.userData.roomId = r.id
      root.add(th)
    }
    root.add(hall)
  }

  return root
}
