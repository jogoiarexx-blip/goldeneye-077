/**
 * GoldenEye 077 v3.2 — marcha leve para o soldado Meshy já corrigido.
 * O arquivo Meshy reconstruído não tem bones: deformações suaves das pernas
 * e mangas em buffers independentes (sem rig automático, sem skinning danificado).
 * Conserva UV, material, colisão dos tiros e 5s de desaparecimento dos corpos.
 */
(() => {
  'use strict';
  if (typeof GuardAgent === 'undefined') return;
  const GUARD=GuardAgent.prototype;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=(a,b,v)=>{
    const t=clamp((v-a)/(b-a),0,1);
    return t*t*(3-2*t);
  };
  function createMotion(model) {
    const parts=[];
    model.traverse(node=>{
      if(!node.isMesh || !node.geometry?.getAttribute)return;
      const geometry=node.geometry,attribute=geometry.getAttribute('position');
      if(!attribute||attribute.itemSize!==3||!attribute.array||
         !attribute.array.BYTES_PER_ELEMENT || attribute.count<50)return;
      if(!geometry.boundingBox)geometry.computeBoundingBox();
      const bb=geometry.boundingBox;
      const height=bb.max.y-bb.min.y,halfWidth=(bb.max.x-bb.min.x)*.5;
      if(height<.1||halfWidth<.05)return;
      const base=new Float32Array(attribute.array);
      // The geometry is cloned per Meshy guard. Expand raycast bounds once,
      // because feet/sleeves can extend roughly 0.15 units during a step.
      if(!geometry.boundingSphere)geometry.computeBoundingSphere();
      if(geometry.boundingSphere)geometry.boundingSphere.radius+=.24;
      bb.expandByScalar(.24);
      parts.push({
        attribute,base,minY:bb.min.y+.24,height,centerX:(bb.min.x+bb.max.x)*.5,
        halfWidth
      });
    });
    return {phase:0,blend:0,age:0,parts,frames:0};
  }
  function deform(motion) {
    const stepPhase=motion.phase,blend=motion.blend;
    for(const part of motion.parts){
      const {attribute,base,minY,height,centerX,halfWidth}=part;
      const current=attribute.array;
      for(let k=0;k<base.length;k+=3){
        const x=base[k],y=base[k+1],z=base[k+2];
        const yn=clamp((y-minY)/height,0,1);
        const sideX=(x-centerX)/Math.max(.01,halfWidth);
        const lateral=Math.abs(sideX);
        const phase=stepPhase+(sideX<0?0:Math.PI);
        const stride=Math.sin(phase);
        // Hips/upper body remain intact: only legs below the groin
        // and sleeves outside the torso deform, with smooth transitions.
        const leg=(1-smooth(.38,.53,yn))*smooth(.10,.36,lateral);
        const foot=clamp((.50-yn)/.50,0,1);
        const sleeve=smooth(.49,.83,lateral)*smooth(.47,.59,yn)*
          (1-smooth(.77,.88,yn));
        current[k]=x;
        current[k+1]=y+leg*foot*.065*blend*Math.max(0,stride)+
          sleeve*.014*blend*Math.cos(phase);
        current[k+2]=z+leg*foot*.18*blend*stride-
          sleeve*.09*blend*stride;
      }
      attribute.needsUpdate=true;
    }
    motion.frames++;
  }
  const oldUpdate=GUARD.update;
  GUARD.update=function(dt,...args){
    const x=this.pos?.x,z=this.pos?.z;
    const result=oldUpdate.call(this,dt,...args);
    if(!this.meshySpecialModel||this.corpseRemoved)return result;
    if(!this.meshyMotion)this.meshyMotion=createMotion(this.meshySpecialModel);
    const motion=this.meshyMotion;
    // Leave the last pose for the existing animated fall and 5-second cleanup.
    if(this.state==='DEAD')return result;
    const step=clamp(Number.isFinite(dt)?dt:0,0,.05);
    if(!step)return result;
    const speed=Number.isFinite(x)&&Number.isFinite(z)
      ?Math.hypot(this.pos.x-x,this.pos.z-z)/step:0;
    const target=clamp(speed/1.6,0,1);
    motion.blend+=(target-motion.blend)*Math.min(1,step*9);
    motion.phase+=step*(2.2+motion.blend*8);
    motion.age+=step;
    const player=args[0],far=player&&this.pos?.distanceToSquared
      ?this.pos.distanceToSquared(player)>30*30:false;
    const interval=far?.15:.04;
    if(motion.age>=interval){
      motion.age=0;
      deform(motion);
    }
    return result;
  };
  if(typeof window!=='undefined')window.GoldenEyeGuardMotion={
    version:'3.2',createMotion,deform
  };
})();
