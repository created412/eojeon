// 「이 막의 여정」 — 막의 지도를 막 자신의 비트에서 뽑아낸다.
//
// 2026-09-27 선생님, 막 첫머리의 안내 화면을 보시고:
//
//     「이렇게 **글로만** 있으니까 **1막이 어떤 구성이고 어떻게 진행해야 하는지 안 보여.**」
//
// 그 화면(data/guide.js 의 ACT_GUIDE)은 여덟 문단의 산문이었다. 게임이 무엇인지는
// 잘 말했지만 **이 막**이 무엇인지는 말하지 않았다. 학생이 볼 수 없던 것은 셋이다 —
// 이 막이 몇 걸음인가, 각 걸음이 어떤 종류인가(걷기·듣기·손으로 하기·읽기),
// 그리고 지금 자기가 그중 어디쯤인가.
//
// ── 왜 산문을 고쳐 쓰지 않고 비트에서 뽑는가 ─────────────────────────────
// 손으로 적은 안내는 반드시 어긋난다. 이 저장소의 막들은 지난 2주 동안 비트가
// 늘고 줄고 순서가 바뀌었는데(5막은 21비트다), ACT_GUIDE 의 세 줄은 한 번도 따라
// 바뀌지 않았다 — 2막 안내는 아직 「끝에는 척화비에 새길 비문을 직접 써 본다」로
// 끝나지만 그 뒤에는 막을 닫는 글 한 장이 더 있다. 그러니 지도는 **act.beats 에서
// 자란다.** 비트를 하나 넣으면 지도가 그만큼 자라고, 비트를 지우면 지도에서
// 사라진다. 어긋날 방법이 없다.
//
// ── 몇 걸음으로 묶는가 ───────────────────────────────────────────────
// 비트 그대로는 지도가 아니다(7·17·14·16·21걸음). 한 눈에 들어오는 띠는 네 걸음에서
// 일곱 걸음 사이다. 그 띠에 넣는 방법은 둘이다:
//   ① **같은 종류가 잇달으면 한 걸음으로 접는다.** 글 넉 장을 잇달아 읽는 것은
//      학생에게 네 걸음이 아니라 「읽는 대목」 하나다(요구: note 가 잇달으면 접는다 —
//      그래서 「글을 읽는다」가 두 걸음 나란히 서는 일은 일어나지 않는다).
//   ② 그래도 넘치면 **이웃한 두 걸음을 값이 싼 순서로 합친다.** 걷다가 만나는 것과
//      듣는 것은 한 걸음으로 읽히고(1), 읽는 것과 걷는 것은 덜 그렇다(2).
// 다만 **손으로 하는 걸음은 무엇과도 합치지 않는다.** 선생님이 안 보인다고 하신 것이
// 바로 「어떻게 진행해야 하는지」이고, 그 답은 학생이 실제로 손을 쓰는 자리들이다.
// 그 자리를 다른 걸음에 섞으면 이 파일이 존재할 이유가 없어진다.
//
// 그래서 걸음 수의 **바닥은 데이터가 정한다**: 손으로 하는 비트 수 + 그 사이에 낀
// 토막 수. 4막은 그 바닥이 일곱이라 일곱 걸음으로 남는다(피신·국상·어전회의 셋을
// 손으로 한다). 억지로 여섯에 맞추려면 그 셋 중 하나를 글 속에 묻어야 한다.
//
// 화면은 ui/act-map.js 다. 이 파일은 DOM 을 모른다 — 그래서 다섯 막의 지도를
// 시험이 글자로 읽어 볼 수 있다(tests/systems/act-map.test.js).

