/**
 * Surface 2 / Severnaya — v1.8
 * Retorno ao campo nevado: preserva geometria de Surface 1,
 * adiciona bloqueio militar, enlace, vigilância e helicóptero de apoio.
 * Ordem do GDD: Frigate -> Surface 2 -> Bunker 2.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' ||
      typeof DamLevelBuilder === 'undefined' ||
      typeof GoldenEyeDamGame === 'undefined' ||
      typeof MISSIONS_DATA === 'undefined') return;

  const ID = 'surface2';
  const SAVE = 'ge007_surface2_unlocked';
  let unlockedSession = false;
  const OBJECTIVES = {
    security: { id: 's2_disable_surveillance', title: 'Desativar a vigilância da base', type: 'terminal' },
    uplink: { id: 's2_cut_bunker_link', title: 'Interromper o enlace de comunicação com o bunker', type: 'terminal' },
    helicopter: { id: 's2_disable_helicopter', title: 'Neutralizar o helicóptero de apoio', type: 'gadget' },
    entry: { id: 's2_bunker_entry', title: 'Entrar no bunker pela torre de ventilação', type: 'exit' }
  };
  const config = (...ids) => ids.map(key => ({ ...OBJECTIVES[key] }));
  MISSIONS_DATA[ID] = {
    id: ID,
    title: 'SURFACE 2 — CONTRAOPERAÇÃO',
    subtitle: 'Missão 08 — Severnaya: Retorno à Neve',
    briefingM: '"A rede de Severnaya foi reforçada após a primeira infiltração. Acesse a base novamente, silencie a cobertura de apoio e retorne ao bunker sem alertar o comando."',
    briefingQ: '"A cabine leste controla as câmeras; a estação oeste mantém o enlace. Um helicóptero de apoio ocupa o setor norte. Neutralize-o antes de acessar a ventilação protegida."',
    introTag: 'SUR2_INTRO // CONTRAOPERAÇÃO',
    introSub: '"De volta a Severnaya. A tempestade engrossou e a patrulha foi reforçada. Siga sem ser visto."',
    outroTag: 'SUR2_EXIT // INFILTRAÇÃO NO BUNKER',
    outroSub: '"Vigilância neutralizada e apoio cortado. Hora de entrar no bunker para a próxima operação."',
    spawn: { x: 0, y: 1.65, z: 46, yaw: 0 },
    difficulties: {
      AGENT: {
        label: 'AGENT', guardHp: 67, guardDamage: 9, guardReaction: 0.94,
        objectives: config('helicopter','entry')
      },
      SECRET_AGENT: {
        label: 'SECRET AGENT', guardHp: 91, guardDamage: 13, guardReaction: 0.69,
        objectives: config('uplink','helicopter','entry')
      },
      '00_AGENT': {
        label: '00 AGENT', guardHp: 114, guardDamage: 18, guardReaction: 0.47,
        objectives: config('security','uplink','helicopter','entry')
      }
    }
  };

  function unlocked() {
    if (unlockedSession) return true;
    try { return localStorage.getItem(SAVE) === '1'; } catch (_) { return false; }
  }
  function paint() {
    const button = document.querySelector('[data-mission="surface2"]');
    if (!button) return;
    const locked = !unlocked();
    button.setAttribute('aria-label', locked
      ? 'Missão 08 Surface 2 bloqueada; conclua Frigate'
      : 'Selecionar missão 08 Surface 2');
    button.setAttribute('aria-disabled', locked ? 'true' : 'false');
    button.style.opacity = locked ? '0.62' : '1';
    const status = button.querySelector('.surface2-status');
    if (status) status.textContent = locked ? 'BLOQUEADA' : 'LIBERADA';
  }

  const WORLD = DamLevelBuilder.prototype;
  const originalBuild = WORLD.build;
  const originalEnv = WORLD.updateEnvironment;

  WORLD.buildSurface2Level = function () {
    const v = (x,y,z) => new THREE.Vector3(x,y,z);
    const mat = (color, metalness = 0.2, roughness = 0.72) =>
      new THREE.MeshStandardMaterial({ color, metalness, roughness });
    const steel = mat(0x31465c, 0.62, 0.37);
    const dark = mat(0x182538, 0.5, 0.55);
    const black = mat(0x0a1722, 0.38, 0.65);
    const ice = mat(0x8ca4b0, 0.1, 0.86);
    const warning = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const amber = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const green = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Base topológica original: relevo, cabanas, antena, ventilação e neve.
    // Chamar o builder de Surface 1 evita duplicar dezenas de meshes/texturas.
    originalBuild.call(this, 'surface1');
    const original = new Map(this.interactables.map(item => [item.id,item]));
    const oldKey = original.get('get_safe_key');
    const oldSafe = original.get('get_plans');
    if (oldKey?.visualMesh) this.levelGroup.remove(oldKey.visualMesh);
    if (oldSafe?.lockMesh) this.levelGroup.remove(oldSafe.lockMesh);
    // Cofre antigo permanece como elemento ambiental sem interação.
    this.interactables.length = 0;
    this.surface2State = {
      camerasDisabled: false, linkCut: false, helicopterDisabled: false,
      helicopterDestroyTime: 0, checkpointId: 's2_gate',
      helicopter: null, heliRotor: null, heliBeacon: null, smoke: [],
      searchlights: []
    };
    const state = this.surface2State;
    this.scene.background = new THREE.Color(0x8b9db1);
    this.scene.fog = new THREE.FogExp2(0x8b9db1, 0.015);

    // A mesma antena da primeira visita recebe um terminal de enlace diferente.
    const oldRadio = original.get('disable_antenna');
    if (!oldRadio) throw new Error('Surface 2 precisa do terminal de rádio de Surface 1');
    oldRadio.id = 's2_cut_bunker_link';
    oldRadio.type = 'terminal';
    oldRadio.completed = false;
    oldRadio.prompt = 'Pressione [E] para cortar o enlace com o bunker';
    this.interactables.push(oldRadio);

    // Cabana leste da primeira missão agora contém o controle da rede CCTV.
    const surveillance = new THREE.Mesh(new THREE.BoxGeometry(1.35,0.9,0.4),cyan.clone());
    surveillance.position.set(20.5,1.42,-35.2);
    this.levelGroup.add(surveillance);
    this.interactables.push({
      id:'s2_disable_surveillance',type:'terminal',
      position:v(20.5,1.42,-35.2),radius:3.1,
      completed:false,visualMesh:surveillance,
      prompt:'Pressione [E] para desligar as câmeras de segurança'
    });

    // Torre de ventilação original: mesma saída topológica, nova missão.
    const oldExit = original.get('surface_vent');
    if (!oldExit) throw new Error('Surface 2 precisa da ventilação de Surface 1');
    oldExit.id = 's2_bunker_entry';
    oldExit.type = 'exit';
    oldExit.completed = false;
    oldExit.prompt = 'Pressione [E] para voltar ao bunker pela torre de ventilação';
    this.interactables.push(oldExit);

    // Linha de segurança física: duas cercas + portão central.
    // A abertura não pode ser contornada nas extremidades do terreno.
    this.addBox(-25.1,1.33,-100,40.8,2.66,0.62,steel,true);
    this.addBox(25.1,1.33,-100,40.8,2.66,0.62,steel,true);
    this.addSecurityGate('s2_gate',0,-100,9.5,steel,amber);
    const reader = new THREE.Mesh(new THREE.BoxGeometry(0.46,0.66,0.23),cyan.clone());
    reader.position.set(5.2,1.38,-93);
    this.levelGroup.add(reader);
    this.interactables.push({
      id:'s2_gate_switch',type:'gate_switch',
      gateId:'s2_gate',completed:false,
      position:v(5.2,1.38,-93),radius:2.75,
      visualMesh:reader,prompt:'Pressione [E] para abrir o posto de controle norte'
    });
    // Barricadas adicionais do novo destacamento, sem bloquear cabanas.
    for (const [x,z,w] of [[-10,-12,3.3],[8,-47,4.1],[-11,-89,3.0],[10,-106,3.8]]) {
      this.addBox(x,0.85,z,w,1.7,1.3,dark,true);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(w+0.05,0.16,0.15),amber);
      stripe.position.set(x,1.55,z+.67);
      this.levelGroup.add(stripe);
    }

    // Novas câmeras. A percepção usa hasLineOfSight da engine, com colliders
    // das paredes das cabanas e do portão.
    this.addSecurityCamera(2.2,3.7,-17,Math.PI);
    this.addSecurityCamera(-12.5,3.8,-68,Math.PI*.75);
    this.addSecurityCamera(-0.8,3.8,-107,Math.PI);
    this.addSecurityCamera(9,3.8,-151,Math.PI);
    // Dois holofotes de patrulha com rotação simples; sem sombras extras.
    for (const [x,z] of [[-34,-48],[33,-127]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.24,8,7),steel);
      post.position.set(x,4,z);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.5,0.75),dark);
      head.position.set(x,8.13,z);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.31,10,8),amber.clone());
      lens.position.set(x,8.02,z-.42);
      this.levelGroup.add(post,head,lens);
      const light = new THREE.SpotLight(0xfef3c7,0.65,23,Math.PI/7,0.7,1.4);
      light.position.set(x,8.3,z);
      light.castShadow = false;
      const target = new THREE.Object3D();
      target.position.set(x,0,z-10);
      this.levelGroup.add(target,light,light.target);
      light.target = target;
      state.searchlights.push({light,target,x,z,head});
    }

    // Heliponto no setor norte. Aeronave real de objetivo, com estado destruído
    // persistente até reiniciar o mapa; não apenas troca de texto no HUD.
    const heliX=15,heliZ=-136;
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5,8.5,0.14,24),ice);
    pad.position.set(heliX,0.01,heliZ);
    this.levelGroup.add(pad);
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(7.3,0.23,8,24),amber);
    padRing.rotation.x=Math.PI/2;
    padRing.position.set(heliX,0.13,heliZ);
    this.levelGroup.add(padRing);
    const heli = new THREE.Group();
    heli.position.set(heliX,0,heliZ);
    const main = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.4,4.5,9),dark);
    main.rotation.x=Math.PI/2;
    main.position.set(0,2.4,0);
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15,10,8),
      mat(0x0b496c,0.4,0.28));
    bubble.scale.set(1.05,.8,1.45);
    bubble.position.set(0,2.45,-2);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(.27,.28,5.8),steel);
    tail.position.set(0,2.62,3.8);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.25,1.6,.8),dark);
    fin.position.set(0,3.2,6.3);
    const rotor = new THREE.Group();
    rotor.position.set(0,3.56,0);
    rotor.add(
      new THREE.Mesh(new THREE.BoxGeometry(10,0.10,0.21),steel),
      new THREE.Mesh(new THREE.BoxGeometry(0.21,0.10,10),steel)
    );
    heli.add(main,bubble,tail,fin,rotor);
    for(const x of [-1.2,1.2]){
      const skid = new THREE.Mesh(new THREE.BoxGeometry(.12,.16,3.9),steel);
      skid.position.set(x,.6,0);
      heli.add(skid);
    }
    const heliBeacon = new THREE.Mesh(new THREE.SphereGeometry(.27,8,6),warning);
    heliBeacon.position.set(0,3.77,1);
    heli.add(heliBeacon);
    this.levelGroup.add(heli);
    state.helicopter=heli;
    state.heliRotor=rotor;
    state.heliBeacon=heliBeacon;
    state.heliPos=v(heliX,1.3,heliZ);
    this.addBox(heliX,1.7,heliZ,2.3,3.4,4.4,steel,true);
    const sabotage = new THREE.Mesh(new THREE.BoxGeometry(.65,.45,.29),warning.clone());
    sabotage.position.set(heliX+2.35,1.25,heliZ);
    this.levelGroup.add(sabotage);
    this.interactables.push({
      id:'s2_disable_helicopter',type:'sabotage',
      position:v(heliX+2.35,1.25,heliZ),radius:2.85,
      completed:false,visualMesh:sabotage,
      prompt:'Pressione [E] para fixar carga e neutralizar o helicóptero de apoio'
    });
    // Fumaça na fuselagem após a sabotagem: apenas três sprites geométricos.
    for(let i=0;i<3;i++){
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.45+i*.15,7,5),
        new THREE.MeshBasicMaterial({
          color:0x334155,transparent:true,opacity:.34,depthWrite:false
        })
      );
      puff.position.set(heliX,3.0+i*.35,heliZ+.2);
      puff.visible=false;
      this.levelGroup.add(puff);
      state.smoke.push({mesh:puff,y:puff.position.y});
    }

    // Guarnição intensificada: doze soldados divididos em setores reais.
    const patrol=(a,b)=>({
      pos:v(a[0],0,a[1]),
      patrol:[v(a[0],0,a[1]),v(b[0],0,b[1])]
    });
    this.guardSpawns=[
      patrol([-9,36],[7,35]),
      patrol([18,0],[18,-16]),
      patrol([-11,-19],[-9,-34]),
      patrol([30,-54],[30,-66]),
      patrol([-35,-43],[-36,-61]),
      patrol([9,-74],[12,-84]),
      patrol([-28,-85],[-16,-91]),
      patrol([24,-91],[30,-96]),
      patrol([5,-111],[-7,-112]),
      patrol([-35,-112],[-35,-130]),
      patrol([27,-135],[25,-147]),
      patrol([-4,-147],[4,-154])
    ];

    // Mantém uma única Points para neve mais densa em vez de centenas de meshes.
    const snow = this.surface1?.snow;
    if(snow){
      const flakes=440;
      const points = new Float32Array(flakes*3);
      for(let i=0;i<flakes;i++){
        points[i*3] = (Math.random()-.5)*90;
        points[i*3+1] = .5+Math.random()*24;
        points[i*3+2] = -176+Math.random()*232;
      }
      snow.geometry.setAttribute('position',new THREE.BufferAttribute(points,3));
      snow.material.size=.29;
      snow.material.opacity=.85;
    }
    const dir = this.levelGroup.children.find(c=>c.isDirectionalLight);
    if(dir)dir.intensity=.65;
  };

  WORLD.build = function (mission='dam') {
    if (mission!==ID) {
      this.surface2State=null;
      return originalBuild.call(this,mission);
    }
    return this.buildSurface2Level();
  };

  WORLD.updateEnvironment = function(dt,t){
    originalEnv.call(this,dt,t);
    const s=this.surface2State;
    if(!s)return;
    for(let i=0;i<s.searchlights.length;i++){
      const it=s.searchlights[i];
      it.target.position.x=it.x+Math.sin(t*.45+i*2.1)*10;
      it.target.position.z=it.z-12;
      it.head.rotation.y=Math.sin(t*.45+i*2.1)*.33;
    }
    if(s.helicopterDisabled){
      s.helicopterDestroyTime+=dt;
      const p=Math.min(1,s.helicopterDestroyTime/1.4);
      s.helicopter.rotation.z=p*.28;
      s.helicopter.position.y=-.32*p;
      if(s.heliBeacon)s.heliBeacon.visible=false;
      for(let i=0;i<s.smoke.length;i++){
        const smoke=s.smoke[i];
        smoke.mesh.visible=true;
        smoke.mesh.position.y=smoke.y + Math.sin(t*1.3+i)*.28;
        smoke.mesh.scale.setScalar(1+Math.sin(t*.8+i)*.15);
      }
    } else if(s.heliRotor) {
      s.heliRotor.rotation.y+=dt*11;
    }
  };

  const GAME=GoldenEyeDamGame.prototype;
  const oldSelect=GAME.selectMission;
  GAME.selectMission=function(id){
    if(id===ID&&!unlocked()){
      document.getElementById('dossier-mission-subtitle').textContent=
        'Surface 2 bloqueada — conclua Frigate para liberar.';
      paint();return;
    }
    oldSelect.call(this,id);
    paint();
  };

  const oldComplete=GAME.completeMissionSuccess;
  GAME.completeMissionSuccess=function(){
    const finished=this.currentMissionId;
    oldComplete.call(this);
    const btn=document.getElementById('btn-results-next');
    if(finished==='frigate'){
      unlockedSession=true;
      try{localStorage.setItem(SAVE,'1')}catch(_){}
      btn.textContent='Próxima Fase: Surface 2';
      btn.dataset.nextMission=ID;
      btn.classList.remove('hidden');
      document.getElementById('results-subtitle').textContent=
        'Frigate concluída. Nova missão liberada: Surface 2, retorno a Severnaya.';
      paint();
    } else if(finished===ID){
      btn.classList.add('hidden');
      document.getElementById('results-subtitle').textContent=
        'Surface 2 concluída! Próxima missão do GDD: Bunker 2 (em desenvolvimento).';
    }
  };

  function complete(game,item,message){
    if(item.completed)return false;
    item.completed=true;
    const objective=game.objectives.find(o=>o.id===item.id);
    if(objective)objective.completed=true;
    if(item.visualMesh?.material?.color)
      item.visualMesh.material.color.setHex(0x22c55e);
    game.audio.playGadgetBeep(true);
    game.notifyHUD(message);
    game.updateHUD();
    return true;
  }

  const oldInteract=GAME.interact;
  GAME.interact=function(){
    if(this.currentMissionId!==ID || this.appState!=='PLAYING')
      return oldInteract.call(this);
    const all=this.levelBuilder.interactables;
    const items=all.filter(i=>!i.completed||i.type==='exit')
      .sort((a,b)=>this.player.pos.distanceTo(a.position)-this.player.pos.distanceTo(b.position));
    const item=items.find(i=>this.player.pos.distanceTo(i.position)<=i.radius);
    if(!item)return;
    const s=this.levelBuilder.surface2State;
    if(item.type==='gate_switch')return oldInteract.call(this);
    if(item.type==='exit')return this.tryTriggerMissionExit(item.id);
    if(item.id==='s2_disable_surveillance'){
      if(complete(this,item,'VIGILÂNCIA DESATIVADA — TODAS AS CÂMERAS OFFLINE')){
        s.camerasDisabled=true;
        for(const camera of this.levelBuilder.cameras){
          camera.destroyed=true;
          if(camera.lens?.material?.color)camera.lens.material.color.setHex(0x334155);
        }
      }
    }else if(item.id==='s2_cut_bunker_link'){
      if(complete(this,item,'ENLACE COM O BUNKER INTERROMPIDO')){
        s.linkCut=true;
        if(this.levelBuilder.surface1)this.levelBuilder.surface1.antennaOff=true;
      }
    }else if(item.id==='s2_disable_helicopter'){
      if(complete(this,item,'HELICÓPTERO NEUTRALIZADO — AERONAVE FORA DE OPERAÇÃO')){
        s.helicopterDisabled=true;
        s.heliRotor.rotation.y=0;
        if(s.heliBeacon)s.heliBeacon.visible=false;
        this.spawnSpark?.(s.heliPos,0xf97316);
      }
    }
  };

  const oldUpdate=GAME.update;
  GAME.update=function(dt){
    oldUpdate.call(this,dt);
    if(this.currentMissionId!==ID)return;
    if(this.appState==='MENU'){
      const t=performance.now()*.00018;
      this.camera.position.set(-2+Math.sin(t)*17,11,-26);
      this.camera.lookAt(-31,10,-81);
    }else if(this.appState==='CUTSCENE_INTRO'){
      const p=Math.min(1,this.cutsceneTimer/4.2);
      this.camera.position.set(-15+15*p,9-p*7.35,55-9*p);
      this.camera.lookAt(0,1.4,-30);
    }else if(this.appState==='CUTSCENE_OUTRO'){
      const p=Math.min(1,this.cutsceneTimer/4);
      this.camera.position.set(11-p*7,3.8-p*4.2,-151-p*10);
      this.camera.lookAt(4,-6-p*8,-161);
    }
  };

  // Restaura o estado das instalações ao reiniciar, sem alterar progresso salvo.
  const oldStart=GAME.startMission;
  GAME.startMission=function(){
    oldStart.call(this);
    if(this.currentMissionId===ID&&this.levelBuilder.surface2State){
      const s=this.levelBuilder.surface2State;
      s.camerasDisabled=false;s.linkCut=false;
      s.helicopterDisabled=false;s.helicopterDestroyTime=0;
    }
  };
  window.addEventListener('load',paint);
})();