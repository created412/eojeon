// 종이를 CSS 변수 하나로 걸어 둔다.
//
// 왜 변수인가: 종이를 쓰는 화면이 여럿이고(사료 카드·장계·글 화면·대화판) 그 화면들의
// CSS 는 정적 문자열이다. 변수로 걸어 두면 각 화면은 `background-image: var(--hanji)`
// 한 줄만 적으면 되고, **종이가 없을 때는 그 줄이 통째로 무효가 되어** 지금까지의
// 단색 바탕이 그대로 남는다. 그림이 안 실린 빌드에서도 화면이 깨지지 않는다.
import { PAPER } from './paper-data.js'

export function installPaperVars(doc = document) {
  const r = doc.documentElement?.style
  if (!r) return
  if (PAPER.hanji) r.setProperty('--hanji', `url(${PAPER.hanji})`)

  // ── 장계 두 벌 (2026-09-27) ────────────────────────────────────────────
  // 2026-09-27 선생님: 「장계를 힉스필드 써서 진짜 장계 올라온 거처럼 만들라는 게
  // 하나도 반영이 안 되었어.」
  //
  // 어제까지 여기 걸려 있던 --janggye(세로 한 장)·--janggye-wide(가로 한 장)는
  // 화면에서 사실상 보이지 않았다. 먹이 종이빛과 거의 같은 엷은 회색이었고, 카드는
  // 그 위에 또 반투명 크림빛을 한 겹 덮었으며, 붉은 인장은 카드가 잘라 먹는 자리에
  // 있었다. 남은 것은 누런 얼룩 한 칸이었다 — 선생님이 「하나도 반영이 안 되었다」고
  // 하신 것이 정확했다.
  //
  // 그래서 장계를 **두 상태**로 다시 그렸다. 장계는 파발이 접어서 지고 온 것이고,
  // 승지가 그것을 편다 — 그 두 순간이 곧 이 두 그림이다.
  //
  //   --janggye-sealed : 접어 묶고 붉은 인장으로 봉한 꾸러미. 아직 펴지 않은 장계다.
  //   --janggye-open   : 펴 놓은 한 장. 접힌 자국 세 줄이 가로로 지나가고, 세로
  //                      붓글씨 줄이 내려 그어지고, 붉은 인장 둘이 찍혀 있다.
  //
  // ⚠ 둘 다 **종이**일 뿐, 글이 아니다. 그림에 그려진 한문은 읽으라고 둔 것이
  //    아니고, 학생이 읽는 장계 글은 언제나 진짜 DOM 글자다 — 그림을 못 싣는
  //    빌드에서는 background-image 한 줄이 무효가 되고 단색 종이빛만 남는다.
  //    글은 한 글자도 사라지지 않는다.
  if (PAPER.janggyeOpen) r.setProperty('--janggye-open', `url(${PAPER.janggyeOpen})`)
  if (PAPER.janggyeSealed) r.setProperty('--janggye-sealed', `url(${PAPER.janggyeSealed})`)
}
