import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { bodyOf } from './helpers/body-of.js'
import { firstChoiceDecider } from './helpers/beat-mirror.js'
import { ACTS } from '../src/data/acts.js'
import { PALACES } from '../src/data/palaces.js'
import { createState, serialize, deserialize } from '../src/core/state.js'
import * as scenario from '../src/systems/scenario.js'
import { hubOptions, closeHub, pendingReport, performReport, completeActivity, shouldDeferReport, HUB_REPORTS } from '../src/systems/freedom.js'
import { npcCardIds } from '../src/data/npcs.js'
import { pickUpPacket, buildRecordText } from '../src/main.js'
import { spend } from '../src/core/clock.js'
import { markStopPaid, markStopDone, pendingStopId, stopById } from '../src/systems/outing.js'
import { advancePrices } from '../src/systems/prices.js'
import { relocate } from '../src/systems/relocate.js'

// 거울을 하나 더 만들지 않는다. 실제 main.runBeats의 몸통을 실행하고,
// 화면 대기만 결정적 학생 행동으로 대체한다. 렌더링 증거는 아니다.
const body = bodyOf(readFileSync('src/main.js', 'utf8'), 'runBeats')
const makeRunner = new Function('deps', `const {flow,beatAt,isActOver,isBeatActive,advance,applyBeat,
  shouldDeferReport,saveGame,playBeat,finishAct,bindPalaceAndSpawn}=deps;
  let prevPalace,dateLabel;
  return async function({resumeMidBeat=false}={}) {${body}}`)

async function playRoute(policy, initial = createState(), resumed = false) {
  const played = [], saves = [], historical = []
  const flow = { state: initial, act: () => ACTS[flow.state.actIndex] }
  const save = state => { flow.state = state; saves.push(serialize(state)) }
  async function report(id) {
    flow.state = await performReport({ state: flow.state, act: flow.act(), id, save,
      play: async (beat, state) => { played.push(`${flow.act().id}/${beat.id}`); return state } })
  }
  async function explore() {
    if (pendingReport(flow.state, flow.act())) await report(pendingReport(flow.state, flow.act()))
    if (pendingStopId(flow.state)) {
      const stop = stopById(flow.act(), pendingStopId(flow.state))
      flow.state = scenario.applyGrant(flow.state, stop.beat)
      flow.state = completeActivity(markStopDone(flow.state, stop.id), flow.act(), `stop:${stop.id}`)
    }
    if (policy !== 'skip') {
      const options = hubOptions(flow.state, flow.act())
      const ordered = policy === 'reports-first'
        ? options.sort((a, b) => Number(b.kind === 'report') - Number(a.kind === 'report'))
        : policy === 'reverse-reports'
          ? [...options.filter(o => o.kind === 'report').reverse(), ...options.filter(o => o.kind !== 'report')]
          : options.reverse()
      for (const candidate of ordered) {
        const option = hubOptions(flow.state, flow.act()).find(o => o.id === candidate.id)
        if (option.disabled) continue
        if (option.kind === 'report') { await report(option.id); continue }
        if (option.kind === 'npc' || option.kind === 'card') {
          const cardIds = option.kind === 'npc' ? npcCardIds(option.npc) : [option.cardId]
          if (cardIds.length) {
            const result = pickUpPacket({ palaceDef: PALACES[flow.state.palace], cardIds,
              taken: new Set([...flow.state.sources.held, ...flow.state.sources.lost]), state: flow.state, act: flow.state.actIndex + 1 })
            if (!result.ok) continue
            flow.state = result.state
          }
        } else if (option.kind === 'stop') {
          const paid = spend(flow.state)
          if (!paid.ok) continue
          flow.state = markStopPaid(paid.state, option.stop.id); save(flow.state)
          flow.state = scenario.applyGrant(flow.state, option.stop.beat)
          flow.state = markStopDone(flow.state, option.stop.id)
        }
        flow.state = completeActivity(flow.state, flow.act(), option.id)
        save(flow.state)
      }
    }
    flow.state = closeHub(flow.state, flow.act())
    return flow.state
  }
  let first = true
  for (let ai = initial.actIndex; ai < ACTS.length; ai++) {
    if (!first || !resumed) flow.state = advancePrices(scenario.enterAct(flow.state, ACTS[ai], ai), ai + 1)
    first = false
    let finished = false
    let moveFrom = flow.state.palace
    const runner = makeRunner({ ...scenario, flow, shouldDeferReport, saveGame: save,
      applyBeat: (state, beat) => { moveFrom = state.palace; return scenario.applyBeat(state, beat) },
      bindPalaceAndSpawn: () => {}, finishAct: async () => { finished = true },
      playBeat: async beat => {
        played.push(`${flow.act().id}/${beat.id}`)
        if (beat.kind === 'explore') return await explore()
        historical.push(`${flow.act().id}/${beat.id}`)
        const after = beat.kind === 'move'
          ? relocate(flow.state, { year: beat.year, from: moveFrom, to: beat.palace, cause: beat.cause, self: beat.self })
          : firstChoiceDecider(beat, flow.state, false)
        flow.state = scenario.applyGrant(after, beat)
        return flow.state
      },
    })
    await runner({ resumeMidBeat: flow.state.beatEntered === true })
    expect(finished).toBe(true)
  }
  return { state: flow.state, played, saves, historical }
}