// 비트의 kind → 걸음의 무리. acts.js 에 실제로 있는 열일곱 가지를 모두 적는다 —
// 빠뜨리면 groupOf() 가 'read' 로 떨어뜨려 손으로 하는 자리가 글로 보이게 된다.
export const GROUP_OF_KIND = {
  // 읽는다 — 종이에 적힌 것을 눈으로 본다.
  note: 'read',
  dispatch: 'read',      // 장계도 읽는 것이다. 다만 여러 통 중 고를 수 있다(아래 노트가 그것을 말한다).
  plunder: 'read',       // 빼앗긴 목록을 확인하는 화면.
  // 걷는다 — 몸이 움직이는 대목. 스스로 걷는 것(explore)과 실려 가는 것(procession·move)이
  // 한 무리인 것이 이상해 보일 수 있으나, 학생의 눈에는 「장소가 바뀐다」 한 가지다.
  explore: 'walk',
  procession: 'walk',
  move: 'walk',
  rush: 'walk',          // 시간 안에 달아나는 대목. 손을 쓰지만 쓰는 것은 걸음이다.
  hold: 'walk',          // 걸으려 해도 걸어지지 않는 대목 — 그 실패가 장면의 뜻이다.
  alone: 'walk',
  // 듣는다 — 사람이 임금 앞으로 와서 말한다.
  audience: 'listen',
  // 손으로 한다 — 학생이 실제로 무엇을 정하거나 쓰거나 미는 자리. 이 막의 알맹이다.
  council: 'hands',
  funding: 'hands',
  orders: 'hands',
  brush: 'hands',
  edict: 'hands',
  escape: 'hands',
  outing: 'hands',
}

export const GROUP_LABEL = { read: '읽기', walk: '걷기', listen: '듣기', hands: '손으로' }

// 한 걸음 안에 여러 비트가 있을 때, 그 걸음의 이름을 누가 정하는가. 앞에 있는 것이
// 이긴다 — 손으로 하는 것이 가장 세고, 글이 가장 약하다. 「글 두 장 읽고 장계를 읽는」
// 걸음은 「장계를 읽는다」다: 학생이 그 대목에서 할 일은 장계 쪽이다.
const SALIENCE = [
  'funding', 'council', 'orders', 'brush', 'edict', 'escape', 'outing',
  'rush', 'dispatch', 'explore', 'audience', 'move', 'plunder', 'hold', 'alone',
  'procession', 'note',
]
const rank = kind => {
  const i = SALIENCE.indexOf(kind)
  return i < 0 ? SALIENCE.length : i
}

const HANDS = new Set(Object.keys(GROUP_OF_KIND).filter(k => GROUP_OF_KIND[k] === 'hands'))

export const groupOf = beat => GROUP_OF_KIND[beat?.kind] ?? 'read'
export const isHandsKind = kind => HANDS.has(kind)

// 읽히는 띠. 여섯을 목표로 합치고, 데이터가 더 줄지 못하게 하면 거기서 멈춘다
// (4막이 일곱이다). 시험은 4~7 을 잰다.
const TARGET_STEPS = 6

// acts.js 의 제목들은 자간을 손으로 벌려 적혀 있다 — '강 화 도', '경 복 궁 을  다 시
// 짓 는 다'. 화면에서는 그 벌어짐이 뜻이지만(ui/type-css.js §2) 지도의 한 줄 안에서는
// 읽기를 방해한다. 낱자 사이의 **한 칸**만 지우고, **두 칸**은 낱말 경계로 남긴다.
// '1863 겨울, 운현궁' 처럼 원래부터 낱말인 제목은 손대지 않는다(낱자 꼴이 아니므로).
export function tidyTitle(text) {
  const spaced = part => {
    const words = part.split(' ')
    // 「양 요」 처럼 따옴표가 붙어 있어도 알맹이는 한 자다 — 그것까지 낱자로 센다.
    return words.length > 1 && words.every(w => w.replace(/[「」『』·]/g, '').length === 1)
  }
  return String(text ?? '')
    .trim()
    .split(/\s{2,}/)
    .map(part => (spaced(part) ? part.replace(/ /g, '') : part))
    .join(' ')
}

const countOf = (beats, kind) => beats.filter(b => b.kind === kind).length

