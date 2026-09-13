import { describe, it, expect } from 'vitest'
import {
  kingSpot, besideSpot, visitorSpot, doorSpot, throneZ,
  walkAt, yawToward, castOf, besideIds, visitorsOf, rebukeOf, entersOf,
  KING_FROM_THRONE, VISITOR_GAP, BESIDE_GAP,
} from '../../src/systems/audience.js'
import { THRONE_DEPTH, THRONE_WIDTH, ROOM_SHRINK } from '../../src/render/palace.js'

// 인정전과 같은 모양의 방 하나로 잰다 — 실제 데이터로 재는 검사는
// tests/data/audience.test.js 가 따로 한다.
const ROOM = { id: 'injeongjeon', x: 0, z: 12, w: 22, d: 18 }

describe('알현 — 사람이 서는 자리', () => {
  it('임금은 어좌 앞에 선다 — 어좌 위가 아니라', () => {
    const k = kingSpot(ROOM)
    const front = throneZ(ROOM) + THRONE_DEPTH / 2
    expect(k.z).toBeGreaterThan(front)
    expect(k.z - front).toBeCloseTo(KING_FROM_THRONE, 5)
  })

  it('임금도 곁에 선 사람도 방 안에 있다', () => {
    const halfW = (ROOM.w * ROOM_SHRINK) / 2
    const halfD = (ROOM.d * ROOM_SHRINK) / 2
    for (const p of [kingSpot(ROOM), besideSpot(ROOM, 0), visitorSpot(ROOM)]) {
      expect(Math.abs(p.x - ROOM.x), `x ${p.x}`).toBeLessThan(halfW)
      expect(Math.abs(p.z - ROOM.z), `z ${p.z}`).toBeLessThan(halfD)
    }
  })

  it('곁에 선 사람은 임금의 왼쪽이고, 어좌 폭 밖이다', () => {
    const k = kingSpot(ROOM)
    const b = besideSpot(ROOM, 0)
    expect(b.x).toBeLessThan(k.x)
    expect(k.x - b.x).toBeCloseTo(BESIDE_GAP, 5)
    // 어좌 앞을 가로막고 서지 않는다
    expect(Math.abs(b.x - ROOM.x)).toBeGreaterThan(THRONE_WIDTH / 2)
  })

  it('둘이 곁에 서면 서로 겹치지 않는다', () => {
    expect(besideSpot(ROOM, 1).x).toBeLessThan(besideSpot(ROOM, 0).x)
  })

  it('아뢰는 사람은 임금 앞, 문 쪽에 선다', () => {
    const k = kingSpot(ROOM)
    const v = visitorSpot(ROOM)
    expect(v.z - k.z).toBeCloseTo(VISITOR_GAP, 5)
    expect(doorSpot(ROOM).z).toBeGreaterThan(v.z)   // 문에서 임금 쪽으로 걸어온다
  })

  // 카메라가 임금의 앞쪽에 매여 있어, 정면에 세우면 뒤통수가 화면을 가린다.
  it('아뢰는 사람은 곁에 선 사람과 반대쪽으로 비켜선다 — 셋이 한 화면에 들어온다', () => {
    const k = kingSpot(ROOM)
    expect(visitorSpot(ROOM).x).toBeGreaterThan(k.x)
    expect(besideSpot(ROOM, 0).x).toBeLessThan(k.x)
  })
})

describe('알현 — 걸어 들어오는 셈', () => {
  const from = doorSpot(ROOM)
  const to = visitorSpot(ROOM)

  it('처음과 끝은 정확히 문과 제자리다', () => {
    expect(walkAt(from, to, 0)).toEqual(from)
    const end = walkAt(from, to, 1)
    expect(end.x).toBeCloseTo(to.x, 6)
    expect(end.z).toBeCloseTo(to.z, 6)
  })

  it('0..1 을 벗어난 값도 끝에서 멈춘다 — 프레임이 늦어도 사람이 벽을 뚫지 않는다', () => {
    expect(walkAt(from, to, -3).z).toBeCloseTo(from.z, 6)
    expect(walkAt(from, to, 9).z).toBeCloseTo(to.z, 6)
  })

  it('중간에는 언제나 문과 제자리 사이에 있다', () => {
    for (const u of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const p = walkAt(from, to, u)
      expect(p.z).toBeLessThan(from.z)
      expect(p.z).toBeGreaterThan(to.z)
    }
  })

  it('가운데를 지나는 순간이 실제로 가운데다 — 부드럽게 해도 한쪽으로 쏠리지 않는다', () => {
    const mid = walkAt(from, to, 0.5)
    expect(mid.z).toBeCloseTo((from.z + to.z) / 2, 6)
  })
})

describe('알현 — 바라보는 방향', () => {
  it('아뢰는 사람은 임금 쪽을 본다 — 뒤쪽 반원 안이다(문을 등진다)', () => {
    const y = yawToward(visitorSpot(ROOM), kingSpot(ROOM))
    expect(Math.abs(y)).toBeGreaterThan(Math.PI / 2)
  })

  it('곁에 선 사람은 임금 쪽(+x)을 본다', () => {
    const y = yawToward(besideSpot(ROOM, 0), kingSpot(ROOM))
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThan(Math.PI)
  })
})

describe('알현 — 비트가 부르는 사람', () => {
  const beat = {
    kind: 'audience',
    beside: 'heungseon',
    blockLine: '전하, 어전에서는 자리를 뜨는 것이 아닙니다.',
    visitors: [{ npc: 'hojo', lines: ['아뢰옵니다'], grantCards: ['a', 'b'] }],
  }

  it('곁에 선 사람은 하나든 여럿이든 배열로 읽힌다', () => {
    expect(besideIds(beat)).toEqual(['heungseon'])
    expect(besideIds({ beside: ['a', 'b'] })).toEqual(['a', 'b'])
    expect(besideIds({})).toEqual([])
  })

  it('세워야 할 사람은 곁에 선 사람과 찾아오는 사람 전부다', () => {
    expect(castOf(beat)).toEqual(['heungseon', 'hojo'])
  })

  it('곁에 선 사람이 스스로 말해도 두 번 세우지 않는다', () => {
    const b = { beside: 'heungseon', visitors: [{ npc: 'heungseon', from: 'beside' }, { npc: 'hojo' }] }
    expect(castOf(b)).toEqual(['heungseon', 'hojo'])
  })

  it('from:beside 인 사람만 걸어 들어오지 않는다', () => {
    expect(entersOf({ npc: 'hojo' })).toBe(true)
    expect(entersOf({ npc: 'heungseon', from: 'beside' })).toBe(false)
  })

  it('방문자가 없는 비트도 터지지 않는다', () => {
    expect(visitorsOf({})).toEqual([])
    expect(castOf({})).toEqual([])
  })

  it('꾸중은 곁에 선 사람의 입으로 나간다', () => {
    expect(rebukeOf(beat)).toEqual({ npcId: 'heungseon', line: beat.blockLine })
    expect(rebukeOf({ beside: 'x' })).toBe(null)   // 적어 두지 않았으면 아무 말도 안 한다
  })
})
