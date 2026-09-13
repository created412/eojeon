import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ACTS } from '../src/data/acts.js'
import { createState, serialize } from '../src/core/state.js'
import { beatsOf } from '../src/systems/scenario.js'
import { playThrough, reopen, MIRRORED_KINDS } from './helpers/beat-mirror.js'
import { bodyOf } from './helpers/body-of.js'
import { hasCaseLabel } from './helpers/case-labels.js'
import { pressE } from '../src/main.js'
import { PALACES } from '../src/data/palaces.js'
import { isStopDone, pendingStopId, stopsOfAct } from '../src/systems/outing.js'

// ── 1막부터 5막 끝까지 이어달리기 (Task 15) ─────────────────────────────
//
// 지금까지 막들은 따로따로 검증되었다. 학생은 그렇게 하지 않는다 — 1863년 즉위에서
// 1884년 북묘까지 한 번에 지나간다. 그 이어달리기를 아무도 해 본 적이 없었다.
//
// 실기 브라우저로는 확인할 수 없는 환경이라(탭이 hidden 으로 보고되어 rAF 가 안 돈다),
// 여기서는 main.js 의 진행 사슬을 순수 함수로 재현한 거울로 걸어간다
// (tests/helpers/beat-mirror.js — resume-safety.test.js 와 같은 한 벌이다).
// 거울이 실제와 같은 길을 걷는다는 것은 그 파일의 시험들이 dryRun() 과 견주어 지킨다.
//
// 화면·소리·입력은 여기서 보지 않는다. 여기서 보는 것은 「막히는 자리가 있는가」다.

const LAST_BEAT = (act) => beatsOf(act).at(-1).id

// 두 학생. 촉박(C1·C2·C3)을 다 해낸 학생과 다 놓친 학생이다.
// 게임 오버가 없다는 것은 「둘 다 끝까지 간다」로만 증명된다.
const STUDENTS = [
  ['제때 해낸 학생', false],
  ['셋 다 놓친 학생', true],
]

