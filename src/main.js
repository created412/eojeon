import { createScene } from './render/scene.js'
import { cinematicDirective } from './render/cinematic.js'
import { createCinematicHud } from './ui/cinematic-hud.js'
import { installCinematicStyle } from './ui/cinematic-style.js'
import { stageEvent } from './systems/event-staging.js'
import { createInput, isTyping } from './input/input.js'
import { PALACES, pickupNear, roomLabel, roomAt, baseOf } from './data/palaces.js'
import { objectiveRoute } from './systems/route.js'
import { guideForBeat, actGuideView } from './data/guide.js'
import { createGuideStrip } from './ui/guide-strip.js'
import { npcsAt, npcNear, npcHandledCardIds, npcCardIds, npcById, portraitKeyOf } from './data/npcs.js'
import {
  roomOf, kingSpot, besideSpot, visitorSpot, doorSpot, walkAt, yawToward,
  besideIds, visitorsOf, castOf, rebukeOf, entersOf, departIds, propOf,
  escortOffsets, escortSpot, APPROACH_MS, DEPART_MS, REBUKE_MS, PROCESSION_MS, visitorSpotFor, audienceLeft,
} from './systems/audience.js'
import { createState, serialize, deserialize, SAVE_KEY } from './core/state.js'
import { spend, isDusk, costOf } from './core/clock.js'
import { stopAt, stopHint, markStopPaid, markStopDone, isStopDone, pendingStopId, stopById } from './systems/outing.js'
import { pickUp, markRead, plunder, isLost } from './systems/codex.js'
import { recordLoss, LOSS_LABEL, everRead, lossReason } from './systems/loss-log.js'
import { sourceById } from './data/sources.js'
import { ACTS } from './data/acts.js'
import { createFlow } from './core/flow.js'
import { remainingMs } from './core/countdown.js'
import { step, axisToward } from './systems/movement.js'
import { beatAt, beatsOf, isActOver, enterAct, applyBeat, advance, isBeatActive, applyGrant, visitorCardIds, yearAtBeat } from './systems/scenario.js'
import { kingLookAt, kingAttireAt } from './systems/king-age.js'
import { advancePrices, riceSeriesUpTo, riceLabel } from './systems/prices.js'
import { createMinimap } from './ui/minimap.js'
import { createDialog } from './ui/dialog.js'
import { createSpeak } from './ui/speak.js'
import { createVoicePlayer } from './systems/voice.js'
import { VOICE } from './data/voice-data.js'
import { BGM } from './data/bgm-data.js'
import { createBgm, bgmForBeat } from './systems/bgm.js'
import { recordPreservation } from './systems/preservation.js'
import { INQUIRIES, clozeBlanks } from './data/inquiries.js'
import { installPaperVars } from './ui/paper-css.js'
import { createCouncil } from './ui/council-ui.js'
import { createSullyeom } from './ui/veil-screen.js'
import { createActEnd } from './ui/act-end.js'
import { createNoteScreen } from './ui/note-screen.js'
import { createMoveScreen } from './ui/move-screen.js'
import { createDispatchMap } from './ui/dispatch-map.js'
import { createLossScreen } from './ui/loss-screen.js'
import { createSalvage } from './ui/salvage.js'
import { createOrders } from './ui/orders-ui.js'
import { createBrush } from './ui/brush.js'
import { createEscape } from './ui/escape-screen.js'
import { createEdict } from './ui/edict-screen.js'
import { createPause } from './ui/pause.js'
import { createTitle } from './ui/title.js'
import { createControlsHint, isCoarse } from './ui/controls-hint.js'
import { createHold } from './ui/hold-screen.js'
import { CHEOKHWABI_GLYPHS } from './systems/brush-trace.js'
import { banner } from './ui/banner.js'
import { copyText, openManualCopy, COPY_OK, COPY_FAILED } from './ui/copy.js'
import { startRush } from './systems/rush-scene.js'
import { rushDurationMs, fireSourcesAt, isTouchDevice } from './systems/fire-rush.js'
import { relocate } from './systems/relocate.js'
import { createAudio } from './systems/audio.js'
import { createWebAudioEngine } from './systems/web-audio-engine.js'
import { createRation } from './ui/ration.js'

// 이어 화면 하단에 붙는 양력 미확정 고지 — 네 건(1868·1873·1875·1877)의 음력 날짜는
// 『고종실록』에서 확인했지만 양력 일 단위 환산은 어떤 자료로도 특정하지 못했다(「확인불가」).
// 그래서 이 문구는 늘 같고, 양력 날짜를 스스로 계산해 적지 않는다.
const SOLAR_NOTE =
  '※ 음력 날짜는 『고종실록』에서 확인했습니다. 그것이 오늘 쓰는 달력으로 몇 월 며칠인지는 확실하지 않아 적지 않습니다.'

// 이어(移御)·환어(還御) 개념을 처음 만나는 두 화면에만 붙는 풀이 — 나머지 이어
// 화면은 조용히 지나간다(가독성 검수 C10·C17, "첫 등장에 한 번만"). move-1868 이
// 이 게임에서 첫 이어이고, move-1875 는 유일하게 스스로 정한 이동(환어)이다.
const MOVE_GLOSS = {
  'move-1868': '移 옮기다 · 御 임금 — 임금이 사는 궁을 옮기는 것을 「이어」라 한다. 이 게임은 임금이 집을 옮긴 기록으로 짜여 있다.',
  // 「스무 해 중 한 번뿐」이라 세던 자리다. 5막이 붙으면서 1884 환어가 self:'disputed'
  // 로 서고 마지막 비트가 「몇 번이었는지는 이 게임이 말하지 않는다」고 하는데, 3막에서
  // 미리 세어 버리면 두 화면이 어긋난다(판정 R98 과 같은 뿌리다). 이 이동 하나만 말한다.
  'move-1875': '還 돌아가다 · 御 임금 — 임금이 원래 궁으로 돌아가는 것을 「환어」라 한다. 이 이동은 임금이 스스로 정했다.',
}

// 이어 화면 아래에 붙는 근거 줄을 만든다. 순수 함수로 빼 두는 까닭은 하나다 —
// 여기서 실수하면 화면에서만 티가 나고 시험은 초록불이기 때문이다.
//
// ⚠ 실록 줄은 언제나 맨 위에 온다. 예전에는 `beat.note ?? …` 였고, 그래서 note 를 단
//   비트(5막의 다섯 이어)는 sillok 을 데이터에 들고도 화면에 한 글자도 안 띄웠다 —
//   「모든 이어가 실록에서 확인한 음력 날짜와 근거를 달고 있다」(tests/data/acts.test.js)
//   는 초록불인데 학생은 그 근거를 못 보는, 이 프로젝트가 반복해서 당한 바로 그 모양이다.
// ⚠ 양력이 확정된 이어(1884)에는 「양력을 못 적는다」는 고지를 붙이지 않는다 —
//   붙이면 화면이 스스로 거짓말을 한다.
// note 가 없는 이어(1868·1873·1875·1877)의 결과는 예전과 한 글자도 다르지 않다.
export function moveNote(beat, gloss) {
  const head = beat.sillok ? beat.sillok + '\n' : ''
  const body = beat.note ??
    `${beat.solarDate ? '' : SOLAR_NOTE}${gloss ? '\n\n' + gloss : ''}`
  return `${head}${body}`
}

// 프레임이 늦어도 왕만 느려지지 않게 한다 — 벽시계로 진행하는 추격과 어긋나면
// 촉박이 피하려던 바로 그 불공정이 된다 (1단계 최종 리뷰 Important)
const FIXED_MS = 1000 / 60
const MAX_STEPS = 8             // 긴 정지 뒤 따라잡기를 제한한다
const BLOCKED_BANNER_MS = 2500  // 벽을 밀고 있어도 배너는 이 간격으로만 뜬다
// 방 경계에서 나는 문소리의 배율. 이 게임의 「방」은 문이 달린 방만이 아니라 마당의
// 끝이기도 해서, 걷다 보면 진짜 문(궁을 갈아 끼는 이어)보다 훨씬 자주 지난다.
// 그래서 조금 죽여 둔다 — 궁이 통째로 바뀔 때는 표대로 온전히 낸다.
// 귀로 다시 맞출 자리다(소리를 듣는 것은 사람이 한다).
const ROOM_DOOR_GAIN = 0.75

// localStorage 는 사설 창·잠긴 학교 PC 등에서 접근 자체가 던질 수 있다.
// 저장이 막혀 있어도 게임은 아무 일 없다는 듯 계속 돌아가야 한다
export function loadGame() {
  return deserialize(readSaveText() ?? '') ?? null
}

// 저장된 글자를 그대로 읽는다. loadGame() 과 갈라 둔 까닭은 하나다 — deserialize()
// 는 「저장이 없다」와 「판이 달라 못 읽는다」를 똑같이 null 로 돌려주는데, 학생에게
// 그 둘은 전혀 다른 일이다(판정 R100).
export function readSaveText() {
  try {
    return localStorage.getItem(SAVE_KEY)
  } catch {
    return null
  }
}

// 판이 올라가면(state.js 의 VERSION) 지난 차시 저장은 못 읽는다. 그때 「이어서 하기」
// 단추가 그냥 사라지면, 학생은 자기가 뭔가 잘못 눌러 기록이 지워진 줄 안다 —
// 2차시로 운영하는 수업에서 그것은 그 시간의 첫 3분을 통째로 잡아먹는 오해다.
// 그래서 한 줄로 알린다. 무슨 일이 있었는지 말하고, 무엇을 하면 되는지 말한다.
export const STALE_SAVE_NOTICE =
  '지난번에 저장한 기록이 있지만 게임이 새 판으로 바뀌어 이어 할 수 없습니다. 「처음부터」를 누르세요.'

// 순수 판정 — 저장된 글자를 받아 「있기는 한데 못 읽는가」만 답한다.
export function staleSaveNotice(raw) {
  if (typeof raw !== 'string' || raw === '') return ''
  return deserialize(raw) === null ? STALE_SAVE_NOTICE : ''
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state))
    return true
  } catch {
    return false   // 저장 불가 — 조용히 넘어간다. 일시정지 화면이 이 값을 보고 안내 문구를 고른다
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // 무시
  }
}

// 신하가 대신 건네는 카드는 바닥에서 줍는 지름길을 두지 않는다 — 「문서는 그것을
// 쓰거나 나른 사람에게서 받는다」는 규칙이 마커·미니맵 점(npcs.js 의
// npcHandledCardIds 가 이미 그 쪽은 가린다)만이 아니라 pressE() 의 판정 자체에도
// 걸려 있어야 한다. 이게 없으면 신하가 서 있는 자리와 palaces.js 의 pickups 좌표가
// 어긋나는 순간(신헌처럼 뭉치를 한 자리에서 건네 좌표가 갈라진 경우) 신하를 만나지
// 않고도 그 카드를 주울 수 있다 — 실제로 걸렸던 문제(사정전 (-11,-12), ganghwa1).
const NPC_HANDLED = npcHandledCardIds()

// SOURCES 의 act 가 그 카드를 만날 수 있는 가장 이른 막이다(1-인덱스). act 가 지금
// 막보다 나중이면 아직 존재하지 않는 문서다 — 사료 자체를 시대보다 먼저 주는 것.
// 이 검사 하나로 바닥(pressE)·신하(npcs.js 의 npcsAt) 양쪽을 같은 근거로 막는다 —
// 「1876년 문서를 1868~71년 경복궁에서 읽는다」류의 시대착오를 주석이 아니라 이
// 함수가 막는다.
function isFutureCard(cardId, act) {
  const cardAct = sourceById(cardId)?.act
  return cardAct !== undefined && cardAct > act
}

// E 키 한 번의 판정 — boot() 의 onPressE() 가 실제로 거치는 바로 그 로직이다.
// DOM 도, flow 도, ctx 도 모른다: 필요한 값을 인자로 받아 무엇을 할지만 돌려준다.
// 그래서 Node 에서 requestAnimationFrame 없이도 '문서 줍기' 배선 전체를
// (다가서기 → spend → pickUp → markRead) 그대로 구동해 검증할 수 있다.
//
// exit 판정이 pickup 판정보다 먼저다 — 나가는 방과 줍는 자리가 겹쳐도
// 한 번의 E 는 회의를 열거나 문서를 줍거나 둘 중 하나만 한다.
// isLost() 가드는 taken 과 별도다 — taken 은 이 세션이 기억하는 「이미 주웠다」이고,
// isLost() 는 state 가 기억하는 「불타거나 약탈당해 영영 없어졌다」다. 이어하기 직후의
// flow.taken 은 state.sources.held 로만 다시 채워지므로(잃은 카드는 held 에 없다) 두 판정이
// 어긋날 수 있다 — 그 자리를 이 두 번째 조건이 막는다. 이게 없으면 불탄 카드의 3D 마커가
// 이어하기 뒤에 되살아나고, E 를 눌러도 줍히지 않으면서 해만 깎일 뻔했다(pickUp() 은 이미
// isLost() 를 보고 no-op 하지만 spend() 는 그보다 먼저 불린다).
// npc — 가까이 서 있는 신하(있으면). 문서를 줍는 자리와 겹쳐도 신하가 먼저다: 이제
// 문서는 그 신하와 말을 나눈 뒤에만 받는다(main.js 의 applyPickupPacket() 이 좌표가
// 아니라 cardId 로 직접 건넨다 — 바닥 판정을 다시 타지 않는다). act — 지금 막
// (1-인덱스). 기본값 Infinity 는 「막을 안 가린다」는 뜻이다 — 기존 시험
// (tests/pickup-integration.test.js)은 이 인자를 넘기지 않으므로 그대로 동작한다.
// stops — 이 탐색 비트가 두는 나들이 지점 목록(systems/outing.js). 나가는 방 판정
// 다음, 신하와의 대화보다 먼저 본다: 나들이는 방 단위 판정이고 값이 크며 되돌릴 수
// 없다(하루 낮의 3칸을 그 자리에서 치른다) — 신하 근접 판정(npc)과 자리가 겹칠 일은
// 없지만, 겹치면 나가는 쪽이 이겨야 한다. 기본값 []이므로 stops 를 안 넘기는 기존
// 호출(문서 줍기 시험들)은 이 분기를 타지 않는다.
export function pressE({ dialogOpen, exit, stops = [], room, palaceDef, playerX, playerZ, taken, state, npc = null, act = Infinity }) {
  if (dialogOpen) return { type: 'close-dialog' }
  if (exit && room === exit.room) return { type: 'exit-explore' }

  const stop = stopAt(stops, room, state)
  if (stop) {
    const r = spend(state)
    if (!r.ok) return { type: 'no-time' }
    // 값을 치른 것과 화면을 다 본 것은 다른 순간이다(outing.js) — 여기서는 치른 것만
    // 표시한다. 「아직 화면을 못 봤다」가 함께 남아, 여기서 새로고침해도 학생이
    // 치른 값만 잃지 않는다: 이어하기가 그 화면을 다시 열어 준다(resumePendingStop).
    return { type: 'stop', stopId: stop.id, beat: stop.beat, state: markStopPaid(r.state, stop.id) }
  }

  if (npc) return { type: 'talk', npc }

  const near = pickupNear(palaceDef, playerX, playerZ)
  if (!near) return { type: 'none' }
  if (NPC_HANDLED.has(near.cardId)) return { type: 'none' }
  if (isFutureCard(near.cardId, act)) return { type: 'none' }
  // 「아무것도 없는 자리에서 E」와 갈라 둔다 — 같은 값으로 뭉뚱그리면 빈 마당에서
  // E 를 누를 때마다 「안 된다」 소리가 울린다. 여기는 문서가 있었으나 이미 손에
  // 든(또는 불타 없어진) 자리다 — 그 실패만 귀에 닿는다.
  if (taken.has(near.cardId) || isLost(state, near.cardId)) return { type: 'already-taken' }

  const r = spend(state)
  if (!r.ok) return { type: 'no-time' }

  return { type: 'pickup', cardId: near.cardId, state: markRead(pickUp(r.state, near.cardId), near.cardId) }
}

