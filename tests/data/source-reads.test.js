import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCES } from '../../src/data/sources.js'
import { INQUIRIES } from '../../src/data/inquiries.js'
import { SOURCE_READS, SEOGYE_DOC } from '../../src/data/source-games.js'
import {
  readFor, partsOf, initialRead, underline, readDone, readHint, readRecord, READ_HINT_AFTER, READ_LINES, BREAK,
} from '../../src/systems/source-read.js'
import {
  unitsOf, targetsOf, initialSeek, look, nominate, seekDone, leftCount, seekHint, seekRecord, HINT_EVERY,
} from '../../src/systems/doc-seek.js'

// 선생님(2026-10-06): 「지금 계속 사료들을 수집하고 있는데 이게 무슨 의미가 있어? 애들이 이걸
// 절대로 안 읽고 그냥 넘어갈 거 같아.」 · 「각 사료를 수집할 때 뭔가 역사교육적인 요소가 필요해.」
//
// 문서를 처음 손에 쥘 때 물음 하나에 답이 되는 구절을 **기록에서 찾아** 밑줄을 긋는다.

const squash = s => String(s).replace(/\s+/g, '')

describe('문서마다 손에 쥘 때 하는 일이 있다', () => {
  // 제 판이 따로 있는 문서: 서계(찾기), 강화도 조약 셋(주석), 조선책략(빈칸).
  const OWN_GAME = new Set([SEOGYE_DOC.id, 'ganghwa1', 'ganghwa7', 'ganghwa10', ...Object.keys(INQUIRIES)])

  it('읽지 않고 닫기만 눌러 모을 수 있는 문서가 한 장도 없다', () => {
    for (const card of SOURCES) {
      const has = OWN_GAME.has(card.id) || !!SOURCE_READS[card.id]
      expect(has, `${card.id}(${card.title}) 은 그냥 닫으면 모인다`).toBe(true)
    }
  })

  it('밑줄 긋기와 제 판이 한 문서에 겹치지 않는다', () => {
    for (const id of Object.keys(SOURCE_READS)) {
      expect(INQUIRIES[id], `${id} 에 사료 탐구와 밑줄 긋기가 둘 다 있다`).toBeUndefined()
      expect(id).not.toBe(SEOGYE_DOC.id)
    }
  })

  it('없는 문서를 가리키지 않는다', () => {
    const ids = new Set(SOURCES.map(c => c.id))
    for (const id of Object.keys(SOURCE_READS)) expect(ids.has(id), `${id} 라는 문서가 없다`).toBe(true)
  })
})

describe('밑줄 긋기 — 기록의 글자를 바꾸지 않는다', () => {
  for (const [id, spec] of Object.entries(SOURCE_READS)) {
    const card = SOURCES.find(c => c.id === id)

    it(`${id} — 구절을 이어 붙이면 기록 그대로다`, () => {
      const joined = partsOf(spec).map(p => p.text).join('')
      expect(squash(joined)).toBe(squash(card.excerpt))
    })

    it(`${id} — 구절이 둘 이상이고, 답의 자리가 그 안에 있다`, () => {
      expect(spec.parts.length).toBeGreaterThanOrEqual(2)
      expect(spec.pick).toBeGreaterThanOrEqual(0)
      expect(spec.pick).toBeLessThan(spec.parts.length)
    })

    it(`${id} — 물음과 그은 뒤의 한 줄이 있다`, () => {
      expect(spec.q.length).toBeGreaterThan(10)
      expect(spec.q).toContain('밑줄')
      expect(spec.found.length).toBeGreaterThan(15)
    })

    it(`${id} — 답이 되는 구절이 빈 조각이 아니다`, () => {
      expect(squash(partsOf(spec)[spec.pick].text).length).toBeGreaterThanOrEqual(4)
    })
  }

  it('줄바꿈 표시는 구절의 끝에만 온다', () => {
    for (const [id, spec] of Object.entries(SOURCE_READS)) {
      for (const p of partsOf(spec)) expect(p.text, `${id}: 「${p.text}」 안에 ${BREAK} 가 남았다`).not.toContain(BREAK)
    }
  })

  it('깎는 낱말을 쓰지 않는다', () => {
    const all = JSON.stringify(SOURCE_READS) + JSON.stringify(READ_LINES)
    expect(all).not.toMatch(/정답|오답|틀렸|실패|점수|감점/)
  })
})

