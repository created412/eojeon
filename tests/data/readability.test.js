import { describe, it, expect } from 'vitest'
import { SOURCES } from '../../src/data/sources.js'
import { ACTS, FUTURE_COUNCIL } from '../../src/data/acts.js'

// 가독성 검수(2단계, 2026-09-04)의 부속 점검 4줄을 기계 검사로 옮긴 것이다.
// 하우스 룰: "어려운 한자어는 그것을 지우면 배울 것이 사라질 때만 화면에 남긴다.
// 남길 때는 반드시 글자를 쪼개 보여주고, 나머지는 전부 오늘날 말로 갈아 끼운다.
// 그리고 meaning 한 줄과 모든 단추는 어떤 말풀이도 없이 혼자 읽혀야 한다."
//
// 이 파일의 검사는 전부 "잘 쓴 문장을 오탐으로 거부하지 않는다"를 최우선으로 좁혀
// 잡았다 — 검사가 좋은 글을 틀렸다고 하면 글이 아니라 검사를 고친다(재제작 지시서의
// 원칙). 그래서 완벽한 검사가 아니라 "고의로 좁힌" 검사다. 왜 좁혔는지는 각 자리에
// 주석으로 남긴다.

const CJK = /[一-鿿]/

// ── 점검 1 — 분해 아니면 교체 ──────────────────────────────────────
// 가독성 검수가 [수업]으로 판정해 카드에 gloss(글자별 풀이)를 붙이기로 한 자리들.
// 이 목록은 "지금 gloss 를 가진 카드가 계속 gloss 를 가진다"는 회귀 방지 고정핀이다 —
// 새 카드가 어려운 한자어를 그대로 쓰기로 하면, 이 목록에 추가하고 gloss 를 채우거나
// (분해), 목록에 넣지 않고 낱말 자체를 갈아 끼운다(교체). 중간은 없다.
const DECOMPOSE_CARDS = [
  'wonnapjeon', 'dangbaekjeon', 'sherman', 'yangheonsu', 'oegyujanggak',
  'junggeon', 'cheokhwabi', 'seogye', 'choe-ikhyeon', 'ganghwa1', 'ganghwa10', 'joil-trade',
  // 3단계 — 지우면 배울 것이 사라지는 낱말을 품은 카드들. 교체가 아니라 분해다
  'yeongnam-manin', 'hong-jaehak', 'sokbang', 'reform14',
]

describe('부속 점검 1 — 분해 아니면 교체', () => {
  it('가독성 검수가 [수업]으로 판정한 카드는 모두 gloss(글자별 풀이)를 달고 있다', () => {
    for (const id of DECOMPOSE_CARDS) {
      const c = SOURCES.find(s => s.id === id)
      expect(c, id).toBeTruthy()
      expect(c.gloss, `${id} 는 어려운 한자어를 남기기로 했는데 gloss 가 없다`).toBeTruthy()
    }
  })

  // 글자별 풀이(·로 구분)가 기본형이지만, 「의궤」처럼 한자를 쪼개는 대신 낱말 하나를
  // 통째로 정의하는 방식도 있다("의궤 — 왕실의 큰 행사를…") — 둘 다 "낱말 뜻을
  // 화면에 남긴다"는 원칙은 지킨다. 처음에는 "·" 만 허용하다가 이 gloss 를
  // 오탐으로 거부해서, "—" 정의형도 인정하도록 검사를 넓혔다.
  it('gloss 가 있는 카드는 낱글자 풀이(·)나 낱말 정의(—) 방식으로 뜻을 화면에 남긴다', () => {
    for (const c of SOURCES) {
      if (!c.gloss) continue
      expect(c.gloss, c.id).toMatch(/·|—/)
    }
  })
})

// ── 점검 2 — meaning 줄 자립 검사 ──────────────────────────────────
// 「이 문서가 말하는 것」은 곁주 없이 혼자 읽혀야 한다. 그 자리에 무주석 한자가
// 남아 있으면 학생은 그 낱말을 몰라도 문장이 통한다고 착각한 채 지나간다.
//
// 다만 "황(皇)"·"칙(勅)"처럼 한글 소리를 먼저 적고 괄호 안에 한자를 병기하는
// 자리는 예외다 — 그 표기 자체가 이미 스스로 푸는 곁주이기 때문이다(seogye
// 카드의 meaning 이 그렇게 「황(皇)」·「칙(勅)」을 정의하며 쓴다 — 이 게임에서
// 가장 잘 고친 안전망 줄로 꼽힌 문장이다). 처음에는 "meaning 에 한자 금지"로
// 좁게 짰다가 이 문장을 오탐으로 거부해서, 검사를 넓혔다 — 문장을 깎지 않았다.
const SELF_GLOSSED_HANJA = /[가-힣]+\([一-鿿]+\)/g

