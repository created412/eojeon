import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EPILOGUE } from '../../src/data/epilogue.js'
import { DILEMMAS } from '../../src/data/studies.js'
import { WEIGHS } from '../../src/data/weigh.js'
import { SCENE_ART } from '../../src/ui/scene-art-data.js'
import { epilogueRecap, EPILOGUE_PAGES, nextPage } from '../../src/systems/epilogue.js'
import { recapTitle, recapHtml, afterHtml, closeHtml } from '../../src/ui/epilogue.js'

// 선생님(2026-10-06): 「게임의 마무리가 그냥 도망치고 끝나? 뭔가 게임을 끝낸 거 같지 않고 그래.
// 마무리가 게임이 끝난 거 같은 느낌을 주게끔 마무리 다시 해 봐.」
//
// 돌아와 앉고(tests/data/story-check.test.js), 그 뒤에 세 장이 선다: 스물한 해 → 그 뒤 → 御前 · 끝.

const decided = (...ids) => ({ decisions: ids.map(choiceId => ({ actIndex: 0, choiceId, reason: '' })) })

describe('당신이 지나온 스물한 해', () => {
  it('막마다 한 줄, 다섯 줄이다 — 해의 차례대로', () => {
    const rows = epilogueRecap({ decisions: [] })
    expect(rows.map(r => r.year)).toEqual(['1863', '1866 · 1871', '1876', '1882', '1884'])
    for (const r of rows) expect(r.text.length).toBeGreaterThan(15)
  })

  it('학생이 고른 것이 「 」 안에 그대로 선다 — 저울 · 급료의 보고 · 정강', () => {
    const rows = epilogueRecap(decided('weigh:open1876:shut', 'dilemma:ration:pay', 'dilemma:reform:hold'))
    expect(rows[2].text).toContain(`「${WEIGHS.open1876.pans.shut.label}」`)
    expect(rows[3].text).toContain(`「${DILEMMAS.ration.options.find(o => o.id === 'pay').text}」`)
    expect(rows[4].text).toContain(`「${DILEMMAS.reform.options.find(o => o.id === 'hold').text}」`)
    expect(rows.map(r => r.yours)).toEqual([false, false, true, true, true])
  })

  it('무엇을 골랐든 그 뒤에는 역사가 간 길이 적힌다 — 매기지 않는다', () => {
    for (const side of ['open', 'shut']) {
      const row = epilogueRecap(decided(`weigh:open1876:${side}`))[2]
      expect(row.text).toContain('임금은 문을 열었다')
    }
    const all = epilogueRecap(decided('weigh:open1876:shut', 'dilemma:ration:punish', 'dilemma:reform:issue')).map(r => r.text).join(' ')
    expect(all).toContain('나흘 뒤 난병이 궁에 들었고')
    expect(all).toContain('사흘 만에 끝났다')
    expect(all).not.toMatch(/정답|오답|틀렸|실패|점수|잘했|옳았/)
  })

  it('고른 것이 없는 저장(건너뛴 자리)에서도 줄이 비지 않는다 — 「 」를 지어내지 않는다', () => {
    const rows = epilogueRecap({})
    for (const r of rows) {
      expect(r.text).not.toContain('「')
      expect(r.text).not.toContain('undefined')
      expect(r.yours).toBe(false)
    }
  })

  it('같은 자리를 두 번 치렀으면 뒤의 것을 쓴다', () => {
    const rows = epilogueRecap(decided('weigh:open1876:shut', 'weigh:open1876:open'))
    expect(rows[2].text).toContain(`「${WEIGHS.open1876.pans.open.label}」`)
  })

  it('없는 보기를 가리키는 낡은 저장에도 깨지지 않는다', () => {
    expect(() => epilogueRecap(decided('dilemma:ration:없는것', 'weigh:없는판:open'))).not.toThrow()
    expect(epilogueRecap(decided('dilemma:ration:없는것'))[3].yours).toBe(false)
  })
})

describe('그 뒤 — 교과서와 사전이 적은 일만', () => {
  const rows = EPILOGUE.after.rows

  it('한성 조약 · 톈진 조약 · 아버지의 귀환 · 김옥균과 갑오개혁 · 황제', () => {
    const text = rows.map(r => r.text).join(' ')
    for (const word of ['한성 조약', '톈진 조약', '아버지가 청에서 돌아왔다', '김옥균', '갑오개혁', '황제']) expect(text).toContain(word)
    expect(EPILOGUE.after.origin).toContain('『고등 한국사1』 117쪽')
  })

  it('해가 거꾸로 가지 않는다', () => {
    const years = rows.map(r => Number((r.year.match(/\d{4}/) ?? ['1884'])[0]))
    expect([...years].sort((a, b) => a - b)).toEqual(years)
    expect(years.at(-1)).toBe(1897)
  })

  it('게임 밖의 이야기는 밖이라고 적는다', () => {
    expect(rows.at(-1).text).toContain('이 게임의 밖')
  })

  it('정변을 매기지 않는다 — 5막을 여는 질문은 학생에게 남아 있다', () => {
    expect(JSON.stringify(EPILOGUE)).not.toMatch(/실패였|성공이었|잘못이었|옳았다|틀렸/)
  })
})

