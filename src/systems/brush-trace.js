export const CHEOKHWABI_LINES = ['洋夷侵犯', '非戰則和', '主和賣國']
export const CHEOKHWABI_GLYPHS = CHEOKHWABI_LINES.join('').split('')

// 제시문과 학생이 쓰는 글자를 합친 열두 자는 비문의 '앞부분'이다 — 사료 검증 C 1항.
// 12자 본문은 현존 36기 사이에 이견이 없으나, 그 뒤에 경고문 6자와 연호 4자가 이어진다.
export const CHEOKHWABI_REST = [
  { text: '戒我萬年子孫', gloss: '우리 자손 만대에 경계하노라' },
  { text: '丙寅作 辛未立', gloss: '병인년(1866)에 짓고 신미년(1871)에 세운다' },
]
export const CHEOKHWABI_PARTIAL_NOTE =
  '※ 여기 제시된 열두 자는 비석에 새긴 글의 앞부분입니다. 실제 비석에는 뒤에 글자가 더 있습니다.'

export const HIT_RADIUS = 0.028
export const DONE_RATIO = 0.75

export function coverage(guides, marks, radius = HIT_RADIUS) {
  if (!guides || guides.length === 0) return 0
  let hit = 0
  for (const g of guides) {
    for (const m of marks) {
      if (Math.hypot(g.x - m.x, g.y - m.y) <= radius) { hit++; break }
    }
  }
  return hit / guides.length
}

export function isTraced(guides, marks, radius = HIT_RADIUS, need = DONE_RATIO) {
  return !!guides?.length && coverage(guides, marks, radius) >= need
}

// ── 먹이 마른다 (2026-09-25 선생님) ────────────────────────────────────
//
// 「3의 척화비는 오히려 아이들이 싫어할만한 내용이야. 타임어택을 넣고 척화비
// 글씨쓰게 하는게 좋아보여.」 — 맞는 말이다. 안내선을 따라 넉 자를 그리는 일은
// 아무 압박이 없으면 게임이 아니라 숙제다. 손이 움직이는데 아무것도 걸려 있지
// 않으면 학생은 그냥 빨리 끝내려고만 한다.
//
// 그런데 시계를 그냥 얹으면 이 장면이 거짓이 된다. 「왜 서둘러야 하는가」에
// 게임 밖의 대답(점수·제한시간)을 붙이면 학생이 재는 것은 비석이 아니라 시험이다.
// 그래서 시계의 이름을 장면 안에서 찾는다 — **먹이 마른다.** 비문은 돌에 쓰는 글이고
// 먹은 접시에서 마른다. 마르면 다시 갈면 된다. 그것이 실제로 일어나는 일이다.
//
// 지켜야 하는 것 세 가지. 이 세 가지가 「압박이 기다리기를 보상한다」는 예전 실패를
// 막는다(게임 재제작 실패 패턴):
//   ① 시계는 **글자마다** 따로 돈다. 넉 자를 한 통에 몰아 재면 마지막 글자에서
//      남은 시간이 0 이 되고, 학생은 손을 놓고 화면만 본다.
//   ② 시계는 **첫 획에서** 시작한다. 화면이 열리는 순간이 아니다 — 안내문을 읽는
//      시간을 벌로 매기면 글을 안 읽는 학생이 유리해진다. 정확히 거꾸로다.
//   ③ 마르면 **그 글자만** 처음부터 다시 쓴다. 지는 일도, 막히는 일도 없다.
//      횟수 제한도 없다. 마지막에 「먹을 몇 번 갈았나」 한 줄만 남는다.
//
// ── 다시 (2026-09-26 선생님) ──────────────────────────────────────────
//
// 「척화비 쓸때 타임어택이 잘 눈에 안보여, 타임어택의 묘미를 살려서 다시 만들어봐」
// 맞는 지적이다. 시계는 캔버스 **아래** 7픽셀짜리 띠와 12픽셀짜리 글씨였다. 그것은
// 압박이 아니라 장식이다 — 학생의 눈은 종이에 붙어 있고, 종이 밖의 얇은 띠는
// 시야에 들어오지 않는다. 시계를 못 본 학생에게 먹이 마르는 일은 압박이 아니라
// 영문 모를 초기화다. 그러면 이 기능은 압박도 못 주고 손맛만 깎는다.
//
// 그래서 세 가지를 동시에 한다. **눈이 이미 가 있는 곳**에 시계를 놓고(종이 위와
// 종이 옆의 큰 숫자), **종이 자신을 반응시키고**(마를수록 바탕이 메마르고 먹빛이
// 갈색으로 뜬다), 끝에서 **단계를 올린다**(6초·3초).
//
// 올리되 넘지 않는 선이 있다. 화면을 흔들지 않고, 경보음을 내지 않고, 넓은 면을
// 번쩍이지 않는다 — 광과민성 학생에게 해로운 것은 물론이고, 여기는 역사 수업이지
// 오락실이 아니다. 띠 하나가 1.1초에 한 번 숨을 쉬는 것까지가 이 장면의 품위다.
// prefers-reduced-motion 을 켠 학생에게는 그 숨마저 끄고 초 단위 계단만 남긴다.
export const INK_MS = 22000
// 6초 밑에서 빛깔이 바뀐다 — 숫자를 안 읽는 학생도 색으로 안다.
export const INK_WARN_MS = 6000
// 3초 밑에서 한 단계 더. 두 단계로 나눈 까닭: 한 단계뿐이면 「빨간 줄이 떴다」가
// 6초 동안 계속되어 끝에서 더 조일 것이 남지 않는다. 마지막 3초에 남겨 둔다.
export const INK_CRIT_MS = 3000
// 이만큼이 남은 채로 글자를 끝내면 「한 번에 썼다」가 뜬다. 22초의 삼분의 일이 넘게
// 남았다면 그것은 아슬아슬하게 넘긴 것이 아니라 여유 있게 쓴 것이다.
export const INK_SPARE_MS = 8000

