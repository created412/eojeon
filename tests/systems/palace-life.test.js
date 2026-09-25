import { describe, it, expect } from 'vitest'
import { NPCS, npcNear } from '../../src/data/npcs.js'
import { PALACES, roomAt } from '../../src/data/palaces.js'
import { collides } from '../../src/data/hall-geometry.js'
import {
  createPalaceLife, ANCHOR_BOUND, DRIFT_MAX,
  PAUSE_MS, WALK_MS, LEG_MS, BOW_NEAR, BOW_FAR, BOW_IN_MS, BOW_OUT_MS,
} from '../../src/systems/palace-life.js'

// 2026-09-25 — 「궁을 살아 있게 합니다」. 서성임이 **얼마나 작아야 하는가**를 붙드는
// 시험이다. npcNear() 는 데이터 좌표에서 거리를 재므로(아래 마지막 항목), 몸이
// 앵커에서 멀어지면 보이는 몸 앞에서 E 가 안 먹는다 — 이 시험이 그 선을 지킨다.

const bodiesIn = palace => NPCS.filter(n => n.palace === palace && !n.voice)

// 프레임을 돌린다. dt 는 순수 모듈이 인정하는 한 프레임(120ms) 안으로 둔다.
function run(life, { npcs, palace, king = { x: 400, z: 400 }, reducedMotion = false,
                     frames = 1, dt = 50, t0 = 0, each = null }) {
  let now = t0
  let last = []
  for (let i = 0; i < frames; i++) {
    now += dt
    last = life.tick({ npcs, palace, king, now, reducedMotion })
    each?.(last, now)
  }
  return { states: last, now }
}