// 걸음의 이름 — 무엇을 하는 대목인지 **동사**로 말한다. 「설명」이 아니라 「할 일」이다.
//
// 두 꼴을 적는 까닭: 한 걸음에 두 무리가 섞이면(17비트를 여섯 걸음에 넣으면 반드시
// 섞인다) 이름 하나로는 거짓이 된다 — 「장계를 읽는다」라고만 적힌 걸음 안에 신하
// 셋의 보고가 들어 있으면, 학생은 그 보고를 못 보고 들어간다. 그래서 앞 꼴('…읽고')과
// 끝 꼴('…읽는다')을 둘 다 적어 두고 「장계를 읽고 아뢰는 것을 듣는다」로 이어 붙인다.
const VERB = {
  note: ['글을 읽고', '글을 읽는다'],
  dispatch: ['장계를 읽고', '장계를 읽는다'],
  plunder: ['빼앗긴 기록을 확인하고', '빼앗긴 기록을 확인한다'],
  explore: ['걸어 다니며 만나고', '걸어 다니며 만난다'],
  procession: ['행렬을 따라가고', '신하들이 모시고 간다'],
  move: ['거처를 옮기고', '거처를 옮긴다'],
  rush: ['시간 안에 피하고', '시간 안에 피한다'],
  hold: ['움직이지 못하고', '움직일 수 없다'],
  alone: ['혼자 서 있고', '혼자 서 있다'],
  audience: ['아뢰는 것을 듣고', '아뢰는 것을 듣는다'],
  council: ['어전회의에서 정하고', '어전회의에서 정한다'],
  funding: ['경복궁을 짓고', '경복궁을 짓는다'],
  orders: ['훈령을 적고', '훈령을 적어 보낸다'],
  brush: ['붓으로 쓰고', '붓으로 직접 쓴다'],
  edict: ['국상 절차를 살피고', '국상 절차를 살핀다'],
  escape: ['왕비를 피신시키고', '왕비를 피신시킨다'],
  outing: ['궁 밖을 살피고', '궁 밖을 살핀다'],
}

// 한 줄 노트 — 그 걸음에서 **구체적으로** 무엇을 하는가. 막 데이터가 이미 적어 둔
// 말을 그대로 가져온다(회의의 물음·훈령의 물음·장계가 온 곳·글 제목). 여기서 새
// 역사 서술을 쓰지 않는다 — 그것은 acts.js 의 몫이다.
const NOTE = {
  note: (lead, beats) => {
    const n = countOf(beats, 'note')
    // 막을 닫는 글은 acts.js 에서 늘 id 가 'end' 다. 그 제목('2 막 「양 요」 끝')을
    // 그대로 옮기면 지도 위에 따옴표가 겹치고, 학생에게는 아무 말도 아니게 된다.
    const closing = beats.some(b => b.id === 'end')
    const title = tidyTitle(lead.title)
    const what = closing ? '이 막을 닫는 글' : title ? `「${title}」` : '글'
    if (n > 1) return closing ? `글 ${n}장을 읽고 이 막을 닫는다` : `${what}부터 글 ${n}장을 차례로 읽는다`
    return closing ? '이 막을 닫는 글 한 장을 읽는다' : `${what} 한 장을 읽는다`
  },
  dispatch: lead => {
    const where = tidyTitle(lead.title)
    const n = lead.dispatches?.length ?? 0
    const many = n ? `장계 ${n}통` : '올라온 장계'
    return `지도에서 붉은 지명을 눌러 ${where ? `「${where}」의 ` : ''}${many}을 읽고, 결정하러 간다`
  },
  plunder: lead => `「${tidyTitle(lead.title)}」 — 무엇이 실려 나갔는지 확인한다`,
  explore: lead => (lead.free
    ? '가고 싶은 곳으로 걷고, 만난 사람에게 E 를 눌러 말을 건다'
    : '왼쪽 위 「지금의 여정」에서 갈 곳을 고르면 그리로 걸어간다 — 닿으면 E'),
  procession: () => '신하들이 임금을 모시고 간다 — 지켜본다',
  move: (lead, beats) => {
    const n = countOf(beats, 'move')
    if (n > 1) return `임금의 거처가 ${n}번 바뀐다 — 어디서 어디로, 왜 옮기는지 읽는다`
    return lead.cause ? `거처를 옮긴다 — ${lead.cause}` : '어디서 어디로, 왜 옮기는지 읽는다'
  },
  rush: lead => `제한 시간 안에 몸을 피한다(${Math.round((lead.totalMs ?? 0) / 1000)}초) — 화면 아래 붉은 판을 누르면 달아난다`,
  hold: lead => `${lead.view?.title ? `「${tidyTitle(lead.view.title)}」 — ` : ''}움직여 보고, 왜 움직일 수 없는지 읽는다`,
  alone: () => '아무도 없는 마루에 잠시 서 있는다 — 줄이 다 뜨면 걸음이 열린다',
  audience: (lead, beats) => {
    const people = beats.filter(b => b.kind === 'audience')
      .reduce((sum, b) => sum + (b.visitors?.length ?? 1), 0)
    return `신하 ${people}명이 임금 앞에 와서 아뢴다 — 끝까지 듣는다`
  },
  council: lead => (lead.frozen
    ? `어전회의가 열리지만 임금은 말하지 못한다 — ${lead.council?.question ?? ''}`
    : `${lead.council?.question ?? '무엇을 할 것인가'} — 하나를 고르고 그렇게 정한 이유를 쓴다`),
  funding: lead => `${tidyTitle(lead.title)} — 고을에서 걷거나 돈을 찍어 열 채를 올린다`,
  orders: lead => `${lead.question ?? '무엇을 적어 보낼 것인가'} — 조항을 고르고 이유를 쓴다`,
  brush: lead => {
    const n = lead.glyphs?.length ?? 0
    const what = tidyTitle(lead.title)
    return `${what ? `「${what}」에 새길 ` : ''}${n ? `${n}자를 ` : '글자를 '}손가락이나 마우스로 한 자씩 쓴다`
  },
  edict: lead => `${lead.view?.title ? `「${tidyTitle(lead.view.title)}」 — ` : ''}나라의 장례 절차 기록을 한 줄씩 살핀다`,
  escape: lead => `${lead.view?.title ? `「${tidyTitle(lead.view.title)}」 — ` : ''}왕비를 어디로, 누구에게 맡길지 고른다`,
  outing: () => '궁 밖에서 본 것을 살핀다',
}

