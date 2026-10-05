import { PORTRAITS } from './portraits-data.js'
import { installTypeVars } from './type-css.js'
import { evaluateChoices } from '../systems/council.js'
import {
  councilEvidenceView, councilRecord, FORECAST_NOTE, EMPTY_HAND_LINE, noteFor, eulReul,
} from '../systems/council-evidence.js'

// 어전회의 화면.
//
// 2026-09-27 선생님, 병인양요 어전회의 화면 사진과 함께: 「장계 보고 선택지에서
// 선택하고 실제 역사가 어떠했는지 확인 후 그 이유 쓰는 거 뭔가 밋밋해. 좀 더 재미있고
// 교육적인 걸로 바꿔봐. **선택 후 이유 쓰기는 다 바꿔야 할 것 같아.**」
//
// 사진에 학생이 그 글상자에 쓴 것이 남아 있었다 — 「DDDD」. 빈 글상자는 학생이 무엇을
// 했는지 묻지 않는다. 그래서 글상자를 **없앤다**(이 파일에 textarea 는 한 개도 없다).
// 대신 학생이 이미 손에 가진 것으로만 할 수 있는 두 가지를 놓는다.
//
//   ① 근거 대기 — 신하들의 말 밑에 제 사초함의 문서를 놓는다.
//   ② 예보     — 「실제로는 —」이 뜨기 전에 이 일이 무엇을 부를지 한 줄을 고른다.
//
// 그리고 마지막 화면이 학생이 한 것으로 문장 하나를 지어 준다 —
// 「당신은 『양헌수의 정족산성 장계』를 근거로 삼아 「…」 쪽으로 정했고, 「…」고 보았다.」
// 그 문장이 「내 기록 복사」의 「남긴 말」 자리에 그대로 들어간다. 문장을 짓는 것은
// systems/council-evidence.js 의 recordSentence() 하나뿐이다 — 화면과 기록이
// 어긋날 자리를 아예 두지 않는다.
//
// ── 부르는 쪽과의 약속(contract) — 바뀌지 않았다 ─────────────────────────
// createCouncil(root) → { open(state, beat, onDecide, onLocked?) }
//   onDecide(choiceId, reason) 은 **정확히 한 번** 불린다.
//     choiceId — 고른 선택지 id. 얼어붙은 회의에서는 'frozen'(main.js 의 councilSound·
//                describeDecision 이 그 값을 그대로 본다 — 예전과 같다).
//     reason   — 예전에는 학생이 글상자에 쓴 글이었고, 지금은 **학생이 한 것으로 지어진
//                문장**이다. 그릇은 그대로이므로 main.js 는 손댈 것이 없다.
//   onLocked() — 잠긴 선택지를 눌렀을 때의 소리 되먹임. 예전과 같다.
//
// ── 비트에 새로 적을 것 (선생님이 acts.js 에 채우실 자리) ─────────────────
// 둘 다 **없어도 된다**. 없으면 화면은 예전 꼴(고르고 → 실제를 본다, 글상자만 없는)로
// 물러선다. 그러므로 네 회의(2막 병인양요 · 3막 조약 · 4막 임오 · 5막 갑신)를 하나씩
// 채워 나가는 동안 게임이 한 번도 깨지지 않는다.
//
//   beat.council.claims = [{
//     id?     : 'letter'          // 안 적으면 claim1·claim2… 로 차례대로 지어진다
//     who     : '흥선대원군'       // 화면에 뜨는 이름. npc: 로 적어도 받는다
//     portrait: 'regent'          // ui/portraits-data.js 의 열쇠. 없으면 얼굴 없이 선다
//                                 // (regent·senior·mid·messenger·king_child·king_adult)
//     text    : '「저들과 화친할 일은 없다. …」'   // 그 사람이 그해에 실제로 할 수 있었던 말
//     gloss?  : '화친 — 싸움을 그만두고 …'        // 첫 등장 낱말 한 줄 풀이(하우스 룰)
//     wants   : ['bellonet']      // 그 말이 딛고 선(또는 그 말과 어긋나는) 문서 id
//     notes?  : { bellonet: '…' } // 그 문서를 놓았을 때 옆에 붙는 한 줄.
//                                 // 없으면 판정 없는 기본 줄이 선다(NEUTRAL_ATTACH_NOTE)
//   }]
//
//   beat.council.forecasts = [{ id?: 'again', text: '곧 다시 배가 온다',
//                               echo?: '다섯 해 뒤 …' }]
//     echo 는 「실제로는 —」 옆에 함께 서는 **사실 한 줄**이다. 「맞다/틀리다」를 적지
//     않는다 — 그 예보가 가리킨 일이 실제로 어떻게 되었는지만 적는다.
//
//   beat.council.origin?  = { [sourceId]: '그 문서는 …에 있었다' }
//     못 모은 학생이 마지막 화면에서 읽을 줄. 안 적으면 카드의 출처가 대신 선다.
//   beat.council.labels?  = { ... }   // 아래 LABELS 의 열쇠를 골라 덮어쓴다
//
// ── 2막 병인양요 회의 — 그대로 옮겨 붙일 수 있는 예 ──────────────────────
// 문서 id 는 그 막에서 **실제로 손에 들어오는 것**만 골랐다(창덕궁의 승지·검서관·군교와
// 인정전으로 뛰어든 파발이 주는 넷이다. src/data/npcs.js · acts.js janggye-arrives 참고).
//
//   claims: [
//     { id: 'letter', who: '흥선대원군', portrait: 'regent',
//       text: '「저들과 화친할 일은 없다. 저들은 처음부터 무력을 예고하였다.」',
//       gloss: '화친 — 싸움을 그만두고 사이좋게 지내기로 하는 것.',
//       wants: ['bellonet'],
//       notes: { bellonet: '저들이 보낸 글에 그대로 적혀 있다 — 「조선 왕국 최후의 날이 될 것이다.」 이 말은 그 글을 딛고 선다.' } },
//     { id: 'wait', who: '승정원 승지', portrait: 'senior',
//       text: '「강화도의 형세가 아직 다 올라오지 않았습니다. 손에 있는 것은 장계 한 장뿐입니다.」',
//       wants: ['yangheonsu'],
//       notes: { yangheonsu: '그 한 장은 이미 「저들이 죽은 자를 끌고 물러갔습니다」라고 적고 있다 — 기다리자는 말과 어긋난다.' } },
//     { id: 'again', who: '훈련도감 군교', portrait: 'messenger',
//       text: '「이 배들이 처음이 아닙니다. 올해 평양에서도 같은 일이 있었습니다.」',
//       wants: ['sherman'],
//       notes: { sherman: '평안도에서 올린 보고가 그 일을 적어 두었다. 다섯 해 뒤 그 일이 미국 함대의 구실이 된다.' } },
//     { id: 'books', who: '규장각 검서관', portrait: 'mid',
//       text: '「강화부가 저들의 손에 들어갔습니다. 외규장각에 나누어 둔 책들이 그 안에 있습니다.」',
//       wants: ['oegyujanggak'],
//       notes: { oegyujanggak: '목록이 무엇이 거기 있었는지 적어 준다 — 어람용 의궤와 어책, 어필이다.' } },
//   ],
//   forecasts: [
//     { id: 'shut',  text: '문은 더 굳게 닫힌다',
//       echo: '다섯 해 뒤 척화비가 전국 200여 곳에 섰다.' },
//     { id: 'again', text: '곧 다시 배가 온다',
//       echo: '다섯 해 뒤 미국 함대가 같은 물길로 들어왔다(신미양요, 1871).' },
//     { id: 'split', text: '조정이 갈라진다',
//       echo: '조정 안에서 「문을 열어 보자」는 말은 이때 오히려 꺼내기 어려워졌다.' },
//     { id: 'lose',  text: '지켜도 잃는 것이 있다',
//       echo: '프랑스 함대는 물러가면서 외규장각의 297책과 은괴 열아홉 상자를 배에 실었다.' },
//   ],
//
// ── 이 화면이 하지 않는 것 ───────────────────────────────────────────────
// 점수·셈·정답 표시가 없다. 예보를 재지 않는다. 근거를 하나도 못 놓아도 회의는 열리고
// 실제 역사는 나오고 다음으로 넘어간다 — 바뀌는 것은 말을 거는 방식뿐이다.

