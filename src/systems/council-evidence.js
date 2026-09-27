import { heldIdsOf, heldCardsOf, absentLines } from './codex-quiz.js'
import { sourceById } from '../data/sources.js'

// 어전회의의 판정 — 「근거 대기」와 「예보」.
//
// 2026-09-27 선생님, 병인양요 어전회의 화면을 보시고: 「장계 보고 선택지에서 선택하고
// 실제 역사가 어떠했는지 확인 후 그 이유 쓰는 거 뭔가 밋밋해. 좀 더 재미있고 교육적인
// 걸로 바꿔봐. 선택 후 이유 쓰기는 다 바꿔야 할 것 같아.」
//
// 밋밋했던 까닭은 분명하다. 마지막에 열리던 것이 **빈 글상자 하나**였고, 학생이 거기에
// 쓴 것이 화면 사진에 남아 있다 — 「DDDD」. 글상자는 학생이 무엇을 했는지 묻지 않는다.
// 아무것도 안 해도 네 글자면 통과한다. 그래서 글상자를 지우고, 그 자리에 학생이
// **이미 가진 것으로만 할 수 있는 두 가지**를 놓는다.
//
//   ① 근거 대기 — 신하들이 저마다 한 마디씩 한다. 그 말이 딛고 선 문서를, 학생의
//      사초함에서 꺼내 그 말 밑에 놓는다. 손에 없는 문서는 놓을 수 없다. 그러므로
//      2막의 창덕궁에서 승지·검서관·군교를 지나친 학생은 놓을 것이 적다 — 그것이
//      벌이 아니라 「모아 둔 것이 힘이 된다」의 몸으로 아는 자리다(막 끝 사초함
//      질문과 같은 규칙이다. systems/codex-quiz.js 머리말을 먼저 읽을 것).
//   ② 예보 — 「실제로는 —」이 뜨기 **전에**, 이 일이 무엇을 부를 것 같은지 한 줄을
//      고른다. 그리고 실제가 뜨면 그 옆에 제 예보가 나란히 선다. **채점하지 않는다.**
//      어긋남은 잘못이 아니라, 1866년 그 자리에서 알 수 있는 것과 오늘 우리가 아는
//      것의 거리다 — 그 한 줄이 FORECAST_NOTE 다.
//
// ── 이 파일이 지키는 것 ──────────────────────────────────────────────────
// · DOM 을 모른다. Math.random 을 쓰지 않는다. 같은 사초함이면 언제나 같은 화면이
//   선다 — 교실에서 두 아이의 화면이 달라 보이면 그 자체가 사고다.
// · **셈하는 값을 내보내지 않는다.** 「몇 개 중 몇 개」가 나가는 순간 화면은 언젠가
//   그것을 점수로 그린다. 여기서 나가는 것은 목록과 문장뿐이다.
// · 문을 잠그지 않는다. 근거를 하나도 못 놓아도 회의는 열리고, 실제 역사는 나오고,
//   다음으로 넘어간다. 바뀌는 것은 화면이 말을 거는 방식뿐이다.
// · systems/council.js 는 잠금이다(한 글자도 고치지 않는다) — 선택지 해금 규칙은
//   그 파일과 ui/council-ui.js 의 gateChoices 가 그대로 맡는다. 이 파일은 그 위에
//   두 가지를 더할 뿐이다.

// 한 말 밑에 놓는 문서는 하나다. 둘을 받으면 기록 문장이 길어지고, 화면이 「많이
// 놓은 쪽이 낫다」로 읽힌다 — 셈이 안 보이게 하는 가장 쉬운 방법은 셀 것을 두지
// 않는 것이다. 다른 말 밑에 같은 문서를 또 놓는 것은 막지 않는다(한 장이 두 말에
// 걸리는 일은 실제로 있다).
export const ONE_PER_CLAIM = true

// 예보는 하나만 고른다. 둘을 고르면 「실제로는 —」 옆에 서는 줄이 둘이 되고,
// 그 둘 가운데 하나가 맞았다는 읽기가 저절로 생긴다.
export const ONE_FORECAST = true

// 예보 옆에 늘 함께 서는 한 줄. 선생님 지시의 그 문장이다 —
// 「A prediction that missed is not wrong; it is the difference between what a person
//  in 1866 could know and what we know now.」
// 연도를 넣지 않는다: 네 회의(병인·조약·임오·갑신)가 모두 이 한 줄을 쓴다.
export const FORECAST_NOTE =
  '예보와 실제가 어긋나도 잘못한 것이 아니다. 그때 그 자리에서 알 수 있는 것과, 오늘 우리가 아는 것이 다를 뿐이다.'

