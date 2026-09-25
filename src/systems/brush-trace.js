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
export const INK_MS = 22000
// 6초 밑에서 빛깔이 바뀐다 — 숫자를 안 읽는 학생도 색으로 안다.
export const INK_WARN_MS = 6000

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

export function inkDrying(startedAt, now, ms = INK_MS) {
  return startedAt != null && inkRemaining(startedAt, now, ms) <= INK_WARN_MS
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

// 마르기 전에 다 쓴 글자에도 한 줄을 준다. 잘한 일이 아무 말 없이 지나가면
// 학생이 받는 신호는 「시간은 벌로만 쓰인다」가 된다.
export const INK_PASSED_LINE = '먹이 마르기 전에 이 글자를 다 썼다'

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
