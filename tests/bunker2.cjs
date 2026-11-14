#!/usr/bin/env node
'use strict';
// Teste simulado de Bunker 2: GDD 7.09, rotas e escolta. Sem motor WebGL.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/bunker2-v1-9.js'),'utf8');
class Vec {
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  copy(v){return this.set(v.x,v.y,v.z)}
  clone(){return new Vec(this.x,this.y,this.z)}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
}
class Obj {
  constructor(){
    this.position=new Vec();this.rotation={x:0,y:0,z:0};
    this.children=[];this.visible=true;
    this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z}};
  }
  add(...items){this.children.push(...items)}
  remove(item){this.children=this.children.filter(v=>v!==item)}
}
class Geo{constructor(...args){this.args=args}}
class Mat {
  constructor(data={}){this.data=data;this.color={setHex(value){this.hex=value}}}
  clone(){return new Mat(this.data)}
}
class Mesh extends Obj {
  constructor(geometry,material){super();this.geometry=geometry;this.material=material}
}
class Light extends Obj {
  constructor(){super();this.intensity=1;this.shadow={mapSize:{set(){}},camera:{}}}
}
class Builder {
  constructor(){this.scene={};this.clear()}
  clear(){
    this.levelGroup=new Obj();this.colliders=[];this.interactables=[];
    this.gates=[];this.npcs=[];this.guardSpawns=[];this.cameras=[];this.pickups=[];
  }
  build(){this.clear()}
  updateEnvironment(){}
  addBox(x,y,z,w,h,d,material,solid=true){
    const mesh=new Mesh(new Geo(w,h,d),material);
    mesh.position.set(x,y,z);this.levelGroup.add(mesh);
    if(solid)this.colliders.push({
      minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,
      minZ:z-d/2,maxZ:z+d/2
    });
    return mesh;
  }
  addSecurityGate(id,x,z,width){
    const collider={minX:x-width/2,maxX:x+width/2,
      minZ:z-.35,maxZ:z+.35,minY:0,maxY:4};
    this.colliders.push(collider);
    this.gates.push({
      id,collider,isOpen:false,progress:0,
      closedX:x,openX:x+width-.3,mesh:new Obj()
    });
  }
  addCharacterNPC(id,role,x,z){
    const npc={id,role,position:new Vec(x,0,z),dead:false,mesh:new Obj()};
    npc.mesh.position.set(x,0,z);this.npcs.push(npc);
  }
  addSecurityCamera(x,y,z,yaw){
    this.cameras.push({
      position:new Vec(x,y,z),baseYaw:yaw,currentYaw:yaw,
      head:new Obj(),lens:new Mesh(new Geo(),new Mat()),destroyed:false
    });
  }
  addPickup(type,x,y,z){this.pickups.push({type,position:new Vec(x,y,z)})}
}
const MISSIONS_DATA={};
const ui=new Map();
const document={
  querySelector(){return null},
  getElementById(id){
    if(!ui.has(id))ui.set(id,{
      textContent:'',dataset:{},style:{},classList:{add(){},remove(){}}
    });
    return ui.get(id);
  }
};
const localData=new Map();
const localStorage={
  getItem:k=>localData.has(k)?localData.get(k):null,
  setItem:(k,v)=>localData.set(k,v)
};
class Guard {
  constructor(scene,spawn){
    this.pos=spawn.pos.clone();this.state='PATROL';
  }
}
class Game {
  constructor(){
    this.levelBuilder=new Builder();this.currentMissionId='bunker2';
    this.difficulty='00_AGENT';this.appState='PLAYING';
    this.player={pos:new Vec(0,1.65,43)};
    this.objectives=[];this.guards=[];this.stats={alarmsTriggered:0};
    this.camera={position:new Vec(),lookAt(){}};
    this.audio={playGadgetBeep(){}};this.messages=[];
    this.scene={};
  }
  startMission(){
    this.levelBuilder.build(this.currentMissionId);
    this.objectives=MISSIONS_DATA[this.currentMissionId].difficulties[this.difficulty]
      .objectives.map(o=>({...o,completed:false}));
  }
  selectMission(id){this.currentMissionId=id;this.levelBuilder.build(id)}
  completeMissionSuccess(){}
  update(){}
  fireWeapon(){}
  interact(){
    const near=this.levelBuilder.interactables.find(i=>
      !i.completed&&this.player.pos.distanceTo(i.position)<=i.radius);
    if(!near)return;
    near.completed=true;
    if(near.type==='gate_switch'){
      const gate=this.levelBuilder.gates.find(g=>g.id===near.gateId);
      gate.isOpen=true;gate.progress=1;
      gate.collider.minX=9999;gate.collider.maxX=9999;
    }
  }
  tryTriggerMissionExit(id){
    const pending=this.objectives.filter(o=>o.id!==id&&!o.completed);
    if(!pending.length)this.appState='CUTSCENE_OUTRO';
  }
  failMission(reason){this.appState='RESULTS';this.failure=reason}
  notifyHUD(msg){this.messages.push(msg)}
  updateHUD(){}
}
const THREE={
  Vector3:Vec,Group:Obj,Mesh,
  BoxGeometry:Geo,CylinderGeometry:Geo,SphereGeometry:Geo,
  MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,
  HemisphereLight:Light,PointLight:Light,
  Color:class{constructor(hex){this.hex=hex}},
  FogExp2:class{constructor(hex,density){this.hex=hex;this.density=density}},
  MathUtils:{lerp:(a,b,t)=>a+(b-a)*t}
};
vm.runInNewContext(source,{
  THREE,DamLevelBuilder:Builder,GoldenEyeDamGame:Game,MISSIONS_DATA,
  ProceduralTextures:{createNoiseTexture(){return {}}},
  window:{addEventListener(){}},document,localStorage,
  performance:{now(){return 0}},GuardAgent:Guard,
  hasLineOfSight(){return true},console
},{filename:'src/bunker2-v1-9.js'});
assert.ok(MISSIONS_DATA.bunker2,'Bunker 2 deve estar no catálogo');
assert.equal(MISSIONS_DATA.bunker2.difficulties.AGENT.objectives.length,2);
assert.equal(MISSIONS_DATA.bunker2.difficulties.SECRET_AGENT.objectives.length,3);
assert.equal(MISSIONS_DATA.bunker2.difficulties['00_AGENT'].objectives.length,5);
const world=new Builder();
world.build('bunker2');
assert.equal(world.gates.length,3,'Bunker com três portões controlados');
assert.equal(world.cameras.length,4,'Bunker com quatro câmeras');
assert.equal(world.guardSpawns.length,8,'Oito patrulhas iniciais');
assert.ok(world.bunker2State?.natalya,'Natalya presente no mapa');
assert.ok(world.bunker2State.escortRoute.length>=12,'Rota de acompanhante extensa');
for(const id of [
  'b2_free_natalya','b2_personnel_log','b2_casualty_log',
  'b2_compare_records','b2_get_videotape','b2_get_manual',
  'b2_escape_with_natalya', 'b2_switch_1', 'b2_switch_2','b2_switch_3'
]){
  assert.ok(world.interactables.some(x=>x.id===id),'Interação ausente: '+id);
}
world.updateEnvironment(.05,2.5);

