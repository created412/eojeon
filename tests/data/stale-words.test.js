import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { KIND_GUIDE } from '../../src/data/guide.js'

// 걷어낸 기능을 화면이 아직도 말하고 있지 않은가.
//
// 2026-10-05 전체 점검에서 넷이 나왔다. 기능을 걷어낼 때 그 기능의 화면은 지웠지만,
// **다른 화면이 그 기능을 가리키는 말**은 남아 있었다:
//   · 어전회의 안내가 「이유를 한 문장 이상 쓰세요」 — 이유 칸은 9월 27일에 없앴다
//   · 훈령 안내가 「이유를 쓰세요」
//   · 물건 배너가 「해 칸은 쓰지 않는다」 — 해 칸은 9월 26일에 없앴다
//   · 어전회의가 「내 기록 복사에 그대로 들어갑니다」 — 그 단추는 9월 30일에 없앴다
// 학생은 없는 것을 찾아 헤맨다. 시험은 전부 초록불이었다 — 낱말은 시험하지 않았으니까.
//
// 그래서 **걷어낸 것의 이름**을 여기 적어 둔다. 기능을 하나 걷어낼 때마다 한 줄 더한다.
const GONE = [
  { word: '해 칸', why: '하루의 셈(해 칸)은 2026-09-26 에 없앴다' },
  { word: '내 기록 복사', why: '복사 단추는 2026-09-30 에 걷어냈다' },
  { word: '지레를', why: '지레 둘짜리 셈판은 2026-09-30 에 「경복궁을 짓는다」로 갈았다' },
  { word: '백 칸', why: '백 칸 셈판은 2026-09-30 에 갈았다' },
  { word: '결승선', why: '달아나는 결승선은 2026-09-30 에 갈았다' },
]

function jsFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return jsFiles(p)
    return name.endsWith('.js') && !name.endsWith('-data.js') ? [p] : []
  })
}

// 주석은 걷어 내고 본다 — 주석은 「왜 없앴는가」를 그 이름으로 설명해야 한다.
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').split(/\r?\n/)
  .map(line => line.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/ .*$/, '')).join('\n')

describe('걷어낸 기능을 화면이 아직 말하지 않는다', () => {
  const files = jsFiles(join(process.cwd(), 'src')).map(p => [p, strip(readFileSync(p, 'utf8'))])

  for (const { word, why } of GONE) {
    it(`「${word}」 — ${why}`, () => {
      const hits = files.filter(([, code]) => code.includes(word)).map(([p]) => p.split(/[\/]src[\/]/)[1])
      expect(hits, `아직 「${word}」을 말하는 파일`).toEqual([])
    })
  }
})

describe('「지금 할 일」이 실제로 있는 일을 시킨다', () => {
  it('어전회의·훈령 안내가 없어진 「이유 쓰기」를 시키지 않는다', () => {
    expect(KIND_GUIDE.council).not.toMatch(/이유를/)
    expect(KIND_GUIDE.orders).not.toMatch(/이유를 쓰/)
  })

  it('국상 안내가 어보를 말한다 — 읽기만 시키면 넘어가는 길을 모른다', () => {
    expect(KIND_GUIDE.edict).toMatch(/어보/)
    expect(KIND_GUIDE.edict).toMatch(/누르/)
  })

  it('손으로 하는 장면마다 안내가 있다', () => {
    for (const kind of ['funding', 'brush', 'dispatch', 'council', 'orders']) {
      expect(KIND_GUIDE[kind], `${kind} 에 안내가 없다`).toBeTruthy()
    }
  })
})
