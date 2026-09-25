// 역사 사건은 원래 비트 순서를 따른다. 이 표는 같은 시기에 접할 보고만 거점으로 옮긴다.
import { PALACES, baseOf, roomAt, isPassable } from '../data/palaces.js'
import { npcsAt, npcCardIds, npcHandledCardIds } from '../data/npcs.js'
import { sourceById } from '../data/sources.js'
import { canMove, isRoomOpen } from '../core/control.js'
import { spend } from '../core/clock.js'
import { applyGrant, yearAtBeat } from './scenario.js'
import { isStopDone } from './outing.js'
import { ACTS } from '../data/acts.js'

export const HUB_REPORTS = [
  { act: 'yangyo', hub: 'day-changdeok', beat: 'garye-audience', label: '가례 뒤 하례를 듣는다', room: 'injeongjeon' },
  { act: 'chinjeong', hub: 'day-1873', beat: 'seogye-audience', label: '일본의 외교 문서 보고를 듣는다', room: 'sajeongjeon' },
  { act: 'chinjeong', hub: 'day-1875', beat: 'axe-sangso', label: '최익현의 상소를 듣는다', room: 'sajeongjeon' },
  { act: 'imo', hub: 'imo-day', beat: 'wanhwa-death', label: '지난 기록 — 1880년 완화군의 죽음', room: 'huijeongdang', recollectionYear: 1880 },
  { act: 'imo', hub: 'imo-day', beat: 'jaeseon-order', label: '지난 기록 — 1881년 이재선의 일', room: 'seonjeongjeon', recollectionYear: 1881 },
  { act: 'gapsin', hub: 'gapsin-day', beat: 'gapsin-gov', label: '개화당 정부의 기록을 살펴본다', room: 'haenggak-e' },
]

export function hubAt(act, index) {
  const beat = act?.beats?.[index]
  return beat?.kind === 'explore' ? beat : null
}

function keyOf(act, hub) { return `${act.id}/${hub.id}` }
function logOf(state, act, hub) { return state.freedom?.hubs?.[keyOf(act, hub)] ?? { done: [], pending: null, closed: false, missed: [] } }
function putLog(state, act, hub, log) {
  return { ...state, freedom: { ...state.freedom, hubs: { ...state.freedom?.hubs, [keyOf(act, hub)]: log } } }
}

// 1875~76 탐색에서 상소를 골라도 1876년의 일을 앞당기지 않는다.
// 거점 자체를 운요호 사건 이후, 1876년 협상 준비 시점으로 표시한다.
export function hubYear(act, index) {
  return yearAtBeat(act, index)
}
export function hubDate(act, hub) {
  return act.id === 'chinjeong' && hub.id === 'day-1875'
    ? '고종 13년 · 1876 · 경복궁 · 협상을 앞두고' : hub.dateLabel
}

function legacySaw(state, act, beatId) {
  const old = state.freedom?.legacy
  const index = act.beats.findIndex(b => b.id === beatId)
  return old && old.actIndex === state.actIndex &&
    (index < old.beatIndex || (index === old.beatIndex && (old.beatEntered === true || state.beatIndex > index)))
}

function reportView(act, report) {
  const original = act.beats.find(b => b.id === report.beat)
  if (!report.recollectionYear) return original
  return { ...original,
    title: `${report.recollectionYear}년의 기록 — ${original.title}`,
    lines: [`지금은 ${act.year}년. 앞선 일을 기록으로 돌아본다.`, ...original.lines],
    origin: `${original.origin ?? ''}\n※ 기록의 열람 장소와 순서는 학습을 위한 재구성입니다. 사건이 일어난 해는 바뀌지 않습니다.`,
  }
}

export function shouldDeferReport(state, act, beat) {
  if (!HUB_REPORTS.some(r => r.act === act.id && r.beat === beat.id)) return false
  // 구형 저장이 가리키는 보고는 시작 직전이라도 원래 위치에서 마친다.
  // 특히 거점 뒤에 있던 상소를 생략하면, 이미 거점을 지난 학생에게 선택 기회도 사라진다.
  const old = state.freedom?.legacy
  return !(old?.actIndex === state.actIndex && old.beatIndex === state.beatIndex)
}

