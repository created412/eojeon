// 궁을 오가는 사람들과 문 앞의 수문장이 건네는 한마디.
//
// 선생님(2026-10-06): 「다른 모든 캐릭터들도 말을 걸 시 한 문장 정도는 대답하게 만들어야해.」
//
// 예전에는 신하(data/npcs.js)만 말을 받았다. 심부름 가는 궁인·순라·궁녀·수문장은 임금이
// 다가가면 읍만 하고 지나갔다 — E 를 눌러도 아무 일이 없었다. 이제 그들도 **한 문장**은
// 답한다. 문서도, 표지도, 「한 일」도 없다 — 그냥 궁에 사는 사람의 말이다.
//
// ⚠ 전부 재구성이다. 실존 인물이 아니고 기록에 남은 말이 아니다. 그래서 화면의 이름표에
//   「재구성」을 함께 적는다(main.js 의 'chat'). 지어낸 사실(수·값·이름)은 넣지 않는다 —
//   제 일(문서를 나른다, 물을 긷는다, 순라를 돈다)과 임금 앞의 예(禮)만 말한다.
// ⚠ 한 사람에게 두어 줄을 두되 **한 번에 한 줄**만 나간다. 막(actIndex)으로 고른다 —
//   같은 궁을 여러 막 걸으면 다른 말을 듣는다. 데이터에 「N 해」 같은 햇수는 적지 않는다.
// 궁인(data/walkers.js 의 id) → { name, lines }
export const WALKER_CHATTER = {
  // 창덕궁
  'cd-seungji': { name: '승정원 서리', lines: [
    '「선정전에서 인정전으로 올리는 문서입니다. 길을 비켜 드리겠습니다.」',
    '「오늘 올라온 글이 많습니다. 승지께서 밤새 보셨습니다.」',
  ] },
  'cd-naegwan': { name: '내관', lines: [
    '「희정당과 대조전 사이를 오가는 길입니다. 전하, 밤이 차니 옷을 더 입으소서.」',
    '「내전에 전할 말씀이 있어 가는 길입니다.」',
  ] },
  'cd-sunra': { name: '순라 군사', lines: [
    '「돈화문 안을 돌고 있습니다. 별일 없습니다, 전하.」',
    '「금천 둑을 따라 한 바퀴 더 돌겠습니다.」',
  ] },
  'cd-seori': { name: '규장각 서리', lines: [
    '「규장각에 들일 책입니다. 떨어뜨리지 않게 안고 갑니다.」',
    '「인정전에서 규장각까지, 하루에 몇 번을 오가는지 모르겠습니다.」',
  ] },
  'cd-salim': { name: '궁녀', lines: [
    '「우물에서 물을 길어 관물헌으로 갑니다. 전하께서 지나시니 잠시 섰습니다.」',
    '「아침 상을 물린 뒤라 그릇을 씻으러 가는 길입니다.」',
  ] },
  'cd-jangdok': { name: '궁녀', lines: [
    '「장독대의 독을 살피고 연경당으로 돌아갑니다.」',
    '「장이 잘 익었는지 날마다 들여다봅니다.」',
  ] },
  'cd-munseo': { name: '서리', lines: [
    '「관물헌의 글을 성정각으로 옮기는 길입니다.」',
    '「읽으실 글이 또 쌓였습니다, 전하.」',
  ] },
  'cd-garden': { name: '사령', lines: [
    '「후원 쪽 담을 돌아보고 오는 길입니다.」',
    '「부용지 물가에 낙엽이 많아 치우고 왔습니다.」',
  ] },
  // 경복궁
  'gb-seungji': { name: '승정원 서리', lines: [
    '「사정전에서 근정전으로 올리는 문서입니다.」',
    '「새 궁의 길은 아직 발에 익지 않았습니다, 전하.」',
  ] },
  'gb-seori': { name: '서리', lines: [
    '「수정전과 사정전 사이를 오갑니다. 글을 옮기는 것이 제 일입니다.」',
    '「수정전에 두신 책을 사정전으로 가져오라 하셨습니다.」',
  ] },
  'gb-sunra': { name: '순라 군사', lines: [
    '「광화문 안 마당을 돌고 있습니다. 문은 잘 지키고 있습니다.」',
    '「저녁 순라까지 한 바퀴 더 남았습니다.」',
  ] },
  'gb-naegwan': { name: '내관', lines: [
    '「자경전에 전할 말씀을 받아 가는 길입니다.」',
    '「사정전에 들러 아뢰고 자경전으로 갑니다.」',
  ] },
  'gb-salim': { name: '궁녀', lines: [
    '「동쪽 살림채를 돌보고 있습니다. 전하께서 지나시니 길을 비킵니다.」',
    '「빨래를 걷으러 가는 길입니다.」',
  ] },
  'gb-water': { name: '궁녀', lines: [
    '「우물물을 길어 갑니다. 물동이가 무거워 걸음이 느립니다.」',
    '「경회루 못가는 바람이 찹니다, 전하.」',
  ] },
  'gb-munseo': { name: '서리', lines: [
    '「수정전으로 글을 나릅니다. 비켜 드리겠습니다.」',
    '「서쪽 행각에서 수정전까지가 제 길입니다.」',
  ] },
  'gb-garden': { name: '사령', lines: [
    '「동쪽 담을 돌아보고 오는 길입니다.」',
    '「새 궁이라 손볼 데가 아직 많습니다.」',
  ] },
  // 경우궁
  'gu-sori': { name: '사령', lines: [
    '「행각과 정당 사이를 오갑니다. 오늘 밤은 사람이 많습니다.」',
  ] },
  'gu-seori': { name: '서리', lines: [
    '「정당으로 글을 가져가는 길입니다. 바깥이 소란합니다, 전하.」',
  ] },
  // 운현궁 — 집안 사람들
  'uh-haengrang': { name: '행랑 사람', lines: [
    '「사랑채와 안채 사이를 심부름하는 길입니다. 도련님, 안채에서 찾으셨습니다.」',
  ] },
  'uh-salim': { name: '집안 사람', lines: [
    '「마당을 쓸고 있었습니다. 오늘은 대문 밖에 사람이 많습니다.」',
  ] },
}

