import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ACTS, actById } from '../../src/data/acts.js'
import { ACT_BACKGROUND } from '../../src/data/act-background.js'
import { beatsOf } from '../../src/systems/scenario.js'
import { sceneNotice, SCENE_NOTICE } from '../../src/systems/audience.js'

// 선생님(2026-10-06): 「내 게임의 가장 큰 장점은 탄탄한 스토리라인이야. 역사 내용과 고종의
// 입장에 감정이입이 될 수 있게 만드는 거고. 마지막으로 점검해봐.」
//
// 다섯 막의 글을 처음부터 끝까지 대본으로 뽑아 읽고 찾은 것들이다. 하나하나는 작지만
// 모두 「이야기의 줄기」에 걸려 있다 — 누가 곁에 서 있었는가, 무엇이 먼저였는가,
// 무엇이 무엇을 불러왔는가. 고친 자리가 되돌아가지 않게 붙든다.

const NL = String.fromCharCode(10)
const beat = (actId, id) => beatsOf(actById(actId)).find(b => b.id === id)
const text = b => [...(b.lines ?? []), ...(b.afterLines ?? [])].join(NL)
const at = (actId, id) => beatsOf(actById(actId)).findIndex(b => b.id === id)

describe('1막 — 명복이 임금이 되는 자리', () => {
  it('세도 육십여 년을 안동 김씨 한 집안의 것으로 적지 않는다', () => {
    const t = text(beat('enthronement', 'unhyeon-note'))
    expect(t).not.toContain('육십여 년 동안 안동 김씨 집안이')
    expect(t).toContain('외척')
    expect(t).toContain('안동 김씨')
  })

  it('즉위하는 순간에 화면이 「이 게임에서」라고 말하지 않는다', () => {
    const b = beat('enthronement', 'throne')
    expect(text(b)).not.toContain('이 게임')
    // 어전 풀이는 남는다 — 그리고 그 자리에 누가 서 있는지가 바로 이어진다.
    const i = b.lines.findIndex(l => l.includes('御 임금 · 前 앞'))
    expect(i).toBeGreaterThanOrEqual(0)
    expect(b.lines[i + 1]).toContain('아버지가 서 계신다')
  })

  it('닫는 글이 「셈을 한 사람은 임금이 아니었다」고 하지 않는다 — 셈은 학생이 했다', () => {
    const t = text(beat('enthronement', 'funding'))
    expect(t).not.toContain('셈을 한 사람은')
    expect(t).toContain('정한 사람은 당신이 아니었다')
  })
})

describe('2막 — 임금은 강화도에 가지 못한다', () => {
  it('막을 여는 배경 화면이 「강화도에서 시작한다」고 하지 않는다', () => {
    const ahead = ACT_BACKGROUND.yangyo.ahead
    expect(ahead).not.toContain('강화도에서 시작한다')
    expect(ahead).toContain('창덕궁에서 시작한다')
    expect(actById('yangyo').palace).toBe('changdeok')
  })
})

describe('3막 — 아버지가 물러난다', () => {
  it('막을 여는 글이 다음 장면의 결말을 먼저 말하지 않는다', () => {
    const t = text(beat('chinjeong', 'gyeyu-sangso'))
    expect(t).not.toContain('물러가셨다')
    // 그 장면에서 아버지는 아직 곁에 서 있다.
    expect(beat('chinjeong', 'gyeyu-audience').beside).toBe('heungseon')
    expect(at('chinjeong', 'gyeyu-sangso')).toBeLessThan(at('chinjeong', 'gyeyu-audience'))
  })

  it('빈자리의 주인은 신하가 아니라 아버지다', () => {
    const t = text(beat('chinjeong', 'doors-open'))
    expect(t).not.toContain('신하가 서 있던')
    expect(t).toContain('아버지가 곁에 서 계셨다')
  })

  it('걷어 낸 수렴청정의 「발」을 가리키지 않는다', () => {
    expect(text(beat('chinjeong', 'doors-open'))).not.toContain('발 앞에서')
  })

  it('막을 닫는 글이 계유상소를 「문을 열라는 상소」라 하지 않는다', () => {
    const t = beat('chinjeong', 'end').lines.join(NL)
    expect(t).not.toContain('문을 열라는 상소')
    expect(t).not.toContain('반쯤 닫혔다')
    expect(t).toContain('아버지를 물러나게 한 상소')
    expect(t).toContain('아버지 없이 정했다')
  })
})

