// 임금이 화면에서 사라지는 사고를 잡는 시험 — 2단계 실사 점검에서 걸린 바로 그
// 문제다. 예전에 적어 둔 규칙(「방 폭의 72% 바깥이면 안전하다」)은 틀렸다: 실제로
// 가리는 것은 벽이 아니라 처마(지붕)였고, 처마 반지름(max(w,d)*0.78)이 벽 반폭보다
// 넓을 때가 흔해서 그 규칙을 따라도 처마 밑에 남는 자리가 있었다. render/occlusion.js
// 는 좌표를 피하는 대신 카메라 쪽에서 고친다 — 가리는 지오메트리를 찾아 안 보이게
// 한다. 이 시험은 진짜 buildPalace() 지오메트리에 진짜 카메라 공식(scene.js 의
// CAM_DIST·CAM_HEIGHT)으로 광선을 쏴, 그 알고리즘을 적용한 뒤에도 임금(발·허리·머리)
// 이 가려지는 자리가 있는지 확인한다 — WebGL 은 필요 없다(광선 계산은 순수 수학이다).
// document.createElement/getContext 만 흉내 낸다: render/textures.js 가 텍스처를
// 캔버스에 그리려고 부르지만, 그림 자체는 이 시험과 상관없다.
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'

function stubCanvas() {
  // 실제 그리기 코드가 쓰는 것을 다 갖춰야 한다 — 하나라도 빠지면 시험이
  // 「g.fill is not a function」으로 무너진다(어좌의 일월오봉도를 그리며 실제로 났다).
  // 그림 자체는 이 시험과 상관없으므로 전부 빈 함수다.
  const ctx = {
    fillRect() {}, strokeRect() {}, clearRect() {}, fillText() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, arc() {}, rect() {}, ellipse() {},
    fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    createLinearGradient() { return { addColorStop() {} } },
    createRadialGradient() { return { addColorStop() {} } },
  }
  return { width: 0, height: 0, getContext: () => ctx }
}
// palace.js/textures.js 는 이 함수들이 실제로 불릴 때만 document 를 찾는다(모듈을
// 불러오는 시점이 아니다) — 그래서 아래 import 들보다 늦게 이 줄이 실행돼도 안전하다.
global.document = { createElement: (tag) => {
  if (tag === 'canvas') return stubCanvas()
  throw new Error(`시험이 흉내 내지 않은 태그: ${tag}`)
} }

const { makeTextures, buildPalace } = await import('../../src/render/palace.js')
const { PALACES, baseOf } = await import('../../src/data/palaces.js')
const { NPCS } = await import('../../src/data/npcs.js')
const { findOccluders, CHAR_HEIGHTS, isOccludable, updatePalaceOcclusion } = await import('../../src/render/occlusion.js')

// scene.js 의 실제 카메라 — **가져다 쓴다.** 예전에는 여기 34·30 을 손으로 적어
// 두었는데, scene.js 가 14·11 로 바뀐 뒤에도 시험은 옛 값으로 가림을 재고 있었다.
const { CAM_DIST, CAM_HEIGHT } = await import('../../src/render/scene.js')

function camFor(x, z) {
  return new THREE.Vector3(x, CAM_HEIGHT, z + CAM_DIST)
}

// 카메라에서 (x,h,z) 로 가는 광선이 지금 「보이는」(visible !== false) 지오메트리에
// 걸리는지 본다. 지면(PlaneGeometry)은 가리는 것으로 치지 않는다 — occlusion.js 의
// findOccluders() 와 같은 이유(발 높이가 지면에 바짝 붙어 얕은 각도에서 수치상으로만
// 스친다)다. three.js Raycaster 는 .visible 을 스스로 걸러내지 않으므로(렌더링에만
// 쓰는 플래그다) 여기서 직접 거른다 — occlusion.js 가 안 보이게 만든 지오메트리는
// 실제 화면에도 안 그려지므로, 이 필터가 "화면에 보이는가" 를 정확히 재현한다.
function raycastVisibleHits(group, camPos, x, z) {
  const raycaster = new THREE.Raycaster()
  const blocking = []
  for (const h of CHAR_HEIGHTS) {
    const target = new THREE.Vector3(x, h, z)
    const dir = target.clone().sub(camPos)
    const dist = dir.length()
    if (dist < 1e-6) continue
    dir.normalize()
    raycaster.set(camPos, dir)
    raycaster.near = 0
    raycaster.far = Math.max(dist - 0.05, 0)
    const hits = raycaster.intersectObjects(group.children, true)
      // 「무엇이 가릴 수 있는가」를 여기서 다시 적지 않고 occlusion.js 의 판정을
      // **그대로 가져다 쓴다.** 예전에는 PlaneGeometry 만 빼는 규칙을 베껴 두었는데,
      // 실제 코드가 마루·기단을 함께 빼도록 바뀌자 시험만 옛 규칙으로 재며 38건이
      // 거짓으로 울었다. 규칙이 두 벌이면 반드시 어긋난다.
      .filter(hit => isOccludable(hit.object) && hit.object.visible !== false)
    if (hits.length) blocking.push({ height: h, types: hits.map(hh => hh.object.geometry?.type).join('/') })
  }
  return blocking
}

