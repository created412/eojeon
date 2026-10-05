import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

// ── 2026-10-05 전체 점검 뒤의 모양 ─────────────────────────────────────────
// 국상 화면은 한 줄로 길게 쌓여 있었고, 손으로 찍어야 할 어보가 화면 밖이었다.
describe('국상 화면 — 읽는 것과 하는 것이 나란히 선다', () => {
  const src = readFileSync(join(process.cwd(), 'src', 'ui', 'edict-screen.js'), 'utf8')

  it('두 칸이다 — 실록의 닷새와 내가 내리는 하교', () => {
    expect(src).toContain('<div class="cols">')
    expect(src).toContain('<div class="col read">')
    expect(src).toContain('<div class="col act">')
  })

  it('어보가 하는 쪽 칸 안에 있다 — 표 밑으로 밀려나지 않는다', () => {
    const act = src.indexOf('<div class="col act">')
    expect(src.indexOf('${sealHtml()}')).toBeGreaterThan(act)
  })

  it('좁은 화면에서는 하교가 먼저 온다', () => {
    expect(src).toMatch(/\.edict \.col\.act\{order:-1\}/)
  })

  it('줄바꿈을 살리는 것은 하교의 글뿐이다 — 종이 전체가 아니다', () => {
    // 종이 전체에 pre-wrap 을 걸면 마크업의 빈 줄까지 찍혀 어보가 밀려난다.
    const paper = src.slice(src.indexOf('.edict .paper{'), src.indexOf('}', src.indexOf('.edict .paper{')))
    expect(paper).not.toContain('pre-wrap')
    expect(src).toMatch(/\.edict \.paper \.hasi\{white-space:pre-wrap\}/)
  })

  it('어보 밑의 안내가 종이 위에서 읽히는 빛깔이다', () => {
    const tip = src.slice(src.indexOf('.edict .stamp .tip{'))
    expect(tip.slice(0, tip.indexOf('}'))).not.toContain('--paper-quiet')
  })

  it('못 누르는 단추는 화면에 붙여 두지 않는다', () => {
    expect(src).toContain('button.go:not([disabled]){position:sticky')
  })
})
