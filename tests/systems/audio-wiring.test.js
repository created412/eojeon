import { describe, it, expect } from 'vitest'
import { bodyOf } from '../helpers/body-of.js'
import { caseLabels } from '../helpers/case-labels.js'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ONE_SHOTS, AMBIENCES } from '../../src/systems/audio.js'
import {
  ambientForBeat, councilSound, palaceDoor,
  pressE, pickUpPacket, describeDecision, buildRecordText,
} from '../../src/main.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'
import { PALACES } from '../../src/data/palaces.js'
import { createState } from '../../src/core/state.js'

// 소리 엔진은 Task A~C 가 다 만들어 두었지만 아무도 부르지 않았다. 이 파일은
// 「배선이 실제로 붙어 있는가」를 붙든다.
//
// vitest 환경이 node 라 boot() 의 DOM 경로를 돌릴 수 없다. 그래서 문자열 검사와
// 순수 함수 검사를 섞어 쓴다 — tests/systems/grant.test.js·tests/ui/class-namespace.test.js
// 와 같은 방식이다.
//
// 이 파일이 막으려는 것은 하나다: **소리 이름 오타**. 오타가 나도 예외 하나 안 나고
// 그냥 조용한 무음이 된다 — 실기로 들어 보기 전에는 아무도 모른다.

const ROOT = process.cwd()

// 주석은 뺀다 — 왜 이렇게 되어 있는지 적은 줄이 검사에 걸리면 검사가 글을 깎는다.
function stripComments(src) {
  return src.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')
}

function readSrc(...parts) {
  return stripComments(readFileSync(join(ROOT, 'src', ...parts), 'utf8'))
}

// src 아래 모든 .js — 배선이 나중에 다른 파일로 옮겨 가도 이름 대조가 따라간다.
function allSrcFiles(dir = join(ROOT, 'src'), out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) allSrcFiles(p, out)
    else if (name.endsWith('.js')) out.push(p)
  }
  return out
}

// 소리 엔진 자신(이름 표를 정의하는 쪽)은 대조 대상이 아니다.
const ENGINE_FILES = new Set(['audio.js', 'web-audio-engine.js'])

function wiredNames(re) {
  const found = new Map()   // 이름 -> 그 이름을 쓴 파일들
  for (const file of allSrcFiles()) {
    const base = file.split(/[\\/]/).pop()
    if (ENGINE_FILES.has(base)) continue
    const src = stripComments(readFileSync(file, 'utf8'))
    for (const m of src.matchAll(re)) {
      if (!found.has(m[1])) found.set(m[1], [])
      found.get(m[1]).push(base)
    }
  }
  return found
}

const main = readSrc('main.js')
const scene = readSrc('render', 'scene.js')


