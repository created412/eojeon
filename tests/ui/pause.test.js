import { describe, it, expect } from 'vitest'
import { bodyOf } from '../helpers/body-of.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TITLE } from '../../src/ui/title.js'
import { touchButtonAction } from '../../src/main.js'

// [판정 R91] 멈춤은 Esc 뿐이었다 — 태블릿에는 Esc 가 없다. 그러면 수업 도중에
// 소리를 끌 방법도 없다: 태블릿 30대가 시끄러워도 학생이 할 수 있는 일은
// 새로고침해서 타이틀로 돌아가는 것뿐이었다.
//
// 이 파일이 붙드는 것은 둘이다.
//   ① 태블릿에도 멈춤으로 가는 길이 있다(E·Q 옆의 단추).
//   ② 멈춤 화면에서 소리를 끌 수 있고, 그 토글이 타이틀과 **같은 audio** 를 본다.
//      두 곳이 서로 다른 상태를 들고 있으면 한쪽에서 끈 소리가 다른 쪽에서 켜져 있다.

const src = (...parts) =>
  readFileSync(join(process.cwd(), 'src', ...parts), 'utf8')
    .split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')

const main = src('main.js')
const pause = src('ui', 'pause.js')

// callee({ ... }) 에 넘긴 인자 덩어리를 통째로 돌려준다.
function callBlock(source, callee) {
  const i = source.indexOf(`${callee}(`)
  if (i < 0) throw new Error(`${callee}( 를 못 찾았다`)
  const start = i + callee.length + 1
  let depth = 0
  for (let j = start; j < source.length; j++) {
    const ch = source[j]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' && depth === 0) return source.slice(start, j)
    else if (ch === ')' || ch === ']' || ch === '}') depth--
  }
  throw new Error(`${callee}( 의 닫는 괄호를 못 찾았다`)
}

describe('태블릿에도 멈춤으로 가는 길이 있다', () => {
  it('멈춤을 여닫는 자리가 togglePause() 하나다 — Esc 와 단추가 같은 길을 탄다', () => {
    expect(main).toMatch(/function\s+togglePause\s*\(/)
    expect(bodyOf(main, 'handleKey')).toContain('togglePause(')
  })

  it('태블릿 단추가 E · Q · 멈춤 셋이다', () => {
    const body = bodyOf(main, 'attachControls')
    expect(body.match(/mkTouchBtn\(/g) ?? []).toHaveLength(3)
    expect(body).toContain('togglePause(')
  })

  // 예전에는 두 단추가 각자 `pause.isOpen()` 을 물어, 이 검사가 그 호출을 두 번 세었다.
  // 지금은 둘이 같은 판정 한 자리(touchButtonAction)를 거친다 — 규칙이 한 곳에 있으므로
  // 두 곳이 어긋날 자리가 아예 없다. 「두 단추가 같은 길을 탄다」를 대신 못 박는다.
  it('멈춤 화면이 떠 있으면 태블릿의 E · Q 도 먹지 않는다 — 키보드와 같은 규칙이다', () => {
    const body = bodyOf(main, 'attachControls')
    // E·Q 두 단추가 같은 handler 만드는 자리를 거친다(멈춤 단추는 togglePause 직행)
    expect(body.match(/onTouchBtn\(/g) ?? [], 'E·Q 가 같은 길을 타야 한다').toHaveLength(2)
    // 그 한 자리가 멈춤 여부를 실제로 판정에 넘긴다
    expect(body).toMatch(/pauseOpen:\s*pause\.isOpen\(\)/)
    // 그리고 그 판정이 멈춤 판 아래에서는 아무것도 안 한다(순수 함수 시험은 hold-screen 쪽)
    expect(touchButtonAction({ hold: true, phase: 'day', pauseOpen: true })).toBe('none')
  })
})

describe('소리는 멈춤 화면에서도 끌 수 있다', () => {
  it('pause.js 가 audio 를 받아 켬·끔을 토글한다', () => {
    expect(pause).toContain('toggleMuted()')
    expect(pause).toContain('isMuted()')
  })

  it('멈춤의 소리 문구가 타이틀의 것과 같은 표에서 나온다', () => {
    expect(pause).toContain('TITLE.soundOn')
    expect(pause).toContain('TITLE.soundOff')
    expect(TITLE.soundOn).toBe('켜짐')
    expect(TITLE.soundOff).toBe('꺼짐')
  })

  it('pause.js 가 소리 상태를 스스로 들고 있지 않다 — audio 에게만 묻는다', () => {
    expect(pause).not.toMatch(/let\s+muted/)
    expect(pause).not.toMatch(/localStorage/)
  })
})

describe('두 토글이 같은 audio 를 본다', () => {
  it('boot() 이 소리 엔진을 딱 하나 만든다', () => {
    expect(main.match(/createAudio\(/g) ?? []).toHaveLength(1)
  })

  it('타이틀과 멈춤 둘 다 그 audio 를 받는다', () => {
    expect(callBlock(main, 'title.show')).toMatch(/(^|[\s,{])audio\b/)
    expect(callBlock(main, 'pause.toggle')).toMatch(/(^|[\s,{])audio\b/)
  })
})
