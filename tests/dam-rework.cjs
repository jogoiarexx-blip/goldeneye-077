#!/usr/bin/env node
'use strict';
// Dam v2.0.1 — valida geometria real, alcance do salto e mecânicas de cinemática.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const worldSrc=fs.readFileSync(path.join(root,'src/world.js'),'utf8');
const damSrc=fs.readFileSync(path.join(root,'src/dam-rework-v2-0-1.js'),'utf8');
const gameSrc=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
class V {
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(o){return this.set(o.x,o.y,o.z)}
 clone(){return new V(this.x,this.y,this.z)}
 distanceTo(o){return Math.hypot(this.x-o.x,this.y-o.y,this.z-o.z)}
 sub(o){this.x-=o.x;this.y-=o.y;this.z-=o.z;return this}
}
class Object3D{
 constructor(){
  this.position=new V();this.rotation={x:0,y:0,z:0,order:'XYZ'};
  this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;return this},setScalar(n){this.x=this.y=this.z=n}};
  this.children=[];this.visible=true;this.material=null;this.userData={};
 }
 add(...children){this.children.push(...children)}
 remove(obj){this.children=this.children.filter(x=>x!==obj)}
}
class Geometry{
 constructor(...dimensions){this.parameters={};this.dimensions=dimensions;this.attributes={};}
 rotateZ(){return this}
 setAttribute(key,attr){this.attributes[key]=attr;return this}
 getAttribute(key){return this.attributes[key]}
}
class BufAttr{constructor(array,size){this.array=array;this.itemSize=size;this.needsUpdate=false}}
class Mat {
 constructor(settings={}){
  this.settings=settings;this.opacity=settings.opacity??1;
  this.color={hex:settings.color,setHex(hex){this.hex=hex}};
 }
 clone(){return new Mat(this.settings)}
}
class Mesh extends Object3D{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material}
 clone(){const c=new Mesh(this.geometry,this.material);return c}
}
class Line extends Mesh{}
class Tex{
 constructor(canvas){this.canvas=canvas;this.repeat={set(x,y){this.x=x;this.y=y}};this.offset={};}
}
class Light extends Object3D{
 constructor(){super();this.intensity=1;
  this.shadow={mapSize:{width:0,height:0,set(){}},camera:{}}}
}
class Color {
 constructor(value){
  const v=typeof value==='string'?parseInt(value.replace('#',''),16):value;
  this.r=((v>>16)&255)/255;this.g=((v>>8)&255)/255;this.b=(v&255)/255;
 }
}
const document={
 nodes:new Map(),
 createElement(tag){
  assert.equal(tag,'canvas');
  return {width:0,height:0,getContext(){
   return {fillStyle:'',lineWidth:1,
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},
    putImageData(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},
    stroke(){},fillRect(){}};
  }};
 },
 getElementById(key){
  if(!this.nodes.has(key))this.nodes.set(key,{textContent:'',style:{},
    classList:{add(){},remove(){}},dataset:{}});
  return this.nodes.get(key);
 }
};
const THREE={
 Vector3:V,Group:Object3D,Object3D,Mesh,Line,Points:Mesh,
 BoxGeometry:Geometry,SphereGeometry:Geometry,CylinderGeometry:Geometry,
 ConeGeometry:Geometry,PlaneGeometry:Geometry,RingGeometry:Geometry,
 TorusGeometry:Geometry,
 BufferGeometry:Geometry,BufferAttribute:BufAttr,
 MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,LineBasicMaterial:Mat,
 PointsMaterial:Mat,CanvasTexture:Tex,Color,HemisphereLight:Light,
 DirectionalLight:Light,PointLight:Light,DoubleSide:2,RepeatWrapping:100,
 MathUtils:{lerp:(a,b,t)=>a+(b-a)*t}
};
const ctx={THREE,document,console,window:{addEventListener(){}},
 Math,Float32Array,Uint8ClampedArray,performance:{now(){return 1000}},
 hasLineOfSight(){return true}};
vm.runInNewContext(worldSrc+';this.DamLevelBuilder=DamLevelBuilder;',ctx,{filename:'world.js'});
const World=ctx.DamLevelBuilder;
const scene={add(){},remove(){}};
const level=new World(scene);
level.build('dam');
// Testa a CAUSA ORIGINAL DO BUG: coordenada passada como altura-base.
const towers=level.levelGroup.children.filter(
  x=>x.userData?.structureType==='transmission-tower');
