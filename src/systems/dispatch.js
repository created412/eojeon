// E 지연 — 강화도에서 전쟁이 나는데 왕은 한양에 있다. 이 파일이 다루는 것은
// 오직 「무엇이 지금 도착해 있는가」다. day 는 이 장면 안에서 흐르는 날수(state.dayLeft
// 와는 다른 축)이고, 실제 시각은 어디에도 없다 — 언제나 정수 며칠 차이로만 말한다.
export function arrivalDay(d) {
  return d.sentDay + d.lagDays
}

export function arrivedAt(list, day) {
  return (list ?? []).filter(d => arrivalDay(d) <= day)
}

export function pendingAt(list, day) {
  return (list ?? []).filter(d => arrivalDay(d) > day)
}

// 도착한 것 중 가장 늦게 보낸 것 — 그것이 지금 이 순간 임금이 아는 가장 새 소식이다
export function latestAt(list, day) {
  const arrived = arrivedAt(list, day)
  if (arrived.length === 0) return null
  return arrived.reduce((best, d) => (d.sentDay > best.sentDay ? d : best))
}

export function lagDaysAt(list, day) {
  const latest = latestAt(list, day)
  return latest ? day - latest.sentDay : null
}

// 「N일 전 장계 기준」은 공문서 말투가 뜻을 가린다 — 2막 전체를 지탱하는 「정보는
// 늦게 온다」는 깨달음이 이 한 줄에 달려 있는데, 학생이 UI 부속물로 보고 넘긴다
// (가독성 검수 D13, 최악의 열 가지 10위). 「N일 전에 ○○에서 보낸 것이다」로 푼다 —
// 이 목록은 강화도·평양처럼 서로 다른 곳에서 온 소식이 섞여 있을 수 있어(설계서
// 5장 E), 장소 이름은 고정 문구가 아니라 실제로 도착한 그 장계의 placeName 을 쓴다.
export function lagLabelAt(list, day) {
  const latest = latestAt(list, day)
  if (!latest) return '아직 장계가 오지 않았다'
  const lag = day - latest.sentDay
  const from = latest.placeName ? `${latest.placeName}에서 ` : ''
  if (lag === 0) return `오늘 ${from}보낸 소식이다`
  return `이 소식은 ${lag}일 전에 ${from}보낸 것이다`
}

// ── 놓아 보기 — 「닿은 순서」와 「일어난 순서」 ─────────────────────────────
// 2026-09-25 선생님: 「손으로 하는 일을 늘립니다 … 장계 도착 순서 맞추기(2·3막).」
// 이 화면이 가르치는 것은 원래부터 하나였다 — 소식은 거리만큼 늦게 오고, 그래서
// 나중에 닿은 장계가 먼저 일어난 일일 수 있다. 그런데 화면은 그 말을 학생에게
// 「읽어 주고」 있었다. 제 손으로 장계를 늘어놓아 보면, 맞히든 못 맞히든 다음 줄이
// 남는다 — 「장계만 보고는 알 수 없었다」.
//
// ⚠ 셈은 전부 정수 며칠이다. 이 파일에 시각은 없다(맨 위 주석).
// ⚠ 점수를 매기지 않는다. 아래 함수들은 「몇 점인가」가 아니라 「같은 순서였나」를
//    돌려준다. 다만 2026-09-26 선생님의 지시로 **제대로 놓기 전에는 넘어가지 않는다**
//    — 아래 「제대로 놓을 때까지」 묶음이 그 일을 맡는다. 붙잡아 두는 것과 벌하는
//    것은 다르다: 붙잡되, 갈수록 더 말해 준다.
// ⚠ 순서는 id 로 견주지 않고 보낸 날의 차례로 견준다. 같은 날 보낸 장계가 둘이면
//    둘 사이의 앞뒤는 애초에 정해지지 않았으므로, 어느 쪽을 앞에 놓아도 「순서대로」다.

const byIndex = (list) => new Map((list ?? []).map((d, i) => [d.id, i]))

// 닿은 차례. 도착일이 같으면 비트가 적어 둔 순서를 따른다.
export function arrivalOrder(list, day) {
  const at = byIndex(list)
  return arrivedAt(list, day)
    .slice()
    .sort((a, b) => arrivalDay(a) - arrivalDay(b) || at.get(a.id) - at.get(b.id))
}

// 일어난 차례 — 보낸 날 순이다. 장계는 일이 난 그 자리에서 띄우므로, 이 게임 안에서
// 보낸 순서가 곧 일어난 순서다(그 전제를 화면도 한 줄로 밝힌다).
export function happenedOrder(list, day) {
  const at = byIndex(list)
  return arrivedAt(list, day)
    .slice()
    .sort((a, b) => a.sentDay - b.sentDay || at.get(a.id) - at.get(b.id))
}

