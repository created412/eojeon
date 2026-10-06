// 궁을 오가는 사람들 — 말을 걸 수 없는, 제 일을 보는 이들.
//
// 선생님(2026-09-26): 「오가게 만드는 거부터 해.」
//
// **왜 신하를 옮기지 않고 사람을 더 세우는가.** 말이 걸리는 자리(npcNear)는 눈에
// 보이는 몸이 아니라 data/npcs.js 의 좌표에서 잰다. 그 사람들을 방 밖으로 내보내면
// 학생이 보고 있는 몸 앞에서 E 가 안 먹고, 아무도 없는 자리에서 말이 걸린다 —
// 이 게임이 돌아가는 축(다가가서 E)이 통째로 어긋난다. 그래서 신하는 제 전각을
// 지키고(systems/palace-life.js 의 서성임), **궁을 오가는 일은 이 사람들이 한다.**
// 실제로도 궁에서 하루 종일 걸어 다닌 것은 정승이 아니라 이들이었다.
//
// 이들에게는 말도, 문서도, 표지도 없다. 지나가고, 임금을 만나면 멈춰 서서 읍한다.
//
// 길은 손으로 적지 않는다 — 방과 방 사이는 systems/route.js 의 길찾기가 벽과
// 문간을 피해 이어 준다(궁마다 전각 배치가 다르고, 불탄 경복궁처럼 같은 궁이
// 두 모양을 갖기도 한다). 여기 적는 것은 「어디에서 어디로, 무슨 일로」뿐이다.
//
// rank — render/glb-person.js 의 RANK_SPECS. 'mid' 는 관복, 'messenger' 는 파발·사령
// 차림이다. 'maid'는 청록 저고리·남색 치마의 입체 궁녀 역할 재구성이다.
// 실존 인물의 얼굴이나 왕비를 재현한 것이 아니다.

// 한 사람: { id, rank, stops:[방 id 또는 {x,z}], pause? }
//   stops 를 차례로 다녀오고, 끝에 닿으면 왔던 길을 되짚어 돌아온다.
//   pause — 한 자리에서 서 있는 시간(ms). 안 적으면 WALKER_PAUSE_MS.
export const WALKERS = {
  changdeok: [
    // 승정원의 문서가 편전으로 올라가는 길. 조선의 공문은 사람이 들고 걸었다.
    { id: 'cd-seungji', rank: 'mid', stops: ['seonjeongjeon', 'injeongjeon'] },
    // 내전 쪽 심부름 — 희정당과 대조전 사이.
    { id: 'cd-naegwan', rank: 'messenger', stops: ['huijeongdang', 'daejojeon'], pause: 5200 },
    // 마당을 도는 순라. 돈화문 안쪽에서 인정전 앞까지.
    // 금천 남쪽 둑으로 순라를 옮긴다 — z=30은 물 가장자리였다(2026-10-06).
    { id: 'cd-sunra', rank: 'messenger', stops: [{ x: -13, z: 31.5 }, { x: 13, z: 31.5 }, { x: 13, z: 19 }], pause: 3200 },
    // 규장각으로 책을 나르는 서리.
    { id: 'cd-seori', rank: 'mid', stops: ['gyujanggak', 'injeongjeon'], pause: 6400 },
    // 선생님(2026-10-06): 「궁녀들도 돌아다니고 실제 조선궁궐처럼 꾸며줘, 히든피스」.
    // 우물·장독대·내전 사이 살림 동선에는 새 입체 궁녀 차림을 쓴다.
    { id: 'cd-salim', rank: 'maid', stops: [{ x: 9, z: -20 }, { x: 15, z: -24 }, 'gwanmulheon'], pause: 7200 },
    { id: 'cd-jangdok', rank: 'maid', stops: [{ x: -28, z: -33 }, { x: -30, z: -18 }, 'yeongyeongdang'], pause: 6800 },
    { id: 'cd-munseo', rank: 'mid', stops: ['gwanmulheon', 'seongjeonggak'], pause: 5800 },
    { id: 'cd-garden', rank: 'messenger', stops: [{ x: 33.5, z: -29 }, { x: 34, z: -43 }, { x: 26, z: -44 }], pause: 8400 },
  ],
  gyeongbok: [
    { id: 'gb-seungji', rank: 'mid', stops: ['sajeongjeon', 'geunjeongjeon'] },
    { id: 'gb-seori', rank: 'mid', stops: ['sujeongjeon', 'sajeongjeon'], pause: 6000 },
    // 광화문 안쪽 마당의 순라.
    // ⚠ x 를 ±15 에 두었더니 회랑 벽 위였다(경복궁 colonnade halfW 14 · z 21.5~34).
    //    마당 안쪽으로 당긴다 — 시험이 길 위의 모든 자리를 벽과 견준다.
    { id: 'gb-sunra', rank: 'messenger', stops: [{ x: -11, z: 30 }, { x: 11, z: 30 }, { x: 11, z: 26 }], pause: 3200 },
    { id: 'gb-naegwan', rank: 'messenger', stops: ['jagyeongjeon', 'sajeongjeon'], pause: 5200 },
    { id: 'gb-salim', rank: 'maid', stops: [{ x: 33, z: -3 }, { x: 33, z: -24 }, { x: 38, z: -26 }], pause: 7200 },
    { id: 'gb-water', rank: 'maid', stops: [{ x: -34, z: 7 }, { x: -21, z: 8 }, { x: -19, z: 27 }], pause: 6200 },
    { id: 'gb-munseo', rank: 'mid', stops: [{ x: -20, z: -23 }, { x: -20, z: 8 }, 'sujeongjeon'], pause: 7600 },
    { id: 'gb-garden', rank: 'messenger', stops: [{ x: 36, z: 12 }, { x: 36, z: -24 }, { x: 22, z: -27 }], pause: 8800 },
  ],
  gyeongu: [
    { id: 'gu-sori', rank: 'messenger', stops: ['haenggak-e', 'jeongdang'], pause: 4200 },
    { id: 'gu-seori', rank: 'mid', stops: ['haenggak-w', 'jeongdang'], pause: 5200 },
  ],
  unhyeon: [
    // 운현궁은 궁이 아니라 사가(私家)다 — 오가는 것은 관원이 아니라 집안 사람이다.
    { id: 'uh-haengrang', rank: 'messenger', stops: ['sarang', 'anchae'], pause: 5600 },
    { id: 'uh-salim', rank: 'messenger', stops: [{ x: -17, z: 8 }, { x: 4, z: 8 }, { x: 17, z: 4 }], pause: 7800 },
  ],
}

export function walkersIn(palaceId) {
  return WALKERS[palaceId] ?? []
}
