#!/usr/bin/env node
/* Integração da missão STATUE v2.0 sem renderer WebGL. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../src/statue-v2-0.js'),'utf8');
class V {
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(v){return this.set(v.x,v.y,v.z)}
 clone(){return new V(this.x,this.y,this.z)}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
 distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
}
class Object3D {
 constructor(){
  this.position=new V();this.rotation={x:0,y:0,z:0,order:'XYZ'};
  this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z}};
  this.children=[];this.visible=true;
 }
 add(...items){this.children.push(...items)}
 remove(item){this.children=this.children.filter(c=>c!==item)}
}
class Material {
 constructor(params={}){
  this.params=params;this.opacity=params.opacity ?? 1;
  this.color={hex:params.color,setHex(h){this.hex=h}};
 }
 clone(){return new Material(this.params)}
}
class Geometry{constructor(...args){this.args=args}}
class Mesh extends Object3D {
 constructor(geometry,material){super();this.geometry=geometry;this.material=material}
 clone(){const m=new Mesh(this.geometry,this.material);return m}
}
class BufGeo{
 constructor(){this.attrs={}}
 setAttribute(k,v){this.attrs[k]=v}
 getAttribute(k){return this.attrs[k]}
}
class BufAttr{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false}}
class Light extends Object3D{
 constructor(){super();this.intensity=1;this.shadow={mapSize:{set(){}},camera:{}}}
}
class Builder{
 constructor(){this.scene={background:null,fog:null};this.clear()}
 clear(){
  this.levelGroup=new Object3D();
  this.colliders=[];this.interactables=[];this.guardSpawns=[];
  this.npcs=[];this.pickups=[];this.gates=[];this.cameras=[];
 }
 build(){this.clear()}
 updateEnvironment(){}
 addBox(x,y,z,w,h,d,mat,solid=true){
  const o=new Mesh(new Geometry(w,h,d),mat);o.position.set(x,y,z);
  this.levelGroup.add(o);
  if(solid)this.colliders.push({
   minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2
  });
  return o;
 }
 addCharacterNPC(id,role,x,z){
  const npc={id,role,position:new V(x,0,z),mesh:new Object3D(),dead:false};
  npc.mesh.position.set(x,0,z);this.levelGroup.add(npc.mesh);
  this.npcs.push(npc);
 }
 addPickup(type,x,y,z){this.pickups.push({type,position:new V(x,y,z)})}
}
const THREE={
 Vector3:V,Group:Object3D,Mesh,Points:Mesh,
 BoxGeometry:Geometry,CylinderGeometry:Geometry,ConeGeometry:Geometry,
 DodecahedronGeometry:Geometry,SphereGeometry:Geometry,
 TorusGeometry:Geometry,PlaneGeometry:Geometry,
 BufferGeometry:BufGeo,BufferAttribute:BufAttr,
 PointsMaterial:Material,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 HemisphereLight:Light,DirectionalLight:Light,PointLight:Light,
 FogExp2:class{constructor(color,density){this.color=color;this.density=density}},
 Color:class{constructor(hex){this.hex=hex}},DoubleSide:2
};
const missions={};
const nodes=new Map();
const document={
 querySelector(){return null},
 getElementById(k){
  if(!nodes.has(k))nodes.set(k,{
    classList:{add(){},remove(){}},dataset:{},textContent:'',style:{}
  });
  return nodes.get(k);
 }
};
const storage=new Map();
const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,
 setItem:(k,v)=>storage.set(k,v)};
class Game {
 constructor(){
  this.levelBuilder=new Builder();this.currentMissionId='statue';
  this.difficulty='00_AGENT';this.appState='PLAYING';
  this.player={pos:new V(0,1.65,50),yaw:0,pitch:0};
  this.weaponMeshGroup={visible:true};
  this.camera={position:new V(),rotation:{},lookAt(){}};
  this.audio={enabled:true,ctx:null,playGadgetBeep(){}};
  this.guards=[];this.objectives=[];this.messages=[];this.stats={};
 }
 selectMission(id){this.currentMissionId=id;this.levelBuilder.build(id)}
 completeMissionSuccess(){}
 startMission(){
  this.levelBuilder.build(this.currentMissionId);
  this.objectives=missions[this.currentMissionId].difficulties[this.difficulty]
    .objectives.map(o=>({...o,completed:false}));
 }
 interact(){}
 update(){}
 fireWeapon(){}
 tryTriggerMissionExit(id){
  const pending=this.objectives.filter(o=>o.id!==id&&!o.completed);
  if(pending.length===0)this.appState='CUTSCENE_OUTRO';
 }
 failMission(reason){this.appState='RESULTS';this.failure=reason}
 notifyHUD(msg){this.messages.push(msg)}
 updateHUD(){}
}
vm.runInNewContext(src,{
 THREE,DamLevelBuilder:Builder,GoldenEyeDamGame:Game,
 MISSIONS_DATA:missions,document,localStorage,
 window:{addEventListener(){}},performance:{now:()=>0},console,
 ProceduralTextures:{createNoiseTexture(){return{}}}
},{filename:'statue-v2-0.js'});

assert.ok(missions.statue,'Missão Statue cadastrada');
assert.equal(missions.statue.difficulties.AGENT.objectives.length,5);
assert.equal(missions.statue.difficulties.SECRET_AGENT.objectives.length,5);
assert.equal(missions.statue.difficulties['00_AGENT'].objectives.length,6);
const world=new Builder();world.build('statue');
const st=world.statueState;
assert.ok(st?.valentin&&st.janus&&st.natalya,'Todos os personagens existem');
assert.equal(world.guardSpawns.length,9,'Nove patrulhas finitas');
assert.equal(st.fogPlanes.length,9,'Névoa leve por planos');
assert.equal(st.dust.geometry.getAttribute('position').array.length,130*3);
assert.equal(st.recorderMesh.visible,false);
assert.equal(st.recorderItem.radius,0);
assert.equal(st.janus.mesh.visible,false);
const needed=['st_valentin','st_janus','st_helicopter','st_natalya',
 'st_flight_recorder','st_exit'];
for(const id of needed)
 assert.ok(world.interactables.some(x=>x.id===id),'Interação ausente: '+id);
world.updateEnvironment(.05,1.5);

// BFS AABB: todo objetivo alcançável pelos caminhos externos.
function flood(){
 const {minX,maxX,minZ,maxZ}=world.bounds;
 const nx=Math.floor(maxX-minX)+1,nz=Math.floor(maxZ-minZ)+1;
 const q=[],seen=new Uint8Array(nx*nz);
 function add(ix,iz){
  if(ix<0||iz<0||ix>=nx||iz>=nz)return;
  const k=iz*nx+ix;if(seen[k])return;
  const x=minX+ix,z=minZ+iz;
  const hit=world.colliders.some(b=>b.maxY>0.4 && b.minY<1.75 &&
    x+.46>b.minX&&x-.46<b.maxX && z+.46>b.minZ&&z-.46<b.maxZ);
  if(hit)return;
  seen[k]=1;q.push([ix,iz]);
 }
 add(Math.round(0-minX),Math.round(50-minZ));
 for(let p=0;p<q.length;p++){
  const [x,z]=q[p];add(x+1,z);add(x-1,z);add(x,z+1);add(x,z-1);
 }
 return {n:q.length,reaches(pos,r=2.65){
  return q.some(([x,z])=>Math.hypot(minX+x-pos.x,minZ+z-pos.z)<r);
 }};
}
const floodResult=flood();
assert.ok(floodResult.n>9000,'Parque sem área suficiente para caminhar');
for(const id of needed){
 const item=world.interactables.find(i=>i.id===id);
 assert.ok(floodResult.reaches(item.position,2.9),'Interação inacessível: '+id);
}

const g=new Game();g.startMission();
const item=id=>g.levelBuilder.interactables.find(i=>i.id===id);
const use=id=>{g.player.pos.copy(item(id).position);g.interact();return item(id)};
const restore=()=>{for(let i=0;i<110&&g.appState==='STATUE_SCENE';i++)g.update(.05);};
use('st_janus');
assert.ok(!item('st_janus').completed,'Janus não pode aparecer antes de Valentin');
use('st_helicopter');
assert.ok(!item('st_helicopter').completed,'Pista do helicóptero requer Janus');
use('st_natalya');
assert.ok(!item('st_natalya').completed,'Natalya requer localização da aeronave');
use('st_flight_recorder');
assert.ok(!item('st_flight_recorder').completed,'Gravador indisponível antes do resgate');
use('st_exit');
assert.equal(g.appState,'PLAYING','Saída prematura negada');

use('st_valentin');
assert.equal(g.appState,'STATUE_SCENE','Contato deve iniciar microcena');
assert.equal(g.levelBuilder.statueState.janus.mesh.visible,true);
assert.ok(item('st_valentin').completed);
assert.ok(item('st_janus').radius>0);
g.player.pos.copy(item('st_janus').position);
g.interact();
assert.ok(!item('st_janus').completed,'Microcena deve impedir pular para Janus');
restore();
assert.equal(g.appState,'PLAYING','Microcena deve encerrar automaticamente');

use('st_janus');
assert.ok(item('st_janus').completed);
assert.equal(g.appState,'STATUE_SCENE');
restore();
use('st_helicopter');
assert.ok(item('st_helicopter').completed);
restore();
assert.equal(g.levelBuilder.statueState.recorderRevealed,false,
 'Gravador não deve revelar na inspeção da aeronave');
use('st_natalya');
assert.ok(item('st_natalya').completed);
assert.equal(g.levelBuilder.statueState.recorderRevealed,true);
assert.equal(g.levelBuilder.statueState.recorderMesh.visible,true);
assert.ok(item('st_flight_recorder').radius>0);
restore();
use('st_exit');
assert.equal(g.appState,'PLAYING','00 Agent exige o gravador, mesmo após o resgate');
use('st_flight_recorder');
assert.ok(g.objectives.find(o=>o.id==='st_flight_recorder').completed);
assert.equal(g.levelBuilder.statueState.recorderMesh.visible,false);
use('st_exit');
assert.equal(g.appState,'CUTSCENE_OUTRO','Todas as tarefas autorizam extração');

const critical=new Game();critical.startMission();
critical.levelBuilder.statueState.natalya.dead=true;
critical.update(.05);
assert.equal(critical.appState,'RESULTS','Natalya morta interrompe a missão');
const locked=new Game();locked.currentMissionId='bunker2';
locked.selectMission('statue');
assert.equal(locked.currentMissionId,'bunker2','Statue bloqueada antes de Bunker 2');
storage.set('ge007_bunker2_best_AGENT','210.5');
const legacy=new Game();legacy.currentMissionId='bunker2';
legacy.selectMission('statue');
assert.equal(legacy.currentMissionId,'statue','Recordes antigos liberam Statue');
storage.delete('ge007_bunker2_best_AGENT');
const finished=new Game();finished.currentMissionId='bunker2';
finished.completeMissionSuccess();
assert.equal(storage.get('ge007_statue_unlocked'),'1');
assert.equal(document.getElementById('btn-results-next').dataset.nextMission,'statue');
world.build('dam');
assert.equal(world.statueState,null,'Remover efeitos ao trocar de missão');
console.log('OK Statue: 10ª fase, nove patrulhas, rotas navegáveis, diálogo em sequência,');
console.log('Janus revelado após Valentin, Natalya, gravador liberado no momento certo e extração.');
