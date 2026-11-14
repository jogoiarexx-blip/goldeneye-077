/**
 * GoldenEye 007 Remastered — Frigate v1.7
 * Monte Carlo: infiltração, resgate de reféns, duas bombas e rastreamento.
 * Módulo incremental carregado após silo-v1-6.js.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof DamLevelBuilder === 'undefined' ||
      typeof GoldenEyeDamGame === 'undefined' || typeof MISSIONS_DATA === 'undefined') return;
  const ID = 'frigate', SAVE = 'ge007_frigate_unlocked';
  let sessionUnlock = false;
  const obj = {
    rescue: { id:'frigate_rescue_hostages', title:'Libertar os reféns da fragata', type:'hostages' },
    bridge: { id:'frigate_disarm_bridge', title:'Desarmar bomba na ponte de comando', type:'bomb' },
    engine: { id:'frigate_disarm_engine', title:'Desarmar bomba na sala de máquinas', type:'bomb' },
    tracker: { id:'frigate_heli_tracker', title:'Instalar rastreador no helicóptero alvo', type:'gadget' },
    exit: { id:'frigate_exit', title:'Evacuar pela passagem de serviço', type:'exit' }
  };
  const missions = (...ids) => ids.map(i => ({...obj[i]}));
  MISSIONS_DATA[ID] = {
    id: ID, title:'FRIGATE — OPERAÇÃO MONTE CARLO',
    subtitle:'Missão 07 — Monte Carlo: Fragata no Porto',
    introTag:'FRIGATE_INTRO // PORTO DE MONTE CARLO',
    introSub:'"007. A fragata foi tomada por um grupo armado. Entre sem colocar os reféns em risco."',
    outroTag:'FRIGATE_ESCAPE // MISSÃO DE RESGATE',
    outroSub:'"Reféns seguros. Dispositivos neutralizados e helicóptero rastreado."',
    briefingM:'"A fragata está sob controle de sequestradores. Resgate os reféns, desarme os explosivos e identifique o helicóptero que será usado na fuga. Proteja os civis."',
    briefingQ:'"Aproxime-se dos reféns e pressione E para soltá-los. A desativação de cada bomba demora três segundos. Instale o rastreador somente junto ao helicóptero marcado no convés."',
    spawn:{x:0,y:1.65,z:47,yaw:0},
    difficulties:{
      AGENT:{label:'AGENT',guardHp:67,guardDamage:9,guardReaction:1.0,
        objectives:missions('rescue','tracker','exit'), hostageCount:2},
      SECRET_AGENT:{label:'SECRET AGENT',guardHp:88,guardDamage:13,guardReaction:.70,
        objectives:missions('rescue','bridge','tracker','exit'), hostageCount:3},
      '00_AGENT':{label:'00 AGENT',guardHp:112,guardDamage:18,guardReaction:.48,
        objectives:missions('rescue','bridge','engine','tracker','exit'), hostageCount:4}
    }
  };
  const unlocked = () => {
    if(sessionUnlock)return true;
    try{return localStorage.getItem(SAVE)==='1'}catch(_){return false}
  };
  function paintButton(){
    const b=document.querySelector('[data-mission="frigate"]');
    if(!b)return;
    const locked=!unlocked();
    b.style.opacity=locked?'.62':'1';
    b.setAttribute('aria-disabled',String(locked));
    b.setAttribute('aria-label',locked?'Missão 07 Frigate bloqueada — conclua Silo':'Selecionar missão 07 Frigate');
    const label=b.querySelector('.frigate-status');
    if(label)label.textContent=locked?'BLOQUEADA':'LIBERADA';
  }

  const WORLD=DamLevelBuilder.prototype, oldBuild=WORLD.build, oldEnv=WORLD.updateEnvironment;
  WORLD.buildFrigateLevel = function(){
    const v=(x,y,z)=>new THREE.Vector3(x,y,z);
    const mat=(color,metalness=.2,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
    const deck=mat(0x697988,.28,.75), hull=mat(0x253344,.66,.42);
    const cabin=mat(0xb9c8cd,.2,.69), steel=mat(0x334155,.74,.34);
    const dark=mat(0x101d30,.44,.56), gold=mat(0xeab308,.44,.5);
    const glass=mat(0x0e7490,.42,.3), sea=mat(0x164969,.15,.24);
    const red=new THREE.MeshBasicMaterial({color:0xff4545});
    const green=new THREE.MeshBasicMaterial({color:0x22c55e});
    const blue=new THREE.MeshBasicMaterial({color:0x38bdf8});
    const amber=new THREE.MeshBasicMaterial({color:0xfacc15});
    this.frigateState={
      hostages:[], rescued:0, bombs:[], rotor:null, helipad:null,
      helicopterId:'FRIGATE_MC_HELI_01', trackerAttached:false, exitDoor:null,
      responseTime:0, spray:null
    };
    this.bounds={minX:-22.2,maxX:22.2,minZ:-165,maxZ:52.5,isDam:false};

    // Mar e casco. Mantém o deck inteiro na mesma altura navegável da engine.
    this.addBox(0,-1.75,-57,280,.35,360,sea,false,false);
    this.addBox(0,-.88,-58,46,1.55,226,hull,false,false);
    this.addBox(0,-.09,-57,44,.24,222,deck,false,false);
    // Lateral e corrimões são físicos; costas do navio também.
    for(const x of [-22.0,22.0]){
      this.addBox(x,.79,-57,.5,1.6,220,steel,true);
      for(let z=47;z>=-163;z-=9){
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,1.5,6),steel);
        pole.position.set(x,.87,z);
        this.levelGroup.add(pole);
      }
    }
    this.addBox(0,.8,54,44,1.6,.6,steel,true);
    this.addBox(0,.8,-168,44,1.6,.6,steel,true);

    // Docas e silhueta de Monte Carlo fora do perímetro navegável.
    this.addBox(-49,-.3,15,42,2,91,deck,false,false);
    for(const [x,z,h] of [[-57,31,21],[-43,8,14],[-59,-16,29],[-39,-40,17]]){
      const block=new THREE.Mesh(new THREE.BoxGeometry(9,h,11),cabin);
      block.position.set(x,h/2,z);
      this.levelGroup.add(block);
    }

    // Três anteparas com portões centrais de sete metros.
    for(const [i,z] of [9,-49,-107].entries()){
      this.addBox(-14.5,2.2,z,16,4.4,.55,cabin,true);
      this.addBox(14.5,2.2,z,16,4.4,.55,cabin,true);
      const gateId='frigate_gate_'+(i+1);
      this.addSecurityGate(gateId,0,z,7,steel,gold);
      const keypad=new THREE.Mesh(new THREE.BoxGeometry(.4,.53,.2),blue.clone());
      keypad.position.set(5.0,1.4,z+3.4);
      this.levelGroup.add(keypad);
      this.interactables.push({
        id:'frigate_switch_'+(i+1),type:'gate_switch',
        gateId,position:v(5,1.4,z+3.4),radius:2.6,
        completed:false,visualMesh:keypad,
        prompt:'Pressione [E] para abrir a porta do setor '+(i+1)
      });
    }

    // Cabines e salas laterais; acesso pela face voltada para o corredor central.
    const room=(x,z,w,d)=>{
      const innerX=x>0?x-w/2:x+w/2;
      const outerX=x>0?x+w/2:x-w/2;
      this.addBox(outerX,2.1,z,.45,4.2,d,cabin,true);
      this.addBox(x,2.1,z-d/2,w,4.2,.45,cabin,true);
      this.addBox(x,2.1,z+d/2,w,4.2,.45,cabin,true);
      // A parede interna possui passagem central; a cabine pode ser explorada.
      this.addBox(innerX,2.1,z-d*.36,.45,4.2,d*.28,cabin,true);
      this.addBox(innerX,2.1,z+d*.36,.45,4.2,d*.28,cabin,true);
      const ceil=new THREE.Mesh(new THREE.BoxGeometry(w,.15,d),dark);
      ceil.position.set(x,4.35,z);
      this.levelGroup.add(ceil);
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(1.8,.09,.4),
        new THREE.MeshBasicMaterial({color:0xdbeafe}));
      lamp.position.set(x,4.25,z);
      this.levelGroup.add(lamp);
      return {x,z};
    };
    room(-14.8,28,12,13); // Refém 1, alojamento
    room(14.8,-20,12,14); // Refém 2, ponte
    room(-14.8,-79,12,15); // Refém 3, máquinas
    room(14.8,-123,12,15); // Refém 4, compartimento traseiro

    // Caixas de cobertura sem bloquear as passagens dos portões.
    for(const [x,z] of [[-7,43],[8,36],[-8,-2],[8,-41],[-7,-63],[8,-91],[-8,-135]]){
      this.addBox(x,.66,z,2.3,1.32,2.1,steel,true);
      const strip=new THREE.Mesh(new THREE.BoxGeometry(2.4,.12,.18),gold);
      strip.position.set(x,1.36,z+1);
      this.levelGroup.add(strip);
    }

    // Reféns e seus pontos de interação. A engine usa role scientist para
    // acertar civis, sem associar morte do captor à morte do refém.
    const hostages=[
      [-15,28,1], [15,-20,2], [-15,-79,3], [15,-123,4]
    ];
    for(const [x,z,id] of hostages){
      const npcId='frigate_hostage_'+id;
      this.addCharacterNPC(npcId,'scientist',x,z,Math.PI,0xf1e6b7);
      const npc=this.npcs[this.npcs.length-1];
      npc.frigateHostage=true;
      npc.rescued=false;
      npc.panicTimer=0;
      npc.escapeX=x>0?x+1.0:x-1.0;
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.15,8,6),amber.clone());
      marker.position.set(x,2.05,z);
      this.levelGroup.add(marker);
      const item={
        id:npcId,type:'frigate_hostage',position:v(x,1.25,z),radius:2.8,
        completed:false,visualMesh:marker,npc,
        prompt:'Pressione [E] para libertar o refém '+id
      };
      this.frigateState.hostages.push(item);
      this.interactables.push(item);
    }

    // Bombas com identificação individual; cada uma tem estado permanente.
    const bombs=[
      {id:'frigate_disarm_bridge',x:-16,z:-32,sector:'ponte'},
      {id:'frigate_disarm_engine',x:14,z:-85,sector:'máquinas'}
    ];
    for(const b of bombs){
      const box=new THREE.Mesh(new THREE.BoxGeometry(.88,.53,.38),dark);
      box.position.set(b.x,1.08,b.z);
      const led=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),red.clone());
      led.position.set(b.x+.29,1.17,b.z+.25);
      this.levelGroup.add(box,led);
      const item={id:b.id,type:'frigate_bomb',position:v(b.x,1.2,b.z),
        radius:3,visualMesh:led,completed:false,
        prompt:'Pressione [E] para desarmar a bomba na '+b.sector+' (3 s)'};
      this.frigateState.bombs.push(item);
      this.interactables.push(item);
    }

    // Heliporto e um helicóptero-alvo distinguível, sem assets externos pesados.
    const helipad=new THREE.Mesh(new THREE.CircleGeometry(12,32),
      new THREE.MeshStandardMaterial({color:0x31475b,roughness:.83}));
    helipad.rotation.x=-Math.PI/2;
    helipad.position.set(0,.055,-145);
    this.levelGroup.add(helipad);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(10,.3,8,32),
      new THREE.MeshBasicMaterial({color:0xfacc15}));
    ring.rotation.x=Math.PI/2;ring.position.set(0,.085,-145);
    this.levelGroup.add(ring);
    this.frigateState.helipad=helipad;

    const helicopter=new THREE.Group();
    helicopter.position.set(0,0,-145);
    const cabinBody=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.6,5.2,10),dark);
    cabinBody.rotation.x=Math.PI/2;
    cabinBody.position.set(0,2.35,0);
    const cockpit=new THREE.Mesh(new THREE.SphereGeometry(1.22,10,8),glass);
    cockpit.scale.set(1,.68,1.4);
    cockpit.position.set(0,2.5,-2.2);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(.32,.35,6.5),steel);
    tail.position.set(0,2.65,4.4);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.25,2.1,.9),dark);
    fin.position.set(0,3.42,7.2);
    helicopter.add(cabinBody,cockpit,tail,fin);
    const rotor=new THREE.Group();
    rotor.position.set(0,3.65,0);
    rotor.add(new THREE.Mesh(new THREE.BoxGeometry(12,.08,.24),steel),
      new THREE.Mesh(new THREE.BoxGeometry(.24,.08,12),steel));
    helicopter.add(rotor);
    for(const x of [-1.2,1.2]){
      const skid=new THREE.Mesh(new THREE.BoxGeometry(.11,.16,4.5),steel);
      skid.position.set(x,.6,.0);
      helicopter.add(skid);
    }
    const targetStripe=new THREE.Mesh(new THREE.BoxGeometry(.14,.4,1.15),gold);
    targetStripe.position.set(1.48,2.15,-.1);
    helicopter.add(targetStripe);
    this.levelGroup.add(helicopter);
    this.frigateState.helicopter=helicopter;
    this.frigateState.rotor=rotor;
    this.frigateState.trackerMarker=targetStripe;
    // Rastreador aplicado no lado direito do helicóptero.
    this.interactables.push({
      id:'frigate_heli_tracker',type:'frigate_tracker',completed:false,
      helicopterId:this.frigateState.helicopterId,
      position:v(2.5,1.4,-145),radius:3.3,visualMesh:targetStripe,
      prompt:'Pressione [E] para instalar o rastreador no helicóptero identificado'
    });
    // Colisão apenas no centro, deixa acessível a lateral direita.
    this.addBox(0,1.65,-145,2.2,3.3,5.1,steel,true);
    this.addPickup('armor',-12,.85,-97);
    this.addPickup('ammo',10,.55,-54);

    // Saída de serviço no extremo do convés; só libera após cumprir os objetivos.
    const exit=new THREE.Mesh(new THREE.BoxGeometry(5.1,3.2,.35),hull);
    exit.position.set(0,1.65,-160.8);
    this.levelGroup.add(exit);
    this.frigateState.exitDoor=exit;
    this.interactables.push({
      id:'frigate_exit',type:'exit',position:v(0,1.3,-159),
      radius:3.3,completed:false,visualMesh:exit,
      prompt:'Pressione [E] para evacuar pela passagem de serviço'
    });

    // Vigilância e guardas setoriais. Sem morte automática de reféns.
    this.addSecurityCamera(0,3.7,38,Math.PI);
    this.addSecurityCamera(-2,3.7,-30,Math.PI);
    this.addSecurityCamera(1,3.7,-88,Math.PI);
    const patrol=(a,b)=>({pos:v(a[0],0,a[1]),patrol:[v(a[0],0,a[1]),v(b[0],0,b[1])]});
    this.guardSpawns=[
      patrol([-7,38],[-12,32]),
      patrol([-8,23],[-14,28]),
      patrol([9,-12],[13,-21]),
      patrol([-12,-33],[-7,-41]),
      patrol([-8,-66],[-15,-75]),
      patrol([11,-71],[14,-81]),
      patrol([10,-114],[15,-120]),
      patrol([-10,-149],[-7,-153])
    ];
    this.levelGroup.add(new THREE.HemisphereLight(0xd1eaff,0x142b42,.95));
    const sun=new THREE.DirectionalLight(0xf5fbff,.78);
    sun.position.set(-40,65,13);
    this.levelGroup.add(sun);
    for(const z of [37,-23,-75,-130]){
      const l=new THREE.PointLight(0x91d5ff,.76,31);
      l.position.set(0,4.1,z);
      this.levelGroup.add(l);
    }
  };

  WORLD.build=function(mission='dam'){
    if(mission!==ID){this.frigateState=null;return oldBuild.call(this,mission)}
    this.siloState=null;this.bunker1=null;this.surface1=null;
    this.clear();this.buildFrigateLevel();
    this.scene.background=new THREE.Color(0x66869b);
    this.scene.fog=new THREE.FogExp2(0x66869b,.008);
  };
  WORLD.updateEnvironment=function(dt,t){
    oldEnv.call(this,dt,t);
    if(!this.frigateState)return;
    if(this.frigateState.rotor) this.frigateState.rotor.rotation.y+=dt*10;
    for(const host of this.frigateState.hostages){
      const npc=host.npc;
      if(npc.dead)continue;
      if(npc.panicTimer>0){
        npc.panicTimer=Math.max(0,npc.panicTimer-dt);
        npc.mesh.scale.y=THREE.MathUtils.lerp(npc.mesh.scale.y,.79,Math.min(1,dt*6));
      }else{
        npc.mesh.scale.y=THREE.MathUtils.lerp(npc.mesh.scale.y,1,Math.min(1,dt*3));
      }
      if(npc.rescued && !npc.escapeDone){
        const remaining=npc.escapeX-npc.mesh.position.x;
        const step=Math.sign(remaining)*Math.min(Math.abs(remaining),dt*1.4);
        npc.mesh.position.x+=step;
        if(Math.abs(remaining)<.05)npc.escapeDone=true;
        // Guarda o NPC sincronizado à malha para detecção de tiros após o resgate.
        npc.position.x=npc.mesh.position.x;
      }
    }
  };

  const GAME=GoldenEyeDamGame.prototype;
  const originalSelect=GAME.selectMission;
  GAME.selectMission=function(id){
    if(id===ID&&!unlocked()){
      document.getElementById('dossier-mission-subtitle').textContent=
        'Frigate bloqueada — conclua Silo para liberar a missão de resgate.';
      paintButton();return;
    }
    originalSelect.call(this,id);paintButton();
  };
  const originalSuccess=GAME.completeMissionSuccess;
  GAME.completeMissionSuccess=function(){
    const finished=this.currentMissionId;
    originalSuccess.call(this);
    if(finished==='silo'){
      sessionUnlock=true;
      try{localStorage.setItem(SAVE,'1')}catch(_){}
      const next=document.getElementById('btn-results-next');
      next.textContent='Próxima Fase: Frigate';
      next.dataset.nextMission=ID;
      next.classList.remove('hidden');
      document.getElementById('results-subtitle').textContent=
        'Silo concluída! Próxima missão liberada: Frigate, resgate no porto de Monte Carlo.';
      paintButton();
    }else if(finished===ID){
      const next=document.getElementById('btn-results-next');
      next.classList.add('hidden');
      document.getElementById('results-subtitle').textContent=
        'Frigate concluída! Próxima fase planejada: Surface 2 (em desenvolvimento).';
    }
  };
  const originalStart=GAME.startMission;
  GAME.startMission=function(){
    this.frigateDisarm=null;
    const bar=document.getElementById('frigate-bomb-progress');
    if(bar)bar.classList.add('hidden');
    originalStart.call(this);
    if(this.currentMissionId!==ID)return;
    this.levelBuilder.frigateState.rescued=0;
    this.levelBuilder.frigateState.trackerAttached=false;
    this.levelBuilder.frigateState.bombs.forEach(b=>b.completed=false);
  };

  function complete(game,item,message){
    if(item.completed)return false;
    item.completed=true;
    const obj=game.objectives.find(o=>o.id===item.id);
    if(obj)obj.completed=true;
    if(item.visualMesh?.material?.color)item.visualMesh.material.color.setHex(0x22c55e);
    game.audio.playGadgetBeep(true);
    game.notifyHUD(message);game.updateHUD();return true;
  }
  function rescueComplete(game){
    const state=game.levelBuilder.frigateState;
    const needed=MISSIONS_DATA[ID].difficulties[game.difficulty].hostageCount;
    if(state.rescued>=needed){
      const obj=game.objectives.find(o=>o.id==='frigate_rescue_hostages');
      if(obj && !obj.completed){obj.completed=true;game.updateHUD();}
    }
  }
  const originalInteract=GAME.interact;
  GAME.interact=function(){
    if(this.currentMissionId!==ID||this.appState!=='PLAYING')return originalInteract.call(this);
    const entries=this.levelBuilder.interactables;
    entries.sort((a,b)=>this.player.pos.distanceTo(a.position)-this.player.pos.distanceTo(b.position));
    const item=entries.find(i=>(!i.completed||i.type==='exit') &&
      this.player.pos.distanceTo(i.position)<=i.radius);
    if(!item)return;
    const state=this.levelBuilder.frigateState;
    if(item.type==='frigate_hostage'){
      if(item.npc.dead){
        this.failMission('UM REFÉM FOI FERIDO. A OPERAÇÃO DE RESGATE FALHOU.');
        return;
      }
      if(complete(this,item,'REFÉM LIBERTADO — PROCURE OS DEMAIS')){
        item.npc.rescued=true;
        item.npc.panicTimer=1.9;
        state.rescued++;
        rescueComplete(this);
        const required=MISSIONS_DATA[ID].difficulties[this.difficulty].hostageCount;
        this.notifyHUD('REFÉNS RESGATADOS: '+state.rescued+'/'+required);
      }
      return;
    }
    if(item.type==='frigate_bomb'){
      if(this.frigateDisarm){this.notifyHUD('DESARME EM ANDAMENTO — AGUARDE');return;}
      this.frigateDisarm={item,timer:0,duration:3};
      this.audio.playGadgetBeep(true);
      this.notifyHUD('DESARMANDO EXPLOSIVO — PERMANEÇA JUNTO AO DISPOSITIVO');
      return;
    }
    if(item.type==='frigate_tracker'){
      if(item.helicopterId!==state.helicopterId ||
          this.player.pos.distanceTo(item.position)>item.radius){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('ALVO INCORRETO: APROXIME-SE DO HELICÓPTERO IDENTIFICADO');
        return;
      }
      if(complete(this,item,'RASTREADOR INSTALADO NO HELICÓPTERO CORRETO'))
        state.trackerAttached=true;
      return;
    }
    if(item.type==='exit'){
      return this.tryTriggerMissionExit(item.id);
    }
    return originalInteract.call(this);
  };
  const originalFire=GAME.fireWeapon;
  GAME.fireWeapon=function(){
    const result=originalFire.call(this);
    if(this.currentMissionId!==ID||this.appState!=='PLAYING')return result;
    const civilians=this.levelBuilder.frigateState?.hostages || [];
    const injured=civilians.find(x=>x.npc.dead);
    if(injured){
      this.failMission('REFÉM ATINGIDO: A OPERAÇÃO DE RESGATE FOI INTERROMPIDA.');
    }else{
      const hears=civilians.filter(x=>!x.npc.rescued&&!x.npc.dead&&
        x.npc.position.distanceTo(this.player.pos)<15);
      for(const h of hears)h.npc.panicTimer=Math.max(h.npc.panicTimer,2.5);
    }
    return result;
  };
  const originalUpdate=GAME.update;
  GAME.update=function(dt){
    originalUpdate.call(this,dt);
    if(this.currentMissionId!==ID)return;
    if(this.appState==='MENU'){
      const t=performance.now()*.00022;
      this.camera.position.set(18+Math.sin(t)*7,13,-90+Math.cos(t)*12);
      this.camera.lookAt(0,1.8,-140);
    }else if(this.appState==='CUTSCENE_INTRO'){
      const p=Math.min(1,this.cutsceneTimer/4.2);
      this.camera.position.set(-41+41*p,13-11.35*p,60-13*p);
      this.camera.lookAt(0,1.6,11);
    }else if(this.appState==='CUTSCENE_OUTRO'){
      const p=Math.min(1,this.cutsceneTimer/4);
      this.camera.position.set(11+12*p,4+13*p,-148-16*p);
      this.camera.lookAt(0,2.5,-145);
      if(this.levelBuilder.frigateState?.exitDoor)
        this.levelBuilder.frigateState.exitDoor.position.y=1.65+3.4*p;
      return;
    }
    if(this.appState!=='PLAYING'||!this.frigateDisarm)return;
    const task=this.frigateDisarm,el=document.getElementById('frigate-bomb-progress');
    const nearby=this.player.pos.distanceTo(task.item.position)<=task.item.radius+.15;
    if(!nearby){
      this.frigateDisarm=null;
      if(el)el.classList.add('hidden');
      this.notifyHUD('DESARME INTERROMPIDO — VOCÊ SE AFASTOU DA BOMBA');
      return;
    }
    task.timer+=dt;
    if(el){
      el.textContent='DESARMANDO BOMBA: '+Math.min(100,Math.floor(task.timer/task.duration*100))+'%';
      el.classList.remove('hidden');
    }
    if(task.timer>=task.duration){
      this.frigateDisarm=null;
      if(el)el.classList.add('hidden');
      complete(this,task.item,'BOMBA DESARMADA — SETOR SEGURO');
    }
  };
  window.addEventListener('load',paintButton);
})();
