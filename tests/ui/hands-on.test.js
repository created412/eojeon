import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MIX_NOTE } from '../../src/systems/grain-tray.js'

// 손으로 하는 두 자리(2026-09-25 선생님: 「손으로 하는 일을 늘립니다 — 쌀에서 겨와
// 모래 골라내기(4막), 장계 도착 순서 맞추기(2·3막)」)의 배선을 잰다.
//
// vitest 환경이 node 라 DOM 이 없다 — 그래서 판정은 전부 systems 로 뺐고
// (systems/grain-tray.js·systems/dispatch.js, 각자의 시험이 따로 있다), 여기서는
// tests/ui/pause.test.js·tests/ui/hold-screen.test.js 와 같은 방식으로 화면 모듈의
// 글자를 본다. 완벽한 검사가 아니라, 이 두 화면에서 실제로 부러질 수 있는 것들만
// 못 박는다 — 태블릿에서 손짓이 안 먹는 것, 갇히는 학생, 채점하는 말투,
// 그리고 「재구성을 사실로 읽히게 두는 것」.

const stripComments = src => src.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')
const readUi = name => readFileSync(join(process.cwd(), 'src', 'ui', name), 'utf8')

const rationRaw = readUi('ration.js')
const dispatchRaw = readUi('dispatch-map.js')
const ration = stripComments(rationRaw)
const dispatch = stripComments(dispatchRaw)

