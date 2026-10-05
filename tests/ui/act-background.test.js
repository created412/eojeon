import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { backgroundHtml, rowHtml } from '../../src/ui/act-background.js'
import { ACT_BACKGROUND, backgroundFor } from '../../src/data/act-background.js'
import { makeBoard } from '../../src/systems/cloze.js'
import { ACTS } from '../../src/data/acts.js'

// 선생님(2026-09-30): 「이 그림 대신 1막의 역사적 내용을 … 배경지식을 설명해 주면 좋을 것 같아.」
// 선생님(2026-10-06): 「막이 시작하기 전 교과서 내용 정리가 게임에 방해가 되네. 그래도
// 필요한 건 맞아. … 한 판에 들어오는 연표하고 빈칸 채우기 문제로 넣는 건 어떨까.」

describe('배경지식 — 무엇을 싣는가', () => {
  it('막 id 로 찾는다. 모르는 id 는 null 이다', () => {
    expect(backgroundFor('enthronement')).toBeTruthy()
    expect(backgroundFor('없는막')).toBeNull()
    expect(backgroundFor(undefined)).toBeNull()
  })

  it('다섯 막이 모두 제 연표를 갖는다', () => {
    for (const act of ACTS) expect(backgroundFor(act.id), `${act.id} 에 연표가 없다`).toBeTruthy()
  })

  it('막 번호가 실제 차례와 맞는다', () => {
    ACTS.forEach((act, i) => {
      expect(backgroundFor(act.id).act, `${act.id} 의 막 번호가 어긋난다`).toBe(i + 1)
      expect(backgroundFor(act.id).title).toContain(`${i + 1}막 전에`)
    })
  })

  it('실린 막 id 가 실제로 있는 막이다', () => {
    const ids = new Set(ACTS.map(a => a.id))
    for (const key of Object.keys(ACT_BACKGROUND)) expect(ids.has(key), `${key} 라는 막이 없다`).toBe(true)
  })

  it('막마다 그 막에서 손으로 할 일을 미리 말한다', () => {
    for (const act of ACTS) {
      const ahead = backgroundFor(act.id).ahead
      expect(ahead, `${act.id} 에 이어지는 말이 없다`).toBeTruthy()
      expect(ahead).toContain('당신')
    }
  })

  it('막마다 어디서 온 글인지 밝힌다 — 쪽수까지', () => {
    for (const [id, bg] of Object.entries(ACT_BACKGROUND)) {
      expect(bg.origin, `${id} 에 출처가 없다`).toContain('한국사1')
      expect(bg.origin, `${id} 에 쪽수가 없다`).toMatch(/\d+쪽/)
    }
  })

  it('1막 연표가 교과서가 적은 것을 짚는다', () => {
    const all = JSON.stringify(ACT_BACKGROUND.enthronement)
    for (const word of ['세도 정치', '삼정', '통상', '철종', '흥선 대원군', '경복궁', '원납전', '당백전', '물가']) {
      expect(all, `「${word}」이 빠졌다`).toContain(word)
    }
  })

  it('걷어 낸 것을 다시 들이지 않는다 — 왕비도, 사진도', () => {
    const all = JSON.stringify(ACT_BACKGROUND)
    expect(all).not.toContain('왕비')
    expect(all).not.toContain('media')
  })
})

describe('한 판에 들어오는 연표다', () => {
  for (const [id, bg] of Object.entries(ACT_BACKGROUND)) {
    const board = makeBoard(bg.rows, bg.extra)

    it(`${id} — 줄이 넷에서 다섯이다. 굴려 읽는 판이 아니다`, () => {
      expect(bg.rows.length).toBeGreaterThanOrEqual(4)
      expect(bg.rows.length).toBeLessThanOrEqual(5)
    })

    it(`${id} — 줄마다 해가 있고 빈칸이 하나 이상 있다`, () => {
      for (const [i, row] of board.rows.entries()) {
        expect(bg.rows[i].year, `${i + 1}번째 줄에 해가 없다`).toBeTruthy()
        expect(row.parts.some(p => p.blank), `${i + 1}번째 줄에 빈칸이 없다`).toBe(true)
      }
    })

    it(`${id} — 한 줄이 너무 길지 않다(두 줄 안에 읽힌다)`, () => {
      for (const row of bg.rows) {
        const plain = row.text.replace(/[{}]/g, '')
        expect(plain.length, plain).toBeLessThanOrEqual(78)
      }
    })

    it(`${id} — 빈칸은 다섯에서 일곱, 남는 낱말이 둘이다`, () => {
      expect(board.blanks.length).toBeGreaterThanOrEqual(5)
      expect(board.blanks.length).toBeLessThanOrEqual(7)
      expect(bg.extra).toHaveLength(2)
    })

    it(`${id} — 같은 낱말이 두 번 나오지 않는다. 남는 낱말이 빈칸의 답과 겹치지도 않는다`, () => {
      const words = board.chips.map(c => c.word)
      expect(new Set(words).size).toBe(words.length)
    })

    it(`${id} — 빈칸의 낱말이 짧다(낱말 하나다)`, () => {
      for (const b of board.blanks) expect([...b.answer].length, b.answer).toBeLessThanOrEqual(7)
    })
  }
})

