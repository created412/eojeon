import { HISTORICAL_MEDIA } from './historical-media-data.js'
import { PORTRAITS } from './portraits-data.js'
import { FEEDBACK_MEDIA } from './feedback-media-data.js'
import { MOTHER_CLIP } from '../render/mother-person.js'
import { installTypeVars } from './type-css.js'

// The relation is part of the visible caption: a contextual image must never
// masquerade as the manuscript quoted by the game.
const SOURCE_IMAGES = {
 wonnapjeon: ['gyeongbokgung','관련 장소 · 원납전이 동원된 경복궁 중건. 공사 당시 사진은 아닙니다.'],
 dangbaekjeon: ['dangbaekjeon','실물 자료 · 상평통보 앞면과 당백 표기가 있는 뒷면을 함께 살펴보세요.'],
 bellonet: ['byeongin','관련 사건 · 병인양요의 프랑스 함대. 벨로네의 편지 원본은 아닙니다.'],
 sherman: ['sherman','관련 지도 · 사건 후에 간행된 설명 지도이며, 장계 원본은 아닙니다.'],
 yangheonsu: ['jeongjok','관련 장소 · 양헌수가 싸운 정족산성의 현재 모습. 장계 원본은 아닙니다.'],
 oegyujanggak: ['uigwe','관련 유물 · 왕실 의궤의 예시입니다. 외규장각 도서 목록 원본은 아닙니다.'],
 junggeon: ['gyeongbokgung','관련 장소 · 중건 이후의 근정전 모습. 공사 기록 원본은 아닙니다.'],
 'sinmi-officer': ['sinmi','관련 사건 · 신미양요 때 촬영된 사진. 회고록의 필자를 특정한 사진은 아닙니다.'],
 cheokhwabi: ['cheokhwabi','실물 자료 · 비석에 새겨진 洋夷侵犯 非戰則和 主和賣國을 찾아보세요.'],
 seogye: ['ganghwa-scene','관련 외교사 · 뒤에 이어진 1876년 조약 체결 그림. 1868년 서계 원본은 아닙니다.'],
 'choe-ikhyeon': ['choeikhyeon','관련 인물 · 왜양일체론을 주장한 최익현. 상소 원본은 아닙니다.'],
 unyo: ['unyo','관련 자료 · 1875년 사건에 등장한 운요호의 모습을 전하는 자료입니다.'],
 'gaehang-chanseong': ['sinheon','관련 인물 · 강화도 조약 교섭의 조선 측 대표 신헌. 지문은 게임의 재구성입니다.'],
 ganghwa1: ['ganghwa-document','원문 자료 · 강화도 조약 문서. 아래 지문은 제1관의 내용입니다.'],
 ganghwa7: ['ganghwa-document','원문 자료 · 강화도 조약 문서. 아래 지문은 제7관의 내용입니다.'],
 ganghwa10: ['ganghwa-document','원문 자료 · 강화도 조약 문서. 아래 지문은 제10관의 내용입니다.'],
 'joil-trade': ['ganghwa-document','관련 문서 · 강화도 조약입니다. 별도로 체결된 무역 규칙 원본은 아닙니다.'],
 'joseon-chaeryak': ['chaeryak','원문 자료 · 국립중앙도서관 소장 조선책략 필사본의 표지입니다.'],
 'yeongnam-manin': ['chaeryak','관련 문헌 · 상소 원본이 아닌, 영남 만인소가 비판한 조선책략입니다.'],
 'hong-jaehak': ['chaeryak','관련 문헌 · 홍재학의 상소 원본이 아닌, 척사 논쟁의 대상인 조선책략입니다.'],
 muwiyeong: ['imo','관련 사건 · 일본 측에서 그린 임오군란 판화. 급료 지급 장면이나 기록 원본은 아닙니다.'],
 jemulpo4: ['jemulpo','원문 자료 · 제4관의 五拾萬圓(50만 원) 표기를 살펴보세요.'],
 sokbang: ['lihongzhang','관련 인물 · 조청 관계에 관여한 청의 이홍장. 무역 장정 원본은 아닙니다.'],
 'gapsin-memoir': ['kimokgyun','관련 인물 · 김옥균의 실제 사진. 회고록 원본은 아닙니다.'],
 reform14: ['kimokgyun','관련 인물 · 갑신정변을 주도한 김옥균. 개혁 정강 원본은 아닙니다.'],
}
const NOTE_IMAGES = {
 throne:'injeongjeon', byeongin:'byeongin', 'gyeyu-sangso':'choeikhyeon',
 'doors-open':'heungseon','jagyeong-actual':'gyeongbokgung',
 'imo-open':'imo','imo-letter':'injeongjeon','imo-declared':'injeongjeon',
 'imo-known':'imo','imo-fact':'imo','imo-daewongun':'heungseon','imo-abduction':'heungseon',
 'imo-jemulpo':'jemulpo','imo-sokbang':'lihongzhang',
 'gapsin-open':'kimokgyun','gapsin-takezoe':'injeongjeon','gapsin-gov':'kimokgyun',
 'gapsin-qing':'injeongjeon','gapsin-flight-self':'injeongjeon','gapsin-flight-caught':'injeongjeon',
 'gapsin-hong':'kimokgyun','gapsin-after':'kimokgyun',
}
export function sourceMedia(id) {
 const entry=SOURCE_IMAGES[id]
 return entry ? {...HISTORICAL_MEDIA[entry[0]],id:entry[0],relation:entry[1],kind:'historical'} : null
}
export function noteMedia(beat) {
 const id=NOTE_IMAGES[beat.id]
 if(!id)return null
 const relation=id==='injeongjeon' ? '관련 장소 · 창덕궁의 현재 모습입니다. 지문의 사건 현장을 촬영한 사진은 아닙니다.'
  : id==='kimokgyun' ? '관련 인물 · 갑신정변의 주도자 김옥균입니다. 지문 속 다른 인물의 사진이 아닙니다.'
  : id==='heungseon' ? '관련 인물 · 흥선대원군의 1883년 사진입니다. 해당 장면을 촬영한 사진은 아닙니다.'
  : '관련 역사 자료 · 사진·그림의 제작 시점은 설명에 표시했습니다. 지문의 장면을 그대로 재현한 자료는 아닙니다.'
 return {...HISTORICAL_MEDIA[id],id,relation,kind:'historical'}
}
const NAMES={흥선대원군:'heungseon',최익현:'choeikhyeon',신헌:'sinheon',고종:'gojong',김옥균:'kimokgyun'}
export function speakerMedia(view) {
 if(view.npcId==='mother'||view.portrait==='mother')return {src:FEEDBACK_MEDIA.mother,kind:'reconstruction',caption:'여흥부대부인 민씨',relation:'고종의 어머니 · 실제 초상이 아닌 게임의 재구성',clip:MOTHER_CLIP}
 const id=NAMES[view.name] ?? (['heungseon','choeikhyeon','sinheon','gojong','kimokgyun'].includes(view.npcId)?view.npcId:null)
 if(id)return {...HISTORICAL_MEDIA[id],id,kind:'historical',relation:'전해지는 실제 사진·초상 · 당시 대화 장면을 촬영한 자료는 아닙니다.'}
 const src=PORTRAITS[view.portrait]
 if(!src)return null
 return {src,kind:'reconstruction',caption:view.name??'대화 인물',
  relation:view.npcId==='hongjaehak'||view.name==='홍재학'?'확인된 초상 미확보 · 게임에서 재구성한 모습':'역할 재구성 · 실제 인물의 사진이 아닙니다.'}
}

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function mediaFigure(media,{portrait=false}={}) {
 if(!media)return ''
 const source=media.source?`<a href="${escape(media.source)}" target="_blank" rel="noopener noreferrer">원본 출처 ↗</a>`:''
 const rights=media.license?`<a href="${escape(media.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(media.license)}</a>`:''
 return `<figure class="historical-figure${portrait?' speaker-portrait':''}${media.kind==='reconstruction'?' reconstructed':''}">
  <div class="media-heading">${media.kind==='reconstruction'?'재구성 인물':portrait?'기록 속 인물':'기록을 보다'}</div>
  ${media.id?`<button type="button" class="media-zoom" data-media="${media.id}" aria-label="${escape(media.caption)} 크게 보기">`:''}
  <img class="historical-image" src="${media.src}" alt="${escape(media.caption)}" decoding="async"${media.clip?` style="clip-path:${media.clip}"`:''}>
  ${media.id?'<span class="media-enlarge">크게 보기 ⤢</span></button>':''}
  <figcaption><strong>${escape(media.caption)}</strong><span class="media-relation">${escape(media.relation)}</span>
  ${media.credit?`<small>${escape(media.credit)}</small>`:''}<span class="media-links">${source}${rights}</span></figcaption>
 </figure>`
}