assert.equal(towers.length,3,'Dam deve manter três torres de transmissão');
const groundTowers=towers.filter(x=>x.position.z===-22||x.position.z===-88);
assert.equal(groundTowers.length,2,'Duas torres da represa presentes');
assert.ok(groundTowers.every(x=>x.position.y===0),
  'Torres devem se apoiar no chão; y=18 fazia torres flutuarem');
const roofTower=towers.find(x=>x.position.z===-121);
assert.ok(roofTower&&Math.abs(roofTower.position.y-4.6)<.01,
  'Terceira torre apoiada no teto da sala de máquinas');
assert.ok(towers.every(x=>x.children.length>=15),
  'Faltam sapatas ou travamentos nas torres');
// O relevo deve ser facetado e fora da pista, não cubos enormes.
const badRockBoxes=level.levelGroup.children.filter(x=>
  x.geometry?.dimensions?.length===3&&
  x.geometry.dimensions[0]>=13&&x.geometry.dimensions[1]>=24&&
  x.geometry.dimensions[2]>=48);
assert.equal(badRockBoxes.length,0,
  'Penhascos cúbicos enormes não podem bloquear visual da barragem');
const platform=level.interactables.find(x=>x.id==='bungee');
assert.ok(platform,'Saída da Dam deve existir');
assert.equal(platform.position.x,-13.92);
assert.equal(platform.position.z,-118.1);
assert.equal(platform.radius,1.75);
assert.ok(level.damJumpAnchor&&level.damJumpPoint,'Ancoragem do bungee');
const wall=level.colliders.filter(c=>Math.abs(c.minX+10.025)<.02 &&
 Math.abs(c.maxX+9.575)<.02);
assert.equal(wall.length,2,'Parapeito esquerdo deve ter abertura real');
assert.ok(wall.every(c=>c.maxZ< -121 || c.minZ> -115),
 'Parapeito não pode bloquear acesso em Z=-118.1');
assert.ok(!level.colliders.some(c=>c.minX< -13.3 && c.maxX> -14.1 &&
  c.minZ< -118.1 && c.maxZ> -118.1 &&
  c.maxY>1 && c.minY<1.65),'Ponto de salto deve estar livre');

class Guard {
 constructor(pos){
  this.pos=pos.clone();this.state='PATROL';this.damEnhanced=false;
  this.reactionDelay=1;this.mesh=new Object3D();
  this.torsoGroup=new Object3D();this.weaponArmGroup=new Object3D();
  this.laserSight=new Object3D();this.laserSight.visible=false;
  this.mesh.add(this.torsoGroup,this.weaponArmGroup,this.laserSight);
  this.stats={};
 }
 takeDamage(dmg){
  if(dmg>=100){this.state='DEAD';this.mesh.rotation.x=-Math.PI/2;
   this.mesh.position.y=.25;return true;}
  this.state='ALERTED';return false;
 }
 hearNoise(pos,radius){
  if(this.pos.distanceTo(pos)<radius&&!['DEAD','ALERTED'].includes(this.state))
    this.state='SUSPICIOUS';
 }
}
class Game{
 constructor(){
  this.levelBuilder=level;this.currentMissionId='dam';
  this.appState='PLAYING';this.player={pos:new V(0,1.65,-117)};
  this.audio={playGadgetBeep(){}};this.weaponMeshGroup={visible:true};
  this.camera={position:new V(),lookAt(){}};
  this.cutsceneTimer=0;this.guards=[];
 }
 resolvePlayerCollision(next){
  // Mesma regra de limite do motor, usada para testar o override da Dam.
  const b=this.levelBuilder.bounds;
  next.x=Math.max(b.minX,Math.min(b.maxX,next.x));
  next.z=Math.max(b.minZ,Math.min(b.maxZ,next.z));
  const r=.48;
  for(const c of this.levelBuilder.colliders){
   if(c.minY>1.73||c.maxY<.03)continue;
   if(next.x+r>c.minX&&next.x-r<c.maxX&&
     next.z+r>c.minZ&&next.z-r<c.maxZ){
    const a=[next.x+r-c.minX,c.maxX-next.x+r,next.z+r-c.minZ,c.maxZ-next.z+r];
    const k=a.indexOf(Math.min(...a));
    if(k===0)next.x=c.minX-r;
    if(k===1)next.x=c.maxX+r;
    if(k===2)next.z=c.minZ-r;
    if(k===3)next.z=c.maxZ+r;
   }
  }
 }
 startMission(){
  this.guards=[
   new Guard(new V(0,0,-15)),new Guard(new V(4,0,-15)),
   new Guard(new V(3,0,-100))];
 }
 startOutroCutscene(){this.appState='CUTSCENE_OUTRO';this.cutsceneTimer=0}
 update(dt){
  if(this.appState==='CUTSCENE_OUTRO'){
   this.cutsceneTimer+=dt;
   if(this.cutsceneTimer>=4)this.completeMissionSuccess();
  }
 }
 completeMissionSuccess(){this.appState='RESULTS'}
}
ctx.GuardAgent=Guard;ctx.GoldenEyeDamGame=Game;
vm.runInNewContext(damSrc,ctx,{filename:'dam-rework-v2-0-1.js'});
const g=new Game();
g.startMission();
assert.ok(g.guards.every(guard=>guard.damEnhanced),'Equipamento tático em Dam');
assert.ok(g.guards.every(guard=>guard.torsoGroup.children.length>=4),'Uniformes enriquecidos');
const pos=new V(-13.92,1.65,-118.1);
g.resolvePlayerCollision(pos);
assert.ok(pos.x<-13.4,'Jogador deve alcançar ponto de salto, x='+pos.x);
assert.ok(pos.distanceTo(platform.position)<platform.radius,
 'Salto dentro do raio de interação');
