// 왜 잃었는지를 사초함이 기억하게 한다. state.lostBy 는 createState() 에 없는 필드다 —
// src/core/state.js 는 잠금이라 여기서 새 필드를 선언하지 않는다. 1단계 판정 R5가
// state.room 에 대해 내린 것과 같은 판단: deserialize 는 version 만 검사하므로
// 세이브에 섞여도 무해하고, 모든 읽기는 state.lostBy ?? {} 로 방어한다.
export const LOSS_LABEL = {
  plunder: '약탈됨 · 프랑스',
  fire: '불탐',
}

export function recordLoss(state, ids, reason) {
  const lostBy = { ...(state.lostBy ?? {}) }
  for (const id of ids) lostBy[id] = reason
  return { ...state, lostBy }
}

export function lossReason(state, id) {
  return (state.lostBy ?? {})[id] ?? null
}

export function lossLabel(state, id) {
  const r = lossReason(state, id)
  return r ? LOSS_LABEL[r] : '잃음'
}

export function lostWithReason(state, reason) {
  return Object.entries(state.lostBy ?? {})
    .filter(([, r]) => r === reason)
    .map(([id]) => id)
}

// 잃은 카드도 잃기 전에는 반드시 읽었다 — main.js 는 pickUp() 과 markRead() 를
// 언제나 한 동작으로 묶어 부른다(pressE, playBrush 둘 다). 그런데 codex.js(잠금)의
// lose() 는 잃을 때 sources.read 에서도 그 id 를 지운다 — "지금 읽음으로 남아
// 있는 것"과 "한 번이라도 읽은 것"이 그래서 갈린다. 학생의 기록(2단계 Important 1 —
// copyRecord·막 끝 화면·마침 화면)은 언제나 이쪽을 써야 한다 — sources.read 만 쓰면
// 아홉 장을 읽고 불에 셋만 들고 나온 학생의 기록이 "세 장 읽음"으로 줄어든다.
export function everRead(state) {
  return [...new Set([...state.sources.read, ...state.sources.lost])]
}
