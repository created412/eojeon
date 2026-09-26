// 아버지의 자리 — 이 게임의 스무 해를 한 칸으로 줄이면 이것이다.
//
// 선생님(2026-09-26): 전면적 스토리 개편. 그 개편안(docs/story-revision-plan.md)의
// 등뼈가 **아버지와의 관계**다. 고종의 이십 년에서 가장 강한 이야기는 사건이 아니라
// 곁에 선 사람이 바뀌는 일이다:
//
//   곁에 선다   1863~1873  섭정. 임금은 앉아 있고 아버지가 정한다.
//   물러났다    1873~1882  계유상소 뒤. 어전에 아무도 곁에 서 있지 않다.
//   돌아왔다    1882       임오군란. 난이 나자 아버지가 궁에 들어온다.
//   물러났다    1882~      제물포 — 아버지는 청으로 끌려간다.
//   없다        1884       갑신정변. 아버지도 없고 청군이 궁에 있다.
//
// 이 파일은 그 한 칸을 **비트 자리에서 계산**한다. state 에 깃발을 심지 않는 까닭:
// 깃발은 저장을 타고 낡는다(이어하기가 옛 깃발을 들고 온다). 지금 서 있는 자리에서
// 매번 다시 세면 그런 일이 없다.
//
// DOM 도 three.js 도 모른다 — 화면(ui/hud.js)은 이 값을 받아 적기만 한다.

// 자리가 바뀌는 지점. 「이 비트를 **지난 뒤부터**」 그 자리가 된다.
// act 는 acts.js 의 id, beat 는 그 막의 비트 id 다.
export const FATHER_TURNS = [
  { act: 'chinjeong', beat: 'doors-open', standing: 'gone',
    line: '아버지 — 물러나셨다' },
  { act: 'imo', beat: 'imo-father-returns', standing: 'back',
    line: '아버지 — 돌아오셨다' },
  { act: 'imo', beat: 'imo-jemulpo', standing: 'taken',
    line: '아버지 — 청으로 끌려가셨다' },
]

export const FATHER_LINES = {
  beside: '아버지 — 곁에 서 계신다',
  gone: '아버지 — 물러나셨다',
  back: '아버지 — 돌아오셨다',
  taken: '아버지 — 청으로 끌려가셨다',
  absent: '아버지 — 궁에 계시지 않다',
}

/**
 * 지금 아버지는 어디에 있는가.
 *   acts      ACTS 배열
 *   actIndex  지금 막(0부터)
 *   beatIndex 지금 비트 자리
 * 돌려주는 것: 'beside' | 'gone' | 'back' | 'taken' | 'absent'
 */
export function fatherStanding(acts, actIndex, beatIndex) {
  let standing = 'beside'
  for (let a = 0; a <= actIndex && a < acts.length; a++) {
    const act = acts[a]
    for (const [i, beat] of (act.beats ?? []).entries()) {
      // 지금 막에서는 **지나온 비트만** 센다. 그 비트를 아직 안 봤으면 아직 안 바뀐다.
      if (a === actIndex && i >= beatIndex) break
      const turn = FATHER_TURNS.find(t => t.act === act.id && t.beat === beat.id)
      if (turn) standing = turn.standing
    }
  }
  // 5막에는 아버지가 아예 없다 — 청으로 끌려간 뒤 돌아오지 않았다.
  if (acts[actIndex]?.id === 'gapsin' && standing !== 'taken') return 'absent'
  return standing
}

export function fatherLine(acts, actIndex, beatIndex) {
  return FATHER_LINES[fatherStanding(acts, actIndex, beatIndex)] ?? FATHER_LINES.beside
}