describe('실제 runBeats로 1~5막 자유 여정 완주', () => {
  it('보고 우선과 사람 우선 경로가 다르고 역사 사건·궁 이동 순서는 같다', async () => {
    const a = await playRoute('reports-first'), b = await playRoute('people-first')
    for (const result of [a, b]) {
      expect(result.state.actIndex).toBe(4)
      expect(result.state.beatIndex).toBe(ACTS[4].beats.length)
      expect(result.played.at(-1)).toBe('gapsin/end')
      expect(result.state.moves).toHaveLength(9)
      expect(result.state.moves.every(m => m.from && m.to)).toBe(true)
      expect(Object.keys(result.state.freedom.hubs)).toHaveLength(9)
      expect(result.saves.every(json => deserialize(json).dayLeft >= 0)).toBe(true)
      expect(buildRecordText(result.state, ACTS)).toContain('하지 않은 일')
    }
    expect(a.played).not.toEqual(b.played)
    expect(a.historical).toEqual(b.historical)
    expect(a.state.moves).toEqual(b.state.moves)
    expect(a.historical.indexOf('yangyo/byeongin-dispatch')).toBeLessThan(a.historical.indexOf('imo/imo-rush'))
    expect(a.state.freedom.hubs['enthronement/unhyeon-day'].done.map(d => d.id))
      .not.toEqual(b.state.freedom.hubs['enthronement/unhyeon-day'].done.map(d => d.id))
  })
  it('선택 활동을 전부 생략해도 끝까지 가고 보고 사료를 받았다고 꾸미지 않는다', async () => {
    const r = await playRoute('skip')
    expect(r.played.at(-1)).toBe('gapsin/end')
    expect(r.state.sources.held).not.toContain('gapsin-memoir')
    expect(r.state.sources.held).not.toContain('choe-ikhyeon')
    expect(r.state.sources.held).not.toContain('seogye')
    for (const report of HUB_REPORTS) expect(r.played).not.toContain(`${report.act}/${report.beat}`)
    expect(r.state.decisions.filter(d => !d.choiceId.startsWith('orders:'))).toHaveLength(5)
  })
  it('기존 두 비트를 반대 순서로 읽는 두 경로도 5막까지 같은 역사 순서를 유지한다', async () => {
    const a = await playRoute('reports-first'), b = await playRoute('reverse-reports')
    const pair = ['imo/wanhwa-death', 'imo/jaeseon-order']
    expect(a.played.filter(id => pair.includes(id))).toEqual(pair)
    expect(b.played.filter(id => pair.includes(id))).toEqual([...pair].reverse())
    expect(a.historical).toEqual(b.historical)
    expect(a.state.moves).toEqual(b.state.moves)
    expect(b.played.at(-1)).toBe('gapsin/end')
  })
  it.each(['reports-first', 'people-first'])('%s의 모든 저장 지점에서 재개해 같은 기록으로 끝난다', async policy => {
    const full = await playRoute(policy)
    expect(full.saves.length).toBeGreaterThan(90)
    for (const json of full.saves) {
      const saved = deserialize(json)
      const resumed = await playRoute(policy, saved, true)
      expect(resumed.state, `${policy}: ${saved.actIndex}/${saved.beatIndex}`).toEqual(full.state)
    }
  })
})
