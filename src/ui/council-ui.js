import { PORTRAITS } from './portraits-data.js'
import { evaluateChoices } from '../systems/council.js'

// justify-content:center 만으로는, 내용이 화면보다 길어지면(문구가 늘어난
// 어전회의) 위쪽이 스크롤로도 닿지 않는다 — "safe center" + overflow:auto 로
// 막는다(화면 확인 중 발견, 2단계 재제작).
const CSS = `
.council{position:fixed;inset:0;background:#0f1113;z-index:50;display:flex;
  flex-direction:column;align-items:center;justify-content:safe center;gap:18px;padding:24px;overflow:auto}
.council h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:3px;font-weight:400}
.council .q{margin:0;font-size:24px;color:#e8e2d4;text-align:center;max-width:640px;line-height:1.5}
.council .read{font-size:12px;color:#8f8a7c}
.council .list{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px}
.council button.opt{padding:14px 16px;text-align:left;background:#23282c;color:#e8e2d4;
  border:1px solid #3a4248;border-radius:3px;font-size:15px;cursor:pointer}
.council button.opt:hover{background:#2f363c;border-color:#5a646c}
.council .locked{padding:14px 16px;border:1px dashed #3a4248;border-radius:3px;color:#98a2aa;font-size:15px}
.council .locked small{display:block;margin-top:6px;color:#8f8a7c;font-size:12px}
.council .actual{max-width:600px;background:#e8e2d4;color:#23201a;border-radius:3px;
  background-image:var(--hanji);background-size:cover;background-position:center;
  border:1px solid #6b5a3e;box-shadow:inset 0 0 60px #b39a6a2b;
  padding:20px 22px;line-height:1.75}
.council .actual .you{color:#6b6558;font-size:13px;margin-bottom:10px}
.council .actual .origin{font-size:13px;color:#5e5849;margin-top:8px}
.council .actual blockquote{margin:0;border-left:3px solid #8a6a44;padding-left:12px;font-size:15px;line-height:1.8}
/* 뒤집는 말에는 얼굴이 붙는다 — 누가 임금의 결정을 덮었는지 학생이 보아야 한다.
   1863년의 그 한 줄(「이 일은 이 아비가 맡겠습니다」)이 이 게임에서 가장 중요한 말이다. */
.council .overturn{display:flex;gap:14px;align-items:center;margin:16px 0 0;
  border-top:1px solid #6b5a3e44;padding-top:14px}
.council .overturn img{width:84px;height:84px;flex:0 0 84px;border-radius:3px;
  object-fit:cover;object-position:50% 7%;border:1px solid #6b5a3e;background:#1a1d21}
.council .overturn .who{font-size:12px;color:#6b5a3e;letter-spacing:2px;margin-bottom:4px}
.council .reading{max-width:600px;border:1px dashed #6a5230;border-radius:4px;padding:16px 20px;
  line-height:1.8;color:#b9b2a1;font-size:15px;text-align:left;background:#191b1e}
.council .reading .tag{display:block;color:#e0a23a;font-size:12px;letter-spacing:3px;margin-bottom:8px}
.council .reading .origin{font-size:12px;color:#8f8a7c;margin-top:8px}
.council textarea{width:100%;max-width:560px;min-height:74px;background:#1a1d21;color:#e8e2d4;
  border:1px solid #3a4248;border-radius:3px;padding:10px;font:14px/1.6 inherit;resize:none}
.council .warn{font-size:12px;color:#8f8a7c;max-width:560px;text-align:center;margin:0}
.council .go{padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:15px;cursor:pointer}
.council .go[disabled]{opacity:.45;cursor:not-allowed}
.council .need{font-size:12px;color:#c98b4b;margin:0}
`

const DEFAULT_REASON_PROMPT = '왜 그렇게 정하셨습니까'

// 고를 수 있는 것이 하나뿐이었으면 「왜 그렇게 정했는가」는 **답할 수 없는 물음**이다.
// 학생은 정한 적이 없다 — 하나뿐이라 눌렀을 뿐이다. 선생님이 지적한 자리다.
// 그때는 물음을 바꾼다. 고를 것이 없었다는 사실 자체가 1막이 가르치려는 것이므로,
// 그것을 묻는 편이 오히려 낫다.
const SOLE_CHOICE_PROMPT = '고를 수 있는 것이 하나뿐이었습니다. 그때 무슨 생각을 하셨습니까'

