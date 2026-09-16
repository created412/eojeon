// 2단계 — 궁을 사람 크기로 들여온다. 예전에는 여덟·다섯 채가 120×140m·140×160m
// 지면에 흩어져 있었다 — 하늘에서 내려다본 배치도였지 안에 있는 감각이 아니었다.
// 임금은 웬만해서는 옮겨 다니지 않았다 — 신하가 그 앞으로 왔다. 그래서 여기서는
// 편전·침전이 있는 생활 권역 하나로 건물을 바짝 붙였다. 방 id·minControl·councilRoom은
// 하나도 건드리지 않는다 — PLACE_COST·출구 판정·낮 예산 시험(tests/data/integrity.test.js
// 등)이 이 이름들에 물려 있다. 바뀐 것은 좌표(x·z·w·d)와 지면 크기뿐이다.
export const PALACES = {
  changdeok: {
    id: 'changdeok',
    name: '창덕궁',
    councilRoom: 'injeongjeon',
    ground: { w: 76, d: 96 },
    spawn: { x: 0, z: 22.5 },
    rooms: [
      // 돈화문은 인정전에서 넉넉히 떨어뜨린다 — 지붕이 처마 밖으로 넓게 퍼져
      // 나오는 지오메트리(render/palace.js buildHall)라, 너무 가까우면 스폰 지점
      // 바로 위를 지붕이 가려 카메라와 임금 사이를 막아 버린다(2단계 실사 점검에서
      // 실제로 걸린 문제 — 임금이 서 있어도 화면에 하나도 안 보였다).
      // gate — 앞뒤가 다 트인 집이다(doorsOf 참고). 궁 남쪽 끝에 있어 앞문만 두면
      // 궁 안에서는 들어갈 길이 없다.
      { id: 'donhwamun',    name: '돈화문',   gloss: '정문',       x:   0, z:  36, w: 10, d:  5, minControl: 'D', gate: true },
      { id: 'injeongjeon',  name: '인정전',   gloss: '어전회의',   x:   0, z:  12, w: 22, d: 18, minControl: 'D', furnish: 'court' },
      { id: 'seonjeongjeon',name: '선정전',   gloss: '편전',       x:  21, z:   6, w: 18, d: 16, minControl: 'C', furnish: 'study' },
      { id: 'huijeongdang', name: '희정당',   gloss: '침전',       x:  -3, z:  -8, w: 26, d: 18, minControl: 'C', furnish: 'bedchamber' },
      { id: 'daejojeon',    name: '대조전',   gloss: '중궁전',     x:  -3, z: -24, w: 16, d: 12, minControl: 'B', furnish: 'inner' },
      { id: 'gwanmulheon',  name: '관물헌',                        x:  17, z: -10, w: 12, d: 10, minControl: 'B', furnish: 'study' },
      // furnish — 방 안을 채우는 것(render/interiors.js). 방마다 쓰임에 맞는 세간이 놓인다:
      // 규장각은 서가와 책, 수정전은 기록 궤, 침전은 병풍과 잠자리, 창고는 가마니 …
      { id: 'gyujanggak',   name: '규장각',   gloss: '왕실 도서관', x: -21, z:  10, w: 18, d: 16, minControl: 'C', furnish: 'library' },
      // 연경당은 'A' 에서 'B' 로 내렸다 — 3단계 Task 2. 5막 C3(정변 사흘째 밤)에서
      // 임금이 후원으로 도망칠 때 조작권은 환어로 회복된 B 다(history-verification-A
      // 이동 목록 9항). 연경당이 A 전용이면 그 방에 들어갈 수 없어 C3 가 성립하지 않는다.
      // A 전용 방의 자리는 아래 낙선재가 물려받는다 — 창덕궁의 A 전용 방은 여전히 한 채다.
      { id: 'yeongyeongdang', name: '연경당', gloss: '사랑채',     x: -20, z: -25, w: 16, d: 12, minControl: 'B', furnish: 'sarang' },

      // ── 3단계 Task 2. 설계서 §7 「창덕궁 11곳 대 경우궁 3곳」을 숫자로 성립시킨다.
      // 세 채 모두 기존 여덟 채의 남쪽, 담과 여덟 채 사이의 빈 자리(z ≈ -34~-46)에
      // 둔다 — z 값만으로 기존 여덟 채와 모두 떨어져 있어 서로 겹치지 않는다.
      // 성정각 — 임금이 신하를 불러 만나던 곳. 밖에서 올라온 상소가 여기까지 온다
      { id: 'seongjeonggak', name: '성정각', x:   8, z: -40, w: 14, d: 12, minControl: 'B', furnish: 'study' },
      // 낙선재 — 궁 안의 사가(私家) 같은 별당. 임금이 스스로 정할 수 있을 때에만 걸음이 닿는다.
      // 창덕궁에서 조작권 A 로만 열리는 방은 이 한 채뿐이다(연경당이 물려준 자리).
      { id: 'nakseonjae',    name: '낙선재', x: -10, z: -40, w: 18, d: 12, minControl: 'A', furnish: 'sarang' },
      // 선원전 — 역대 임금의 어진을 모신 곳
      { id: 'seonwonjeon',   name: '선원전', x: -29, z: -40, w: 16, d: 12, minControl: 'B', furnish: 'shrine' },
    ],
    // 창덕궁을 창덕궁으로 보이게 하는 것 — **나무**다.
    //
    // 선생님 지적 6번: "창덕궁과 경복궁의 차이가 별로 안보여." 그럴 수밖에 없었다.
    // 두 궁이 같은 buildHall 로 세운 같은 모양의 집을 좌표만 달리해 늘어놓은 것이었다.
    // 실제로 두 궁이 다른 점은 집 모양이 아니라 **앉힌 방식**이다: 경복궁은 남북 축에
    // 맞춰 반듯하게 세운 궁이고(그래서 근정전 앞에 회랑과 품계석이 늘어선 조정이 있다),
    // 창덕궁은 산자락을 따라 집을 흩어 놓고 그 사이를 나무가 채운 궁이다.
    // 그 차이를 두 줄로 옮긴다 — 여기 나무, 저기 회랑과 품계석.
    //
    // 좌표는 방 자리·사료 지점과 겹치지 않게 골랐다. tests/data/yard.test.js 가 붙든다.
    yard: {
      // 카메라는 임금에게 바짝 붙어 있다(CAM_DIST 14) — 담 근처에 심으면 화면에
      // 한 번도 안 들어온다. 처음 판이 그랬다: 나무를 열 그루 심었는데 실제로
      // 보이는 것은 화면 귀퉁이의 초록 조각 하나뿐이었다. **걸어 다니는 길가에** 심는다.
      trees: [
        [-12, 26], [12, 26], [-10, 31], [10, 31],
        [-16, 22], [16, 21], [-24, 24], [24, 20],
        [-18, -6], [-24, -8], [10, -22], [20, -30],
        [-33, 30], [33, -22],
      ],
    },
    pickups: [
      // 규장각 — 책과 목록이 있는 서고. 아무도 서 있지 않은, 손대지 않은 채 놓인 문서다.
      // 원납전(-21,10)이 여기 있었다. 1막이 알현 비트로 바뀌면서 호조 관리가 임금
      // **앞으로 들고 오는** 문서가 되었다(data/acts.js 의 audience 비트). 열두 살
      // 임금이 서고까지 걸어가 스스로 집어 오는 그림이 애초에 틀렸다.
      { cardId: 'oegyujanggak',      placeId: 'gyujanggak',    x: -24, z:  13 },
      // 선정전 — 정전 옆 편전. 조정 안에서 오간 말이 여기 있다.
      // 당백전(21,6)도 같은 이유로 여기서 뺐다 — 같은 카드를 두 통로로 얻지 않는다.
      // 척화비는 여기서 줍는 문서가 아니다 — 2막 F1(brush 비트)에서 학생이 직접 써서
      // 사초함에 들어온다(grantCard). 줍기 지점을 같이 두면 같은 카드를 두 통로로 얻고,
      // 1866년 창덕궁 낮에 1871년에야 세워질 비석의 사료를 미리 줍는 시대착오도 생긴다.
      // Task 12: 이 자리에 있던 pickup 항목을 뺀다.
      // 희정당 — 밖에서 올라온 문서를 임금이 읽는 곳.
      { cardId: 'bellonet',          placeId: 'huijeongdang',  x:  -8, z:  -5 },
      { cardId: 'sherman',           placeId: 'huijeongdang',  x:   3, z: -11 },
      // 양헌수의 정족산성 장계(6,-13)가 여기 있었다. 장계는 임금이 찾아가 집는 것이
      // 아니라 강화도에서 사람이 들고 뛰어오는 것이다 — 2막 janggye-arrives 알현에서
      // 파발이 직접 건넨다(data/acts.js).
      // ── 4막 「임오」 · 1882 ──
      // 규장각 — 책과 목록. 『조선책략』은 수신사가 들고 들어온 책이다
      // 『조선책략』도 책이다 — 책이 있는 곳(규장각)에서 수신사를 따라온 사람이 아뢴다.
      // 관물헌에 두었다가 물렀다: 그 방은 4막 낮의 나가는 방이라, E 한 번이 「말을 건다」와
      // 「낮을 끝낸다」를 동시에 가리켜 문서를 영영 못 받는다.
      { cardId: 'joseon-chaeryak',   placeId: 'gyujanggak',    x: -18, z: 6.5 },
      // 성정각 — 밖에서 올라온 상소가 임금 앞에 놓이는 자리
      { cardId: 'yeongnam-manin',    placeId: 'seongjeonggak', x:   5, z: -38 },
      { cardId: 'hong-jaehak',       placeId: 'seongjeonggak', x:  11, z: -42 },
    ],
  },
  gyeongbok: {
    id: 'gyeongbok',
    name: '경복궁',
    councilRoom: 'sajeongjeon',
    ground: { w: 100, d: 96 },
    spawn: { x: 0, z: 24 },
    rooms: [
      // 광화문도 같은 이유로 근정전에서 넉넉히 떨어뜨린다 — donhwamun 주석 참고.
      { id: 'gwanghwamun',  name: '광화문', gloss: '정문',         x:   0, z:  37, w: 11, d:  6, minControl: 'D', gate: true },
      { id: 'geunjeongjeon',name: '근정전', gloss: '정전',         x:   0, z:  13, w: 26, d: 20, minControl: 'D', furnish: 'court', throne: true },
      // 사정전은 깊이를 좀 더 준다 — 6장을 좌우 두 줄(x:±11)에 나눠 세우려면
      // 세로로 그만한 자리가 필요하다. 가운데 줄(x 근처 0)은 쓰지 않는다: 정면의
      // 근정전(팔작지붕, 10m 높이)이 그 축과 겹쳐 카메라와 임금 사이를 가린다
      // (2단계 실사 점검에서 실제로 걸렸다 — pickupsVisibility 주석 아래 참고).
      { id: 'sajeongjeon',  name: '사정전', gloss: '어전회의',     x:   0, z: -12, w: 26, d: 26, minControl: 'C', furnish: 'court' },
      // 수정전도 사정전 왼쪽 줄(x:-11)과 10m 넘게 떨어지도록 서쪽으로 조금 더 둔다.
      { id: 'sujeongjeon',  name: '수정전', gloss: '기록 보관',    x: -34, z:  -8, w: 22, d: 18, minControl: 'C', furnish: 'archive' },
      { id: 'jagyeongjeon', name: '자경전', gloss: '대비전',       x:  22, z: -14, w: 16, d: 14, minControl: 'B', furnish: 'dowager' },
    ],
    // 경복궁을 경복궁으로 보이게 하는 것 — **조정(朝庭)**이다. 근정전 앞의 넓은 마당을
    // 회랑이 둘러싸고, 그 가운데로 품계석이 두 줄 늘어선다. 신하가 품계에 따라 제 돌
    // 옆에 서던 자리다. 창덕궁에는 이런 마당이 없다(위 changdeok.yard 주석 참고).
    //
    // 회랑은 걷는 길(x≈0의 남북 축)을 비워 두고 양옆(x=±22)에만 세운다 — 장식이
    // 걸음을 막으면 안 된다(움직임 판정은 방만 본다, systems/movement.js).
    yard: {
      // z 는 근정전 앞면(20.2)과 광화문 앞면(34.8) 사이다 — 두 집을 파고들지 않는다.
      colonnade: { room: 'geunjeongjeon', halfW: 14, z0: 21.5, z1: 34 },
      rankStones: { room: 'geunjeongjeon', halfW: 3.6, z0: 22, z1: 33, pairs: 6 },
    },
    // ⚠ 좌표 규칙이 **뒤집혔다.** 아래 옛 주석은 「문서가 바닥에 놓여 있고 카메라가
    // 높이서 내려다보던 시절」의 것이다 — 그때는 방 밖(처마 밖)에 두어야 지붕에 안
    // 가렸다. 지금 이 자리에 있는 것은 문서가 아니라 **사람**이고, 방 밖에 세우면
    // 처마와 벽 사이에 낀 것처럼 보인다. 선생님이 그 화면을 찍어 보내셨다.
    // 그래서 지금 규칙은 그 반대다: **사람은 제 방 안, 벽에서 두 걸음 이상 떨어져 선다.**
    // (신헌이 한 번에 건네는 넉 장의 좌표는 사람이 서는 자리가 아니라 「그 궁에 그
    //  문서가 있다」는 표식일 뿐이라 그대로 둔다 — 아무도 그 자리에 서지 않는다.)
    //
    // 옛 주석 — 사료 지점 좌표 규칙. 방 안쪽 깊이 어디든 좋은 게 아니다. 방 폭의 약 72%만
    // 실제 3D 모델(render/palace.js buildHall)로 세워지므로, 그 폭의 절반(대략 방
    // 중심에서 9~11m) 밖에 있어야 그 방 자신의 벽·기둥에 카메라 시야가 막히지 않는다.
    // 방 중심 축(x≈0, 여기서는 사정전·근정전·광화문이 공유하는 남북 축)도 피한다 —
    // 그 축 위에 선 다른 전각의 높은 지붕이 뒤쪽 지점을 가리기 때문이다. 아래 좌표는
    // 모두 이 두 규칙을 만족하도록 브라우저에서 실측해 골랐다.
    pickups: [
      // 수정전 — 중건 뒤 규장각이 있던 일곽. 기록이 모이는 곳이다.
      { cardId: 'junggeon',      placeId: 'sujeongjeon',   x: -38, z:  -4 },
      { cardId: 'sinmi-officer', placeId: 'sujeongjeon',   x: -30, z: -12 },
      // 서계(1873 알현)·조약문 세 장(1876 신헌의 알현)은 이제 사람이 알현에서 건넨다 — 바닥 자리를 지웠다
      // (2026-09-13 역사 순서 정리).
      // 사정전 — 편전. 조약 문서가 여기 쌓인다
      // 최익현의 「왜양일체론」(-11,0)이 여기 있었다. 1876년의 글인데 1873년의 낮에
      // 걸어가 주우면 그대로 손에 들어왔다 — 세 해를 앞질렀다. 지금은 그 사람이
      // 도끼를 지고 들어와 직접 건넨다(3막 axe-sangso, data/acts.js).
      { cardId: 'unyo',          placeId: 'sajeongjeon',   x:   6, z:  -6 },
      { cardId: 'gaehang-chanseong', placeId: 'sujeongjeon', x: -40, z: -12 },
    ],
  },

  // ── 5막 「갑신」의 네 곳 (설계서 §8) — 3단계 Task 3 ──────────────
  // 경우궁 — 순조의 생모 수빈 박씨의 사당. 1884년 음 10월 17일 밤, 임금이 여기로 옮겨졌다.
  // ⚠ 내부 방 배치는 기록이 없다(설계서 §11). 정당 한 채와 행각 둘은 재구성이며,
  //    5막 비트가 이 궁에 들어설 때 화면에 그렇게 밝힌다(Task 14).
  // 지면이 창덕궁의 6.33분의 1 안팎(약 1/6)이다 — 좁음이 설계 의도다. 걸어 보면 세 걸음에 담이 나온다.
  gyeongu: {
    id: 'gyeongu',
    name: '경우궁',
    councilRoom: 'jeongdang',
    ground: { w: 36, d: 32 },
    spawn: { x: 0, z: 13 },
    rooms: [
      { id: 'jeongdang',  name: '정당',   x:   0, z:  -4, w: 16, d: 12, minControl: 'D', furnish: 'quarters' },
      { id: 'haenggak-e', name: '동행각', x:  13, z:   6, w: 10, d: 10, minControl: 'D', furnish: 'storehouse' },
      { id: 'haenggak-w', name: '서행각', x: -13, z:   6, w: 10, d: 10, minControl: 'D', furnish: 'storehouse' },
    ],
    // 경우궁에서 주울 수 있는 것은 이 한 장뿐이다(설계서 §7 의 표). 좁다는 것은
    // 걸음만 좁다는 뜻이 아니라 손에 들어오는 것이 적다는 뜻이기도 하다.
    pickups: [
      // 어좌 앞 마루에 놓는다. 예전에는 (0,-6) 이었는데 그 자리가 곧 어좌 위여서,
      // **학생이 임금의 자리에 올라가야 정강 14조를 줍는** 그림이 됐다.
      // (하필 이 문서가 「국왕의 전제권 제한」을 담은 그 열네 조목이다.)
      // tests/data/throne.test.js 가 이 종류를 붙든다.
      { cardId: 'reform14', placeId: 'jeongdang', x: 0, z: -2.2 },
    ],
  },
  // 운현궁 — 흥선군의 사저. 1863년 겨울까지 명복(고종)이 자란 집이다(2026-09-13 앞부분 보강).
  // ⚠ 방 배치는 복원이 아니라 재구성이다(경우궁과 같다). 노안당(사랑채)·노락당(안채)·대문 셋만 둔다.
  //    궁이 아니라 집이라 좁다 — 창덕궁에서 가마로 닷새 뒤의 인정전이 얼마나 큰지가 그 대비로 보인다.
  unhyeon: {
    id: 'unhyeon',
    name: '운현궁',
    private: true,   // 사가 — 어좌·일월오봉도를 세우지 않는다(render/palace.js)
    councilRoom: 'sarang',
    ground: { w: 48, d: 48 },
    spawn: { x: 0, z: 8 },
    rooms: [
      { id: 'sarang', name: '노안당', gloss: '사랑채', x: -9, z: -8, w: 18, d: 12, minControl: 'D', furnish: 'sarang' },
      { id: 'anchae', name: '노락당', gloss: '안채',   x: 12, z: -10, w: 16, d: 12, minControl: 'D', furnish: 'inner' },
      { id: 'daemun', name: '대문',                    x: 0,  z: 19, w: 8,  d: 4,  minControl: 'D', gate: true },
    ],
    pickups: [],
  },
  // 계동궁 — 고종의 사촌 이재원의 집. 검증 B 6항: 조회한 모든 2차문헌이 일치하는 정설이다.
  gyedong: {
    id: 'gyedong',
    name: '계동궁',
    councilRoom: 'sarangchae',
    ground: { w: 44, d: 40 },
    spawn: { x: 0, z: 12 },
    rooms: [
      { id: 'sarangchae', name: '사랑채', x: 0, z: -6, w: 20, d: 14, minControl: 'D', furnish: 'sarang' },
    ],
    pickups: [],
  },
  // 북묘 — 관왕묘다. 궁이 아니라 사당이다. 그래서 엔딩에서 이것을 이어로 셀 것인지가 문제가 된다(설계서 13.2).
  bukmyo: {
    id: 'bukmyo',
    name: '북묘',
    councilRoom: 'sadang',
    ground: { w: 56, d: 52 },
    spawn: { x: 0, z: 16 },
    rooms: [
      { id: 'sadang', name: '사당', x: 0, z: -6, w: 20, d: 16, minControl: 'D', furnish: 'shrine' },
    ],
    pickups: [],
  },
  // 오조유의 영방 — 청군 통령의 군영이다. 『고종실록』 21권 고종 21년 10월 19일 원문이
  // 「북묘로 거처를 옮겼다가 그 길로 또 선인문 밖 오조유의 영방으로 옮겼다」고 적는다.
  // 궁도 사당도 아니다. 이것을 이어로 셀 것인지도 학생이 정한다(설계서 13.2).
  ojoyu: {
    id: 'ojoyu',
    name: '오조유의 영방',
    councilRoom: 'yeongbang',
    ground: { w: 56, d: 52 },
    spawn: { x: 0, z: 16 },
    rooms: [
      { id: 'yeongbang', name: '영방', x: 0, z: -6, w: 22, d: 14, minControl: 'D', furnish: 'guardroom' },
    ],
    pickups: [],
  },
}

