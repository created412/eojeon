import { sourceById } from './sources.js'
import { PALACES } from './palaces.js'
import { safePosition } from './hall-geometry.js'

// 신하 — 궁 안에 실제로 서 있는 사람. 예전에는 문서가 바닥에 놓여 있었을 뿐,
// 그것을 건넨 사람은 화면 어디에도 없었다(2단계 검토 1항). 여기서부터는 상소는
// 상소를 쓴 신하가, 장계는 그것을 나른 전령이 직접 건넨다 — palaces.js 의
// pickups 좌표와 겹치는 자리에 세운다. 줍기 배선(pressE→pickupNear→spend→pickUp)은
// 그대로 둔다: cardId 가 있으면 그 신하가 서 있는 곳이 곧 그 카드의 줍는 자리다.
//
// **바닥에 놓인 문서는 이제 하나도 없다.** 예전에는 규장각·수정전의 책이 임자 없이
// 바닥에 놓여 있었고, 임금이 그 방까지 걸어가 집어 왔다. 선생님의 말이 그것을 끝냈다:
//
//   "해를 찾아나서며 이벤트를 진행하는게 아니라 궁궐 내에 있는 신하가 말을 걸거나,
//    왕이 궁궐내에 신하한테 말을 하는 형태가 되어야지"
//
// 그래서 문서마다 그것을 들고 있는 사람이 있다 — 서고의 책에는 검서관이, 공사 기록에는
// 그 일을 맡은 서리가, 상소에는 그것을 올린 사람이 붙는다. 좌표는 예전 지점 그대로다.
//
// 흥선대원군만 예외로 cardId 가 없다 — 「어제까지 신하가 서 있던 자리에 아무도
// 없다」(3막 doors-open)가 가리키는 바로 그 사람이다. actsVisible 로 1·2막에만
// 세워 둔다. 3막부터는 이 배열에 그가 없다 — 자리 자체가 빈다.
export const NPCS = [
  {
    id: 'heungseon',
    name: '흥선대원군',
    title: '아버지',
    palace: 'changdeok',
    x: -8, z: 9,
    rank: 'regent',
    hatStyle: 'samo',
    actsVisible: [0, 1],
    lines: [
      '발 밖에 아버지가 서 계신다.',
      '「나랏일은 아직 이 아비가 맡는다.」',
    ],
  },
  {
    // 호조 관리는 이제 어딘가에 서서 기다리지 않는다 — 1막의 알현 비트에서 임금
    // **앞으로 걸어 들어와** 원납전·당백전 두 장을 건넨다(data/acts.js audience).
    // 그래서 cardId 가 없다(흥선대원군과 같다: 서서 건네는 사람이 아니다). 서 있는
    // 막도 1막 하나다 — 2막(1866)의 창덕궁을 걸을 때 이미 손에 든 문서를 다시
    // 내미는 죽은 자리를 남기지 않는다.
    id: 'hojo',
    actsVisible: [],
    name: '호조 관리',
    title: '',
    palace: 'changdeok',
    x: 21, z: 6,
    rank: 'mid',
    hatStyle: 'samo',
    lines: ['「돈을 마련하는 길을 적어 왔습니다.」'],
  },
  {
    id: 'gaehwa',
    actsVisible: [2],   // 개항 논의가 조정 안에서 오가던 때다 — 3막 창덕궁 국면(1874~75)
    name: '젊은 신하',
    title: '',
    palace: 'changdeok',
    x: 21, z: 6,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'gaehang-chanseong',
    lines: ['「조정 안에도 문을 열자는 말이 있습니다. 들어 보시겠습니까.」'],
  },
  {
    id: 'seungji',
    actsVisible: [1],   // 1866 병인양요 — 프랑스의 글이 온 바로 그해다
    name: '승정원 승지',
    title: '',
    palace: 'changdeok',
    x: -8, z: -5,
    // 6승지는 모두 정3품 당상관이다 — 흉배를 다는 자리다(character.js RANK_SPECS 참고).
    rank: 'senior',
    hatStyle: 'samo',
    cardId: 'bellonet',
    lines: ['「프랑스에서 글이 왔습니다.」'],
  },
  {
    // 검서관(檢書官) — 규장각에서 책을 살피고 목록을 만드는 관원. 정조 때 이덕무·박제가가
    // 맡았던 그 자리다. 외규장각 목록을 들고 있는 사람으로 이보다 맞는 사람이 없다.
    id: 'geomseo',
    actsVisible: [1],
    name: '규장각 검서관',
    title: '',
    palace: 'changdeok',
    x: -24, z: 13,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'oegyujanggak',
    lines: [
      '「규장각의 책을 살피는 일을 맡고 있습니다.」',
      '「강화도 외규장각에 나누어 둔 것까지 여기 적혀 있습니다. 목록만 보아도 몇 날이 걸립니다.」',
    ],
  },
  {
    // 선공감(繕工監) — 나라의 토목·건축을 맡은 관청. 경복궁 중건의 셈을 들고 있다.
    id: 'seongong',
    actsVisible: [1],
    name: '선공감 서리',
    title: '',
    palace: 'gyeongbok',
    x: -38, z: -4,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'junggeon',
    lines: [
      '「경복궁을 다시 세우며 든 것을 적어 두었습니다.」',
      '「돌과 나무와, 그것을 나른 사람의 수입니다.」',
    ],
  },
  {
    // 1880년 수신사 김홍집을 따라간 일행. 『조선책략』은 청국 공사관의 참찬관 황준헌이
    // 김홍집에게 건넨 책이다 — 그 책이 조선에 들어온 경로가 곧 이 사람이다.
    id: 'susinsa',
    actsVisible: [3],
    name: '수신사 수행원',
    title: '',
    palace: 'changdeok',
    x: -18, z: 6.5,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'joseon-chaeryak',
    lines: [
      '「수신사를 따라 일본에 다녀왔습니다.」',
      '「청국 공사관의 참찬관이 건네준 책입니다. 조선이 어찌해야 하는지를 적었다 합니다.」',
    ],
  },
  {
    // 영남 만인소 — 만 명이 이름을 잇대어 올린 상소다. 지고 올라온 사람이 있어야 한다.
    id: 'yeongnam',
    actsVisible: [3],
    name: '영남 유생',
    title: '',
    palace: 'changdeok',
    x: 5, z: -38,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'yeongnam-manin',
    lines: [
      '「영남에서 올라왔습니다.」',
      '「만 사람의 이름이 잇대어 적혀 있습니다. 한 사람이 쓴 글이 아닙니다.」',
    ],
  },
  {
    // 홍재학 본인. 상소는 올린 사람이 있다 — 그리고 이 상소를 올린 사람은 그해에
    // 죽었다. 그 사실은 카드(sources.js)가 말한다. 여기서는 그가 서 있기만 한다.
    id: 'hongjaehak',
    actsVisible: [3],
    name: '홍재학',
    title: '유생',
    palace: 'changdeok',
    x: 11, z: -42,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'hong-jaehak',
    lines: [
      '「신은 강원도에서 왔습니다.」',
      '엎드린 채 고개를 들지 않는다.',
      '「이 글은 대신을 겨눈 것이 아닙니다.」',
    ],
  },
  {
    // 정변 사흘 — 새 정부의 정강을 임금 앞에 내미는 사람. 이름은 적지 않는다:
    // 『갑신일록』이 전하는 열네 조목의 문서를 누가 들고 왔는지까지는 기록이 없다.
    id: 'gaehwapa',
    actsVisible: [4],
    name: '개화파 관원',
    title: '',
    palace: 'gyeongu',
    x: 0, z: -2.2,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'reform14',
    lines: [
      '「새 정부의 정강입니다. 열네 조목입니다.」',
      '먹이 아직 마르지 않았다.',
    ],
  },
  {
    id: 'gungyo',
    actsVisible: [1],   // 1866 평양 — 셔먘호 사건이 있은 바로 그해다
    name: '훈련도감 군교',
    title: '',
    palace: 'changdeok',
    x: 3, z: -11,
    rank: 'messenger',
    hatStyle: 'samo',
    cardId: 'sherman',
    lines: ['「평양에서 있었던 일을 보고드립니다.」'],
  },
  {
    // 파발은 서서 기다리지 않는다 — 2막 janggye-arrives 알현에서 인정전으로 뛰어
    // 들어와 장계를 건넨다. 그래서 actsVisible 이 비어 있다(궁 어디에도 서지 않는다).
    // 좌표는 알현이 끝난 뒤 돌아갈 자리로만 쓰인다.
    id: 'pabal',
    actsVisible: [],
    name: '파발',
    title: '강화도에서 온 전령',
    palace: 'changdeok',
    x: 6, z: -13,
    rank: 'messenger',
    hatStyle: 'samo',
    lines: ['숨이 채 가라앉지 않았다.', '「정족산성에서 온 장계입니다.」'],
  },
  {
    id: 'sujeong',
    actsVisible: [1],   // 1871 신미양요 — 2막 경복궁 국면(1868~71)
    name: '수정전 관원',
    title: '',
    palace: 'gyeongbok',
    x: -30, z: -12,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'sinmi-officer',
    lines: ['「신미년, 광성보에서 있었던 일이 저들 쪽 기록에도 남았습니다.」'],
  },
  {
    id: 'yeokgwan',
    actsVisible: [2],   // 서계 문제가 조약 협상으로 이어지는 3막
    name: '역관',
    title: '통역 관리',
    palace: 'gyeongbok',
    x: -6, z: -6,
    rank: 'mid',
    hatStyle: 'samo',
    cardId: 'seogye',
    lines: ['「일본에서 온 문서인데, 글자가 마음에 걸립니다.」'],
  },
  {
    // 최익현도 서서 기다리지 않는다 — 3막의 두 알현(gyeyu-audience·axe-sangso)에서
    // 임금 앞으로 걸어 들어온다. 1873년에는 계유상소를 들고, 1876년에는 도끼를 지고.
    // 「왜양일체론」 카드는 그 1876년 자리에서 건넨다: 바닥에 놓여 있던 시절에는
    // 1873년의 낮에 주우면 세 해 뒤의 글이 미리 손에 들어왔다.
    id: 'choeikhyeon',
    actsVisible: [],
    name: '최익현',
    title: '',
    palace: 'gyeongbok',
    x: -11, z: 0,
    rank: 'senior',
    hatStyle: 'samo',
    lines: ['「전하, 아뢰옵고 싶은 말씀이 있습니다.」'],
  },
  {
    id: 'sugun',
    actsVisible: [2],   // 1875 운요호 사건
    name: '수군 관원',
    title: '',
    palace: 'gyeongbok',
    x: 6, z: -6,
    rank: 'messenger',
    hatStyle: 'samo',
    cardId: 'unyo',
    lines: ['「초지진에서 포성이 있었다 합니다.」'],
  },
  {
    id: 'sinheon',
    actsVisible: [2],   // 1876 강화도 조약 협상
    name: '신헌',
    title: '접견대관 · 협상 대표',
    palace: 'gyeongbok',
    x: 0, z: -16,
    // 신헌은 종1품 판중추부사로 강화도 협상의 전권대신이었다 — 당상관보다도 위다.
    // 이 게임엔 그보다 높은 등급이 king·regent 뿐이라 senior 를 쓴다(흉배를 단다).
    rank: 'senior',
    hatStyle: 'samo',
    // 사정전 바닥에 따로 놓여 있던 조약 조항 네 장(palaces.js pickups) — 강화도에서
    // 협상하고 그 조약문을 직접 궁으로 가져온 사람이 신헌이다. 「누가 쓰거나 날랐는가」
    // 원칙(재제작 지시)을 따르면 이 넉 장은 바닥이 아니라 신헌이 건네야 맞다.
    // cardIds(복수)는 npcs.js 의 다른 신하들과 다른 자리다 — 한 사람이 한 장이 아니라
    // 한 뭉치를 들고 온다. main.js 의 applyPickupPacket() 이 이 배열을 보고 한 번의
    // 대화로 넉 장을 모두 건넨다(자리를 옮겨 다니며 하나씩 줍지 않는다).
    cardIds: ['ganghwa1', 'ganghwa7', 'ganghwa10', 'joil-trade'],
    lines: [
      '강화도에서 돌아온 신헌이 조약문 묶음을 건넨다.',
      '「전하, 강화도에서 맺은 조약의 조항들입니다. 하나하나 살펴보셔야 합니다.」',
    ],
  },
]

