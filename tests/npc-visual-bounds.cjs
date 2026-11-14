#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../vendor/three.min.js');
const code=fs.readFileSync(require.resolve('../src/npc-models-v3-0.js'),'utf8');
class Builder{build(){}clear(){}}
class Game{update(){}}
const window={};
vm.runInNewContext(code,{THREE,DamLevelBuilder:Builder,GoldenEyeDamGame:Game,window,console});
const api=window.GoldenEyeNPCScale;
assert.equal(api.version,'3.2');
const geometry=new THREE.BoxGeometry(.4,1,.3,2,6,2);
geometry.translate(0,.5,0);
const n=geometry.attributes.position.count,indices=new Uint16Array(n*4),
weights=new Float32Array(n*4);
for(let i=0;i<n;i++)weights[i*4]=1;
geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
const bone=new THREE.Bone();
const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());
mesh.add(bone);
mesh.bind(new THREE.Skeleton([bone]));
const model=new THREE.Group();model.add(mesh);
model.updateMatrixWorld(true);
bone.scale.y=5;
model.updateMatrixWorld(true);
const wrong=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
const real=api.visualBounds(model,true).getSize(new THREE.Vector3()).y;
assert.ok(Math.abs(wrong-1)<.02,'Old bind geometry appears normal');
assert.ok(real>4.9,'GPU-skinned pose is actually five times taller');
const npc={mesh:new THREE.Group(),visual:{model,targetHeight:1.72}};
npc.mesh.add(model);
api.stabilizeHeight(npc,true);
let fixed=api.visualBounds(model,true).getSize(new THREE.Vector3()).y;
assert.ok(Math.abs(fixed-1.72)<.03,'Correct 5x giant to 1.72m: '+fixed);
bone.scale.y=1;model.updateMatrixWorld(true);
api.stabilizeHeight(npc,true);
fixed=api.visualBounds(model,true).getSize(new THREE.Vector3()).y;
assert.ok(Math.abs(fixed-1.72)<.03,'Correct downscaled change: '+fixed);
console.log('OK scientist v3: skinned bone 5x giant fixed to 1.72m.');