describe('御前 · 끝', () => {
  const c = EPILOGUE.close

  it('마지막 장에는 제목과 「끝」이 있다', () => {
    expect(c.title.replace(/\s/g, '')).toBe('御前')
    expect(c.end).toBe('끝')
    expect(c.lines.length).toBe(3)
  })

  it('그림은 재구성이라고 적혀 있다', () => {
    expect(SCENE_ART[c.art]).toBeTruthy()
    expect(SCENE_ART[c.art].caption).toContain('재구성')
    expect(closeHtml(EPILOGUE)).toContain(SCENE_ART[c.art].caption)
  })

  it('기댄 기록을 적는다 — 만든 사람의 이름은 적지 않는다', () => {
    const credits = c.credits.join(' ')
    expect(credits).toContain('『고종실록』')
    expect(credits).toContain('『고등 한국사1』')
    expect(credits).toContain('재구성')
    expect(credits).not.toMatch(/제작|만든 사람|개발/)
  })
})

describe('세 장을 차례로 넘긴다', () => {
  it('스물한 해 → 그 뒤 → 끝', () => {
    expect(EPILOGUE_PAGES).toEqual(['recap', 'after', 'close'])
    expect(nextPage('recap')).toBe('after')
    expect(nextPage('after')).toBe('close')
    expect(nextPage('close')).toBeNull()
    expect(nextPage('없는장')).toBeNull()
  })

  it('첫 장의 제목은 햇수를 ACTS 에서 센다 — 손으로 적지 않는다', () => {
    expect(recapTitle(EPILOGUE).replace(/\s/g, '')).toBe('스물한해')
    expect(recapTitle(EPILOGUE, { span: 14 }).replace(/\s/g, '')).toBe('열네해')
    expect(JSON.stringify(EPILOGUE.recap)).not.toMatch(/스물한|스무/)
  })

  it('장마다 넘기는 단추가 하나 있다', () => {
    const rows = epilogueRecap({ decisions: [] })
    for (const html of [recapHtml(EPILOGUE, rows), afterHtml(EPILOGUE), closeHtml(EPILOGUE)]) {
      expect((html.match(/class="next"/g) ?? []).length).toBe(1)
    }
  })

  it('학생이 고른 줄이 있을 때만 「 」의 풀이가 붙는다', () => {
    expect(recapHtml(EPILOGUE, epilogueRecap({ decisions: [] }))).not.toContain(EPILOGUE.recap.yoursNote)
    expect(recapHtml(EPILOGUE, epilogueRecap(decided('weigh:open1876:open')))).toContain(EPILOGUE.recap.yoursNote)
  })

  it('학생이 쓴 글이 아니어도 화면에 실을 때는 풀어서 싣는다', () => {
    const html = recapHtml(EPILOGUE, [{ year: '<b>', text: '<script>', yours: false }])
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('게임에 실제로 걸려 있다', () => {
  const NL = String.fromCharCode(10)
  const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8').split(NL).filter(l => !l.trim().startsWith('//')).join(NL)
  const body = main.slice(main.indexOf('async function finishAct'))
  const fn = body.slice(0, body.indexOf('flow.nextAct()'))

  it('마지막 막이 끝나면 맺음이 먼저, 나의 기록이 그다음이다', () => {
    const ep = fn.indexOf('epilogue.open(EPILOGUE, flow.state')
    const rec = fn.indexOf('actEnd.showFinal(flow.state)')
    expect(ep).toBeGreaterThan(-1)
    expect(rec).toBeGreaterThan(ep)
    expect(fn.indexOf('flow.isLast()')).toBeLessThan(ep)
  })

  it('맺음 전용 곡을 읽기 음량으로 낮게 깐다', () => {
    expect(fn).toContain("bgm.set('ending', 'bed')")
  })

  it('목록 화면의 이름이 「오늘은 여기까지」가 아니다 — 끝났다', () => {
    const actEnd = readFileSync(join(process.cwd(), 'src', 'ui', 'act-end.js'), 'utf8')
    expect(actEnd).toContain('<h2>나 의  기 록</h2>')
    expect(actEnd).not.toContain('<h2>오 늘 은 여 기 까 지</h2>')
  })
})
