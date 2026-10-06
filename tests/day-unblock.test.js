import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bodyOf } from './helpers/body-of.js'
import { pressE } from '../src/main.js'
import { ACTS } from '../src/data/acts.js'
import { PALACES, roomAt, baseOf } from '../src/data/palaces.js'
import { NPCS, npcsAt, npcNear } from '../src/data/npcs.js'
import { ROOM_SHRINK, WALL_THICKNESS, BODY_RADIUS, collides } from '../src/data/hall-geometry.js'
import { ANCHOR_BOUND } from '../src/systems/palace-life.js'
import { createState } from '../src/core/state.js'
import { beatAt, isActOver, enterAct, applyBeat, advance, applyGrant } from '../src/systems/scenario.js'
import { hubOptions, exitBlock, completeActivity, reportAt, REPORT_REACH } from '../src/systems/freedom.js'
import { KIND_GUIDE, guideForBeat } from '../src/data/guide.js'
import { actMap } from '../src/systems/act-map.js'
import { ACT_BACKGROUND } from '../src/data/act-background.js'
import { HISTORICAL_MEDIA } from '../src/ui/historical-media-data.js'
import { backgroundHtml, shotHtml, captionOf, CAPTION_WAIT } from '../src/ui/act-background.js'
import { makeBoard } from '../src/systems/cloze.js'

// ── 2026-10-06, 올린 뒤 선생님이 화면에서 찾은 세 가지 ────────────────────────
//
//  1. 「여기에 기존에 있던 사진이나 그림들 어디 갔어? 포함해서 다시 한 판에 들어오게 만들어.
//      다른 막들도 마찬가지야.」
//  2. 「인정전으로 가 흥선대원군에게 말을 건다 이벤트는 진행이 막힌 오류가 있어. 흥선대원군이
//      인정전 밖에 있기도 하고, 밖에 있는 흥선대원군에게 말을 걸면 … 넘어가지지가 않아.」
//  3. 「그곳으로 걸어가는 기능 막았잖아. 근데 저 문구는 그대로 있네? 수정해.」

// 걷는 낮마다, 그 낮에 들어섰을 때의 상태를 만든다.
function days() {
  const out = []
  let state = createState()
  ACTS.forEach((act, ai) => {
    state = enterAct(state, act, ai)
    while (!isActOver(state, act)) {
      const beat = beatAt(act, state.beatIndex)
      if (beat.kind === 'explore') out.push({ act, beat, state })
      state = advance(applyGrant(applyBeat(state, beat), beat))
    }
  })
  return out
}