// 걸음 안에 곁딸린 종류가 있으면 짧은 이름표로 붙인다 — 「걸어 다니며 만난다」
// 걸음에 글 두 장이 함께 들어 있다는 사실이 사라지지 않게. 노트를 길게 늘이는
// 대신 이름표로 세는 것은, 지도가 문단으로 되돌아가지 않게 하려는 것이다.
const TAG = {
  note: n => `글 ${n}장`,
  audience: n => `보고 ${n}`,
  explore: () => '걷기',
  dispatch: n => `장계 ${n}`,
  move: n => (n > 1 ? `이어 ${n}번` : '이어'),
  procession: () => '행렬',
  rush: () => '달아나기',
  hold: () => '멈춤',
  alone: () => '혼자',
  plunder: () => '빼앗김',
}

function tagsOf(beats, leadKind) {
  const seen = new Map()
  for (const b of beats) {
    if (b.kind === leadKind) continue
    seen.set(b.kind, (seen.get(b.kind) ?? 0) + 1)
  }
  const out = []
  for (const [kind, n] of seen) {
    const make = TAG[kind]
    if (make) out.push(make(n))
  }
  return out.slice(0, 3)   // 넷째부터는 이름표가 아니라 목록이 된다
}

// 잇달은 같은 무리를 한 토막으로 접는다. 손으로 하는 비트는 늘 혼자 선다.
function foldRuns(beats) {
  const runs = []
  for (const beat of beats) {
    const group = groupOf(beat)
    const last = runs[runs.length - 1]
    if (last && last.group === group && group !== 'hands') last.beats.push(beat)
    else runs.push({ group, beats: [beat] })
  }
  return runs
}

// 이웃한 두 토막을 합치는 값. 낮을수록 먼저 합친다.
//   · 같은 무리(합치기 뒤에 생길 수 있다)는 0 — 접혀야 할 것이 아직 안 접힌 것이다.
//   · 걷기와 듣기, 읽기와 듣기는 1 — 「걷다가 만나 듣는다」는 한 걸음으로 읽힌다.
//   · 읽기와 걷기는 2 — 장소가 바뀌는 것과 종이를 읽는 것은 학생에게 다른 일이다.
//   · 손으로 하는 것은 ∞ — 무엇과도 합치지 않는다.
// 크기 벌점은 **작은 토막부터** 합치게 한다. 합치는 횟수는 어차피 정해져 있으므로
// (21비트를 여섯 걸음으로 = 일곱 번) 이 벌점이 하는 일은 그 일곱 번을 어디에 쓸지
// 고르는 것뿐이다. 벌점이 낮으면(0.15) 값싼 이웃 한 자리에 계속 붙어 열한 비트짜리
// 덩어리 하나가 생겼다 — 5막 뒷부분이 통째로 한 걸음이 되어, 지도가 아니라 뚱뚱한
// 한 칸이 되었다. 0.35 로 올리면 그 일곱 번이 고르게 퍼진다.
const SIZE_PENALTY = 0.35
const PAIR_COST = { 'read|listen': 1, 'listen|read': 1, 'walk|listen': 1, 'listen|walk': 1, 'read|walk': 2, 'walk|read': 2 }

