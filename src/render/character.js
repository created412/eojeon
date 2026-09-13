// 사람 — 고종과 신하를 그리는 자리. 이 프로젝트가 이미 쓰는 기법을 그대로 쓴다
// (render/textures.js): 이미지 파일 없이, 런타임에 캔버스에 그려 텍스처로 올린다.
// 몸은 원기둥·구 같은 단순 도형을 쌓아 만들고(캡슐 하나였던 예전 「왕」을 대신한다),
// 흉배(가슴에 붙는 수)만 캔버스에 그린 무늬를 입힌다. 인물 하나가 지오메트리
// 여럿을 쓰지만 mergeGeometries 로 하나의 BufferGeometry·머티리얼로 합쳐 드로우콜을
// 인물당 하나로 묶는다 — 궁 여럿에 신하가 늘어도 예산(100)을 넘지 않게 하는 자리다.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const WHITE_UV = 0.02   // 캔버스 왼쪽 위 귀퉁이 — 흉배를 그리지 않는 자리, 항상 흰색이다

function surface(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return { c, g: c.getContext('2d') }
}

// 흉배(胸背) — 관복 가슴/등에 붙이는 수. 실제 문양(용·학·호랑이)을 사실적으로
// 그리는 대신, 이 게임이 단청(render/textures.js dancheong())에서부터 써 온
// 같은 추상화 수준(테를 두른 동심원 + 중심 점)으로 그린다. 캔버스 왼쪽 위
// 귀퉁이는 흰 바탕 그대로 남겨 둔다 — 몸통·머리·모자는 이 자리를 읽어
// 무늬 없는 제 색(버텍스 컬러)만 낸다.
function emblemTexture(THREE, { ring, fill, accent }) {
  const size = 48
  const { c, g } = surface(size)
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, size, size)
  const cx = size * 0.62, cy = size * 0.62   // 중앙을 오른쪽 아래로 살짝 치우치게 —
  // 왼쪽 위 귀퉁이(WHITE_UV 자리)를 확실히 흰 채로 비워 둔다
  g.fillStyle = ring
  g.beginPath(); g.arc(cx, cy, size * 0.34, 0, Math.PI * 2); g.fill()
  g.fillStyle = fill
  g.beginPath(); g.arc(cx, cy, size * 0.26, 0, Math.PI * 2); g.fill()
  g.strokeStyle = accent
  g.lineWidth = size * 0.03
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + Math.PI / 8
    g.beginPath()
    g.moveTo(cx + Math.cos(a) * size * 0.10, cy + Math.sin(a) * size * 0.10)
    g.lineTo(cx + Math.cos(a) * size * 0.22, cy + Math.sin(a) * size * 0.22)
    g.stroke()
  }
  g.fillStyle = accent
  g.beginPath(); g.arc(cx, cy, size * 0.06, 0, Math.PI * 2); g.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function paintColor(THREE, geo, hex) {
  const col = new THREE.Color(hex)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
}

function flattenUV(THREE, geo) {
  const n = geo.attributes.uv.count
  const arr = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) { arr[i * 2] = WHITE_UV; arr[i * 2 + 1] = WHITE_UV }
  geo.setAttribute('uv', new THREE.BufferAttribute(arr, 2))
}

