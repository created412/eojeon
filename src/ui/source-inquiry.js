import {INQUIRIES,inquiryReady,answerLength,MIN_ANSWER,clozeBlanks,clozeCorrect} from '../data/inquiries.js'
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function inquiryHtml(id){
 const s=INQUIRIES[id];if(!s)return ''
 const reading=t=>{const r=s.readings?.[t];return r?`<small class="token-reading">${esc(r[0])}<br>${esc(r[1])}</small>`:''}
 let blank=0
 const cloze=()=>`<div class="inquiry-original inquiry-cloze">${s.parts.map(p=>typeof p==='string'?esc(p):`<select class="cloze-blank" data-blank="${blank++}" aria-label="빈칸 ${blank}"><option value="">(　　　)</option>${s.options.map(o=>`<option>${esc(o)}</option>`).join('')}</select>`).join('')}</div>`
 const tokens=()=>`<div class="inquiry-original">${s.tokens.map(t=>t==='…'?'<span>…</span>':`<button type="button" class="evidence-token${s.readings?' has-reading':''}" data-token="${esc(t)}" aria-pressed="false"><span class="token-text">${t}</span>${reading(t)}</button>`).join('')}</div>`
 return `<section class="source-inquiry"><h4>${s.question}</h4>${s.context?`<p class="inquiry-context">${s.context}</p>`:''}<p>${s.instruction}</p>
 ${s.kind==='cloze'?cloze():tokens()}
 <small>${s.originalNote??'조약의 우리말 옮김 · 선택한 구절이 해석의 근거가 됩니다.'}</small>
 <button type="button" class="inquiry-hint">단서 한 가지 더 보기</button><p class="hint-text" aria-live="polite"></p>
 <label>${s.prompt}<textarea class="inquiry-answer" rows="4" maxlength="1600" placeholder="내가 표시한 구절은 …이므로, …라고 해석한다."></textarea></label>
 <p class="inquiry-status" role="status">근거를 표시하고 자신의 해석을 한 문장 이상 써 주세요.</p>
 <button type="button" class="inquiry-compare">내 해석을 기록하고 해설과 비교</button>
 <div class="inquiry-comparison" hidden><b>다른 해석과 비교하기</b><p>${s.compare}</p><p>${s.counter}</p>
 <a class="inquiry-source-link" href="${s.source}" target="_blank" rel="noopener noreferrer">국사편찬위원회 자료 확인 ↗</a>
 <label>비교한 뒤 보완할 점 (선택)<textarea class="inquiry-revision" rows="2" maxlength="1200"></textarea></label></div></section>`
}
export function bindInquiry(container,id,{initial={},onSave=()=>{},onReady=()=>{}}={}){
 const spec=INQUIRIES[id];if(!spec)return null
 let record={selected:[],blanks:{},text:'',revision:'',...initial},hint=0
 const section=container.querySelector('.source-inquiry'),answer=section.querySelector('.inquiry-answer'),revision=section.querySelector('.inquiry-revision'),status=section.querySelector('.inquiry-status')
 answer.value=record.text;revision.value=record.revision
 const blanks=[...section.querySelectorAll('.cloze-blank')]
 blanks.forEach(sel=>{
  sel.value=record.blanks?.[sel.dataset.blank]??''
  sel.addEventListener('change',()=>{record.blanks={...record.blanks,[sel.dataset.blank]:sel.value};record.compared=false;refresh();save()})
 })
 function refresh(){
  // 빈칸: 고른 칸만 맞고 틀림을 칠한다. 안 고른 칸은 표시하지 않는다.
  const answers=clozeBlanks(spec)
  blanks.forEach(sel=>{const v=record.blanks?.[sel.dataset.blank];sel.classList.toggle('right',!!v&&v===answers[sel.dataset.blank].answer);sel.classList.toggle('wrong',!!v&&v!==answers[sel.dataset.blank].answer)})
  section.querySelectorAll('.evidence-token').forEach(b=>b.setAttribute('aria-pressed',String(record.selected.includes(b.dataset.token))))
  section.querySelector('.inquiry-comparison').hidden=!record.compared
  status.textContent=record.compared?'저장된 해석입니다. 아래 해설과 비교하고 생각을 보완할 수 있습니다.':'근거를 표시하고 자신의 해석을 한 문장 이상 써 주세요.'
  onReady(!!record.compared)
 }
 function save(){const ok=onSave({...record});if(ok===false)status.textContent='기록을 기기에 저장하지 못했습니다. 작성한 내용을 복사해 두세요.'}
 section.querySelectorAll('.evidence-token').forEach(b=>b.addEventListener('click',()=>{
  const t=b.dataset.token;record.selected=record.selected.includes(t)?record.selected.filter(v=>v!==t):[...record.selected,t]
  record.compared=false;refresh();save()
 }))
 answer.addEventListener('input',()=>{record.text=answer.value;record.compared=false;refresh();save()})
 revision.addEventListener('input',()=>{record.revision=revision.value;save()})
 section.querySelector('.inquiry-hint').addEventListener('click',()=>{
  section.querySelector('.hint-text').textContent=spec.hints[Math.min(hint++,spec.hints.length-1)]
 })
 section.querySelector('.inquiry-compare').addEventListener('click',()=>{
  if(!inquiryReady(spec,record)){status.textContent=spec.kind==='cloze'&&!clozeCorrect(spec,record)?'빈칸을 모두 알맞게 채워 주세요. 붉은 칸을 다시 골라 보세요.':answerLength(record.text)<MIN_ANSWER?'해석을 한 문장 이상 써 주세요.':'핵심이 되는 구절을 하나 더 짚어 보세요. 단서를 열면 도움이 됩니다.';return}
  record.compared=true;refresh();status.textContent='내 해석을 기록했습니다. 아래 해설과 비교해 보세요. 정답을 자동 채점하지 않습니다.';save()
  section.querySelector('.inquiry-comparison').scrollIntoView({block:'nearest'})
 })
 refresh();return {ready:()=>!!record.compared}
}
export function installInquiryStyle(){
 if(document.getElementById('source-inquiry-style'))return
 const style=document.createElement('style');style.id='source-inquiry-style';style.textContent=`
 .source-inquiry{margin-top:18px;border-top:1px solid #ad9b79;padding-top:16px}
 .source-inquiry h4{font:21px/1.5 Batang,serif;margin:0 0 12px;color:#382c1c}
 .source-inquiry p,.source-inquiry label{font:14px/1.8 system-ui;color:#403a2e}
 .source-inquiry .inquiry-original{font:20px/2 Batang,serif;margin:16px 0;padding:14px;background:#fbf5e4}
 .source-inquiry .evidence-token{font:inherit;color:#382c1c;background:transparent;border:2px solid transparent;border-radius:50%;padding:2px 6px;cursor:pointer}
 .source-inquiry .evidence-token[aria-pressed=true]{border-color:#a4352c;background:#ad392710}
 .source-inquiry .evidence-token.has-reading{display:inline-flex;flex-direction:column;align-items:center;vertical-align:top;border-radius:10px;margin:2px;padding:4px 8px}
 .source-inquiry .token-reading{display:block;font:12px/1.35 system-ui;color:#6c5a3e;margin-top:2px}
 .source-inquiry .inquiry-cloze{font:18px/2.3 Batang,serif;color:#382c1c}
 .source-inquiry .cloze-blank{font:600 16px system-ui;padding:3px 6px;margin:0 3px;border:2px solid #9d8b6b;border-radius:6px;background:#fffaf0;color:#382c1c}
 .source-inquiry .cloze-blank.right{border-color:#4c7a4a;background:#e3f0dc}
 .source-inquiry .cloze-blank.wrong{border-color:#a4352c;background:#f6dcd6}
 .source-inquiry .inquiry-context{background:#efe6cf;border-left:3px solid #9d8b6b;padding:10px 12px}
 .source-inquiry small{display:block;font-size:11px;color:#746a58}
 .source-inquiry textarea{display:block;width:100%;box-sizing:border-box;font:15px/1.7 system-ui;border:1px solid #9d8b6b;background:#fffaf0;color:#2b2924;padding:12px;margin:8px 0 14px;resize:vertical}
 .source-inquiry .inquiry-hint{background:transparent;color:#6c4d27;border:0;text-decoration:underline;padding:10px 0;cursor:pointer}
 .source-inquiry .inquiry-compare{width:100%;padding:12px;background:#374f4e;color:#fff4d7;border:0;cursor:pointer}
 .source-inquiry .inquiry-status{font-size:12px;color:#795028}
 .source-inquiry .inquiry-comparison{margin-top:20px;padding:16px;background:#dedfcf;border-left:3px solid #647763}
 .source-inquiry a{color:#4c604a;font-size:12px}
 .source-inquiry .inquiry-source-link{display:block;margin:0 0 12px}
 .card.has-inquiry .meaning,.card.has-inquiry .gloss,.card.has-inquiry .excerpt{display:none}
 .card.has-inquiry .close:disabled{opacity:.45;cursor:not-allowed}
 `;document.head.appendChild(style)
}
