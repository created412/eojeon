import { describe, it, expect } from 'vitest'
import { sealProgress, sealHtml, SEAL_HOLD_MS, SEAL_NOTE } from '../../src/ui/edict-screen.js'

describe('어보를 찍는 일', () => {
  it('누른 시간만큼 찍히고, 다 차면 1 을 넘지 않는다', () => {
    expect(sealProgress(0)).toBe(0)
    expect(sealProgress(-5)).toBe(0)
    expect(sealProgress(SEAL_HOLD_MS / 2)).toBeCloseTo(0.5, 5)
    expect(sealProgress(SEAL_HOLD_MS)).toBe(1)
    expect(sealProgress(SEAL_HOLD_MS * 3)).toBe(1)
  })

  it('한 번에 찍히지 않는다 — 눌러야 하는 시간이 있다', () => {
    expect(SEAL_HOLD_MS).toBeGreaterThan(400)
    expect(sealProgress(50)).toBeLessThan(0.2)
  })

  it('찍는 자리는 누를 수 있는 단추이고 이름이 붙어 있다', () => {
    const html = sealHtml()
    expect(html).toContain('<button')
    expect(html).toContain('aria-label')
    for (const ch of ['施', '命', '之', '寶']) expect(html).toContain(`<i>${ch}</i>`)
    expect(html).toContain('시명지보')
  })

  it('무엇이 사실이고 무엇이 재구성인지 고지가 함께 붙는다', () => {
    expect(SEAL_NOTE).toContain('시명지보')
    expect(SEAL_NOTE).toContain('재구성')
    // 어느 보를 찍었는지 단정하지 않는다.
    expect(SEAL_NOTE).toContain('확인하지 못했습니다')
  })
})
