#!/usr/bin/env node
'use strict';
// Auditoria do mapa real Facility. Simula collider AABB + raio do player,
// sem renderer nem texturas externas; roda em node tests/check.cjs.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const worldSource=fs.readFileSync(path.join(root,'src/world.js'),'utf8');
const guideSource=fs.readFileSync(path.join(root,'src/mission-enhancements.js'),'utf8');
class Vec {
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(p){return this.set(p.x,p.y,p.z)}
 clone(){return new Vec(this.x,this.y,this.z)}
 distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z)}
}
class Obj {
 constructor(){
  this.position=new Vec();this.rotation={x:0,y:0,z:0};
  this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;return this}};
  this.visible=true;this.children=[];this.userData={};
  this.shadow={mapSize:{set(){}},camera:{}};
 }
 add(...items){this.children.push(...items)}
 remove(item){this.children=this.children.filter(x=>x!==item)}
 traverse(fn){fn(this);this.children.forEach(c=>c.traverse?.(fn))}
}
class Geometry {
 constructor(...dims){this.dims=dims}
 rotateZ(){return this}
}
class Mesh extends Obj{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material}
}
class Material{
 constructor(data={}){
  this.data=data;
  this.color={hex:data.color,setHex(v){this.hex=v}};
 }
 clone(){return new Material(this.data)}
}
class Color{
 constructor(value){
  const n=typeof value==='number'?value:parseInt(value.replace('#',''),16);
  this.r=(n>>16&255)/255;this.g=(n>>8&255)/255;this.b=(n&255)/255;
 }
}
class Texture{
 constructor(){this.repeat={set(){}},this.offset={x:0,y:0}}
}
const THREE={
 Vector3:Vec,Group:Obj,Mesh,
 Sprite:class extends Obj{constructor(mat){super();this.material=mat}},
 BoxGeometry:Geometry,CylinderGeometry:Geometry,SphereGeometry:Geometry,
 ConeGeometry:Geometry,PlaneGeometry:Geometry,TorusGeometry:Geometry,
 RingGeometry:Geometry,OctahedronGeometry:Geometry,
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 SpriteMaterial:Material,PointsMaterial:Material,CanvasTexture:Texture,
 BufferGeometry:Geometry,BufferAttribute:class{},Points:Mesh,
 HemisphereLight:Obj,PointLight:Obj,DirectionalLight:Obj,
 Color,DoubleSide:2,RepeatWrapping:1,
 MathUtils:{lerp:(a,b,t)=>a+(b-a)*t}
};
const document={
 createElement(kind){
  assert.equal(kind,'canvas');
  return {width:0,height:0,getContext(){
   return {
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},
    putImageData(){},strokeRect(){},beginPath(){},
    moveTo(){},lineTo(){},stroke(){},fillRect(){},
    clearRect(){},fillText(){}
   };
  }};
 }
};
const sandbox={THREE,document,console,Math};
vm.runInNewContext(worldSource+
 '\nthis.DamLevelBuilder=DamLevelBuilder;',sandbox,{filename:'src/world.js'});
