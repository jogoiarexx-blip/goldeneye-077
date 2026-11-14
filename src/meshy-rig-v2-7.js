/**
 * GoldenEye 077 v2.7 — rig esquelético procedural para soldado Meshy.
 * 17 ossos, pesos aproximados por região; preserva UV, malha, material,
 * IA, colisões, tiro e desaparecimento dos corpos depois de 5 segundos.
 */
(() => {
 'use strict';
 if(typeof THREE==='undefined'||typeof GuardAgent==='undefined'||
    !THREE.SkinnedMesh||!THREE.Skeleton||!THREE.Bone)return;
 const GUARD=GuardAgent.prototype;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
 function skeleton(){
   const bones=[],parts={};
   function add(name,parent,x,y,z){
     const b=new THREE.Bone();
     b.name='MI6_'+name;b.position.set(x,y,z);
     if(parent)parent.add(b);bones.push(b);parts[name]=b;
     return b;
   }
   const hips=add('hips',null,0,.91,0);
   const spine=add('spine',hips,0,.25,0);
   const chest=add('chest',spine,0,.20,0);
   const neck=add('neck',chest,0,.19,0);
   add('head',neck,0,.10,0);
   const larm=add('larm',chest,-.19,-.03,0);
   const lfore=add('lfore',larm,0,-.17,0);
   add('lhand',lfore,0,-.18,0);
   const rarm=add('rarm',chest,.19,-.03,0);
   const rfore=add('rfore',rarm,0,-.17,0);
   add('rhand',rfore,0,-.18,0);
   const lthigh=add('lthigh',hips,-.11,-.01,0);
   const lshin=add('lshin',lthigh,0,-.43,0);
   add('lfoot',lshin,0,-.34,.012);
   const rthigh=add('rthigh',hips,.11,-.01,0);
   const rshin=add('rshin',rthigh,0,-.43,0);
   add('rfoot',rshin,0,-.34,.012);
   return {bones,parts,root:hips};
 }
 function influences(x,y){
   const neg=x<0,abs=Math.abs(x);
   if(y>1.63)return [4,1,4,0];
   if(y>1.52){const t=ease((y-1.52)/.11);return [4,t,3,1-t]}
   if(y>.98&&y<1.49&&abs>.135){
     const t=ease((abs-.135)/.055);
     if(t>.035) {
       const arm=y<1.06?(neg?7:10):y<1.205?(neg?6:9):(neg?5:8);
       return [arm,t,y>1.25?2:1,1-t];
     }
   }
   if(y>=1.37){const t=ease((y-1.37)/.15);return [3,t,2,1-t]}
   if(y>=1.02){const t=ease((y-1.02)/.28);return [2,t,1,1-t]}
   if(y>=.85){const t=ease((.99-y)/.14);return [neg?11:14,t,0,1-t]}
   if(y>=.52)return [neg?11:14,1,0,0];
   if(y>=.16){const t=ease((.52-y)/.08);return [neg?12:15,t,neg?11:14,1-t]}
   return [neg?13:16,1,0,0];
 }
 function install(model){
   if(!model?.traverse||model.userData?.mi6Rigged)return null;
   let mesh=null;
   model.traverse(o=>{if(!mesh&&o.isMesh&&!o.isSkinnedMesh&&o.geometry?.getAttribute('position'))mesh=o});
   if(!mesh||!mesh.parent)return null;
   const geometry=mesh.geometry,position=geometry.getAttribute('position');
   if(!position||position.count<100||position.itemSize!==3)return null;
   const joints=new Uint16Array(position.count*4);
   const weights=new Float32Array(position.count*4);
   for(let i=0;i<position.count;i++){
     const [a,wa,b,wb]=influences(position.getX(i),position.getY(i));
     const j=i*4;
     joints[j]=a;joints[j+1]=b;
     weights[j]=wa;weights[j+1]=wb;
   }
   geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));
   geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
   if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
   const rig=skeleton();
   const body=new THREE.SkinnedMesh(geometry,mesh.material);
   body.name='meshy-soldado-rig-17-ossos';
   body.position.copy(mesh.position);
   body.quaternion.copy(mesh.quaternion);
   body.scale.copy(mesh.scale);
   body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;
   body.add(rig.root);
   const parent=mesh.parent;
   parent.add(body);parent.remove(mesh);
   body.updateMatrixWorld(true);
   body.bind(new THREE.Skeleton(rig.bones));
   for(const material of Array.isArray(body.material)?body.material:[body.material])
     if(material)material.needsUpdate=true;
   model.userData.mi6Rigged=true;
   return {mesh:body,parts:rig.parts,phase:0,deathTime:0};
 }
 function animate(guard,rig,dt,speed){
   const p=rig.parts,step=clamp(Number.isFinite(dt)?dt:0,0,.05);
   if(guard.state==='DEAD'){
     rig.deathTime=Math.min(.60,rig.deathTime+step);
     const t=ease(rig.deathTime/.60);
     p.larm.rotation.z=.38*t;p.rarm.rotation.z=-.38*t;
     p.lfore.rotation.x=-.48*t;p.rfore.rotation.x=-.42*t;
     p.lthigh.rotation.x=.21*t;p.rthigh.rotation.x=-.15*t;
     p.head.rotation.x=-.21*t;
     p.chest.rotation.z=(guard.hitSide||1)*.08*t;
     return;
   }
   const gait=clamp(speed/3.1,0,1);
   rig.phase+=step*(gait>.025?7+2*gait:1.4);
   const sin=Math.sin(rig.phase),opp=-sin;
   const alert=guard.state==='ALERTED'?1:guard.state==='SUSPICIOUS'?.45:0;
   const hit=clamp((guard.hitReaction||0)/.22,0,1);
   p.hips.position.y=.91+Math.abs(sin)*.018*gait;
   p.hips.rotation.y=sin*.025*gait;
   p.spine.rotation.x=-.035*alert;
   p.chest.rotation.z=sin*.025*gait+(guard.hitSide||1)*.09*Math.sin(Math.PI*hit);
   p.neck.rotation.y=alert*Math.sin(rig.phase*.3)*.07;
   p.head.rotation.x=-.025*alert;
   p.lthigh.rotation.x=sin*.52*gait;
   p.rthigh.rotation.x=opp*.52*gait;
   p.lshin.rotation.x=Math.max(0,-sin)*.44*gait;
   p.rshin.rotation.x=Math.max(0,sin)*.44*gait;
   p.lfoot.rotation.x=-p.lshin.rotation.x*.26;
   p.rfoot.rotation.x=-p.rshin.rotation.x*.26;
   const shot=clamp(guard.guardShotKick||0,0,1);
   p.larm.rotation.x=-sin*.36*gait-.35*alert;
   p.rarm.rotation.x=-opp*.36*gait-.42*alert-shot*.19;
   p.lfore.rotation.x=-.14*alert+.16*gait*Math.max(0,sin);
   p.rfore.rotation.x=-.22*alert-.28*shot+.16*gait*Math.max(0,opp);
   p.lhand.rotation.x=-.05*alert;p.rhand.rotation.x=-.08*alert;
   p.larm.rotation.z=-.035*alert;p.rarm.rotation.z=.035*alert;
 }
 const previous=GUARD.update;
 GUARD.update=function(dt,...args){
   const x=this.pos?.x,z=this.pos?.z;
   const result=previous.call(this,dt,...args);
   if(!this.meshyBoneRig&&this.meshySpecialModel&&this.state!=='DEAD'&&!this.corpseRemoved)
     this.meshyBoneRig=install(this.meshySpecialModel);
   const rig=this.meshyBoneRig;
   if(rig){
     const speed=this.state==='DEAD'?0:
       Math.hypot(this.pos.x-x,this.pos.z-z)/Math.max(.001,dt||.016);
     animate(this,rig,dt,speed);
   }
   return result;
 };
 const previousDamage=GUARD.takeDamage;
 GUARD.takeDamage=function(...args){
   const killed=previousDamage.apply(this,args);
   if(killed&&this.meshyBoneRig)this.meshyBoneRig.deathTime=0;
   return killed;
 };
 if(typeof window!=='undefined')window.GoldenEyeMeshyRig={
   version:'2.7',bones:17,install,influences,animate
 };
})();
