/**
 * GOLDENEYE 007 Remastered — Bunker 2 / Natalya (v1.9).
 * Mapa subterrâneo, registros, fita, câmeras e escolta por waypoints.
 * GDD 7.09 — Bunker 2; carregado após Surface 2.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof DamLevelBuilder === 'undefined' ||
      typeof GoldenEyeDamGame === 'undefined' || typeof MISSIONS_DATA === 'undefined') return;

  const ID='bunker2', SAVE='ge007_bunker2_unlocked';
  let sessionUnlock=false;
  const target={
    records:{id:'b2_compare_records',title:'Comparar registros de funcionários e baixas',type:'terminal'},
    tape:{id:'b2_get_videotape',title:'Recuperar a fita de vídeo das câmeras',type:'item'},
    cameras:{id:'b2_destroy_cameras',title:'Destruir as câmeras da prisão',type:'cameras'},
    manual:{id:'b2_get_manual',title:'Recuperar o manual do sistema GoldenEye',type:'item'},
    escape:{id:'b2_escape_with_natalya',title:'Escapar do bunker com Natalya viva',type:'escort'}
  };
  const objectives=(...ids)=>ids.map(x=>({...target[x]}));
  MISSIONS_DATA[ID]={
    id:ID,title:'BUNKER 2 — FUGA COM NATALYA',
    subtitle:'Missão 09 — Severnaya: Centro de Detenção',
    introTag:'BUN2_INTRO // CENTRO DE DETENÇÃO',
    introSub:'"007 acorda preso no complexo de Severnaya. Natalya está em uma cela próxima. A fuga precisa ser conjunta."',
    outroTag:'BUN2_ESCAPE // EXTRAÇÃO CONJUNTA',
    outroSub:'"Documentos recuperados. Bond e Natalya escapam da instalação."',
    briefingM:'"Severnaya está em alerta. Liberte Natalya, reúna as provas e saia com ela pelo acesso subterrâneo. A operação não termina se a aliada ficar presa ou ferida."',
    briefingQ:'"Compare os dois registros no arquivo antes de confirmar o relatório; encontre a fita na sala de vigilância e o manual no laboratório. Atire nas câmeras ou sobrecarregue-as de perto. Pressione E junto de Natalya para ordenar SEGUIR/AGUARDAR."',
    spawn:{x:0,y:1.65,z:43,yaw:0},
    difficulties:{
      AGENT:{label:'AGENT',guardHp:68,guardDamage:9,guardReaction:1.05,
        objectives:objectives('tape','escape')},
      SECRET_AGENT:{label:'SECRET AGENT',guardHp:91,guardDamage:13,guardReaction:.73,
        objectives:objectives('records','tape','escape')},
      '00_AGENT':{label:'00 AGENT',guardHp:114,guardDamage:18,guardReaction:.48,
        objectives:objectives('records','tape','cameras','manual','escape')}
    }
  };

  const unlocked=()=>{
    if(sessionUnlock)return true;
    try{
      if(localStorage.getItem(SAVE)==='1')return true;
      return ['AGENT','SECRET_AGENT','00_AGENT'].some(d=>
        localStorage.getItem('ge007_surface2_best_'+d)!==null);
    }catch(_){return false}
  };
  function paint(){
    const button=document.querySelector('[data-mission="bunker2"]');
    if(!button)return;
    const lock=!unlocked();
    button.setAttribute('aria-disabled',lock?'true':'false');
    button.setAttribute('aria-label',lock?
      'Bunker 2 bloqueado: conclua Surface 2':'Selecionar Bunker 2');
    button.style.opacity=lock?'.62':'1';
    const status=button.querySelector('.bunker2-status');
    if(status)status.textContent=lock?'BLOQUEADA':'LIBERADA';
  }

  const WORLD=DamLevelBuilder.prototype;
  const originalBuild=WORLD.build;
  const originalEnv=WORLD.updateEnvironment;
  WORLD.buildBunker2Level=function(){
    const v=(x,y,z)=>new THREE.Vector3(x,y,z);
    const m=(c,metalness=.16,roughness=.68)=>
      new THREE.MeshStandardMaterial({color:c,metalness,roughness});
    const concrete=new THREE.MeshStandardMaterial({
      map:ProceduralTextures.createNoiseTexture('#637181',17,8,12,true),
      roughness:.87,metalness:.06
    });
    const tile=new THREE.MeshStandardMaterial({
      map:ProceduralTextures.createNoiseTexture('#3b4552',12,7,14,true),
      roughness:.8,metalness:.2
    });
    const steel=m(0x35475b,.72,.37);
    const dark=m(0x1a2535,.3,.65);
    const desk=m(0x475569,.2,.72);
    const orange=new THREE.MeshBasicMaterial({color:0xfbbf24});
    const green=new THREE.MeshBasicMaterial({color:0x22c55e});
    const cyan=new THREE.MeshBasicMaterial({color:0x38bdf8});
    const red=new THREE.MeshBasicMaterial({color:0xef4444});
    const paper=new THREE.MeshStandardMaterial({color:0xf1e7c9,roughness:.9});
    this.bounds={minX:-23.2,maxX:23.2,minZ:-147.5,maxZ:53,isDam:false};
    this.bunker2State={
      freed:false,following:false,escortReady:false,escortAlive:true,
      natalya:null,natalyaItem:null,waitItem:null,routeIndex:0,
      records:{personnel:false,casualty:false,compared:false},
      camerasDestroyed:0,limitedReinforcements:0,reinforceAt:0,
      warningLamps:[],monitorMeshes:[],exitDoor:null,escapeTriggered:false,
      escortRoute:[
        v(16,0,15),v(10,0,15),v(5.8,0,15),v(0,0,15),
        v(0,0,5),v(0,0,-10),v(0,0,-28),v(0,0,-42),
        v(0,0,-57),v(0,0,-75),v(0,0,-89),v(0,0,-102),
        v(0,0,-118),v(0,0,-138)
      ]
    };
    const st=this.bunker2State;
    // Piso e paredes da instalação. O corredor central tem largura útil de 8 m.
    this.addBox(0,-.55,-47,47,1.1,205,tile,false,false);
    this.addBox(0,4.67,-47,47,.32,205,concrete,false,false);
    this.addBox(-24,2.1,-47,.8,4.5,205,concrete,true);
    this.addBox(24,2.1,-47,.8,4.5,205,concrete,true);
    this.addBox(0,2.05,54,48,4.4,.7,concrete,true);
    this.addBox(0,2.05,-149,48,4.4,.7,concrete,true);

    // Três compartimentos com portões reais e leitores sempre alcançáveis.
    for(const [j,z] of [32,-50,-108].entries()){
      this.addBox(-14,2.15,z,20,4.3,.62,concrete,true);
      this.addBox(14,2.15,z,20,4.3,.62,concrete,true);
      const gateId='b2_gate_'+(j+1);
      this.addSecurityGate(gateId,0,z,8,steel,orange);
      const panel=new THREE.Mesh(new THREE.BoxGeometry(.46,.58,.25),cyan.clone());
      panel.position.set(5.5,1.4,z+4.5);
      this.levelGroup.add(panel);
      this.interactables.push({
        id:'b2_switch_'+(j+1),type:'gate_switch',gateId,
        position:v(5.5,1.4,z+4.5),radius:2.8,
        completed:false,visualMesh:panel,
        prompt:'Pressione [E] para destravar o portão do setor '+(j+1)
      });
    }

    // Quatro salas acessíveis pelo lado do corredor. Passagens de 4m nas paredes.
    const room=(cx,cz,w,d)=>{
      const xIn=cx>0?cx-w/2:cx+w/2;
      const xOut=cx>0?cx+w/2:cx-w/2;
      this.addBox(xOut,2.1,cz,.48,4.2,d,concrete,true);
      this.addBox(cx,2.1,cz-d/2,w,4.2,.48,concrete,true);
      this.addBox(cx,2.1,cz+d/2,w,4.2,.48,concrete,true);
      const segment=(d-4)/2;
      this.addBox(xIn,2.1,cz-2-segment/2,.48,4.2,segment,concrete,true);
      this.addBox(xIn,2.1,cz+2+segment/2,.48,4.2,segment,concrete,true);
      const sign=new THREE.Mesh(new THREE.BoxGeometry(1.3,.13,.4),
        new THREE.MeshBasicMaterial({color:0xe2e8f0}));
      sign.position.set(cx,4.25,cz);
      this.levelGroup.add(sign);
    };
    room(16,15,12,15);       // Cela Natalya
    room(-16,-27,12,18);     // Arquivo e registros
    room(16,-71,12,18);      // Fita e monitores
    room(-16,-89,12,18);     // Manual
    room(16,-121,12,15);    // Sala de segurança adicional

    // Grades do corredor e celas extras; barras decorativas baratas.
    for(const [x,z] of [[-20,16],[-20,5],[20,-5],[-20,-72],[20,-90]]){
      for(let k=0;k<4;k++){
        const bar=new THREE.Mesh(new THREE.CylinderGeometry(.052,.052,2.45,6),steel);
        bar.position.set(x+k*.72,1.25,z);
        this.levelGroup.add(bar);
      }
    }
    for(const [x,z] of [[-15,-30],[16,-74],[-15,-93],[15,-122]]){
      this.addBox(x,0.64,z-5,2.6,1.28,1.65,desk,true);
      const screen=new THREE.Mesh(new THREE.BoxGeometry(.96,.7,.18),cyan.clone());
      screen.position.set(x,1.48,z-5);
      this.levelGroup.add(screen);
      st.monitorMeshes.push(screen);
    }

    // Natalya na cela. Mantém role scientist para reconhecer tiros no código
    // original; a detecção de morte/fracasso específica será tratada na missão.
    this.addCharacterNPC('b2_natalya','scientist',16,15,Math.PI,0x76895d);
    const natalya=this.npcs[this.npcs.length-1];
    natalya.isNatalya=true;
    natalya.health=100;
    natalya.rescued=false;
    natalya.mesh.position.set(16,0,15);
    natalya.position.copy(natalya.mesh.position);
    st.natalya=natalya;
    this.interactables.push({
      id:'b2_free_natalya',type:'ally_rescue',completed:false,
      position:v(16,1.2,15),radius:3,
      prompt:'Pressione [E] para libertar Natalya e iniciar a escolta'
    });
    st.waitItem={
      id:'b2_natalya_orders',type:'ally_order',completed:false,
      position:v(16,1.2,15),radius:2.7,
      prompt:'Pressione [E] para ordenar Natalya a AGUARDAR',
    };
    // A ordem só fica disponível depois do resgate.
    // Ordem dinâmica: item fica fora do conjunto até ser libertada.

    // Registros independentes: comparação só confirma com ambos lidos.
    const log=(id,x,z,colour,msg)=>{
      const display=new THREE.Mesh(new THREE.BoxGeometry(1.2,.67,.25),colour.clone());
      display.position.set(x,1.42,z);
      this.levelGroup.add(display);
      this.interactables.push({
        id,type:'b2_record',completed:false,
        position:v(x,1.38,z),radius:2.8,visualMesh:display,
        prompt:msg
      });
    };
    log('b2_personnel_log',-15.7,-23,cyan,
      'Pressione [E] para consultar o registro de funcionários');
    log('b2_casualty_log',-16.3,-30,orange,
      'Pressione [E] para consultar o registro de baixas');
    const compare=new THREE.Mesh(new THREE.BoxGeometry(1.32,.8,.32),cyan.clone());
    compare.position.set(-16,1.35,-34);
    this.levelGroup.add(compare);
    this.interactables.push({
      id:'b2_compare_records',type:'b2_compare',
      position:v(-16,1.34,-34),radius:2.9,completed:false,
      visualMesh:compare,
      prompt:'Pressione [E] para cruzar os registros da instalação'
    });

    // Fita e manual são objetos distintos que desaparecem ao recolher.
    const tape=new THREE.Mesh(new THREE.BoxGeometry(.66,.3,.5),dark);
    tape.position.set(16,1.2,-71);
    this.levelGroup.add(tape);
    this.interactables.push({
      id:'b2_get_videotape',type:'item',
      position:v(16,1.25,-71),radius:3.0,
      completed:false,visualMesh:tape,
      prompt:'Pressione [E] para recuperar a fita de vídeo'
    });
    const manual=new THREE.Mesh(new THREE.BoxGeometry(.55,.2,.76),paper);
    manual.position.set(-16,1.05,-88.4);
    this.levelGroup.add(manual);
    this.interactables.push({
      id:'b2_get_manual',type:'item',
      position:v(-16,1.2,-88.4),radius:3.0,
      completed:false,visualMesh:manual,
      prompt:'Pressione [E] para recolher o manual GoldenEye'
    });

    // Câmeras realmente destrutíveis por tiro, ou por sabotagem a curta distância.
    for(const [id,x,z,yaw] of [
      ['cam_a',2.0,19,Math.PI],['cam_b',-1.5,-37,Math.PI],
      ['cam_c',1.5,-75,Math.PI],['cam_d',-1.5,-116,Math.PI]
    ]){
      this.addSecurityCamera(x,3.55,z,yaw);
      const camera=this.cameras[this.cameras.length-1];
      camera.bunker2Id=id;
      this.interactables.push({
        id:'b2_sabotage_'+id,type:'b2_camera',position:v(x,1.5,z),
        radius:3.0,visualMesh:camera.lens,camera,completed:false,
        prompt:'Pressione [E] para destruir o circuito da câmera'
      });
    }

    // Saída do bunker controlada por leitor; só aceita Natalia junto à porta.
    const exit=new THREE.Mesh(new THREE.BoxGeometry(5.3,3.3,.37),steel);
    exit.position.set(0,1.65,-141);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(2.0,.27,.24),green);
    lamp.position.set(0,3.75,-140.7);
    this.levelGroup.add(exit,lamp);
    st.exitDoor=exit;
    this.interactables.push({
      id:'b2_escape_with_natalya',type:'exit',
      position:v(0,1.35,-139),radius:3.5,completed:false,
      visualMesh:exit,
      prompt:'Pressione [E] para sair com Natalya pelo acesso de manutenção'
    });

    // Cobertura em corredores, longe do eixo x=0 por onde Natalya passa.
    for(const [x,z] of [[-10,21],[10,-8],[-9,-40],[9,-61],[9,-96],[-10,-121]]){
      this.addBox(x,.68,z,2.2,1.36,1.8,steel,true);
    }
    this.addPickup('armor',-6,.8,-65);
    this.addPickup('ammo',6,.55,-119);
    const patrol=(a,b)=>({pos:v(a[0],0,a[1]),patrol:[v(a[0],0,a[1]),v(b[0],0,b[1])]});
    this.guardSpawns=[
      patrol([-7,24],[-9,17]),patrol([-8,3],[-3,-8]),
      patrol([8,-23],[7,-34]),patrol([-7,-42],[-3,-45]),
      patrol([10,-61],[5,-65]),patrol([-7,-80],[-10,-84]),
      patrol([10,-100],[5,-105]),patrol([-9,-118],[-8,-126])
    ];
    // Reforços limitados: somente dois, acionados uma vez pelo primeiro alarme.
    st.reinforcementSpawns=[
      patrol([-7,-132],[-8,-123]),
      patrol([8,-133],[8,-122])
    ];

    this.levelGroup.add(new THREE.HemisphereLight(0xdbeafe,0x122036,.73));
    for(const z of [41,16,-15,-43,-70,-91,-120,-139]){
      const strip=new THREE.Mesh(new THREE.BoxGeometry(4.9,.12,.5),
        new THREE.MeshBasicMaterial({color:0xc7e7f5}));
      strip.position.set(0,4.37,z);
      this.levelGroup.add(strip);
      if([41,-43,-91,-139].includes(z)){
        const light=new THREE.PointLight(0xcfeaff,.77,27);
        light.position.set(0,3.9,z);
        this.levelGroup.add(light);
      }
      const warning=new THREE.Mesh(new THREE.BoxGeometry(.46,.21,.27),red.clone());
      warning.position.set(-22.6,3.5,z);
      this.levelGroup.add(warning);
      st.warningLamps.push(warning);
    }
  };

  WORLD.build=function(mission='dam'){
    if(mission!==ID){
      this.bunker2State=null;
      return originalBuild.call(this,mission);
    }
    this.surface2State=null;this.frigateState=null;this.siloState=null;
    this.bunker1=null;this.surface1=null;
    this.clear();this.buildBunker2Level();
    this.scene.background=new THREE.Color(0x243244);
    this.scene.fog=new THREE.FogExp2(0x243244,.016);
  };
  WORLD.updateEnvironment=function(dt,t){
    originalEnv.call(this,dt,t);
    const st=this.bunker2State;
    if(!st)return;
    for(const m of st.monitorMeshes){
      if(m.material?.color)m.material.color.setHex(Math.sin(t*1.7)>.0?0x38bdf8:0x0ea5e9);
    }
    const alert=st.limitedReinforcements>0;
    for(const m of st.warningLamps){
      m.material.color.setHex(alert&&Math.sin(t*5)>0?0xff3636:0x7f1d1d);
    }
  };

  const GAME=GoldenEyeDamGame.prototype;
  const oldSelect=GAME.selectMission;
  GAME.selectMission=function(id){
    if(id===ID&&!unlocked()){
      document.getElementById('dossier-mission-subtitle').textContent=
        'Bunker 2 bloqueado — conclua Surface 2 primeiro.';
      paint();return;
    }
    oldSelect.call(this,id);paint();
  };

  const oldSuccess=GAME.completeMissionSuccess;
  GAME.completeMissionSuccess=function(){
    const finished=this.currentMissionId;
    oldSuccess.call(this);
    const next=document.getElementById('btn-results-next');
    if(finished==='surface2'){
      sessionUnlock=true;
      try{localStorage.setItem(SAVE,'1')}catch(_){}
      next.textContent='Próxima Fase: Bunker 2';
      next.dataset.nextMission=ID;
      next.classList.remove('hidden');
      document.getElementById('results-subtitle').textContent=
        'Surface 2 concluída! Bunker 2 e o resgate de Natalya foram liberados.';
      paint();
    }else if(finished===ID){
      next.classList.add('hidden');
      document.getElementById('results-subtitle').textContent=
        'Bunker 2 concluído! Próxima missão planejada: Statue (em desenvolvimento).';
    }
  };

  const oldStart=GAME.startMission;
  GAME.startMission=function(){
    const panel=document.getElementById('bunker2-ally-status');
    if(panel)panel.classList.add('hidden');
    oldStart.call(this);
    if(this.currentMissionId!==ID)return;
    const st=this.levelBuilder.bunker2State;
    st.freed=false;st.following=false;st.routeIndex=0;st.escortReady=false;
    st.limitedReinforcements=0;
    this.bunker2DamageTimer=0;
    this.bunker2AlarmCounter=0;
  };

  function complete(game,item,message){
    if(item.completed)return false;
    item.completed=true;
    const goal=game.objectives.find(o=>o.id===item.id);
    if(goal)goal.completed=true;
    if(item.visualMesh?.material?.color)item.visualMesh.material.color.setHex(0x22c55e);
    game.audio.playGadgetBeep(true);
    game.notifyHUD(message);game.updateHUD();
    return true;
  }
  function updateCameras(game,announce=true){
    const state=game.levelBuilder.bunker2State;
    if(!state)return;
    const list=game.levelBuilder.cameras;
    state.camerasDestroyed=list.filter(c=>c.destroyed).length;
    for(const entry of game.levelBuilder.interactables){
      if(entry.type==='b2_camera'&&entry.camera.destroyed)entry.completed=true;
    }
    if(list.length && state.camerasDestroyed===list.length){
      const goal=game.objectives.find(x=>x.id==='b2_destroy_cameras');
      if(goal&&!goal.completed){
        goal.completed=true;game.updateHUD();
        if(announce)game.notifyHUD('TODAS AS CÂMERAS DO BUNKER FORAM DESTRUÍDAS');
      }
    }
  }
  function natalyaCloseToDoor(game){
    const st=game.levelBuilder.bunker2State;
    if(!st.freed||!st.natalya||st.natalya.dead||st.natalya.health<=0)return false;
    const exit=game.levelBuilder.interactables.find(i=>i.id==='b2_escape_with_natalya');
    return !!exit&&st.natalya.position.distanceTo(exit.position)<=4.8;
  }
  const oldInteract=GAME.interact;
  GAME.interact=function(){
    if(this.currentMissionId!==ID||this.appState!=='PLAYING')
      return oldInteract.call(this);
    const st=this.levelBuilder.bunker2State;
    // Prioridade do leitor ou console mais próximo, sem ativação de outro objeto.
    const items=this.levelBuilder.interactables.filter(x=>!x.completed||x.type==='exit'||x.type==='ally_order');
    items.sort((a,b)=>this.player.pos.distanceTo(a.position)-this.player.pos.distanceTo(b.position));
    const item=items.find(x=>this.player.pos.distanceTo(x.position)<=x.radius);
    if(!item)return;
    const id=item.id;
    if(item.type==='gate_switch')return oldInteract.call(this);
    if(id==='b2_free_natalya'){
      if(complete(this,item,'NATALYA LIBERTADA — ESCOLTA INICIADA')){
        st.freed=true;st.following=true;st.natalya.rescued=true;
        st.routeIndex=0;
        const order=st.waitItem;
        this.levelBuilder.interactables.push(order);
        this.notifyHUD('NATALYA: "VAMOS, JAMES. FICAREI PERTO DE VOCÊ."');
      }
      return;
    }
    if(id==='b2_natalya_orders'){
      st.following=!st.following;
      this.audio.playGadgetBeep(true);
      this.notifyHUD(st.following?'NATALYA: SEGUIR 007':'NATALYA: AGUARDAR EM COBERTURA');
      return;
    }
    if(id==='b2_personnel_log'||id==='b2_casualty_log'){
      const key=id==='b2_personnel_log'?'personnel':'casualty';
      if(complete(this,item,
        key==='personnel'?'REGISTRO DE FUNCIONÁRIOS LIDO':'REGISTRO DE BAIXAS LIDO'))
        st.records[key]=true;
      return;
    }
    if(id==='b2_compare_records'){
      if(!st.records.personnel||!st.records.casualty){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('COMPARE OS REGISTROS: CONSULTE FUNCIONÁRIOS E BAIXAS PRIMEIRO');
        return;
      }
      if(complete(this,item,'ARQUIVO CRUZADO — DISCREPÂNCIAS CONFIRMADAS'))
        st.records.compared=true;
      return;
    }
    if(item.type==='b2_camera'){
      if(item.camera.destroyed)return;
      item.camera.destroyed=true;
      item.camera.head.rotation.x=.4;
      if(item.camera.lens?.material?.color)item.camera.lens.material.color.setHex(0x334155);
      item.completed=true;
      this.audio.playGadgetBeep(true);
      this.notifyHUD('CÂMERA DE SEGURANÇA SABOTADA');
      updateCameras(this);
      return;
    }
    if(id==='b2_get_videotape'||id==='b2_get_manual'){
      if(complete(this,item,id==='b2_get_videotape'?'FITA DE VÍDEO RECUPERADA':
        'MANUAL GOLDENEYE RECUPERADO')){
        if(item.visualMesh)item.visualMesh.visible=false;
      }
      return;
    }
    if(id==='b2_escape_with_natalya'){
      if(!natalyaCloseToDoor(this)){
        this.audio.playGadgetBeep(false);
        this.notifyHUD(st.natalya?.dead?
          'FALHA NA ESCOLTA: NATALYA FOI ATINGIDA':
          'AGUARDE NATALYA JUNTO AO ELEVADOR — ELA PRECISA ESCAPAR COM VOCÊ');
        return;
      }
      return this.tryTriggerMissionExit(id);
    }
    return oldInteract.call(this);
  };

  const oldFire=GAME.fireWeapon;
  GAME.fireWeapon=function(){
    const result=oldFire.call(this);
    if(this.currentMissionId!=='bunker2'||this.appState!=='PLAYING')return result;
    const state=this.levelBuilder.bunker2State;
    if(state?.natalya?.dead){
      this.failMission('NATALYA FOI ATINGIDA — A ESCOLTA FRACASSOU.');
      return result;
    }
    updateCameras(this);
    return result;
  };

  // Personagem acompanhante com rota segura, portões e ordenação explícita.
  function blockedByDoor(level,a,b){
    for(const gate of level.gates){
      if(gate.isOpen && gate.progress>=.85)continue;
      const z=gate.collider.minZ;
      if((a.z-z)*(b.z-z)<=0) return true;
    }
    return false;
  }
  function updateEscort(game,dt){
    const st=game.levelBuilder.bunker2State;
    if(!st?.freed||!st.natalya||st.natalya.dead||!st.following)return;
    const npc=st.natalya,route=st.escortRoute;
    const player=game.player.pos;
    // Evita avançar além do jogador e aguarda em cobertura quando necessário.
    const distance=npc.position.distanceTo(player);
    if(distance<3.1){
      npc.mesh.scale.y=THREE.MathUtils.lerp(npc.mesh.scale.y,.85,Math.min(1,dt*6));
      return;
    }
    const curr=route[st.routeIndex];
    if(!curr){
      st.escortReady=natalyaCloseToDoor(game);return;
    }
    // No corredor, Natalya nunca passa pelo setor que o jogador ainda não visitou.
    if(st.routeIndex>2 && player.z>curr.z+9){
      npc.mesh.scale.y=THREE.MathUtils.lerp(npc.mesh.scale.y,.78,Math.min(1,dt*6));
      return;
    }
    if(blockedByDoor(game.levelBuilder,npc.position,curr)){
      npc.mesh.scale.y=THREE.MathUtils.lerp(npc.mesh.scale.y,.78,Math.min(1,dt*6));
      return;
    }
    // Para antes do portão fechado; não atravessa a parede por um frame longo.
    const dx=curr.x-npc.position.x,dz=curr.z-npc.position.z;
    const len=Math.hypot(dx,dz);
    if(len<.33){
      st.routeIndex=Math.min(route.length,st.routeIndex+1);
      st.escortReady=natalyaCloseToDoor(game);
      return;
    }
    const pace=distance>20?4.65:distance>11?3.75:2.85;
    const step=Math.min(len,pace*dt);
    const nextX=npc.position.x+dx/len*step;
    const nextZ=npc.position.z+dz/len*step;
    const collided=game.levelBuilder.colliders.some(c=>
      c.minX<c.maxX&&(c.maxY??5)>.45&&(c.minY??0)<1.5 &&
      nextX+.33>c.minX&&nextX-.33<c.maxX &&
      nextZ+.33>c.minZ&&nextZ-.33<c.maxZ);
    if(collided)return;
    npc.position.set(nextX,0,nextZ);
    npc.mesh.position.copy(npc.position);
    npc.mesh.rotation.y=Math.atan2(dx,dz);
    npc.mesh.scale.y=THREE.MathUtils.lerp(npc.mesh.scale.y,1,Math.min(1,dt*6));
    st.waitItem.position.set(npc.position.x,1.2,npc.position.z);
    st.escortReady=natalyaCloseToDoor(game);
  }

  const oldUpdate=GAME.update;
  GAME.update=function(dt){
    oldUpdate.call(this,dt);
    if(this.currentMissionId!==ID)return;
    if(this.appState==='MENU'){
      const t=performance.now()*.00017;
      this.camera.position.set(9+Math.sin(t)*5,3.2,-68);
      this.camera.lookAt(-16,1.8,-88);
      return;
    }
    if(this.appState==='CUTSCENE_INTRO'){
      const p=Math.min(1,this.cutsceneTimer/4.2);
      this.camera.position.set(1+p*2,4.2-p*2.55,51-p*8);
      this.camera.lookAt(0,1.5,25);
      return;
    }
    if(this.appState==='CUTSCENE_OUTRO'){
      const p=Math.min(1,this.cutsceneTimer/4);
      if(this.levelBuilder.bunker2State?.exitDoor)
        this.levelBuilder.bunker2State.exitDoor.position.y=1.65+p*3.5;
      this.camera.position.set(7-p*7,2.9+p*3,-133-p*9);
      this.camera.lookAt(0,1.5,-141);
      return;
    }
    if(this.appState!=='PLAYING')return;
    const st=this.levelBuilder.bunker2State;
    updateCameras(this);
    if(st.natalya.dead||st.natalya.health<=0){
      this.failMission('NATALYA NÃO SOBREVIVEU — MISSÃO ENCERRADA.');
      return;
    }
    updateEscort(this,dt);
    const ally=document.getElementById('bunker2-ally-status');
    if(ally){
      ally.classList.remove('hidden');
      ally.textContent=!st.freed?'NATALYA: ENCARCERADA':
        'NATALYA: '+(st.following?'SEGUINDO':'AGUARDANDO')+
        ' · SAÚDE '+Math.max(0,Math.round(st.natalya.health))+'%'+
        ' · '+Math.round(st.natalya.position.distanceTo(this.player.pos))+'m';
    }
    // Alarme ocasiona no máximo dois guardas extras, nunca um fluxo infinito.
    const alarmCount=this.stats?.alarmsTriggered||0;
    if(alarmCount>0&&st.limitedReinforcements===0){
      st.limitedReinforcements=1;
      this.bunker2ReinforcementDelay=7;
      this.notifyHUD('ALERTA DE SEGURANÇA — REFORÇOS LIMITADOS A CAMINHO');
    }
    if(st.limitedReinforcements===1){
      this.bunker2ReinforcementDelay-=dt;
      if(this.bunker2ReinforcementDelay<=0){
        const cfg=MISSIONS_DATA[ID].difficulties[this.difficulty];
        for(const spawn of st.reinforcementSpawns)
          this.guards.push(new GuardAgent(this.scene,spawn,cfg,this.audio));
        st.limitedReinforcements=2;
      }
    }
    // Dano apenas quando um guarda encontra Natalya em campo aberto próximo.
    this.bunker2DamageTimer=(this.bunker2DamageTimer||0)-dt;
    if(st.freed&&this.bunker2DamageTimer<=0){
      this.bunker2DamageTimer=1.3;
      const threat=this.guards.find(g=>g.state==='ALERTED'&&
        g.pos.distanceTo(st.natalya.position)<9.5&&
        hasLineOfSight(new THREE.Vector3(g.pos.x,1.4,g.pos.z),
          new THREE.Vector3(st.natalya.position.x,1.35,st.natalya.position.z),
          this.levelBuilder.colliders));
      if(threat){
        st.natalya.health=Math.max(0,st.natalya.health-7);
        st.natalya.mesh.scale.y=.72;
        if(st.natalya.health<=0){
          st.natalya.dead=true;
          this.failMission('NATALYA FOI MORTA POR UM GUARDA — ESCOLTA FRACASSADA.');
        }else this.notifyHUD('NATALYA SOB FOGO: APROXIME-SE E NEUTRALIZE A AMEAÇA');
      }
    }
  };
  window.addEventListener('load',paint);
})();