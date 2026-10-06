import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WEIGHS, weighById } from '../../src/data/weigh.js'
import { ACTS } from '../../src/data/acts.js'
import { SOURCES } from '../../src/data/sources.js'
import { SOURCE_READS } from '../../src/data/source-games.js'
import { NPCS } from '../../src/data/npcs.js'
import { beatsOf } from '../../src/systems/scenario.js'
import { describeDecision } from '../../src/main.js'
import {
  initialWeigh, begin, hear, allHeard, answerAsk, askHint, sit, currentWeight, place, onPan, setAside, panLoad, tilt,
  leanOf, ownLean, heaviest, decide, actualSteps, currentStep, next, liftedOf, sealed, weighSummary, weighRecord,
  HEFTS, SEAL_HEFT, ASK_HINT_AFTER,
} from '../../src/systems/weigh.js'

// 선생님(2026-10-06): 「나라의 문을 여는 문호개방에 대하여 대원군이 물러난 뒤에 신하들의 의견을 듣고
// 고종이 치열하게 고민하는 장면을 교육적인 게임으로 적용하고 싶어. 이 고민이 정말 게임의 백미가
// 되었으면 좋겠어.」
const data = WEIGHS.open1876
const ids = data.weights.map(w => w.id)

// 대신 여섯을 다 듣고, 물음에 답하고, 저울 앞에 앉은 데까지.
function seated() {
  let s = begin(initialWeigh())
  for (const m of data.hearing.ministers) s = hear(data, s, m.id)
  s = answerAsk(data, s, data.hearing.ask.answer).state
  return sit(data, s)
}
// 추마다 고를 읽기와 무게를 정해 끝까지 올린다. pick(weight) → [readingId, heft]
function placedAll(pick) {
  let s = seated()
  for (const w of data.weights) {
    const [readingId, heft] = pick(w)
    s = place(data, s, w.id, readingId, heft)
  }
  return s
}
const sideOf = (w, side) => w.readings.find(r => r.side === side) ?? w.readings[0]
const allShut = () => placedAll(w => [sideOf(w, 'shut').id, 3])
const firstReading = () => placedAll(w => [w.readings[0].id, 2])

