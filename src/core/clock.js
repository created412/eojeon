// 하루에 임금이 **몇 사람의 아룀을 들을 수 있는가**.
//
// 예전에는 「남은 해」였다 — 방마다 값(1~4칸)을 매겨 두고, 임금이 그 방까지 걸어가는
// 데 해를 쓰는 모델이었다. 선생님이 그것을 끝냈다:
//
//   "남은 해와 이벤트로 해가 나오는 형태가 어디있어, 어전회의에 맞지 않아.
//    해를 찾아나서며 이벤트를 진행하는게 아니라 궁궐 내에 있는 신하가 말을 걸거나,
//    왕이 궁궐내에 신하한테 말을 하는 형태가 되어야지"
//
// 맞는 말이다. 걸어 다니는 시간을 재는 모델은 탐험 게임의 것이지 어전의 것이 아니다.
// 임금의 하루를 옭죄는 것은 거리가 아니라 **사람**이다 — 하루에 만날 수 있는 사람의
// 수가 정해져 있고, 누구를 들을지 고르면 나머지는 못 듣는다. 그것이 이 게임이 내내
// 가르치는 것(무엇을 포기했는가)과도 같은 모양이다.
//
// 그래서 값은 자리마다 다르지 않다. **한 번 듣는 것이 하나다.** 문서 넉 장을 한
// 사람에게서 한 번에 받아도 하나다(그 자리에 한 번 선 것이므로 — 옛 판정 R102 가
// costOfPlaces 로 애써 흉내 내던 것이 여기서는 저절로 참이 된다).

// 한 번 듣는 데 드는 값.
export const AUDIENCE_COST = 1

// 비트가 따로 정하지 않았을 때의 하루. 실제 값은 막마다 acts.js 의 dayUnits 가 정한다.
export const DAY_UNITS = 3

export function costOf() {
  return AUDIENCE_COST
}

// 한 번의 대화로 여러 장을 받아도 값은 하나다.
export function costOfPlaces() {
  return AUDIENCE_COST
}

export function spend(state) {
  if (state.dayLeft < AUDIENCE_COST) return { ok: false, state }
  return { ok: true, state: { ...state, dayLeft: state.dayLeft - AUDIENCE_COST } }
}

export function isDusk(state) {
  return state.dayLeft <= 0
}

export function newDay(state, units = DAY_UNITS) {
  return { ...state, dayLeft: units }
}
