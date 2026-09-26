// 「돈을 만든다」 — 경복궁 중건 비용을 채우는 판의 판정. 1막 마지막 자리다.
//
// 2026-09-26 선생님: 「원납전과 당백전을 선택하고 선택한 이유를 쓰는 건 교육적 의미도
// 없고 재미도 없어. 원납전과 당백전을 잘 활용하여서 다시 만들어보자.」
//
// 그전까지 이 자리는 어전회의였다 — 셋 중 하나를 누르고, 왜 그렇게 정했는지 한 줄
// 적으면 대원군이 뒤집었다. 학생이 한 일은 누르기와 쓰기뿐이고, 원납전과 당백전은
// 단추에 적힌 이름이었을 뿐이다. 이름을 읽는 것으로는 「돈을 더 찍으면 물가가 오른다」가
// 손에 남지 않는다.
//
// 그래서 판을 만든다. 학생은 두 지레를 제 손으로 밀어 비용을 채우고, 밀 때마다
// 민심과 물가가 움직이는 것을 본다. 가르치려는 것은 딱 하나다 —
//   **돈을 더 찍으면 물가가 오른다. 이미 걷어 둔 돈의 값어치까지 함께 줄어든다.**
// 곁따라 하나 더 — 「스스로 원해서 낸다」는 이름이 붙은 세금이 실제로는 할당이었다.
//
// ⚠ 절대 수치를 짓지 않는다. 냥도, 총액도, 쌀 한 섬의 값도 여기 없다. 채울 것은
//    「중건에 드는 일감을 100으로 나눈 칸」이고, 물가는 처음을 1로 둔 배수뿐이다.
//    그때 물가가 몇 배였는지는 기록으로 정할 수 없다(systems/prices.js 의 같은 규칙,
//    설계서 11장 검증 규약). 화면은 RECON_NOTE 를 그대로 내보낸다.
// ⚠ 교과서가 확인해 주는 것까지만 말한다 — 원납전은 고을마다 낼 액수를 위에서 정해
//    내려보냈다는 것, 당백전은 한 개를 상평통보 백 개로 쳐서 1866년 말부터 발행되었고
//    물가를 크게 흔들어 반년쯤 뒤에 거두어졌다는 것(『고종실록』·한국사1 pp.104~107).
//    아래 수는 그 기제를 손으로 느껴 보게 하려고 이 화면이 고른 수이고, 고쳐도 역사
//    서술은 달라지지 않는다 — 달라지면 그것이 잘못이다.
// ⚠ 채점하지 않는다. 이기는 배합이 없는 것이 이 판의 요점이다 — 아래 수는 어느 길로
//    가도 목표가 채워지도록(그리고 어느 길로 가도 무엇인가 깎이도록) 맞춰 두었다.
// ⚠ 시계가 없다. 촉박은 C1·C2·C3 세 번뿐이다.

// ── 채울 것 ────────────────────────────────────────────────────────────────
// 중건에 드는 일감을 100칸으로 둔다. 「칸」은 돈의 단위가 아니라 일감의 단위다 —
// 그래서 물가가 오르면 같은 돈으로 채울 수 있는 칸이 줄어든다. 이 한 줄이 이 판의 전부다.
export const GOAL_BLOCKS = 100

// ── 원납전 ─────────────────────────────────────────────────────────────────
// 한 차례 = 고을마다 걷기를 한 바퀴 돌린다. 확실히 모이지만 민심이 깎인다.
export const LEVY_MAX = 14
export const LEVY_COIN = 9
// 민심이 이만큼 아래로 내려간 뒤에 돌리면, 더 낼 것이 남지 않은 고을이 생겨 덜 걷힌다.
export const WEARY_MINSIM = 45
export const LEVY_WEARY_COIN = 5
export const MINSIM_START = 100
export const MINSIM_PER_LEVY = 7

