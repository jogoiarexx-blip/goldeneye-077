#!/usr/bin/env node
'use strict';
// Teste de integração com TODOS os builders reais da campanha,
// em sequência, sem WebGL. Detecta limites, colisores, checkpoints,
// objetivos inacessíveis, NPCs e itens presos nas paredes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
class Vec {
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(p){return this.set(p.x,p.y,p.z)}
 clone(){return new Vec(this.x,this.y,this.z)}
 distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z)}
 sub(p){this.x-=p.x;this.y-=p.y;this.z-=p.z;return this}
 add(p){this.x+=p.x;this.y+=p.y;this.z+=p.z;return this}
 length(){return Math.hypot(this.x,this.y,this.z)}
 normalize(){const l=this.length()||1;this.x/=l;this.y/=l;this.z/=l;return this}
}
class Obj{
 constructor(){
  this.position=new Vec();this.rotation={x:0,y:0,z:0};
  this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;return this},
    setScalar(n){this.x=this.y=this.z=n}};
  this.children=[];this.visible=true;this.userData={};this.parent=null;
  this.shadow={mapSize:{set(){}},camera:{}};this.intensity=1;
 }
 add(...children){
  for(const child of children){if(!child)continue;this.children.push(child);child.parent=this}
 }
 remove(child){
  this.children=this.children.filter(c=>c!==child);
  if(child?.parent===this)child.parent=null;
 }
 traverse(fn){fn(this);this.children.forEach(child=>child.traverse?.(fn))}
}
class Geometry{
 constructor(...args){this.args=args;this.attributes={}}
 rotateZ(){return this}
 setAttribute(name,attribute){this.attributes[name]=attribute;return this}
 getAttribute(name){return this.attributes[name]}
 dispose(){}
}
class Attr {
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false}
}
class Mat {
 constructor(data={}){
  this.data=data;
  this.color={setHex(n){this.hex=n}};
  this.opacity=data.opacity??1;this.map=data.map;
 }
 clone(){return new Mat(this.data)}
 dispose(){}
}
class Mesh extends Obj{
 constructor(geom,material){super();this.geometry=geom;this.material=material}
 clone(){
  const m=new Mesh(this.geometry,this.material);
  m.position.copy(this.position);return m;
 }
}
class Light extends Obj{constructor(){super();this.target=new Obj();this.isDirectionalLight=false}}
class DirectionalLight extends Light{constructor(){super();this.isDirectionalLight=true}}
class Color {
 constructor(value){
  const n=typeof value==='number'?value:parseInt(value.slice(1),16);
  this.value=n;this.r=(n>>16&255)/255;this.g=(n>>8&255)/255;this.b=(n&255)/255;
 }
}
class Texture{
 constructor(){this.repeat={set(){}};this.offset={};this.needsUpdate=false}
 dispose(){}
}
const doc={
 createElement(tag){
  assert.equal(tag,'canvas');
  return {width:0,height:0,getContext(){return {
   createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)}},
   putImageData(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},
   stroke(){},fillRect(){},clearRect(){},fillText(){}
  }}};
 },
 getElementById(){return {textContent:'',classList:{add(){},remove(){}},dataset:{}}},
 querySelector(){return null}
};
const localData=new Map();
const storage={getItem:k=>localData.get(k)||null,setItem:(k,v)=>localData.set(k,v)};
const THREE=require('../vendor/three.min.js');

class FakeGame{
 constructor(){
  this.currentMissionId='dam';this.difficulty='00_AGENT';
  this.levelBuilder=null;this.objectives=[];this.appState='MENU';
  this.scene=null;this.audio={playGadgetBeep(){}};
 }
 startMission(){}
 selectMission(m){this.currentMissionId=m}
 update(){}
 interact(){}
 fireWeapon(){}
 completeMissionSuccess(){}
 startOutroCutscene(){}
}
class FakeGuard{}
const ctx=vm.createContext({
 THREE,document:doc,window:{THREE,addEventListener(){}},
 localStorage:storage,GoldenEyeDamGame:FakeGame,GuardAgent:FakeGuard,
 performance:{now(){return 0}},console,
 hasLineOfSight(){return true}
});
vm.runInContext(read('src/missions.js')+
 '\nthis.MISSIONS_DATA=MISSIONS_DATA;',ctx,{filename:'src/missions.js'});
