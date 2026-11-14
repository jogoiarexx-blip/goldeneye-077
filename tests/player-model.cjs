'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
// Keep the bundled loader and Three.js revision identical to the game.
const THREE=require(process.env.THREE_TEST_FILE || path.join(root,'vendor/three.min.js'));
const context=vm.createContext({THREE,console,TextDecoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,URL,Blob,window:{},self:globalThis});
vm.runInContext(fs.readFileSync(path.join(root,'vendor/GLTFLoader.js'),'utf8'),context);
// No GPU in Node: substitute image decoding only; parse real geometry, skin and animation.
THREE.TextureLoader.prototype.load=function(url,done){const t=new THREE.Texture();setTimeout(()=>done(t),0);return t};
class Game{constructor(){this.scene=new THREE.Scene();this.renderer={};this.player={pos:new THREE.Vector3(0,1.65,0),yaw:0,crouched:false,inTank:false};this.camera=new THREE.PerspectiveCamera();this.appState='PLAYING';this.currentMissionId='dam'}startMission(){}update(){}}
context.GoldenEyeDamGame=Game;
const source=fs.readFileSync(path.join(root,'src/player-model.js'),'utf8');
vm.runInContext(source,context);
const bytes=fs.readFileSync(path.join(root,'assets/models/007.glb'));
new THREE.GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',gltf=>{
 try{
 const g=new Game();g.installPlayerAvatar(gltf);const a=g.playerAvatar;
 assert.ok(a.ready);let skins=0;a.model.traverse(o=>{if(o.isSkinnedMesh){skins++;assert.equal(o.skeleton.bones.length,32)}});assert.equal(skins,1);
 assert.deepEqual(Array.from(a.clips,c=>c.name),['Running','Walking']);assert.ok(a.height>1.6&&a.height<2.1);
 g.update(.016);assert.ok(a.root.visible);assert.ok(a.materials.every(m=>m.clippingPlanes.length===1));
 g.player.pos.z=-.05;g.update(.016);assert.ok(a.mixer.time>0);
 g.appState='PAUSED';const time=a.mixer.time;g.update(.2);assert.equal(a.mixer.time,time);
 g.appState='CUTSCENE_OUTRO';g.damStunt={group:new THREE.Group()};for(let i=0;i<9;i++)g.damStunt.group.add(new THREE.Group());
 g.damStunt.group.position.set(-14,-3,-118);g.update(.016);assert.ok(a.root.visible);assert.equal(a.root.position.y,-3);assert.ok(a.materials.every(m=>m.clippingPlanes.length===0));assert.ok(g.damStunt.group.children.slice(0,6).every(o=>!o.visible));assert.ok(g.damStunt.group.children[6].visible);
 g.appState='RESULTS';g.update(.016);assert.equal(a.root.visible,false);
 g.appState='PLAYING';g.currentMissionId='facility';g.startMission();g.update(.016);assert.ok(a.root.visible);assert.equal(a.root.parent,g.scene);
 console.log('OK player GLB: real loader, 32-bone skin, two clips, body, pause, bungee, restart and Facility.');
 }catch(e){console.error(e);process.exitCode=1}
},e=>{console.error(e);process.exitCode=1});
