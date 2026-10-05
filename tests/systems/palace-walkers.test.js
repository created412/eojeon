import { describe, it, expect } from 'vitest'
import { PALACES } from '../../src/data/palaces.js'
import { collides } from '../../src/data/hall-geometry.js'
import { WALKERS, walkersIn } from '../../src/data/walkers.js'
import { npcsAt } from '../../src/data/npcs.js'
import { baseOf } from '../../src/data/palaces.js'
import {
  createWalkers, walkerPath, measurePath, pointAt, stopPoint,
  WALKER_SPEED, WALKER_PAUSE_MS, standAside, STAND_ASIDE, BOW_HOLD_MS,
} from '../../src/systems/palace-walkers.js'
import { BOW_NEAR, BOW_FAR } from '../../src/systems/palace-life.js'

// 궁인의 몸이 차지하는 반지름. render/scene.js 의 사람과 같은 값으로 검사한다.
const BODY_R = 0.6

describe('오가는 사람들의 데이터', () => {
  it('들르는 곳은 모두 실재하는 방이거나 담 안의 자리다', () => {
    for (const [palaceId, list] of Object.entries(WALKERS)) {
      const def = PALACES[palaceId]
      expect(def, palaceId).toBeTruthy()
      for (const w of list) {
        expect(w.stops.length, w.id).toBeGreaterThanOrEqual(2)
        for (const stop of w.stops) {
          const p = stopPoint(def, stop)
          expect(p, `${w.id} → ${JSON.stringify(stop)}`).toBeTruthy()
          expect(Math.abs(p.x), `${w.id} x`).toBeLessThan(def.ground.w / 2)
          expect(Math.abs(p.z), `${w.id} z`).toBeLessThan(def.ground.d / 2)
        }
      }
    }
  })

  it('궁인의 id 는 말을 거는 신하의 id 와 겹치지 않는다', () => {
    // 겹치면 표지·대화·알현이 엉뚱한 사람을 집는다.
    const npcIds = new Set()
    for (const palace of Object.keys(PALACES)) {
      for (let act = 0; act < 5; act++) {
        for (const n of npcsAt(baseOf, palace, act, 1875)) npcIds.add(n.id)
      }
    }
    for (const list of Object.values(WALKERS)) {
      for (const w of list) expect(npcIds.has(w.id), w.id).toBe(false)
    }
  })
})

describe('길', () => {
  it('궁마다 적어 둔 사람이 모두 길을 얻는다', () => {
    for (const [palaceId, list] of Object.entries(WALKERS)) {
      const def = PALACES[palaceId]
      for (const w of list) {
        const points = walkerPath(def, w)
        expect(points.length, `${palaceId}/${w.id}`).toBeGreaterThan(2)
      }
    }
  })

  it('길 위의 어느 자리도 벽·기둥에 겹치지 않는다', () => {
    // 끝점만 보면 안 된다 — 두 자리 사이의 기둥을 아무도 검사하지 않는 그 함정이다
    // (systems/palace-life.js 의 walkable 주석 참고).
    for (const [palaceId, list] of Object.entries(WALKERS)) {
      const def = PALACES[palaceId]
      for (const w of list) {
        const points = walkerPath(def, w)
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i]
          for (const u of [0, 0.25, 0.5, 0.75, 1]) {
            const p = { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u }
            expect(Boolean(collides(def, p, BODY_R)), `${palaceId}/${w.id} ${i} @${u}`).toBe(false)
          }
        }
      }
    }
  })

  it('갔다가 돌아온다 — 길의 끝은 길의 처음이다', () => {
    const def = PALACES.changdeok
    const points = walkerPath(def, walkersIn('changdeok')[0])
    const first = points[0], last = points[points.length - 1]
    expect(Math.hypot(first.x - last.x, first.z - last.z)).toBeLessThan(0.01)
  })

  it('한 자리만 들르면 길이 없다 — 그런 사람은 세우지 않는다', () => {
    expect(walkerPath(PALACES.changdeok, { id: 'x', stops: ['injeongjeon'] })).toEqual([])
    expect(walkerPath(null, { id: 'x', stops: ['a', 'b'] })).toEqual([])
  })
})

