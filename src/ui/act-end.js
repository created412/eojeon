import { SOURCES, sourceById } from '../data/sources.js'
import { lostWithReason, everRead } from '../systems/loss-log.js'
import { ACTS } from '../data/acts.js'
import { PALACES } from '../data/palaces.js'
import { freedomRecord } from '../systems/freedom.js'
import { ageAt } from '../systems/king-age.js'
import { installTypeVars } from './type-css.js'

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
//
// 2026-10-06 이야기 점검 — 「궁을 N번 옮겼다」였다. 마지막 두 자리(북묘·오조유의 영방)는
// 궁이 아니다 — 그 이어 화면이 스스로 「여기는 궁도 사당도 아니고 청군의 군영입니다」라고
// 적는다. 「거처」로 고친다. 그리고 그 수는 **화면에 나온 것만** 센 것이다(3막 끝이
// 줄였다고 밝힌 세 번이 빠져 있다) — 그래서 「화면에서」라고 적는다.
//
// 가운데 한 줄은 이 이야기의 처음과 끝이다. 열두 살의 명복은 남이 댄 가마에 올라
// 집을 나섰고, 서른세 살의 임금은 남의 군영에 와 있다. 선생님(2026-10-06): 「역사 내용과
// 고종의 입장에 감정이입이 될 수 있게.」 나이는 햇수와 마찬가지로 ACTS 에서 센다.
export function finalPlaceName(id) {
  // 「오조유의 영방」은 이름만으로는 무엇인지 알 수 없다 — 그 이어 화면의 풀이를 따른다.
  if (id === 'ojoyu') return '청군의 군영'
  return PALACES[id]?.name ?? null
}

export function finalLead(state, acts = ACTS) {
  const span = actSpan(acts)
  const moves = state?.moves ?? []
  const last = moves[moves.length - 1]?.to
  const where = finalPlaceName(last)
  // 앞서 살던 곳으로 되돌아왔으면 「돌아와 있다」다(2026-10-06 — 끝이 청군의 군영에서 창덕궁으로 옮겨졌다).
  const back = moves.slice(0, -1).some(m => m.to === last || m.from === last)
  const arc = where
    ? `${nativeCount(ageAt(span.from))} 살에 남이 댄 가마를 타고 운현궁을 나섰고, `
      + `${nativeCount(ageAt(span.to))} 살에 ${where}에 ${back ? '돌아와' : '와'} 있다.<br>`
    : ''
  return `${span.from}년부터 ${span.to}년까지, ${nativeCount(span.span)} 해를 지났다.<br>`
    + arc
    + `그 사이 화면에서 거처를 ${moves.length}번 옮겼다. 그 가운데 스스로 정한 것이 몇 번인지는 당신이 센다.`
}

// 옮겨 다닌 자리의 목록 — 「당신이 센다」고 해 놓고 셀 것을 주지 않았다(2026-10-06).
// 해·어디서 어디로·까닭만 적는다. **스스로 정했는지는 적지 않는다**(판정 R98) — 그것을
// 정하는 일이 학생의 몫이다. self 값은 이 함수에 들어오지도 않는다.
export function moveRows(state) {
  return (state?.moves ?? []).map(m => ({
    year: m.year ?? '',
    from: PALACES[m.from]?.name ?? m.from ?? '',
    to: PALACES[m.to]?.name ?? m.to ?? '',
    cause: m.cause ?? '',
  }))
}

// 3막 끝(acts.js 의 'end')이 「화면에서 뺐다」고 밝힌 이어 세 번. 목록이 1868년에서
// 1884년으로 건너뛰고 그 사이에 궁이 바뀌어 있으므로, 빠진 것이 있다고 여기서도 말한다.
export const MOVES_OMITTED_NOTE =
  '※ 3막 끝에 적어 둔 세 번(1873년부터 창덕궁과 경복궁을 오간 것)은 화면에서 줄여 이 목록에 없습니다.'

// 마지막 화면이 학생에게 남기는 물음. 예전에는 「불타는 궁에서 무엇을 골랐나요?」였다 —
// 그 장면(1876년 화재)은 2026-09-26 에 걷어 냈는데 물음만 남아, 학생이 게임에서 마지막으로
// 읽는 글이 보지도 않은 장면을 묻고 있었다. 이 게임이 끝까지 끌고 온 두 가지를 묻는다:
// 스스로 정한 것을 어떻게 셀 것인가, 그리고 그 자리에 앉은 사람은 어땠겠는가.
export const FINAL_QUESTIONS = [
  '위에 적힌 옮김 가운데 임금이 스스로 정한 것은 몇 번인가요? 무엇을 근거로 그렇게 세었나요?',
  '그 자리에 앉아 있던 사람은 그때마다 무엇을 할 수 있었을까요? 당신이라면 어느 날이 가장 견디기 어려웠을까요?',
]

