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
  if (PAPER.janggye) r.setProperty('--janggye', `url(${PAPER.janggye})`)
  // 가로로 넓은 장계 한 장 — 세로 괘선에 붓글씨가 내려 그어지고, 접힌 자국이 지나고,
  // 왼쪽 아래에 붉은 인장이 찍힌 종이다(assets/paper/janggye-wide.png).
  //
  // 왜 --janggye 로 되지 않는가: 그것은 세로로 긴 한 장(3:4)이라, 장계 「카드」처럼
  // 납작한 칸에 100% 100% 로 펴면 세로 괘선이 뭉개진다. 2026-09-26 선생님:
  // 「장계가 그냥 텍스트가 아니라 실제 장계같은 모습이어야하고.」 카드는 카드 모양의
  // 종이를 깔아야 한다.
  //
  // ⚠ 종이일 뿐, 글이 아니다. 그림에 적힌 한문은 읽히라고 둔 것이 아니고, 학생이
  //    읽는 장계 글은 언제나 진짜 DOM 글자다 — 그림을 못 싣는 빌드에서도 글은 남는다.
  if (PAPER.janggyeWide) r.setProperty('--janggye-wide', `url(${PAPER.janggyeWide})`)
}