// 먹의 단계. CSS 클래스 이름으로도 그대로 쓴다(.brush .ink.warn — brush.js) —
// 화면이 제 손으로 문자열을 적지 않게 해서 두 곳이 갈리는 일을 막는다.
export const INK_WET = 'wet'
export const INK_WARN = 'warn'
export const INK_CRIT = 'crit'
export const INK_DRY = 'dry'

// 붓 화면이 시간을 재는가. 비트가 ink 를 실어 보낼 때만 잰다 — 4막 「친 필」은
// 안 싣는다. 그 장면의 내용은 「썼다, 그런데 그 기록이 하나뿐이다」이고, 거기에
// 시계를 붙이면 학생이 붓을 놓은 뒤에 남는 감정이 의심이 아니라 안도가 된다.
export function inkMsOf(view) {
  const ink = view?.ink
  if (!ink) return 0
  const ms = typeof ink === 'number' ? ink : ink.ms ?? INK_MS
  return ms > 0 ? ms : 0
}

export function isInkTimed(view) {
  return inkMsOf(view) > 0
}

// 첫 획을 긋기 전(startedAt 이 없을 때)에는 먹이 가득 차 있다 — 아직 안 마르기
// 시작한 것이지, 다 마른 것이 아니다. 이 한 줄이 ②를 떠받친다.
export function inkRemaining(startedAt, now, ms = INK_MS) {
  if (!(ms > 0)) return 0
  if (startedAt == null) return ms
  return Math.max(0, Math.min(ms, ms - (now - startedAt)))
}

export function inkRatio(startedAt, now, ms = INK_MS) {
  if (!(ms > 0)) return 0
  return inkRemaining(startedAt, now, ms) / ms
}

export function inkDried(startedAt, now, ms = INK_MS) {
  return startedAt != null && inkRemaining(startedAt, now, ms) <= 0
}

// 남은 시간 하나로 단계를 정한다. 화면에 붙기 전에 여기서 정해 두는 까닭은 색과
// 글과 숨쉬는 띠가 **같은 순간에 같이** 바뀌어야 하기 때문이다 — 셋이 저마다
// 6000 을 비교하면 언젠가 하나가 5900 으로 바뀌고 학생은 어긋난 화면을 본다.
export function inkLevelAt(remaining) {
  if (!(remaining > 0)) return INK_DRY
  if (remaining <= INK_CRIT_MS) return INK_CRIT
  if (remaining <= INK_WARN_MS) return INK_WARN
  return INK_WET
}

// 첫 획을 긋기 전에는 언제나 wet 이다. 이 한 줄이 없으면 ink 를 3초로 준 비트에서
// 화면이 열리는 순간부터 빨간 글씨가 떠 있다 — 아직 마르지도 않았는데.
export function inkLevel(startedAt, now, ms = INK_MS) {
  if (startedAt == null) return INK_WET
  return inkLevelAt(inkRemaining(startedAt, now, ms))
}

