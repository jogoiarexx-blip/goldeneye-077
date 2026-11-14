#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const THREE=require('../vendor/three.min.js');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ctx=vm.createContext({THREE,console,window:{}});
vm.runInContext(read('src/guards.js')+'\nthis.Guard=GuardAgent;',ctx);
class Game {
  constructor(){
    this.appState='MENU';
    this.levelBuilder={colliders:[
      {minX:3.5,maxX:6,minY:0,maxY:2.5,minZ:1,maxZ:5}
    ],bounds:{minX:-80,maxX:80,minZ:-80,maxZ:80}};
    this.player={pos:new THREE.Vector3(0,1.65,8)};
    this.guards=[];
  }
  startMission() {
    const sp=(x,z,dir)=>({
      pos:new THREE.Vector3(x,0,z),
      patrol:[new THREE.Vector3(x,0,z),new THREE.Vector3(x,0,z+dir)]
    });
    const cfg={guardHp:100,guardDamage:3,guardReaction:1};
    const audio={playShot(){}};
    this.guards=[
      new ctx.Guard(new THREE.Scene(),sp(0,0,2),cfg,audio),
      new ctx.Guard(new THREE.Scene(),sp(8,0,-2),cfg,audio),
      new ctx.Guard(new THREE.Scene(),sp(10,0,-2),cfg,audio),
      new ctx.Guard(new THREE.Scene(),sp(70,70,-2),cfg,audio)
    ];
    this.guards[0].setAlerted();
    this.appState='PLAYING';
  }
  update(dt) {
    for(const guard of this.guards)
      guard.update(dt,this.player.pos,this.levelBuilder.colliders,()=>{});
  }
}
ctx.GoldenEyeDamGame=Game;
vm.runInContext(read('src/squad-ai-v2-7.js'),ctx);
const game=new Game();game.startMission();
const [lead,mate1,mate2,far]=game.guards;
assert.equal(game.squadClock,0);
assert.equal(mate1.squadIndex,1);
for(let i=0;i<10;i++)game.update(.05);
assert.ok(lead.canSeePlayer,'leader sees player with real cone and wall test');
assert.equal(mate1.canSeePlayer,false,'wall hides player from squadmate');
assert.equal(mate1.state,'SUSPICIOUS','radio initiates investigation');
assert.equal(mate2.state,'SUSPICIOUS');
assert.notEqual(mate1.lastKnownPlayerPos.x,mate2.lastKnownPlayerPos.x,'investigators split search sectors');
assert.equal(far.state,'PATROL','radio must not wake distant guards');
assert.equal(lead.squadFireSequence,true,'initial firing offset prepared');
assert.ok(lead.tacticalCoverRequest,'leader requests cover only while seeing player');
assert.ok(game.squadClock>=.45);
const before=game.squadClock;game.appState='PAUSED';
game.update(.5);assert.equal(game.squadClock,before,'pause must not advance squad orders');
game.appState='PLAYING';game.player.pos.set(-60,1.65,-60);
lead.setAlerted();lead.squadBroadcastAt=-99;mate1.state='PATROL';mate1.squadRadioUntil=0;
for(let i=0;i<10;i++)game.update(.05);
assert.equal(lead.canSeePlayer,false,'visual data not retained after target hidden');
assert.equal(mate1.state,'PATROL','no new radio coordinates from unseen player');

const noiseGame=new Game();noiseGame.startMission();
const guard=noiseGame.guards[1];
guard.hearNoise(new THREE.Vector3(9,0,-3),12);
assert.equal(guard.state,'SUSPICIOUS','heard noise starts investigation');
assert.ok(guard.lastKnownPlayerPos.distanceTo(new THREE.Vector3(9,0,-3))>0.1,
  'different soldier explores a distinct sector');
guard.takeDamage(100);
assert.equal(guard.state,'DEAD');
guard.hearNoise(new THREE.Vector3(10,0,2),30);
assert.equal(guard.state,'DEAD','dead soldiers ignore noise');

const originalTactics=read('src/tactics-v1-3.js');
assert.ok(originalTactics.includes('nearby.slice(0, 14)'),'cover planner has candidate budget');
const originalGuards=read('src/guards.js');
assert.ok(originalGuards.includes('this.canSeePlayer = canSeePlayer'),'true vision sampled by base AI');
console.log('OK squad v2.7: witnessed radio intel, split search, range, pause, hidden targets, noise, cover budget.');
