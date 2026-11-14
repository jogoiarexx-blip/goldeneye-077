'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../vendor/three.min.js');
const pending=[];
class Builder {
 build(id){this.levelGroup=new THREE.Group();this.npcs=[];
  const ids=id==='facility'?['dr_doak','sci_1','sci_2','sci_3']:id==='silo'?['silo_scientist_1','silo_scientist_2','silo_scientist_3']:[];
  for(const name of ids){const mesh=new THREE.Group();mesh.add(new THREE.Mesh(new THREE.BoxGeometry(.4,1.7,.4),new THREE.MeshStandardMaterial()));this.levelGroup.add(mesh);this.npcs.push({id:name,role:name==='dr_doak'?'doak':'scientist',mesh,position:new THREE.Vector3(),dead:false})}
 }
 clear(){}
}
class Game{update(){}}
const FakeThree=Object.assign({},THREE,{GLTFLoader:class {load(url,done,progress,fail){pending.push({url,done,fail})}}});
const ctx=vm.createContext({THREE:FakeThree,DamLevelBuilder:Builder,GoldenEyeDamGame:Game,console});
vm.runInContext(fs.readFileSync(require.resolve('../src/doctor-model.js'),'utf8'),ctx);
const builder=new Builder();builder.build('facility');
assert.equal(builder.npcs.find(n=>n.id==='dr_doak').displayName,'Dra.','a médica deve substituir o contato que entrega o decodificador');
assert.ok(pending.some(p=>p.url==='assets/models/scientist.glb'),'modelo enviado do cientista precisa ser carregado');
console.log('OK contatos: médica no decodificador e cientista GLB solicitado.');
require('./doctor-model.cjs').then(([doctor,scientist])=>{
 const doctorRequest=pending.find(p=>p.url.endsWith('/dra.glb'));
 const scientistRequest=pending.find(p=>p.url.endsWith('/scientist.glb'));
 doctorRequest.done(doctor);scientistRequest.done(scientist);
 const contact=builder.npcs[0],a=builder.npcs[1],b=builder.npcs[2];
 assert.equal(contact.role,'doak');assert.equal(contact.modelStatus,'ready');
 for(const npc of builder.npcs){npc.mesh.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(npc.mesh);assert.ok(Math.abs(box.min.y)<.02);assert.ok(Math.abs(box.max.y-1.75)<.02)}
 let skinA,skinB;a.visual.model.traverse(o=>{if(o.isSkinnedMesh)skinA=o});b.visual.model.traverse(o=>{if(o.isSkinnedMesh)skinB=o});
 assert.notEqual(skinA.skeleton.bones[0],skinB.skeleton.bones[0],'independent skeletons');
 assert.equal(skinA.geometry,skinB.geometry,'shared geometry');assert.equal(skinA.material.map,skinB.material.map,'shared textures');
 const game=new Game();game.appState='PLAYING';game.levelBuilder=builder;game.player={pos:new THREE.Vector3(0,1.65,0)};
 game.update(.05);assert.equal(contact.visual.current,contact.visual.actions.Talk);
 const t=contact.visual.mixer.time;game.appState='PAUSED';game.update(.2);assert.equal(contact.visual.mixer.time,t);
 game.appState='PLAYING';game.player.pos.set(100,1.65,0);game.update(.05);assert.equal(contact.visual.current,contact.visual.actions.Idle);
 contact.mesh.position.x+=.1;game.update(.05);assert.equal(contact.visual.current,contact.visual.actions.Walking);
 contact.dead=true;const deathTime=contact.visual.mixer.time;game.update(.05);assert.equal(contact.visual.mixer.time,deathTime);
 let disposed=0;skinA.geometry.addEventListener('dispose',()=>disposed++);
 builder.levelGroup.remove(a.mesh);assert.equal(a.visual.released,true);assert.equal(disposed,0,'corpse does not dispose resources still used by other scientists');
 builder.clear();assert.equal(disposed,1,'mission clear releases shared resources once');
 const staleBuilder=new Builder();staleBuilder.build('silo');const old=pending[pending.length-1];staleBuilder.build('dam');
 const orphan=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());orphan.add(mesh);let released=0;mesh.geometry.addEventListener('dispose',()=>released++);old.done({scene:orphan,animations:[]});assert.equal(released,1);
 const fallback=new Builder();fallback.build('facility');pending[pending.length-1].fail();assert.equal(fallback.npcs[1].modelStatus,'fallback');assert.equal(fallback.npcs[1].mesh.children.length,1);
 console.log('OK NPC integration: contact, independent skinning, shared resources, pause, walk/talk/idle, death, stale load and fallback.');
}).catch(e=>{console.error(e);process.exitCode=1});