function mergeCost(a, b) {
  if (a.group === 'hands' || b.group === 'hands') return Infinity
  const base = a.group === b.group ? 0 : PAIR_COST[`${a.group}|${b.group}`] ?? 3
  return base + SIZE_PENALTY * (a.beats.length + b.beats.length)
}

// 합쳐진 걸음 하나가 가질 수 있는 비트 수의 천장. 이것이 없으면 5막 뒷부분(옮김
// 셋·달아나기·글 일곱 장)이 열한 비트짜리 한 걸음으로 뭉쳤다 — 걸음 수만 여섯이고
// 지도는 거짓이 된다. 여섯 비트가 한 걸음의 한계다.
const MAX_BEATS_IN_STEP = 6

// 한 토막의 성격 — 비트를 무리별로 세어, **가장 많은 무리**가 이 걸음의 성격이 된다.
// 예전에는 가장 「센」 비트 하나가 정했는데(salience), 그러면 글 석 장 뒤에 신하
// 하나가 아뢰는 걸음이 「아뢰는 것을 듣는다」로 적혀 읽을 글 석 장이 사라졌다.
// 무리 안에서는 여전히 가장 센 비트가 대표다 — 장계가 있으면 그 무리는 「장계」다.
function weigh(beats) {
  const byGroup = new Map()
  for (const [i, beat] of beats.entries()) {
    const group = groupOf(beat)
    const seen = byGroup.get(group) ?? { group, count: 0, first: i, lead: beat }
    seen.count++
    if (rank(beat.kind) < rank(seen.lead.kind)) seen.lead = beat
    byGroup.set(group, seen)
  }
  return [...byGroup.values()].sort((a, b) => b.count - a.count || rank(a.lead.kind) - rank(b.lead.kind))
}

const run = beats => ({ group: weigh(beats)[0].group, beats })
const fold = (a, b) => run([...a.beats, ...b.beats])

function squeeze(runs, target, cap) {
  const out = runs.slice()
  while (out.length > target) {
    let best = -1
    let bestCost = Infinity
    for (let i = 0; i < out.length - 1; i++) {
      if (out[i].beats.length + out[i + 1].beats.length > cap) continue
      const cost = mergeCost(out[i], out[i + 1])
      if (cost < bestCost) { bestCost = cost; best = i }
    }
    if (best < 0 || !Number.isFinite(bestCost)) break   // 더 줄일 수 없다 — 데이터가 정한 바닥이다
    out.splice(best, 2, fold(out[best], out[best + 1]))
  }
  return out
}

// 합치기를 멈춘 뒤에 **같은 무리가 나란히 남는 일**이 있다. 마지막 합치기가 만들어
// 놓은 이웃이라 셈이 이미 목표에 닿아 손대지 않은 것이다. 그대로 두면 「걸어 다니며
// 만난다」가 두 걸음 연달아 적힌 지도가 나온다(2막에서 실제로 그랬다). 이름이 같은
// 두 걸음은 학생에게 두 걸음이 아니다 — 붙인다. note 가 잇달아 두 번 서지 않는다는
// 규칙도 접기(foldRuns)와 이 한 번으로 완전해진다.
function joinTwins(runs) {
  const out = []
  for (const piece of runs) {
    const last = out[out.length - 1]
    if (last && last.group === piece.group && piece.group !== 'hands') {
      out[out.length - 1] = fold(last, piece)
      continue
    }
    out.push(piece)
  }
  return out
}

function describe({ beats }, handleBeatId) {
  const ranked = weigh(beats)
  const main = ranked[0]
  // 이름은 큰 무리 둘까지만 적고, 비트가 나온 순서로 잇는다. 셋째 무리는 이름표(tags)가 받는다.
  const named = ranked.slice(0, 2).sort((a, b) => a.first - b.first)
  const verb = kind => VERB[kind] ?? ['이 대목을 지나고', '이 대목을 지난다']
  const title = named.length > 1
    ? `${verb(named[0].lead.kind)[0]} ${verb(named[1].lead.kind)[1]}`
    : verb(main.lead.kind)[1]
  const lead = main.lead
  const step = {
    id: lead.id ?? `step-${beats[0]?.id ?? ''}`,
    kind: lead.kind,
    group: main.group,
    title,
    note: NOTE[lead.kind]?.(lead, beats) ?? '',
    tags: tagsOf(beats, lead.kind),
    count: beats.length,
    beats: beats.map(b => b.id),
  }
  if (handleBeatId && beats.some(b => b.id === handleBeatId)) step.handle = true
  return step
}

