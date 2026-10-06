import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
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
  // 선생님(2026-09-30) 「조여」 — 거저 넘어가는 길을 닫았다. 다만 **갇히지 않는다**는
  // 것은 그대로다: 거드는 단추는 남아 있고, 한 알만 집으면 열린다. 한 알은 누구나
  // 집을 수 있다(누른 채 끌기만 해도 쓸린다).
  it('거드는 길이 남아 있다 — 손이 불편해도 갇히지 않는다', () => {
    expect(ration).toContain('손이 불편하다 — 남은 것을 쓸어 담는다')
    expect(ration).toContain('pickAll')
    expect(ration).toContain('.ration button:focus-visible')
  })

  it('거저 넘어갈 수는 없다 — 한 알도 안 집었으면 그 단추가 없다', () => {
    // 판이 열릴 때는 숨어 있고(hidden), 집는 데 성공한 뒤에 열린다.
    expect(ration).toMatch(/<button class="skip" hidden>/)
    expect(ration).toContain('assist.hidden = false')
    // 그 줄이 「집는 데 성공했을 때」 안에 있어야 한다 — 쌀을 눌러 되돌아가는
    // 갈래(result.taken 이 거짓)보다 뒤에 있는지를 본다.
    const at = ration.indexOf('assist.hidden = false')
    const bail = ration.indexOf('if (!result.taken)')
    expect(bail).toBeGreaterThan(-1)
    expect(at).toBeGreaterThan(bail)
  })

  it('쌀을 눌러도 벌하지 않는다 — 한 줄 알려 줄 뿐이다', () => {
    expect(ration).toContain('RICE_NUDGE')
    expect(ration).not.toMatch(/실점|감점|목숨|벌점/)
  })

  // 남은 것이 「쌀」이 아니라 「열세 달치 급료」라는 것 — 그 한 줄이 이 화면의 값이다
  // (문구 자체는 systems/grain-tray.js 의 wageLine, 거기서 따로 잰다).
  // 선생님(2026-10-06): 「쌀을 고르게 하는 것과 이어서 임오군란이 일어난 이유를 직관적으로 게임을
  // 하며 느낄 수 있어야 해.」 — 가마 앞에 열세 달이, 가마 뒤에 섬과 군졸들의 소리가 선다.
  it('차례가 까닭 그대로다 — 열세 달 → 가마 → 골라낸다 → 섬 → 군졸들의 소리 → 교과서', () => {
    const at = name => ration.indexOf(`function ${name}(`)
    for (const name of ['market', 'wait', 'sack', 'handPick', 'measure', 'burst', 'reveal']) expect(at(name), name).toBeGreaterThan(-1)
    expect(ration).toMatch(/addEventListener\('click', wait\)/)        // 종로 → 열세 달
    expect(ration).toMatch(/addEventListener\('click', measure\)/)     // 골라낸 뒤 → 섬
    expect(ration).toContain('burst()')                                // 섬 → 군졸들의 소리
    const ACT4 = ACTS[3].beats.flatMap(b => b.stops ?? []).map(s => s.beat).find(b => b?.ration).ration
    expect(ACT4.wait.months).toBe(13)
    expect(ACT4.wait.came).toContain('한 달 치')
    expect(ACT4.measure.quote).toContain('무위소의 군사가 받는 것은 완전하고')
    expect(ACT4.measure.note).toContain('기록에 없습니다')
    expect(ACT4.burst.cry).toContain('13개월 동안 급료를 주지 않다가')
    expect(ACT4.burst.happened.join(' ')).toContain('포도청')
    for (const text of [ACT4.wait.origin, ACT4.measure.quoteBy, ACT4.burst.cryBy]) expect(text).toContain('『고종실록』')
  })

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

