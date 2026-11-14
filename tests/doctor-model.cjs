'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../vendor/three.min.js');
const context=vm.createContext({THREE,console,TextDecoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,URL,Blob,window:{},self:globalThis});
vm.runInContext(fs.readFileSync(require.resolve('../vendor/GLTFLoader.js'),'utf8'),context);
// Node has no image decoder; the browser decodes the three embedded images.
THREE.TextureLoader.prototype.load=function(url,done){const t=new THREE.Texture();setTimeout(()=>done(t),0);return t};
function parse(name){const b=fs.readFileSync(require.resolve('../assets/models/'+name+'.glb'));
 assert.ok(b.length<6*1024*1024,'budget '+name);
 return new Promise((resolve,reject)=>new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',resolve,reject));
}
module.exports=Promise.all(['dra','scientist'].map(async name=>{
 const gltf=await parse(name);let triangles=0,skins=0;
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;
  const p=o.geometry.attributes.position;
  assert.ok(Array.from(p.array).every(Number.isFinite));
  assert.ok(o.geometry.attributes.normal&&o.geometry.attributes.uv);
  triangles+=o.geometry.index.count/3;
  for(const i of o.geometry.index.array)assert.ok(i<p.count);
  assert.ok(o.material.map&&o.material.normalMap&&o.material.roughnessMap);
  if(o.isSkinnedMesh){skins++;assert.ok(o.skeleton.bones.length>=32);assert.ok(o.geometry.attributes.skinWeight)}
 });
 assert.equal(skins,1);assert.ok(triangles<12000);
 for(const name of ['Idle','Talk','Walking'])assert.ok(gltf.animations.some(a=>a.name===name));
 const mixer=new THREE.AnimationMixer(gltf.scene),action=mixer.clipAction(gltf.animations.find(a=>a.name==='Walking'));action.play();mixer.update(.01);
 gltf.scene.updateMatrixWorld(true);
 let skin;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)skin=o});
 const first=skin.skeleton.bones.map(b=>b.quaternion.clone());mixer.update(.25);gltf.scene.updateMatrixWorld(true);skin.skeleton.update();
 assert.ok(first.some((q,i)=>1-Math.abs(q.dot(skin.skeleton.bones[i].quaternion))>1e-5),'walking changes bones');
 for(let i=0;i<skin.geometry.attributes.position.count;i+=50){const point=new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i);skin.boneTransform(i,point);assert.ok(point.toArray().every(Number.isFinite));assert.ok(point.length()<5,'skin remains bounded')}
 mixer.stopAllAction();
 console.log('OK '+name+': '+triangles+' triangles, skin, textures, Idle/Talk/Walking and finite animated vertices.');return gltf;
})).catch(e=>{console.error(e);process.exitCode=1;throw e});
