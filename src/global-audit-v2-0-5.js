/**
 * GoldenEye 007 Remastered — auditoria global v2.0.5
 * Todos os 10 mapas: ciclo de vida dos corpos, transição de missões,
 * atmosfera, validação não destrutiva de cenário.
 * Carregar depois de dam-rework-v2-0-1.js.
 */
(() => {
  'use strict';
  if(typeof THREE==='undefined' || typeof DamLevelBuilder==='undefined' ||
     typeof GoldenEyeDamGame==='undefined' || typeof GuardAgent==='undefined')
    return;

  const BODY_SECONDS=5;
  const WORLD=DamLevelBuilder.prototype, GAME=GoldenEyeDamGame.prototype;
  const GUARD=GuardAgent.prototype;
  const priorDamage=GUARD.takeDamage;
  GUARD.takeDamage=function(amount,attacker){
    const killed=priorDamage.call(this,amount,attacker);
    if(killed && this.state==='DEAD'){
      this.corpseAge=0;
      this.corpseRemoved=false;
      this.v13Discovered=false;
    }
    return killed;
  };

  function releaseCorpse(game,entity,others){
    if(entity.corpseRemoved||!entity.mesh)return;
    entity.corpseRemoved=true;
    entity.v13Discovered=true; // não alertar os guardas por um corpo invisível
    entity.mesh.visible=false;
    game.scene.remove(entity.mesh);

    // As peças do mesmo guarda reutilizam materiais e geometrias.
    // As peças Dam (colete, rádio etc.) podem ser compartilhadas entre
    // vários guardas; só descartar quando não houver outro usuário visível.
    if(typeof entity.mesh.traverse!=='function')return;
    const retainedGeometries=new Set(),retainedMaterials=new Set();
    for(const other of others){
      if(other===entity||other.corpseRemoved||!other.mesh?.traverse)continue;
      other.mesh.traverse(obj=>{
        if(obj.geometry)retainedGeometries.add(obj.geometry);
        if(Array.isArray(obj.material))
          obj.material.forEach(mat=>retainedMaterials.add(mat));
        else if(obj.material)retainedMaterials.add(obj.material);
      });
    }
    const geometries=new Set(),materials=new Set();
    entity.mesh.traverse(obj=>{
      if(obj.geometry && !retainedGeometries.has(obj.geometry))
        geometries.add(obj.geometry);
      if(Array.isArray(obj.material))
        obj.material.forEach(mat=>{
          if(mat && !retainedMaterials.has(mat))materials.add(mat);
        });
      else if(obj.material && !retainedMaterials.has(obj.material))
        materials.add(obj.material);
    });
    geometries.forEach(g=>g.dispose?.());
    materials.forEach(m=>m.dispose?.());
  }

  // Uma única rota de atualização cobre guardas dos mapas iniciais e
  // reforços instanciados dinamicamente (Silo, Frigate, Bunker 2 etc).
  const prevUpdate=GAME.update;
  GAME.update=function(dt){
    const wasPlaying=this.appState==='PLAYING';
    const result=prevUpdate.call(this,dt);
    if(!wasPlaying||this.appState!=='PLAYING')return result;
    const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
    for(const guard of this.guards){
      if(guard.state!=='DEAD'||guard.corpseRemoved)continue;
      guard.corpseAge=(guard.corpseAge??0)+step;
      if(guard.corpseAge>=BODY_SECONDS-1e-6)
        releaseCorpse(this,guard,this.guards);
    }
    // Cientistas abatidos (em dificuldades que permitem prosseguir)
    // também desaparecem; reféns e Natalya só após a missão continuar,
    // nunca antes das verificações de falha dos respectivos capítulos.
    const npcs=this.levelBuilder.npcs||[];
    for(const npc of npcs){
      if(!npc.dead||npc.corpseRemoved||!npc.mesh)continue;
      npc.corpseAge=(npc.corpseAge??0)+step;
      if(npc.corpseAge>=BODY_SECONDS){
        npc.corpseRemoved=true;
        npc.mesh.visible=false;
        if(npc.mesh.parent)npc.mesh.parent.remove(npc.mesh);
        // NPCs pertencem ao levelGroup e serão descartados no clear().
      }
    }
    return result;
  };

  const priorBuild=WORLD.build;
  const atmosphere={
    dam:[0x64748b,.0085],
    facility:[0x263b49,.008],
    runway:[0x7890a3,.007]
  };
  WORLD.build=function(mission='dam'){
    const result=priorBuild.call(this,mission);
    // A atmosfera dos capítulos 4..10 é definida pelos seus builders.
    // Os três primeiros dependiam do último cenário selecionado,
    // herdando neblina/neve do Silo ou das fases subterrâneas.
    const env=atmosphere[mission];
    if(env){
      this.scene.background=new THREE.Color(env[0]);
      this.scene.fog=new THREE.FogExp2(env[0],env[1]);
    }
    // Auditoria leve, uma vez por carregamento. Não altera as colisões
    // automaticamente nem bloqueia a missão diante de um aviso.
    this.auditReport=[];
    const bounds=this.bounds;
    if(!bounds || ![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ]
      .every(Number.isFinite)){
      this.auditReport.push('Limites inválidos: '+mission);
    } else {
      for(const [i,b]of this.colliders.entries()){
        if(![b.minX,b.maxX,b.minZ,b.maxZ,b.minY??0,b.maxY??5]
          .every(Number.isFinite)||b.minZ>b.maxZ){
          this.auditReport.push('Collider inválido #'+i);
        }
      }
      for(const [i,entry] of this.interactables.entries()){
        if(!entry.position || ![entry.position.x,entry.position.y,
          entry.position.z].every(Number.isFinite) ||
          !Number.isFinite(entry.radius) || entry.radius<0){
          this.auditReport.push('Interação inválida #'+i);
        }
      }
    }
    if(this.auditReport.length && typeof console!=='undefined')
      console.warn('[AUDITORIA '+mission+']',this.auditReport);
    return result;
  };

  const oldSelect=GAME.selectMission;
  GAME.selectMission=function(id){
    const previous=this.currentMissionId;
    const result=oldSelect.call(this,id);
    if(this.currentMissionId!==previous &&
       (this.appState==='MENU'||this.appState==='RESULTS')){
      // Não manter soldados do cenário anterior flutuando na tela do
      // dossiê quando o jogador alterna entre fases.
      for(const guard of this.guards){
        if(guard.mesh)this.scene.remove(guard.mesh);
      }
      this.guards=[];
      for(const spark of this.sparks||[]){
        if(spark.mesh)this.scene.remove(spark.mesh);
      }
      this.sparks=[];
    }
    return result;
  };

  window.GoldenEyeAudit={
    version:'2.0.5',
    bodySeconds:BODY_SECONDS,
    getReport:()=>window.gameInstance?.levelBuilder?.auditReport||[]
  };
})();