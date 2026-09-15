// 사람 — 인물마다 따로 그린 **걷는 스프라이트 시트**로 세운다(2026-09-15).
//
// 네 번째 판이다. ① 원기둥·구 골격(character.js) → ② 품계별 그림 넉 장 빌보드(sprite-person.js)
// → ③ 품계별 3D 메시 여섯 벌(glb-person.js) → ④ 여기.
//
// 선생님 요청: 「게임 디자인이 너무 단순하다 — 힉스필드로 필요한 스프라이트 시트를 모두 만들어 적용」.
// ③ 은 몸 여섯 벌을 23명이 돌려 써서 흥선대원군과 최익현과 김옥균이 같은 얼굴이었다.
// 지금은 인물마다 기준 그림(앞·비스듬·옆·뒤)을 그리고(gpt_image_2_5), 그 그림으로 Seedance 2.0 이
// 제자리걸음 영상을 만들고, tools/sprite-sheet.py 가 그 영상을 시트로 자른다(assets/sprites/README.md).
//
// 시트: 행 = 방향(front · three_q · side · back — 비스듬·옆은 화면 오른쪽을 본다),
//       열 0 = 서 있는 자세, 열 1..FRAMES = 한 걸음 주기.
// ② 에서 선생님이 지적한 「작고 납작하다」를 되풀이하지 않도록 키는 ③ 과 같게 두고
// (성인 2.89 · 아이 2.35), 그림은 조명까지 그려진 3D 렌더라 두께가 읽힌다.
//
// 계약은 앞의 판들과 같다: buildPerson / disposePerson / updateSway / RANK_SPECS / modelsReady.
import { SPRITES, SPRITE_CELL, SPRITE_FRAMES, SPRITE_VIEWS } from './sprites-data.js'
import { viewForRelYaw, billboardAngles, wrapAngle } from './facing.js'

const HEIGHT = { child: 2.35, adult: 2.89 }
const FOOT_DROP = 1.8          // pivot 원점에서 발끝까지 (아래로)
const COLS = SPRITE_FRAMES + 1

// 걸음 한 주기(밀리초). 영상마다 주기가 1~2초로 제각각이라(sprite-sheet.py 가 찾은 주기에서
// 여덟 칸을 고르게 뽑아 두었다) 게임 걸음 빠르기에 맞춰 하나로 돈다. 달릴 때는 더 빨리.
export const WALK_CYCLE_MS = 1050
export const RUN_CYCLE_MS = 640

// 품계 → 따로 그린 인물이 없을 때 쓸 그림. 인물 id 가 SPRITES 에 있으면 그것이 먼저다.
export const RANK_SPECS = {
  king:      { model: 'king' },
  regent:    { model: 'regent', sprite: 'heungseon' },
  senior:    { model: 'senior', sprite: 'seungji' },
  mid:       { model: 'mid', sprite: 'sujeong' },
  messenger: { model: 'messenger', sprite: 'pabal' },
  mother:    { model: 'mother', sprite: 'mother' },
}

export function spriteKey(spec = {}) {
  if (spec.id && SPRITES[spec.id]) return spec.id
  if (spec.model === 'king') {
    if (spec.ageStage === 'child') return spec.attire === 'commoner' && SPRITES.king_child_commoner ? 'king_child_commoner' : 'king_child'
    return 'king_adult'
  }
  const s = spec.sprite ?? RANK_SPECS[spec.model]?.sprite
  return s && SPRITES[s] ? s : Object.keys(SPRITES)[0]
}

// ── 텍스처: 인물마다 하나, 모두가 함께 쓴다 ─────────────────────────────────
const shared = new Map()     // key -> { texture, material, loaded, waiting:Set }
function ensure(THREE, key) {
  if (shared.has(key)) return shared.get(key)
  const entry = { texture: null, material: null, loaded: false, waiting: new Set(), promise: null }
  let done
  entry.promise = new Promise(r => { done = r })
  const texture = new THREE.TextureLoader().load(SPRITES[key].uri, () => {
    entry.loaded = true
    for (const m of entry.waiting) m.visible = true
    entry.waiting.clear()
    done()
  }, undefined, () => done())
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 4
  entry.texture = texture
  // 장면의 빛을 받는다 — 빛을 안 받게 두었더니 밤 장면(갑신정변)에서 인물만 낮처럼 환하게 떠 보였다.
  // 판은 늘 카메라를 마주 보므로 음영 없이 밝기만 장면을 따른다. 그림의 명암은 그대로 남는다.
  // alphaTest 로 깊이를 써서 인물끼리 앞뒤가 뒤집히지 않는다(시트의 알파는 0/255 로 잘라 두었다).
  entry.material = new THREE.MeshLambertMaterial({
    map: texture, transparent: false, alphaTest: 0.5, depthWrite: true, fog: true, side: THREE.DoubleSide,
    // 스스로 조금 빛나게 — 밤에 흑단령(검은 관복)이 배경에 묻혀 누구인지 안 보이지 않게.
    emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.22,
  })
  shared.set(key, entry)
  return entry
}

// 모든 인물 그림을 미리 풀어 둔다. 약속은 전부 풀리면 이행된다.
export function modelsReady(THREE) {
  return Promise.all(Object.keys(SPRITES).map(k => ensure(THREE, k).promise))
}

function frameUV(col, row, mirror) {
  let u0 = col / COLS, u1 = (col + 1) / COLS
  if (mirror) [u0, u1] = [u1, u0]
  const rows = SPRITE_VIEWS.length
  const v1 = 1 - row / rows, v0 = 1 - (row + 1) / rows
  return [u0, v1, u1, v1, u0, v0, u1, v0]
}