describe('4막 — 날짜가 거꾸로 흐르지 않는다', () => {

  it('난의 밤 → 아버지 → 걸을 수 없다 → 얼어붙은 회의 → 끌려감의 차례다', () => {
    const order = ['imo-rush', 'imo-choice', 'imo-father-returns', 'imo-daewongun', 'imo-council', 'imo-invitation', 'imo-abduction', 'imo-jemulpo', 'imo-sokbang']
    const idx = order.map(id => at('imo', id))
    expect(idx.every(i => i >= 0)).toBe(true)
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
    expect(beat('imo', 'imo-father-returns').dateLabel).toContain('6월 10일')
  })

  // 난의 밤은 하루에 두 번 바뀌었다(2026-10-06): 왕비에게 달려가는 촉박 → 글 한 장 → 다시
  // 달아나는 판. 지금은 **왕비 없이** 안쪽 침전으로 몸을 피하고, 닿아야 아버지가 온다.
  it('난의 밤은 달아나는 판이고, 기록과 재구성을 가른다', () => {
    const r = beat('imo', 'imo-rush')
    expect(r.kind).toBe('rush')
    const t = r.intro.lines.join(NL)
    expect(t).toContain('실록에 없다')
    expect(t).toContain('재구성')
    expect(t).toContain('고위 관료')           // 교과서 115쪽
    expect(r.intro.origin).toContain('115쪽')
    expect(JSON.stringify(r)).not.toContain('왕비')
  })



  it('막을 여는 글이 어디서부터 센 열아홉 해인지 말한다', () => {
    expect(beat('imo', 'imo-open').lines[0]).toMatch(/^즉위한 지 열아홉 해가 지났다/)
  })
})

describe('5막', () => {
  // 2026-10-06 — 회의의 근거 풀이(notes)는 「근거 대기」와 함께 걷어 냈다. 그 카드가 누구의 글인지는
  // 카드 자신과 사초함 물음이 말한다.
  it('후쿠자와 전기의 카드가 스스로 「김옥균이 직접 쓴 글이 아니다」라고 밝힌다', () => {
    const src = readFileSync(join(process.cwd(), 'src', 'data', 'sources.js'), 'utf8')
    expect(src).toContain('김옥균이 직접 쓴 글이 아니라')
    expect(readFileSync(join(process.cwd(), 'src', 'data', 'acts.js'), 'utf8')).not.toContain('그가 망명한 뒤에 쓴 것')
  })

  it('윤치호의 나이를 만 나이로 박지 않는다 — 이 게임의 나이는 세는나이다', () => {
    expect(text(beat('gapsin', 'gapsin-after'))).not.toContain('열아홉 살이던')
  })
})

// ── 사람이 걸어 들어와 말하는 장면에도 「재구성」이 보인다 ─────────────────────
describe('알현·행렬의 근거 줄', () => {
  const staged = ACTS.flatMap(a => beatsOf(a).filter(b => b.kind === 'audience' || b.kind === 'procession')
    .map(b => ({ act: a.id, b })))

  it('그런 장면이 실제로 있다', () => { expect(staged.length).toBeGreaterThanOrEqual(12) })

  it.each(staged.map(s => [`${s.act}/${s.b.id}`, s.b]))('%s 에 근거가 적혀 있다', (_, b) => {
    expect(typeof b.origin).toBe('string')
    expect(b.origin.length).toBeGreaterThan(10)
    expect(b.origin, '무엇이 지어낸 것인지 말하지 않는다').toMatch(/재구성/)
  })

  it('고지는 알현·행렬에만 붙고, 근거를 함께 돌려준다', () => {
    const b = beat('chinjeong', 'gyeyu-audience')
    expect(sceneNotice(b)).toEqual({ notice: SCENE_NOTICE, origin: b.origin })
    expect(SCENE_NOTICE).toContain('재구성')
    expect(sceneNotice({ kind: 'note', origin: 'x' })).toBeNull()
    expect(sceneNotice(null)).toBeNull()
    expect(sceneNotice({ kind: 'audience' })).toEqual({ notice: SCENE_NOTICE, origin: null })
  })

  it('화면이 실제로 그 고지를 띄우고 거둔다', () => {
    const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8')
    for (const fn of ['playAudience', 'playProcession']) {
      const start = main.indexOf(`async function ${fn}(`)
      const body = main.slice(start, main.indexOf(NL + '  }' + NL, start))
      expect(body, `${fn} 이 고지를 띄우지 않는다`).toContain('sceneNote.show(beat)')
      expect(body, `${fn} 이 고지를 거두지 않는다`).toContain('sceneNote.hide()')
    }
  })
})

