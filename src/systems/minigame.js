// 손으로 하는 장면은 **해내야 넘어간다.**
//
// 선생님(2026-09-30): 「조여.」 그리고 「원납전, 당백전 이거도 미니게임으로 제대로
// 만들라고. 나머지 셋도 마찬가지고.」
//
// 이 게임에서 학생이 손으로 하는 자리는 넷이다 — 척화비 넉 자, 겨와 모래,
// 돈을 만든다(원납전·당백전), 장계 순서. 지금까지 이것들은 **해내지 못해도 그냥
// 넘어갔다.** 그러면 손으로 하는 자리가 구경거리가 된다. 해내야 넘어가게 조인다.
//
// ── 낱말을 고른 까닭 ──────────────────────────────────────────────────────
//
// 이 게임에는 점수도, 정답도, 오답도 없다(tests 가 그 낱말들을 잠가 두었다).
// 「틀렸습니다」는 시험의 말이고 이 게임은 시험이 아니다. 그래서:
//
//   해냈다   cleared   조건을 채웠다. 다음으로 간다.
//   아직이다 again     아직 못 채웠다. **처음부터 다시 한다.**
//
// 「아직」은 학생을 깎지 않으면서도 넘어가지 못한다는 것을 분명히 말한다.
//
// ── 몇 번째냐에 따라 말이 달라진다 ────────────────────────────────────────
//
// 같은 말을 세 번 보여 주면 학생은 자기가 무엇을 잘못하는지 모른 채 세 번 진다.
// 그래서 거듭할수록 **더 일러 준다**. 벌이 아니라 도움이 쌓이는 쪽이다.
// 이것이 「실패하면 처음으로」를 견딜 만하게 만드는 유일한 장치다.

export const CLEARED = 'cleared'
export const AGAIN = 'again'

// 몇 번째부터 거들 것인가. 첫 판은 스스로 해 보게 두고, 두 번째부터 일러 준다.
export const HINT_FROM = 2
export const STRONG_HINT_FROM = 3

/**
 * 다시 하기 화면에 실을 것.
 *
 *   tries   지금까지 해 본 횟수(1부터)
 *   reason  왜 아직인가 — 그 장면이 제 말로 적어 보낸다(예: '넉 자를 다 쓰지 못했다')
 *   hint    한 번 거들 말
 *   strong  더 자세히 거들 말
 *
 * 돌려주는 것: { title, lines, label }
 */
export function againView({ tries = 1, reason = '', hint = '', strong = '' } = {}) {
  const lines = []
  if (reason) lines.push(reason)
  if (tries >= HINT_FROM && hint) lines.push(hint)
  if (tries >= STRONG_HINT_FROM && strong) lines.push(strong)
  lines.push('처음부터 다시 합니다.')
  return { title: '아직', lines, label: '다시 한다' }
}

/**
 * 해낼 때까지 되풀이한다.
 *
 *   play(tries)     한 판을 돌린다. { cleared, reason? } 를 돌려주기로 한다.
 *   showAgain(view) 「아직」 화면을 띄우고 학생이 누르면 풀린다.
 *   copy            { hint, strong } — 그 장면의 거드는 말
 *
 * 돌려주는 것: { tries } — 몇 판 만에 해냈는가. 기록에 남길 수 있다.
 *
 * ⚠ 무한히 돈다. 그것이 이 함수의 일이다 — 「해내야 넘어간다」가 곧 그 뜻이다.
 *   다만 play() 가 { cleared:true } 를 낼 길이 **반드시** 있어야 한다. 낼 수 없는
 *   판을 여기에 물리면 학생은 영영 갇힌다. 그래서 네 장면 모두 「몇 번을 해도
 *   해낼 수 있는가」를 시험으로 따로 붙든다.
 */
export async function untilCleared(play, showAgain, copy = {}) {
  for (let tries = 1; ; tries++) {
    const result = await play(tries)
    if (result?.cleared) return { tries }
    await showAgain(againView({ tries, reason: result?.reason, hint: copy.hint, strong: copy.strong }))
  }
}