describe('궁의 서성임', () => {
  for (const id of ['changdeok', 'gyeongbok', 'unhyeon', 'gyeongu']) {
    it(`${PALACES[id].name} — 서성여도 앵커에서 ${ANCHOR_BOUND}m 를 넘지 않고 제 방·담 안에 머문다`, () => {
      const palace = PALACES[id]
      const npcs = bodiesIn(id)
      expect(npcs.length).toBeGreaterThan(0)
      const anchorRoom = new Map(npcs.map(n => [n.id, roomAt(palace, n.x, n.z)]))
      const farthest = new Map(npcs.map(n => [n.id, 0]))
      const life = createPalaceLife()
      // 150초 — 마디(8초)가 열아홉 번 돈다. 한두 마디만 보면 우연히 통과한다.
      run(life, { npcs, palace, frames: 1500, dt: 100, each: states => {
        for (const s of states) {
          const n = npcs.find(m => m.id === s.id)
          const d = Math.hypot(s.x - n.x, s.z - n.z)
          farthest.set(s.id, Math.max(farthest.get(s.id), d))
          expect(d, `${s.id} 가 앵커에서 ${d.toFixed(2)}m`).toBeLessThanOrEqual(ANCHOR_BOUND)
          // 제 방을 벗어나지 않는다(마당에 선 사람은 마당에 머문다).
          expect(roomAt(palace, s.x, s.z), `${s.id} 가 방을 벗어났다`).toBe(anchorRoom.get(s.id))
          // 벽·기둥을 뚫지 않는다 — placeNpc 의 safePosition(.8) 과 같은 몸 반지름으로 본다.
          expect(collides(palace, { x: s.x, z: s.z }, 0.8), `${s.id} 가 벽에 겹쳤다`).toBeNull()
        }
      } })
      // 그리고 실제로 움직인다 — 붙박여 있으면 이 일을 한 뜻이 없다.
      const moved = [...farthest.values()].filter(d => d > 0.4)
      expect(moved.length).toBeGreaterThanOrEqual(Math.ceil(npcs.length / 2))
      expect(Math.max(...farthest.values())).toBeLessThanOrEqual(DRIFT_MAX + 1e-9)
    })
  }

  it('E 로 말을 거는 자리(npcNear)는 서성여도 그대로 잡힌다', () => {
    const palace = PALACES.changdeok
    const npcs = bodiesIn('changdeok')
    const life = createPalaceLife()
    run(life, { npcs, palace, frames: 900, dt: 100, each: states => {
      for (const s of states) {
        // 보이는 몸 앞에 선 학생이 그 사람을 잡는다 — 기본 반경 7m 에서 2m 는 넉넉히 안쪽이다.
        const found = npcNear(npcs, s.x, s.z)
        expect(found, `${s.id} 앞에 서도 아무도 안 잡힌다`).not.toBeNull()
      }
    } })
  })

  it('멈춤 → 걸음 → 멈춤 으로 시간에 따라 넘어간다', () => {
    const palace = PALACES.changdeok
    const npc = bodiesIn('changdeok').find(n => n.id === 'seungji')
    const life = createPalaceLife()
    const seen = []
    // 마디 다섯 번을 10ms 로 촘촘히 본다(delay 가 사람마다 최대 한 마디다).
    run(life, { npcs: [npc], palace, frames: (LEG_MS * 6) / 10, dt: 10, each: ([s]) => {
      if (seen.at(-1) !== s.walking) seen.push(s.walking)
    } })
    // 서 있다 걷고 다시 서기를 적어도 두 번 — 한 번만이면 「한 번 움직이고 끝」이다.
    expect(seen[0]).toBe(false)
    expect(seen.filter(w => w === true).length).toBeGreaterThanOrEqual(2)
    expect(seen.filter(w => w === false).length).toBeGreaterThanOrEqual(3)
    // 걷는 동안에는 가는 쪽을 보고(yaw 숫자), 서 있으면 임금을 본다(yaw null).
    const walkState = []
    const life2 = createPalaceLife()
    run(life2, { npcs: [npc], palace, frames: LEG_MS * 3 / 10, dt: 10,
      each: ([s]) => walkState.push(s) })
    for (const s of walkState) {
      if (s.walking) expect(typeof s.yaw).toBe('number')
      else expect(s.yaw).toBeNull()
    }
  })

  it('같은 신하는 언제나 같은 궁을 보여 준다 — 시험도 화면도 흔들리지 않게', () => {
    const palace = PALACES.gyeongbok
    const npcs = bodiesIn('gyeongbok')
    const a = createPalaceLife(), b = createPalaceLife()
    for (let i = 1; i <= 600; i++) {
      const sa = a.tick({ npcs, palace, now: i * 50, king: { x: 400, z: 400 } })
      const sb = b.tick({ npcs, palace, now: i * 50, king: { x: 400, z: 400 } })
      expect(sa).toEqual(sb)
    }
    // 프레임을 쪼개 밟아도 같은 시각에는 (거의) 같은 자리다 — 프레임 수가 아니라 시간으로 돈다.
    const coarse = createPalaceLife(), fine = createPalaceLife()
    let c = [], f = []
    for (let i = 1; i <= 40; i++) c = coarse.tick({ npcs, palace, now: i * 100, king: { x: 400, z: 400 } })
    for (let i = 1; i <= 400; i++) f = fine.tick({ npcs, palace, now: i * 10, king: { x: 400, z: 400 } })
    for (const s of c) {
      const other = f.find(o => o.id === s.id)
      expect(Math.hypot(s.x - other.x, s.z - other.z)).toBeLessThan(1e-6)
    }
  })
})

