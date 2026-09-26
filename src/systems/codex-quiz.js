import { CODEX_QUIZZES, quizFor } from '../data/codex-quiz.js'
import { sourceById } from '../data/sources.js'

// 막 끝 사초함 질문의 판정. DOM 을 모르고, 무작위를 쓰지 않는다 — 같은 사초함이면
// 언제나 같은 화면이 선다(교실에서 두 아이의 화면이 달라 보이면 그 자체가 사고다).
//
// 이 파일이 답하는 것은 셋뿐이다.
//   ① 내가 든 문서 가운데 이 질문에 닿는 것은 어느 것인가        → relevantOf
//   ② 나는 답할 수 있는가                                      → canAnswer
//   ③ 없는 문서는 어디에 있었는가, 그것을 어떻게 말할 것인가      → missingOf · absentLines
//
// ③ 이 이 파일의 어려운 대목이다. 선생님: 「벌이 아니라 「모아 둔 것이 힘이 된다」를
// 몸으로 아는 자리다.」 그래서 이 모듈은 「못 했다」를 셈하지 않는다 — 셈하는 값이
// 있으면 화면이 언젠가 그것을 점수로 그린다. 여기서 나가는 것은 **문장**이고, 그
// 문장은 「그 문서는 …에 있었다」로 끝난다. 사실 하나를 놓고 판정을 붙이지 않는다.
//
// ⚠ 문 하나를 잠그지 않는다. canAnswer() 가 거짓이어도 화면은 열리고, 해설은 나오고,
//    다음으로 넘어간다. 이 함수는 「말을 어떻게 걸 것인가」를 가르는 데만 쓴다.
//    문을 잠그는 데 쓰면 이 자리가 벌이 된다.

export const MIN_PICK = 1          // 한 장이면 답이 선다. 두 장을 요구하지 않는다.
export const MAX_TEXT = 300        // 내 말은 한 줄이다 — 긴 글을 받는 자리가 아니다
export const MAX_SHOWN_EXCERPT = 4 // 나란히 놓고 읽을 수 있는 인용의 수

// 학생이 쓴 한 줄은 없어도 된다. 근거를 골랐으면 그것으로 답이 된 것이다 —
// 글쓰기를 못 하는 아이의 손에서 사초함이 힘이 되지 않게 할 이유가 없다.
export const TEXT_REQUIRED = false

export { CODEX_QUIZZES, quizFor }

// ── 판정 ────────────────────────────────────────────────────────────────

// 지금 든 문서 id 목록. state.sources.held 는 잃은 문서를 이미 빼고 들고 있다
// (systems/codex.js lose). 그러므로 불탄 문서·약탈당한 문서는 여기 없다 — 그것이
// 옳다: 「그때 손에 있었던 것으로 답한다」가 이 화면의 규칙이다.
export function heldIdsOf(state) {
  return [...(state?.sources?.held ?? [])]
}

// 모은 차례 그대로 돌려준다. 질문에 닿는 것을 앞으로 끌어내지 않는다 —
// 그러면 고르기 전에 답이 먼저 보인다.
export function heldCardsOf(state) {
  return heldIdsOf(state).map(id => sourceById(id)).filter(Boolean)
}

// 질문에 닿는 문서 가운데 실제로 손에 있는 것.
export function relevantOf(quiz, heldIds = []) {
  if (!quiz) return []
  const held = new Set(heldIds)
  return quiz.wants.filter(id => held.has(id))
}

// 질문에 닿는 문서 가운데 손에 없는 것. 「잃은 것」과 「안 주운 것」을 가리지 않는다 —
// 지금 답하는 데 없다는 사실만 같다. 무엇 때문에 없는지는 마지막 화면이 말한다
// (ui/act-end.js showFinal 이 불탐·약탈됨을 이름으로 되돌려준다).
export function missingOf(quiz, heldIds = []) {
  if (!quiz) return []
  const held = new Set(heldIds)
  return quiz.wants.filter(id => !held.has(id))
}

// 답할 수 있는가. 「문을 잠그는 데 쓰지 말라」는 위 경고를 다시 적어 둔다.
export function canAnswer(quiz, heldIds = []) {
  return relevantOf(quiz, heldIds).length >= MIN_PICK
}

// 고른 것 가운데 질문에 닿은 것. 닿지 않은 것을 틀린 것으로 셈하지 않는다 —
// 돌려주는 것은 「닿은 목록」 하나뿐이고, 나머지는 그저 함께 고른 문서다.
export function matchedOf(quiz, picked = []) {
  if (!quiz) return []
  const want = new Set(quiz.wants)
  return picked.filter(id => want.has(id))
}

// 「그 문서는 …에 있었다」 한 줄. 데이터에 적어 둔 것이 없으면 카드의 출처로 대신한다 —
// 빈 줄을 내보내지 않는다(안 모은 학생이 읽을 유일한 줄이다).
export function originLine(quiz, id) {
  const written = quiz?.origin?.[id]
  if (written) return written
  const card = sourceById(id)
  if (!card) return ''
  return `그 문서는 ${card.act}막에 있었다 — ${card.origin}`
}

// 사초함에 없던 문서들을 이름과 자리로 적는다. 셈이 아니라 줄이다.
export function absentLines(quiz, heldIds = []) {
  return missingOf(quiz, heldIds).map(id => ({
    id,
    title: sourceById(id)?.title ?? id,
    where: originLine(quiz, id),
  }))
}

// 화면에 나란히 놓을 인용. 고른 차례를 지킨다 — 학생이 고른 순서가 곧 그 학생의
// 논증 순서다. 너무 많으면 읽히지 않으므로 MAX_SHOWN_EXCERPT 에서 끊는다.
export function excerptsOf(picked = []) {
  return picked
    .map(id => sourceById(id))
    .filter(Boolean)
    .slice(0, MAX_SHOWN_EXCERPT)
    .map(card => ({
      id: card.id,
      title: card.title,
      origin: card.origin,
      excerpt: card.excerpt,
    }))
}

// ── 화면에 넘길 것 ───────────────────────────────────────────────────────

// main.js·acts.js 가 부르는 유일한 문. 막에 질문이 없으면 null 을 돌려주고, 부르는
// 쪽은 그 한 줄로 이 화면을 건너뛴다(`const v = quizView(act, state); if (v) …`).
export function quizView(act, state) {
  const quiz = quizFor(act)
  if (!quiz) return null
  const held = heldCardsOf(state)
  return {
    act: quiz.act,
    question: quiz.question,
    gloss: quiz.gloss ?? '',
    held,
    wants: [...quiz.wants],
    explain: quiz.explain,
    origin: { ...(quiz.origin ?? {}) },
    absent: absentLines(quiz, held.map(c => c.id)),
    canAnswer: canAnswer(quiz, held.map(c => c.id)),
  }
}

// 화면이 닫힐 때 돌려주는 것. 학생이 쓴 글(text)은 자르기만 하고 손대지 않는다 —
// 그 문장은 활동지로 옮겨 적을 문장이다.
export function resultOf(quiz, { picked = [], text = '' } = {}) {
  const matched = matchedOf(quiz, picked)
  return {
    picked: [...picked],
    text: String(text ?? '').slice(0, MAX_TEXT),
    matched,
    missed: missingOf(quiz, picked),
  }
}
