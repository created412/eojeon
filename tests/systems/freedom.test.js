import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { createState, serialize, deserialize, SAVE_KEY } from '../../src/core/state.js'
import { enterAct, applyBeat } from '../../src/systems/scenario.js'
import { hubAt, hubOptions, beginReport, finishReport, closeHub, completeActivity, freedomRecord, shouldDeferReport, exitBlock } from '../../src/systems/freedom.js'

function atHub(actIndex, id) {
  const act = ACTS[actIndex]
  let state = enterAct(createState(), act, actIndex)
  for (const [i, beat] of act.beats.entries()) {
    state = { ...applyBeat(state, beat), beatIndex: i, beatEntered: true }
    if (beat.id === id) return state
  }
  throw new Error(id)
}

describe('역사 경계 안의 거점 선택', () => {
  it('74비트를 보존하고 8개의 탐색 거점만 연다', () => {
    expect(ACTS.flatMap(a => a.beats)).toHaveLength(74)
    expect(ACTS.flatMap(a => a.beats.map((_, i) => hubAt(a, i))).filter(Boolean)).toHaveLength(8)
  })
  it('다른 막과 다음 시기의 보고를 현재 거점에서 열지 못한다', () => {
    const s = atHub(1, 'day-changdeok')
    expect(beginReport(s, ACTS[1], 'beat:seogye-audience').ok).toBe(false)
    expect(beginReport(s, ACTS[1], 'beat:axe-sangso').ok).toBe(false)
    expect(beginReport(s, ACTS[4], 'beat:gapsin-gov').ok).toBe(false)
    expect(hubOptions(s, ACTS[1]).some(o => o.id === 'beat:garye-audience')).toBe(true)
  })
  it('전각의 조작권이 부족하면 보고를 열 수 없다', () => {
    const s = { ...atHub(2, 'day-1873'), control: 'D' }
    expect(beginReport(s, ACTS[2], 'beat:seogye-audience').ok).toBe(false)
    expect(hubOptions(s, ACTS[2]).find(o => o.id === 'beat:seogye-audience').blocked).toBeTruthy()
  })
  it('아무것도 안 해도 거점을 닫고 하지 않은 일을 남긴다', () => {
    const s = atHub(1, 'day-changdeok')
    const ended = closeHub(s, ACTS[1])
    expect(freedomRecord(ended).join('\n')).toContain('하례')
    expect(freedomRecord(ended).join('\n')).toContain('하지 못함')
    expect(ended.decisions).toEqual([])
    expect(closeHub(ended, ACTS[1])).toEqual(ended)
  })
  it('보지 않은 보고를 받았다고 기록하지 않는다', () => {
    // 옛 이름은 「해 칸이 없어도 종료 가능하며…」였다. 해 칸이 없어졌으므로(2026-09-26)
    // 이제 보고는 언제나 열리고, 안 본 것은 그대로 안 본 것으로 남는다.
    const s = atHub(4, 'gapsin-day')
    expect(beginReport(s, ACTS[4], 'beat:gapsin-gov').ok).toBe(true)
    const ended = closeHub(s, ACTS[4])
    expect(ended.sources.held).not.toContain('gapsin-memoir')
  })
  it('보고를 재개해도 한 번만 세고, 끝나야 사료와 완료 기록을 받는다', () => {
    const s = atHub(4, 'gapsin-day')
    const paid = beginReport(s, ACTS[4], 'beat:gapsin-gov')
    expect(paid.ok).toBe(true)
    expect(paid.state.sources.held).not.toContain('gapsin-memoir')
    const resumed = beginReport(deserialize(serialize(paid.state)), ACTS[4], 'beat:gapsin-gov')
    expect(resumed.ok).toBe(true)
    expect(closeHub(resumed.state, ACTS[4])).toEqual(resumed.state)
    const done = finishReport(resumed.state, ACTS[4])
    expect(done.sources.held.filter(id => id === 'gapsin-memoir')).toHaveLength(1)
    expect(beginReport(done, ACTS[4], 'beat:gapsin-gov').ok).toBe(false)
    expect(finishReport(done, ACTS[4])).toEqual(done)
  })
  it('방문 순서를 보존하고 완료 항목을 미방문으로 기록하지 않는다', () => {
    const s = atHub(0, 'unhyeon-day')
    const opts = hubOptions(s, ACTS[0]).filter(o => o.kind === 'npc')
    expect(opts.length).toBeGreaterThanOrEqual(2)
    let done = completeActivity(s, ACTS[0], opts[1].id)
    done = completeActivity(done, ACTS[0], opts[0].id)
    done = completeActivity(done, ACTS[0], opts[0].id)
    const lines = freedomRecord(closeHub(done, ACTS[0])).join('\n')
    expect(lines.indexOf(opts[1].label)).toBeLessThan(lines.indexOf(opts[0].label))
    expect(lines).not.toContain(`하지 않은 일 — ${opts[0].label}`)
  })
  it('보고가 없는 거점도 열리고, 그 낮의 남은 일은 사람이다', () => {
    // 4막 거점의 보고 두 개(완화군의 죽음·이재선의 일)는 그 화면들과 함께 지워졌다
    // (선생님 2026-09-26 — 「교과서에 없는 것들」). 거점 자체는 그대로 열려야 한다.
    const s = atHub(3, 'imo-day')
    const options = hubOptions(s, ACTS[3])
    expect(options.filter(o => o.kind === 'report')).toHaveLength(0)
    expect(options.length).toBeGreaterThan(0)
    expect(options.every(o => o.point)).toBe(true)
  })
  it('구형 저장의 좌표와 이미 지난 보고를 보존한다', () => {
    const legacy = atHub(1, 'day-changdeok')
    delete legacy.freedom
    const loaded = deserialize(serialize(legacy))
    expect(SAVE_KEY).toBe('eojeon.save.v1')
    expect(loaded.version).toBe(4)   // 3 → 4 (2026-09-26, core/state.js 머리말)
    expect(loaded.beatIndex).toBe(legacy.beatIndex)
    expect(hubOptions(loaded, ACTS[1]).find(o => o.id === 'beat:garye-audience').done).toBe(true)
  })
  it('새 게임의 선택 보고는 고정 재생하지 않고, 구형 재생 중 보고는 마친다', () => {
    const act = ACTS[1], beat = act.beats.find(b => b.id === 'garye-audience')
    expect(shouldDeferReport(createState(), act, beat)).toBe(true)
    const legacy = { ...createState(), actIndex: 1, beatIndex: act.beats.indexOf(beat), beatEntered: true }
    delete legacy.freedom
    expect(shouldDeferReport(deserialize(serialize(legacy)), act, beat)).toBe(false)
  })
  it('구형 저장이 보고 직전에 있으면 그 보고를 잃지 않고 원래 자리에서 마친다', () => {
    const act = ACTS[2], beat = act.beats.find(b => b.id === 'axe-sangso')
    const legacy = { ...createState(), actIndex: 2, beatIndex: act.beats.indexOf(beat), beatEntered: false }
    delete legacy.freedom
    expect(shouldDeferReport(deserialize(serialize(legacy)), act, beat)).toBe(false)
    const early = ACTS[1], report = early.beats.find(b => b.id === 'garye-audience')
    const earlierSave = { ...legacy, actIndex: 1, beatIndex: early.beats.indexOf(report) }
    const completed = { ...deserialize(serialize(earlierSave)), beatIndex: early.beats.indexOf(report) + 1 }
    expect(hubOptions(completed, early).find(o => o.id === 'beat:garye-audience').done).toBe(true)
  })
})