// 신하 한 명이 건네는 카드가 전부 「지금 막이나 그 이전 막」 것인지 본다 — SOURCES 의
// act 가 유일한 근거다(다른 곳에 막 번호를 또 적어 두지 않는다). 카드가 없는 신하
// (흥선대원군)는 언제나 통과한다. actIndex 는 0-인덱스, SOURCES.act 는 1-인덱스다.
function cardsReadyByAct(npc, actIndex) {
  return npcCardIds(npc).every(id => (sourceById(id)?.act ?? 0) <= actIndex + 1)
}

// 지금 궁(baseOf 로 화재 변형도 같은 궁으로 본다)·막에서 실제로 보이는 신하만 고른다.
// 두 조건을 같이 본다 — actsVisible(수동으로 정한 등장 막, 흥선대원군처럼 카드가
// 없는 신하용)과 cardsReadyByAct(그 신하가 든 카드의 act, SOURCES 가 근거). 후자가
// 없으면 사정전의 신헌·최익현·수군 관원처럼 카드가 실제로 쓰이는 막보다 일찍 궁 안에
// 서 있는 신하가 생긴다 — 「누가 쓰거나 날랐는가」의 문서를 시대보다 먼저 건네는 것.
// Normalize the shared data, so rendered bodies and conversation hit ranges agree.
for (const npc of NPCS) Object.assign(npc, safePosition(PALACES[npc.palace], npc, .8))