const Builder=sandbox.DamLevelBuilder;
const world=new Builder({add(){},remove(){}});
world.build('facility');
assert.equal(world.gates.length,2,'Dois portões reais');
const gate1=world.gates.find(x=>x.id==='fac_gate_1');
const gate2=world.gates.find(x=>x.id==='fac_gate_2');
assert.ok(gate1&&gate2,'Os dois portões permanecem');
assert.equal(world.tanks.length,5,'Cinco tanques químicos');
assert.ok(world.npcs.some(n=>n.id==='dr_doak'),'Dr. Doak presente');
assert.ok(world.npcs.some(n=>n.id==='agent_006'),'Trevelyan presente');
for(const id of [
 'open_fac_gate_1','contact_doak','open_fac_gate_2','meet_006','facility_exit'
]){
 assert.ok(world.interactables.some(i=>i.id===id),'Objetivo desapareceu '+id);
}
// Busca em grade com o mesmo raio aproximado do FPS. Volumes acima da
// cabeça (teto/luminárias) não fecham corredores; pilares bloqueiam.
const bounds=world.bounds,step=.5;
const nx=Math.floor((bounds.maxX-bounds.minX)/step)+1;
const nz=Math.floor((bounds.maxZ-bounds.minZ)/step)+1;
function flood(openGates=[]){
 const ignored=new Set(openGates.map(g=>g.collider));
 const seen=new Uint8Array(nx*nz),queue=[],radius=.48;
 function push(ix,iz){
  if(ix<0||iz<0||ix>=nx||iz>=nz)return;
  const key=iz*nx+ix;if(seen[key])return;
  const x=bounds.minX+ix*step,z=bounds.minZ+iz*step;
  const hit=world.colliders.some(c=>
   !ignored.has(c) && c.minX<=c.maxX &&
   c.maxY>0.4 && c.minY<1.8 &&
   x+radius>c.minX&&x-radius<c.maxX &&
   z+radius>c.minZ&&z-radius<c.maxZ
  );
  if(hit)return;
  seen[key]=1;queue.push([ix,iz]);
 }
 push(Math.round((0-bounds.minX)/step),
  Math.round((36-bounds.minZ)/step));
 for(let k=0;k<queue.length;k++){
  const [ix,iz]=queue[k];
  push(ix+1,iz);push(ix-1,iz);push(ix,iz+1);push(ix,iz-1);
 }
 return {
  count:queue.length,
  can(position,r=2.3){
   return queue.some(([ix,iz])=>
    Math.hypot(bounds.minX+ix*step-position.x,
      bounds.minZ+iz*step-position.z)<r);
  }
 };
}
const closed=flood();
const firstReader=world.interactables.find(i=>i.id==='open_fac_gate_1');
const secondReader=world.interactables.find(i=>i.id==='open_fac_gate_2');
const doak=world.interactables.find(i=>i.id==='contact_doak');
const trevelyan=world.interactables.find(i=>i.id==='meet_006');
const exit=world.interactables.find(i=>i.id==='facility_exit');
assert.ok(closed.count>800,'Spawn da Facility encurralado');
assert.ok(closed.can(firstReader.position,firstReader.radius),'Porta 1 sem leitor alcançável');
assert.ok(!closed.can(doak.position,doak.radius),'Porta 1 pode ser contornada');
const firstOpen=flood([gate1]);
assert.ok(firstOpen.can(doak.position,doak.radius),'Dr. Doak bloqueado com porta 1 aberta');
assert.ok(firstOpen.can(secondReader.position,secondReader.radius),
 'Leitor 2 bloqueado com porta 1 aberta');
assert.ok(!firstOpen.can(trevelyan.position,trevelyan.radius),
 'Porta 2 pode ser contornada sem decodificador');
assert.ok(!firstOpen.can(exit.position,exit.radius),
 'Saída disponível antes de abrir segunda porta');
const bothOpen=flood([gate1,gate2]);
assert.ok(bothOpen.count>10000,'Área da Facility muito pequena após abrir as portas');
for(const item of world.interactables){
 assert.ok(bothOpen.can(item.position,Math.min(item.radius,3)),
  'Interação obstruída: '+item.id);
}
for(const p of world.pickups)
 assert.ok(bothOpen.can(p.position,1.8),
  'Coletável dentro de parede: '+p.type+' em '+p.position.z);
for(const npc of world.npcs)
 assert.ok(bothOpen.can(npc.position,2.2),
  'NPC preso ou dentro de parede: '+npc.id);
for(const spawn of world.guardSpawns) {
 assert.ok(bothOpen.can(spawn.pos,1.5),'Guarda nasce em colisão');
 for(const waypoint of spawn.patrol)
  assert.ok(bothOpen.can(waypoint,1.5),
   'Patrulha aponta para dentro de estrutura');
}
// Verifica ancoragem vertical contra o piso e teto reais.
const boxes=world.levelGroup.children.filter(o=>
 o.geometry instanceof Geometry&&o.geometry.dims.length===3);
