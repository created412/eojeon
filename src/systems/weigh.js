// 임금의 저울 — 셈. 들은 말을 추로 올리고, 기운 저울을 보고, 정한다.
//
// 판의 꼴과 사료는 data/weigh.js 머리말에 있다. 이 파일은 셈만 한다. DOM 도 시계도 모른다.
//
// 걸음: intro → hearing(여섯 대신에게 묻는다) → weights(추를 하나씩 올린다) → decide(정한다)
//       → actual(실제의 일이 저울 위에서 벌어진다) → closing(견준다) → done
//
// ⚠ 맞는 답이 없다. 어느 쪽에 얼마나 무겁게 올렸는지는 깎지도 매기지도 않는다 — 기록에 남길 뿐이다.
//   읽지 않고 넘기는 것만 막는다: 여섯을 다 듣고, 「답한 사람이 몇인가」에 답해야 저울 앞에 앉는다.

export const HEFTS = [1, 2, 3]
export const HEFT_LABEL = { 1: '가볍게', 2: '무겁게', 3: '아주 무겁게' }
// 도장의 무게 — 무엇을 얼마나 올렸든 저울을 여는 쪽으로 내려앉힌다(실제의 역사는 바뀌지 않는다).
export const SEAL_HEFT = 30
export const ASK_HINT_AFTER = 2

export function initialWeigh() {
  return { stage: 'intro', heard: [], askMisses: 0, asked: false, placed: {}, order: [], choice: null, step: 0 }
}

const ministersOf = data => data?.hearing?.ministers ?? []
const weightsOf = data => data?.weights ?? []
export const weightById = (data, id) => weightsOf(data).find(w => w.id === id) ?? null
export const readingOf = (weight, id) => (weight?.readings ?? []).find(r => r.id === id) ?? null

export function begin(state) {
  return state.stage === 'intro' ? { ...state, stage: 'hearing' } : state
}

// ── 대신들에게 묻는다 ─────────────────────────────────────────────────────
export function hear(data, state, id) {
  if (state.stage !== 'hearing' || state.heard.includes(id) || !ministersOf(data).some(m => m.id === id)) return state
  return { ...state, heard: [...state.heard, id] }
}
export const allHeard = (data, state) => ministersOf(data).every(m => state.heard.includes(m.id))

/** 다 듣고 나서 묻는 하나. 여섯을 다 듣기 전에는 답할 수 없다. */
export function answerAsk(data, state, optionId) {
  const ask = data?.hearing?.ask
  if (state.stage !== 'hearing' || state.asked || !ask || !allHeard(data, state)) return { state, ok: false, say: '' }
  const option = ask.options.find(o => o.id === optionId)
  if (!option) return { state, ok: false, say: '' }
  if (option.id === ask.answer) return { state: { ...state, asked: true }, ok: true, say: ask.ok ?? '' }
  return { state: { ...state, askMisses: state.askMisses + 1 }, ok: false, say: option.say ?? '' }
}
export function askHint(data, state) {
  return !state.asked && state.askMisses >= ASK_HINT_AFTER ? data.hearing.ask.answer : null
}
export function sit(data, state) {
  return state.stage === 'hearing' && state.asked ? { ...state, stage: 'weights' } : state
}

// ── 추를 올린다 ───────────────────────────────────────────────────────────
/** 지금 손에 든 추(아직 올리지도 내려놓지도 않은 첫 추). */
export function currentWeight(data, state) {
  if (state.stage !== 'weights') return null
  return weightsOf(data).find(w => !state.placed[w.id]) ?? null
}
export const weightIndex = (data, state) => state.order.length

/**
 * 추를 올린다(또는 내려놓는다). 차례는 정해져 있다 — 지금 손에 든 추만 놓을 수 있다.
 * 읽는 길이 'none' 이면 저울에 오르지 않는다(무게를 묻지 않는다).
 */
export function place(data, state, weightId, readingId, heft = null) {
  const weight = currentWeight(data, state)
  if (!weight || weight.id !== weightId) return state
  const reading = readingOf(weight, readingId)
  if (!reading) return state
  const onScale = reading.side !== 'none'
  if (onScale && !HEFTS.includes(heft)) return state
  const placed = { ...state.placed, [weightId]: { reading: readingId, side: reading.side, heft: onScale ? heft : 0 } }
  const order = [...state.order, weightId]
  const done = weightsOf(data).every(w => placed[w.id])
  return { ...state, placed, order, stage: done ? 'decide' : 'weights' }
}