export function burntVariant(def, { id, name, burnt = [], sealed = [] }) {
  const burntSet = new Set(burnt)
  const sealedSet = new Set(sealed)
  return {
    ...def,
    id,
    name,
    rooms: def.rooms.map(r => ({
      ...r,
      burnt: burntSet.has(r.id),
      passable: !sealedSet.has(r.id),
    })),
    pickups: (def.pickups ?? []).filter(p => !burntSet.has(p.placeId)),
  }
}

export function isPassable(room) {
  return room.passable !== false
}

export const PALACE_BASE = {
  gyeongbok_jagyeong: 'gyeongbok',
  gyeongbok_burnt: 'gyeongbok',
}

export function baseOf(id) {
  return PALACE_BASE[id] ?? id
}

// 1873 겨울, 자경전 일곽이 탔다. 그 뒤 임금은 창덕궁으로 옮겼다가 1875년에 돌아온다.
PALACES.gyeongbok_jagyeong = burntVariant(PALACES.gyeongbok, {
  id: 'gyeongbok_jagyeong',
  name: '경복궁',
  burnt: ['jagyeongjeon'],
  sealed: ['jagyeongjeon'],
})

// 1876 겨울, 830여 칸이 탔다. 광화문과 근정전 마당으로만 걸어 나갈 수 있다.
PALACES.gyeongbok_burnt = burntVariant(PALACES.gyeongbok, {
  id: 'gyeongbok_burnt',
  name: '경복궁 (불탄 뒤)',
  burnt: ['geunjeongjeon', 'sajeongjeon', 'sujeongjeon', 'jagyeongjeon'],
  sealed: ['sajeongjeon', 'sujeongjeon', 'jagyeongjeon'],
})

