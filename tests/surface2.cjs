#!/usr/bin/env node
/* Testes de integração sem navegador para Surface 2: arquitetura, colisões e objetivos. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const surface1=fs.readFileSync(path.join(root,'src/surface-v1-4.js'),'utf8');
const surface2=fs.readFileSync(path.join(root,'src/surface2-v1-8.js'),'utf8');
class Vec {
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  copy(v){return this.set(v.x,v.y,v.z)}
  clone(){return new Vec(this.x,this.y,this.z)}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
}
class Obj {
  constructor(){
    this.position=new Vec();
    this.rotation={x:0,y:0,z:0};
    this.children=[];
    this.visible=true;
    this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;return this},
      setScalar(n){this.x=this.y=this.z=n;return this}};
  }
  add(...items){this.children.push(...items)}
  remove(item){this.children=this.children.filter(v=>v!==item)}
}
class Mesh extends Obj {
  constructor(geom,material){super();this.geometry=geom;this.material=material}
}
class Mat {
  constructor(props={}){
    this.props=props;
    this.color={setHex(value){this.hex=value}};
    this.opacity=props.opacity===undefined?1:props.opacity;
    this.size=props.size||0;
  }
  clone(){return new Mat(this.props)}
}
class Geo{constructor(...args){this.args=args}}
class BufferGeo {
  constructor(){this.attributes={}}
  setAttribute(name,v){this.attributes[name]=v}
  getAttribute(name){return this.attributes[name]}
}
class BufferAttr{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false}
}
class Light extends Obj {
  constructor(){super();this.intensity=1;this.target=new Obj();
    this.shadow={mapSize:{set(){}},camera:{}}}
}
class DirectionalLight extends Light{
  constructor(){super();this.isDirectionalLight=true}
}
class Builder {
  constructor(){this.scene={};this.clear()}
  clear(){
    this.levelGroup=new Obj();this.colliders=[];this.interactables=[];
    this.guardSpawns=[];this.pickups=[];this.gates=[];
    this.padlocks=[];this.cameras=[];this.animatedProps=[];
  }
  build(){this.clear()}
  addBox(x,y,z,w,h,d,material,solid=true){
    const mesh=new Mesh(new Geo(w,h,d),material);
    mesh.position.set(x,y,z);
    this.levelGroup.add(mesh);
    if(solid)this.colliders.push({
      minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2
    });
    return mesh;
  }
  addPickup(type,x,y,z){this.pickups.push({type,position:new Vec(x,y,z)})}
  addSecurityGate(id,x,z,width){
    const collider={minX:x-width/2,maxX:x+width/2,
      minY:0,maxY:4,minZ:z-.35,maxZ:z+.35};
    this.colliders.push(collider);
    this.gates.push({id,collider,progress:0,isOpen:false,mesh:new Obj()});
  }
  addSecurityCamera(x,y,z,yaw){
    this.cameras.push({position:new Vec(x,y,z),
      baseYaw:yaw,currentYaw:yaw,head:new Obj(),
      lens:new Mesh(new Geo(),new Mat()),destroyed:false});
  }
  updateEnvironment(){}
}
const objectives={};
const ui=new Map();
const document={
  querySelector(){return null},
  getElementById(id){
    if(!ui.has(id))ui.set(id,{
      textContent:'',dataset:{},style:{},
      classList:{add(){},remove(){}}
    });
    return ui.get(id);
  }
};
const saved=new Map();
const localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
class Game {
  constructor(){
    this.levelBuilder=new Builder();
    this.currentMissionId='surface2';this.difficulty='00_AGENT';
    this.player={pos:new Vec(0,1.65,46),yaw:0,pitch:0};
    this.appState='PLAYING';this.objectives=[];
    this.audio={playGadgetBeep(){}};
    this.messages=[];this.camera={position:new Vec(),lookAt(){}};
  }
  selectMission(id){this.currentMissionId=id;this.levelBuilder.build(id)}
  startMission(){
    this.levelBuilder.build(this.currentMissionId);
    this.objectives=objectives[this.currentMissionId].difficulties[this.difficulty]
      .objectives.map(o=>({...o,completed:false}));
  }
  completeMissionSuccess(){}
  interact(){
    const i=this.levelBuilder.interactables.find(x=>
      !x.completed&&this.player.pos.distanceTo(x.position)<=x.radius);
    if(i){
      if(i.type==='gate_switch')
        this.levelBuilder.gates.find(g=>g.id===i.gateId).isOpen=true;
      i.completed=true;
    }
  }
  tryTriggerMissionExit(id){
    const pending=this.objectives.filter(o=>o.id!==id&&!o.completed);
    if(!pending.length)this.appState='CUTSCENE_OUTRO';
  }
  update(){}
  notifyHUD(msg){this.messages.push(msg)}
  updateHUD(){}
  spawnSpark(){}
}
const THREE={
  Vector3:Vec,Object3D:Obj,Group:Obj,Mesh,Points:Mesh,
  BoxGeometry:Geo,CylinderGeometry:Geo,ConeGeometry:Geo,SphereGeometry:Geo,
  DodecahedronGeometry:Geo,TorusGeometry:Geo,
  BufferGeometry:BufferGeo,BufferAttribute:BufferAttr,
  MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,PointsMaterial:Mat,
  PointLight:Light,HemisphereLight:Light,SpotLight:Light,DirectionalLight,
  Color:class {constructor(hex){this.hex=hex}},
  FogExp2:class {constructor(color,density){this.color=color;this.density=density}},
  MathUtils:{lerp:(a,b,t)=>a+(b-a)*t}
};
const context={
  THREE,DamLevelBuilder:Builder,GoldenEyeDamGame:Game,MISSIONS_DATA:objectives,
  ProceduralTextures:{createNoiseTexture(){return {}}},
  window:{addEventListener(){}},document,localStorage,performance:{now(){return 0}},
  setTimeout(){},console
};
vm.runInNewContext(surface1,context,{filename:'src/surface-v1-4.js'});
vm.runInNewContext(surface2,context,{filename:'src/surface2-v1-8.js'});
const world=new Builder();
world.build('surface2');
const targets={};
for(const item of world.interactables)targets[item.id]=item;
assert.ok(world.surface1?.snow,'A neve de Surface 1 deve ser reaproveitada');
assert.ok(world.surface1.beacon,'A antena original deve permanecer no cenário');
for(const id of ['s2_disable_surveillance','s2_cut_bunker_link',
  's2_disable_helicopter','s2_bunker_entry','s2_gate_switch']){
  assert.ok(targets[id],'Interação ausente '+id);
}
assert.equal(world.gates.length,1,'Um checkpoint deve bloquear o setor norte');
assert.equal(world.guardSpawns.length,12);
assert.equal(world.cameras.length,4);
assert.equal(world.surface1.snow.geometry.getAttribute('position').array.length,440*3);
const diff=objectives.surface2.difficulties;
assert.equal(diff.AGENT.objectives.length,2);
assert.equal(diff.SECRET_AGENT.objectives.length,3);
assert.equal(diff['00_AGENT'].objectives.length,4);
world.updateEnvironment(.05,2);

function reachable(opened=[]){
  const b=world.bounds,step=1;
  const nx=Math.floor((b.maxX-b.minX)/step)+1;
  const nz=Math.floor((b.maxZ-b.minZ)/step)+1;
  const blocked=new Set(opened.map(g=>g.collider));
  const colliders=world.colliders.filter(c=>!blocked.has(c));
  const q=[],seen=new Uint8Array(nx*nz);
  function push(x,z){
    if(x<0||x>=nx||z<0||z>=nz)return;
    const key=z*nx+x;
    if(seen[key])return;
    const xx=b.minX+x*step,zz=b.minZ+z*step;
    if(colliders.some(c=>c.maxY>.2&&c.minY<1.7&&
      xx+.48>c.minX&&xx-.48<c.maxX&&
      zz+.48>c.minZ&&zz-.48<c.maxZ))return;
    seen[key]=1;q.push([x,z]);
  }
  push(Math.round((0-b.minX)/step),Math.round((46-b.minZ)/step));
  for(let k=0;k<q.length;k++){
    const [x,z]=q[k];
    push(x+1,z);push(x-1,z);push(x,z+1);push(x,z-1);
  }
  return pos=>q.some(([x,z])=>
    Math.hypot(b.minX+x*step-pos.x,b.minZ+z*step-pos.z)<2.7);
}
const closed=reachable();
for(const id of ['s2_disable_surveillance','s2_cut_bunker_link','s2_gate_switch'])
  assert.ok(closed(targets[id].position),'Painel antes do portão inacessível: '+id);
assert.equal(closed(targets.s2_disable_helicopter.position),false,
  'Não pode atravessar o checkpoint fechado, nem pelas bordas');
const open=reachable(world.gates);
for(const id of ['s2_disable_helicopter','s2_bunker_entry'])
  assert.ok(open(targets[id].position),'Alvo após o portão inacessível: '+id);

const game=new Game();
game.startMission();
game.player.pos.copy(game.levelBuilder.interactables.find(i=>i.id==='s2_bunker_entry').position);
game.interact();
assert.equal(game.appState,'PLAYING','Saída não pode concluir antes das tarefas');
const choose=id=>{
  const item=game.levelBuilder.interactables.find(i=>i.id===id);
  game.player.pos.copy(item.position);
  game.interact();
  return item;
};
choose('s2_disable_surveillance');
assert.ok(game.levelBuilder.cameras.every(cam=>cam.destroyed),
  'O controle de vigilância deve desligar todas as câmeras');
choose('s2_cut_bunker_link');
assert.ok(game.levelBuilder.surface1.antennaOff,'O enlace deve desligar a antena');
choose('s2_disable_helicopter');
assert.ok(game.levelBuilder.surface2State.helicopterDisabled,
  'A aeronave não pode permanecer operacional após a sabotagem');
game.levelBuilder.updateEnvironment(.1,1);
assert.ok(game.levelBuilder.surface2State.smoke.every(p=>p.mesh.visible),
  'A aeronave neutralizada deve apresentar danos visíveis');
choose('s2_bunker_entry');
assert.equal(game.appState,'CUTSCENE_OUTRO','Todas as diretivas devem permitir sair');

world.build('surface1');
assert.equal(world.surface2State,null,'Limpar referências de Surface 2 ao trocar mapa');
assert.equal(world.interactables.length,4,'Surface 1 original deve continuar intacta');
const lockedGame=new Game();
lockedGame.currentMissionId='frigate';
lockedGame.selectMission('surface2');
assert.equal(lockedGame.currentMissionId,'frigate',
  'Sem completar Frigate a nova missão deve continuar bloqueada');
saved.set('ge007_frigate_best_AGENT','230.25');
const migrated=new Game();
migrated.currentMissionId='frigate';
migrated.selectMission('surface2');
assert.equal(migrated.currentMissionId,'surface2',
  'Recorde de Frigate de versões antigas deve liberar Surface 2');
saved.delete('ge007_frigate_best_AGENT');
const completion=new Game();
completion.currentMissionId='frigate';
completion.completeMissionSuccess();
assert.equal(saved.get('ge007_surface2_unlocked'),'1');
assert.equal(document.getElementById('btn-results-next').dataset.nextMission,'surface2');
console.log('OK integração Surface 2: reutilização do mapa, 12 guardas, 4 câmeras,');
console.log('checkpoint sem desvio, objetivos, danos no helicóptero e desbloqueio.');
