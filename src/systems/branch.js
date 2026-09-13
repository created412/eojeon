// 「실패해도 역사는 바뀌지 않는다」(설계서 설계 원칙 4 · 7.6)를 주석이 아니라 계산으로 지킨다.
// 이 모듈은 게임이 돌 때 쓰이지 않는다 — 테스트가 두 경로를 실제로 걸어가 비교하는 데 쓴다.
// 그래서 4막 데이터를 누가 나중에 고쳐 실패가 역사를 바꾸게 만들면 그 자리에서 빨개진다.
import { beatsOf, beatAt, enterAct, applyBeat, advance, isActOver, isBeatActive, applyGrant } from './scenario.js'
import { plunder, survive } from './codex.js'
import { recordLoss } from './loss-log.js'

// 상태에서 「역사에 해당하는 것」만 뽑는다. 여기 없는 것(flags·decisions·beatIndex·room·blocked)은
// 「왕이 무엇을 아는가」와 「학생이 무엇을 했는가」이지 일어난 일이 아니다.
export function historyOf(state) {
  return {
    palace: state.palace,
    control: state.control,
    riceIndex: state.riceIndex,
    moves: state.moves ?? [],
    sources: {
      held: [...(state.sources?.held ?? [])].sort(),
      read: [...(state.sources?.read ?? [])].sort(),
      lost: [...(state.sources?.lost ?? [])].sort(),
    },
  }
}

export function sameHistory(a, b) {
  return JSON.stringify(historyOf(a)) === JSON.stringify(historyOf(b))
}

export function knowledgeDiff(a, b) {
  const fa = a?.flags ?? {}
  const fb = b?.flags ?? {}
  const keys = new Set([...Object.keys(fa), ...Object.keys(fb)])
  return [...keys].filter(k => fa[k] !== fb[k])
}

// main.js 의 runBeats() 를 부수효과 없이 그대로 흉내 낸다 — 순서·건너뛰기·번호 증가가 같다.
// ⚠ runBeats() 를 고치면 여기도 같이 고쳐야 한다. 둘이 어긋나면 이 모듈의 증명이 거짓이 된다.
// ⚠ 흉내 내지 않는 것: 이어 기록(relocate)·결정 기록·화면. 이어는 playMove() 가 relocate() 로
//    남기므로 여기서는 state.moves 가 늘 비어 있고, 그래서 historyOf 의 moves 비교는
//    두 경로 모두 빈 배열끼리 견주는 셈이다. 대신 palace 가 비트마다 그대로 옮겨 가므로
//    「어디에 서서 막을 나오는가」는 정확히 견준다 — 테스트가 그 값을 직접 단정한다.
// ⚠ kind: 'plunder'/'salvage' 는 main.js 의 playPlunder()/playSalvage() 가 하는 그대로,
//    codex.js(잠금)의 plunder()/survive() 와 loss-log.js 의 recordLoss() 를 직접 불러
//    흉내 낸다 — 규칙을 여기 다시 적으면(예: "가진 것만 잃는다") main.js 가 바뀔 때
//    말없이 어긋난다. salvage 는 학생이 무엇을 들고 나갈지 화면에서 고르는 장면이라
//    dryRun 에는 그 화면이 없다 — 가진 것을 통째로 survive() 에 넘겨 codex.js 자신이
//    정한 상한(MAX_SURVIVORS)만큼만 남게 하고, 사라진 나머지를 doomed 로 셈한다.
export function dryRun(act, state, actIndex = 0) {
  let s = enterAct(state, act, actIndex)
  // enterAct 는 궁·조작권·비트 번호·낮을 이 막의 것으로 되돌리지만 깃발은 그대로 둔다 —
  // 앞 막에서 알게 된 것은 막이 바뀐다고 잊히지 않는다.
  s = { ...s, flags: { ...(state.flags ?? {}) } }
  const played = []
  const historical = []
  while (!isActOver(s, act)) {
    const beat = beatAt(act, s.beatIndex)
    if (isBeatActive(s, beat)) {
      s = applyBeat(s, beat)
      // 비트가 카드를 쥐여 주는 것도 그대로 흉내 낸다 — 두 경로가 끝내 같은 사초함을
      // 가지는지가 「역사가 같은가」의 핵심이기 때문이다(playBrush·playOuting 이 하는 일과 같다)
      // 카드를 쥐여 주는 규칙은 여기 다시 적지 않는다 — main.js 의 playBeat() 이 부르는
      // 바로 그 함수를 부른다(scenario.js 의 applyGrant). 규칙을 두 곳에 적었다가
      // 소리 없이 갈렸던 것이 4막 제물포·속방 두 장을 못 얻게 만든 결함이다.
      s = applyGrant(s, beat)
      if (beat.kind === 'plunder') {
        // playPlunder() 와 같은 계산: 가지고 있지 않은 것은 잃을 것도 없다.
        const taken = (beat.cardIds ?? []).filter(id => s.sources.held.includes(id))
        s = plunder(s, taken)
        s = recordLoss(s, taken, 'plunder')
      } else if (beat.kind === 'salvage') {
        // playSalvage() 와 같은 계산: doomed 는 survive() 를 부른 "결과"에서 거꾸로 셈한다 —
        // MAX_SURVIVORS 를 여기서 다시 알 필요가 없다.
        const before = s.sources.held
        s = survive(s, before)
        const doomed = before.filter(id => !s.sources.held.includes(id))
        s = recordLoss(s, doomed, 'fire')
      }
      played.push(beat.id)
      if (beat.historical === true) historical.push(beat.id)
    }
    s = advance(s)
  }
  return { state: s, played, historical }
}

