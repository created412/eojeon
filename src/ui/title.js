import { createPrologue } from './prologue.js'
import { actSpan, nativeCount } from './act-end.js'

// 첫 화면은 V23 영상이다. TITLE은 연도·문구를 공유하는 기존 메타데이터로 유지한다.
// 게임 시작과 이어하기는 영상 위 단추에서 각각 기존 콜백을 호출한다.

// 첫 화면의 연대는 손으로 적지 않는다. 예전에는 「1863 — 1884」가 박혀 있었는데
// 실제 데이터가 닿는 곳은 1882 였다(5막이 아직 없다) — 역사 게임의 첫 화면이
// 사실과 어긋나 있었던 것이다. 같은 종류를 3막 끝 화면에서 이미 한 번 겪었다:
// 「1863년부터 1877년까지, 열네 해」가 4막이 붙은 뒤에도 그대로 남아 있었다.
// actSpan() 은 막과 비트의 year 를 실제로 훑는다 — 5막이 붙는 날 저절로 1884 가 된다.
const yearsLabel = () => {
  const { from, to } = actSpan()
  return `${from} — ${to}`
}

// 햇수도 같은 자리에서 뽑는다(판정 R101). 손으로 「스무 해」라고 적혀 있었는데
// 1863~1884 는 스물한 해이고, 마지막 화면은 이미 actSpan() 으로 「스물한 해를
// 지났다」고 적고 있었다 — 이 게임의 엔딩이 학생에게 정확히 세라고 요구하는데
// 첫 화면이 한 해 틀려 있었던 것이다. 두 수를 손으로 두 번 적지 않는다.
const spanLine = () => `${nativeCount(actSpan().span)} 해 동안 이 궁에서 저 궁으로 옮겨 다녔다.`

// 문구는 선생님이 정한 것이다. tests/ui/title.test.js 가 글자 그대로 붙든다.
export const TITLE = Object.freeze({
  name: '어 전  御 前',
  years: yearsLabel(),
  lines: Object.freeze([
    '열두 살에 왕이 되었다.',
    spanLine(),
    '읽은 문서만, 어전에서 말할 수 있다.',
  ]),
  fresh: '처음부터',
  resume: '이어서 하기',
  sound: '소리',
  soundOn: '켜짐',
  soundOff: '꺼짐',
  // 교실용 문구다. 빼지 마라 — 30대의 태블릿이 동시에 소리를 낸다.
  earphone: '이어폰이 없으면 소리를 끄고 하세요',
})

// 2026-10-05: 별도 메뉴판 없이 영상 자체가 첫 화면이다.
export function createTitle(root) {
  const prologue = createPrologue(root)
  return {
    isOpen: prologue.isOpen,
    close: prologue.close,
    show({ hasSave = false, notice = '', audio = null, onFresh, onResume, onPrologueStart, onHelp } = {}) {
      onPrologueStart?.()
      prologue.open({ audio, hasSave, notice, onDone: onFresh, onResume, onHelp })
    },
  }
}
