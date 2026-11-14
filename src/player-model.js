/** Uploaded 007 avatar: one persistent skinned model shared by FPS and bungee. */
(() => {
  'use strict';
  const GAME=GoldenEyeDamGame.prototype;
  GAME.installPlayerAvatar=function(gltf){
    if(this.playerAvatar?.ready)return;
    const root=new THREE.Group(),model=gltf.scene;
    root.name='007-player';root.visible=false;root.add(model);
    // Normalize bind-pose dimensions before applying animation.
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Modelo 007 sem altura válida');
    const scale=1.85/size.y;
    model.scale.multiplyScalar(scale);
    model.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
    const materials=[],clipPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),1.2);
    model.traverse(o=>{
      if(!o.isMesh)return;
      // Animated limbs can leave the bind-pose bounds. Only one player mesh.
      o.frustumCulled=false;o.castShadow=false;o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        m.skinning=!!o.isSkinnedMesh;
        if(!materials.includes(m))materials.push(m);
      }
    });
    const mixer=new THREE.AnimationMixer(model);
    const clips=gltf.animations || [];
    const walking=clips.find(c=>/walking/i.test(c.name)) || clips[0];
    const running=clips.find(c=>/running/i.test(c.name)) || walking;
    const walkAction=walking?mixer.clipAction(walking):null;
    const runAction=running?mixer.clipAction(running):walkAction;
    // Rest on the first walking frame instead of showing the bind T-pose.
    if(walkAction){walkAction.play();mixer.update(.001);walkAction.paused=true}
    this.renderer.localClippingEnabled=true;
    this.scene.add(root);
    this.playerAvatar={ready:true,root,model,mixer,clips,materials,clipPlane,
      walkAction,runAction,action:walkAction,height:1.85,lastPos:this.player.pos.clone(),mode:null};
  };
  GAME.loadPlayerAvatar=function(){
    if(this.playerAvatarLoading||this.playerAvatar?.ready)return;
    this.playerAvatarLoading=true;
    new THREE.GLTFLoader().load('assets/models/007.glb',gltf=>{
      this.playerAvatarLoading=false;
      try{this.installPlayerAvatar(gltf)}catch(error){console.error('Falha no modelo 007:',error)}
    },undefined,error=>{
      this.playerAvatarLoading=false;
      console.error('Falha ao carregar modelo 007:',error);
      this.notifyHUD?.('Modelo 007 indisponível. Reabra a missão para tentar novamente.');
    });
  };
  const oldStart=GAME.startMission;
  GAME.startMission=function(){
    const result=oldStart.apply(this,arguments);
    this.loadPlayerAvatar();
    if(this.playerAvatar){this.playerAvatar.root.visible=false;this.playerAvatar.lastPos.copy(this.player.pos)}
    return result;
  };
  const oldUpdate=GAME.update;
  GAME.update=function(dt){
    const result=oldUpdate.call(this,dt),a=this.playerAvatar;
    if(!a)return result;
    // A paused frame must not alter animation, clipping, or actor visibility.
    if(this.appState==='PAUSED')return result;
    const stunt=this.currentMissionId==='dam'&&this.appState==='CUTSCENE_OUTRO'&&this.damStunt;
    const playing=this.appState==='PLAYING'&&!this.player.inTank;
    const mode=stunt?'stunt':playing?'fps':'hidden';
    a.root.visible=mode!=='hidden';
    if(a.mode!==mode){
      for(const m of a.materials){m.clippingPlanes=mode==='fps'?[a.clipPlane]:[];m.needsUpdate=true}
      a.mode=mode;
    }
    if(stunt){
      // Retain the existing harness, rope, camera and mission timeline.
      this.damStunt.group.children.slice(0,6).forEach(o=>{o.visible=false});
      a.root.position.copy(this.damStunt.group.position);
      a.root.quaternion.copy(this.damStunt.group.quaternion);
      a.root.scale.set(1,1,1);
      if(a.action)a.action.paused=true;
    }else if(playing){
      const speed=dt>0?Math.hypot(this.player.pos.x-a.lastPos.x,this.player.pos.z-a.lastPos.z)/dt:0;
      a.root.position.set(this.player.pos.x,0,this.player.pos.z);
      a.root.rotation.set(0,this.player.yaw,0);
      a.root.scale.set(1,this.player.crouched?.64:1,1);
      // Clip only the upper body in FPS so the head cannot cover the camera.
      a.clipPlane.constant=this.camera.position.y-.38;
      const action=speed>4.5?a.runAction:a.walkAction;
      if(action&&action!==a.action){a.action?.stop();action.reset().play();a.action=action}
      if(a.action){a.action.paused=speed<.08;a.action.timeScale=Math.max(.5,Math.min(1.6,speed/(speed>4.5?5:2.4)));a.mixer.update(Math.min(dt,.05))}
    }
    a.lastPos.copy(this.player.pos);
    return result;
  };
})();
