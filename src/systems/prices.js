// 절대 쌀값은 사료로 확정할 수 없다(설계서 11장 검증 규약). 5장의 예시 화면은
// '쌀 한 섬 ···· ○○냥' 처럼 절대 수치를 보였지만, 11장은 '쌀값 절대 수치 —
// 확인 불가 — 표시 안 함 — 상대 변화만'이라 못 박는다. 11장을 따른다 — 여기
// 숫자는 화폐 단위가 아니라 '즉위 무렵을 100으로 둔 상대 지수'이며, 화면에는
// 배수로만 나간다. 1866년의 당백전이 1882년 군인들의 썩은 급료로 돌아오는
// 그 열여섯 해짜리 심지가 이 지수다 — 장식이 아니다.
export const RICE_BY_ACT = {
  1: 100,   // 1863~1865  당백전 발행 직전
  2: 118,   // 1866~1871  당백전이 돌기 시작한다
  3: 134,   // 1873~1876  개항 직전
  4: 178,   // 1882       쌀 유출·흉년·매점매석이 겹친다
  5: 190,   // 1884
}

export const RICE_NOTE =
  '※ 그때 쌀값이 정확히 얼마였는지는 기록으로 알 수 없어, 오르는 흐름만 보여줍니다.'

export function riceIndexForAct(actNumber) {
  return RICE_BY_ACT[actNumber] ?? RICE_BY_ACT[1]
}

export function riceRatio(index) {
  return index / RICE_BY_ACT[1]
}

export function riceLabel(index) {
  const r = riceRatio(index)
  if (r <= 1.001) return '쌀 한 섬  ····  즉위 무렵과 같다'
  return `쌀 한 섬  ····  즉위 무렵의 ${r.toFixed(1)}배`
}

export function advancePrices(state, actNumber) {
  const next = riceIndexForAct(actNumber)
  return next === state.riceIndex ? state : { ...state, riceIndex: next }
}

// 막마다 언제쯤인지. 절대 쌀값이 아니라 「그때가 언제였나」다.
export const RICE_STEP_LABEL = {
  1: '1863  즉위',
  2: '1866  당백전을 낸 해',
  3: '1873  친정을 시작한 해',
  4: '1882  지금',
  5: '1884',
}

// G 회수 화면이 쓰는 추이. ⚠ 지수 값(index)을 일부러 넣지 않는다 — 절대 수치는 화면에
// 나가면 안 되고(판정 R19), 값이 아예 넘어가지 않으면 실수로도 찍을 수 없다.
export function riceSeriesUpTo(actNumber) {
  const last = Number(actNumber)
  if (!Number.isFinite(last) || last < 1) return []
  const top = riceRatio(riceIndexForAct(Math.min(last, 5)))
  const out = []
  for (let a = 1; a <= Math.min(last, 5); a++) {
    const ratio = riceRatio(riceIndexForAct(a))
    out.push({ act: a, label: RICE_STEP_LABEL[a], ratio, bar: ratio / top })
  }
  return out
}
