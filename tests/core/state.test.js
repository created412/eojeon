import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createState, serialize, deserialize, CONTROL, SAVE_KEY } from '../../src/core/state.js'
import { staleSaveNotice, STALE_SAVE_NOTICE } from '../../src/main.js'

describe('게임 상태', () => {
  it('새 게임은 1막 · 창덕궁 · 조작권 C 로 시작한다', () => {
    const s = createState()
    expect(s.actIndex).toBe(0)
    expect(s.palace).toBe('changdeok')
    expect(s.control).toBe(CONTROL.ESCORTED)
    expect(s.control).toBe('C')
  })

  it('쌀값 지수는 100에서 시작한다', () => {
    expect(createState().riceIndex).toBe(100)
  })

  it('사료 보유·열람·소실이 모두 빈 배열이다', () => {
    const s = createState()
    expect(s.sources).toEqual({ held: [], read: [], lost: [] })
  })

  it('직렬화한 뒤 되돌리면 같은 상태다', () => {
    const s = createState()
    s.sources.held.push('cheokhwabi')
    s.decisions.push({ actIndex: 0, choiceId: 'wonnapjeon', reason: '백성에게서 걷었다' })
    expect(deserialize(serialize(s))).toEqual(s)
  })

  it('버전이 다르면 null 을 준다', () => {
    const s = createState()
    const tampered = JSON.stringify({ ...s, version: 999 })
    expect(deserialize(tampered)).toBeNull()
  })

  it('깨진 JSON 이면 null 을 준다', () => {
    expect(deserialize('{{{')).toBeNull()
  })

  it('저장 키가 정해져 있다', () => {
    expect(SAVE_KEY).toBe('eojeon.save.v1')
  })

  // ACTS(src/data/acts.js)가 바뀌면 beatIndex·actIndex 가 가리키는 자리도 바뀐다 —
  // 그래서 VERSION 을 올려 옛 세이브를 조용히 버려야 한다. 이 시험은 정확한 숫자를
  // 못 박지 않는다(다음 배포에서 또 올라간다) — 다만 1단계에서 쓰던 v1 세이브는
  // 이제 반드시 거부되어야 한다는 것만 확인한다.
  it('1단계에서 저장된 옛 버전(1) 세이브는 이제 거부한다', () => {
    const s = createState()
    const old = JSON.stringify({ ...s, version: 1 })
    expect(deserialize(old)).toBeNull()
  })

  // 판정 R100 — 3단계가 5막을 붙이며 여러 막의 비트를 고쳤다. 2단계 배포로 저장한
  // 세이브의 beatIndex 는 이제 전혀 다른 비트를 가리킨다. 배포 전이라 버려질 학생
  // 기록이 세상에 하나도 없는 지금 올렸다.
  it('2단계에서 저장된 버전(2) 세이브도 이제 거부한다 — 3단계가 비트를 옮겼다', () => {
    const s = createState()
    expect(deserialize(JSON.stringify({ ...s, version: 2 }))).toBeNull()
  })

  it('지금 판이 2보다 크다 — 다시 2로 내려가면 옛 세이브가 엉뚱한 비트로 이어진다', () => {
    expect(createState().version).toBeGreaterThan(2)
  })

  it('지금 버전으로 만든 세이브는 그대로 되돌아온다', () => {
    const s = createState()
    expect(deserialize(serialize(s))?.version).toBe(s.version)
  })
})


// ── 판정 R100 — 못 읽는 저장을 만난 학생이 겪는 일 ────────────────────
//
// deserialize() 는 「저장이 없다」와 「판이 달라 못 읽는다」를 똑같이 null 로 준다.
// 그러면 타이틀에서 「이어서 하기」가 그냥 사라지고, 학생은 자기가 뭔가 잘못 눌러
// 기록이 지워진 줄 안다. 2차시로 운영하는 수업에서 그 오해는 첫 3분을 잡아먹는다.
// 그래서 그 둘을 갈라 한 줄로 알린다.
describe('판이 달라 못 읽는 저장을 만나면 학생에게 알린다 (판정 R100)', () => {
  it('저장이 아예 없으면 아무 말도 하지 않는다 — 처음 하는 학생의 화면은 그대로다', () => {
    expect(staleSaveNotice(null)).toBe('')
    expect(staleSaveNotice('')).toBe('')
    expect(staleSaveNotice(undefined)).toBe('')
  })

  it('지금 판의 저장이면 아무 말도 하지 않는다 — 「이어서 하기」가 뜬다', () => {
    expect(staleSaveNotice(serialize(createState()))).toBe('')
  })

  it('옛 판의 저장이면 무슨 일이 있었는지와 무엇을 하면 되는지를 말한다', () => {
    const old = JSON.stringify({ ...createState(), version: 2 })
    expect(staleSaveNotice(old)).toBe(STALE_SAVE_NOTICE)
    expect(STALE_SAVE_NOTICE).toContain('처음부터')   // 무엇을 누르면 되는지
    expect(STALE_SAVE_NOTICE).not.toMatch(/[A-Za-z]/) // 학생 화면에 영어 낱말을 내지 않는다
  })

  it('깨진 글자도 같은 취급이다 — 있는데 못 읽는 것은 똑같다', () => {
    expect(staleSaveNotice('{망가진')).toBe(STALE_SAVE_NOTICE)
  })

  // 타이틀이 그 줄을 실제로 그리는가 — 문구만 만들고 화면에 안 걸면 아무 소용이 없다.
  // (이 프로젝트가 세 번 밟은 모양이다: 값은 있는데 화면이 안 읽는다.)
  it('타이틀이 그 줄을 실제로 화면에 건다 — main.js 가 넘기고 title.js 가 그린다', () => {
    const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8')
    const title = readFileSync(join(process.cwd(), 'src', 'ui', 'title.js'), 'utf8')
    expect(main).toMatch(/notice:\s*staleSaveNotice\(/)
    expect(title).toContain('show({ hasSave = false, notice =')
    // 학생 화면에 나가는 글은 textContent 로만 넣는다(전역 제약 2)
    expect(title).toMatch(/n\.textContent\s*=\s*notice/)
  })
})
