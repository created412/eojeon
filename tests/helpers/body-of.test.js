import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { bodyOf, blockAt, methodBodyOf } from './body-of.js'
import { caseLabels, hasCaseLabel } from './case-labels.js'

// ── 검사를 자르는 연장 자체를 시험한다 ──────────────────────────────────
//
// 이 두 벌은 다른 시험들이 「소스에 무엇이 있는가」를 판정할 때 쓰는 자다.
// 자가 틀리면 그 시험들은 초록불인 채로 아무것도 안 지킨다 — 그러므로 자부터 잰다.

describe('bodyOf — 인자 구조분해를 몸통으로 착각하지 않는다', () => {
  // 이것이 여섯 벌을 물었을 모양이다. `{ resumeMidBeat = false } = {}` 는 인자다.
  const SRC = `
    async function runBeats({ resumeMidBeat = false } = {}) {
      const 몸통이다 = 1
      if (resumeMidBeat) 저장한다()
    }
    function 다음함수() { 여기는아니다() }
  `

  it('구조분해 인자를 건너뛰고 진짜 몸통을 자른다', () => {
    const body = bodyOf(SRC, 'runBeats')
    expect(body).toContain('몸통이다')
    expect(body).toContain('저장한다()')
    expect(body, '다음 함수까지 삼키면 안 된다').not.toContain('여기는아니다')
    // 옛 방식(여는 괄호 다음 첫 「{」)이었다면 인자 목록을 몸통으로 잡아
    // 이 글자가 몸통에 들어오지 않았다 — 그것이 여섯 벌의 잠복이었다
    expect(body).not.toContain('resumeMidBeat = false')
  })

  it('기본값 객체가 여럿이어도 마지막 인자까지 건너뛴다', () => {
    const src = 'function f({ a } = {}, { b } = { b: 1 }) { 진짜몸통() }'
    expect(bodyOf(src, 'f')).toContain('진짜몸통()')
  })

  it('평범한 인자도 그대로 자른다', () => {
    expect(bodyOf('function g(beat) { 평범하다() }', 'g')).toContain('평범하다()')
    expect(bodyOf('async function h() { 인자가없다() }', 'h')).toContain('인자가없다()')
  })

  it('중첩된 중괄호를 세어 끝을 찾는다 — 「다음 함수 이름까지」로 자르지 않는다', () => {
    const src = `
      function a() { if (x) { 안쪽() } 바깥() }
      function b() { 남의몸통() }
    `
    const body = bodyOf(src, 'a')
    expect(body).toContain('안쪽()')
    expect(body).toContain('바깥()')
    expect(body).not.toContain('남의몸통()')
  })

  it('없는 함수를 부르면 조용히 넘어가지 않고 운다', () => {
    expect(() => bodyOf('function a() {}', '없는함수')).toThrow()
  })

  it('methodBodyOf 는 객체 메서드 축약형도 자른다', () => {
    const src = `
      return {
        open(view) { 열린다(view) },
        close() { 닫힌다() },
      }
    `
    expect(methodBodyOf(src, 'open')).toContain('열린다(view)')
    expect(methodBodyOf(src, 'open')).not.toContain('닫힌다()')
    expect(methodBodyOf(src, 'close')).toContain('닫힌다()')
  })

  it('blockAt 은 여는 중괄호 자리에서 짝까지 자른다', () => {
    const src = 'x = { a: { b: 1 }, c: 2 }'
    expect(blockAt(src, src.indexOf('{'))).toBe(' a: { b: 1 }, c: 2 ')
  })
})

describe('caseLabels — 따옴표 종류·대소문자를 가리지 않는다', () => {
  const SWITCH = `
    switch (beat.kind) {
      case 'note': return 1
      case "hold": return 2
      case \`actEnd\`: return 3
      case 'move-1875': return 4
      case 'a1': return 5
    }
  `

  it('홑·겹·역따옴표를 다 본다', () => {
    expect(caseLabels(SWITCH)).toEqual(['note', 'hold', 'actEnd', 'move-1875', 'a1'])
  })

  it('겹따옴표로 적힌 종류가 조용히 빠지지 않는다', () => {
    expect(hasCaseLabel(SWITCH, 'hold')).toBe(true)
  })

  it('대문자가 섞인 종류도 빠지지 않는다', () => {
    expect(hasCaseLabel(SWITCH, 'actEnd')).toBe(true)
  })

  it('붙임표와 숫자가 든 이름도 통째로 읽는다', () => {
    expect(hasCaseLabel(SWITCH, 'move-1875')).toBe(true)
    expect(hasCaseLabel(SWITCH, 'a1')).toBe(true)
  })

  it('없는 이름은 없다고 한다', () => {
    expect(hasCaseLabel(SWITCH, 'brush')).toBe(false)
  })
})

// ── 이 한 벌 밖에 자기 bodyOf 를 다시 둔 시험 파일이 없다 ────────────────
//
// 일곱 벌로 갈렸던 것이 바로 이 모양이다. 새 시험이 또 자기 것을 적으면
// 다음번에 고칠 때 다시 한 벌만 고쳐진다.
describe('함수 몸통을 자르는 벌이 이 한 벌뿐이다', () => {
  function testFiles(dir = join(process.cwd(), 'tests'), out = []) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) testFiles(p, out)
      else if (name.endsWith('.js')) out.push(p)
    }
    return out
  }

  it('tests/ 어디에도 bodyOf 를 다시 정의한 자리가 없다', () => {
    const here = join(process.cwd(), 'tests', 'helpers', 'body-of.js')
    for (const f of testFiles()) {
      if (f === here) continue
      const src = readFileSync(f, 'utf8')
      expect(
        /function\s+bodyOf\s*\(/.test(src),
        `${f} 가 bodyOf 를 다시 정의한다 — tests/helpers/body-of.js 를 가져다 쓸 것`,
      ).toBe(false)
    }
  })

  // case 라벨을 제 손으로 훑는 자리 — 따옴표 한 종류만 보다 조용히 새던 모양이다.
  // 「case 다음에 따옴표가 오는 글」을 소스에서 찾는다. 정규식이든 toContain 이든
  // 한 벌 밖에서 그 판정을 하면 여기서 운다.
  // 정규식 리터럴이나 문자열로 case 를 훑는 자리만 본다 — 거울(beat-mirror.js)의
  // 진짜 switch 문(`case 'council':`)은 따옴표로 시작하지 않으므로 안 걸린다.
  const SNIFF = [
    /\/case[^-]/,        // /case '…':/ 같은 정규식 리터럴
    /['"`]case[\s\\]/,   // RegExp 생성자·toContain 에 적어 넣은 것
  ]

  it('tests/ 어디에도 case 라벨을 제 손으로 훑는 자리가 없다', () => {
    const mine = [
      join(process.cwd(), 'tests', 'helpers', 'case-labels.js'),
      join(process.cwd(), 'tests', 'helpers', 'body-of.test.js'),
    ]
    for (const f of testFiles()) {
      if (mine.includes(f)) continue
      const src = readFileSync(f, 'utf8')
      for (const re of SNIFF) {
        expect(
          re.test(src),
          `${f} 가 case 라벨을 직접 훑는다(${re}) — tests/helpers/case-labels.js 를 쓸 것`,
        ).toBe(false)
      }
    }
  })
})
