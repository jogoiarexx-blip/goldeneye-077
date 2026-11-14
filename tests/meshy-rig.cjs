#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
  path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/meshy-rig-v2-7.js'),'utf8');
new vm.Script(code);
const THREE=require('../vendor/three.min.js');
class Guard{
 constructor(model){
   this.meshySpecialModel=model;this.state='PATROL';
   this.pos=new THREE.Vector3();this.corpseRemoved=false;
   this.hitReaction=0;this.guardShotKick=0;
 }
 update(dt){this.pos.z+=dt*2;return true}
 takeDamage(n){if(n>50){this.state='DEAD';return true}return false}
}
const window={};
vm.runInNewContext(code,{THREE,GuardAgent:Guard,window,Math,Number});
const api=window.GoldenEyeMeshyRig;
assert.equal(api.bones,17);
for(const [x,y] of [[0,1.7],[.22,1.27],[-.22,1.12],
  [0,1.3],[-.14,.5],[.14,.1],[0,.94]]){
 const [i,a,j,b]=api.influences(x,y);
 assert.ok(i>=0&&i<17&&j>=0&&j<17);
 assert.ok(Math.abs(a+b-1)<.00001,'weights normalized');
}
const geometry=new THREE.BoxGeometry(.48,1.8,.24,8,36,2);
geometry.translate(0,.9,0);
const uv=geometry.getAttribute('uv'),indices=geometry.getIndex();
const material=new THREE.MeshStandardMaterial({color:0x476348});
const original=new THREE.Mesh(geometry,material);
const model=new THREE.Group();model.add(original);
const guard=new Guard(model);
assert.equal(guard.update(.05),true);
const rig=guard.meshyBoneRig;
assert.ok(rig&&rig.mesh.isSkinnedMesh);
assert.equal(rig.mesh.skeleton.bones.length,17);
assert.equal(geometry.getAttribute('skinIndex').count,
  geometry.getAttribute('position').count);
const weights=geometry.getAttribute('skinWeight');
for(let i=0;i<weights.count;i++)
 assert.ok(Math.abs(weights.getX(i)+weights.getY(i)-1)<1e-5);
assert.equal(geometry.getAttribute('uv'),uv,'UV preserved');
assert.equal(geometry.getIndex(),indices,'Triangles preserved');
assert.equal(rig.mesh.material,material);
assert.ok(!model.children.includes(original));
assert.equal(api.install(model),null,'No duplicate skin');
const before=rig.parts.lthigh.rotation.x;
for(let n=0;n<9;n++)guard.update(.05);
assert.notEqual(rig.parts.lthigh.rotation.x,before,'Patrol animation');
guard.state='ALERTED';guard.guardShotKick=1;guard.update(.05);
assert.ok(rig.parts.rarm.rotation.x<-.3,'Aim and fire');
assert.equal(guard.takeDamage(120),true);
guard.update(.05);
assert.ok(rig.parts.larm.rotation.z>0,'Death starts falling');
for(let n=0;n<20;n++)guard.update(.05);
assert.ok(Math.abs(rig.parts.head.rotation.x+.21)<.01,'Death completed');
const final=rig.parts.larm.rotation.z;guard.update(.05);
assert.equal(rig.parts.larm.rotation.z,final);
const noMesh=new Guard(new THREE.Group());
noMesh.update(.05);assert.equal(noMesh.meshyBoneRig,undefined);
console.log('OK rig Meshy: 17 bones, weights, texture UVs, walk, aim, fire, death, fallback.');
