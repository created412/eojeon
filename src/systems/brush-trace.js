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