describe('부속 점검 2 — meaning 자립 검사', () => {
  it('meaning 에 남은 한자는 모두 그 자리에서 한글 소리와 함께 스스로 풀린다', () => {
    for (const c of SOURCES) {
      const stripped = c.meaning.replace(SELF_GLOSSED_HANJA, '')
      expect(CJK.test(stripped), `${c.id}: "${c.meaning}"`).toBe(false)
    }
  })

  // 동음이의 금지 목록(役事/條文/政事/監司/軍民/自願) — meaning 은 안전망이므로
  // 이 낱말들이 원래 뜻이 아닌 다른 흔한 낱말로 읽힐 자리에 그대로 남으면 안 된다.
  it('meaning 에 동음이의 금지 목록의 낱말이 없다', () => {
    const BLOCKLIST = ['역사', '조문', '정사', '감사', '군민', '자원']
    for (const c of SOURCES) {
      for (const w of BLOCKLIST) {
        expect(c.meaning.includes(w), `${c.id} meaning 에 "${w}"`).toBe(false)
      }
    }
  })
})

// ── 점검 3 — 단추는 동사로 끝난다 ──────────────────────────────────
// exit.label 은 이 게임에서 학생이 실제로 누르는 안내문이다(hint 에 그대로 뜬다).
// "동사로 끝난다"를 문법적으로 완전히 판정할 수는 없으니, 두 가지만 기계로 잡는다 —
// (a) 서술형 종결 어미(~다)로 끝나는가, (b) 뜻을 숨긴 채 단추에만 올라온 전문어
// (환어·훈령)가 없는가. 「장계」는 예외다 — 2막 첫 단추가 "보고서(장계)"로 이미
// 병기해 두어, 그 자리가 곧 정의이기 때문이다(가독성 검수 D3).
describe('부속 점검 3 — 단추는 동사로 끝난다', () => {
  function exitLabels() {
    const labels = []
    for (const act of ACTS) {
      for (const b of act.beats ?? []) {
        if (b.exit?.label) labels.push({ id: `${act.id}/${b.id}`, label: b.exit.label })
        // 3단계가 「나들이(stop)」라는 새 단추 자리를 만들었다. exit.label 만 모으면 그 단추가
        // 검사 밖에 남는다 — 학생이 실제로 누르는 문구는 전부 같은 잣대를 받아야 한다.
        for (const st of b.stops ?? []) {
          labels.push({ id: `${act.id}/${b.id}/${st.id}`, label: st.label })
        }
      }
    }
    return labels
  }

  it('단추 문구는 모두 "E — " 로 시작해 서술형 동사(~다)로 끝난다', () => {
    for (const { id, label } of exitLabels()) {
      expect(label, id).toMatch(/^E — .+[가-힣]다$/)
    }
  })

  it('단추 문구에 뜻을 숨긴 전문어(환어·훈령)를 명사로만 올리지 않는다', () => {
    for (const { id, label } of exitLabels()) {
      expect(label.includes('환어'), `${id}: "${label}"`).toBe(false)
      expect(label.includes('훈령'), `${id}: "${label}"`).toBe(false)
    }
  })
})