describe('밑줄을 긋는다', () => {
  const spec = readFor('wonnapjeon')

  it('답이 되는 구절을 누르면 그어진다', () => {
    const r = underline(spec, initialRead(), spec.pick)
    expect(r.ok).toBe(true)
    expect(readDone(r.state)).toBe(true)
  })

  it('다른 구절은 그어지지 않는다 — 판은 그대로다', () => {
    const r = underline(spec, initialRead(), 0)
    expect(r.ok).toBe(false)
    expect(readDone(r.state)).toBe(false)
  })

  it(`${READ_HINT_AFTER}번 헛짚으면 그 구절이 빛난다 — 갇히는 학생이 없다`, () => {
    let s = initialRead()
    expect(readHint(spec, s)).toBeNull()
    for (let i = 0; i < READ_HINT_AFTER; i++) s = underline(spec, s, 0).state
    expect(readHint(spec, s)).toBe(spec.pick)
  })

  it('한 번 그으면 다시 긋지 못한다', () => {
    const done = underline(spec, initialRead(), spec.pick).state
    expect(underline(spec, done, 0).state).toBe(done)
  })

  it('그은 구절이 기록에 남는다 — 해석을 쓰는 칸은 없다', () => {
    const done = underline(spec, initialRead(), spec.pick).state
    const rec = readRecord(spec, done)
    expect(rec.kind).toBe('read')
    expect(rec.compared).toBe(true)
    expect(rec.selected[0]).toBe(partsOf(spec)[spec.pick].text.trim())
    expect(rec.text).toBe('')
  })

  it('물음이 없는 문서는 null 이다', () => {
    expect(readFor('없는문서')).toBeNull()
    expect(readFor(SEOGYE_DOC.id)).toBeNull()
  })
})