export const LABELS = {
  head: '어 전 회 의',
  evidenceTag: '근 거 대 기',
  forecastTag: '예 보',
  evidenceAsk: '신하들이 저마다 한 마디씩 한다. 그 말이 딛고 선 글을 사초함에서 꺼내, 그 말 밑에 놓는다.',
  boxTag: '사초함',
  boxAsk: '먼저 글 하나를 고른다.',
  slotEmpty: '이 말 밑이 비어 있다.',
  place: '고른 글을 이 말 밑에 놓는다',
  swap: '고른 글로 갈아 끼운다',
  placeNeedPick: '먼저 사초함에서 글을 고른다',
  pull: '빼낸다',
  statusIdle: '사초함에서 글 하나를 고르고, 그 글이 받치는(또는 어긋나는) 말 밑에 놓으세요.',
  goneWith: '놓은 대로 회의를 연다',
  goneWithout: '근거 없이 회의를 연다',
  choiceCount: '고를 수 있는 것',
  standing: '내가 놓은 근거',
  forecastAsk: '정하기는 하였다. 그러면 이 일이 무엇을 부를 것 같습니까 — 하나만 고른다.',
  you: '당신은 ─',
  actualHead: '실제로는 ─',
  mineHead: '내가 본 앞일',
  realHead: '그 뒤에 일어난 일',
  standHead: '내가 딛고 선 글',
  absentHead: '사초함에 없던 글',
  absentFoot: '글 한 장이 이 자리에서 무엇을 할 수 있는지, 이제 보았다.',
  scribeHead: '사관이 받아 적는다',
  copyNote: '이 문장은 막이 끝날 때 「사관이 적은 것」으로 다시 나옵니다. 활동지에 옮겨 적어 두세요.',
  next: '밤이 깊었다 — 다음으로',
}

