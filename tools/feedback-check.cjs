const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const pw=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const out=path.resolve('.superpowers/feedback-qa');fs.mkdirSync(out,{recursive:true});
 const {outputFiles}=await require('esbuild').build({stdin:{resolveDir:process.cwd(),loader:'js',contents:`
 import {createRation} from './src/ui/ration.js';import {createSalvage} from './src/ui/salvage.js';
 import {createSpeak} from './src/ui/speak.js';import {createDialog} from './src/ui/dialog.js';
 import {createVoicePlayer} from './src/systems/voice.js';import {VOICE} from './src/data/voice-data.js';
 import {ACTS} from './src/data/acts.js';import {NPCS,portraitKeyOf} from './src/data/npcs.js';import {SOURCES} from './src/data/sources.js';
 import {createScene} from './src/render/scene.js';import {PALACES} from './src/data/palaces.js';import {modelsReady} from './src/render/glb-person.js';
 import {installCinematicStyle} from './src/ui/cinematic-style.js';import {installRoyalInterface} from './src/ui/royal-interface.js';
 const root=document.querySelector('#root'), voice=createVoicePlayer({clips:VOICE});
 installCinematicStyle(root);installRoyalInterface();
 const ration=createRation(root),salvage=createSalvage(root),speak=createSpeak(root,{voice});let record={};
 const dialog=createDialog(root,{getInquiry:()=>record,onInquirySave:(_id,r)=>{record=r;return true}});
 const rationBeat=ACTS.flatMap(a=>a.beats).flatMap(b=>b.stops??[]).map(s=>s.beat).find(v=>v?.ration);
 let ctx=null;
 window.qa={
 ration(){ration.open({market:{title:'종로의 쌀값',lines:['오늘은 무위영의 급료를 살펴본다.'],series:[],riceText:'',stagedNote:'학습용 재구성'},ration:rationBeat.ration})},
 mother(){const n=NPCS.find(n=>n.id==='mother');speak.show({...n,npcId:n.id,portrait:portraitKeyOf(n)})},
 close(){speak.close();dialog.close()},
 cloze(){dialog.showCard(SOURCES.find(s=>s.id==='joseon-chaeryak'))},
 preservation(){const b=ACTS.flatMap(a=>a.beats).find(b=>b.id==='great-fire');salvage.open({...b,cards:SOURCES.slice(0,6)}).then(r=>window.qa.result=r)},
 async world(){ctx=createScene(document.querySelector('canvas'));ctx.setPalace(PALACES.unhyeon);await modelsReady(ctx.THREE);ctx.setNpcs([NPCS.find(n=>n.id==='mother')]);ctx.player.position.set(12,1.9,7);ctx.setReducedMotion(true);function frame(){if(!ctx)return;ctx.render();requestAnimationFrame(frame)}frame()},
 get record(){return record},clips:{},
 };
 `},bundle:true,format:'iife',write:false});
 const fixture=path.join(out,'fixture.html');fs.writeFileSync(fixture,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#283829;font-family:system-ui}canvas{width:100vw;height:100vh;display:block}#root{position:fixed;inset:0;pointer-events:none}#root>*{pointer-events:auto}</style><canvas></canvas><div id="root"></div><script>${outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script></html>`);
 const browser=await pw.chromium.launch({channel:'chrome',headless:true,args:['--allow-file-access-from-files']});
 const errors=[],external=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())});
  await page.addInitScript(()=>{const Original=window.Audio;window.qaAudio=[];window.Audio=function(src){const a=new Original(src);window.qaAudio.push(a);return a}});
  await page.goto(pathToFileURL(fixture).href);
  await page.evaluate(()=>qa.ration());await page.getByRole('button',{name:'무위영으로 간다'}).click();
  await page.locator('.sack img').evaluate(img=>img.decode());
  assert.ok(await page.locator('.sack img').evaluate(img=>img.naturalWidth>=1000));
  await page.screenshot({path:path.join(out,'ration-sack.png')});
  await page.locator('.sack').focus();await page.keyboard.press('Enter');
  await page.locator('.grain img').evaluate(img=>img.decode());
  await page.screenshot({path:path.join(out,'ration-grain.png')});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.locator('.ration').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.screenshot({path:path.join(out,'ration-mobile.png')});
  await page.getByRole('button',{name:'돌아간다'}).click();
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>qa.world());
  await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'mother-world.png')});
  await page.evaluate(()=>qa.mother());await page.locator('.speaker-portrait img').evaluate(img=>img.decode());
  assert.match(await page.locator('.speaker-portrait').innerText(),/여흥부대부인 민씨/);
  await page.locator('.speak .panel').click();await page.screenshot({path:path.join(out,'mother-dialog.png')});
  const portrait=await page.locator('.speaker-portrait').boundingBox();assert.ok(portrait.width<400&&portrait.x>800,'portrait beside the dialogue');
  await page.evaluate(()=>qa.close());
  await page.evaluate(()=>qa.cloze());assert.equal(await page.locator('.cloze-blank').count(),4);
  await page.locator('.cloze-blank').nth(0).selectOption('일본');assert.match(await page.locator('.cloze-blank').nth(0).getAttribute('class'),/wrong/);
  for(const [i,value] of ['러시아','러시아','중국(청)','일본'].entries())await page.locator('.cloze-blank').nth(i).selectOption(value);
  await page.locator('.inquiry-answer').fill('청의 외교관이 조선을 자기 나라와 협력하게 하려 했다고 생각한다.');
  await page.locator('.inquiry-compare').click();assert.equal(await page.evaluate(()=>qa.record.compared),true);
  await page.screenshot({path:path.join(out,'chaeryak.png')});await page.evaluate(()=>qa.close());
  await page.evaluate(()=>qa.preservation());for(let i=0;i<3;i++)await page.locator('.salvage .doc').nth(i).click();
  assert.ok(await page.locator('.salvage .go').isDisabled());
  await page.locator('.salvage .reason').fill('서로 다른 사람의 입장을 남겨야 한쪽 주장만으로 판단하지 않을 수 있다.');
  await page.screenshot({path:path.join(out,'preservation.png')});await page.locator('.salvage .go').click();
  assert.match(await page.locator('.salvage').innerText(),/모든 학습 자료와 해석은 사초함에 보존/);
  await page.locator('.salvage .go').click();assert.equal(await page.evaluate(()=>qa.result.selected.length),3);

  const {ACTS}=await import('../src/data/acts.js');const {createState,SAVE_KEY}=await import('../src/core/state.js');
  const {enterAct,applyBeat,applyGrant}=await import('../src/systems/scenario.js');
  const real=pathToFileURL(path.resolve('dist/어전.html')).href;await page.goto(real);
  function stateAt(ai,bi){let s=createState();for(let a=0;a<=ai;a++){s=enterAct(s,ACTS[a],a);for(let b=0;b<(a===ai?bi:ACTS[a].beats.length);b++)s=applyGrant(applyBeat(s,ACTS[a].beats[b]),ACTS[a].beats[b])}return {...s,beatIndex:bi,beatEntered:false}}
  async function resume(state){await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});await page.reload();await page.locator('.opening-primary').click()}
  await resume(stateAt(0,0));await page.waitForFunction(()=>qaAudio.some(a=>!a.paused&&a.currentTime>.1));
  const noteCount=await page.evaluate(()=>qaAudio.length);assert.ok(noteCount>0);
  await page.locator('.note-next').click();assert.ok(await page.evaluate(()=>qaAudio.every(a=>a.paused)));
  await resume(stateAt(0,ACTS[0].beats.findIndex(b=>b.kind==='procession')));
  await page.waitForFunction(()=>qaAudio.some(a=>!a.paused&&a.currentTime>.1));
  // Accelerate playback, not game timers, to verify all three clips queue without overlap.
  await page.evaluate(()=>{window.qaRateTimer=setInterval(()=>qaAudio.forEach(a=>a.playbackRate=8),50)});
  await page.waitForFunction(()=>qaAudio.length>=3,{},{timeout:20000});
  assert.ok(await page.evaluate(()=>qaAudio.filter(a=>!a.paused&&!a.ended).length<=1));
  await page.screenshot({path:path.join(out,'procession-voice.png')});
  const fire=stateAt(2,ACTS[2].beats.findIndex(b=>b.id==='great-fire'));const before=[...fire.sources.held];
  await resume(fire);for(let i=0;i<3;i++)await page.locator('.salvage .doc').nth(i).click();
  await page.locator('.salvage .reason').fill('다양한 입장을 기록한 자료를 함께 남겨 사건을 여러 관점에서 살펴보려 한다.');
  await page.locator('.salvage .go').click();await page.locator('.salvage .go').click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).preservation?.['great-fire'],SAVE_KEY);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);assert.deepEqual(saved.sources.held,before);assert.equal(saved.preservation['great-fire'].selected.length,3);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS: artwork, mobile layout, mother portrait/world, cloze, preserved sources, and real dist narration. Zero browser errors/external requests.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
