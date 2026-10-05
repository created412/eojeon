// 경복궁을 짓는다 — 1막에서 학생이 손으로 하는 일.
//
// 선생님(2026-10-06): 「경복궁 중건을 위한 원납전, 당백전 게임을 … 좀 더 재미있게 구성해 봐.」
//
// 네 번째로 고친다. 바로 앞 판(2026-09-30)은 「고을에서 걷거나 돈을 찍어서, 경복궁을 한 채씩
// 올린다」였다. 하는 일은 분명했지만 **재미가 없었다.** 왜 그랬는지를 먼저 적는다.
//
//   ① 시간이 흐르지 않았다. 학생이 누르지 않으면 아무 일도 일어나지 않으니, 서두를 까닭도
//      아낄 까닭도 없었다. 단추 셋을 차례로 누르면 끝났다.
//   ② 고를 것이 없었다. 고을은 「다 걷고 나면 찍는다」 한 길뿐이었다 — 걷는 쪽에 치르는
//      값이 없었기 때문이다. 고을이 비는 것은 그림이 바뀌는 것일 뿐 학생을 멈춰 세우지 않았다.
//
// ── 새 판 ─────────────────────────────────────────────────────────────────
//
// 하는 일은 그대로 한 문장이다 — **고을에서 걷거나 돈을 찍어서, 경복궁을 올린다.**
// 화면에 있는 것도 그대로 전부 실제 물건이다(고을 · 주전소 · 공사판). 달라진 것은 셋이다.
//
//   공사는 멈추지 않는다   돈이 있는 동안 일꾼들이 **저절로** 올린다. 돈은 그동안 줄줄 샌다.
//                          돈이 떨어지면 공사가 선다 — 그래도 날은 간다(1865 → 1868).
//   고을은 원망을 쌓는다   걷을 때마다 원성이 차고, 내는 것이 준다. 두면 천천히 가라앉는다.
//                          가라앉기 전에 거듭 걷으면 그 고을은 **돌아선다**(怨) — 다시는 내지 않는다.
//   찍으면 값이 뛴다       바로 큰돈이 생긴다. 대신 한 채 값이 그 자리에서 오르고, 내려오지 않는다.
//
// 그래서 고를 것이 생긴다. 고을을 아끼려면 더 찍어야 하고(값이 뛴다), 덜 찍으려면 고을을
// 짜내야 한다(돌아선다). 기다리면 고을은 가라앉지만 공사가 서고 날이 간다 — **기다리는 쪽에도
// 값이 있다**(게임 재제작 실패 패턴: 압박이 기다리기를 보상하면 손이 논다). 어느 쪽으로 가든
// 치른 것이 끝에 한 줄로 남고, 그 위에 『매천야록』의 한 줄이 온다 — 願納錢이 아니라 怨納錢.
//
// ── 맞춰 둔 것 ────────────────────────────────────────────────────────────
//
//   · **고을만으로는 기한 안에 다 못 올린다.** 아껴 걷으면 늦고, 짜내면 모자란다. 반드시 찍게
//     된다 — 교과서가 적은 차례(원납전 → 당백전)를 학생이 제 손으로 밟는다.
//   · **찍기만 해도 끝낼 수 있다.** 한 번 찍어 들어오는 것이 그때 오르는 값보다 크다.
//   · 못 올리면 「아직」 뒤 처음부터 다시 한다. 거듭할수록 기한이 늘어난다.
//   시험이 이 셋을 손(봇)을 여럿 돌려 잰다(tests/systems/rebuild.test.js).
//
// ⚠ 액수를 짓지 않는다. 「냥」도 총액도 쓰지 않는다 — 그때 얼마였는지는 기록으로 정할 수 없다.
//   여기 수는 기제를 손으로 느껴 보기 위한 눈금일 뿐이고, RECON_NOTE 가 그렇게 밝힌다.
//   기한(1865 → 1868)은 공사를 시작한 해와 임금이 옮겨 온 해다. 시간은 줄여 흘린다.
//
// 이 파일은 셈만 한다. DOM 도 시계도 모른다 — 지난 시간(ms)을 받아 다음 판을 낸다.

export const BAYS = 10                  // 올려야 하는 채 수
export const VILLAGES = 8               // 고을 수
export const BAY_MS = 4000              // 돈이 있을 때 한 채가 올라가는 시간
export const TOTAL_MS = 70000           // 기한 — 1865 에서 1868 까지를 줄여 흘린다
export const YEAR_FROM = 1865           // 경복궁을 다시 짓기 시작한 해
export const YEAR_TO = 1868             // 임금이 경복궁으로 옮겨 온 해
export const LEVY_BASE = 5              // 원성이 없는 고을이 한 번에 내는 것
export const LEVY_DROP = 0.4            // 원성이 가득 찼을 때 줄어드는 몫
export const GRUDGE_PER_LEVY = 0.4      // 한 번 걷을 때 차는 원성
export const GRUDGE_FADE_PER_S = 0.008  // 두면 가라앉는 빠르기(1초에)
export const GRUDGE_SHOWN = 0.2         // 이만큼 차면 그림이 바뀐다
export const MINT_COIN = 34             // 한 번 찍을 때 들어오는 것
export const PRICE_BASE = 17            // 한 채를 올리는 데 드는 것
export const PRICE_PER_MINT = 3         // 한 번 찍을 때마다 오르는 값