// ── 저울 ─────────────────────────────────────────────────────────────────
/** 「실제로는」에서 지금까지 저울을 떠난 추들. */
export function liftedOf(data, state) {
  if (state.stage !== 'actual' && state.stage !== 'closing' && state.stage !== 'done') return []
  const steps = actualSteps(data, state)
  const upto = state.stage === 'actual' ? state.step : steps.length - 1
  return steps.slice(0, upto + 1).flatMap(s => s.lifts ?? []).filter(id => state.placed[id]?.side && state.placed[id].side !== 'none')
}
export function sealed(data, state) {
  if (state.stage === 'closing' || state.stage === 'done') return true
  if (state.stage !== 'actual') return false
  return actualSteps(data, state).slice(0, state.step + 1).some(s => s.seal)
}

/** 한쪽 접시에 지금 놓인 추들(올린 차례대로). */
export function onPan(data, state, side) {
  const lifted = new Set(liftedOf(data, state))
  return state.order.filter(id => state.placed[id].side === side && !lifted.has(id))
    .map(id => ({ ...weightById(data, id), heft: state.placed[id].heft }))
}
/** 저울에 올리지 않은 추들. */
export function setAside(data, state) {
  return state.order.filter(id => state.placed[id].side === 'none').map(id => weightById(data, id))
}
export function panLoad(data, state, side) {
  const own = onPan(data, state, side).reduce((sum, w) => sum + w.heft, 0)
  return own + (side === 'open' && sealed(data, state) ? SEAL_HEFT : 0)
}
/** 여는 쪽이 얼마나 더 무거운가(음수면 닫는 쪽). */
export const tilt = (data, state) => panLoad(data, state, 'open') - panLoad(data, state, 'shut')
export function leanOf(data, state) {
  const t = tilt(data, state)
  return t > 0 ? 'open' : t < 0 ? 'shut' : 'level'
}
/** 학생이 올린 대로의 기울기 — 「실제로는」이 손대기 전의 저울. */
export function ownLean(data, state) {
  let t = 0
  for (const id of state.order) {
    const p = state.placed[id]
    if (p.side === 'open') t += p.heft
    if (p.side === 'shut') t -= p.heft
  }
  return t > 0 ? 'open' : t < 0 ? 'shut' : 'level'
}
/** 가장 무겁게 올린 추들(같은 무게면 모두). 하나도 올리지 않았으면 빈 배열. */
export function heaviest(data, state) {
  const on = state.order.filter(id => state.placed[id].side !== 'none')
  const top = Math.max(0, ...on.map(id => state.placed[id].heft))
  return top === 0 ? [] : on.filter(id => state.placed[id].heft === top).map(id => weightById(data, id))
}

// ── 정한다 · 실제로는 ─────────────────────────────────────────────────────
export function decide(data, state, side) {
  if (state.stage !== 'decide' || (side !== 'open' && side !== 'shut')) return state
  return { ...state, choice: side, stage: 'actual', step: 0 }
}
/** 이 학생에게 보일 「실제로는」의 걸음들 — 올리지 않은 추에 대한 걸음은 건너뛴다. */
export function actualSteps(data, state) {
  return (data?.actual ?? []).filter(s => {
    if (!s.onlyIfPlaced) return true
    const p = state.placed[s.onlyIfPlaced]
    return !!p && p.side !== 'none'
  })
}
export function currentStep(data, state) {
  return state.stage === 'actual' ? actualSteps(data, state)[state.step] ?? null : null
}
export function next(data, state) {
  if (state.stage === 'actual') {
    const last = state.step >= actualSteps(data, state).length - 1
    return last ? { ...state, stage: 'closing' } : { ...state, step: state.step + 1 }
  }
  if (state.stage === 'closing') return { ...state, stage: 'done' }
  return state
}

// ── 기록 ─────────────────────────────────────────────────────────────────
const SIDE_WORD = { open: '여는 쪽', shut: '닫는 쪽', none: '올리지 않음' }

/** 사초함에 남길 한 줄 — 무엇을 어느 쪽에 얼마나 무겁게 올렸고, 무엇을 골랐는가. */
export function weighSummary(data, state) {
  if (!state.choice) return ''
  const lines = state.order.map(id => {
    const p = state.placed[id], w = weightById(data, id)
    const reading = readingOf(w, p.reading)
    return `「${w.tag}」 ${SIDE_WORD[p.side]}${p.heft ? `(${HEFT_LABEL[p.heft]})` : ''} — ${reading?.text ?? ''}`
  })
  const lean = ownLean(data, state)
  const leanWord = lean === 'level' ? '어느 쪽으로도 기울지 않았고' : `${SIDE_WORD[lean]}으로 기울었고`
  return [
    `내 저울은 ${leanWord}, 나는 「${data.pans[state.choice].label}」를 골랐다.`,
    ...lines,
  ].join('\n')
}

export function weighRecord(data, state) {
  return {
    kind: 'weigh',
    choice: state.choice,
    lean: ownLean(data, state),
    followedScale: ownLean(data, state) === state.choice,
    heaviest: heaviest(data, state).map(w => w.tag),
    aside: setAside(data, state).map(w => w.tag),
    done: state.stage === 'done',
  }
}
