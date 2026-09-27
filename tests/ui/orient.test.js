import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { shouldAskRotate } from '../../src/ui/orient.js'

// 2026-09-27 선생님: 「모바일이나 태블릿pc로 접속해도 플레이 가능하게 만들어봐.
// 세로화면일 땐 가로로 돌리라는 문구 뜨고, 가로로 돌리면 진행되도록.」
//
// 이 판이 잘못 뜨면 게임이 통째로 막힌다. 그래서 「언제 뜨는가」만은 DOM 없이 못 박는다.
const src = readFileSync(new URL('../../src/ui/orient.js', import.meta.url), 'utf8')

// 주석을 걷어 낸 소스. 왜 그렇게 했는지 적은 줄에 어떤 이름이 나온다고 해서 「그것을
// 쓴다」가 되면 안 된다 — 그러면 검사가 글을 깎는다(tests/ui/title.test.js 와 같은 판단).
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/)
  .map(l => l.replace(/\/\/.*/, ''))
  .join('\n')

describe('가로로 돌려 달라는 판 — 언제 뜨는가', () => {
  it('손으로 만지는 기기에서 세로일 때만 뜬다', () => {
    expect(shouldAskRotate({ coarse: true, portrait: true, dismissed: false })).toBe(true)
    expect(shouldAskRotate({ coarse: true, portrait: false, dismissed: false })).toBe(false)
  })

  // 이 줄이 이 판에서 제일 중요하다. 좁게 줄인 PC 창은 세로지만 **돌릴 수가 없다** —
  // 거기에 「돌리세요」를 띄우면 그 학생은 영영 못 들어간다. 기준은 창 너비가 아니라
  // 「손으로 만지는 기기인가」(isCoarse)여야 한다.
  it('PC 창을 좁게 줄인 것만으로는 뜨지 않는다 — 돌릴 수 없는 기기를 막으면 안 된다', () => {
    expect(shouldAskRotate({ coarse: false, portrait: true, dismissed: false })).toBe(false)
    expect(shouldAskRotate({ coarse: false, portrait: false, dismissed: false })).toBe(false)
  })

  // 교실 태블릿은 회전 잠금이 켜진 채 나눠 주는 일이 흔하다. 아무리 돌려도 portrait 면
  // 빠져나갈 길이 있어야 한다 — 없으면 그 학생은 수업 내내 이 화면만 본다.
  it('돌릴 수 없다고 한 학생은 통과한다', () => {
    expect(shouldAskRotate({ coarse: true, portrait: true, dismissed: true })).toBe(false)
  })

  it('빠져나가는 길이 화면에 실제로 있다', () => {
    expect(src).toContain('이대로 보기')
    expect(code).toMatch(/dismissed = true/)
  })

  // 그 선택을 기기에 남기면, 다음 시간에 다른 학생이 같은 기기를 들었을 때 안내가
  // 조용히 사라져 있다. 새로 고치면 다시 물어야 한다.
  it('통과 선택을 기기에 저장하지 않는다 — 다음 학생에게는 다시 묻는다', () => {
    expect(code).not.toMatch(/localStorage|sessionStorage/)
  })

  // 기기 판정이 두 갈래로 갈라지면 「안내는 짚으라는데 짚을 단추가 없는」 상태가 만들어진다.
  // 이 저장소는 그것을 한 번 겪고 controls-hint.js 의 isCoarse() 로 모아 두었고,
  // tests/ui/controls-hint.test.js 가 그것을 잠근다. 이 파일도 그 잠금 아래 있다.
  it('기기 판정을 스스로 다시 하지 않는다 — isCoarse() 를 받아 쓴다', () => {
    expect(code).toContain('isCoarse')
    expect(code).not.toContain('pointer: coarse')
  })

  it('돌리는 순간을 여러 길로 받는다 — 기기마다 오는 신호가 다르다', () => {
    for (const ev of ['change', 'resize', 'orientationchange']) expect(code).toContain(ev)
  })

  // 같은 층(z-index 90)에 두었더니 타이틀이 이 판 **위에** 그려져 화면이 비쳐 보였다.
  // 나중에 붙은 쪽이 이기기 때문이다. 이 판은 무엇에도 덮이면 안 된다.
  it('다른 어떤 화면보다 위에 있다', () => {
    const z = Number(/\.orient\{[^}]*z-index:(\d+)/.exec(src)?.[1])
    expect(z).toBeGreaterThan(90)
  })
})
