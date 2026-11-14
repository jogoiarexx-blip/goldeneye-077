'use strict';
// Run against a local HTTP server: GAME_TEST_URL=http://127.0.0.1:8765 node tests/player-model-browser.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    if(process.env.THREE_TEST_FILE)await page.route('**/three.min.js',r=>r.fulfill({path:process.env.THREE_TEST_FILE,contentType:'application/javascript'}));
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:8765');
    await page.waitForFunction(()=>window.gameInstance,{timeout:30000});
    await page.evaluate(()=>gameInstance.startMission());
    await page.waitForFunction(()=>gameInstance.playerAvatar?.ready,{timeout:15000});
    const result=await page.evaluate(()=>{
      const g=gameInstance,a=g.playerAvatar;
      g.finishIntroCutscene();g.update(.016);
      let skinned=0;a.model.traverse(o=>{if(o.isSkinnedMesh)skinned++});
      const bodyVisible=a.root.visible, clipped=a.materials.every(m=>m.clippingPlanes.length===1);
      g.appState='PAUSED';const time=a.mixer.time;g.update(.2);
      const frozen=time===a.mixer.time;
      g.appState='PLAYING';g.startOutroCutscene();g.update(.016);
      const stunt=a.root.visible&&a.materials.every(m=>m.clippingPlanes.length===0)&&g.damStunt.group.children.slice(0,6).every(o=>!o.visible);
      const same=a.root;
      g.startMission();g.finishIntroCutscene();g.update(.016);
      const restarted=same===g.playerAvatar.root&&same.parent===g.scene&&same.visible;
      g.selectMission('facility');g.startMission();g.finishIntroCutscene();g.update(.016);
      return {skinned,bodyVisible,clipped,frozen,stunt,restarted,facility:a.root.visible,clips:a.clips.map(c=>c.name),height:a.height};
    });
    assert.ok(result.skinned>0);for(const k of ['bodyVisible','clipped','frozen','stunt','restarted','facility'])assert.equal(result[k],true,k);
    assert.deepEqual(result.clips,['Running','Walking']);assert.ok(result.height>1.6&&result.height<2.1);
    assert.deepEqual(errors,[]);
    if(process.env.PLAYER_SCREENSHOT)await page.screenshot({path:process.env.PLAYER_SCREENSHOT});
    console.log('OK browser player GLB:',result);
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
