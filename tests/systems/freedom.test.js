import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { createState, serialize, deserialize, SAVE_KEY } from '../../src/core/state.js'
import { enterAct, applyBeat } from '../../src/systems/scenario.js'
import { hubAt, hubOptions, beginReport, finishReport, closeHub, completeActivity, freedomRecord, shouldDeferReport } from '../../src/systems/freedom.js'

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
  it('90비트를 보존하고 9개의 탐색 거점만 연다', () => {
    expect(ACTS.flatMap(a => a.beats)).toHaveLength(90)
    expect(ACTS.flatMap(a => a.beats.map((_, i) => hubAt(a, i))).filter(Boolean)).toHaveLength(9)
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
    expect(freedomRecord(ended).join('\n')).toContain('선택하지 않음')
    expect(ended.decisions).toEqual([])
    expect(closeHub(ended, ACTS[1])).toEqual(ended)
  })
  it('해 칸이 없어도 종료 가능하며 보고를 보거나 받았다고 기록하지 않는다', () => {
    const s = { ...atHub(4, 'gapsin-day'), dayLeft: 0 }
    expect(beginReport(s, ACTS[4], 'beat:gapsin-gov').ok).toBe(false)
    const ended = closeHub(s, ACTS[4])
    expect(freedomRecord(ended).join('\n')).toContain('해 칸을 다 씀')
    expect(ended.sources.held).not.toContain('gapsin-memoir')
  })
  it('보고를 재개해도 비용은 한 번, 끝나야 사료와 완료 기록을 받는다', () => {
    const s = atHub(4, 'gapsin-day')
    const paid = beginReport(s, ACTS[4], 'beat:gapsin-gov')
    expect(paid.ok).toBe(true)
    expect(paid.state.dayLeft).toBe(s.dayLeft - 1)
    expect(paid.state.sources.held).not.toContain('gapsin-memoir')
    const resumed = beginReport(deserialize(serialize(paid.state)), ACTS[4], 'beat:gapsin-gov')
    expect(resumed.state.dayLeft).toBe(paid.state.dayLeft)
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
  it('같은 거점에서 기존 비트 두 개의 열람 순서를 실제로 뒤집을 수 있다', () => {
    const s = atHub(3, 'imo-day')
    const reports = hubOptions(s, ACTS[3]).filter(o => o.kind === 'report')
    expect(reports).toHaveLength(2)
    for (const option of reports) {
      const original = ACTS[3].beats.find(b => b.id === option.beat.id)
      expect(option.beat.grade).toBe(original.grade)
      expect(option.beat.origin).toContain(original.origin)
      expect(option.beat.lines.slice(1)).toEqual(original.lines)
      expect(option.beat.lines[0]).toContain('1882')
    }
    const run = options => options.reduce((state, option) => {
      const started = beginReport(state, ACTS[3], option.id)
      expect(started.ok).toBe(true)
      return finishReport(started.state, ACTS[3])
    }, s)
    const forward = run(reports), reverse = run([...reports].reverse())
    const ids = state => state.freedom.hubs['imo/imo-day'].done.map(o => o.id)
    expect(ids(forward)).toEqual([...ids(reverse)].reverse())
    expect(forward.palace).toBe(reverse.palace)
    expect(forward.control).toBe(reverse.control)
    expect(forward.beatIndex).toBe(reverse.beatIndex)
  })
  it('구형 저장의 좌표와 이미 지난 보고를 보존한다', () => {
    const legacy = atHub(1, 'day-changdeok')
    delete legacy.freedom
    const loaded = deserialize(serialize(legacy))
    expect(SAVE_KEY).toBe('eojeon.save.v1')
    expect(loaded.version).toBe(3)
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