export const RECON_NOTE =
  '※ 여기 수는 기제를 손으로 느껴 보기 위한 눈금입니다. 그때의 액수도, 물가가 몇 배가 되었는지도 기록으로는 정할 수 없어, 오르는 쪽과 깎이는 쪽만 보여줍니다. 시간은 줄여 흘립니다.'

export const WONNAP_GLOSS = '願 원하다 · 納 바치다 · 錢 돈'
export const DANGBAEK_GLOSS = '當 맞먹다 · 百 백 · 錢 돈'

// 거듭할수록 거든다(systems/minigame.js 와 같은 뜻 — 벌이 아니라 도움이 쌓인다).
export function easeFor(tries = 1) {
  // ⚠ 기한을 늘리지 않는다 — 날이 길어지면 고을이 그만큼 더 가라앉아, 「고을만으로는 모자란다」가
  //   깨진다(봇으로 재 보니 넷째 판에서 걷기만으로 끝났다). 대신 일꾼의 손이 빨라진다:
  //   드는 돈은 같고, 돈이 떨어져 서 있어도 되는 틈이 늘어난다.
  return {
    bayMs: tries >= 4 ? 2600 : tries >= 3 ? 3000 : tries >= 2 ? 3400 : BAY_MS,
    mintCoin: MINT_COIN + (tries >= 4 ? 20 : tries >= 3 ? 10 : 0),
    // 둘째 판부터, 돈이 떨어져 서 있으면 주전소가 빛난다 — 찍는 길을 못 찾은 학생이 갇히지 않게.
    mintCue: tries >= 2,
  }
}

export function initialBoard({ tries = 1 } = {}) {
  return {
    tries,
    ease: easeFor(tries),
    elapsed: 0,
    coin: 0,
    bays: 0,
    progress: 0,          // 지금 올리는 채가 얼마나 올라갔는가(0~1)
    mints: 0,
    levies: 0,
    stalledMs: 0,         // 돈이 없어 공사가 서 있던 시간
    villages: Array.from({ length: VILLAGES }, () => ({ grudge: 0, turned: false, taken: 0 })),
    over: null,           // 'done' | 'late'
  }
}

// ── 고을 ──────────────────────────────────────────────────────────────────

// 고을 하나가 지금 어떤 꼴인가. 화면이 그림을 고르는 데 쓴다.
export function villageState(board, i) {
  const v = board.villages?.[i]
  if (!v) return 'calm'
  if (v.turned) return 'empty'
  return v.grudge >= GRUDGE_SHOWN ? 'levied' : 'calm'
}

// 그 고을에서 이번에 걷히는 것. 원성이 찰수록 적게 낸다. 돌아선 고을은 내지 않는다.
export function levyYield(board, i) {
  const v = board.villages?.[i]
  if (!v || v.turned) return 0
  return Math.max(1, Math.round(LEVY_BASE * (1 - LEVY_DROP * Math.min(1, v.grudge))))
}

export const canLevy = (board, i) => !board.over && levyYield(board, i) > 0

// 이번에 걷으면 이 고을이 돌아서는가 — 화면이 미리 붉게 알린다.
export function wouldTurn(board, i) {
  const v = board.villages?.[i]
  return !!v && !v.turned && v.grudge + GRUDGE_PER_LEVY >= 1 - 1e-9
}

export function levy(board, i) {
  if (!canLevy(board, i)) return board
  const got = levyYield(board, i)
  const villages = board.villages.map((v, k) => {
    if (k !== i) return v
    const grudge = v.grudge + GRUDGE_PER_LEVY
    return { grudge, turned: grudge >= 1 - 1e-9, taken: v.taken + 1 }
  })
  return { ...board, coin: board.coin + got, levies: board.levies + 1, villages }
}

export const emptyVillages = board => board.villages.filter(v => v.turned).length
export const levyLeft = board => board.villages.filter(v => !v.turned).length

// ── 주전소 ────────────────────────────────────────────────────────────────

export function mint(board) {
  if (board.over) return board
  return { ...board, coin: board.coin + board.ease.mintCoin, mints: board.mints + 1 }
}

// 한 채를 올리는 데 드는 것. 찍을수록 오른다.
export function price(board) {
  return PRICE_BASE + PRICE_PER_MINT * (board.mints ?? 0)
}

// 값이 처음의 몇 배가 되었는가. 학생이 끝에서 보는 수.
export const priceTimes = board => price(board) / PRICE_BASE

// ── 시간 ──────────────────────────────────────────────────────────────────

export const isWorking = board => !board.over && board.bays < BAYS && board.coin > 0
export const isDone = board => board.over === 'done'
export const isLate = board => board.over === 'late'
export const timeRatio = board => Math.min(1, board.elapsed / TOTAL_MS)
export const yearAt = board => Math.min(YEAR_TO, Math.floor(YEAR_FROM + (YEAR_TO - YEAR_FROM) * timeRatio(board)))

