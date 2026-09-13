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
