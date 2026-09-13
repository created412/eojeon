const fs=require('node:fs'), path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
let playwright;try{playwright=require('playwright')}catch{playwright=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))}
(async()=>{
 const out=path.resolve('.superpowers/historical-media-qa');fs.mkdirSync(out,{recursive:true});
 const sharp=require('sharp'),manifest=JSON.parse(fs.readFileSync('assets/historical/manifest.json','utf8'));
 const composite=[];
 for(let i=0;i<manifest.length;i++){
  composite.push({input:await sharp(`assets/historical/${manifest[i].id}.webp`).resize(220,210,{fit:'contain',background:'#eee6d8'}).png().toBuffer(),left:i%5*230,top:Math.floor(i/5)*240});
  composite.push({input:Buffer.from(`<svg width="220" height="25"><text x="4" y="18" font-size="14">${manifest[i].id}</text></svg>`),left:i%5*230,top:Math.floor(i/5)*240+210});
 }
 await sharp({create:{width:1150,height:Math.ceil(manifest.length/5)*240,channels:3,background:'#eee6d8'}}).composite(composite).png().toFile(path.join(out,'contact.png'));
 const {outputFiles}=await require('esbuild').build({stdin:{contents:`
 import {createSpeak} from './src/ui/speak.js';import {createDialog} from './src/ui/dialog.js';import {createNoteScreen} from './src/ui/note-screen.js';
 import {installCinematicStyle} from './src/ui/cinematic-style.js';import {installRoyalInterface} from './src/ui/royal-interface.js';
 import {SOURCES} from './src/data/sources.js';import {NPCS} from './src/data/npcs.js';import {ACTS} from './src/data/acts.js';
 const root=document.getElementById('root');installCinematicStyle(root);installRoyalInterface();
 const speak=createSpeak(root),dialog=createDialog(root),notes=createNoteScreen(root);
 window.preview={card:id=>{speak.close();dialog.showCard(SOURCES.find(c=>c.id===id))},speaker:id=>{dialog.close();const n=NPCS.find(n=>n.id===id);speak.show({...n,npcId:n.id,portrait:n.rank==='regent'?'regent':n.rank==='senior'?'senior':'mid'})},note:id=>{speak.close();dialog.close();notes.show(ACTS.flatMap(a=>a.beats).find(b=>b.id===id))}};
 addEventListener('keydown',e=>{if(e.code==='KeyE')speak.press()});
 `,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife'});
 const fixture=path.join(out,'fixture.html');fs.writeFileSync(fixture,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#344047;font-family:system-ui}#root{min-height:100vh}</style><div id="root"></div><script>${outputFiles[0].text}</script></html>`);
 const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:['--allow-file-access-from-files']});
 const errors=[],requests=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
  await page.goto(pathToFileURL(fixture).href);
  for(const m of manifest){assert.ok(fs.statSync(m.originalPath).size>1000)}
  const {SOURCES}=await import('../src/data/sources.js');const {NPCS}=await import('../src/data/npcs.js');
  for(const card of SOURCES){
   await page.evaluate(id=>preview.card(id),card.id);
   await page.locator('.historical-image').evaluate(img=>img.decode());
   assert.equal(await page.locator('.media-zoom').count(),1,card.id);
   if(['dangbaekjeon','jemulpo4','joseon-chaeryak','cheokhwabi'].includes(card.id))await page.screenshot({path:path.join(out,card.id+'.png')});
  }
  for(const npc of NPCS){
   await page.evaluate(id=>preview.speaker(id),npc.id);
   await page.locator('.historical-image').evaluate(img=>img.decode());
   const img=await page.locator('.speaker-portrait').boundingBox(),panel=await page.locator('.speak .panel').boundingBox();
   assert.ok(img.x>=panel.x+panel.width,'portrait to right of dialogue '+npc.id);
   if(['heungseon','choeikhyeon','sinheon','hojo'].includes(npc.id))await page.screenshot({path:path.join(out,npc.id+'.png')});
  }
  await page.evaluate(()=>preview.speaker('heungseon'));
  await page.locator('.media-zoom').click();assert.equal(await page.locator('dialog[open]').count(),1);
  await page.keyboard.press('KeyE');assert.equal(await page.locator('.speak').count(),1,'E in viewer must not advance dialogue');
  await page.keyboard.press('Escape');await page.locator('.historical-viewer').waitFor({state:'detached'});assert.equal(await page.locator('dialog').count(),0,'Escape closes enlarged image');
  await page.evaluate(()=>preview.note('throne'));
  await page.locator('.media-zoom').click();assert.equal(await page.locator('.note').count(),1,'image button must not advance narrative');
  await page.keyboard.press('Escape');await page.locator('.note-next').click();assert.equal(await page.locator('.note').count(),0);
  for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(size);
   await page.evaluate(()=>preview.speaker('heungseon'));
   const img=await page.locator('.speaker-portrait').boundingBox(),panel=await page.locator('.speak .panel').boundingBox();
   for(const box of [img,panel])assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,`speaker fits ${size.width}`);
   await page.screenshot({path:path.join(out,`speaker-${size.width}.png`)});
   await page.evaluate(()=>preview.card('dangbaekjeon'));
   await page.locator('.media-zoom').scrollIntoViewIfNeeded();
   assert.ok(await page.locator('.historical-image').isVisible());
   await page.screenshot({path:path.join(out,`card-${size.width}.png`)});
   await page.locator('.close').scrollIntoViewIfNeeded();await page.locator('.close').click();
  }
  // Use the shipped HTML too, resuming at the real first audience.
  const {ACTS}=await import('../src/data/acts.js');const {createState,SAVE_KEY}=await import('../src/core/state.js');
  const {enterAct,applyBeat,applyGrant}=await import('../src/systems/scenario.js');
  await page.setViewportSize({width:1440,height:900});await page.goto(pathToFileURL(path.resolve('어전.html')).href);
  const bi=ACTS[0].beats.findIndex(b=>b.kind==='audience');assert.ok(bi>=0);
  let s=enterAct(createState(),ACTS[0],0);for(let i=0;i<bi;i++)s=applyGrant(applyBeat(s,ACTS[0].beats[i]),ACTS[0].beats[i]);
  s={...s,beatIndex:bi,beatEntered:false};
  await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:SAVE_KEY,s});await page.reload();await page.locator('.opening-primary').click();
  await page.locator('.speaker-portrait .historical-image').waitFor();await page.waitForTimeout(900);
  assert.match(await page.locator('.speaker-portrait figcaption').innerText(),/흥선대원군/);
  const spoken=await page.locator('.speak .line').innerText();
  await page.locator('.speaker-portrait .media-zoom').click();await page.keyboard.press('KeyE');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.speak .line').innerText(),spoken,'real game: image inspection preserves dialogue position');
  await page.screenshot({path:path.join(out,'game-dialogue.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log(JSON.stringify({cards:SOURCES.length,npcs:NPCS.length,assets:manifest.length,errors,requests,out}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
