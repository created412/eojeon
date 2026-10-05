import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { actSpan, nativeCount, finalLead, moveRows, finalPlaceName, FINAL_QUESTIONS, MOVES_OMITTED_NOTE } from '../../src/ui/act-end.js'
import { applyBeat, enterAct } from '../../src/systems/scenario.js'
import { relocate } from '../../src/systems/relocate.js'
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
    expect(actSpan(upTo3)).toEqual({ from: 1863, to: 1876, span: 13 })
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
    // 「궁을」이었다 — 마지막 두 자리(북묘·청군의 영방)는 궁이 아니다(2026-10-06).
    expect(finalLead({ moves: [{}, {}, {}] })).toContain('거처를 3번 옮겼다')
    expect(finalLead({ moves: [] })).toContain('거처를 0번 옮겼다')
    expect(finalLead({ moves: [{}] })).not.toContain('궁을 1번')
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


// ── 2026-10-06 이야기 점검 — 마지막 화면이 세 막짜리 시절 그대로였다 ─────────────
//
// 선생님: 「내 게임의 가장 큰 장점은 탄탄한 스토리라인이야. 역사 내용과 고종의 입장에
// 감정이입이 될 수 있게 만드는 거고.」
//
// 그런데 학생이 게임에서 마지막으로 읽는 화면이 「불타는 궁에서 무엇을 골랐나요?」를
// 묻고 있었다 — 그 장면은 9월 26일에 걷어 낸 것이다. 그리고 「스스로 정한 것이 몇 번인지는
// 당신이 센다」고 하면서 셀 목록을 주지 않았다.
describe('마지막 화면이 이야기의 끝을 맺는다', () => {
  // 주석은 걷어 내고 본다 — 주석은 무엇을 왜 뺐는지를 그 이름으로 설명한다.
  const NL = String.fromCharCode(10)
  const src = readFileSync(join(process.cwd(), 'src', 'ui', 'act-end.js'), 'utf8')
    .split(NL).filter(l => !l.trim().startsWith('//')).join(NL)

  // 다섯 막의 이어 비트를 차례로 밟아 실제 게임이 남기는 moves 를 만든다.
  function playedMoves() {
    let state = { moves: [], palace: ACTS[0].palace }
    for (const act of ACTS) {
      state = { ...state, palace: act.palace ?? state.palace }
      for (const b of beatsOf(act)) {
        if (b.kind !== 'move') continue
        state = relocate(state, { year: b.year, from: state.palace, to: b.palace, cause: b.cause, self: b.self })
      }
    }
    return state
  }

  it('걷어 낸 장면을 묻지 않는다', () => {
    expect(src).not.toContain('불타는 궁에서')
    expect(FINAL_QUESTIONS.join(' ')).not.toContain('불')
  })

  it('남기는 물음이 이 게임이 끌고 온 두 가지다 — 스스로 정한 것, 그리고 그 자리의 사람', () => {
    expect(FINAL_QUESTIONS).toHaveLength(2)
    expect(FINAL_QUESTIONS[0]).toContain('스스로 정한 것')
    expect(FINAL_QUESTIONS[1]).toContain('당신이라면')
  })

  it('옮겨 다닌 자리를 해·어디서 어디로·까닭으로 적는다', () => {
    const rows = moveRows(playedMoves())
    expect(rows.length).toBeGreaterThanOrEqual(6)
    expect(rows[0]).toMatchObject({ year: 1868, from: '창덕궁', to: '경복궁' })
    expect(rows.at(-1).to).toBe('오조유의 영방')
    for (const r of rows) {
      expect(r.cause, `${r.year} ${r.to} 에 까닭이 없다`).toBeTruthy()
      expect(r.from, `${r.year} 의 떠난 자리가 이름이 아니다`).toMatch(/[가-힣]/)
    }
  })

  it('목록은 스스로 정했는지를 말하지 않는다 (판정 R98)', () => {
    for (const r of moveRows(playedMoves())) {
      expect(Object.keys(r)).toEqual(['year', 'from', 'to', 'cause'])
    }
  })

  it('처음과 끝을 한 줄로 잇는다 — 열두 살의 가마에서 서른세 살의 군영까지', () => {
    const lead = finalLead(playedMoves())
    expect(lead).toContain('열두 살에')
    expect(lead).toContain('운현궁을 나섰고')
    expect(lead).toContain('서른세 살에 청군의 군영에 와 있다')
  })

  it('끝자리가 어디인지 모르면 그 줄을 지어내지 않는다', () => {
    expect(finalPlaceName(undefined)).toBeNull()
    expect(finalLead({ moves: [{}] })).not.toContain('와 있다')
  })

  it('화면에서 줄인 이어가 있다고 여기서도 말한다', () => {
    expect(MOVES_OMITTED_NOTE).toContain('3막')
    expect(src).toContain('MOVES_OMITTED_NOTE}')
  })

  it('다음 막이 없는 자리에서 「다음 막의 어전회의」를 내다보지 않는다', () => {
    expect(src).not.toContain('이제 열리지 않는 것')
  })
})