describe('2. 나가는 방 안의 사람에게도 말이 걸린다', () => {
  const def = PALACES.changdeok
  const exit = { room: 'injeongjeon', label: 'E — 오늘은 여기까지 한다' }
  const npc = { id: 'heungseon', name: '흥선대원군', x: -5, z: 12 }
  const base = { dialogOpen: false, exit, stops: [], room: 'injeongjeon', palaceDef: def, playerX: -4, playerZ: 12,
    taken: new Set(), state: { ...createState(), palace: 'changdeok' } }

  it('아직 말을 걸지 않은 사람이 곁에 있으면, 나가는 방 안이어도 말이 먼저다', () => {
    expect(pressE({ ...base, npc, undone: id => id === 'npc:heungseon' })).toEqual({ type: 'talk', npc })
  })

  it('이미 말을 건 사람이면 예전대로 나간다 — 나가는 길을 사람이 막지 않는다', () => {
    expect(pressE({ ...base, npc, undone: () => false }).type).toBe('exit-explore')
    expect(pressE({ ...base, npc }).type).toBe('exit-explore')      // undone 을 안 넘겨도 예전과 같다
  })

  it('나가는 방 바닥에 아직 안 읽은 문서가 있으면 그것이 먼저다', () => {
    const p = def.pickups[0]
    const action = pressE({ ...base, room: 'r', exit: { room: 'r' }, playerX: p.x, playerZ: p.z, act: 9,
      undone: id => id === `card:${p.cardId}` })
    expect(action.type).not.toBe('exit-explore')
  })

  it('문서가 열려 있으면 여전히 그것부터 닫는다', () => {
    expect(pressE({ ...base, dialogOpen: true, npc, undone: () => true }).type).toBe('close-dialog')
  })

  // 이 시험이 있었다면 올리기 전에 잡혔다 — 걷는 낮마다 「오늘 할 일」을 실제 E 판정으로 하나씩 해 본다.
  it('모든 걷는 낮에서, 사람에게 말을 거는 일은 그 사람 곁에서 E 로 실제로 된다 — 어느 방에 서 있든', () => {
    let talks = 0
    for (const { act, beat, state } of days()) {
      const palace = PALACES[state.palace]
      let s = state
      for (const option of hubOptions(s, act).filter(o => o.kind === 'npc' && !o.done && !o.blocked)) {
        const undone = id => hubOptions(s, act).some(o => o.id === id && !o.done && !o.blocked)
        // 그 사람의 코앞, 그리고 그 사람이 선 방의 한가운데 — 두 자리에서 다 눌러 본다.
        for (const at of [{ x: option.npc.x + 0.8, z: option.npc.z }, { x: option.npc.x, z: option.npc.z + 0.8 }]) {
          const action = pressE({ dialogOpen: false, exit: beat.exit ?? null, stops: beat.stops ?? [],
            room: roomAt(palace, at.x, at.z)?.id ?? null, palaceDef: palace, playerX: at.x, playerZ: at.z,
            taken: new Set(s.sources.held), state: s, npc: option.npc, act: s.actIndex + 1, undone })
          expect(action.type, `${act.id}/${beat.id} — ${option.label} (${at.x},${at.z})`).toBe('talk')
        }
        talks++
        s = completeActivity(s, act, option.id)
      }
    }
    expect(talks).toBeGreaterThan(8)
  })

  it('2막 창덕궁의 낮: 대원군은 나가는 방(인정전)에 서 있다 — 바로 그 자리가 막혔던 곳이다', () => {
    const day = days().find(d => d.beat.id === 'day-changdeok')
    const option = hubOptions(day.state, day.act).find(o => o.id === 'npc:heungseon')
    expect(option.room).toBe(day.beat.exit.room)
    expect(exitBlock(day.state, day.act).labels).toContain(option.label)
  })
})

describe('2. 방 안에 선 사람은 눈에 보이는 건물 안에 서 있다', () => {
  // 방(room)의 셈과 눈에 보이는 건물은 크기가 다르다 — 건물은 방의 0.72배다. 대원군의 옛 자리(-8, 9)는
  // 방 안이지만 건물의 서쪽 벽선 위였고, 벽에 걸려 담 밖으로 밀려났다.
  const standing = NPCS.filter(n => (n.actsVisible ?? []).length > 0)

  it('낮에 서 있는 사람이 실제로 있다 — 이 시험이 헛돌지 않는다', () => {
    expect(standing.length).toBeGreaterThan(8)
    expect(standing.map(n => n.id)).toContain('heungseon')
  })

  it.each(standing.map(n => [n.id, n]))('%s', (id, n) => {
    const def = PALACES[n.palace]
    const room = roomAt(def, n.x, n.z)
    if (!room) return                       // 마당에 선 사람(운현궁의 식구들)
    const halfW = room.w * ROOM_SHRINK / 2, halfD = room.d * ROOM_SHRINK / 2
    const margin = WALL_THICKNESS + BODY_RADIUS
    expect(Math.abs(n.x - room.x), `${id} — ${room.name}의 벽 밖(동서)`).toBeLessThan(halfW - margin)
    expect(Math.abs(n.z - room.z), `${id} — ${room.name}의 벽 밖(남북)`).toBeLessThan(halfD - margin)
    expect(collides(def, n), `${id} — 벽이나 기둥에 걸린다`).toBeNull()
  })

  it('대원군은 인정전 건물 안에 서 있고, 서성여도 방을 벗어나지 않는다', () => {
    const n = NPCS.find(x => x.id === 'heungseon')
    const room = roomAt(PALACES.changdeok, n.x, n.z)
    expect(room.id).toBe('injeongjeon')
    for (const [dx, dz] of [[ANCHOR_BOUND, 0], [-ANCHOR_BOUND, 0], [0, ANCHOR_BOUND], [0, -ANCHOR_BOUND]]) {
      expect(roomAt(PALACES.changdeok, n.x + dx, n.z + dz)?.id).toBe('injeongjeon')
    }
    // 낮에 서는 사람 목록에도 그 자리로 나온다.
    expect(npcsAt(baseOf, 'changdeok', 1).find(x => x.id === 'heungseon')).toMatchObject({ x: n.x, z: n.z })
  })
})