// justify-content:center 만으로는, 내용이 화면보다 길어지면(문구가 늘어난
// 어전회의) 위쪽이 스크롤로도 닿지 않는다 — "safe center" + overflow:auto 로
// 막는다(화면 확인 중 발견, 2단계 재제작).
//
// 새로 붙는 이름은 모두 council- 로 시작한다. 전역 <style> 이므로, 다른 화면의 뿌리
// 이름(.note·.veil 같은 것)과 겹치면 그 요소가 position:fixed;inset:0 을 물려받아
// 보이지 않는 판이 된다 — 실제로 한 번 일어났고, tests/ui/class-namespace.test.js 가
// 그것을 붙든다.
const CSS = `
.council{position:fixed;inset:0;background:#0f1113;z-index:50;display:flex;
  flex-direction:column;align-items:center;justify-content:safe center;gap:18px;padding:24px;overflow:auto;
  font-family:var(--face-body)}
.council h2{margin:0;font-size:var(--read-label,15px);color:var(--paper-quiet,#8f8a7c);letter-spacing:var(--read-track,.12em);font-weight:400}
.council .council-tag{margin:0;font-size:var(--read-label,13px);color:#e0a23a;letter-spacing:.22em;
  font-family:var(--face-display,serif)}
.council .q{margin:0;font-size:var(--read-lead,22px);color:var(--paper-strong,#e8e2d4);text-align:center;
  max-width:640px;line-height:var(--read-lh-title,1.5);word-break:keep-all}
.council .council-ask{margin:0;max-width:640px;font-size:var(--read-small,16px);
  line-height:var(--read-lh-small,1.75);color:var(--paper-quiet,#bdb6a4);text-align:center;word-break:keep-all}
.council .read{font-size:var(--read-caption,13px);color:var(--paper-quiet,#8f8a7c)}
.council .list{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px}
/* 목록 자체가 초점을 받는다 — 첫 단추에 초점을 주면 그 테가 「이미 골랐다」로 읽히고,
   Enter 한 번이 그 자리에서 결정이 되어 버린다. 여기서부터 Tab 으로 들어간다. */
.council .list:focus,.council .council-forecasts:focus{outline:none}
.council button.opt{padding:14px 16px;text-align:left;background:#23282c;color:#e8e2d4;
  border:1px solid #3a4248;border-radius:3px;font-size:var(--read-body,16px);cursor:pointer;
  font-family:inherit;line-height:var(--read-lh-small,1.6);word-break:keep-all}
.council button.opt:hover{background:#2f363c;border-color:#5a646c}
.council button.opt:focus-visible{outline:2px solid #e0a23a;outline-offset:2px}
.council .locked{padding:14px 16px;border:1px dashed #3a4248;border-radius:3px;color:#98a2aa;
  font-size:var(--read-body,16px);line-height:var(--read-lh-small,1.6)}
.council .locked small{display:block;margin-top:6px;color:#8f8a7c;font-size:var(--read-caption,13px)}

/* ── 근거 대기 ───────────────────────────────────────────────────────── */
.council .council-board{width:100%;max-width:880px;display:flex;flex-direction:column;gap:16px}
.council .council-box{display:flex;flex-direction:column;gap:10px;border:1px dashed #6a5230;
  border-radius:4px;padding:16px 18px;background:#191b1e}
.council .council-box-head{margin:0;font-size:var(--read-label,14px);color:#e0a23a;letter-spacing:.14em}
.council .council-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(224px,1fr));gap:10px}
.council button.council-card{display:flex;flex-direction:column;gap:5px;text-align:left;cursor:pointer;
  background:#23282c;border:1px solid #3a4248;border-radius:3px;padding:12px 14px;font-family:inherit;
  color:var(--paper-strong,#e8e2d4);word-break:keep-all}
.council button.council-card:hover{background:#2f363c;border-color:#5a646c}
/* 초점과 고름을 갈라 놓는다 — 초점은 점선, 고른 것만 실선에 글자까지 붙는다
   (ui/codex-quiz.js 에서 눈으로 보고 고친 자리를 그대로 따른다). */
.council button.council-card:focus-visible{outline:2px dashed #e0a23a;outline-offset:3px}
.council button.council-card[aria-pressed=true]{border-color:#e0a23a;border-width:2px;padding:11px 13px;
  background:#3a2d20}
.council .council-card-title{font-size:var(--read-small,15px);line-height:var(--read-lh-small,1.55)}
.council .council-card-origin{font-size:var(--read-caption,12.5px);line-height:1.5;color:var(--paper-quiet,#bdb6a4)}
.council .council-card-mark{font-size:var(--read-caption,12.5px);color:#e0a23a;letter-spacing:.12em;min-height:1em}
.council .council-empty{margin:0;font-size:var(--read-small,15px);line-height:var(--read-lh-small,1.8);
  color:var(--paper-quiet,#bdb6a4);word-break:keep-all}
/* 안내 한 줄은 판 위에 붙어 따라 내려온다 — 390px 에서 사초함은 화면 하나를 다 쓰고,
   글을 든 채 신하들의 말까지 내려가면 「내가 무엇을 들었더라」가 사라진다(390×844
   촬영에서 실제로 그랬다). 손에 든 것의 이름이 늘 눈에 있어야 놓을 수 있다. */
.council .council-status{margin:0;font-size:var(--read-small,14px);line-height:var(--read-lh-small,1.7);
  color:var(--paper-quiet,#bdb6a4);min-height:1.2em;max-width:880px;word-break:keep-all;
  position:sticky;top:-2px;z-index:1;background:#0f1113;padding:8px 0;
  box-shadow:0 8px 12px -10px #0f1113}

/* 판 자체가 초점을 받는다(tabindex="-1"). 첫 칸에 초점을 주면 그 테가 「이미 한 장을
   골랐다」로 읽힌다 — ui/codex-quiz.js 에서 화면을 눈으로 보고 고친 자리와 같다. */
.council .council-board:focus{outline:none}
.council .council-claims{display:flex;flex-direction:column;gap:12px}
/* 넓은 화면에서는 말들을 두 줄로 세운다. 한 줄로 세우면 넷째 신하가 화면 두 배
   아래에 있어, 학생이 끝까지 스크롤해야 「이대로 회의를 연다」에 닿는다(1440×900 촬영). */
@media(min-width:1100px){
  .council .council-claims{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
}
.council .council-claim{border:1px solid #3a4248;border-radius:3px;padding:14px 16px;background:#191b1e;
  display:flex;flex-direction:column;gap:10px}
.council .council-claim-head{display:flex;gap:12px;align-items:center}
.council .council-claim-head img{width:52px;height:52px;flex:0 0 52px;border-radius:3px;object-fit:cover;
  object-position:50% 7%;border:1px solid #6b5a3e;background:#1a1d21}
.council .council-who{font-size:var(--read-label,13px);color:#e0a23a;letter-spacing:.12em}
.council .council-claim-text{margin:0;font-size:var(--read-body,17px);line-height:var(--read-lh-body,1.8);
  color:var(--paper-strong,#e8e2d4);word-break:keep-all}
.council .council-claim-gloss{margin:0;font-size:var(--read-caption,13px);line-height:1.7;
  color:var(--paper-quiet,#bdb6a4);border-left:2px solid #6a5230;padding-left:10px;word-break:keep-all}
.council .council-slot{border:1px dashed #3a4248;border-radius:3px;padding:12px 14px;background:#0f1113}
.council .council-slot[data-filled=true]{border-style:solid;border-color:#6b5a3e;background:#23201a}
.council .council-slot-empty{margin:0;font-size:var(--read-caption,13px);color:#8f8a7c}
.council .council-slot-title{margin:0;font-size:var(--read-small,15px);color:#e0a23a}
.council .council-slot-line{margin:8px 0 0;font-size:var(--read-small,15px);line-height:var(--read-lh-body,1.8);
  color:var(--paper-strong,#e8e2d4);white-space:pre-wrap;border-left:3px solid #8a6a44;padding-left:12px}
.council .council-slot-note{margin:8px 0 0;font-size:var(--read-caption,13px);line-height:1.7;
  color:var(--paper-quiet,#bdb6a4);word-break:keep-all}
.council .council-row{display:flex;gap:10px;flex-wrap:wrap}
.council button.council-place,.council button.council-pull{padding:10px 14px;cursor:pointer;font-family:inherit;
  font-size:var(--read-label,14px);border-radius:3px;border:1px solid #6a5230;background:#23282c;color:#e0a23a}
.council button.council-place:hover,.council button.council-pull:hover{background:#3a2d20}
.council button.council-place[disabled]{opacity:.4;cursor:not-allowed;color:#8f8a7c;border-color:#3a4248}
.council button.council-place:focus-visible,.council button.council-pull:focus-visible{outline:2px solid #e0a23a;outline-offset:2px}
.council button.council-pull{border-color:#3a4248;color:#98a2aa}

/* ── 예보 ──────────────────────────────────────────────────────────────── */
.council .council-forecasts{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px}

/* ── 실제로는 ──────────────────────────────────────────────────────────── */
.council .actual{max-width:700px;background:#e8e2d4;color:var(--ink-strong,#23201a);border-radius:3px;
  background-image:var(--hanji);background-size:cover;background-position:center;
  border:1px solid #6b5a3e;box-shadow:inset 0 0 60px #b39a6a2b;
  padding:20px 22px;line-height:var(--read-lh-body,1.75);font-size:var(--read-body,17px);word-break:keep-all}
.council .actual .you{color:var(--ink-quiet,#6b6558);font-size:var(--read-small,14px);margin-bottom:10px}
.council .actual .origin{font-size:var(--read-caption,13px);color:var(--ink-quiet,#5e5849);margin-top:8px}
.council .actual blockquote{margin:0;border-left:3px solid #8a6a44;padding-left:12px;
  font-size:var(--read-small,15px);line-height:var(--read-lh-body,1.8)}
.council .actual .council-said{margin:14px 0 0;border-top:1px solid #6b5a3e44;padding-top:12px}
/* 뒤집는 말에는 얼굴이 붙는다 — 누가 임금의 결정을 덮었는지 학생이 보아야 한다.
   1863년의 그 한 줄(「이 일은 이 아비가 맡겠습니다」)이 이 게임에서 가장 중요한 말이다. */
.council .overturn{display:flex;gap:14px;align-items:center;margin:16px 0 0;
  border-top:1px solid #6b5a3e44;padding-top:14px}
.council .overturn img{width:84px;height:84px;flex:0 0 84px;border-radius:3px;
  object-fit:cover;object-position:50% 7%;border:1px solid #6b5a3e;background:#1a1d21}
.council .overturn .who{font-size:var(--read-caption,12px);color:#6b5a3e;letter-spacing:2px;margin-bottom:4px}
.council .reading{max-width:700px;border:1px dashed #6a5230;border-radius:4px;padding:16px 20px;
  line-height:var(--read-lh-body,1.8);color:#b9b2a1;font-size:var(--read-small,15px);text-align:left;background:#191b1e;
  word-break:keep-all}
.council .reading .tag{display:block;color:#e0a23a;font-size:var(--read-caption,12px);letter-spacing:3px;margin-bottom:8px}
.council .reading .origin{font-size:var(--read-caption,12px);color:#8f8a7c;margin-top:8px}

/* 예보와 실제를 **나란히** 놓는다. 어느 쪽에도 표시를 붙이지 않는다 — 재지 않는다. */
.council .council-pair{max-width:700px;width:100%;display:flex;gap:16px;flex-wrap:wrap;
  border:1px dashed #6a5230;border-radius:4px;padding:16px 18px;background:#191b1e}
.council .council-pair>div{flex:1 1 240px;min-width:0}
.council .council-pair b{display:block;font-weight:400;font-size:var(--read-label,13px);
  color:#e0a23a;letter-spacing:.12em;margin-bottom:8px}
.council .council-pair p{margin:0;font-size:var(--read-small,15.5px);line-height:var(--read-lh-body,1.8);
  color:var(--paper-strong,#e8e2d4);word-break:keep-all}
.council .council-note{max-width:700px;margin:0;font-size:var(--read-caption,13.5px);
  line-height:var(--read-lh-small,1.75);color:var(--paper-quiet,#bdb6a4);text-align:center;word-break:keep-all}

.council .council-stand{max-width:700px;width:100%;display:flex;flex-direction:column;gap:12px;
  border:1px dashed #6a5230;border-radius:4px;padding:16px 18px;background:#191b1e}
.council .council-stand>b{font-weight:400;font-size:var(--read-label,13px);color:#e0a23a;letter-spacing:.12em}
.council .council-stand-row{border-left:3px solid #8a6a44;padding-left:12px}
.council .council-stand-row .council-who{display:block;margin-bottom:4px}
.council .council-stand-row .council-claim-text{font-size:var(--read-small,15px)}
.council .council-stand-row .council-slot-title{margin-top:8px}
.council .council-absent{max-width:700px;width:100%;border:1px dashed #6a5230;border-radius:4px;
  padding:16px 18px;background:#191b1e}
.council .council-absent b{display:block;font-weight:400;font-size:var(--read-label,13px);
  color:#e0a23a;letter-spacing:.12em;margin-bottom:10px}
.council .council-absent-row{font-size:var(--read-small,15px);line-height:var(--read-lh-small,1.8);
  color:var(--paper-strong,#e8e2d4);padding:6px 0;border-bottom:1px solid #6a523044;word-break:keep-all}
.council .council-absent-row:last-of-type{border-bottom:0}
.council .council-absent-row span{display:block;font-size:var(--read-caption,13px);color:var(--paper-quiet,#bdb6a4)}
.council .council-absent-foot{margin:12px 0 0;font-size:var(--read-caption,13.5px);
  line-height:var(--read-lh-small,1.75);color:var(--paper-quiet,#bdb6a4)}

/* 사관이 받아 적는 문장 — 종이 위에 한 칸. 막 끝 화면의 「사관이 적은 것」에 다시 나온다. */
.council .council-scribe{max-width:700px;width:100%;background:#e8e2d4;background-image:var(--hanji);
  background-size:cover;border:1px solid #6b5a3e;border-radius:3px;padding:18px 20px;
  box-shadow:inset 0 0 60px #b39a6a2b}
.council .council-scribe b{display:block;font-weight:400;font-size:var(--read-label,13px);
  color:var(--ink-quiet,#4b4232);letter-spacing:.12em;margin-bottom:10px}
.council .council-scribe p{margin:0;font-size:var(--read-body,17px);line-height:var(--read-lh-body,1.85);
  color:var(--ink-strong,#23201a);word-break:keep-all}
.council .council-scribe small{display:block;margin-top:10px;font-size:var(--read-caption,12.5px);
  line-height:1.7;color:var(--ink-quiet,#4b4232)}

.council .go{padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:var(--read-label,15px);cursor:pointer;font-family:inherit}
.council .go:hover{background:#4a3a2a}
.council .go:focus-visible{outline:2px solid #e0a23a;outline-offset:2px}

@media(max-width:760px){
  .council{padding:18px 14px;gap:14px}
  .council .council-grid{grid-template-columns:1fr;gap:8px}
  /* 사초함이 화면 하나를 다 잡아먹지 않게 칸을 얇게 눕힌다 */
  .council button.council-card{padding:10px 12px;gap:3px}
  .council button.council-card[aria-pressed=true]{padding:9px 11px}
  .council .council-claim-head img{width:44px;height:44px;flex:0 0 44px}
  .council .council-pair{flex-direction:column;gap:14px}
  .council .actual,.council .reading{padding:16px 15px}
}
/* 판이 들어오는 짧은 숨 하나. 「움직임을 줄임」을 켠 기기에서는 아예 안 건다. */
@media(prefers-reduced-motion:no-preference){
  .council .council-board,.council .actual{animation:council-in .26s ease-out both}
  @keyframes council-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.id = 'eojeon-council-style'
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

const labelsOf = (beat) => ({ ...LABELS, ...(beat?.council?.labels ?? {}) })

const faceOf = (key) => (key && PORTRAITS[key] ? `<img alt="" src="${PORTRAITS[key]}">` : '')

// 선택지를 잠그는 까닭이 셋이다. 셋 다 systems/council.js 밖에서 판정한다 — 그 파일은 잠금이다.
//   (1) 사료를 안 읽었다        — evaluateChoices() 가 판정한다
//   (2) 아직 모르는 일이 있다   — needsFlag. 설계서 7.6 의 「성공하면 선택지가 열린다」
//   (3) 회의 자체가 얼어붙었다  — frozen. 4막에서 대원군이 나랏일을 다시 맡는 자리
//
// 잠긴 선택지의 text 는 null 이다 — 화면이 ??? 를 찍는다. 다만 (3) 으로만 잠긴 것은
// 이름을 그대로 보여 준다: 「무엇을 고를 수 있었는지 알면서 고르지 못하는 것」이 그 장면이다.
// 그래서 7.6 을 실패한 학생과 성공한 학생이, 둘 다 아무것도 고르지 못하는 이 회의에서도
// 갈린다 — 갈리는 것은 「할 수 있는가」가 아니라 「있는 줄 아는가」다.
export function gateChoices(state, beat) {
  const raw = beat.council.choices
  const evaluated = evaluateChoices(state, beat.council)
  const flags = state?.flags ?? {}

  return evaluated.map(c => {
    const src = raw.find(x => x.id === c.id) ?? {}
    const flagOk = !src.needsFlag || flags[src.needsFlag] === true
    const why = []
    // 얼어붙은 회의에서는 미열람 안내를 내지 않는다. 두 까닭을 나란히 놓으면 화면이
    // 「내가 안 읽어서 막혔다」와 「정치 때문에 막혔다」를 동시에 말하는데, 이 화면의
    // 요점은 얼어붙음이 학생 잘못이 아니라는 것이다 — 무엇을 안 읽었는지는 3막 끝
    // 화면(FUTURE_COUNCIL)이 이미 이름으로 돌려준다.
    // 「모르는 일」(needsFlag)은 남긴다 — 그것은 학생의 잘못이 아니라 「왕이 무엇을
    // 아는가」이고, 얼어붙은 회의에서도 그 갈림이 살아 있는 것이 설계서 7.6 의 요점이다.
    if (beat.frozen !== true) for (const m of c.missing) why.push(`『${m}』을 읽지 않았습니다`)
    if (!flagOk) why.push(src.flagLabel ?? '아직 알지 못하는 일이 있다')
    if (beat.frozen === true) why.push(beat.frozenReason ?? '지금은 고를 수 없다')

    const knowable = c.unlocked && flagOk
    return {
      id: c.id,
      // 이름을 보여 줄 것인가 — 알 수 있는 선택지면 보여 준다. 얼어붙었어도 보여 준다
      text: knowable ? c.text : null,
      unlocked: knowable && beat.frozen !== true,
      missing: c.missing,
      why,
    }
  })
}

// ── 그릴 글자 (순수 함수) ────────────────────────────────────────────────
// 시험 환경이 node 라 DOM 이 없다. 그래서 판마다 문자열을 내놓는 함수를 두고,
// 배선만 createCouncil 이 한다 — ui/codex-quiz.js 와 같은 꼴이다.

// 한 말 밑의 칸. 놓기 전에는 「비어 있다」 한 줄, 놓은 뒤에는 그 글의 말이 그대로 선다.
export function councilSlotHtml(beat, claim, sourceId, card) {
  const L = labelsOf(beat)
  if (!sourceId || !card) return `<p class="council-slot-empty">${esc(L.slotEmpty)}</p>`
  return `<p class="council-slot-title">『${esc(card.title)}』</p>
      <p class="council-slot-line">${esc(card.excerpt ?? '')}</p>
      <p class="council-slot-note">${esc(noteFor(claim, sourceId))}</p>`
}

// 근거 대기 판. 사초함이 비어 있어도 판은 선다 — 신하들의 말은 읽어야 한다.
export function councilEvidenceHtml(beat, view) {
  const L = labelsOf(beat)
  const cards = (view.held ?? []).map(card => `
        <button type="button" class="council-card" data-id="${esc(card.id)}" aria-pressed="false"
          aria-label="${esc(card.title)} — 근거로 고른다">
          <span class="council-card-title">${esc(card.title)}</span>
          <span class="council-card-origin">${esc(card.origin ?? '')}</span>
          <span class="council-card-mark"></span>
        </button>`).join('')

  const box = (view.held ?? []).length
    ? `<div class="council-box">
          <p class="council-box-head">${esc(L.boxTag)} — ${esc(L.boxAsk)}</p>
          <div class="council-grid" role="group" aria-label="사초함의 글">${cards}</div>
        </div>`
    : `<div class="council-box"><p class="council-box-head">${esc(L.boxTag)}</p>
          <p class="council-empty">${esc(EMPTY_HAND_LINE)}</p></div>`

  // 사초함이 비었으면 놓는 단추를 아예 세우지 않는다 — 누를 수 없는 단추가 네 개
  // 늘어서 있으면, 못 모은 것이 화면 가득 「못 한다」로 되돌아온다(1440 촬영에서 그랬다).
  // 그 학생에게 이 판은 **신하들의 말을 읽는 자리**다.
  const hand = (view.held ?? []).length > 0
  const claims = (view.claims ?? []).map(c => `
        <div class="council-claim" data-claim="${esc(c.id)}">
          <div class="council-claim-head">${faceOf(c.portrait)}
            <span class="council-who">${esc(c.who)}</span></div>
          <p class="council-claim-text">${esc(c.text)}</p>
          ${c.gloss ? `<p class="council-claim-gloss">${esc(c.gloss)}</p>` : ''}
          ${hand ? `<div class="council-slot" data-slot="${esc(c.id)}" data-filled="false">
            <p class="council-slot-empty">${esc(L.slotEmpty)}</p></div>
          <div class="council-row">
            <button type="button" class="council-place" data-place="${esc(c.id)}" disabled>${esc(L.placeNeedPick)}</button>
          </div>` : ''}
        </div>`).join('')

  return `<h2>${esc(L.head)}</h2>
      <p class="council-tag">${esc(L.evidenceTag)}</p>
      <p class="q">${esc(view.question)}</p>
      <p class="council-ask">${esc(L.evidenceAsk)}</p>
      <div class="council-board type-read" tabindex="-1">
        ${box}
        <p class="council-status" role="status" aria-live="polite">${hand ? esc(L.statusIdle) : ''}</p>
        <div class="council-claims">${claims}</div>
      </div>
      <button class="go" data-go="choices">${esc(L.goneWithout)}</button>`
}

// 고르는 판 — 예전 그대로다. 놓아 둔 근거를 위에 한 줄로 얹어, 무엇을 딛고 정하는지
// 보면서 고르게 한다.
export function councilChoicesHtml(beat, gated, standing = []) {
  const L = labelsOf(beat)
  const openCount = gated.filter(c => c.unlocked).length
  const listHtml = gated.map(c => c.unlocked
    ? `<button class="opt" data-id="${esc(c.id)}">${esc(c.text)}</button>`
    : `<div class="locked">${c.text == null ? '???' : esc(c.text)}${c.why.map(w => `<small>← ${esc(w)}</small>`).join('')}</div>`
  ).join('')

  // 얼어붙은 회의에서는 고를 단추가 하나도 없다 — 넘어갈 길을 따로 낸다.
  // 이것이 조작권 D 의 첫 실사용이다: 왕좌에 앉은 채로 아무것도 하지 못한다.
  const frozenBtn = beat.frozen === true
    ? `<button class="go" data-go="frozen">${esc(beat.frozenLabel ?? '아무 말도 하지 못한다')}</button>`
    : ''

  const stand = standing.length
    ? `<p class="council-status">${esc(L.standing)} — ${standing.map(t => `『${esc(t)}』`).join(' · ')}</p>`
    : ''

  return `<h2>${esc(L.head)}</h2>
      <p class="q">${esc(beat.council.question)}</p>
      ${stand}
      <div class="read">${esc(L.choiceCount)} ${openCount} / ${gated.length}</div>
      <div class="list" tabindex="-1" role="group" aria-label="고를 수 있는 것">${listHtml}</div>
      ${frozenBtn}`
}

// 예보 판. 「실제로는 —」이 아직 안 뜬 자리다 — 여기서 실제를 한 글자도 비추지 않는다.
export function councilForecastHtml(beat, forecasts, chosenText) {
  const L = labelsOf(beat)
  const list = forecasts.map(f => `<button class="opt" data-forecast="${esc(f.id)}">${esc(f.text)}</button>`).join('')
  return `<h2>${esc(L.head)}</h2>
      <p class="council-tag">${esc(L.forecastTag)}</p>
      <p class="q">${esc(L.forecastAsk)}</p>
      <div class="read">${esc(L.you)} ${esc(chosenText)}</div>
      <div class="council-forecasts" tabindex="-1" role="group" aria-label="예보">${list}</div>`
}

// 실제가 뜨는 판. 예보를 그 옆에 놓고, **재지 않는다**. 그리고 학생이 한 것으로 지어진
// 문장 하나를 종이 위에 적어 준다 — 그 문장이 그대로 「내 기록 복사」로 간다.
export function councilRevealHtml(beat, record, view) {
  const L = labelsOf(beat)
  const by = beat.overturnBy
  const overturn = beat.overturn
    ? `<div class="overturn">${faceOf(by?.portrait)}<div>` +
      `${by?.name ? `<div class="who">${esc(by.name)}</div>` : ''}` +
      `<blockquote>${esc(beat.overturn)}</blockquote></div></div>`
    : ''
  // 데이터에 인용이 실려 있으면 함께 놓는다(3막 조약 회의의 최익현 한 줄이 그것이다).
  const said = beat.actual?.quote
    ? `<div class="council-said"><blockquote>${esc(beat.actual.quote)}</blockquote>
         ${beat.actual.quoteOrigin ? `<div class="origin">${esc(beat.actual.quoteOrigin)}</div>` : ''}</div>`
    : ''
  // 「실제로는」은 사료가 말한 것, 「역사가들은 이렇게 본다」는 오늘의 연구자가
  // 읽어 낸 것이다(판정 R12). 둘을 한 상자에 담으면 해석이 사실로 읽힌다 —
  // 밝은 종이와 어두운 점선 상자로, 각자 제 출처를 달고 눈으로 갈라 놓는다.
  // label·origin 에 방어값을 둔다 — 없으면 화면에 undefined 가 찍힌다.
  const rd = beat.actual?.reading
  const reading = rd
    ? `<div class="reading"><span class="tag">${esc(rd.label ?? '역사가들은 이렇게 본다')}</span>
         ${esc(rd.line ?? '')}
         ${rd.origin ? `<div class="origin">${esc(rd.origin)}</div>` : ''}</div>`
    : ''

  // 예보와 실제 — 나란히. 어느 쪽에도 표시가 붙지 않는다.
  const pair = record.forecast
    ? `<div class="council-pair">
          <div><b>${esc(L.mineHead)}</b><p>「${esc(record.forecastText)}」</p></div>
          <div><b>${esc(L.realHead)}</b><p>${esc(record.forecast.echo || beat.actual?.line || '')}</p></div>
        </div>
        <p class="council-note">${esc(FORECAST_NOTE)}</p>`
    : ''

  const stand = record.rows.length
    ? `<div class="council-stand"><b>${esc(L.standHead)}</b>
          ${record.rows.map(r => `<div class="council-stand-row">
            <span class="council-who">${esc(r.who)}</span>
            <p class="council-claim-text">${esc(r.claim)}</p>
            <p class="council-slot-title">『${esc(r.title)}』</p>
            <p class="council-slot-line">${esc(r.excerpt)}</p>
            <p class="council-slot-note">${esc(r.note)}</p></div>`).join('')}
        </div>`
    : ''

  const absent = (view?.absent ?? []).length
    ? `<div class="council-absent"><b>${esc(L.absentHead)}</b>
          ${view.absent.map(a => `<div class="council-absent-row">『${esc(a.title)}』<span>${esc(a.where)}</span></div>`).join('')}
          <p class="council-absent-foot">${esc(L.absentFoot)}</p></div>`
    : ''

  return `<div class="actual type-read">
        <div class="you">${esc(L.you)} ${esc(record.choiceText)}</div>
        <div>${esc(L.actualHead)} ${esc(beat.actual.line)}</div>
        <div class="origin">${esc(beat.actual.origin)}</div>
        ${said}
        ${overturn}
      </div>
      ${reading}
      ${pair}
      ${stand}
      ${absent}
      <div class="council-scribe"><b>${esc(L.scribeHead)}</b>
        <p>${esc(record.sentence)}</p>
        <small>${esc(L.copyNote)}</small></div>
      <button class="go" data-go="next">${esc(L.next)}</button>`
}

// 놓은 장수에 따라 바뀌는 안내 한 줄. 「몇 개 중 몇 개」처럼 셈하지 않는다 —
// 셈이 보이면 학생이 그것을 점수로 읽는다.
export function statusLine(beat, { picked = null, placed = 0, hand = true } = {}) {
  const L = labelsOf(beat)
  // 손에 아무것도 없는 학생에게 「골라서 놓으세요」라고 말하지 않는다 — 고를 것이 없다.
  if (!hand) return ''
  if (picked) return `『${picked}』${eulReul(picked)} 들었다. 이 글이 받치는(또는 어긋나는) 말 밑에 놓으세요.`
  if (placed > 0) return '놓았다. 다른 말 밑에도 놓을 수 있고, 이대로 회의를 열어도 된다.'
  return L.statusIdle
}

export function createCouncil(root) {
  ensureStyle()

  return {
    // onLocked — 잠긴 선택지를 눌렀을 때 알린다(소리 되먹임 하나뿐이다).
    // 눌러도 아무것도 열리지 않는다: 이 콜백은 화면도 상태도 건드리지 않는다.
    open(state, beat, onDecide, onLocked = null) {
      const L = labelsOf(beat)
      const panel = document.createElement('div')
      panel.className = 'council'
      root.appendChild(panel)

      const gated = gateChoices(state, beat)
      const view = councilEvidenceView(beat, state)
      const cardOf = (id) => (view.held ?? []).find(c => c.id === id) ?? null

      const attached = {}          // { [claimId]: sourceId } — 한 말 밑에 하나다
      let pickedId = null          // 사초함에서 든 글(아직 놓지 않은 것)
      let choiceId = null
      let forecastId = null
      let done = false             // onDecide 는 정확히 한 번이다

      // ── ① 근거 대기 ──────────────────────────────────────────────────
      function showEvidence() {
        panel.innerHTML = councilEvidenceHtml(beat, view)
        const status = panel.querySelector('.council-status')
        const go = panel.querySelector('[data-go=choices]')

        function paint() {
          for (const b of panel.querySelectorAll('.council-card')) {
            const on = b.dataset.id === pickedId
            b.setAttribute('aria-pressed', String(on))
            const mark = b.querySelector('.council-card-mark')
            if (mark) mark.textContent = on ? '들었다' : ''
          }
          for (const claim of view.claims) {
            const slot = panel.querySelector(`[data-slot="${claim.id}"]`)
            const put = panel.querySelector(`[data-place="${claim.id}"]`)
            // 사초함이 빈 학생에게는 칸도 단추도 서지 않는다 — 여기서 조용히 건너뛴다
            if (!slot || !put) continue
            const row = put.parentElement
            const sid = attached[claim.id] ?? null
            slot.dataset.filled = String(!!sid)
            slot.innerHTML = councilSlotHtml(beat, claim, sid, cardOf(sid))
            // 이미 놓인 말 밑에서는, 손에 든 글이 없는 동안 「놓는다」를 아예 치운다 —
            // 눌리지 않는 단추가 「빼낸다」 옆에 남아 있으면 그 자리가 어수선하다(1440 촬영).
            put.hidden = !!sid && !pickedId
            put.disabled = !pickedId
            put.textContent = !pickedId ? L.placeNeedPick : (sid ? L.swap : L.place)
            // 놓은 것을 빼는 길을 늘 하나 둔다 — 갈아 끼우려면 되돌릴 수 있어야 한다.
            const old = row.querySelector('.council-pull')
            if (sid && !old) {
              const pull = document.createElement('button')
              pull.type = 'button'
              pull.className = 'council-pull'
              pull.textContent = L.pull
              pull.addEventListener('click', () => { delete attached[claim.id]; paint() })
              row.appendChild(pull)
            } else if (!sid && old) old.remove()
          }
          const placed = Object.keys(attached).length
          status.textContent = statusLine(beat, {
            picked: pickedId ? cardOf(pickedId)?.title ?? null : null,
            placed,
            hand: (view.held ?? []).length > 0,
          })
          go.textContent = placed ? L.goneWith : L.goneWithout
        }

        for (const b of panel.querySelectorAll('.council-card')) {
          // <button> 이므로 Enter·Space 는 브라우저가 click 으로 바꿔 준다 —
          // 손가락과 키보드가 같은 한 자리를 지난다.
          b.addEventListener('click', () => {
            pickedId = pickedId === b.dataset.id ? null : b.dataset.id
            paint()
          })
        }
        for (const put of panel.querySelectorAll('.council-place')) {
          put.addEventListener('click', () => {
            if (!pickedId) return
            attached[put.dataset.place] = pickedId
            pickedId = null                 // 놓으면 손을 비운다 — 다음 글을 들 수 있다
            paint()
          })
        }
        go.addEventListener('click', showChoices)
        paint()
        // 초점은 판에 둔다 — 여기서부터 Tab 으로 사초함에 들어간다.
        panel.querySelector('.council-board')?.focus({ preventScroll: true })
      }

      // ── ② 고른다 (예전 그대로) ───────────────────────────────────────
      function showChoices() {
        const standing = councilRecord(beat, { choiceId: null, attached }).titles
        panel.innerHTML = councilChoicesHtml(beat, gated, standing)

        panel.querySelectorAll('button.opt').forEach(btn => {
          btn.addEventListener('click', () => afterChoice(btn.dataset.id))
        })
        if (onLocked) {
          panel.querySelectorAll('.locked').forEach(row => {
            row.addEventListener('pointerdown', () => onLocked())
          })
        }
        const frozen = panel.querySelector('[data-go=frozen]')
        if (frozen) frozen.addEventListener('click', () => afterChoice('frozen'))
        // 초점은 목록에 둔다 — 첫 단추에 주면 Enter 한 번이 그대로 결정이 된다
        panel.querySelector('.list')?.focus({ preventScroll: true })
      }

      function afterChoice(id) {
        choiceId = id
        if (view.forecasts.length) showForecast()
        else showReveal()
      }

      // ── ③ 예보 ───────────────────────────────────────────────────────
      function showForecast() {
        const chosen = councilRecord(beat, { choiceId, attached })
        panel.innerHTML = councilForecastHtml(beat, view.forecasts, chosen.choiceText)
        panel.querySelectorAll('[data-forecast]').forEach(btn => {
          btn.addEventListener('click', () => { forecastId = btn.dataset.forecast; showReveal() })
        })
        panel.querySelector('.council-forecasts')?.focus({ preventScroll: true })
      }

      // ── ④ 실제로는 ───────────────────────────────────────────────────
      function showReveal() {
        const record = councilRecord(beat, { choiceId, attached, forecastId })
        panel.innerHTML = councilRevealHtml(beat, record, view)
        const next = panel.querySelector('[data-go=next]')
        next.addEventListener('click', () => resolve(record))
        next.focus({ preventScroll: true })
      }

      // 이 화면이 닫히는 문은 하나다. 두 번 눌러도 결정이 두 번 쌓이지 않는다.
      function resolve(record) {
        if (done) return
        done = true
        panel.remove()
        onDecide(choiceId ?? 'frozen', record.sentence)
      }

      if (view.claims.length) showEvidence()
      else showChoices()
    },
  }
}
