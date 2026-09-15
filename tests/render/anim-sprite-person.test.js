import { it, expect } from 'vitest'
import { NPCS } from '../../src/data/npcs.js'
import { SPRITES, SPRITE_FRAMES, SPRITE_VIEWS, SPRITE_CELL } from '../../src/render/sprites-data.js'
import { spriteKey, walkColumn, RANK_SPECS, WALK_CYCLE_MS } from '../../src/render/anim-sprite-person.js'

// 2026-09-15 선생님 요청 — 몸이 서는 인물은 모두 자기 그림이 있어야 한다(몸 여섯 벌 돌려쓰기 금지).
it('몸이 서는 인물마다, 그리고 임금 세 벌마다 따로 그린 시트가 있다', () => {
  const need = NPCS.filter(n => !n.voice).map(n => n.id).concat(['king_child', 'king_child_commoner', 'king_adult'])
  const missing = need.filter(id => !SPRITES[id])
  expect(missing).toEqual([])
})

it('시트는 모두 네 방향 × (서기 1 + 걸음 8) 칸이다', () => {
  expect(SPRITE_VIEWS).toEqual(['front', 'three_q', 'side', 'back'])
  expect(SPRITE_FRAMES).toBe(8)
  expect(SPRITE_CELL.h).toBe(SPRITE_CELL.w * 2)
  for (const s of Object.values(SPRITES)) expect(s.uri.startsWith('data:image/webp;base64,')).toBe(true)
})

it('인물 id 가 먼저, 임금은 나이·옷에 따라, 없으면 품계 그림으로 간다', () => {
  expect(spriteKey({ id: 'choeikhyeon', model: 'senior' })).toBe('choeikhyeon')
  expect(spriteKey({ model: 'king', ageStage: 'child', attire: 'commoner' })).toBe('king_child_commoner')
  expect(spriteKey({ model: 'king', ageStage: 'child' })).toBe('king_child')
  expect(spriteKey({ model: 'king', ageStage: 'adult' })).toBe('king_adult')
  expect(spriteKey({ id: 'nobody', ...RANK_SPECS.regent })).toBe('heungseon')
})

it('걸음 칸은 1..8 을 한 주기에 한 번씩 돈다(0 칸은 서 있을 때만)', () => {
  const seen = new Set()
  for (let t = 0; t < WALK_CYCLE_MS; t += 5) seen.add(walkColumn(t))
  expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  expect(walkColumn(WALK_CYCLE_MS)).toBe(walkColumn(0))
})
