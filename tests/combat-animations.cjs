#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('../vendor/three.min.js');
const source = fs.readFileSync(require.resolve('../src/combat-animations-v2-6.js'), 'utf8');

class Game {
  constructor() {
    this.appState = 'PLAYING';
    this.player = {weaponIdx:0, inTank:false, weapons:[
      {id:'pp7',name:'PP7',clip:2,maxClip:7,reserve:10}
    ]};
    this.audio = {playReload:() => { this.reloadSounds++; }};
    this.reloadSounds = 0; this.hud = 0; this.shots = 0;
    this.weaponMeshGroup = this.createFirstPersonWeaponModel();
  }
  createFirstPersonWeaponModel() { return new THREE.Group(); }
  reloadWeapon() {
    const w=this.player.weapons[0];
    const n=Math.min(w.maxClip-w.clip,w.reserve);
    w.clip+=n;w.reserve-=n;
  }
  fireWeapon() { this.player.weapons[0].clip--;this.shots++; }
  switchWeapon(index) { this.player.weaponIdx=index; }
  startMission() {}
  update() { this.weaponMeshGroup.rotation.x *= 0.8; }
  updateHUD() { this.hud++; }
  notifyHUD() {}
}
const context = vm.createContext({THREE, GoldenEyeDamGame:Game, console, window:{}});
vm.runInContext(fs.readFileSync(require.resolve('../src/guards.js'),'utf8')+
  '\nthis.Guard=GuardAgent;',context);
vm.runInContext(source,context);
const game=new Game();
assert.equal(game.mi6Combat.magazine.visible,false);
game.reloadWeapon();
assert.equal(game.player.weapons[0].clip,2,'no instant ammo');
assert.equal(game.reloadSounds,1,'one reload sound at start');
game.fireWeapon();assert.equal(game.shots,0,'cannot fire while loading');
game.update(.05);
assert.ok(game.weaponMeshGroup.position.y<0,'reload lowers weapon');
for(let i=0;i<25;i++)game.update(.05);
assert.equal(game.player.weapons[0].clip,7,'ammo applied after magazine');
assert.equal(game.player.weapons[0].reserve,5);
assert.equal(game.mi6Combat.reload,null);
game.fireWeapon();assert.equal(game.shots,1,'shooting resumes on completion');
assert.ok(game.mi6Combat.shotKick>0);
const firstKick=game.mi6Combat.shotKick;
game.update(.05);assert.ok(game.mi6Combat.shotKick<firstKick);
game.player.weapons[0].clip=1;game.reloadWeapon();
game.switchWeapon(1);assert.equal(game.mi6Combat.reload,null,'switch cancels reload');
game.player.weaponIdx=0;game.startMission();
assert.equal(game.mi6Combat.magazine.visible,false,'restart clears magazine');
game.reloadWeapon();game.appState='PAUSED';
const elapsed=game.mi6Combat.reload.elapsed;
game.update(.05);assert.equal(game.mi6Combat.reload.elapsed,elapsed,'pause freezes reload');

const Guard=context.Guard,scene=new THREE.Scene();
const spawn={pos:new THREE.Vector3(0,0,0),
  patrol:[new THREE.Vector3(0,0,0),new THREE.Vector3(6,0,0)]};
const guard=new Guard(scene,spawn,{guardHp:50,guardDamage:5,guardReaction:1},
  {playShot(){}});
assert.ok(guard.guardMuzzle,'reusable muzzle flash');
guard.takeDamage(10,new THREE.Vector3(3,1,1));
guard.update(.016,new THREE.Vector3(80,1.6,80),[],()=>{});
assert.ok(Math.abs(guard.torsoGroup.rotation.z)>0,'hit reaction');
assert.equal(guard.state,'ALERTED');
guard.fireCooldown=0;
guard.update(.016,new THREE.Vector3(0,1.6,2),[],()=>{});
assert.ok(guard.guardShotKick>0,'enemy shot recoil');
assert.ok(guard.guardMuzzle.visible,'enemy muzzle flash');
const killed=guard.takeDamage(200,new THREE.Vector3(3,1,1));
assert.equal(killed,true);
assert.equal(guard.state,'DEAD');
assert.equal(guard.mesh.rotation.x,0,'death starts upright');
guard.update(.05,new THREE.Vector3(0,1.6,2),[],()=>{});
assert.ok(guard.mesh.rotation.x<0&&guard.mesh.rotation.x>-Math.PI/2,'fall is animated');
for(let i=0;i<20;i++)guard.update(.05,new THREE.Vector3(0,1.6,2),[],()=>{});
assert.ok(Math.abs(guard.mesh.rotation.x+Math.PI/2)<.001,'body reaches floor');
assert.equal(guard.guardMuzzle.visible,false);
console.log('OK combat v2.6: reload, fire lock, pause, cancel, hit/shot/fall.');
