/** Static doctor asset, retaining the existing scientist entity and mission rules. */
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
  WORLD.loadDoctor=function(id){
    const target=id==='facility'?'sci_2':id==='silo'?'silo_scientist_1':null;
    const npc=this.npcs.find(n=>n.id===target);
    if(!npc||typeof THREE.GLTFLoader!=='function')return;
    const level=this.levelGroup;
    npc.displayName='Dra.';npc.modelStatus='loading';
    new THREE.GLTFLoader().load('assets/models/dra.glb',gltf=>{
      const model=gltf.scene;
      // A prior mission's delayed request cannot attach to the next scene.
      if(this.levelGroup!==level||npc.dead||npc.corpseRemoved){dispose(model);return}
      model.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
      if(!Number.isFinite(size.y)||size.y<=0){dispose(model);npc.modelStatus='fallback';return}
      const scale=1.75/size.y;
      model.scale.multiplyScalar(scale);
      model.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
      model.name='Dra-GLB';
      model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true}});
      // Keep the NPC wrapper: position, yaw, raycasts, damage and corpse TTL.
      for(const child of [...npc.mesh.children]){npc.mesh.remove(child);dispose(child)}
      npc.mesh.add(model);npc.modelStatus='ready';
      npc.mesh.addEventListener('removed',()=>dispose(model));
    },undefined,()=>{if(this.levelGroup===level)npc.modelStatus='fallback'});
  };
  const build=WORLD.build;
  WORLD.build=function(id='dam'){
    const result=build.apply(this,arguments);this.loadDoctor(id);return result;
  };
})();
