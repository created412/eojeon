// 문서를 뜯어 읽는 판 — 왼쪽에 문서, 오른쪽에 지금의 물음. 답할 때마다 문서 여백에
// 붉은 주석이 하나씩 붙는다. 셈은 systems/doc-study.js 가 한다.
//
// 지금 읽는 대목을 크게 남기고 나머지는 펼쳐 볼 수 있다. 그림과 글씨를 줄여 끼우지 않고,
// 낮거나 좁은 화면에서는 판을 굴려 읽는다(2026-10-06 그림 보기 개편).
// ⚠ 「두 나라를 바꿔 읽는다」로 뜬 문장은 **문서에 적힌 글이 아니다.** 빛깔을 바꾸고
//   「바꿔 읽은 것」이라고 적는다 — 지어낸 문장이 조약문처럼 보이면 안 된다.
import { installTypeVars } from './type-css.js'
import { choiceArtHtml, choiceArtKey, CHOICE_ART_CSS } from './choice-art.js'
import {
  sectionsOf, initialStudy, stepAt, stepCount, flip, answer, focusBlank, activeBlank, chipsOf,
  studyHint, studyRecord,
} from '../systems/doc-study.js'

const CSS = `
.study,.study *{box-sizing:border-box}
.study{position:fixed;inset:0;z-index:57;background:#1c2024;color:#ece6d6;overflow:hidden;
  font-family:var(--face-body,system-ui,sans-serif);display:flex;justify-content:center}
.study .wrap{width:100%;max-width:1220px;height:100%;display:grid;
  grid-template-columns:minmax(320px,1.25fr) minmax(300px,1fr);gap:clamp(12px,2.2vw,28px);
  padding:clamp(10px,2.6vh,28px) clamp(12px,2.4vw,28px)}

/* ── 문서 ── */
.study .sheet{min-height:0;display:flex;flex-direction:column;gap:6px}
.study .paper{flex:1 1 auto;min-height:0;overflow-y:auto;background:#eee3c6;color:#241d12;
  background-image:var(--hanji);background-size:cover;border:1px solid #8a6a44;box-shadow:0 14px 40px #0009;
  padding:clamp(10px,2vh,20px) clamp(14px,2vw,26px);display:flex;flex-direction:column;gap:clamp(3px,.9vh,9px)}
.study .paper h3{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.06em;
  font-size:clamp(14px,2.2vh,18px);color:#6b5530;border-bottom:1px solid #8a6a4466;padding-bottom:6px}
.study .sec{padding:clamp(5px,1vh,9px) clamp(10px,1.4vw,16px);border-left:4px solid transparent;border-radius:2px;
  transition:background .2s,border-color .2s}
.study .sec.on{background:#fff7dc;border-left-color:#b0701a;box-shadow:0 2px 10px #3a2d1a22}
.study .sec .lab{display:block;font-size:clamp(12px,1.8vh,14px);letter-spacing:.06em;color:#8a3b22;margin-bottom:2px}
.study .sec .txt{margin:0;font-family:var(--face-display,serif);font-size:clamp(15px,2.45vh,20px);line-height:1.6;word-break:keep-all}
/* 바꿔 읽은 문장 — 조약문이 아니다. 빛깔과 꼴이 다르다. */
.study .sec.mirror .txt{color:#1f4a66;font-style:italic}
.study .sec .tag{display:none;margin-top:4px;font-size:clamp(11.5px,1.7vh,13px);color:#1f4a66}
.study .sec.mirror .tag{display:block}
.study .blank{display:inline-block;margin:0 2px;padding:0 .5em;min-width:calc(var(--n,2) * 1em + 1em);height:1.5em;line-height:1.4;
  font:inherit;color:#8a3b22;background:#00000012;border:0;border-bottom:2px solid #8a6a44;border-radius:2px 2px 0 0;
  cursor:pointer;text-align:center}
.study .blank.on{background:#e0a23a33;outline:2px solid #b0701a;outline-offset:1px}
.study .blank.done{background:transparent;border-bottom-color:transparent;font-weight:600;cursor:default;min-width:0;padding:0 1px;outline:none}
/* 주석 — 붉은 먹으로 여백에 적는다. */
.study .notes{list-style:none;margin:3px 0 0;padding:0;display:flex;flex-direction:column;gap:3px}
.study .notes li{font-size:clamp(12.5px,1.9vh,15px);line-height:1.45;color:#a3302a;padding-left:1.1em;position:relative;word-break:keep-all}
.study .notes li::before{content:'✎';position:absolute;left:0;top:0;font-size:.85em}
.study .notes li.new{animation:study-note .5s ease-out}
@keyframes study-note{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.study .free-notes{border-top:1px dashed #a3302a66;padding-top:6px}
.study .notes:empty{display:none}
/* 뜯어 읽을 글자 — 문서 머리에 크게 찍어 둔다(「두 글자」 판의 屬邦). */
.study .glyphs{align-self:center;font-family:var(--face-display,serif);font-size:clamp(34px,8vh,64px);line-height:1.1;letter-spacing:.3em;
  padding-left:.3em;color:#a3302a}
.study .src{font-size:clamp(11px,1.6vh,12.5px);line-height:1.5;color:#a9a394;word-break:keep-all}

/* ── 물음 ── */
.study .side{min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:clamp(8px,1.6vh,14px)}
.study h2{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.08em;
  font-size:clamp(18px,3.2vh,26px);color:#e8b45c}
.study .lead{margin:0;font-size:clamp(13px,2vh,15.5px);line-height:1.6;color:#cfc8b8;word-break:keep-all}
.study .pips{display:flex;gap:6px;align-items:center}
.study .pips i{flex:1;max-width:44px;height:6px;border-radius:3px;background:#3a444a}
.study .pips i.done{background:#a3302a}
.study .pips i.now{background:#e0a23a}
.study .ask{margin:0;font-family:var(--face-display,serif);font-size:clamp(16px,2.8vh,22px);line-height:1.55;color:#fdf6e6;word-break:keep-all}
.study .flipbtn{align-self:flex-start;padding:clamp(8px,1.6vh,12px) 18px;background:#1f4a66;border:1px solid #6fa3c2;color:#e6f3fb;
  border-radius:4px;font-family:inherit;font-size:clamp(14px,2.2vh,17px);cursor:pointer}
.study .flipbtn.back{background:transparent;color:#9fc0cc}
.study .opts{display:flex;flex-direction:column;gap:clamp(6px,1.2vh,10px)}
.study .opt{padding:clamp(9px,1.8vh,14px) 16px;text-align:left;background:#262d32;border:1px solid #55646b;color:#f3ede0;
  border-radius:4px;font-family:inherit;font-size:clamp(14.5px,2.3vh,18px);line-height:1.5;cursor:pointer;word-break:keep-all}
.study .opt:hover:not(:disabled){border-color:#e0a23a;background:#2e363c}
.study .opt:disabled{opacity:.45;cursor:not-allowed}
.study .opt.no{animation:study-no .3s;opacity:.5}
@keyframes study-no{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.study .opt.glow,.study .chip.glow{border-color:#e0a23a;box-shadow:0 0 0 3px #e0a23a55}
.study .chips{display:flex;flex-wrap:wrap;gap:8px}
.study .chip{padding:clamp(7px,1.4vh,11px) 16px;background:#fbf5e4;border:1px solid #8a6a44;border-radius:3px;font-family:inherit;
  font-size:clamp(15px,2.4vh,19px);color:#3a2d1a;cursor:pointer;box-shadow:0 2px 0 #00000055}
.study .chip.used{visibility:hidden}
.study .chip.no{animation:study-no .3s}
.study .say{min-height:2.8em;margin:0;font-size:clamp(14px,2.2vh,17px);line-height:1.6;color:#f2d79b;word-break:keep-all}
.study .say.ok{color:#fdf6e6;border-left:4px solid #a3302a;padding-left:12px}
.study .side.done .stage{order:1;display:flex;flex-direction:column;gap:clamp(8px,1.6vh,14px);flex:1 1 auto}
.study .after{display:flex;flex-direction:column;gap:6px}
.study .after p{margin:0;font-size:clamp(14px,2.2vh,17px);line-height:1.7;color:#ece6d6;word-break:keep-all}
.study .close{margin-top:auto;flex:0 0 auto;padding:clamp(10px,1.9vh,14px) 24px;background:#3a2d20;border:1px solid #6a5230;color:#f0c469;
  border-radius:3px;font-family:inherit;font-size:clamp(15px,2.3vh,17px);cursor:pointer}
.study .opt:focus-visible,.study .chip:focus-visible,.study .close:focus-visible,.study .flipbtn:focus-visible,.study .blank:focus-visible{
  outline:3px solid #e0a23a;outline-offset:2px}

@media(max-width:720px){
  .study .wrap{grid-template-columns:1fr;grid-template-rows:minmax(0,44%) minmax(0,1fr)}
}
@media(prefers-reduced-motion:reduce){.study .notes li.new,.study .opt.no,.study .chip.no{animation:none}.study .sec{transition:none}}
/* 2026-10-06 「선택지마다 그림을 만들어 힉스필드로」 — 지금 대목을 읽고 그림 보기를 고른다. */
${CHOICE_ART_CSS}
.study{overflow-y:auto;display:block}
.study .wrap{max-width:1440px;margin:auto;height:auto;min-height:100%;grid-template-columns:minmax(300px,.85fr) minmax(0,1.55fr);padding:30px 26px;gap:28px;align-items:start}
.study .sheet{position:sticky;top:24px;max-height:calc(100dvh - 54px);gap:12px}
.study .paper{padding:24px 20px;gap:16px;flex:1 1 auto}
.study .paper h3{font-size:19px;line-height:1.6;letter-spacing:0}
.study .sec{padding:12px 12px}
.study .sec .lab{font-size:15px;margin-bottom:8px}
.study .sec .txt{font-family:var(--face-body,system-ui,sans-serif);font-size:22px;line-height:1.85;letter-spacing:0}
.study .src{font-size:14px;line-height:1.65;color:#c0b9a9}
.study .side{overflow:visible;gap:20px}
.study h2{font-size:clamp(25px,2.7vw,35px);line-height:1.4;letter-spacing:0}
.study .background-note{font-size:16px;color:#c9c3b7;line-height:1.7}
.study .background-note summary{cursor:pointer;color:#d7c5a2}
.study .lead{font-size:17px;line-height:1.75;padding-top:8px}
.study .step-count{font-size:15px;color:#c3b59e}
.study .stage{display:flex;flex-direction:column;gap:18px}
.study .ask{font-family:var(--face-body,system-ui,sans-serif);font-size:24px;line-height:1.65;letter-spacing:0;text-align:center}
.study .flipbtn{font-size:18px;min-height:48px}
.study .opts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:stretch}
.study .opts:has(>.opt:last-child:nth-child(2)){grid-template-columns:repeat(2,minmax(0,1fr))}
.study .opt{padding:0;border-radius:9px;overflow:hidden;font-size:20px;line-height:1.6;display:flex;flex-direction:column}
.study .opt .choice-art{width:100%;height:145px;flex-shrink:0}
.study .opt .study-choice-label{display:block;padding:15px 13px}
.study .opt:disabled{opacity:.65}
.study .chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.study .chip{padding:0;border-radius:8px;overflow:hidden;font-size:21px;background:#eee3c6}
.study .chip .choice-art{height:110px}
.study .chip .study-choice-label{display:block;padding:10px}
.study .say{font-size:20px;line-height:1.75;margin-top:0}
.study .notes li{font-size:17px;line-height:1.65}
.study .after p{font-size:22px;line-height:1.85}
.study .close{font-size:20px;min-height:52px;margin-top:18px}
.study .source-toggle{border:1px solid #957b55;color:#5b4425;background:transparent;padding:10px;font-family:inherit;font-size:16px;line-height:1.5;cursor:pointer}
.study .source-toggle:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}
.study [hidden]{display:none!important}
@media(max-width:800px){.study .wrap{grid-template-columns:1fr;grid-template-rows:auto auto;padding:22px 16px}.study .sheet{position:static;max-height:none}.study .paper{max-height:none;padding:18px}.study .sec .txt{font-size:21px}.study .opts{grid-template-columns:repeat(2,minmax(0,1fr))}.study .opt .choice-art{height:140px}}
@media(max-width:480px){.study .opts,.study .opts:has(>.opt:last-child:nth-child(2)){grid-template-columns:1fr}.study .opt{display:grid;grid-template-columns:120px minmax(0,1fr);align-items:center}.study .opt .choice-art{height:120px}.study .opt .choice-art small{font-size:9px;right:2px;left:2px;text-align:center}.study .opt .study-choice-label{padding:13px}.study .chips{grid-template-columns:repeat(2,minmax(0,1fr))}.study .ask{font-size:22px}}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function sectionHtml(sec) {
  const body = sec.parts.map(p => p.blank == null
    ? esc(p.text)
    : `<button type="button" class="blank" data-blank="${esc(p.blank)}" style="--n:${[...p.answer].length}" aria-label="빈칸"></button>`).join('')
  return `<div class="sec" data-sec="${esc(sec.id)}">
    <span class="lab">${esc(sec.label ?? '')}</span>
    <p class="txt" data-txt>${body}</p>
    <div class="tag">↔ 두 나라를 바꿔 읽은 것 — 문서에 적힌 글이 아닙니다</div>
    <ul class="notes" data-notes="${esc(sec.id)}"></ul>
  </div>`
}

export function studyHtml(study) {
  const n = stepCount(study)
  return `<div class="wrap">
    <div class="sheet">
      <div class="paper">
        <h3>${esc(study.paper ?? '')}</h3>
        ${study.glyphs ? `<div class="glyphs" aria-label="${esc(study.glyphs)}">${esc(study.glyphs)}</div>` : ''}
        ${sectionsOf(study).map(sectionHtml).join('')}
        <ul class="notes free-notes" data-notes=""></ul>
        <button type="button" class="source-toggle" aria-expanded="false">문서 전체 펼치기</button>
      </div>
      <div class="src">${esc(study.origin ?? '')}</div>
    </div>
    <div class="side">
      <h2>${esc(study.title)}</h2>
      <details class="background-note"><summary>이 문서가 온 까닭</summary><p class="lead">${esc(study.lead ?? '')}</p></details>
      <div class="step-count" aria-live="polite"></div>
      <div class="pips" aria-hidden="true">${Array.from({ length: n }, () => '<i></i>').join('')}</div>
      <div class="stage" data-stage></div>
      <p class="say" aria-live="polite"></p>
    </div>
  </div>`
}

export function createDocStudy(root) {
  ensureStyle()
  return {
    open(study, { onRight = null, onMiss = null, onFlip = null } = {}) {
      return new Promise(resolve => {
        let state = initialStudy()
        const el = document.createElement('div')
        el.className = 'study'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.innerHTML = studyHtml(study)
        root.appendChild(el)

        const $ = sel => el.querySelector(sel)
        const stage = $('[data-stage]'), say = $('.say')
        const pips = [...el.querySelectorAll('.pips i')]
        const secEls = new Map([...el.querySelectorAll('[data-sec]')].map(s => [s.dataset.sec, s]))
        const original = new Map([...secEls].map(([id, s]) => [id, s.querySelector('[data-txt]').innerHTML]))
        let shownNotes = 0
        let showingMirror = false
        let wholePaper = false
        $('.source-toggle').addEventListener('click', () => { wholePaper = !wholePaper; paintPaper() })

        function paintPaper() {
          const step = stepAt(study, state)
          const focusSection = step?.section ?? (step?.kind === 'fill' ? activeBlank(study, state)?.split(':')[0] : null)
          const canFold = !state.done && !!focusSection && secEls.size > 1
          $('.source-toggle').hidden = !canFold
          $('.source-toggle').textContent = wholePaper ? '지금 대목만 보기' : '문서 전체 펼치기'
          $('.source-toggle').setAttribute('aria-expanded', String(wholePaper))
          $('.step-count').textContent = state.done ? '문서 읽기를 마쳤다' : `${state.step + 1} / ${stepCount(study)} · 한 대목씩 읽는다`
          for (const [id, s] of secEls) {
            s.hidden = canFold && !wholePaper && id !== focusSection
            s.classList.toggle('on', !!step && step.section === id)
            const mirror = !!step && step.kind === 'flip' && step.section === id && showingMirror
            s.classList.toggle('mirror', mirror)
            const txt = s.querySelector('[data-txt]')
            const want = mirror ? esc(step.mirror) : original.get(id)
            if (txt.dataset.mode !== (mirror ? 'm' : 'o')) { txt.dataset.mode = mirror ? 'm' : 'o'; txt.innerHTML = want }
          }
          // 빈칸
          const active = activeBlank(study, state)
          for (const b of el.querySelectorAll('[data-blank]')) {
            const word = state.filled[b.dataset.blank]
            b.classList.toggle('done', !!word)
            b.classList.toggle('on', !word && b.dataset.blank === active)
            if (word) { b.textContent = word; b.disabled = true }
            if (!b.dataset.bound) {
              b.dataset.bound = '1'
              b.addEventListener('click', () => { state = focusBlank(study, state, b.dataset.blank); paintPaper() })
            }
          }
          // 새 주석
          for (; shownNotes < state.notes.length; shownNotes++) {
            const note = state.notes[shownNotes]
            const list = el.querySelector(`[data-notes="${note.section ?? ''}"]`) ?? $('.free-notes')
            const li = document.createElement('li')
            li.className = 'new'
            li.textContent = note.text
            list.appendChild(li)
            li.scrollIntoView?.({ block: 'nearest' })
          }
          pips.forEach((p, i) => { p.classList.toggle('done', i < state.step); p.classList.toggle('now', i === state.step && !state.done) })
          $('.side').classList.toggle('done', state.done)
          // 지금 묻는 대목이 보이게 한다(좁은 화면에서는 문서가 구른다).
          if (step?.section) secEls.get(step.section)?.scrollIntoView?.({ block: 'nearest' })
        }

        function paintStage() {
          const step = stepAt(study, state)
          stage.innerHTML = ''
          if (!step) {
            const after = document.createElement('div'); after.className = 'after'
            for (const line of study.after ?? []) { const p = document.createElement('p'); p.textContent = line; after.appendChild(p) }
            const close = document.createElement('button'); close.type = 'button'; close.className = 'close'
            close.textContent = study.doneLabel ?? '문서를 덮는다'
            let closed = false
            close.addEventListener('click', () => { if (closed) return; closed = true; el.remove(); resolve(studyRecord(study, state)) })
            stage.append(after, close)
            close.focus?.()
            return
          }
          const ask = document.createElement('p'); ask.className = 'ask'; ask.textContent = step.ask
          stage.appendChild(ask)
          const hint = studyHint(study, state)

          if (step.kind === 'flip') {
            const fb = document.createElement('button'); fb.type = 'button'
            fb.className = 'flipbtn' + (showingMirror ? ' back' : '')
            fb.textContent = showingMirror ? '↩ 문서에 적힌 글로 되돌린다' : '↔ 두 나라를 바꿔 읽는다'
            fb.addEventListener('click', () => {
              if (!state.flipped) { state = flip(study, state); onFlip?.() }
              showingMirror = !showingMirror
              paintPaper(); paintStage()
            })
            stage.appendChild(fb)
          }

          if (step.kind === 'fill') {
            const chips = document.createElement('div'); chips.className = 'chips'
            const usedWords = Object.values(state.filled)
            for (const c of chipsOf(study, step)) {
              const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'
              b.dataset.word = c.word
              b.innerHTML = choiceArtHtml(choiceArtKey('word', study.id, state.step, c.word)) + `<span class="study-choice-label">${esc(c.word)}</span>`
              if (usedWords.includes(c.word)) b.classList.add('used')
              if (hint === c.word) b.classList.add('glow')
              b.addEventListener('click', () => respond({ word: c.word }, b))
              chips.appendChild(b)
            }
            stage.appendChild(chips)
            return
          }

          const opts = document.createElement('div'); opts.className = 'opts'
          for (const o of step.options ?? []) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'
            b.dataset.choice = o.id
            b.innerHTML = choiceArtHtml(choiceArtKey('study', study.id, state.step, o.id)) + `<span class="study-choice-label">${esc(o.text)}</span>`
            // 바꿔 읽기 전에는 답할 수 없다 — 읽어 보지 않고 찍지 않게.
            if (step.kind === 'flip' && !state.flipped) b.disabled = true
            if (hint === o.id) b.classList.add('glow')
            b.addEventListener('click', () => respond(o.id, b))
            opts.appendChild(b)
          }
          stage.appendChild(opts)
        }

        function respond(payload, btn) {
          const r = answer(study, state, payload)
          const missed = r.state.misses > state.misses
          state = r.state
          say.textContent = r.say ?? ''
          say.classList.toggle('ok', r.ok)
          if (r.ok) {
            onRight?.()
            showingMirror = false
            paintPaper(); paintStage()
          } else {
            if (missed && onMiss?.(r.say) === true) return
            btn?.classList.remove('no'); void btn?.offsetWidth; btn?.classList.add('no')
            const hint = studyHint(study, state)
            if (hint != null) paintStage()
            else paintPaper()
          }
        }

        paintPaper(); paintStage()
      })
    },
  }
}
