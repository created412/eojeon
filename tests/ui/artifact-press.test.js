// 「E 를 누르면 물건이 열리는가」를 main.js 의 **그 함수 몸통 그대로** 돌려서 본다.
//
// systems/artifacts.js 의 판정은 따로 시험한다(tests/systems/artifacts.test.js).
// 여기서 붙드는 것은 배선이다 — 판정이 옳아도 main.js 가 그 값을 안 쓰면 물건은
// 죽은 코드가 된다. 실제로 3D 화면을 걸어 다니며 확인하려다 못 했다: 임금의 자리를
// 밖에서 들여다볼 길이 없어 「안 잡힌 것」과 「안 걸어간 것」을 가를 수 없었다.
import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { bodyOf } from '../helpers/body-of.js'
import { PALACES } from '../../src/data/palaces.js'
import { createState } from '../../src/core/state.js'
import { artifactNear, hasSeen, markArtifactSeen, artifactCount } from '../../src/systems/artifacts.js'
import { artifactById, artifactLines, ARTIFACT_SPOTS } from '../../src/data/artifacts.js'
import { yearAtBeat } from '../../src/systems/scenario.js'
import { npcNear } from '../../src/data/npcs.js'
import { ACTS } from '../../src/data/acts.js'
import { pressE } from '../../src/main.js'

const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8')
function runFunction(name, env, arg) {
  return new Function('env', 'arg', `with (env) { return (async function(beat) {${bodyOf(source, name)}})(arg) }`)(env, arg)
}
// pressEAction 은 nearbyArtifact() 를 **그 자리에서** 부른다(Promise 가 아니다).
// 그래서 곁 함수도 같은 소스에서 떼어 와 동기로 돌린다 — 흉내로 바꿔 놓으면
// 정작 붙들려는 배선(판정 → 값 → 화면)이 시험 밖으로 빠져나간다.
function runSync(name, env, arg) {
  return new Function('env', 'arg', `with (env) { return (function(id) {${bodyOf(source, name)}})(arg) }`)(env, arg)
}

// 창덕궁 규장각의 의궤 — 방 안 물건 가운데 하나를 골라 그 앞에 세운다.
const SPOT = ARTIFACT_SPOTS.changdeok.find(s => s.id === 'uigwe')
const ROOM = PALACES.changdeok.rooms.find(r => r.id === SPOT.room)
const AT = { x: ROOM.x + SPOT.dx, z: ROOM.z + SPOT.dz }

function environment(over = {}) {
  const shown = []
  const position = { x: AT.x, y: 1.9, z: AT.z, set(x, y, z) { Object.assign(this, { x, y, z }) } }
  return {
    PALACES, artifactNear, hasSeen, markArtifactSeen, artifactCount, artifactById, artifactLines,
    yearAtBeat, npcNear, pressE, shown,
    flow: { state: { ...createState(), palace: 'changdeok', room: SPOT.room, beatIndex: 0 },
      actIndex: 0, act: () => ACTS[0], taken: new Set(), phase: 'day', setPhase() {} },
    ctx: { player: { position }, setPickupMarkers() {} },
    dialog: { isOpen: () => false, close() {}, showArtifact(a, lines) { shown.push({ a, lines }) } },
    audio: { play() {} }, banner() {}, root: {}, saveGame() {},
    selectedOption: () => null, currentNpcs: () => [], currentExit: () => null, currentStops: () => [],
    ...over,
  }
}

function withNeighbours(env) {
  env.nearbyArtifact = () => runSync('nearbyArtifact', env)
  return env
}

it('물건 앞에 서면 E 판정이 그 물건을 돌려준다', async () => {
  const env = withNeighbours(environment())
  const action = await runFunction('pressEAction', env)
  expect(action).toEqual({ type: 'artifact', id: 'uigwe' })
})

it('한 번 본 물건은 다시 가로채지 않는다 — 나가는 방에 서 있어도 나갈 수 있다', async () => {
  const env = withNeighbours(environment())
  env.flow.state = markArtifactSeen(env.flow.state, 'uigwe')
  env.currentExit = () => ({ room: SPOT.room, label: '오늘은 여기까지 한다' })
  const action = await runFunction('pressEAction', env)
  expect(action.type).toBe('exit-explore')
})

it('더 가까이 선 사람이 있으면 사람이 이긴다', async () => {
  // 임금을 물건에서 두 걸음 떨어뜨리고, 그 사이에 사람을 세운다.
  const env = withNeighbours(environment({ currentNpcs: () => [{ id: 'x', name: '아무개', x: AT.x + 2, z: AT.z }] }))
  env.ctx.player.position.set(AT.x + 2.4, 1.9, AT.z)
  const action = await runFunction('pressEAction', env)
  expect(action.type).toBe('talk')
})

it('물건을 열면 해 칸을 쓰지 않고, 본 것으로 적히고, 카드가 뜬다', async () => {
  const env = withNeighbours(environment())
  const before = env.flow.state.dayLeft
  runSync('applyArtifact', env, 'uigwe')
  expect(env.flow.state.dayLeft).toBe(before)
  expect(hasSeen(env.flow.state, 'uigwe')).toBe(true)
  expect(env.shown).toHaveLength(1)
  expect(env.shown[0].a.name).toBe('의궤')
  expect(env.shown[0].lines.length).toBeGreaterThan(0)
})

it('안내 줄도 물건을 가리킨다 — 나가는 방 안내보다 먼저 온다', async () => {
  // updateHint 는 hint 하나에 글을 적는다. 그 글이 E 판정과 어긋나면 학생이 속는다.
  const hint = { textContent: '', hidden: true }
  const env = withNeighbours(environment({ hint, currentExit: () => ({ room: SPOT.room, label: '오늘은 여기까지 한다' }) }))
  await runFunction('updateHint', env)
  expect(hint.hidden).toBe(false)
  expect(hint.textContent).toContain('의궤')
})

it('마당의 물건도 같은 길로 잡힌다', async () => {
  const well = PALACES.changdeok.yard.props.find(p => p.id === 'well')
  const env = withNeighbours(environment())
  env.flow.state.room = null
  env.ctx.player.position.set(well.x, 1.9, well.z)
  const action = await runFunction('pressEAction', env)
  expect(action).toEqual({ type: 'artifact', id: 'well' })
})