// pressE() 와 같은 이유로 뺀 순수 판정 — 신헌처럼 문서 뭉치(cardIds, 복수)를 한
// 번에 건네는 신하 전용이다. 문서마다 palaces.js 안 좌표가 달라 pressE() 가 쓰는
// 「가까운 자리에서 줍기」(pickupNear, 플레이어의 실제 위치 기준)로는 하나만
// 집힌다 — 대신 지금 궁의 pickups 목록에서 카드id로 직접 찾아, 그 자리로 가는 값을
// 한 번에 치른다. 값은 자리(placeId) 단위다: 뭉치의 카드가 여러 자리에 흩어져
// 있으면 자리마다 한 번씩 세고, 같은 자리는 두 번 세지 않는다(costOfPlaces, 판정
// R102 — 카드마다 세던 옛 셈법은 신헌의 넉 장에 8칸을 불러 하루 6칸으로는 어떤
// 학생도 받을 수 없게 만들었다). 부분만 살 수는 없다: 하루가 모자라면 뭉치를
// 통째로 못 받는다(reason: 'no-time'). DOM 도 flow 도 모른다 — Node 에서 그대로 구동해 검증한다.
// act 가드는 지금 이 함수의 유일한 호출자(applyPickupPacket())가 npcsAt() 을 거친
// 신하만 넘기므로 오늘은 죽은 코드지만, isFutureCard() 가 이미 pressE() 옆에 있어
// 다시 짜는 게 아니라 그대로 불러 쓰는 것뿐이다 — 나중에 이 함수가 다른 경로로도
// 불리게 되면 그 경로가 npcsAt() 을 다시 거치는지 믿을 필요가 없어진다.
export function pickUpPacket({ palaceDef, cardIds, taken, state, act = Infinity }) {
  const pending = cardIds.filter(id => !taken.has(id) && !isLost(state, id) && !isFutureCard(id, act))
  if (pending.length === 0) return { ok: false, reason: 'none-pending' }

  // 이 궁에 그 문서의 자리가 하나라도 없으면 여기서 건넬 것이 아니다. filter(Boolean)
  // 로 조용히 지우면 값이 0칸이 되어 공짜로 손에 들어간다 — 불탄 경복궁이 바로 그
  // 자리다(burntVariant 가 사정전의 지점을 통째로 지우는데 신헌은 그 궁에도 선다).
  const entries = pending.map(id => (palaceDef.pickups ?? []).find(p => p.cardId === id))
  if (entries.some(p => !p)) return { ok: false, reason: 'not-here' }

  // **한 번 듣는 것이 하나다.** 넉 장을 한 사람에게서 한 번에 받아도 하나다
  // (core/clock.js 머리말 — 옛 판정 R102 가 costOfPlaces 로 애써 흉내 내던 것이
  // 이제 저절로 참이다).
  const paid = spend(state)
  if (!paid.ok) return { ok: false, reason: 'no-time' }

  let s = paid.state
  for (const id of pending) s = markRead(pickUp(s, id), id)
  return { ok: true, state: s, cardIds: pending }
}

// 이 결정이 어느 비트에서 나왔는지 찾아 질문·고른 문구를 되짚는다. 어전회의(council)와
// 훈령(orders) 둘 다 state.decisions 에 { actIndex, choiceId, reason } 을 남기지만
// 그릇이 다르다 — orders 의 choiceId 는 언제나 'orders:' 로 시작하고, 그 값 자체가
// 이미 고른 조항 id 를 '+' 로 이어붙인 것이다(아래 boot() 의 playOrders 참고).
// DOM 도 flow 도 모른다 — buildRecordText() 와 함께 Node 에서 그대로 구동해 검증한다.
export function describeDecision(act, decision) {
  if (decision.choiceId.startsWith('orders:')) {
    const beat = beatsOf(act).find(b => b.kind === 'orders')
    const picked = decision.choiceId.slice('orders:'.length)
    const text = picked === 'none'
      ? '(아무 훈령도 적지 않음)'
      : (beat?.clauses ?? []).filter(c => picked.split('+').includes(c.id)).map(c => c.text).join(' / ')
    return { question: beat?.question ?? '', text: text || '(아무 훈령도 적지 않음)' }
  }
  // 얼어붙은 어전회의(beat.frozen)는 고를 단추가 하나도 없다 — council-ui.js 가
  // onDecide('frozen', reason) 을 부른다. 'frozen' 은 어느 선택지의 id 도 아니므로,
  // 아래 fallback 이 그대로 돌면 「내 기록 복사」— 학생이 활동지·패들렛에 붙여 넣는
  // 그 산출물 — 에 「선택 — frozen」 이라고 영어 낱말이 찍힌다. 화면이 쓰는 그
  // 한국어 문구(frozenChoiceLabel)를 기록도 함께 쓰게 해서 두 곳이 어긋나지 않게 한다.
  // (한 막에 얼어붙은 회의가 둘이면 이 find 가 모호해진다 — 설계서 §7 상 4막에 하나뿐이고,
  //  둘째가 생기면 decisions 에 beatId 를 실어야 한다. 그때는 아래 시험이 먼저 운다.)
  if (decision.choiceId === 'frozen') {
    const frozen = beatsOf(act).find(b => b.kind === 'council' && b.frozen === true)
    return {
      question: frozen?.council?.question ?? '',
      text: frozen?.frozenChoiceLabel ?? '아무것도 고르지 못했다',
    }
  }
  const beat = beatsOf(act).find(b => b.kind === 'council' && b.council?.choices.some(c => c.id === decision.choiceId))
  const choice = beat?.council?.choices.find(c => c.id === decision.choiceId)
  return { question: beat?.council?.question ?? '', text: choice?.text ?? decision.choiceId }
}

// 「내 기록 복사」— 세특의 밑감이 되는 그 산출물이다. 지금까지 치른 막 전부의
// 결정·이유를 한 번에 담는다 — 3막 끝에서 눌러도 1·2·3막이 모두 나와야 한다.
// 읽은 문서는 everRead() 로 센다(2단계 Important 1) — state.sources.read 만 쓰면
// lose()(codex.js, 잠금)가 잃은 순간 그 카드를 read 에서도 지워, 아홉 장을 읽고
// 셋만 들고 나온 학생의 기록이 "세 장 읽음"으로 줄어든다. 잃은 것은 지우지 않고
// 왜 잃었는지(lostBy → 불탐/약탈됨 · 프랑스)를 그대로 적는다 — 잃은 것도 이야기의
// 일부다.
export function buildRecordText(state, acts) {
  const readIds = everRead(state)
  const readTitles = readIds.map(id => {
    const title = sourceById(id)?.title ?? id
    const reason = lossReason(state, id)
    return reason ? `${title} (${LOSS_LABEL[reason]})` : title
  })
  const blocks = state.decisions.map(d => {
    const act = acts[d.actIndex]
    const { question, text } = describeDecision(act, d)
    return [
      `[${d.actIndex + 1}막 「${act.title}」] ${question}`,
      `선택 — ${text}`,
      `남긴 말 — ${d.reason || '(없음)'}`,
    ].join('\n')
  })
  return [
    ...(blocks.length ? blocks : ['(아직 정한 것이 없다)']),
    ...Object.entries(state.inquiries ?? {}).flatMap(([id, record]) => [
      '', `[사료 탐구] ${sourceById(id)?.title ?? id}`,
      // 빈칸 채우기(조선책략)는 표시한 근거 대신 채운 칸을 적는다.
      INQUIRIES[id]?.kind === 'cloze'
        ? `채운 빈칸 — ${clozeBlanks(INQUIRIES[id]).map((_, i) => record.blanks?.[i] || '(빈칸)').join(' / ')}`
        : `표시한 근거 — ${(record.selected ?? []).join(' / ') || '(없음)'}`,
      `나의 해석 — ${record.text || '(작성 중)'}`,
      `해설과 비교 — ${record.compared ? '비교함' : '아직 비교하지 않음'}`,
      ...(record.revision ? [`보완한 생각 — ${record.revision}`] : []),
    ]),
    ...Object.values(state.preservation ?? {}).flatMap(record => [
      '', '[경복궁 대화재] 무엇을 먼저 꺼내라 했는가',
      `꺼내라 한 것 — ${record.selected.map(id => ACTS.flatMap(a => a.beats).flatMap(b => b.treasures ?? []).find(t => t.id === id)?.name ?? id).join(' / ')}`,
      `그 이유 — ${record.reason}`,
    ]),
    '',
    `읽은 문서 ${readIds.length}장 — ${readTitles.length ? readTitles.join(', ') : '(없음)'}`,
  ].join('\n')
}

// 붓 화면에 넘길 view 를 짓는다 — 비트 하나를 받아 화면이 읽을 객체 하나를
// 돌려주는 순수 함수다(판정 R97).
//
// 예전에는 playBrush() 가 여기서 **필드를 손으로 골라 담았다.** 그러다 Task 13 이
// 더한 noteWhileWriting·originWhileWriting 두 칸을 그 목록에 안 넣었고, 그러자
// ui/brush.js 의 `?? view.partial` · `?? view.origin` 이 대신 들어와 **학생이 첫
// 획을 긋기도 전에** 『갑신일록』·김옥균·망명·논쟁이 화면에 떴다. 이 장면의 교육은
// 순서 하나에 걸려 있다 — 네 글자를 쓰고 **그 다음에야** 그 기록이 하나뿐이고
// 학계가 의심한다는 것을 알아야 한다.
//
// 데이터도 옳고 brush.js 도 옳았다. 틀린 것은 **조립하는 자리 하나**였고, 그 자리를
// 아무 시험도 지나지 않았다(그때 시험은 비트를 화면 함수에 직접 넘겨 봤다).
// 그래서 두 가지를 한꺼번에 한다.
//   ① 골라 담지 않고 비트를 통째로 편다 — 빠뜨릴 칸 자체가 없어진다.
//   ② 순수 함수로 빼 두어 시험이 **게임이 실제로 지나는 그 view** 를 받아 훑는다.
// glyphs 만 기본값을 준다(F1 척화비는 비트에 글자를 안 싣는다).
export function brushView(beat) {
  return { ...beat, glyphs: beat.glyphs ?? CHEOKHWABI_GLYPHS }
}

// 어느 화면에 어떤 바닥 소리를 깔 것인가 — 비트 하나를 받아 이름 하나를 돌려주는
// 순수 함수다. 배선이 이 한 자리만 보게 해서 두 가지를 동시에 지킨다:
//   ① setAmbient 는 화면 단위로만 불린다(매 프레임 부르면 0.6초 페이드가 겹쳐
//      두 겹으로 들린다). playBeatScreen() 이 비트 하나에 한 번만 부른다.
//   ② 이름 오타가 조용한 무음이 되지 않는다 — ACTS 의 모든 비트를 먹여 보는
//      시험이 tests/systems/audio-wiring.test.js 에 있다.
// 촉박(rush)의 도입 글 화면도 같은 바닥을 깔고 시작한다 — 그 글은 이미 불길·난군의
// 장면이고, 글을 읽는 동안 조용하다가 갑자기 소리가 붙으면 오히려 이음매가 보인다.
// ── 때 (時) ────────────────────────────────────────────────────────────────
// 스무 해가 전부 같은 갈색 대낮이었다. 1863년 즉위, 자경전이 타는 밤, 임오군란의
// 새벽, 갑신정변의 밤이 화면에서 구별되지 않았다 — 글은 그렇다고 말하는데 빛이
// 아니라고 말하는 상태였다. 색과 빛은 학생이 글보다 먼저 몸으로 받는다.
//
// 장면이 때를 정한다(불·탈출), 그다음 막이 정한다. ambientForBeat 와 같은 모양이다.
const ACT_MOOD = ['dawnwinter', 'day', 'day', 'daybreak', 'night']

export function moodForBeat(beat, actIndex = 0) {
  if (beat?.kind === 'rush') return beat.fire === true ? 'fire' : 'daybreak'
  if (beat?.kind === 'escape') return 'night'
  return ACT_MOOD[actIndex] ?? 'day'
}

export function ambientForBeat(beat) {
  if (!beat) return null
  if (beat.kind === 'explore') return 'hall'
  if (beat.kind === 'rush') return beat.fire === true ? 'fire' : 'siege'
  if (beat.kind === 'escape') return 'night'
  // 조작권 D 장면(kind:'hold')은 무음이면 안 된다. 이 장면은 「안 움직인다 · 아무것도
  // 안 변한다」가 내용인데 거기에 무음까지 겹치면 학생이 받는 신호가 정확히
  // 「얼어붙었다 · 고장났다」가 된다 — 화면은 글로 「고장이 아니다」라고 말하는데
  // 소리가 정반대를 말하는 것이다(Task 12 리뷰 Important 1).
  // 궁 안 소리를 그대로 둔다: 궁은 여전히 살아 있고 임금만 못 움직인다는 것이
  // 이 장면이므로, 바닥 소리가 계속 도는 편이 내용과 맞는다.
  if (beat.kind === 'hold') return 'hall'
  // 알현도 궁 안이다 — 임금이 못 움직이는 것은 'hold' 와 같지만, 궁은 살아 있다.
  if (beat.kind === 'audience') return 'hall'
  if (beat.kind === 'procession') return 'hall'   // 궁 안을 걸어 나가는 장면이다
  return null
}

// 어전회의가 끝나며 낼 소리 — 고른 것 하나를 받아 이름 하나를 돌려주는 순수 함수다.
//
// 편경(decide)은 이 게임에서 가장 중요한 소리다: 「임금이 무엇을 정했다」는 표시다.
// 그런데 4막의 얼어붙은 회의(대원군이 다시 나랏일을 맡는 자리, beat.frozen)는
// **아무것도 정하지 못하는 것이 그 장면의 내용**이다. 거기서 같은 소리가 나면 소리가
// 화면과 정반대를 말한다 — 학생은 글보다 소리를 먼저 몸으로 받는다(판정 R95).
// 그래서 그 자리에는 「안 된다」의 소리(deny)를 낸다.
//
// 'frozen' 은 어느 선택지의 id 도 아니다 — council-ui.js 가 고를 단추가 하나도 없을 때
// onDecide('frozen', reason) 으로 부르는 값이고, describeDecision() 도 같은 값을 본다.
export function councilSound(choiceId) {
  return choiceId === 'frozen' ? 'deny' : 'decide'
}

// 궁을 갈아 끼울 때 문소리를 낼 것인가 — 값 셋으로만 정한다(소리는 부르는 쪽이 낸다).
// 「지금 궁 · 문소리를 낸 마지막 궁 · 미룰 것인가」를 받아 「낼 것인가 · 새 마지막 궁」을 낸다.
//
//   · 첫 궁(lastPalace === null)에는 내지 않는다. 예전에는 1막의 첫 글 화면이 뜨기도
//     전에 쿵 하는 문소리가 한 번 났다 — 지나갈 문이 아직 없는데 났다(소리 리뷰 Minor 5).
//   · quiet 이면 미룬다. 이어(移御)가 쓴다: runBeats 는 「어디서 → 어디로」 화면을
//     띄우기 **전에** 씬을 새 궁으로 갈아 끼우는데, 거기서 문소리까지 내면 아직 앞
//     화면이 떠 있는 동안 소리가 난다 — 소리가 화면을 앞지른다(소리 리뷰 Minor 6).
//     lastPalace 를 갱신하지 않고 넘기므로, 화면이 닫힌 뒤 playMove() 가 부르는 두 번째
//     bindPalaceAndSpawn() 이 그때 한 번 낸다. 두 번 나지 않는다.
export function palaceDoor(palace, lastPalace, quiet = false) {
  if (palace === lastPalace || quiet) return { play: false, lastPalace }
  return { play: lastPalace !== null, lastPalace: palace }
}

// 태블릿의 화면 단추(E·Q)를 짚었을 때 무엇을 할 것인가 — 값 하나로만 돌려주는 순수 판정.
//
// 태블릿에는 E·Q·멈춤 세 단추가 우측 하단에 **늘 떠 있다**(touchWrap 을 숨기는 자리가
// 코드 전체에 없다). 그런데 조작권 D 장면에서는 셋 다 죽어 있었고, pointerdown 의
// stopPropagation() 때문에 캔버스의 input.tap() 에도 안 잡혀 「눌렀는데 아무 일도
// 없다」가 됐다. 「내 태블릿이 고장났나」 싶은 학생이 가장 먼저 하는 행동이 눈에 보이는
// 단추를 짚는 것인데, 판 위를 짚으면 반응하고 단추를 짚으면 아무 일도 없었다 —
// 가장 「고장났다」로 읽히는 조합이다(Task 12 리뷰 Important 2).
//
// 그래서 그 장면에서는 이 단추도 판을 짚은 것과 같이 「눌러 봤다」로 센다.
// 단추를 숨기는 길도 있었으나 고르지 않았다: 장면 도중에 단추가 사라지는 것 자체가
// 고장으로 읽히고, 태블릿 학생이 소리를 끌 유일한 길(멈춤)까지 함께 사라진다.
export function touchButtonAction({ hold = false, phase, pauseOpen = false }) {
  if (pauseOpen) return 'none'   // 멈춤 판이 덮고 있다 — 키보드 쪽(handleKey)과 같은 규칙
  if (hold) return 'press'       // 조작권 D 장면 — 짚은 것을 「눌러 봤다」로 센다
  // 알현에서도 산다 — 그 장면에서 학생이 화면을 넘기는 길이 E 하나뿐이다.
  return (phase === 'day' || phase === 'audience') ? 'act' : 'none'
}

// 멈춤 화면을 열 수 있는가. 탐색 중에는 언제나 열린다. 그 밖의 국면에서는 열지 않는데
// (촉박 중에 열면 돌아가는 초시계가 가려진다), 조작권 D 장면만은 예외다 — 그 구간이
// 길고, 태블릿 학생이 수업 도중에 소리를 끌 길이 여기밖에 없다(판정 R91).
// 시계는 이 판 뒤에서도 계속 돈다(holdSession 블록이 국면 관문 밖이다) — 갇히지 않는다.
export function canPause(phase, hold = false) {
  // 알현도 연다. 1863년 막에는 'day' 국면이 아예 없어졌으므로(탐색 → 알현),
  // 여기를 'day' 로만 두면 그 막 내내 소리를 끌 길이 사라진다(판정 R91 과 같은 이유).
  return phase === 'day' || phase === 'audience' || hold === true
}