describe('읍(揖) — 임금이 다가오면 고개를 숙인다', () => {
  const palace = PALACES.changdeok
  const npc = bodiesIn('changdeok').find(n => n.id === 'geomseo')

  it('가까이 가면 굽히고, 멀어지면 편다', () => {
    const life = createPalaceLife()
    // 멀리서 시작 — 굽히지 않는다.
    let out = run(life, { npcs: [npc], palace, king: { x: npc.x + 20, z: npc.z }, frames: 10 })
    expect(out.states[0].bow).toBe(0)
    // 세 걸음 앞으로 — 0.5초 안에 다 굽힌다.
    const near = { x: npc.x + 3, z: npc.z }
    out = run(life, { npcs: [npc], palace, king: near, frames: 2, dt: 50, t0: out.now })
    expect(out.states[0].bow).toBeGreaterThan(0)      // 이미 굽히기 시작했다
    expect(out.states[0].bow).toBeLessThan(1)         // 한 프레임에 꺾이지 않는다
    out = run(life, { npcs: [npc], palace, king: near, frames: 20, dt: BOW_IN_MS / 10, t0: out.now })
    expect(out.states[0].bow).toBe(1)
    // 굽힌 동안에는 걸음을 멈추고 임금을 마주 본다.
    expect(out.states[0].walking).toBe(false)
    expect(out.states[0].yaw).toBeNull()
    // 임금이 떠난다 — 0.76초 남짓에 펴진다.
    out = run(life, { npcs: [npc], palace, king: { x: npc.x + 30, z: npc.z }, frames: 40, dt: BOW_OUT_MS / 10, t0: out.now })
    expect(out.states[0].bow).toBe(0)
  })

  it('문턱을 하나로 두지 않는다 — 딱 그 거리에 선 임금 앞에서 깜박이지 않게', () => {
    const between = (BOW_NEAR + BOW_FAR) / 2
    // 그 거리에서 시작하면 굽히지 않는다(들어오는 문턱은 BOW_NEAR).
    const cold = createPalaceLife()
    let out = run(cold, { npcs: [npc], palace, king: { x: npc.x + between, z: npc.z }, frames: 40, dt: 50 })
    expect(out.states[0].bow).toBe(0)
    // 이미 굽힌 뒤에는 그 거리에서 펴지지 않는다(나가는 문턱은 BOW_FAR).
    const warm = createPalaceLife()
    out = run(warm, { npcs: [npc], palace, king: { x: npc.x + 2, z: npc.z }, frames: 40, dt: 50 })
    expect(out.states[0].bow).toBe(1)
    out = run(warm, { npcs: [npc], palace, king: { x: npc.x + between, z: npc.z }, frames: 40, dt: 50, t0: out.now })
    expect(out.states[0].bow).toBe(1)
    // BOW_FAR 밖으로 나가면 편다.
    out = run(warm, { npcs: [npc], palace, king: { x: npc.x + BOW_FAR + 1, z: npc.z }, frames: 60, dt: 50, t0: out.now })
    expect(out.states[0].bow).toBe(0)
  })

  it('임금이 떠난 뒤에는 굽히던 그 자리에서 걸음을 이어 간다', () => {
    const life = createPalaceLife()
    // 마디 세 번을 돌려 서성임이 한창인 지점을 만든다(임금은 멀리 있다).
    let out = run(life, { npcs: [npc], palace, frames: (LEG_MS * 3 + PAUSE_MS + WALK_MS / 2) / 50, dt: 50 })
    const before = out.states[0]
    // 임금이 온다 — 그 자리에 선다. 시계가 서 있으므로 자리가 움직이지 않는다.
    out = run(life, { npcs: [npc], palace, king: { x: before.x + 2, z: before.z }, frames: 200, dt: 50, t0: out.now })
    const during = out.states[0]
    expect(during.bow).toBe(1)
    // 굽히기 시작한 첫 프레임까지는 걸음이 조금 더 나간다 — 그 한 걸음까지만 허용한다.
    expect(Math.hypot(during.x - before.x, during.z - before.z)).toBeLessThan(0.6)
  })
})

it('정지 선호(reduced motion)에서는 서성이지 않는다 — 읍은 자세라서 남긴다', () => {
  const palace = PALACES.changdeok
  const npcs = bodiesIn('changdeok')
  const life = createPalaceLife()
  run(life, { npcs, palace, reducedMotion: true, frames: 900, dt: 100, each: states => {
    for (const s of states) {
      const n = npcs.find(m => m.id === s.id)
      expect(s.x).toBe(n.x)
      expect(s.z).toBe(n.z)
      expect(s.walking).toBe(false)
    }
  } })
  const npc = npcs.find(n => n.id === 'geomseo')
  const still = createPalaceLife()
  const out = run(still, { npcs: [npc], palace, reducedMotion: true,
    king: { x: npc.x + 2, z: npc.z }, frames: 40, dt: 50 })
  expect(out.states[0].bow).toBe(1)
  expect(out.states[0].x).toBe(npc.x)
})

it('알현이 신하를 몰고 간 뒤에는 앵커에서 다시 센다(forget)', () => {
  const palace = PALACES.changdeok
  const npc = bodiesIn('changdeok').find(n => n.id === 'geomseo')
  const life = createPalaceLife()
  let out = run(life, { npcs: [npc], palace, frames: (LEG_MS * 2 + PAUSE_MS + WALK_MS / 2) / 50, dt: 50 })
  expect(Math.hypot(out.states[0].x - npc.x, out.states[0].z - npc.z)).toBeGreaterThan(0.2)
  life.forget(npc.id)
  out = run(life, { npcs: [npc], palace, frames: 1, dt: 50, t0: out.now })
  expect(out.states[0].x).toBe(npc.x)
  expect(out.states[0].z).toBe(npc.z)
})
