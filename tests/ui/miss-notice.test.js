import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MISS_LINES } from '../../src/ui/miss-notice.js'

// 선생님(2026-10-06): 「사료를 잘못짚으면 틀렸다는 문구가 뜨면서 막의 처음으로 돌아가야해.
// 전체를 다시하는게 아니라 그 막의 처음으로 돌아가는것이기 때문에 부담이 적을거 같긴 해.」
const NL = String.fromCharCode(10)
const read = p => readFileSync(join(process.cwd(), ...p.split('/')), 'utf8')
const code = src => src.split(NL).filter(l => !l.trim().startsWith('//')).join(NL)

describe('틀렸다는 문구 — 막의 처음으로 가기 전에 선다', () => {
  it('제목은 틀렸다고 말하고, 본문은 어디로 가는지와 무엇이 남는지를 말한다', () => {
    expect(MISS_LINES.title).toBe('틀렸습니다')
    const lead = MISS_LINES.lead(3)
    expect(lead).toContain('3막의 처음으로')
    expect(lead).toContain('앞 막의 기록')
    expect(lead).not.toMatch(/처음부터 다시|전체/)
    expect(MISS_LINES.button(5)).toBe('5막의 처음으로')
  })

  it('main.js 는 안내를 먼저 띄우고, 학생이 누른 뒤에 막을 다시 연다', () => {
    const main = code(read('src/main.js'))
    const fn = main.slice(main.indexOf('function restartAfterSourceMiss'), main.indexOf('let holdSession'))
    const save = fn.indexOf('saveGame(start)')
    const open = fn.indexOf('missNotice.open(')
    const boot = fn.indexOf('boot(root, { restartState: start')
    expect(save).toBeGreaterThan(-1)
    expect(open).toBeGreaterThan(save)       // 저장은 안내보다 먼저 — 새로고침으로 빠져나가지 못한다
    expect(boot).toBeGreaterThan(open)       // 화면은 누른 뒤에 갈린다
    expect(fn).toContain("gameTime.setPaused(true, 'miss')")
    expect(fn).toContain('if (!running || restarting) return true')
  })

  it('안내가 떠 있는 동안 키는 안내가 가진다 — E 가 뒤의 사료를 닫지 않는다', () => {
    const src = read('src/ui/miss-notice.js')
    expect(src).toContain("addEventListener('keydown', onKey, true)")
    expect(src).toContain('e.stopImmediatePropagation()')
  })

  it('정답이 없는 자리(정하는 자리·저울의 결정·회고)에는 이 화면이 걸려 있지 않다', () => {
    const main = code(read('src/main.js'))
    const wired = (main.match(/restartAfterSourceMiss/g) ?? []).length
    expect(wired).toBeGreaterThanOrEqual(5)   // 밑줄·따져 읽기(dialog) · 뜯어 읽기 · 서계 · 저울의 확인
    const dilemma = read('src/ui/dilemma.js')
    expect(dilemma).not.toContain('onMiss')
  })
})

describe('대화 — 한 줄이 통째로 뜬다', () => {
  const speak = read('src/ui/speak.js')
  it('글자를 한 자씩 찍는 길이 없다', () => {
    expect(speak).not.toContain('typeByTime')
    expect(speak).not.toContain('CHAR_MS')
    expect(speak).toContain('function showWhole')
    expect(speak).toContain('.speak .line.rise{animation:speakLine')
    expect(speak).toContain('@media(prefers-reduced-motion:reduce){.speak .line.rise{animation:none}}')
  })
})
