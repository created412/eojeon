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
    expect(dispatch).toContain('class="order-card janggye"')
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

  // 2026-09-26 선생님: 「장계의 순서를 정하는거도 틀린지도 모르겠어. 제대로 놓기
  // 전까지는 안넘어가야해.」 붙잡는 일과 벌하는 일을 갈라서 잰다.
  it('제대로 놓기 전에는 넘어가지 않는다 — 다음 화면은 순서대로일 때만 열린다', () => {
    expect(dispatch).toContain('isInHappenedOrder')
    expect(dispatch).toMatch(/if \(isInHappenedOrder\(view\.dispatches, placed\)\) \{ truthStep\(placed\); return \}/)
    // 어긋난 줄로 truthStep 에 들어가는 다른 길이 없다
    expect(dispatch.match(/truthStep\(/g)).toHaveLength(2)   // 정의 한 번, 부름 한 번
  })

  it('다시 놓아 볼 수 있다 — 판은 그대로 남고 한 줄만 더해진다', () => {
    expect(dispatch).toContain('class="order-hint"')
    expect(dispatch).toContain('orderingHint')
    expect(dispatch).toMatch(/tries \+= 1/)
    // 놓인 것을 흩뜨리거나 처음으로 되돌리는 자리가 없다
    expect(dispatch).not.toMatch(/order\s*=\s*cards\.map\(d => d\.id\)[\s\S]{0,400}tries \+= 1[\s\S]{0,200}order\s*=/)
  })

  it('말은 systems 가 만든다 — 화면이 힌트 문구를 짓지 않는다', () => {
    expect(dispatch).toMatch(/orderingHint\(view\.dispatches, view\.day, placed, tries\)\.text/)
    expect(dispatch).not.toMatch(/아직 아니다/)
  })

  it('붙잡되 벌하지 않는다 — 횟수도, 남은 기회도 화면에 적지 않는다', () => {
    expect(dispatch).not.toMatch(/실패|오답|번째 시도|남은 기회|기회가|다시 처음부터/)
    // 시계가 없다는 것은 아래에서 따로 잰다 — 여기서는 「세어 보이는 것」만 본다
    expect(dispatch).not.toMatch(/\$\{tries\}/)
  })

  it('화면을 눈으로 좇지 않는 학생에게도 그 한 줄이 읽힌다', () => {
    expect(dispatch).toMatch(/class="order-hint" role="status" aria-live="polite"/)
  })

  // 읽으면 풀리는 물음이어야 한다 — 표제만 보고 찍게 두면 이 자리는 동전 던지기다
  it('카드에 장계 본문이 실린다 — 일의 앞뒤는 그 글 안에 적혀 있다', () => {
    expect(dispatch).toContain('class="order-text"')
    expect(dispatch).toMatch(/\$\{d\.body \?\? ''\}/)
    expect(dispatch).toContain('적힌 일')
    expect(dispatch).toContain('일어날 수 있었는지')
  })

  // 2026-09-26 선생님: 「장계가 그냥 텍스트가 아니라 실제 장계같은 모습이어야하고,
  // 힉스필드 활용해서 실제 장계처럼 만들어봐.」 종이를 깔되, 종이를 사실로 읽히게
  // 두지 않는다 — ration.js 의 MIX_NOTE 와 같은 규칙이다.
  it('장계는 장계 종이 위에 앉는다 — 기존 종이 변수 체계를 그대로 쓴다', () => {
    expect(dispatch).toContain('.dispatch .janggye')
    expect(dispatch).toContain('var(--janggye-wide)')
    expect(dispatch).toContain('background-size:100% 100%')
    expect(dispatch).not.toMatch(/background-size:cover/)
    // 그림 파일을 화면이 직접 들이지 않는다 — 종이는 CSS 변수로만 온다(ui/paper-css.js)
    expect(dispatch).not.toMatch(/data:image\/(webp|png)/)
  })

  it('종이가 없는 빌드에서도 글이 남는다 — 단색 종이빛을 먼저 깔아 둔다', () => {
    expect(dispatch).toMatch(/\.dispatch \.janggye[^{]*\{background:#[0-9a-f]{6};color:#[0-9a-f]{6}/)
  })

  it('재구성 고지가 있다 — 깔린 종이를 그 장계의 사진으로 읽히게 두지 않는다', () => {
    expect(dispatch).toContain('PAPER_NOTE')
    expect(dispatchRaw).toContain('재구성 그림')
    expect(dispatchRaw).toContain('사진이 아니')
    // 장계 종이가 깔린 세 화면 모두에 나간다 — 놓아 보기·참된 순서·지도
    expect(dispatch.match(/\$\{PAPER_NOTE\}/g)).toHaveLength(3)
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
      'order-moves', 'order-verdict', 'order-truth', 'order-note',
      'order-hint', 'order-recon', 'janggye']) {
      expect(dispatch, name).toContain(`.dispatch .${name}`)
    }
    expect(dispatch).toContain('width:min(650px,92vw)')
    expect(dispatch).toContain('@media(max-width:450px)')
  })
})