describe('걸음', () => {
  const def = PALACES.changdeok
  function life() {
    const w = createWalkers()
    w.setPalace(def, walkersIn('changdeok'))
    return w
  }

  it('궁을 세우면 사람마다 하나씩 걷는다', () => {
    const w = life()
    expect(w.ids().length).toBe(walkersIn('changdeok').length)
    const out = w.tick({ now: 1000 })
    expect(out.length).toBe(w.ids().length)
    for (const o of out) expect(Number.isFinite(o.x) && Number.isFinite(o.z)).toBe(true)
  })

  it('시간이 지나면 실제로 자리를 옮긴다', () => {
    const w = life()
    const a = w.tick({ now: 0 })
    const b = w.tick({ now: 30000 })
    const moved = a.some((o, i) => Math.hypot(o.x - b[i].x, o.z - b[i].z) > 3)
    expect(moved).toBe(true)
  })

  it('길 밖으로는 한 발도 나가지 않는다', () => {
    const w = life()
    for (const id of w.ids()) {
      const path = w.pathOf(id)
      for (let ms = 0; ms < 240000; ms += 900) {
        const me = w.tick({ now: ms }).find(o => o.id === id)
        // 길 위의 어느 마디에든 붙어 있어야 한다 — 가장 가까운 마디까지의 거리로 본다.
        let best = Infinity
        for (let i = 1; i < path.points.length; i++) {
          const a = path.points[i - 1], b = path.points[i]
          const vx = b.x - a.x, vz = b.z - a.z
          const len2 = vx * vx + vz * vz || 1
          const u = Math.max(0, Math.min(1, ((me.x - a.x) * vx + (me.z - a.z) * vz) / len2))
          best = Math.min(best, Math.hypot(me.x - (a.x + vx * u), me.z - (a.z + vz * u)))
        }
        expect(best, `${id} @${ms}`).toBeLessThan(0.05)
      }
    }
  })

  it('프레임이 굵든 잘든 같은 시각에는 같은 자리다 — 시계로 걷는다', () => {
    const coarse = life(), fine = life()
    for (let ms = 0; ms <= 60000; ms += 3000) coarse.tick({ now: ms })
    for (let ms = 0; ms <= 60000; ms += 100) fine.tick({ now: ms })
    const a = coarse.tick({ now: 60000 }), b = fine.tick({ now: 60000 })
    for (let i = 0; i < a.length; i++) {
      expect(Math.hypot(a[i].x - b[i].x, a[i].z - b[i].z), a[i].id).toBeLessThan(0.01)
    }
  })

  it('임금이 다가오면 멈춰 서서 읍하고, 멀어지면 편다', () => {
    const w = life()
    const id = w.ids()[0]
    let me = w.tick({ now: 0 }).find(o => o.id === id)
    expect(me.bow).toBe(0)
    // 곁에 선다 — 굽히는 데 0.5초가 걸린다
    for (let ms = 100; ms <= 1200; ms += 100) me = w.tick({ now: ms, king: { x: me.x, z: me.z } }).find(o => o.id === id)
    expect(me.bow).toBeGreaterThan(0.9)
    expect(me.walking).toBe(false)
    expect(me.yaw).toBe(null)          // 임금을 본다
    const stood = { x: me.x, z: me.z }
    // 물러난다 — 문턱이 둘이라 BOW_FAR 밖으로 나가야 편다
    for (let ms = 1300; ms <= 3000; ms += 100) me = w.tick({ now: ms, king: { x: stood.x + BOW_FAR + 2, z: stood.z } }).find(o => o.id === id)
    expect(me.bow).toBe(0)
    expect(BOW_NEAR).toBeLessThan(BOW_FAR)
  })

  it('굽히는 동안에는 걸음의 시계가 선다 — 그 자리에서 굽힌다', () => {
    const w = life()
    const id = w.ids()[0]
    let me = w.tick({ now: 6000 }).find(o => o.id === id)
    const king = { x: me.x, z: me.z + 3 }            // 3m 앞에 임금이 선다
    const at = { x: me.x, z: me.z }
    for (let ms = 6100; ms <= 6100 + BOW_HOLD_MS - 300; ms += 100) me = w.tick({ now: ms, king }).find(o => o.id === id)
    expect(me.bow).toBeGreaterThan(0.5)
    expect(Math.hypot(me.x - at.x, me.z - at.z)).toBeLessThan(0.3)      // 굽히는 동안 제자리
  })

  it('읍은 한 번 하고 지나간다 — 임금이 서 있어도 영영 박혀 있지 않는다', () => {
    // 예전에는 임금이 곁에 있는 한 내내 굽힌 채 서 있었다. 경우궁 시작 화면에서
    // 궁인 하나가 임금과 카메라 사이에 박혀 임금 등에 포개져 보였다.
    const w = life()
    const id = w.ids()[0]
    let me = w.tick({ now: 6000 }).find(o => o.id === id)
    const king = { x: me.x, z: me.z + 3 }
    const at = { x: me.x, z: me.z }
    let movedOn = false, jump = 0, prev = me
    for (let ms = 6100; ms <= 30000; ms += 100) {
      me = w.tick({ now: ms, king }).find(o => o.id === id)
      jump = Math.max(jump, Math.hypot(me.x - prev.x, me.z - prev.z))
      prev = me
      if (Math.hypot(me.x - at.x, me.z - at.z) > 2) movedOn = true
    }
    expect(movedOn, '임금이 서 있는 내내 한 자리에 박혀 있었다').toBe(true)
    // 다시 걸을 때 저만치로 튀지 않는다 — 서 있던 그 자리에서 잇는다.
    expect(jump).toBeLessThan(1.7)
  })

  it('읍하고 지나간 사람은, 멀어졌다 다시 다가올 때 또 읍한다', () => {
    const w = life()
    const id = w.ids()[0]
    let me = w.tick({ now: 6000 }).find(o => o.id === id)
    const near = { x: me.x, z: me.z + 3 }
    let bowed = 0
    for (let ms = 6100; ms <= 12000; ms += 100) { me = w.tick({ now: ms, king: near }).find(o => o.id === id); if (me.bow > 0.5) bowed = 1 }
    expect(bowed).toBe(1)
    // 임금이 멀리 간다
    for (let ms = 12100; ms <= 14000; ms += 100) me = w.tick({ now: ms, king: { x: 999, z: 999 } }).find(o => o.id === id)
    expect(me.bow).toBeLessThan(0.2)
    // 다시 곁에 선다 — 또 읍한다
    let again = 0
    for (let ms = 14100; ms <= 16000; ms += 100) {
      me = w.tick({ now: ms, king: { x: me.x, z: me.z + 3 } }).find(o => o.id === id)
      if (me.bow > 0.5) again = 1
    }
    expect(again).toBe(1)
  })

  it('움직임 줄이기에서는 길의 첫 자리에 서 있는다 — 읍은 남는다', () => {
    const w = life()
    const id = w.ids()[0]
    const start = pointAt(w.pathOf(id), 0)
    for (let ms = 0; ms <= 40000; ms += 500) {
      const me = w.tick({ now: ms, reducedMotion: true }).find(o => o.id === id)
      expect(Math.hypot(me.x - start.x, me.z - start.z)).toBeLessThan(0.01)
      expect(me.walking).toBe(false)
    }
    const me = w.tick({ now: 41000, reducedMotion: true, king: start }).find(o => o.id === id)
    expect(me.bow).toBeGreaterThan(0)
  })

  // 알현 — 예전에는 궁인을 통째로 지웠다(render/scene.js hidden). 그러면 아뢰는
  // 장면 내내 궁이 텅 비어, 선생님이 보신 「움직이지 않는 궁」이 「아무도 없는 궁」이
  // 되었다. 이제 선 자리에서 멈추게만 한다.
  describe('알현 동안에는 선 자리에서 멈춘다(frozen)', () => {
    // 프레임이 굵어도 멈춤은 멈춤이다. 처음에는 세운 시계에 **자른** 시간을 더해,
    // 프레임이 120ms 보다 느린 기계에서 멈춰 선 궁인이 야금야금 미끄러졌다.
    it.each([100, 400])('프레임이 %dms 로 굵어도 자리가 한 뼘도 안 움직인다', step => {
      const w = life()
      const id = w.ids()[0]
      let me
      for (let ms = 0; ms <= 12000; ms += 100) me = w.tick({ now: ms }).find(o => o.id === id)
      const at = { x: me.x, z: me.z }
      for (let ms = 12000 + step; ms <= 40000; ms += step) {
        me = w.tick({ now: ms, frozen: true }).find(o => o.id === id)
        expect(Math.hypot(me.x - at.x, me.z - at.z), `${ms}ms`).toBeLessThan(0.001)
      }
    })

    it('멈춘 동안 자리가 한 뼘도 안 움직이고 걸음도 없다', () => {
      const w = life()
      const id = w.ids()[0]
      // 먼저 한참 걷게 두어 길 한가운데에 세운다 — 첫 자리에서 멈추는 것과 구별하려면
      // 출발점이 아닌 곳에서 멈춰 보아야 한다.
      let me
      for (let ms = 0; ms <= 12000; ms += 100) me = w.tick({ now: ms }).find(o => o.id === id)
      const at = { x: me.x, z: me.z }
      for (let ms = 12100; ms <= 30000; ms += 100) {
        me = w.tick({ now: ms, frozen: true }).find(o => o.id === id)
        expect(Math.hypot(me.x - at.x, me.z - at.z), `${ms}ms`).toBeLessThan(0.001)
        expect(me.walking).toBe(false)
      }
    })

    it('멈춤이 풀리면 멈춘 그 자리에서 잇는다 — 저만치로 튀지 않는다', () => {
      const w = life()
      const id = w.ids()[0]
      let me
      for (let ms = 0; ms <= 12000; ms += 100) me = w.tick({ now: ms }).find(o => o.id === id)
      const at = { x: me.x, z: me.z }
      for (let ms = 12100; ms <= 30000; ms += 100) me = w.tick({ now: ms, frozen: true }).find(o => o.id === id)
      // 18초를 멈춰 있었어도, 다시 걸을 때 한 프레임에 가는 거리는 걸음 하나만큼이다.
      const after = w.tick({ now: 30100, frozen: false }).find(o => o.id === id)
      expect(Math.hypot(after.x - at.x, after.z - at.z)).toBeLessThan(WALKER_SPEED * 0.2)
    })
  })
})

