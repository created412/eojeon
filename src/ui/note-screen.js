import { PAPER } from './paper-data.js'
import { RUMOR_NOTICE } from './grade-notice.js'
import { noteMedia, mediaFigure, installHistoricalMedia, bindMedia } from './historical-media.js'
import { installTypeVars } from './type-css.js'

// 활자 규칙은 이 화면이 스스로 정하지 않는다 — ui/type-css.js 한 곳에서 받아 쓴다.
// 2026-09-26 선생님: 「이런 안내문이 너무 가독성이 떨어져」. 병은 셋이었다:
// ① 문단이 가운데로 맞춰져 있어 「…아들이 없다.」 가 둘째 줄에 외톨이로 떨어졌고,
// ② 출처·재구성 고지가 12px 이라 프로젝터에서 안 보였고,
// ③ 본문까지 바탕(serif)으로 나와 낱말이 뭉개졌다.
const CSS = `
.note{position:fixed;inset:0;background:#0f1113;z-index:50;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:16px;padding:28px;text-align:center;overflow:auto}
/* 글이 한지 위에 앉는다 — 선생님: "메시지들이 실제 조선의 장계나 사초 같은 종이로
   안내가 오게". 종이가 없으면(paper-data.js 가 비면) 이 판이 통째로 안 뜨고
   지금까지와 같은 검은 화면에 흰 글씨가 된다. */
.note .sheet{position:relative;max-width:780px;width:100%;padding:38px 44px 34px;
  border:1px solid #6b5a3e;border-radius:3px;color:#23201a;
  background:#e9dfc6 center/100% 100% no-repeat;box-shadow:0 14px 44px #000a, inset 0 0 70px #b39a6a2b}
.note .sheet::after{content:'';position:absolute;inset:6px;border:1px solid #6b5a3e44;
  border-radius:2px;pointer-events:none}
/* align-items 가 center 였다. 그래서 문단마다 제 글 길이만큼만 넓어져 가운데로 몰렸고,
   그것이 선생님이 보신 「들쭉날쭉한 두 줄」의 정체다. 이제 칸 너비를 다 쓴다. */
.note .sheet{display:flex;flex-direction:column;gap:16px;align-items:stretch}
.note .sheet h2{color:#4f3d21}
.note .sheet p{color:var(--ink-strong,#23201a)}
.note .sheet .origin{color:var(--ink-quiet,#6b5a3e)}
/* 읽는 칸 — 왼쪽 맞춤·낱말 보존·고른 줄은 .type-read 가 건다(ui/type-css.js). */
.note .note-copy{max-width:min(100%,var(--read-measure,620px))}
.note h2{margin:0 0 4px;font-size:var(--read-title,19px);line-height:var(--read-lh-title,1.45);
  color:#8f8a7c;font-weight:400;text-align:left}
.note p{margin:0;font-size:var(--read-body,19px);color:var(--paper-strong,#e8e2d4);
  line-height:var(--read-lh-body,1.95);word-break:keep-all;letter-spacing:normal}
.note .origin{font-size:var(--read-small,12px);line-height:var(--read-lh-small,1.7);color:var(--ink-quiet,#6b6558);
  word-break:keep-all;text-wrap:balance}
.note .staged{border:1px dashed #8a6a44;color:var(--ink-quiet,#5e4a2c);font-size:var(--read-small,12px);
  line-height:var(--read-lh-small,1.7);padding:12px 16px;border-radius:3px;margin:2px 0 0;text-align:left;
  word-break:keep-all;text-wrap:pretty}
.note button{margin-top:8px;padding:14px 36px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:2px;font-size:var(--read-label,15px);letter-spacing:3px;cursor:pointer;min-width:160px}
.note button:hover{background:#4a3a2a}

/* 판정 R52 — 어려운 낱말을 지우지 않고 그 자리에서 뜯어 보인다(glyphGloss),
   그리고 여섯 해 전의 문서를 옆에 나란히 놓는다(compare). 둘 다 안 주면
   이 화면은 지금까지와 한 픽셀도 다르지 않다. */
.note .gloss{display:flex;flex-direction:column;align-items:center;gap:10px;
  border:1px solid #6b5a3e66;border-radius:4px;padding:16px 18px;margin:0}
/* 낱말 하나를 뜯어 보이는 자리다 — 자간이 뜻인 유일한 본문 밖 글자. */
.note .gloss .word{font-family:var(--face-hanja,serif);font-size:30px;color:#3a2d20;letter-spacing:.3em}
.note .gloss .parts{display:flex;gap:26px;flex-wrap:wrap;justify-content:center}
.note .gloss .parts span{font-size:var(--read-label,14px);color:var(--ink-quiet,#5e4a2c);text-align:center}
.note .gloss .parts b{display:block;font-family:var(--face-hanja,serif);font-size:28px;color:#8a3b22;
  font-weight:400;margin-bottom:4px;letter-spacing:0}
.note .gloss .plain{font-size:var(--read-small,16px);line-height:var(--read-lh-small,1.7);
  color:var(--ink-strong,#23201a);text-align:center}
.note .cmp{display:flex;gap:14px;flex-wrap:wrap;margin:0}
.note .cmp div{flex:1 1 280px;background:#0000000f;border:1px solid #6b5a3e44;color:var(--ink-strong,#23201a);
  border-radius:4px;padding:16px 18px;text-align:left;line-height:var(--read-lh-body,1.7);
  font-size:var(--read-small,15px);word-break:keep-all}
.note .cmp b{display:block;font-size:var(--read-label,12px);color:var(--ink-quiet,#5e5849);letter-spacing:.06em;
  font-weight:400;margin-bottom:8px}
.note .cmp small{display:block;font-size:var(--read-caption,12px);color:var(--ink-quiet,#5e5849);margin-top:10px}
@media(max-width:760px){
  .note{padding:18px 14px}
  .note .sheet{padding:26px 20px 24px}
}
/* ── 가로로 누운 손전화 (2026-09-27) ──────────────────────────────────────
   844×390 가로에서 재 보니 이 판이 창의 1.4배가 되어 **「다음」이 화면 밖에 있었다.**
   스크롤하면 닿지만 학생에게는 그 표시가 없다 — 「독립군의 별」에서 이미 한 번 겪은
   그 증상이다(그때도 원인은 터치가 아니라 배치였고, 학생들은 「안 눌린다」고 했다).
   글 화면에서 「다음」이 안 보이면 수업이 그 자리에서 멈춘다.
   그래서 짧은 화면에서는 종이를 좁히고, 「다음」을 바닥에 붙여 늘 보이게 한다. */
@media(max-height:560px){
  .note{padding:10px 12px;gap:8px;justify-content:flex-start}
  .note .sheet{padding:15px 18px 13px;gap:9px}
  .note .sheet::after{inset:4px}
  .note .note-next{position:sticky;bottom:0;z-index:2;box-shadow:0 0 0 10px #0f1113}
}
`