// 문서를 놓았으나 그 말이 가리키던 문서가 아닐 때 붙는 줄. 판정하지 않는다 —
// 나란히 놓고 읽으라고만 한다. 받치는지 어긋나는지는 읽는 사람이 정한다.
export const NEUTRAL_ATTACH_NOTE =
  '이 글을 그 말 옆에 놓았다. 두 글을 나란히 읽어 보라 — 받치는지 어긋나는지는 읽는 사람이 정한다.'

// 사초함이 빈 학생이 읽을 줄. 「왜 안 모았느냐」가 아니다.
export const EMPTY_HAND_LINE =
  '사초함에 아직 놓을 글이 없다. 그래도 회의는 열린다 — 임금은 근거 없이도 정할 수 있다. 다만 무엇을 딛고 정했는지는 적히지 않는다.'

export const FROZEN_CHOICE_FALLBACK = '아무것도 고르지 못했다'

export { heldIdsOf, heldCardsOf }

// ── 비트에서 읽어 내는 것 ────────────────────────────────────────────────
//
// 데이터가 아직 없는 비트(선생님이 네 회의 가운데 나머지를 채우기 전)에는 빈 배열이
// 나온다. 부르는 쪽은 그 한 줄로 예전의 「고르고 실제를 본다」로 물러선다 —
// 글상자만 없는 그 화면이다. 데이터를 채우는 동안 게임이 깨지지 않게 하는 자리다.
export function claimsOf(beat) {
  const raw = beat?.council?.claims
  if (!Array.isArray(raw)) return []
  return raw
    .filter(c => c && typeof c.text === 'string' && c.text.trim())
    .map((c, i) => ({
      // id 를 안 적어도 된다 — 차례로 짓는다. 무작위가 아니므로 같은 데이터면 같은 id 다.
      id: c.id ?? `claim${i + 1}`,
      who: c.who ?? c.npc ?? '',
      portrait: c.portrait ?? null,
      text: c.text,
      gloss: c.gloss ?? '',
      wants: [...(c.wants ?? [])],
      notes: { ...(c.notes ?? {}) },
    }))
}

export function forecastsOf(beat) {
  const raw = beat?.council?.forecasts
  if (!Array.isArray(raw)) return []
  return raw
    .filter(f => f && typeof f.text === 'string' && f.text.trim())
    .map((f, i) => ({ id: f.id ?? `forecast${i + 1}`, text: f.text, echo: f.echo ?? '' }))
}

export function hasEvidenceStage(beat) {
  return claimsOf(beat).length > 0
}

export function hasForecastStage(beat) {
  return forecastsOf(beat).length > 0
}

export function forecastById(beat, id) {
  return forecastsOf(beat).find(f => f.id === id) ?? null
}

// 놓을 수 있는 문서 — **지금 손에 있는 것 전부**다. 그 말이 가리키는 것만 보여
// 주면 고르기 전에 답이 먼저 보인다(codex-quiz 의 같은 판단). 잃은 문서·약탈당한
// 문서는 state.sources.held 에 이미 없다 — 「그때 손에 있었던 것으로 답한다」.
export function attachableCards(state) {
  return heldCardsOf(state)
}

// 이 회의의 말들이 딛고 선 문서 전부(겹치는 것은 한 번만). 화면이 「사초함에 없던
// 문서」를 적을 때 쓴다 — 셈이 아니라 이름과 자리다.
export function bearingIdsOf(beat) {
  const seen = []
  for (const c of claimsOf(beat)) for (const id of c.wants) if (!seen.includes(id)) seen.push(id)
  return seen
}

// 「그 문서는 …에 있었다」 목록. codex-quiz 의 absentLines 를 그대로 쓴다 —
// 같은 말투를 두 번 적지 않는다. beat.council.origin 에 적어 두면 그 문장이,
// 없으면 카드의 출처가 대신 선다.
export function absentBearing(beat, heldIds = []) {
  return absentLines({ wants: bearingIdsOf(beat), origin: beat?.council?.origin ?? {} }, heldIds)
}

// 이 말이 가리키던 문서인가. **이 값으로 셈하지 말 것** — 화면이 어떤 줄을 붙일지
// 가르는 데만 쓴다. 가리키지 않던 문서를 놓은 것은 잘못이 아니다.
export function bears(claim, sourceId) {
  return (claim?.wants ?? []).includes(sourceId)
}

// 놓은 문서 옆에 붙는 한 줄. 데이터에 적어 둔 것이 있으면 그것을, 없으면 판정 없는
// 한 줄을 쓴다. 빈 줄을 내보내지 않는다.
export function noteFor(claim, sourceId) {
  return claim?.notes?.[sourceId] || NEUTRAL_ATTACH_NOTE
}