// justify-content:center + overflow:auto 만으로는 부족하다 — 내용이 화면보다
// 길면 Chrome 이 위쪽을 스크롤로도 닿지 않는 자리에 그려 버린다("safe" 없는
// 가운데 정렬의 알려진 함정). "safe center"를 써서, 다 들어갈 때는 가운데,
// 넘칠 때는 위부터 스크롤되게 한다 — 화면 확인(2단계 재제작) 중 발견.
const CSS = `
.actend{position:fixed;inset:0;background:#0f1113;z-index:52;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:16px;padding:28px;text-align:center;overflow:auto}
/* 자간은 표제 한 줄에만 남는다 — 아래 이름표·꼬리말에서는 걷어 냈다(ui/type-css.js §2). */
.actend h2{margin:0;font-size:var(--read-lead,15px);color:#c9c1ad;letter-spacing:.3em;font-weight:400;
  font-family:var(--face-display,serif)}
.actend p{margin:0;font-size:var(--read-body,20px);color:var(--paper-strong,#e8e2d4);
  line-height:var(--read-lh-body,1.8);max-width:min(100%,var(--read-measure,620px));word-break:keep-all;text-wrap:balance}
.actend .read{font-size:var(--read-small,12px);color:var(--paper-quiet,#8f8a7c);letter-spacing:normal}
/* 학생이 쓴 한 줄은 사관이 받아 적은 것이다 — 종이 위에 얹는다. 이 화면에서
   학생이 자기 글을 만나는 유일한 자리이고, 활동지로 옮겨 적을 그 문장이다. */
.actend .reason{font-size:var(--read-body,16px);color:var(--ink-strong,#23201a);
  line-height:var(--read-lh-body,1.9);max-width:min(100%,var(--read-measure,560px));white-space:pre-wrap;
  background:#e9dfc6;background-image:var(--hanji);background-size:cover;background-position:center;
  border:1px solid #6b5a3e;border-radius:2px;padding:22px 26px;text-align:left;word-break:keep-all;
  box-shadow:0 10px 30px #0009, inset 0 0 50px #b39a6a2b}
.actend button{margin-top:8px;padding:13px 30px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:var(--read-label,15px);cursor:pointer}
`