export function npcsAt(baseOf, palaceId, actIndex) {
  const base = baseOf(palaceId)
  return NPCS.filter(n =>
    n.palace === base &&
    (n.actsVisible ?? []).includes(actIndex) &&
    cardsReadyByAct(n, actIndex))
}

// id 로 한 사람을 찾는다 — 알현 장면(systems/audience.js)이 쓴다. 그 장면은
// actsVisible 을 보지 않는다: 「지금 이 자리에 부른 사람」이라 막마다 서 있는
// 사람과는 다른 목록이다.
export function npcById(id) {
  return NPCS.find(n => n.id === id) ?? null
}

// 대화 화면에 세울 얼굴(ui/portraits-data.js 의 키). rank 와 이름이 같다 —
// 그 얼굴이 곧 3D 인물을 만든 그림이기 때문이다(tools/cut-portraits.py).
// 임금만 나이로 갈린다.
export function portraitKeyOf(npc, ageStage = 'adult') {
  if (!npc) return null
  if (npc.rank === 'king') return ageStage === 'child' ? 'king_child' : 'king_adult'
  return npc.rank ?? 'mid'
}

export function npcNear(list, x, z, radius = 7) {
  let best = null
  let bestDist = radius
  for (const n of list) {
    const d = Math.hypot(x - n.x, z - n.z)
    if (d <= bestDist) { best = n; bestDist = d }
  }
  return best ? { npc: best, dist: bestDist } : null
}

// 신하 한 명이 건네는 카드 목록 — 대개 한 장(cardId)이지만 신헌처럼 뭉치를
// 통째로 건네는 신하는 cardIds(복수)를 쓴다. 두 자리 다 없으면(흥선대원군처럼
// 말만 건네는 신하) 빈 배열이다.
export function npcCardIds(npc) {
  if (npc.cardIds) return npc.cardIds
  if (npc.cardId) return [npc.cardId]
  return []
}

// 신하가 대신 건네는 카드는 바닥 표지(3D 마커·미니맵 점)를 따로 띄우지 않는다 —
// 사람이 이미 그 자리에 서 있다. 규장각·수정전처럼 신하가 없는 자리만 표지가 남는다.
export function npcHandledCardIds() {
  return new Set(NPCS.flatMap(npcCardIds))
}