// 조건이 붙은 비트가 정하면 안 되는 것들.
// palace·control·dayUnits — 정적으로 막을 걸어가는 도구들(controlTimeline·palaceTimeline·
//   place-cost 의 exploreDays)이 실제 플레이와 어긋나기 때문이다.
// grantCard·cardIds — [리뷰 I4] 이 둘은 historyOf() 의 sources 를 직접 바꾼다.
//   조건부 비트가 카드를 쥐여 주면 두 경로의 사초함이 갈리고, 그것은
//   「실패해도 역사는 바뀌지 않는다」를 정면으로 어기는 데이터다. dryRun() 을 양쪽으로
//   돌려보면 잡히지만 그 비교를 안 해볼 수 있다 — 그래서 여기서 정적으로 막는다.
//   (같은 모양의 구멍을 tests 쪽 hasWayForward 에서 방금 닫았다. 이것이 그 형제다.)
// visitors — 알현 비트가 문서를 건네는 자리다(scenario.js grantedIdsOf). grantCard 와
//   똑같은 이유로 조건부 비트에 달리면 안 된다: 한쪽 경로만 그 문서를 갖게 된다.
const GUARDED_FIELDS = ['palace', 'control', 'dayUnits', 'grantCard', 'cardIds', 'visitors']

// 이 kind 들은 필드 하나가 아니라 kind 자체가 historyOf() 의 sources 를 바꾼다
// (codex.js 의 plunder()/survive() 를 통해서 — 위 dryRun 이 흉내 내는 바로 그 효과다).
// 새 kind 를 추가할 때 그것이 held/read/lost 를 건드리면 여기도 같이 늘려야 한다.
const MUTATING_KINDS = ['plunder', 'salvage']

export function unsafeConditionalBeats(act) {
  const out = []
  for (const b of beatsOf(act)) {
    if (!b.whenFlag && !b.unlessFlag) continue
    for (const field of GUARDED_FIELDS) {
      if (b[field] != null) out.push({ id: b.id, field })
    }
    if (MUTATING_KINDS.includes(b.kind)) out.push({ id: b.id, field: 'kind' })
    // historical: true 는 「일어난 일 그 자체」라는 표시다(설계서 7.6 · 4막 국상 비트).
    // 그 표시를 단 비트가 조건까지 걸리면 한쪽 경로만 그 일을 겪는 꼴이 된다 —
    // "성공해도 역사는 바뀌지 않는다"를 정면으로 어기는 데이터다. dryRun() 의
    // historical 배열 비교만으로는 실수를 걸러내지 못한다(양쪽을 각각 재생해야
    // 드러나는데, 그 비교조차 안 해볼 수 있다) — 그래서 여기서 정적으로 막는다.
    if (b.historical === true) out.push({ id: b.id, field: 'historical' })
  }
  return out
}
