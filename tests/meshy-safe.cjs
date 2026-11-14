#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),
  vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/meshy-safe-v2-8.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const meshy=fs.readFileSync(path.join(root,'src/meshy-guard-v2-5.js'),'utf8');
new vm.Script(code);
assert.ok(!html.includes('src="src/meshy-rig-v2-7.js"'),
  'broken auto skinning must never be loaded');
assert.ok(html.includes('src="src/meshy-safe-v2-8.js" defer'));
assert.ok(html.indexOf('src/meshy-safe-v2-8.js') >
  html.indexOf('src/combat-animations-v2-6.js'));
assert.ok(!code.includes('SkinnedMesh'));
assert.ok(!code.includes('skinIndex'));
assert.ok(meshy.includes('body.scale.multiplyScalar(factor)'),
  'Special guard must have a normalized height');
class Guard {
 constructor(){
  this.state='ALERTED';this.guardShotKick=1;
  this.meshySpecialVisual={rotation:{x:0,z:0}};
 }
 update(){return 42}
}
const window={};
vm.runInNewContext(code,{GuardAgent:Guard,window,Math});
const guard=new Guard();
assert.equal(guard.update(.016),42,'keep original combat AI update');
assert.ok(guard.meshySpecialVisual.rotation.x<0,'safe group recoil');
assert.equal(window.GoldenEyeMeshySafe.autoSkinning,false);
const old=guard.meshySpecialVisual.rotation.x;
guard.state='DEAD';guard.update(.05);
assert.equal(guard.meshySpecialVisual.rotation.x,old,'death pose remains controlled by v2.6');
console.log('OK Meshy safe v2.8: no bad skin weights, rigid body, combat AI and recoil preserved.');