export function inkDrying(startedAt, now, ms = INK_MS) {
  return startedAt != null && inkLevel(startedAt, now, ms) !== INK_WET
}

// 남은 초. 올림으로 센다 — 0.4초가 남았는데 「0초」라고 적어 두면 화면이 멈춘 것처럼
// 보인다. 1초부터 시작해 0 은 마르는 순간에만 지나간다.
export function inkSeconds(startedAt, now, ms = INK_MS) {
  return Math.ceil(inkRemaining(startedAt, now, ms) / 1000)
}

export function inkLabel(startedAt, now, ms = INK_MS) {
  if (startedAt == null) return '먹 — 첫 획을 그으면 마르기 시작한다'
  return `먹 — 마르기까지 ${inkSeconds(startedAt, now, ms)}초`
}

// ── 종이가 대답한다 ───────────────────────────────────────────────────
//
// 띠와 숫자는 종이 밖에 있다. 학생의 눈은 종이 안에 있다. 그래서 **종이 자신**이
// 마른다: 바탕이 메마른 회갈색으로 가라앉고, 먹빛이 검정에서 갈색으로 뜬다.
// 글자를 그리는 그 표면이 곧 시계가 되므로, 시계를 못 보는 일이 없어진다.
//
// 지켜야 하는 것 하나 — **안내점을 덮지 않는다.** 안내점은 학생이 따라 그리는
// 바로 그것이다. 바탕이 어두워지는 만큼 안내점의 불투명도를 함께 올려서, 마를수록
// 안내점이 오히려 또렷해지게 한다. 「보기 좋게 만들다 따라 쓸 것을 지운다」는
// 이 프로젝트가 밟을 수 있는 가장 나쁜 맞바꿈이다.
export const PAPER_WET = '#efe6cf'
export const PAPER_DRY = '#d7d0c0'
export const STROKE_WET = '#1b1a17'
export const STROKE_DRY = '#7b5531'
export const GUIDE_ALPHA_WET = 0.28
export const GUIDE_ALPHA_DRY = 0.46

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

function mixHex(a, b, t) {
  let out = '#'
  for (let i = 1; i < 7; i += 2) {
    const from = parseInt(a.slice(i, i + 2), 16)
    const to = parseInt(b.slice(i, i + 2), 16)
    out += Math.round(from + (to - from) * t).toString(16).padStart(2, '0')
  }
  return out
}

// 0 = 먹이 가득하다, 1 = 다 말랐다. 시간을 안 재는 화면에서는 0 이다 —
// 「안 잰다」가 「다 말랐다」로 읽히면 4막 친필의 종이가 열리자마자 메말라 있다.
export function inkDryness(startedAt, now, ms = INK_MS) {
  if (!(ms > 0)) return 0
  return 1 - inkRatio(startedAt, now, ms)
}

export function inkPaperColor(dryness) {
  return mixHex(PAPER_WET, PAPER_DRY, clamp01(dryness))
}

export function inkStrokeColor(dryness) {
  return mixHex(STROKE_WET, STROKE_DRY, clamp01(dryness))
}

export function inkGuideAlpha(dryness) {
  return GUIDE_ALPHA_WET + (GUIDE_ALPHA_DRY - GUIDE_ALPHA_WET) * clamp01(dryness)
}

// 종이에 크게 앉히는 남은 초의 빛깔. 안내점보다 **먼저** 칠하므로 안내점과 획이
// 언제나 이 숫자 위에 온다(brush.js 의 paint 가 그 순서를 지킨다). 그래도 알파를
// 낮게 묶어 둔다 — 종이에 번진 물자국만큼만 보이면 충분하다.
export function inkWashColor(level) {
  if (level === INK_CRIT) return 'rgba(196,74,36,0.20)'
  if (level === INK_WARN) return 'rgba(176,86,42,0.15)'
  return 'rgba(138,106,68,0.10)'
}

// ── 단계마다 한 줄 ────────────────────────────────────────────────────
// 「먹이 마른다」 — 색을 못 읽는 학생에게도 말로 한 번 알린다. 두 줄 다 짧게 둔다:
// 3초 남은 학생에게 읽을 것을 주면 그 3초를 읽는 데 쓴다.
export const INK_WARN_LINE = '먹이 마른다'
export const INK_CRIT_LINE = '먹이 다 마른다'

