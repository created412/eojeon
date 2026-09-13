import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { relocate, moveCount, selfChosenMoves, lastMove } from '../../src/systems/relocate.js'

const move1868 = { year: 1868, from: 'changdeok', to: 'gyeongbok', cause: '중건 완료', self: false }
const move1875 = { year: 1875, from: 'changdeok', to: 'gyeongbok', cause: '환어', self: true }

describe('이어 기록', () => {
  it('옮기면 궁이 바뀌고 기록이 한 줄 남는다', () => {
    const s = relocate(createState(), move1868)
    expect(s.palace).toBe('gyeongbok')
    expect(s.moves).toEqual([move1868])
  })

  it('조작권은 건드리지 않는다', () => {
    const s = relocate({ ...createState(), control: 'B' }, move1868)
    expect(s.control).toBe('B')
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s0 = createState()
    relocate(s0, move1868)
    expect(s0.moves).toEqual([])
    expect(s0.palace).toBe('changdeok')
  })

  it('여러 번 옮기면 순서대로 쌓인다', () => {
    let s = relocate(createState(), move1868)
    s = relocate(s, { year: 1873, from: 'gyeongbok', to: 'changdeok', cause: '자경전 화재', self: false })
    s = relocate(s, move1875)
    expect(moveCount(s)).toBe(3)
    expect(s.moves.map(m => m.year)).toEqual([1868, 1873, 1875])
    expect(s.palace).toBe('gyeongbok')
  })

  it('화재 변형으로 옮겨도 같은 궁이면 기록하지 않는다', () => {
    const s0 = { ...createState(), palace: 'gyeongbok' }
    const s = relocate(s0, { year: 1873, from: 'gyeongbok', to: 'gyeongbok_jagyeong', cause: '불탄 뒤', self: false })
    expect(s.palace).toBe('gyeongbok_jagyeong')
    expect(moveCount(s)).toBe(0)
  })

  it('스스로 정한 이동만 골라낼 수 있다', () => {
    let s = relocate(createState(), move1868)
    s = relocate(s, move1875)
    expect(selfChosenMoves(s).map(m => m.year)).toEqual([1875])
  })

  it('마지막 이동을 알 수 있다', () => {
    expect(lastMove(createState())).toBeNull()
    expect(lastMove(relocate(createState(), move1868)).year).toBe(1868)
  })
})

// ── 실제 네 건의 이어 — history-verification-A.md 가 실록 기사 ID까지 확정한 음력 날짜.
// 양력 환산은 어떤 자료로도 특정하지 못했다(「확인불가」) — 그래서 여기 문자열에는
// 양력이 단 한 글자도 없다. relocate() 자체는 날짜를 모르지만, 이 게임이 실제로
// 실어 보낼 이어 데이터가 그 규칙을 지키는지 여기서 못 박는다 — 나중에 막 데이터를
// 채울 때 압축하거나 날짜를 흐리면 이 시험이 먼저 깨진다.
const HISTORICAL_MOVES = [
  // 1868 — 중건 완료. 창덕궁에서 아버지가 지은 집으로.
  { year: 1868, from: 'changdeok', to: 'gyeongbok', cause: '중건 완료', self: false, control: 'C',
    lunarDate: '음력 7월 2일' },
  // 1873 — 자경전 일곽 화재(음 12.10)가 난 바로 그날 밤이 아니라, 열흘 뒤(음 12.20)에
  // 옮긴다. 화재 자체는 relocate() 가 아니라 별도의 촉박(C1) 비트가 맡아 궁을
  // gyeongbok_jagyeong(불탄 변형)으로 바꿔 둔다 — 여기 두 날짜를 하나로 합치면
  // "그날 밤 도망쳤다"는 틀린 인상을 준다. from 이 gyeongbok 이 아니라 그 변형인 이유도 같다.
  { year: 1873, from: 'gyeongbok_jagyeong', to: 'changdeok', cause: '자경전 일곽 화재', self: false, control: 'B',
    lunarDate: '음력 12월 20일' },
  // 1875 — 환어. 스무 해 이어 중 유일하게 스스로 정한 이동. 5.28 이 아니라 5.27 이다.
  { year: 1875, from: 'changdeok', to: 'gyeongbok', cause: '환어', self: true, control: 'A',
    lunarDate: '음력 5월 27일' },
  // 1877 — 1876.11.4 대화재 뒤 그해 겨울을 불탄 궁에서 나며 넉 달을 기다려 옮긴다.
  { year: 1877, from: 'gyeongbok_burnt', to: 'changdeok', cause: '경복궁 대화재(음 1876.11.4, 830여 간) 뒤',
    self: false, control: 'B', lunarDate: '음력 3월 10일' },
]

