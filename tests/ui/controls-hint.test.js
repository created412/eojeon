import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { controlLines, isCoarse, HINT_KEYS, RULE_LINES } from '../../src/ui/controls-hint.js'
import { createInput } from '../../src/input/input.js'

// 이 게임에는 「움직이는 법」을 알려주는 문구가 한 줄도 없었다. 학생은 글 화면 하나를
// 본 뒤 3D 궁궐에 던져졌다. 안내를 붙이는 것만으로는 부족하다 — 안내가 **거짓말을
// 하지 않는지**가 이 파일의 일이다. 안내에 적힌 키가 실제로 걸음이 되지 않으면,
// 그것은 안내가 없는 것보다 나쁘다(학생은 자기 탓이라고 생각한다).

const SRC = join(process.cwd(), 'src')

// 주석은 뺀 채로 본다 — 왜 판정을 하나로 모았는지 설명하는 주석에 옛 판정 이름이
// 남아 있는 것은 죄가 아니다. 코드가 실제로 그것을 부르는 것이 죄다.
// (블록 주석과 온전히 한 줄짜리 // 주석만 지운다. 문자열 안의 // 는 건드리지 않는다)
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trimStart().startsWith('//'))
    .join('\n')
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.js')) out.push(p)
  }
  return out
}

// createInput 은 전역 addEventListener 에 붙는다. Node 에는 없으므로 심고, 끝나면 뺀다.
// 이렇게 하면 「안내에 적힌 키」를 문자열로 짐작하는 대신 실제로 눌러 볼 수 있다.
function driveInput() {
  const handlers = {}
  const hadAdd = 'addEventListener' in globalThis
  const hadRemove = 'removeEventListener' in globalThis
  const savedAdd = globalThis.addEventListener
  const savedRemove = globalThis.removeEventListener
  globalThis.addEventListener = (type, fn) => { handlers[type] = fn }
  globalThis.removeEventListener = () => {}
  const target = {
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  }
  const input = createInput(target)
  return {
    input,
    handlers,
    restore() {
      if (hadAdd) globalThis.addEventListener = savedAdd
      else delete globalThis.addEventListener
      if (hadRemove) globalThis.removeEventListener = savedRemove
      else delete globalThis.removeEventListener
    },
  }
}

describe('controlLines — 기기에 맞는 조작 안내', () => {
  it('키보드에서는 방향키·WASD 로 걷는 줄을 낸다', () => {
    const text = controlLines({ coarse: false }).join('\n')
    expect(text).toContain('←')
    expect(text).toContain('→')
    expect(text).toContain('W')
    expect(text).toContain('걷는다')
  })

  it('태블릿에서는 화면을 짚어 걷는 줄을 낸다', () => {
    const text = controlLines({ coarse: true }).join('\n')
    expect(text).toContain('손가락으로 짚으면')
    expect(text).not.toContain('←')
  })

  it('태블릿 안내는 그 기기에 없는 키를 약속하지 않는다 — Shift 도 Esc 도 없다', () => {
    // 태블릿에는 키보드가 없다. 적어 두면 학생이 없는 키를 찾다가 갇힌다.
    const text = controlLines({ coarse: true }).join('\n')
    expect(text).not.toContain('Shift')
    expect(text).not.toContain('Esc')
  })

  it('키보드 안내에는 Shift·Esc 가 있다', () => {
    const text = controlLines({ coarse: false }).join('\n')
    expect(text).toContain('Shift')
    expect(text).toContain('Esc')
  })

  it('두 기기 모두에서 E 와 Q 를 알려준다', () => {
    for (const coarse of [false, true]) {
      const text = controlLines({ coarse }).join('\n')
      expect(text, `coarse=${coarse}`).toMatch(/\bE\b/)
      expect(text, `coarse=${coarse}`).toMatch(/\bQ\b/)
    }
  })

  // 이 게임의 존재 이유다. 이 줄이 없으면 학생은 어전회의에서 ??? 를 보고
  // 게임이 고장난 줄 안다 — 눈치 빠른 학생만 규칙을 알아챈다.
  it('두 기기 모두에서 「읽은 문서만 말할 수 있다」를 알려준다', () => {
    for (const coarse of [false, true]) {
      const lines = controlLines({ coarse })
      expect(lines.some(l => l.includes('읽은 문서만')), `coarse=${coarse}`).toBe(true)
      for (const rule of RULE_LINES) expect(lines, `coarse=${coarse}`).toContain(rule)
    }
  })

  it('史草 처럼 그대로 둔 한자에는 풀이를 붙인다', () => {
    for (const coarse of [false, true]) {
      const text = controlLines({ coarse }).join('\n')
      if (text.includes('史草')) expect(text, `coarse=${coarse}`).toContain('사초')
    }
  })
})