// 문 앞의 수문장 — 궁마다 두 사람(data/palaces.js yard.gateGuards). 궁의 문 이름으로 말한다.
export const GUARD_CHATTER = {
  changdeok: { name: '돈화문 수문장', lines: [
    '「돈화문을 지키고 있습니다. 드나드는 사람을 하나하나 묻습니다.」',
    '「문은 닫혀 있습니다, 전하. 명이 있어야 엽니다.」',
  ] },
  gyeongbok: { name: '광화문 수문장', lines: [
    '「광화문을 지키고 있습니다. 바깥은 조용합니다.」',
    '「문밖에 사람이 모여 있습니다. 들이지 않았습니다.」',
  ] },
  unhyeon: { name: '대문지기', lines: [
    '「대문 앞에 가마가 와 있습니다. 궁에서 온 사람들입니다.」',
  ] },
}

const FALLBACK = { name: '궁인', lines: ['「지나가는 길입니다. 전하께 예를 올립니다.」'] }

// 한 사람의 한마디 — 막으로 고른다. 없는 사람은 FALLBACK(세우기만 하고 말을 안 적은 사람이 없게 시험이 본다).
export function chatterFor(kind, id, actIndex = 0) {
  // 수문장은 궁 id 로 찾는다 — 변형 궁(gyeongbok_jagyeong 처럼)은 바탕 궁의 문지기다.
  const entry = kind === 'guard' ? (GUARD_CHATTER[id] ?? GUARD_CHATTER[String(id).split('_')[0]]) : WALKER_CHATTER[id]
  const who = entry ?? FALLBACK
  const line = who.lines[((actIndex % who.lines.length) + who.lines.length) % who.lines.length]
  return { name: who.name, line }
}

// 말을 거는 거리 — 신하보다 가깝다(npcNear 의 7m 는 전각 안의 앵커를 재는 값이다).
// 궁인은 걷는 몸 그 자리에서 잰다. 두 걸음 안이면 말이 걸린다.
export const CHAT_RANGE = 2.6

/**
 * 가장 가까운 「말 없는 사람」 — 궁인(살아 있는 자리) 또는 수문장(붙박이 자리).
 * walkers: [{ id, x, z }], guards: [{ x, z }] (궁의 yard.gateGuards). 없으면 null.
 */
export function chatNear({ walkers = [], guards = [], x, z, range = CHAT_RANGE }) {
  let best = null
  let bestDist = range
  for (const w of walkers) {
    const d = Math.hypot(x - w.x, z - w.z)
    if (d <= bestDist) { best = { kind: 'walker', id: w.id, x: w.x, z: w.z }; bestDist = d }
  }
  guards.forEach((g, i) => {
    const d = Math.hypot(x - g.x, z - g.z)
    if (d <= bestDist) { best = { kind: 'guard', id: String(i), x: g.x, z: g.z }; bestDist = d }
  })
  return best ? { ...best, dist: bestDist } : null
}