// ── 당백전 ─────────────────────────────────────────────────────────────────
// 한 칸 = 당백전을 한 몫 더 찍는다. 즉시 큰 돈이 생기지만 물가가 뛴다.
export const MINT_MAX = 14
export const MINT_COIN = 34
export const PRICE_PER_MINT = 0.25

// 쌀 한 섬 값을 동전 그림 몇 개로 보일지. 처음을 넷으로 둔다 — 절대 액수가 아니다.
export const RICE_BASE_COINS = 4

export const RECON_NOTE =
  '※ 칸·배수는 기제를 손으로 느껴 보기 위한 재구성입니다. 그때의 액수도, 물가가 몇 배가 되었는지도 기록으로는 정할 수 없어, 오르는 쪽과 깎이는 쪽만 보여줍니다.'

export const GOAL_NOTE =
  '※ 「칸」은 중건에 드는 일감을 100으로 나눈 몫입니다 — 돈의 단위가 아니라서, 물가가 오르면 같은 돈으로 채울 수 있는 칸이 줄어듭니다.'

export const WONNAP_GLOSS = '願 원하다 · 納 바치다 · 錢 돈'
export const DANGBAEK_GLOSS = '當 맞먹다 · 百 백 · 錢 돈'

// 처음 밀었을 때 판이 내미는 줄. 사료가 적은 그대로다(data/sources.js 의 excerpt).
export const WONNAP_REVEAL =
  '스스로 원하여 바치는 돈이라 하였으나, 고을마다 낼 액수를 위에서 정해 내려보냈다. 「스스로 원해서」가 아니었다.'
export const DANGBAEK_REVEAL =
  '한 개를 상평통보 백 개로 쳐서 쓰게 하였다. 백 배로 정했을 뿐, 그만한 값어치가 있는 것은 아니다.'

// 민심이 문턱을 지난 그 순간에만 나오는 줄. 「줄었다」가 아니라 「줄어든다」다 —
// 덜 걷히는 것은 이 차례가 아니라 다음 차례부터이고(levyCoin 은 차례 전의 민심으로
// 갈린다), 화면의 말과 셈이 어긋나면 학생이 먼저 알아챈다.
export const WEARY_NUDGE = '더 낼 것이 남지 않은 고을이 생긴다 — 이제부터 한 차례에 걷히는 것이 줄어든다.'
// 당백전을 찍어 이미 걷어 둔 돈이 줄어든 순간에만 나오는 줄. 이 판의 심지다.
export const SHRINK_NUDGE = '돈은 늘었는데, 걷어 두었던 원납전의 값어치가 줄었다.'

const clampInt = (v, lo, hi) => {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return lo
  return n < lo ? lo : n > hi ? hi : n
}

// 이름이 createFunding 이 아닌 까닭: 화면 쪽(ui/funding.js)이 그 이름을 쓴다.
// 한 파일에 두 이름이 들어오면 묶음이 서지 않는다 — 여기는 판의 처음 상태다.
export function initialBoard() {
  return { levy: 0, mint: 0 }
}

export function setLevy(state, n) {
  return { ...state, levy: clampInt(n, 0, LEVY_MAX) }
}

export function setMint(state, n) {
  return { ...state, mint: clampInt(n, 0, MINT_MAX) }
}

export function stepLevy(state, delta = 1) {
  return setLevy(state, state.levy + delta)
}

export function stepMint(state, delta = 1) {
  return setMint(state, state.mint + delta)
}

// 민심. 되돌릴 수 있다 — 이 판은 아직 아무것도 내려보내지 않은 셈판이므로,
// 차례를 줄이면 그 차례를 돌리지 않은 셈이 된다.
export function minsim(state) {
  return Math.max(0, MINSIM_START - MINSIM_PER_LEVY * state.levy)
}

// 물가. 처음을 1로 둔 배수다. 당백전 한 칸마다 일정하게 오른다 —
// 복리로 두면 당백전만으로는 목표에 닿을 수 없고, 그러면 「어느 길로 가도 채워진다」가
// 깨진다. 채워지지 않는 길은 가르치는 것이 아니라 막는 것이다.
export function priceMultiple(state) {
  return 1 + PRICE_PER_MINT * state.mint
}

