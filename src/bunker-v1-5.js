/**
 * GoldenEye 007 Remastered - Bunker 1 v1.5
 * Quinto mapa explorável: Severnaya, centro subterrâneo de controle.
 * Base de referências: GDD seção 7.05.
 */
(() => {
  'use strict';
  if (!window.THREE || typeof DamLevelBuilder === 'undefined' ||
      typeof GoldenEyeDamGame === 'undefined' || typeof MISSIONS_DATA === 'undefined') return;

  const ID = 'bunker1';
  const SAVE_KEY = 'ge007_bunker1_unlocked';
  let unlockedSession = false;
  const objectives = {
    surveillance: { id:'disable_cctv', title:'Desativar a vigilância do bunker', type:'terminal' },
    key: { id:'copy_goldeneye_key', title:'Copiar a chave GoldenEye e preservar a original', type:'gadget' },
    boot: { id:'boot_computer', title:'Ativar o computador de controle', type:'terminal' },
    data: { id:'download_goldeneye_data', title:'Baixar os dados do sistema GoldenEye', type:'terminal' },
    photo: { id:'photo_main_screen', title:'Fotografar a tela central do controle', type:'gadget' },
    exit: { id:'bunker_exit', title:'Sair pelo acesso de manutenção do bunker', type:'exit' }
  };
  const list = (...keys) => keys.map(key => ({ ...objectives[key] }));
  MISSIONS_DATA[ID] = {
    id: ID,
    title: 'BUNKER 1 — CENTRO DE CONTROLE',
    subtitle: 'Missão 05 — Severnaya: Bunker de Controle',
    introTag: 'BUN1_INTRO // ACESSO SUBTERRÂNEO',
    introSub: '"Severnaya. Infiltre o centro subterrâneo, obtenha os dados e não deixe rastros da chave original."',
    outroTag: 'BUN1_EXIT // INTELIGÊNCIA RECUPERADA',
    outroSub: '"Extração concluída. Os dados do controle GoldenEye estão seguros."',
    briefingM: '"O centro de controle sob a neve abriga terminais da rede GoldenEye. Entre silenciosamente, neutralize vigilância, obtenha cópias da inteligência e alcance a saída de manutenção."',
    briefingQ: '"Copie a chave sem retirar a original. Ative o computador antes de baixar os arquivos; para fotografar a tela central, posicione-se à frente e enquadre o monitor com a mira."',
    spawn: { x:0, y:1.65, z:35, yaw:0 },
    difficulties: {
      AGENT: {
        label:'AGENT', guardHp:62, guardDamage:8, guardReaction:1.1,
        objectives:list('boot','data','exit')
      },
      SECRET_AGENT: {
        label:'SECRET AGENT', guardHp:86, guardDamage:12, guardReaction:0.75,
        objectives:list('key','boot','data','exit')
      },
      '00_AGENT': {
        label:'00 AGENT', guardHp:108, guardDamage:17, guardReaction:0.52,
        objectives:list('surveillance','key','boot','data','photo','exit')
      }
    }
  };

  function unlocked() {
    if (unlockedSession) return true;
    try { return localStorage.getItem(SAVE_KEY) === '1'; } catch (_) { return false; }
  }
  function paintButton() {
    const b = document.querySelector('[data-mission="bunker1"]');
    if (!b) return;
    const locked = !unlocked();
    b.style.opacity = locked ? '0.62' : '1';
    b.setAttribute('aria-disabled', locked ? 'true' : 'false');
    b.setAttribute('aria-label', locked ?
      'Bunker 1 bloqueado: conclua Surface 1' : 'Selecionar Bunker 1');
    const label = b.querySelector('.bunker-status');
    if (label) label.textContent = locked ? 'BLOQUEADA' : 'LIBERADA';
  }

  // Reusa primitivas de colisão e texturas da engine original.
  const WORLD = DamLevelBuilder.prototype;
  const oldBuild = WORLD.build;
  WORLD.buildBunker1Level = function () {
    const v = (x,y,z) => new THREE.Vector3(x,y,z);
    const material = (color, metalness=0.1, roughness=0.72) =>
      new THREE.MeshStandardMaterial({color,metalness,roughness});
    const concrete = new THREE.MeshStandardMaterial({
      map:ProceduralTextures.createNoiseTexture('#64748b',24,7,13,true),
      metalness:0.05,roughness:0.88
    });
    const floor = new THREE.MeshStandardMaterial({
      map:ProceduralTextures.createNoiseTexture('#3a4552',14,8,15,true),
      metalness:0.25,roughness:0.63
    });
    const steel = material(0x243447,0.72,0.32);
    const blue = material(0x1d4b65,0.34,0.49);
    const glass = material(0x334155,0.4,0.25);
    const brass = material(0xefbd60,0.76,0.26);
    const black = material(0x0c1726,0.3,0.55);
    const white = new THREE.MeshBasicMaterial({color:0xcffafe});
    const green = new THREE.MeshBasicMaterial({color:0x22c55e});
    const amber = new THREE.MeshBasicMaterial({color:0xf59e0b});
    this.bounds = {minX:-23.0,maxX:23.0,minZ:-125.0,maxZ:37.5,isDam:false};
    this.bunker1 = { consoleReady:false, dataDownloaded:false, keyCopied:false,
      originalKeyRetained:true, monitorMeshes:[], lights:[], exitHatch:null, gameStarted:false };

    // Piso, teto, quatro paredes e separadores com passagem central de sete metros.
    this.addBox(0,-0.55,-44,48,1,171,floor,false,false);
    this.addBox(0,4.65,-44,48,0.45,171,concrete,false,false);
    this.addBox(-24,2.0,-44,0.8,4.9,171,concrete,true);
    this.addBox(24,2.0,-44,0.8,4.9,171,concrete,true);
    this.addBox(0,2.0,39,48,4.9,0.7,concrete,true);
    this.addBox(0,2.0,-129,48,4.9,0.7,concrete,true);

    // Painéis setoriais: cortam LOS, mas corredores e consoles continuam acessíveis.
    for (const z of [14,-51,-100]) {
      this.addBox(-14,2.0,z,20,4.0,0.52,concrete,true);
      this.addBox(14,2.0,z,20,4.0,0.52,concrete,true);
      const gateId = z===14?'bun_gate_1':z===-51?'bun_gate_2':'bun_gate_3';
      this.addSecurityGate(gateId,0,z,7.0,steel,brass);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.47,0.20),
        new THREE.MeshBasicMaterial({color:0x60a5fa}));
      screen.position.set(5.4,1.33,z+4.0);
      this.levelGroup.add(screen);
      this.interactables.push({
        id:'switch_'+gateId, type:'gate_switch',gateId,
        position:v(5.0,1.2,z+4.0),radius:2.65,
        prompt:'Pressione [E] para destravar a porta de segurança',
        completed:false,visualMesh:screen
      });
    }

    // Áreas laterais e abrigos: coberturas que os guardas podem utilizar.
    for (const z of [25,-5,-32,-65,-82,-113]) {
      for (const x of [-17,17]) {
        const desk = this.addBox(x,0.8,z,3.9,1.6,1.4,steel,true);
        desk.receiveShadow=true;
        const consoleMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.4,0.58,0.22),
          new THREE.MeshBasicMaterial({color: z%2 ? 0x0ea5e9 : 0x10b981})
        );
        consoleMesh.position.set(x,1.67,z);
        this.levelGroup.add(consoleMesh);
        this.bunker1.monitorMeshes.push(consoleMesh);
      }
    }
    // Armários técnicos nas paredes, fora da rota central.
    for(const z of [29,-13,-37,-69,-89,-114]){
      this.addBox(-21.5,1.7,z,2.2,3.2,3.0,steel,true);
      this.addBox(21.5,1.7,z-5,2.2,3.2,3.0,steel,true);
    }

    // Setor 1: vigilância / câmeras / terminais de segurança.
    const security = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.85,0.26),amber.clone());
    security.position.set(-11,1.45,2);
    this.levelGroup.add(security);
    this.interactables.push({
      id:'disable_cctv',type:'terminal',position:v(-11,1.45,2),
      radius:2.65,visualMesh:security,completed:false,
      prompt:'Pressione [E] para desligar as câmeras de segurança'
    });
    this.addSecurityCamera(0,3.55,28,Math.PI);
    this.addSecurityCamera(-2.8,3.55,6,Math.PI);
    this.addSecurityCamera(1,3.6,-31,Math.PI);
    this.addSecurityCamera(0,3.55,-70,Math.PI);
    this.addSecurityCamera(-2.5,3.6,-105,Math.PI);

    // Setor 2: chave original em compartimento de leitura, sem remoção.
    const originalKey = new THREE.Group();
    originalKey.position.set(10,1.52,-23);
    const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.35,0.08,8,16),brass);
    const keyStem = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.55,0.14),brass);
    keyStem.position.y=-0.38;
    originalKey.add(keyRing,keyStem);
    this.levelGroup.add(originalKey);
    this.bunker1.originalKeyMesh=originalKey;
    const copier = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.4,0.55),blue);
    copier.position.set(10,0.9,-23.3);
    this.levelGroup.add(copier);
    this.interactables.push({
      id:'copy_goldeneye_key',type:'gadget',position:v(10,1.5,-23),
      radius:3.2,completed:false,visualMesh:copier,
      prompt:'Pressione [E] para copiar a chave sem retirar a original'
    });

    // Setor 3: sequência iniciar -> download, com cabeamento e monitores.
    const power = new THREE.Mesh(new THREE.BoxGeometry(1.15,0.8,0.38),amber.clone());
    power.position.set(-10.5,1.55,-68);
    this.levelGroup.add(power);
    this.interactables.push({
      id:'boot_computer',type:'terminal',position:v(-10.5,1.4,-68),
      radius:3.1,visualMesh:power,completed:false,
      prompt:'Pressione [E] para ativar o computador central'
    });
    const tapeDrive = new THREE.Mesh(new THREE.BoxGeometry(1.45,1.12,0.8),blue);
    tapeDrive.position.set(10,1.2,-68);
    this.levelGroup.add(tapeDrive);
    const driveLight = new THREE.Mesh(new THREE.SphereGeometry(0.11,8,6),amber.clone());
    driveLight.position.set(10,1.56,-67.55);
    this.levelGroup.add(driveLight);
    this.bunker1.driveLight=driveLight;
    this.interactables.push({
      id:'download_goldeneye_data',type:'terminal',position:v(10,1.25,-68),
      radius:3.1,visualMesh:tapeDrive,completed:false,
      prompt:'Pressione [E] para iniciar cópia de dados (4 s)'
    });

    // Setor 4: tela gigante fotografável com orientação real da mira.
    const screen = new THREE.Mesh(new THREE.BoxGeometry(7.8,3.0,0.3),black);
    screen.position.set(0,2.22,-92);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(7.1,2.4),
      new THREE.MeshBasicMaterial({color:0x147d9c,side:THREE.DoubleSide}));
    display.position.set(0,2.22,-91.81);
    this.levelGroup.add(screen,display);
    // Grades e linhas de telemetria simples: evitam fontes minúsculas/texturas remotas.
    for(let i=0;i<6;i++){
      const line = new THREE.Mesh(new THREE.BoxGeometry(6.4,0.04,0.015),white);
      line.position.set(0,1.3+i*0.36,-91.788);
      this.levelGroup.add(line);
    }
    this.bunker1.centralScreen=display;
    this.interactables.push({
      id:'photo_main_screen',type:'photograph',position:v(0,2.22,-91.8),
      radius:9.0,completed:false,visualMesh:null,
      prompt:'Pressione [E] com a mira centralizada na tela para fotografar'
    });

    // Setor 5: saída correta, sem completar apenas por se aproximar.
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(5.0,3.15,0.35),blue);
    hatch.position.set(0,1.6,-120.5);
    this.levelGroup.add(hatch);
    this.bunker1.exitHatch=hatch;
    this.interactables.push({
      id:'bunker_exit',type:'exit',position:v(0,1.2,-119.0),
      radius:3.2,completed:false,visualMesh:hatch,
      prompt:'Pressione [E] para sair pelo acesso de manutenção'
    });

    // Recursos e inimigos em cinco setores; nenhum spawn infinito.
    this.addPickup('ammo',4,0.55,-9);
    this.addPickup('armor',-4,0.85,-80);
    this.addPickup('ammo',12,0.55,-109);
    const patrol=(a,b)=>({pos:v(a[0],0,a[1]),patrol:[v(a[0],0,a[1]),v(b[0],0,b[1])]});
    this.guardSpawns=[
      patrol([-7,23],[3,21]), patrol([13,8],[12,3]),
      patrol([-9,-16],[-12,-30]),patrol([4,-35],[-3,-43]),
      patrol([12,-62],[9,-74]),patrol([-8,-81],[3,-85]),
      patrol([-8,-107],[-10,-116]),patrol([10,-109],[4,-112])
    ];

    const ambient = new THREE.HemisphereLight(0xdaf4ff,0x0c1726,0.74);
    this.levelGroup.add(ambient);
    for(const z of [30,9,-11,-30,-60,-77,-92,-113]){
      const strip=new THREE.Mesh(new THREE.BoxGeometry(5.6,0.08,0.6),white);
      strip.position.set(0,4.31,z);
      this.levelGroup.add(strip);
      // Poucas luzes pontuais para não elevar o custo de renderização.
      if (z===30||z===-30||z===-77||z===-113){
        const light=new THREE.PointLight(0xb3e5fc,0.77,28);
        light.position.set(0,3.8,z);
        this.levelGroup.add(light);
      }
    }
    this.bunker1.initialized=true;
  };

  WORLD.build=function(mission='dam'){
    if(mission!==ID){
      this.bunker1=null;
      return oldBuild.call(this,mission);
    }
    this.clear();
    this.buildBunker1Level();
    this.scene.background=new THREE.Color(0x293746);
    this.scene.fog=new THREE.FogExp2(0x293746,0.013);
  };
  const oldEnvironment=WORLD.updateEnvironment;
  WORLD.updateEnvironment=function(dt,t){
    oldEnvironment.call(this,dt,t);
    const state=this.bunker1;
    if(!state)return;
    const pulse=0.25+Math.sin(t*1.2)*0.13;
    for(let i=0;i<state.monitorMeshes.length;i++){
      const m=state.monitorMeshes[i];
      if(m.material && m.material.color)
        m.material.color.setHex(i%2?0x10b981:(pulse>0.29?0x0ea5e9:0x0284c7));
    }
    if(state.driveLight)state.driveLight.material.color.setHex(state.dataDownloaded?0x22c55e:state.consoleReady?0x38bdf8:0xf59e0b);
  };

  const GAME=GoldenEyeDamGame.prototype;
  const oldSelect=GAME.selectMission;
  GAME.selectMission=function(id){
    if(id===ID&&!unlocked()){
      document.getElementById('dossier-mission-subtitle').textContent=
        'Bunker 1 bloqueado — conclua Surface 1 primeiro.';
      paintButton();
      return;
    }
    oldSelect.call(this,id);
    paintButton();
  };

  const oldSuccess=GAME.completeMissionSuccess;
  GAME.completeMissionSuccess=function(){
    const finished=this.currentMissionId;
    oldSuccess.call(this);
    if(finished==='surface1'){
      unlockedSession=true;
      try{localStorage.setItem(SAVE_KEY,'1')}catch(_){}
      const next=document.getElementById('btn-results-next');
      next.textContent='Próxima Fase: Bunker 1';
      next.dataset.nextMission=ID;
      next.classList.remove('hidden');
      document.getElementById('results-subtitle').textContent=
        'Surface 1 concluída! Centro de controle subterrâneo — Bunker 1 liberado.';
      paintButton();
    }else if(finished===ID){
      const next=document.getElementById('btn-results-next');
      next.classList.add('hidden');
      document.getElementById('results-subtitle').textContent=
        'Operação Severnaya concluída. Próxima fase do GDD: Silo (ainda em desenvolvimento).';
    }
  };

  const oldStart=GAME.startMission;
  GAME.startMission=function(){
    this.bunkerDownload=null;
    this.bunkerProgressElement=null;
    oldStart.call(this);
    if(this.currentMissionId===ID){
      this.levelBuilder.bunker1.gameStarted=true;
      this.levelBuilder.bunker1.keyCopied=false;
      this.levelBuilder.bunker1.consoleReady=false;
      this.levelBuilder.bunker1.dataDownloaded=false;
    }
  };

  function getItem(game,id){return game.levelBuilder.interactables.find(x=>x.id===id);}
  function completeItem(game,id,msg){
    const item=getItem(game,id);
    if(!item||item.completed)return false;
    item.completed=true;
    const obj=game.objectives.find(x=>x.id===id);
    if(obj)obj.completed=true;
    if(item.visualMesh?.material?.color)item.visualMesh.material.color.setHex(0x22c55e);
    game.audio.playGadgetBeep(true);
    game.notifyHUD(msg);
    game.updateHUD();
    return true;
  }
  function required(game,id){return game.objectives.some(x=>x.id===id);}
  const oldInteract=GAME.interact;
  GAME.interact=function(){
    if(this.currentMissionId!==ID||this.appState!=='PLAYING')return oldInteract.call(this);
    const st=this.levelBuilder.bunker1;
    // Acesso à saída não é instantâneo: o motor exige todas as diretivas completas.
    this.levelBuilder.interactables.sort((a,b)=>
      this.player.pos.distanceTo(a.position)-this.player.pos.distanceTo(b.position));
    const nearest=this.levelBuilder.interactables.find(item=>
      !item.completed && this.player.pos.distanceTo(item.position)<=item.radius);
    if(!nearest)return;
    const id=nearest.id;
    if(id==='download_goldeneye_data'){
      if(!st.consoleReady){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('COMPUTADOR OFFLINE: ATIVE O TERMINAL PRIMEIRO');
        return;
      }
      if(this.bunkerDownload){
        this.notifyHUD('DOWNLOAD EM ANDAMENTO — PERMANEÇA NO TERMINAL');
        return;
      }
      this.bunkerDownload={timer:0,duration:4.0,item:nearest};
      this.notifyHUD('INICIANDO DOWNLOAD CRIPTOGRAFADO... 0%');
      return;
    }
    if(id==='boot_computer'&&required(this,'copy_goldeneye_key')&&!st.keyCopied){
      this.audio.playGadgetBeep(false);
      this.notifyHUD('VERIFICAÇÃO PENDENTE: COPIE A CHAVE GOLDENEYE');
      return;
    }
    if(id==='photo_main_screen'){
      if(required(this,'download_goldeneye_data')&&!st.dataDownloaded){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('FOTOGRAFIA BLOQUEADA: AGUARDE A EXTRAÇÃO DOS DADOS');
        return;
      }
      const delta=nearest.position.clone().sub(this.player.pos);
      const dist=delta.length();
      const forward=new THREE.Vector3(
        -Math.sin(this.player.yaw)*Math.cos(this.player.pitch),
         Math.sin(this.player.pitch),
        -Math.cos(this.player.yaw)*Math.cos(this.player.pitch));
      const dot=dist>0.001?forward.dot(delta.normalize()):0;
      const visible=hasLineOfSight(this.player.pos,nearest.position,this.levelBuilder.colliders);
      if(dist>9||dot<0.94||!visible){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('ENQUADRAMENTO INVÁLIDO — APONTE A MIRA PARA O CENTRO DA TELA');
        return;
      }
      completeItem(this,id,'FOTO VALIDADA — ALVO, DISTÂNCIA E ÂNGULO CORRETOS');
      return;
    }
    if(id==='disable_cctv'){
      if(completeItem(this,id,'REDE DE CÂMERAS DESATIVADA')){
        for(const cam of this.levelBuilder.cameras){
          cam.destroyed=true;
          cam.lens.material.color.setHex(0x334155);
          cam.head.rotation.x=0.4;
        }
      }
      return;
    }
    if(id==='copy_goldeneye_key'){
      if(completeItem(this,id,'CÓPIA DA CHAVE REALIZADA — ORIGINAL PRESERVADO')){
        st.keyCopied=true;
        // Não ocultar nem mover a chave original após a cópia.
        st.originalKeyRetained=st.originalKeyMesh.visible!==false;
      }
      return;
    }
    if(id==='boot_computer'){
      if(completeItem(this,id,'COMPUTADOR GOLDENEYE LIGADO')){
        st.consoleReady=true;
      }
      return;
    }
    return oldInteract.call(this);
  };

  const oldUpdate=GAME.update;
  GAME.update=function(dt){
    oldUpdate.call(this,dt);
    if(this.currentMissionId!==ID)return;
    if(this.appState==='MENU'){
      const t=performance.now()*0.00024;
      this.camera.position.set(Math.sin(t)*7,3.3,-68+Math.cos(t)*10);
      this.camera.lookAt(0,2.2,-91);
    }else if(this.appState==='CUTSCENE_INTRO'){
      const p=Math.min(1,this.cutsceneTimer/4.2);
      this.camera.position.set(0,3.8-2.15*p,39-4*p);
      this.camera.lookAt(0,1.55,11);
    }else if(this.appState==='CUTSCENE_OUTRO'){
      const p=Math.min(1,this.cutsceneTimer/4.0);
      if(this.levelBuilder.bunker1.exitHatch)
        this.levelBuilder.bunker1.exitHatch.position.y=1.6+4*p;
      this.camera.position.set(5-5*p,2.8,-112-7*p);
      this.camera.lookAt(0,1.3,-122);
    }else if(this.appState==='PLAYING'&&this.bunkerDownload){
      const task=this.bunkerDownload;
      if(this.player.pos.distanceTo(task.item.position)>task.item.radius+0.25){
        this.bunkerDownload=null;
        this.notifyHUD('DOWNLOAD CANCELADO — VOCÊ SE AFASTOU DO TERMINAL');
      }else{
        task.timer+=dt;
        const progress=Math.min(100,Math.floor(task.timer/task.duration*100));
        const el=document.getElementById('bunker-download-progress');
        if(el){
          el.textContent='EXTRAÇÃO DE DADOS: '+progress+'%';
          el.classList.remove('hidden');
        }
        if(task.timer>=task.duration){
          this.bunkerDownload=null;
          this.levelBuilder.bunker1.dataDownloaded=true;
          completeItem(this,'download_goldeneye_data',
            'TRANSFERÊNCIA 100% — DADOS GOLDENEYE COPIADOS');
          if(el)el.classList.add('hidden');
        }
      }
    }
  };
  window.addEventListener('load',()=>paintButton());
})();
