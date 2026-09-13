// 사람 — 그림으로 세운다.
//
// 예전(render/character.js)에는 원기둥과 구를 쌓아 사람 모양을 흉내 냈다. 팔도
// 얼굴도 다리도 없었고, 무엇보다 **임금의 익선관과 신하의 사모가 구별되지 않았다.**
// 이 게임에서 화면이 학생에게 전해야 할 가장 중요한 정보 하나가 거기 없었다.
//
// 지금은 인물마다 앞·비스듬·옆·뒤 넉 장을 미리 그려 둔 아틀라스(atlas-data.js)에서
// 뽑아 판 하나에 입힌다. 판은 카메라를 마주 보고 서고(빌보드), 어느 그림을 쓸지는
// 인물이 바라보는 쪽과 카메라가 있는 쪽의 각도가 정한다(facing.js).
//
// 그림 파일을 따로 두지 않는다 — 아틀라스는 base64 로 소스 안에 들어 있어
// 「외부 요청 0건」이 그대로 지켜진다.
//
// 계약은 render/character.js 와 같다: buildPerson / disposePerson / updateSway /
// RANK_SPECS. 다른 점은 updateSway 가 camera 를 받는다는 것뿐이다.
import { CELL, ATLAS, FRAMES, ATLAS_URI } from './atlas-data.js'
import { viewForRelYaw, uvForFrame, billboardAngles, wrapAngle } from './facing.js'

// 인물이 세계에서 차지하는 키. 예전 골격이 쓰던 값을 그대로 이었다
// (성인 2.89, 아이 2.35 — 발끝은 pivot 아래 1.8 에 있다). 이 값을 바꾸면
// 궁궐·문·기둥과의 비례가 함께 틀어진다.
const HEIGHT = { child: 2.35, adult: 2.89 }
const FOOT_DROP = 1.8          // pivot 원점에서 발끝까지 (아래로)

// 품계 — 어느 줄의 그림을 쓰는가. 예전 RANK_SPECS 의 색·관 지정을 대신한다.
// 그림 자체가 이미 홍색 곤룡포·쌍학흉배·사모를 담고 있다.
export const RANK_SPECS = {
  king:      { sprite: 'king' },        // ageStage 에 따라 king_child / king_adult
  regent:    { sprite: 'regent' },
  senior:    { sprite: 'senior' },
  mid:       { sprite: 'mid' },
  messenger: { sprite: 'messenger' },
}

let sharedTexture = null
let sharedMaterial = null

// 아틀라스는 base64 라도 브라우저가 그림을 푸는 동안은 아직 없다. 그 사이에
// 그리면 텍스처가 없는 판이 흰 사각형으로 한두 프레임 번쩍인다 — 게임이 열리는
// 첫 순간이라 학생 눈에 그대로 띈다. 다 풀릴 때까지 판을 숨겨 둔다.
let atlasLoaded = false
const pending = new Set()
let readyResolve = null
const readyPromise = new Promise(res => { readyResolve = res })

// 아틀라스가 다 풀리면 이행되는 약속. 검사와 미리보기가 쓴다.
// THREE 를 주면 아직 아무도 인물을 짓지 않았어도 여기서 내려받기를 시작한다 —
// 안 그러면 첫 buildPerson 이 불릴 때까지 영영 안 풀린다.
export function atlasReady(THREE = null) {
  if (THREE) ensureShared(THREE)
  return readyPromise
}

function ensureShared(THREE) {
  if (sharedMaterial) return sharedMaterial
  sharedTexture = new THREE.TextureLoader().load(ATLAS_URI, () => {
    atlasLoaded = true
    for (const m of pending) m.visible = true
    pending.clear()
    readyResolve()
  })
  sharedTexture.colorSpace = THREE.SRGBColorSpace
  // 카메라가 늘 같은 거리에 있어 인물이 화면에서 약 4분의 1로 줄어든다.
  // 밉맵 없이는 계단이 심하게 인다. 칸마다 빈 띠(CELL.pad)를 둬서
  // 밉맵이 이웃 칸을 섞어도 번지지 않게 해 두었다.
  sharedTexture.generateMipmaps = true
  sharedTexture.minFilter = THREE.LinearMipmapLinearFilter
  sharedTexture.magFilter = THREE.LinearFilter
  sharedTexture.anisotropy = 4

  // 빛을 받지 않는다 — 그림 자체가 이미 조명까지 그려진 것이라
  // 여기서 다시 비추면 두 번 밝아진다. 안개는 받는다(먼 곳이 흐려진다).
  // alphaTest 로 깊이를 쓰게 해서 인물끼리 앞뒤가 뒤집히지 않게 한다.
  sharedMaterial = new THREE.MeshBasicMaterial({
    map: sharedTexture,
    transparent: true,
    alphaTest: 0.35,
    depthWrite: true,
    fog: true,
    side: THREE.DoubleSide,
  })
  return sharedMaterial
}

// 검사용 — 텍스처를 붙들고 있는 전역을 비운다.
export function _resetShared() {
  sharedTexture?.dispose()
  sharedMaterial?.dispose()
  sharedTexture = sharedMaterial = null
  pending.clear()
  atlasLoaded = false
}

