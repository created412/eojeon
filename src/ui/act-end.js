import { SOURCES, sourceById } from '../data/sources.js'
import { evaluateChoices } from '../systems/council.js'
import { lostWithReason, everRead } from '../systems/loss-log.js'
import { ACTS, FUTURE_COUNCIL } from '../data/acts.js'

// 마지막 화면의 「몇 년부터 몇 년까지, 몇 해를 지났다」를 ACTS 에서 뽑는다.
// 손으로 적어 두면 막이 하나 붙는 순간 조용히 거짓말이 된다 — 실제로 그랬다:
// 3막까지였을 때 적어 둔 「1863년부터 1877년까지, 열네 해」가, 4막 「임오」(1882)가
// 붙은 뒤에도 그대로 남아 있었다. 끝 해는 막의 year 만으로는 모자란다(3막은
// year 가 1873 인데 마지막 이어가 1877 이다) — 비트의 year 까지 함께 본다.
export function actSpan(acts = ACTS) {
  const from = acts[0]?.year
  const last = acts[acts.length - 1]
  const years = [last?.year, ...(last?.beats ?? []).map(b => b.year)].filter(y => typeof y === 'number')
  const to = Math.max(...years)
  return { from, to, span: to - from }
}

// 「열네 해」처럼 우리말 수로 읽는다 — 「14해」는 소리 내 읽히지 않는다.
const NATIVE_TENS = ['', '열', '스물', '서른', '마흔', '쉰']
const NATIVE_ONES = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉']
export function nativeCount(n) {
  if (!Number.isInteger(n) || n < 1 || n > 59) return String(n)
  const t = NATIVE_TENS[Math.floor(n / 10)]
  const o = NATIVE_ONES[n % 10]
  return `${t}${o}` || String(n)
}

// 마지막 화면의 머리 두 줄. 순수 함수로 빼 둔 까닭은 판정 R98 이다.
//
// 예전에 이 자리는 state.moves 의 self 를 **참·거짓으로 걸러** 세었다. 그런데 1884년
// 환어의 self 는 'disputed' 다 — 「스스로 정했다고 할 수 있는가」가 학생의 문제로
// 남아야 하기 때문이다(설계서 13.2). 문자열은 참으로 셈해지므로, 바로 앞 비트가
// 「몇 번이었는지는 이 게임이 말하지 않는다」고 말한 그 숫자를 다음 화면이
// 「2번이었다」고 말해 버렸다. 학생이 게임에서 마지막으로 읽는 두 화면이 정면으로
// 어긋난 것이다.
//
// 그래서 **이 화면은 스스로 정한 이동을 세지 않는다.** 무엇을 한 번의 이어로 볼
// 것인지 정하는 일이 곧 역사가의 일이고, 그것을 학생이 하는 것이 이 게임에서
// 가장 좋은 대목이다. 세는 장치는 4단계 엔딩이 학생 손에 쥐여 준다(판정 R55).
// 옮긴 횟수 자체는 기록이 남긴 사실이라 그대로 적는다.
export function finalLead(state, acts = ACTS) {
  const span = actSpan(acts)
  const moves = (state?.moves ?? []).length
  return `${span.from}년부터 ${span.to}년까지, ${nativeCount(span.span)} 해를 지났다.<br>`
    + `궁을 ${moves}번 옮겼다. 그 가운데 스스로 정한 것이 몇 번인지는 당신이 센다.`
}

