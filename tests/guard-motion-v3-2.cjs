#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),
  fs=require('node:fs'),path=require('node:path');
const THREE=require('../vendor/three.min.js');
class Guard {
 constructor(i){
  this.state='PATROL';this.pos=new THREE.Vector3(i,0,0);
  this.mesh=new THREE.Group();
  this.leftLeg=new THREE.Group();this.rightLeg=new THREE.Group();
  this.torsoGroup=new THREE.Group();
  this.mesh.add(this.leftLeg,this.rightLeg,this.torsoGroup);
  this.weaponArmGroup=new THREE.Group();
  this.weaponArmGroup.add(new THREE.Mesh(new THREE.BoxGeometry(.2,.3,.2)),
    new THREE.Mesh(new THREE.BoxGeometry(.2,.3,.2)));
  this.torsoGroup.add(this.weaponArmGroup);
  this.laserSight=new THREE.Mesh(new THREE.BoxGeometry(.01,.01,.1));
  this.statusOrb=new THREE.Mesh(new THREE.SphereGeometry(.04),new THREE.MeshBasicMaterial());
  this.mesh.add(this.statusOrb);
  this.meshyWalkCycle=0;
 }
 update(dt){if(this.state!=='DEAD')this.pos.z+=dt*2;return true;}
}
class Game{
 constructor(count=10){this.guards=[];this.appState='PLAYING';this.count=count;}
 startMission(){this.guards=Array.from({length:this.count},(_,i)=>new Guard(i));return true;}
}
let loads=0;
const FakeThree=Object.assign({},THREE,{GLTFLoader:class{
 load(url,success){
  loads++;
  const model=new THREE.Group();
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.64,1.9,.32,12,36,6),
    new THREE.MeshStandardMaterial());
  mesh.geometry.translate(0,.95,0);
  model.add(mesh);
  success({scene:model});
 }
}});
const ctx=vm.createContext({THREE:FakeThree,GoldenEyeDamGame:Game,
 GuardAgent:Guard,window:{},console,Math,Set,Float32Array});
const root=path.resolve(__dirname,'..');
vm.runInContext(fs.readFileSync(path.join(root,'src/meshy-guard-v2-9.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'src/guard-motion-v3-2.js'),'utf8'),ctx);
const game=new Game();game.startMission();
assert.equal(loads,1,'One GLB request only');
assert.equal(game.meshyGuardTargets.length,4,'4 Meshy guards for 10 spawns');
assert.equal(game.guards.filter(g=>g.meshySpecialModel).length,4);
assert.equal(game.guards.filter(g=>!g.meshySpecialModel).length,6,
  'Original guards still present');
assert.equal(game.guards.length,10,'Do not add/remove enemies');
const a=game.meshyGuardTargets[0],b=game.meshyGuardTargets[1];
const findMesh=g=>{let result;g.meshySpecialModel.traverse(x=>{if(x.isMesh)result=x});return result};
const ma=findMesh(a),mb=findMesh(b);
assert.notEqual(ma.geometry,mb.geometry,'Unique geometry per guard');
assert.notEqual(ma.material,mb.material,'Unique material per guard');
assert.equal(ma.geometry.getAttribute('skinIndex'),undefined,
 'Never apply broken auto skin');
const uv=ma.geometry.getAttribute('uv');
const first=ma.geometry.getAttribute('position').array.slice();
for(let n=0;n<32;n++)a.update(.05,new THREE.Vector3(0,1.6,2));
const last=ma.geometry.getAttribute('position').array;
assert.ok(last.some((v,i)=>Math.abs(v-first[i])>.003),
 'Walk must visibly move limb vertices');
assert.equal(ma.geometry.getAttribute('uv'),uv,'Keep original UVs');
assert.equal(mb.geometry.getAttribute('position').version,0,
 'Another guard geometry is not mutated by first guard');
const changed=ma.geometry.getAttribute('position').version;
a.state='DEAD';a.update(.05);
assert.equal(ma.geometry.getAttribute('position').version,changed,
 'Stop stepping after death');
game.startMission();
assert.equal(loads,1,'Subsequent level must reuse cached GLB');
assert.equal(game.guards.filter(g=>g.meshySpecialModel).length,4);
const small=new Game(7);
small.startMission();
assert.equal(small.guards.filter(g=>g.meshySpecialModel).length,3,
 '3 special guards on a seven-guard map');
console.log('OK Meshy squad v3.2: 3-4 enemies, one GLB, animated limbs, UVs and AI preserved.');
