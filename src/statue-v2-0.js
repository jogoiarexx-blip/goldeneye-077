/**
 * GoldenEye 007 Remastered — STATUE / St. Petersburg (v2.0)
 * GDD seção 7.10: Valentin -> Janus -> helicóptero -> Natalya -> gravador.
 * Cena criada com geometrias leves para GitHub Pages; sem modelos externos.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof DamLevelBuilder === 'undefined' ||
      typeof GoldenEyeDamGame === 'undefined' || typeof MISSIONS_DATA === 'undefined') return;

  const ID='statue', SAVE='ge007_statue_unlocked';
  let unlockedHere=false;
  const OBJECTIVES={
    valentin:{id:'st_valentin',title:'Localizar Valentin e obter o contato com Janus',type:'contact'},
    janus:{id:'st_janus',title:'Confrontar Janus no parque das estátuas',type:'contact'},
    heli:{id:'st_helicopter',title:'Localizar o helicóptero usado por Janus',type:'recon'},
    natalya:{id:'st_natalya',title:'Encontrar Natalya e resgatá-la',type:'rescue'},
    recorder:{id:'st_flight_recorder',title:'Recuperar o gravador de voo do helicóptero',type:'item'},
    exit:{id:'st_exit',title:'Deixar o parque com as informações',type:'exit'}
  };
  const tasks=(...names)=>names.map(key=>({...OBJECTIVES[key]}));
  MISSIONS_DATA[ID]={
    id:ID,title:'STATUE — PARQUE DAS ESTÁTUAS',
    subtitle:'Missão 10 — St. Petersburg: Investigação',
    introTag:'STATUE_INTRO // SÃO PETERSBURGO',
    introSub:'"Uma negociação sombria aguarda Bond no parque. Comece por encontrar Valentin."',
    outroTag:'STATUE_OUTRO // A PISTA DE JANUS',
    outroSub:'"Natalya está a salvo, a caixa-preta foi recuperada e Janus revelou a próxima pista."',
    briefingM:'"Encontre Valentin, obtenha a localização de Janus e confronte-o. Rastreie a aeronave, encontre Natalya e recupere o gravador antes de deixar o parque."',
    briefingQ:'"Os marcos principais estão ligados por caminhos de pedra. Primeiro fale com Valentin na clareira oeste; Janus só aparece após o contato. A pista da caixa-preta será revelada quando Natalya estiver segura."',
    spawn:{x:0,y:1.65,z:50,yaw:0},
    difficulties:{
      AGENT:{label:'AGENT',guardHp:68,guardDamage:9,guardReaction:1.0,
        objectives:tasks('valentin','janus','heli','natalya','exit')},
      SECRET_AGENT:{label:'SECRET AGENT',guardHp:90,guardDamage:13,guardReaction:.72,
        objectives:tasks('valentin','janus','heli','natalya','exit')},
      '00_AGENT':{label:'00 AGENT',guardHp:114,guardDamage:18,guardReaction:.48,
        objectives:tasks('valentin','janus','heli','natalya','recorder','exit')}
    }
  };

  const unlocked=()=>{
    if(unlockedHere)return true;
    try{
      if(localStorage.getItem(SAVE)==='1')return true;
      return ['AGENT','SECRET_AGENT','00_AGENT'].some(d=>
        localStorage.getItem('ge007_bunker2_best_'+d)!==null);
    }catch(_){return false}
  };
  function paintButton(){
    const button=document.querySelector('[data-mission="statue"]');
    if(!button)return;
    const locked=!unlocked();
    button.style.opacity=locked?'.62':'1';
    button.setAttribute('aria-disabled',String(locked));
    button.setAttribute('aria-label',locked?
      'Statue bloqueada: conclua Bunker 2':'Selecionar missão 10 Statue');
    const status=button.querySelector('.statue-status');
    if(status)status.textContent=locked?'BLOQUEADA':'LIBERADA';
  }

  const WORLD=DamLevelBuilder.prototype, oldBuild=WORLD.build,
    oldEnv=WORLD.updateEnvironment;

  WORLD.buildStatueLevel=function(){
    const v=(x,y,z)=>new THREE.Vector3(x,y,z);
    const m=(color,metalness=.09,roughness=.85)=>
      new THREE.MeshStandardMaterial({color,metalness,roughness});
    const stone=m(0x637386,.04,.92),darkStone=m(0x354254,.06,.9);
    const weathered=m(0x82909b,.04,.95),bronze=m(0x606c64,.58,.58);
    const path=m(0x52616b,.11,.92),earth=m(0x1e3031,.08,.99);
    const moss=m(0x1c3630,.05,.97),metal=m(0x273544,.72,.38);
    const heliMetal=m(0x424e5a,.51,.52),windowGlass=m(0x0d405c,.41,.3);
    const amber=new THREE.MeshBasicMaterial({color:0xfbbf24});
    const cyan=new THREE.MeshBasicMaterial({color:0x38bdf8});
    const green=new THREE.MeshBasicMaterial({color:0x22c55e});
    const fogMat=new THREE.MeshBasicMaterial({
      color:0x97b9c0,transparent:true,opacity:.082,
      depthWrite:false,side:THREE.DoubleSide
    });
    this.bounds={minX:-49,maxX:49,minZ:-225,maxZ:60,isDam:false};
    this.statueState={
      valentinMet:false,janusMet:false,heliLocated:false,natalyaRescued:false,
      recorderFound:false,recorderRevealed:false,natalya:null,
      janus:null,janusItem:null,recorderItem:null,rotor:null,heli:null,
      statueLights:[],fogPlanes:[],cueTimer:0,sceneCue:null,
      aliveGuards:0,exitDoor:null,extraction:false
    };
    const st=this.statueState;
    // Exterior grande, sem física nos pisos, caminhos ou sombras falsas.
    this.addBox(0,-.57,-83,104,1,296,earth,false,false);
    this.addBox(0,-.055,-83,6.4,.075,278,path,false,false);
    for(const [x,z,w,d] of [
      [-15,-28,29,5], [15,-89,31,5],[-13,-146,28,5],
      [15,-178,30,5],[-13,-150,27,4],[-13,-215,28,4]
    ])this.addBox(x,-.03,z,w,.065,d,path,false,false);
    // Trilhas laterais para alcançarem as clareiras sem estreitar a rota principal.
    for(const [x,z,w,d] of [
      [-30,-40,5,25], [30,-100,5,24],[-31,-151,5,23],
      [29,-187,5,24],[-16,-168,4,34]
    ])this.addBox(x,-.02,z,w,.07,d,path,false,false);

    // Lotes de pedra na periferia e fragmentos do parque.
    for(let i=0;i<24;i++){
      const x=(i%2===0?-1:1)*(39+(i%5)*1.5);
      const z=46-i*11;
      const rock=new THREE.Mesh(
        new THREE.DodecahedronGeometry(.8+(i%4)*.42,0),
        i%3?stone:darkStone
      );
      rock.position.set(x,.38,z);
      rock.scale.y=.47;
      this.levelGroup.add(rock);
    }

    // Estátuas com pedestal sólido, silhueta de cabeça e braços reconhecível.
    // Usam materiais compartilhados e polígonos moderados, sem modelos GLB.
    const statue=(x,z,scale,variant)=>{
      const base=this.addBox(x,.72*scale,z,3.6*scale,1.44*scale,
        3.6*scale,darkStone,true);
      base.receiveShadow=true;
      const figure=new THREE.Group();
      figure.position.set(x,1.47*scale,z);
      const coat=new THREE.Mesh(new THREE.CylinderGeometry(.52*scale,.85*scale,
        2.3*scale,8),variant?bronze:weathered);
      coat.position.y=1.4*scale;
      const head=new THREE.Mesh(new THREE.SphereGeometry(.43*scale,8,7),
        variant?bronze:weathered);
      head.position.y=2.9*scale;
      const arm1=new THREE.Mesh(new THREE.BoxGeometry(.32*scale,1.6*scale,.35*scale),variant?bronze:weathered);
      const arm2=arm1.clone();
      arm1.position.set(-.75*scale,1.84*scale,0);
      arm2.position.set(.75*scale,1.84*scale,0);
      arm1.rotation.z=.31;arm2.rotation.z=-.4;
      figure.add(coat,head,arm1,arm2);
      this.levelGroup.add(figure);
      return figure;
    };
    // Disposição fora dos três caminhos principais, mas com cobertura tática.
    for(const [x,z,scale,kind] of [
      [-14,28,1.05,0],[17,15,.83,1],[-13,-6,1.1,0],
      [16,-25,.9,1],[-14,-56,1.22,1],[15,-68,.9,0],
      [-13,-111,.95,1],[14,-125,1.1,0],
      [-12,-176,.85,0],[14,-199,1.05,1],
      [-40,-98,1.3,0],[40,-156,1.22,1]
    ])statue(x,z,scale,kind);

    // Monumento principal que indica a área do encontro de Janus.
    const obelisk=this.addBox(29,2.5,-90,3.8,5.0,3.8,stone,true);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(2.2,3.3,4),weathered);
    tip.position.set(29,6.65,-90);
    tip.rotation.y=Math.PI/4;
    this.levelGroup.add(tip);
    // Ruínas elevadas e túneis (arcos visuais; corredor central permanece aberto).
    for(const z of [-48,-119,-173]){
      for(const x of [-6.7,6.7]){
        this.addBox(x,2.6,z,2.25,5.2,3.7,stone,true);
      }
      const cap=new THREE.Mesh(new THREE.BoxGeometry(16.0,1.1,3.8),darkStone);
      cap.position.set(0,5.1,z);
      this.levelGroup.add(cap);
    }
    for(const z of [-62,-146]){
      // Plataformas decorativas que criam altura visual e caminhos laterais.
      for(const x of [-29,29]){
        const plinth=this.addBox(x,.31,z,8,.62,9,stone,false,false);
        plinth.receiveShadow=true;
        const rail=new THREE.Mesh(new THREE.BoxGeometry(7.5,.23,.43),weathered);
        rail.position.set(x,1.06,z-4.3);
        this.levelGroup.add(rail);
      }
    }

    // Frio noturno, poucos projetores: silhuetas legíveis sem muitos shadow maps.
    const hemi=new THREE.HemisphereLight(0x93b6da,0x06141c,.82);
    this.levelGroup.add(hemi);
    const moon=new THREE.DirectionalLight(0xbcd7ff,.78);
    moon.position.set(-42,50,21);
    moon.castShadow=false;
    this.levelGroup.add(moon);
    for(const [x,z] of [[-29,-32],[29,-89],[-24,-145],[28,-181],[-4,-209]]){
      const light=new THREE.PointLight(0x7fc9ee,.78,27);
      light.position.set(x,4.3,z);
      this.levelGroup.add(light);
      st.statueLights.push(light);
    }
    // Névoa em planos transparentes; nenhuma textura carregada e poucas draw calls.
    for(let i=0;i<9;i++){
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(58,5),fogMat.clone());
      const x=(i%2?11:-12)+(i%3)*2.4;
      plane.position.set(x,2.2,-10-i*24);
      plane.rotation.y=(i%3-1)*.27;
      plane.raycast=()=>{};
      this.levelGroup.add(plane);
      st.fogPlanes.push(plane);
    }
    const murk=new Float32Array(130*3);
    for(let i=0;i<130;i++){
      murk[i*3]=(Math.random()-.5)*90;
      murk[i*3+1]=.3+Math.random()*9;
      murk[i*3+2]=-214+Math.random()*266;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(murk,3));
    const dust=new THREE.Points(geo,new THREE.PointsMaterial({
      color:0xd5e8ed,size:.21,transparent:true,opacity:.32,
      depthWrite:false,sizeAttenuation:true
    }));
    dust.raycast=()=>{};
    this.levelGroup.add(dust);
    st.dust=dust;

    // Contato primeiro: Valentin na clareira oeste.
    this.addCharacterNPC('st_valentin_npc','contact',-29,-31,Math.PI,0x475e68);
    const val=this.npcs[this.npcs.length-1];
    val.mesh.scale.set(1.24,1.1,1.08);
    st.valentin=val;
    const contactMarker=new THREE.Mesh(new THREE.SphereGeometry(.2,9,6),amber);
    contactMarker.position.set(-29,2.18,-31);
    this.levelGroup.add(contactMarker);
    this.interactables.push({
      id:'st_valentin',type:'st_contact',position:v(-29,1.2,-31),
      radius:3.0,completed:false,visualMesh:contactMarker,
      prompt:'Pressione [E] para conversar com Valentin'
    });

    // Janus só entra na cena após Valentin revelar o ponto de encontro.
    this.addCharacterNPC('st_janus_npc','contact',27,-94,Math.PI,0x263d45);
    const janus=this.npcs[this.npcs.length-1];
    janus.mesh.visible=false;
    st.janus=janus;
    const janusMarker=new THREE.Mesh(new THREE.SphereGeometry(.23,10,8),cyan);
    janusMarker.position.set(27,2.15,-94);
    janusMarker.visible=false;
    this.levelGroup.add(janusMarker);
    const janusItem={
      id:'st_janus',type:'st_reveal',
      position:v(27,1.2,-94),radius:0,
      completed:false,visualMesh:janusMarker,
      prompt:'Pressione [E] para confrontar Janus'
    };
    this.interactables.push(janusItem);
    st.janusItem=janusItem;

    // Helicóptero abandonado: componente central, pás, cauda e caixa de inspeção.
    const xh=-27,zh=-147;
    const helipad=new THREE.Mesh(new THREE.CylinderGeometry(8,8,.2,24),stone);
    helipad.position.set(xh,.08,zh);
    this.levelGroup.add(helipad);
    const helicopter=new THREE.Group();
    helicopter.position.set(xh,0,zh);
    const hull=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.48,4.8,9),heliMetal);
    hull.rotation.x=Math.PI/2;hull.position.set(0,2.2,0);
    const canopy=new THREE.Mesh(new THREE.SphereGeometry(1.25,10,8),windowGlass);
    canopy.scale.set(1.1,.75,1.3);canopy.position.set(0,2.4,-2);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(.28,.35,5.4),metal);
    tail.position.set(0,2.6,3.7);
    const rotor=new THREE.Group();
    rotor.position.set(0,3.38,0);
    rotor.add(new THREE.Mesh(new THREE.BoxGeometry(9.4,.1,.24),metal),
      new THREE.Mesh(new THREE.BoxGeometry(.24,.1,9.4),metal));
    helicopter.add(hull,canopy,tail,rotor);
    for(const x of [-1.2,1.2]){
      const skid=new THREE.Mesh(new THREE.BoxGeometry(.12,.16,4.2),metal);
      skid.position.set(x,.65,0);
      helicopter.add(skid);
    }
    this.levelGroup.add(helicopter);
    this.addBox(xh,1.45,zh,2.4,2.9,4.9,metal,true);
    st.heli=helicopter;st.rotor=rotor;
    const heliMarker=new THREE.Mesh(new THREE.BoxGeometry(.7,.45,.3),amber.clone());
    heliMarker.position.set(-23.9,1.25,zh);
    this.levelGroup.add(heliMarker);
    this.interactables.push({
      id:'st_helicopter',type:'st_recon',completed:false,
      position:v(-23.9,1.25,zh),radius:3.2,visualMesh:heliMarker,
      prompt:'Pressione [E] para investigar o helicóptero'
    });

    // Natalya aguarda perto das ruínas; contato somente após rastrear o helicóptero.
    this.addCharacterNPC('st_natalya_npc','scientist',29,-182,Math.PI,0x7b8b62);
    const natalya=this.npcs[this.npcs.length-1];
    natalya.isNatalya=true;
    natalya.health=100;
    st.natalya=natalya;
    const natMark=new THREE.Mesh(new THREE.SphereGeometry(.19,8,6),amber.clone());
    natMark.position.set(29,2.15,-182);
    this.levelGroup.add(natMark);
    this.interactables.push({
      id:'st_natalya',type:'st_rescue',completed:false,
      position:v(29,1.25,-182),radius:3.1,visualMesh:natMark,
      prompt:'Pressione [E] para encontrar e retirar Natalya da zona de perigo'
    });

    // O gravador real só materializa após Janus+helicóptero+resgate.
    const recorder=new THREE.Group();
    recorder.position.set(-25,1.18,-151);
    const caseBody=new THREE.Mesh(new THREE.BoxGeometry(.85,.52,.61),
      new THREE.MeshStandardMaterial({color:0xf97316,metalness:.29,roughness:.55}));
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.2,.045,8,10),metal);
    handle.position.y=.35;
    recorder.add(caseBody,handle);
    recorder.visible=false;
    this.levelGroup.add(recorder);
    const recordItem={
      id:'st_flight_recorder',type:'st_recorder',
      completed:false,available:false,
      position:v(-25,1.2,-151),radius:0,
      visualMesh:caseBody,
      prompt:'Pressione [E] para recolher o gravador de voo'
    };
    this.interactables.push(recordItem);
    st.recorderItem=recordItem;
    st.recorderMesh=recorder;

    // O caminho de saída não encerra antes das cenas/objetivos necessários.
    const exitGate=new THREE.Mesh(new THREE.BoxGeometry(5.4,3.5,.35),metal);
    exitGate.position.set(0,1.75,-218);
    const exitLight=new THREE.Mesh(new THREE.BoxGeometry(2,.2,.21),green);
    exitLight.position.set(0,3.82,-217.7);
    this.levelGroup.add(exitGate,exitLight);
    st.exitGate=exitGate;
    this.interactables.push({
      id:'st_exit',type:'exit',position:v(0,1.25,-216),
      radius:3.6,completed:false,visualMesh:exitGate,
      prompt:'Pressione [E] para deixar o parque com as provas'
    });

    // Cobertura e nove patrulhas; sem spawn infinito.
    for(const [x,z]of [[-7,11],[9,-15],[-9,-78],[8,-112],[-9,-181],[8,-201]])
      this.addBox(x,.62,z,2.1,1.24,1.6,darkStone,true);
    this.addPickup('ammo',-9,.55,-74);
    this.addPickup('armor',11,.8,-128);
    const patrol=(a,b)=>({
      pos:v(a[0],0,a[1]),
      patrol:[v(a[0],0,a[1]),v(b[0],0,b[1])]
    });
    this.guardSpawns=[
      patrol([-9,32],[9,25]),
      patrol([-34,-8],[-33,-18]),
      patrol([14,-39],[12,-51]),
      patrol([-12,-71],[-7,-80]),
      patrol([36,-113],[31,-121]),
      patrol([-12,-122],[-7,-133]),
      patrol([-37,-166],[-36,-177]),
      patrol([15,-188],[10,-199]),
      patrol([8,-207],[5,-213])
    ];
  };

  WORLD.build=function(mission='dam'){
    if(mission!==ID){this.statueState=null;return oldBuild.call(this,mission)}
    this.bunker2State=null;this.surface2State=null;this.frigateState=null;
    this.siloState=null;this.bunker1=null;this.surface1=null;
    this.clear();this.buildStatueLevel();
    this.scene.background=new THREE.Color(0x253b45);
    this.scene.fog=new THREE.FogExp2(0x253b45,.0125);
  };
  WORLD.updateEnvironment=function(dt,t){
    oldEnv.call(this,dt,t);
    const st=this.statueState;
    if(!st)return;
    for(let i=0;i<st.fogPlanes.length;i++){
      const p=st.fogPlanes[i];
      p.position.x+=(Math.sin(t*.6+i)*.015)*dt*60;
      p.material.opacity=.065+Math.sin(t*.35+i)*.013;
    }
    if(st.dust){
      const a=st.dust.geometry.getAttribute('position');
      for(let j=0;j<a.array.length;j+=3){
        a.array[j]+=.11*dt;
        if(a.array[j]>46)a.array[j]=-46;
      }
      a.needsUpdate=true;
    }
    for(let i=0;i<st.statueLights.length;i++)
      st.statueLights[i].intensity=.70+Math.sin(t*.63+i)*.045;
  };

  const GAME=GoldenEyeDamGame.prototype, oldSelect=GAME.selectMission;
  GAME.selectMission=function(id){
    if(id===ID&&!unlocked()){
      document.getElementById('dossier-mission-subtitle').textContent=
        'STATUE bloqueada — conclua Bunker 2 para liberar.';
      paintButton();return;
    }
    oldSelect.call(this,id);paintButton();
  };
  const oldSuccess=GAME.completeMissionSuccess;
  GAME.completeMissionSuccess=function(){
    const finished=this.currentMissionId;
    oldSuccess.call(this);
    const next=document.getElementById('btn-results-next');
    if(finished==='bunker2'){
      unlockedHere=true;
      try{localStorage.setItem(SAVE,'1')}catch(_){}
      next.textContent='Próxima Fase: Statue';
      next.dataset.nextMission=ID;
      next.classList.remove('hidden');
      document.getElementById('results-subtitle').textContent=
        'Bunker 2 concluído! Próxima missão liberada: Statue, São Petersburgo.';
      paintButton();
    }else if(finished===ID){
      next.classList.add('hidden');
      document.getElementById('results-subtitle').textContent=
        'Statue concluída! Próxima missão do GDD: Archives (em desenvolvimento).';
    }
  };

  const oldStart=GAME.startMission;
  GAME.startMission=function(){
    this.statueMoment=null;
    const panel=document.getElementById('statue-cinematic');
    if(panel)panel.classList.add('hidden');
    oldStart.call(this);
    if(this.currentMissionId===ID){
      const st=this.levelBuilder.statueState;
      st.cueTimer=0;
      st.valentinMet=false;st.janusMet=false;st.heliLocated=false;
      st.natalyaRescued=false;st.recorderFound=false;st.recorderRevealed=false;
    }
  };
  function complete(game,item,msg){
    if(item.completed)return false;
    item.completed=true;
    const o=game.objectives.find(o=>o.id===item.id);
    if(o)o.completed=true;
    if(item.visualMesh?.material?.color)item.visualMesh.material.color.setHex(0x22c55e);
    game.audio.playGadgetBeep(true);
    game.notifyHUD(msg);
    game.updateHUD();
    return true;
  }
  // Microcena na HUD: suspende o FPS por poucos segundos, mas não pula objetivos.
  function startMoment(game,tag,text,focus,duration=3.25){
    game.statueMoment={tag,text,focus:focus.clone(),duration,elapsed:0};
    game.appState='STATUE_SCENE';
    game.weaponMeshGroup.visible=false;
    const el=document.getElementById('statue-cinematic');
    if(el){
      el.textContent=tag+'  ·  '+text;
      el.classList.remove('hidden');
    }
  }
  function revealRecorder(game){
    const st=game.levelBuilder.statueState;
    if(st.recorderRevealed||!st.heliLocated||!st.natalyaRescued)return;
    st.recorderRevealed=true;
    st.recorderMesh.visible=true;
    st.recorderItem.available=true;
    st.recorderItem.radius=3.0;
    game.notifyHUD('GRAVADOR LOCALIZADO — RETORNE AO HELICÓPTERO');
  }
  const oldInteract=GAME.interact;
  GAME.interact=function(){
    if(this.currentMissionId!==ID||this.appState!=='PLAYING')
      return oldInteract.call(this);
    const st=this.levelBuilder.statueState;
    const items=this.levelBuilder.interactables
      .filter(i=>!i.completed||i.type==='exit')
      .sort((a,b)=>this.player.pos.distanceTo(a.position)-this.player.pos.distanceTo(b.position));
    const item=items.find(i=>i.radius>0 &&
      this.player.pos.distanceTo(i.position)<=i.radius);
    if(!item)return;
    if(item.id==='st_valentin'){
      if(complete(this,item,'VALENTIN: LOCAL DE ENCONTRO COM JANUS REVELADO')){
        st.valentinMet=true;
        st.janus.mesh.visible=true;
        st.janusItem.radius=3.1;
        st.janusItem.visualMesh.visible=true;
        startMoment(this,'VALENTIN',
          'Janus está no obelisco do setor leste. Vá com cuidado.',
          st.valentin.position,3.1);
      }
      return;
    }
    if(item.id==='st_janus'){
      if(!st.valentinMet){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('CONTATO NEGADO — ENCONTRE VALENTIN PRIMEIRO');return;
      }
      if(complete(this,item,'JANUS CONFRONTADO — LOCAL DA AERONAVE IDENTIFICADO')){
        st.janusMet=true;
        st.janus.mesh.visible=false;
        startMoment(this,'JANUS',
          'O responsável pelo ataque se revela. Uma aeronave abandonada guarda a próxima pista.',
          st.janus.position,3.9);
      }
      return;
    }
    if(item.id==='st_helicopter'){
      if(!st.janusMet){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('INVESTIGAÇÃO INCOMPLETA — CONFRONTE JANUS ANTES DA AERONAVE');
        return;
      }
      if(complete(this,item,'HELICÓPTERO LOCALIZADO — PROCURE NATALYA')){
        st.heliLocated=true;
        startMoment(this,'HELICÓPTERO',
          'A aeronave de Janus foi encontrada. O gravador pode conter os registros do voo.',
          st.heli.position.clone().add(new THREE.Vector3(0,2,0)),3.0);
      }
      return;
    }
    if(item.id==='st_natalya'){
      if(!st.heliLocated){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('VIGIE A CLAREIRA — LOCALIZE A AERONAVE PRIMEIRO');
        return;
      }
      if(st.natalya.dead){
        this.failMission('NATALYA FOI FERIDA — MISSÃO FRACASSADA');return;
      }
      if(complete(this,item,'NATALYA RESGATADA — PISTA DA CAIXA-PRETA LIBERADA')){
        st.natalyaRescued=true;
        st.natalya.mesh.position.x+=1.6;
        st.natalya.position.copy(st.natalya.mesh.position);
        revealRecorder(this);
        startMoment(this,'NATALYA',
          'Estou viva, James. A caixa-preta ficou perto dos destroços do helicóptero.',
          st.natalya.position,3.1);
      }
      return;
    }
    if(item.id==='st_flight_recorder'){
      if(!item.available||!st.natalyaRescued||!st.heliLocated){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('GRAVADOR INDISPONÍVEL — ENCONTRE NATALYA E O HELICÓPTERO');
        return;
      }
      if(complete(this,item,'GRAVADOR DE VOO RECUPERADO — PROVA SEGURA')){
        st.recorderFound=true;
        st.recorderMesh.visible=false;
      }
      return;
    }
    if(item.id==='st_exit'){
      if(!st.valentinMet||!st.janusMet||!st.heliLocated||!st.natalyaRescued){
        this.audio.playGadgetBeep(false);
        this.notifyHUD('MISSÃO INCOMPLETA: VALENTIN, JANUS, HELICÓPTERO E NATALYA');
        return;
      }
      return this.tryTriggerMissionExit(item.id);
    }
    return oldInteract.call(this);
  };

  // Tom lateralizado, curto e original, sem arquivos de som.
  function cue(game,position){
    const ctx=game.audio?.ctx;
    if(!game.audio?.enabled||!ctx||ctx.state!=='running')return;
    if(!ctx.createStereoPanner||!ctx.createOscillator||!ctx.createGain)return;
    const dx=position.x-game.player.pos.x;
    const dz=position.z-game.player.pos.z;
    const d=Math.hypot(dx,dz);
    if(d>22||d<1)return;
    const pan=Math.max(-.85,Math.min(.85,
      (dx*Math.cos(game.player.yaw)-dz*Math.sin(game.player.y))/d));
    const now=ctx.currentTime;
    const tone=ctx.createOscillator();
    const panNode=ctx.createStereoPanner(),gain=ctx.createGain();
    tone.type='sine';
    tone.frequency.setValueAtTime(360+(22-d)*8,now);
    tone.frequency.exponentialRampToValueAtTime(230,now+.17);
    panNode.pan.setValueAtTime(pan,now);
    gain.gain.setValueAtTime(.065,now);
    gain.gain.exponentialRampToValueAtTime(.001,now+.18);
    tone.connect(gain);gain.connect(panNode);panNode.connect(ctx.destination);
    tone.start(now);tone.stop(now+.19);
  }

  const oldFire=GAME.fireWeapon;
  GAME.fireWeapon=function(){
    const result=oldFire.call(this);
    if(this.currentMissionId!==ID||this.appState!=='PLAYING')return result;
    const npc=this.levelBuilder.statueState?.natalya;
    if(npc?.dead)this.failMission('NATALYA FOI ATINGIDA — RESGATE FRACASSADO');
    return result;
  };

  const oldUpdate=GAME.update;
  GAME.update=function(dt){
    oldUpdate.call(this,dt);
    if(this.currentMissionId!==ID)return;
    const st=this.levelBuilder.statueState;
    if(!st)return;
    if(this.appState==='MENU'){
      const t=performance.now()*.00015;
      this.camera.position.set(11+Math.sin(t)*14,8.5,-48+Math.cos(t)*12);
      this.camera.lookAt(29,4,-90);
      return;
    }
    if(this.appState==='CUTSCENE_INTRO'){
      const p=Math.min(1,this.cutsceneTimer/4.2);
      this.camera.position.set(-24+24*p,9-7.35*p,59-9*p);
      this.camera.lookAt(0,1.5,-18);
      return;
    }
    if(this.appState==='CUTSCENE_OUTRO'){
      const p=Math.min(1,this.cutsceneTimer/4);
      st.exitGate.position.y=1.75+3.4*p;
      this.camera.position.set(9+7*p,4.5+7*p,-205-18*p);
      this.camera.lookAt(0,2.5,-217);
      return;
    }
    if(this.appState==='STATUE_SCENE'&&this.statueMoment){
      const c=this.statueMoment;
      c.elapsed+=dt;
      const t=Math.min(1,c.elapsed/c.duration);
      const angle=(t-.5)*.82;
      this.camera.position.set(
        c.focus.x+Math.sin(angle)*4.5,
        2.6+Math.sin(t*Math.PI)*.55,
        c.focus.z+3.6+Math.cos(angle)*.6
      );
      this.camera.lookAt(c.focus);
      if(c.elapsed>=c.duration){
        this.statueMoment=null;
        const el=document.getElementById('statue-cinematic');
        if(el)el.classList.add('hidden');
        this.appState='PLAYING';
        this.weaponMeshGroup.visible=true;
        this.camera.position.copy(this.player.pos);
        this.camera.rotation.order='YXZ';
        this.camera.rotation.y=this.player.yaw;
        this.camera.rotation.x=this.player.pitch;
        this.updateHUD();
      }
      return;
    }
    if(this.appState!=='PLAYING')return;
    if(st.natalya.dead){
      this.failMission('NATALYA NÃO SOBREVIVEU — OPERAÇÃO ABORTADA');
      return;
    }
    st.cueTimer-=dt;
    if(st.cueTimer<=0){
      const id=!st.valentinMet?'st_valentin':
        !st.janusMet?'st_janus':
        !st.heliLocated?'st_helicopter':
        !st.natalyaRescued?'st_natalya':
        !st.recorderFound?'st_flight_recorder':'st_exit';
      const item=this.levelBuilder.interactables.find(x=>x.id===id);
      if(item&&item.radius>0)cue(this,item.position);
      st.cueTimer=5.4;
    }
    // Encontro com Janus faz a guarnição procurar Bond; sem criar spawn infinito.
    if(st.janusMet&&this.guards.length){
      const nearby=this.guards.filter(g=>g.state!=='DEAD'&&g.pos.distanceTo(this.player.pos)<23);
      if(nearby.length && !st.janusAlarmTriggered){
        st.janusAlarmTriggered=true;
        nearby[0].setAlerted?.();
        this.notifyHUD('PATRULHAS DE JANUS ALERTADAS — USE AS ESTÁTUAS COMO COBERTURA');
      }
    }
  };
  window.addEventListener('load',paintButton);
})();