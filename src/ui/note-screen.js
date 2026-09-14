import { PAPER } from './paper-data.js'
import { RUMOR_NOTICE } from './grade-notice.js'
import { noteMedia, mediaFigure, installHistoricalMedia, bindMedia } from './historical-media.js'

const CSS = `
.note{position:fixed;inset:0;background:#0f1113;z-index:50;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:16px;padding:28px;text-align:center;overflow:auto}
/* 글이 한지 위에 앉는다 — 선생님: "메시지들이 실제 조선의 장계나 사초 같은 종이로
   안내가 오게". 종이가 없으면(paper-data.js 가 비면) 이 판이 통째로 안 뜨고
   지금까지와 같은 검은 화면에 흰 글씨가 된다. */
.note .sheet{position:relative;max-width:660px;width:100%;padding:34px 38px 30px;
  border:1px solid #6b5a3e;border-radius:3px;color:#23201a;
  background:#e9dfc6 center/100% 100% no-repeat;box-shadow:0 14px 44px #000a, inset 0 0 70px #b39a6a2b}
.note .sheet::after{content:'';position:absolute;inset:6px;border:1px solid #6b5a3e44;
  border-radius:2px;pointer-events:none}
.note .sheet{display:flex;flex-direction:column;gap:14px;align-items:center}
.note .sheet h2{color:#5e4a2c}
.note .sheet p{color:#23201a}
.note .sheet .origin{color:#6b5a3e}
.note h2{margin:0 0 6px;font-size:19px;color:#8f8a7c;letter-spacing:5px;font-weight:400}
.note p{margin:0;font-size:19px;color:#e8e2d4;line-height:1.95;max-width:620px;word-break:keep-all}
.note .origin{font-size:12px;color:#6b6558}
.note .staged{border:1px dashed #8a6a44;color:#5e4a2c;font-size:12px;padding:8px 12px;border-radius:3px;
  max-width:520px;margin:0 auto}
.note button{margin-top:8px;padding:13px 34px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:2px;font-size:15px;letter-spacing:3px;cursor:pointer;min-width:150px}
.note button:hover{background:#4a3a2a}

/* 판정 R52 — 어려운 낱말을 지우지 않고 그 자리에서 뜯어 보인다(glyphGloss),
   그리고 여섯 해 전의 문서를 옆에 나란히 놓는다(compare). 둘 다 안 주면
   이 화면은 지금까지와 한 픽셀도 다르지 않다. */
.note .gloss{display:flex;flex-direction:column;align-items:center;gap:8px;
  border:1px solid #6b5a3e66;border-radius:4px;padding:14px 18px;max-width:520px;margin:0 auto}
.note .gloss .word{font-size:26px;color:#3a2d20;letter-spacing:8px}
.note .gloss .parts{display:flex;gap:22px}
.note .gloss .parts span{font-size:14px;color:#5e4a2c}
.note .gloss .parts b{display:block;font-size:24px;color:#8a3b22;font-weight:400;margin-bottom:4px}
.note .gloss .plain{font-size:16px;color:#23201a}
.note .cmp{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:720px;margin:0 auto}
.note .cmp div{flex:1 1 260px;background:#0000000f;border:1px solid #6b5a3e44;color:#23201a;border-radius:4px;
  padding:14px 16px;text-align:left;line-height:1.7;font-size:15px}
.note .cmp b{display:block;font-size:12px;color:#5e5849;letter-spacing:2px;
  font-weight:400;margin-bottom:6px}
.note .cmp small{display:block;font-size:12px;color:#5e5849;margin-top:8px}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
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
        el.className = 'note'
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
        const after = (beat.afterLines ?? []).map(l => `<p>${l}</p>`).join('')
        // 글은 종이 위에 앉는다. 종이(한지)는 한 장으로 감싸고, 그 바깥의 어두운
        // 바탕은 그대로 둔다 — 궁궐 밤에 등불 아래 편지 한 장을 펼친 그림이다.
        const media = noteMedia(beat)
        el.innerHTML = `
          <div class="sheet${media ? ' has-media' : ''}"><div class="note-copy">
            <h2>${beat.title ?? ''}</h2>
            ${(beat.lines ?? []).map(l => `<p>${l}</p>`).join('')}
            ${gloss}
            ${cmp}
            ${after}
            ${beat.origin ? `<div class="origin">${beat.origin}</div>` : ''}
            ${staged}
            </div>${mediaFigure(media)}
          </div>
          <button class="note-next">다음</button>`
        root.appendChild(el)
        bindMedia(el)
        const sheet = el.querySelector('.sheet')
        if (PAPER.hanji) sheet.style.backgroundImage = `url(${PAPER.hanji})`
        // 글 화면은 안내·설명 문장이라 소리 내어 읽지 않는다(2026-09-14 선생님: 「안내문구의 음성은 모두 제거」).
        // 고종의 1인칭 독백 음성은 행렬 장면(main.js playProcession)에만 남는다.
        el.querySelector('.note-next').addEventListener('click', () => { el.remove(); resolve() })
      })
    },
  }
}
