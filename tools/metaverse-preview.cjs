const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
(async()=>{
  const {ACTS}=await import('../src/data/acts.js');
  const {createState,SAVE_KEY}=await import('../src/core/state.js');
  const {enterAct,applyBeat,applyGrant}=await import('../src/systems/scenario.js');
  const out=path.resolve('.superpowers/metaverse-qa');fs.mkdirSync(out,{recursive:true});
  const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:['--allow-file-access-from-files']});
  const errors=[];
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(process.argv[2] || 'dist/어전.html')).href);
    await page.waitForTimeout(1000);
    await page.screenshot({path:path.join(out,'title.png')});
    let s=createState();
    for(let a=0;a<=2;a++) {
      s=enterAct(s,ACTS[a],a);
      const bi=a===2?ACTS[a].beats.findIndex(b=>b.kind==='explore'):ACTS[a].beats.length;
      for(let b=0;b<bi;b++)s=applyGrant(applyBeat(s,ACTS[a].beats[b]),ACTS[a].beats[b]);
      if(a===2)s={...s,beatIndex:bi,beatEntered:false};
    }
    await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:SAVE_KEY,s});
    await page.reload();await page.locator('.opening-primary').click();await page.waitForTimeout(600);
    await page.screenshot({path:path.join(out,'palace.png')});
    await page.getByRole('button',{name:'왼쪽으로 둘러보기'}).click();await page.waitForTimeout(250);
    await page.getByRole('button',{name:'시점 초기화'}).click();await page.waitForTimeout(250);
    await page.keyboard.down('KeyS');await page.waitForTimeout(1000);await page.keyboard.up('KeyS');
    await page.screenshot({path:path.join(out,'character.png')});
    await page.mouse.move(800,420);await page.mouse.down({button:'right'});await page.mouse.move(1010,420,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(300);
    await page.screenshot({path:path.join(out,'orbit.png')});
    const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.goto(pathToFileURL(path.resolve(process.argv[2] || 'dist/어전.html')).href);await mobile.waitForTimeout(500);
    await mobile.screenshot({path:path.join(out,'mobile-title.png')});
    await mobile.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:SAVE_KEY,s});
    await mobile.reload();await mobile.locator('.opening-primary').click();await mobile.waitForTimeout(600);
    const still=await mobile.locator('#scene').screenshot();
    await mobile.getByRole('button',{name:'오른쪽으로 둘러보기'}).tap();await mobile.waitForTimeout(100);
    const turned=await mobile.locator('#scene').screenshot();
    assert.ok(!still.equals(turned),'touch camera button changes the rendered view');
    await mobile.getByRole('button',{name:'시점 초기화'}).tap();await mobile.waitForTimeout(100);
    await mobile.screenshot({path:path.join(out,'mobile.png')});
    for(const size of [{width:320,height:568},{width:844,height:390}]) {
      await mobile.setViewportSize(size);
      await mobile.reload();await mobile.waitForTimeout(200);
      const primary=mobile.locator('.opening-primary');await primary.scrollIntoViewIfNeeded();
      const box=await primary.boundingBox();assert.ok(box.x>=0 && box.x+box.width<=size.width,'start button fits narrow/landscape screen');
      await mobile.screenshot({path:path.join(out,`title-${size.width}.png`)});
    }
    console.log(JSON.stringify({errors,out}));
    if(errors.length)process.exitCode=1;
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
