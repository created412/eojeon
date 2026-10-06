import { createState } from '../core/state.js'
import { ACTS } from '../data/acts.js'
import { sourceById } from '../data/sources.js'
import { enterAct } from './scenario.js'
import { advancePrices } from './prices.js'
import { stopsOfAct, stopFlag } from './outing.js'

const copy = value => JSON.parse(JSON.stringify(value))

// 2026-10-06 선생님: 「사료 문제 틀릴때마다 그 막의 처음으로 돌아가게 만들어보자」.
// 새 막에 들어온 순간을 통째로 보관한다. 카드·화재·선택을 역산하지 않으며,
// 앞 막의 체크포인트를 중첩하지 않아 저장 크기가 매번 배로 늘지 않는다.
export function rememberActStart(state) {
  const { actStart, pendingCards, ...start } = state
  start.beatIndex = 0
  start.beatEntered = false
  start.actOpening = true
  return { ...start, actStart: copy(start) }
}

// 도입 이전 VERSION 7 저장에는 시작 사본이 없다. 막 소속이 기록된 자료만
// 이전 막으로 보존하고, 현재 막의 활동·선택·읽기 완료 표시는 걷어 낸다.
function legacyStart(state) {
  const ai = state.actIndex
  const prior = ACTS.slice(0, ai)
  const priorIds = new Set(prior.map(a => a.id))
  const priorCard = id => (sourceById(id)?.act ?? Infinity) <= ai
  const lossAct = { plunder: 1, fire: 2 }
  const restoreLost = id => (lossAct[state.lostBy?.[id]] ?? -1) >= ai
  const recovered = (state.sources?.lost ?? []).filter(id => priorCard(id) && restoreLost(id))
  const filter = entries => (entries ?? []).filter(priorCard)
  const lost = filter(state.sources?.lost).filter(id => !restoreLost(id))
  const allowedFlags = new Set(prior.flatMap(a => [
    ...a.beats.map(b => b.flag).filter(Boolean), ...stopsOfAct(a).map(s => stopFlag(s.id)),
    ...a.beats.filter(b => b.kind === 'orders').flatMap(b => (b.clauses ?? []).map(c => `orders:${c.id}`)),
  ]))
  const priorStudies = new Set(prior.flatMap(a => a.beats.map(b => b.study).filter(Boolean)))
  const select = (obj, test) => Object.fromEntries(Object.entries(obj ?? {}).filter(([k]) => test(k)))
  return {
    ...createState(), actIndex: ai,
    sources: {
      held: [...new Set([...filter(state.sources?.held), ...recovered])],
      read: [...new Set([...filter(state.sources?.read), ...recovered])], lost,
    },
    decisions: (state.decisions ?? []).filter(d => d.actIndex < ai),
    moves: (state.moves ?? []).filter(m => m.year < ACTS[ai].year),
    flags: select(state.flags, k => allowedFlags.has(k)),
    inquiries: select(state.inquiries, k => priorCard(k) || priorStudies.has(k)),
    lostBy: select(state.lostBy, k => lost.includes(k)),
    freedom: { hubs: select(state.freedom?.hubs, k => priorIds.has(k.split('/')[0])) },
    codexAnswers: select(state.codexAnswers, k => priorIds.has(k)),
    // 물건 설명을 열람한 기억은 사료 정답·활동 완료와 무관하다.
    lore: copy(state.lore ?? { seen: [] }),
  }
}

export function restartActState(state) {
  const saved = state.actStart
  const valid = saved?.version === state.version && saved.actIndex === state.actIndex && saved.beatIndex === 0
  const base = valid ? copy(saved) : legacyStart(state)
  const start = advancePrices(enterAct(base, ACTS[state.actIndex], state.actIndex), state.actIndex + 1)
  return rememberActStart(start)
}

export function ensureActStart(state) {
  if (state.actStart?.actIndex === state.actIndex && state.actStart?.beatIndex === 0) return state
  return { ...state, actStart: restartActState(state).actStart }
}