// HUD 가 「창덕궁 · 규장각(왕실 도서관)」처럼 읽도록 방 이름을 고른다 — 교사가
// 방 이름을 소리 내 부를 때 학생이 화면에서 그대로 확인할 수 있어야 한다
// (2단계 최종 리뷰, 가독성 항목 1: 「규장각으로 가세요」를 따라갈 길이 없었다).
export function roomLabel(def, roomId) {
  if (!roomId) return null
  const room = def.rooms.find(r => r.id === roomId)
  if (!room) return null
  return room.gloss ? `${room.name}(${room.gloss})` : room.name
}

// 문 — 방은 **앞쪽(+z) 가운데로만** 드나든다.
//
// render/palace.js 가 방을 지을 때 벽을 뒤·좌·우 세 면만 세우고 앞을 열어 둔다.
// 그런데 이동 판정에는 벽이 아예 없어서 학생이 **벽을 뚫고** 아무 데로나 들어갔다
// (선생님 지적 9번). 눈에는 벽이 보이는데 몸은 통과하는 상태였다.
//
// 그림과 판정이 같은 규칙을 쓰게 한다: 열려 있는 그 앞면이 곧 문이다.
export const DOOR_FRACTION = 0.44      // 앞면 폭의 이만큼이 문이다
export const DOOR_MIN = 4              // 아주 좁은 방도 사람은 지나야 한다