// 걷힌 원납전(명목). 차례마다, 그 차례를 돌리기 **전**의 민심으로 걷히는 양이 갈린다.
export function levyCoin(state) {
  let coin = 0
  for (let n = 0; n < state.levy; n++) {
    const before = MINSIM_START - MINSIM_PER_LEVY * n
    coin += before >= WEARY_MINSIM ? LEVY_COIN : LEVY_WEARY_COIN
  }
  return coin
}

export function mintCoin(state) {
  return MINT_COIN * state.mint
}

export function coinTotal(state) {
  return levyCoin(state) + mintCoin(state)
}

// 채운 칸. 명목 돈을 물가로 나눈다 — 두 몫을 따로 돌려주는 것이 이 함수의 요점이다.
// 화면은 이 둘을 막대에 나란히 쌓고, 당백전을 밀 때 원납전 몫이 눈앞에서 줄어드는 것을
// 보여 준다. 합은 늘어나는데 먼저 걷어 둔 몫은 줄어든다 — 그것이 인플레이션이다.
export function blocks(state) {
  const price = priceMultiple(state)
  const levy = levyCoin(state) / price
  const mint = mintCoin(state) / price
  return { levy, mint, total: levy + mint }
}

// 걷어 둔 원납전이 얼마짜리였고 지금은 얼마짜리인가. 물가가 오르면 걷을 때의 값어치와
// 지금의 값어치가 갈라진다 — 이 두 수가 갈라지는 것을 보여 주는 것이 이 판의 전부다.
// 걷을 때의 값어치는 물가 1일 때의 칸 수, 곧 명목 그대로다.
export function levyWorth(state) {
  return { then: levyCoin(state), now: blocks(state).levy }
}

export function levyWorthLine(state) {
  const w = levyWorth(state)
  if (w.then <= 0) return ''
  if (priceMultiple(state) <= 1.001) return `원납전으로 걷은 돈은 ${Math.floor(w.then)}칸어치다.`
  return `원납전으로 걷은 돈은 걷을 때 ${Math.floor(w.then)}칸어치였다 — 지금은 ${Math.floor(w.now)}칸어치다.`
}

export function filledBlocks(state) {
  return blocks(state).total
}

export function goalMet(state) {
  return filledBlocks(state) >= GOAL_BLOCKS
}

export function goalLabel(state) {
  const filled = Math.floor(filledBlocks(state))
  return `중건에 드는 일감 ${GOAL_BLOCKS}칸 가운데 ${Math.min(filled, GOAL_BLOCKS)}칸`
}

// 민심은 숫자로 내보내지 않는다 — 숫자를 붙이면 그 순간 점수가 된다. 말로만 적는다.
const MINSIM_WORDS = [
  [86, '조용하다'],
  [66, '술렁인다'],
  [45, '원망이 돈다'],
  [24, '고을을 떠나는 사람이 생긴다'],
  [0, '바닥에 가깝다'],
]

export function minsimLabel(state) {
  const m = minsim(state)
  for (const [floor, word] of MINSIM_WORDS) if (m >= floor) return word
  return MINSIM_WORDS[MINSIM_WORDS.length - 1][1]
}

export function minsimBar(state) {
  return minsim(state) / MINSIM_START
}

// 「4.00배」가 아니라 「4배」로 읽히게 한다 — 꼬리의 0 은 정밀한 숫자라는 인상만 준다.
export function priceTimes(state) {
  return String(Number(priceMultiple(state).toFixed(2)))
}

export function priceLabel(state) {
  if (priceMultiple(state) <= 1.001) return '쌀 한 섬 값  ····  아직 그대로다'
  return `쌀 한 섬 값  ····  처음의 ${priceTimes(state)}배`
}

