/**
 * Missão 06 — SILO / Kirghizstan (v1.6).
 * Plataforma 3D do complexo de lançamento com missão cronometrada.
 * Cronômetro começa APENAS após interação com o terminal de emergência.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof GoldenEyeDamGame === 'undefined' ||
      typeof DamLevelBuilder === 'undefined' || typeof MISSIONS_DATA === 'undefined') return;
  const ID='silo', SAVE='ge007_silo_unlocked';
  let sessionUnlock=false;
  const O={
    fuel1:{id:'plant_silo_fuel_1',title:'Instalar explosivos no combustível do silo A',type:'gadget'},
    fuel2:{id:'plant_silo_fuel_2',title:'Instalar explosivos no combustível do silo B',type:'gadget'},
    photo:{id:'photo_silo_satellite',title:'Fotografar o satélite militar',type:'gadget'},
    telemetry:{id:'silo_telemetry',title:'Extrair dados de telemetria',type:'terminal'},
    circuit:{id:'silo_circuits',title:'Recuperar circuitos de orientação',type:'item'},
    scientists:{id:'protect_silo_scientists',title:'Preservar os cientistas do complexo',type:'civilians'},
    exit:{id:'silo_exit',title:'Escapar pelo elevador de evacuação',type:'exit'}
  };
  const objectives=(...k)=>k.map(i=>({...O[i]}));
  MISSIONS_DATA.silo={
    id:ID,
    title:'SILO — INSTALAÇÃO DE LANÇAMENTO',
    subtitle:'Missão 06 — Kirghizstan: Instalação de Lançamento',
    introTag:'SILO_INTRO // COMPLEXO DE LANÇAMENTO',
    introSub:'"Kirghizstan. Infiltre o complexo de foguetes, recolha provas e sabote o combustível antes da evacuação."',
    outroTag:'SILO_ESCAPE // EVACUAÇÃO EXECUTADA',
    outroSub:'"O elevador está subindo. Explosivos instalados e inteligência recuperada."',
    briefingM:'"A instalação de Kirghizstan abriga foguetes de alto alcance. Instale cargas nos sistemas de combustível, capture a inteligência e chegue ao elevador antes de acabar a janela de evacuação."',
    briefingQ:'"Ative o terminal de emergência no acesso para iniciar a contagem; ela não começa durante carregamento ou cutscene. Use E nos sistemas e enquadre o satélite no centro da mira para fotografá-lo."',
    spawn:{x:0,y:1.65,z:39,yaw:0},
    difficulties:{
      AGENT:{label:'AGENT',guardHp:65,guardDamage:9,guardReaction:0.95,timeLimit:420,
        objectives:objectives('fuel1','fuel2','exit')},
      SECRET_AGENT:{label:'SECRET AGENT',guardHp:88,guardDamage:13,guardReaction:0.68,timeLimit:360,
        objectives:objectives('fuel1','fuel2','photo','telemetry','exit')},
      '00_AGENT':{label:'00 AGENT',guardHp:110,guardDamage:18,guardReaction:0.48,timeLimit:300,
        objectives:objectives('fuel1','fuel2','photo','telemetry','circuit','scientists','exit')}
    }
  };

  function unlocked(){
    if(sessionUnlock)return true;
    try{return localStorage.getItem(SAVE)==='1'}catch(_){return false}
  }
  function paint(){
    const b=document.querySelector('[data-mission="silo"]');
    if(!b)return;
    const locked=!unlocked();
    b.setAttribute('aria-label',locked?'Silo bloqueada: conclua Bunker 1':'Selecionar missão 06 Silo');
    b.setAttribute('aria-disabled',String(locked));
    b.style.opacity=locked?'0.62':'1';
    const text=b.querySelector('.silo-status');
    if(text)text.textContent=locked?'BLOQUEADA':'LIBERADA';
  }
  const WORLD=DamLevelBuilder.prototype, oldBuild=WORLD.build;
  WORLD.buildSiloLevel=function(){
    const v=(x,y,z)=>new THREE.Vector3(x,y,z);
    const mat=(color,metalness=0.14,roughness=0.63)=>
      new THREE.MeshStandardMaterial({color,metalness,roughness});
    const concrete=new THREE.MeshStandardMaterial({
      map:ProceduralTextures.createNoiseTexture('#566473',22,9,14,true),
      roughness:0.84
    });
    const steel=mat(0x253549,0.72,0.34);
    const hazard=mat(0xeab308,0.22,0.56);
    const grey=mat(0x9ba5ae,0.55,0.4);
    const red=new THREE.MeshBasicMaterial({color:0xdc2626});
    const green=new THREE.MeshBasicMaterial({color:0x22c55e});
    const blue=new THREE.MeshBasicMaterial({color:0x38bdf8});
    this.bounds={minX:-23.2,maxX:23.2,minZ:-166.2,maxZ:43.8,isDam:false};
    this.siloState={alarmStarted:false,charges:0,lamps:[],smoke:[],startConsole:null,rocketA:null,rocketB:null,completed:false};
    this.addBox(0,-0.55,-60,47,1.1,215,concrete,false,false);
    // Teto elevado permite visualizar os veículos de lançamento inteiros.
    this.addBox(0,16.4,-60,47,0.5,215,steel,false,false);
    this.addBox(-24,7.9,-60,0.85,17,215,concrete,true);
    this.addBox(24,7.9,-60,0.85,17,215,concrete,true);
    this.addBox(0,7.9,45,47,17,.8,concrete,true);
    this.addBox(0,7.9,-168,47,17,.8,concrete,true);

    // Setores com portões que podem abrir sem quebrar o caminho principal.
    for(const z of [16,-49,-112]){
      this.addBox(-14,2.2,z,20,4.4,.6,concrete,true);
      this.addBox(14,2.2,z,20,4.4,.6,concrete,true);
      const id='silo_gate_'+z;
      this.addSecurityGate(id,0,z,7,steel,hazard);
      const reader=new THREE.Mesh(new THREE.BoxGeometry(.33,.48,.23),blue.clone());
      reader.position.set(5.3,1.4,z+4);
      this.levelGroup.add(reader);
      this.interactables.push({
        id:'switch_'+id,type:'gate_switch',gateId:id,completed:false,
        visualMesh:reader,position:v(5,1.3,z+4),radius:2.8,
        prompt:'Pressione [E] para abrir o portão blindado do Silo'
      });
    }

    // Terminal inicial explícito. Contagem começa APENAS nesta interação.
    const starter=new THREE.Mesh(new THREE.BoxGeometry(1.5,1,.5),red.clone());
    starter.position.set(0,1.45,37);
    this.levelGroup.add(starter);
    this.siloState.startConsole=starter;
    this.interactables.push({
      id:'silo_start',type:'silo_start',completed:false,visualMesh:starter,
      position:v(0,1.45,37),radius:3.2,
      prompt:'Pressione [E] para ativar a missão e iniciar o cronômetro de evacuação'
    });

    // Silos verticais: cilindro principal e suportes, com colisões na base.
    const rocket=(x,z)=>{
      const body=new THREE.Group();
      body.position.set(x,0,z);
      const hull=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.95,11.8,12),grey);
      hull.position.y=7.1;
      const nose=new THREE.Mesh(new THREE.ConeGeometry(1.66,3.2,12),red.clone());
      nose.position.y=14.6;
      const stripe=new THREE.Mesh(new THREE.CylinderGeometry(1.72,1.73,0.5,12),hazard);
      stripe.position.y=4.9;
      body.add(hull,nose,stripe);
      for(const theta of [0,2.1,4.2]){
        const fin=new THREE.Mesh(new THREE.BoxGeometry(.14,3,1.5),steel);
        fin.position.set(Math.sin(theta)*1.7,2.9,Math.cos(theta)*1.7);
        fin.rotation.y=theta;
        body.add(fin);
      }
      this.levelGroup.add(body);
      // Base física pequena, para permitir contornar e abordar as cargas.
      this.addBox(x,1.6,z,4.2,3.2,4.2,steel,true);
      return body;
    };
    this.siloState.rocketA=rocket(-15,-12);
    this.siloState.rocketB=rocket(15,-85);

    // Passarelas de serviço elevadas e corrimãos, apenas decorativos por ora.
    for(const [z,x] of [[-15,-14],[-85,14]]){
      const walk=new THREE.Mesh(new THREE.BoxGeometry(15,.25,2.4),steel);
      walk.position.set(x>0?9:-9,3.6,z+7);
      this.levelGroup.add(walk);
      for(const dz of [-1,1]){
        const rail=new THREE.Mesh(new THREE.BoxGeometry(15,.08,.1),hazard);
        rail.position.set(x>0?9:-9,4.5,z+7+dz*1.15);
        this.levelGroup.add(rail);
      }
    }

    // Duas salas de combustível, com terminais de instalação de explosivos.
    for(const [idx,x,z] of [[1,-9,-11],[2,9,-84]]){
      this.addBox(x,0.82,z+3.3,2.9,1.64,2.1,steel,true);
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(1.15,.54,.35),red.clone());
      lamp.position.set(x,1.72,z);
      this.levelGroup.add(lamp);
      this.interactables.push({
        id:'plant_silo_fuel_'+idx,type:'silo_charge',position:v(x,1.42,z),
        radius:3.4,completed:false,visualMesh:lamp,
        prompt:'Pressione [E] para instalar explosivo no combustível do silo '+(idx===1?'A':'B')
      });
    }

    // Satélite acessível visualmente; fotografia exige direção e linha de visão.
    const satellite=new THREE.Group();
    satellite.position.set(0,5.3,-130);
    const core=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.35,1.3),grey);
    const panelMat=mat(0x075985,.4,.42);
    const wing1=new THREE.Mesh(new THREE.BoxGeometry(6.5,.12,2.2),panelMat);
    const wing2=new THREE.Mesh(new THREE.BoxGeometry(6.5,.12,2.2),panelMat);
    wing1.position.x=-4.4;wing2.position.x=4.4;
    const dish=new THREE.Mesh(new THREE.ConeGeometry(.8,.5,12),hazard);
    dish.rotation.x=Math.PI/2;
    dish.position.z=1.4;
    satellite.add(core,wing1,wing2,dish);
    this.levelGroup.add(satellite);
    this.siloState.satellite=satellite;
    this.interactables.push({
      id:'photo_silo_satellite',type:'silo_photo',position:v(0,5.3,-130),
      radius:11.5,completed:false,prompt:'Pressione [E] para fotografar o satélite com a mira alinhada'
    });

    // Telemetria e circuitos, em dois setores de tecnologia.
    this.addBox(12,0.7,-69,3.4,1.4,2.0,steel,true);
    const telemetry=new THREE.Mesh(new THREE.BoxGeometry(1.0,.75,.32),blue.clone());
    telemetry.position.set(12,1.55,-71);
    this.levelGroup.add(telemetry);
    this.interactables.push({
      id:'silo_telemetry',type:'terminal',position:v(12,1.55,-71),
      radius:3.7,completed:false,visualMesh:telemetry,
      prompt:'Pressione [E] para copiar a telemetria orbital'
    });
    const circuits=new THREE.Mesh(new THREE.BoxGeometry(.82,.24,.58),hazard);
    circuits.position.set(-11.5,1.22,-137);
    this.levelGroup.add(circuits);
    this.interactables.push({
      id:'silo_circuits',type:'item',position:v(-11.5,1.2,-137),
      radius:3.5,completed:false,visualMesh:circuits,
      prompt:'Pressione [E] para recuperar os circuitos de orientação'
    });

    // Civis: o motor original trata o objetivo 'civilians' como obrigatório.
    this.addCharacterNPC('silo_scientist_1','scientist',-14,-64,1.3,0xf8fafc);
    this.addCharacterNPC('silo_scientist_2','scientist',14,-100,-.8,0xf8fafc);
    this.addCharacterNPC('silo_scientist_3','scientist',-12,-148,0.6,0xf8fafc);
    this.addCharacterNPC('silo_ourumov','officer',-14,-103,.5,0x334155);

    // Evacuação: o motor rejeita saída com qualquer objetivo pendente.
    const elevator=new THREE.Mesh(new THREE.BoxGeometry(5.6,4.15,.43),steel);
    elevator.position.set(0,2.1,-161);
    this.levelGroup.add(elevator);
    const exitLamp=new THREE.Mesh(new THREE.BoxGeometry(2.3,.25,.19),green);
    exitLamp.position.set(0,4.32,-160.7);
    this.levelGroup.add(exitLamp);
    this.interactables.push({
      id:'silo_exit',type:'exit',position:v(0,1.15,-158.9),
      radius:3.6,completed:false,visualMesh:elevator,
      prompt:'Pressione [E] para escapar pelo elevador de emergência'
    });

    // Vigilância e marcadores de setores.
    for(const z of [30,-35,-79,-128]){
      this.addSecurityCamera(2.5,3.8,z,Math.PI);
    }
    for(const z of [30,0,-33,-65,-99,-139]){
      const tube=new THREE.Mesh(new THREE.BoxGeometry(5.0,.2,.6),
        new THREE.MeshBasicMaterial({color:0xdbeafe}));
      tube.position.set(0,6.3,z);
      this.levelGroup.add(tube);
      if(z%2===0){
        const light=new THREE.PointLight(0xdbeafe,.85,30);
        light.position.set(0,5.8,z);
        this.levelGroup.add(light);
      }
    }
    for(const z of [12,-20,-55,-85,-120,-151]){
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(.52,.24,.35),red.clone());
      lamp.position.set(-22.6,3.5,z);
      this.levelGroup.add(lamp);
      this.siloState.lamps.push(lamp);
    }
    this.addPickup('ammo',-5,.55,-39);
    this.addPickup('armor',5,.8,-94);
    const patrol=(a,b)=>({pos:v(a[0],0,a[1]),patrol:[v(a[0],0,a[1]),v(b[0],0,b[1])]});
    this.guardSpawns=[
      patrol([-10,26],[8,27]),patrol([13,-3],[8,-10]),
      patrol([-10,-35],[-4,-41]),patrol([8,-57],[14,-64]),
      patrol([-9,-77],[-4,-88]),patrol([10,-102],[8,-111]),
      patrol([-8,-127],[-9,-137]),patrol([7,-145],[8,-151])
    ];
    this.levelGroup.add(new THREE.HemisphereLight(0xe2e8f0,0x0f172a,.82));
  };

  WORLD.build=function(mission='dam'){
    if(mission!==ID){this.siloState=null;return oldBuild.call(this,mission)}
    this.clear();
    this.buildSiloLevel();
    this.scene.background=new THREE.Color(0x303b4a);
    this.scene.fog=new THREE.FogExp2(0x303b4a,.009);
  };
  const oldEnv=WORLD.updateEnvironment;
  WORLD.updateEnvironment=function(dt,t){
    oldEnv.call(this,dt,t);
    if(!this.siloState)return;
    const st=this.siloState;
    const intensity=st.alarmStarted?Math.sin(t*6):0;
    for(const lamp of st.lamps){
      lamp.material.color.setHex(st.alarmStarted&&(intensity>0)?0xff2222:0x7f1d1d);
    }
  };

  const GAME=GoldenEyeDamGame.prototype;
  const oldSelect=GAME.selectMission;
  GAME.selectMission=function(id){
    if(id===ID&&!unlocked()){
      document.getElementById('dossier-mission-subtitle').textContent=
        'Silo bloqueada — conclua Bunker 1 primeiro.';
      paint();
      return;
    }
    oldSelect.call(this,id);
    paint();
  };
  const oldSuccess=GAME.completeMissionSuccess;
  GAME.completeMissionSuccess=function(){
    const finished=this.currentMissionId;
    oldSuccess.call(this);
    if(finished==='bunker1'){
      sessionUnlock=true;
      try{localStorage.setItem(SAVE,'1')}catch(_){}
      const button=document.getElementById('btn-results-next');
      button.textContent='Próxima Fase: Silo';
      button.dataset.nextMission=ID;
      button.classList.remove('hidden');
      document.getElementById('results-subtitle').textContent=
        'Bunker 1 concluída! Próxima missão: Silo, instalação de lançamento em Kirghizstan.';
      paint();
    }else if(finished===ID){
      document.getElementById('btn-results-next').classList.add('hidden');
      document.getElementById('results-subtitle').textContent=
        'Silo concluída! Próxima missão planejada: Frigate (em desenvolvimento).';
    }
  };
  const oldStart=GAME.startMission;
  GAME.startMission=function(){
    this.siloCountdown=null;
    this.siloWarnings=new Set();
    const el=document.getElementById('silo-countdown');
    if(el)el.classList.add('hidden');
    oldStart.call(this);
    if(this.currentMissionId===ID&&this.levelBuilder.siloState){
      this.levelBuilder.siloState.alarmStarted=false;
      this.levelBuilder.siloState.charges=0;
    }
  };
  const oldFail=GAME.failMission;
  GAME.failMission=function(reason){
    const el=document.getElementById('silo-countdown');
    if(el)el.classList.add('hidden');
    return oldFail.call(this,reason);
  };
  const oldOutro=GAME.startOutroCutscene;
  GAME.startOutroCutscene=function(){
    const el=document.getElementById('silo-countdown');
    if(el)el.classList.add('hidden');
    return oldOutro.call(this);
  };
  const oldInteract=GAME.interact;
  function complete(game,item,message){
    if(item.completed)return false;
    item.completed=true;
    const objective=game.objectives.find(x=>x.id===item.id);
    if(objective)objective.completed=true;
    if(item.visualMesh?.material?.color)item.visualMesh.material.color.setHex(0x22c55e);
    game.audio.playGadgetBeep(true);
    game.notifyHUD(message);
    game.updateHUD();
    return true;
  }
  GAME.interact=function(){
    if(this.currentMissionId!==ID||this.appState!=='PLAYING')return oldInteract.call(this);
    const items=this.levelBuilder.interactables;
    items.sort((a,b)=>this.player.pos.distanceTo(a.position)-this.player.pos.distanceTo(b.position));
    const item=items.find(x=>(!x.completed||x.type==='exit')&&
      this.player.pos.distanceTo(x.position)<=x.radius);
    if(!item)return;
    const st=this.levelBuilder.siloState;
    if(item.id==='silo_start'){
      if(st.alarmStarted)return;
      st.alarmStarted=true;
      const config=MISSIONS_DATA.silo.difficulties[this.difficulty];
      this.siloCountdown={remaining:config.timeLimit,total:config.timeLimit};
      complete(this,item,'EVACUAÇÃO ATIVADA — CONCLUA AS TAREFAS E ALCANCE O ELEVADOR');
      return;
    }
    if(!st.alarmStarted){
      this.audio.playGadgetBeep(false);
      this.notifyHUD('ATENÇÃO: ATIVE O TERMINAL DE EMERGÊNCIA NA ENTRADA');
      return;
    }
    if(item.type==='silo_charge'){
      if(complete(this,item,'CARGA EXPLOSIVA INSTALADA — NÃO RETORNE AO LOCAL')){
        st.charges++;
      }
      return;
    }
    if(item.type==='silo_photo'){
      const delta=item.position.clone().sub(this.player.pos),dist=delta.length();
      const view=new THREE.Vector3(
        -Math.sin(this.player.yaw)*Math.cos(this.player.pitch),
        Math.sin(this.player.pitch),
        -Math.cos(this.player.yaw)*Math.cos(this.player.pitch)
      );
      if(dist>11.5||dist<0.01||view.dot(delta.normalize())<0.92||
        !hasLineOfSight(this.player.pos,item.position,this.levelBuilder.colliders)){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('FOTO INVÁLIDA: ENQUADRE O SATÉLITE NO CENTRO DA MIRA');
        return;
      }
      complete(this,item,'FOTOGRAFIA DO SATÉLITE VALIDADA');
      return;
    }
    if(item.id==='silo_exit'){
      return this.tryTriggerMissionExit(item.id);
    }
    return oldInteract.call(this);
  };
  function timeLabel(seconds){
    const s=Math.max(0,Math.ceil(seconds));
    return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  }
  const oldUpdate=GAME.update;
  GAME.update=function(dt){
    oldUpdate.call(this,dt);
    if(this.currentMissionId!==ID)return;
    if(this.appState==='MENU'){
      const t=performance.now()*.00023;
      this.camera.position.set(Math.sin(t)*8,6.5,-48+Math.cos(t)*9);
      this.camera.lookAt(-15,8,-12);
    }else if(this.appState==='CUTSCENE_INTRO'){
      const p=Math.min(1,this.cutsceneTimer/4.2);
      this.camera.position.set(-13+p*13,10-p*8.35,45-p*6);
      this.camera.lookAt(0,1.5,-16);
    }else if(this.appState==='CUTSCENE_OUTRO'){
      const p=Math.min(1,this.cutsceneTimer/4.0);
      this.camera.position.set(5-p*5,2.6+p*12,-154);
      this.camera.lookAt(0,2+p*10,-160);
      return;
    }
    if(this.appState!=='PLAYING'||!this.siloCountdown)return;
    const c=this.siloCountdown;
    c.remaining=Math.max(0,c.remaining-dt);
    const el=document.getElementById('silo-countdown');
    if(el){
      el.textContent='EVACUAÇÃO '+timeLabel(c.remaining);
      el.classList.remove('hidden');
      el.style.borderColor=c.remaining<=60?'#ef4444':c.remaining<=120?'#f59e0b':'#22c55e';
    }
    for(const threshold of [120,60,30,10]){
      if(c.remaining<=threshold&&!this.siloWarnings.has(threshold)){
        this.siloWarnings.add(threshold);
        this.audio.playAlarmPulse();
        this.notifyHUD('EVACUAÇÃO — RESTAM '+timeLabel(c.remaining));
      }
    }
    if(c.remaining<=0){
      this.siloCountdown=null;
      this.failMission('TEMPO ESGOTADO: O COMPLEXO FOI BLOQUEADO ANTES DA EXTRAÇÃO.');
    }
  };
  window.addEventListener('load',paint);
})();