// 문은 앞면(+z)에 난다. 다만 **문(門)인 방은 앞뒤가 다 트여 있다** — 광화문·돈화문은
// 지나다니라고 있는 집이지 들어가 머무는 집이 아니다.
//
// ⚠ 이걸 안 두었더니 실제로 막혔다. 벽을 못 뚫게 만든 뒤로, 궁 남쪽 끝에 선 광화문은
// 문이 궁 **바깥쪽**에만 나 있어서 궁 안에서 걸어가면 뒷벽에 막혔다. 2막의 낮이
// 「E — 광화문에 나가 선다」로 끝나는데 거기에 닿을 길이 없었다 — 학생이 고종 5~8년
// 화면에서 영영 못 넘어간다. 선생님이 실제로 그 자리에서 막혔다.
export function doorsOf(room) {
  const w = Math.max(DOOR_MIN, room.w * DOOR_FRACTION)
  const x0 = room.x - w / 2
  const x1 = room.x + w / 2
  const front = { x0, x1, z: room.z + room.d / 2 }
  if (room.gate !== true) return [front]
  return [front, { x0, x1, z: room.z - room.d / 2 }]
}

// 옛 이름 — 앞문 하나만 묻는 자리가 아직 있다(미니맵 따위).
export function doorOf(room) {
  return doorsOf(room)[0]
}

// (x,z) 가 그 방의 문 앞(문 폭 안, 그 면 근처)에 있는가.
export function atDoor(room, x, z, slack = 1.2) {
  return doorsOf(room).some(d =>
    x >= d.x0 - slack && x <= d.x1 + slack && Math.abs(z - d.z) <= slack)
}

export function roomAt(def, x, z) {
  for (const r of def.rooms) {
    if (Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2) return r
  }
  return null
}

export function pickupNear(def, x, z, radius = 5) {
  for (const p of def.pickups ?? []) {
    if (Math.hypot(x - p.x, z - p.z) <= radius) return p
  }
  return null
}