describe('실제 이어 네 건 — 압축하지 않고, 양력을 적지 않는다', () => {
  it('네 날짜 모두 「음력」으로만 적혀 있고 양력 표기가 섞여 있지 않다', () => {
    for (const m of HISTORICAL_MOVES) {
      expect(m.lunarDate, m.year).toMatch(/^음력 /)
      expect(m.lunarDate, m.year).not.toMatch(/양력/)
    }
  })

  it('1873 이어는 화재 당일(12.10)이 아니라 열흘 뒤(12.20)로 적혀 있다 — 압축하지 않는다', () => {
    const m = HISTORICAL_MOVES.find(m => m.year === 1873)
    expect(m.lunarDate).toBe('음력 12월 20일')
    expect(m.lunarDate).not.toBe('음력 12월 10일')
  })

  it('1875 환어는 5.27 이다 — 웹에 흔한 5.28 오기가 아니다', () => {
    const m = HISTORICAL_MOVES.find(m => m.year === 1875)
    expect(m.lunarDate).toBe('음력 5월 27일')
  })

  it('1877 이어는 3.10 이고, 원인에 넉 달 전 대화재(1876.11.4)가 남아 있다', () => {
    const m = HISTORICAL_MOVES.find(m => m.year === 1877)
    expect(m.lunarDate).toBe('음력 3월 10일')
    expect(m.cause).toContain('1876.11.4')
  })

  it('네 건을 순서대로 적용하면 궁이 실제 순서대로 바뀌고 전부 기록된다 — 화재 변형은 이어가 아니다', () => {
    let s = createState() // changdeok 에서 시작
    s = relocate(s, HISTORICAL_MOVES[0])                    // 1868 → gyeongbok
    s = { ...s, palace: 'gyeongbok_jagyeong' }               // 음 12.10 화재 — relocate() 를 거치지 않는 변형
    s = relocate(s, HISTORICAL_MOVES[1])                     // 1873 → changdeok
    s = relocate(s, HISTORICAL_MOVES[2])                     // 1875 → gyeongbok
    s = { ...s, palace: 'gyeongbok_burnt' }                  // 음 1876.11.4 대화재 — 역시 변형
    s = relocate(s, HISTORICAL_MOVES[3])                     // 1877 → changdeok
    expect(s.palace).toBe('changdeok')
    expect(moveCount(s)).toBe(4)
    expect(s.moves.map(m => m.year)).toEqual([1868, 1873, 1875, 1877])
  })

  it('조작권은 1875 에서만 A 로 오른다 — 스무 해 중 학생이 스스로 고르는 유일한 이동', () => {
    // relocate() 는 조작권을 건드리지 않는다(비트의 control 이 이미 처리) — 여기서는
    // 각 이어에 실려 갈 그 control 값 자체가 스펙(설계서 5장 B)과 맞는지를 고정한다.
    const byYear = Object.fromEntries(HISTORICAL_MOVES.map(m => [m.year, m.control]))
    expect(byYear).toEqual({ 1868: 'C', 1873: 'B', 1875: 'A', 1877: 'B' })
    const risesToA = HISTORICAL_MOVES.filter(m => m.control === 'A')
    expect(risesToA).toHaveLength(1)
    expect(risesToA[0].year).toBe(1875)
  })

  it('1875 만 스스로 정한 이동이다', () => {
    let s = createState()
    for (const m of HISTORICAL_MOVES) s = relocate(s, m)
    expect(selfChosenMoves(s).map(m => m.year)).toEqual([1875])
  })
})

describe('1884 환어의 self 는 참도 거짓도 아니다 — 학생이 센다', () => {
  it("'disputed' 는 기록에 남지만 「스스로 정한 이동」으로 세지 않는다", () => {
    let s = createState()
    s = relocate(s, { year: 1884, from: 'gyedong', to: 'changdeok', cause: '환어', self: 'disputed' })
    expect(lastMove(s).self).toBe('disputed')
    expect(selfChosenMoves(s)).toHaveLength(0)
    expect(moveCount(s)).toBe(1)
  })

  it('1875 환어는 여전히 참이다 — 스무 해 중 유일하게 스스로 정한 이동', () => {
    let s = createState()
    s = relocate(s, { year: 1875, from: 'changdeok', to: 'gyeongbok', cause: '환어', self: true })
    expect(selfChosenMoves(s).map(m => m.year)).toEqual([1875])
  })
})
