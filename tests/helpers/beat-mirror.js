// ── 기존 90비트 선형 경로의 회귀 기준 ──────────────────────────────────
// 자유 여정의 실제 실행은 tests/freedom-full-run.test.js가 main.runBeats 본문으로 검사한다.
// 이 파일은 기존 순서로 모든 보고를 본 경우의 사료·손실·저장 효과를 대조하는 기준이다.
// 아래의 ‘거울’ 설명은 자유 여정을 도입하기 전 선형 진행에 관한 것이다.
//
// main.js 의 진행자(runBeats·playAct·finishAct)는 boot() 클로저 안에 있고 캔버스·
// three.js 없이는 Node 에서 띄울 수 없다. 그래서 같은 계약을 순수 함수만으로 재현한
// 「거울」을 여기 둔다 — main.js 의 각 play*() 핸들러가 부르는 것과 같은 순수 함수
// (codex.js · loss-log.js · relocate.js · scenario.js)만 쓴다.
//
// ⚠ runBeats() 를 고치면 여기도 같이 고쳐야 한다. 둘이 어긋나면 이 거울을 쓰는
//   시험들(resume-safety · full-run)이 초록불인 채로 아무것도 지키지 않는다.
//   비트 종류가 늘었는데 거울이 모르는 것은 tests/resume-safety.test.js 의
//   MIRRORED 검사가 잡는다(판정 R62).
//
// 두 시험이 이 한 벌을 함께 쓴다 — 베껴 두면 반드시 갈린다.
import { ACTS } from '../../src/data/acts.js'
import { beatAt, isActOver, applyBeat, advance, enterAct, isBeatActive, applyGrant } from '../../src/systems/scenario.js'
import { plunder } from '../../src/systems/codex.js'
import { recordPreservation } from '../../src/systems/preservation.js'
import { recordLoss } from '../../src/systems/loss-log.js'
import { relocate } from '../../src/systems/relocate.js'
import { advancePrices } from '../../src/systems/prices.js'
import { isStopDone, markStopPaid, markStopDone, pendingStopId, stopById } from '../../src/systems/outing.js'
import { spend } from '../../src/core/clock.js'
import { serialize, deserialize } from '../../src/core/state.js'

// 거울이 아는 비트 종류. 여기 없는 종류가 막에 쓰이면 resume-safety 의 검사가 운다.
export const MIRRORED_KINDS = new Set([
  'note', 'explore', 'dispatch',                                       // 상태에 남기는 것이 없다
  'audience', 'procession',                                             // 알현·행렬 — 문서는 applyGrant 가 준다(아래 공통 경로)
  'council', 'orders', 'plunder', 'salvage', 'brush', 'move', 'rush',   // 1~3단계
  'hold', 'edict', 'escape', 'outing',                                  // 3단계가 더한 것
])

// caught — 촉박(rush)을 놓쳤는가. 이 게임의 조건 비트는 전부 여기서 갈린다
// (queen-lost · flight-caught · sootied). 거울이 한쪽 길만 걸으면 다른 쪽 길의
// 비트들은 아무 시험도 받지 못한다 — 그래서 두 값을 다 걸어 본다.
export function firstChoiceDecider(beat, state, caught = true) {
  switch (beat.kind) {
    case 'council':
      return { ...state, decisions: [...state.decisions, { actIndex: state.actIndex, choiceId: beat.council.choices[0].id, reason: '시험' }] }
    case 'orders': {
      const picked = (beat.clauses ?? []).slice(0, 1).map(c => c.id)
      const flags = { ...state.flags }
      for (const id of picked) flags[`orders:${id}`] = true
      return {
        ...state,
        flags,
        decisions: [...state.decisions, { actIndex: state.actIndex, choiceId: `orders:${picked.join('+') || 'none'}`, reason: '시험' }],
      }
    }
    case 'plunder': {
      const taken = (beat.cardIds ?? []).filter(id => state.sources.held.includes(id))
      return recordLoss(plunder(state, taken), taken, 'plunder')
    }
    case 'salvage': {
      const picked = (beat.treasures ?? []).slice(0, beat.pick ?? 2).map(t => t.id)
      return recordPreservation(state, beat.id, { selected: picked, reason: '명령을 증명하는 도장이 먼저다.' }, (beat.treasures ?? []).map(t => t.id))
    }
    // 친필은 상태에 남기는 것이 없다 — 카드를 쥐여 주는 것은 종류와 무관하게
    // runAct 가 applyGrant() 로 한다(main.js 의 playBeat 이 그 자리에 있다).
    case 'brush':
      return state
    case 'move':
      return relocate(state, { year: beat.year, from: state.palace, to: beat.palace, cause: beat.cause, self: beat.self === true })
    case 'rush':
      return beat.caughtFlag && caught ? { ...state, flags: { ...state.flags, [beat.caughtFlag]: true } } : state
    // ── 3단계가 더한 네 갈래. 이 셋을 빠뜨리면 거울이 「아무 일도 안 일어나는 비트」로 잘못 안다.
    // 조작권 D 장면 — 화면만 있고 상태에 남기는 것이 없다(main.js 의 playHold).
    case 'hold':
      return state
    // 국상 — playEdict 이 beat.flag 를 세운다(지금 데이터에는 flag 가 없지만 규약은 그렇다).
    case 'edict':
      return beat.flag ? { ...state, flags: { ...state.flags, [beat.flag]: true } } : state
    // 왕비의 탈출 — 고른 것이 'escape.<단계id>' 로 깃발에 남는다(main.js 의 playEscape).
    // 어느 것을 고르는지는 이 시험의 관심이 아니므로 첫 선택지를 고른다. 선택지 목록을
    // 여기 베껴 적지 않는다 — 비트 자신의 view.steps 에서 뽑아, 데이터가 바뀌면 따라 움직인다.
    case 'escape': {
      const flags = { ...state.flags }
      for (const step of beat.view?.steps ?? []) flags[`escape.${step.id}`] = step.options[0].id
      return { ...state, flags }
    }
    // 나들이 — 지금은 stops 안에만 있어 이 루프에 안 걸리지만(그쪽은 아래 나들이
    // 시험이 본다), 언젠가 비트로 올라와도 거울이 조용히 틀리지 않도록 자리를 둔다.
    case 'outing':
      return state
    default:
      return state
  }
}