// 쌀 한 섬을 사는 데 드는 돈을 동전 그림 몇 개로 보일지. 처음이 넷이다.
export function riceCoins(state) {
  return Math.round(RICE_BASE_COINS * priceMultiple(state))
}

// 밀고 난 뒤 판이 내미는 한 줄. 화면이 문구를 짓지 않게 여기서 만든다.
// 처음 보는 것 → 문턱을 지난 것 → 값어치가 줄어든 것 순으로 하나만 고른다.
export function nudgeFor(prev, next) {
  if (next.levy > prev.levy) {
    if (prev.levy === 0) return WONNAP_REVEAL
    if (minsim(prev) >= WEARY_MINSIM && minsim(next) < WEARY_MINSIM) return WEARY_NUDGE
    return ''
  }
  if (next.mint > prev.mint) {
    const shrank = blocks(next).levy < blocks(prev).levy
    // 처음 찍는 순간에 이미 걷어 둔 돈이 줄어들면 두 줄을 함께 낸다 — 그 순간이
    // 이 판에서 가장 중요한 순간이고, 다음 손짓까지 기다리면 놓친다.
    if (prev.mint === 0) return shrank ? `${DANGBAEK_REVEAL} ${SHRINK_NUDGE}` : DANGBAEK_REVEAL
    if (shrank) return SHRINK_NUDGE
    return ''
  }
  return ''
}

// 학생의 셈을 한 줄로 적는다. 예전에는 학생이 「왜 그렇게 정했는지」를 손으로
// 써야 했지만(선생님이 지운 그 자리), 이제는 제 손으로 민 값이 그대로 기록이 된다.
export function summaryLine(state) {
  const parts = []
  parts.push(state.levy > 0 ? `원납전을 ${state.levy}차례 걷고` : '원납전은 걷지 않고')
  parts.push(state.mint > 0 ? `당백전을 ${state.mint}칸 찍었다` : '당백전은 찍지 않았다')
  const tail = priceMultiple(state) <= 1.001
    ? '쌀 한 섬 값은 그대로다'
    : `쌀 한 섬 값이 처음의 ${priceTimes(state)}배가 되었다`
  return `${parts.join(', ')}. ${tail}. 민심은 ${minsimLabel(state)}.`
}

// 교과서가 확인해 주는 것. 물가가 몇 배였는지는 여기 없다 — 「크게 흔들었다」까지다.
export const HISTORY_LINES = [
  '흥선 대원군은 경복궁 중건을 밀어붙였다. 원납전을 걷고, 당백전을 발행하였다.',
  '원납전은 스스로 원하여 바치는 돈이라 하였으나, 고을마다 낼 액수를 위에서 정해 내려보냈다.',
  '당백전은 1866년 말부터 발행되었고, 물가를 크게 흔들어 반년쯤 뒤에 거두어졌다.',
]

export const HISTORY_PRICE = '크게 올랐다 — 몇 배였는지는 기록으로 정할 수 없다.'

// 학생의 셈과 교과서를 나란히 놓는다. 어느 쪽이 맞았다고 말하지 않는다 —
// 옳고 그름을 가리는 자리가 아니라, 제 손으로 겪은 것을 사료 옆에 놓아 보는 자리다.
export function comparison(state, options = {}) {
  const met = goalMet(state)
  const yourPrice = priceMultiple(state) <= 1.001
    ? '쌀 한 섬 값을 건드리지 않았다.'
    : `쌀 한 섬 값을 처음의 ${priceTimes(state)}배로 올렸다.`
  return {
    // 채웠는지 못 채웠는지만 적는다. 못 채운 것도 판정이 아니다 — 그런 셈도 있었다.
    goal: met
      ? `${GOAL_BLOCKS}칸을 채웠다.`
      : `${Math.floor(filledBlocks(state))}칸에서 셈을 멈추었다.`,
    you: summaryLine(state),
    yourPrice,
    actualPrice: HISTORY_PRICE,
    actual: options.actualLines ?? HISTORY_LINES,
    note: RECON_NOTE,
  }
}
