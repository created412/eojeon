import { describe, it, expect } from 'vitest'
import { noticeFor, RUMOR_NOTICE, RECORD_LABEL, READING_LABEL } from '../../src/ui/dialog.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// noticeFor 가 정직 고지를 고르는 세 갈래. 지금은 'staged' 등급을 쓰는 카드가
// 없어 이 분기가 죽은 코드처럼 보이지만, 2단계에서 재구성 카드가 다시 들어온다 —
// 여기서 새면 "지어낸 것"이 "실재하는 기록"으로 학생에게 읽힌다.
describe('noticeFor — 사료 카드가 다는 정직 고지', () => {
  it("grade: 'staged' 는 재구성 고지를 낸다", () => {
    const notice = noticeFor({ grade: 'staged' })
    expect(notice).toContain('기록에 남아 있지 않습니다')
  })

  it("grade: 'staged' 는 rendering 값과 무관하게 재구성 고지가 우선한다", () => {
    const notice = noticeFor({ grade: 'staged', rendering: '우리말 옮김' })
    expect(notice).toContain('기록에 남아 있지 않습니다')
    expect(notice).not.toContain('오늘날 말로 옮겼습니다')
  })

  it("rendering: '우리말 옮김' 은 번역 고지를 낸다 (grade: source)", () => {
    const notice = noticeFor({ grade: 'source', rendering: '우리말 옮김' })
    expect(notice).toContain('오늘날 말로 옮겼습니다')
  })

  it("rendering: '우리말 옮김' 은 번역 고지를 낸다 (grade: textbook)", () => {
    const notice = noticeFor({ grade: 'textbook', rendering: '우리말 옮김' })
    expect(notice).toContain('오늘날 말로 옮겼습니다')
  })

  it('원문 그대로거나 rendering 이 없으면 고지가 없다', () => {
    expect(noticeFor({ grade: 'source', rendering: '원문' })).toBe('')
    expect(noticeFor({ grade: 'textbook' })).toBe('')
    expect(noticeFor({ grade: 'source' })).toBe('')
  })
})

it('소문 등급은 확인된 기록이 아니라고 따로 밝힌다', () => {
  const html = noticeFor({ grade: 'rumor' })
  expect(html).toContain('rumor')
  expect(html).toContain(RUMOR_NOTICE)
  expect(RUMOR_NOTICE).toContain('소문')
})


// ── 기록과 해석이 한 덩어리로 읽히지 않는다 ────────────────────────────────
//
// 선생님(2026-09-30): 「사료는 원문이고 그에 대한 설명이 밑에 있잖아.
// 둘이 구분이 안 간다는 말이었어.」
//
// 이 게임의 뼈대가 사료 / 해석 / 재구성을 나누는 것인데, 정작 사료 카드에서 그
// 둘이 붙어 읽히고 있었다. 학생이 「기록에 그렇게 적혀 있다」와 「우리가 그렇게
// 읽는다」를 구별하지 못하면 이 카드는 구분을 흐리는 쪽으로 일한다.
describe('사료 카드 — 기록과 해석을 눈으로 가른다', () => {
  const src = readFileSync(join(process.cwd(), 'src', 'ui', 'dialog.js'), 'utf8')

  it('둘 다 제 이름표를 단다', () => {
    expect(RECORD_LABEL).toContain('기록')
    expect(READING_LABEL).toContain('해석')
    expect(RECORD_LABEL).not.toBe(READING_LABEL)
  })

  it('해석이 누구의 말인지 이름표가 밝힌다 — 「우리가 붙인」', () => {
    // 이것이 이 이름표의 핵심이다. 「해석」만으로는 누가 한 해석인지 모른다.
    expect(READING_LABEL).toMatch(/우리|게임/)
  })

  it('카드가 두 이름표를 실제로 찍는다', () => {
    expect(src).toContain('${RECORD_LABEL}')
    expect(src).toContain('${READING_LABEL}')
  })

  it('해석은 제 칸 안에 들어간다 — 기록에 이어 붙지 않는다', () => {
    expect(src).toMatch(/<div class="reading">/)
    const reading = src.indexOf('<div class="reading">')
    const meaning = src.indexOf('class="meaning"')
    const excerpt = src.indexOf('class="excerpt"')
    expect(excerpt).toBeLessThan(reading)      // 기록이 먼저
    expect(meaning).toBeGreaterThan(reading)   // 해석은 그 칸 안
  })

  it('기록이 해석보다 작아 보이지 않는다', () => {
    // 우리 말이 기록보다 커 보이면 학생은 우리 말을 기록으로 읽는다.
    // 예전에 실제로 그랬다 — meaning 이 --read-lead, excerpt 가 --read-body 였다.
    // 기록은 이제 제 낱장 안에 있다(.card .record .excerpt) — 선생님 지적으로
    // 종이를 따로 떼어 낸 뒤의 자리다.
    const sizeOf = sel => {
      const at = src.indexOf(sel + '{')
      if (at < 0) return undefined
      const block = src.slice(at)
      return block.slice(0, block.indexOf('}')).match(/font-size:var\((--read-[a-z]+)/)?.[1]
    }
    const RANK = ['--read-caption', '--read-small', '--read-body', '--read-lead', '--read-title']
    const excerpt = sizeOf('.card .record .excerpt')
    const meaning = sizeOf('.card .meaning')
    expect(excerpt, '기록의 글자 크기를 못 찾았다').toBeTruthy()
    expect(meaning, '해석의 글자 크기를 못 찾았다').toBeTruthy()
    expect(RANK.indexOf(excerpt)).toBeGreaterThanOrEqual(RANK.indexOf(meaning))
  })

  it('기록이 제 낱장 위에 놓인다 — 카드 바탕과 다른 물건이다', () => {
    // 선생님(2026-09-30, 두 번째): 「종이 질감 옛날 거로 기록에 적힌 것을 눈에 보이게」
    // 카드 전체가 이미 한지라, 기록을 **따로 떼어** 놓지 않으면 구분이 안 된다.
    expect(src).toContain('<div class="record')   // 밑줄을 그은 문서는 read-done 이 덧붙는다
    const at = src.indexOf('.card .record{')
    expect(at, '기록 낱장의 결이 없다').toBeGreaterThan(-1)
    const block = src.slice(at, src.indexOf('.card .record::after'))
    expect(block, '그림자가 없으면 얹힌 것으로 안 보인다').toContain('box-shadow')
    expect(block, '얼룩이 없으면 옛 종이로 안 보인다').toContain('radial-gradient')
    expect(block, '가장자리를 손으로 자른 결이 없다').toContain('clip-path')
  })

  it('해석은 종이가 아니다 — 그림자도 결도 없다', () => {
    const at = src.indexOf('.card .reading{')
    const block = src.slice(at, src.indexOf('}', at))
    expect(block).not.toContain('box-shadow')
    expect(block).not.toContain('radial-gradient')
  })

  it('종이를 그림으로 싣지 않는다 — 용량이 늘지 않는다', () => {
    const at = src.indexOf('.card .record{')
    const block = src.slice(at, src.indexOf('.card .reading{'))
    expect(block).not.toContain('data:image')
    expect(block).not.toContain('url(')
  })
})