describe('안내에 적힌 키는 코드가 실제로 받는 키다', () => {
  it('걷기 키를 실제로 눌러 보면 전부 걸음이 된다', () => {
    const { input, handlers, restore } = driveInput()
    try {
      expect(HINT_KEYS.move.length, '걷기 키를 하나도 안 적었다').toBeGreaterThanOrEqual(4)
      for (const code of HINT_KEYS.move) {
        handlers.keydown({ code, preventDefault() {} })
        const a = input.axis()
        expect(
          Math.hypot(a.x, a.z),
          `안내는 ${code} 로 걷는다고 적었는데 input.js 는 그 키를 걸음으로 바꾸지 않는다`,
        ).toBeCloseTo(1)
        handlers.keyup({ code })
        expect(input.axis()).toEqual({ x: 0, z: 0 })
      }
    } finally {
      restore()
    }
  })

  it('달리기 키를 실제로 눌러 보면 달리는 상태가 된다', () => {
    const { input, handlers, restore } = driveInput()
    try {
      expect(HINT_KEYS.run.length).toBeGreaterThanOrEqual(1)
      for (const code of HINT_KEYS.run) {
        expect(input.running()).toBe(false)
        handlers.keydown({ code, preventDefault() {} })
        expect(input.running(), `안내는 ${code} 로 달린다고 적었다`).toBe(true)
        handlers.keyup({ code })
      }
    } finally {
      restore()
    }
  })

  it('E·Q·Esc 는 main.js 가 실제로 처리하는 키다', () => {
    const main = readFileSync(join(SRC, 'main.js'), 'utf8')
    const codes = [...HINT_KEYS.act, ...HINT_KEYS.codex, ...HINT_KEYS.pause]
    expect(codes.length).toBe(3)
    for (const code of codes) {
      expect(
        main,
        `안내는 ${code} 를 알려주는데 main.js 에 그 키를 받는 자리가 없다`,
      ).toContain(`e.code === '${code}'`)
    }
  })
})

describe('isCoarse — 기기 판정은 한 곳에서만 한다', () => {
  it('주입된 matchMedia 에게 (pointer: coarse) 를 묻는다', () => {
    const asked = []
    const mm = (q) => { asked.push(q); return { matches: true } }
    expect(isCoarse(mm)).toBe(true)
    expect(asked).toEqual(['(pointer: coarse)'])
  })

  it('matches 가 거짓이면 거짓이다', () => {
    expect(isCoarse(() => ({ matches: false }))).toBe(false)
  })

  it('matchMedia 가 없는 곳(Node·옛 브라우저)에서도 던지지 않는다', () => {
    expect(isCoarse(undefined)).toBe(false)
  })

  // 예전에는 판정이 두 갈래였다: main.js 는 matchMedia('(pointer: coarse)'),
  // fire-rush.js 는 navigator.maxTouchPoints > 0. 터치스크린 달린 노트북에서 둘이
  // 어긋나면 안내는 「화면을 짚으세요」라 하는데 짚을 단추가 안 붙는다 — 학생이 갇힌다.
  it('src 안에서 (pointer: coarse) 를 직접 묻는 파일은 controls-hint.js 하나뿐이다', () => {
    const offenders = walk(SRC).filter(p =>
      p.replace(/\\/g, '/').endsWith('src/ui/controls-hint.js') === false &&
      stripComments(readFileSync(p, 'utf8')).includes('pointer: coarse'))
    expect(offenders, '기기 판정이 다시 갈라졌다 — isCoarse() 를 쓸 것').toEqual([])
  })

  it('src 안에 navigator.maxTouchPoints 를 보는 자리가 남아 있지 않다', () => {
    const offenders = walk(SRC).filter(p => stripComments(readFileSync(p, 'utf8')).includes('maxTouchPoints'))
    expect(offenders, 'maxTouchPoints 판정은 (pointer: coarse) 와 어긋난다').toEqual([])
  })
})