describe('임금의 저울 — 적는 법', () => {
  it('대신은 여섯이고, 저마다 벼슬·이름·말이 있다', () => {
    expect(data.hearing.ministers.length).toBe(6)
    for (const m of data.hearing.ministers) {
      expect(m.post.length, m.id).toBeGreaterThan(1)
      expect(m.name.length, m.id).toBeGreaterThan(1)
      expect(m.line.startsWith('「') && m.line.endsWith('」'), `${m.id} 의 말은 기록에서 옮긴 것이다`).toBe(true)
    }
  })

  it('여섯 가운데 「받아들이자」「물리치자」고 말하는 사람이 없다 — 기록이 그렇다', () => {
    const all = data.hearing.ministers.map(m => m.line).join(' ')
    expect(all).not.toMatch(/받아들이|물리치|거절|허락/)
    expect(data.hearing.ask.answer).toBe('none')
  })

  it('다 듣고 묻는 물음 — 답이 아닌 것마다 왜 아닌지를 짚는 말이 있다', () => {
    const ask = data.hearing.ask
    expect(ask.options.filter(o => o.id === ask.answer).length).toBe(1)
    for (const o of ask.options) if (o.id !== ask.answer) expect(o.say.length, o.id).toBeGreaterThan(10)
  })

  it('추마다 읽는 길이 둘이고, 두 길은 서로 다른 쪽으로 간다', () => {
    for (const w of data.weights) {
      expect(w.readings.length, w.id).toBe(2)
      expect(new Set(w.readings.map(r => r.side)).size, `${w.id} 의 두 읽기가 같은 쪽이다`).toBe(2)
      for (const r of w.readings) expect(['shut', 'open', 'none']).toContain(r.side)
      expect(w.tag.length, w.id).toBeGreaterThan(1)
      expect((w.mark ?? w.tag).length, `${w.id} 의 새길 이름이 추에 들어가지 않는다`).toBeLessThanOrEqual(4)
      expect(w.excerpt.length, w.id).toBeGreaterThan(20)
      expect(w.origin.length, w.id).toBeGreaterThan(8)
      expect(['source', 'memory', 'hindsight']).toContain(w.grade)
    }
  })

  it('기록에서 온 추는 실록의 날짜를 밝히고, 지나온 일의 추는 기록이 아님을 밝힌다', () => {
    for (const w of data.weights) {
      if (w.grade === 'source') expect(w.origin, w.id).toMatch(/『고종실록』.*1월 \d+일/)
      if (w.grade === 'memory') expect(w.origin, w.id).toContain('기록은 없습니다')
    }
  })

  it('뒷날의 눈은 하나뿐이고, 맨 끝에 온다', () => {
    const hind = data.weights.filter(w => w.hindsight)
    expect(hind.length).toBe(1)
    expect(data.weights.at(-1).hindsight).toBe(true)
    expect(hind[0].grade).toBe('hindsight')
  })

  it('한쪽으로만 올릴 수 있게 짜이지 않았다 — 닫는 쪽에도 여는 쪽에도 올릴 추가 넉넉하다', () => {
    const can = side => data.weights.filter(w => w.readings.some(r => r.side === side)).length
    expect(can('shut')).toBeGreaterThanOrEqual(4)
    expect(can('open')).toBeGreaterThanOrEqual(4)
  })

  it('「실제로는」의 걸음이 가리키는 추가 실제로 있다. 도장은 마지막 걸음에 한 번 찍힌다', () => {
    for (const step of data.actual) {
      for (const id of step.lifts ?? []) expect(ids, `${step.id} 가 없는 추 ${id} 를 걷는다`).toContain(id)
      if (step.onlyIfPlaced) expect(ids).toContain(step.onlyIfPlaced)
      expect(step.when.startsWith('실제로는'), step.id).toBe(true)
      expect(step.origin.length, step.id).toBeGreaterThan(5)
    }
    expect(data.actual.filter(s => s.seal).length).toBe(1)
    expect(data.actual.at(-1).seal).toBe(true)
  })

  it('깎는 낱말을 쓰지 않는다', () => {
    expect(JSON.stringify(WEIGHS)).not.toMatch(/정답|오답|틀렸|실패|점수|감점/)
  })

  it('없는 판은 null 이다', () => {
    expect(weighById('없는판')).toBeNull()
    expect(weighById('open1876')).toBe(data)
  })
})

describe('대신들에게 묻는다', () => {
  it('여섯을 다 듣기 전에는 물음에 답할 수 없다', () => {
    let s = begin(initialWeigh())
    s = hear(data, s, data.hearing.ministers[0].id)
    const r = answerAsk(data, s, data.hearing.ask.answer)
    expect(r.ok).toBe(false)
    expect(r.state.asked).toBe(false)
    expect(allHeard(data, s)).toBe(false)
  })

  it('같은 사람을 두 번 눌러도 한 번 들은 것이다', () => {
    let s = begin(initialWeigh())
    const id = data.hearing.ministers[0].id
    s = hear(data, hear(data, s, id), id)
    expect(s.heard).toEqual([id])
  })

  it('다른 것을 고르면 왜 아닌지를 듣고, 저울 앞에 앉지 못한다', () => {
    let s = begin(initialWeigh())
    for (const m of data.hearing.ministers) s = hear(data, s, m.id)
    const wrong = data.hearing.ask.options.find(o => o.id !== data.hearing.ask.answer)
    const r = answerAsk(data, s, wrong.id)
    expect(r.ok).toBe(false)
    expect(r.say).toBe(wrong.say)
    expect(sit(data, r.state).stage).toBe('hearing')
  })

  it(`${ASK_HINT_AFTER}번 헛짚으면 답이 빛난다 — 갇히는 학생이 없다`, () => {
    let s = begin(initialWeigh())
    for (const m of data.hearing.ministers) s = hear(data, s, m.id)
    const wrong = data.hearing.ask.options.find(o => o.id !== data.hearing.ask.answer)
    expect(askHint(data, s)).toBeNull()
    for (let i = 0; i < ASK_HINT_AFTER; i++) s = answerAsk(data, s, wrong.id).state
    expect(askHint(data, s)).toBe(data.hearing.ask.answer)
  })

  it('답하면 저울 앞에 앉는다 — 첫 추가 손에 온다', () => {
    const s = seated()
    expect(s.stage).toBe('weights')
    expect(currentWeight(data, s).id).toBe(ids[0])
  })
})