describe('3. 걸어가 주지 않는데 걸어간다고 적지 않는다', () => {
  const said = [...Object.values(KIND_GUIDE), guideForBeat({ kind: 'explore' }), guideForBeat({ kind: 'explore', free: true }),
    ...ACTS.flatMap(a => actMap(a).map(step => step.note))]

  it.each(['걸어갑니다', '그리로 걸어간다', '고르면', '남은 일을 두고', '지금의 여정'])('안내 어디에도 「%s」가 없다', word => {
    for (const s of said) expect(s.includes(word), s).toBe(false)
  })

  it('걷는 낮의 안내는 스스로 찾아가라고, 그리고 남은 일을 다 해야 한다고 말한다', () => {
    const line = guideForBeat({ kind: 'explore' })
    expect(line).toContain('오늘 할 일')
    expect(line).toContain('찾아가')
    expect(line).toContain('남은 일을 다 해야')
  })
})

describe('1. 막 앞 연표에 사진이 다시 선다', () => {
  const entries = Object.entries(ACT_BACKGROUND)

  it('다섯 막 모두 줄마다 사진이 있다 — 알맞은 자료가 없는 줄은 막마다 많아야 하나', () => {
    for (const [id, bg] of entries) {
      const without = bg.rows.filter(r => !r.media).length
      expect(without, `${id} 에 사진 없는 줄이 ${without}개`).toBeLessThanOrEqual(1)
      expect(bg.rows.filter(r => r.media).length, id).toBeGreaterThanOrEqual(4)
    }
  })

  it('이미 게임 안에 실린 사진 · 초상만 쓴다 — 새 그림을 들이지 않는다', () => {
    for (const [id, bg] of entries) for (const r of bg.rows) {
      if (r.media) expect(HISTORICAL_MEDIA[r.media]?.src, `${id} — ${r.media}`).toBeTruthy()
    }
  })

  it('사진마다 그 줄과 어떤 사이인지 적는다 — 그 장면을 찍은 것이 아니면 그렇다고 말한다', () => {
    for (const [id, bg] of entries) for (const r of bg.rows) {
      if (!r.media) continue
      expect(r.relation, `${id} — ${r.media}`).toMatch(/^(관련 (인물|사건|장소|자료|문헌)|실물 자료|원문 자료) · /)
      expect(captionOf(r)).toBe(r.relation)
    }
    // 훗날의 초상 · 사진은 반드시 그렇다고 적는다.
    const later = entries.flatMap(([, bg]) => bg.rows).filter(r => ['gojong', 'gyeongbokgung', 'jeongjok', 'injeongjeon'].includes(r.media))
    expect(later.length).toBeGreaterThan(4)
    for (const r of later) expect(r.relation, r.media).toMatch(/아닙니다|아니라/)
  })

  it('한 막 안에서 같은 사진을 두 번 쓰지 않는다', () => {
    for (const [id, bg] of entries) {
      const used = bg.rows.map(r => r.media).filter(Boolean)
      expect(new Set(used).size, id).toBe(used.length)
    }
  })

  it('판에 사진이 실제로 그려진다 — 누르면 크게 뜨는 단추로', () => {
    for (const [id, bg] of entries) {
      const html = backgroundHtml({ ...bg, buttonLabel: '시작' })
      expect((html.match(/class="thumb"/g) ?? []).length, id).toBe(bg.rows.filter(r => r.media).length)
      expect((html.match(/<li /g) ?? []).length, id).toBe(bg.rows.length)
    }
  })

  // 사진의 설명에는 빈칸의 답이 적혀 있다(「관련 인물 · 고종입니다」). 채우기 전에 보이면 읽지 않고 베껴 채운다.
  it('채우기 전의 판에는 사진의 설명이 없다 — 빈칸의 답이 새지 않는다', () => {
    for (const [id, bg] of entries) {
      const board = makeBoard(bg.rows, bg.extra)
      const html = backgroundHtml({ ...bg, buttonLabel: '시작' }, board)
      const rows = html.slice(html.indexOf('<ol'), html.indexOf('</ol>'))
      for (const r of bg.rows) {
        if (!r.media) continue
        expect(rows.includes(r.relation), `${id} — 설명이 미리 보인다`).toBe(false)
        expect(rows.includes(HISTORICAL_MEDIA[r.media].caption), `${id} — 자료 이름이 미리 보인다`).toBe(false)
      }
      for (const b of board.blanks) expect(rows.includes(b.answer), `${id} — 「${b.answer}」`).toBe(false)
      expect(rows).toContain(CAPTION_WAIT)
    }
  })

  it('사진이 없는 줄도 자리를 잡아 둔다 — 글의 너비가 줄마다 달라지지 않는다', () => {
    expect(shotHtml({}, 0)).toContain('shot none')
    expect(shotHtml({ media: 'gojong', relation: '…' }, 2)).toContain('data-shot="2"')
  })
})

