// 연표의 빈칸을 채운다 — 막을 열기 전, 교과서가 적어 둔 것을 한 판으로.
//
// 선생님(2026-10-06): 「막이 시작하기 전 교과서 내용 정리가 게임에 방해가 되네. 그래도
// 필요한 건 맞아. … 한 판에 들어오는 연표하고 빈칸 채우기 문제로 넣는 건 어떨까.」
//
// 예전 화면은 사진 다섯 장과 글 열 줄을 아래로 굴려 읽는 판이었다. 읽으라고만 하는
// 화면은 학생이 「시작한다」까지 굴려 내려가는 화면이 된다 — 필요한 것을 실어 놓고도
// 아무도 읽지 않는다. 그래서 **읽어야 채울 수 있는** 판으로 바꾼다: 연표 네댓 줄에
// 빈칸이 있고, 아래의 낱말을 눌러 채운다. 문장을 읽지 않으면 어느 낱말인지 모른다.
//
// 이 파일은 셈만 한다. DOM 을 모른다.
//
// ── 지키는 것 ─────────────────────────────────────────────────────────────
//   · 문장은 교과서의 것이다. 빈칸은 그 문장의 낱말 하나를 가린 것일 뿐, 새 문장을
//     짓지 않는다(data/act-background.js 가 쪽수를 적는다).
//   · 시험이 아니다. 맞지 않는 낱말은 그 자리에 붙지 않을 뿐이고, 세지도 깎지도 않는다.
//     두 번 헛짚으면 그 자리의 낱말이 스스로 빛난다 — 아무도 갇히지 않는다.
//   · 남는 낱말이 있다. 낱말 수와 빈칸 수가 같으면 마지막 칸은 읽지 않고도 찬다.

// 문장 한 줄을 조각으로 가른다. 「{고종}이 왕위에 올랐다」 → 빈칸 + 글.
export function parseLine(text) {
  const out = []
  const s = String(text ?? '')
  let i = 0
  while (i < s.length) {
    const open = s.indexOf('{', i)
    if (open < 0) { out.push({ text: s.slice(i) }); break }
    const close = s.indexOf('}', open)
    if (close < 0) { out.push({ text: s.slice(i) }); break }
    if (open > i) out.push({ text: s.slice(i, open) })
    out.push({ blank: s.slice(open + 1, close) })
    i = close + 1
  }
  return out
}

// 낱말을 섞는다 — 늘 같은 차례로. 새로 고칠 때마다 달라지면 옆자리와 견줄 수 없고,
// 빈칸의 차례 그대로면 읽지 않고 왼쪽부터 누르면 된다.
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * 판을 짓는다.
 *   rows   [{ year, text }] — text 안의 {낱말} 이 빈칸이다
 *   extra  빈칸에 들어가지 않는 낱말들(남는 낱말)
 * 돌려주는 것:
 *   rows    [{ year, parts: [{ text } | { blank: id }] }]
 *   blanks  [{ id, answer }] — 읽는 차례
 *   chips   [{ id, word }] — 섞인 차례
 */
export function makeBoard(rows = [], extra = []) {
  const blanks = []
  const outRows = rows.map(row => ({
    year: row.year ?? '',
    parts: parseLine(row.text).map(part => {
      if (part.blank == null) return part
      const id = `b${blanks.length}`
      blanks.push({ id, answer: part.blank })
      return { blank: id }
    }),
  }))
  const words = [...blanks.map(b => b.answer), ...extra]
  const chips = words
    .map((word, i) => ({ id: `c${i}`, word, key: hash(`${word}/${i}/${words.length}`) }))
    .sort((a, b) => a.key - b.key)
    .map(({ id, word }) => ({ id, word }))
  return { rows: outRows, blanks, chips }
}

export function initialState(board) {
  return { filled: {}, used: {}, active: board.blanks[0]?.id ?? null, misses: {} }
}

export function isDone(board, state) {
  return board.blanks.every(b => state.filled[b.id])
}

// 아직 안 찬 첫 칸. from 다음부터 찾고, 없으면 처음부터 다시 찾는다.
export function nextBlank(board, state, from = null) {
  const ids = board.blanks.map(b => b.id)
  const start = from ? ids.indexOf(from) + 1 : 0
  const order = [...ids.slice(start), ...ids.slice(0, start)]
  return order.find(id => !state.filled[id]) ?? null
}

/** 학생이 칸을 눌러 고른다. 이미 찬 칸은 고를 수 없다. */
export function focusBlank(board, state, blankId) {
  if (!board.blanks.some(b => b.id === blankId) || state.filled[blankId]) return state
  return state.active === blankId ? state : { ...state, active: blankId }
}

/**
 * 낱말 하나를 지금 고른 칸에 놓아 본다.
 * 돌려주는 것: { state, ok } — ok 가 false 면 그 낱말은 붙지 않았다.
 *
 * 같은 낱말이 두 칸의 답일 수 있다(4막과 5막의 「청」처럼 한 판 안에 겹치는 일은
 * 지금 없지만, 데이터가 그렇게 되어도 깨지지 않게 **낱말**로 견준다).
 */
export function place(board, state, chipId) {
  const chip = board.chips.find(c => c.id === chipId)
  const blank = board.blanks.find(b => b.id === state.active)
  if (!chip || !blank || state.used[chipId] || state.filled[blank.id]) return { state, ok: false }
  if (chip.word !== blank.answer) {
    const misses = { ...state.misses, [blank.id]: (state.misses[blank.id] ?? 0) + 1 }
    return { state: { ...state, misses }, ok: false }
  }
  const filled = { ...state.filled, [blank.id]: chip.word }
  const used = { ...state.used, [chipId]: true }
  const next = { ...state, filled, used }
  return { state: { ...next, active: nextBlank(board, next, blank.id) }, ok: true }
}

// 두 번 헛짚으면 그 칸의 낱말을 가리킨다 — 갇히는 학생이 없게.
export const HINT_AFTER = 2

/** 지금 고른 칸에서 빛나야 할 낱말의 id. 아직 아니면 null. */
export function hintChip(board, state) {
  const blank = board.blanks.find(b => b.id === state.active)
  if (!blank || (state.misses[blank.id] ?? 0) < HINT_AFTER) return null
  return board.chips.find(c => !state.used[c.id] && c.word === blank.answer)?.id ?? null
}

// 화면에 뜨는 줄. 깎는 말을 쓰지 않는다 — 붙지 않았다는 것만 말한다.
export const LINES = {
  start: '아래 낱말을 눌러 빈칸을 채운다. 문장을 읽어야 어느 낱말인지 보인다.',
  miss: '그 낱말은 이 자리에 붙지 않는다. 문장을 다시 읽어 보라.',
  hint: '빛나는 낱말이 이 자리의 것이다.',
  done: '연표가 다 찼다.',
  left: '남은 낱말은 이 연표에 들어가지 않는다.',
}

export function lineFor(board, state, lastOk = null) {
  if (isDone(board, state)) {
    const left = board.chips.some(c => !state.used[c.id])
    return left ? `${LINES.done} ${LINES.left}` : LINES.done
  }
  if (hintChip(board, state)) return LINES.hint
  if (lastOk === false) return LINES.miss
  return LINES.start
}