describe('판이 실제로 그려진다', () => {
  const view = { ...ACT_BACKGROUND.enthronement, buttonLabel: '1막을 시작한다' }
  const html = backgroundHtml(view)

  it('줄이 하나도 빠지지 않는다', () => {
    expect(html.match(/<li>/g)).toHaveLength(view.rows.length)
    for (const row of view.rows) expect(html).toContain(row.year)
  })

  // 처음 쓴 1막에서 「고종」 칸 바로 아랫줄이 「고종을 대신하여…」였다 — 베껴 채울 수 있었다.
  it('빈칸의 낱말이 어느 막에서도 다른 줄에 미리 적혀 있지 않다', () => {
    for (const [id, bg] of Object.entries(ACT_BACKGROUND)) {
      const board = makeBoard(bg.rows, bg.extra)
      const page = backgroundHtml({ ...bg, buttonLabel: '시작' }, board)
      const rows = page.slice(page.indexOf('<ol'), page.indexOf('</ol>'))
      for (const b of board.blanks) expect(rows, id + ' — 「' + b.answer + '」가 문장에 보인다').not.toContain(b.answer)
    }
  })

  it('낱말이 모두 단추로 놓인다', () => {
    const board = makeBoard(view.rows, view.extra)
    expect(html.match(/data-chip=/g)).toHaveLength(board.chips.length)
    for (const c of board.chips) expect(html).toContain(`>${c.word}</button>`)
  })

  it('빈칸은 단추다 — 눌러서 채울 칸을 고른다', () => {
    const board = makeBoard(view.rows, view.extra)
    expect(html.match(/data-blank=/g)).toHaveLength(board.blanks.length)
  })

  it('출처 줄과 이어지는 말이 한 화면 안에 있다', () => {
    expect(html).toContain('출처 — ')
    expect(html).toContain('48쪽')
    expect(html).toContain(view.ahead)
  })

  it('다 채우기 전에는 나가는 단추가 잠겨 있다 — 단추는 하나다', () => {
    expect(html.match(/class="go"/g)).toHaveLength(1)
    expect(html).toMatch(/class="go" disabled/)
    expect(html).toContain('1막을 시작한다')
  })

  it('글자를 그대로 끼워 넣지 않는다 — 꺾쇠가 섞여도 깨지지 않는다', () => {
    const board = makeBoard([{ year: '<b>', text: '<script> {x}' }], [])
    const row = rowHtml(board.rows[0], board)
    expect(row).not.toContain('<script>')
    expect(row).toContain('&lt;script&gt;')
    expect(row).toContain('&lt;b&gt;')
  })
})

describe('굴리지 않는다', () => {
  // 주석은 걷어 내고 본다.
  const NL = String.fromCharCode(10)
  const css = readFileSync(join(process.cwd(), 'src', 'ui', 'act-background.js'), 'utf8')
    .split(NL).filter(l => !l.trim().startsWith('//')).join(NL)

  it('바깥 판은 구르지 않는다', () => {
    expect(css).toMatch(/\.actbg\{[^}]*overflow:hidden/)
  })
  it('글씨와 틈이 화면 높이를 따라 준다', () => {
    expect(css).toMatch(/\.actbg \.rows p\{[^}]*clamp\([^)]*vh/)
    expect(css).toMatch(/\.actbg \.wrap\{[^}]*height:100%/)
  })
  it('움직임을 줄여 달라고 한 학생에게는 낱말이 떨지 않는다', () => {
    expect(css).toContain('prefers-reduced-motion')
  })
})
