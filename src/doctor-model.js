/** Uploaded, skinned laboratory NPCs. Mission entities/IDs and decoder rules stay intact. */
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
  function attach(npc,gltf){
    const model=cloneActor(gltf.scene);
    model.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=0){npc.modelStatus='fallback';return}
    const scale=1.75/size.y;
    model.scale.multiplyScalar(scale);
    model.position.set(-(box.min.x+box.max.x)*.5*scale,-box.min.y*scale,-(box.min.z+box.max.z)*.5*scale);
    model.name=npc.id==='dr_doak'?'Dra-GLB':'Scientist-GLB';
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;
      for(const m of Array.isArray(o.material)?o.material:[o.material])m.skinning=!!o.isSkinnedMesh;
    });
    for(const child of [...npc.mesh.children]){npc.mesh.remove(child);dispose(child)}
    npc.mesh.add(model);npc.modelStatus='ready';
    const mixer=new THREE.AnimationMixer(model),actions={};
    for(const name of ['Idle','Talk','Walking']){
      const clip=gltf.animations.find(c=>c.name===name);
      if(clip)actions[name]=mixer.clipAction(clip);
    }
    actions.Idle?.play();mixer.update(.001);
    npc.visual={model,mixer,actions,current:actions.Idle,lastPos:npc.mesh.position.clone()};
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
    if(!['facility','silo'].includes(id)||typeof THREE.GLTFLoader!=='function')return;
    const level=this.levelGroup;
    this.npcTemplates=[];
    const targets=[
      {path:'dra',npcs:this.npcs.filter(n=>id==='facility'&&n.id==='dr_doak')},
      {path:'scientist',npcs:this.npcs.filter(n=>n.role==='scientist')}
    ];
    for(const {path,npcs} of targets){
      if(!npcs.length)continue;
      npcs.forEach(n=>{n.displayName=path==='dra'?'Dra.':'Cientista';n.modelStatus='loading'});
      new THREE.GLTFLoader().load('assets/models/'+path+'.glb',gltf=>{
        if(this.levelGroup!==level){dispose(gltf.scene);return}
        this.npcTemplates.push(gltf.scene);
        for(const npc of npcs){
          if(npc.dead||npc.corpseRemoved){npc.modelStatus='fallback';continue}
          attach(npc,gltf);
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
      const action=v.actions[moving?'Walking':close?'Talk':'Idle']||v.actions.Idle;
      if(action&&action!==v.current){v.current?.fadeOut(.2);action.reset().fadeIn(.2).play();v.current=action}
      v.mixer.update(step);v.lastPos.copy(npc.mesh.position);
    }
    return result;
  };
})();
