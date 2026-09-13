import { describe, it, expect } from 'vitest'
import { RANK, canMove, isRoomOpen, openRooms } from '../../src/core/control.js'

const rooms = [
  { id: 'injeongjeon', minControl: 'D' },
  { id: 'huijeongdang', minControl: 'C' },
  { id: 'daejojeon', minControl: 'B' },
  { id: 'yeongyeongdang', minControl: 'A' },
]

describe('조작권 등급', () => {
  it('등급 순서는 D < C < B < A 다', () => {
    expect(RANK.D).toBeLessThan(RANK.C)
    expect(RANK.C).toBeLessThan(RANK.B)
    expect(RANK.B).toBeLessThan(RANK.A)
  })

  it('D 등급에서는 움직일 수 없다', () => {
    expect(canMove('D')).toBe(false)
  })

  it('A·B·C 등급에서는 움직일 수 있다', () => {
    expect(canMove('A')).toBe(true)
    expect(canMove('B')).toBe(true)
    expect(canMove('C')).toBe(true)
  })

  it('자기 등급 이하를 요구하는 방만 열린다', () => {
    expect(isRoomOpen('C', { minControl: 'C' })).toBe(true)
    expect(isRoomOpen('C', { minControl: 'D' })).toBe(true)
    expect(isRoomOpen('C', { minControl: 'B' })).toBe(false)
    expect(isRoomOpen('C', { minControl: 'A' })).toBe(false)
  })

  it('A 등급은 모든 방이 열린다', () => {
    expect(openRooms('A', rooms)).toHaveLength(4)
  })

  it('C 등급은 두 방만 열린다', () => {
    expect(openRooms('C', rooms).map(r => r.id)).toEqual(['injeongjeon', 'huijeongdang'])
  })

  it('D 등급에서도 방 목록은 계산되지만 이동이 막힌다', () => {
    expect(openRooms('D', rooms).map(r => r.id)).toEqual(['injeongjeon'])
    expect(canMove('D')).toBe(false)
  })
})
