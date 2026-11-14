'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../vendor/three.min.js');
const context=vm.createContext({THREE,console,TextDecoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,URL,Blob,window:{},self:globalThis});
vm.runInContext(fs.readFileSync(require.resolve('../vendor/GLTFLoader.js'),'utf8'),context);
THREE.TextureLoader.prototype.load=function(url,done){const texture=new THREE.Texture();setTimeout(()=>done(texture),0);return texture};
const bytes=fs.readFileSync(require.resolve('../assets/models/dra.glb'));
assert.ok(bytes.length<7*1024*1024,'asset budget');
new THREE.GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',gltf=>{
 try{
  let triangles=0;
  gltf.scene.traverse(o=>{
   if(!o.isMesh)return;
   const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=o.geometry.attributes.uv;
   assert.ok(p&&n&&uv);assert.ok(Array.from(p.array).every(Number.isFinite));
   const indices=o.geometry.index;triangles+=indices.count/3;
   for(const i of indices.array)assert.ok(i<p.count);
   assert.ok(o.material.map&&o.material.normalMap&&o.material.roughnessMap);
  });
  assert.ok(triangles<200000);
  const pending=[];
  THREE.GLTFLoader=class{load(url,done,progress,fail){pending.push({done,fail})}};
  class Builder{
   build(id){this.levelGroup=new THREE.Group();this.npcs=[];
    if(id==='facility'||id==='silo'){
     const mesh=new THREE.Group();mesh.position.set(10.5,0,-4);mesh.rotation.y=-.8;
     mesh.add(new THREE.Mesh(new THREE.BoxGeometry(.4,1.7,.4),new THREE.MeshStandardMaterial()));
     this.levelGroup.add(mesh);this.npcs.push({id:id==='facility'?'sci_2':'silo_scientist_1',mesh,dead:false,role:'scientist',talked:false});
    }
   }
  }
  context.DamLevelBuilder=Builder;
  vm.runInContext(fs.readFileSync(require.resolve('../src/doctor-model.js'),'utf8'),context);
  const b=new Builder();b.build('facility');const npc=b.npcs[0],wrapper=npc.mesh;
  pending.shift().done(gltf);
  assert.equal(npc.modelStatus,'ready');assert.equal(npc.mesh,wrapper);
  assert.equal(wrapper.rotation.y,-.8);assert.equal(wrapper.position.x,10.5);
  assert.equal(npc.dead,false);assert.equal(npc.role,'scientist');assert.equal(wrapper.children.length,1);
  wrapper.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(wrapper);assert.ok(Math.abs(box.min.y)<1e-5);assert.ok(Math.abs(box.max.y-1.75)<1e-5);
  let corpseReleased=0;wrapper.children[0].traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>corpseReleased++)});
  b.levelGroup.remove(wrapper);assert.ok(corpseReleased>0,'remover cadaver libera modelo');
  b.build('silo');const stale=pending.shift();b.build('dam');
  const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());root.add(mesh);
  let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);stale.done({scene:root});assert.equal(disposed,1);assert.equal(b.npcs.length,0);
  b.build('facility');pending.shift().fail(new Error('network'));assert.equal(b.npcs[0].modelStatus,'fallback');assert.equal(b.npcs[0].mesh.children.length,1);
  console.log('OK Dra: '+triangles+' triangles, UV/three textures, finite geometry, grounded 1.75m, scientist rules, stale-load cleanup and fallback.');
 }catch(e){console.error(e);process.exitCode=1}
},e=>{console.error(e);process.exitCode=1});
