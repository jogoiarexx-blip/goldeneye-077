/**
 * Dam Rework v2.0.1 — bungee jogável, câmera cinematográfica e soldados táticos.
 * Patch isolado da primeira missão. Carregar por último, depois de Statue.
 */
(() => {
  'use strict';
  if(typeof THREE==='undefined'||typeof DamLevelBuilder==='undefined'||
     typeof GoldenEyeDamGame==='undefined'||typeof GuardAgent==='undefined')return;

  const GAME=GoldenEyeDamGame.prototype;
  const GUARD=GuardAgent.prototype;
  const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n)};
  const mix=(a,b,t)=>a+(b-a)*t;

  // Limite da represa antes era X=-9.1, a passarela utilizável vai até X=-14.9.
  // Expande o movimento SOMENTE no acesso do bungee, sem permitir atravessar
  // o parapeto ou caminhar fora do tabuleiro principal.
  const priorCollision=GAME.resolvePlayerCollision;
  GAME.resolvePlayerCollision=function(next){
    const b=this.levelBuilder.bounds;
    if(this.currentMissionId!=='dam'||!b?.isDam||
       next.z < -121.6||next.z > -114.5||
       next.x >= -8.4)return priorCollision.call(this,next);
    const saved=b.minX;
    b.minX=-15.95;
    try{return priorCollision.call(this,next)}
    finally{b.minX=saved}
  };

  // Enriquecimento dos modelos dos inimigos de Dam, sem carregar texturas/GLB.
  const tacticalMaterials={
    strap:new THREE.MeshStandardMaterial({color:0x182a25,roughness:.92}),
    armor:new THREE.MeshStandardMaterial({color:0x263c32,roughness:.81,metalness:.08}),
    leather:new THREE.MeshStandardMaterial({color:0x202226,roughness:.91}),
    badge:new THREE.MeshBasicMaterial({color:0xb6b4a1}),
    lens:new THREE.MeshStandardMaterial({color:0x121b25,roughness:.27,metalness:.36}),
    glove:new THREE.MeshStandardMaterial({color:0x1d2529,roughness:.88})
  };
  const box=(w,h,d,mat)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  const add=(parent,obj,x,y,z)=>{
    obj.position.set(x,y,z);
    parent.add(obj);
    return obj;
  };
  function dress(guard,index){
    if(guard.damEnhanced)return;
    guard.damEnhanced=true;
    guard.damRole=index===8?'DEFESA FINAL':index===0?'VIGIA':index===6?'ATIRADOR':'PATRULHA';
    const torso=guard.torsoGroup;
    // Alças, rádio, coldre, placas de proteção e joelheiras.
    for(const side of [-1,1]){
      const harness=add(torso,box(.078,.52,.06,tacticalMaterials.strap),
        side*.18,.055,.19);
      harness.rotation.z=side*.10;
      add(guard.mesh,box(.2,.24,.12,tacticalMaterials.armor),
        side*.14,.48,.16);
      add(torso,box(.16,.19,.15,tacticalMaterials.glove),
        side*.33,-.13,.21);
    }
    add(torso,box(.19,.21,.14,tacticalMaterials.leather),-.27,-.12,-.13);
    add(torso,box(.15,.13,.16,tacticalMaterials.armor),.22,.10,.18);
    add(torso,box(.31,.055,.048,tacticalMaterials.badge),0,.19,.175);
    if(index%3===0){
      const antenna=add(torso,
        new THREE.Mesh(new THREE.CylinderGeometry(.013,.018,.36,5),
          tacticalMaterials.leather),-.32,.28,-.15);
      antenna.rotation.z=-.12;
    }
    if(index===6||index===8){
      const plate=add(torso,box(.28,.26,.075,tacticalMaterials.armor),
        0,-.13,.205);
      plate.rotation.x=-.06;
      guard.reactionDelay*=.93;
    }
    // Corpo caído em animação curta, não em rotação instantânea que deixa
    // as botas atravessando o teto/mesa como na imagem enviada.
    guard.damDeathAge=-1;
    guard.damHitAge=0;
    guard.damRadioCooldown=0;
    guard.damWalkVariant=.90+(index%4)*.07;
  }
  const previousDamage=GUARD.takeDamage;
  GUARD.takeDamage=function(damage,source){
    const dead=previousDamage.call(this,damage,source);
    if(!this.damEnhanced)return dead;
    if(dead){
      this.damDeathAge=0;
      this.mesh.rotation.x=0;
      this.mesh.rotation.z=0;
      this.mesh.position.y=this.pos.y;
      this.damDeathSide=this.pos.x<0?-1:1;
      this.laserSight.visible=false;
    }else if(this.state!=='DEAD'){
      this.damHitAge=.18;
    }
    return dead;
  };

  const oldStart=GAME.startMission;
  GAME.startMission=function(){
    this.damStunt=null;
    oldStart.call(this);
    if(this.currentMissionId!=='dam')return;
    this.guards.forEach((guard,index)=>dress(guard,index));
  };

  // 007 em terceira pessoa, exclusivo da cena de salto; meshes de baixo custo.
  function buildStunt(level){
    const suit=new THREE.MeshStandardMaterial({
      color:0x1b2835,metalness:.12,roughness:.83
    });
    const trousers=new THREE.MeshStandardMaterial({
      color:0x151b27,roughness:.9
    });
    const skin=new THREE.MeshStandardMaterial({
      color:0xd6aa8b,roughness:.78
    });
    const strap=new THREE.MeshStandardMaterial({
      color:0x707f84,metalness:.5,roughness:.49
    });
    const group=new THREE.Group();
    group.position.set(-14.1,.05,-118.1);
    const torso=add(group,box(.59,.85,.31,suit),0,1.18,0);
    torso.castShadow=true;
    add(group,new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),skin),
      0,1.79,0);
    for(const x of [-.23,.23]){
      const leg=add(group,box(.21,.80,.26,trousers),x,.44,0);
      leg.castShadow=true;
      const arm=add(group,box(.19,.72,.2,suit),
        x>0?.41:-.41,1.19,.025);
      arm.rotation.z=x>0?-.13:.13;
    }
    // Arnês ancorado no tronco; corda atualizada frame a frame.
    add(group,box(.69,.11,.38,strap),0,.96,.018);
    for(const x of [-.24,.24]){
      const shoulder=add(group,box(.085,.72,.11,strap),x,1.32,.18);
      shoulder.rotation.z=x>0?.15:-.15;
    }
    const lineGeo=new THREE.BufferGeometry();
    const vertices=new Float32Array(6);
    lineGeo.setAttribute('position',new THREE.BufferAttribute(vertices,3));
    const rope=new THREE.Line(lineGeo,
      new THREE.LineBasicMaterial({color:0xf3e9b4,linewidth:2}));
    rope.frustumCulled=false;
    level.levelGroup.add(group,rope);
    const mistMat=new THREE.MeshBasicMaterial({
      color:0xd5e5ed,transparent:true,opacity:.22,
      depthWrite:false
    });
    const mist=[];
    for(let i=0;i<10;i++){
      const puff=new THREE.Mesh(
        new THREE.SphereGeometry(.37+(i%3)*.15,7,6),mistMat.clone()
      );
      puff.position.set(-17+(i%4)*2,-26+(i%5),-125+(i%3)*4);
      puff.visible=false;
      puff.raycast=()=>{};
      level.levelGroup.add(puff);
      mist.push(puff);
    }
    return {group,rope,vertices,mist,age:0,stage:-1};
  }

  const previousOutro=GAME.startOutroCutscene;
  GAME.startOutroCutscene=function(){
    previousOutro.call(this);
    if(this.currentMissionId!=='dam')return;
    this.damStunt=buildStunt(this.levelBuilder);
    this.weaponMeshGroup.visible=false;
    document.getElementById('cutscene-tag').textContent=
      'DAM_BUNGEE // EXTRAÇÃO DE ARKHANGELSK';
    document.getElementById('cutscene-subtitle').textContent=
      '007 prende o arnês e verifica a corda no limite da barragem.';
  };
  function stuntPosition(p){
    let x=-14.1,y=.06,z=-118.1,roll=0;
    if(p<.21){
      const t=smooth(p/.21);
      x=mix(-13.6,-14.15,t);
      roll=-.09*t;
    }else if(p<.41){
      const t=smooth((p-.21)/.20);
      x=mix(-14.15,-18.2,t);
      y=mix(.06,-7.2,t);
      roll=mix(-.09,-.94,t);
      z=mix(-118.1,-118.7,t);
    }else if(p<.79){
      const t=smooth((p-.41)/.38);
      x=mix(-18.2,-22.8,t);
      y=mix(-7.2,-30.0,t);
      roll=mix(-.94,-1.17,t);
      z=mix(-118.7,-120.1,t);
    }else{
      const t=smooth((p-.79)/.21);
      x=mix(-22.8,-22.4,t);
      y=mix(-30,-25.8,t);
      roll=mix(-1.17,-.44,t);
      z=mix(-120.1,-119.9,t);
    }
    return {x,y,z,roll};
  }
  const oldUpdate=GAME.update;
  GAME.update=function(dt){
    // O salto passa a durar ~6 s em vez da queda instantânea de 4 s.
    const activeJump=this.currentMissionId==='dam'&&
      this.appState==='CUTSCENE_OUTRO'&&!!this.damStunt;
    const result=oldUpdate.call(this,activeJump?dt*.67:dt);
    if(this.currentMissionId!=='dam')return result;
    if(this.appState==='PLAYING'){
      // Percepção em equipe, mas propagação só a companheiros realmente
      // próximos e com visão desobstruída (não existe alerta global instantâneo).
      for(const g of this.guards){
        if(!g.damEnhanced)continue;
        g.damRadioCooldown=Math.max(0,(g.damRadioCooldown||0)-dt);
        if(g.state==='ALERTED'&&g.damRadioCooldown<=0){
          g.damRadioCooldown=1.55;
          for(const teammate of this.guards){
            if(teammate===g||teammate.state==='DEAD'||
               teammate.state==='ALERTED'||!teammate.damEnhanced)continue;
            const dist=g.pos.distanceTo(teammate.pos);
            if(dist>11)return; // limitar trabalho por guarda alertado
            if(hasLineOfSight(
              new THREE.Vector3(g.pos.x,1.45,g.pos.z),
              new THREE.Vector3(teammate.pos.x,1.45,teammate.pos.z),
              this.levelBuilder.colliders)){
              teammate.hearNoise(g.pos,12.2);
            }
          }
        }
        if(g.state!=='DEAD'&&g.damHitAge>0){
          g.damHitAge=Math.max(0,g.damHitAge-dt);
          g.torsoGroup.rotation.z=
            Math.sin(g.damHitAge*25)*.085;
        }else if(g.state!=='DEAD'){
          g.torsoGroup.rotation.z*=.83;
        }
      }
    }
    // Mesmo no gameplay, os caídos tombam em 0.5 s; não somem do cenário.
    if(this.appState==='PLAYING'){
      for(const g of this.guards){
        if(!g.damEnhanced||g.damDeathAge<0)continue;
        g.damDeathAge=Math.min(.62,g.damDeathAge+dt);
        const f=smooth(g.damDeathAge/.53);
        g.mesh.rotation.x=-Math.PI/2*f;
        g.mesh.rotation.z=g.damDeathSide*.21*f;
        g.mesh.position.y=g.pos.y+f*.23;
        g.weaponArmGroup.rotation.x=.12+.64*f;
      }
    }
    if(!activeJump||this.appState!=='CUTSCENE_OUTRO')return result;
    const p=Math.max(0,Math.min(1,this.cutsceneTimer/4));
    const fx=this.damStunt;
    const pos=stuntPosition(p);
    fx.group.position.set(pos.x,pos.y,pos.z);
    fx.group.rotation.z=pos.roll;
    fx.group.rotation.x=p>.31?-.09:0;
    // Corda do guincho ao arnês, visível durante todo o salto.
    const a=this.levelBuilder.damJumpAnchor ||
      new THREE.Vector3(-13.2,1,-119.62);
    const points=fx.vertices;
    points[0]=a.x;points[1]=a.y;points[2]=a.z;
    points[3]=pos.x;points[4]=pos.y+1.07;points[5]=pos.z;
    fx.rope.geometry.attributes.position.needsUpdate=true;
    // Cinemática em três enquadramentos: preparação, salto e queda pelo paredão.
    if(p<.28){
      const t=smooth(p/.28);
      this.camera.position.set(
        mix(-9.6,-17.7,t),mix(4.6,4.8,t),mix(-112.9,-111.7,t));
      this.camera.lookAt(pos.x,1.05,-118.1);
    }else if(p<.71){
      const t=smooth((p-.28)/.43);
      this.camera.position.set(
        mix(-18.3,-28,t),mix(3.2,-15.2,t),mix(-108.5,-109.8,t));
      this.camera.lookAt(pos.x,pos.y+.95,pos.z);
    }else{
      const t=smooth((p-.71)/.29);
      this.camera.position.set(
        mix(-28,-29,t),mix(-15.2,-24.4,t),mix(-109.8,-123,t));
      this.camera.lookAt(pos.x,pos.y+.9,pos.z);
    }
    const stage=p<.21?0:p<.41?1:p<.79?2:3;
    if(stage!==fx.stage){
      fx.stage=stage;
      document.getElementById('cutscene-subtitle').textContent=[
        'Arnês conectado. Vento intenso sobre a represa de Arkhangelsk.',
        '007 se lança para fora da plataforma — queda iniciada!',
        'A corda estica sobre o paredão. Câmera acompanha a descida.',
        'A corda absorve o impacto. Extração concluída: próximo destino, Facility.'
      ][stage];
      if(stage===1)this.audio.playGadgetBeep(true);
    }
    for(let i=0;i<fx.mist.length;i++){
      const cloud=fx.mist[i];
      cloud.visible=p>.57;
      if(!cloud.visible)continue;
      cloud.position.y=-26+(i%5)+Math.sin(p*13+i)*.42;
      cloud.scale.setScalar(1+Math.max(0,p-.55)*2.2);
    }
    return result;
  };

  const oldSuccess=GAME.completeMissionSuccess;
  GAME.completeMissionSuccess=function(){
    if(this.currentMissionId==='dam')this.damStunt=null;
    return oldSuccess.call(this);
  };
})();