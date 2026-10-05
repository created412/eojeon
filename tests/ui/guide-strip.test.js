import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { GUIDE_PANELS } from '../../src/ui/guide-strip.js'

// 「지금 할 일」 띠가 전체 화면 판의 첫 줄을 덮고 있었다(2026-10-05 전체 점검).
// 띠가 제 키를 알리고 판들이 비켜 서게 고쳤다 — 이 시험은 그 목록이 실제 판과
// 어긋나지 않는지를 본다. 새 판을 만들고 목록에 안 넣으면 그 판만 다시 덮인다.
const UI = join(process.cwd(), 'src', 'ui')
const sources = readdirSync(UI).filter(f => f.endsWith('.js') && !f.endsWith('-data.js'))
  .map(f => [f, readFileSync(join(UI, f), 'utf8')])
const guide = readFileSync(join(UI, 'guide-strip.js'), 'utf8')

describe('안내 띠가 본문을 덮지 않는다', () => {
  it('비켜 서는 판이 모두 실제로 있는 판이다', () => {
    for (const name of GUIDE_PANELS) {
      const found = sources.some(([, src]) => src.includes(`className = '${name}'`))
      expect(found, `「${name}」 이라는 판이 없다 — 이름이 바뀌었는가`).toBe(true)
    }
  })

  it('손으로 하는 판과 글 화면이 빠짐없이 들어 있다', () => {
    for (const must of ['note', 'dispatch', 'council', 'orders', 'rebuild', 'brush', 'ration']) {
      expect(GUIDE_PANELS, `「${must}」 판이 띠 밑에 깔린다`).toContain(must)
    }
  })

  it('띠가 뜬 쪽만 비운다 — 반대쪽 안여백을 0 으로 덮지 않는다', () => {
    expect(guide).toContain('html.guide-top')
    expect(guide).toContain('html.guide-bottom')
    // 한 규칙에 padding-top 과 padding-bottom 을 함께 걸지 않는다
    const rules = guide.match(/\$\{sel(Top|Bottom)\}\{[^}]*\}/g) ?? []
    expect(rules).toHaveLength(2)
    for (const r of rules) expect(/padding-top/.test(r) && /padding-bottom/.test(r)).toBe(false)
  })

  it('띠가 사라지면 비켜 선 것도 풀린다', () => {
    expect(guide).toMatch(/classList\.remove\('guide-top', 'guide-bottom'\)/)
    expect(guide).toMatch(/removeProperty\('--guide-clear'\)/)
  })

  it('창 크기가 바뀌면 다시 잰다 — 태블릿을 돌리면 띠의 자리가 바뀐다', () => {
    expect(guide).toContain("'resize'")
  })
})
