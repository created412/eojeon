import { describe, it, expect } from 'vitest'
import { ACTS, actById } from '../../src/data/acts.js'
import { SOURCES } from '../../src/data/sources.js'
import { beatsOf } from '../../src/systems/scenario.js'

// ── 게임 안의 「N 해」를 전수로 훑는다 ────────────────────────────────────
//
// 이 게임이 세 번 물린 자리다. 「스무 해 / 스물한 해 / 열아홉 해」를 한 번 잡았는데
// 그물에 하나가 남아 있었다 — 4막 종로 화면의 「열여섯 해 전 … 그 어전회의」다.
// 열여섯은 당백전(1866)에서 온 수인데 문장은 1863의 어전회의를 가리켰고, 바로 아래
// 쌀값 표의 첫 줄은 「1863 즉위」였다. 학생이 한 화면에서 어긋난 두 수를 본다.
//
// 그래서 이 시험은 **목록을 손으로 적지 않는다.** ACTS·SOURCES 를 통째로 걸어
// 「우리말 수 + 해」를 전부 긁어낸 뒤, 자리마다 등록된 두 해와 대조한다. 새 「N 해」가
// 어딘가에 적히는 순간 이 시험이 「등록되지 않았다」며 운다 — 그때 그 자리가 가리키는
// 두 해를 여기 적어야 하고, 그러면 계산은 데이터에서 다시 뽑아 맞춘다.
//
// 기준 해는 되도록 데이터에서 뽑는다:
//   act:<id>   → ACTS 의 그 막 year
//   beat:<id>  → 그 비트의 year, 없으면 dateLabel·title 에 적힌 네 자리 해
//   year:<n>   → 데이터가 해를 갖지 않는 자리(사료 카드)에서만 쓴다
//
// 기간(「다섯 해에 걸쳐 갚는다」)은 두 해 사이의 간격이 아니다 — kind:'duration' 으로
// 갈라 적어, 「이것은 셈이 아니다」를 사람이 한 번 말하게 한다.

const NATIVE = {
  한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9,
  열: 10, 열한: 11, 열하나: 11, 열두: 12, 열둘: 12, 열세: 13, 열셋: 13,
  열네: 14, 열넷: 14, 열다섯: 15, 열여섯: 16, 열일곱: 17, 열여덟: 18, 열아홉: 19,
  스무: 20, 스물: 20, 스물한: 21, 스물두: 22, 서른: 30,
}

// 긴 것부터 늘어놓아 「열여섯」이 「열」로 잘리지 않게 한다.
const NUMERALS = Object.keys(NATIVE).sort((a, b) => b.length - a.length)
const COUNT_RE = new RegExp(`(${NUMERALS.join('|')}) *해`, 'g')

// 「해」로 시작하는 다른 낱말(해군·해안·해마다·해군력…)에 걸리지 않게 거른다.
const NOT_A_YEAR = /^해(군|안|마|결|석|당|양|外)/

function walkStrings(node, path, visit) {
  if (typeof node === 'string') return visit(node, path)
  if (Array.isArray(node)) return node.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit))
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walkStrings(v, `${path}.${k}`, visit)
  }
}

// 게임이 학생에게 내보내는 글은 이 두 나무에 전부 들어 있다. ui/ 쪽의 햇수는
// actSpan()·nativeCount() 가 세므로 손으로 적힌 수가 없다(title.js·act-end.js).
export function collectYearCounts() {
  const found = []
  for (const [root, name] of [[ACTS, 'ACTS'], [SOURCES, 'SOURCES']]) {
    walkStrings(root, name, (text, path) => {
      for (const m of text.matchAll(COUNT_RE)) {
        const after = text.slice(m.index + m[0].length - 1)
        if (NOT_A_YEAR.test(after)) continue
        found.push({ path, word: m[1], count: NATIVE[m[1]], text })
      }
    })
  }
  return found
}