// ── 걷어 낸 것의 뒷자리 ───────────────────────────────────────────────────
//
// 같은 날 「여정 판을 누르면 걸어가 주던 것」을 걷어 내면서, 판에서 고른 일일 때에만 E 로 열리던
// **보고 듣기**(3막 서계 보고 · 최익현의 상소, 5막 개화당의 기록)를 시작할 길이 함께 사라졌다.
// 2막의 대원군을 넘어가도 3막 첫 낮에서 하루가 끝나지 않았다. 거울(beat-mirror)은 보고를 곧장
// 치러 버려서 이것을 보지 못했다 — 그래서 여기서는 **학생의 E 한 번**이 무엇을 여는지를 잰다.
describe('걷는 낮의 모든 할 일은, 그 자리에 가서 E 를 누르면 시작된다', () => {
  const main = readFileSync(join('src', 'main.js'), 'utf8')

  // main.js 의 pressEAction 몸통을 그대로 돌린다 — 고른 일이 없는(selectedOption → null) 지금의 게임 그대로.
  function pressAt({ act, beat, state }, at, room, npcs = []) {
    const position = { x: at.x, y: 1.9, z: at.z }
    const s = { ...state, room }
    const env = {
      PALACES, npcNear, pressE, markStopPaid: x => x, spend: x => ({ ok: true, state: x }), markRead: x => x, pickUp: x => x,
      flow: { state: s, actIndex: s.actIndex, act: () => act, taken: new Set(s.sources.held) },
      ctx: { player: { position } }, dialog: { isOpen: () => false },
      selectedOption: () => null, activityReady: () => false,
      livingNpcs: () => npcs, nearbyArtifact: () => null,
      currentExit: () => beat.exit ?? null, currentStops: () => beat.stops ?? [],
      readyReport: () => reportAt(hubOptions(s, act), room, position),
      undoneActivity: id => hubOptions(s, act).some(o => o.id === id && !o.done && !o.blocked),
    }
    return new Function('env', `with (env) { return (function() {${bodyOf(main, 'pressEAction')}})() }`)(env)
  }

  it('보고가 있는 낮이 실제로 있다 — 3막에 둘, 5막에 하나', () => {
    const withReport = days().filter(d => hubOptions(d.state, d.act).some(o => o.kind === 'report'))
    expect(withReport.map(d => d.beat.id)).toEqual(['day-1873', 'day-1875', 'gapsin-day'])
  })

  it('보고의 표지 곁에 서서 E 를 누르면 보고가 열린다 — 판에서 고르지 않아도', () => {
    let opened = 0
    for (const day of days()) {
      for (const o of hubOptions(day.state, day.act).filter(o => o.kind === 'report' && !o.done && !o.blocked)) {
        const action = pressAt(day, { x: o.point.x + 1, z: o.point.z + 1 }, o.room)
        expect(action, `${day.beat.id} — ${o.label}`).toEqual({ type: 'hub-report', id: o.id })
        opened++
      }
    }
    expect(opened).toBe(3)
  })

  it('다른 방에 서 있으면 열리지 않는다 — 그 방까지 걸어가야 한다', () => {
    const day = days().find(d => d.beat.id === 'day-1873')
    const o = hubOptions(day.state, day.act).find(x => x.kind === 'report')
    expect(reportAt(hubOptions(day.state, day.act), 'somewhere-else', o.point)).toBeNull()
    expect(reportAt(hubOptions(day.state, day.act), o.room, { x: o.point.x + REPORT_REACH + 1, z: o.point.z })).toBeNull()
    expect(reportAt(hubOptions(day.state, day.act), o.room, o.point)).toMatchObject({ id: o.id, label: o.label })
  })

  it('안내 줄도 E 판정과 같은 것을 본다 — 보고가 물건 · 나가는 방보다 먼저 적힌다', () => {
    const body = bodyOf(main, 'updateHint')
    const at = s => body.indexOf(s)
    expect(at('readyReport()')).toBeGreaterThan(0)
    expect(at('readyReport()')).toBeLessThan(at('nearbyArtifact()'))
    expect(at('undoneActivity(')).toBeLessThan(at('exit.room'))
    const press = bodyOf(main, 'pressEAction')
    expect(press.indexOf('readyReport()')).toBeLessThan(press.indexOf('nearbyArtifact()'))
  })

  // 낮 하나를 처음부터 끝까지: 할 일마다 그 자리에 가서 E 를 누르고, 다 하면 나가는 방에서 나간다.
  it('모든 걷는 낮을, E 만 눌러서 끝낼 수 있다', () => {
    for (const day of days()) {
      const { act, beat } = day
      const palace = PALACES[day.state.palace]
      let s = day.state
      for (let guard = 0; guard < 30; guard++) {
        const left = hubOptions(s, act).filter(o => !o.done && !o.blocked)
        if (left.length === 0) break
        const o = left[0]
        const at = o.kind === 'npc' ? { x: o.npc.x + 0.8, z: o.npc.z } : o.point
        const room = roomAt(palace, at.x, at.z)?.id ?? o.room ?? null
        const action = pressAt({ act, beat, state: s }, at, o.kind === 'npc' ? room : (o.room ?? room), o.kind === 'npc' ? [o.npc] : [])
        const want = { npc: 'talk', report: 'hub-report', stop: 'stop', card: 'pickup' }[o.kind]
        expect(action.type, `${act.id}/${beat.id} — ${o.label}`).toBe(want)
        s = completeActivity(s, act, o.id)
      }
      expect(exitBlock(s, act), `${act.id}/${beat.id} 에 할 수 없는 일이 남는다`).toBeNull()
      if (beat.exit) {
        const room = palace.rooms.find(r => r.id === beat.exit.room)
        expect(pressAt({ act, beat, state: s }, { x: room.x, z: room.z }, room.id).type, `${act.id}/${beat.id} — 나가기`).toBe('exit-explore')
      }
    }
  })
})