const FINAL_CSS = `
.actend.final{justify-content:flex-start;gap:14px;padding:36px 22px;overflow:auto;z-index:58}
.actend.final h2{font-size:var(--read-title,17px);color:#f0ead9;letter-spacing:.34em}
.actend .sub{font-size:var(--read-small,14px);color:var(--paper-quiet,#8f8a7c);text-align:left;
  max-width:min(100%,var(--read-measure,620px));line-height:var(--read-lh-small,1.8);word-break:keep-all;text-wrap:balance}
.actend .box{width:100%;max-width:min(100%,660px);background:#15181b;border:1px solid #2a3035;border-radius:3px;
  padding:16px 18px}
.actend .box b{display:block;font-size:var(--read-label,12px);color:var(--paper-quiet,#8f8a7c);
  letter-spacing:.02em;margin-bottom:10px}
.actend .row{font-size:var(--read-small,14px);color:var(--paper-strong,#e8e2d4);padding:5px 0;border-bottom:1px solid #22272b}
.actend .row.gone{color:#a09884;text-decoration:line-through}
.actend .row .tag{float:right;font-size:var(--read-caption,11px);color:#cf7a4e;text-decoration:none}
.actend .row.locked{color:#78838b}
.actend .row.locked small{display:block;color:var(--paper-quiet,#8f8a7c);font-size:var(--read-caption,11px);text-decoration:none}
.actend .row .yr{display:inline-block;margin-right:.5em;color:var(--paper-quiet,#8f8a7c);font-variant-numeric:tabular-nums}
.actend .row .why{display:block;color:var(--paper-quiet,#8f8a7c);font-size:var(--read-caption,12px)}
.actend .box .omit{font-size:var(--read-caption,12px);color:var(--paper-quiet,#8f8a7c);padding-top:8px;line-height:1.7;word-break:keep-all}
.actend .foot{font-size:var(--read-small,13px);color:var(--paper-quiet,#8f8a7c);text-align:left;
  max-width:min(100%,var(--read-measure,560px));line-height:var(--read-lh-small,1.9);word-break:keep-all;text-wrap:balance}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.textContent = CSS + FINAL_CSS
  document.head.appendChild(style)
  styled = true
}

// view = { title, lines?, read?, reason?, next?, last? }
// ※ lost 는 지운다 — 아무도 채우지 않는 죽은 칸이었다(showActEnd 가 다섯 칸만 골라 넘긴다).
//   안 쓰는 칸을 남겨 두면 다음 사람이 「채워야 하는데 빠졌다」고 읽는다. 이 막에서
//   무엇을 잃었는지는 마지막 화면(showFinal)이 lostWithReason() 으로 보여 준다.
//   tests/full-run.test.js 의 view 조립 검사가 showActEnd 를 함께 본다.
// reason 은 학생이 쓴 글이다 — textContent 로만 넣는다, innerHTML 에 절대 섞지 않는다.
// ※ 「내 기록 복사」 단추는 없다 — 선생님(2026-09-29) 지적 #22 로 걷어냈다.
//   기록을 짓는 셈(main.js buildRecordText)은 그대로 남아 있다. 그 글을 어디에
//   둘지(멈춤 화면? 교사용 화면? 아예 없앨지)는 선생님 말씀을 기다리는 중이다.
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

        root.appendChild(el)
        // 마지막 화면은 남긴다. 게임 오버 화면이 아니라 막의 끝이다 — 전역 제약
        if (view.last) return
        const nextBtn = document.createElement('button')
        nextBtn.textContent = view.next ?? '다음'
        nextBtn.addEventListener('click', () => { el.remove(); resolve() })
        el.appendChild(nextBtn)
      })
    },

    // 다섯 막이 다 끝난 뒤 남기는 마지막 화면. 복사 단추는 지적 #22 로 걷어냈다 —
    // 저장은 그대로 두므로 학생이 「처음부터」를 직접 고를 때까지 이 화면은 다시 열 수 있다.
    //
    // 2026-10-06 이야기 점검 — 이 화면은 세 막짜리였을 때의 모습 그대로였다:
    //   · 「불에 잃은 문서」 칸과 「불타는 궁에서 무엇을 골랐나요?」 — 그 장면은 걷어 냈다.
    //     칸은 불로 잃은 것이 실제로 있을 때만(옛 저장) 보인다.
    //   · 「이제 열리지 않는 것」 — 「다음 막의 어전회의」를 내다보는 표본이었는데, 4·5막의
    //     어전회의는 이제 실제로 치렀고 그 뒤에는 다음 막이 없다. 걷어 냈다
    //     (FUTURE_COUNCIL 표본은 data/acts.js 에 그대로 있다).
    //   · 「당신이 센다」고 하면서 셀 목록이 없었다 — 옮겨 다닌 자리를 맨 위에 적는다.
    showFinal(state) {
      return new Promise(() => {   // 마지막 화면이다. 닫지 않는다.
        const kept = state.sources.held.map(id => sourceById(id)).filter(Boolean)
        const burnt = lostWithReason(state, 'fire').map(id => sourceById(id)).filter(Boolean)
        const taken = lostWithReason(state, 'plunder').map(id => sourceById(id)).filter(Boolean)
        const moved = moveRows(state)
        // everRead() 로 센다 — sources.read 만 쓰면 불타거나 약탈당한 문서가
        // "안 읽음"으로 보인다(2단계 Important 1)
        const read = everRead(state).length

        const el = document.createElement('div')
        el.className = 'actend final'
        el.innerHTML = `
          <h2>나 의  기 록</h2>
          <div class="sub">${finalLead(state)}</div>

          <div class="box"><b>옮겨 다닌 자리 ${moved.length}</b>
            ${moved.map(m => `<div class="row"><span class="yr">${m.year}</span>${m.from} → ${m.to}<span class="why">${m.cause}</span></div>`).join('') || '<div class="row">없다</div>'}
            <div class="omit">${MOVES_OMITTED_NOTE}</div></div>

          <div class="box"><b>들고 나온 문서 ${kept.length}</b>
            ${kept.map(c => `<div class="row">${c.title}</div>`).join('') || '<div class="row">없다</div>'}</div>

          ${burnt.length ? `<div class="box"><b>불에 잃은 문서 ${burnt.length}</b>
            ${burnt.map(c => `<div class="row gone">${c.title}<span class="tag">불탐</span></div>`).join('')}</div>` : ''}

          <div class="box"><b>약탈로 잃은 문서 ${taken.length}</b>
            ${taken.map(c => `<div class="row gone">${c.title}<span class="tag">약탈됨 · 프랑스</span></div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="foot">
            읽은 문서 ${read}장 / 전체 ${SOURCES.length}장.<br>
            ${FINAL_QUESTIONS.join('<br>')}
          </div>`
        root.appendChild(el)

        const journey = freedomRecord(state)
        if (journey.length) {
          const box = document.createElement('div'); box.className = 'box'
          const title = document.createElement('b'); title.textContent = '내가 고른 여정과 하지 않은 일'
          box.appendChild(title)
          for (const line of journey) {
            const row = document.createElement('div'); row.className = 'row'; row.textContent = line
            box.appendChild(row)
          }
          el.appendChild(box)
        }

      })
    },
  }
}