describe('추를 올린다', () => {
  it('차례대로만 올린다 — 손에 든 추가 아니면 놓이지 않는다', () => {
    const s = seated()
    const later = data.weights[2]
    expect(place(data, s, later.id, later.readings[0].id, 2)).toBe(s)
  })

  it('저울에 올리는 읽기는 무게를 정해야 놓인다', () => {
    const s = seated()
    const w = data.weights[0], r = w.readings.find(x => x.side !== 'none')
    expect(place(data, s, w.id, r.id)).toBe(s)
    expect(place(data, s, w.id, r.id, 9)).toBe(s)
    for (const h of HEFTS) expect(place(data, s, w.id, r.id, h).placed[w.id].heft).toBe(h)
  })

  it('올린 쪽이 무거워진다 — 저울이 그쪽으로 기운다', () => {
    const s = seated()
    const w = data.weights[0]
    const open = place(data, s, w.id, sideOf(w, 'open').id, 2)
    const shut = place(data, s, w.id, sideOf(w, 'shut').id, 2)
    expect(tilt(data, open)).toBe(2)
    expect(tilt(data, shut)).toBe(-2)
    expect(leanOf(data, open)).toBe('open')
    expect(leanOf(data, shut)).toBe('shut')
  })

  it('「올리지 않는다」고 읽은 추는 저울에 오르지 않고 곁에 놓인다', () => {
    let s = seated()
    for (const w of data.weights) {
      const none = w.readings.find(r => r.side === 'none')
      s = place(data, s, w.id, (none ?? w.readings[0]).id, none ? null : 1)
    }
    const aside = setAside(data, s).map(w => w.id)
    expect(aside.length).toBeGreaterThanOrEqual(2)
    for (const id of aside) {
      expect(onPan(data, s, 'open').some(w => w.id === id)).toBe(false)
      expect(onPan(data, s, 'shut').some(w => w.id === id)).toBe(false)
    }
  })

  it('여덟을 다 놓으면 정할 자리가 온다', () => {
    const s = firstReading()
    expect(s.stage).toBe('decide')
    expect(currentWeight(data, s)).toBeNull()
    expect(s.order).toEqual(ids)
  })

  it('가장 무겁게 올린 추를 안다 — 같은 무게면 모두', () => {
    const s = placedAll(w => [sideOf(w, 'shut').id, w.id === 'father' || w.id === 'troops' ? 3 : 1])
    expect(heaviest(data, s).map(w => w.id).sort()).toEqual(['father', 'troops'])
  })

  it('무엇을 얼마나 올렸든 정하는 것은 학생이다 — 저울과 반대로도 고를 수 있다', () => {
    const s = allShut()
    expect(ownLean(data, s)).toBe('shut')
    expect(decide(data, s, 'open').choice).toBe('open')
    expect(decide(data, s, 'shut').choice).toBe('shut')
    expect(decide(data, s, '딴것')).toBe(s)
  })
})

