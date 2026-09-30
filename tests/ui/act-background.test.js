import { describe, it, expect } from 'vitest'
import { backgroundHtml, panelHtml } from '../../src/ui/act-background.js'
import { ACT_BACKGROUND, backgroundFor } from '../../src/data/act-background.js'
import { HISTORICAL_MEDIA } from '../../src/ui/historical-media-data.js'
import { ACTS } from '../../src/data/acts.js'

// 선생님(2026-09-30): 「이 그림 대신 1막의 역사적 내용을 영상이나 그림 등으로
// 배경지식을 설명해 주면 좋을 것 같아.」

describe('배경지식 — 무엇을 싣는가', () => {
  it('막 id 로 찾는다. 없는 막은 null 이라 예전 화면이 그대로 선다', () => {
    expect(backgroundFor('enthronement')).toBeTruthy()
    expect(backgroundFor('gapsin')).toBeNull()
    expect(backgroundFor(undefined)).toBeNull()
  })

  it('실린 막 id 가 실제로 있는 막이다', () => {
    const ids = new Set(ACTS.map(a => a.id))
    for (const key of Object.keys(ACT_BACKGROUND)) expect(ids.has(key), `${key} 라는 막이 없다`).toBe(true)
  })

  it('1막 배경이 교과서가 적은 것을 짚는다', () => {
    const all = JSON.stringify(ACT_BACKGROUND.enthronement)
    for (const word of ['세도 정치', '삼정의 문란', '통상', '철종', '흥선 대원군', '경복궁', '원납전', '당백전']) {
      expect(all, `「${word}」이 빠졌다`).toContain(word)
    }
  })

  it('어디서 온 글인지 밝힌다', () => {
    expect(ACT_BACKGROUND.enthronement.origin).toContain('한국사1')
  })
})

describe('사진마다 그것이 무엇인지 밝힌다', () => {
  // 배경지식을 가르치는 자리에서 사료/재구성 구분이 무너지면, 이 게임이 줄곧
  // 지켜 온 것이 **가장 중요한 자리에서** 무너진다.
  it('사진을 쓰는 대목은 반드시 relation 을 단다', () => {
    for (const bg of Object.values(ACT_BACKGROUND)) {
      for (const p of bg.panels) {
        if (!p.media) continue
        expect(p.relation, `${p.id} 에 사진 설명이 없다`).toBeTruthy()
        expect(p.relation.length, `${p.id} 의 설명이 너무 짧다`).toBeGreaterThan(8)
      }
    }
  })

  it('가리키는 사진이 실제로 실려 있다 — 빈 칸이 뜨지 않는다', () => {
    for (const bg of Object.values(ACT_BACKGROUND)) {
      for (const p of bg.panels) {
        if (!p.media) continue
        expect(HISTORICAL_MEDIA[p.media], `${p.media} 라는 사진이 없다`).toBeTruthy()
        expect(HISTORICAL_MEDIA[p.media].src).toMatch(/^data:image\//)
      }
    }
  })

  it('바깥 주소를 가리키지 않는다 — 학교 망에서 막혀도 뜬다', () => {
    const html = backgroundHtml(ACT_BACKGROUND.enthronement)
    expect(html).not.toMatch(/src="https?:/)
  })

  it('그 장면을 찍은 것이 아닌 사진은 그렇다고 먼저 말한다', () => {
    const bg = ACT_BACKGROUND.enthronement
    const gojong = bg.panels.find(p => p.media === 'gojong')
    expect(gojong.relation).toMatch(/아닙니다|아니라/)
    const palace = bg.panels.find(p => p.media === 'gyeongbokgung')
    expect(palace.relation).toMatch(/아닙니다|아니라/)
  })

  it('사진이 없는 대목도 글만으로 선다', () => {
    const html = panelHtml({ id: 'x', heading: '제목', lines: ['한 줄'] })
    expect(html).toContain('제목')
    expect(html).toContain('한 줄')
    expect(html).not.toContain('<img')
  })
})

describe('판이 실제로 그려진다', () => {
  const html = backgroundHtml({ ...ACT_BACKGROUND.enthronement, buttonLabel: '1막을 시작한다' })

  it('대목이 하나도 빠지지 않는다', () => {
    for (const p of ACT_BACKGROUND.enthronement.panels) expect(html).toContain(p.heading)
  })

  it('교과서에 실린 사료를 인용 줄로 세운다', () => {
    expect(html).toContain('<blockquote>')
    expect(html).toContain('매천야록')
  })

  it('연표가 선다', () => {
    expect(html).toContain('1863')
    expect(html).toContain('고종 즉위')
  })

  it('무엇을 하게 되는지 한 줄은 남긴다', () => {
    // 「이 막의 여정」 판이 하던 일을 한 줄로 줄인 것이다 — 배경지식이 그것을
    // 밀어내되, 학생이 무엇을 할지 전혀 모른 채 들어가게 두지는 않는다.
    expect(html).toContain('다섯 걸음')
  })

  it('나가는 단추가 하나다', () => {
    expect(html.match(/<button/g)).toHaveLength(1)
  })

  it('글자를 그대로 끼워 넣지 않는다 — 꺾쇠가 섞여도 깨지지 않는다', () => {
    const html = panelHtml({ id: 'x', heading: '<script>x</script>', lines: ['a<b'] })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