// ── 화자는 처음부터 끝까지 「당신」이다 ─────────────────────────────────────
//
// 선생님(2026-10-06): 「화자를 통일하고.」 1막은 「명복은/그는」, 2막 끝은 「내가」, 3막부터
// 「당신」이었다 — 학생이 앉은 자리가 막마다 바뀌었다. 지문은 모두 「당신」으로 부른다.
// 다만 기록이 말하는 사람은 「임금」으로 남긴다: 당신이 한 일과 기록에 남은 일은 다르다.
describe('화자가 하나다', () => {
  // 사람이 하는 말(「…」)과 출처·풀이 줄은 지문이 아니다.
  const SKIP_KEYS = new Set(['origin', 'sillok', 'note', 'stagedNote', 'soldierNote', 'partial', 'quoteOrigin',
    'gloss', 'notes', 'echo', 'text', 'line', 'rowsOrigin', 'blockLine', 'label', 'dateLabel', 'title'])
  const narration = []
  const walk = (node, key, path) => {
    if (typeof node === 'string') {
      if (!SKIP_KEYS.has(key) && !node.trim().startsWith('「')) narration.push({ path, text: node })
      return
    }
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, key, path + '[' + i + ']'))
    if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, k, path + '.' + k)
  }
  for (const a of ACTS) for (const b of beatsOf(a)) walk(b, '', a.id + '/' + b.id)

  it('지문을 실제로 긁어 온다', () => { expect(narration.length).toBeGreaterThan(80) })

  it('지문이 「나/내가」로 말하지 않는다', () => {
    for (const n of narration) {
      expect(n.text, n.path).not.toMatch(/(^|[ ,])(내가|나는|나를|나의|내 )/)
    }
  })

  it('지문이 학생을 「명복은/그는」으로 부르지 않는다', () => {
    for (const n of narration) {
      expect(n.text, n.path).not.toMatch(/명복은|명복의 어깨|그는 더 이상/)
    }
  })

  it('첫 화면부터 「당신」이다', () => {
    expect(beat('enthronement', 'unhyeon-note').lines[0]).toMatch(/^당신은 열두 살/)
    expect(text(beat('enthronement', 'unhyeon-procession'))).toContain('어제까지 당신은 명복이었다')
    expect(beat('enthronement', 'unhyeon-procession').board.lines.join(NL)).toContain('당신은 더 이상 명복이 아니다')
  })

  it('2막의 속말 두 줄도 「당신」이다', () => {
    expect(text(beat('yangyo', 'move-1868-out'))).toContain('당신이 정하지 않았다')
    expect(text(beat('yangyo', 'end'))).toContain('정하는 사람도 당신이 아니다')
  })

  it('기록이 말하는 사람은 「임금」으로 남는다 — 당신이 한 일과 기록은 다르다', () => {
    expect(beat('imo', 'imo-rush').intro.lines.join(NL)).toContain('임금이 궁 안 어디에 있었는지')
    expect(beat('gapsin', 'gapsin-takezoe').lines.join(NL)).toContain('임금이 「日使來衛')
  })
})

describe('끝을 사람의 자리로 닫는다', () => {
  // 2026-10-06 — 이 글은 이제 맨 끝이 아니다(id:'three-days'). 그 뒤에 궁으로 돌아와 앉는 길이 선다.
  const end = beat('gapsin', 'three-days')
  it('5막의 마지막 글이 셈법 이야기로 끝나지 않는다', () => {
    expect(text(end)).not.toContain('세는 방식에 따라')
    expect(end.lines.at(-1)).toContain('당신에게 남는다')
  })
  it('어디로 옮겨졌는지를 말하되 횟수는 적지 않는다 (판정 R55)', () => {
    expect(end.lines[0]).toContain('군영으로 옮겨졌다')
    expect(text(end)).not.toMatch(/[0-9]+ *번|(한|두|세|네|다섯|여섯|일곱) 번/)
    expect(text(end)).toContain('이 게임이 말하지 않는다')
  })
})

