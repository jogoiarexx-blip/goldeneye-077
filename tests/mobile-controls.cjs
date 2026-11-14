#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),css=read('src/mobile-controls-v2-4.css');
const code=read('src/mobile-controls-v2-4.js');
new vm.Script(code,{filename:'src/mobile-controls-v2-4.js'});
for(const id of ['mobile-fps-controls','mobile-look-zone','mobile-joystick',
  'mobile-stick-knob','mobile-fire','mobile-aim','mobile-use','mobile-reload',
  'mobile-weapon','mobile-mine','mobile-detonate','btn-mobile-crouch']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
    id+' deve existir exatamente uma vez');
}
assert.ok(html.includes('href="src/mobile-controls-v2-4.css"'));
assert.ok(html.includes('src="src/mobile-controls-v2-4.js" defer'));
assert.ok(html.indexOf('src/mobile-controls-v2-4.js')>html.indexOf('src/menu-ui-v2-3.js'));
for(const tag of ['@media(pointer:coarse)','@media(pointer:coarse) and (max-height:460px)',
  'safe-area-inset-bottom','touch-action:none','mobile-fire'])assert.ok(css.includes(tag));

class Element{
  constructor(id){this.id=id;this.events={};this.attrs={};this.style={};
    this.classList={add(){},remove(){}};}
  addEventListener(type,callback){(this.events[type]??=[]).push(callback)}
  setAttribute(name,value){this.attrs[name]=value}
  setPointerCapture(){}
  getBoundingClientRect(){return{left:0,top:0,width:120,height:120}}
  dispatch(type,attrs={}){
    const e={pointerId:1,pointerType:'touch',clientX:60,clientY:60,
      preventDefault(){},stopPropagation(){},...attrs};
    for(const cb of this.events[type]||[])cb(e);
  }
}
const nodes={};
const get=id=>(nodes[id]??=new Element(id));
const doc={documentElement:{classList:{add(){}}},hidden:false,
  getElementById:get,events:{},addEventListener(type,fn){this.events[type]=fn}};
const win={events:{},matchMedia:()=>({matches:true}),addEventListener(type,fn){this.events[type]=fn}};
class FakeGame {
  constructor(){
    this.appState='PLAYING';
    this.player={yaw:0,pitch:0,mouseSensitivity:1,zoomed:false,fireTimer:0,
      weapons:[{unlocked:true},{unlocked:true},{unlocked:false}],weaponIdx:0};
    this.gamepadMovement={forward:0,right:0};
    this.gamepadAiming=false;this.mouseAiming=false;this.shots=0;this.used=0;
  }
  bindUIEvents(){}
  update(dt){this.lastFrameMovement={...this.gamepadMovement};this.lastZoom=this.player.zoomed;return dt}
  requestPointerLockSafe(){this.pointerLockCalls=(this.pointerLockCalls||0)+1}
  setScreen(screen){this.screen=screen}
  fireWeapon(){this.shots++;this.player.fireTimer=0.15}
  interact(){this.used++}
  reloadWeapon(){this.reloaded=true}
  switchWeapon(i){this.player.weaponIdx=i}
  plantRemoteMine(){this.planted=true}
  detonateRemoteMines(){this.detonated=true}
}
const context={GoldenEyeDamGame:FakeGame,document:doc,window:win,
  navigator:{maxTouchPoints:5},Math,console};
vm.runInNewContext(code,context);
const game=new FakeGame();game.bindUIEvents();
assert.equal(game.mi6Touch.enabled,true);
const stick=get('mobile-joystick');
stick.dispatch('pointerdown');
stick.dispatch('pointermove',{clientY:18});
assert.ok(game.mi6Touch.forward>0.9);
game.update(.016);
assert.ok(game.lastFrameMovement.forward>0.9);
assert.equal(game.gamepadMovement.forward,0,'A entrada física deve ser restaurada');
stick.dispatch('pointerup');
assert.equal(game.mi6Touch.forward,0,'Soltar joystick deve parar');
const look=get('mobile-look-zone');
look.dispatch('pointerdown',{clientX:130,clientY:90,pointerId:2});
look.dispatch('pointermove',{clientX:170,clientY:110,pointerId:2});
assert.ok(game.player.yaw<0&&game.player.pitch<0,'Deslizar deve mirar');
look.dispatch('pointerup',{pointerId:2});
get('mobile-aim').dispatch('click');
game.update(.016);assert.equal(game.lastZoom,true);
get('mobile-fire').dispatch('pointerdown',{pointerId:3});
assert.equal(game.shots,1);
game.player.fireTimer=0;game.update(.016);
assert.equal(game.shots,2,'Segurar dispara mais de uma vez');
get('mobile-fire').dispatch('pointercancel',{pointerId:3});
game.player.fireTimer=0;game.update(.016);
assert.equal(game.shots,2,'Cancelar toque interrompe tiro');
get('mobile-use').dispatch('click');assert.equal(game.used,1);
get('mobile-weapon').dispatch('click');assert.equal(game.player.weaponIdx,1);
get('mobile-weapon').dispatch('click');assert.equal(game.player.weaponIdx,0,
  'Não selecionar sniper bloqueada');
get('mobile-reload').dispatch('click');assert.equal(game.reloaded,true);
get('mobile-mine').dispatch('click');assert.equal(game.planted,true);
get('mobile-detonate').dispatch('click');assert.equal(game.detonated,true);
game.requestPointerLockSafe();assert.equal(game.pointerLockCalls,undefined,
  'Não exigir mouse travado no celular');
stick.dispatch('pointerdown');stick.dispatch('pointermove',{clientY:5});
game.setScreen('screen-qwatch');game.appState='PAUSED';
assert.equal(game.mi6Touch.forward,0);
assert.equal(game.mi6Touch.aim,false);
game.update(.016);assert.equal(game.lastFrameMovement.forward,0);
console.log('OK controles touch: movimento, mira, tiro contínuo, ações, pausa e pointer lock.');