const outside=new V(-13,1.65,-99);
g.resolvePlayerCollision(outside);
assert.ok(outside.x>=-9.1,'Não pode atravessar o parapeto fora da área de salto');

// O jogador inicia a cena com câmera, corda e o corpo de 007.
g.startOutroCutscene();
assert.equal(g.appState,'CUTSCENE_OUTRO');
assert.ok(g.damStunt?.group&&g.damStunt?.rope,'Corda e corpo devem existir');
g.update(.05);
assert.ok(Math.abs(g.damStunt.vertices[0]+13.2)<.002,'Corda presa à plataforma');
const firstY=g.damStunt.group.position.y;
for(let i=0;i<85;i++)g.update(.05);
assert.ok(g.damStunt.group.position.y<firstY-10,
 'A cena deve mostrar queda real e altura significativa');
assert.equal(g.appState,'CUTSCENE_OUTRO','Cinemática dura mais que 4 s');
for(let i=0;i<70&&g.appState==='CUTSCENE_OUTRO';i++)g.update(.05);
assert.equal(g.appState,'RESULTS','Cena deve concluir e liberar próximo nível');
assert.equal(g.damStunt,null,'Efeito temporário deve ser liberado');

g.appState='PLAYING';g.startMission();
const guard=g.guards[0];
assert.ok(guard.takeDamage(130),'Guarda deve morrer');
assert.equal(guard.damDeathAge,0,'Nova animação não deve tombar instantaneamente');
g.update(.25);
assert.ok(guard.mesh.rotation.x<-.1&&guard.mesh.rotation.x> -1.56,
 'Corpo deve tombar progressivamente');
g.update(.4);
assert.ok(Math.abs(guard.mesh.rotation.x+Math.PI/2)<.1,
 'Guarda deve terminar deitado');
const follower=g.guards[1],squad=g.guards[2];
assert.equal(follower.state,'PATROL');
squad.state='ALERTED';squad.pos.set(0,0,-15.2);
g.update(.05);
assert.equal(follower.state,'SUSPICIOUS',
 'Guarda próximo deve ouvir alerta da equipe');
level.build('facility');
assert.equal(level.damJumpAnchor,null,
  'Ancoragem da Dam não deve vazar para Facility');
assert.equal(level.damJumpPoint,null,'Ponto do bungee não pode persistir');
assert.equal(level.interactables.some(x=>x.id==='bungee'),false);
level.build('runway');
const runwayTower=level.levelGroup.children.find(x=>
  x.userData?.structureType==='transmission-tower');
assert.ok(runwayTower&&Math.abs(runwayTower.position.y-5.2)<.01,
  'Torre da Runway deve ficar apoiada no teto a 5.2m');
assert.equal(level.damJumpAnchor,null,'Bungee não pode aparecer na Runway');
console.log('OK Dam v2.0.1: plataforma acessível, parapeito aberto, limite local,');
console.log('câmera de queda/corda, soldados equipados, morte animada e alerta em equipe.');