// 조작권 D 장면(설계서 §7 5막 비트 2·3)과 친필 F2(§5.F2)를 가리키던 두 상수가
// 한때 여기 있었다. 5막이 ACTS 에 없던 시절 손 시험이
// 유일한 실행 경로여서 필요했던 것인데, Task 14 가 5막을 지은 뒤로는 runBeats()
// 가 그 비트들을 제 차례에 그냥 지나간다. 통로를 걷어 내자 이 두 이름을 쓰는
// 곳도 함께 사라졌다 — 그래서 지웠다. 두 비트를 시험에서 볼 일이 있으면
// src/data/acts.js 의 5막 배열에서 id 로 꺼낸다(베껴 두면 두 벌이 되어 갈린다).

export function boot(root) {
  installCinematicStyle(root)
  const canvas = document.createElement('canvas')
  // 손가락 끌기를 브라우저가 화면 이동·확대로 가로채지 않게 한다 — 끌기는 시점 돌리기, 탭은 걷기다.
  canvas.style.touchAction = 'none'
  canvas.id = 'scene'
  root.appendChild(canvas)

  // 소리 엔진은 여기서 한 번만 만든다. AudioContext 는 아직 생기지 않는다 —
  // 타이틀의 단추가 unlock() 을 부르는 그 순간에 처음 생긴다(브라우저는 사용자
  // 조작 밖에서 소리를 못 내게 막는다). 씬보다 먼저 만드는 이유는 하나다:
  // 발소리를 내는 곳이 씬의 updateKingMotion() 이라 씬이 이것을 받아 가야 한다.
  const audio = createAudio({ engine: createWebAudioEngine() })

  // running 은 함수로 넘긴다 — input 은 아직 만들어지지 않았고, 이 함수가 실제로
  // 불리는 것은 첫 render() 때다(그때는 이미 있다). 씬은 「달리는가」를 스스로
  // 짐작하지 않고 조작을 받는 이 자리에 묻는다.
  const ctx = createScene(canvas, { audio, running: () => input.running() })
  const input = createInput(canvas)
  const hud = createCinematicHud(root, { onCodex: () => {
    if (flow.phase === 'day' && !pause.isOpen()) pressQ()
  }, onRotate: direction => ctx.rotateView(direction), onResetView: () => ctx.resetView(),
  onObjective: () => walkToObjective(), onEscape: () => runToGoal() })
  // 문서·사초함이 닫히는 소리. 「어떻게 닫히든 정확히 한 번」을 dialog 가 이미
  // 보증한다 — 화면 안 「닫기」 단추로 닫아도 여기를 지난다. 태블릿 학생에게는
  // 그 단추가 유일한 길이다(.veil 은 z-index 40, 태블릿 E·Q 단추는 22 라 문서가
  // 떠 있는 동안 그 단추는 판 아래에 깔려 눌리지 않는다). 예전에는 이 소리가
  // E·Q 쪽에만 붙어 있어 태블릿에서는 여는 소리만 나고 닫는 소리는 영영 안 났다.
  const dialog = createDialog(root, {
    onClose: () => audio.play('close'),
    getInquiry: id => flow.state.inquiries?.[id] ?? {},
    onInquirySave: (id, record) => {
      const inquiries={...(flow.state.inquiries??{}),[id]:record}
      flow.state={...flow.state,inquiries}
      // Preserve the last safe scenario checkpoint while saving the student's draft.
      const checkpoint=loadGame()
      return checkpoint ? saveGame({...checkpoint,inquiries}) : false
    },
  })
  const council = createCouncil(root)
  const sullyeom = createSullyeom(root)
  const actEnd = createActEnd(root)
  const pause = createPause(root)
  // 배경 음악(systems/bgm.js) — 대사·독백이 나오는 동안에는 줄인다.
  const bgm = createBgm({ tracks: BGM, isMuted: () => audio.isMuted(), isReady: () => audio.isReady() })
  bgm.set('main')
  const voice = createVoicePlayer({ clips: VOICE, isMuted: () => audio.isMuted() || !audio.isReady(),
    onStart: () => bgm.duck(true), onEnd: () => bgm.duck(false) })
  const noteScreen = createNoteScreen(root, { voice })
  const moveScreen = createMoveScreen(root)
  const dispatchMap = createDispatchMap(root)
  const lossScreen = createLossScreen(root)
  const salvage = createSalvage(root)
  const orders = createOrders(root)
  const brush = createBrush(root)
  const escape = createEscape(root)
  const edict = createEdict(root)
  const ration = createRation(root)
  installPaperVars()          // 한지·장계를 CSS 변수로 걸어 둔다(ui/paper-css.js)
  // 대사 음성 — 게임의 음소거를 그대로 따른다. 소리는 사용자 조작 뒤에만 틀 수 있으므로(자동 재생 규칙)
  // 첫 대사가 뜰 때는 이미 「시작」 단추를 누른 뒤다.
  const speak = createSpeak(root, { voice })
  const guide = createGuideStrip(root)
  const title = createTitle(root)
  const controlsHint = createControlsHint(root)
  const hold = createHold(root)

  // 인정전에서는 어전회의를, 문서 곁에서는 문서 살피기를 알리는 한 줄.
  // 두 조건이 겹치면 어전회의 쪽을 우선한다.
  const hint = document.createElement('div')
  hint.className = 'interaction-hint'
  hint.style.cssText =
    'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:25;' +
    'padding:6px 14px;background:#0f1113cc;border:1px solid #3a4248;border-radius:3px;' +
    'color:#e0a23a;font-size:13px;letter-spacing:2px;pointer-events:none'
  hint.hidden = true
  root.appendChild(hint)

  const onKey = (e) => handleKey(e)
  let touchWrap = null
  let helpBtn = null    // 「?」 — 조작 안내를 다시 여는 단추

  const act0 = ACTS[0]
  const flow = createFlow({
    acts: ACTS,
    state: { ...createState(), palace: act0.palace, control: act0.control },
    resources: {
      setPalace: (def) => ctx.setPalace(def),
      perPalace: {
        map: (def) => createMinimap(root, def),
      },
      lifetime: [
        input, hud, dialog,
        { dispose: () => removeEventListener('keydown', onKey) },
        { dispose: () => touchWrap?.remove() },
        { dispose: () => helpBtn?.remove() },
        { dispose: () => { title.close(); controlsHint.close() } },
        { dispose: () => { hint.remove(); canvas.remove() } },
      ],
    },
  })

  let session = null
  let activeBeat = null
  let running = true
  // 지금 떠 있는 조작권 D 장면(Task 12). 진행 중이 아니면 null.
  // 이 값이 null 이 아닌 동안에는 프레임 루프가 국면과 무관하게 tick() 을 돌린다 —
  // 그것이 「아무도 갇히지 않는다」를 좌표의 우연이 아니라 구조로 만드는 자리다.
  let holdSession = null
  let wasPressing = false   // 지난 프레임에 걷기 조작이 눌려 있었는가(누른 '순간'만 세려고)
  let tapTarget = null   // 태블릿 탭 이동 목표 — { x, z } | null
  // 여정 판을 눌렀을 때 차례로 걸어갈 지점들(문 앞 → 전각 안). tapTarget 에 닿으면 다음 지점을 꺼낸다.
  let tapRoute = []
  let autoWalk = false   // 여정 판으로 걷는 중 — 기둥을 스쳐 돌아가며 막힘 안내가 뜨지 않게 한다
  // 문소리를 낼 때를 가리는 값 — 지난 프레임의 방. null 은 「다음에 잡히는 방을
  // 조용히 받아 적어라」는 뜻이다(궁을 통째로 갈아 낀 직후. 그때는 문소리를
  // bindPalaceAndSpawn() 이 이미 한 번 냈다).
  let lastRoom = null
  // 문소리를 낸 마지막 궁. bindPalaceAndSpawn() 은 한 이어에 두 번 불릴 수 있어
  // (runBeats 의 palace 검사와 playMove 의 끝) 궁 이름으로 한 번만 가린다.
  let lastPalace = null

  // 신하가 대신 건네는 문서는 바닥에 마커(3D 구슬·미니맵 점)를 띄우지 않는다 —
  // 그 자리에 이미 사람이 서 있다(NPC_HANDLED, 모듈 위쪽). 아직 오지 않은 막의
  // 카드(isFutureCard)도 마커에서 뺀다 — 마커가 있는데 E 를 눌러도 아무 일이
  // 없는 죽은 표지를 만들지 않는다.
  function pickupsRemaining() {
    const def = PALACES[flow.state.palace]
    const act = flow.actIndex + 1
    return (def.pickups ?? [])
      .filter(p => !flow.taken.has(p.cardId) && !isLost(flow.state, p.cardId) &&
        !NPC_HANDLED.has(p.cardId) && !isFutureCard(p.cardId, act))
      .map(p => ({ x: p.x, z: p.z, label: sourceById(p.cardId)?.title ?? '문서', kind: 'document' }))
  }

  // **아직 들을 것이 남은 사람.** 표지가 가리키는 것은 이제 바닥의 문서가 아니라
  // 사람이다 — 게임 안의 모든 문서에 임자가 생겼으므로 위 pickupsRemaining() 은
  // 늘 빈 배열이고, 그것만 두면 학생은 아무 표지도 없는 궁을 헤매게 된다.
  // 「궁궐 내에 있는 신하가 말을 걸거나, 왕이 신하한테 말을 하는 형태」(선생님)라면
  // 표지도 사람을 가리켜야 한다.
  function peopleRemaining() {
    const act = flow.actIndex + 1
    return currentNpcs()
      .filter(n => n.voice || n.id === 'mother' || npcCardIds(n).some(id =>
        !flow.taken.has(id) && !isLost(flow.state, id) && !isFutureCard(id, act)))
      // 몸이 없는 어머니도 찾아갈 문간은 보여야 한다. 문서가 없다고 표식까지 빼면
      // 학생은 빈 안채 앞에 우연히 서기 전까지 대화할 곳이 있는지 알 수 없다.
      .map(n => ({ x: n.x, z: n.z, label: n.voice ? `${n.name} · 문 너머 목소리` : n.name,
        kind: n.voice ? 'voice' : 'person' }))
  }

  // 문서 지점 + 아직 안 다녀온 나들이 지점. 나들이는 방 한가운데에 표지를 세운다 —
  // 학생이 「저기 나갈 수 있구나」를 알아야 무엇을 포기할지 정할 수 있다
  function markerPoints() {
    const def = PALACES[flow.state.palace]
    const stops = currentStops()
      .filter(s => !isStopDone(flow.state, s.id))
      .map(s => def.rooms.find(r => r.id === s.room))
      .filter(Boolean)
      .map(r => ({ x: r.x, z: r.z, label: '나들이' }))
    return [...pickupsRemaining(), ...peopleRemaining(), ...stops]
  }

  // 지금 궁·막에서 실제로 서 있는 신하 목록. bindPalaceAndSpawn() 이 씬에 심을 때도,
  // 근접 판정(pressEAction)·힌트(updateHint) 도 모두 이 한 함수를 부른다 — 목록이
  // 서로 다른 자리에서 어긋나지 않게 한다.
  function currentNpcs() {
    return npcsAt(baseOf, flow.state.palace, flow.actIndex, yearAtBeat(flow.act(), flow.state.beatIndex))
  }

  // 현재 비트가 'explore' 이고 exit 를 정해 두었으면 그것을 돌려준다.
  // 궁의 councilRoom 이 아니라 비트 데이터에서 읽는다 — Task 4: 2·3막은 비트마다
  // 나가는 방이 다를 수 있고, 애초에 궁을 안 거치는 비트도 있다.
  function currentExit() {
    return beatAt(flow.act(), flow.state.beatIndex)?.exit ?? null
  }

  // 현재 비트가 두는 나들이 지점 목록(없으면 빈 배열) — pressEAction()·updateHint()·
  // markerPoints() 가 모두 이 한 함수를 부른다.
  function currentStops() {
    return beatAt(flow.act(), flow.state.beatIndex)?.stops ?? []
  }

  function updateHint() {
    const exit = currentExit()
    if (exit && flow.state.room === exit.room) {
      hint.textContent = exit.label
      hint.hidden = false
      return
    }
    const stop = stopAt(currentStops(), flow.state.room, flow.state)
    if (stop) {
      hint.textContent = stopHint(stop, costOf(stop.placeId))
      hint.hidden = false
      return
    }
    const found = npcNear(currentNpcs(), ctx.player.position.x, ctx.player.position.z)
    if (found) {
      const m = Math.round(found.dist)
      const title = found.npc.title ? ` ${found.npc.title}` : ''
      // 마지막 하나를 쓰기 직전에는 그 사실을 알린다. 고르는 것이 이 낮의 내용인데,
      // 고르고 있다는 것을 모른 채 고르면 그것은 고른 것이 아니다.
      const last = flow.state.dayLeft === 1 && npcCardIds(found.npc).length > 0
        ? ' · 오늘 마지막 하나다' : ''
      hint.textContent = `${found.npc.name}${title} · ${m}m — E 로 말을 건다${last}`
      hint.hidden = false
      return
    }
    const def = PALACES[flow.state.palace]
    const near = pickupNear(def, ctx.player.position.x, ctx.player.position.z)
    if (near && !flow.taken.has(near.cardId) && !isLost(flow.state, near.cardId) &&
        !NPC_HANDLED.has(near.cardId) && !isFutureCard(near.cardId, flow.actIndex + 1)) {
      hint.textContent = 'E — 문서를 살펴본다'
      hint.hidden = false
      return
    }
    hint.hidden = true
  }

  // 사초함(史草)이 열리고 닫히는 소리. 바닥에서 문서를 줍는 순간에는 'open' 을 겹치지
  // 않는다 — 거기서는 이미 'pick' 이 울린다. 한 사건에 두 소리를 겹치면 둘 다 안 들린다.
  function pressQ() {
    if (dialog.isOpen()) {
      dialog.close()      // 닫는 소리는 createDialog 의 onClose 가 낸다 — 여기서 또 내면 두 번 난다
    } else {
      audio.play('open')
      dialog.showCodex(flow.state)
    }
  }

  // E 키 한 번을 boot() 밖에서도 Node 로 실제 구동할 수 있도록 뽑아낸 판정.
  // DOM 을 만들거나 어디에도 손대지 않는다 — 무엇을 할지 값(action)으로만 돌려주고,
  // 실제 부수효과(배너·flow.state 반영·카드 표시)는 onPressE() 가 아래 스위치에서 적용한다.
  // 그래서 이 함수 하나가 '다가서기 → spend → pickUp → markRead' 배선 전체를 그대로 통과한다.
  //
  function pressEAction() {
    const found = npcNear(currentNpcs(), ctx.player.position.x, ctx.player.position.z)
    return pressE({
      dialogOpen: dialog.isOpen(),
      exit: currentExit(),
      stops: currentStops(),
      room: flow.state.room,
      palaceDef: PALACES[flow.state.palace],
      playerX: ctx.player.position.x,
      playerZ: ctx.player.position.z,
      taken: flow.taken,
      state: flow.state,
      npc: found?.npc ?? null,
      act: flow.actIndex + 1,
    })
  }

  // pressE() 가 돌려준 'pickup' 액션을 실제로 적용한다 — 바닥에서 곧장 줍든,
  // 신하와 말을 나눈 뒤 이어받든 이 함수 하나로 합친다(중복 배선 금지).
  function applyPickup(action) {
    audio.play('pick')
    // Q 키에 걸린 이 게임의 중심 물건인데 어디에서도 뜻을 밝히지 않았다 —
    // 첫 문서를 줍는 순간 한 번만 정체를 알린다(가독성 검수 D1, 최악의 열 가지 9위).
    const firstEver = flow.taken.size === 0
    flow.taken.add(action.cardId)
    flow.state = action.state
    ctx.setPickupMarkers(markerPoints())
    saveGame(flow.state)   // 문서를 읽은 시점 — 학생이 여기서 새로고침해도 잃지 않는다
    if (firstEver) {
      banner(root, '史草 — 사관이 적어 두는 기록. 당신이 읽은 문서가 여기 쌓인다. Q를 누르면 열린다.', 4200)
    }
    dialog.showCard(sourceById(action.cardId))
  }

  // pickUpPacket() (위, 순수) 이 돌려준 판정을 실제로 적용한다 — applyPickup() 과
  // 짝을 이룬다: 문서 하나가 아니라 뭉치를 한 번에 taken/저장/사초 배너로 잇는다.
  function applyPickupPacket(cardIds) {
    const def = PALACES[flow.state.palace]
    const result = pickUpPacket({ palaceDef: def, cardIds, taken: flow.taken, state: flow.state, act: flow.actIndex + 1 })
    if (!result.ok) {
      if (result.reason === 'no-time') { audio.play('deny'); banner(root, '오늘은 더 들을 수 없다') }
      return
    }
    audio.play('pick')
    const firstEver = flow.taken.size === 0
    for (const id of result.cardIds) flow.taken.add(id)
    flow.state = result.state
    ctx.setPickupMarkers(markerPoints())
    saveGame(flow.state)
    if (firstEver) {
      banner(root, '史草 — 사관이 적어 두는 기록. 당신이 읽은 문서가 여기 쌓인다. Q를 누르면 열린다.', 4200)
    }
    showPacketCards(result.cardIds.map(sourceById))
  }

  // 뭉치 속 카드를 한 장씩 순서대로 보여준다 — 신하 하나가 넉 장을 한꺼번에
  // 내밀어도 학생은 한 번에 한 장씩 닫아 가며 읽는다(dialog.showCard 의 onClose 를 잇는다).
  function showPacketCards(cards, done = null) {
    const [first, ...rest] = cards
    if (!first) { done?.(); return }
    dialog.showCard(first, () => showPacketCards(rest, done))
  }

  // E 가 들어오는 유일한 문. 알현 국면에서는 pressE() 의 판정(줍기·나가기·나들이)이
  // 통째로 틀린 답이다 — 그 국면에는 주울 것도 나갈 방도 없고, 좌표만 보고 판정하면
  // 어좌 앞에 선 임금이 「문서를 줍는다」로 새어 나간다. 국면으로 먼저 가른다.
  function onE() {
    if (flow.phase === 'audience') { onAudienceE(); return }
    onPressE()
  }

  function onPressE() {
    if (speak.press()) return          // 말하는 중이면 한 줄 넘긴다
    const action = pressEAction()
    switch (action.type) {
      case 'close-dialog': dialog.close(); return   // 닫는 소리는 dialog 의 onClose 가 낸다
      // 이 비트가 정한 나가는 방에 서 있으면 탐색 비트를 끝낸다 — 다음 비트(대개 어전회의)로 넘어간다
      case 'exit-explore': resolveExplore?.(); return
      case 'no-time': audio.play('deny'); banner(root, '오늘은 더 들을 수 없다'); return
      case 'stop': runStop(action); return
      case 'talk': {
        const npc = action.npc
        // 낮에 만나는 신하도 얼굴이 뜬다 — 알현과 같은 화면을 쓴다.
        speak.show({
          name: npc.name,
          title: npc.title,
          npcId: npc.id,
          portrait: portraitKeyOf(npc),
          lines: npc.lines,
        }).then(() => {
          const cardIds = npcCardIds(npc)
          if (cardIds.length === 0) return   // 흥선대원군처럼 문서 없이 말만 건네는 신하도 있다
          // 한 장이든 뭉치든 applyPickupPacket() 하나로 건넨다 — cardId 로 직접
          // 찾아 값을 치르므로, 신하가 서 있는 자리와 palaces.js 의 pickups 좌표가
          // 어긋나 있어도(신헌처럼) 안전하다. 좌표가 같은 자리에서 pressE 를 다시
          // 부르는 옛 지름길은 그 어긋남을 파고드는 구멍이었다 — pressE() 위 주석 참고.
          applyPickupPacket(cardIds)
        })
        return
      }
      case 'already-taken': audio.play('deny'); return   // 이미 손에 든 문서다 — 화면은 그대로 둔다
      case 'pickup': applyPickup(action); return
      default: return
    }
  }

  // 멈춤을 여닫는 유일한 자리다 — Esc 도, 태블릿의 단추도 여기로 들어온다.
  // 탐색 중에만 연다(어전회의·촉박 같은 다른 화면과 겹치지 않게). 저장은 여기서
  // 학생이 직접 누르는 것 하나만이 아니다 — 문서를 줍거나 결정을 내릴 때마다
  // saveGame() 이 이미 조용히 불린다. 이 화면은 그 사실을 학생에게 보여주는 확인창이다.
  // audio 를 넘기는 이유(판정 R91): 수업 도중에 소리를 끄는 길이 여기밖에 없다.
  // 타이틀의 토글과 같은 audio 다 — 두 곳이 서로 다른 상태를 들고 있으면 안 된다.
  function togglePause() {
    // 조작권 D 장면에서도 연다 — 그 구간에 소리를 끌 길이 여기밖에 없다(canPause 참고).
    if (!canPause(flow.phase, holdSession !== null)) return
    // 알현 도중에는 열려 있는 대화를 닫지 않는다. 이 화면의 닫힘이 **다음 장면을
    // 잇는 방아쇠**라서(dialog 의 onClose → 문서를 건네고 다음 사람으로 넘어간다),
    // 멈춤을 여는 것만으로 장면이 저 혼자 진행돼 버린다. 멈춤 판은 z-index 70 이라
    // 대화(40) 위에 그대로 덮인다 — 닫지 않아도 가려진다.
    if (flow.phase !== 'audience') dialog.close()
    pause.toggle({
      audio,
      onSave: () => saveGame(flow.state),
      onRestart: () => { clearSave(); location.reload() },
    })
  }

  function handleKey(e) {
    // 글을 쓰는 칸에 커서가 있으면 E·Q·Esc 를 가로채지 않는다 — 「왜 그렇게
    // 정했는가」를 쓰다가 E 를 치면 문서를 줍고 Esc 를 치면 멈춤 화면이 떴다.
    if (isTyping(e)) return
    // 조작 안내가 떠 있으면 그 화면이 키를 가진다 — 안 그러면 안내 뒤에서 Esc 가
    // 멈춤 화면을 열어, 안내를 닫는 순간 열지도 않은 화면이 떠 있다.
    if (controlsHint.isOpen()) return
    if (e.code === 'Escape') { togglePause(); return }
    if (pause.isOpen()) return
    // 알현 — 걷지는 못해도 화면은 넘겨야 하고, 사초함은 열려야 한다.
    if (flow.phase === 'audience') {
      if (e.code === 'KeyQ') { pressQ(); return }
      if (e.code === 'KeyE') onAudienceE()
      return
    }
    if (flow.phase !== 'day') return
    if (e.code === 'KeyQ') { pressQ(); return }
    if (e.code === 'KeyE') onPressE()
  }

  // 「내 기록 복사」— 실제 글은 buildRecordText() (모듈 최상위, 순수 함수)가 짓는다.
  // 어느 막 끝 화면에서 부르든 그 시점까지의 전체 기록이다(버그 B — 3막 끝에서 눌러도
  // 1·2·3막이 모두 나와야 한다).
  //
  // 복사 경로 자체는 ui/copy.js 로 옮겼다. 예전에는 여기서 execCommand('copy') 를
  // try/catch 로 감싸고 그 아래에서 무조건 「복사했습니다」를 띄웠다 — execCommand 는
  // 막혔을 때 던지지 않고 false 를 돌려주는 쪽이 흔하므로, 그 배너는 이 게임에서
  // 유일하게 거짓말을 할 수 있는 문장이었다. 학생의 산출물이 밖으로 나가는 길은
  // 여기 하나뿐이고, 회수할 다른 경로가 없었다. 이제 성패를 보고 갈라, 실패하면
  // 글을 화면에 띄워 학생이 직접 긁어 가게 한다.
  function copyRecord() {
    const text = buildRecordText(flow.state, ACTS)
    copyText(text).then(ok => {
      if (ok) { banner(root, COPY_OK); return }
      banner(root, COPY_FAILED)
      openManualCopy(root, text)
    })
  }

  // 막이 끝난 화면. 「내 기록 복사」는 1단계의 판정을 그대로 잇는다 —
  // 생방 결정(playCouncil)과 이어하기(resumeAct → finishAct) 둘 다 여기를 지난다.
  // 이야기의 마무리는 각 막 자체의 'end' 비트(note)가 이미 보여주었다 — 여기서 다시
  // 지문을 넣지 않는다. 예전엔 1막에서만 맞는 「담 너머에서 경복궁 중건이 시작된다.」를
  // 모든 막에 그대로 찍고 있었다 — 2·3막에는 틀린 문장이었다.
  function showActEnd(reason) {
    const ended = flow.act()
    // 1막에서만 「발」 화면(veil-screen.js) 전체를 겪었다 — 그 화면 자체는 여전히
    // 설명하지 않는다. 수렴청정이 무엇이었는지는 1막이 끝난 뒤 이 한 줄로 회수한다
    // (가독성 검수 C2).
    const extra = flow.actIndex === 0
      ? ['垂 드리우다 · 簾 발 · 聽 듣다 · 政 정치 — 발을 드리우고 그 뒤에서 정치를 듣는 것. 당신이 게임 내내 위쪽이 가려진 채 걸은 이유다.']
      : []
    return actEnd.show({
      title: `${flow.actIndex + 1} 막 「${ended.title}」 끝`,
      lines: extra,
      // everRead() 로 센다 — sources.read 만 쓰면 불타거나 약탈당한 문서가
      // "안 읽음"으로 보인다(2단계 Important 1)
      read: `읽은 문서 ${everRead(flow.state).length}장 · 남긴 말 ${reason ? '있음' : '없음'}`,
      reason,
      onCopy: () => copyRecord(),
    })
  }

  // ── 비트 러너 (Task 4) ──────────────────────────────────
  // main.js 는 비트 종류별 핸들러를 await 으로 이어 붙이는 얇은 진행자다.
  // 상태 전이 자체(enterAct·applyBeat·advance·isActOver)는 systems/scenario.js 의
  // 순수 함수가 맡는다 — 여기서는 DOM 을 만들고 Promise 를 잇기만 한다.

  let resolveExplore = null   // 지금 열려 있는 탐색 비트를 끝내는 콜백. 탐색 중이 아니면 null
  let resolveRush = null      // 지금 진행 중인 촉박 비트를 끝내는 콜백. 진행 중이 아니면 null
  // 지금 도는 촉박이 불을 뿌려야 하는가(3단계 Task 7). 1873 자경전은 불이지만
  // 1882 난군·1884 청군은 불이 아니다 — flow.state 에서 되살릴 수 있다
  // (beatAt(act, beatIndex).fire), 그래서 이어하기 쪽에는 등록하지 않고
  // dispose() 에서만 false 로 되돌린다(⑧-2).
  let rushFire = false
  let dateLabel = ACTS[0].dateLabel   // HUD 에 보이는 날짜. 비트가 dateLabel 을 정하면 갈아 낀다
  let prevPalace = null   // 이 비트에 들어오기 직전의 궁 — 'move' 비트가 이어 화면의 「어디서」를 적을 때 쓴다

  // 막의 dateLabel 에서 시작해, beatIndex 이전까지 지나온 비트 중 마지막으로 dateLabel 을
  // 정한 값을 찾는다 — 이어하기가 중간 비트에서 다시 시작해도 날짜가 틀리지 않게 한다
  function dateLabelAtBeat(act, beatIndex) {
    let label = act.dateLabel
    for (let i = 0; i < beatIndex; i++) {
      const b = beatAt(act, i)
      if (b?.dateLabel && isBeatActive(flow.state, b)) label = b.dateLabel
    }
    return label
  }

  // quiet — 궁을 갈아 끼우되 문소리는 아직 내지 않는다. 이어(移御) 비트가 쓴다(palaceDoor 참고).
  function bindPalaceAndSpawn(quiet = false) {
    flow.syncPalace(flow.state.palace)
    ctx.setPickupMarkers(markerPoints())
    // 신하도 궁·막이 바뀔 때마다 다시 세운다 — setNpcs() 자체가 목록이 실제로
    // 같으면 아무것도 다시 짓지 않는다(render/scene.js).
    ctx.setNpcs(currentNpcs())
    // 임금은 해마다 자란다 — 「1막이면 아이, 아니면 어른」이 아니다(systems/king-age.js).
    ctx.setYear?.(yearAtBeat(flow.act(), flow.state.beatIndex))
    ctx.setKingAge({ ...kingLookAt(yearAtBeat(flow.act(), flow.state.beatIndex)),
      attire: kingAttireAt(flow.act(), flow.state.beatIndex, flow.state.palace) })
    // syncPalace 는 궁이 바뀔 때만 다시 세운다 — 막이 바뀌어도 같은 궁에 머물 수 있으므로
    // (2·3막부터) 스폰 위치는 항상 여기서 따로 맞춘다
    const spawn = PALACES[flow.state.palace].spawn
    ctx.player.position.set(spawn.x, ctx.player.position.y, spawn.z)
    // 걷기 입력이 없어도 HUD는 새 좌표의 방을 가리켜야 한다. 이전 궁의 방을 남기지 않는다.
    flow.state = { ...flow.state, room: roomAt(PALACES[flow.state.palace], spawn.x, spawn.z)?.id ?? null, blocked: null }
    // 궁을 통째로 갈아 끼는 것도 「문을 지나는」 일이다 — 궁이 실제로 달라졌을 때만
    // 한 번 낸다. lastRoom 을 비워 두면 다음 프레임이 새 방 이름을 조용히 받아
    // 적는다(같은 문이 두 번 나지 않는다).
    const door = palaceDoor(flow.state.palace, lastPalace, quiet)
    lastPalace = door.lastPalace
    if (door.play) audio.play('door')
    lastRoom = null
  }

  function playExplore(beat) {
    return new Promise(resolve => {
      flow.setPhase('day')
      hint.hidden = true
      resolveExplore = () => {
        resolveExplore = null
        flow.setPhase('beat')
        dialog.close()
        hint.hidden = true
        resolve(flow.state)
      }
    })
  }

  // ── 알현(謁見) 비트 ──────────────────────────────────────────────
  // 임금은 어좌 앞에 서 있고, **사람이 임금에게로 온다.** 셈(누가 어디에 서고, 몇 초에
  // 걸어오는가)은 systems/audience.js 가 하고, 여기서는 그 값으로 화면과 대화를 잇는다.
  //
  // 이 비트가 왜 탐색을 대신하는지는 systems/audience.js 머리말에 적어 두었다.
  let audienceBeat = null      // 지금 도는 알현·행렬 비트(아니면 null)
  let audienceWalk = null      // 지금 걸어 들어오거나 물러나는 사람
  let procession = null        // 지금 걷고 있는 행렬 { t0, ms, from, to, escort, resolve }
  let resolveAudience = null   // 마지막 E 를 기다리는 콜백
  let lastRebukeAt = -Infinity
  // 아룀이 다 끝나 문이 열렸는가. 열리기 전에는 전각 안만 걷고, 열린 뒤에는 문으로 걸어 나가면 끝난다.
  let audienceExitOpen = false

  // 사람 하나를 from 에서 to 까지 걸린다. **프레임을 세지 않는다** — 아래 frame() 이
  // 시간으로 재고, 이 Promise 는 다 걸었을 때 풀린다.
  // followRoom — 임금 앞으로 걸어오는 걸음이면 그 방. 임금이 걷는 동안에도 목적지를 매 프레임
  // 임금이 지금 선 자리 앞으로 고쳐 잡는다(알현 중 전각 안 걷기 — 2026-09-13).
  function walkNpc(id, from, to, ms, lookAt = null, followRoom = null) {
    return new Promise(resolve => {
      audienceWalk = { id, from, to, t0: performance.now(), ms, lookAt, followRoom, resolve }
    })
  }

  // 임금이 움직이려 할 때. 곁에 선 사람이 당대의 말투로 막는다(선생님 지적 2번).
  function rebuke() {
    const r = rebukeOf(audienceBeat)
    if (!r) return
    const who = r.npcId ? npcById(r.npcId)?.name : null
    audio.play('deny')
    banner(root, who ? `${who} — ${r.line}` : r.line, 2600)
  }

  // 찾아온 사람이 아뢰고, 들고 온 문서를 건넨다. 대화를 닫아야 문서가 나온다 —
  // 신하와의 대화(dialog.showNpc → onClose)가 기대는 그 한 자리를 그대로 쓴다.
  // 손에 쥐여 주는 것 자체는 여기서 하지 않는다: 비트가 끝난 뒤 applyGrant() 가
  // 한 자리에서 한다(systems/scenario.js 머리말).
  async function speakVisitor(npc, v) {
    const ids = visitorCardIds(v)
    const cards = ids.map(sourceById).filter(Boolean)
    // 얼굴이 뜨고 한 줄씩 말이 온다(ui/speak.js). 예전에는 흰 카드에 서너 줄이
    // 한꺼번에 얹혔다 — 그것은 읽을거리이지 대화가 아니다.
    await speak.show({
      name: npc.name,
      title: v.title ?? npc.title,
      npcId: npc.id,
      portrait: portraitKeyOf(npc),
      lines: v.lines ?? npc.lines,
    })
    if (cards.length === 0) return
    audio.play('pick')
    await new Promise(res => showPacketCards(cards, res))
  }

  // 알현에서 E 를 눌렀을 때. 열려 있는 화면이 있으면 그것을 닫고(그 닫힘이 다음을
  // 잇는다), 다 끝났으면 다음 비트로 넘어간다. 그 밖에는 아무 일도 하지 않는다 —
  // 사람이 걸어 들어오는 동안 E 를 눌러 장면을 건너뛰게 두지 않는다.
  function onAudienceE() {
    if (speak.press()) return          // 말하는 중이면 한 줄 넘긴다
    if (dialog.isOpen()) { dialog.close(); return }
    resolveAudience?.()
  }

  // 행렬(行列) 비트 — 임금이 스스로 걷지 않는다. 아버지와 신하들이 데리고 나간다.
  //
  // 선생님 지적 6번: "창덕궁에서 경복궁으로 이동할때 실제로 신하들과 흥선대원군이
  // 고종을 데리고 이동하는 장면을 넣어야 해." 예전에는 이어(移御)가 글 화면 한 장이
  // 전부였다 — 「어디서 → 어디로 · 왜」. 임금이 궁을 옮긴다는 것은 이 게임에서
  // 가장 큰 사건 중 하나인데, 그 일이 화면에서는 아무것도 아니었다.
  async function playProcession(beat) {
    const def = PALACES[flow.state.palace]
    const from = roomOf(def, beat.room ?? def.councilRoom)
    const to = roomOf(def, beat.to)
    if (!from || !to) throw new Error(`행렬의 자리가 없다: ${beat.id}`)

    audienceBeat = beat
    lastRebukeAt = -Infinity
    dialog.close()
    hint.hidden = true
    ctx.setProps([])
    ctx.setPickupMarkers([])
    ctx.setNpcs(castOf(beat).map(npcById).filter(Boolean))

    const start = kingSpot(from)
    const end = { x: to.x, z: to.z }
    ctx.player.position.set(start.x, ctx.player.position.y, start.z)
    flow.state = { ...flow.state, room: from.id }
    flow.setPhase('audience')

    const escort = escortOffsets(beat)
    for (const e of escort) ctx.placeNpc(e.npc, { x: start.x + e.dx, z: start.z + e.dz, yaw: 0 })

    // 걷는 동안 한 줄씩 뜬다. 화면을 덮는 판이 아니라 배너다 — 장면을 가리지 않는다.
    // 소리는 없다(2026-09-22 선생님: 「나레이션을 모두 제거」) — 음성 파일이 없으니 narrate() 는
    // 줄마다 읽을 시간만 두고 자막을 넘긴다. 음성은 인물의 「」 대사에만 남는다.
    const lines = beat.lines ?? []
    let caption = null
    const narration = voice.narrate(lines, { onLine: (text, clip) => {
      caption?.dispose()
      caption = banner(root, text, (clip?.ms ?? Math.max(3000, text.length * 100)) + 500)
    } })
    const processionMs = Math.max(PROCESSION_MS, lines.reduce((sum, text) => sum + (voice.clipFor('gojong-narrator', text)?.ms ?? 3000) + 250, 0))

    audio.play('door', { gain: ROOM_DOOR_GAIN })
    await new Promise(resolve => {
      procession = { t0: performance.now(), ms: processionMs, from: start, to: end, escort, resolve }
    })

    flow.state = { ...flow.state, room: to.id }
    hint.textContent = beat.exit?.label ?? 'E — 다음으로'
    hint.hidden = false
    await new Promise(res => { resolveAudience = res })

    narration.stop()
    caption?.dispose()
    resolveAudience = null
    audienceBeat = null
    procession = null
    hint.hidden = true
    dialog.close()
    ctx.setNpcs(currentNpcs())
    for (const n of currentNpcs()) ctx.placeNpc(n.id, { x: n.x, z: n.z, yaw: null, hidden: false })
    flow.setPhase('beat')
    return flow.state
  }

  async function playAudience(beat) {
    const def = PALACES[flow.state.palace]
    const room = roomOf(def, beat.room ?? def.councilRoom)
    if (!room) throw new Error(`알현할 방이 없다: ${beat.id} (${beat.room})`)

    audienceBeat = beat
    lastRebukeAt = -Infinity
    dialog.close()
    hint.hidden = true
    ctx.setPickupMarkers([])   // 주울 것이 없다 — 표지가 떠 있으면 학생이 그리로 걸으려 한다

    // 이 장면에 부른 사람만 세운다. actsVisible 은 보지 않는다 — 그것은 「이 막에
    // 궁 안 어딘가에 서 있는 사람」의 목록이고, 알현은 「지금 이 자리에 부른 사람」이다.
    ctx.setNpcs(castOf(beat).map(npcById).filter(Boolean))

    const king = kingSpot(room)
    ctx.player.position.set(king.x, ctx.player.position.y, king.z)
    flow.state = { ...flow.state, room: room.id }
    flow.setPhase('audience')

    besideIds(beat).forEach((id, i) => {
      const b = besideSpot(room, i)
      ctx.placeNpc(id, { x: b.x, z: b.z, yaw: yawToward(b, king) })
    })
    // 찾아올 사람은 아직 문간이다. 미리 세워 두면 「들어왔다」가 없다.
    // **곁에 서 있는 사람(from:'beside')은 빼야 한다** — 이 줄이 그 사람까지
    // 문간으로 옮겨 버려, 임금 곁에 서 있어야 할 대원군이 문 앞에 가 있었다.
    const door = doorSpot(room)
    audienceExitOpen = false
    // 임금은 이제 전각 안을 걷는다(선생님 요청 2026-09-13) — 아뢰는 사람은 들어오는 그 순간
    // 임금이 선 자리 앞으로 온다. 걷는 동안·말하는 동안에는 걸음이 멈추므로 그 사이에 자리가 어긋나지 않는다.
    const kingNow = () => ({ x: ctx.player.position.x, z: ctx.player.position.z })
    let stand = visitorSpot(room)
    for (const v of visitorsOf(beat)) {
      if (entersOf(v)) ctx.placeNpc(v.npc, { x: door.x, z: door.z, yaw: Math.PI })
    }

    const props = []
    ctx.setProps(props)
    // 문이 열리기 전 한숨 — 임금이 전각 안을 둘러볼 틈이다. 곁에 선 사람만 말하는 알현이면 기다리지 않는다.
    if (visitorsOf(beat).some(entersOf)) await new Promise(r => setTimeout(r, 1400))
    for (const v of visitorsOf(beat)) {
      const npc = npcById(v.npc)
      if (!npc) continue
      // 곁에 이미 서 있는 사람(대원군)은 걸어 들어오지 않는다 — 제자리에서 말한다.
      if (entersOf(v)) {
        stand = visitorSpotFor(room, kingNow())
        audio.play('door', { gain: ROOM_DOOR_GAIN })
        await walkNpc(v.npc, door, stand, APPROACH_MS, kingNow(), room)
        stand = visitorSpotFor(room, kingNow())
      }
      // 들고 온 것을 먼저 내려놓는다 — 말보다 물건이 먼저 눈에 들어와야 한다.
      const prop = propOf(v)
      if (prop) {
        const k = kingNow()
        const at = { x: (k.x + stand.x) / 2, z: (k.z + stand.z) / 2 }
        props.push({ id: prop, x: at.x, z: at.z, yaw: Math.PI / 2 })
        ctx.setProps(props)
        audio.play('deny')   // 쇠가 마루에 닿는 소리를 대신한다
      }
      await speakVisitor(npc, v)
      if (entersOf(v)) await walkNpc(v.npc, stand, door, DEPART_MS)
    }

    // 자리를 뜨는 사람 — 걸어 나가고 화면에서 사라진다. 1873년의 대원군이다.
    for (const id of departIds(beat)) {
      const i = besideIds(beat).indexOf(id)
      const from = i >= 0 ? besideSpot(room, i) : stand
      audio.play('door', { gain: ROOM_DOOR_GAIN })
      await walkNpc(id, from, door, APPROACH_MS)
      ctx.placeNpc(id, { hidden: true })
    }

    // 다 아뢰었다. 다음으로 넘어가는 것은 학생이 정한다 — 저절로 넘어가면
    // 방금 받은 문서를 다시 볼 틈도 없이 어전회의가 덮친다.
    hint.textContent = `${beat.exit?.label ?? 'E — 다음으로'} · 또는 문으로 걸어 나간다`
    hint.hidden = false
    audienceExitOpen = true
    await new Promise(res => { resolveAudience = res })

    audienceExitOpen = false
    resolveAudience = null
    audienceBeat = null
    audienceWalk = null
    // 문으로 나가든 E로 끝내든, 마지막 탭과 막힘을 다음 낮으로 넘기지 않는다.
    acc = 0
    tapTarget = null; tapRoute = []; autoWalk = false
    flow.state = { ...flow.state, blocked: null }
    hint.hidden = true
    dialog.close()

    // 씬을 그 막의 「서 있는 사람들」로 되돌린다. 이걸 안 하면 알현에 부른 사람이
    // 인정전에 그대로 서 있는데 낮의 근접 판정(pressE·updateHint)은 npcs.js 의
    // 좌표를 본다 — 눈앞의 신하에게 E 가 안 먹고 빈 방에서 말이 걸린다.
    // 화면과 판정이 갈리는 자리는 학생에게 언제나 「고장」으로 읽힌다.
    ctx.setProps([])
    ctx.setNpcs(currentNpcs())
    for (const n of currentNpcs()) ctx.placeNpc(n.id, { x: n.x, z: n.z, yaw: null, hidden: false })

    flow.setPhase('beat')
    return flow.state
  }

  // 나들이 — 낮 안에서 짧은 장면 하나를 재생하고 다시 낮으로 돌아온다. 막을 넘기지 않는다.
  // 값(낮 칸수)은 pressE() 가 이미 치렀고 다녀온 표시도 이미 붙었다 — 여기서는 재생만 한다.
  async function runStop(action) {
    flow.state = action.state
    // 값을 치른 시점 — 여기서 새로고침해도 두 번 내지 않는다. 그리고 이 저장에는
    // 「아직 화면을 못 봤다」(stop.pending)가 함께 실려 있어, 하필 여기서 끊긴 세션은
    // resumePendingStop() 이 그 화면을 다시 열어 준다. 예전에는 이 저장이 「다녀왔다」
    // 까지 굳혀서, 학생이 해 3칸을 내고 겨와 모래 한 장을 영영 못 받았다.
    saveGame(flow.state)
    dialog.close()
    hint.hidden = true
    flow.setPhase('beat')
    flow.state = await playBeat(action.beat)
    flow.state = markStopDone(flow.state, action.stopId)   // 화면을 다 본 시점 — 밀린 표시를 지운다
    saveGame(flow.state)
    // 나들이에서 돌아오면 다시 낮이다. 다만 해가 다 졌으면 그대로 밤으로 넘어간다
    if (isDusk(flow.state)) { resolveExplore?.(); return }
    flow.setPhase('day')
    // 나들이는 낮 안의 짧은 장면이라 runBeats 를 거치지 않는다 — 돌아온 뒤의 바닥
    // 소리를 여기서 직접 되돌린다. 다시 궁 안이다.
    audio.setAmbient('hall')
    ctx.setPickupMarkers(markerPoints())
  }

  // 이어(移御) 비트 — relocate.js 가 기록을 남기고, 화면은 「어디서 → 어디로 · 왜」만 보여준다.
  // 조작권 글자는 화면에 한 글자도 없다(설계서 5장 B) — 다음 낮에 문이 열리거나 막힌 것으로
  // 학생이 안다. beat.control 은 이미 위 runBeats 의 applyBeat 가 처리했으므로 여기서 다시
  // 만지지 않는다. from 은 applyBeat 가 palace 를 beat.palace 로 덮어쓰기 직전의 값이다 —
  // runBeats 가 매 비트 루프 앞에서 prevPalace 에 잡아 둔다. (알려진 한계: 저장된 세션이
  // 하필 이 move 비트 한가운데서 끊겼다가 재개되면 그때는 이미 새 궁이 들어와 있다 — 매우
  // 드문 경로이고, 실제로 이 게임의 어떤 이어도 저장 시점(막·회의 경계)에서 끊기지 않는다)
  async function playMove(beat) {
    const from = prevPalace ?? flow.state.palace
    const fromName = PALACES[from].name
    const toName = PALACES[beat.palace].name
    flow.setPhase('beat')
    hint.hidden = true
    await moveScreen.show({
      year: beat.year,
      lunarDate: beat.lunarDate ?? '',
      solarDate: beat.solarDate ?? '',
      fromName, toName,
      cause: beat.cause,
      self: beat.self === true,
      note: moveNote(beat, MOVE_GLOSS[beat.id]),
    })
    flow.state = relocate(flow.state, {
      year: beat.year, from, to: beat.palace, cause: beat.cause,
      // === true 로 눌러 버리면 「다툼이 있다」(1884 환어의 'disputed')가 「아니다」로
      // 바뀐다. 날것으로 남긴다 — selfChosenMoves() 는 === true 만 세므로 셈은
      // 지금과 똑같고, 기록만(엔딩에서 학생이 셀 값, 설계서 13.2) 더 정확해진다.
      self: beat.self ?? false,
    })
    bindPalaceAndSpawn()   // 새 궁의 씬·스폰·문서 지점으로 다시 세운다 — 이어는 막 전환과 달리
                            // 한 막 안에서도 일어날 수 있어, 여기서 직접 불러야 반영된다
    return flow.state
  }

  // E 지연 비트 — 강화도(또는 평양)에서 이미 벌어진 일을 「도착한 장계만큼만」 보여준다.
  // dispatch.js 가 무엇이 도착했는지 가리고, 이 화면은 그 결과를 그릴 뿐 스스로
  // 시간을 흘리지 않는다 — beat.day 는 비트 데이터가 못 박아 둔 값이다. cannotGo 한 줄이
  // 이 장면의 전부다(설계서 5장 E) — 강화도가 지도에 보이는데 갈 수 없다.
  async function playDispatch(beat) {
    flow.setPhase('beat')
    hint.hidden = true
    await dispatchMap.show({
      title: beat.title,
      day: beat.day,
      dispatches: beat.dispatches,
      cannotGo: beat.cannotGo,
    })
    return flow.state
  }

  // 약탈 비트(D1) — 사료 카드가 사초함에서 영구히 사라진다. 보유하지 않은 카드는
  // 잃을 것도 없다: 학생이 규장각에 안 갔다면 이 장면에서 잃는 것이 없고, 그것 또한
  // 사실이다. plunder() 는 codex.js(잠금)의 함수를 그대로 쓴다 — 여기서는 무엇이
  // 사라졌는지 lostBy 에 사유를 남기고 화면에 붙일 뿐이다. 되찾을 길은 만들지 않는다.
  async function playPlunder(beat) {
    flow.setPhase('beat')
    hint.hidden = true
    const taken = (beat.cardIds ?? []).filter(id => flow.state.sources.held.includes(id))
    let next = plunder(flow.state, taken)
    next = recordLoss(next, taken, 'plunder')
    flow.state = next
    // 여기서 saveGame() 을 부르지 않는다(CRITICAL 1) — 이어하기가 이 저장을 받으면
    // held 가 이미 줄어든 채로 이 비트를 다시 돌려 taken 을 빈 배열로 다시 셈하고,
    // 「가지고 있던 것이 없다」를 잃지도 않은 문서에 대해 보여준다. runBeats() 가
    // advance() 뒤에 한 번만 저장한다.
    await lossScreen.show({
      title: beat.title,
      art: beat.art,
      lines: beat.lines,
      tag: LOSS_LABEL.plunder,
      cards: taken.length
        ? taken.map(id => ({ title: sourceById(id)?.title ?? id }))
        : [{ title: '가지고 있던 것이 없다' }],
      origin: beat.origin,
      footer: beat.footer,
    })
    return flow.state
  }

  // 1876 대화재 — 실록이 적은 소실물 가운데 무엇을 먼저 꺼내라 할지 고르고, 실제와 견준다(ui/salvage.js).
  async function playSalvage(beat) {
    flow.setPhase('beat')
    hint.hidden = true
    const result = await salvage.open({
      title: beat.title,
      lines: beat.lines,
      asker: beat.asker ?? null,   // 무엇을 먼저 꺼낼지 여쭙는 사람(사관)
      treasures: beat.treasures ?? [],
      pick: beat.pick,
      question: beat.question,
      actual: beat.actual,
      footer: beat.footer,
      origin: beat.origin,
      initial: flow.state.preservation?.[beat.id],
      onSave: record => {
        const allowedIds = (beat.treasures ?? []).map(t => t.id)
        flow.state = recordPreservation(flow.state, beat.id, record, allowedIds)
        const checkpoint = loadGame()
        return checkpoint ? saveGame({ ...checkpoint, preservation: flow.state.preservation }) : false
      },
    })

    flow.state = recordPreservation(flow.state, beat.id, result, (beat.treasures ?? []).map(t => t.id))
    // 상태 저장은 기존과 같이 비트가 끝난 뒤 runBeats()에서 한다.
    return flow.state
  }

  // 친필 비트(F1) — 양이침범은 제시하고 나머지 여덟 글자를 직접 따라 쓴다. 실패할 수 없는 장면이라
  // 다 쓰면 그 카드를 자기 손으로 읽은 것으로 친다 — 지급 자체는 여기서 하지 않는다.
  // playBeat() 이 비트 종류와 무관하게 한 자리에서 한다(applyGrant).
  async function playBrush(beat) {
    flow.setPhase('beat')
    hint.hidden = true
    // 붓을 들기 전에 지금 무엇을 쓰는 상황인지 먼저 읽는다(beat.intro — 척화비 비문).
    if (beat.intro) {
      guide.set('글을 읽고 「다음」을 누르세요. 그다음 붓을 듭니다.')
      await noteScreen.show(beat.intro)
      guide.set(guideForBeat(beat))
    }
    await brush.open({
      ...brushView(beat),
      // 획 하나에 한 번. 붓을 대는 순간에만 울린다(끄는 동안이 아니라) — 획을
      // 긋는 내내 울리면 소리가 아니라 잡음이 된다. 화면 쪽은 소리를 모른다.
      onStroke: () => audio.play('brush'),
    })
    return flow.state
  }

  // G 회수 비트(설계서 §5.G) — 종로의 추이와 무위영의 가마. 시계는 없다.
  // 추이는 지금 막까지의 것만 보여 준다 — 학생이 지나온 만큼만 보인다.
  // 다 보고 나면 beat.grantCard 를 자기 눈으로 본 것으로 친다 — 그 지급은 playBeat() 이 한다.
  async function playOuting(beat) {
    flow.setPhase('beat')
    hint.hidden = true
    audio.play('open')
    await ration.open({
      market: {
        ...beat.market,
        series: riceSeriesUpTo(flow.actIndex + 1),
        riceText: riceLabel(flow.state.riceIndex),
      },
      ration: beat.ration,
    })
    audio.play('close')
    return flow.state
  }

  // 탈출 비트(설계서 §5.C2) — 고른 것은 깃발에 남는다. 이 고름은 역사를 바꾸지 않는다: 왕비는
  // 어느 쪽을 골라도 궁을 빠져나가 장호원으로 간다(설계서 7.6). 남는 것은 「임금이 무엇을
  // 시켰는가」이고, 4단계 엔딩의 기록이 그것을 되돌려 준다. 시계는 없다 — 촉박은 대조전에
  // 닿는 순간 끝났다.
  async function playEscape(beat) {
    flow.setPhase('beat')
    hint.hidden = true
    const picked = await escape.open(beat.view)
    const flags = { ...flow.state.flags }
    for (const [stepId, optionId] of Object.entries(picked)) flags[`escape.${stepId}`] = optionId
    flow.state = { ...flow.state, flags }
    // saveGame() 을 여기서 부르지 않는다(CRITICAL 1, playBrush·playOuting 과 같은 이유) —
    // runBeats() 가 advance() 뒤에 한 번만 저장한다. (계획서 조각은 존재하지 않는 safeSave()
    // 를 불렀다 — 「서 있는 지시」에 따라 지금 파일의 saveGame() 규약을 따른다.)
    return flow.state
  }

  // 국상 비트(설계서 §7.6) — 조건이 붙지 않는다. 두 경로가 모두 지나간다.
  // 실록에 임금이 6월 14일에 직접 의복장을 하교한 기사가 있기 때문이다(판정 R11).
  // 성공한 학생은 이 자리에서 자기 플레이가 실록과 어긋나는 지점을 만난다 —
  // 실패해도 역사가 안 바뀌듯, 성공해도 안 바뀐다.
  async function playEdict(beat) {
    flow.setPhase('beat')
    hint.hidden = true
    // 국상 — 북 한 번. 이 화면에서 딱 한 번만 울린다.
    audio.play('drum')
    await edict.show(beat.view)
    if (beat.flag) flow.state = { ...flow.state, flags: { ...flow.state.flags, [beat.flag]: true } }
    // saveGame() 을 여기서 부르지 않는다 — 위 playEscape 와 같은 이유(CRITICAL 1).
    return flow.state
  }

  // 태블릿에는 Shift 키가 없다(2단계 최종 리뷰 CRITICAL 2 부속) — attachControls() 가
  // 태블릿 단추를 붙일 때 쓰는 것과 같은 판정(isCoarse)을 그대로 재사용해, 촉박 비트의
  // 안내문이 실제로 이 기기에서 참인 말만 하게 한다.
  function rushControlHint() {
    return isCoarse()
      ? '화면 아래 붉은 판을 누르면 목적지까지 달아난다. 바닥을 짚어 직접 걸어가도 된다.'
      : 'Shift 를 눌러 달린다. 화면 아래 붉은 판을 누르면 목적지까지 달아난다.'
  }

  // 촉박 비트(C1 등) — 불이 방을 하나씩 삼키는 제한 시간. 판정은 프레임 루프 안에서
  // performance.now() 로만 한다(전역 제약, fire-rush.js·rush-scene.js 가 시간만 본다) —
  // 여기서 setInterval 폴링을 쓰지 않는다. 실패(caught)해도 게임 오버 화면은 없다 —
  // beat.caughtFlag 한 줄만 flags 에 남기고 다음 비트로 그대로 넘어간다(설계서 5장 C1).
  function playRush(beat) {
    return new Promise(resolve => {
      flow.setPhase('beat')
      hint.hidden = true
      const intro = { ...beat.intro, lines: [...(beat.intro.lines ?? []), rushControlHint()] }
      guide.set('글을 읽고 「다음」을 누르세요. 그다음 서둘러 달아납니다.')
      noteScreen.show(intro).then(() => {
        guide.set(guideForBeat(beat))
        const def = PALACES[flow.state.palace]
        const from = def.rooms.find(r => r.id === beat.spawnRoom)
        if (from) {
          ctx.player.position.set(from.x, 1.9, from.z)
          flow.state = { ...flow.state, room: from.id }
        }
        flow.setPhase('rush')
        rushFire = beat.fire === true
        session = startRush({
          track: beat.track,
          totalMs: rushDurationMs(beat.totalMs, isTouchDevice()),
          goalRoom: beat.goalRoom,
          now: performance.now(),
        })
        resolveRush = (outcome) => {
          const caught = outcome === 'caught'
          banner(root, caught ? beat.onCaught : beat.onArrive)
          if (caught && beat.caughtFlag) {
            flow.state = { ...flow.state, flags: { ...flow.state.flags, [beat.caughtFlag]: true } }
          }
          flow.setPhase('beat')
          hint.hidden = true
          resolve(flow.state)
        }
      })
    })
  }

  // 조작권 D 장면(설계서 §7 5막 비트 2·3) — 궁은 그대로 보이는데 걸음이 안 나간다.
  //
  // 국면을 'rush' 로 둔다. 그 국면은 「3D 세계와 걷기는 도는데 탐색 UI(힌트·해질녘
  // 판정)는 안 도는 상태」이고, 이 장면에 필요한 것이 정확히 그것이다. step() 은 매
  // 프레임 돌지만 control 이 'D' 라 첫 문장에서 되돌아온다(1단계 보증) — 그래서
  // 입력을 막지 않고 「막히는 것을 보여 준다」. 'day' 로 두면 E·Q 와 해질녘 판정까지
  // 살아나므로 쓰지 않는다. session 은 null 이라 촉박 판정 블록은 그냥 지나가고
  // 미니맵에도 붉은 전선이 안 뜬다 — 이 장면은 촉박이 아니다.
  //
  // beat.control 은 runBeats 의 applyBeat 가 이미 'D' 로 바꿔 두었다.
  function playHold(beat) {
    return new Promise(resolve => {
      flow.setPhase('rush')
      hint.hidden = true
      wasPressing = false
      tapTarget = null; tapRoute = []; autoWalk = false   // 앞 장면에서 남은 탭 목표를 들고 들어오지 않는다
      holdSession = hold.open(beat.view, {
        onPress: () => audio.play('deny'),   // 「눌렀는데 안 된다」를 귀로도 알린다
        onOffer: () => audio.play('door'),   // 뒤에서 문이 닫힌다
      })
      holdSession.promise.then(() => {
        holdSession = null
        flow.setPhase('beat')
        resolve(flow.state)
      })
    })
  }

  function playCouncil(beat) {
    return new Promise(resolve => {
      // 문으로 알현을 마치면 임금은 마당에 있다. 회의는 이어하기 때도 어좌 앞에서 연다.
      const def = PALACES[flow.state.palace]
      const room = roomOf(def, beat.room ?? def.councilRoom)
      const king = kingSpot(room)
      ctx.player.position.set(king.x, ctx.player.position.y, king.z)
      flow.state = { ...flow.state, room: room.id, blocked: null }
      flow.setPhase('council')
      dialog.close()
      // 수렴청정의 발은 어전회의 위에도 그대로 남을 수 있다 — beat.veil 이 이를 정한다
      hint.hidden = true
      saveGame(flow.state)   // 막이 넘어가는 시점
      audio.play('open')
      council.open(flow.state, beat, (choiceId, reason) => {
        // 편경 한 소리. 이 게임에서 가장 중요한 소리다 — 임금이 무엇을 정했다는 표시다.
        // 다만 얼어붙은 회의에서는 울리지 않는다(판정 R95) — 무엇을 낼지는 councilSound() 가 정한다.
        audio.play(councilSound(choiceId))
        flow.state = {
          ...flow.state,
          decisions: [...flow.state.decisions, { actIndex: flow.actIndex, choiceId, reason }],
        }
        // 여기서 다시 saveGame() 을 부르지 않는다 — beatIndex 가 아직 이 회의 비트를
        // 가리키는 채로 저장하면, 그 저장을 이어받는 순간 이 회의가 새로 돌아 결정이
        // 두 번 쌓인다(CRITICAL 1). runBeats() 가 advance() 뒤에 한 번만 저장한다.
        resolve(flow.state)
      },
      // 잠긴 선택지를 눌렀다 — 「읽지 않아서 말할 수 없다」를 소리로도 알린다.
      // 이 소리는 아무것도 바꾸지 않는다: 눌러도 여전히 고를 수 없다.
      () => audio.play('deny'))
    })
  }

  // 훈령 비트 — 강화도로 가는 신헌에게 무엇을 적어 보낼지, 여러 줄을 담아 보낸다.
  // 어전회의와 달리 하나만 고르는 게 아니다. 판정은 evaluateChoices() (council.js, 잠금)를
  // 그대로 재사용한다 — 읽은 사료만큼 문구가 열린다는 규칙을 여기서 새로 만들지 않는다.
  // 한 줄도 안 고르고 보낼 수 있다 — 보내지 않는 것도 결정이다.
  async function playOrders(beat) {
    flow.setPhase('beat')
    dialog.close()
    hint.hidden = true
    saveGame(flow.state)
    audio.play('open')
    const { picked, reason } = await orders.open(flow.state, beat)
    audio.play('close')
    const flags = { ...flow.state.flags }
    for (const id of picked) flags[`orders:${id}`] = true
    flow.state = {
      ...flow.state,
      flags,
      decisions: [...flow.state.decisions, {
        actIndex: flow.actIndex,
        choiceId: `orders:${picked.join('+') || 'none'}`,
        reason,
      }],
    }
    // 회의와 같은 이유로 여기서 saveGame() 을 다시 부르지 않는다(CRITICAL 1) —
    // runBeats() 가 advance() 뒤에 한 번만 저장한다.
    return flow.state
  }

  // 비트 하나를 재생한다. 카드를 쥐여 주는 것은 화면을 다 본 뒤 여기 한 자리에서 한다 —
  // 비트 종류에 달려 있지 않다(scenario.js 의 applyGrant, systems/branch.js 의 dryRun()이
  // 부르는 바로 그 함수다). 예전에는 playBrush()·playOuting() 안에서만 줬고, 그래서
  // kind:'note' 인 4막의 제물포 조약 제4관과 「속방」 두 장이 게임 안에서 얻을 길이
  // 없었다 — 두 장 다 어느 궁의 pickups 에도 없기 때문이다. dryRun() 은 종류를 안
  // 가리고 줘서 시험은 초록불이었다. 이제 두 모듈이 같은 함수를 부른다.
  // saveGame() 은 여기서 부르지 않는다(CRITICAL 1) — runBeats() 가 advance() 뒤에 한 번만.
  // 나들이(stop)는 runBeats 를 거치지 않고 runStop() 에서 곧장 이 함수로 들어온다 —
  // 그래서 지급이 runBeats 가 아니라 여기 있어야 한다.
  async function playBeat(beat) {
    const after = await playBeatScreen(beat)
    // 「이 비트가 무엇을 주는가」를 여기서 되묻지 않는다. 한때 이 자리에
    // `if (!beat.grantCard) return after` 가 있었고, 그 한 줄이 규칙의 두 번째 사본이었다 —
    // 알현 비트가 visitors[].grantCards 로 주기 시작하자 그 문지기가 문서 두 장을
    // 통째로 삼켰다(화면에는 카드가 떴는데 사초함에는 없었고, 어전회의 선택지가
    // 하나로 줄었다). applyGrant() 는 줄 것이 없으면 상태를 그대로 돌려준다.
    flow.state = applyGrant(after, beat)
    return flow.state
  }

  async function playBeatScreen(beat) {
    activeBeat = beat
    guide.set(guideForBeat(beat))
    // 직전 장면의 탭 목표로 새 장면이 저절로 걷기 시작하지 않게 한다.
    acc = 0
    tapTarget = null; tapRoute = []; autoWalk = false
    input.tap()
    flow.state = { ...flow.state, blocked: null }
    // 바닥 소리를 바꾸는 자리는 여기 하나다 — 비트(=화면) 하나에 한 번.
    // 매 프레임 부르면 0.6초 페이드가 겹쳐 잠깐 두 겹으로 들린다.
    audio.setAmbient(ambientForBeat(beat))
    bgm.set(bgmForBeat(beat))
    ctx.setMood(moodForBeat(beat, flow.actIndex))
    // 발은 세계에 걸린 물건이다(render/palace.js). 화면 위 판이 아니라 인정전
    // 어좌 앞에 늘어뜨린 것이라, 임금이 걸어 나가면 뒤에 남는다.
    // 이 비트의 해로 임금을 다시 세운다. 한 막 안에서도 해가 넘어간다(이어 비트) —
    // 2막은 1866년에 시작해 1871년에 끝나고, 그 사이 임금은 열다섯에서 스물이 된다.
    ctx.setYear?.(yearAtBeat(flow.act(), flow.state.beatIndex))
    ctx.setKingAge({ ...kingLookAt(yearAtBeat(flow.act(), flow.state.beatIndex)),
      attire: kingAttireAt(flow.act(), flow.state.beatIndex, flow.state.palace) })
    if (beat.veil === true) { ctx.setVeil(true); sullyeom.show() }
    if (beat.veil === false) { ctx.setVeil(false); sullyeom.hide() }
    switch (beat.kind) {
      case 'note':    flow.setPhase('beat'); await noteScreen.show(beat); return flow.state
      case 'explore': return await playExplore(beat)
      case 'audience': return await playAudience(beat)
      case 'procession': return await playProcession(beat)
      case 'council': return await playCouncil(beat)
      case 'move':    return await playMove(beat)
      case 'dispatch': return await playDispatch(beat)
      case 'plunder': return await playPlunder(beat)
      case 'salvage': return await playSalvage(beat)
      case 'orders':  return await playOrders(beat)
      case 'brush':   return await playBrush(beat)
      case 'rush':    return await playRush(beat)
      case 'hold':    return await playHold(beat)
      case 'outing':  return await playOuting(beat)
      case 'escape':  return await playEscape(beat)
      case 'edict':   return await playEdict(beat)
      default:
        throw new Error(`아직 구현하지 않은 비트 종류: ${beat.kind} (${beat.id})`)
    }
  }

  // 막이 끝난 뒤: 이 막의 끝 화면(읽은 문서·「내 기록 복사」)을 먼저 보여준다 — 마지막
  // 막이라고 건너뛰지 않는다, 그 화면의 복사 단추가 이 막까지의 전체 기록을 담기 때문이다.
  // 그다음 막이 남아 있으면 다음 막으로, 마지막이면 1차시 전체를 정리하는 마침 화면으로 간다.
  async function finishAct() {
    // 막이 끝난 화면은 글 화면이다 — 바닥 소리를 끈다.
    audio.setAmbient(null)
    guide.hide()
    // 이 막에서 남긴 여러 결정(어전회의·훈령) 중 가장 나중 것의 「남긴 말」을 보여준다
    const decision = [...flow.state.decisions].reverse().find(d => d.actIndex === flow.actIndex)
    const reason = decision?.reason ?? ''
    await showActEnd(reason)
    if (flow.isLast()) {
      flow.setPhase('done')
      // clearSave() 를 여기서 부르지 않는다(2단계 Important 2) — 예전엔 곧바로 지운
      // 뒤 복사 단추도 없는 화면을 보여줘, 다음 단추를 한 번 누르면 학생의 유일한
      // 기록 통로가 영영 사라졌다. 이제 이 화면 자체가 복사 단추를 낸다(onCopy) —
      // 저장은 학생이 「처음부터」를 직접 고를 때(pause.onRestart)만 지운다.
      await actEnd.showFinal(flow.state, () => copyRecord())   // 마지막 화면이다. 이 Promise 는 풀리지 않는다
      return
    }
    flow.nextAct()
    await playAct(flow.actIndex)
  }

  // resumeMidBeat 가 참이면 지금 beatIndex 의 비트는 이미 이전 세션에서 들어간 비트다 —
  // applyBeat 를 다시 먹이면 낮 칸수 등이 처음 상태로 되돌아간다. 재생만 이어 한다.
  async function runBeats({ resumeMidBeat = false } = {}) {
    const act = flow.act()
    let skipApply = resumeMidBeat
    while (!isActOver(flow.state, act)) {
      const beat = beatAt(act, flow.state.beatIndex)
      // 조건이 안 맞는 비트는 재생하지 않는다. 번호만 넘기고, applyBeat 도 저장도 하지
      // 않는다 — 갈리는 것은 「무엇을 보는가」이지 「어디까지 왔는가」가 아니다(설계서 7.6).
      // beatEntered 를 false 로 두는 것이 중요하다: 이 비트에는 들어간 적이 없으므로
      // 여기서 저장된 기록을 이어받아도 resumeMidBeat 가 참이 되면 안 된다.
      if (!isBeatActive(flow.state, beat)) {
        flow.state = { ...advance(flow.state), beatEntered: false }
        skipApply = false
        // 여기서도 저장은 advance() 뒤다 — 아래 CRITICAL 1 과 같은 이유.
        saveGame(flow.state)
        continue
      }
      prevPalace = flow.state.palace   // applyBeat 가 palace 를 덮어쓰기 전의 값 — playMove() 가 쓴다
      // beatEntered — state 에 얹는 값이다(state.js 는 잠금이라 여기서 새 필드를
      // 선언한다; loss-log.js 의 lostBy 와 같은 판단, deserialize() 는 version 만
      // 본다). "지금 비트에 이미 applyBeat 를 먹였다"만 기억한다 — 이어하기가 이
      // 값을 보고 다시 먹일지 말지를 정확히 가른다. resumeMidBeat 를 beatIndex 나
      // 비트 종류로 추측하면 어긋난다: advance() 뒤 저장은 항상 "아직 안 들어간
      // 새 비트"를 가리키지만, 문서를 줍거나 Esc 로 저장할 때는 "이미 들어와서
      // 낮을 쓴 그 비트"를 가리킨다 — 겉보기 beatIndex 만으로는 둘을 구분 못 한다.
      if (!skipApply) flow.state = { ...applyBeat(flow.state, beat), beatEntered: true }
      // 버그 D — 'explore' 비트도 자기 palace 를 정할 수 있다(3막 walk-out: 불탄 경복궁).
      // 예전엔 'move' 비트만 palace 를 바꿨고 playMove() 가 그때마다 bindPalaceAndSpawn() 을
      // 직접 불렀다. 3막부터는 그 가정이 깨진다 — applyBeat() 가 state.palace 를 이미
      // gyeongbok_burnt 로 바꿔도, 아무도 ctx.setPalace() 를 다시 안 부르면 씬은 예전 궁을
      // 그대로 보여준다(HUD 글자만 「경복궁 (불탄 뒤)」로 바뀌고 근정전은 안 타 있다).
      // 어떤 비트든 palace 가 실제로 바뀌면 여기서 한 번에 다시 세운다 — playMove() 의
      // 호출은 남겨 두어도 flow.syncPalace() 가 같은 궁이면 그냥 넘어가므로 안전하다.
      // 이어(移御)는 화면이 먼저다 — 씬만 조용히 갈아 끼우고, 문소리는 그 화면이
      // 닫힌 뒤 playMove() 가 부르는 두 번째 호출이 낸다.
      if (flow.state.palace !== prevPalace) bindPalaceAndSpawn(beat.kind === 'move')
      if (beat.dateLabel) dateLabel = beat.dateLabel
      skipApply = false
      flow.state = await playBeat(beat)
      // CRITICAL 1 — 저장은 advance() 뒤에만 한다. beatIndex 가 이미 다음 비트를
      // 가리키는 채로 저장돼야, 이어하기가 방금 끝낸 비트(어전회의·훈령·약탈·소실·
      // 친필)를 다시 돌리지 않는다. 예전엔 각 play*() 안에서 효과를 만든 直後(비트
      // 안, beatIndex 는 아직 그대로)에 저장했다 — 그 저장을 이어받으면 같은 비트가
      // 새로 돌아 결정이 두 번 쌓이거나(어전회의·훈령), 이미 줄어든 held 를 다시
      // 읽어 taken 이 텅 비거나(약탈), 이미 셋만 남은 held 를 두고 다시 고르라고
      // 묻는다(소실). 그런 자리의 saveGame() 은 모두 지웠다 — 여기 하나로 합친다.
      // beatEntered 를 false 로 되돌린다 — 다음 비트는 아직 안 들어갔다
      flow.state = { ...advance(flow.state), beatEntered: false }
      // ⛔ 이 줄은 advance() **뒤**다. 앞으로 옮기지 마라(판정 R99).
      //    beatIndex 가 아직 이 비트를 가리키는 채로 저장하면, 이어받는 순간 방금
      //    끝낸 비트가 다시 돌아 결정이 두 번 쌓이고(어전회의·훈령), 이미 줄어든
      //    held 로 약탈을 다시 셈하고, 셋만 남은 사초함을 두고 또 세 장을 고르라고
      //    묻는다. 2단계가 그 증상을 실제로 겪고 고친 자리다.
      //    tests/resume-safety.test.js 의 대조군이 「앞에서 저장하면 어전회의가
      //    중복된다」를 재현해 두었고, 같은 파일의 검사가 이 순서를 소스로 붙든다.
      saveGame(flow.state)
    }
    await finishAct()
  }

  async function playAct(actIndex) {
    flow.state = enterAct(flow.state, ACTS[actIndex], actIndex)
    // G 물가 — 막이 바뀔 때 조용히 오른다. 절대 수치는 화면에 내지 않는다(prices.js)
    flow.state = advancePrices(flow.state, actIndex + 1)
    dateLabel = flow.act().dateLabel
    bindPalaceAndSpawn()
    // 막마다 「이 막에서 할 일」 한 장 — 무엇이 일어나고 무엇을 하는지 먼저 말한다(data/guide.js).
    guide.hide()
    await noteScreen.show(actGuideView(ACTS[actIndex], actIndex))
    await runBeats()
  }

  // 저장된 곳까지 발이 올라가 있었는지, 지나온 비트들을 되짚어 안다 — 새로 실행된
  // 이 세션은 sullyeom 을 아직 한 번도 부르지 않았기 때문이다
  function veilAtBeat(act, beatIndex) {
    let veil = false
    for (let i = 0; i < beatIndex; i++) {
      const b = beatAt(act, i)
      if (!isBeatActive(flow.state, b)) continue
      if (b?.veil === true) veil = true
      else if (b?.veil === false) veil = false
    }
    return veil
  }

  // 이어하기가 나들이 한가운데를 지날 때 — 무엇이 옳은가.
  //
  // 학생은 이미 값을 치렀다(해 3칸). 그 값으로 사는 것은 종로·무위영 **화면**이고,
  // 겨와 모래 카드는 그 화면을 본 결과다. 그러므로 옳은 것은 둘 중 하나다 —
  // 치른 값을 돌려주거나, 못 본 화면을 다시 열어 주거나. 값을 돌려주는 쪽은 안 된다:
  // 「하루는 모자라야 한다」가 4막의 산술이고(궁 안 5칸 + 나들이 3칸 = 8칸, 하루는
  // 6칸), 되돌리면 새로고침이 해를 버는 길이 된다. 그래서 **화면을 다시 열어 준다.**
  // 학생이 낸 것을 그대로 받는다 — 카드는 playBeat() 이 늘 하던 자리에서 준다.
  //
  // 다시 열 때 spend() 를 타지 않는다는 것이 중요하다 — stop.<id> 는 이미 서 있고,
  // 여기서는 화면과 지급만 한다.
  async function resumePendingStop() {
    const stopId = pendingStopId(flow.state)
    if (!stopId) return
    const stop = stopById(flow.act(), stopId)
    // 그 막에 없는 나들이가 밀려 있으면(데이터가 바뀐 옛 세이브) 표시만 걷어 낸다 —
    // 없는 화면을 열려다 이어하기 자체가 멈추는 것이 가장 나쁘다.
    if (stop) flow.state = await playBeat(stop.beat)
    flow.state = markStopDone(flow.state, stopId)
    saveGame(flow.state)
  }

  // 이어하기의 나머지 절반 — 화면 쪽이다. 순수한 절반(상태·막 번호·taken)은
  // flow.restoreSession() 이 진다(판정 R60). 새 이어하기 지식은 둘 중 하나에 들어가야 하고,
  // 어느 쪽도 아닌 자리에 적으면 아무 시험도 울지 않는다 — 알려진 빈틈이다(판정 R64).
  async function resumeAct() {
    bindPalaceAndSpawn()
    dateLabel = dateLabelAtBeat(flow.act(), flow.state.beatIndex)
    // 이 막이 이미 끝난 상태로 저장되었으면(beatIndex 가 비트 배열 끝을 넘었으면)
    // 다시 묻지 않고 막 끝 화면부터 잇는다. 예전엔 「이 막에 결정이 하나라도
    // 있으면」으로 판정했는데, 3막부터는 한 막 안에 결정이 둘(훈령·어전회의)이라
    // 첫 결정만 나도 나머지 비트(어전회의·대화재·이어)를 통째로 건너뛰는 버그였다.
    if (isActOver(flow.state, flow.act())) {
      await finishAct()
      return
    }
    if (veilAtBeat(flow.act(), flow.state.beatIndex)) { ctx.setVeil(true); sullyeom.show() }
    // 나들이 한가운데서 끊긴 세션 — 낮 안으로 돌아가기 전에 못 본 화면부터 다시 연다
    await resumePendingStop()
    // CRITICAL 1 을 고치며 딸려 온 함정 — runBeats() 는 이제 advance() 뒤에만 저장하므로,
    // 이어하기 시점의 beatIndex 는 거의 언제나 아직 시작하지 않은 새 비트를 가리킨다.
    // resumeMidBeat 를 예전처럼 항상 true 로 두면 그 새 비트의 applyBeat() 를 통째로
    // 건너뛰어, 막 들어온 비트의 palace·control 이 서지 않는다(예: 「친정」 doors-open
    // 이 조작권을 A 로 올리는 것을 이어하기가 놓친다). beatIndex 나 비트 종류만 보고
    // 짐작하면 어긋난다 — 'explore' 비트라도 이번 세션에서 막 도착해 한 번도 안
    // 들어간 것일 수 있고(그러면 dayUnits 를 반드시 다시 먹여야 한다), 문서를 줍거나
    // Esc 로 저장한 것일 수도 있다(그러면 건너뛰어야 쓴 낮이 되살아나지 않는다). 그래서
    // state.beatEntered 를 그대로 믿는다 — runBeats() 가 이 비트에 실제로 applyBeat 를
    // 먹였을 때만 true 로 남긴 값이다.
    await runBeats({ resumeMidBeat: flow.state.beatEntered === true })
  }

  // 여정 판을 누르면 이 낮의 나가는 방으로 걸어간다 — 문 앞을 먼저 짚고 전각 안으로 들어간다.
  // 방은 앞면(+z) 가운데로만 드나들어서(palaces.js doorsOf) 곧장 방 한가운데를 짚으면 뒷벽·옆벽에 막힌다.
  function walkToObjective() {
    if (flow.phase !== 'day' || pause.isOpen() || dialog.isOpen() || speak.isOpen()) return
    const route = objectiveRoute(PALACES[flow.state.palace], currentExit()?.room,
      { x: ctx.player.position.x, z: ctx.player.position.z }, flow.state.control)
    if (!route.length) { banner(root, '이미 그곳에 있다 — E 를 누르세요', 1800); return }
    tapTarget = route.shift()
    tapRoute = route
    autoWalk = true
  }

  // 촉박 장면 — 붉은 판을 누르면 목적지 방으로 달린다(2026-09-15 선생님: 「촉박 장면도 패드로 쉽게」).
  // 판정은 그대로다: 시간 안에 목적지 방에 들어가야 한다. 길만 찾아 준다.
  function runToGoal() {
    if (flow.phase !== 'rush' || !session || pause.isOpen()) return
    const route = objectiveRoute(PALACES[flow.state.palace], activeBeat?.goalRoom,
      { x: ctx.player.position.x, z: ctx.player.position.z }, flow.state.control)
    if (!route.length) return
    tapTarget = route.shift()
    tapRoute = route
    autoWalk = true
  }

  // 탭 목표를 향해 매 스텝 axisToward 로 계산한 축을 step() 에 그대로 먹인다 —
  // 두 번째 이동 경로를 만들지 않는다. 이동 키를 누르면 탭 목표는 즉시 지운다
  function inputForStep() {
    const kb = input.axis()
    if (kb.x !== 0 || kb.z !== 0) {
      tapTarget = null; tapRoute = []; autoWalk = false
      return { axis: () => ctx.worldAxis(kb), running: () => input.running() }
    }
    if (tapTarget) {
      const a = axisToward(ctx.player.position.x, ctx.player.position.z, tapTarget)
      if (a.x === 0 && a.z === 0) {
        tapTarget = tapRoute.shift() ?? null
        if (!tapTarget) autoWalk = false
        return input
      }
      // 촉박 장면에서 판을 눌러 달아나는 중이면 달린다.
      return { axis: () => a, running: () => autoWalk && flow.phase === 'rush' }
    }
    return input
  }

  let acc = 0
  let lastBlockedBannerAt = -Infinity
  let last = performance.now()

  function frame(now) {
    if (!running) return
    const dt = now - last
    last = now
    bgm.tick(now)
    // 말하는 도중에 소리를 끄면 그 말도 그 자리에서 멈춘다(대화판은 글자를 마저 찍는다).
    if (voice.isPlaying() && audio.isMuted()) voice.silence()
    // 도착 Promise는 이 프레임이 끝난 뒤 이어진다. 아래에서 audienceWalk를 비워도
    // 그 마지막 프레임까지 멈춰야 신하의 실제 자리와 퇴장 출발점이 어긋나지 않는다.
    const audienceWasWalking = audienceWalk !== null

    // 「?」는 궁을 걸어 다니는 동안에만 띄운다. 어전회의·촉박 같은 다른 화면 위에
    // 떠 있으면 누를 수 없는 자리에 있거나(전면 판 아래) 제한 시간을 흘려보낸다.
    if (helpBtn) {
      const wantHidden = flow.phase !== 'day'
      if (helpBtn.hidden !== wantHidden) helpBtn.hidden = wantHidden
    }

    // 조작권 D 장면(Task 12) — **국면 관문 밖이다.** 안에 넣으면 국면이 어떤 까닭으로든
    // 'day'/'rush' 가 아니게 되는 순간 시계가 멈추고 나갈 단추가 영영 안 나온다. 조작권이
    // 떨어져 방에 갇히는 결함을 한 번 겪었으므로(4막 대원군 재집권), 여기서는
    // 「빠져나갈 길」을 좌표의 우연이 아니라 자리로 보장한다. holdSession 이 null 인
    // 평소에는 이 블록이 통째로 지나간다.
    if (holdSession) {
      // 누르고 있는 동안이 아니라 「새로 누른 순간」만 센다 — 키를 붙잡고 있으면
      // 프레임마다 세어져 프레임 수가 장면 길이를 바꾼다. 그것이 이 게임이 피하는 바로 그것이다.
      const a = input.axis()
      const pressing = a.x !== 0 || a.z !== 0
      if (pressing && !wasPressing) holdSession.press()
      wasPressing = pressing
      // 태블릿에는 자판이 없다. 짚는 것이 여기서는 걸음이 아니라 「눌러 봤다」다 —
      // 여기서 삼켜야 tapTarget 에 목표가 남아 장면이 끝난 뒤 왕이 혼자 걸어가지 않는다.
      if (input.tap()) holdSession.press()
      holdSession.tick(now)
    }

    // 알현 — 사람이 걸어 들어오고 물러난다. 이것도 시간으로 잰다(프레임 수가 아니다):
    // 성능 좋은 기계에서만 신하가 빨리 걸으면 그 자체가 이 게임이 피하는 결함이다.
    if (audienceWalk) {
      const w = audienceWalk
      if (w.followRoom) {
        const k = { x: ctx.player.position.x, z: ctx.player.position.z }
        w.to = visitorSpotFor(w.followRoom, k)
        w.lookAt = k
      }
      const u = (now - w.t0) / w.ms
      const p = walkAt(w.from, w.to, u)
      ctx.placeNpc(w.id, { x: p.x, z: p.z, yaw: yawToward(w.from, w.to), walking: u < 1 })
      if (u >= 1) {
        audienceWalk = null
        // 다 왔으면 바라볼 곳을 보고 선다 — 임금 앞에 와서 뒤통수를 보이지 않게.
        if (w.lookAt) ctx.placeNpc(w.id, { x: p.x, z: p.z, yaw: yawToward(p, w.lookAt) })
        w.resolve()
      }
    }

    // 행렬 — 임금이 이끌려 간다. 학생은 조종하지 않는다: 자리와 시간이 정해져 있다.
    // 걸음 애니메이션·발소리·바라보는 방향은 자리가 실제로 바뀌면 씬이 알아서 낸다
    // (render/scene.js updateKingMotion 이 위치 차이만 본다).
    if (procession) {
      const pr = procession
      const u = (now - pr.t0) / pr.ms
      const p = walkAt(pr.from, pr.to, u)
      ctx.player.position.x = p.x
      ctx.player.position.z = p.z
      flow.state = { ...flow.state, room: roomAt(PALACES[flow.state.palace], p.x, p.z)?.id ?? null }
      const yaw = yawToward(pr.from, pr.to)
      const def = PALACES[flow.state.palace]
      for (const e of pr.escort) {
        const at = escortSpot(def, p, e)
        ctx.placeNpc(e.npc, { x: at.x, z: at.z, yaw, walking: u < 1, smooth: true })
      }
      if (u >= 1) {
        procession = null
        for (const e of pr.escort) ctx.placeNpc(e.npc, { walking: false })
        pr.resolve()
      }
    }

    // 알현 중에 임금이 움직이려 하면 곁에 선 사람이 막는다. 걸음은 여기서 일어나지
    // 않는다(아래 블록이 'day'·'rush' 에서만 돈다) — 여기서는 「눌렀다」만 읽는다.
    // 태블릿의 짚기(tap)도 같이 읽는다: 안 읽으면 짚어도 아무 말이 없어 「고장」으로 읽힌다.
    // 행렬은 조종하지 않는다 — 누르면 데려가는 사람이 말린다(예전 그대로).
    if (flow.phase === 'audience' && audienceBeat?.kind === 'procession') {
      const a = input.axis()
      const tapped = input.tap()
      if ((a.x !== 0 || a.z !== 0 || tapped) && now - lastRebukeAt >= REBUKE_MS) {
        lastRebukeAt = now
        rebuke()
      }
    }
    // 알현은 전각 **안에서는** 걷는다(선생님 요청 2026-09-13). 문을 넘으려 하면 곁에 선 사람이
    // 비트의 blockLine 으로 막고, 아룀이 다 끝나 문이 열리면 문으로 걸어 나가는 것으로 끝난다.
    // 누가 걸어 들어오거나 말하는 동안에는 걸음을 멈춘다 — 대화판이 뜬 채로 임금이 돌아다니지 않게.
    if (flow.phase === 'audience' && audienceBeat && audienceBeat.kind === 'audience') {
      const tapped = input.tap()
      // 멈추는 때: 대화판·사초·멈춤 화면이 떠 있을 때, 신하가 **물러나는** 걸음(따라오지 않는 걸음),
      // 그리고 걸어오던 신하가 막 도착한 그 한 프레임(도착 자리와 다음 아룀의 자리가 갈리지 않게).
      // 신하가 **걸어 들어오는 동안에는 걷는다** — 신하가 임금을 따라오고(followRoom), 이 틈이 있어야
      // 아룀이 끝나기 전에 문밖으로 나가려다 막히는 순간이 생긴다(선생님 요청 2026-09-13).
      const justArrived = audienceWasWalking && !audienceWalk
      const busy = justArrived || (audienceWalk && !audienceWalk.followRoom) ||
        speak.isOpen() || dialog.isOpen() || pause.isOpen()
      if (busy) {
        acc = 0
        tapTarget = null; tapRoute = []; autoWalk = false
        if (flow.state.blocked) flow.state = { ...flow.state, blocked: null }
      } else {
        if (tapped) {
          const p = ctx.pickGround(tapped.x, tapped.y)
          if (p) { tapTarget = p; tapRoute = []; autoWalk = false }
        }
        const def = PALACES[flow.state.palace]
        const roomId = audienceBeat.room ?? def.councilRoom
        acc = Math.min(acc + dt, FIXED_MS * MAX_STEPS)
        let steps = 0
        while (acc >= FIXED_MS && steps < MAX_STEPS) {
          flow.state = step(ctx, inputForStep(), flow.state, FIXED_MS, { confineRoom: audienceExitOpen ? null : roomId })
          acc -= FIXED_MS
          steps++
        }
        if (String(flow.state.blocked ?? '').startsWith('confine:') && now - lastRebukeAt >= REBUKE_MS) {
          lastRebukeAt = now
          rebuke()
        }
        if (audienceExitOpen && audienceLeft(def, roomId, ctx.player.position.x, ctx.player.position.z)) {
          resolveAudience?.()
        }
      }
    }

    // 걷기는 'day'(탐색)와 'rush'(촉박) 국면 둘 다에서 일어난다 — 촉박 중에도
    // step() 이 쓰는 같은 고정 스텝 누적기를 그대로 타야 프레임이 늦어도 왕만
    // 느려지지 않는다. 탭도 마찬가지로 둘 다에서 읽는다(CRITICAL 2) — 'day' 에서만
    // input.tap() 을 불렀더니 'rush' 동안은 tapTarget 이 절대 안 갱신되어, 태블릿에서
    // 화재 탈출 90초 내내 아무 입력도 못 받고 매번 잡혔다. 힌트·해질녘 판정만
    // 'day' 고유의 것이라 거기서만 돈다.
    if (flow.phase === 'day' || flow.phase === 'rush') {
      const tapped = input.tap()
      if (tapped) {
        const p = ctx.pickGround(tapped.x, tapped.y)
        if (p) { tapTarget = p; tapRoute = []; autoWalk = false }
      }

      acc = Math.min(acc + dt, FIXED_MS * MAX_STEPS)
      let steps = 0
      while (acc >= FIXED_MS && steps < MAX_STEPS) {
        flow.state = step(ctx, inputForStep(), flow.state, FIXED_MS)
        acc -= FIXED_MS
        steps++
      }
      // 방이 바뀌었다 — 문 하나를 지났다. 프레임을 세는 것이 아니라 방 이름이
      // 실제로 달라졌을 때만 본다.
      if (lastRoom === null) lastRoom = flow.state.room
      else if (flow.state.room !== lastRoom) {
        lastRoom = flow.state.room
        audio.play('door', { gain: ROOM_DOOR_GAIN })
      }
      if (flow.state.blocked && !autoWalk && now - lastBlockedBannerAt >= BLOCKED_BANNER_MS) {
        banner(root, '임금이 갈 수 있는 곳은 정해져 있다')
        lastBlockedBannerAt = now
      }
      if (flow.phase === 'day') {
        updateHint()
        // 그날 들을 것을 다 들으면 낮이 끝난다. 아무 말 없이 화면이 넘어가면 학생은
        // 무엇 때문에 끝났는지 모른다 — 한 줄로 알린다.
        if (!activeBeat?.free && isDusk(flow.state) && resolveExplore) {
          banner(root, '오늘 들을 수 있는 것을 다 들었다', 2600)
          resolveExplore()
        }
      }
    }
    // 촉박 판정 — session.tick() 은 performance.now() 로 받은 now 하나만 보고 판정한다.
    // 불은 비트가 청할 때만 붙는다. 1873 자경전은 불이지만 1882 난군은 불이 아니고
    // 1884 청군도 불이 아니다 — 여기를 무조건으로 두면 창덕궁 마당에 불길이 솟는다
    // (3단계 Task 7).
    if (session) {
      if (rushFire) {
        ctx.fire.setSources(fireSourcesAt(PALACES[flow.state.palace], session.rush, now))
      }
      // 초침. 남은 시간을 잰 그 시계(now)를 그대로 넘긴다 — 여기서 performance.now()
      // 를 다시 부르면 두 값이 서로 다른 순간을 가리켜 초가 하나씩 빠진다.
      // 1초마다 한 번 울지, 마지막 5초에 경보로 바뀔지는 엔진이 정한다.
      const remain = remainingMs(session.rush, now)
      audio.countdown(remain, session.rush.totalMs, now)
      const goal = PALACES[flow.state.palace].rooms.find(r => r.id === activeBeat?.goalRoom)
      hud.showRush({ remainMs: remain, totalMs: session.rush.totalMs,
        label: `${goal?.name ?? '출구'}으로 이동하십시오` })
      const outcome = session.tick(now, flow.state.room)
      if (outcome !== 'running') {
        const done = resolveRush
        session = null
        resolveRush = null
        rushFire = false
        ctx.fire.setSources([])
        done?.(outcome)
      }
    }

    ctx.setCinematic(cinematicDirective({ actId: flow.act().id, beat: activeBeat,
      phase: flow.phase, control: flow.state.control, rush: session ? { fire: rushFire } : null }))
    ctx.setCrisis(stageEvent({ actId: flow.act().id, beat: activeBeat, rush: session?.rush,
      palace: PALACES[flow.state.palace], now }))
    ctx.setInteractionCues(flow.phase === 'day' ? markerPoints() : session ?
      PALACES[flow.state.palace].rooms.filter(r => r.id === activeBeat?.goalRoom)
        .map(r => ({ x: r.x, z: r.z, label: r.name, kind: 'door', urgent: true })) : [])
    ctx.render()
    if (!session) hud.hideRush()
    hud.update({
      hidden: flow.phase === 'council' || flow.phase === 'done',
      phase: flow.phase,
      objective: activeBeat?.exit?.label ?? '신하를 찾아 보고를 듣고 사료를 살펴보십시오.',
      actIndex: flow.actIndex,
      actTitle: flow.act().title,
      readCount: flow.state.sources.read.length,
      palaceName: PALACES[flow.state.palace].name,
      roomName: roomLabel(PALACES[flow.state.palace], flow.state.room),
      dateLabel,
      // 알현에서는 아뢸 것을 고를 수 없다 — 그 표시를 감춘다(ui/hud.js).
      // 문서 없는 낮(free — 운현궁)에도 감춘다: 쓸 일이 없는 여유를 띄우면 무엇을 아껴야 하나 헤맨다.
      dayLeft: (flow.phase === 'audience' || beatAt(flow.act(), flow.state.beatIndex)?.free) ? null : flow.state.dayLeft,
      dayTotal: beatAt(flow.act(), flow.state.beatIndex)?.dayUnits ?? null,
      riceIndex: flow.state.riceIndex,
    })
    flow.get('map')?.update({
      playerX: ctx.player.position.x,
      playerZ: ctx.player.position.z,
      control: flow.state.control,
      rush: session?.rush ?? null,
      pickups: markerPoints(),
      now,
    })
    requestAnimationFrame(frame)
  }

  // E/Q/멈춤 단추는 **언제나** 붙인다.
  //
  // 예전에는 isCoarse() 가 참일 때만 붙였다 — 「태블릿에는 키보드가 없으니까」.
  // 그런데 교실에는 노트북·태블릿·터치스크린 노트북이 섞여 있고, 선생님이 노트북으로
  // 시연하실 수도 있다. 그리고 실제로 선생님이 링크를 여셨을 때 「E q단추따위는 아예
  // 안 뜨고」가 첫 마디였다 — 설계대로 돌았는데도 고장으로 읽혔다.
  // 키보드가 있는 학생에게 단추가 하나 더 보이는 것은 아무 손해가 아니다.
  // 없어서 못 누르는 쪽만 수업을 멈춘다.
  function attachControls() {
    {
      touchWrap = document.createElement('div')
      touchWrap.className = 'game-controls'
      touchWrap.style.cssText =
        'position:fixed;right:12px;bottom:210px;z-index:22;display:flex;flex-direction:column;gap:12px'
      const mkTouchBtn = (label, onTap) => {
        const b = document.createElement('button')
        b.textContent = label
        b.style.cssText =
          'width:54px;height:54px;border-radius:50%;border:1px solid #3a4248;' +
          'background:#0f1113cc;color:#e0a23a;font-size:17px;font-weight:700;' +
          'touch-action:manipulation'
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onTap()
        })
        touchWrap.appendChild(b)
      }
      // 멈춤 화면이 떠 있으면 E·Q 는 먹지 않는다 — 키보드 쪽(handleKey)이 이미
      // 그렇게 한다. 태블릿만 규칙이 다르면, 멈춤 화면 뒤에서 문서가 주워진다.
      // 조작권 D 장면에서는 이 단추를 짚는 것이 「눌러 봤다」가 된다 — 무엇을 할지는
      // touchButtonAction() 이 정한다(위, 순수). 무반응으로 돌아오는 자리를 없앤다.
      const onTouchBtn = (act) => () => {
        switch (touchButtonAction({
          hold: holdSession !== null, phase: flow.phase, pauseOpen: pause.isOpen(),
        })) {
          case 'press': holdSession.press(); return
          case 'act': act(); return
          default: return
        }
      }
      mkTouchBtn('E 대화', onTouchBtn(onE))
      mkTouchBtn('Q 사초', onTouchBtn(pressQ))
      // 태블릿에는 Esc 가 없다(판정 R91). 이 단추가 없으면 학생은 수업 도중에
      // 저장할 길도, 소리를 끌 길도 없다 — 새로고침해서 타이틀로 나가는 수밖에.
      mkTouchBtn('멈춤', () => togglePause())
      root.appendChild(touchWrap)
    }

    // 한 번 보고 지나간 학생이 5분 뒤에 다시 볼 길이 있어야 한다. 미니맵(우하단)·
    // HUD(상단)·쌀값 줄(하단 가운데)·태블릿 단추(우측 210px 위)를 피해 좌하단에 둔다.
    helpBtn = document.createElement('button')
    helpBtn.textContent = '?'
    helpBtn.setAttribute('aria-label', '조작 안내')
    helpBtn.style.cssText =
      'position:fixed;left:12px;bottom:12px;z-index:26;width:38px;height:38px;border-radius:50%;' +
      'border:1px solid #3a4248;background:#0f1113cc;color:#8f8a7c;font-size:16px;' +
      'cursor:pointer;touch-action:manipulation'
    helpBtn.addEventListener('click', () => { controlsHint.show() })
    root.appendChild(helpBtn)

    addEventListener('keydown', onKey)
  }

  // 타이틀이 늘 먼저 뜬다. 예전에는 저장이 있을 때만 「이 어 서」 판이 떴고 없으면
  // 곧장 1막 글 화면부터 나왔다 — 학생이 「어전 御前」이라는 제목을 볼 자리가 브라우저
  // 탭밖에 없었다. 두 갈래의 내용은 그때 것을 그대로 옮긴 것이다.
  const savedText = readSaveText()
  const saved = loadGame()
  ctx.setPalace(PALACES[act0.palace])
  ctx.setYear?.(act0.year)
  ctx.setKingAge({ ...kingLookAt(act0.year), attire: kingAttireAt(act0, 0) })
  ctx.setNpcs(npcsAt(baseOf, act0.palace, 0))
  ctx.setCinematic(cinematicDirective({ actId: act0.id, phase: 'day' }))
  ctx.setOpeningView(true)
  function renderOpening() {
    if (!running || !title.isOpen()) return
    ctx.render()
    requestAnimationFrame(renderOpening)
  }
  title.show({
    hasSave: !!saved,
    // 못 읽는 저장을 만났을 때만 한 줄이 뜬다. 저장이 아예 없으면 빈 문자열이라
    // 처음 하는 학생의 첫 화면은 지금까지와 한 글자도 다르지 않다.
    notice: staleSaveNotice(savedText),
    audio,
    onResume: () => {
      ctx.setOpeningView(false)
      // 이어하기 지식은 flow.restoreSession() 한 곳에 있다 (판정 R60).
      // 예전에는 여기서 flow.state 를 갈아 끼우고, 저장된 actIndex 만큼 nextAct() 를
      // 다시 부르고(버그 C), held·lost 를 taken 에 손으로 채웠다(버그 A).
      // 셋 다 flow.js 안으로 들어갔다 — 새 이어하기 지식도 거기에 넣는다.
      flow.restoreSession(saved)
      attachControls()
      requestAnimationFrame(frame)
      resumeAct()
    },
    onFresh: () => {
      ctx.setOpeningView(false)
      clearSave()
      // 처음 하는 학생이다 — 걷는 법을 한 번 보여 주고 1막을 연다. 이어서 하는
      // 학생에게는 띄우지 않는다(이미 해 본 학생이다. 「?」로 언제든 다시 본다).
      controlsHint.show().then(() => {
        attachControls()
        requestAnimationFrame(frame)
        playAct(0)
      })
    },
  })

  requestAnimationFrame(renderOpening)
  return {
    flow,
    audio,   // 타이틀·멈춤의 소리 토글이 보는 바로 그 하나다
    // 바닥 소리는 이미 울리고 있다 — 끄지 않으면 화면이 다 사라진 뒤에도 계속 난다.
    dispose() {
      running = false; session = null; rushFire = false
      holdSession?.dispose(); holdSession = null   // 막 전환·종료에 이 판이 남으면 다음 화면을 덮는다
      speak.dispose()
      audio.setAmbient(null); bgm.stop(); flow.dispose()
      ctx.dispose()
    },
  }
}

// 반환값을 아무 데도 담지 않는다. 한때 globalThis 에 담아 두고 콘솔에서 들여다봤지만
// (손 시험용 임시 통로), 그것은 학생 화면에서 게임을 통째로 건너뛰는 문이기도 했다.
// 이제 다섯 막이 다 붙어 실제 진행으로 도니 통로가 필요 없다 — 살아 있는 것은
// boot() 안의 프레임 루프와 리스너뿐이고, 그것들은 이 참조 없이도 계속 돈다.
if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) boot(el)
}