// 품계별 겉모습 — 관복 색·깃 색·관 모양·흉배. 실제로 흉배는 문관·무관 당상관
// 이상만 달았다. king 은 유일하게 익선관(ikseongwan)을 쓴다.
//   king    — 임금.
//   senior  — 당상관(정3품 상 이상). 이 게임에서는 최익현(호조참판을 지낸 당상관)과
//             승정원 승지(6승지는 모두 정3품 당상관— 공교롭게도 최익현 자신도 1873년
//             그 상소 당시 동부승지였다)에게 쓴다. → 흉배를 단다.
//   mid     — 당하관 이하의 실무 관리·중인(中人). 이 게임에서는 호조 관리·수정전
//             관원(둘 다 품계가 밝혀지지 않은 실무직)과 역관(통역관 — 중인 신분으로,
//             당상관 대우를 받는 「당상역관」이 따로 있었을 뿐 이 게임의 역관은 그런
//             특임이라는 근거가 없다)에게 쓴다. → 당상관이 아니므로 흉배를 달지 않는다.
//   messenger — 군교·파발 같은 전령. → 흉배를 달지 않는다.
// regent(흥선대원군)는 이 사다리에 안 맞는 예외다 — 대원군은 품계를 받는 문무관이
// 아니라 왕족 신분이라 「당상관 이상만」이라는 규칙이 그대로 적용되는지 이 프로젝트가
// 확인하지 못했다(왕실 예복에 흉배와 비슷한 흉배형 장식이 쓰인 사례는 있으나, 이
// 게임이 그리는 것이 그 격식인지는 근거가 없다) — 그래서 흉배를 그대로 두되, 이 사실을
// 여기 적어 둔다(재제작 지시 §3-3 원칙 — 모르면 지어내지 않고 남긴다).
export const RANK_SPECS = {
  king:      { robeColor: '#7a1f1a', collarColor: '#d4af37', hatStyle: 'ikseongwan', emblem: { ring: '#d4af37', fill: '#7a1f1a', accent: '#f4e2b0' } },
  regent:    { robeColor: '#2c2650', collarColor: '#b8932f', hatStyle: 'samo', emblem: { ring: '#b8932f', fill: '#2c2650', accent: '#e8dfc0' } },
  senior:    { robeColor: '#6e2b2b', collarColor: '#cfc7b4', hatStyle: 'samo', emblem: { ring: '#cfc7b4', fill: '#6e2b2b', accent: '#e8e2d4' } },
  mid:       { robeColor: '#274863', collarColor: '#9fae9a', hatStyle: 'samo', emblem: null },
  messenger: { robeColor: '#454f42', collarColor: '#6b6558', hatStyle: 'samo', emblem: null },
}

// 나이 단계별 몸 비례 — 1막(12살)은 머리가 크고 키가 작다, 2·3막은 성인 비례.
const AGE = {
  child: { robeH: 1.05, robeTopR: 0.42, robeBotR: 0.58, headR: 0.36, hatR: 0.24 },
  adult: { robeH: 1.55, robeTopR: 0.48, robeBotR: 0.68, headR: 0.30, hatR: 0.27 },
}

// hatStyle — 'ikseongwan'(익선관, 임금 전용: 날개가 위로 둥글게 솟는다) |
// 'samo'(사모, 신하: 날개가 옆으로 수평하게 뻗는다). 두 관 모두 검은 사(紗) 재질을
// 뭉뚱그려 검정으로 단순화한다 — 이 게임의 다른 3D 자산(지붕·기둥)과 같은 단순화 수준이다.
function buildHat(THREE, geos, { style, hatR, y, hatColor }) {
  const dome = new THREE.SphereGeometry(hatR, 8, 6, 0, Math.PI * 2, 0, Math.PI / 1.7)
  dome.translate(0, y, 0)
  paintColor(THREE, dome, hatColor)
  flattenUV(THREE, dome)
  geos.push(dome)

  const wingGeo = () => new THREE.BoxGeometry(hatR * 1.5, hatR * 0.12, hatR * 0.55)
  const wingL = wingGeo()
  const wingR = wingGeo()
  if (style === 'ikseongwan') {
    // 익선관 — 두 날개가 뒤에서 위로 둥글게 솟는다
    wingL.translate(-hatR * 0.55, y + hatR * 0.35, -hatR * 0.5)
    wingR.translate(hatR * 0.55, y + hatR * 0.35, -hatR * 0.5)
    wingL.rotateZ(0.5); wingR.rotateZ(-0.5)
  } else {
    // 사모 — 두 날개가 옆으로 수평하게 뻗는다
    wingL.translate(-hatR * 1.15, y, -hatR * 0.1)
    wingR.translate(hatR * 1.15, y, -hatR * 0.1)
  }
  paintColor(THREE, wingL, hatColor); paintColor(THREE, wingR, hatColor)
  flattenUV(THREE, wingL); flattenUV(THREE, wingR)
  geos.push(wingL, wingR)
}