// ── 놓은 것 ──────────────────────────────────────────────────────────────
//
// attached 는 { [claimId]: sourceId } 한 겹이다. 화면이 들고 있고, 이 함수들이 읽는다.
// 배열이 아니라 객체인 까닭: 한 말 밑에 하나(ONE_PER_CLAIM)라서, 다시 놓으면
// 그대로 갈아 끼우는 편이 화면과 판정이 어긋나지 않는다.
export function attachmentRows(beat, attached = {}) {
  return claimsOf(beat)
    .filter(c => attached[c.id])
    .map(c => {
      const card = sourceById(attached[c.id])
      return {
        claimId: c.id,
        who: c.who,
        claim: c.text,
        sourceId: attached[c.id],
        title: card?.title ?? attached[c.id],
        excerpt: card?.excerpt ?? '',
        origin: card?.origin ?? '',
        note: noteFor(c, attached[c.id]),
      }
    })
}

// 기록 문장에 들어갈 문서 이름 — 놓은 차례(말의 차례)를 지키고, 같은 문서를 두 말에
// 놓았으면 한 번만 적는다.
export function attachedTitles(beat, attached = {}) {
  const titles = []
  for (const row of attachmentRows(beat, attached)) {
    if (!titles.includes(row.title)) titles.push(row.title)
  }
  return titles
}

// ── 문장 ─────────────────────────────────────────────────────────────────

// 「…을/를」. 한글 받침만 본다 — 『원납전(願納錢)』처럼 괄호로 끝나는 제목은 괄호를
// 벗기고 나서 잰다. 한글이 아닌 글자로 끝나면 「을」로 둔다(한자 음을 짐작하지 않는다).
export function eulReul(word) {
  const bare = String(word ?? '').trim().replace(/[)\]）」』》〉"'.]+$/u, '')
  const last = bare.slice(-1)
  if (!last) return '을'
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '을'
  return (code - 0xac00) % 28 === 0 ? '를' : '을'
}

// 학생이 한 것으로 지어지는 한 문장. **화면도 기록도 이 함수 하나만 부른다** —
// 두 곳에서 따로 지으면 언젠가 어긋나고, 어긋나면 학생이 활동지에 옮겨 적는 문장이
// 화면과 다른 말을 한다(그 산출물이 이 수업의 결과물이다).
export function recordSentence({ choiceText = '', chose = true, titles = [], forecastText = '' } = {}) {
  const evidence = titles.length
    ? `『${titles.join('』·『')}』${eulReul(titles[titles.length - 1])} 근거로 삼아 `
    : '사초함에서 근거를 꺼내지 않고 '
  const decided = chose
    ? `「${String(choiceText).trim()}」 쪽으로 정했`
    : '아무것도 고르지 못했'
  const seen = String(forecastText ?? '').trim()
  return seen
    ? `당신은 ${evidence}${decided}고, 「${seen}」고 보았다.`
    : `당신은 ${evidence}${decided}다.`
}

// 화면이 한 번 부르고, 그 결과를 그대로 보여 주고 그대로 기록에 넘긴다.
//   choiceId  — 고른 선택지 id. 얼어붙은 회의에서는 'frozen'(ui/council-ui.js 가 그 값을 쓴다).
//   attached  — { [claimId]: sourceId }
//   forecastId— 고른 예보 id(없으면 null)
// 돌려주는 것: 화면에 필요한 조각들과, 그 조각들로 지은 문장 하나.
export function councilRecord(beat, { choiceId = null, attached = {}, forecastId = null } = {}) {
  const chose = choiceId !== 'frozen' && choiceId !== null
  const choice = (beat?.council?.choices ?? []).find(c => c.id === choiceId) ?? null
  const choiceText = chose
    ? (choice?.text ?? String(choiceId))
    : (beat?.frozenChoiceLabel ?? FROZEN_CHOICE_FALLBACK)
  const forecast = forecastId ? forecastById(beat, forecastId) : null
  const titles = attachedTitles(beat, attached)
  return {
    chose,
    choiceId,
    choiceText,
    titles,
    rows: attachmentRows(beat, attached),
    forecast,
    forecastText: forecast?.text ?? '',
    note: FORECAST_NOTE,
    sentence: recordSentence({ choiceText, chose, titles, forecastText: forecast?.text ?? '' }),
  }
}

// ── 화면에 넘길 것 ───────────────────────────────────────────────────────
// ui/council-ui.js 가 부르는 유일한 문. 비트에 claims·forecasts 가 없으면 두 값이
// 빈 배열이고, 화면은 그것만 보고 예전 꼴(고르고 실제를 본다)로 물러선다.
export function councilEvidenceView(beat, state) {
  const held = attachableCards(state)
  return {
    question: beat?.council?.question ?? '',
    claims: claimsOf(beat),
    forecasts: forecastsOf(beat),
    held,
    absent: absentBearing(beat, held.map(c => c.id)),
    // 놓을 수 있는 글을 한 장이라도 들었는가. **문을 잠그는 데 쓰지 않는다** —
    // 화면이 말을 어떻게 걸지만 가른다(codex-quiz 의 canAnswer 와 같은 경고다).
    canAttach: held.length > 0,
  }
}