// 놓아 보기를 내줄 자리인가. 닿은 장계가 둘 이상이고, 보낸 날이 서로 다른 것이
// 둘 이상일 때만이다 — 하나뿐이거나 전부 같은 날 보낸 것이면 「순서」라는 물음 자체가
// 성립하지 않는다. 그때 화면은 예전 그대로 장계만 보여 준다.
export function shouldOfferOrdering(list, day) {
  const arrived = arrivedAt(list, day)
  if (arrived.length < 2) return false
  return new Set(arrived.map(d => d.sentDay)).size >= 2
}

// 놓인 차례가 일어난 차례와 어긋나지 않는가. 보낸 날이 뒤로 갈수록 작아지지만
// 않으면 된다(같은 날은 어느 쪽이 앞이어도 좋다).
export function isInHappenedOrder(list, ids) {
  const byId = new Map((list ?? []).map(d => [d.id, d]))
  let last = -Infinity
  for (const id of ids ?? []) {
    const d = byId.get(id)
    if (!d) return false
    if (d.sentDay < last) return false
    last = d.sentDay
  }
  return true
}

// 닿은 차례가 그대로 일어난 차례였는가. 이 장면의 값은 학생의 점수가 아니라
// 이 한 값이다 — 「이번에는 같았나, 갈렸나」.
export function arrivalMatchesHappened(list, day) {
  return isInHappenedOrder(list, arrivalOrder(list, day).map(d => d.id))
}

// ── 제대로 놓을 때까지 넘어가지 않는다 ────────────────────────────────────
// 2026-09-26 선생님: 「장계의 순서를 정하는거도 틀린지도 모르겠어. 제대로 놓기
// 전까지는 안넘어가야해.」 어제까지 이 자리는 어떤 순서든 받아 주고 곧바로 설명으로
// 넘어갔다 — 「채점하지 않는다」를 지키려던 설계였지만, 그 대가로 학생은 아무것도
// 풀지 않아도 되었다. 선생님이 그 설계를 물리셨다.
//
// 그래서 바뀌는 것과 바뀌지 않는 것을 갈라 적는다.
//   바뀐다 : 어긋난 채로는 다음 화면이 오지 않는다. 다시 놓아 보게 한다.
//   안 바뀐다 : 벌하지 않는다. 세지 않는다. 「오답」이라는 말도, 점수도 없다.
//              말해 주는 것이 갈수록 늘어날 뿐이다.
//
// 그리고 이 물음은 **읽으면 풀린다**. 장계 본문이 일의 앞뒤를 이미 적고 있기
// 때문이다 — 「포를 쏘았다」가 있고 나서야 「올라와 사람을 죽이고 빼앗아 갔다」가
// 있을 수 있다. 그래서 힌트는 답을 주기 전에 먼저 「다시 읽어 보라」고 한다.
//
// ⚠ 손대는 말 하나하나가 학생에게 가는 말이다. 「틀렸다·오답·실패·몇 번째」는
//    한 글자도 쓰지 않는다. 물음이 성립하는 자리인지를 정하는 shouldOfferOrdering
//    은 건드리지 않았다(닿은 것 둘 이상 · 보낸 날이 서로 다른 것 둘 이상).

// 놓인 줄에서 앞뒤가 뒤집힌 첫 이웃 한 쌍. isInHappenedOrder 와 같은 눈으로 본다 —
// 거기서도 견주는 것은 바로 앞 장계뿐이라, 걸리는 자리가 언제나 같다.
export function firstOutOfOrderPair(list, placedIds) {
  const byId = new Map((list ?? []).map(d => [d.id, d]))
  const ids = placedIds ?? []
  for (let i = 0; i + 1 < ids.length; i++) {
    const a = byId.get(ids[i])
    const b = byId.get(ids[i + 1])
    if (!a || !b) return null
    if (b.sentDay < a.sentDay) return [a, b]
  }
  return null
}

// 가장 먼저 일어난 장계들. 「들」인 까닭은 같은 날 떠난 것이 둘일 수 있어서다 —
// 그때는 앞뒤가 애초에 정해져 있지 않으므로 하나를 골라 답이라고 말하지 않는다.
export function earliestHappened(list, day) {
  const arrived = arrivedAt(list, day)
  if (arrived.length === 0) return []
  const first = Math.min(...arrived.map(d => d.sentDay))
  return happenedOrder(list, day).filter(d => d.sentDay === first)
}

// 몇 번째 말까지 갈 것인가. 1·2·3 뿐이고 그 위로는 더 오르지 않는다 —
// 세 번째부터는 언제나 같은 말을 한다. 학생이 몇 번을 다시 놓든 잃는 것이 없다.
export function orderingHintLevel(tries) {
  const n = Math.trunc(Number(tries) || 0)
  if (n <= 1) return 1
  return n >= 3 ? 3 : 2
}

// 장계를 가리키는 이름. 화면에서 학생이 붙들고 있는 것은 지명이므로 그것을 먼저
// 쓰되, 같은 지명이 둘이면 표제로 가리킨다(「강화 앞바다」와 「강화부」처럼 갈리지
// 않는 판이 언제 생길지 모른다).
function labelsOf(a, b) {
  if (a.placeName && b.placeName && a.placeName !== b.placeName) return [a.placeName, b.placeName]
  return [a.headline ?? a.placeName ?? '', b.headline ?? b.placeName ?? '']
}