// 인물 하나를 만든다. 반환하는 group 은 지오메트리 하나(드로우콜 하나)로 합쳐진
// Mesh 를 담는다. spec:
//   ageStage  'child' | 'adult' (기본 'adult')
//   robeColor 관복 몸통 색 (품계별로 다르다)
//   collarColor 어깨/깃 띠 색
//   hatStyle  'ikseongwan' | 'samo'
//   hatColor  기본 검정
//   skinColor 얼굴색
//   emblem    { ring, fill, accent } | null — null 이면 흉배(품계 낮은 인물)를 생략한다
export function buildPerson(THREE, spec) {
  const age = AGE[spec.ageStage] ?? AGE.adult
  const hatColor = spec.hatColor ?? '#15181b'
  const skin = spec.skinColor ?? '#e0b98f'

  const geos = []

  // 로브 아랫단 — 발끝까지 오는 긴 옷이라 다리는 따로 그리지 않는다
  const robeBottomY = -1.8
  const lower = new THREE.CylinderGeometry(age.robeTopR, age.robeBotR, age.robeH, 10)
  lower.translate(0, robeBottomY + age.robeH / 2, 0)
  paintColor(THREE, lower, spec.robeColor)
  flattenUV(THREE, lower)
  geos.push(lower)

  // 어깨/깃 띠 — 로브 위, 목 아래
  const collarY = robeBottomY + age.robeH
  const collarH = age.robeH * 0.22
  const collar = new THREE.CylinderGeometry(age.robeTopR * 0.72, age.robeTopR, collarH, 10)
  collar.translate(0, collarY + collarH / 2, 0)
  paintColor(THREE, collar, spec.collarColor)
  flattenUV(THREE, collar)
  geos.push(collar)

  // 머리
  const headY = collarY + collarH + age.headR * 0.9
  const head = new THREE.SphereGeometry(age.headR, 10, 8)
  head.translate(0, headY, 0)
  paintColor(THREE, head, skin)
  flattenUV(THREE, head)
  geos.push(head)

  // 관(冠)
  buildHat(THREE, geos, { style: spec.hatStyle ?? 'samo', hatR: age.hatR, y: headY + age.headR * 0.75, hatColor })

  // 흉배 — 캔버스에 그린 무늬를 입히는 유일한 조각. 로브 앞면(+Z)에 붙인다
  let emblemMap = null
  if (spec.emblem) {
    emblemMap = emblemTexture(THREE, spec.emblem)
    const badgeSize = age.robeTopR * 0.85
    const badge = new THREE.BoxGeometry(badgeSize, badgeSize, 0.04)
    badge.translate(0, collarY - age.robeH * 0.18, age.robeTopR * 0.98)
    paintColor(THREE, badge, '#ffffff')   // 텍스처가 곧 무늬다 — 버텍스 컬러는 흰색(1,1,1)으로 두어 곱을 그대로 낸다
    geos.push(badge)
  }

  const merged = mergeGeometries(geos, false)
  merged.computeVertexNormals()
  const material = new THREE.MeshLambertMaterial({ vertexColors: true })
  if (emblemMap) material.map = emblemMap
  const mesh = new THREE.Mesh(merged, material)
  mesh.userData.disposable = { geometry: merged, material, map: emblemMap }

  const pivot = new THREE.Group()
  pivot.add(mesh)
  return { pivot, mesh, topY: headY + age.headR + age.hatR * 1.6 }
}

export function disposePerson(pivot) {
  pivot.traverse(obj => {
    if (obj.userData?.disposable) {
      obj.userData.disposable.geometry.dispose()
      obj.userData.disposable.material.dispose()
      obj.userData.disposable.map?.dispose()
    }
  })
}

// 흔들림 — 걷지 않을 때는 숨쉬듯 작게, 걸을 때는 걸음마다 크게 위아래로 까딱인다.
// pivot.userData.swayPhase 에 위상만 누적한다 — 별도 상태 객체를 들고 다니지 않는다.
export function updateSway(pivot, dtMs, { walking = false } = {}) {
  const speed = walking ? 0.012 : 0.003
  const amp = walking ? 0.09 : 0.035
  const phase = ((pivot.userData.swayPhase ?? 0) + dtMs * speed) % (Math.PI * 2)
  pivot.userData.swayPhase = phase
  pivot.position.y = Math.abs(Math.sin(phase)) * amp
  pivot.rotation.z = Math.sin(phase * (walking ? 1 : 0.5)) * (walking ? 0.05 : 0.02)
}