vm.runInContext(read('src/world.js')+
 '\nthis.DamLevelBuilder=DamLevelBuilder;this.ProceduralTextures=ProceduralTextures;',
 ctx,{filename:'src/world.js'});
const phases=[
 ['surface-v1-4.js','surface1'],['bunker-v1-5.js','bunker1'],
 ['silo-v1-6.js','silo'],['frigate-v1-7.js','frigate'],
 ['surface2-v1-8.js','surface2'],['bunker2-v1-9.js','bunker2'],
 ['statue-v2-0.js','statue']
];
for(const [file]of phases)
 vm.runInContext(read('src/'+file),ctx,{filename:'src/'+file});
vm.runInContext(read('src/global-audit-v2-0-5.js'),ctx,
 {filename:'src/global-audit-v2-0-5.js'});

vm.runInContext(read('src/scenery-v2-1.js'),ctx,{filename:'src/scenery-v2-1.js'});
let expectedReleases=0,releases=0;
const scene=new THREE.Scene();
const world=new ctx.DamLevelBuilder(scene);
const ids=['dam','facility','runway','surface1','bunker1','silo',
 'frigate','surface2','bunker2','statue'];
assert.equal(ids.length,10);
const result=[];
function checkScenery(world,id){
 const report=world.sceneryReport;
 assert.equal(report.mission,id);
 assert.ok(report.instances>0,id+' sem detalhes');
 assert.ok(report.instances<=300,id+' excedeu orcamento');
 assert.ok(report.batches<=3);
 if(id.startsWith('surface'))assert.equal(report.roofs,4,'quatro telhados com neve');
 if(id==='statue')assert.ok(report.plinths>0);
 const group=world.levelGroup.children.find(o=>o.name==='scenery-v2.1-'+id);
 assert.ok(group);
 const resources=new Set();
 group.traverse(o=>{
  if(o.isInstancedMesh)resources.add(o);
  if(o.geometry)resources.add(o.geometry);
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const m of mats)if(m){resources.add(m);if(m.map)resources.add(m.map)}
 });
 for(const r of resources){expectedReleases++;r.addEventListener('dispose',()=>releases++)}
 group.traverse(o=>{
  if(!o.isInstancedMesh)return;
  const matrix=new THREE.Matrix4();
  for(let n=0;n<o.count;n++){
   o.getMatrixAt(n,matrix);
   assert.ok(matrix.elements.every(Number.isFinite));
   assert.ok(matrix.determinant()>0);
  }
 });
 console.log('CENARIO',JSON.stringify(report));
}
function flood(level,openedGates){
 const b=level.bounds,step=1;
 // Dam tem dois acessos externos especiais: a ilha do píer (X=-17.6)
 // e a passarela de bungee (X=-15.95). Simular o override do jogador.
 const minX=b.isDam?-18:b.minX;
 const nx=Math.floor((b.maxX-minX)/step)+1;
 const nz=Math.floor((b.maxZ-b.minZ)/step)+1;
 const visited=new Uint8Array(nx*nz),queue=[];
 const ignored=new Set(openedGates.map(g=>g.collider));
 function push(ix,iz){
  if(ix<0||ix>=nx||iz<0||iz>=nz)return;
  const idx=iz*nx+ix;
  if(visited[idx])return;
  const x=minX+ix*step,z=b.minZ+iz*step;
  if(b.isDam){
   const pier=z>=-47.8&&z<=-40.2;
   const jump=z>=-121.6&&z<=-114.5;
   const minAllowed=pier?-17.6:jump?-15.95:b.minX;
   if(x<minAllowed-.01)return;
  }
  if(level.colliders.some(c=>
   !ignored.has(c)&&
   (c.maxY??5)>.40&&(c.minY??0)<1.8 &&
   c.minX<c.maxX && c.minZ<c.maxZ &&
   x+.47>c.minX&&x-.47<c.maxX&&
   z+.47>c.minZ&&z-.47<c.maxZ))return;
  visited[idx]=1;queue.push([ix,iz]);
 }
 const spawn=ctx.MISSIONS_DATA[level.currentId].spawn;
 push(Math.round((spawn.x-minX)/step),
  Math.round((spawn.z-b.minZ)/step));
 for(let i=0;i<queue.length;i++){
  const [ix,iz]=queue[i];
  push(ix+1,iz);push(ix-1,iz);push(ix,iz+1);push(ix,iz-1);
 }
 return {size:queue.length,reaches(p,r=2.8){
  return queue.some(([x,z])=>Math.hypot(
   minX+x*step-p.x,b.minZ+z*step-p.z)<r);
 }};
}
for(const id of ids){
 world.currentId=id;
 world.build(id);checkScenery(world,id);
 assert.ok(world.levelGroup.children.length>10,
  id+': cenário vazio');
 assert.ok(world.bounds && world.colliders.length,
  id+': nenhum collider de cenário');
 assert.ok(world.auditReport && !world.auditReport.length,
  id+': auditoria reportou '+JSON.stringify(world.auditReport));
 assert.ok(ctx.MISSIONS_DATA[id],
  id+': missão sem dados de dificuldades');
 const b=world.bounds,sp=ctx.MISSIONS_DATA[id].spawn;
 assert.ok(sp.x>=b.minX&&sp.x<=b.maxX&&sp.z>=b.minZ&&sp.z<=b.maxZ,
  id+': player nasce fora do mapa');
 for(const c of world.colliders){
  assert.ok([c.minX,c.maxX,c.minZ,c.maxZ,c.minY,c.maxY]
   .every(Number.isFinite),id+': coordenadas de collider inválidas');
  assert.ok(c.minX<=c.maxX || c.minX===9999,
   id+': collider horizontal invertido');
 }
 const opened=flood(world,world.gates);
 assert.ok(opened.size>250,id+': spawn bloqueado ou fase pouco navegável');
 const closed=flood(world,[]);
 if(world.gates.length){
  assert.ok(closed.size<opened.size*.92,
   id+': portões não bloqueiam área significativa do mapa ('+
   closed.size+' de '+opened.size+' células)');
 }
 const missingItems=[];
 for(const item of world.interactables){
  if(item.radius<=0)continue; // objetivos que são revelados depois
  if(!opened.reaches(item.position,Math.max(2.7,item.radius)))
   missingItems.push('interação '+item.id);
 }
 for(const pickup of world.pickups)
  if(!opened.reaches(pickup.position,2.3))
   missingItems.push('pickup '+pickup.type);
 for(const spawn of world.guardSpawns){
  if(!opened.reaches(spawn.pos,2.3))
   missingItems.push('guarda '+spawn.pos.x+','+spawn.pos.z);
 }
 for(const npc of world.npcs){
  if(!opened.reaches(npc.position,3.0))
   missingItems.push('NPC '+npc.id);
 }
 assert.deepEqual(missingItems,[],
  id+': entidades inacessíveis com portões abertos');
 const baseline=world.levelGroup.children.length;
 result.push({id,colliders:world.colliders.length,objects:baseline,
  guards:world.guardSpawns.length,npcs:world.npcs.length,
  gates:world.gates.length,closedCells:closed.size,accessibleCells:opened.size});
}
world.clear();assert.equal(releases,expectedReleases,'liberar todos os recursos novos exatamente uma vez');
assert.equal(result.length,10);
console.log('AUDITORIA DE 10 MAPAS:');
for(const item of result)console.log(
 item.id+': '+item.objects+' objetos, '+item.colliders+' colisores, '+
 item.guards+' guardas, '+item.gates+' portões, '+
 item.closedCells+'/'+item.accessibleCells+' células fechadas/abertas');
console.log('OK 10 fases: builds, limites, colisão válida, objetivos, NPCs, guardas e pickups acessíveis.');