describe('4막 무위영 — 겨와 모래를 손으로 골라낸다', () => {
  it('판정은 화면에 없다 — systems/grain-tray.js 를 불러 쓴다', () => {
    expect(ration).toMatch(/from '\.\.\/systems\/grain-tray\.js'/)
    expect(ration).toMatch(/createTray|hitAt|isSorted/)
  })

  it('낟알은 코드로 그린다 — 새 그림 파일을 들이지 않는다(바깥 요청 0)', () => {
    expect(ration).toContain('<canvas class="tray"')
    expect(ration).toMatch(/getContext\('2d'\)/)
    // 낟알 그림 파일을 새로 가져오는 자리가 없다
    expect(ration).not.toMatch(/grain[-.]?\w*\.(png|jpg|webp|svg)/i)
  })

  // 태블릿에서 이 한 줄이 없으면 낟알을 쓸려는 손짓이 「화면 넘기기」로 먹혀
  // 한 알도 집히지 않는다. 마우스·펜·손가락을 한 길(pointer events)로 받는다.
  it('마우스·펜·손가락이 모두 된다', () => {
    expect(ration).toContain('touch-action:none')
    expect(ration).toContain("addEventListener('pointerdown'")
    expect(ration).toContain("addEventListener('pointermove'")
    expect(ration).not.toMatch(/addEventListener\('mousedown'/)
  })

  // 손가락이 마음대로 움직이지 않는 학생이 이 화면에서 갇히면 그 자리에서 수업이 멈춘다.
  it('아무도 갇히지 않는다 — 건너뛸 단추가 있고, 단추이므로 키보드로도 눌린다', () => {
    expect(ration).toContain('손이 불편하면 건너뛴다')
    expect(ration).toMatch(/<button class="skip">손이 불편하면 건너뛴다<\/button>/)
    expect(ration).toContain('pickAll')
    expect(ration).toContain('.ration button:focus-visible')
  })

  it('쌀을 눌러도 벌하지 않는다 — 한 줄 알려 줄 뿐이다', () => {
    expect(ration).toContain('RICE_NUDGE')
    expect(ration).not.toMatch(/실점|감점|목숨|벌점/)
  })

  // 남은 것이 「쌀」이 아니라 「열세 달치 급료」라는 것 — 그 한 줄이 이 화면의 값이다
  // (문구 자체는 systems/grain-tray.js 의 wageLine, 거기서 따로 잰다).
  it('다 골라낸 뒤 급료 줄이 나오고, 그 다음이 예전 reveal 이다', () => {
    expect(ration).toContain('wageLine')
    expect(ration).toContain('교과서는 이것을 한 줄로 적었다')
    expect(ration).toMatch(/addEventListener\('click', reveal\)/)
    expect(ration).toContain('view.ration.reveal')
  })

  it('재구성 고지와 출처가 그대로 남아 있다 — 비율을 주장하지 않는다', () => {
    expect(ration).toContain('MIX_NOTE')
    expect(MIX_NOTE).toContain('비율을 나타낸 것은 아닙니다')
    expect(ration).toContain('당시 섞인 비율을 나타낸 것은 아닙니다')   // reveal 의 원래 고지
    expect(ration).toContain('RICE_NOTE')
    expect(ration).toMatch(/\$\{s\.origin\}/)
    expect(ration).toMatch(/\$\{r\.origin\}/)
  })

  // ⚠ 절대 쌀값은 한 글자도 나가지 않는다(판정 R19).
  it('절대 쌀값이 새지 않는다', () => {
    expect(ration).not.toMatch(/냥/)
  })

  it('시계가 없다 — 촉박은 C1·C2·C3 세 번뿐이다', () => {
    expect(ration).not.toMatch(/setTimeout|setInterval|Date\.now|performance\.now/)
  })

  it('약속은 한 번만 풀린다 — main.js 의 await ration.open(view) 가 그대로다', () => {
    expect(ration).toContain('open(view)')
    expect(ration.match(/resolve\(\)/g)).toHaveLength(1)
  })

  it('새 클래스는 모두 .ration 안에 있다', () => {
    for (const name of ['tray-wrap', 'tray-count', 'nudge', 'hand-help', 'wage-line']) {
      expect(ration, name).toContain(`.ration .${name}`)
    }
    expect(ration).toContain('.ration canvas.tray')
    expect(ration).toContain('.ration button.skip')
  })

  it('400px 폭에서도 판이 화면을 넘지 않는다', () => {
    // 가로 스크롤을 만들지 않는 폭으로만 판을 깐다
    expect(ration).toMatch(/width:min\(620px,92vw\)/)
    expect(ration).toContain('@media(max-width:600px)')
  })
})

describe('2·3막 장계 — 일어난 순서로 놓아 본다', () => {
  it('판정은 화면에 없다 — systems/dispatch.js 를 불러 쓴다', () => {
    expect(dispatch).toMatch(/shouldOfferOrdering/)
    expect(dispatch).toMatch(/orderingVerdict/)
    expect(dispatch).toMatch(/arrivalOrder/)
    // 날수 셈을 화면에서 다시 하지 않는다 — sentDay·lagDays 산술이 여기 없다
    expect(dispatch).not.toMatch(/sentDay/)
    expect(dispatch).not.toMatch(/lagDays/)
  })

  it('물음이 성립하는 자리에서만 내준다 — 아니면 예전 화면 그대로다', () => {
    expect(dispatch).toMatch(/if \(shouldOfferOrdering\(view\.dispatches, view\.day\)\) orderStep\(\)\s*\n\s*else mapStep\(\)/)
  })

  it('눌러서 자리 바꾸기와 한 칸 단추 둘이 다 있다 — 끌어 놓기만으로 되는 길은 없다', () => {
    expect(dispatch).toContain('class="order-card"')
    expect(dispatch).toContain('aria-pressed="${picked === id}"')
    expect(dispatch).toContain('class="order-up"')
    expect(dispatch).toContain('class="order-down"')
    expect(dispatch).not.toMatch(/draggable|dragstart|dragover/)
  })

  it('키보드로 된다 — 자리를 옮긴 뒤 초점이 그 장계로 돌아온다', () => {
    expect(dispatch).toMatch(/aria-label="\$\{d\.placeName\} 장계를 한 칸 위로"/)
    expect(dispatch).toMatch(/\.focus\?\.\(\)/)
    expect(dispatch).toContain('.order-card:focus-visible')
  })

  it('채점하지 않는다 — 화면에 점수도 정답 표시도 없다', () => {
    expect(dispatch).not.toMatch(/오답|정답|점수|맞았습니다|틀렸/)
  })

  it('참된 순서를 보여 준 뒤, 예전의 지도와 장계로 이어진다', () => {
    expect(dispatch).toContain('class="order-truth"')
    expect(dispatch).toContain('happenedLabel')
    expect(dispatch).toContain('travelLabel')
    expect(dispatch).toMatch(/addEventListener\('click', mapStep\)/)
    expect(dispatch).toContain('${view.cannotGo}')
    expect(dispatch).toContain('noticeFor(d)')     // 장계의 재구성·번역 고지가 그대로다
  })

  it('약속은 한 번만 풀린다 — 놓아 보기를 지나도 한 번이다', () => {
    expect(dispatch).toContain('show(view)')
    expect(dispatch.match(/resolve\(\)/g)).toHaveLength(1)
  })

  it('시계가 없다', () => {
    expect(dispatch).not.toMatch(/setTimeout|setInterval|Date\.now|performance\.now/)
  })

  it('새 클래스는 모두 .dispatch 안에 있고, 400px 폭에 들어간다', () => {
    for (const name of ['order-help', 'order-aside', 'order-list', 'order-item', 'order-card',
      'order-moves', 'order-verdict', 'order-truth', 'order-note']) {
      expect(dispatch, name).toContain(`.dispatch .${name}`)
    }
    expect(dispatch).toContain('width:min(650px,92vw)')
    expect(dispatch).toContain('@media(max-width:450px)')
  })
})