// 안 적으면 넘어가지 않는다. 이 글이 이 수업의 산출물(세특의 밑감)이다.
const MIN_REASON = 2

// 선택지를 잠그는 까닭이 셋이다. 셋 다 systems/council.js 밖에서 판정한다 — 그 파일은 잠금이다.
//   (1) 사료를 안 읽었다        — evaluateChoices() 가 판정한다
//   (2) 아직 모르는 일이 있다   — needsFlag. 설계서 7.6 의 「성공하면 선택지가 열린다」
//   (3) 회의 자체가 얼어붙었다  — frozen. 4막에서 대원군이 나랏일을 다시 맡는 자리
//
// 잠긴 선택지의 text 는 null 이다 — 화면이 ??? 를 찍는다. 다만 (3) 으로만 잠긴 것은
// 이름을 그대로 보여 준다: 「무엇을 고를 수 있었는지 알면서 고르지 못하는 것」이 그 장면이다.
// 그래서 7.6 을 실패한 학생과 성공한 학생이, 둘 다 아무것도 고르지 못하는 이 회의에서도
// 갈린다 — 갈리는 것은 「할 수 있는가」가 아니라 「있는 줄 아는가」다.
export function gateChoices(state, beat) {
  const raw = beat.council.choices
  const evaluated = evaluateChoices(state, beat.council)
  const flags = state?.flags ?? {}

  return evaluated.map(c => {
    const src = raw.find(x => x.id === c.id) ?? {}
    const flagOk = !src.needsFlag || flags[src.needsFlag] === true
    const why = []
    // 얼어붙은 회의에서는 미열람 안내를 내지 않는다. 두 까닭을 나란히 놓으면 화면이
    // 「내가 안 읽어서 막혔다」와 「정치 때문에 막혔다」를 동시에 말하는데, 이 화면의
    // 요점은 얼어붙음이 학생 잘못이 아니라는 것이다 — 무엇을 안 읽었는지는 3막 끝
    // 화면(FUTURE_COUNCIL)이 이미 이름으로 돌려준다.
    // 「모르는 일」(needsFlag)은 남긴다 — 그것은 학생의 잘못이 아니라 「왕이 무엇을
    // 아는가」이고, 얼어붙은 회의에서도 그 갈림이 살아 있는 것이 설계서 7.6 의 요점이다.
    if (beat.frozen !== true) for (const m of c.missing) why.push(`『${m}』을 읽지 않았습니다`)
    if (!flagOk) why.push(src.flagLabel ?? '아직 알지 못하는 일이 있다')
    if (beat.frozen === true) why.push(beat.frozenReason ?? '지금은 고를 수 없다')

    const knowable = c.unlocked && flagOk
    return {
      id: c.id,
      // 이름을 보여 줄 것인가 — 알 수 있는 선택지면 보여 준다. 얼어붙었어도 보여 준다
      text: knowable ? c.text : null,
      unlocked: knowable && beat.frozen !== true,
      missing: c.missing,
      why,
    }
  })
}