// 막마다 손으로 쥐는 것 하나(act.handle)가 실제로 지도에 표시되었는지는 시험이 막마다
// 확인한다. 표시가 안 되는 유일한 길은 act.handle.beat 가 없는 비트를 가리키는 것이고,
// 그때는 조용히 넘기지 않고 지도에 아무 표시도 없는 채로 남는다 — 시험이 그것을 잡는다.
export function actMap(act) {
  if (!act) return []
  // 손으로 고친 지도가 있으면 그대로 쓴다. 자동으로 뽑은 것이 그 막에서만 어색할 때,
  // acts.js 한 곳만 고쳐 이 파일을 건드리지 않고 바로잡는 문이다(모양은 아래 주석).
  if (act.map) return overrideMap(act.map)
  const handleBeatId = act.handle?.beat ?? null
  // 세 번에 걸쳐 줄인다. ① 여섯 걸음을 노리되 한 걸음이 여섯 비트를 넘지 않게,
  // ② 그래도 일곱을 넘으면 천장을 풀어 일곱까지 — 이 둘째 판은 지금 다섯 막에서는
  // 한 번도 돌지 않지만, 비트가 더 늘어난 막이 들어올 때 지도가 스무 걸음으로
  // 번지지 않게 하는 마지막 빗장이다. ③ 이름이 같은 이웃을 붙인다.
  const runs = joinTwins(squeeze(squeeze(foldRuns(act.beats ?? []), TARGET_STEPS, MAX_BEATS_IN_STEP), 7, Infinity))
  return runs.map(piece => describe(piece, handleBeatId))
}

// ── 막마다의 손질(act.map) ──────────────────────────────────────────────
// acts.js 의 막 객체에 `map` 을 적으면 위의 셈을 통째로 건너뛴다. 두 모양을 받는다:
//
//   map: [
//     { kind: 'note', group: 'read', title: '글을 읽는다', note: '「1863 겨울, 운현궁」 한 장' },
//     { kind: 'funding', group: 'hands', title: '경복궁을 짓는다', note: '…', handle: true },
//   ]
//
//   map: {
//     todo: '이 막에서 할 일 한 줄',     // 화면 위쪽에 그대로 나온다
//     steps: [ …위와 같은 걸음들… ],
//   }
//
// 걸음 하나에 꼭 있어야 하는 것은 **title 과 group** 뿐이다(group 은 'read'|'walk'|
// 'listen'|'hands' 넷 중 하나 — 글리프와 강조가 이것으로 갈린다). kind 만 적고 group 을
// 비우면 kind 에서 받아 채운다. id 가 없으면 자리 번호로 채운다. 그 밖의 칸(note·tags·
// handle·count)은 적은 그대로 화면에 간다 — 손질한 지도는 셈을 다시 타지 않는다.
function overrideMap(map) {
  const steps = Array.isArray(map) ? map : map?.steps ?? []
  return steps.map((step, i) => ({
    id: step.id ?? `map-${i + 1}`,
    group: step.group ?? GROUP_OF_KIND[step.kind] ?? 'read',
    ...step,
  }))
}

// 화면이 받는 그릇 한 벌. main.js 는 이 한 줄로 부른다:
//   await actMapScreen.open(actMapView(ACTS[i], i, { intro: GAME_INTRO.slice(0, 2) }))
export function actMapView(act, actIndex = 0, { intro = [], todo = null, startLabel = null } = {}) {
  return {
    act,
    actIndex,
    title: `${actIndex + 1}막 「${act?.title ?? ''}」 — 이 막의 여정`,
    when: act?.dateLabel ?? '',
    steps: actMap(act),
    intro,
    // 막 자신이 적어 둔 「이 막에서 할 일」 한 줄이 있으면 그것이 먼저다.
    todo: todo ?? (Array.isArray(act?.map) ? null : act?.map?.todo) ?? act?.todo ?? '',
    handleLine: act?.handle?.line ?? '',
    startLabel: startLabel ?? `${actIndex + 1}막을 시작한다`,
  }
}
