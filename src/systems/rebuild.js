// 경복궁을 짓는다 — 1막에서 학생이 손으로 하는 일.
//
// 선생님(2026-09-30): 「당백전 원납전 미니게임 전혀 재미없고 화면 안에 들어오지도
// 않아. 무슨 게임 하는 건지도 모르겠어. 더 직관적으로 게임을 다시 만들어 봐 새롭게.」
//
// 세 번째 퇴짜다. 그래서 손보지 않고 판을 갈아엎는다. 먼저 **왜 재미없었는지**를
// 적어 둔다 — 같은 실수를 네 번째로 하지 않으려고.
//
//   ① 고를 것이 없었다. 지레가 둘인데 **둘 다 끝까지 밀면 무조건 이겼다.**
//      깎이는 것(민심)도 오르는 것(물가)도 나를 멈춰 세우지 못했다. 그러면
//      「무엇을 고를까」가 아니라 「끝까지 민다」 한 수뿐이고, 그것은 게임이 아니다.
//   ② 하는 일이 눈에 안 보였다. 「칸」·「지레」·「결승선」은 모두 비유였다.
//      학생은 자기가 무엇을 만지고 있는지 몰랐다.
//   ③ 판이 길어 화면에 안 들어왔다.
//
// ── 새 판 ─────────────────────────────────────────────────────────────────
//
// 하는 일을 한 문장으로 적을 수 있어야 한다:
//
//   **고을에서 걷거나 돈을 찍어서, 경복궁을 한 채씩 올린다.**
//
// 화면에 있는 것이 전부 **실제 물건**이다 — 고을, 주전소, 공사판. 비유가 없다.
//
//   고을에서 걷는다(원납전)  고을 하나가 두 번까지 낸다. 두 번째는 적게 내고,
//                            그다음은 비어서 아무것도 못 낸다. 고을은 여덟이고
//                            **다시 차지 않는다.** 그림이 평온 → 걷힘 → 비었다로 바뀐다.
//   돈을 찍는다(당백전)      바로 돈이 생긴다. 대신 **올리는 값이 오른다** —
//                            단추에 적힌 값이 그 자리에서 올라간다.
//   한 채 올린다             지금 값만큼 내고 공사를 한 칸 올린다. 열 채면 끝난다.
//
// ── 이 판이 가르치는 것 ───────────────────────────────────────────────────
//
// 고을에서 걷을 수 있는 것을 **다 걷어도 모자라게** 맞춰 두었다(아래 수치 참고).
// 그래서 학생은 반드시 돈을 찍게 되고, 찍는 순간 값이 오르는 것을 **눈으로 본다.**
// 교과서가 적은 순서(1865 중건 시작 → 원납전 → 1866 당백전)를 학생이 스스로
// 다시 밟게 되는 셈이다.
//
// ⚠ **아무도 갇히지 않는다.** 돈을 찍으면 들어오는 것(MINT_COIN)이 그때 오르는
//   값(PRICE_PER_MINT)보다 크므로, 찍기를 되풀이하면 언제나 다음 채를 올릴 수 있다.
//   시험이 이것을 전수로 잰다 — 가로막는 판을 두는 이상 이것이 가장 중요하다.
//
// ⚠ 액수를 짓지 않는다. 「냥」도 총액도 쓰지 않는다 — 그때 얼마였는지는 기록으로
//   정할 수 없다. 여기 수는 기제를 손으로 느껴 보기 위한 눈금일 뿐이고,
//   RECON_NOTE 가 그렇게 밝힌다.

export const BAYS = 10              // 올려야 하는 채 수
export const VILLAGES = 8           // 고을 수
export const LEVY_YIELDS = [11, 6]  // 한 고을이 첫 번째·두 번째로 내는 것
export const MINT_COIN = 20         // 한 번 찍을 때 들어오는 것
export const PRICE_BASE = 14        // 한 채를 올리는 데 드는 것
export const PRICE_PER_MINT = 3     // 한 번 찍을 때마다 오르는 값

// 다 걷어도 모자란다 — 이것이 이 판의 심지다. 시험이 이 부등식을 붙든다.
export const LEVY_TOTAL = VILLAGES * LEVY_YIELDS.reduce((a, b) => a + b, 0)
export const BASE_TOTAL = BAYS * PRICE_BASE

export const RECON_NOTE =
  '※ 여기 수는 기제를 손으로 느껴 보기 위한 눈금입니다. 그때의 액수도, 물가가 몇 배가 되었는지도 기록으로는 정할 수 없어, 오르는 쪽과 깎이는 쪽만 보여줍니다.'