export function createCouncil(root) {
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

  return {
    // onLocked — 잠긴 선택지를 눌렀을 때 알린다(소리 되먹임 하나뿐이다).
    // 눌러도 아무것도 열리지 않는다: 이 콜백은 화면도 상태도 건드리지 않는다.
    open(state, act, onDecide, onLocked = null) {
      const panel = document.createElement('div')
      panel.className = 'council'
      root.appendChild(panel)

      const gated = gateChoices(state, act)
      const openCount = gated.filter(c => c.unlocked).length

      const listHtml = gated.map(c => c.unlocked
        ? `<button class="opt" data-id="${c.id}">${c.text}</button>`
        : `<div class="locked">${c.text ?? '???'}${c.why.map(w => `<small>← ${w}</small>`).join('')}</div>`
      ).join('')

      // 얼어붙은 회의에서는 고를 단추가 하나도 없다 — 넘어갈 길을 따로 낸다.
      // 이것이 조작권 D 의 첫 실사용이다: 왕좌에 앉은 채로 아무것도 하지 못한다.
      const frozenBtn = act.frozen === true
        ? `<button class="go">${act.frozenLabel ?? '아무 말도 하지 못한다'}</button>`
        : ''

      panel.innerHTML = `
        <h2>어 전 회 의</h2>
        <p class="q">${act.council.question}</p>
        <div class="read">고를 수 있는 것 ${openCount} / ${gated.length}</div>
        <div class="list">${listHtml}</div>
        ${frozenBtn}`

      panel.querySelectorAll('button.opt').forEach(btn => {
        btn.addEventListener('click', () => showAftermath(btn.dataset.id))
      })
      if (onLocked) {
        panel.querySelectorAll('.locked').forEach(row => {
          row.addEventListener('pointerdown', () => onLocked())
        })
      }
      if (act.frozen === true) {
        panel.querySelector('.go').addEventListener('click', () => showAftermath('frozen'))
      }

      function showAftermath(choiceId) {
        const chosen = gated.find(c => c.id === choiceId)
        const youText = chosen?.text ?? act.frozenChoiceLabel ?? '아무것도 고르지 못했다'
        // 뒤집는 말은 사람이 한다. overturnBy 가 있으면 그 사람의 얼굴을 붙인다.
        const by = act.overturnBy
        const face = by && PORTRAITS[by.portrait] ? `<img alt="" src="${PORTRAITS[by.portrait]}">` : ''
        const overturn = act.overturn
          ? `<div class="overturn">${face}<div>` +
            `${by?.name ? `<div class="who">${by.name}</div>` : ''}` +
            `<blockquote>${act.overturn}</blockquote></div></div>`
          : ''
        // 「실제로는」은 사료가 말한 것, 「역사가들은 이렇게 본다」는 오늘의 연구자가
        // 읽어 낸 것이다(판정 R12). 둘을 한 상자에 담으면 해석이 사실로 읽힌다 —
        // 밝은 종이와 어두운 점선 상자로, 각자 제 출처를 달고 눈으로 갈라 놓는다.
        // label·origin 에 방어값을 둔다 — 없으면 화면에 undefined 가 찍힌다.
        // 「해석은 제 출처를 단다」는 데이터 쪽에서도 강제한다(tests/data/integrity.test.js).
        const rd = act.actual?.reading
        const reading = rd
          ? `<div class="reading"><span class="tag">${rd.label ?? '역사가들은 이렇게 본다'}</span>
               ${rd.line ?? ''}
               ${rd.origin ? `<div class="origin">${rd.origin}</div>` : ''}</div>`
          : ''

        panel.innerHTML = `
          <div class="actual">
            <div class="you">당신은 ─ ${youText}</div>
            <div>실제로는 ─ ${act.actual.line}</div>
            <div class="origin">${act.actual.origin}</div>
            ${overturn}
          </div>
          ${reading}
          <p class="q" style="font-size:17px">${act.reasonPrompt ?? (openCount <= 1 ? SOLE_CHOICE_PROMPT : DEFAULT_REASON_PROMPT)}</p>
          <p class="warn">이 글은 브라우저에만 저장됩니다. 막이 끝나면 나오는 「내 기록 복사」 단추를 눌러 활동지에 옮겨 적으세요.</p>
          <textarea placeholder="여기에 쓰면 사관이 받아 적는다. 한 줄이면 된다."></textarea>
          <p class="need">사관이 받아 적을 말이 아직 없습니다.</p>
          <button class="go" disabled>밤이 깊었다 — 다음으로</button>`
        const area = panel.querySelector('textarea')
        const go = panel.querySelector('.go')
        const need = panel.querySelector('.need')
        // 빈 채로 넘어가면 그 학생의 기록에 아무것도 안 남는다. 쓸 때까지 잠근다.
        const check = () => {
          const ok = area.value.trim().length >= MIN_REASON
          go.disabled = !ok
          need.style.visibility = ok ? 'hidden' : 'visible'
        }
        area.addEventListener('input', check)
        area.addEventListener('keyup', check)
        check()
        area.focus()
        go.addEventListener('click', () => {
          const reason = area.value.trim()
          if (reason.length < MIN_REASON) return
          panel.remove()
          onDecide(choiceId, reason)
        })
      }
    },
  }
}
