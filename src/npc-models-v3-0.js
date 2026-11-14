/** GoldenEye 077 v3.2: natural skeletal locomotion for all laboratory NPCs. */
(() => {
  'use strict';
  const WORLD=DamLevelBuilder.prototype;
  function dispose(root){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    root.traverse(o=>{
      if(o.geometry)geometries.add(o.geometry);
      for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);
    });
    for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose()}
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
  }
  // Object3D.clone shares the original skeleton. Rebind every clone to its own bones.
  function cloneActor(source){
    const model=source.clone(true),original=[],copies=[];
    source.traverse(o=>original.push(o));model.traverse(o=>copies.push(o));
    const mapped=new Map(original.map((o,i)=>[o,copies[i]]));
    source.traverse(o=>{
      if(!o.isSkinnedMesh)return;
      const copy=mapped.get(o),skeleton=o.skeleton.clone();
      skeleton.bones=o.skeleton.bones.map(b=>mapped.get(b));
      copy.bind(skeleton,o.bindMatrix);
    });
    return model;
  }
  // Identical standing height for every scientist (GLB and fallback).
  // World groups keep their original x/z/y and interaction locations.
  const SCIENTIST_HEIGHT=1.72;
  const DOCTOR_HEIGHT=1.75;
  // A pesquisadora utiliza o terceiro GLB que já existe no repositório.
  // Mantemos um cientista homem ao lado dela; ninguém é criado a mais.
  const RESEARCHER_MODEL='Medica_Otimizada_Walk_Menos25MB';
  const RESEARCHER_IDS=new Set(['sci_2','silo_scientist_2']);
  const isResearcher=npc=>npc.role==='scientist'&&RESEARCHER_IDS.has(npc.id);
  const findClip=(clips,pattern)=>(clips||[]).find(c=>pattern.test(c.name||''));
  function normalizeFallback(npc){
    if(npc.role!=='scientist'||npc.scientistFallbackReady)return;
    const anchor=new THREE.Group();
    anchor.name='scientist-fallback-normalized';
    for(const child of [...npc.mesh.children]){
      npc.mesh.remove(child);
      anchor.add(child);
    }
    anchor.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(anchor);
    const size=box.getSize(new THREE.Vector3());
    if(Number.isFinite(size.y)&&size.y>0.01){
      const factor=SCIENTIST_HEIGHT/size.y;
      anchor.scale.setScalar(factor);
      anchor.position.set(
        -(box.min.x+box.max.x)*.5*factor,
        -box.min.y*factor,
        -(box.min.z+box.max.z)*.5*factor
      );
    }
    npc.mesh.add(anchor);
    npc.scientistFallbackReady=true;
  }
  // Skin animations may alter the actual visible height after loading. A
  // periodic check (max once per 0.8 s / NPC) corrects extreme scale drift
  // without doing an expensive animated bounds check on every frame.

  // Box3.setFromObject in the bundled Three.js measures the bind geometry of
  // SkinnedMesh, not the vertices distorted by the bones at render time.
  // Here boneTransform matches what the GPU actually draws.
  const posedVertex=new THREE.Vector3();
  function visualBounds(root,precise=false){
    root.updateMatrixWorld(true);
    const result=new THREE.Box3().makeEmpty();
    let measured=0;
    root.traverse(node=>{
      if(!node.isMesh||!node.visible)return;
      const attribute=node.geometry?.getAttribute('position');
      if(node.isSkinnedMesh&&attribute&&typeof node.boneTransform==='function'){
        const step=precise?1:Math.max(1,Math.floor(attribute.count/1600));
        for(let i=0;i<attribute.count;i+=step){
          posedVertex.fromBufferAttribute(attribute,i);
          node.boneTransform(i,posedVertex);
          posedVertex.applyMatrix4(node.matrixWorld);
          if(Number.isFinite(posedVertex.x)&&Number.isFinite(posedVertex.y)&&
             Number.isFinite(posedVertex.z)){
            result.expandByPoint(posedVertex);measured++;
          }
        }
        if(step>1&&attribute.count>0){
          const i=attribute.count-1;
          posedVertex.fromBufferAttribute(attribute,i);
          node.boneTransform(i,posedVertex);
          posedVertex.applyMatrix4(node.matrixWorld);
          if(Number.isFinite(posedVertex.x)&&Number.isFinite(posedVertex.y)&&
             Number.isFinite(posedVertex.z)){
            result.expandByPoint(posedVertex);measured++;
          }
        }
      }else{
        const current=new THREE.Box3().setFromObject(node);
        if(!current.isEmpty()){result.union(current);measured++}
      }
    });
    return measured?result:new THREE.Box3().setFromObject(root);
  }
  function stabilizeHeight(npc,precise=false){
    const visual=npc.visual;
    if(!visual||visual.released||!visual.model||!visual.targetHeight)return;
    const model=visual.model;
    npc.mesh.updateMatrixWorld(true);
    const box=visualBounds(model,precise);
    const height=box.max.y-box.min.y;
    if(!Number.isFinite(height)||height<0.01)return;
    const target=visual.targetHeight;
    if(Math.abs(height-target)>target*.025)
      model.scale.multiplyScalar(Math.max(.05,Math.min(20,target/height)));
    model.updateMatrixWorld(true);
    const after=visualBounds(model,precise);
    const floorY=npc.mesh.getWorldPosition(new THREE.Vector3()).y;
    const delta=floorY-after.min.y;
    if(Number.isFinite(delta)&&Math.abs(delta)>.02)
      model.position.y+=delta;
  }
  function attach(npc,gltf,variant){
    // Independent outer transform is never targeted by the GLB's animation tracks.
    const actor=cloneActor(gltf.scene),model=new THREE.Group();
    model.add(actor);
    model.name=variant==='dra'?'Dra-GLB':
      variant===RESEARCHER_MODEL?'Pesquisadora-GLB':'Scientist-GLB';
    const mixer=new THREE.AnimationMixer(actor),actions={};
    const clips=gltf.animations||[];
    const idle=findClip(clips,/idle|stand|breath|rest|parado/i);
    const talk=findClip(clips,/talk|speak|dialog|convers|falar/i);
    // Meshy exports sometimes call the only clip "Walk", "Take 001" or "ArmatureAction".
    const walk=findClip(clips,/walk|run|stride|step|andar|locomot|move/i)||
      (variant===RESEARCHER_MODEL?clips[0]:null);
    if(idle)actions.Idle=mixer.clipAction(idle);
    if(talk)actions.Talk=mixer.clipAction(talk);
    if(walk)actions.Walking=mixer.clipAction(walk);
    // Idle clips from these Meshy exports leave the arms in a T pose.
    // Use their authored walking skeleton as a natural standing base pose:
    // very slow gait at rest and normal speed when NPCs move.
    const walkOnlyIdle=!actions.Idle && !!actions.Walking;
    if(actions.Walking){
      const action=actions.Walking;
      action.reset().play();
      action.time=Math.min((walk.duration||1)*.24,.38);
      action.timeScale=.14;
      action.paused=false;
      mixer.update(.02);
    }else{
      actions.Idle?.play();
      mixer.update(.02);
    }
    model.updateMatrixWorld(true);
    const box=visualBounds(model,true),size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=.001){npc.modelStatus='fallback';return}
    const targetHeight=npc.role==='scientist'?SCIENTIST_HEIGHT:DOCTOR_HEIGHT;
    const scale=targetHeight/size.y;
    model.scale.setScalar(scale);
    model.position.set(-(box.min.x+box.max.x)*.5*scale,-box.min.y*scale,-(box.min.z+box.max.z)*.5*scale);
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;
      for(const m of Array.isArray(o.material)?o.material:[o.material])m.skinning=!!o.isSkinnedMesh;
    });
    for(const child of [...npc.mesh.children]){npc.mesh.remove(child);dispose(child)}
    npc.mesh.add(model);npc.modelStatus='ready';
    npc.visual={
      model,actor,mixer,actions,current:actions.Walking||actions.Idle||null,
      walkOnlyIdle,motionState:'Idle',lastPos:npc.mesh.position.clone(),
      targetHeight,scaleCheckAge:0
    };
    npc.modelVariant=variant;
    stabilizeHeight(npc,true);
    // Corpses can leave levelGroup before clear(); stop and release their skeleton.
    const cleanup=()=>{
      if(npc.visual?.released)return;
      mixer.stopAllAction();mixer.uncacheRoot(model);
      model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose()});
      npc.visual.released=true;
    };
    npc.visual.cleanup=cleanup;
    npc.mesh.addEventListener('removed',cleanup);
  }
  WORLD.loadDoctor=function(id){
    if(!['facility','silo'].includes(id))return;
    // Scientists are also correctly proportioned while GLB downloads or fails.
    for(const npc of this.npcs||[])normalizeFallback(npc);
    if(typeof THREE.GLTFLoader!=='function')return;
    const level=this.levelGroup;
    this.npcTemplates=[];
    const targets=[
      {path:'dra',npcs:this.npcs.filter(n=>id==='facility'&&n.id==='dr_doak'),label:'Dra.'},
      {path:'scientist',npcs:this.npcs.filter(n=>n.role==='scientist'&&!isResearcher(n)),label:'Cientista'},
      {path:RESEARCHER_MODEL,npcs:this.npcs.filter(isResearcher),label:'Pesquisadora'}
    ];
    for(const {path,npcs,label} of targets){
      if(!npcs.length)continue;
      npcs.forEach(n=>{n.displayName=label;n.modelStatus='loading'});
      new THREE.GLTFLoader().load('assets/models/'+path+'.glb',gltf=>{
        if(this.levelGroup!==level){dispose(gltf.scene);return}
        this.npcTemplates.push(gltf.scene);
        for(const npc of npcs){
          if(npc.dead||npc.corpseRemoved){npc.modelStatus='fallback';continue}
          attach(npc,gltf,path);
        }
      },undefined,()=>{
        if(this.levelGroup===level)npcs.forEach(n=>{n.modelStatus='fallback'});
      });
    }
  };
  const clear=WORLD.clear;
  WORLD.clear=function(){
    for(const npc of this.npcs||[]){
      const v=npc.visual;if(!v)continue;
      v.cleanup();npc.mesh.remove(v.model);
    }
    // Textures and geometry are shared by the three scientist instances.
    for(const model of this.npcTemplates||[])dispose(model);
    this.npcTemplates=[];
    return clear.apply(this,arguments);
  };
  const build=WORLD.build;
  WORLD.build=function(id='dam'){
    const result=build.apply(this,arguments);this.loadDoctor(id);return result;
  };
  if(typeof window!=='undefined')window.GoldenEyeNPCScale={
    version:'3.2',visualBounds,stabilizeHeight,
    researcherModel:RESEARCHER_MODEL,researcherIds:Array.from(RESEARCHER_IDS),
    scientistHeight:SCIENTIST_HEIGHT,doctorHeight:DOCTOR_HEIGHT
  };
  if(typeof GoldenEyeDamGame==='undefined')return;
  const GAME=GoldenEyeDamGame.prototype,update=GAME.update;
  GAME.update=function(dt){
    const playing=this.appState==='PLAYING',result=update.call(this,dt);
    if(!playing||this.appState!=='PLAYING')return result;
    const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
    for(const npc of this.levelBuilder.npcs){
      const v=npc.visual;
      if(!v||v.released||npc.dead||npc.corpseRemoved)continue;
      const moving=npc.mesh.position.distanceToSquared(v.lastPos)>.00001;
      const close=npc.position.distanceTo(this.player.pos)<3.5;
      // Prefer the authored standing/walking bone pose over the T-shaped
      // "Idle" exported by Meshy; avoid restarting Walk every frame.
      const action=v.actions.Walking || v.actions[moving?'Walking':close?'Talk':'Idle'] || v.actions.Idle;
      v.motionState=moving?'Walking':close?'Talking':'Idle';
      if(action&&action!==v.current){
        v.current?.fadeOut(.12);
        action.reset().fadeIn(.12).play();
        v.current=action;
      }
      if(action){
        action.paused=false;
        action.timeScale=moving?1.0:close?.17:.11;
      }
      v.mixer.update(step);
      v.scaleCheckAge=(v.scaleCheckAge||0)+step;
      if(v.scaleCheckAge>=.22){
        v.scaleCheckAge=0;
        stabilizeHeight(npc);
      }
      v.lastPos.copy(npc.mesh.position);
    }
    return result;
  };
})();
