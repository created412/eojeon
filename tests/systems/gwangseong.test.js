import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ACTS } from '../../src/data/acts.js'
import { SOURCES } from '../../src/data/sources.js'
import { NPCS } from '../../src/data/npcs.js'
import { beatsOf } from '../../src/systems/scenario.js'
import { describeDecision } from '../../src/main.js'
import {
  createStand, tick, fire, isOver, weaponOf, frontSquad, inGunReach, standResult, standSummary, cannonRatio, gunRatio,
  CANNON_REACH, SHIP_AT, GUN_REACH, WALL_MAX, BOMBARD_MIN_MS, BOMBARD_MAX_MS, BOMBARD_SHOTS, SHELLS, LANDING_WAVES,
  GUN_RELOAD_MS, CANNON_RELOAD_MS, BREACH_LIMIT, STAND_LINES,
} from '../../src/systems/gwangseong.js'

// 선생님(2026-10-06): 「이거도 좀 더 재미있는 게임으로 다시 만들어, 지금 애들은 그냥 광성보, 초지진
// 글자만 보고 맞춰서 넣을거 같아. 사료를 전혀 읽지 않을거 같다고」
//
// 싸우고 나서 읽는다. 이 판은 이길 수 없다 — 기록이 그렇다.

const STEP = 50
// 한 판을 끝까지 친다. bot(state) 이 참이면 그 틱에 [쏴라]를 누른다.
function play(bot) {
  let s = createStand()
  const log = []
  let landingAt = null, lastAt = null
  for (let i = 0; i < 4000 && !isOver(s); i++) {
    if (bot(s)) { const r = fire(s); s = r.state; log.push(...r.events) }
    const r = tick(s, STEP); s = r.state; log.push(...r.events)
    for (const e of r.events) {
      if (e.type === 'stage' && e.stage === 'landing') landingAt = s.t
      if (e.type === 'stage' && e.stage === 'last') lastAt = s.t
    }
  }
  return { state: s, log, landingAt, lastAt }
}
const ready = s => (weaponOf(s) === 'cannon' ? s.cannonReload <= 0 : s.gunReload <= 0)
const BOTS = {
  // 쏠 수 있을 때마다, 닿는 곳에 든 무리만 쏜다 — 사람이 할 수 있는 가장 좋은 손.
  best: s => ready(s) && (weaponOf(s) === 'cannon' || (!!frontSquad(s) && inGunReach(frontSquad(s)))),
  // 아무것도 누르지 않는다(정족산성처럼 기다린다).
  idle: () => false,
  // 마구 누른다.
  mash: () => true,
  // 성벽 코앞에서야 쏜다.
  late: s => ready(s) && (weaponOf(s) === 'cannon' || (!!frontSquad(s) && frontSquad(s).p <= 0.07)),
}