// 선생님(2026-10-06): 「게임의 마무리가 그냥 도망치고 끝나? 뭔가 게임을 끝낸 거 같지 않고 그래.
// 마무리가 게임이 끝난 거 같은 느낌을 주게끔 마무리 다시 해 봐.」
describe('끝 — 달아난 자리에서 끝나지 않는다. 돌아와 앉는다', () => {
  const beats = ACTS[4].beats
  const idx = id => beats.findIndex(b => b.id === id)

  it('청군의 군영 뒤에 궁으로 돌아오는 이어가 있다 — 실록 10월 23일', () => {
    const back = beat('gapsin', 'gapsin-return')
    expect(back.kind).toBe('move')
    expect(back.palace).toBe('changdeok')
    expect(back.sillok).toContain('10월 23일')
    expect(back.sillok).toContain('환어')
    expect(back.sillok).toContain('줄였습니다')   // 20일 원세개의 영방으로 옮긴 것은 화면에서 줄였다고 밝힌다
    expect(idx('gapsin-move-ojoyu')).toBeLessThan(idx('gapsin-return'))
  })

  it('돌아온 뒤 제 발로 걷는다 — 이 막에서 처음이고, 갈 곳은 인정전의 어좌 하나다', () => {
    const walk = beat('gapsin', 'last-walk')
    expect(walk.kind).toBe('explore')
    expect(walk.control).toBe('A')
    expect(walk.exit.room).toBe('injeongjeon')
    expect(walk.exit.label).toContain('어좌에 앉는다')
    expect(walk.spawnRoom).toBe('donhwamun')              // 궁의 문에서 시작한다 — 돌아오는 길을 걷는다
    expect(walk.exit.objective).toContain('스스로 걷는다')
    expect(walk.guide).toContain('아무도 데려가지 않습니다')
    expect(walk.plain).toBe(true)                         // 물건이 E 를 가로채지 않는다
    expect(walk.stops).toBeUndefined()
    for (const b of beats.slice(0, idx('gapsin-return'))) expect(b.control, b.id).not.toBe('A')
  })

  it('마지막 장면은 어좌 앞이다 — 글 화면이 아니라 서 있는 자리', () => {
    const end = beats.at(-1)
    expect(end.id).toBe('end')
    expect(end.kind).toBe('alone')
    expect(end.room).toBe('injeongjeon')
    expect(end.lines[0]).toContain('열두 살에 처음 앉았던 자리')
    expect(end.origin).toContain('재구성')
    expect(idx('last-walk')).toBe(idx('end') - 1)
  })
})

// 2026-10-06 — 선생님: 「장계를 순서대로 놓는 것보단 프랑스 애들을 물리치는 미니게임이 좋지 않을까.
// 관련 어전회의와 근거 대기 등도 없애고 합쳐서 미니게임 하나. 그 결과 프랑스가 외규장각 의궤를
// 훔쳐 가는 스토리로 이어지도록.」
describe('2막 정족산성 — 장계가 오고, 그 밤을 치르고, 곧바로 약탈로 이어진다', () => {
  const b = beat('yangyo', 'jeongjok-battle')
  it('파발 → 정족산성 → 외규장각 약탈이 사이에 아무것도 없이 잇닿는다', () => {
    expect(at('yangyo', 'janggye-arrives')).toBe(at('yangyo', 'jeongjok-battle') - 1)
    expect(at('yangyo', 'jeongjok-battle')).toBe(at('yangyo', 'oegyujanggak-plunder') - 1)
  })
  it('장계 차례 맞추기와 그 어전회의는 없다', () => {
    expect(at('yangyo', 'byeongin-dispatch')).toBe(-1)
    expect(at('yangyo', 'council-byeongin')).toBe(-1)
  })
  it('승전 장계는 그 밤을 치른 뒤에 손에 들어온다', () => {
    expect(beat('yangyo', 'janggye-arrives').visitors.flatMap(v => v.grantCards ?? [])).toEqual([])
    expect(b.grantCard).toBe('yangheonsu')
    expect(b.quote).toContain('저들이 오르기를 기다려 쳤더니')
  })
  it('이긴 뒤의 글이 약탈로 넘긴다 — 교과서의 문장과 「그러나」', () => {
    expect(b.actual).toContain('승리를 거두었다')
    expect(b.actual).toContain('외규장각 도서 등을 약탈하였다')
    expect(b.actualOrigin).toContain('『고등 한국사1』')
    expect(b.bridge).toContain('빈손으로 물러가지 않았다')
  })
  it('임금이 강화도에 간 것처럼 꾸미지 않는다 — 재구성이라고 밝힌다', () => {
    expect(b.grade).toBe('staged')
    expect(b.origin).toContain('재구성')
    expect(b.note).toContain('한양을 떠날 수 없다')
    expect(b.sub).toContain('재구성')
  })
})
