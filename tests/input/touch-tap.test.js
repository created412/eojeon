import { it, expect } from 'vitest'
import { isTap, TAP_MOVE_PX, TAP_MS } from '../../src/input/input.js'

it('손가락은 조금만 움직이고 곧 떼야 탭(걷기)이다 — 끌면 시점 돌리기라 걷지 않는다', () => {
  expect(isTap(3, 120)).toBe(true)
  expect(isTap(TAP_MOVE_PX + 1, 120)).toBe(false)
  expect(isTap(2, TAP_MS + 1)).toBe(false)
})