// 어긋났을 때 건네는 한 줄. 갈수록 더 말해 준다 — 나무라지 않고.
export function orderingHint(list, day, placedIds, tries) {
  const level = orderingHintLevel(tries)
  if (level === 1) {
    return { level, text: '아직 아니다 — 장계에 적힌 일이 서로 어떤 차례로 이어지는지 다시 읽어 보라.' }
  }
  if (level === 2) {
    const pair = firstOutOfOrderPair(list, placedIds)
    if (pair) {
      const [x, y] = labelsOf(pair[0], pair[1])
      return { level, text:
        `「${x}」 장계와 「${y}」 장계, 이 둘을 나란히 두고 다시 읽어 보라. ` +
        '한쪽에 적힌 일은 다른 쪽에 적힌 일이 있고 나서야 일어날 수 있는 일이다.' }
    }
    return { level, text: '아직 아니다 — 어느 일이 있고 나서야 다른 일이 있을 수 있었는지, 장계 본문을 다시 읽어 보라.' }
  }
  const first = earliestHappened(list, day)
  if (first.length === 0) {
    return { level, text: '아직 아니다 — 장계 본문을 다시 읽어 보라.' }
  }
  if (first.length === 1) {
    const name = first[0].placeName || first[0].headline
    return { level, text: `가장 먼저 일어난 일은 「${name}」 장계에 적힌 일이다. 그것을 맨 위에 두고, 나머지는 마저 놓아 보라.` }
  }
  const names = first.map(d => `「${d.placeName || d.headline}」`).join('나 ')
  return { level, text:
    `가장 먼저 일어난 일은 ${names} 장계에 적힌 일이다 — 둘은 같은 날 떠났으니 어느 쪽이 위여도 좋다. ` +
    '그것을 맨 위에 두고, 나머지는 마저 놓아 보라.' }
}

// 아직 오지 않은 장계 가운데, 이미 닿은 장계보다 먼저(또는 같은 날) 보낸 것의 수.
// 1866년 3일째가 그렇다 — 평양 장계는 강화 첫 장계와 같은 날 떠났는데 아직 없다.
export function pendingOlderThanArrived(list, day) {
  const arrived = arrivedAt(list, day)
  if (arrived.length === 0) return 0
  const newest = Math.max(...arrived.map(d => d.sentDay))
  return pendingAt(list, day).filter(d => d.sentDay <= newest).length
}

export function happenedLabel(d, day) {
  const ago = day - d.sentDay
  return ago === 0 ? '오늘 보낸 것이다' : `${ago}일 전에 보낸 것이다`
}

export function travelLabel(d) {
  return d.lagDays === 0 ? '보낸 날 그날 닿았다' : `닿는 데 ${d.lagDays}일이 걸렸다`
}

// 놓아 본 뒤에 나가는 판정. 네 갈래를 다 적는다 — 어느 갈래에서도 「오답」이라는
// 말이 나오지 않는다. 못 짚었을 때 설명하는 것은 학생이 아니라 거리다.
//
// 2026-09-26 이후로 화면은 제대로 놓은 뒤에만 이것을 부른다(placedRight 가 참인
// 두 갈래만 실제로 학생에게 간다). 네 갈래를 그대로 남겨 두는 까닭은, 이 함수가
// 판정하는 것이 「학생이 어떠했나」가 아니라 「이번 판이 어떠했나」이기 때문이다 —
// 닿은 순서가 그대로였던 날과 갈린 날은 끝까지 다르게 말해야 한다.
export function orderingVerdict(list, day, placedIds) {
  const truth = happenedOrder(list, day)
  const arrival = arrivalOrder(list, day)
  const placedRight = isInHappenedOrder(list, placedIds)
  const arrivalSame = arrivalMatchesHappened(list, day)

  let headline
  if (placedRight && arrivalSame) headline = '놓은 대로였다. 이번에는 닿은 순서가 그대로 일어난 순서였다.'
  else if (placedRight) headline = '놓은 대로였다. 닿은 순서와 일어난 순서가 갈린 것을 짚어냈다.'
  else if (arrivalSame) headline = '일어난 순서는 아래와 같다. 이번에는 닿은 순서가 그대로 일어난 순서였는데, 그것은 장계 어디에도 적혀 있지 않았다.'
  else headline = '일어난 순서는 아래와 같다. 나중에 닿은 장계가 먼저 일어난 일이었다 — 장계만 보고는 알 수 없는 것이었다.'

  const lines = ['소식은 거리만큼 늦게 온다. 같은 날 보낸 장계도 어디서 보냈느냐에 따라 며칠씩 늦게 닿는다.']
  const older = pendingOlderThanArrived(list, day)
  if (older > 0) {
    lines.push(`아직 오지 않은 장계 가운데 ${older}통은, 이미 닿은 장계보다 먼저 보낸 것이다. 임금은 그 일을 아직 모른다.`)
  }

  return { truth, arrival, placedRight, arrivalSame, headline, lines }
}
