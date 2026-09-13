import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TITLE } from '../../src/ui/title.js'
import { actSpan, nativeCount, finalLead } from '../../src/ui/act-end.js'

// 주석을 걷어 낸 소스 — 왜 이렇게 되어 있는지 적은 줄에서 숫자를 못 쓰게 되면
// 검사가 글을 깎는다(tests/systems/grant.test.js 와 같은 판단).
const titleCode = () =>
  readFileSync(join(process.cwd(), 'src', 'ui', 'title.js'), 'utf8').replace(/\/\/[^\r\n]*/g, '')

// 타이틀 화면이 없어서 「어전 御前」이라는 제목을 학생이 볼 자리가 브라우저 탭밖에
// 없었다. 문구는 선생님이 정한 것이다 — 특히 「이어폰이 없으면…」 한 줄은 교실용이라
// 없어지면 30대의 태블릿이 동시에 소리를 낸다. 여기서 그 문구들을 못으로 박는다.
describe('TITLE — 타이틀 화면의 문구', () => {
  it('제목을 낸다', () => {
    expect(TITLE.name).toBe('어 전  御 前')
  })

  // 첫 화면의 연도가 손으로 적혀 있었다 — 「1863 — 1884」. 실제 데이터가 닿는 곳은
  // 1882 다(5막이 아직 없다). 역사 게임의 첫 화면이 사실과 어긋나 있었던 것이다.
  // 3막 끝 화면에서 똑같은 종류를 이미 한 번 겪었다(커밋 6d02207) — 손으로 적은
  // 값은 막이 하나 붙는 날 조용히 거짓말이 된다.
  it('연대를 ACTS 에서 뽑는다 — 5막이 붙으면 저절로 따라간다', () => {
    const { from, to } = actSpan()
    expect(TITLE.years).toBe(`${from} — ${to}`)
  })

  it('title.js 의 코드 어디에도 손으로 적은 연도가 없다', () => {
    expect(titleCode()).not.toMatch(/\b1[5-9]\d\d\b/)
  })

  // 가운데 줄의 햇수도 손으로 적지 않는다(판정 R101). 「스무 해」라고 박혀 있었는데
  // 1863~1884 는 스물한 해이고, 마지막 화면은 이미 actSpan() 으로 그렇게 세고 있었다.
  // 이 게임의 엔딩이 학생에게 「정확히 세라」고 요구하는데 첫 화면이 한 해 틀려 있었다.
  it('세 줄 소개를 그대로 낸다 — 가운데 줄의 햇수만 ACTS 에서 뽑는다', () => {
    expect(TITLE.lines).toEqual([
      '열두 살에 왕이 되었다.',
      `${nativeCount(actSpan().span)} 해 동안 이 궁에서 저 궁으로 옮겨 다녔다.`,
      '읽은 문서만, 어전에서 말할 수 있다.',
    ])
  })

  it('다섯 막이 다 붙은 지금 그 줄은 스물한 해다', () => {
    expect(TITLE.lines[1]).toBe('스물한 해 동안 이 궁에서 저 궁으로 옮겨 다녔다.')
  })

  // 첫 화면과 마지막 화면이 같은 수를 말하는가 — 학생이 한 시간 사이에 두 번 읽는다.
  // 손으로 두 곳에 적으면 반드시 갈린다(실제로 「스무 해」와 「스물한 해」로 갈렸다).
  it('첫 화면과 마지막 화면의 햇수가 같다 — 갈라지면 여기서 운다', () => {
    const n = nativeCount(actSpan().span)
    expect(TITLE.lines[1], '타이틀').toContain(`${n} 해`)
    expect(finalLead({ moves: [] }), '마지막 화면').toContain(`${n} 해를 지났다`)
  })

  it('title.js 코드에 손으로 적은 햇수가 없다', () => {
    expect(titleCode(), '햇수를 손으로 적었다 — actSpan() 이 세는 자리다')
      .not.toMatch(/(열|스무|스물|서른|마흔)\S*\s*해/)
  })

  it('교실용 소리 안내를 뺀 적이 없다', () => {
    expect(TITLE.earphone).toBe('이어폰이 없으면 소리를 끄고 하세요')
  })

  it('두 단추의 이름은 처음부터·이어서 하기다', () => {
    expect(TITLE.fresh).toBe('처음부터')
    expect(TITLE.resume).toBe('이어서 하기')
  })

  it('소리 토글은 켜짐·꺼짐으로 읽힌다', () => {
    expect(TITLE.soundOn).toBe('켜짐')
    expect(TITLE.soundOff).toBe('꺼짐')
  })
})

// 브라우저는 사용자가 누르기 전에는 소리를 못 내게 막는다. 타이틀의 두 단추가
// 이 게임에서 소리를 열 수 있는 첫 기회다 — 다른 데서 열면 콘솔에 경고만 쌓인다.
describe('소리는 타이틀의 단추에서 연다', () => {
  const src = readFileSync(join(process.cwd(), 'src', 'ui', 'title.js'), 'utf8')

  it('title.js 가 audio.unlock() 을 부른다', () => {
    expect(src).toContain('unlock()')
  })

  it('src 안에서 unlock() 을 부르는 자리는 타이틀 하나뿐이다', () => {
    const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8')
    expect(main).not.toContain('.unlock(')
  })
})
