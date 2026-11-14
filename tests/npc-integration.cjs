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
const ctx=vm.createContext({THREE:FakeThree,DamLevelBuilder:Builder,GoldenEyeDamGame:Game,console,window:{}});
vm.runInContext(fs.readFileSync(require.resolve('../src/npc-models-v3-0.js'),'utf8'),ctx);
const builder=new Builder();builder.build('facility');
assert.equal(builder.npcs.find(n=>n.id==='dr_doak').displayName,'Dra.','a médica deve substituir o contato que entrega o decodificador');
assert.ok(pending.some(p=>p.url==='assets/models/scientist.glb'),'cientista masculino mantido');
assert.ok(pending.some(p=>p.url==='assets/models/Medica_Otimizada_Walk_Menos25MB.glb'),
 'terceira mulher precisa carregar na Facility');
console.log('OK contatos: médica no decodificador e cientista GLB solicitado.');
require('./doctor-model.cjs').then(([doctor,scientist])=>{
 const doctorRequest=pending.find(p=>p.url.endsWith('/dra.glb'));
 const scientistRequest=pending.find(p=>p.url.endsWith('/scientist.glb'));
 // Female test double with the "Walk" naming from some Meshy exports.
 // The real 23MB GLB is checked independently by tests/researcher-asset.cjs.
 const researcherRequest=pending.find(p=>p.url.endsWith('/Medica_Otimizada_Walk_Menos25MB.glb'));
 const femaleGroup=new THREE.Group();
 const femaleMesh=new THREE.Mesh(new THREE.BoxGeometry(.42,1.7,.3),new THREE.MeshStandardMaterial({color:0xf7f7f7}));
 femaleMesh.position.y=.85;femaleGroup.add(femaleMesh);
 const walking=new THREE.AnimationClip('Walk',1.0,[
  new THREE.NumberKeyframeTrack('.rotation[y]',[0,.5,1],[0,.04,0])
 ]);
 doctorRequest.done(doctor);scientistRequest.done(scientist);
 researcherRequest.done({scene:femaleGroup,animations:[walking]});
 const contact=builder.npcs[0],a=builder.npcs[1],woman=builder.npcs[2],b=builder.npcs[3];
 assert.equal(woman.displayName,'Pesquisadora');
 assert.equal(woman.modelStatus,'ready');
 assert.equal(woman.modelVariant,'Medica_Otimizada_Walk_Menos25MB');
 assert.equal(woman.visual.model.name,'Pesquisadora-GLB');
 assert.ok(woman.visual.actions.Walking,'animacao Walk deve funcionar');
 assert.equal(woman.visual.actions.Walking.paused,true,'andada parada quando imóvel');
 assert.equal(contact.modelVariant,'dra','a Dra. mantém o decodificador');
 assert.equal(contact.id,'dr_doak');
 assert.equal(contact.role,'doak');assert.equal(contact.modelStatus,'ready');
 const visualBounds=ctx.window.GoldenEyeNPCScale.visualBounds;
 for(const npc of builder.npcs){
  npc.mesh.updateMatrixWorld(true);
  const box=visualBounds(npc.visual.model,true);
  const expected=npc.role==='scientist'?1.72:1.75;
  assert.ok(Math.abs(box.min.y)<.035,'visible feet on floor: '+npc.id+' y='+box.min.y);
  assert.ok(Math.abs(box.max.y-expected)<.045,
    'visible model height: '+npc.id+' y='+box.max.y);
 }
 let skinA,skinB;a.visual.model.traverse(o=>{if(o.isSkinnedMesh)skinA=o});b.visual.model.traverse(o=>{if(o.isSkinnedMesh)skinB=o});
 assert.notEqual(skinA.skeleton.bones[0],skinB.skeleton.bones[0],'independent skeletons');
 assert.equal(skinA.geometry,skinB.geometry,'shared geometry');assert.equal(skinA.material.map,skinB.material.map,'shared textures');
 for(const npc of [contact,a,woman,b]){
  const box=visualBounds(npc.visual.model,true);
  const expected=npc.role==='scientist'?1.72:1.75;
  assert.ok(Math.abs(box.max.y-box.min.y-expected)<.05,
    'Actual skinned vertices must be life-size: '+npc.id);
 }
 const game=new Game();game.appState='PLAYING';game.levelBuilder=builder;game.player={pos:new THREE.Vector3(0,1.65,0)};
 game.update(.05);assert.equal(contact.visual.current,contact.visual.actions.Talk);
 const t=contact.visual.mixer.time;game.appState='PAUSED';game.update(.2);assert.equal(contact.visual.mixer.time,t);
 game.appState='PLAYING';game.player.pos.set(100,1.65,0);game.update(.05);assert.equal(contact.visual.current,contact.visual.actions.Idle);
 contact.mesh.position.x+=.1;game.update(.05);assert.equal(contact.visual.current,contact.visual.actions.Walking);
 // Regression: GLB animations or accidental runtime scaling must not create
 // 2x / 5x scientists and each clone keeps the exact same target height.
 a.visual.actor.scale.multiplyScalar(5);
 for(let i=0;i<20;i++)game.update(.05);
 for(const npc of [a,b]){
  npc.mesh.updateMatrixWorld(true);
  const actual=visualBounds(npc.visual.model,true);
  const height=actual.max.y-actual.min.y;
  assert.ok(Math.abs(height-1.72)<.05,
    'Scientist visibly gigantic after animation: '+npc.id+' '+height);
 }
 assert.equal(a.visual.targetHeight,1.72);
 assert.equal(b.visual.targetHeight,1.72);
 assert.equal(woman.visual.targetHeight,1.72);
 assert.equal(woman.visual.actions.Walking.paused,true);
 assert.equal(a.visual.actor.parent,a.visual.model,'Independent scale holder');
 assert.ok(a.visual.model.scale.x<b.visual.model.scale.x,'Animation root cannot override scale holder');
 contact.dead=true;const deathTime=contact.visual.mixer.time;game.update(.05);assert.equal(contact.visual.mixer.time,deathTime);
 let disposed=0;skinA.geometry.addEventListener('dispose',()=>disposed++);
 builder.levelGroup.remove(a.mesh);assert.equal(a.visual.released,true);assert.equal(disposed,0,'corpse does not dispose resources still used by other scientists');
 builder.clear();assert.equal(disposed,1,'mission clear releases shared resources once');
 const staleBuilder=new Builder();staleBuilder.build('silo');
 assert.ok(pending.filter(p=>p.url.endsWith('/Medica_Otimizada_Walk_Menos25MB.glb')).length>=2,
  'Silo deve ter a mesma variante feminina sem novo NPC');
 const old=pending[pending.length-1];staleBuilder.build('dam');
 const orphan=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());orphan.add(mesh);let released=0;mesh.geometry.addEventListener('dispose',()=>released++);old.done({scene:orphan,animations:[]});assert.equal(released,1);
 const fallback=new Builder();fallback.build('facility');pending[pending.length-1].fail();
 assert.equal(fallback.npcs[2].modelStatus,'fallback');
 assert.equal(fallback.npcs[2].mesh.children.length,1);
 const fb=new THREE.Box3().setFromObject(fallback.npcs[2].mesh);
 assert.ok(Math.abs(fb.max.y-fb.min.y-1.72)<.02,'scientist fallback must be same height');
 assert.ok(Math.abs(fb.min.y)<.02,'fallback feet on floor');
 console.log('OK NPC integration: contact, independent skinning, shared resources, pause, walk/talk/idle, death, stale load and fallback.');
}).catch(e=>{console.error(e);process.exitCode=1});
