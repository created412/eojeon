const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
let pw;try{pw=require('playwright')}catch{pw=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}
(async()=>{
 const out=path.resolve('.superpowers/inquiry-world-qa');fs.mkdirSync(out,{recursive:true});
 const {outputFiles}=await require('esbuild').build({stdin:{contents:`
 import {createDialog} from './src/ui/dialog.js';import {createBrush} from './src/ui/brush.js';import {createDispatchMap} from './src/ui/dispatch-map.js';
 import {createSpeak} from './src/ui/speak.js';import {installCinematicStyle} from './src/ui/cinematic-style.js';import {installRoyalInterface} from './src/ui/royal-interface.js';
 import {SOURCES} from './src/data/sources.js';import {ACTS} from './src/data/acts.js';import {NPCS} from './src/data/npcs.js';
 import {BRUSH_GUIDES} from './src/ui/brush-guides-data.js';import {CHEOKHWABI_GLYPHS} from './src/systems/brush-trace.js';
 const root=document.getElementById('root');installCinematicStyle(root);installRoyalInterface();
 const records=JSON.parse(localStorage.getItem('qa-inquiries')||'{}');let closed=0;
 const dialog=createDialog(root,{getInquiry:id=>records[id],onInquirySave:(id,r)=>{records[id]=r;localStorage.setItem('qa-inquiries',JSON.stringify(records));return true}});
 const brush=createBrush(root),map=createDispatchMap(root),speak=createSpeak(root);
 window.preview={guides:BRUSH_GUIDES,glyphs:CHEOKHWABI_GLYPHS,records,get closed(){return closed},
 card:id=>dialog.showCard(SOURCES.find(c=>c.id===id)),close:()=>dialog.close(),
 codex:()=>dialog.showCodex({sources:{held:['seogye'],read:['seogye'],lost:[]}},()=>closed++),
 map:i=>{map.show(ACTS.flatMap(a=>a.beats).filter(b=>b.kind==='dispatch')[i])},
 brush:()=>{brush.open({glyphs:CHEOKHWABI_GLYPHS,title:'척화비',afterLines:['모든 글자를 완성했습니다.']})},
 speaker:()=>{const n=NPCS.find(n=>n.id==='hojo');speak.show({...n,npcId:n.id,portrait:'mid'})}
 };
 `,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife'});
 const fixture=path.join(out,'fixture.html');fs.writeFileSync(fixture,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:linear-gradient(120deg,#8c8067,#364d40);font-family:system-ui}#root{min-height:100vh}</style><div id="root"></div><script>${outputFiles[0].text}</script></html>`);
 const browser=await pw.chromium.launch({channel:'chrome',headless:true,args:['--allow-file-access-from-files']});
 const errors=[],requests=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
  await page.goto(pathToFileURL(fixture).href);
  await page.evaluate(()=>preview.card('seogye'));
  assert.ok(await page.locator('.close').isDisabled());
  await page.evaluate(()=>preview.close());assert.equal(await page.locator('.source-inquiry').count(),1,'E close cannot skip activity');
  await page.locator('.inquiry-hint').click();assert.match(await page.locator('.hint-text').innerText(),/통치자/);
  await page.locator('[data-token="皇"]').click();await page.locator('[data-token="勅"]').click();
  const answer='황제의 호칭과 황제의 명령은 기존 교린 관계의 외교 격식과 충돌한다고 생각한다.';
  await page.locator('.inquiry-answer').fill(answer);
  assert.ok(await page.locator('.inquiry-comparison').isHidden());
  await page.locator('.inquiry-compare').click();assert.ok(await page.locator('.close').isEnabled());
  await page.locator('.inquiry-revision').fill('일본의 새 정부 수립 통보라는 맥락도 함께 검토해야 한다.');
  await page.screenshot({path:path.join(out,'seogye-compared.png')});
  await page.reload();await page.evaluate(()=>preview.card('seogye'));
  assert.equal(await page.locator('.inquiry-answer').inputValue(),answer);
  assert.ok(await page.locator('.close').isEnabled());
  await page.locator('.close').click();await page.evaluate(()=>preview.codex());
  await page.locator('.codex [role=button]').click();assert.equal(await page.evaluate(()=>preview.closed),0,'opening held card must not close codex session');
  await page.locator('.close').click();assert.equal(await page.locator('.codex').count(),1);
  await page.locator('.close').click();assert.equal(await page.evaluate(()=>preview.closed),1);
  for(const [id,tokens] of [['ganghwa1',['자주의 나라']],['ganghwa7',['일본국 항해자','자유로이 해안을 측량']],['ganghwa10',['모두 일본국 관원이 심판한다.']]]){
   await page.evaluate(id=>preview.card(id),id);
   for(const token of tokens)await page.locator('.evidence-token').filter({hasText:token}).click();
   await page.locator('.inquiry-answer').fill('조약의 문구를 근거로 일본이 얻는 이익과 조선이 제한받는 권한을 비교해 보았다.');
   await page.locator('.inquiry-compare').click();assert.ok(await page.locator('.close').isEnabled());
   if(id==='ganghwa10')await page.screenshot({path:path.join(out,'treaty-compared.png')});
   await page.locator('.close').click();
  }
  for(let i=0;i<3;i++){
   await page.evaluate(i=>preview.map(i),i);
   const spots=page.locator('.map-hotspot');assert.ok(await spots.count()>=2);
   for(let j=0;j<await spots.count();j++){
    const b=spots.nth(j);await b.hover();assert.equal(await b.getAttribute('aria-pressed'),'true');
    await b.focus();assert.equal(await b.getAttribute('aria-pressed'),'true');await b.click();
   }
   if(i===0){await page.locator('[data-at="ganghwabu"]').hover();assert.equal(await page.locator('.report-heading').innerText(),'강화부가 저들의 손에 들어갔다');assert.equal(await page.locator('[data-at="pyeongyang"]').count(),0)}
   if(i===1){await page.locator('[data-at="gwangseongbo"]').hover();assert.match(await page.locator('.report-heading').innerText(),/광성보가 무너지고/)}
   await page.screenshot({path:path.join(out,`map-${i}.png`)});await page.locator('.dispatch .go').click();
  }
  await page.evaluate(()=>preview.brush());
  const drawPoints=async(points)=>{
   const box=await page.locator('.brush canvas').boundingBox();
   // Each sampled guide is physically tapped. This covers every visible part, without calling grading internals.
   for(const p of points){await page.mouse.move(box.x+p.x*box.width,box.y+p.y*box.height);await page.mouse.down();await page.mouse.move(box.x+p.x*box.width+1,box.y+p.y*box.height);await page.mouse.up()}
  };
  assert.ok(await page.locator('.brush .next').isDisabled());
  const first=await page.evaluate(()=>preview.guides[preview.glyphs[0]]);
  await drawPoints(first.filter(p=>p.x<.4).filter((_,i)=>i%3===0));
  await page.waitForTimeout(1200);assert.ok(await page.locator('.brush .next').isDisabled());assert.match(await page.locator('.brush .count').innerText(),/^1 \/ 12/);
  await page.screenshot({path:path.join(out,'brush-incomplete.png')});
  await page.locator('.brush .reset').click();
  // Scan individual ink runs, using real pointer moves (fast enough for all 12 glyphs).
  const glyphs=await page.evaluate(()=>preview.glyphs);
  for(let i=0;i<glyphs.length;i++){
   const points=await page.evaluate(ch=>preview.guides[ch],glyphs[i]),box=await page.locator('.brush canvas').boundingBox();
   const rows=new Map();for(const p of points){const k=p.y;if(!rows.has(k))rows.set(k,[]);rows.get(k).push(p)}
   for(const row of rows.values()){
    row.sort((a,b)=>a.x-b.x);let active=false,last=null;
    for(const p of row){if(last&&p.x-last.x>.04){await page.mouse.up();active=false}
     await page.mouse.move(box.x+p.x*box.width,box.y+p.y*box.height);if(!active){await page.mouse.down();active=true}last=p;
    }if(active)await page.mouse.up();
   }
   assert.ok(await page.locator('.brush .next').isEnabled(),`complete ${glyphs[i]}`);
   if(i===0){await page.waitForTimeout(1200);assert.match(await page.locator('.brush .count').innerText(),/^1 \/ 12/);await page.screenshot({path:path.join(out,'brush-complete.png')})}
   await page.locator('.brush .next').click();
   if(i<glyphs.length-1)assert.ok(await page.locator('.brush .next').isDisabled());
  }
  assert.ok(await page.locator('.brush .after').isVisible());await page.locator('.brush .go').click();
  for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(size);await page.evaluate(()=>preview.map(1));await page.locator('[data-at="gwangseongbo"]').click();
   const surface=await page.locator('.map-surface').boundingBox();assert.ok(surface.x>=0&&surface.x+surface.width<=size.width+1);
   await page.screenshot({path:path.join(out,`map-${size.width}.png`)});await page.locator('.dispatch .go').click();
   await page.evaluate(()=>preview.card('ganghwa7'));await page.locator('.close').click();
  }
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>preview.speaker());
  await page.locator('.speaker-portrait .historical-image').evaluate(img=>img.decode());
  assert.equal(await page.locator('.speaker-portrait').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.screenshot({path:path.join(out,'transparent-portrait.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'transparent-portrait-mobile.png')});
  // The shipped game must persist drafts without replacing the safe scenario checkpoint.
  const {ACTS}=await import('../src/data/acts.js');const {createState,SAVE_KEY}=await import('../src/core/state.js');
  const {enterAct,applyBeat,applyGrant}=await import('../src/systems/scenario.js');
  const bi=ACTS[2].beats.findIndex(b=>b.kind==='explore');let state=enterAct(createState(),ACTS[2],2);
  for(let i=0;i<bi;i++)state=applyGrant(applyBeat(state,ACTS[2].beats[i]),ACTS[2].beats[i]);
  state={...state,actIndex:2,beatIndex:bi,beatEntered:false,sources:{...state.sources,held:['seogye'],read:['seogye']}};
  await page.setViewportSize({width:1440,height:900});await page.goto(pathToFileURL(path.resolve('어전.html')).href);
  await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});await page.reload();
  await page.locator('.opening-primary').click();await page.locator('.cinema-codex').click();await page.locator('.codex [role=button]').click();
  const checkpoint=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  await page.locator('[data-token="皇"]').click();await page.locator('[data-token="勅"]').click();
  await page.locator('.inquiry-answer').fill(answer);await page.locator('.inquiry-compare').click();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  assert.equal(saved.inquiries.seogye.text,answer);assert.equal(saved.beatIndex,checkpoint.beatIndex);assert.equal(saved.beatEntered,checkpoint.beatEntered);
  await page.reload();await page.locator('.opening-primary').click();await page.locator('.cinema-codex').click();await page.locator('.codex [role=button]').click();
  assert.equal(await page.locator('.inquiry-answer').inputValue(),answer);assert.ok(await page.locator('.close').isEnabled());
  await page.locator('.card').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,'game-inquiry-restored.png')});
  await page.locator('.close').click();assert.ok(await page.locator('.codex').isVisible());await page.locator('.close').click();
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log(JSON.stringify({inquiries:4,maps:3,tracedGlyphs:12,viewportChecks:3,gameDraftRestored:true,errors,requests,out}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
