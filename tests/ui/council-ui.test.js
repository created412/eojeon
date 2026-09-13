import { describe, it, expect } from 'vitest'
import { gateChoices } from '../../src/ui/council-ui.js'
import { createState } from '../../src/core/state.js'

// 어전회의 선택지를 잠그는 까닭이 셋이다. 셋 다 systems/council.js 밖에서
// 판정한다 — 그 파일은 잠금이라 한 글자도 고치지 않는다.
//   (1) 사료를 안 읽었다       — evaluateChoices() 가 판정한다(지금까지의 규칙)
//   (2) 아직 모르는 일이 있다  — needsFlag. 설계서 7.6, 「성공하면 선택지가 열린다」
//   (3) 회의가 얼어붙었다      — frozen. 4막 비트 7, 대원군이 나랏일을 다시 맡는 자리
function stateWith({ read = [], flags = {} } = {}) {
  const s = createState()
  return { ...s, sources: { ...s.sources, held: [...read], read: [...read] }, flags }
}

const beat = {
  council: {
    question: '무엇을 할 것인가',
    choices: [
      { id: 'plain', text: '아무 근거 없이 고른다', requires: [] },
      { id: 'needsCard', text: '조약의 조항을 짚는다', requires: ['ganghwa10'] },
      { id: 'needsKnow', text: '청군에게 도움을 청한다', requires: [], needsFlag: 'queen-alive-known', flagLabel: '왕비가 살아 있다는 것을 모른다' },
    ],
  },
}

describe('gateChoices — 잠그는 까닭이 셋이다', () => {
  it('아무것도 안 읽어도 고를 수 있는 것이 있다 — 회의는 그냥 열린다', () => {
    const g = gateChoices(stateWith(), beat)
    expect(g.find(c => c.id === 'plain').unlocked).toBe(true)
  })

  it('안 읽은 사료가 있으면 그 제목으로 잠긴다', () => {
    const c = gateChoices(stateWith(), beat).find(c => c.id === 'needsCard')
    expect(c.unlocked).toBe(false)
    expect(c.why.join(' ')).toContain('읽지 않았습니다')
  })

  it('읽으면 열린다', () => {
    const c = gateChoices(stateWith({ read: ['ganghwa10'] }), beat).find(c => c.id === 'needsCard')
    expect(c.unlocked).toBe(true)
  })

  it('깃발이 안 서면 잠기고, 까닭이 사료가 아니라 「모른다」로 나온다', () => {
    const c = gateChoices(stateWith(), beat).find(c => c.id === 'needsKnow')
    expect(c.unlocked).toBe(false)
    expect(c.why).toContain('왕비가 살아 있다는 것을 모른다')
  })

  it('깃발이 서면 열린다 — 성공한 학생은 그 선택지가 있는 줄 안다', () => {
    const c = gateChoices(stateWith({ flags: { 'queen-alive-known': true } }), beat).find(c => c.id === 'needsKnow')
    expect(c.unlocked).toBe(true)
  })

  it('얼어붙으면 전부 잠기고 까닭이 하나로 바뀐다', () => {
    const frozen = { ...beat, frozen: true, frozenReason: '대원군이 다시 나랏일을 맡았다' }
    const g = gateChoices(stateWith({ read: ['ganghwa10'], flags: { 'queen-alive-known': true } }), frozen)
    expect(g.every(c => c.unlocked === false)).toBe(true)
    for (const c of g) expect(c.why).toContain('대원군이 다시 나랏일을 맡았다')
  })

  it('얼어붙어도 깃발이 갈린 것은 그대로 보인다 — 아는 것과 못 하는 것은 다르다', () => {
    const frozen = { ...beat, frozen: true, frozenReason: '대원군이 다시 나랏일을 맡았다' }
    const known = gateChoices(stateWith({ flags: { 'queen-alive-known': true } }), frozen).find(c => c.id === 'needsKnow')
    const unknown = gateChoices(stateWith(), frozen).find(c => c.id === 'needsKnow')
    expect(known.text).toBe('청군에게 도움을 청한다')
    expect(unknown.text).toBe(null)
    expect(unknown.why).toContain('왕비가 살아 있다는 것을 모른다')
  })

  it('flags 가 없어도 터지지 않는다', () => {
    expect(() => gateChoices({ ...createState(), flags: undefined }, beat)).not.toThrow()
  })
})

// Task 10 리뷰 지적 (1) — 얼어붙은 회의에서 「『X』을 읽지 않았습니다」가
// frozenReason 과 나란히 남아 있었다. 4막 실데이터(grain, requires:['joil-trade'])가
// 들어오는 순간 학생 화면이 「내가 안 읽어서 막혔다」와 「정치 때문에 막혔다」를
// 동시에 말한다 — 이 화면의 요점은 얼어붙음이 학생 잘못이 아니라는 것이다.
// Task 10 이 넣은 여덟 시험은 이 문구를 지워도 전부 통과했다. 여기서 붙든다.
describe('얼어붙은 회의는 학생 잘못을 말하지 않는다', () => {
  const frozen = { ...beat, frozen: true, frozenReason: '대원군이 다시 나랏일을 맡았다' }

  it('얼지 않은 회의는 무엇을 안 읽었는지 이름으로 말한다 — 이건 그대로다', () => {
    const g = gateChoices(stateWith(), beat)
    expect(g.find(c => c.id === 'needsCard').why.join(' ')).toContain('읽지 않았습니다')
  })

  it('얼어붙은 회의에서는 그 미열람 안내가 사라진다', () => {
    const g = gateChoices(stateWith(), frozen)
    for (const c of g) {
      expect(c.why.join(' '), c.id).not.toContain('읽지 않았습니다')
    }
  })

  it('얼어붙은 회의의 잠금 까닭은 조정 쪽 사정 하나다', () => {
    const g = gateChoices(stateWith(), frozen)
    expect(g.find(c => c.id === 'needsCard').why).toEqual(['대원군이 다시 나랏일을 맡았다'])
    expect(g.find(c => c.id === 'plain').why).toEqual(['대원군이 다시 나랏일을 맡았다'])
  })

  // 「모르는 일」은 남는다 — 학생 잘못이 아니라 「왕이 무엇을 아는가」이고,
  // 얼어붙은 회의에서도 그 갈림이 살아 있는 것이 설계서 7.6 의 요점이다.
  it('그러나 「왕비가 살아 있다는 것을 모른다」는 얼어붙어도 그대로 뜬다', () => {
    const g = gateChoices(stateWith(), frozen)
    const know = g.find(c => c.id === 'needsKnow')
    expect(know.text).toBe(null)                       // ??? 로 뜬다
    expect(know.why).toContain('왕비가 살아 있다는 것을 모른다')
  })

  it('알고 있으면 얼어붙은 회의에서도 그 선택지의 이름이 보인다 — 보이는데 못 누른다', () => {
    const g = gateChoices(stateWith({ flags: { 'queen-alive-known': true } }), frozen)
    const know = g.find(c => c.id === 'needsKnow')
    expect(know.text).toBe('청군에게 도움을 청한다')
    expect(know.unlocked).toBe(false)
    expect(know.why).toEqual(['대원군이 다시 나랏일을 맡았다'])
  })
})