// ── 나가는 문 (2026-09-26) ──────────────────────────────────────────────
//
// 선생님: 「메인 이벤트를 클리어하지 않으면 다음으로 안넘어가야하는데, 지금은 그냥
// 잘 넘어가버려」 · 「해 칸 없애버리고 나머지 미션 수행하지 못하면 못넘어가게 해야해」
describe('exitBlock — 남은 일이 있으면 그 하루를 못 나간다', () => {
  function firstBusyHub() {
    for (let a = 0; a < ACTS.length; a++) {
      const act = ACTS[a]
      for (let b = 0; b < act.beats.length; b++) {
        if (!hubAt(act, b)) continue
        const state = { ...createState(), actIndex: a, beatIndex: b, palace: act.palace, control: act.control }
        if (hubOptions(state, act).some(o => !o.done && !o.blocked)) return { act, state }
      }
    }
    return null
  }

  it('할 일이 남아 있으면 막고, 무엇이 몇 곳인지 함께 낸다', () => {
    const found = firstBusyHub()
    expect(found, '할 일이 있는 탐색 비트를 하나도 못 찾았다').toBeTruthy()
    const block = exitBlock(found.state, found.act)
    expect(block).toBeTruthy()
    expect(block.count).toBeGreaterThan(0)
    expect(block.labels).toHaveLength(block.count)
    expect(block.first.label).toBeTruthy()
  })

  it('다 하면 열린다', () => {
    const { act } = firstBusyHub()
    let state = firstBusyHub().state
    for (const option of hubOptions(state, act)) {
      if (option.blocked) continue
      state = completeActivity(state, act, option.id)
    }
    expect(exitBlock(state, act)).toBe(null)
  })

  it('역사가 막은 자리(조작권·봉쇄)는 붙들지 않는다 — 그러면 영영 못 나간다', () => {
    const { act } = firstBusyHub()
    const state = { ...firstBusyHub().state, control: 'D' }   // 조작권을 잃은 낮
    const block = exitBlock(state, act)
    const options = hubOptions(state, act)
    expect(options.every(o => o.blocked)).toBe(true)
    expect(block).toBe(null)
  })

  it('탐색 비트가 아니면 아무것도 막지 않는다', () => {
    const act = ACTS[0]
    expect(exitBlock({ ...createState(), beatIndex: 0 }, act)).toBe(null)
  })

  it('이미 닫힌 하루는 다시 막지 않는다 — 이어하기가 갇힌다', () => {
    const { act } = firstBusyHub()
    const closed = closeHub(firstBusyHub().state, act)
    expect(exitBlock(closed, act)).toBe(null)
  })
})
