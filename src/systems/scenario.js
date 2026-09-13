// 비트 시나리오 엔진 — 순수 함수만 담는다. DOM 도 렌더 루프도 모른다.
// 2막(10비트)·3막(15비트)을 main.js 의 if 문으로 쓰면 손도 못 댄다. 막의 흐름을
// acts.js 에 선언으로 적고, 이 파일이 상태 전이를 맡고, main.js 는 비트 종류별
// 핸들러를 await 으로 이어 붙이는 얇은 진행자가 된다.
import { RANK } from '../core/control.js'
import { DAY_UNITS } from '../core/clock.js'
import { pickUp, markRead } from './codex.js'

export function beatsOf(act) {
  return act?.beats ?? []
}

export function beatAt(act, i) {
  return beatsOf(act)[i] ?? null
}

export function isActOver(state, act) {
  return state.beatIndex >= beatsOf(act).length
}

// 사초함과 결정 기록은 막을 넘어 이어진다 — 여기서 손대는 것은 이 막 자체가
// 정하는 값(궁·조작권·비트 위치·낮)뿐이다. room 도 함께 지운다 — 이전 막의 좌표계에
// 남아 있던 방 id 를 새 궁으로 들고 오면 안 되기 때문이다.
export function enterAct(state, act, actIndex) {
  return {
    ...state,
    actIndex,
    beatIndex: 0,
    palace: act.palace,
    control: act.control,
    dayLeft: DAY_UNITS,
    room: null,
  }
}

// 조건 비트 — 「실패해도 역사는 바뀌지 않는다. 달라지는 것은 왕이 무엇을 아는가뿐이다」
// (설계서 7.6). 조건은 깃발 이름 문자열 둘뿐이다. 함수를 데이터에 넣지 않는다 —
// acts.js 는 저장·직렬화·정합성 검사를 지나가는 순수 데이터여야 한다.
//
// ⚠ 조건이 붙은 비트는 궁·조작권·낮을 정하면 안 된다. 정적으로 막을 걸어가는 도구들
// (controlTimeline·palaceTimeline·place-cost 의 exploreDays)이 실제 플레이와 어긋나기 때문이다.
// systems/branch.js 의 unsafeConditionalBeats() 가 그것을 검사하고, acts 테스트가 모든 막에 건다.
export function isBeatActive(state, beat) {
  if (!beat) return false
  const flags = state?.flags ?? {}
  if (beat.whenFlag && flags[beat.whenFlag] !== true) return false
  if (beat.unlessFlag && flags[beat.unlessFlag] === true) return false
  return true
}

export function applyBeat(state, beat) {
  if (!beat) return state
  let next = state
  if (beat.palace && beat.palace !== next.palace) next = { ...next, palace: beat.palace }
  if (beat.control && beat.control !== next.control) next = { ...next, control: beat.control }
  if (beat.dayUnits != null && beat.dayUnits !== next.dayLeft) next = { ...next, dayLeft: beat.dayUnits }
  if (beat.flag) next = { ...next, flags: { ...next.flags, [beat.flag]: true } }
  return next
}

export function advance(state) {
  return { ...state, beatIndex: state.beatIndex + 1 }
}

// 비트가 카드를 쥐여 주는 규칙 — 비트 종류에 달려 있지 않다. 화면을 다 본 「뒤에」 준다.
//
// ⚠ 왜 여기 한 자리에 있는가. 예전에는 이 규칙이 두 군데에 따로 적혀 있었고, 서로
// 달랐다: main.js 는 playBrush()·playOuting() 안에서만 줬고(그래서 kind:'note' 인
// 4막의 제물포·속방 두 장이 게임 안에서 얻을 길이 없었다), systems/branch.js 의
// dryRun() 은 종류를 안 가리고 줬다(그래서 시험은 초록불이었다). 두 모듈이 갈리면
// dryRun 의 증명이 거짓이 된다 — 그 일이 실제로 일어났다. 이제 둘 다 이 함수를 부른다.
// 갈리게 만들려면 이 함수를 안 쓰는 자리를 새로 만들어야 하고, 그건 눈에 띈다.
//
// 알현 비트(kind:'audience')는 찾아온 사람마다 문서를 건넨다 — grantCard 한 장이
// 아니라 visitors[].grantCards 여러 장이다. **그 목록도 여기서 읽는다.** 예전에
// 갈렸던 그 자리를 다시 만들지 않으려면, 「무엇을 주는가」의 답이 이 한 함수여야 한다.
// tests/data/integrity.test.js 의 도달성 검사도 이 함수를 가져다 쓴다.
// 찾아온 사람 하나가 건네는 문서. 화면(main.js 의 speakVisitor)도 이 함수로 묻는다 —
// 필드 이름을 두 곳에서 읽으면 한쪽만 고쳐지는 날이 온다. 실제로 왔다.
export function visitorCardIds(visitor) {
  return visitor?.grantCards ?? []
}

export function grantedIdsOf(beat) {
  const out = []
  if (beat?.grantCard) out.push(beat.grantCard)
  for (const v of beat?.visitors ?? []) out.push(...visitorCardIds(v))
  return out
}

export function applyGrant(state, beat) {
  let next = state
  for (const id of grantedIdsOf(beat)) next = markRead(pickUp(next, id), id)
  return next
}

// 회의 화면에서 넘어갈 길이 하나라도 있는가 — 「막다른 회의가 없다」 불변식의 판정.
// 선택지를 잠그는 까닭은 셋이다(ui/council-ui.js 의 gateChoices): 사료(requires) ·
// 모르는 일(needsFlag) · 얼어붙음(frozen). requires 만 보면 「requires 가 빈 유일한
// 선택지에 needsFlag 가 붙은, 얼지 않은 회의」가 누를 단추 하나 없는 영구 정지
// 화면인 채로 초록불을 받는다. 얼어붙은 회의는 고를 단추가 없는 것이 설계이고
// frozenLabel 단추가 길이므로 따로 통과시킨다.
// 시험 두 곳(tests/data/acts.test.js · tests/data/integrity.test.js)이 이 하나를 함께 쓴다.
export function hasWayForward(beat) {
  if (beat?.frozen === true) return true
  return (beat?.council?.choices ?? [])
    .some(c => (c.requires ?? []).length === 0 && !c.needsFlag)
}

// 이 비트에 이르렀을 때 몇 년인가. 막의 해에서 시작해, 지나온 비트 중 해를 정한
// 것(이어 비트 따위)이 있으면 그것으로 갈아 낀다. dateLabelAtBeat(main.js)과 같은
// 모양이다 — 임금의 나이(systems/king-age.js)가 이 값에 달려 있다.
export function yearAtBeat(act, beatIndex) {
  let year = act?.year ?? null
  const beats = beatsOf(act)
  for (let i = 0; i <= beatIndex && i < beats.length; i++) {
    if (Number.isFinite(beats[i]?.year)) year = beats[i].year
  }
  return year
}

export function controlTimeline(act) {
  let c = act.control
  const out = [c]
  for (const b of beatsOf(act)) {
    if (b.control && b.control !== c) { c = b.control; out.push(c) }
  }
  return out
}

export function palaceTimeline(act) {
  let p = act.palace
  const out = [p]
  for (const b of beatsOf(act)) {
    if (b.palace && b.palace !== p) { p = b.palace; out.push(p) }
  }
  return out
}

export function peakControl(act) {
  return controlTimeline(act).reduce((best, c) => (RANK[c] > RANK[best] ? c : best))
}

export function endControl(act) {
  const t = controlTimeline(act)
  return t[t.length - 1]
}