// justify-content:center + overflow:auto 만으로는 부족하다 — 내용이 화면보다
// 길면 Chrome 이 위쪽을 스크롤로도 닿지 않는 자리에 그려 버린다("safe" 없는
// 가운데 정렬의 알려진 함정). "safe center"를 써서, 다 들어갈 때는 가운데,
// 넘칠 때는 위부터 스크롤되게 한다 — 화면 확인(2단계 재제작) 중 발견.
const CSS = `
.actend{position:fixed;inset:0;background:#0f1113;z-index:52;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:16px;padding:28px;text-align:center;overflow:auto}
.actend h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:4px;font-weight:400}
.actend p{margin:0;font-size:20px;color:#e8e2d4;line-height:1.8;max-width:620px}
.actend .read{font-size:12px;color:#8f8a7c;letter-spacing:2px}
/* 학생이 쓴 한 줄은 사관이 받아 적은 것이다 — 종이 위에 얹는다. 이 화면에서
   학생이 자기 글을 만나는 유일한 자리이고, 활동지로 옮겨 적을 그 문장이다. */
.actend .reason{font-size:16px;color:#23201a;line-height:1.9;max-width:560px;white-space:pre-wrap;
  background:#e9dfc6;background-image:var(--hanji);background-size:cover;background-position:center;
  border:1px solid #6b5a3e;border-radius:2px;padding:20px 24px;text-align:left;word-break:keep-all;
  box-shadow:0 10px 30px #0009, inset 0 0 50px #b39a6a2b}
.actend button{margin-top:8px;padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

const FINAL_CSS = `
.actend.final{justify-content:flex-start;gap:12px;padding:36px 22px;overflow:auto;z-index:58}
.actend.final h2{font-size:17px;color:#e8e2d4;letter-spacing:6px}
.actend .sub{font-size:14px;color:#8f8a7c;text-align:center;max-width:620px;line-height:1.8}
.actend .box{width:100%;max-width:560px;background:#15181b;border:1px solid #2a3035;border-radius:3px;
  padding:14px 16px}
.actend .box b{display:block;font-size:12px;color:#8f8a7c;letter-spacing:2px;margin-bottom:8px}
.actend .row{font-size:14px;color:#e8e2d4;padding:4px 0;border-bottom:1px solid #22272b}
.actend .row.gone{color:#a09884;text-decoration:line-through}
.actend .row .tag{float:right;font-size:11px;color:#a0522d;text-decoration:none}
.actend .row.locked{color:#5f6971}
.actend .row.locked small{display:block;color:#8f8a7c;font-size:11px;text-decoration:none}
.actend .foot{font-size:13px;color:#8f8a7c;text-align:center;max-width:560px;line-height:1.9}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS + FINAL_CSS
  document.head.appendChild(style)
  styled = true
}

// view = { title, lines?, read?, reason?, next?, last?, onCopy?() }
// ※ lost 는 지운다 — 아무도 채우지 않는 죽은 칸이었다(showActEnd 가 다섯 칸만 골라 넘긴다).
//   안 쓰는 칸을 남겨 두면 다음 사람이 「채워야 하는데 빠졌다」고 읽는다. 이 막에서
//   무엇을 잃었는지는 마지막 화면(showFinal)이 lostWithReason() 으로 보여 준다.
//   tests/full-run.test.js 의 view 조립 검사가 showActEnd 를 함께 본다.
// reason 은 학생이 쓴 글이다 — textContent 로만 넣는다, innerHTML 에 절대 섞지 않는다.
// onCopy 가 있으면 「내 기록 복사」 단추를 낸다 — 1단계의 판정을 그대로 잇는다.
export function createActEnd(root) {
  ensureStyle()

  return {
    show(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'actend'
        el.innerHTML = `
          <h2>${view.title}</h2>
          ${(view.lines ?? []).map(l => `<p>${l}</p>`).join('')}
          ${view.read ? `<div class="read">${view.read}</div>` : ''}`

        if (view.reason) {
          const label = document.createElement('div')
          label.className = 'read'
          label.textContent = '사관이 적은 것'
          const body = document.createElement('p')
          body.className = 'reason'
          body.textContent = view.reason   // 학생이 쓴 글 — innerHTML 에 절대 섞지 않는다
          el.append(label, body)
        }

        if (view.onCopy) {
          const copyBtn = document.createElement('button')
          copyBtn.textContent = '내 기록 복사'
          copyBtn.addEventListener('click', () => view.onCopy())
          el.appendChild(copyBtn)
        }

        root.appendChild(el)
        // 마지막 화면은 남긴다. 게임 오버 화면이 아니라 막의 끝이다 — 전역 제약
        if (view.last) return
        const nextBtn = document.createElement('button')
        nextBtn.textContent = view.next ?? '다음'
        nextBtn.addEventListener('click', () => { el.remove(); resolve() })
        el.appendChild(nextBtn)
      })
    },

    // 1차시(1~3막) 전체가 끝난 뒤 남기는 마지막 화면. D1·D2 가 무엇을 지웠는지,
    // 그래서 다음 막의 어전회의에서 무엇이 열리지 않게 되었는지를 이름으로 되돌려준다
    // (설계서 9장). onCopy 가 있으면 「내 기록 복사」 단추를 낸다(2단계 Important 2) —
    // 이 화면이 게임의 유일한 끝이라 다른 데서 다시 복사할 길이 없다. 저장을 지우지
    // 않은 채로 여기 오므로, 잘못된 창에 붙여넣었어도 다시 눌러 다시 복사할 수 있다.
    showFinal(state, onCopy) {
      return new Promise(() => {   // 마지막 화면이다. 닫지 않는다.
        const kept = state.sources.held.map(id => sourceById(id)).filter(Boolean)
        const burnt = lostWithReason(state, 'fire').map(id => sourceById(id)).filter(Boolean)
        const taken = lostWithReason(state, 'plunder').map(id => sourceById(id)).filter(Boolean)
        const future = evaluateChoices(state, FUTURE_COUNCIL).filter(c => !c.unlocked)
        // everRead() 로 센다 — sources.read 만 쓰면 불타거나 약탈당한 문서가
        // "안 읽음"으로 보인다(2단계 Important 1)
        const read = everRead(state).length

        const el = document.createElement('div')
        el.className = 'actend final'
        el.innerHTML = `
          <h2>오 늘 은 여 기 까 지</h2>
          <div class="sub">${finalLead(state)}</div>

          <div class="box"><b>들고 나온 문서 ${kept.length}</b>
            ${kept.map(c => `<div class="row">${c.title}</div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="box"><b>불에 잃은 문서 ${burnt.length}</b>
            ${burnt.map(c => `<div class="row gone">${c.title}<span class="tag">불탐</span></div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="box"><b>약탈로 잃은 문서 ${taken.length}</b>
            ${taken.map(c => `<div class="row gone">${c.title}<span class="tag">약탈됨 · 프랑스</span></div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="box"><b>이제 열리지 않는 것</b>
            ${future.map(c => `<div class="row locked">???${c.missing.map(m => `<small>← 『${m}』이 사초함에 없다</small>`).join('')}</div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="foot">
            읽은 문서 ${read}장 / 전체 ${SOURCES.length}장.<br>
            불타는 궁에서 무엇을 골랐나요? 왜 그것이었나요?<br>
            버린 것 때문에 나중에 곤란해질까요?
          </div>`
        root.appendChild(el)

        if (onCopy) {
          const copyBtn = document.createElement('button')
          copyBtn.textContent = '내 기록 복사'
          copyBtn.addEventListener('click', () => onCopy())
          el.appendChild(copyBtn)
        }
      })
    },
  }
}
