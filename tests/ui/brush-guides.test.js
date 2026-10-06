import { describe, it, expect } from 'vitest'
import { BRUSH_GUIDES } from '../../src/ui/brush-guides-data.js'
import { coverage, HIT_RADIUS } from '../../src/systems/brush-trace.js'

describe('나라 國의 얇은 가로획', () => {
  it('바깥 윗변 전체가 안내점과 판정에 들어 있다', () => {
    const top = BRUSH_GUIDES['國'].filter(p => p.y >= .22 && p.y <= .255)
    for (let x = .22; x <= .78; x += .02) {
      expect(top.some(p => Math.abs(p.x - x) < HIT_RADIUS), `윗변 x=${x}`).toBe(true)
    }
    const withoutTop = BRUSH_GUIDES['國'].filter(p => p.y > .28)
    expect(coverage(top, withoutTop)).toBeLessThan(.1)
  })
  it('안쪽 或의 긴 가로획도 끊어지지 않는다', () => {
    const bar = BRUSH_GUIDES['國'].filter(p => p.y >= .35 && p.y <= .38)
    for (let x = .25; x <= .73; x += .02) {
      expect(bar.some(p => Math.abs(p.x - x) < HIT_RADIUS), `안쪽 가로획 x=${x}`).toBe(true)
    }
  })
})
