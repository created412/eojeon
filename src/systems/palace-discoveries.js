// 선택 발견은 사료 지급·낮 예산·막 진행과 관계없다. 저장의 lore 안에서만 쌓인다.
export const PALACE_LIFE_IDS = Object.freeze(['life-towel', 'life-brush', 'life-cloth'])
export const PALACE_LIFE_COLLECTION = Object.freeze({
  id: 'palace-life', name: '궁을 움직이는 손길', collection: true,
  lines: Object.freeze([
    '닦아 둔 자리, 쓰고 남은 붓, 이어 붙인 천. 궁의 하루를 이어 주는 세 손길을 찾았다.',
    '당신이 마주한 조용한 궁에도, 이름을 알 수 없는 사람들의 하루가 있었다.',
  ]),
  note: '선택 발견을 모아 여는 기념 장면입니다. 세 물건과 그 사연은 역사 사료가 아닌 재구성입니다.',
})

export function palaceLifeProgress(state) {
  const seen = new Set(state?.lore?.seen ?? [])
  const found = PALACE_LIFE_IDS.filter(id => seen.has(id))
  return { found, complete: found.length === PALACE_LIFE_IDS.length,
    unlocked: (state?.lore?.collections ?? []).includes(PALACE_LIFE_COLLECTION.id) }
}

// 세 번째 발견 직후 한 번만 해금한다. 예전 저장(lore.collections 없음)도 그대로 읽는다.
export function unlockPalaceLifeCollection(state) {
  const progress = palaceLifeProgress(state)
  if (!progress.complete || progress.unlocked) return { state, reward: null }
  return {
    state: { ...state, lore: { ...state.lore,
      collections: [...(state.lore?.collections ?? []), PALACE_LIFE_COLLECTION.id] } },
    reward: PALACE_LIFE_COLLECTION,
  }
}
