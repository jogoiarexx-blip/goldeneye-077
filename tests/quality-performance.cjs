#!/usr/bin/env node
'use strict';
// GoldenEye 077: regressão de visibilidade, blend de animações e loop adaptativo.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const THREE=require('../vendor/three.min.js');
const ctx=vm.createContext({THREE,console});
vm.runInContext(read('src/guards.js')+'\nthis.los=hasLineOfSight;this.Guard=GuardAgent;',ctx);
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const wall={minX:4,maxX:6,minY:0,maxY:3,minZ:-1,maxZ:1};
assert.equal(ctx.los(v(0,1,0),v(10,1,0),[]),true,'empty view');
assert.equal(ctx.los(v(0,1,0),v(10,1,0),[wall]),false,'solid wall');
assert.equal(ctx.los(v(0,5,0),v(10,5,0),[wall]),true,'over wall');
assert.equal(ctx.los(v(0,1,3),v(10,1,3),[wall]),true,'beside wall');
assert.equal(ctx.los(v(0,1,0),v(10,1,0),[wall],wall),true,'ignored door');
assert.equal(ctx.los(v(0,1,0),v(10,1,0),[{...wall,minX:9999,maxX:9999}]),true,'open door');
assert.equal(ctx.los(v(5,1,0),v(10,1,0),[wall]),false,'origin inside obstacle');
assert.equal(ctx.los(v(0,1,0),v(4.05,1,0),[wall]),true,'target touches wall');
const guard=new ctx.Guard(new THREE.Scene(),{pos:v(0,0,0),patrol:[v(0,0,0),v(10,0,0)]},
  {guardHp:100,guardDamage:6,guardReaction:1},{playShot(){}});
guard.update(.05,v(80,1.65,80),[],()=>{});
assert.ok(guard.walkBlend>0&&guard.walkBlend<1,'movement starts smoothly');
assert.ok(guard.visualYaw>0&&guard.visualYaw<Math.PI/2,'visible yaw eases toward walking direction');
const movingBlend=guard.walkBlend;
guard.state='SUSPICIOUS';guard.lastKnownPlayerPos=guard.pos.clone();guard.searchTimer=5;
guard.update(.05,v(80,1.65,80),[],()=>{});
assert.ok(guard.walkBlend<movingBlend,'legs ease toward idle');
console.log('OK quality: line of sight and smooth guard movement.');

const source=read('src/game.js');
const from=source.indexOf('      updateRenderBudget(rawDt) {');
const to=source.indexOf('      pollGamepad(dt) {',from);
assert.ok(from>0&&to>from,'performance methods exist');
const mock={document:{hidden:false},navigator:{maxTouchPoints:0},window:{devicePixelRatio:1.5},
  requestAnimationFrame(){}};
vm.runInNewContext('this.Loop=class {\n'+source.slice(from,to)+'\n}',mock);
const game=new mock.Loop();
game.appState='PLAYING';game.lastFrameTime=0;game.lastFrameRendered=0;
game.renderPixelRatio=1.5;game.renderFrameCount=0;game.renderSampleSeconds=0;
let rendered=0,updated=0,paused=0;
game.renderer={render(){rendered++},setPixelRatio(r){game.renderPixelRatio=r}};
game.scene={};game.camera={};game.pollGamepad=()=>{};
game.update=()=>{updated++};game.togglePauseQWatch=()=>{paused++;game.appState='PAUSED'};
for(let t=50;t<=3200;t+=50)game.loop(t);
assert.ok(game.renderPixelRatio<1.5,'dynamic resolution reacts to slow rendering');
const ratio=game.renderPixelRatio;
game.appState='MENU';game.loop(3250);
const beforeMenu=rendered;
game.loop(3260);assert.equal(rendered,beforeMenu,'menu uses lower render rate');
game.loop(3290);assert.equal(rendered,beforeMenu+1,'menu still renders');
game.appState='PLAYING';mock.document.hidden=true;const beforeHidden=updated;
game.loop(3300);assert.equal(paused,1,'hidden tab pauses gameplay');
assert.equal(updated,beforeHidden,'hidden tab does not advance simulation');
mock.document.hidden=false;game.loop(3320);
assert.equal(game.renderPixelRatio,ratio,'paused frames keep visual quality');
console.log('OK quality: adaptive pixel ratio, 30 FPS menus, hidden-tab pause.');
