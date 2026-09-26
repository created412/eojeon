import { describe, it, expect } from 'vitest'
import { PALACES } from '../../src/data/palaces.js'
import { collides } from '../../src/data/hall-geometry.js'
import { WALKERS, walkersIn } from '../../src/data/walkers.js'
import { npcsAt } from '../../src/data/npcs.js'
import { baseOf } from '../../src/data/palaces.js'
import {
  createWalkers, walkerPath, measurePath, pointAt, stopPoint,
  WALKER_SPEED, WALKER_PAUSE_MS,
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

  it('굽히는 동안 걸음의 시계가 서서, 임금이 지나간 뒤 그 자리에서 잇는다', () => {
    const w = life()
    const id = w.ids()[0]
    let me = w.tick({ now: 6000 }).find(o => o.id === id)
    const king = { x: me.x, z: me.z }
    for (let ms = 6100; ms <= 20000; ms += 100) me = w.tick({ now: ms, king }).find(o => o.id === id)
    // 열네 초를 굽힌 채 서 있었으니 저만치 가 있으면 안 된다.
    expect(Math.hypot(me.x - king.x, me.z - king.z)).toBeLessThan(1)
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
