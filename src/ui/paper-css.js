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
}