// ── 자리마다 등록된 두 해 ─────────────────────────────────────────────
// where 는 그 문장에서만 나오는 토막이다. 같은 문장이 여럿에 걸리면 아래 시험이 운다.
const CLAIMS = [
  {
    where: '해가 지났다',
    note: '4막 첫 줄 — 즉위(1863)에서 임오(1882)까지',
    from: 'act:enthronement', to: 'act:imo',
  },
  {
    // 2026-10-06 — 「닷새 전」이었다. 경복궁 중건 논의는 즉위 닷새 뒤가 아니라 1865년이다.
    where: '두 해 전 운현궁에',
    note: '1막 어전 — 가마를 대던 날(1863)에서 경복궁 중건을 논하는 날(1865)까지',
    from: 'act:enthronement', to: 'beat:audience',
  },
  {
    where: '즉위한 지 두 해',
    note: '1막 어전의 첫 지문 — 즉위(1863)에서 경복궁 중건을 논하는 날(1865)까지',
    from: 'act:enthronement', to: 'beat:audience',
  },
  {
    where: '당백전을 찍어 낸',
    note: '종로 — 당백전을 낸 해(2막 1866)에서 지금(1882)까지',
    from: 'act:yangyo', to: 'act:imo',
  },
  {
    // 2026-10-06 — 예전 줄은 1882년의 쌀값을 당백전에 이었다. 교과서(p.115)가 드는 까닭은
    // 개항 뒤의 쌀 유출이다. 조약(1876)에서 지금(1882)까지.
    where: '여섯 해 전에 조약을 맺은 뒤로',
    note: '종로 — 강화도 조약(1876)에서 지금(1882)까지',
    from: 'year:1876', to: 'act:imo',
  },
  {
    // 어전회의의 근거 한 줄 — 「다섯 해 뒤 그 일이 미국 함대의 구실이 된다」.
    // 1866(제너럴 셔먼호)에서 1871(신미양요)까지다.
    where: '다섯 해 뒤 그 일이',
    from: 'act:yangyo', to: 'year:1871',
  },
  {
    // 같은 회의의 예보 메아리 둘 — 척화비(1871)와 신미양요(1871), 둘 다 1866에서 센다.
    where: '다섯 해 뒤 척화비가',
    from: 'act:yangyo', to: 'year:1871',
  },
  {
    where: '다섯 해 뒤 미국 함대가',
    from: 'act:yangyo', to: 'year:1871',
  },
  {
    // 4막 영남 만인소(1881)는 개항(1876)에서 다섯 해 뒤다.
    where: '다섯 해 뒤 영남 만인소가',
    from: 'year:1876', to: 'year:1881',
  },
  {
    // 3막 조약 회의 — 최익현이 아버지를 물러나게 한 계유상소(1873)에서 이 회의(1876)까지.
    where: '이 사람은 세 해 전',
    from: 'year:1873', to: 'year:1876',
  },
  {
    // 4막 회의 — 조일 무역 규칙(1876)에서 임오군란(1882)까지. 그 글이 쌀값으로 돌아온다.
    where: '여섯 해 전에 맺은 글이',
    from: 'year:1876', to: 'act:imo',
  },
  {
    // 4막 회의의 예보 메아리 — 임오군란(1882)에서 갑신정변(1884)까지.
    where: '두 해 뒤 갑신정변이',
    from: 'act:imo', to: 'act:gapsin',
  },
  {
    // 5막 회의의 예보 메아리 — 갑신정변(1884)에서 갑오개혁(1894)까지.
    where: '열 해 뒤 갑오개혁에서',
    from: 'act:gapsin', to: 'year:1894',
  },
  {
    where: '오십만 원을',
    note: '제물포 조약 배상금을 나누어 무는 기간이다 — 두 해 사이의 간격이 아니다',
    kind: 'duration',
  },
  {
    where: '해마다 10만 원씩',
    note: '같은 배상금 조항의 원문. 역시 기간이다',
    kind: 'duration',
  },
  {
    where: '같은 나라를 두고 두 문서가',
    note: '강화도 조약(1876)과 조청상민수륙무역장정(1882) 사이',
    from: 'year:1876', to: 'act:imo',
  },
  {
    where: '기억으로 쓴 글이어서',
    note: '갑신정변(1884)과 『갑신일록』을 쓴 해(1885) 사이',
    from: 'act:gapsin', to: 'year:1885',
  },
  {
    where: '신미양요의 구실이 된다',
    note: '제너럴 셔먼호(1866)에서 신미양요(1871)까지',
    from: 'year:1866', to: 'year:1871',
  },
  {
    where: '바로 그 군대가 궁 안으로',
    note: '제물포 조약(1882)에서 갑신정변(1884)까지',
    from: 'act:imo', to: 'act:gapsin',
  },
  {
    where: '강화도 조약 제1관은',
    note: '강화도 조약(1876)에서 조청상민수륙무역장정(1882)까지',
    from: 'year:1876', to: 'act:imo',
  },
  {
    where: '열 해였습니다',
    note: '3막 계유상소 — 대원군이 나랏일을 맡은 해(1막 1863)에서 물러나는 해(1873)까지',
    from: 'act:enthronement', to: 'act:chinjeong',
  },
  {
    where: '정변을 일으키기',
    note: '김옥균이 그 말을 했다는 해(1883)에서 정변(1884)까지',
    from: 'year:1883', to: 'act:gapsin',
  },
]

function yearOfBeat(id) {
  for (const a of ACTS) {
    for (const b of beatsOf(a)) {
      if (b.id !== id) continue
      if (typeof b.year === 'number') return b.year
      const label = `${b.dateLabel ?? ''} ${b.title ?? ''}`
      const m = /\b(1[6-9]\d\d)\b/.exec(label)
      if (m) return Number(m[1])
      return null
    }
  }
  return null
}

