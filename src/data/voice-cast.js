// 인물마다 목소리 하나 — ElevenLabs(lee text2speech_v2 · variant elevenlabs) 기본 목소리 id.
//
// 선생님 요청(2026-09-13): 「각 인물에 맞는 음성을 일래븐랩스를 통해 만들어서 싱크를 정확히」.
// 기본 목소리는 영어권 이름이라, 같은 한국어 대사를 16개 목소리로 만들어 음성 인식(faster-whisper)으로
// 받아 적은 일치율과 기본 높이(F0)를 재서 골랐다 — 사람이 들어서 고른 것이 아니라 잰 것이다.
//   여성: 일치율 0.97~1.00 · 남성: 0.75~0.96(「전하께서」→「전학」 오인식이 섞여 비교용으로만 썼다)
export const VOICES = {
  Gideon:   '1ad38ba4-9cc4-4f2f-9fde-b0fefdf67ae5', // 남 · F0 72 · 가장 낮다
  Barrett:  'd603a8cd-3fe1-55e0-9245-617a2589131e', // 남 · 86 · 느리다
  Sterling: 'dc382508-c8bd-443c-8cb2-46e57b8d2e6f', // 남 · 91
  Desmond:  '563f728c-e249-5a85-97ab-8461e8c09da6', // 남 · 99 · 빠르다
  Orion:    'ed69c516-92d2-4b30-a967-617737a342e5', // 남 · 107
  Callum:   '858499d9-fef5-40e1-bc29-b4dc661dc283', // 남 · 119
  Marcus:   '6f98d3dd-324f-4845-8c28-c1d1647a06cd', // 남 · 126
  Cillian:  'd8ba9f14-8a24-44db-932b-99e16c45bd32', // 남 · 128
  Arthur:   '30fc8796-ceb6-4a66-b3a7-4a145ef7f346', // 남 · 152 · 가장 젊다
  Nora:     'd081b915-6623-4a44-bacf-80d0f1c90a03', // 여 · 162 · 느리다
  Vera:     '0c51919f-0756-5f8d-8169-026a339d8fd7', // 여 · 178
  Helena:   '3c2b83c0-2e0a-5ae8-998a-a5fe71b7eccd', // 여 · 205 · 일치율 1.00
  Maeve:    '64cf4f1a-61c8-5938-9aea-83d12b2e1d13', // 여 · 205
}

// npc id → 목소리 이름. 한 막에 함께 나오는 사람끼리는 겹치지 않게 나눴다.
export const CAST = {
  heungseon: 'Orion',      // 흥선대원군 — 중년 남성(2026-09-13 선생님: Gideon 은 「마피아 같다」 → middle_aged 표시의 Orion)
  kimjwageun: 'Barrett',   // 영의정 김좌근 — 노대신
  minchisang: 'Sterling',  // 도승지 민치상
  jodaebi: 'Nora',         // 대왕대비 조씨 — 노년
  wangbi: 'Helena',        // 왕비 민씨
  mother: 'Vera',          // 여흥부대부인 민씨
  gungin: 'Maeve',         // 궁인
  choeikhyeon: 'Desmond',  // 최익현 — 곧고 빠르다
  kimokgyun: 'Cillian',    // 김옥균 — 젊고 설득하는
  pabal: 'Arthur',         // 파발 — 숨찬 젊은이
  gungyo: 'Arthur',
  haein: 'Marcus',         // 운현궁 청지기
  jaemyeon: 'Callum',      // 이재면 — 열아홉 형
  hojo: 'Marcus',          // Orion 을 대원군에게 넘겼다 — 같은 알현에 같은 목소리가 둘 서지 않게
  seungji: 'Sterling',
  geomseo: 'Callum',
  seongong: 'Marcus',
  sujeong: 'Callum',
  gaehwa: 'Cillian',
  yeokgwan: 'Marcus',
  sugun: 'Marcus',
  sinheon: 'Barrett',
  susinsa: 'Callum',
  yeongnam: 'Desmond',
  hongjaehak: 'Sterling',
  gaehwapa: 'Arthur',
}

// 소리 내어 읽을 부분 — 「」 안의 말만. 지문(「」 밖의 글)은 읽지 않는다.
export function spokenText(line) {
  const parts = [...String(line).matchAll(/「([^」]+)」/g)].map(m => m[1].trim())
  return parts.join(' ')
}

// 한 줄의 열쇠. 같은 사람이 같은 줄을 말하면 같은 파일이다. FNV-1a 32비트.
export function voiceKey(npcId, line) {
  let h = 0x811c9dc5
  for (const ch of `${npcId}|${line}`) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(36)
}