const findBox=(cx,cy,cz,dx,dy,dz)=>boxes.some(mesh=>{
 const [w,h,d]=mesh.geometry.dims;
 return Math.abs(mesh.position.x-cx)<.015 &&
  Math.abs(mesh.position.y-cy)<.015 &&
  Math.abs(mesh.position.z-cz)<.015 &&
  Math.abs(w-dx)<.015 && Math.abs(h-dy)<.015 &&
  Math.abs(d-dz)<.015;
});
assert.ok(findBox(0,4.4,-24,36,.5,128),'Teto original ausente');
assert.ok(findBox(-18,2.1,-24,1,4.4,128),'Muro esquerdo sem suporte');
assert.ok(findBox(18,2.1,-24,1,4.4,128),'Muro direito sem suporte');
// Os espelhos eram soltos: painel real em Z=21 e vidro na sua superfície.
assert.ok(findBox(10,1.65,21,7.6,3.3,.32),
 'Espelhos ainda estão flutuando sem parede de apoio');
assert.equal(world.glassPanes.filter(p=>Math.abs(p.position.z-20.79)<.02).length,2,
 'Espelhos não estão ancorados no fundo das pias');
// A janela de controle precisa ter vão real, não parede maciça atrás do vidro.
assert.ok(world.glassPanes.some(p=>Math.abs(p.position.z+33.65)<.02),
 'Janela da sala de controle ausente');
assert.ok(!world.colliders.some(c=>c.minX < -8.5 &&
 c.maxX > -8.5 && c.minZ <= -34 && c.maxZ >= -34 &&
 c.minY<1.8 && c.maxY>2.8),
 'Parede maciça ainda atravessa a janela de observação');
assert.ok(world.colliders.some(c=>c.minX<-8.5&&c.maxX>-8.5 &&
 c.minZ<-34&&c.maxZ>-34 && c.maxY<=1.4+.01),
 'Peitoril da janela de observação removido');
// Cada passarela deve ter 3 pilares que chegam do piso até a laje.
for(const side of [-1,1]){
 for(const z of [-78,-62,-46]){
  assert.ok(findBox(side*16.10,1.35,z,.38,2.70,.38),
   'Passarela flutuando: falta coluna em '+side+','+z);
 }
 assert.ok(findBox(side*15.2,2.8,-62,3.6,.28,36),
  'Passarela industrial lateral removida');
}
// Batentes de cubículos unidos às portas, sem folhas soltas a meio metro.
const hingedDoors=world.levelGroup.children.filter(o=>o.children.some(c=>
 c.geometry instanceof Geometry&&
 c.geometry.dims[0]===1.72&&c.geometry.dims[1]===2.36));
assert.equal(hingedDoors.length,4,'Portas dos quatro banheiros não alinhadas');
for(const door of hingedDoors){
 assert.ok([-11.87,-8.37,-4.87,-1.37].some(x=>
  Math.abs(x-door.position.x)<.015),'Porta sem dobradiça na parede');
}
// A nova auditoria não pode vazar portas/cenários quando trocar de missão.
world.build('runway');
assert.ok(!world.gates.some(g=>g.id.startsWith('fac_gate')),
 'Restaram portões da Facility em outra fase');
world.build('dam');
assert.equal(world.glassPanes.some(p=>Math.abs(p.position.z+33.65)<.02),false,
 'Vidro antigo da Facility permaneceu após trocar de nível');
assert.ok(guideSource.includes("['fac_gate_1','open_fac_gate_1']"),
 'O guia não orienta o jogador a abrir a primeira porta');
assert.ok(guideSource.includes("['fac_gate_2','open_fac_gate_2']"),
 'O guia não orienta o jogador a abrir a segunda porta');
console.log('OK Facility: 2 portões sem desvios, Doak/006/5 tanques, NPCs,');
console.log('itens e patrulhas alcançáveis, teto, portas, espelhos, janela');
console.log('real, 6 pilares de passarela e transição entre fases.');