function resolveYear(ref) {
  const [kind, value] = String(ref).split(':')
  if (kind === 'act') return actById(value)?.year ?? null
  if (kind === 'beat') return yearOfBeat(value)
  if (kind === 'year') return Number(value)
  return null
}

describe('게임 안의 「N 해」가 기준 연도와 맞는다', () => {
  const found = collectYearCounts()

  it('훑어서 실제로 무언가를 찾는다 — 그물이 헛돌지 않는다', () => {
    expect(found.length).toBeGreaterThan(8)
  })

  it('찾은 「N 해」가 모두 등록되어 있다', () => {
    for (const f of found) {
      const hits = CLAIMS.filter(c => f.text.includes(c.where))
      expect(
        hits.length,
        `등록되지 않은 「${f.word} 해」 — ${f.path}\n  「${f.text}」\n`
        + '  이 자리가 가리키는 두 해를 tests/data/year-counts.test.js 의 CLAIMS 에 적어라.',
      ).toBe(1)
    }
  })

  it('등록된 자리가 모두 데이터에 실제로 있다 — 죽은 등록을 남기지 않는다', () => {
    for (const c of CLAIMS) {
      const hits = found.filter(f => f.text.includes(c.where))
      expect(hits.length, `CLAIMS 의 「${c.where}」가 데이터에서 사라졌다 — 등록을 지워라`)
        .toBeGreaterThan(0)
    }
  })

  it('두 해 사이를 세는 자리는 그 수가 데이터의 해에서 센 값과 같다', () => {
    let checked = 0
    for (const f of found) {
      const claim = CLAIMS.find(c => f.text.includes(c.where))
      if (!claim || claim.kind === 'duration') continue
      const from = resolveYear(claim.from)
      const to = resolveYear(claim.to)
      expect(from, `${claim.where} — from(${claim.from})을 못 찾았다`).toBeTypeOf('number')
      expect(to, `${claim.where} — to(${claim.to})를 못 찾았다`).toBeTypeOf('number')
      expect(
        f.count,
        `${f.path} — 「${f.word} 해」\n  ${claim.note}\n  ${from} → ${to} 는 ${to - from} 해다.`,
      ).toBe(to - from)
      checked++
    }
    expect(checked, '셈하는 자리를 하나도 못 찾았다').toBeGreaterThan(5)
  })

  // 2026-10-06 이야기 점검 — 이 화면은 「그 어전회의에서 나온 당백전이 돌기 시작한 뒤로
  // 이 줄이 조금씩 길어졌다」고 적어, 1882년의 쌀값을 당백전에 이었다. 당백전은 두 해 만에
  // 거두었고, 교과서(p.115)가 1882년 쌀값의 까닭으로 드는 것은 개항 뒤의 쌀 유출이다.
  // 화면의 출처 줄은 처음부터 그렇게 적고 있었다 — 글과 출처가 다른 까닭을 대고 있었다.
  it('4막 종로 화면은 당백전을 「그때도 뛰었다」로만 떠올리고, 지금의 까닭은 조약에 둔다', () => {
    const stop = actById('imo').beats.find(b => b.kind === 'explore' && b.stops)
      ?.stops.find(s => s.id === 'jongno-1882')
    const market = stop.beat.market
    const lines = market.lines.join(String.fromCharCode(10))
    expect(lines).toContain('당백전을 찍어 낸 열여섯 해 전에도')
    expect(lines).toContain('여섯 해 전에 조약을 맺은 뒤로')
    expect(lines).toContain('까닭이 다르다')
    // 당백전에서 오늘의 줄까지를 한 문장으로 잇지 않는다.
    expect(lines).not.toContain('길어졌다')
    expect(lines).not.toContain('그 어전회의')
    // 글이 대는 까닭과 출처가 대는 까닭이 같다.
    expect(market.origin).toContain('쌀 유출')
    expect(market.origin).toContain('p.115')
  })

  // 2026-10-06 — 1막 어전의 김좌근 지문이 「닷새 전」이었다. 경복궁 중건을 정한 것은
  // 즉위 닷새 뒤가 아니라 고종 2년(1865)이다.
  it('경복궁 중건을 논하는 1막 어전은 1865년이다', () => {
    const b = actById('enthronement').beats.find(x => x.id === 'audience')
    expect(b.year).toBe(1865)
    expect(b.dateLabel).toContain('1865')
    const said = b.visitors.flatMap(v => v.lines).join(String.fromCharCode(10))
    expect(said).not.toContain('닷새 전')
    expect(said).toContain('두 해 전')
  })
})