describe('실제로는 — 역사는 바뀌지 않는다', () => {
  const run = (s, side) => {
    let state = decide(data, s, side)
    const seen = []
    while (state.stage === 'actual') { seen.push(currentStep(data, state).id); state = next(data, state) }
    return { state, seen }
  }

  it('무엇을 얼마나 올리고 무엇을 고르든, 끝에는 여는 쪽이 내려앉는다', () => {
    for (const s of [allShut(), firstReading(), placedAll(w => [sideOf(w, 'open').id, 3])]) {
      for (const side of ['open', 'shut']) {
        const { state } = run(s, side)
        expect(state.stage).toBe('closing')
        expect(sealed(data, state)).toBe(true)
        expect(leanOf(data, state)).toBe('open')
      }
    }
  })

  it('도장은 올릴 수 있는 추를 모두 합친 것보다 무겁다', () => {
    expect(SEAL_HEFT).toBeGreaterThan(data.weights.length * Math.max(...HEFTS))
  })

  it('임금의 전교가 「왜와 양」을, 유배가 「물건」을 저울에서 걷는다', () => {
    let s = decide(data, allShut(), 'shut')
    expect(currentStep(data, s).id).toBe('decree')
    expect(liftedOf(data, s)).toEqual(['yang'])
    expect(onPan(data, s, 'shut').some(w => w.id === 'yang')).toBe(false)
    s = next(data, s)
    expect(currentStep(data, s).id).toBe('exile')
    expect(liftedOf(data, s).sort()).toEqual(['goods', 'yang'])
  })

  it('뒷날의 눈을 올린 학생에게만 그 추를 걷는 걸음이 보인다', () => {
    const withHind = run(allShut(), 'shut').seen
    expect(withHind).toContain('hindsight')
    const without = run(placedAll(w => [(w.readings.find(r => r.side === 'none') ?? w.readings[0]).id, 1]), 'shut').seen
    expect(without).not.toContain('hindsight')
    expect(without.at(-1)).toBe('treaty')
  })

  it('곁에 내려놓았던 추는 걷을 것이 없다 — 걷힌 목록에 오르지 않는다', () => {
    const s = decide(data, placedAll(w => [(w.readings.find(r => r.side === 'none') ?? w.readings[0]).id, 1]), 'open')
    expect(liftedOf(data, s)).toEqual([])
  })

  it('도장은 마지막 걸음에서야 찍힌다', () => {
    let s = decide(data, firstReading(), 'open')
    const steps = actualSteps(data, s)
    for (let i = 0; i < steps.length - 1; i++) { expect(sealed(data, s), steps[i].id).toBe(false); s = next(data, s) }
    expect(sealed(data, s)).toBe(true)
    expect(panLoad(data, s, 'open')).toBeGreaterThanOrEqual(SEAL_HEFT)
  })

  it('끝까지 가야 덮인다', () => {
    const { state } = run(firstReading(), 'open')
    expect(weighRecord(data, state).done).toBe(false)
    expect(weighRecord(data, next(data, state)).done).toBe(true)
  })
})

describe('기록에 남는 것', () => {
  it('고른 쪽, 저울이 기운 쪽, 추마다의 읽기와 무게가 적힌다', () => {
    const s = decide(data, allShut(), 'open')
    const text = weighSummary(data, s)
    expect(text).toContain('닫는 쪽으로 기울었고')
    expect(text).toContain(`「${data.pans.open.label}」`)
    for (const w of data.weights) expect(text).toContain(`「${w.tag}」`)
    expect(text.split('\n').length).toBe(data.weights.length + 1)
  })

  it('저울을 따랐는지가 남는다 — 매기는 것이 아니라 이야기할 거리다', () => {
    const s = allShut()
    expect(weighRecord(data, decide(data, s, 'shut')).followedScale).toBe(true)
    expect(weighRecord(data, decide(data, s, 'open')).followedScale).toBe(false)
  })

  it('사초함의 기록이 물음과 고른 쪽을 되짚는다', () => {
    const { question, text } = describeDecision(ACTS[2], { actIndex: 2, choiceId: 'weigh:open1876:shut', reason: '' })
    expect(question).toBe(data.question)
    expect(text).toBe(data.pans.shut.label)
  })
})