describe('카드 화면이 실제로 그렇게 묶여 있다', () => {
  const NL = String.fromCharCode(10)
  const src = readFileSync(join(process.cwd(), 'src', 'ui', 'dialog.js'), 'utf8')
    .split(NL).filter(l => !l.trim().startsWith('//')).join(NL)

  it('긋기 전에는 덮는 단추가 잠기고 해석이 가려진다', () => {
    expect(src).toContain('closeBtn.disabled = true')
    expect(src).toContain('reading-locked')
    expect(src).toMatch(/inquiry = \{ ready: \(\) => readDone\(state\)/)
  })

  it('그으면 해석이 펴지고 기록을 남긴다', () => {
    expect(src).toContain("cardEl.classList.remove('reading-locked')")
    expect(src).toContain('onRead(card.id, readRecord(spec, state))')
  })
})

// ── 서계 — 문서를 세로로 펴고 두 곳을 찾는다 ─────────────────────────────────
//
// 선생님(2026-10-06): 「일본 외교문서 게임에서 못 찾아내면 안 넘어가져야 해. 그리고 실제 정답은
// 이거와 같아」 — 보내 주신 그림에서 붉은 테가 쳐진 곳은 「皇」과 「新印」이다.
describe('서계에서 문제의 두 곳을 찾는다', () => {
  const doc = SEOGYE_DOC
  const hanOf = id => unitsOf(doc).find(u => u.id === id)?.han

  it('문서의 꼴이 보내 주신 그림과 같다 — 오른쪽 줄부터 다섯 줄, 맨 끝에 도장', () => {
    expect(doc.columns.map(col => col.map(u => u.han).join(''))).toEqual([
      '日本國對馬州', '平朝臣謹呈書', '本邦皇祚中興', '萬機親裁', '謹以報知',
    ])
    expect(doc.seal.han).toBe('新印')
  })

  it('찾을 곳은 「皇」과 「新印」 둘이다 — 「勅」은 이 문서에 없다', () => {
    expect(targetsOf(doc).map(hanOf).sort()).toEqual(['新印', '皇'].sort())
    expect(JSON.stringify(doc.columns)).not.toContain('勅')
  })

  it('낱말마다 읽기와 뜻이 있다 — 한자를 못 읽어도 할 수 있다', () => {
    for (const u of unitsOf(doc)) {
      expect(u.read, u.han).toBeTruthy()
      expect(u.mean.length, u.han).toBeGreaterThan(2)
    }
  })

  it('들여다보는 것과 문제 삼는 것은 다르다', () => {
    const s = look(doc, initialSeek(), 'hwang')
    expect(s.picked).toBe('hwang')
    expect(s.found).toEqual([])
  })

  it('아무것도 고르지 않고 문제 삼을 수 없다', () => {
    const r = nominate(doc, initialSeek())
    expect(r.ok).toBe(false)
    expect(r.line).toBe(doc.lines.pickFirst)
  })

  it('맞게 짚으면 왜 문제였는지를 말해 준다', () => {
    const r = nominate(doc, look(doc, initialSeek(), 'hwang'))
    expect(r.ok).toBe(true)
    expect(r.line).toContain('황제')
    expect(leftCount(doc, r.state)).toBe(1)
    expect(seekDone(doc, r.state)).toBe(false)
  })

  it('하나만 찾아서는 끝나지 않는다 — 둘 다 찾아야 덮인다', () => {
    let s = nominate(doc, look(doc, initialSeek(), 'sinin')).state
    expect(seekDone(doc, s)).toBe(false)
    s = nominate(doc, look(doc, s, 'hwang')).state
    expect(seekDone(doc, s)).toBe(true)
    expect(seekRecord(doc, s)).toMatchObject({ kind: 'seek', compared: true, selected: ['新印', '皇'] })
  })

  it('헛짚어도 깎지 않고, 그 낱말에 맞는 말을 해 준다', () => {
    const plain = nominate(doc, look(doc, initialSeek(), 'mangi'))
    expect(plain.ok).toBe(false)
    expect(plain.line).toBe(doc.lines.miss)
    const title = nominate(doc, look(doc, initialSeek(), 'pyeongjosin'))
    expect(title.line).toContain('직함')       // 조선이 낯설게 본 대목 — 「아니다」로만 자르지 않는다
  })

  it(`${HINT_EVERY}번 헛짚을 때마다 귀띔이 하나씩 나온다`, () => {
    let s = initialSeek()
    expect(seekHint(doc, s)).toBeNull()
    for (let i = 0; i < HINT_EVERY; i++) s = nominate(doc, look(doc, s, 'mangi')).state
    expect(seekHint(doc, s)).toBe(doc.hints[0])
    for (let i = 0; i < HINT_EVERY; i++) s = nominate(doc, look(doc, s, 'mangi')).state
    expect(seekHint(doc, s)).toBe(doc.hints[1])
    for (let i = 0; i < 10; i++) s = nominate(doc, look(doc, s, 'mangi')).state
    expect(seekHint(doc, s)).toBe(doc.hints.at(-1))
  })

  it('이미 찾은 곳을 또 짚어도 두 번 세지 않는다', () => {
    let s = nominate(doc, look(doc, initialSeek(), 'hwang')).state
    const again = nominate(doc, look(doc, s, 'hwang'))
    expect(again.ok).toBe(false)
    expect(again.state.found).toEqual(['hwang'])
  })

  it('어디서 온 문서인지, 풀이는 누가 붙였는지 밝힌다', () => {
    expect(doc.origin).toContain('110쪽')
    expect(doc.origin).toContain('우리가 붙였습니다')
  })

  it('화면이 두 곳을 다 찾기 전에는 덮는 단추를 잠가 둔다', () => {
    const NL = String.fromCharCode(10)
    const src = readFileSync(join(process.cwd(), 'src', 'ui', 'doc-seek.js'), 'utf8')
      .split(NL).filter(l => !l.trim().startsWith('//')).join(NL)
    expect(src).toMatch(/class="close" disabled/)
    expect(src).toContain('if (closed || closeBtn.disabled) return')
  })
})