// ── 나들이(stop) — 비트 목록에 없는 저장 지점 두 자리 ─────────────────────
//
// 나들이는 비트가 아니다. 탐색하는 낮 안에서 벌어지고, 데이터로는 explore 비트의
// stops[] 안에 있다. 그래서 이 거울의 비트 루프는 나들이를 **한 번도 지나가지
// 않았다** — main.js 의 runStop() 이 거기서 두 번 저장하는데(값을 치른 직후 ·
// 화면을 다 본 직후), 「모든 저장 지점에서 이어해 본다」는 시험의 저장 지점 목록에
// 그 둘이 아예 없었던 것이다. 값만 치르고 카드를 잃는 결함이 그 틈으로 지나갔다.
//
// 이제 거울도 그 두 자리를 지난다. main.js 의 순서 그대로다:
//   pressE()  → spend() → markStopPaid() → saveGame()   ← 값을 치른 자리
//   runStop() → playBeat()(=applyGrant) → markStopDone() → saveGame()
function walkStops(beat, state, { actId, played, saves }) {
  for (const stop of beat.stops ?? []) {
    if (isStopDone(state, stop.id)) continue          // 이미 다녀왔다 — 두 번 나가지 않는다
    const r = spend(state, stop.placeId)
    if (!r.ok) continue                                // 해가 모자라면 못 나간다(pressE 의 'no-time')
    state = markStopPaid(r.state, stop.id)
    // inside — 이 저장은 비트 **안**이다. 그 비트는 아직 안 끝났으므로, 이어하면
    // 다시 도는 것이 옳다(시험이 「끝낸 비트가 다시 돌았다」로 오해하지 않게 표시한다).
    saves?.push({ at: `${actId}/${beat.id}:${stop.id} 값을 치름`, inside: `${actId}/${beat.id}`, json: serialize(state) })
    // 화면을 본다. 카드를 쥐여 주는 것은 종류와 무관하게 playBeat() 한 자리다.
    state = applyGrant(state, stop.beat)
    state = markStopDone(state, stop.id)
    played?.push(`${actId}/${beat.id}:${stop.id}`)
    saves?.push({ at: `${actId}/${beat.id}:${stop.id}`, inside: `${actId}/${beat.id}`, json: serialize(state) })
  }
  return state
}

// 이어하기가 나들이 한가운데를 지날 때 — main.js 의 resumePendingStop() 과 같은 계약이다.
// 치른 값은 되돌리지 않고, 못 본 화면을 다시 열어 준다(그래서 카드도 그때 들어온다).
function resumePendingStop(state, act, { actId, played, saves } = {}) {
  const stopId = pendingStopId(state)
  if (!stopId) return state
  const stop = stopById(act, stopId)
  if (stop) {
    state = applyGrant(state, stop.beat)
    played?.push(`${actId}/${stopId} 다시 열림`)
  }
  state = markStopDone(state, stopId)
  saves?.push({ at: `${actId}/${stopId} 다시 열림`, json: serialize(state) })
  return state
}

