import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { moveNote } from '../../src/main.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

// 이어(移御) 화면 아래 근거 줄. 데이터에 sillok 이 있는데 화면에는 안 뜨는 상태가
// 이 프로젝트가 반복해서 당한 모양이다 — 시험은 초록불인데 실제로는 안 돌아가는 것.
// 5막의 다섯 이어가 처음으로 note 를 달면서 그 자리가 실제로 열렸다(예전 코드는
// `beat.note ?? …` 라 note 를 단 순간 실록 줄이 통째로 사라졌다).

const moves = ACTS.flatMap(a => beatsOf(a).map(b => ({ act: a.id, beat: b })))
  .filter(x => x.beat.kind === 'move')

const SOLAR_NOTE_TAIL = '확실하지 않아 적지 않습니다'

describe('이어 화면의 근거 줄', () => {
  it('이어가 아홉 번이다 — 1~4막 넷, 5막 다섯', () => {
    expect(moves).toHaveLength(9)
  })

  it('모든 이어의 실록 근거가 실제로 화면 글에 실린다', () => {
    for (const { act, beat } of moves) {
      expect(moveNote(beat, null), `${act}/${beat.id}`).toContain(beat.sillok)
    }
  })

  it('note 를 단 이어에서도 실록 줄이 맨 앞에 온다', () => {
    const noted = moves.filter(x => x.beat.note)
    expect(noted.length).toBeGreaterThan(0)
    for (const { act, beat } of noted) {
      const text = moveNote(beat, null)
      expect(text.startsWith(beat.sillok), `${act}/${beat.id}`).toBe(true)
      expect(text, `${act}/${beat.id}`).toContain(beat.note)
    }
  })

  it('양력이 확정된 1884 이어에는 「양력을 못 적는다」 고지가 안 붙는다', () => {
    for (const { act, beat } of moves.filter(x => x.beat.solarDate)) {
      expect(moveNote(beat, null), `${act}/${beat.id}`).not.toContain(SOLAR_NOTE_TAIL)
    }
  })

  it('양력이 없는 네 이어에는 그 고지가 그대로 붙는다', () => {
    const lunarOnly = moves.filter(x => !x.beat.solarDate)
    expect(lunarOnly.map(x => x.beat.id).sort())
      .toEqual(['move-1868', 'move-1873', 'move-1875', 'move-1877'])
    for (const { act, beat } of lunarOnly) {
      expect(moveNote(beat, null), `${act}/${beat.id}`).toContain(SOLAR_NOTE_TAIL)
    }
  })

  it('이어·환어 풀이는 그것이 주어진 이어에만 붙는다 — 첫 등장에 한 번만', () => {
    const first = moves.find(x => x.beat.id === 'move-1868').beat
    expect(moveNote(first, '移 옮기다 · 御 임금')).toContain('移 옮기다')
    expect(moveNote(first, null)).not.toContain('移 옮기다')
  })
})


// ── 판정 R98 — 이어 화면도 학생 대신 세지 않는다 ────────────────────────
//
// 3막 환어의 풀이가 「스무 해 중 스스로 정한 이동은 이번 한 번뿐이다」라고 못 박고
// 있었다. 5막이 붙으면서 1884 환어가 self:'disputed' 로 서고, 마지막 비트는
// 「몇 번이었는지는 이 게임이 말하지 않는다」고 한다 — 두 화면을 잇달아 읽는 학생에게
// 게임이 두 가지 말을 하는 셈이었다. 세는 일은 학생 몫이다(설계서 13.2 · 판정 R55).
describe('이어 화면의 풀이가 스스로 정한 이동을 세지 않는다 (판정 R98)', () => {
  const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8')

  it('「스스로 정한 이동은 몇 번뿐」이라 말하는 자리가 없다', () => {
    expect(main, '이어 화면 풀이가 다시 세고 있다').not.toMatch(/스스로 정한 이동[^\r\n]*번뿐/)
    expect(main).not.toMatch(/스스로 정한 것은[^\r\n]*\$\{/)
  })

  it('그러면서 환어 풀이는 여전히 이 이동 하나를 말한다 — 지우기만 한 것이 아니다', () => {
    const beat = moves.find(x => x.beat.id === 'move-1875')
    expect(beat, '3막에 move-1875 이어가 없다').toBeTruthy()
    expect(beat.beat.self).toBe(true)
    expect(main).toContain('이 이동은 임금이 스스로 정했다.')
  })
})