describe('광성보 — 닿지 않는 포', () => {
  it('저들의 배는 언제나 우리 포가 닿는 곳 밖에 서 있다', () => {
    for (const at of SHIP_AT) expect(at).toBeGreaterThan(CANNON_REACH + 0.2)
  })

  it('포는 몇 번을 쏘아도 닿지 않는다 — 다 물에 떨어진다', () => {
    const { state, log } = play(BOTS.mash)
    expect(state.cannonShots).toBeGreaterThanOrEqual(BOMBARD_SHOTS)
    const shots = log.filter(e => e.type === 'short')
    expect(shots.length).toBe(state.cannonShots)
    for (const e of shots) expect(e.at).toBe(CANNON_REACH)
    expect(standResult(state).stats.cannonHits).toBe(0)
  })

  it('다시 재는 동안에는 포도 총도 나가지 않는다', () => {
    let s = createStand()
    s = fire(s).state
    expect(s.cannonShots).toBe(1)
    expect(cannonRatio(s)).toBe(1)
    const again = fire(s)
    expect(again.state).toBe(s)
    expect(again.events[0].type).toBe('notready')
    s = tick(s, CANNON_RELOAD_MS).state
    expect(fire(s).state.cannonShots).toBe(2)
  })

  it('저들의 포탄은 우리가 쏘든 말든 온다 — 성벽이 깎인다', () => {
    for (const bot of [BOTS.idle, BOTS.best]) {
      const { log, landingAt } = play(bot)
      const shells = log.filter(e => e.type === 'shell' && !e.howitzer)
      expect(shells.length).toBeGreaterThanOrEqual(3)
      expect(landingAt).not.toBeNull()
    }
  })

  it('포격만으로는 성이 무너지지 않는다 — 뚫리는 것은 뭍에서다', () => {
    let s = createStand()
    while (s.stage === 'bombard') s = tick(s, STEP).state
    expect(s.wall).toBeGreaterThanOrEqual(3)
    expect(s.wall).toBeLessThan(WALL_MAX)
  })

  it('포를 쏘아 보아야 다음으로 넘어간다. 그러나 기다리기만 해도 갇히지는 않는다', () => {
    const tried = play(BOTS.best)
    expect(tried.landingAt).toBeGreaterThanOrEqual(BOMBARD_MIN_MS)
    expect(tried.landingAt).toBeLessThan(BOMBARD_MAX_MS)
    const idle = play(BOTS.idle)
    expect(idle.landingAt).toBeGreaterThanOrEqual(BOMBARD_MAX_MS)
    expect(idle.landingAt).toBeLessThan(BOMBARD_MAX_MS + 200)
    expect(SHELLS.at(-1)).toBeLessThan(BOMBARD_MAX_MS)
  })
})

describe('상륙 — 정족산성의 손이 통하지 않는다', () => {
  it('밝은 띠 안에 든 무리는 물러난다 — 화승총은 여전히 맞는다', () => {
    const { state, log } = play(BOTS.best)
    expect(state.repelled).toBeGreaterThanOrEqual(3)
    expect(log.filter(e => e.type === 'hit').length).toBe(state.repelled)
  })

  it('닿기 전에 쏘면 맞지 않고, 다시 재는 동안 쏘지 못한다', () => {
    let s = createStand()
    while (s.stage === 'bombard') s = tick(s, STEP).state
    while (!frontSquad(s)) s = tick(s, STEP).state
    expect(inGunReach(frontSquad(s))).toBe(false)
    const r = fire(s)
    expect(r.events[0].type).toBe('early')
    expect(r.state.repelled).toBe(0)
    expect(r.state.wasted).toBe(1)
    expect(gunRatio(r.state)).toBe(1)
  })

  it('무리는 다시 재는 시간보다 촘촘히 온다 — 쏘는 족족 맞혀도 뒤가 밀린다', () => {
    const gaps = LANDING_WAVES.slice(1).map((w, i) => w.at - LANDING_WAVES[i].at)
    expect(Math.max(...gaps)).toBeLessThan(GUN_RELOAD_MS)
  })

  it('어떻게 치든 성은 무너진다 — 가장 좋은 손으로도, 마구 눌러도, 가만히 있어도', () => {
    for (const [name, bot] of Object.entries(BOTS)) {
      const { state, lastAt } = play(bot)
      expect(isOver(state), name).toBe(true)
      expect(state.breaches, name).toBe(BREACH_LIMIT)
      expect(state.wall, name).toBe(0)
      expect(lastAt, name).not.toBeNull()
      expect(standResult(state).fallen, name).toBe(true)
    }
  })

  it('잘 치면 더 오래 버티고 더 많이 물린다 — 손이 헛되지는 않다', () => {
    const best = play(BOTS.best).state, idle = play(BOTS.idle).state
    expect(best.repelled).toBeGreaterThan(idle.repelled)
    expect(best.heldMs).toBeGreaterThan(idle.heldMs + 2500)
  })

  it('판은 한 호흡에 끝난다 — 가장 길어도 사십 초를 넘지 않고, 가장 짧아도 스무 초는 간다', () => {
    for (const [name, bot] of Object.entries(BOTS)) {
      const { state } = play(bot)
      expect(state.t, name).toBeLessThan(40000)
      expect(state.t, name).toBeGreaterThan(20000)
    }
  })

  it('끝난 뒤에는 무엇을 눌러도 달라지지 않는다', () => {
    const { state } = play(BOTS.best)
    expect(fire(state).state).toBe(state)
    expect(tick(state, 1000).state).toBe(state)
    expect(weaponOf(state)).toBeNull()
  })
})