export function hubOptions(state, act) {
  const hub = hubAt(act, state.beatIndex)
  if (!hub || act.id !== ACTS[state.actIndex]?.id) return []
  const def = PALACES[state.palace]
  if (!def) return []
  const log = logOf(state, act, hub)
  const held = new Set([...(state.sources?.held ?? []), ...(state.sources?.lost ?? [])])
  const candidates = HUB_REPORTS.filter(r => r.act === act.id && r.hub === hub.id).map(r => ({
    id: `beat:${r.beat}`, kind: 'report', label: r.label, room: r.room,
    beat: reportView(act, r), cost: hub.free ? 0 : 1,
    done: !!legacySaw(state, act, r.beat),
  }))
  for (const npc of npcsAt(baseOf, state.palace, state.actIndex, hubYear(act, state.beatIndex))) {
    const cards = npcCardIds(npc)
    // 불탄 전각의 사라진 기록을 목록에서 약속하지 않는다.
    if (cards.some(id => !def.pickups.some(p => p.cardId === id))) continue
    const room = roomAt(def, npc.x, npc.z)
    candidates.push({ id: `npc:${npc.id}`, kind: 'npc', label: `${npc.name}에게 말을 건다`,
      room: room?.id, point: { x: npc.x, z: npc.z }, npc,
      cost: cards.length && !cards.every(id => held.has(id)) ? 1 : 0,
      done: cards.length > 0 && cards.every(id => held.has(id)),
    })
  }
  const handled = npcHandledCardIds()
  for (const p of def.pickups ?? []) {
    if (handled.has(p.cardId) || (sourceById(p.cardId)?.act ?? 0) > state.actIndex + 1) continue
    candidates.push({ id: `card:${p.cardId}`, kind: 'card', label: `『${sourceById(p.cardId)?.title ?? p.cardId}』을 살펴본다`,
      room: p.placeId, point: { x: p.x, z: p.z }, cardId: p.cardId, cost: 1, done: held.has(p.cardId) })
  }
  for (const stop of hub.stops ?? []) {
    candidates.push({ id: `stop:${stop.id}`, kind: 'stop', label: stop.label, room: stop.room,
      stop, cost: 1, done: isStopDone(state, stop.id) })
  }
  return candidates.map(o => {
    const room = def.rooms.find(r => r.id === o.room)
    const blocked = !canMove(state.control) || (room && (!isRoomOpen(state.control, room) || !isPassable(room)))
      ? '당시 들어갈 수 없었음' : null
    const done = o.done || log.done.some(d => d.id === o.id)
    return { ...o, point: o.point ?? (room ? { x: room.x, z: room.z } : null),
      place: room?.name ?? '마당', done, blocked,
      disabled: log.closed || done || !!blocked || (o.cost > state.dayLeft && log.pending !== o.id) }
  })
}

export function completeActivity(state, act, id) {
  const hub = hubAt(act, state.beatIndex)
  if (!hub) return state
  const log = logOf(state, act, hub)
  const option = hubOptions(state, act).find(o => o.id === id)
  if (!option || log.closed || log.done.some(o => o.id === id)) return state
  return putLog(state, act, hub, { ...log,
    done: [...log.done, { id, label: option.label }], pending: log.pending === id ? null : log.pending })
}

export function pendingReport(state, act) {
  const hub = hubAt(act, state.beatIndex)
  return hub ? logOf(state, act, hub).pending : null
}

export function beginReport(state, act, id) {
  const hub = hubAt(act, state.beatIndex)
  const option = hubOptions(state, act).find(o => o.id === id && o.kind === 'report')
  if (!hub || !option) return { ok: false, state }
  const log = logOf(state, act, hub)
  if (log.pending === id && !log.closed) return { ok: true, state, beat: option.beat }
  if (option.disabled || log.pending) return { ok: false, state }
  const paid = option.cost ? spend(state) : { ok: true, state }
  if (!paid.ok) return paid
  return { ok: true, state: putLog(paid.state, act, hub, { ...log, pending: id }), beat: option.beat }
}

export function finishReport(state, act) {
  const id = pendingReport(state, act)
  const option = hubOptions(state, act).find(o => o.id === id && o.kind === 'report')
  if (!option) return state
  return completeActivity(applyGrant(state, option.beat), act, id)
}

// main의 선택 보고와 자동 경로 검사가 함께 쓰는 재생·저장 순서.
export async function performReport({ state, act, id, play, save = () => {} }) {
  const started = beginReport(state, act, id)
  if (!started.ok) return state
  save(started.state)
  const after = await play(started.beat, started.state)
  const done = finishReport(after, act)
  save(done)
  return done
}

export function closeHub(state, act) {
  const hub = hubAt(act, state.beatIndex)
  if (!hub) return state
  const log = logOf(state, act, hub)
  if (log.closed || log.pending) return state
  const missed = hubOptions(state, act).filter(o => !o.done).map(o => ({
    id: o.id, label: o.label,
    reason: o.blocked ?? (o.cost > state.dayLeft ? '해 칸을 다 씀' : '선택하지 않음'),
  }))
  return putLog(state, act, hub, { ...log, closed: true, missed,
    title: `${state.actIndex + 1}막 · ${hubDate(act, hub) ?? act.title}` })
}

export function freedomRecord(state) {
  return Object.values(state.freedom?.hubs ?? {}).filter(log => log.closed).flatMap(log => [
    `[궁중 여정] ${log.title}`,
    `방문 순서 — ${log.done.map(d => d.label).join(' → ') || '따로 방문하지 않음'}`,
    ...log.missed.map(m => `하지 않은 일 — ${m.label} (${m.reason})`),
  ])
}