export function inkPressLine(startedAt, now, ms = INK_MS) {
  const level = inkLevel(startedAt, now, ms)
  if (level === INK_CRIT || level === INK_DRY) return INK_CRIT_LINE
  if (level === INK_WARN) return INK_WARN_LINE
  return ''
}

// 마르기 전에 다 쓴 글자에도 한 줄을 준다. 잘한 일이 아무 말 없이 지나가면
// 학생이 받는 신호는 「시간은 벌로만 쓰인다」가 된다.
export const INK_PASSED_LINE = '먹이 마르기 전에 이 글자를 다 썼다'
// 여유 있게 끝낸 글자에는 한 줄을 더 따뜻하게 준다(2026-09-26 선생님 — 「타임어택의
// 묘미」의 절반은 조이는 데 있고 절반은 **이겼다고 말해 주는 데** 있다).
export const INK_SPARE_LINE = '한 번에 썼다 — 먹이 아직 넉넉하다'

export function inkSpared(startedAt, now, ms = INK_MS) {
  return inkRemaining(startedAt, now, ms) >= INK_SPARE_MS
}

export function inkPassLine(startedAt, now, ms = INK_MS) {
  return inkSpared(startedAt, now, ms) ? INK_SPARE_LINE : INK_PASSED_LINE
}

// 말랐을 때 뜨는 줄. 「틀렸다」·「실패」라고 쓰지 않는다 — 실제로 일어난 일은
// 먹이 마른 것이고, 먹은 다시 갈면 된다.
export function inkDryNote(regrinds) {
  return `먹이 말랐다 — 먹을 다시 갈고 이 글자를 처음부터 쓴다 (먹을 간 횟수 ${regrinds}번)`
}

// 넉 자·석 자 — 자릿수 세는 우리말을 그대로 쓴다.
const GLYPH_WORDS = ['', '한 자', '두 자', '석 자', '넉 자']
export function glyphCountWord(n) {
  return GLYPH_WORDS[n] ?? `${n}자`
}

// 붓을 놓은 뒤에 붙는 한 줄. 꾸짖지 않는다 — 몇 번을 갈았든 학생은 넉 자를 다 썼다.
export function inkReport(regrinds = 0, glyphCount = 4) {
  const word = glyphCountWord(glyphCount)
  if (!(regrinds > 0)) return `먹을 한 번도 다시 갈지 않고 ${word}를 썼다.`
  return `먹을 ${regrinds}번 다시 갈아 ${word}를 썼다.`
}

// ── F2 (설계서 §5.F2 · 판정 R10 · 사료 검증 B 1항) ──────────────────
// 학생이 쓰는 네 글자. 그런데 이것은 확정된 사실이 아니다 — 표기가 최소 세 갈래이고,
// 이 문구를 전하는 기록은 김옥균이 일본 망명 중에 쓴 『갑신일록』 하나뿐이며,
// 2010년 이후 학계는 이 독대 장면 자체가 만들어진 것일 가능성을 제기한다.
// 그래서 이 장면을 빼지 않고, 게임에서 가장 좋은 수업으로 바꾼다.
export const ILSA_GLYPHS = ['日', '使', '來', '衛']

export const ILSA_VARIANTS = [
  { text: '日本公使來護朕', gloss: '일본 공사는 와서 짐을 보호하라' },
  { text: '日本公使來護我', gloss: '일본 공사는 와서 나를 호위하라' },
]

// 등급은 「사료」다. 『갑신일록』은 김옥균이 직접 쓴 당사자 기록이고, 한국민족문화
// 대백과사전은 이것을 「갑신정변과 김옥균의 생애를 이해하는 데 있어서 필수적인
// 일차사료」라고 적는다. 「2차문헌」은 다른 사람이 정리한 연구·개설서에 붙는 말이라
// 여기 붙을 수 없다 — 한때 이 줄이 그렇게 적혀 있었다.
// 논쟁은 등급이 지지 않고 이 문장이 진다: 사건 1년 뒤 기억에 의지해 썼고, 음력과
// 양력을 섞어 써 날짜에 착오가 있으며, 무엇을 위해 썼는지를 두고 연구가 갈린다.
export const ILSA_NOTE =
  '※ 이 문구를 전하는 기록은 『갑신일록』 하나뿐입니다. 김옥균이 일본으로 망명한 뒤에 쓴 당사자 기록이라 1차 사료로 다룹니다. 다만 사건이 지나고 한 해 뒤에 기억으로 쓴 글이어서, 그 내용을 얼마나 믿을 수 있는지는 지금도 논쟁 중입니다.'