// callee( ... ) 의 인자를 깊이 0 의 쉼표로 가른다.
function argsOf(src, callee) {
  const i = src.indexOf(`${callee}(`)
  if (i < 0) throw new Error(`${callee}( 를 못 찾았다`)
  const start = i + callee.length + 1
  const args = []
  let cur = ''
  let depth = 0
  for (let j = start; j < src.length; j++) {
    const ch = src[j]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' && depth === 0) { args.push(cur.trim()); return args }
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (ch === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  throw new Error(`${callee}( 의 닫는 괄호를 못 찾았다`)
}

// ── 1. 이름 대조 — 오타 하나가 조용한 무음이 된다 ────────────────────

describe('소리 이름은 엔진이 아는 이름이어야 한다', () => {
  // 따옴표 세 종류를 다 받는다 — 홑따옴표만 훑으면 audio.play("opne") 같은 오타가
  // 대조에 아예 안 걸리고, 그 이름이 다른 자리에서 옳게 불리고 있으면 아래
  // 「여덟 소리가 모두 불린다」도 안 운다. 조용한 무음이 그대로 통과한다(소리 리뷰 Minor 2).
  const shots = wiredNames(/\.play\(\s*['"`]([^'"`]*)['"`]/g)
  const beds = wiredNames(/setAmbient\(\s*['"`]([^'"`]*)['"`]/g)
  // 리터럴이 아닌 배선 — 순수 함수가 이름을 고르는 자리다. ambientForBeat 와 같은 취급.
  const chosen = ['frozen', 'ganghwa-open'].map(councilSound)

  it('play() 에 넘기는 이름이 전부 ONE_SHOTS 안에 있다', () => {
    for (const [name, files] of shots) {
      expect(ONE_SHOTS, `${files.join(', ')} 가 부르는 '${name}' 은 엔진이 모르는 소리다`)
        .toContain(name)
    }
  })

  it("setAmbient() 에 넘기는 이름이 전부 AMBIENCES 안에 있다", () => {
    for (const [name, files] of beds) {
      expect(AMBIENCES, `${files.join(', ')} 가 까는 '${name}' 은 엔진이 모르는 바닥이다`)
        .toContain(name)
    }
  })

  // 이름이 전부 맞다는 것만으로는 모자라다 — 배선을 통째로 지워도 통과한다.
  // 리터럴로 배선되는 여덟 가지는 실제로 어딘가에서 불리고 있어야 한다.
  // step·tick·alarm 은 리터럴이 아니다: stepped()·countdown() 이 엔진 안에서 고른다.
  it('리터럴로 배선되는 여덟 소리가 모두 실제로 불린다', () => {
    const expected = ONE_SHOTS.filter(n => !['step', 'tick', 'alarm'].includes(n))
    const called = [...shots.keys(), ...chosen]
    for (const name of expected) {
      expect(called, `'${name}' 을 부르는 자리가 src 어디에도 없다`).toContain(name)
    }
  })

  it('순수 함수가 고르는 이름도 엔진이 아는 이름이다', () => {
    for (const name of chosen) expect(ONE_SHOTS, `councilSound 가 '${name}' 을 고른다`).toContain(name)
  })

  it('step · tick · alarm 은 손으로 부르지 않는다 — 엔진이 시간으로 고른다', () => {
    for (const name of ['step', 'tick', 'alarm']) {
      expect([...shots.keys()], `'${name}' 을 직접 play() 하고 있다`).not.toContain(name)
    }
  })
})

// ── 2. 바닥 소리 — 화면·방 단위로만, 이름은 표에 있는 것만 ────────────

// 나들이가 재생하는 beat.stops[].beat 도 runStop() → playBeat() → playBeatScreen() 을
// 거쳐 똑같이 ambientForBeat 를 통과한다. 최상위 비트만 훑으면 그 비트들이 검사 밖에
// 남는다 — 「ACTS 의 모든 비트」라는 말이 실제보다 넓었던 자리다(소리 리뷰 Minor 3).
function allBeatsOf(act) {
  const out = []
  for (const b of beatsOf(act)) {
    out.push(b)
    for (const s of b.stops ?? []) if (s.beat) out.push(s.beat)
  }
  return out
}

describe('ambientForBeat — 어느 화면에 무엇을 깔 것인가', () => {
  const beats = ACTS.flatMap(allBeatsOf)

  it('나들이 속 비트도 훑기 안에 들어 있다 — 그 비트들도 같은 함수를 지난다', () => {
    const nested = ACTS.flatMap(a => beatsOf(a)).flatMap(b => (b.stops ?? []).map(s => s.beat)).filter(Boolean)
    expect(nested.length).toBeGreaterThan(0)
    for (const b of nested) expect(beats, `나들이 비트 ${b.id}`).toContain(b)
  })

  it('실제 비트 전부에 대해 표에 있는 이름이나 null 만 돌려준다', () => {
    for (const b of beats) {
      const bed = ambientForBeat(b)
      if (bed === null) continue
      expect(AMBIENCES, `비트 ${b.id} 가 '${bed}' 를 깐다 — 엔진이 모르는 이름이다`).toContain(bed)
    }
  })

  it('궁을 걸어 다니는 비트에는 hall 을 깐다', () => {
    expect(ambientForBeat({ kind: 'explore' })).toBe('hall')
  })

  it('불이 붙는 촉박에는 fire, 그 밖의 촉박에는 siege 를 깐다', () => {
    expect(ambientForBeat({ kind: 'rush', fire: true })).toBe('fire')
    expect(ambientForBeat({ kind: 'rush', fire: false })).toBe('siege')
  })

  it('밤 화면에는 night 를 깐다', () => {
    expect(ambientForBeat({ kind: 'escape' })).toBe('night')
  })

  // 「모르는 종류라서 null」이 조용히 지나가면 안 된다. 조작권 D 장면(kind:'hold')이
  // 정확히 그렇게 새어 나갔다 — ambientForBeat 가 그 종류를 몰라 null 을 돌려주고,
  // playBeatScreen() 이 스위치보다 먼저 setAmbient(null) 을 불러 장면에 들어서는 순간
  // 바닥 소리가 꺼졌다. 「안 움직인다 + 아무것도 안 변한다 + 무음」이 겹치면 학생이
  // 받는 신호는 「고장났다」가 된다 — 화면이 글로 「고장이 아니다」라고 말하는데
  // 소리가 정반대를 말한다. 그래서 종류를 전수로 훑고, null 도 「의도한 null」임을
  // 여기 손으로 적게 한다(Task 12 리뷰 Important 1).
  const EXPECTED_BED = {
    explore: 'hall',      // 궁을 걸어 다닌다
    audience: 'hall',     // 알현 — 임금은 못 움직여도 궁은 살아 있다('hold' 와 같은 이유)
    procession: 'hall',   // 행렬 — 궁 안을 걸어 나간다
    rush: 'siege',        // 불이 붙는 촉박은 fire — 아래에서 따로 본다
    escape: 'night',      // 밤 화면
    hold: 'hall',         // 조작권 D — 궁은 그대로 살아 있는데 임금만 못 움직인다
    note: null,           // 글 화면
    council: null,        // 어전회의
    orders: null,         // 훈령
    move: null,           // 이어(移御)
    dispatch: null,       // 장계
    plunder: null,        // 약탈
    salvage: null,        // 소실
    brush: null,          // 친필 — 붓소리 말고는 조용한 것이 맞다
    outing: null,         // 나들이(회수 화면)
    edict: null,          // 국상
  }

  it('게임이 재생하는 모든 비트 종류가 이 표에 적혀 있다 — 새 종류가 조용히 새지 않는다', () => {
    // 따옴표 세 종류·대문자·숫자를 다 받는 한 벌로 뽑는다(tests/helpers/case-labels.js).
    // 예전에는 홑따옴표·소문자만 보는 정규식이라, 겹따옴표로 적힌 종류 하나가 이 목록에서
    // 조용히 빠지면 「바닥 소리를 아무도 안 정했다」가 그대로 초록불을 받았다.
    const kinds = caseLabels(bodyOf(main, 'playBeatScreen'))
    expect(kinds.length).toBeGreaterThan(10)
    for (const kind of kinds) {
      expect(Object.keys(EXPECTED_BED), `비트 종류 '${kind}' 의 바닥 소리를 아무도 안 정했다`)
        .toContain(kind)
    }
  })

  it('종류마다 무엇을 까는지 전수로 맞는다 — null 도 정해 둔 null 이다', () => {
    for (const [kind, bed] of Object.entries(EXPECTED_BED)) {
      expect(ambientForBeat({ kind }), kind).toBe(bed)
    }
  })

  it('조작권 D 장면은 무음이 아니다 — 궁은 그대로 살아 있다', () => {
    expect(ambientForBeat({ kind: 'hold' })).not.toBe(null)
    expect(AMBIENCES).toContain(ambientForBeat({ kind: 'hold' }))
  })

  it('글·문서·회의 화면에는 아무것도 깔지 않는다', () => {
    for (const kind of ['note', 'council', 'orders', 'move', 'dispatch', 'plunder', 'salvage', 'brush', 'outing', 'edict']) {
      expect(ambientForBeat({ kind }), kind).toBe(null)
    }
    expect(ambientForBeat(null)).toBe(null)
  })

  // 표의 네 바닥이 이 게임 안에서 실제로 한 번씩은 깔린다 — 이름만 맞고 아무 데도
  // 안 붙은 바닥이 없게 한다.
  it('네 바닥이 모두 실제 비트에서 한 번씩은 깔린다', () => {
    const used = new Set(beats.map(ambientForBeat).filter(Boolean))
    for (const bed of AMBIENCES) expect([...used], `'${bed}' 를 까는 비트가 없다`).toContain(bed)
  })

  it('setAmbient 를 매 프레임 부르지 않는다 — frame() 몸통에는 없다', () => {
    expect(bodyOf(main, 'frame')).not.toContain('setAmbient')
  })
})

// ── 3. 발소리 — updateKingMotion 몸통 안에서, 프레임이 아니라 시간으로 ──

describe('발소리는 updateKingMotion 이 낸다', () => {
  it('stepped() 를 부르는 자리가 updateKingMotion 몸통 안이다', () => {
    expect(bodyOf(scene, 'updateKingMotion')).toContain('stepped(')
  })

  it('scene.js 에서 stepped() 를 부르는 자리는 하나뿐이다', () => {
    expect(scene.match(/stepped\(/g) ?? []).toHaveLength(1)
  })

  it('걷는지 아닌지(walking)를 그대로 넘긴다', () => {
    expect(bodyOf(scene, 'updateKingMotion')).toMatch(/stepped\([^)]*walking/)
  })

  it('달리는지(running)도 함께 넘긴다 — 안 넘기면 달려도 발이 미끄러진다', () => {
    expect(bodyOf(scene, 'updateKingMotion')).toMatch(/stepped\([^)]*running/)
  })

  it('달리는지를 씬이 스스로 짐작하지 않고 밖에서 받는다', () => {
    // createScene 의 옵션으로 들어와야 한다. 씬이 속도를 재서 짐작하면
    // 고정 스텝 누적기 때문에 프레임마다 켜졌다 꺼졌다 한다.
    expect(scene).toMatch(/createScene\s*\([^)]*running/)
    // main.js 가 실제로 input 의 답을 물려 준다
    expect(main).toMatch(/running:\s*\(\)\s*=>\s*input\.running\(\)/)
  })

  it('발소리 간격을 scene.js 가 스스로 세지 않는다', () => {
    // 16진 색값 안의 숫자에 걸리면 안 된다 — 실제로 0x223040 이라는 색이
    // '230' 을 품고 있어서 이 검사가 거짓으로 울었다. 숫자로 홀로 선 것만 본다.
    const bare = scene.replace(/0x[0-9a-fA-F]+/g, '')
    expect(bare, '발소리 간격 340 을 씬이 스스로 들고 있다').not.toMatch(/340/)
    expect(bare, '달릴 때 간격 230 을 씬이 스스로 들고 있다').not.toMatch(/230/)
    expect(scene).not.toContain('STEP_INTERVAL')
  })
})

// ── 4. 카운트다운 — 같은 시계에서 나온 now ────────────────────────────

describe('초침은 남은 시간과 같은 시계를 본다', () => {
  it('main.js 가 remainingMs() 를 정확히 한 번 부른다', () => {
    expect(main.match(/remainingMs\(/g) ?? []).toHaveLength(1)
  })

  it('countdown() 의 now 가 remainingMs() 에 넘긴 바로 그 변수다', () => {
    const remainArgs = argsOf(main, 'remainingMs')
    const cdArgs = argsOf(main, 'audio.countdown')
    expect(cdArgs).toHaveLength(3)
    expect(cdArgs[2], '초침이 다른 시계를 본다 — 초가 빠진다').toBe(remainArgs[1])
  })

  it('countdown() 의 totalMs 가 그 촉박의 totalMs 다', () => {
    const cdArgs = argsOf(main, 'audio.countdown')
    expect(cdArgs[1]).toContain('totalMs')
  })

  it('초침 간격을 main.js 가 스스로 세지 않는다', () => {
    expect(main).not.toContain('ALARM_THRESHOLD')
    expect(main).not.toMatch(/tickAt|lastTick|tickFrames|stepFrames|frameCount/)
  })
})

// ── 4.5 소리가 화면과 반대를 말하지 않는다 (판정 R95) ─────────────────

// 편경(decide)은 이 게임에서 「결정이 무게 있게 내려앉았다」를 뜻하는 소리다.
// 4막의 얼어붙은 회의는 아무것도 결정되지 않는다는 것이 그 장면의 내용이다 —
// 거기서 같은 소리가 나면 소리가 화면과 정반대를 말한다. 학생은 글보다 소리를
// 먼저 몸으로 받는다.
describe('얼어붙은 회의에서는 편경이 울리지 않는다', () => {
  it('무엇을 정했으면 편경이 운다', () => {
    expect(councilSound('ganghwa-open')).toBe('decide')
    expect(councilSound('reject')).toBe('decide')
  })

  it("아무것도 정하지 못했으면(frozen) 편경 대신 「안 된다」의 소리다", () => {
    expect(councilSound('frozen')).toBe('deny')
  })

  it('실제 4막 데이터의 얼어붙은 회의가 그 길로 들어간다', () => {
    // council-ui.js 가 그 회의에서 부르는 것은 onDecide('frozen', reason) 이다.
    const frozen = ACTS.flatMap(a => beatsOf(a)).find(b => b.kind === 'council' && b.frozen === true)
    expect(frozen, '얼어붙은 회의가 데이터에 없다').toBeTruthy()
    expect(councilSound('frozen')).not.toBe('decide')
  })

  // 따옴표 한 종류만 훑지 않는다 — 겹따옴표나 백틱으로 바꿔 적으면 그대로 통과해
  // 버리는 검사는 없는 것과 같다. 얼어붙은 회의에서 편경이 울리는 것은 소리가
  // 화면과 정반대를 말하는 자리이므로(판정 R95), 세 따옴표를 다 본다.
  it('회의가 내는 소리를 이 함수 하나가 정한다 — 편경을 조건 없이 내는 자리가 없다', () => {
    const body = bodyOf(main, 'playCouncil')
    expect(body).not.toMatch(/audio\.play\(\s*['"`]decide['"`]\s*\)/)
    expect(body).toMatch(/audio\.play\(\s*councilSound\(/)
  })
})

// ── 4.6 문소리는 궁이 달라질 때, 그 화면 뒤에 (소리 리뷰 Minor 5·6) ────

describe('문소리를 언제 낼 것인가', () => {
  it('첫 궁에는 내지 않는다 — 1막이 시작하기도 전에 쿵 하던 자리', () => {
    expect(palaceDoor('gyeongbok', null)).toEqual({ play: false, lastPalace: 'gyeongbok' })
  })

  it('같은 궁에 다시 서면 내지 않는다 — 막이 바뀌어도 궁이 그대로면 문을 지난 게 아니다', () => {
    expect(palaceDoor('gyeongbok', 'gyeongbok')).toEqual({ play: false, lastPalace: 'gyeongbok' })
  })

  it('궁이 실제로 달라졌을 때만 낸다', () => {
    expect(palaceDoor('changdeok', 'gyeongbok')).toEqual({ play: true, lastPalace: 'changdeok' })
  })

  // 이어(移御)는 「어디서 → 어디로」 화면이 먼저다. 씬은 화면 뒤에서 갈아 끼우되
  // 문소리는 그 화면이 닫힌 뒤에 낸다 — 소리가 화면을 앞지르지 않는다.
  it('이어에서는 화면이 닫힌 뒤에 딱 한 번 난다', () => {
    let last = 'gyeongbok'
    const heard = []
    const ring = (palace, quiet) => {
      const d = palaceDoor(palace, last, quiet)
      last = d.lastPalace
      if (d.play) heard.push(palace)
    }
    ring('changdeok', true)    // runBeats 가 화면 전에 씬만 갈아 끼운다 — 조용히
    expect(heard).toEqual([])
    ring('changdeok', false)   // 화면이 닫힌 뒤 playMove() 가 다시 부른다
    expect(heard).toEqual(['changdeok'])
    ring('changdeok', false)   // 그 뒤로는 같은 궁이라 다시 나지 않는다
    expect(heard).toEqual(['changdeok'])
  })

  it('이어 비트에서만 미룬다 — 그 배선이 실제로 붙어 있다', () => {
    expect(main).toMatch(/bindPalaceAndSpawn\(beat\.kind === 'move'\)/)
  })

  it('문소리를 내는 자리가 palaceDoor 의 답을 본다', () => {
    const bind = bodyOf(main, 'bindPalaceAndSpawn')
    expect(bind).toMatch(/palaceDoor\(/)
    expect(bind).toMatch(/audio\.play\('door'\)/)
  })
})

// ── 4.7 닫히는 소리가 태블릿에서도 난다 (소리 리뷰 Important 1) ────────

// .veil 은 z-index 40, 태블릿의 E·Q 단추는 22 다 — 문서가 떠 있는 동안 그 단추는
// 문서 판 아래에 깔려 눌리지 않는다. 그래서 태블릿 학생이 문서를 닫는 길은 화면 안
// 「닫기」 단추 하나뿐인데, 그 길에는 소리가 없었다. open 은 나고 close 는 영영 안 났다.
describe('문서를 어떻게 닫든 닫히는 소리가 한 번 난다', () => {
  const dialogSrc = readSrc('ui', 'dialog.js')

  it('createDialog 가 닫힘 알림을 인자로 받는다 — 화면은 소리를 모른다', () => {
    expect(dialogSrc).toMatch(/export function createDialog\s*\(\s*root\s*,\s*\{[^}]*onClose/)
  })

  it('close() 가 그 알림을 부른다 — 단추로 닫든 E 로 닫든 여기를 지난다', () => {
    expect(bodyOf(dialogSrc, 'close')).toMatch(/onAnyClose\?\.\(\)/)
  })

  it('화면 안 「닫기」 단추가 close() 를 지난다', () => {
    expect(bodyOf(dialogSrc, 'open')).toMatch(/'\.close'\)\.addEventListener\('click', \(\) => close\(\)\)/)
  })

  it('main.js 가 그 자리에 닫는 소리를 매단다', () => {
    expect(main).toMatch(/createDialog\(root,\s*\{\s*onClose:\s*\(\) => audio\.play\('close'\)/)
  })

  it('E·Q 쪽에서 같은 소리를 두 번 내지 않는다', () => {
    expect(main, "dialog.close() 바로 앞에 audio.play('close') 가 또 있다")
      .not.toMatch(/audio\.play\('close'\)[;\s]*dialog\.close\(\)/)
  })
})

// ── 5. 소리는 게임 판단을 바꾸지 않는다 ────────────────────────────────

// ── 4.8 실패에는 「안 된다」의 소리 — 표의 빈 칸 하나 (소리 리뷰 Minor 1) ─

// 브리프의 표는 「실패(no-time · 이미 주움)에는 deny」라고 적었는데, 이미 주운 자리는
// pressE() 가 「아무것도 없는 자리에서 E」와 똑같은 값을 돌려주어 조용히 떨어졌다.
// 그대로 deny 를 붙이면 빈 마당에서 E 를 누를 때마다 울므로, 두 경우를 갈랐다.
describe('이미 주운 문서에 E — 「안 된다」가 귀에 닿는다', () => {
  it('아무것도 없는 자리는 여전히 조용하다', () => {
    const state = createState()
    const action = pressE({
      dialogOpen: false, exit: null, room: null, palaceDef: PALACES.gyeongbok,
      playerX: 9999, playerZ: 9999, taken: new Set(), state,
    })
    expect(action.type).toBe('none')
  })

  // 이제 게임 안의 모든 문서에는 그것을 들고 있는 사람이 있어서(신하가 건네는 카드는
  // pressE 의 바닥 판정을 아예 안 탄다) 실제 데이터로는 이 자리에 닿을 수 없다.
  // 그래도 판정 자체는 살아 있어야 한다 — 임자 없는 지점이 다시 생기는 날을 위해서다.
  // 그래서 데이터가 아니라 **가짜 궁 하나**로 함수를 직접 구동한다.
  it('이미 주운 문서 위에서는 다른 값이 나온다 — 그래야 소리를 가를 수 있다', () => {
    const fake = {
      id: 'fake', name: '가짜궁', councilRoom: 'jeongdang',
      ground: { w: 40, d: 40 }, spawn: { x: 0, z: 0 },
      rooms: [{ id: 'jeongdang', name: '정당', x: 0, z: 0, w: 12, d: 12, minControl: 'D' }],
      pickups: [{ cardId: 'wonnapjeon', placeId: 'jeongdang', x: 0, z: 0 }],
    }
    const action = pressE({
      dialogOpen: false, exit: null, room: null, palaceDef: fake,
      playerX: 0, playerZ: 0, taken: new Set(['wonnapjeon']), state: createState(),
    })
    expect(action.type).toBe('already-taken')
  })

  it('그 값에 deny 가 배선돼 있다', () => {
    expect(bodyOf(main, 'onPressE')).toMatch(/'already-taken':\s*audio\.play\('deny'\)/)
  })
})

describe('소리를 꺼도 게임 판단이 한 글자도 달라지지 않는다', () => {
  it('순수 판단 함수에 audio 가 들어가지 않는다', () => {
    for (const fn of [pressE, pickUpPacket, describeDecision, buildRecordText, ambientForBeat,
      councilSound, palaceDoor]) {
      expect(String(fn), `${fn.name} 안에 audio 가 있다`).not.toMatch(/audio/)
    }
  })

  it('play() 의 값을 게임이 되받아 쓰지 않는다', () => {
    expect(main).not.toMatch(/=\s*audio\.play\(/)
    expect(scene).not.toMatch(/=\s*audio\.(play|stepped)\(/)
  })
})
