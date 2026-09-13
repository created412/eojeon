import { DAY_UNITS } from '../core/clock.js'
import { riceLabel, RICE_NOTE } from '../systems/prices.js'

const CSS = `
.hud{position:fixed;left:0;right:0;top:0;display:flex;gap:16px;align-items:center;
  padding:8px 14px;font-size:13px;color:#e8e2d4;
  background:linear-gradient(#0f1113ee,#0f111300);pointer-events:none;z-index:20}
.hud .where{font-size:16px;font-weight:700;letter-spacing:1px}
.hud .date{color:#8f8a7c}
.hud .sun{margin-left:auto;display:flex;gap:6px;align-items:center}
/* display:flex 가 [hidden] 의 기본 display:none 을 이긴다 — 감추려면 여기서 다시 눌러야
   한다. 감춘 줄 알았는데 그대로 보이는 결함이 정확히 이 우선순위에서 났다. */
.hud .sun[hidden]{display:none}
.hud .sun label{font-size:11px;color:#8f8a7c;letter-spacing:1px}
.hud .sun .dots{display:flex;gap:3px}
/* 둥근 금빛 점은 해였다. 이제 세는 것은 시간이 아니라 **아룀의 수**이므로
   먹으로 그은 짧은 획으로 그린다(core/clock.js 머리말 참고). */
.hud .sun i{width:4px;height:15px;border-radius:1px;background:#3a3f45;display:block}
.hud .sun i.on{background:#d8cdb4}
.rice{position:fixed;left:0;right:0;bottom:6px;text-align:center;
  font-size:11px;color:#8f8a7c;letter-spacing:2px;pointer-events:none;z-index:20}
.rice em{font-style:normal;color:#6b6558;font-size:10px;letter-spacing:0;display:block;margin-top:2px}
`

// 여러 번 boot() 해도(테스트 등) <style> 이 head 에 쌓이지 않게 한 번만 심는다.
// act-end.js 와 같은 규칙 — 그래서 dispose() 는 이 태그를 지우지 않는다: 지우면
// styled 플래그만 참인 채로 다음 createHUD() 가 다시 심지 않아 스타일이 영영 없어진다.
let styled = false

export function createHUD(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  const bar = document.createElement('div')
  bar.className = 'hud'
  // 해 표시 점 여섯 개가 무엇인지 화면 어디에도 없었다 — 옆에 이름표를 붙인다
  // (가독성 검수 D18).
  bar.innerHTML =
    `<span class="where"></span><span class="date"></span>` +
    `<span class="sun"><label>오늘 아뢸 수 있는 것</label><span class="dots"></span></span>`
  root.appendChild(bar)

  const rice = document.createElement('div')
  rice.className = 'rice'
  root.appendChild(rice)

  const where = bar.querySelector('.where')
  const date = bar.querySelector('.date')
  const sun = bar.querySelector('.sun .dots')
  const sunBox = bar.querySelector('.sun')

  let shownIndex = null

  return {
    update(view) {
      // 궁 이름만으로는 「규장각으로 가세요」를 따라갈 길이 없다 — 지금 서 있는
      // 방 이름을 붙인다(2단계 최종 리뷰, 가독성 항목 1)
      where.textContent = view.roomName ? `${view.palaceName} · ${view.roomName}` : view.palaceName
      date.textContent = view.dateLabel
      // 이 표시는 「오늘 더 들을 수 있는가」다. 알현처럼 고를 것이 없는 장면에서는
      // dayLeft 를 null 로 받아 통째로 감춘다 — 못 쓰는 자원을 화면에 띄워 두면
      // 학생이 그것을 아끼려고 하지 않을 일을 한다.
      sunBox.hidden = view.dayLeft == null
      sun.innerHTML = ''
      // 몇 칸을 그릴지는 그날의 예산이 정한다 — 날마다 다르다(acts.js 의 dayUnits).
      // 예전에는 DAY_UNITS(6)를 늘 그려서, 넉 칸짜리 하루에도 빈 점 둘이 남았다.
      const total = view.dayTotal ?? DAY_UNITS
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('i')
        if (i < view.dayLeft) dot.className = 'on'
        sun.appendChild(dot)
      }
      // 절대 수치는 화면에 내지 않는다(설계서 11장) — riceLabel 은 배수로만 말한다.
      // 매 프레임 다시 그리지 않도록 지수가 실제로 바뀔 때만 갱신한다
      if (view.riceIndex !== shownIndex) {
        shownIndex = view.riceIndex
        rice.innerHTML = view.riceIndex == null
          ? ''
          : `${riceLabel(view.riceIndex)}<em>${RICE_NOTE}</em>`
      }
    },
    dispose() { bar.remove(); rice.remove() },
  }
}