// runBeats() 의 실제 루프와 같은 모양이다: beatAt → (resumeMidBeat 가 아니면) applyBeat →
// 비트를 처리 → advance() → 저장. stopAfter 가 있으면 그 비트를 처리·advance 까지
// 마친 뒤 멈춘다 — "그 시점에서 저장하고 탭을 닫았다"를 흉내 낸다.
export function runAct(act, initialState, { resumeMidBeat = false, stopAfter = null, invoked, caught = true } = {}) {
  let state = resumePendingStop(initialState, act, { actId: act.id })
  let skipApply = resumeMidBeat
  while (!isActOver(state, act)) {
    const beat = beatAt(act, state.beatIndex)
    // 3단계 — 조건이 안 맞는 비트는 재생하지 않는다(main.js 의 runBeats 와 같은 자리·같은 순서).
    // 이 줄이 없으면 거울이 실제보다 많은 비트를 돌려, 「끝난 비트가 다시 돌지 않는다」를
    // 엉뚱한 비트 목록으로 검사하게 된다. beatEntered 를 false 로 두는 것까지 같다 —
    // 들어간 적이 없는 비트이므로 여기서 저장된 기록을 이어받아도 resumeMidBeat 가 되면 안 된다.
    if (!isBeatActive(state, beat)) {
      state = { ...advance(state), beatEntered: false }
      skipApply = false
      continue
    }
    // beatEntered — main.js 의 runBeats() 가 state 에 얹는 것과 같은 표시. 이어하기가
    // resumeMidBeat 를 정할 때 beatIndex 나 비트 종류를 짐작하지 않고 이 값을 그대로
    // 믿는다(main.js 의 resumeAct() 참고) — 그래서 이 시험도 똑같이 표시해 둔다.
    if (!skipApply) state = { ...applyBeat(state, beat), beatEntered: true }
    skipApply = false
    invoked.push(beat.id)
    state = walkStops(beat, state, { actId: act.id })
    state = firstChoiceDecider(beat, state, caught)
    // 카드를 쥐여 주는 것은 비트 종류에 달려 있지 않다 — main.js 의 playBeat() 이
    // 화면을 다 본 뒤 이 한 자리에서 한다. 규칙을 여기 다시 적지 않고 그 함수를 부른다.
    state = applyGrant(state, beat)
    state = { ...advance(state), beatEntered: false }   // CRITICAL 1 의 자리 — 저장은 언제나 이 다음이다
    if (beat.id === stopAfter) break
  }
  return state
}

// ── 1막부터 5막 끝까지 한 번에 걸어간다 (Task 15) ────────────────────────
//
// main.js 의 playAct() → runBeats() → finishAct() → nextAct() → playAct() 사슬을
// 그대로 흉내 낸다. 막 하나짜리 runAct() 로는 절대 못 보는 것을 본다: 막이 넘어갈 때
// 무엇이 이어지고 무엇이 되돌아가는가.
//
//   playAct(i) = enterAct(state, ACTS[i], i) → advancePrices(state, i+1) → runBeats()
//   finishAct() = (마지막이 아니면) flow.nextAct() → playAct(다음)
//
// resumed 가 참이면 첫 막은 enterAct 를 다시 먹이지 않는다 — 이미 그 막 안에 있던
// 세션을 이어받는 것이므로(main.js 의 resumeAct 가 하는 그대로), 저장된 beatEntered
// 를 그대로 믿어 resumeMidBeat 를 정한다.
export function playThrough(startState, { caught = true, pauseAfter = null, resumed = false } = {}) {
  const played = []            // '막id/비트id' 순서대로
  const saves = []             // 매 저장 지점의 { at, json } — 실제 saveGame() 이 부르는 그 자리
  let state = startState
  let first = true

  for (;;) {
    const i = state.actIndex
    const act = ACTS[i]
    let skipApply = false
    if (first && resumed) {
      skipApply = state.beatEntered === true
      // 나들이 한가운데서 끊긴 세션이면, 못 본 화면을 먼저 다시 열어 준다
      state = resumePendingStop(state, act, { actId: act.id, played, saves })
    } else {
      state = enterAct(state, act, i)
      state = advancePrices(state, i + 1)
    }
    first = false

    while (!isActOver(state, act)) {
      const beat = beatAt(act, state.beatIndex)
      if (!isBeatActive(state, beat)) {
        state = { ...advance(state), beatEntered: false }
        skipApply = false
        saves.push({ at: `${act.id}/${beat.id} 건너뜀`, json: serialize(state) })
        continue
      }
      if (!skipApply) state = { ...applyBeat(state, beat), beatEntered: true }
      skipApply = false
      played.push(`${act.id}/${beat.id}`)
      state = walkStops(beat, state, { actId: act.id, played, saves })
      state = firstChoiceDecider(beat, state, caught)
      state = applyGrant(state, beat)
      state = { ...advance(state), beatEntered: false }
      saves.push({ at: `${act.id}/${beat.id}`, json: serialize(state) })
      if (pauseAfter === `${act.id}/${beat.id}`) return { state, played, saves, paused: true }
    }

    // finishAct() — 막 끝 화면을 보이고, 남은 막이 있으면 다음 막으로 넘어간다
    if (i + 1 >= ACTS.length) return { state, played, saves, paused: false }
    state = { ...state, actIndex: i + 1 }   // flow.nextAct()
  }
}

// 「저장하고 탭을 닫았다가 다시 열었다」 — 세이브를 실제로 글자로 만들어 되읽는다.
// deserialize() 는 version 이 다르면 null 을 준다: 그것까지 이 자리에서 겪는다.
export function reopen(json) {
  const saved = deserialize(json)
  if (!saved) throw new Error('세이브를 되읽지 못했다 — version 이 어긋났다')
  return saved
}