/** 시간이 흐른다 — 돈이 있으면 공사가 올라가고, 고을의 원성은 가라앉는다. */
export function tick(board, dtMs) {
  if (board.over || !(dtMs > 0)) return board
  const fade = GRUDGE_FADE_PER_S * dtMs / 1000
  const villages = board.villages.map(v => (v.turned || v.grudge <= 0 ? v : { ...v, grudge: Math.max(0, v.grudge - fade) }))

  let { coin, bays, progress, stalledMs } = board
  const bayMs = board.ease.bayMs
  const perMs = price(board) / bayMs       // 일하는 동안 1ms 에 나가는 돈
  let left = dtMs
  while (left > 0 && bays < BAYS && coin > 1e-9) {
    const use = Math.min(left, (1 - progress) * bayMs, coin / perMs)
    progress += use / bayMs
    coin -= use * perMs
    left -= use
    if (progress >= 1 - 1e-9) { bays++; progress = 0 }
  }
  if (coin < 1e-9) coin = 0
  if (bays < BAYS) stalledMs += left       // 돈이 없어 서 있던 시간 — 그래도 날은 간다

  const elapsed = board.elapsed + dtMs
  const over = bays >= BAYS ? 'done' : elapsed >= TOTAL_MS ? 'late' : null
  return { ...board, villages, coin, bays, progress, stalledMs, elapsed, over }
}

// ── 화면에 뜨는 줄 ────────────────────────────────────────────────────────
//
// 「깎였다/올랐다」를 숫자로 말하지 않는다. 일어난 일을 말한다.

export const FIRST_LEVY_LINE =
  '스스로 원하여 바치는 돈이라 하였으나, 고을마다 낼 액수를 위에서 정해 내려보냈다.'
export const FIRST_MINT_LINE =
  '한 개를 상평통보 백 개로 쳐서 쓰게 하였다. 백 배로 정했을 뿐, 그만한 값어치가 있는 것은 아니다.'
export const TURNED_LINE = '이 고을은 돌아섰다. 원해서 내는 돈이, 원망하며 내는 돈이 되었다.'
export const GRUDGE_LINE = '원성이 가라앉기 전에 또 걷었다. 내는 것이 줄었다.'
export const PRICE_UP_LINE = '돈이 흔해지자, 한 채를 올리는 값이 올랐다.'
export const STALL_LINE = '돈이 떨어졌다. 일꾼들이 손을 놓았다 — 그래도 날은 간다.'
export const START_LINE = '돈이 있어야 공사가 시작된다. 고을에서 걷거나, 주전소에서 찍는다.'

/**
 * 판이 바뀐 뒤 내미는 한 줄. 없으면 null.
 * prev·next 를 견주어 **이번에 실제로 일어난 일**만 말한다.
 */
export function nudgeFor(prev, next) {
  if (!prev || !next) return null
  if (next.mints > prev.mints) return prev.mints === 0 ? FIRST_MINT_LINE : PRICE_UP_LINE
  if (next.levies > prev.levies) {
    if (emptyVillages(next) > emptyVillages(prev)) return TURNED_LINE
    if (prev.levies === 0) return FIRST_LEVY_LINE
    const i = next.villages.findIndex((v, k) => v.taken > prev.villages[k].taken)
    if (i >= 0 && prev.villages[i].grudge >= GRUDGE_SHOWN) return GRUDGE_LINE
    return null
  }
  // 돈이 방금 떨어졌다.
  if (prev.coin > 0 && next.coin === 0 && !next.over) return STALL_LINE
  return null
}

// 「아직」 화면에 실을 까닭과 거드는 말.
export function againReason(board) {
  return `${YEAR_TO}년이 되도록 다 올리지 못했다. 돈이 떨어져 공사가 서 있던 동안에도 날은 갔다.`
}

export const AGAIN_COPY = {
  hint: '공사는 돈이 있는 동안에만 올라갑니다. 돈이 떨어지기 전에 미리 걷거나 찍어 두십시오.',
  strong: '고을만으로는 모자랍니다. 주전소에서 찍으면 바로 큰돈이 생깁니다 — 다만 한 채 값이 오릅니다.',
}

// 끝난 뒤 학생의 셈을 한 줄로. 기록에 남는 말이기도 하다.
export function summaryLine(board) {
  const turned = emptyVillages(board)
  const times = priceTimes(board)
  const villageWord = turned === 0 ? '돌아선 고을은 없었고' : `고을 ${turned}곳이 돌아섰고`
  const mintWord = board.mints === 0 ? '돈은 한 번도 찍지 않았다'
    : `돈을 ${board.mints}번 찍어 한 채 값이 처음의 ${times.toFixed(1)}배가 되었다`
  return `경복궁을 다 올렸다 — ${villageWord}, ${mintWord}.`
}

export function boardResult(board) {
  if (isDone(board)) {
    return {
      cleared: true,
      bays: board.bays,
      mints: board.mints,
      emptied: emptyVillages(board),
      priceTimes: Number(priceTimes(board).toFixed(2)),
      summary: summaryLine(board),
    }
  }
  return { cleared: false, reason: againReason(board) }
}