// 2026-09-26 선생님: 「'기록을 보다'는 너무 좋은데 왼쪽의 글씨가 가독성 있게 들어오지
// 않아. 글자크기도 작고 폰트도 개판이고, 이 부분의 전면 수정이 필요해.」
// 두 가지를 고쳤다. ① 설명 글자의 바닥을 올렸다(10~12px 은 프로젝터에서 안 보인다 —
// 크기는 ui/type-css.js 의 변수를 받아 쓴다). ② 칸을 다시 나눴다: 글이 좁은 칸에서
// 작게 앉고 사진만 크던 것을, 글이 넓은 칸을 갖고 사진이 곁에 서는 쪽으로 돌렸다.
const CSS=`
.historical-figure{margin:0;min-width:0;padding:16px;background:#eee7d6;border:1px solid #b8a47e66;color:#342f25;text-align:left;box-sizing:border-box}
.historical-figure .media-heading{font-size:var(--read-caption,10px);letter-spacing:.1em;color:#6a5738;margin-bottom:12px}
.historical-figure .historical-image{display:block;width:100%;height:260px;object-fit:contain;filter:none}
.historical-figure .media-zoom{display:block;position:relative;width:100%;margin:0;padding:0;min-width:0;border:0;border-radius:0;background:#d9d0bc44;cursor:zoom-in;color:inherit;letter-spacing:0}
.historical-figure .media-zoom:hover{background:#c5b68f44}
.historical-figure .media-enlarge{position:absolute;right:6px;bottom:6px;background:#18232bdc;color:#f1e2c3;padding:5px 9px;font-size:var(--read-caption,10px);border-radius:2px}
.historical-figure figcaption{margin-top:12px;font-family:var(--face-body,system-ui,'Malgun Gothic',sans-serif);
 font-size:var(--read-caption,12px);line-height:var(--read-lh-small,1.65);word-break:keep-all;letter-spacing:normal}
/* color 는 건드리지 않는다 — 이 제목은 종이 위(어두운 먹)에도, 어두운 말판·확대창 위
   (밝은 글자)에도 그대로 실려야 한다. 물려받게 두는 것이 두 곳 다 맞는 유일한 길이다. */
.historical-figure figcaption strong{display:block;font-weight:600;font-size:var(--read-small,12px);
 line-height:var(--read-lh-small,1.65);text-wrap:balance}
.historical-figure .media-relation{display:block;margin-top:6px;color:var(--ink-quiet,#655c4d);font-size:var(--read-caption,11px)}
.historical-figure small{display:block;font-size:var(--read-caption,10px);color:var(--ink-quiet,#756953);margin-top:8px}
.historical-figure .media-links{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:7px}
.historical-figure a{font-size:var(--read-caption,10px);color:#5b4622;text-underline-offset:3px;pointer-events:auto}
.eojeon .veil .card.has-media{max-width:min(1060px,94vw);padding:30px}
.card.has-media .source-layout{display:grid;grid-template-columns:minmax(0,1fr) clamp(260px,30%,380px);gap:30px;align-items:start}
.card .source-copy{min-width:0}
/* 글 칸이 먼저다 — 1fr 을 글에 주고, 사진은 정해진 폭으로 곁에 선다. 예전에는 사진 칸이
   1fr 로 함께 늘어나 글 칸이 좁아졌고, 그 좁은 칸에서 17px 글이 앉아 있었다. */
.eojeon .note .sheet.has-media{max-width:min(960px,94vw);display:grid;grid-template-columns:minmax(0,1fr) clamp(270px,34%,350px);gap:32px;align-items:center;text-align:left;flex-shrink:0}
.note .note-copy{display:flex;flex-direction:column;gap:16px;min-width:0}
.eojeon .speak .conversation{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);width:min(1220px,92vw);display:grid;grid-template-columns:minmax(0,1fr) clamp(220px,24vw,310px);gap:20px;align-items:end}
.eojeon .speak .conversation .panel{position:relative;left:auto;bottom:auto;transform:none;width:100%;min-height:174px;max-height:65vh;overflow:auto;box-sizing:border-box;padding-top:40px;border-radius:4px}
.eojeon .speak .conversation .name{top:0;left:0;border-radius:3px 0 3px 0}
.eojeon .speak .conversation .name em{color:#4c5145}
.eojeon .speak .conversation .line{margin-top:12px;padding-bottom:18px}
.eojeon .speak .speaker-portrait{pointer-events:auto;background:#18232bed;border:1px solid #c5aa7566;box-shadow:0 16px 50px #0007;padding:14px;color:#eadcc0;animation:speakIn .28s ease-out}
.eojeon .speak .speaker-portrait .historical-image{height:min(39vh,370px)}
.eojeon .speak .speaker-portrait .media-heading,.eojeon .speak .speaker-portrait .media-relation,.eojeon .speak .speaker-portrait small,.eojeon .speak .speaker-portrait a{color:#c7bfae}
.eojeon .speak .speaker-portrait.reconstructed{background:transparent;border:0;box-shadow:none;padding:0}
.eojeon .speak .speaker-portrait.reconstructed .historical-image{height:min(50vh,460px);filter:drop-shadow(0 8px 12px #0008)}
.eojeon .speak .speaker-portrait.reconstructed .media-heading{display:none}
.eojeon .speak .speaker-portrait.reconstructed figcaption{padding:8px 12px;text-shadow:0 1px 4px #000,0 0 8px #000;background:linear-gradient(90deg,#11182088,transparent)}
.eojeon:has(.speak) .game-map,.eojeon:has(.speak) .game-controls{visibility:hidden}
.historical-viewer{position:fixed;inset:0;width:min(1100px,96vw);max-width:96vw;max-height:94vh;margin:auto;padding:18px;border:1px solid #b79b68;background:#18232b;color:#efe5d1;box-sizing:border-box;overflow:auto;box-shadow:0 20px 100px #000a}
.historical-viewer::backdrop{background:#081018e8}
.historical-viewer .viewer-close{display:block;margin:0 0 14px auto;padding:9px 16px;border:1px solid #b79b68;background:#26343c;color:#efe5d1;cursor:pointer}
.historical-viewer .historical-figure{border:0;background:transparent;color:#efe5d1}
.historical-viewer .historical-image{height:auto;max-height:65vh}
.historical-viewer .media-relation,.historical-viewer small,.historical-viewer a,.historical-viewer .media-heading{color:#c7bfae}
@media(max-width:700px){
 .card.has-media .source-layout,.eojeon .note .sheet.has-media{grid-template-columns:1fr;gap:20px}
 .eojeon .veil .card.has-media{padding:24px 20px;max-height:88vh}
 .historical-figure .historical-image{height:220px}
 .eojeon .speak .conversation{width:94vw;gap:10px;grid-template-columns:minmax(0,1fr) 170px;bottom:14px}
 .eojeon .speak .conversation .panel{padding:36px 18px 24px}
 .eojeon .speak .speaker-portrait{padding:9px}
 .eojeon .speak .speaker-portrait .historical-image{height:25vh}
 .eojeon .speak .speaker-portrait.reconstructed .historical-image{height:32vh}
}
@media(max-width:500px){
 .eojeon .speak .conversation{display:flex;flex-direction:column;align-items:flex-end;max-height:95vh;gap:12px}
 .eojeon .speak .speaker-portrait{order:-1;width:150px;max-height:42vh;overflow:auto}
 .eojeon .speak .speaker-portrait .historical-image{height:17vh}
 .eojeon .speak .speaker-portrait.reconstructed .historical-image{height:25vh}
 .eojeon .speak .speaker-portrait .media-heading,.eojeon .speak .speaker-portrait small{display:none}
 .eojeon .speak .speaker-portrait figcaption{margin-top:6px;font-size:11px}
 .eojeon .speak .speaker-portrait .media-relation{font-size:10px}
 .eojeon .speak .conversation .panel{max-height:48vh;min-height:160px}
}
@media(max-height:550px) and (min-width:501px){
 .eojeon .speak .conversation{grid-template-columns:minmax(0,1fr) 200px;bottom:12px}
 .eojeon .speak .speaker-portrait{max-height:90vh;overflow:auto;padding:10px}
 .eojeon .speak .speaker-portrait .historical-image{height:36vh}
 .eojeon .speak .speaker-portrait.reconstructed .historical-image{height:48vh}
 .eojeon .speak .speaker-portrait .media-heading{display:none}
}
`
export function installHistoricalMedia() {
 installTypeVars()
 if(document.getElementById('historical-media-style'))return
 const style=document.createElement('style');style.id='historical-media-style';style.textContent=CSS;document.head.appendChild(style)
}
export function bindMedia(container) {
 container.querySelectorAll('.media-zoom').forEach(button=>button.addEventListener('click',event=>{
  event.stopPropagation()
  const media=HISTORICAL_MEDIA[button.dataset.media]
  if(!media)return
  const modal=document.createElement('dialog');modal.className='historical-viewer'
  modal.setAttribute('aria-label',media.caption)
  modal.innerHTML='<button type="button" class="viewer-close">닫기 (Esc)</button>'+mediaFigure({...media,kind:'historical',relation:'원본의 비율과 색상을 유지한 자료입니다. 크기 조정·압축만 적용했습니다.'})
  document.body.appendChild(modal)
  modal.addEventListener('keydown',e=>e.stopPropagation())
  modal.addEventListener('keyup',e=>e.stopPropagation())
  modal.querySelector('.viewer-close').addEventListener('click',()=>modal.close())
  modal.addEventListener('close',()=>{modal.remove();if(button.isConnected)button.focus()},{once:true})
  modal.showModal()
 }))
}
