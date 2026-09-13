import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { copyText, openManualCopy, COPY_OK, COPY_FAILED } from '../../src/ui/copy.js'

// ── 「복사했습니다」가 거짓일 수 있었던 자리 ──────────────────────────────
//
// execCommand('copy') 는 막혔을 때 던지지 않고 **false 를 돌려주는** 쪽이 흔하다.
// 예전 코드는 try/catch 만 두고 그 아래에서 무조건 성공 배너를 띄웠다 — 학생은
// 붙여넣기를 눌러 보기 전까지 실패를 알 수 없었고, 그때는 화면이 이미 넘어가 있었다.
// 이 게임에서 학생의 산출물이 밖으로 나가는 길은 여기 하나뿐이라, 그 실패는 곧
// 한 시간의 결과가 사라지는 일이다. 그래서 실패 갈래를 시험으로 붙든다.

// 가짜 DOM — 이 시험이 보는 것은 「무엇을 만들었는가」와 「값이 어디로 들어갔는가」다.
function fakeDoc() {
  const made = []
  const mk = (tag) => {
    const el = {
      tag, value: '', textContent: '', readOnly: false, children: [],
      style: { cssText: '' },
      listeners: {},
      addEventListener(k, fn) { (this.listeners[k] ??= []).push(fn) },
      append(...kids) { this.children.push(...kids) },
      appendChild(kid) { this.children.push(kid) },
      remove() { this.removed = true },
      focus() { this.focused = true },
      select() { this.selected = true },
    }
    made.push(el)
    return el
  }
  const body = mk('body')
  return {
    made,
    body,
    createElement: mk,
    execCommand: null,   // 시험마다 갈아 끼운다
  }
}

describe('복사 성패를 정직하게 가른다', () => {
  it('클립보드가 받아 주면 참이다', async () => {
    const wrote = []
    const nav = { clipboard: { writeText: async (t) => { wrote.push(t) } } }
    expect(await copyText('내 기록', { navigator: nav, document: fakeDoc() })).toBe(true)
    expect(wrote).toEqual(['내 기록'])
  })

  it('execCommand 가 false 를 돌려주면 실패다 — 던지지 않아도 실패다', async () => {
    const doc = fakeDoc()
    doc.execCommand = () => false
    expect(await copyText('내 기록', { navigator: {}, document: doc })).toBe(false)
  })

  it('execCommand 가 던져도 실패다', async () => {
    const doc = fakeDoc()
    doc.execCommand = () => { throw new Error('막혔다') }
    expect(await copyText('내 기록', { navigator: {}, document: doc })).toBe(false)
  })

  it('execCommand 가 아무것도 안 돌려줘도 성공으로 세지 않는다', async () => {
    const doc = fakeDoc()
    doc.execCommand = () => undefined
    expect(await copyText('내 기록', { navigator: {}, document: doc })).toBe(false)
  })

  it('execCommand 가 참이면 성공이다', async () => {
    const doc = fakeDoc()
    doc.execCommand = () => true
    expect(await copyText('내 기록', { navigator: {}, document: doc })).toBe(true)
  })

  it('클립보드가 거절하면 옛 길로 한 번 더 가 본다', async () => {
    const doc = fakeDoc()
    let tried = false
    doc.execCommand = () => { tried = true; return true }
    const nav = { clipboard: { writeText: async () => { throw new Error('권한 없음') } } }
    expect(await copyText('내 기록', { navigator: nav, document: doc })).toBe(true)
    expect(tried, '클립보드가 거절했는데 옛 길을 안 갔다').toBe(true)
  })

  it('둘 다 없으면 실패다 — 조용히 성공이라 하지 않는다', async () => {
    expect(await copyText('내 기록', { navigator: {}, document: {} })).toBe(false)
  })

  it('학생이 쓴 글은 value 로만 들어간다 — innerHTML 을 만들지 않는다', async () => {
    const doc = fakeDoc()
    doc.execCommand = () => true
    await copyText('<b>내가 쓴 글</b>', { navigator: {}, document: doc })
    const ta = doc.made.find(e => e.tag === 'textarea')
    expect(ta.value).toBe('<b>내가 쓴 글</b>')
    expect(ta.innerHTML).toBeUndefined()
  })
})

describe('복사가 실패하면 글을 화면에 띄워 준다', () => {
  const openOn = (text = '오늘의 기록') => {
    const doc = fakeDoc()
    const root = doc.createElement('div')
    const handle = openManualCopy(root, text, { document: doc })
    return { doc, root, handle }
  }

  it('학생이 직접 긁어 갈 수 있는 글상자가 화면에 선다', () => {
    const { root, handle } = openOn('오늘의 기록')
    expect(handle).toBeTruthy()
    expect(root.children).toContain(handle.el)
    const box = handle.el.children.find(c => c.tag === 'textarea')
    expect(box, '글상자가 없다 — 학생이 회수할 길이 없다').toBeTruthy()
    expect(box.value).toBe('오늘의 기록')
    expect(box.selected, '열자마자 전체가 골라져 있어야 한다').toBe(true)
  })

  it('무엇을 해야 하는지 화면이 말해 준다 — 우리말로만', () => {
    const { handle } = openOn()
    const text = handle.el.children.map(c => c.textContent).join(' ')
    expect(text).toContain('클립보드에 넣지 못했습니다')
    expect(text).toContain('활동지')
    expect(text).toContain('닫기')
    // 쪽수(p·pp)와 키 이름(E·Q) 말고는 영어 낱말이 없다
    expect(text).not.toMatch(/[A-Za-z]{2,}/)
  })

  it('닫으면 화면에서 사라진다 — 갇히지 않는다', () => {
    const { handle } = openOn()
    const close = handle.el.children.find(c => c.tag === 'button')
    close.listeners.click[0]()
    expect(handle.el.removed).toBe(true)
  })

  it('두 배너가 서로 다른 말을 한다', () => {
    expect(COPY_OK).toBe('복사했습니다')
    expect(COPY_FAILED).not.toBe(COPY_OK)
    expect(COPY_FAILED).toContain('되지 않았습니다')
    expect(COPY_FAILED).not.toMatch(/[A-Za-z]{2,}/)
  })
})

// main.js 쪽 배선 — 성공 갈래만 이어 붙이면 이 모듈이 있으나 마나다.
describe('「내 기록 복사」가 성패를 보고 갈라진다', () => {
  const main = readFileSync(join('src', 'main.js'), 'utf8')

  it('copyRecord 가 실패하면 다른 배너를 띄우고 글상자를 연다', () => {
    const at = main.indexOf('function copyRecord')
    expect(at, 'copyRecord 를 못 찾았다').toBeGreaterThan(-1)
    const body = main.slice(at, main.indexOf('\n  }', at))
    expect(body).toContain('copyText(')
    expect(body).toContain('COPY_OK')
    expect(body).toContain('COPY_FAILED')
    expect(body).toContain('openManualCopy(')
  })

  it('main.js 에 조용히 넘어가는 옛 복사 경로가 남아 있지 않다', () => {
    // 주석은 걷어 내고 본다 — 바로 위 주석이 옛 결함을 그 이름으로 설명한다.
    const LINE_COMMENT = new RegExp('//[^\\r\\n]*', 'g')
    const code = main.replace(LINE_COMMENT, '')
    expect(code).not.toContain('execCommand')
    expect(code).not.toContain('fallbackCopy')
    expect(code).not.toContain('copyToClipboard')
  })
})
