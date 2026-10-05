import { describe, it, expect } from 'vitest'
import {
  parseLine, makeBoard, initialState, place, focusBlank, isDone, nextBlank, hintChip, lineFor,
  HINT_AFTER, LINES,
} from '../../src/systems/cloze.js'
import { ACT_BACKGROUND } from '../../src/data/act-background.js'

// 선생님(2026-10-06): 「막이 시작하기 전 교과서 내용 정리가 게임에 방해가 되네. 그래도
// 필요한 건 맞아. … 한 판에 들어오는 연표하고 빈칸 채우기 문제로 넣는 건 어떨까.」

const ROWS = [
  { year: '1863', text: '나이 어린 {고종}이 왕위에 올랐다.' },
  { year: '1865', text: '{원납전}을 거두고 {당백전}을 발행하였다.' },
]
const chipOf = (board, word, state = null) =>
  board.chips.find(c => c.word === word && !(state?.used[c.id]))?.id

describe('문장을 빈칸과 글로 가른다', () => {
  it('중괄호 안이 빈칸이다 — 조사는 밖에 남는다', () => {
    expect(parseLine('나이 어린 {고종}이 왕위에 올랐다.')).toEqual([
      { text: '나이 어린 ' }, { blank: '고종' }, { text: '이 왕위에 올랐다.' },
    ])
  })
  it('한 줄에 빈칸이 둘일 수 있다', () => {
    expect(parseLine('{원납전}을 거두고 {당백전}을 발행').filter(p => p.blank).map(p => p.blank))
      .toEqual(['원납전', '당백전'])
  })
  it('빈칸이 없으면 글 한 덩어리다', () => {
    expect(parseLine('그냥 글')).toEqual([{ text: '그냥 글' }])
  })
  it('닫히지 않은 괄호에 깨지지 않는다', () => {
    expect(() => parseLine('앞 {뒤')).not.toThrow()
    expect(parseLine('')).toEqual([])
  })
})

describe('판을 짓는다', () => {
  const board = makeBoard(ROWS, ['비변사'])
  it('빈칸은 읽는 차례로 번호가 붙는다', () => {
    expect(board.blanks.map(b => b.answer)).toEqual(['고종', '원납전', '당백전'])
  })
  it('낱말은 빈칸의 것과 남는 것을 합친 것이다', () => {
    expect(board.chips.map(c => c.word).sort()).toEqual(['고종', '당백전', '비변사', '원납전'].sort())
  })
  it('낱말이 빈칸의 차례 그대로 놓이지 않는다 — 읽지 않고 왼쪽부터 누르면 안 채워진다', () => {
    for (const [id, bg] of Object.entries(ACT_BACKGROUND)) {
      const b = makeBoard(bg.rows, bg.extra)
      const answers = b.blanks.map(x => x.answer)
      expect(b.chips.map(c => c.word).slice(0, answers.length), id).not.toEqual(answers)
    }
  })
  it('섞는 차례가 늘 같다 — 옆자리와 같은 판을 본다', () => {
    expect(makeBoard(ROWS, ['비변사']).chips).toEqual(board.chips)
  })
})

describe('낱말을 놓는다', () => {
  const board = makeBoard(ROWS, ['비변사'])

  it('처음에는 첫 칸을 채울 차례다', () => {
    expect(initialState(board).active).toBe('b0')
  })

  it('맞는 낱말은 붙고, 다음 칸으로 넘어간다', () => {
    const r = place(board, initialState(board), chipOf(board, '고종'))
    expect(r.ok).toBe(true)
    expect(r.state.filled.b0).toBe('고종')
    expect(r.state.active).toBe('b1')
  })

  it('맞지 않는 낱말은 붙지 않는다 — 판은 그대로다', () => {
    const s0 = initialState(board)
    const r = place(board, s0, chipOf(board, '당백전'))
    expect(r.ok).toBe(false)
    expect(r.state.filled).toEqual({})
    expect(r.state.active).toBe('b0')
  })

  it('걷는 것과 찍는 것을 가려야 한다 — 원납전 자리에 당백전은 붙지 않는다', () => {
    let s = place(board, initialState(board), chipOf(board, '고종')).state
    expect(place(board, s, chipOf(board, '당백전')).ok).toBe(false)
    s = place(board, s, chipOf(board, '원납전')).state
    expect(place(board, s, chipOf(board, '당백전')).ok).toBe(true)
  })

  it('한 번 쓴 낱말은 다시 못 쓴다', () => {
    const s = place(board, initialState(board), chipOf(board, '고종')).state
    const again = place(board, s, board.chips.find(c => c.word === '고종').id)
    expect(again.ok).toBe(false)
  })

  it('다른 칸을 먼저 골라 채울 수 있다', () => {
    let s = focusBlank(board, initialState(board), 'b2')
    expect(s.active).toBe('b2')
    s = place(board, s, chipOf(board, '당백전')).state
    expect(s.filled.b2).toBe('당백전')
    expect(s.active).toBe('b0')            // 남은 칸 가운데 처음으로 돌아온다
  })

  it('이미 찬 칸은 다시 고를 수 없다', () => {
    const s = place(board, initialState(board), chipOf(board, '고종')).state
    expect(focusBlank(board, s, 'b0')).toBe(s)
  })

  it('다 채우면 끝난다 — 남는 낱말은 남는다', () => {
    let s = initialState(board)
    for (const w of ['고종', '원납전', '당백전']) s = place(board, s, chipOf(board, w, s)).state
    expect(isDone(board, s)).toBe(true)
    expect(nextBlank(board, s)).toBeNull()
    expect(s.used[chipOf(board, '비변사')]).toBeUndefined()
    expect(lineFor(board, s)).toContain(LINES.left)
  })
})

describe('아무도 갇히지 않는다', () => {
  const board = makeBoard(ROWS, ['비변사'])
  it(`${HINT_AFTER}번 헛짚으면 그 자리의 낱말이 빛난다`, () => {
    let s = initialState(board)
    expect(hintChip(board, s)).toBeNull()
    for (let i = 0; i < HINT_AFTER; i++) s = place(board, s, chipOf(board, '비변사')).state
    expect(hintChip(board, s)).toBe(chipOf(board, '고종'))
    expect(lineFor(board, s, false)).toBe(LINES.hint)
  })
  it('빛나는 낱말만 눌러도 끝까지 간다', () => {
    let s = initialState(board)
    let guard = 0
    while (!isDone(board, s) && guard++ < 50) {
      const hint = hintChip(board, s)
      s = place(board, s, hint ?? chipOf(board, '비변사')).state
    }
    expect(isDone(board, s)).toBe(true)
  })
  it('헛짚은 것을 세어 깎지 않는다 — 다른 칸의 빛남은 그 칸의 것이다', () => {
    let s = initialState(board)
    for (let i = 0; i < 5; i++) s = place(board, s, chipOf(board, '비변사')).state
    s = place(board, s, chipOf(board, '고종')).state
    expect(hintChip(board, s)).toBeNull()     // 다음 칸은 처음부터다
  })
})

describe('이 판은 시험이 아니다', () => {
  it('깎는 낱말을 쓰지 않는다', () => {
    for (const line of Object.values(LINES)) {
      expect(line).not.toMatch(/정답|오답|틀렸|실패|점수|감점/)
    }
  })
})