describe('길 위의 한 점', () => {
  it('거리를 재고 그 거리의 자리를 낸다', () => {
    const path = measurePath([{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 4 }])
    expect(path.length).toBe(7)
    expect(pointAt(path, 0)).toMatchObject({ x: 0, z: 0 })
    expect(pointAt(path, 3)).toMatchObject({ x: 3, z: 0 })
    expect(pointAt(path, 5)).toMatchObject({ x: 3, z: 2 })
    // 길 밖의 거리를 물어도 길 안의 자리를 낸다.
    expect(pointAt(path, -5)).toMatchObject({ x: 0, z: 0 })
    expect(pointAt(path, 99)).toMatchObject({ x: 3, z: 4 })
  })

  it('궁의 걸음은 임금보다 느리고, 한 자리에서 몇 초 쉰다', () => {
    expect(WALKER_SPEED).toBeLessThan(2)
    expect(WALKER_PAUSE_MS).toBeGreaterThan(2000)
  })
})

// ── 임금과 겹쳐 서지 않는다(2026-10-06) ────────────────────────────────────
// 경우궁 시작 화면에서 임금 등 뒤에 궁인 하나가 포개져 있었다. 임금이 걸어온 것이
// 아니라 시작 자리에 **나타났고**, 마침 그 자리를 지나던 궁인이 그대로 멈춰 선 것이다.
describe('궁인이 임금과 한 몸으로 겹쳐 서지 않는다', () => {
  it('임금이 바로 그 자리에 나타나면 옆으로 비켜 선다', () => {
    const at = { x: 3, z: 4, yaw: 0 }
    const out = standAside(at, { x: 3, z: 4 })
    expect(Math.hypot(out.x - 3, out.z - 4)).toBeCloseTo(STAND_ASIDE, 6)
  })

  it('가까이 있으면 임금에게서 멀어지는 쪽으로 물러선다', () => {
    const out = standAside({ x: 0.5, z: 0, yaw: 0 }, { x: 0, z: 0 })
    expect(out.x).toBeCloseTo(STAND_ASIDE, 6)
    expect(out.z).toBeCloseTo(0, 6)
  })

  it('넉넉히 떨어져 있으면 건드리지 않는다 — 같은 값을 그대로 돌려준다', () => {
    const at = { x: 5, z: 0, yaw: 1 }
    expect(standAside(at, { x: 0, z: 0 })).toBe(at)
  })

  it('임금이 없으면 그대로 둔다', () => {
    const at = { x: 1, z: 1 }
    expect(standAside(at, null)).toBe(at)
  })

  it('실제 궁에서 궁인이 지나는 자리에 임금이 나타나도 겹치지 않는다', () => {
    const def = PALACES.gyeongu
    const walkers = createWalkers()
    walkers.setPalace(def, walkersIn('gyeongu'))
    expect(walkers.ids().length).toBeGreaterThan(0)
    for (let t = 0; t < 60000; t += 2000) {
      // 임금 없이 한 번 돌려 궁인이 지금 어디 있는지 보고, 바로 그 자리에 임금을 세운다.
      for (const w of walkers.tick({ now: t, king: null })) {
        const king = { x: w.x, z: w.z }
        for (const s of walkers.tick({ now: t, king })) {
          expect(Math.hypot(s.x - king.x, s.z - king.z), `${s.id} t=${t}`)
            .toBeGreaterThanOrEqual(STAND_ASIDE - 1e-6)
        }
      }
    }
  })
})