function spriteRow(spec) {
  const base = spec.sprite ?? 'mid'
  return base === 'king' ? `king_${spec.ageStage === 'child' ? 'child' : 'adult'}` : base
}

/**
 * spec:
 *   sprite    'king' | 'regent' | 'senior' | 'mid' | 'messenger'
 *   ageStage  'child' | 'adult' (기본 'adult') — king 에서만 그림이 갈린다
 *
 * 반환 { pivot, mesh, topY } — render/character.js 와 같은 모양이다.
 * pivot 은 바깥이 위치를 정하는 자리, 그 안의 feet 그룹이 발끝에서 판을 눕힌다.
 */
export function buildPerson(THREE, spec = {}) {
  const row = spriteRow(spec)
  const stage = spec.ageStage === 'child' ? 'child' : 'adult'
  const figureH = HEIGHT[stage]

  // 그림은 칸 안에서 빈 띠(pad)만큼 띄워져 있다. 판을 그만큼 크게 만들고
  // 아래로 내려서, 그림 속 발끝이 정확히 발 자리에 오게 한다.
  const planeH = (figureH * CELL.h) / (CELL.h - 2 * CELL.pad)
  const planeW = (planeH * CELL.w) / CELL.h
  const below = (CELL.pad / CELL.h) * planeH      // 발끝 아래로 남는 빈 띠

  const geo = new THREE.PlaneGeometry(planeW, planeH)
  geo.translate(0, planeH / 2 - below, 0)         // 아래 모서리가 아니라 **발끝**이 원점
  const mesh = new THREE.Mesh(geo, ensureShared(THREE))
  mesh.userData.disposable = { geometry: geo }    // 재질·텍스처는 모두가 함께 쓴다 — 여기서 버리지 않는다
  if (!atlasLoaded) { mesh.visible = false; pending.add(mesh) }

  const feet = new THREE.Group()
  feet.position.y = -FOOT_DROP
  feet.add(mesh)

  const pivot = new THREE.Group()
  pivot.add(feet)
  pivot.userData.sprite = { row, feet, mesh, geo, view: null, mirror: null }
  applyView(pivot, 'front', false)

  return { pivot, mesh, topY: -FOOT_DROP + figureH }
}

function applyView(pivot, view, mirror) {
  const s = pivot.userData.sprite
  if (s.view === view && s.mirror === mirror) return
  const frame = FRAMES[`${s.row}.${view}`]
  if (!frame) return
  s.geo.attributes.uv.array.set(uvForFrame(frame, ATLAS.w, ATLAS.h, mirror))
  s.geo.attributes.uv.needsUpdate = true
  s.view = view
  s.mirror = mirror
}

export function disposePerson(pivot) {
  pivot.traverse(obj => {
    if (obj.userData?.disposable) {
      pending.delete(obj)          // 아직 안 뜬 판을 버리면 목록에서도 뺀다
      obj.userData.disposable.geometry.dispose()
    }
  })
}

// pivot 이 실제로 향하고 있는 방향 — 조상들이 Y 로 돌린 각의 합이다.
// 임금은 kingFacing 안에 들어 있고(걷는 방향으로 돈다), 신하는 돌지 않는 anchor 안에 있다.
function ancestorYaw(obj) {
  let y = 0
  for (let p = obj.parent; p; p = p.parent) y += p.rotation.y
  return y
}

// 매 프레임 새 벡터를 만들지 않는다 — 인물 여럿이 이 하나를 돌려 쓴다.
let worldPos = null

/**
 * 매 프레임 부른다.
 *   walking  걷는 중이면 흔들림이 커진다
 *   camera   주면 판이 카메라를 마주 보고, 각도에 맞는 그림으로 갈아탄다.
 *            안 주면 예전처럼 흔들리기만 한다(검사에서 쓴다).
 */
export function updateSway(pivot, dtMs, { walking = false, camera = null } = {}) {
  const s = pivot.userData.sprite
  if (!s) return

  // 흔들림 — 발은 바닥에 붙어 있어야 하므로 위아래로 옮기지 않고 세로로만 늘였다 줄인다.
  const speed = walking ? 0.012 : 0.003
  const amp = walking ? 0.020 : 0.007
  const phase = ((pivot.userData.swayPhase ?? 0) + dtMs * speed) % (Math.PI * 2)
  pivot.userData.swayPhase = phase
  s.mesh.scale.y = 1 + Math.sin(phase) * amp

  if (!camera) return

  if (!worldPos) worldPos = new camera.position.constructor()
  pivot.getWorldPosition(worldPos)
  const { yaw, pitch } = billboardAngles(camera.position, {
    x: worldPos.x, y: worldPos.y - FOOT_DROP, z: worldPos.z,
  })
  const facing = ancestorYaw(pivot)
  pivot.rotation.y = yaw - facing        // 판은 카메라를 마주 본다 (조상의 회전을 되돌린다)
  s.feet.rotation.x = pitch              // 발끝을 축으로 뒤로 눕는다 — 그림이 눌리지 않는다

  const { view, mirror } = viewForRelYaw(wrapAngle(yaw - facing))
  applyView(pivot, view, mirror)
}
