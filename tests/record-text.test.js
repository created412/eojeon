import { describe, it, expect } from 'vitest'
import { describeDecision, buildRecordText } from '../src/main.js'
import { ACTS } from '../src/data/acts.js'
import { createState } from '../src/core/state.js'
import { pickUp, markRead, plunder, survive } from '../src/systems/codex.js'
import { recordLoss } from '../src/systems/loss-log.js'
import { serialize, deserialize } from '../src/core/state.js'

function hold(state, ids) {
  return ids.reduce((s, id) => markRead(pickUp(s, id), id), state)
}

const act0 = ACTS[0]   // '즉위' — council 비트 하나
const act1 = ACTS[1]   // '양요' — council-byeongin · orders 는 없다(훈령은 3막)

describe('describeDecision — 결정 하나를 질문·고른 문구로 되짚는다', () => {
  it('어전회의 결정은 그 비트의 question·choice.text 를 그대로 돌려준다', () => {
    const { question, text } = describeDecision(act0, { actIndex: 0, choiceId: 'coin', reason: '' })
    expect(question).toBe('경복궁을 다시 짓는 비용을 어디서 걷는가')
    expect(text).toBe('당백전을 발행한다')
  })

  it('훈령 결정은 orders: 접두어를 벗기고 고른 조항들을 이어붙인다', () => {
    const ordersAct = ACTS[2]   // '친정' — orders-sinheon
    const { text } = describeDecision(ordersAct, { actIndex: 2, choiceId: 'orders:greet+unyo', reason: '' })
    expect(text).toContain('예로써 맞이하되')
    expect(text).toContain('먼저 포를 쏜 것이')
  })

  it('아무 훈령도 안 적었으면 그렇게 말한다', () => {
    const ordersAct = ACTS[2]
    const { text } = describeDecision(ordersAct, { actIndex: 2, choiceId: 'orders:none', reason: '' })
    expect(text).toBe('(아무 훈령도 적지 않음)')
  })
})

describe('buildRecordText — 「내 기록 복사」에 실제로 들어가는 글', () => {
  it('일부만 채운 빈칸도 저장을 거쳐 복사할 때 원래 칸의 순서를 유지한다', () => {
    const state = deserialize(serialize({ ...createState(), inquiries: {
      'joseon-chaeryak': { blanks: { 3: '일본' }, text: '작성 중' },
    } }))
    expect(buildRecordText(state, ACTS)).toContain('채운 빈칸 — (빈칸) / (빈칸) / (빈칸) / 일본')
  })

  it('사료의 근거·첫 해석·비교 뒤 보완을 함께 보존한다', () => {
    const state = { ...createState(), inquiries: { seogye: {
      selected: ['皇', '勅'], text: '교린의 격식과 충돌한다.', compared: true,
      revision: '새 정부 수립 통보의 맥락도 검토한다.',
    } } }
    const text = buildRecordText(state, ACTS)
    expect(text).toContain('표시한 근거 — 皇 / 勅')
    expect(text).toContain('나의 해석 — 교린의 격식과 충돌한다.')
    expect(text).toContain('해설과 비교 — 비교함')
    expect(text).toContain('보완한 생각 — 새 정부 수립 통보의 맥락도 검토한다.')
  })
  it('아무것도 안 했으면 그렇게 말하고, 읽은 문서도 0장이다', () => {
    const text = buildRecordText(createState(), ACTS)
    expect(text).toContain('(아직 정한 것이 없다)')
    expect(text).toContain('읽은 문서 0장 — (없음)')
  })

  it('결정과 남긴 말이 막 제목과 함께 나온다', () => {
    let s = createState()
    s = { ...s, decisions: [...s.decisions, { actIndex: 0, choiceId: 'coin', reason: '급한 대로' }] }
    const text = buildRecordText(s, ACTS)
    expect(text).toContain('[1막 「즉위」]')
    expect(text).toContain('선택 — 당백전을 발행한다')
    expect(text).toContain('남긴 말 — 급한 대로')
  })

  // 2단계 Important 1 — 아홉 장을 읽고 그중 몇 장을 불이나 약탈로 잃어도, 기록은
  // "읽은 것"을 줄이지 않는다. 대신 무엇을 어떻게 잃었는지 표시한다.
  it('불에 잃은 문서도 "읽은 문서" 수에 남고, 잃은 사유가 붙는다', () => {
    let s = hold(createState(), ['a', 'b', 'c'])
    s = recordLoss(survive(s, ['a']), ['b', 'c'], 'fire')
    const text = buildRecordText(s, ACTS)
    expect(text).toContain('읽은 문서 3장')
    expect(text).toContain('b (불탐)')
    expect(text).toContain('c (불탐)')
    expect(text).not.toContain('읽은 문서 1장')
  })

  it('약탈로 잃은 문서는 프랑스라고 밝힌다', () => {
    let s = hold(createState(), ['oegyujanggak'])
    s = recordLoss(plunder(s, ['oegyujanggak']), ['oegyujanggak'], 'plunder')
    const text = buildRecordText(s, ACTS)
    expect(text).toContain('약탈됨 · 프랑스')
  })

  it('3막에서 불러도 1·2막 결정이 모두 나온다(버그 B)', () => {
    let s = createState()
    s = {
      ...s,
      decisions: [
        ...s.decisions,
        { actIndex: 0, choiceId: 'coin', reason: '' },
        { actIndex: 1, choiceId: act1.beats.find(b => b.kind === 'council').council.choices[0].id, reason: '' },
      ],
    }
    const text = buildRecordText(s, ACTS)
    expect(text).toContain('[1막 「즉위」]')
    expect(text).toContain('[2막 「양요」]')
  })
})

// Task 10 이 남긴 미결 — 얼어붙은 어전회의는 onDecide('frozen', …) 을 부른다.
// 'frozen' 은 어느 선택지의 id 도 아니므로 예전 fallback 이 그 영어 낱말을 그대로
// 돌려주었고, 「내 기록 복사」— 학생이 활동지·패들렛에 붙여 넣는 그 산출물 — 에
// 「선택 — frozen」 이라고 찍혔다. 화면(frozenChoiceLabel)과 기록이 같은 한국어
// 문구를 나눠 쓰게 해서 닫는다.
describe('얼어붙은 어전회의의 기록 — 영어 낱말이 학생 활동지로 나가지 않는다', () => {
  const imoIndex = ACTS.findIndex(a => a.id === 'imo')
  const imo = ACTS[imoIndex]

  it("describeDecision 이 'frozen' 을 그 회의의 질문과 한국어 문구로 되짚는다", () => {
    const frozen = imo.beats.find(b => b.kind === 'council' && b.frozen)
    const { question, text } = describeDecision(imo, { actIndex: imoIndex, choiceId: 'frozen', reason: '' })
    expect(question).toBe(frozen.council.question)
    expect(text).toBe(frozen.frozenChoiceLabel)
    expect(text).not.toBe('frozen')
  })

  it('「내 기록 복사」 글에 영어 낱말 frozen 이 한 번도 나오지 않는다', () => {
    let s = createState()
    s = { ...s, decisions: [{ actIndex: imoIndex, choiceId: 'frozen', reason: '아무 말도 못 했다' }] }
    const text = buildRecordText(s, ACTS)
    expect(text).toContain(`[${imoIndex + 1}막 「임오」]`)
    expect(text).toContain('선택 — 아무것도 고르지 못했다')
    expect(text).toContain('남긴 말 — 아무 말도 못 했다')
    expect(text).not.toContain('frozen')
  })
})
