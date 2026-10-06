import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WALKERS } from '../../src/data/walkers.js'
import { PALACES } from '../../src/data/palaces.js'
import { WALKER_CHATTER, GUARD_CHATTER, chatterFor, chatNear, CHAT_RANGE } from '../../src/data/chatter.js'
import { caseHandler } from '../helpers/case-labels.js'

// 선생님(2026-10-06): 「다른 모든 캐릭터들도 말을 걸 시 한 문장 정도는 대답하게 만들어야해.」
const read = p => readFileSync(join(process.cwd(), ...p.split('/')), 'utf8')

describe('궁인·수문장의 한마디', () => {
  it('세워 둔 사람은 모두 말을 가졌다 — 말 없는 궁인이 없다', () => {
    for (const list of Object.values(WALKERS)) for (const w of list) {
      expect(WALKER_CHATTER[w.id], w.id).toBeTruthy()
      expect(WALKER_CHATTER[w.id].lines.length, w.id).toBeGreaterThan(0)
    }
    for (const [id, def] of Object.entries(PALACES)) {
      if ((def.yard?.gateGuards ?? []).length) expect(chatterFor('guard', id, 0).name, `${id} 수문장`).not.toBe('궁인')
    }
  })

  it('한 줄은 「 」 안의 한 문장이다 — 수·값·햇수를 적지 않는다', () => {
    const all = [...Object.values(WALKER_CHATTER), ...Object.values(GUARD_CHATTER)].flatMap(c => c.lines)
    for (const line of all) {
      expect(line.startsWith('「') && line.endsWith('」'), line).toBe(true)
      expect(line.length, line).toBeLessThan(60)
      expect(line).not.toMatch(/[0-9０-９]|냥|\d+\s*해/)
      expect(line).not.toMatch(/정답|오답|틀렸|실패|점수|감점/)
    }
  })

  it('막마다 다른 줄을 고르고, 모르는 사람에게도 한마디는 있다', () => {
    const a = chatterFor('walker', 'cd-seungji', 0), b = chatterFor('walker', 'cd-seungji', 1)
    expect(a.name).toBe('승정원 서리')
    expect(a.line).not.toBe(b.line)
    expect(chatterFor('walker', 'cd-seungji', 2).line).toBe(a.line)
    expect(chatterFor('guard', 'changdeok', 0).name).toContain('돈화문')
    expect(chatterFor('walker', '없는사람', 4).line).toContain('「')
  })

  it('가장 가까운 사람 하나를 고르고, 두 걸음 밖이면 아무도 아니다', () => {
    const walkers = [{ id: 'a', x: 0, z: 2 }, { id: 'b', x: 0, z: 1 }]
    const guards = [{ x: 5, z: 0 }, { x: 0, z: -0.5 }]
    expect(chatNear({ walkers, guards, x: 0, z: 0 })).toMatchObject({ kind: 'guard', id: '1' })
    expect(chatNear({ walkers, guards: [], x: 0, z: 0 })).toMatchObject({ kind: 'walker', id: 'b' })
    expect(chatNear({ walkers, guards, x: 20, z: 20 })).toBeNull()
    expect(CHAT_RANGE).toBeLessThan(7)   // 신하(npcNear 7m)보다 가까이 가야 한다 — 보이는 몸에서 잰다
  })

  it('게임에 걸려 있다 — 빈자리의 E 가 곁의 궁인·수문장을 찾고, 한 일로 세지 않는다', () => {
    const main = read('src/main.js')
    expect(main).toContain("if (action.type === 'none') {")
    expect(main).toContain('chatNear({ walkers: ctx.staffPositions?.()')
    const body = caseHandler(main, 'chat')
    expect(body).toBeTruthy()
    expect(body).toContain("title: '재구성'")
    expect(body).toContain("action.who.kind === 'guard' ? flow.state.palace : action.who.id")
    expect(body).not.toContain('completeActivity')
    expect(body).not.toContain('saveGame')
    expect(read('src/render/scene.js')).toContain('staffPositions: () => palaceStaff.positions()')
  })
})