// ── 2·3막 장계 — 한 화면에서 펴고, 지도에 놓고, 순서를 세운다 ──────────────
//
// 2026-09-27 선생님: 「장계를 힉스필드 써서 진짜 장계 올라온 거처럼 만들라는 게
// 하나도 반영이 안 되었어. 장계 순서 펴 보는 거랑 지도에서 장계의 위치 찾아보는
// 걸 하나로 합치는 게 좋을 것 같아.」
//
// 그래서 이 묶음이 재는 것이 하나 늘었다 — 「두 화면이 하나인가」. 예전에는
// 놓아 보기(orderStep)를 다 끝내야 지도(mapStep)가 나왔고, 이 시험도 그 둘을
// 따로 쟀다. 이제 그런 단계가 없다: 지도와 장계가 같은 판에 있고, 장계를 지도에
// 놓는 일이 곧 순서를 세우는 일이다.
describe('2·3막 장계 — 펴고, 지도에 놓고, 일어난 순서로 세운다', () => {
  it('판정은 화면에 없다 — systems/dispatch.js 를 불러 쓴다', () => {
    expect(dispatch).toMatch(/shouldOfferOrdering/)
    expect(dispatch).toMatch(/orderingVerdict/)
    expect(dispatch).toMatch(/arrivalOrder/)
    // 자리를 맞게 짚었는지도 화면이 판정하지 않는다(2026-09-27에 새로 생긴 일)
    expect(dispatch).toMatch(/belongsAt/)
    expect(dispatch).toMatch(/allPlaced/)
    // 날수 셈을 화면에서 다시 하지 않는다 — sentDay·lagDays 산술이 여기 없다
    expect(dispatch).not.toMatch(/sentDay/)
    expect(dispatch).not.toMatch(/lagDays/)
    // 지도 표지에 붙는 「4일」도 systems 가 짓는다
    expect(dispatch).toMatch(/travelShortLabel/)
  })

  // 선생님이 이르신 「하나로 합치기」가 실제로 한 화면인지를 잰다. 예전 구조가
  // 되살아나면(순서 화면 → 지도 화면) 여기서 걸린다.
  it('지도와 장계가 한 판에 있다 — 순서 화면과 지도 화면이 따로 있지 않다', () => {
    expect(dispatch).toContain('class="dispatch-layout"')
    expect(dispatch).toContain('class="map-pins"')
    expect(dispatch).toContain('class="order-list"')
    // 화면을 갈아 끼우던 두 단계가 없다
    expect(dispatch).not.toMatch(/function orderStep|function mapStep|function truthStep/)
    expect(dispatch).not.toMatch(/mapStep\(\)|orderStep\(\)/)
    // 판은 한 번만 세우고 안쪽만 다시 그린다 — el.innerHTML 을 갈아 끼우는 자리가 하나다
    expect(dispatch.match(/el\.innerHTML\s*=/g)).toHaveLength(1)
  })

  it('장계를 지도에 놓는 일이 곧 순서를 세우는 일이다 — 세운 순서가 지도에 뜬다', () => {
    expect(dispatch).toContain('data-nth')                  // 표지 안에 뜨는 줄 번호
    expect(dispatch).toContain('class="map-hotspot"')
    expect(dispatch).toMatch(/dropAt\(btn\.dataset\.at\)/)   // 지도의 자리를 누르면 놓인다
  })

  it('물음이 성립하는 자리에서만 순서를 묻는다 — 아니면 펴 보고 놓는 데까지다', () => {
    expect(dispatch).toMatch(/const ordering = shouldOfferOrdering\(view\.dispatches, view\.day\)/)
    // ▲▼ 와 「이대로 놓는다」가 그 값에 걸려 있다
    expect(dispatch).toMatch(/ordering && phase !== 'truth'/)
    expect(dispatch).toMatch(/if \(!ordering\) \{ finish\(\); return \}/)
  })

  // 2026-09-27 선생님: 「진짜 장계 올라온 거처럼.」 장계는 접혀서 온다 — 파발이
  // 지고 온 꾸러미를 승지가 편다. 그 두 모습이 화면에 다 있어야 한다.
  it('장계는 봉한 채로 와서 펴진다', () => {
    expect(dispatch).toContain('janggye-sealed')
    expect(dispatch).toContain('var(--janggye-sealed)')
    expect(dispatch).toContain('봉한 장계')
    expect(dispatch).toMatch(/opened\.add\(id\)/)
    // 펴지는 한순간은 CSS 가 맡고, 움직임을 줄여 달라는 기기에서는 그냥 펴진 채다
    expect(dispatch).toContain('@keyframes dispatch-unfold')
    expect(dispatch).toContain('prefers-reduced-motion')
  })

  // 펴는 것과 드는 것이 같은 한 번이면, 둘째 장을 편 채로 첫째 장을 눌러 읽으려는
  // 순간 두 장이 자리를 바꿔 버린다 — 학생은 누른 적 없는 일이 일어난 것으로 본다.
  it('펴는 것과 손에 드는 것은 다른 동작이다', () => {
    expect(dispatch).toMatch(/opened\.add\(id\)[\s\S]{0,200}picked = null/)
  })

  it('눌러서 고르고 눌러서 놓는다 — 끌어 놓기만으로 되는 길은 없다', () => {
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
    // 지도의 자리도 단추다 — 누를 수 있으면 탭으로 갈 수 있고 엔터로 놓을 수 있다
    expect(dispatch).toMatch(/<button class="map-hotspot"/)
    expect(dispatch).toContain('.map-hotspot:focus-visible')
  })

  it('채점하지 않는다 — 화면에 점수도 정답 표시도 없다', () => {
    expect(dispatch).not.toMatch(/오답|정답|점수|맞았습니다|틀렸/)
  })

  // 2026-09-26 선생님: 「장계의 순서를 정하는거도 틀린지도 모르겠어. 제대로 놓기
  // 전까지는 안넘어가야해.」 붙잡는 일과 벌하는 일을 갈라서 잰다.
  it('제대로 놓기 전에는 넘어가지 않는다 — 참된 순서는 순서대로일 때만 열린다', () => {
    expect(dispatch).toContain('isInHappenedOrder')
    expect(dispatch).toMatch(/if \(!isInHappenedOrder\(view\.dispatches, placed\)\) \{/)
    // 어긋난 줄로 밝히기에 들어가는 다른 길이 없다 — phase 를 truth 로 돌리는 자리가 하나다
    expect(dispatch.match(/phase = 'truth'/g)).toHaveLength(1)
  })

  it('다시 놓아 볼 수 있다 — 판은 그대로 남고 한 줄만 더해진다', () => {
    expect(dispatch).toContain('class="order-hint"')
    expect(dispatch).toContain('orderingHint')
    expect(dispatch).toMatch(/tries \+= 1/)
    // 놓인 것을 흩뜨리거나 처음으로 되돌리는 자리가 없다 — order 에 새로 값을 넣는
    // 곳은 처음 한 번뿐이고, 그 뒤로는 자리 바꾸기(swap)만 있다
    expect(dispatch.match(/^\s*(?:let )?order = /gm)).toHaveLength(1)
    expect(dispatch).toMatch(/let order = cards\.map\(d => d\.id\)/)
    // 지도에 놓은 것도 지워지지 않는다
    expect(dispatch).not.toMatch(/placedAt\.clear|placedAt\.delete|opened\.clear/)
  })

  it('말은 systems 가 만든다 — 화면이 힌트 문구를 짓지 않는다', () => {
    expect(dispatch).toMatch(/orderingHint\(view\.dispatches, view\.day, placed, tries\)\.text/)
    expect(dispatch).not.toMatch(/아직 아니다/)
  })

  it('붙잡되 벌하지 않는다 — 횟수도, 남은 기회도 화면에 적지 않는다', () => {
    expect(dispatch).not.toMatch(/실패|오답|번째 시도|남은 기회|기회가|다시 처음부터/)
    expect(dispatch).not.toMatch(/\$\{tries\}/)
  })

  it('화면을 눈으로 좇지 않는 학생에게도 그 한 줄이 읽힌다', () => {
    expect(dispatch).toMatch(/class="order-hint" role="status" aria-live="polite"/)
    // 그 마디는 다시 그리지 않는다 — 노드를 갈아 끼우면 읽어 주는 장치가 침묵한다
    expect(dispatch).toMatch(/hint\.textContent/)
  })

  // 읽으면 풀리는 물음이어야 한다 — 표제만 보고 찍게 두면 이 자리는 동전 던지기다
  it('카드에 장계 본문이 실린다 — 일의 앞뒤는 그 글 안에 적혀 있다', () => {
    expect(dispatch).toContain('class="order-text"')
    expect(dispatch).toMatch(/\$\{d\.body \?\? ''\}/)
    expect(dispatch).toContain('적힌 일')
    expect(dispatch).toContain('먼저 일어난 일이')
  })

  // ── 종이 (2026-09-27) ──────────────────────────────────────────────────
  // 「하나도 반영이 안 되었어」의 정체는 셋이 겹친 것이었다: 먹이 너무 엷었고,
  // 그 위에 반투명 크림빛을 한 겹 더 덮었고, 종이 한복판을 가로로 베어 낸 띠만
  // 칸에 보였다(100% auto + center). 그 셋이 다시 나지 않게 못 박는다.
  it('장계는 장계 종이 위에 앉는다 — 종이 한 장이 칸을 통째로 덮는다', () => {
    expect(dispatch).toContain('.dispatch .janggye')
    expect(dispatch).toContain('var(--janggye-open)')
    expect(dispatch).toContain('background-size:100% 100%')
    expect(dispatch).not.toMatch(/background-size:cover/)
    // 칸에 종이 한복판의 띠만 보이던 그 값이 돌아오지 않게
    expect(dispatch).not.toMatch(/background-size:100% auto/)
    // 그림 파일을 화면이 직접 들이지 않는다 — 종이는 CSS 변수로만 온다(ui/paper-css.js)
    expect(dispatch).not.toMatch(/data:image\/(webp|png)/)
  })

  it('종이 위에 반투명 덧칠을 하지 않는다 — 그 한 겹이 붓줄을 지웠다', () => {
    const rule = dispatch.match(/\.dispatch \.janggye,[^}]*\}/)?.[0] ?? ''
    expect(rule).toContain('var(--janggye-open)')
    expect(rule).not.toMatch(/linear-gradient/)
    // 글은 덮어서가 아니라 종이빛 그림자로 띄운다
    expect(rule).toMatch(/text-shadow/)
  })

  it('종이가 없는 빌드에서도 글이 남는다 — 단색 종이빛을 먼저 깔아 둔다', () => {
    expect(dispatch).toMatch(/\.dispatch \.janggye[^{]*\{background:#[0-9a-f]{6};color:#[0-9a-f]{6}/)
  })

  it('재구성 고지가 있다 — 깔린 종이를 그 장계의 사진으로 읽히게 두지 않는다', () => {
    expect(dispatch).toContain('PAPER_NOTE')
    expect(dispatchRaw).toContain('재구성 그림')
    expect(dispatchRaw).toContain('사진이 아니')
    // 한 화면이 되었으니 한 번이면 된다 — 그리고 그 한 번은 판을 세우는 자리에
    // 있어서, 안쪽을 몇 번 다시 그려도 화면에서 사라지지 않는다.
    expect(dispatch.match(/\$\{PAPER_NOTE\}/g)).toHaveLength(1)
    expect(dispatch).toContain('noticeFor(d)')     // 장계의 재구성·번역 고지가 그대로다
  })

  it('참된 순서는 같은 지도 위에서 밝혀진다 — 장계가 며칠 걸려 왔는지가 선으로 그어진다', () => {
    expect(dispatch).toContain('happenedLabel')
    expect(dispatch).toContain('travelLabel')
    expect(dispatch).toMatch(/quadraticCurveTo/)          // 자리에서 한양까지 그은 길
    expect(dispatch).toMatch(/pointOf\('hanyang'\)/)
    expect(dispatch).toContain('${view.cannotGo}')
  })

  it('약속은 한 번만 풀린다 — 몇 번을 다시 놓든 한 번이다', () => {
    expect(dispatch).toContain('show(view)')
    expect(dispatch.match(/resolve\(\)/g)).toHaveLength(1)
    expect(dispatch).toMatch(/if \(done\) return\s*\n\s*done = true/)
  })

  it('시계가 없다', () => {
    expect(dispatch).not.toMatch(/setTimeout|setInterval|Date\.now|performance\.now/)
  })

  it('새 클래스는 모두 .dispatch 안에 있고, 390px 폭에 들어간다', () => {
    for (const name of ['map-help', 'map-column', 'map-pins', 'map-hotspot', 'order-aside',
      'order-list', 'order-item', 'order-card',
      'order-moves', 'order-verdict', 'order-note', 'order-hint', 'order-recon',
      'janggye', 'janggye-sealed']) {
      expect(dispatch, name).toContain(`.dispatch .${name}`)
    }
    // 장계 카드 안쪽에만 있는 것들 — 이것들도 .dispatch 밖으로 새어 나가지 않는다
    for (const name of ['order-nth', 'order-where', 'order-text', 'order-at', 'order-when']) {
      expect(dispatch, name).toContain(`.dispatch .order-card .${name}`)
    }
    // 좁은 화면에서는 지도와 장계가 위아래로 선다 — 가로로 밀리지 않는다
    expect(dispatch).toContain('@media(max-width:900px)')
    expect(dispatch).toContain('@media(max-width:450px)')
    expect(dispatch).toContain('grid-template-columns:1fr')
  })

  // 활자는 ui/type-css.js 가 한 벌로 들고 있다 — 화면마다 다시 적으면 다음 화면에서
  // 또 어긋난다(2026-09-27 선생님: 「폰트의 문제인데 그냥 글자 크기를 키워버렸어」).
  it('글자 크기를 화면이 다시 적지 않는다 — 활자 변수를 부른다', () => {
    expect(dispatch).toMatch(/var\(--read-body/)
    expect(dispatch).toMatch(/var\(--read-small/)
    // 변수 없이 맨 숫자로 적어 둔 font-size 가 없다
    const bare = dispatch.match(/font-size:(?!var\()[^;}]*/g) ?? []
    expect(bare, bare.join(' | ')).toHaveLength(0)
  })
})
