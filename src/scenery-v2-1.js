/** Static surface detailing for the ten existing missions. No new gameplay volumes. */
(() => {
  'use strict';
  const WORLD=DamLevelBuilder.prototype;
  const themes={
    dam:{label:'REPRESA / MANUTENCAO',metal:0x465765,accent:0xb69b60},
    facility:{label:'LABORATORIO / AREA TECNICA',metal:0x596f73,accent:0x609b98},
    runway:{label:'HANGAR / OPERACOES AEREAS',metal:0x4c5b64,accent:0xbba66b},
    surface1:{label:'ESTACAO / SERVICO',metal:0x59695e,accent:0xb7cbd2,snow:true},
    bunker1:{label:'COMUNICACOES / SETOR',metal:0x425861,accent:0x6b9b9c,cables:true},
    silo:{label:'SILO / AREA DE COMBUSTIVEL',metal:0x5d6268,accent:0xb6a062,cables:true},
    frigate:{label:'CONVES / COMPARTIMENTO',metal:0x64767b,accent:0xc1b78a},
    surface2:{label:'ZONA MILITAR / RESTRITO',metal:0x384750,accent:0xb47b65,snow:true},
    bunker2:{label:'DETENCAO / SETOR',metal:0x4f5b60,accent:0xa17e66,cables:true},
    statue:{label:'PARQUE / MONUMENTO',metal:0x555650,accent:0x858271,stone:true}
  };
  const addBox=WORLD.addBox;
  WORLD.addBox=function(x,y,z,w,h,d,material,solid=true,castShadow=true){
    const mesh=addBox.apply(this,arguments);
    if(this.sceneryCapture)this.sceneryCapture.push({x,y,z,w,h,d,solid,mesh});
    return mesh;
  };
  function decorate(world,id,boxes){
    const theme=themes[id];if(!theme)return;
    const group=new THREE.Group();group.name='scenery-v2.1-'+id;
    group.userData.visualOnly=true;
    world.levelGroup.add(group);
    const batches=[[],[],[]];
    const part=(batch,x,y,z,w,h,d)=>{
      if(batches.reduce((n,a)=>n+a.length,0)>=300)return;
      batches[batch].push([x,y,z,w,h,d]);
    };
    let walls=0,roofs=0,plinths=0,labels=0;
    // Reserve snow before facade details consume the instance budget.
    if(theme.snow)for(const b of boxes){
      const {x,y,z,w,h,d}=b;
      if(!b.solid&&h>.2&&h<.6&&y>4&&y<5&&w>8&&d>8&&roofs<8){
        part(2,x,y+h/2+.045,z,w,.09,d);roofs++;
      }
    }
    for(const b of boxes){
      const {x,y,z,w,h,d}=b;
      // Monument bases: inset masonry joints, no floating loose stones.
      if(theme.stone&&b.solid&&w>2&&w<9&&d>2&&d<10&&h>.5&&h<2.5&&Math.abs(y-h/2)<.1){
        for(const side of [-1,1]){
          part(0,x,y,z+side*(d/2+.003),w,.045,.012);
          part(0,x+side*(w/2+.003),y,z,.012,.045,d);
        }
        plinths++;continue;
      }
      const alongX=w>d, length=alongX?w:d, thickness=alongX?d:w;
      // Only ground-supported static walls. Never gates, props, windows,
      // elevated walkways or the horizontal roof/floor slabs.
      if(theme.stone||!b.solid||h<3||thickness>1.1||thickness<.25||length<3||(y-h/2)>.1||(y-h/2)<-.7||walls>=18)continue;
      walls++;
      const span=Math.min(length-.2,22),height=Math.min(h-.2,3.9);
      const face=(batch,side,u,v,ww,hh,depth=.018)=>{
        part(batch,alongX?x+u:x+side*(thickness/2+.006),v,
          alongX?z+side*(thickness/2+.006):z+u,
          alongX?ww:depth,hh,alongX?depth:ww);
      };
      for(const side of [-1,1]){
        face(0,side,0,Math.max(.12,y-h/2+.14),span,.18);
        // Expansion seams and fastened upper service channel.
        for(let u=-span/2+.7;u<span/2;u+=3.6)face(0,side,u,Math.max(height/2,.9),.035,height);
        face(0,side,0,2.85,span,.085);
        if(theme.cables){
          face(1,side,0,2.98,span,.035);
          for(let u=-span/2+.4;u<span/2;u+=4)face(0,side,u,2.96,.085,.3);
        }
        // Passive ventilation grille; no emissive glow suggesting an objective.
        if(length>5){
          face(0,side,.65,2.18,.8,.46);
          for(let v=2.04;v<2.37;v+=.085)face(1,side,.65,v,.66,.022,.029);
        }
      }
      if(labels<5&&length>5){
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#202a30';ctx.fillRect(0,0,512,96);
        ctx.fillStyle='#d5dfe0';ctx.font='bold 24px sans-serif';
        ctx.fillText(theme.label,16,39);ctx.font='20px sans-serif';
        ctx.fillText('INFRAESTRUTURA  /  '+String(labels+1).padStart(2,'0'),16,74);
        const texture=new THREE.CanvasTexture(canvas);texture.anisotropy=1;
        const mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
        const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.31),mat);
        sign.position.set(alongX?x-1:x+thickness/2+.025,1.95,alongX?z+thickness/2+.025:z-1);
        if(!alongX)sign.rotation.y=Math.PI/2;
        group.add(sign);labels++;
      }
    }
    const colors=[theme.metal,theme.accent,0xd7e4e8];
    batches.forEach((items,i)=>{
      if(!items.length)return;
      const geometry=new THREE.BoxGeometry(1,1,1);
      const material=new THREE.MeshStandardMaterial({color:colors[i],roughness:.94,metalness:i===2?0:.2});
      const mesh=new THREE.InstancedMesh(geometry,material,items.length);
      const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
      items.forEach((p,n)=>{position.set(...p.slice(0,3));scale.set(...p.slice(3));matrix.compose(position,rotation,scale);mesh.setMatrixAt(n,matrix)});
      mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;
      group.add(mesh);
    });
    world.sceneryReport={mission:id,walls,roofs,plinths,labels,instances:batches.reduce((n,a)=>n+a.length,0),batches:batches.filter(a=>a.length).length};
  }
  const clear=WORLD.clear;
  WORLD.clear=function(){
    // InstancedMesh owns an instance buffer in addition to geometry/material.
    this.levelGroup?.children.filter(o=>o.name?.startsWith('scenery-v2.1-')).forEach(group=>{
      group.traverse(o=>{if(o.isInstancedMesh)o.dispose()});
    });
    this.sceneryReport=null;
    return clear.apply(this,arguments);
  };
  const build=WORLD.build;
  WORLD.build=function(id='dam'){
    const previous=this.sceneryCapture,capture=[];this.sceneryCapture=capture;
    try{
      const result=build.apply(this,arguments);
      decorate(this,id,capture);return result;
    }finally{this.sceneryCapture=previous}
  };
})();
