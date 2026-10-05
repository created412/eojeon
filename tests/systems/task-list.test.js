import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { taskList, hubOptions } from '../../src/systems/freedom.js'
import { ACTS } from '../../src/data/acts.js'
import { createState } from '../../src/core/state.js'
import { enterAct, applyBeat } from '../../src/systems/scenario.js'

// 선생님(2026-10-06):
//   「지금의 여정이 눈에 잘 안 보여. 좀 더 가독성 높일 방안으로 다시 해 봐.」
//   「일정은 할 일을 보여 주는 거지, 그걸 클릭하면 자동으로 이동하게 해서 게임이 너무 쉽게
//    클리어가 되어 버려. 일정은 남겨 두되, 자동으로 이동시키는 건 막아 버려. 모든 곳에서.」

const NL = String.fromCharCode(10)
const code = file => readFileSync(join(process.cwd(), ...file.split('/')), 'utf8')
  .split(NL).filter(l => !l.trim().startsWith('//')).join(NL)

function atHub(actIndex, id) {
  const act = ACTS[actIndex]
  let state = enterAct(createState(), act, actIndex)
  for (const [i, beat] of act.beats.entries()) {
    state = { ...applyBeat(state, beat), beatIndex: i, beatEntered: true }
    if (beat.id === id) return state
  }
  throw new Error(id)
}

describe('오늘 할 일 — 그날의 일을 전부 줄 세운다', () => {
  const tasks = taskList(hubOptions(atHub(3, 'imo-day'), ACTS[3]))

  it('한 가지가 아니라 그날의 일이 다 나온다', () => {
    expect(tasks.length).toBeGreaterThanOrEqual(4)
  })

  it('줄마다 어디에서 무엇을 하는지 있다', () => {
    for (const t of tasks) {
      expect(t.where, t.label).toBeTruthy()
      expect(t.label.length).toBeGreaterThan(3)
    }
  })

  it('조작 글자(「E — 」)는 목록에 싣지 않는다', () => {
    for (const t of tasks) expect(t.label).not.toMatch(/^E\s*[—-]/)
    expect(tasks.some(t => t.label.includes('종로'))).toBe(true)
  })

  it('한 일과 안 한 일을 가른다', () => {
    expect(taskList([{ id: 'a', label: 'x', place: '규장각', done: true }])[0].done).toBe(true)
    expect(taskList([{ id: 'a', label: 'x', place: '규장각' }])[0].done).toBe(false)
  })

  it('자리(좌표)를 내주지 않는다 — 목록은 길을 알려 주는 것이 아니다', () => {
    for (const t of tasks) expect(Object.keys(t).sort()).toEqual(['blocked', 'done', 'id', 'label', 'where'])
  })

  it('빈 목록에도 깨지지 않는다', () => {
    expect(taskList(undefined)).toEqual([])
    expect(taskList([])).toEqual([])
  })
})

describe('자동으로 걸어가 주지 않는다 — 어디에서도', () => {
  const main = code('src/main.js')
  const hud = code('src/ui/cinematic-hud.js')

  it('여정 판과 촉박의 붉은 판에 누르는 길이 없다', () => {
    expect(hud).not.toContain('onObjective')
    expect(hud).not.toContain('onEscape')
    expect(hud).not.toContain('걸어가기')
    expect(hud).not.toContain('달아납니다')
    expect(hud).toMatch(/\.eojeon \.cinema-objective\{pointer-events:none/)
    expect(hud).toMatch(/\.eojeon \.cinema-danger\{pointer-events:none/)
  })

  it('길을 찾아 걸어가는 함수가 남아 있지 않다', () => {
    for (const name of ['openActivities', 'chooseActivity', 'walkToObjective', 'runToGoal', 'objectiveRoute']) {
      expect(main, `${name} 이 되살아났다`).not.toContain(name)
    }
    expect(main).not.toMatch(/autoWalk = true/)
  })

  it('안내문이 「누르면 알아서 간다」고 약속하지 않는다', () => {
    const guide = code('src/data/guide.js')
    expect(guide).not.toContain('알아서')
    expect(guide).not.toContain('누르면 그곳으로')
  })

  it('바닥을 짚어 걷는 것은 남는다 — 태블릿의 걸음이다. 촉박에서는 그 걸음도 달린다', () => {
    expect(main).toContain('ctx.pickGround(tapped.x, tapped.y)')
    expect(main).toMatch(/running: \(\) => flow\.phase === 'rush'/)
  })

  it('할 일 판이 목록을 받아 그린다', () => {
    expect(main).toContain('tasks: flow.phase ===')
    expect(hud).toContain('cinema-tasks')
    expect(hud).toContain('오늘 할 일')
  })
})
