import { describe, it, expect } from 'vitest'
import { actSpan, nativeCount, finalLead } from '../../src/ui/act-end.js'
import { beatsOf } from '../../src/systems/scenario.js'
import { ACTS } from '../../src/data/acts.js'

// 마지막 화면의 「1863년부터 1877년까지, 열네 해를 지났다」는 손으로 적혀 있었다.
// 4막 「임오」(1882)가 붙는 순간 그 줄은 거짓이 된다 — 학생이 마지막으로 읽는
// 화면에서 연도가 틀리면 안 된다. 이제 ACTS 에서 뽑고, 이 시험이 그것을 붙든다.
describe('마지막 화면의 햇수는 ACTS 에서 나온다', () => {
  // 5막 「갑신」(1884)이 붙으면서 이 값이 저절로 따라 움직였다 — 손으로 적었더라면
  // 지금도 1882 라고 적혀 있었을 것이다. 그것이 이 함수가 있는 이유다.
  it('다섯 막이 다 배선된 지금, 1863년부터 1884년까지 스물한 해다', () => {
    expect(actSpan()).toEqual({ from: 1863, to: 1884, span: 21 })
    expect(nativeCount(21)).toBe('스물한')
  })

  it('끝 해는 막의 year 가 아니라 그 막이 실제로 닿는 마지막 해다', () => {
    // 3막까지였을 때: 막의 year 는 1873 이지만 마지막 이어(move-1877)가 1877 이다.
    const upTo3 = ACTS.slice(0, 3)
    expect(upTo3[2].year).toBe(1873)
    expect(actSpan(upTo3)).toEqual({ from: 1863, to: 1877, span: 14 })
  })

  it('햇수를 우리말 수로 읽는다 — 「14해」가 아니라 「열네 해」다', () => {
    expect(nativeCount(14)).toBe('열네')
    expect(nativeCount(19)).toBe('열아홉')
    expect(nativeCount(20)).toBe('스물')
    expect(nativeCount(3)).toBe('세')
  })

  it('셀 수 없는 값은 숫자 그대로 둔다 — 화면이 빈칸을 내지 않는다', () => {
    expect(nativeCount(0)).toBe('0')
    expect(nativeCount(60)).toBe('60')
  })
})


// ── 판정 R98 — 엔딩은 학생 대신 세지 않는다 ────────────────────────────
//
// 마지막 비트(5막 'end')는 「스스로 정한 것이 몇 번이었는지는 이 게임이 말하지
// 않는다. 세는 방식에 따라 답이 달라지기 때문이다」라고 말한다. 그런데 바로 다음
// 화면이 state.moves 의 self 를 **참·거짓으로 걸러** 「2번이었다」라고 적고 있었다.
// 1884 환어의 self 는 'disputed' 이고 문자열은 참으로 셈해지기 때문이다.
//
// 무엇을 한 번의 이어로 볼 것인지 정하는 일이 곧 역사가의 일이다. 그 자리에서
// 게임이 스스로 답을 말해 버리면 이 게임에서 가장 좋은 대목이 무너진다.
describe('마지막 화면은 스스로 정한 이동을 세지 않는다 (판정 R98)', () => {
  const MOVE_SETS = {
    '모두 스스로': [{ self: true }, { self: true }, { self: true }],
    '모두 아니다': [{ self: false }, { self: false }, { self: false }],
    '다툼이 섞임': [{ self: false }, { self: true }, { self: 'disputed' }],
    '전부 다툼': [{ self: 'disputed' }, { self: 'disputed' }, { self: 'disputed' }],
    '값이 없음': [{}, {}, {}],
  }

  it('self 가 무엇이든 화면 글이 한 글자도 달라지지 않는다', () => {
    const texts = Object.values(MOVE_SETS).map(moves => finalLead({ moves }))
    expect(new Set(texts).size, 'self 값에 따라 화면이 달라진다 — 게임이 세고 있다').toBe(1)
  })

  it('스스로 정한 횟수를 숫자로 적지 않는다', () => {
    for (const [name, moves] of Object.entries(MOVE_SETS)) {
      const text = finalLead({ moves })
      expect(text, name).not.toMatch(/스스로 정한 것은\s*\d/)
      expect(text, name).not.toMatch(/스스로[^.]*\d+\s*번/)
    }
  })

  it('옮긴 횟수 자체는 그대로 적는다 — 그것은 기록이 남긴 사실이다', () => {
    expect(finalLead({ moves: [{}, {}, {}] })).toContain('궁을 3번 옮겼다')
    expect(finalLead({ moves: [] })).toContain('궁을 0번 옮겼다')
  })

  it('moves 가 아예 없어도 화면이 깨지지 않는다', () => {
    expect(() => finalLead({})).not.toThrow()
  })

  // 마지막 비트와 그 다음 화면이 같은 말을 하는가 — 두 화면은 학생이 잇달아 읽는다.
  it('마지막 비트가 「게임이 말하지 않는다」고 하고, 다음 화면도 세지 않는다', () => {
    const last = beatsOf(ACTS.at(-1)).at(-1)
    expect(last.lines.join(' ')).toContain('이 게임이 말하지 않는다')
    expect(finalLead({ moves: [{ self: 'disputed' }] })).not.toMatch(/\d+\s*번이었다/)
  })

  // ── 판정 I3 — 햇수를 두 곳에서 따로 적지 않는다 ──────────────────────
  //
  // 마지막 비트가 「스무 해 동안」이라 적고 그 다음 화면이 「스물한 해를 지났다」고
  // 적었다. actSpan() 을 만든 이유가 바로 이것인데(손으로 적으면 막이 붙을 때마다
  // 낡는다) 옆 파일에 손으로 적은 햇수가 남아 있었다. 데이터는 세지 않는다.
  it('막을 닫는 비트가 게임 전체의 햇수를 손으로 적지 않는다', () => {
    const last = beatsOf(ACTS.at(-1)).at(-1).lines.join(' ')
    expect(last, '닫는 비트가 햇수를 손으로 적었다 — actSpan() 이 세는 자리다')
      .not.toMatch(/(열|스무|스물|서른)\S*\s*해/)
    // 그러면서 화면 쪽은 여전히 햇수를 말한다 — 지우기만 한 것이 아니다
    expect(finalLead({ moves: [] })).toContain(`${nativeCount(actSpan().span)} 해를 지났다`)
  })
})
