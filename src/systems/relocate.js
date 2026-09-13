import { baseOf } from '../data/palaces.js'

// 이어(移御) 기록 — 「사건 목록이 아니라 임금이 집을 옮긴 기록이 게임의 뼈대다」(설계서 5장 B).
// 조작권은 여기서 손대지 않는다 — 비트의 control 은 이미 scenario.js 의 applyBeat 가 처리했다.
// 같은 궁의 화재 변형으로 옮기는 것(baseOf 가 같음)은 이어로 세지 않는다 — 불탄 경복궁도
// 경복궁이다. 이걸 빼면 엔딩에서 학생이 셀 이동 횟수가 어긋난다.
export function relocate(state, { year, from, to, cause, self }) {
  const sameHouse = baseOf(from) === baseOf(to)
  return {
    ...state,
    palace: to,
    moves: sameHouse ? state.moves : [...state.moves, { year, from, to, cause, self }],
  }
}

export function moveCount(state) {
  return state.moves.length
}

export function selfChosenMoves(state) {
  return state.moves.filter(m => m.self === true)
}

export function lastMove(state) {
  return state.moves.length ? state.moves[state.moves.length - 1] : null
}
