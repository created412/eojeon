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
  { act: 'chinjeong', hub: 'day-1873', beat: 'seogye-audience', label: '일본의 외교 문서 보고를 듣는다', room: 'sajeongjeon' },
  { act: 'chinjeong', hub: 'day-1875', beat: 'axe-sangso', label: '최익현의 상소를 듣는다', room: 'sajeongjeon' },
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
    beat: reportView(act, r), cost: 0, main: true,
    done: !!legacySaw(state, act, r.beat),
  }))
  for (const npc of npcsAt(baseOf, state.palace, state.actIndex, hubYear(act, state.beatIndex))) {
    const cards = npcCardIds(npc)
    // 불탄 전각의 사라진 기록을 목록에서 약속하지 않는다.
    if (cards.some(id => !def.pickups.some(p => p.cardId === id))) continue
    const room = roomAt(def, npc.x, npc.z)
    candidates.push({ id: `npc:${npc.id}`, kind: 'npc', label: `${npc.name}에게 말을 건다`,
      room: room?.id, point: { x: npc.x, z: npc.z }, npc,
      cost: 0,
      done: cards.length > 0 && cards.every(id => held.has(id)),
    })
  }
  const handled = npcHandledCardIds()
  for (const p of def.pickups ?? []) {
    if (handled.has(p.cardId) || (sourceById(p.cardId)?.act ?? 0) > state.actIndex + 1) continue
    candidates.push({ id: `card:${p.cardId}`, kind: 'card', label: `『${sourceById(p.cardId)?.title ?? p.cardId}』을 살펴본다`,
      room: p.placeId, point: { x: p.x, z: p.z }, cardId: p.cardId, cost: 0, done: held.has(p.cardId) })
  }
  for (const stop of hub.stops ?? []) {
    candidates.push({ id: `stop:${stop.id}`, kind: 'stop', label: stop.label, room: stop.room,
      stop, cost: 0, done: isStopDone(state, stop.id) })
  }
  return candidates.map(o => {
    const room = def.rooms.find(r => r.id === o.room)
    const blocked = !canMove(state.control) || (room && (!isRoomOpen(state.control, room) || !isPassable(room)))
      ? '당시 들어갈 수 없었음' : null
    const done = o.done || log.done.some(d => d.id === o.id)
    return { ...o, point: o.point ?? (room ? { x: room.x, z: room.z } : null),
      place: room?.name ?? '마당', done, blocked,
      disabled: log.closed || done || !!blocked }
  })
}

