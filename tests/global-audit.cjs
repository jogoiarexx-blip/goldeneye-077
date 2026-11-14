#!/usr/bin/env node
'use strict';
// Regressão global: corpos saem após 5 segundos de jogo; troca de mapas
// restaura neblina e limpa NPCs, partículas e guardas antigos.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'../src/global-audit-v2-0-5.js'),'utf8');
class Vec {
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(p){return this.set(p.x,p.y,p.z)}
 clone(){return new Vec(this.x,this.y,this.z)}
}
class Obj {
 constructor(){
  this.children=[];this.visible=true;this.parent=null;
  this.position=new Vec();this.userData={};
 }
 add(...xs){for(const x of xs){this.children.push(x);x.parent=this}}
 remove(x){this.children=this.children.filter(o=>o!==x);if(x&&x.parent===this)x.parent=null}
 traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}
}
class Mat{constructor(){this.disposed=0}dispose(){this.disposed++}}
class Geo{constructor(){this.disposed=0}dispose(){this.disposed++}}
class Mesh extends Obj{constructor(geo,mat){super();this.geometry=geo;this.material=mat}}
const scene=new Obj();
const builders={dam:()=>({}),facility:()=>({}),runway:()=>({}),
 surface1:()=>({})};
class Builder {
 constructor(){this.scene=scene;this.npcs=[];this.colliders=[];this.interactables=[]}
 build(id){
  this.last=id;
  this.npcs=[];
  this.colliders=[];
  this.interactables=[];
  this.bounds={minX:-10,maxX:10,minZ:-15,maxZ:20};
  return builders[id]?.();
 }
}
class Guard {
 constructor(mesh=new Obj()){this.mesh=mesh;this.state='PATROL'}
 takeDamage(dmg){
  if(this.state==='DEAD')return false;
  if(dmg>=100){this.state='DEAD';return true}
  return false;
 }
}
class Game {
 constructor(){
  this.levelBuilder=new Builder();
  this.currentMissionId='dam';this.appState='PLAYING';
  this.guards=[];this.sparks=[];this.stats={kills:0};this.scene=scene;
 }
 update(){}
 selectMission(id){
  if(id==='invalid')return;
  this.currentMissionId=id;this.levelBuilder.build(id);
 }
}
const window={gameInstance:null};
const THREE={
 Color:class{constructor(v){this.value=v}},
 FogExp2:class{constructor(color,density){this.color=color;this.density=density}}
};
vm.runInNewContext(code,{THREE,window,console,Number,
 DamLevelBuilder:Builder,GoldenEyeDamGame:Game,GuardAgent:Guard},
 {filename:'src/global-audit-v2-0-5.js'});
const game=new Game();window.gameInstance=game;
assert.equal(window.GoldenEyeAudit.bodySeconds,5);
const sharedMat=new Mat();
const guardA=new Guard(new Obj()),guardB=new Guard(new Obj());
const g1=new Geo(),g2=new Geo();
guardA.mesh.add(new Mesh(g1,sharedMat));
guardB.mesh.add(new Mesh(g2,sharedMat));
scene.add(guardA.mesh,guardB.mesh);
game.guards=[guardA,guardB];
assert.equal(guardA.takeDamage(100),true);
assert.equal(guardB.takeDamage(100),true);
assert.equal(guardB.takeDamage(100),false,'Morte não pode registrar duas vezes');
assert.equal(game.stats.kills,0,'Hook não pode alterar estatísticas');
for(let i=0;i<99;i++)game.update(.05);
assert.equal(guardA.corpseRemoved,false,'Corpo não pode sumir antes de 5s');
assert.equal(guardB.corpseRemoved,false);
game.appState='PAUSED';
for(let i=0;i<100;i++)game.update(.05);
assert.equal(guardA.corpseRemoved,false,'Pausa não deve consumir 5s');
game.appState='PLAYING';
game.update(.05);
assert.equal(guardA.corpseRemoved,true,'Corpo deve sumir em 5s');
assert.equal(guardB.corpseRemoved,true);
assert.equal(scene.children.includes(guardA.mesh),false);
assert.equal(scene.children.includes(guardB.mesh),false);
assert.equal(guardA.v13Discovered,true,
 'Corpo invisível não deve despertar alertas');
assert.equal(g1.disposed,1,'Geometria deve ser liberada uma vez');
assert.equal(g2.disposed,1,'Geometria deve ser liberada uma vez');
assert.equal(sharedMat.disposed,1,
 'Material compartilhado deve ser liberado ao remover último corpo');
for(let i=0;i<200;i++)game.update(.05);
assert.equal(g1.disposed,1,'Corpo não pode ser descartado repetidamente');

const guardC=new Guard(new Obj());scene.add(guardC.mesh);
game.guards.push(guardC);
guardC.takeDamage(140);
for(let i=0;i<100;i++)game.update(.05);
assert.equal(guardC.corpseRemoved,true,
 'Reforço criado depois do início segue mesma regra');

const npcMesh=new Obj();
const npc={dead:true,mesh:npcMesh};
const levelGroup=new Obj();scene.add(levelGroup);levelGroup.add(npcMesh);
game.levelBuilder.npcs.push(npc);
for(let i=0;i<99;i++)game.update(.05);
assert.equal(npc.corpseRemoved,undefined);
game.update(.05);
assert.equal(npc.corpseRemoved,true);
assert.equal(levelGroup.children.includes(npcMesh),false);

game.levelBuilder.build('surface1');
const oldColor=game.levelBuilder.scene.background;
game.levelBuilder.build('facility');
assert.equal(game.levelBuilder.scene.background.value,0x263b49);
assert.equal(game.levelBuilder.scene.fog.density,.008);
game.levelBuilder.build('runway');
assert.equal(game.levelBuilder.scene.background.value,0x7890a3);
game.levelBuilder.build('dam');
assert.equal(game.levelBuilder.scene.background.value,0x64748b);
game.levelBuilder.build('surface1');
assert.equal(game.levelBuilder.scene.background.value,0x64748b,
 'A auditoria global não deve sobrescrever atmosfera dos mapas novos');

const living=new Guard(new Obj());scene.add(living.mesh);
game.guards=[living];
const spark=new Obj();scene.add(spark);game.sparks=[{mesh:spark}];
game.appState='MENU';game.currentMissionId='dam';
game.selectMission('facility');
assert.equal(game.guards.length,0,'Troca de mapa limpa guardas antigos');
assert.equal(game.sparks.length,0,'Troca de mapa limpa faíscas antigas');
assert.equal(scene.children.includes(living.mesh),false);
assert.equal(scene.children.includes(spark),false);
game.guards=[new Guard(new Obj())];
game.selectMission('invalid');
assert.equal(game.guards.length,1,'Seleção negada não limpa a fase atual');

game.levelBuilder.interactables=[{id:'broken',radius:-1,position:new Vec()}];
game.levelBuilder.build('facility');
assert.deepEqual([...game.levelBuilder.auditReport],[],
 'O builder real deve produzir fase limpa sem avisos artificiais');
console.log('OK auditoria global: corpos removidos em 5s, pausa respeitada,');
console.log('NPCs, reforços, material compartilhado, troca de fase e neblina.');