// palaceGroup 하나에 대해 (x,z) 자리에 임금이 서 있다고 보고 판정한다: occlusion.js
// 의 실제 알고리즘(findOccluders)으로 가리는 지오메트리를 찾아 안 보이게 한 다음,
// 그래도 걸리는 게 남아 있는지 다시 잰다. 매 검사 전에 지난 검사가 안 보이게 만든
// 것들을 되돌린다 — 자리마다 독립적으로 판정해야 한다(한 자리에서 지붕을 껐다고
// 다음 자리 판정에 영향을 주면 안 된다).
function assertKingVisible(group, label, x, z) {
  group.traverse(o => { o.visible = true })
  const cam = camFor(x, z)
  const occluders = findOccluders(THREE, group, cam, x, z)
  for (const obj of occluders) obj.visible = false
  const blocking = raycastVisibleHits(group, cam, x, z)
  const detail = blocking.map(b => `${b.height.toFixed(2)}m:${b.types}`).join(', ')
  expect(blocking.length, `${label} (${x},${z}) 에서 임금이 가려진다 — ${detail}`).toBe(0)
}

function buildGroup(def) {
  const tex = makeTextures(THREE)
  const group = buildPalace(THREE, tex, def)
  group.updateMatrixWorld(true)
  return group
}

describe('임금은 어느 궁·어느 자리에서도 카메라에 가려지지 않는다', () => {
  it('앞을 가리는 문루는 부재 전체를 숨기고 시점을 돌리면 되돌린다', () => {
    const group=buildGroup(PALACES.changdeok)
    const gate=group.children.find(o=>o.userData.roomId==='donhwamun' && o.userData.occlusionShell)
    const pieces=[];gate.traverse(o=>{if(o.geometry && !o.userData.noOcclude)pieces.push(o)})
    const faded=updatePalaceOcclusion(THREE,group,new THREE.Vector3(0,CAM_HEIGHT,45),0,29,new Set())
    expect(pieces.every(o=>o.visible===false)).toBe(true)
    updatePalaceOcclusion(THREE,group,new THREE.Vector3(0,CAM_HEIGHT,13),0,29,faded)
    expect(pieces.every(o=>o.visible===true)).toBe(true)
  })
  for (const [palaceId, def] of Object.entries(PALACES)) {
    const base = baseOf(palaceId)
    const group = buildGroup(def)

    it(`${palaceId} · 스폰`, () => {
      assertKingVisible(group, `${palaceId} 스폰`, def.spawn.x, def.spawn.z)
    })

    for (const p of def.pickups ?? []) {
      it(`${palaceId} · 사료 지점 ${p.cardId}`, () => {
        assertKingVisible(group, `${palaceId} 문서(${p.cardId})`, p.x, p.z)
      })
    }

    for (const n of NPCS.filter(n => n.palace === base)) {
      it(`${palaceId} · 신하 ${n.id}`, () => {
        assertKingVisible(group, `${palaceId} 신하(${n.id})`, n.x, n.z)
      })
    }

    for (const r of def.rooms) {
      const tag = r.id === def.councilRoom ? ' [어전회의]' : ''
      it(`${palaceId} · 방 ${r.id}${tag}`, () => {
        assertKingVisible(group, `${palaceId} 방(${r.id})${tag}`, r.x, r.z)
      })
    }
  }
})
