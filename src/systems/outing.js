// 나들이(stop) — 탐색하는 낮 안에서 「궁 밖으로 나갔다 오는 일」. 설계서 §7 4막 비트 3이
// 「1·2를 건너뛰면 왜 난이 났는지 모른 채 밤을 맞는다」고 적었으므로, 그것은 반드시
// 건너뛸 수 있는 일이어야 한다. 비트로 만들면 무조건 재생되므로 낮 안에 둔다.
//
// 다녀왔다는 표시를 main.js 의 지역 Set 이 아니라 state.flags 에 남기는 이유:
// 지역 Set 은 F5 한 번에 잊히고, 그러면 학생이 낮 3칸을 두 번 낸다. flags 는 세이브에
// 실려 간다. createState() 에 이미 있는 필드라 잠금 파일을 건드리지 않으며, 읽기는
// 전부 ?? {} 로 방어한다(판정 R21). 이름을 'stop.' 으로 시작해 조건 비트의 깃발과 섞지 않는다.
export function stopFlag(stopId) {
  return `stop.${stopId}`
}

export function isStopDone(state, stopId) {
  return (state?.flags ?? {})[stopFlag(stopId)] === true
}

// ── 값을 치른 순간과 화면을 다 본 순간은 다른 순간이다 ────────────────────
//
// 예전에는 하나였다. pressE() 가 해 3칸을 치르면서 곧장 「다녀왔다」를 찍었고 그 상태가
// 저장되었으므로, 학생이 종로·무위영 화면을 **보는 동안** F5 를 누르면 해는 나갔는데
// 화면도 카드(겨와 모래)도 영영 안 왔다 — stopAt() 이 「다녀왔다」를 보고 그 나들이를
// 다시 안 내주기 때문에 되찾을 길도 없었다. 학생이 하루의 절반을 내고 아무것도 못 얻는다.
//
// 그래서 표시를 둘로 가른다.
//   stop.<id>      — 값을 치렀다. 이것이 있으면 두 번 내지 않는다(그대로 둔다).
//   stop.pending   — 값은 치렀는데 아직 화면을 못 봤다. 이어하기가 이것을 보고
//                    그 화면을 다시 열어 준다(main.js 의 resumePendingStop).
// 둘 다 flags 에 있어 세이브에 실려 간다 — 지역 변수로 두면 F5 한 번에 잊힌다.
export const PENDING_STOP_FLAG = 'stop.pending'

export function pendingStopId(state) {
  const v = (state?.flags ?? {})[PENDING_STOP_FLAG]
  return typeof v === 'string' ? v : null
}

// 값을 치른 순간 — pressE() 가 부른다.
//
// ⚠ PENDING_STOP_FLAG 는 **하나짜리 칸**이다. 여기서 조건 없이 덮어쓰므로, 한 낮에
//   나들이가 둘이면 앞의 것은 해만 치러진 채 화면이 영영 안 온다. 오늘 데이터에는
//   나들이가 하나뿐(imo-day 의 jongno-1882)이고, 그 전제를 tests/systems/outing.test.js
//   의 「밀린 나들이 칸은 하나뿐이다」가 붙들고 있다 — 둘째를 두는 순간 그 시험이 운다.
//   여럿을 담으려면 이 칸의 모양(문자열 → 여럿)과 함께 이어하기(resumePendingStop)의
//   화면 순서까지 고쳐야 한다. 세이브에 실려 가는 값이므로 그 둘은 한 벌이다.
export function markStopPaid(state, stopId) {
  return {
    ...state,
    flags: { ...(state?.flags ?? {}), [stopFlag(stopId)]: true, [PENDING_STOP_FLAG]: stopId },
  }
}

// 화면을 다 본 순간 — runStop() 과 resumePendingStop() 이 부른다. 밀린 표시는
// 그 나들이의 것일 때만 지운다(남의 것을 지우면 다른 나들이가 조용히 사라진다).
export function markStopDone(state, stopId) {
  const flags = { ...(state?.flags ?? {}), [stopFlag(stopId)]: true }
  if (flags[PENDING_STOP_FLAG] === stopId) delete flags[PENDING_STOP_FLAG]
  return { ...state, flags }
}

export function stopAt(stops, roomId, state) {
  if (!roomId) return null
  return (stops ?? []).find(s => s.room === roomId && !isStopDone(state, s.id)) ?? null
}

// 나가기 전에 얼마가 드는지 보여 준다. 값을 숨기면 학생이 무엇을 포기하는지 모른 채 포기한다.
export function stopHint(stop, cost) {
  return `${stop.label}  ·  해 ${cost}칸`
}

export function stopsOfAct(act) {
  return (act?.beats ?? []).flatMap(b => b.stops ?? [])
}

// 밀린 나들이를 그 막의 데이터에서 되찾는다 — 이어하기가 화면을 다시 열 때 쓴다.
export function stopById(act, stopId) {
  return stopsOfAct(act).find(s => s.id === stopId) ?? null
}
