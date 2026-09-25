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
// ⚠ 채점하지 않는다. 아래 함수들은 「맞다/틀리다」가 아니라 「같은 순서였나」를
//    돌려준다 — 화면이 점수를 매기는 순간 이 장면은 역사 수업이 아니라 퀴즈가 된다.
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
