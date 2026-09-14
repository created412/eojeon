import { it, expect } from 'vitest'
import { recordPreservation, compareWithActual } from '../../src/systems/preservation.js'

it('꺼내라 한 것과 이유만 기록하고 사초함의 사료·해석은 건드리지 않는다', () => {
  const state = { sources: { held: ['a','b'], read: ['a'], lost: [] }, inquiries: { a: { text: '내 해석' } } }
  const next = recordPreservation(state, 'great-fire', { selected: ['daebo','busin','zzz'], reason: '명령을 증명하는 도장이 먼저다.' }, ['daebo','busin','eopil'])
  expect(next.sources).toEqual(state.sources)
  expect(next.inquiries).toEqual(state.inquiries)
  expect(next.preservation['great-fire'].selected).toEqual(['daebo','busin'])
  expect(state.preservation).toBeUndefined()
})

it('고른 것 가운데 실제로 건진 것과 탄 것을 가른다', () => {
  const t = [{ id: 'daebo', saved: true }, { id: 'busin', saved: false }, { id: 'seja-in', saved: true }]
  expect(compareWithActual(t, ['daebo', 'busin'])).toEqual({ savedChosen: ['daebo'], lostChosen: ['busin'], savedActual: ['daebo', 'seja-in'] })
})