describe('3막의 차례 — 맺기 전에 고민한다', () => {
  const beats = beatsOf(ACTS[2])
  const at = id => beats.findIndex(b => b.id === id)

  it('훈령 → 등본이 올라온다 → 조약문을 뜯어 읽는다 → 임금의 저울 → 무역 규칙', () => {
    expect(at('orders-sinheon')).toBeLessThan(at('treaty-draft'))
    expect(at('treaty-draft')).toBe(at('treaty-study') - 1)
    expect(at('treaty-study')).toBe(at('council-treaty') - 1)
    expect(at('council-treaty')).toBe(at('joil-trade-note') - 1)
    expect(beats[at('council-treaty')].kind).toBe('weigh')
    expect(beats[at('council-treaty')].weigh).toBe('open1876')
  })

  it('저울 앞에서는 조약이 이미 맺어졌다고 말하지 않는다 — 앞의 장면들이 결과를 먼저 흘리지 않는다', () => {
    const before = beats.slice(0, at('council-treaty'))
    const text = JSON.stringify(before.map(b => [b.lines, b.visitors?.map(v => v.lines), b.actual?.line]))
    expect(text).not.toMatch(/맺은 조약|조약은 그해 2월에 맺어졌다|조약이 맺어졌/)
  })

  it('3막의 손잡이는 저울이다', () => {
    expect(ACTS[2].handle.beat).toBe('council-treaty')
    expect(ACTS[2].handle.line).toContain('저울')
  })

  it('저울을 덮으면 교과서의 「찬성」 사료를 받는다 — 그 글은 임금의 전교다', () => {
    const beat = beats[at('council-treaty')]
    expect(beat.grantCard).toBe('gaehang-chanseong')
    const card = SOURCES.find(c => c.id === 'gaehang-chanseong')
    expect(card.excerpt).toContain('왜인을 제어하는 일은 왜인을 제어하는 일이고')
    expect(card.origin).toContain('『승정원일기』')
    expect(card.meaning).toContain('전교')
    const probe = SOURCE_READS['gaehang-chanseong'].probe
    expect(probe.options.find(o => o.id === probe.answer).text).toContain('임금')
  })

  it('그 글을 낮에 미리 건네는 신하가 없다 — 전교는 저울 뒤에 나온다', () => {
    expect(NPCS.some(n => n.cardId === 'gaehang-chanseong' || (n.cardIds ?? []).includes('gaehang-chanseong'))).toBe(false)
  })

  it('최익현의 글은 교과서에 실린 그대로다', () => {
    const card = SOURCES.find(c => c.id === 'choe-ikhyeon')
    expect(card.excerpt).toContain('한번 사이좋게 지내면 사학(邪學)이 전해져 전국에 두루 퍼질 것입니다')
    expect(card.origin).toContain('『면암 선생 문집』')
  })
})

describe('화면이 실제로 그렇게 묶여 있다', () => {
  const NL = String.fromCharCode(10)
  const read = p => readFileSync(join(process.cwd(), ...p), 'utf8').split(NL).filter(l => !l.trim().startsWith('//')).join(NL)
  const ui = read(['src', 'ui', 'weigh.js'])
  const main = read(['src', 'main.js'])

  it('저울에 숫자를 띄우지 않는다 — 기운 것은 눈으로 본다', () => {
    expect(ui).not.toMatch(/panLoad\(/)
    expect(ui).not.toContain('tilt(data, state)}')
  })

  it('읽기를 고른 뒤에야 무게를 묻는다', () => {
    expect(ui).toContain('hefts.hidden = false')
    expect(ui).toContain("if (readingOf(w, picked).side === 'none')")
  })

  it('움직임을 줄이라는 설정이면 저울이 흔들리지 않는다', () => {
    expect(ui).toContain('prefers-reduced-motion')
    expect(ui).toContain('if (reduced) { angle = target; drawBeam(); return }')
  })

  it('저울을 덮은 뒤 받은 문서를 곧바로 편다', () => {
    const body = main.slice(main.indexOf('async function playWeigh'))
    expect(body.slice(0, body.indexOf('return flow.state'))).toContain('showPacketCards(cards, done)')
  })
})