// 지금 선 자리에서 시작할 수 있는 「보고 듣기」(kind:'report') — 없으면 null.
//
// ⚠ 2026-10-06 — 여정 판을 눌러 걸어가 주던 것을 걷어 내면서 **보고를 시작하는 길이 함께 끊겼다.**
//   보고는 「판에서 고른 일」일 때에만 E 로 시작되었는데, 고르는 길이 없어졌으니 3막의 서계 보고와
//   최익현의 상소, 5막의 개화당 기록을 아무도 들을 수 없었다 — 그날의 일이 남아 하루가 끝나지 않았다.
//   이제 **그 방에 들어서 표지 곁에 서면** E 로 시작된다. 고르지 않아도 된다.
export const REPORT_REACH = 6
export function reportAt(options, room, pos) {
  let best = null
  for (const o of options ?? []) {
    if (o.kind !== 'report' || o.done || o.blocked || o.disabled || !o.point) continue
    if (o.room && room !== o.room) continue
    const dist = Math.hypot(pos.x - o.point.x, pos.z - o.point.z)
    if (dist < REPORT_REACH && (!best || dist < best.dist)) best = { id: o.id, label: o.label, dist }
  }
  return best
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

// **이 하루를 나갈 수 있는가.**
//
// 선생님(2026-09-26): 「메인 이벤트를 클리어하지 않으면 다음으로 안넘어가야하는데,
// 지금은 그냥 잘 넘어가버려」 · 「해 칸 없애버리고 나머지 미션 수행하지 못하면
// 못넘어가게 해야해」
//
// 예전에는 나가는 방에서 E 를 누르면 언제든 하루가 끝났다. 학생은 궁에 들어서자마자
// 나가는 방으로 걸어가 1876년 최익현의 상소를 통째로 건너뛸 수 있었다 — 그것이
// 이 수업의 내용인데도.
//
// 그래서 규칙이 하나다: **남은 일이 있으면 못 나간다.** 값을 치르는 일이 없어졌으므로
// (core/clock.js) 못 하는 일도 없다 — 역사가 막은 자리(조작권·봉쇄)만 예외다.
//
// 돌려주는 것: 나갈 수 있으면 null, 아니면 { count, first, labels } — 화면이 무엇이
// 몇 곳 남았는지 학생에게 말해 줄 수 있게(main.js 의 나가기 판정과 안내가 같은 값을 본다).
export function exitBlock(state, act) {
  const hub = hubAt(act, state.beatIndex)
  if (!hub) return null
  if (logOf(state, act, hub).closed) return null
  const left = hubOptions(state, act).filter(o => !o.done && !o.blocked)
  if (left.length === 0) return null
  return { count: left.length, first: left[0], labels: left.map(o => o.label) }
}

// ── 지금 할 일 한 줄 ───────────────────────────────────────────────────────
//
// 선생님(2026-09-29) 지적 #16: 화면에 「남은 일 3곳」이라고만 떠 있으면 학생은
// 무엇을 해야 하는지 모른다. **누구에게 가서 무엇을 하는지**가 보여야 한다.
//
// 「남은 일 3곳 — 표지를 찾아가 E」는 조작 안내였다. 「사정전으로 가 최익현에게
// 말을 건다」는 할 일이다. 셈은 뒤에 작게 붙인다 — 몇 곳 남았는지는 거들 뿐이다.

// 「…으로」인가 「…로」인가. 받침이 없거나 ㄹ 이면 「로」다.
// 방 이름은 데이터에서 오므로(부용지처럼 받침 없는 이름이 있다) 손으로 적어 둘 수 없다.
export function towardParticle(name) {
  const last = (name ?? '').trim().slice(-1)
  if (!last) return '으로'
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '으로'   // 한글 음절이 아니면 건드리지 않는다
  const jong = (code - 0xac00) % 28                    // 0 이면 받침 없음, 8 이면 ㄹ
  return jong === 0 || jong === 8 ? '로' : '으로'
}

/**
 * 지금 할 일 한 줄. 남은 일이 없으면 null 이다 — 그때 무엇을 띄울지는
 * 화면이 정한다(나가는 곳 이름을 아는 쪽이 화면이다).
 *
 *   options  hubOptions() 가 낸 목록
 *   def      지금 궁 — 방 이름을 여기서 얻는다
 *   nearest  가까운 곳을 이미 골라 두었으면 그것. 없으면 목록의 첫째.
 */
export function objectiveLine(options, def, nearest = null) {
  const left = (options ?? []).filter(o => !o.done && !o.blocked && !o.disabled)
  if (left.length === 0) return null
  const pick = (nearest && left.includes(nearest)) ? nearest : left[0]
  const room = def?.rooms?.find(r => r.id === pick.room)
  const where = room ? `${room.name}${towardParticle(room.name)} 가 ` : ''
  // 한 곳 남았을 때 「남은 일 1곳」은 군더더기다 — 그 한 곳을 이미 이름으로 말했다.
  const tail = left.length > 1 ? `  (남은 일 ${left.length})` : ''
  return `${where}${pick.label}${tail}`
}

export function closeHub(state, act) {
  const hub = hubAt(act, state.beatIndex)
  if (!hub) return state
  const log = logOf(state, act, hub)
  if (log.closed || log.pending) return state
  const missed = hubOptions(state, act).filter(o => !o.done).map(o => ({
    id: o.id, label: o.label,
    // 값이 사라진 뒤로 「해 칸을 다 씀」은 없다. 남는 것은 역사가 막은 자리뿐이다
    // (조작권·봉쇄). 그 밖의 것은 나가기 전에 다 하게 되어 있다(exitBlock).
    reason: o.blocked ?? '하지 못함',
  }))
  return putLog(state, act, hub, { ...log, closed: true, missed,
    title: `${state.actIndex + 1}막 · ${hubDate(act, hub) ?? act.title}` })
}

// 방금 닫힌 하루의 셈 — ui/day-end.js 가 화면으로 만들고, 여기서는 값만 낸다.
// closeHub() 이 먼저 불려 있어야 한다(그때 missed 가 적힌다). 오늘 한 일도 없고
// 남긴 일도 없으면 null 을 돌려준다 — 보여 줄 하루가 아니다(할 일이 애초에 없던
// 탐색 비트에서 빈 판이 뜨지 않게).
export function dayReport(state, act) {
  const hub = hubAt(act, state.beatIndex)
  if (!hub) return null
  const log = logOf(state, act, hub)
  if (!log.closed) return null
  // 선생님 지적 #17: 「한 일을 그림으로.」 그러려면 **그것이 무엇이었는지**를 이
  // 판이 알아야 한다. 예전에는 label 만 넘겨 화면이 글자밖에 받지 못했다.
  // id 를 함께 넘긴다 — 'npc:…' 는 얼굴을, 'card:…' 는 그 문서의 사진을 부를 수 있다.
  // ⚠ 그림을 고르는 일은 화면(ui/day-end.js)이 한다. 이 파일은 three.js 도 DOM 도 모른다.
  const done = log.done.map(d => ({ id: d.id, label: d.label }))
  const missed = (log.missed ?? []).map(m => ({ label: m.label, reason: m.reason }))
  if (done.length === 0 && missed.length === 0) return null
  return { title: log.title ?? hubDate(act, hub) ?? act.title, done, missed }
}

export function freedomRecord(state) {
  return Object.values(state.freedom?.hubs ?? {}).filter(log => log.closed).flatMap(log => [
    `[궁중 여정] ${log.title}`,
    `방문 순서 — ${log.done.map(d => d.label).join(' → ') || '따로 방문하지 않음'}`,
    ...log.missed.map(m => `하지 않은 일 — ${m.label} (${m.reason})`),
  ])
}

// ── 오늘 할 일 목록 (2026-10-06) ───────────────────────────────────────────
//
// 선생님: 「지금의 여정이 눈에 잘 안 보여. 좀 더 가독성 높일 방안으로 다시 해 봐.」
//         「일정은 할 일을 보여 주는 거지, 그걸 클릭하면 자동으로 이동하게 해서 게임이 너무
//          쉽게 클리어가 되어 버려. 일정은 남겨 두되, 자동으로 이동시키는 건 막아 버려.」
//
// 예전 판은 「가장 가까운 한 가지」를 한 줄로 보여 주고, 누르면 거기까지 걸어가 주었다.
// 이제 **그날의 일을 전부** 줄 세워 보여 준다 — 어디에서 무엇을, 했는지 안 했는지.
// 걸어가는 것은 학생이 한다. 이 함수는 목록만 낸다(자리는 주지 않는다).
export function taskList(options) {
  return (options ?? []).map(o => ({
    id: o.id,
    where: o.place ?? '',
    // 나들이의 이름표는 「E — 돈화문을 나서 종로에 간다」 꼴이다. 목록에서는 조작 글자를 뗀다.
    label: String(o.label ?? '').replace(/^E\s*[—-]\s*/, ''),
    done: !!o.done,
    blocked: o.blocked ?? null,
  }))
}