describe('1~5막 이어달리기 — 한 번도 막히지 않고 지나간다', () => {
  for (const [who, caught] of STUDENTS) {
    it(`${who} 가 1막 첫 화면에서 5막 끝까지 간다`, () => {
      const { state, played } = playThrough(createState(), { caught })

      // 다섯 막을 다 지나갔고, 순서가 막 배열 그대로다
      const actsSeen = [...new Set(played.map(p => p.split('/')[0]))]
      expect(actsSeen).toEqual(ACTS.map(a => a.id))

      // 마지막으로 지나간 것이 5막의 마지막 비트다 — 중간에서 멈추지 않았다
      expect(played.at(-1)).toBe(`${ACTS.at(-1).id}/${LAST_BEAT(ACTS.at(-1))}`)
      expect(state.actIndex).toBe(ACTS.length - 1)

      // 막마다 적어도 하나는 지나갔다(조건 비트뿐인 막이 생기면 여기서 운다)
      for (const a of ACTS) {
        expect(played.filter(p => p.startsWith(`${a.id}/`)).length, a.id).toBeGreaterThan(0)
      }
    })
  }

  // 「늦어도 역사가 안 바뀐다」의 이어달리기판. tests/data/branch.test.js 가 막 하나씩
  // 견주는 것을, 여기서는 다섯 막을 통째로 걸어가 견준다.
  it('늦는 학생도 어디에서도 멈추지 않고, 「일어난 일」이 같은 자리에 있다', () => {
    const ok = playThrough(createState(), { caught: false })
    const late = playThrough(createState(), { caught: true })

    const historicalOf = (r) => r.played.filter(p => {
      const [actId, beatId] = p.split('/')
      return beatsOf(ACTS.find(a => a.id === actId)).find(b => b.id === beatId)?.historical === true
    })
    expect(historicalOf(late)).toEqual(historicalOf(ok))

    // 갈리는 것은 「무엇을 아는가」뿐이다 — 끝난 자리의 궁과 조작권은 같다
    expect(late.state.palace).toBe(ok.state.palace)
    expect(late.state.control).toBe(ok.state.control)
    // 그리고 실제로 갈리기는 한다 — 안 갈리면 위 단정들이 아무것도 안 지키는 것이다
    expect(late.played).not.toEqual(ok.played)
  })

  // 하루 칸수 — 어느 막 어느 지점에서도 음수로 내려가지 않는다. 음수가 되면
  // isDusk 가 늘 참이 되어 그 막의 낮이 시작하자마자 밤이 된다.
  it('하루 칸수가 어느 저장 지점에서도 0 밑으로 내려가지 않는다', () => {
    for (const [who, caught] of STUDENTS) {
      const { saves } = playThrough(createState(), { caught })
      for (const s of saves) {
        const st = reopen(s.json)
        expect(st.dayLeft, `${who} · ${s.at}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // 조작권 D — 이 게임은 예전에 「조작권이 떨어진 자리에서 영영 갇히는」 결함이 있었다.
  // 그 자리를 지나서도 이어달리기가 끝까지 간다는 것으로만 「안 갇힌다」가 증명된다.
  it('조작권 D 자리를 지나서도 계속 간다 — 갇히는 자리가 없다', () => {
    const { played } = playThrough(createState(), { caught: true })
    const dBeats = ACTS.flatMap(a => beatsOf(a).filter(b => b.control === 'D').map(b => `${a.id}/${b.id}`))
    expect(dBeats.length, '조작권 D 비트가 하나도 없다 — 이 시험이 빈 목록을 돌고 있다').toBeGreaterThan(0)
    for (const id of dBeats) {
      const at = played.indexOf(id)
      expect(at, `${id} 를 지나가지 않았다`).toBeGreaterThanOrEqual(0)
      expect(played.length - 1, `${id} 뒤에서 멈췄다`).toBeGreaterThan(at)
    }
  })
})

// ── 저장하고 이어하기 (2차시 운영) ──────────────────────────────────────
//
// 「3막 중간에 종이 쳤다. 다음 시간에 이어서 한다.」 이것이 실제 운영이다.
// 저장은 runBeats() 가 advance() 뒤에 한 번 한다(CRITICAL 1) — 그 모든 자리에서
// 이어했을 때 무중단 완주와 결과가 같아야 한다.
describe('어느 저장 지점에서 끊어도 이어달리기가 같은 곳에 닿는다', () => {
  for (const [who, caught] of STUDENTS) {
    it(`${who} — 모든 저장 지점에서 이어하면 무중단 완주와 결과가 같다`, () => {
      const full = playThrough(createState(), { caught })
      const points = full.saves.filter(s => !s.at.endsWith('건너뜀'))
      expect(points.length, '저장 지점이 하나도 없다').toBeGreaterThan(30)

      for (const point of points) {
        // 「탭을 닫았다가 다시 열었다」 — 글자로 만들었다가 되읽는다
        const saved = reopen(point.json)
        const resumed = playThrough(saved, { caught, resumed: true })

        expect(resumed.state.actIndex, point.at).toBe(full.state.actIndex)
        expect(resumed.state.palace, point.at).toBe(full.state.palace)
        expect(resumed.state.control, point.at).toBe(full.state.control)
        expect(resumed.state.decisions, point.at).toEqual(full.state.decisions)
        expect(resumed.state.sources, point.at).toEqual(full.state.sources)
        expect(resumed.state.flags, point.at).toEqual(full.state.flags)
        expect(resumed.state.moves, point.at).toEqual(full.state.moves)
        expect(resumed.state.riceIndex, point.at).toBe(full.state.riceIndex)

        // 그리고 이미 끝낸 비트가 다시 돌지 않는다. 나들이처럼 비트 **안**에서 저장된
        // 자리는 그 비트가 아직 안 끝난 것이므로, 그 비트까지는 다시 도는 것이 옳다.
        const done = point.inside
          ? full.played.slice(0, full.played.indexOf(point.inside))
          : full.played.slice(0, full.played.indexOf(point.at) + 1)
        for (const id of done) expect(resumed.played, `${point.at} 뒤에 ${id} 가 다시 돌았다`).not.toContain(id)
      }
    })
  }

  // 위 시험이 헛것이 아님을 보인다 — 저장을 advance() 앞에서 했다면(예전 버그)
  // 이어했을 때 그 비트가 다시 돌아 결정이 두 번 쌓인다.
  it('저장 지점 목록이 실제로 막을 가로지른다 — 한 막에만 몰려 있지 않다', () => {
    const { saves } = playThrough(createState(), { caught: true })
    const acts = new Set(saves.map(s => s.at.split('/')[0]))
    expect([...acts]).toEqual(ACTS.map(a => a.id))
  })

  // 3단계 완주 시나리오가 콕 집어 요구하는 세 자리 — 실제로 저장되는지 이름으로 본다.
  it('학생이 실제로 끊는 세 자리에서 저장된다 — 3막 화재 · 4막 나들이 뒤 · 4막 어전회의', () => {
    const { saves } = playThrough(createState(), { caught: true })
    const at = saves.map(s => s.at)
    expect(at).toContain('chinjeong/great-fire')
    expect(at).toContain('imo/imo-council')
    // 나들이는 비트가 아니라 낮 안의 장면이라 예전에는 이 목록에 아예 없었다 —
    // 「모든 저장 지점을 훑는다」는 이 시험이 나들이 두 자리를 통째로 못 보고 있었다.
    expect(at).toContain('imo/imo-day:jongno-1882 값을 치름')
    expect(at).toContain('imo/imo-day:jongno-1882')
  })

  // ── 나들이 한가운데서 끊긴 세션 ─────────────────────────────────────
  //
  // 학생이 종로·무위영 화면을 보는 동안 F5 를 눌렀다. 해 3칸은 이미 나갔다.
  // 예전에는 그 순간 「다녀왔다」까지 찍혀 있어, 이어하면 그 나들이가 사라지고
  // 겨와 모래(muwiyeong) 카드는 영영 안 들어왔다 — 하루의 절반을 내고 아무것도 못 얻는다.
  it('나들이 값을 치른 직후에 끊어도, 이어하면 그 화면과 카드가 돌아온다', () => {
    const full = playThrough(createState(), { caught: true })
    const paid = full.saves.find(s => s.at.endsWith('값을 치름'))
    expect(paid, '나들이 값을 치른 저장 지점이 없다 — 거울이 나들이를 안 지난다').toBeTruthy()

    const saved = reopen(paid.json)
    // 저장된 그 순간: 값은 나갔고, 카드는 아직 없다
    expect(saved.sources.held).not.toContain('muwiyeong')
    const resumed = playThrough(saved, { caught: true, resumed: true })

    expect(resumed.state.sources, '이어했는데 겨와 모래가 안 들어왔다').toEqual(full.state.sources)
    expect(resumed.state.flags).toEqual(full.state.flags)
    expect(resumed.played.some(p => p.includes('다시 열림')), '그 화면을 다시 열어 주지 않았다').toBe(true)
  })

  it('값을 두 번 내지는 않는다 — 이어해도 해가 다시 줄지 않는다', () => {
    const full = playThrough(createState(), { caught: true })
    const paid = full.saves.find(s => s.at.endsWith('값을 치름'))
    const saved = reopen(paid.json)
    const before = saved.dayLeft
    const resumed = playThrough(saved, { caught: true, resumed: true, pauseAfter: 'imo/imo-day' })
    // 나들이를 다시 열어 준 뒤에도 해는 그대로다(다시 열 때 spend 를 타지 않는다)
    expect(resumed.state.dayLeft).toBeLessThanOrEqual(before)
  })
})

// ── 완주 도중에 터질 자리가 없다 ────────────────────────────────────────
//
// playBeatScreen() 의 switch 는 모르는 종류를 만나면 던진다. 그 순간 이어달리기는
// 그 자리에서 끝난다 — 학생 화면은 멈추고 아무 말도 안 한다. 데이터에 쓰인 종류가
// 전부 배선되어 있는지 소스로 확인한다(거울로는 절대 못 잡는다 — 거울의 default 는
// 조용히 state 를 돌려준다).
describe('완주 도중에 배선이 끊긴 비트 종류가 없다', () => {
  const main = readFileSync(join('src', 'main.js'), 'utf8')

  const usedKinds = () => {
    const used = new Set()
    for (const a of ACTS) {
      for (const b of beatsOf(a)) {
        used.add(b.kind)
        for (const st of b.stops ?? []) used.add(st.beat.kind)
      }
    }
    return used
  }

  it('막에 쓰인 모든 비트 종류가 playBeatScreen 에 배선되어 있다', () => {
    const body = bodyOf(main, 'playBeatScreen')
    for (const kind of usedKinds()) {
      // 따옴표 한 종류만 훑지 않는다(tests/helpers/case-labels.js) —
      // 겹따옴표로 바꿔 적어도 통과하는 검사는 없는 것과 같다
      expect(hasCaseLabel(body, kind), `비트 종류 "${kind}" 가 배선되어 있지 않다`).toBe(true)
    }
  })

  it('거울도 같은 종류를 다 안다 — 두 목록이 어긋나면 이어달리기 시험이 거짓이 된다', () => {
    for (const kind of usedKinds()) {
      expect(MIRRORED_KINDS.has(kind), `비트 종류 "${kind}" 가 거울에 없다`).toBe(true)
    }
  })

  // ── 나들이 한가운데의 이어하기 — 거울이 아니라 소스로 붙든다 ────────────
  //
  // 위 이어달리기 시험은 거울(beat-mirror.js)로 걷는다. 거울과 main.js 가 갈리면
  // 그 시험은 초록불인 채로 아무것도 안 지킨다 — 실제로 이 결함이 그 틈으로 지나갔다.
  // 그래서 main.js 쪽의 순서 자체를 소스에서 확인한다.
  describe('나들이 한가운데서 끊겨도 값만 잃지 않는다', () => {
    // pressE() 는 실제로 불러 본다 — 소스를 훑는 것보다 정확하다.
    it('나들이에 나가는 순간 「치렀다」만 찍힌다 — 화면은 아직 못 봤다', () => {
      const act = ACTS.find(a => stopsOfAct(a).length > 0)
      const stop = stopsOfAct(act)[0]
      const state = { ...createState(), palace: act.palace, control: act.control, dayLeft: 6, room: stop.room }
      const action = pressE({
        dialogOpen: false, exit: null, stops: [stop], room: stop.room,
        palaceDef: PALACES[act.palace], playerX: 0, playerZ: 0, taken: new Set(), state,
      })
      expect(action.type).toBe('stop')
      expect(action.state.dayLeft, '해가 실제로 줄었다').toBeLessThan(state.dayLeft)
      expect(isStopDone(action.state, stop.id), '값을 두 번 내지 않는다').toBe(true)
      expect(pendingStopId(action.state), '화면을 보기 전에는 「아직 못 봤다」가 남아 있어야 한다')
        .toBe(stop.id)
    })

    it('runStop 은 화면을 다 본 뒤에야 「다 봤다」를 찍고 저장한다', () => {
      const body = bodyOf(main, 'runStop')
      const played = body.indexOf('await playBeat(')
      const done = body.indexOf('markStopDone(')
      expect(played, 'runStop 이 playBeat 을 안 부른다').toBeGreaterThan(-1)
      expect(done, 'runStop 이 markStopDone 을 안 부른다').toBeGreaterThan(-1)
      expect(done, '화면을 보기 전에 다녀온 것으로 굳히면 F5 가 값만 가져간다')
        .toBeGreaterThan(played)
    })

    it('이어하기가 밀린 나들이를 그 화면부터 다시 연다', () => {
      expect(bodyOf(main, 'resumeAct')).toContain('resumePendingStop()')
      const body = bodyOf(main, 'resumePendingStop')
      expect(body).toContain('pendingStopId(')
      expect(body).toContain('playBeat(')          // 화면을 다시 연다 — 카드는 playBeat 이 준다
      expect(body).toContain('markStopDone(')      // 다 본 뒤에야 밀린 표시를 지운다
      expect(body, '다시 열면서 값을 또 치르면 안 된다').not.toContain('spend(')
    })
  })

  // 게임 오버 화면은 어디에도 없다(설계 원칙). 실패는 배너 한 줄과 flags 한 칸이다.
  // 주석은 걷어 내고 본다 — main.js 의 주석은 「게임 오버 화면은 없다」라고 적혀 있고,
  // 그 문장까지 잡으면 이 검사는 설명을 지웠다는 이유로 운다.
  it('게임 오버로 완주가 끊기는 길이 없다 — 그런 화면 자체가 없다', () => {
    const code = main.replace(/\/\/[^\r\n]*/g, '')
    expect(code).not.toMatch(/게임\s*오버/)
    expect(serialize(createState())).not.toMatch(/gameOver/)
  })

  // ── 판정 R97 — 비트와 화면 사이에서 값이 새지 않는다 ──────────────────
  //
  // 이 프로젝트가 세 번 밟은 모양이다. 데이터도 옳고 화면 함수도 옳은데, 그 사이에서
  // **view 를 조립하는 자리**가 칸 하나를 흘린다. 그러면 화면 함수의 `?? 기본값` 이
  // 대신 들어와 조용히 다른 것을 보여 준다.
  //   · playMove 의 `note: beat.note ?? (실록 줄)` — note 를 단 비트의 실록 줄이 사라졌다
  //   · playBrush 가 noteWhileWriting·originWhileWriting 을 안 넘겼다 — 붓을 대기도 전에
  //     『갑신일록』·김옥균·망명·논쟁이 떴다(판정 R97)
  //
  // 그래서 조립하는 자리마다 **그 화면이 실제로 읽는 칸을 다 채우는지** 소스로 맞춘다.
  // 비트를 통째로 펴는 자리(`...`)는 흘릴 칸 자체가 없으므로 통과시킨다.
  describe('화면에 넘기는 view 가 그 화면이 읽는 칸을 다 채운다 (판정 R97)', () => {
    const SITES = [
      { fn: 'playMove', call: 'moveScreen.show', module: 'move-screen.js' },
      { fn: 'playDispatch', call: 'dispatchMap.show', module: 'dispatch-map.js' },
      { fn: 'playPlunder', call: 'lossScreen.show', module: 'loss-screen.js' },
      { fn: 'playSalvage', call: 'salvage.open', module: 'salvage.js' },
      { fn: 'playBrush', call: 'brush.open', module: 'brush.js' },
      // 막 끝 화면 — 손으로 칸을 고르는 자리인데 검사 밖에 있었다. 그래서
      // view.lost 가 아무도 안 채우는 죽은 칸으로 남아 있었다(지웠다).
      // next·last 는 화면이 스스로 기본값을 쥔다 — 「일부러 안 넘긴다」를 여기에
      // 적어 두게 한다. 적히지 않은 칸이 빠지면 아래 검사가 운다.
      { fn: 'showActEnd', call: 'actEnd.show', module: 'act-end.js', optional: ['next', 'last'] },
    ]

    // 호출 자리의 객체 리터럴을 중괄호로 세어 통째로 떼어 낸다
    function literalAt(body, call) {
      const at = body.indexOf(`${call}({`)
      if (at < 0) throw new Error(`${call}({ … }) 호출을 못 찾았다`)
      const open = body.indexOf('{', at + call.length)
      let depth = 0
      for (let i = open; i < body.length; i++) {
        if (body[i] === '{') depth++
        else if (body[i] === '}' && --depth === 0) return body.slice(open + 1, i)
      }
      throw new Error(`${call} 의 객체가 안 닫혔다`)
    }

    // 깊이 1의 쉼표로 갈라 키 이름만 모은다. `a: b` 도 `a,`(축약)도 잡는다.
    function keysOf(literal) {
      const keys = new Set()
      let depth = 0
      let piece = ''
      const take = (t) => {
        const s = t.replace(/\/\/[^\r\n]*/g, '').trim()
        if (!s) return
        if (s.startsWith('...')) { keys.add('...'); return }
        const m = /^([A-Za-z_$][\w$]*)\s*(:|$)/.exec(s)
        if (m) keys.add(m[1])
      }
      for (const ch of literal) {
        if ('{[('.includes(ch)) depth++
        else if ('}])'.includes(ch)) depth--
        if (ch === ',' && depth === 0) { take(piece); piece = ''; continue }
        piece += ch
      }
      take(piece)
      return keys
    }

    for (const site of SITES) {
      it(`${site.fn} → ${site.module} — 읽는 칸을 하나도 안 빠뜨린다`, () => {
        const reads = new Set(
          [...readFileSync(join('src', 'ui', site.module), 'utf8').matchAll(/\bview\.([A-Za-z_$][\w$]*)/g)]
            .map(m => m[1]))
        expect(reads.size, `${site.module} 이 view 에서 읽는 칸을 하나도 못 찾았다`).toBeGreaterThan(0)

        // 「일부러 안 넘긴다」고 적어 둔 칸이 정말 그 화면이 읽는 칸인지 먼저 본다 —
        // 죽은 등록을 남기면 다음번에 진짜로 빠진 칸이 그 뒤에 숨는다.
        const optional = site.optional ?? []
        for (const k of optional) {
          expect(reads.has(k), `${site.fn} 의 optional '${k}' 를 ${site.module} 이 안 읽는다`).toBe(true)
        }

        const keys = keysOf(literalAt(bodyOf(main, site.fn), site.call))
        if (keys.has('...')) return   // 통째로 편다 — 흘릴 칸이 없다

        const missing = [...reads].filter(k => !keys.has(k) && !optional.includes(k))
        expect(missing, `${site.fn} 이 ${site.module} 가 읽는 칸을 빠뜨린다`).toEqual([])
      })
    }
  })
})