function buildShadow(THREE, figureH) {
  const g = new THREE.Group()
  const r = figureH * 0.16
  for (const [radius, opacity, y] of [[r, 0.05, 0], [r * 0.6, 0.09, 0.01]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 18),
      new THREE.MeshBasicMaterial({ color: 0x0a0c0e, transparent: true, opacity, depthWrite: false }))
    m.rotation.x = -Math.PI / 2
    m.scale.z = 0.72
    m.position.y = y
    m.userData.noOcclude = true
    m.userData.disposable = true
    g.add(m)
  }
  return g
}

/**
 * spec: { id?, model?, sprite?, ageStage?, height?, attire? }
 * 반환 { pivot, mesh, topY }
 */
export function buildPerson(THREE, spec = {}) {
  const key = spriteKey(spec)
  const stage = spec.ageStage === 'child' ? 'child' : 'adult'
  const figureH = Number.isFinite(spec.height) ? spec.height : HEIGHT[stage]
  const { h: ch, w: cw, pad } = SPRITE_CELL
  const planeH = figureH * ch / (ch - 2 * pad)
  const planeW = planeH * cw / ch
  const below = pad / ch * planeH

  const entry = ensure(THREE, key)
  const geo = new THREE.PlaneGeometry(planeW, planeH)
  geo.translate(0, planeH / 2 - below, 0)          // 발끝이 원점
  const mesh = new THREE.Mesh(geo, entry.material)
  mesh.userData.disposableGeometry = geo
  if (!entry.loaded) { mesh.visible = false; entry.waiting.add(mesh) }

  const feet = new THREE.Group()
  feet.position.y = -FOOT_DROP
  feet.add(mesh)
  const pivot = new THREE.Group()
  pivot.add(feet)
  const shadow = buildShadow(THREE, figureH)
  shadow.position.y = -FOOT_DROP + 0.12
  pivot.add(shadow)

  pivot.userData.sprite = { key, feet, mesh, geo, entry, col: -1, row: -1, mirror: null, t: 0 }
  setFrame(pivot.userData.sprite, 0, 0, false)
  return { pivot, mesh: feet, topY: -FOOT_DROP + figureH }
}

function setFrame(s, col, row, mirror) {
  if (s.col === col && s.row === row && s.mirror === mirror) return
  s.geo.attributes.uv.array.set(frameUV(col, row, mirror))
  s.geo.attributes.uv.needsUpdate = true
  s.col = col; s.row = row; s.mirror = mirror
}

// 재질·텍스처는 인물끼리 함께 쓴다 — 버리지 않는다(glb-person.js 의 검은 화면 사고를 되풀이하지 않는다).
export function disposePerson(pivot) {
  const s = pivot.userData?.sprite
  if (s) {
    s.entry.waiting.delete(s.mesh)
    s.geo.dispose()
  }
  pivot.traverse(o => { if (o.userData?.disposable) { o.geometry?.dispose(); o.material?.dispose() } })
  pivot.parent?.remove(pivot)
}

function ancestorYaw(obj) {
  let y = 0
  for (let p = obj.parent; p; p = p.parent) y += p.rotation.y
  return y
}

// 걸음 열(1..FRAMES)을 시간으로 고른다. 순수 함수 — 검사가 쓴다.
export function walkColumn(tMs, running = false) {
  const cycle = running ? RUN_CYCLE_MS : WALK_CYCLE_MS
  const f = ((tMs % cycle) + cycle) % cycle / cycle
  return 1 + Math.min(SPRITE_FRAMES - 1, Math.floor(f * SPRITE_FRAMES))
}

let worldPos = null

/**
 * 매 프레임 부른다.
 *   walking / running  걷는 칸을 돌릴지, 얼마나 빠르게
 *   camera             판이 카메라를 마주 보고, 각도에 맞는 방향 행을 고른다
 */
export function updateSway(pivot, dtMs, { walking = false, running = false, camera = null } = {}) {
  const s = pivot.userData?.sprite
  if (!s) return
  let col = 0
  if (walking) {
    s.t += dtMs
    col = walkColumn(s.t, running)
  } else {
    s.t = 0
  }
  // 서 있을 때의 숨 — 발은 바닥에 붙어 있어야 하므로 세로로만 아주 작게.
  const phase = ((pivot.userData.swayPhase ?? 0) + dtMs * 0.0022) % (Math.PI * 2)
  pivot.userData.swayPhase = phase
  s.mesh.scale.y = walking ? 1 : 1 + Math.sin(phase) * 0.006

  let row = s.row < 0 ? 0 : s.row, mirror = s.mirror ?? false
  if (camera) {
    if (!worldPos) worldPos = new camera.position.constructor()
    pivot.getWorldPosition(worldPos)
    const { yaw, pitch } = billboardAngles(camera.position, { x: worldPos.x, y: worldPos.y - FOOT_DROP, z: worldPos.z })
    const facing = ancestorYaw(pivot)
    pivot.rotation.y = yaw - facing
    // 끝까지 눕히면 가까운 카메라에서 인물이 누워 보인다 — 절반만 눕힌다.
    s.feet.rotation.x = pitch * 0.5
    const v = viewForRelYaw(wrapAngle(yaw - facing))
    row = Math.max(0, SPRITE_VIEWS.indexOf(v.view))
    mirror = v.mirror
  }
  setFrame(s, col, row, mirror)
}