// ── 점검 4 — 동음이의 금지 목록 ────────────────────────────────────
// 사료 카드뿐 아니라, 학생이 실제로 읽는 UI 문구(선택지·훈령 문구·장계 본문·단추)에도
// 같은 목록을 적용한다. 다만 note·salvage·move 비트의 lines·footer·cause·sillok 는
// 뺐다 — 그 자리들은 지문(地文)이라 "역사"가 정말 歷史(역사)를 뜻하며 등장할 수
// 있다(2막 D1 화면의 "우리가 아는 역사는, 살아남은 기록뿐이다"가 그 예다. 이 문장은
// 흠 잡을 데 없는 좋은 문장이라, 검사를 여기까지 넓히지 않고 지문 자리를 제외했다).
// 이 목록에 걸리는 카드·UI 문구는 그 낱말이 "軍民" 처럼 문제되는 한자어의 뜻으로 쓰인
// 자리이지, "역사"가 정말 역사(歷史)를 뜻하는 자리가 아니다.
describe('부속 점검 4 — 동음이의 금지 목록 (선택지·장계 본문·단추)', () => {
  const BLOCKLIST = ['역사', '조문', '정사', '감사', '군민', '자원']

  function riskyStrings() {
    const out = []
    for (const c of SOURCES) {
      for (const k of ['title', 'excerpt', 'meaning', 'gloss']) {
        if (c[k]) out.push({ id: `SOURCES/${c.id}/${k}`, text: c[k] })
      }
    }
    for (const act of ACTS) {
      for (const b of act.beats ?? []) {
        if (b.exit?.label) out.push({ id: `${act.id}/${b.id}/exit.label`, text: b.exit.label })
        // 나들이(stop) 단추도 학생이 실제로 누르는 문구다 — 같은 검사를 받는다.
        for (const st of b.stops ?? []) {
          out.push({ id: `${act.id}/${b.id}/${st.id}/label`, text: st.label })
        }
        if (b.kind === 'dispatch') {
          for (const d of b.dispatches ?? []) {
            out.push({ id: `${act.id}/${b.id}/${d.id}/headline`, text: d.headline })
            out.push({ id: `${act.id}/${b.id}/${d.id}/body`, text: d.body })
          }
        }
        // [리뷰 Minor 4] 3단계가 만든 새 단추 자리들 — 얼어붙은 회의의 단추 ·
        // 나들이의 「가마를 연다」 · 국상의 「내 이름으로 내린다」 · 탈출의 선택지.
        // 학생이 실제로 누르는 문구는 전부 같은 잣대를 받아야 한다.
        if (b.frozenLabel) out.push({ id: `${act.id}/${b.id}/frozenLabel`, text: b.frozenLabel })
        if (b.frozenChoiceLabel) out.push({ id: `${act.id}/${b.id}/frozenChoiceLabel`, text: b.frozenChoiceLabel })
        if (b.reasonPrompt) out.push({ id: `${act.id}/${b.id}/reasonPrompt`, text: b.reasonPrompt })
        if (b.view?.buttonLabel) out.push({ id: `${act.id}/${b.id}/view.buttonLabel`, text: b.view.buttonLabel })
        for (const st of b.stops ?? []) {
          const r = st.beat?.ration
          if (r?.buttonLabel) out.push({ id: `${act.id}/${st.id}/ration.buttonLabel`, text: r.buttonLabel })
        }
        for (const step of b.view?.steps ?? []) {
          out.push({ id: `${act.id}/${b.id}/${step.id}/question`, text: step.question })
          for (const o of step.options ?? []) {
            out.push({ id: `${act.id}/${b.id}/${step.id}/${o.id}`, text: o.text })
          }
        }
        for (const ch of b.council?.choices ?? []) {
          if (ch.flagLabel) out.push({ id: `${act.id}/${b.id}/${ch.id}/flagLabel`, text: ch.flagLabel })
        }
        if (b.kind === 'council' || b.kind === 'orders') {
          const q = b.council?.question ?? b.question
          if (q) out.push({ id: `${act.id}/${b.id}/question`, text: q })
          for (const ch of (b.council?.choices ?? b.clauses ?? [])) {
            out.push({ id: `${act.id}/${b.id}/${ch.id}/text`, text: ch.text })
          }
          if (b.actual?.line) out.push({ id: `${act.id}/${b.id}/actual.line`, text: b.actual.line })
        }
      }
    }
    for (const ch of FUTURE_COUNCIL.choices) {
      out.push({ id: `FUTURE_COUNCIL/${ch.id}`, text: ch.text })
    }
    return out
  }

  it('사료 카드·선택지·장계 본문·단추 문구에 동음이의 금지 목록의 낱말이 없다', () => {
    for (const { id, text } of riskyStrings()) {
      for (const w of BLOCKLIST) {
        expect(text.includes(w), `${id} 에 "${w}": "${text}"`).toBe(false)
      }
    }
  })
})
