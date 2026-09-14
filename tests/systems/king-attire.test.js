import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import * as age from '../../src/systems/king-age.js'

describe('즉위 전 명복의 복장', () => {
  const act = ACTS[0]
  const throne = act.beats.findIndex(b => b.id === 'throne')
  it('운현궁의 하루·알현·행렬에는 사가의 옷을 입는다', () => {
    for (let i = 0; i < throne; i++) expect(age.kingAttireAt?.(act, i)).toBe('commoner')
  })
  it('즉위 비트부터 같은 아이 몸이어도 왕의 옷을 입는다', () => {
    for (let i = throne; i < act.beats.length; i++) expect(age.kingAttireAt?.(act, i)).toBe('royal')
  })
  it('이어하기도 지난 비트의 궁 전환을 반영한다', () => {
    expect(age.kingAttireAt?.(act, throne + 1, 'changdeok')).toBe('royal')
    expect(age.kingAttireAt?.(act, 1, 'changdeok')).toBe('commoner')
  })
  it('현재 궁이 운현궁이면 사가의 옷이며 다른 막에서는 왕의 옷이다', () => {
    expect(age.kingAttireAt?.(ACTS[1], 0, 'unhyeon')).toBe('commoner')
    for (const later of ACTS.slice(1)) expect(age.kingAttireAt?.(later, 0)).toBe('royal')
  })
})
