// 임금이 자란다.
//
// 선생님 지적 5번: **「고종 캐릭터가 시간이 지나면서 나이에 맞게 어린아이에서 점점
// 커가는 모습을 보여야 해.」** 예전에는 「1막이면 아이, 아니면 어른」 딱 두 가지였다 —
// 1866년(열다섯)과 1884년(서른셋)이 같은 몸으로 서 있었다. 이 게임은 스물한 해를
// 지나가는 게임인데, 그 스물한 해가 화면에 하나도 안 보였던 셈이다.
//
// 몸은 두 벌뿐이다(king_child · king_adult, image_to_3d 로 만든 GLB). 그 둘 사이를
// **키**로 잇는다 — 열두 살의 아이 몸에서 시작해 해마다 조금씩 커지고, 열여섯에
// 어른 몸으로 갈아입은 뒤에도 스물여섯까지 계속 큰다.

// 고종은 1852년생이다. 이 게임의 글은 세는나이로 적혀 있다 —
// 1막 첫 화면이 「열두 살에 왕이 되었다」이고 그해가 1863년이다.
export const BIRTH_YEAR = 1852

export function ageAt(year) {
  return year - BIRTH_YEAR + 1
}

// 아이 몸에서 어른 몸으로 갈아입는 나이. 열여섯이면 관례를 치르고 어른 옷을 입는다.
export const ADULT_AGE = 16

export function stageForAge(age) {
  return age < ADULT_AGE ? 'child' : 'adult'
}

// 나이별 키(게임 안의 단위). 두 끝은 예전 값 그대로다 — 열두 살 2.35,
// 다 자란 뒤 2.89. 이 둘을 바꾸면 궁궐·문·기둥과의 비례가 함께 틀어진다.
const CURVE = [
  [12, 2.35],
  [15, 2.55],
  [18, 2.74],
  [22, 2.85],
  [26, 2.89],
]

export function heightForAge(age) {
  const first = CURVE[0]
  const last = CURVE[CURVE.length - 1]
  if (age <= first[0]) return first[1]
  if (age >= last[0]) return last[1]
  for (let i = 1; i < CURVE.length; i++) {
    const [a0, h0] = CURVE[i - 1]
    const [a1, h1] = CURVE[i]
    if (age <= a1) return h0 + ((age - a0) / (a1 - a0)) * (h1 - h0)
  }
  return last[1]
}

/**
 * 그해의 임금은 어떤 몸인가. render/scene.js 의 setKingAge() 가 받는 값이다.
 * 해를 모르면(year 가 없으면) 아무것도 정하지 않고 null 을 돌려준다 —
 * 부르는 쪽이 「그러면 그대로 둔다」를 고를 수 있게.
 */
export function kingLookAt(year) {
  if (!Number.isFinite(year)) return null
  const age = ageAt(year)
  return { age, stage: stageForAge(age), height: heightForAge(age) }
}

// 나이가 같아도 즉위 전에는 곤룡포를 입지 않는다. 이어하기도 지난 궁 전환을 훑어
// 판정하므로, 1막의 시작 궁이 운현궁이라는 이유로 즉위 뒤까지 사복이 남지 않는다.
export function kingAttireAt(act, beatIndex, currentPalace = null) {
  const beats = act?.beats ?? []
  let palace = act?.palace
  for (let i = 0; i <= beatIndex && i < beats.length; i++) palace = beats[i].palace ?? palace
  const throne = beats.findIndex(b => b.id === 'throne')
  const beforeThrone = act?.id === 'enthronement' && throne >= 0 && beatIndex < throne
  return (currentPalace ?? palace) === 'unhyeon' || beforeThrone ? 'commoner' : 'royal'
}