describe('기록 — 매기지 않는다', () => {
  it('포가 닿지 않았다는 것, 몇 무리를 물렸는지, 성이 무너졌다는 것이 남는다', () => {
    const text = standSummary(play(BOTS.best).state)
    expect(text).toContain('한 번도 닿지 않았다')
    expect(text).toContain('성은 무너졌다')
    expect(text).toMatch(/무리를 \d+번 물렸다/)
  })

  it('기다리기만 한 학생의 기록도 깎지 않는다', () => {
    const text = standSummary(play(BOTS.idle).state)
    expect(text).toContain('기다렸으나 저들은 닿는 곳에 들어오지 않았다')
  })

  it('깎는 낱말을 쓰지 않는다', () => {
    const all = JSON.stringify(STAND_LINES) + standSummary(play(BOTS.idle).state) + standSummary(play(BOTS.best).state)
    expect(all).not.toMatch(/정답|오답|틀렸|실패|점수|감점/)
  })

  it('사초함의 기록이 그 싸움을 되짚는다', () => {
    const { question, text } = describeDecision(ACTS[1], { actIndex: 1, choiceId: 'stand:fallen', reason: '광성보 — 시험' })
    expect(question).toContain('광성보')
    expect(text).toBe('광성보 — 시험')
  })
})

describe('2막의 그 자리 — 싸우고 나서 읽는다', () => {
  const beats = beatsOf(ACTS[1])
  const beat = beats.find(b => b.kind === 'stand')

  it('광성보 판은 경복궁의 낮과 척화비 사이에 있다', () => {
    const at = id => beats.findIndex(b => b.id === id)
    expect(at('day-gyeongbok')).toBe(at('gwangseong-stand') - 1)
    expect(at('gwangseong-stand')).toBe(at('cheokhwabi-order') - 1)
  })

  it('판을 덮으면 미군 장교의 글을 받는다 — 교과서 109쪽에 실린 그대로', () => {
    expect(beat.grantCard).toBe('sinmi-officer')
    const card = SOURCES.find(c => c.id === 'sinmi-officer')
    expect(card.excerpt).toContain('낡은 무기를 가지고 근대적인 미국 대포에 맞서')
    expect(card.origin).toContain('슐리')
  })

  it('그 글을 싸움보다 먼저 건네는 신하가 없다', () => {
    expect(NPCS.some(n => n.cardId === 'sinmi-officer' || (n.cardIds ?? []).includes('sinmi-officer'))).toBe(false)
  })

  it('「실제로는」은 교과서의 문장이다 — 졌고, 그런데 저들이 물러갔다', () => {
    expect(beat.actual).toContain('패하였다')
    expect(beat.actual).toContain('협상에 나서지 않자')
    expect(beat.actualOrigin).toContain('109쪽')
  })

  it('솜씨 탓이 아님을 화면이 말한다 — 「아직, 다시」가 없는 판이다', () => {
    expect(beat.after.join(' ')).toContain('솜씨가 모자라서가 아니다')
    const NL = String.fromCharCode(10)
    const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8').split(NL).filter(l => !l.trim().startsWith('//')).join(NL)
    const body = main.slice(main.indexOf('async function playStand'))
    const fn = body.slice(0, body.indexOf('return flow.state'))
    expect(fn).not.toContain('untilCleared')
    expect(fn).toContain('showPacketCards(cards, done)')
  })

  it('화면에 사람 수·거리의 숫자를 적지 않는다', () => {
    const text = [...beat.intro, ...beat.rules, beat.note, ...beat.after, ...beat.bridge].join(' ')
    expect(text).not.toMatch(/\d+ ?(명|척|문|리|미터|m\b)/)
  })
})