export const WONNAP_GLOSS = '願 원하다 · 納 바치다 · 錢 돈'
export const DANGBAEK_GLOSS = '當 맞먹다 · 百 백 · 錢 돈'

export function initialBoard() {
  return { coin: 0, bays: 0, mints: 0, levies: Array.from({ length: VILLAGES }, () => 0) }
}

// 고을 하나가 지금 어떤 꼴인가. 화면이 그림을 고르는 데 쓴다.
export function villageState(board, i) {
  const n = board.levies?.[i] ?? 0
  if (n <= 0) return 'calm'
  if (n < LEVY_YIELDS.length) return 'levied'
  return 'empty'
}

// 그 고을에서 이번에 걷히는 것. 더 걷을 것이 없으면 0.
export function levyYield(board, i) {
  return LEVY_YIELDS[board.levies?.[i] ?? 0] ?? 0
}

export function canLevy(board, i) {
  return levyYield(board, i) > 0
}

export function levy(board, i) {
  if (!canLevy(board, i)) return board
  const levies = [...board.levies]
  const got = levyYield(board, i)
  levies[i] += 1
  return { ...board, coin: board.coin + got, levies }
}

export function mint(board) {
  return { ...board, coin: board.coin + MINT_COIN, mints: board.mints + 1 }
}

// 한 채를 올리는 데 드는 것. 찍을수록 오른다 — 이 한 줄이 이 판의 전부다.
export function price(board) {
  return PRICE_BASE + PRICE_PER_MINT * (board.mints ?? 0)
}

export function canRaise(board) {
  return board.bays < BAYS && board.coin >= price(board)
}

export function raise(board) {
  if (!canRaise(board)) return board
  return { ...board, coin: board.coin - price(board), bays: board.bays + 1 }
}

export function isDone(board) {
  return board.bays >= BAYS
}

// 아직 걷을 것이 남은 고을이 있는가. 없으면 찍는 수밖에 없다.
export function levyLeft(board) {
  return board.levies.reduce((n, _, i) => n + (canLevy(board, i) ? 1 : 0), 0)
}

export function emptyVillages(board) {
  return board.levies.filter(n => n >= LEVY_YIELDS.length).length
}

// 값이 처음의 몇 배가 되었는가. 학생이 끝에서 보는 수.
export function priceTimes(board) {
  return price(board) / PRICE_BASE
}

// ── 화면에 뜨는 줄 ────────────────────────────────────────────────────────
//
// 「깎였다/올랐다」를 숫자로 말하지 않는다. 일어난 일을 말한다.

export const FIRST_LEVY_LINE =
  '스스로 원하여 바치는 돈이라 하였으나, 고을마다 낼 액수를 위에서 정해 내려보냈다.'
export const FIRST_MINT_LINE =
  '한 개를 상평통보 백 개로 쳐서 쓰게 하였다. 백 배로 정했을 뿐, 그만한 값어치가 있는 것은 아니다.'
export const EMPTY_LINE = '이 고을에서는 더 걷을 것이 없다.'
export const PRICE_UP_LINE = '돈이 흔해지자, 한 채를 올리는 값이 올랐다.'
export const NEED_MORE_LINE = '고을에서 걷을 수 있는 것을 다 걷어도 모자란다.'

/**
 * 한 수를 둔 뒤 판이 내미는 한 줄. 없으면 null.
 * prev·next 를 견주어 **이번에 실제로 일어난 일**만 말한다.
 */
export function nudgeFor(prev, next) {
  if (!prev || !next) return null
  if (next.mints > prev.mints) {
    return prev.mints === 0 ? FIRST_MINT_LINE : PRICE_UP_LINE
  }
  const levied = next.levies.some((n, i) => n > prev.levies[i])
  if (levied) {
    if (prev.levies.every(n => n === 0)) return FIRST_LEVY_LINE
    if (emptyVillages(next) > emptyVillages(prev)) return EMPTY_LINE
  }
  return null
}

// 끝난 뒤 학생의 셈을 한 줄로. 기록에 남는 말이기도 하다.
export function summaryLine(board) {
  const empties = emptyVillages(board)
  const times = priceTimes(board)
  const mintWord = board.mints === 0 ? '돈은 한 번도 찍지 않았다'
    : `돈을 ${board.mints}번 찍어 한 채 값이 처음의 ${times.toFixed(1)}배가 되었다`
  return `경복궁을 다 올렸다 — 고을 ${empties}곳이 더 낼 것이 없게 되었고, ${mintWord}.`
}