// 2026-10-06 선생님: 「모든 안내문 글너무많고 가독성낮음, 실제시뮬레이션게임처럼 안내문제시」.
// 행동 안내는 목표 하나를 먼저, 역사 지문은 두 문단씩 읽는다. 원문과 출처는 보존한다.
const BRIEFING_CSS = `
.note{font-family:var(--face-body,system-ui,sans-serif);gap:18px}
.note .sheet{max-width:820px;padding:32px;flex-shrink:0}
.note .note-copy{width:100%;max-width:660px;margin:auto;display:flex;flex-direction:column;gap:20px}
.note .note-copy h2{font-family:inherit;font-size:25px;font-weight:600;letter-spacing:0;text-align:center}
.note .note-page{display:flex;flex-direction:column;gap:18px}
.note .note-page[hidden]{display:none}
.note .note-page p{font-size:21px;line-height:1.7;text-wrap:pretty}
.note .note-nav{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap}
.note .note-nav button{margin:0;letter-spacing:0;font-family:inherit;font-size:18px;min-height:48px}
.note .note-back{min-width:90px;color:#d5cdbb;background:transparent;border-color:#655a48}
.note .note-back[hidden],.note .note-progress[hidden]{display:none}
.note .note-progress{color:#d5cdbb;font-size:15px;font-variant-numeric:tabular-nums}
.note .note-kicker{font-size:14px;font-weight:600;letter-spacing:.16em;color:#bfa375;text-align:center}
.note.note-briefing{background:radial-gradient(ellipse at 50% 35%,#28312c,#0f1414 75%)}
.note.note-briefing .sheet{background:#171f1c!important;border:1px solid #617165;border-top:3px solid #d2b276;
  color:#f3eddf;box-shadow:0 20px 70px #0008;border-radius:12px;text-align:center}
.note.note-briefing .sheet::after{display:none}
.note.note-briefing .note-copy h2{font-size:19px;color:#d9d3c4;margin:0}
.note.note-briefing .note-objective{font-size:clamp(26px,4vw,36px);font-weight:600;line-height:1.4;color:#fff3d5;text-align:center;text-wrap:balance}
.note.note-briefing .note-action{font-size:21px;line-height:1.6;color:#f3eddf;text-align:center;text-wrap:balance}
.note .note-context{text-align:left;border-top:1px solid #657266;padding-top:14px}
.note .note-context summary{font-size:16px;color:#d9c59f;cursor:pointer;padding:6px;text-align:center}
.note .note-context .note-page{margin-top:20px}
.note.note-briefing .note-context p{color:#e5e0d4;font-size:18px}
.note.note-briefing .origin,.note.note-briefing .staged{color:#c5bda9;font-size:14px;line-height:1.6}
.note .note-nav{position:sticky;bottom:0;z-index:2;background:#0f1113ed;padding:8px 14px;border-radius:8px}
@media(max-height:560px){
 .note{padding:14px;gap:10px;justify-content:flex-start}
 .note .sheet{padding:20px 26px}
 .note .note-copy{gap:12px}
 .note .note-page{gap:12px}
 .note .note-page p{font-size:18px;line-height:1.6}
 .note .note-copy h2{font-size:22px}
 .note.note-briefing .note-objective{font-size:27px}
 .note.note-briefing .note-action{font-size:19px}
 .note .note-next{position:static;box-shadow:none}
 .note .note-nav button{padding:10px 24px}
}
@media(max-width:600px){.note .sheet{padding:24px 20px}.note .note-page p{font-size:19px}}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.textContent = CSS + BRIEFING_CSS
  document.head.appendChild(style)
  styled = true
}

// 지문(地文) 한 장을 보여주는 비트('note'). 대사·지문은 게임이 미리 적어 둔 정적
// 텍스트일 뿐 학생이 쓴 글이 아니므로, 다른 카드 화면들과 같은 규칙으로 innerHTML 에
// 그대로 넣는다. 'staged' 등급이면 재구성 고지를 붙인다 — 전역 규칙: staged 와
// '우리말 옮김'은 서로 다른 고지이며 하나가 다른 하나를 대신하지 않는다.
export function createNoteScreen(root, { voice = null } = {}) {
  ensureStyle()
  installHistoricalMedia()

  return {
    show(beat) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        const briefing = beat.briefing
        el.className = 'note'
        el.classList.toggle('note-briefing', !!briefing)
        const staged = beat.grade === 'staged'
          ? '<div class="staged">※ 이 대목은 기록에 남아 있지 않습니다. 게임이 지어내 채운 장면입니다. 이런 것을 「재구성」이라고 합니다.</div>'
          : beat.grade === 'rumor' ? `<div class="staged rumor">${RUMOR_NOTICE}</div>` : ''
        // 글자 뜯어 보기 — 「속방(屬邦)」처럼 지우면 장면이 존재할 이유가 사라지는 낱말만.
        const g = beat.glyphGloss
        const gloss = g ? `
          <div class="gloss">
            <div class="word">${g.hanja ?? g.word ?? ''}</div>
            <div class="parts">${(g.parts ?? []).map(p => `<span><b>${p.ch ?? ''}</b>${p.gloss ?? ''}</span>`).join('')}</div>
            ${g.plain ? `<div class="plain">${g.word ? `${g.word} — ` : ''}${g.plain}</div>` : ''}
          </div>` : ''
        // 두 문서를 나란히 놓기 — 설명은 붙이지 않는다. 그 문장은 학생이 만드는 것이다.
        const c = beat.compare
        const cmp = c ? `
          <div class="cmp">
            ${[c.left, c.right].filter(Boolean).map(side => `
              <div>${side.label ? `<b>${side.label}</b>` : ''}${side.line ?? ''}${
                side.origin ? `<small>${side.origin}</small>` : ''}</div>`).join('')}
          </div>` : ''
        const lines = (beat.lines ?? []).filter(Boolean)
        const pages = []
        for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2).map(l => `<p>${l}</p>`).join(''))
        const extra = gloss + cmp + (beat.afterLines ?? []).filter(Boolean).map(l => `<p>${l}</p>`).join('')
        if (extra) pages.push(extra)
        if (!pages.length) pages.push('')
        const content = pages.map((html, i) => `<div class="note-page"${!briefing && i ? ' hidden' : ''}>${html}</div>`).join('')
        // 글은 종이 위에 앉는다. 종이(한지)는 한 장으로 감싸고, 그 바깥의 어두운
        // 바탕은 그대로 둔다 — 궁궐 밤에 등불 아래 편지 한 장을 펼친 그림이다.
        const media = noteMedia(beat)
        el.innerHTML = `
          <div class="sheet${media ? ' has-media' : ''}"><div class="note-copy type-read">
            <h2 class="type-display">${beat.title ?? ''}</h2>
            ${briefing ? `<div class="note-kicker">지금 할 일</div><p class="note-objective">${briefing.objective}</p>
              <p class="note-action">${briefing.action}</p><details class="note-context"><summary>${briefing.contextLabel ?? '배경 살펴보기'}</summary>${content}</details>` : content}
            ${beat.origin ? `<div class="origin">${beat.origin}</div>` : ''}
            ${staged}
            </div>${mediaFigure(media)}
          </div>
          <div class="note-nav"><button class="note-back" hidden>이전</button><span class="note-progress"${briefing || pages.length < 2 ? ' hidden' : ''}>1 / ${pages.length}</span><button class="note-next">${briefing?.buttonLabel ?? '다음'}</button></div>`
        root.appendChild(el)
        bindMedia(el)
        const sheet = el.querySelector('.sheet')
        if (PAPER.hanji && !briefing) sheet.style.backgroundImage = `url(${PAPER.hanji})`
        // 글 화면은 안내·설명 문장이라 소리 내어 읽지 않는다(2026-09-14 선생님: 「안내문구의 음성은 모두 제거」).
        // 고종의 1인칭 독백 음성은 행렬 장면(main.js playProcession)에만 남는다.
        let at = 0
        const back = el.querySelector('.note-back')
        const next = el.querySelector('.note-next')
        const pageEls = [...el.querySelectorAll('.note-page')]
        const paintPage = () => {
          pageEls.forEach((p, i) => { p.hidden = i !== at })
          back.hidden = at === 0
          el.querySelector('.note-progress').textContent = `${at + 1} / ${pages.length}`
          next.textContent = at < pages.length - 1 ? '계속 읽기' : '다음'
          el.scrollTop = 0
        }
        back.addEventListener('click', () => { if (at > 0) { at--; paintPage() } })
        next.addEventListener('click', () => {
          if (!briefing && at < pages.length - 1) { at++; paintPage(); return }
          el.remove(); resolve()
        })
        if (!briefing) paintPage()
      })
    },
  }
}