// Busca de caminho pela área livre com colisores AABB e portas fechadas.
function reachable(opened=[]){
  const b=world.bounds,nx=48,nz=203,seen=new Uint8Array(nx*nz),q=[];
  const ignored=new Set(opened.map(g=>g.collider));
  function push(ix,iz){
    if(ix<0||iz<0||ix>=nx||iz>=nz)return;
    const key=iz*nx+ix;if(seen[key])return;
    const x=b.minX+ix,z=b.minZ+iz;
    if(world.colliders.some(c=>!ignored.has(c)&&
      c.minX<=c.maxX&&c.maxY>.4&&c.minY<1.7 &&
      x+.46>c.minX&&x-.46<c.maxX&&z+.46>c.minZ&&z-.46<c.maxZ))return;
    seen[key]=1;q.push([ix,iz]);
  }
  push(Math.round(-b.minX),Math.round(43-b.minZ));
  for(let i=0;i<q.length;i++){
    const [x,z]=q[i];push(x+1,z);push(x-1,z);push(x,z+1);push(x,z-1);
  }
  return {
    count:q.length,
    has(pos,r=2.6){
      return q.some(([x,z])=>Math.hypot(b.minX+x-pos.x,b.minZ+z-pos.z)<r);
    }
  };
}
const start=reachable();
assert.ok(start.has(world.interactables.find(x=>x.id==='b2_switch_1').position),
  'Primeiro leitor acessível');
assert.ok(!start.has(world.interactables.find(x=>x.id==='b2_free_natalya').position),
  'Natalya deve estar após a cela fechada');
const opened=[];
for(const idx of [1,2,3]){
  const sw=world.interactables.find(x=>x.id==='b2_switch_'+idx);
  assert.ok(reachable(opened).has(sw.position),'Leitor inacessível #'+idx);
  opened.push(world.gates[idx-1]);
}
const all=reachable(world.gates);
assert.ok(all.count>1000,'Pouca área navegável');
for(const item of world.interactables){
  if(item.type==='ally_order')continue;
  assert.ok(all.has(item.position,Math.min(2.8,item.radius)),
    'Interação inalcançável: '+item.id);
}

