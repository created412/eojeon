import { DAY_UNITS } from './clock.js'
export const CONTROL = { FREE: 'A', LIMITED: 'B', ESCORTED: 'C', LOST: 'D' }
export const SAVE_KEY = 'eojeon.save.v1'
// ACTS(src/data/acts.js)가 바뀔 때마다 이 값을 올린다 — beatIndex·actIndex 는
// 그 배열의 자리를 가리키는 좌표일 뿐이라, 막·비트 구성이 달라지면 예전 좌표가
// 전혀 다른 비트를 가리키게 된다. deserialize() 가 버전이 다르면 조용히 null 을
// 주므로, 학생이 이전 차시 저장을 들고 새 배포로 돌아와도 엉뚱한 비트로 던져지지
// 않고 그냥 새 게임으로 시작한다(2단계 판정 — SAVE_KEY 는 건드리지 않는다).
//
// 2 → 3 (3단계, 판정 R100). 4막 때는 올리지 않았다 — 그때는 데이터가 배열 끝에만
// 붙어 1~3막 좌표가 안 움직였기 때문이다. 3단계는 5막을 붙이면서 여러 막의 비트를
// 고쳤으므로 옛 좌표가 엉뚱한 비트를 가리킨다. 지금 올리는 값이 0 이다 — 이 게임은
// 아직 아무에게도 배포되지 않았고, 그래서 버려질 학생 기록이 세상에 하나도 없다.
// 나중에 올리면 진짜 수업 기록이 사라진다.
//
// 못 읽는 저장을 만난 학생이 겪는 일은 main.js 의 STALE_SAVE_NOTICE 를 보라 —
// 「이어서 하기」가 그냥 사라지면 학생은 자기가 뭔가 잘못한 줄 안다.
const VERSION = 3

export function createState() {
  return {
    version: VERSION,
    actIndex: 0,
    beatIndex: 0,
    palace: 'changdeok',
    control: CONTROL.ESCORTED,
    dayLeft: DAY_UNITS,
    sources: { held: [], read: [], lost: [] },
    decisions: [],
    moves: [],
    riceIndex: 100,
    flags: {},
    freedom: { hubs: {} },
    // 궁 안에서 들여다본 물건(data/artifacts.js). 사료가 아니므로 sources 와 섞지
    // 않는다 — 버전을 올리지 않아도 되는 자리다: 이 칸이 없는 저장에서도
    // systems/artifacts.js 가 빈 목록으로 읽는다.
    lore: { seen: [] },
  }
}

export function serialize(state) {
  return JSON.stringify(state)
}

export function deserialize(json) {
  let data
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!data || data.version !== VERSION) return null
  // 비트 배열은 그대로다. 버전 3의 기존 좌표와 이미 본 보고를 함께 보존한다.
  if (!data.freedom || typeof data.freedom !== 'object' || Array.isArray(data.freedom)) {
    data.freedom = { hubs: {}, legacy: {
      actIndex: data.actIndex, beatIndex: data.beatIndex, beatEntered: data.beatEntered === true,
    } }
  }
  return data
}