const game=new Game();game.startMission();
const items=game.levelBuilder.interactables;
const find=id=>items.find(o=>o.id===id);
const use=id=>{
  const item=find(id);assert.ok(item,'Item inexistente '+id);
  game.player.pos.copy(item.position);game.interact();return item;
};
const compare=find('b2_compare_records');
use('b2_compare_records');
assert.ok(!compare.completed,'Não pode comparar antes de ler dois arquivos');
use('b2_personnel_log');
use('b2_compare_records');
assert.ok(!compare.completed,'Não pode comparar com apenas um arquivo');
use('b2_casualty_log');
use('b2_compare_records');
assert.ok(compare.completed,'Comparação deve completar após ler os dois arquivos');
use('b2_get_videotape');use('b2_get_manual');
assert.ok(game.objectives.find(x=>x.id==='b2_get_videotape').completed);
assert.ok(game.objectives.find(x=>x.id==='b2_get_manual').completed);
for(const id of ['cam_a','cam_b','cam_c','cam_d'])
  use('b2_sabotage_'+id);
assert.ok(game.objectives.find(o=>o.id==='b2_destroy_cameras').completed);
assert.ok(game.levelBuilder.cameras.every(cam=>cam.destroyed));

use('b2_escape_with_natalya');
assert.equal(game.appState,'PLAYING','Natalya não pode ser deixada para trás');
const natalyaItem=use('b2_free_natalya');
assert.ok(natalyaItem.completed);
const state=game.levelBuilder.bunker2State;
assert.ok(state.freed&&state.following);
assert.ok(items.some(i=>i.id==='b2_natalya_orders'));
use('b2_natalya_orders');
assert.equal(state.following,false,'Aliada deve aguardar após ordem');
use('b2_natalya_orders');
assert.equal(state.following,true,'Aliada deve voltar a seguir');

// Portão do segundo setor fechado deve interromper acompanhante na rota.
game.player.pos.set(0,1.65,-139);
for(let i=0;i<300;i++)game.update(.05);
assert.ok(state.natalya.position.z>-49,'Natalya não atravessou o portão fechado');
assert.equal(game.appState,'PLAYING');

// Abre os três portões, avança com o jogador até o ponto de fuga.
for(const gate of game.levelBuilder.gates){
  gate.isOpen=true;gate.progress=1;
  gate.collider.minX=9999;gate.collider.maxX=9999;
}
const exitPos=find('b2_escape_with_natalya').position;
for(let i=0;i<1600 && state.natalya.position.distanceTo(exitPos)>4.8;i++)game.update(.05);
assert.ok(state.natalya.position.distanceTo(exitPos)<=4.8,
  'Escolta não alcançou o raio da extração, posição: '+JSON.stringify(state.natalya.position)+
  ', waypoint: '+state.routeIndex);
use('b2_escape_with_natalya');
assert.equal(game.appState,'CUTSCENE_OUTRO','Natalya deve escapar com 007');

// Falha quando Natalya não sobrevive, sem concluir por engano.
const injured=new Game();injured.startMission();
injured.levelBuilder.bunker2State.natalya.dead=true;
injured.update(.05);
assert.equal(injured.appState,'RESULTS');
assert.match(injured.failure,/NATALYA/);

// Reforços acionados uma vez e limitados a dois soldados adicionais.
const alarms=new Game();alarms.startMission();
alarms.stats.alarmsTriggered=1;
for(let i=0;i<200;i++)alarms.update(.05);
assert.equal(alarms.guards.length,2);
assert.equal(alarms.levelBuilder.bunker2State.limitedReinforcements,2);

// Migração de progressos antigos e desbloqueio após Surface 2.
const locked=new Game();locked.currentMissionId='surface2';
locked.selectMission('bunker2');
assert.equal(locked.currentMissionId,'surface2','Deve estar bloqueada por padrão');
localData.set('ge007_surface2_best_AGENT','188.7');
const oldSave=new Game();oldSave.currentMissionId='surface2';
oldSave.selectMission('bunker2');
assert.equal(oldSave.currentMissionId,'bunker2','Recorde antigo libera Bunker 2');
const finished=new Game();finished.currentMissionId='surface2';
finished.completeMissionSuccess();
assert.equal(localData.get('ge007_bunker2_unlocked'),'1');
assert.equal(document.getElementById('btn-results-next').dataset.nextMission,'bunker2');

// Não deixar resíduos ao trocar de missão.
world.build('dam');
assert.equal(world.bunker2State,null);
console.log('OK Bunker 2: mapa, portas, registros, fita, manual, câmeras,');
console.log('Natalya acompanha até a saída, não atravessa portão, proteção, reforços e desbloqueio.');
