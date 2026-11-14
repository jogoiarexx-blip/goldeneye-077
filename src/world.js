    class ProceduralTextures {
      static createNoiseTexture(baseHex, variation, repeatX = 1, repeatY = 1, addGrid = false) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const baseColor = new THREE.Color(baseHex);
        const rBase = Math.floor(baseColor.r * 255);
        const gBase = Math.floor(baseColor.g * 255);
        const bBase = Math.floor(baseColor.b * 255);

        const imgData = ctx.createImageData(size, size);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const delta = (Math.random() - 0.5) * variation;
          imgData.data[i] = Math.max(0, Math.min(255, rBase + delta));
          imgData.data[i + 1] = Math.max(0, Math.min(255, gBase + delta));
          imgData.data[i + 2] = Math.max(0, Math.min(255, bBase + delta));
          imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        if (addGrid) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
          ctx.lineWidth = 2;
          ctx.strokeRect(1, 1, size - 2, size - 2);
          ctx.beginPath();
          ctx.moveTo(0, size / 2);
          ctx.lineTo(size, size / 2);
          ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        return tex;
      }

      static createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#2b323b';
        ctx.fillRect(0, 0, 256, 256);

        // Granulação do asfalto
        for (let i = 0; i < 4500; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          const v = 35 + Math.floor(Math.random() * 28);
          ctx.fillStyle = `rgb(${v},${v + 4},${v + 9})`;
          ctx.fillRect(x, y, 2, 2);
        }

        // Faixas viárias desgastadas
        ctx.fillStyle = 'rgba(226, 232, 240, 0.28)';
        ctx.fillRect(14, 0, 5, 256);
        ctx.fillRect(237, 0, 5, 256);

        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.fillRect(125, 24, 6, 85);
        ctx.fillRect(125, 152, 6, 85);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 18);
        return tex;
      }
    }

    class DamLevelBuilder {
      constructor(scene) {
        this.scene = scene;
        this.colliders = [];      // Caixas AABB { minX, maxX, minZ, maxZ }
        this.alarms = [];         // Caixas de alarme destrutíveis
        this.barrels = [];        // Barris explosivos vermelhos
        this.padlocks = [];       // Cadeados destrutíveis nos portões (Dam N64)
        this.glassPanes = [];     // Vidros quebráveis nas guaritas e torres
        this.tanks = [];          // Tanques químicos destrutíveis (Facility)
        this.emplacements = [];   // Baterias de mísseis e metralhadoras pesadas (Runway)
        this.npcs = [];           // NPCs aliados/civis (Doak, 006, Cientistas)
        this.cameras = [];        // Câmeras de vigilância motorizadas
        this.gates = [];          // Portões deslizantes de segurança
        this.pickups = [];        // Munição, coletes e Sniper Rifle coletáveis
        this.interactables = [];  // Terminais, interruptores de portão e zona de salto
        this.guardSpawns = [];    // Pontos de patrulha
        this.animatedProps = [];  // Água, espuma de vertedouro, hélices e luzes
        this.planeMesh = null;
        this.tankVehicle = null;  // Tanque soviético pilotável na Runway
        this.bounds = { minX: -9.1, maxX: 9.1, minZ: -125.2, maxZ: 43.2, isDam: true };
        this.levelGroup = new THREE.Group();
        this.scene.add(this.levelGroup);
      }

      clear() {
        // Ao trocar/reiniciar missões, remover só o Group não libera a memória
        // GPU de geometrias e CanvasTextures. Descartar apenas recursos do mapa
        // anterior (sem tocar no jogador, arma, HUD ou meshes dos guardas).
        if (this.levelGroup && typeof this.levelGroup.traverse === 'function') {
          const geometries = new Set();
          const materials = new Set();
          const textures = new Set();
          this.levelGroup.traverse(object => {
            if (object.geometry) geometries.add(object.geometry);
            const mat = object.material;
            if (Array.isArray(mat)) mat.forEach(item => materials.add(item));
            else if (mat) materials.add(mat);
          });
          for (const mat of materials) {
            if (!mat) continue;
            for (const key of ['map', 'normalMap', 'roughnessMap',
              'metalnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'bumpMap']) {
              if (mat[key]) textures.add(mat[key]);
            }
            if (typeof mat.dispose === 'function') mat.dispose();
          }
          geometries.forEach(geom => geom.dispose?.());
          textures.forEach(texture => texture.dispose?.());
        }
        this.scene.remove(this.levelGroup);
        this.levelGroup = new THREE.Group();
        this.scene.add(this.levelGroup);
        this.colliders = [];
        this.alarms = [];
        this.barrels = [];
        this.padlocks = [];
        this.glassPanes = [];
        this.tanks = [];
        this.emplacements = [];
        this.npcs = [];
        this.cameras = [];
        this.gates = [];
        this.pickups = [];
        this.interactables = [];
        this.guardSpawns = [];
        this.animatedProps = [];
        this.damJumpAnchor = null;
        this.damJumpPoint = null;
        this.pickupBadges = null;
        this.planeMesh = null;
        this.tankVehicle = null;
      }

      addBreakableGlass(x, y, z, w, h, d) {
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.35,
          roughness: 0.1,
          metalness: 0.8
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat);
        mesh.position.set(x, y, z);
        this.levelGroup.add(mesh);
        this.glassPanes.push({ mesh, broken: false, position: new THREE.Vector3(x, y, z) });
      }

      addBox(x, y, z, w, h, d, material, solid = true, castShadow = true) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(x, y, z);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        this.levelGroup.add(mesh);

        if (solid) {
          this.colliders.push({
            minX: x - w / 2,
            maxX: x + w / 2,
            minZ: z - d / 2,
            maxZ: z + d / 2,
            minY: y - h / 2,
            maxY: y + h / 2
          });
        }
        return mesh;
      }

      addAlarmBox(id, x, y, z, rotY = 0) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotY;

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.52, 0.22),
          new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.4 })
        );
        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0xff3b3b })
        );
        light.position.set(0, 0.14, 0.13);

        group.add(body, light);
        this.levelGroup.add(group);

        this.alarms.push({
          id,
          mesh: group,
          light,
          destroyed: false,
          position: new THREE.Vector3(x, y, z)
        });
      }

      addSecurityGate(id, x, z, width, matFrame, matBars) {
        // Batentes laterais fixos
        this.addBox(x - width / 2 - 0.3, 2.1, z, 0.6, 4.2, 0.8, matFrame, true);
        this.addBox(x + width / 2 + 0.3, 2.1, z, 0.6, 4.2, 0.8, matFrame, true);

        // Folha deslizante do portão
        const gateMesh = new THREE.Group();
        gateMesh.position.set(x, 0, z);

        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.35, 0.3), matFrame);
        topBeam.position.y = 3.8;
        const botBeam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.35, 0.3), matFrame);
        botBeam.position.y = 0.2;
        gateMesh.add(topBeam, botBeam);

        const barCount = Math.floor(width / 0.45);
        for (let i = 0; i <= barCount; i++) {
          const bx = -width / 2 + 0.2 + i * ((width - 0.4) / barCount);
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.6, 8), matBars);
          bar.position.set(bx, 2.0, 0);
          gateMesh.add(bar);
        }

        // Cadeado físico destrutível preso ao portão (fiel ao GoldenEye N64)
        const lockGroup = new THREE.Group();
        lockGroup.position.set(-width / 2 + 0.45, 1.45, 0.22);
        const lockBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.34, 0.16),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.25 })
        );
        const shackle = new THREE.Mesh(
          new THREE.TorusGeometry(0.09, 0.025, 8, 12, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
        );
        shackle.position.y = 0.18;
        lockGroup.add(lockBody, shackle);
        gateMesh.add(lockGroup);

        this.levelGroup.add(gateMesh);

        const collider = {
          minX: x - width / 2,
          maxX: x + width / 2,
          minZ: z - 0.35,
          maxZ: z + 0.35,
          minY: 0,
          maxY: 4.0
        };
        this.colliders.push(collider);

        const gateObj = {
          id,
          mesh: gateMesh,
          collider,
          closedX: x,
          openX: x + width - 0.3,
          isOpen: false,
          progress: 0
        };
        this.gates.push(gateObj);

        this.padlocks.push({
          gateId: id,
          mesh: lockGroup,
          destroyed: false,
          position: new THREE.Vector3(x - width / 2 + 0.45, 1.45, z + 0.22)
        });
      }

      addSecurityCamera(x, y, z, baseYaw) {
        const camGroup = new THREE.Group();
        camGroup.position.set(x, y, z);

        const mount = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.22, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 })
        );
        const head = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.2, 0.48),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
        );
        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.z = 0.25;
        head.add(body, lens);

        camGroup.add(mount, head);
        this.levelGroup.add(camGroup);

        this.cameras.push({
          position: new THREE.Vector3(x, y, z),
          mesh: camGroup,
          head,
          lens,
          baseYaw,
          currentYaw: baseYaw,
          destroyed: false
        });
      }

      addPickup(type, x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.userData.pickupType = type;

        // Silhuetas legíveis mesmo sem texturas externas: munição = caixa +
        // cartuchos, colete = placas de proteção e alças. A escala mantém
        // a área de coleta original (raio 1.8 do motor).
        const matMetal = new THREE.MeshStandardMaterial({
          color: 0x243449, roughness: 0.45, metalness: 0.64
        });
        const matAmmo = new THREE.MeshStandardMaterial({
          color: 0x50694c, roughness: 0.73, metalness: 0.21
        });
        const matBrass = new THREE.MeshStandardMaterial({
          color: 0xfbbf65, metalness: 0.73, roughness: 0.32
        });
        const matArmor = new THREE.MeshStandardMaterial({
          color: 0x137f96, roughness: 0.54, metalness: 0.25
        });
        const matArmorDark = new THREE.MeshStandardMaterial({
          color: 0x114454, roughness: 0.76, metalness: 0.17
        });
        const matWhite = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        const addPart = (geo, mat, px, py, pz) => {
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(px, py, pz);
          mesh.castShadow = false;
          group.add(mesh);
          return mesh;
        };

        if (type === 'armor') {
          // Colete real em miniatura: torso, ombreiras, costuras e emblema.
          addPart(new THREE.BoxGeometry(.68,.78,.25),matArmor,0,0,0);
          addPart(new THREE.BoxGeometry(.52,.43,.038),matArmorDark,0,.11,.146);
          for(const side of [-1,1]){
            addPart(new THREE.BoxGeometry(.20,.31,.26),matArmorDark,
              side*.40,.33,-.014);
            addPart(new THREE.BoxGeometry(.13,.57,.08),matMetal,
              side*.26,.06,-.05);
            addPart(new THREE.BoxGeometry(.10,.23,.045),matWhite,
              side*.20,.06,.176);
          }
          addPart(new THREE.BoxGeometry(.64,.095,.29),matMetal,0,-.30,0);
          const shield = new THREE.Mesh(new THREE.OctahedronGeometry(.15,0),matWhite);
          shield.position.set(0,.15,.205);
          shield.rotation.z=Math.PI/4;
          group.add(shield);
          addPart(new THREE.BoxGeometry(.14,.19,.05),matArmorDark,0,.52,0);
        } else if(type === 'ammo') {
          // Caixa de munição com tampa, fecho e 5 cartuchos de latão visíveis.
          addPart(new THREE.BoxGeometry(.75,.38,.49),matAmmo,0,-.13,0);
          addPart(new THREE.BoxGeometry(.78,.075,.53),matMetal,0,.085,0);
          addPart(new THREE.BoxGeometry(.35,.11,.044),matBrass,0,-.04,.277);
          addPart(new THREE.BoxGeometry(.40,.09,.24),matMetal,0,.145,-.04);
          for(let i=0;i<5;i++){
            const px=-.26+i*.13;
            addPart(new THREE.CylinderGeometry(.045,.052,.35,8),
              matBrass,px,.32,.035);
            addPart(new THREE.ConeGeometry(.045,.12,8),
              matWhite,px,.55,.035);
          }
        } else {
          // Rifle especial continua reconhecível e recolhível.
          addPart(new THREE.BoxGeometry(.12,.16,.95),matMetal,0,0,0);
          const scope = addPart(
            new THREE.CylinderGeometry(.035,.035,.38,10),matWhite,
            0,.13,0
          );
          scope.rotation.x=Math.PI/2;
        }

        // Aro iluminado no chão e legenda 2D que sempre encara a câmera.
        const baseColor=type==='armor'?0x22d3ee:
          type==='ammo'?0xfbbf24:0x38bdf8;
        const ring=new THREE.Mesh(
          new THREE.RingGeometry(.45,.55,24),
          new THREE.MeshBasicMaterial({
            color:baseColor,transparent:true,opacity:.72,
            side:THREE.DoubleSide,depthWrite:false
          })
        );
        ring.rotation.x=-Math.PI/2;
        ring.position.y=type==='armor' ? -.73 : -.40;
        ring.raycast=()=>{};
        group.add(ring);
        if(type==='ammo'||type==='armor'){
          this.pickupBadges=this.pickupBadges||{};
          let badgeTexture=this.pickupBadges[type];
          if(!badgeTexture){
            const canvas=document.createElement('canvas');
            canvas.width=256;canvas.height=96;
            const ctx=canvas.getContext('2d');
            ctx.clearRect(0,0,256,96);
            ctx.fillStyle='rgba(5,15,30,.86)';
            ctx.fillRect(4,15,248,64);
            ctx.fillStyle=type==='armor'?'#22d3ee':'#fbbf24';
            ctx.fillRect(4,15,248,5);
            ctx.font='bold 29px sans-serif';
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            ctx.fillText(type==='armor'?'COLETE':'MUNIÇÃO',128,49);
            badgeTexture=new THREE.CanvasTexture(canvas);
            this.pickupBadges[type]=badgeTexture;
          }
          const badge=new THREE.Sprite(new THREE.SpriteMaterial({
            map:badgeTexture,transparent:true,depthWrite:false,
            depthTest:true
          }));
          badge.position.set(0,type==='armor'?1.17:1.05,0);
          badge.scale.set(1.52,.57,1);
          badge.raycast=()=>{};
          group.add(badge);
        }
        this.levelGroup.add(group);
        this.pickups.push({
          type,
          position:new THREE.Vector3(x,y,z),
          mesh:group,
          collected:false
        });
      }

      addExplosiveBarrel(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0.55, z);

        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 1.1, 14),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.3 })
        );
        body.castShadow = true;
        const stripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.37, 0.37, 0.22, 14),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        group.add(body, stripe);
        this.levelGroup.add(group);

        this.barrels.push({
          position: new THREE.Vector3(x, 0.55, z),
          mesh: group,
          exploded: false
        });
      }

      addChemicalTank(id, x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.72, 0.78, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 })
        );
        base.position.y = 0.2;

        const glass = new THREE.Mesh(
          new THREE.CylinderGeometry(0.62, 0.62, 2.3, 16),
          new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.45, roughness: 0.2 })
        );
        glass.position.y = 1.55;
        glass.castShadow = true;

        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.68, 0.68, 0.35, 16),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
        );
        cap.position.y = 2.85;

        group.add(base, glass, cap);
        this.levelGroup.add(group);

        this.colliders.push({
          minX: x - 0.75, maxX: x + 0.75,
          minZ: z - 0.75, maxZ: z + 0.75,
          minY: 0, maxY: 3.0
        });

        this.tanks.push({
          id,
          position: new THREE.Vector3(x, 1.5, z),
          mesh: group,
          glass,
          hp: 45,
          destroyed: false
        });
      }

      addCharacterNPC(id, role, x, z, yaw, coatColor) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.rotation.y = yaw;

        const matCoat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.6 });
        const matPants = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
        const matSkin = new THREE.MeshStandardMaterial({ color: 0xd6a588, roughness: 0.65 });

        const legs = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.22), matPants);
        legs.position.y = 0.42;
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.75, 0.26), matCoat);
        torso.position.y = 1.18;
        torso.castShadow = true;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 14), matSkin);
        head.position.y = 1.72;

        group.add(legs, torso, head);
        this.levelGroup.add(group);

        this.npcs.push({
          id,
          role, // 'doak' | '006' | 'scientist'
          position: new THREE.Vector3(x, 0, z),
          mesh: group,
          dead: false,
          talked: false
        });
      }

      addHeavyEmplacement(id, kind, x, z, rotY) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.rotation.y = rotY;

        const matBase = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });
        const matAccent = new THREE.MeshStandardMaterial({
          color: kind === 'missile' ? 0xb91c1c : 0xd97706,
          metalness: 0.5, roughness: 0.35
        });

        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.6, 12), matBase);
        base.position.y = 0.3;
        base.castShadow = true;

        const turret = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.6), matAccent);
        turret.position.y = 1.05;
        turret.castShadow = true;

        group.add(base, turret);

        if (kind === 'missile') {
          [-0.4, 0.4].forEach(ox => {
            const pod = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 1.9), matBase);
            pod.position.set(ox, 1.55, 0.1);
            pod.rotation.x = -0.32;
            group.add(pod);
          });
        } else {
          [-0.25, 0.25].forEach(ox => {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8), matBase);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(ox, 1.15, 1.2);
            group.add(barrel);
          });
        }

        this.levelGroup.add(group);
        this.colliders.push({
          minX: x - 1.3, maxX: x + 1.3,
          minZ: z - 1.3, maxZ: z + 1.3,
          minY: 0, maxY: 2.2
        });

        this.emplacements.push({
          id, kind,
          position: new THREE.Vector3(x, 1.0, z),
          mesh: group,
          turret,
          hp: 65,
          fireCooldown: 1.5 + Math.random(),
          destroyed: false
        });
      }

      buildDrivableTank(x, z, rotY) {
        const tankGroup = new THREE.Group();
        tankGroup.position.set(x, 0, z);
        tankGroup.rotation.y = rotY;

        const matArmor = new THREE.MeshStandardMaterial({ color: 0x2f3e2e, roughness: 0.55, metalness: 0.45 });
        const matTracks = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.3 });
        const matSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });

        // Lagartas blindadas esquerda e direita
        [-1.35, 1.35].forEach(tx => {
          const track = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 5.2), matTracks);
          track.position.set(tx, 0.42, 0);
          track.castShadow = true;
          tankGroup.add(track);
        });

        // Chassi principal blindado
        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 4.8), matArmor);
        hull.position.y = 0.72;
        hull.castShadow = true;
        tankGroup.add(hull);

        // Torreta giratória + Canhão 100mm
        const turretGroup = new THREE.Group();
        turretGroup.position.set(0, 1.4, -0.2);

        const turretBody = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.68, 12), matArmor);
        turretBody.castShadow = true;

        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.6, 10), matSteel);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(0, 0.08, -2.1);

        const starBadge = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.24, 0.05),
          new THREE.MeshBasicMaterial({ color: 0xdc2626 })
        );
        starBadge.position.set(0, 0.1, 1.12);

        turretGroup.add(turretBody, cannon, starBadge);
        tankGroup.add(turretGroup);

        this.levelGroup.add(tankGroup);
        this.tankVehicle = {
          mesh: tankGroup,
          turret: turretGroup,
          position: new THREE.Vector3(x, 0, z),
          yaw: rotY
        };
      }

      buildEscapePlane(x, z) {
        // Avião Runway v2.2: bimotor de fuga procedural, baixo custo de GPU.
        const plane = new THREE.Group();
        plane.name = 'runway_aircraft_v2_2';
        plane.position.set(x, 0, z);
        const hullMat = new THREE.MeshStandardMaterial({ color: 0xcbd5de, roughness: 0.55, metalness: 0.28 });
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xaebfc9, roughness: 0.62, metalness: 0.2, side: THREE.DoubleSide });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x155e75, roughness: 0.51, metalness: 0.22 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x15394d, roughness: 0.15, metalness: 0.42 });
        const engineMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.48 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.46, metalness: 0.65 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95 });
        const propMat = new THREE.MeshStandardMaterial({ color: 0x253341, roughness: 0.62, metalness: 0.2 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xb45339, roughness: 0.7, side: THREE.DoubleSide });
        const mesh = (name, geometry, material, x0, y0, z0, shadow = false) => {
          const m = new THREE.Mesh(geometry, material);
          m.name = name;
          m.position.set(x0, y0, z0);
          m.castShadow = shadow;
          plane.add(m);
          return m;
        };
        // Quatro cantos e espessura: 12 triângulos por painel (sem texturas).
        const panel = (name, corners, offset, material) => {
          const back = corners.map(v => [v[0] + offset[0], v[1] + offset[1], v[2] + offset[2]]);
          const vertices = [];
          const tri = (a, b, c) => vertices.push(...a, ...b, ...c);
          tri(corners[0], corners[1], corners[2]);
          tri(corners[0], corners[2], corners[3]);
          tri(back[2], back[1], back[0]);
          tri(back[3], back[2], back[0]);
          for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4;
            tri(corners[i], back[i], back[j]);
            tri(corners[i], back[j], corners[j]);
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
          if (typeof geo.computeVertexNormals === 'function') geo.computeVertexNormals();
          return mesh(name, geo, material, 0, 0, 0, true);
        };

        // Corpo com nariz arredondado e cauda afunilada, orientado a -Z.
        const fuselage = mesh('fuselagem', new THREE.CylinderGeometry(0.83, 1, 9.0, 12),
          hullMat, 0, 2.38, 0.0, true);
        fuselage.rotation.x = Math.PI / 2;
        const nose = mesh('nariz', new THREE.SphereGeometry(1, 12, 8), hullMat, 0, 2.38, -4.35, true);
        nose.scale.set(0.92, 0.83, 1.43);
        const tail = mesh('corpo_traseiro', new THREE.CylinderGeometry(0.22, 0.8, 3.0, 12),
          hullMat, 0, 2.38, 4.72, true);
        tail.rotation.x = Math.PI / 2;
        for (const side of [-1, 1]) {
          mesh('faixa_identificacao', new THREE.BoxGeometry(0.035, 0.15, 6.6),
            trimMat, side * 0.98, 2.44, 0);
        }

        const cockpit = mesh('cockpit', new THREE.SphereGeometry(1, 12, 8),
          glassMat, 0, 3.04, -3.48, true);
        cockpit.scale.set(0.75, 0.46, 1.3);
        mesh('moldura_parabrisa', new THREE.BoxGeometry(0.065, 0.48, 0.12),
          metalMat, 0, 3.19, -4.41);
        for (const side of [-1, 1]) {
          for (let i = 0; i < 4; i++) {
            mesh('janela_lateral', new THREE.BoxGeometry(0.045, 0.31, 0.42),
              glassMat, side * 0.97, 2.62, -1.18 + i * 1.05);
          }
          panel(side < 0 ? 'asa_esquerda' : 'asa_direita', [
            [side * 0.65, 3.20, -1.95], [side * 8.6, 3.62, -0.65],
            [side * 8.28, 3.62, 1.08], [side * 0.65, 3.20, 1.48]
          ], [0, -0.18, 0], wingMat);
          const flap = mesh('flap', new THREE.BoxGeometry(3.5, 0.07, 0.38),
            engineMat, side * 5.28, 3.45, 1.01);
          flap.rotation.y = -side * 0.06;
          const roundel = mesh('marca_asa', new THREE.RingGeometry(0, 0.46, 12),
            accentMat, side * 6.1, 3.54, 0.17);
          roundel.rotation.x = -Math.PI / 2;
          panel('estabilizador_horizontal', [
            [side * 0.15, 2.77, 4.50], [side * 3.3, 2.96, 5.10],
            [side * 3.04, 2.96, 6.05], [side * 0.15, 2.77, 6.05]
          ], [0, -0.12, 0], wingMat);
        }
        panel('leme_vertical', [
          [-0.1, 3.00, 3.89], [-0.1, 5.55, 5.13],
          [-0.1, 5.33, 6.27], [-0.1, 3.0, 6.04]
        ], [0.2, 0, 0], trimMat);

        // Hélices com três pás rotacionando apenas em torno do eixo longitudinal.
        for (const side of [-1, 1]) {
          const ex = side * 3.5;
          const nacelle = mesh('nacele_motor', new THREE.CylinderGeometry(0.52, 0.58, 2.1, 12),
            engineMat, ex, 3.19, -1.07, true);
          nacelle.rotation.x = Math.PI / 2;
          const cowling = mesh('nariz_motor', new THREE.ConeGeometry(0.52, 0.72, 12),
            metalMat, ex, 3.19, -2.25);
          cowling.rotation.x = -Math.PI / 2;
          const prop = new THREE.Group();
          prop.name = side < 0 ? 'helice_esquerda' : 'helice_direita';
          prop.position.set(ex, 3.19, -2.75);
          for (let b = 0; b < 3; b++) {
            const arm = new THREE.Group();
            arm.rotation.z = b * Math.PI * 2 / 3;
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 0.07), propMat);
            blade.position.y = 0.61;
            blade.rotation.y = 0.12;
            arm.add(blade);
            prop.add(arm);
          }
          const hub = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), metalMat);
          prop.add(hub);
          plane.add(prop);
          this.animatedProps.push({ type: 'aircraft-propeller', mesh: prop });
        }

        // Trens de pouso com três rodas e braços retráteis na cutscene.
        const tireGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.27, 12);
        tireGeometry.rotateZ(Math.PI / 2);
        const gearList = [];
        for (const [name, gx, gz, top] of [
          ['trem_esquerdo', -3.38, 0.35, 2.98],
          ['trem_direito', 3.38, 0.35, 2.98],
          ['trem_nariz', 0, -4.0, 1.92]
        ]) {
          const group = new THREE.Group();
          group.name = name;
          group.position.set(gx, top, gz);
          const len = top - 0.43;
          const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, len, 7), metalMat);
          strut.position.y = -len / 2;
          group.add(strut);
          const wheel = new THREE.Mesh(tireGeometry, tireMat);
          wheel.position.y = 0.36 - top;
          group.add(wheel);
          plane.add(group);
          gearList.push(group);
        }
        plane.userData.landingGear = gearList;

        // Porta e escada lateral alinhadas com a área existente de interação.
        mesh('porta_embarque', new THREE.BoxGeometry(0.05, 1.15, 0.88),
          engineMat, -0.99, 2.32, 2.1);
        mesh('puxador', new THREE.BoxGeometry(0.09, 0.08, 0.17),
          metalMat, -1.04, 2.29, 2.32);
        for (let i = 0; i < 4; i++) {
          mesh('degrau', new THREE.BoxGeometry(0.58, 0.09, 0.71),
            engineMat, -2.62 + i * 0.37, 0.39 + i * 0.34, 2.1);
        }

        // Luzes emissivas piscantes, sem adicionar luz dinâmica nem sombras.
        for (const [name, lx, ly, lz, color, phase] of [
          ['luz_vermelha', -8.6, 3.66, 0.0, 0xef4444, 0],
          ['luz_verde', 8.6, 3.66, 0.0, 0x22c55e, Math.PI],
          ['luz_cauda', 0, 5.57, 5.18, 0xf8fafc, 1.1]
        ]) {
          const lightMat = new THREE.MeshStandardMaterial({
            color, emissive: color, emissiveIntensity: 1.25
          });
          const bulb = mesh(name, new THREE.SphereGeometry(0.13, 8, 6),
            lightMat, lx, ly, lz);
          this.animatedProps.push({ type: 'aircraft-light', mesh: bulb, phase });
        }
        this.levelGroup.add(plane);
        this.planeMesh = plane;
      }

      buildTruck(x, z, rotY, matBody, matCanvas, matWheel) {
        const truck = new THREE.Group();
        truck.position.set(x, 0, z);
        truck.rotation.y = rotY;

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 5.4), matBody);
        chassis.position.y = 0.65;
        chassis.castShadow = true;

        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.35, 1.7), matBody);
        cab.position.set(0, 1.45, -1.6);
        cab.castShadow = true;

        const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.65, 3.3), matCanvas);
        cargo.position.set(0, 1.6, 0.9);
        cargo.castShadow = true;

        truck.add(chassis, cab, cargo);

        const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 14);
        wheelGeo.rotateZ(Math.PI / 2);
        [[-1.1, -1.7], [1.1, -1.7], [-1.1, 0.8], [1.1, 0.8], [-1.1, 2.0], [1.1, 2.0]].forEach(([wx, wz]) => {
          const w = new THREE.Mesh(wheelGeo, matWheel);
          w.position.set(wx, 0.48, wz);
          truck.add(w);
        });

        this.levelGroup.add(truck);
        this.colliders.push({
          minX: x - 1.3,
          maxX: x + 1.3,
          minZ: z - 2.8,
          maxZ: z + 2.8,
          minY: 0,
          maxY: 2.5
        });
      }

      buildTransmissionTower(x, baseY, z, matSteel) {
        // baseY é a ALTURA DO PISO, não a altura da torre.
        // O erro antigo passava 18 como baseY e deixava a torre no ar.
        const tower = new THREE.Group();
        tower.position.set(x, baseY, z);
        tower.userData.structureType = 'transmission-tower';
        tower.userData.baseY = baseY;
        tower.userData.height = 18;

        const legOffsets = [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 18, 6), matSteel);
          leg.position.set(lx * 0.6, 9, lz * 0.6);
          leg.rotation.z = lx * 0.03;
          leg.rotation.x = -lz * 0.03;
          tower.add(leg);
          const shoe = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.24, 0.55), matSteel
          );
          shoe.position.set(lx * 0.6, 0.06, lz * 0.6);
          tower.add(shoe);
        });

        // Travamentos estruturais no fuste: diagonais leves e sem colisão.
        for (const h of [3.0, 7.0, 11.0, 15.0]) {
          for (const side of [-1, 1]) {
            const brace = new THREE.Mesh(
              new THREE.CylinderGeometry(0.055, 0.055, 3.55, 5), matSteel
            );
            brace.position.set(side * 0.7, h, 0);
            brace.rotation.z = side * 0.42;
            tower.add(brace);
          }
        }

        [5, 10, 15].forEach((h, idx) => {
          const w = 2.6 - idx * 0.55;
          const ring = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, w), matSteel);
          ring.position.y = h;
          tower.add(ring);
        });

        const crossArm = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 0.25), matSteel);
        crossArm.position.y = 16.5;
        tower.add(crossArm);

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 })
        );
        beacon.position.y = 18.2;
        tower.add(beacon);

        this.levelGroup.add(tower);
        this.animatedProps.push({ type: 'beacon', mesh: beacon });
      }

      build(missionId = 'dam') {
        this.clear();
        if (missionId === 'facility') {
          this.buildFacilityLevel();
          return;
        }
        if (missionId === 'runway') {
          this.buildRunwayLevel();
          return;
        }
        this.bounds = { minX: -9.1, maxX: 9.1, minZ: -125.2, maxZ: 43.2, isDam: true };

        // Texturas e Materiais PBR
        const texRoad = ProceduralTextures.createRoadTexture();
        const texConcrete = ProceduralTextures.createNoiseTexture('#64748b', 22, 6, 3, true);
        const texRock = ProceduralTextures.createNoiseTexture('#374151', 35, 8, 8, false);
        const texSnow = ProceduralTextures.createNoiseTexture('#cbd5e1', 18, 4, 4, false);
        const texWater = ProceduralTextures.createNoiseTexture('#0c4a6e', 26, 12, 18, false);

        const matRoad = new THREE.MeshStandardMaterial({ map: texRoad, roughness: 0.82, metalness: 0.08 });
        const matConcrete = new THREE.MeshStandardMaterial({ map: texConcrete, roughness: 0.72, metalness: 0.12 });
        const matDarkWall = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.2 });
        const matMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
        const matRock = new THREE.MeshStandardMaterial({ map: texRock, roughness: 0.94 });
        const matSnow = new THREE.MeshStandardMaterial({ map: texSnow, roughness: 0.85 });
        const matWater = new THREE.MeshStandardMaterial({
          map: texWater,
          color: 0x0369a1,
          roughness: 0.22,
          metalness: 0.55
        });
        const matHazard = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.3 });

        this.animatedProps.push({ type: 'water', tex: texWater });

        // 1. PISTA PRINCIPAL DA REPRESA, RESERVATÓRIO DIREITO & VERTEDOUROS ESQUERDOS
        this.addBox(0, -0.5, -42, 20, 1.0, 174, matRoad, false);
        this.addBox(-8.6, 0.12, -42, 2.6, 0.24, 174, matConcrete, false);
        this.addBox(8.6, 0.12, -42, 2.6, 0.24, 174, matConcrete, false);

        // Parapeito esquerdo sobre o abismo + contrafortes estruturais + comportas de água (Spillways)
        // Acesso real ao bungee: interrompe o parapeito em Z -121.4 .. -114.8.
        // A antiga parede contínua bloqueava toda a passagem até a plataforma.
        // Duas aberturas reais: píer em Z=-44 e bungee em Z=-118.
        // A versão anterior só abria o salto, isolando coletes e guarda do píer.
        this.addBox(-9.8,0.75,2.575,.45,1.5,84.85,matConcrete,true);
        this.addBox(-9.8,0.75,-81.35,.45,1.5,66.9,matConcrete,true);
        this.addBox(-9.8,0.75,-125.2,.45,1.5,7.6,matConcrete,true);
        const matFoam = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.55 });
        for (let z = 36; z >= -120; z -= 14) {
          this.addBox(-10.6, -18, z, 2.2, 38, 2.4, matConcrete, false);
          // Queda d'água animada entre os contrafortes centrais da barragem
          if (z <= -6 && z >= -90) {
            const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 34), matFoam);
            waterfall.rotation.y = -Math.PI / 2;
            waterfall.position.set(-11.65, -18.5, z - 7);
            this.levelGroup.add(waterfall);
            this.animatedProps.push({ type: 'waterfall', mesh: waterfall, baseZ: z });
          }
          if (Math.abs(z) % 28 === 0) {
            this.addBox(-9.8, 3.2, z, 0.22, 5.2, 0.22, matMetal, false);
            const lamp = new THREE.Mesh(
              new THREE.BoxGeometry(0.55, 0.14, 0.28),
              new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
            );
            lamp.position.set(-9.4, 5.75, z);
            this.levelGroup.add(lamp);
          }
        }

        // Reservatório e encostas: os antigos dois cubos de 24/30m eram
        // paredes retangulares gigantes junto à pista (print do usuário).
        // Relevo em poucos volumes facetados, sempre fora da pista X -9..9.
        this.addBox(9.8, 0.75, -42, 0.45, 1.5, 174, matConcrete, true);
        this.addBox(26, -2.2, -55, 30, 1, 160, matWater, false, false);
        this.addBox(-34, -36, -42, 50, 1, 230, matWater, false, false);

        // Camadas em rocha com base imersa no reservatório, sem colliders
        // invisíveis atravessando a estrada e sem topo quadrado no horizonte.
        const rockRidges = [
          [27, 21, 11, 17], [36, 8, 16, 26], [44, -28, 17, 30],
          [45, -65, 19, 31], [39, -98, 18, 24],
          [27, 38, 8, 11]
        ];
        rockRidges.forEach(([rx, rz, radius, height], i) => {
          const cliff = new THREE.Mesh(
            new THREE.CylinderGeometry(
              Math.max(1.2, radius * .16), radius, height, 7
            ),
            i % 2 ? matRock : matSnow
          );
          cliff.position.set(rx, -2.0 + height / 2, rz);
          cliff.rotation.y = i * .61;
          cliff.receiveShadow = true;
          this.levelGroup.add(cliff);
        });
        // Montanhas distantes com perfil menos agressivo e FORA do
        // enquadramento imediatamente acima do parapeito.
        const peakCoords = [
          [-83, -24, -174, 34, 49],
          [-66, -26, -221, 43, 57],
          [66, -24, -205, 33, 46],
          [-85, -25, -69, 36, 51],
          [83, -25, -114, 37, 53]
        ];
        peakCoords.forEach(([px, py, pz, rad, height], i) => {
          const mountain = new THREE.Mesh(
            new THREE.ConeGeometry(rad, height, 8), i % 2 ? matSnow : matRock
          );
          mountain.position.set(px, py + height / 2, pz);
          this.levelGroup.add(mountain);
        });

        // Parede frontal de entrada (Z = +44) e Túnel Escavado Inicial Clássico (Z = +44 a +34)
        this.addBox(0, 4, 44.5, 22, 9, 1, matRock, true);
        this.addBox(0, 4.6, 39.5, 20, 1.2, 10, matRock, false);
        [42, 38, 34].forEach(zArch => {
          this.addBox(-8.8, 2.2, zArch, 1.2, 4.4, 0.8, matConcrete, true);
          this.addBox(8.8, 2.2, zArch, 1.2, 4.4, 0.8, matConcrete, true);
        });

        // Guarita do Túnel Inicial + Vidro quebrável + Barris explosivos estratégicos
        this.addBox(-7.2, 2.0, 35.5, 3.8, 4.0, 0.4, matDarkWall, true);
        this.addBox(-5.3, 2.0, 38.5, 0.4, 4.0, 5.6, matDarkWall, true);
        this.addBox(-7.2, 4.1, 38.5, 4.0, 0.3, 6.0, matMetal, false);
        this.addBreakableGlass(-7.2, 2.1, 35.25, 2.2, 1.3, 0.08);
        this.addPickup('ammo', -7.4, 0.5, 40.5);
        this.addExplosiveBarrel(-3.8, 16);
        this.addExplosiveBarrel(3.6, -18);
        this.addExplosiveBarrel(-4.2, -66);
        this.addExplosiveBarrel(3.8, -98);

        // 2. SETOR A: Guarita de Entrada (Z = +32), Torre de Sniper Clássica, Caminhão Militar & Túnel 1 (Z = +10)
        this.addBox(6.5, 1.8, 32, 6, 3.6, 0.4, matDarkWall, true);
        this.addBox(6.5, 1.8, 26, 6, 3.6, 0.4, matDarkWall, true);
        this.addBox(3.5, 1.8, 30.8, 0.4, 3.6, 2.4, matDarkWall, true);
        this.addBox(6.5, 3.7, 29, 6.4, 0.3, 6.6, matMetal, false);
        this.addBreakableGlass(3.48, 2.0, 27.5, 0.08, 1.2, 1.8);

        // Torre de Observação / Sniper Clássica à esquerda do Portão 1 (Z = +17, X = -6.8) com Sniper Rifle coletável
        this.addBox(-6.8, 1.8, 17.5, 3.6, 3.6, 3.6, matConcrete, false);
        this.addBox(-6.8, 3.7, 17.5, 4.2, 0.3, 4.2, matMetal, false);
        this.addPickup('sniper', -6.8, 0.75, 17.5);

        // Mesa interna da guarita + Botão do Portão 1
        this.addBox(7.8, 0.65, 28.5, 1.2, 1.3, 2.4, matMetal, true);
        const gateSwitch1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.28, 0.28),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        gateSwitch1.position.set(7.2, 1.38, 28.5);
        this.levelGroup.add(gateSwitch1);

        this.interactables.push({
          id: 'open_gate_1',
          type: 'gate_switch',
          gateId: 'gate_1',
          position: new THREE.Vector3(6.6, 1.0, 28.5),
          radius: 2.6,
          prompt: 'Pressione [E] para abrir o Portão do Túnel 1',
          completed: false,
          visualMesh: gateSwitch1
        });

        // Caminhão de transporte soviético estacionado perto do Túnel 1
        this.buildTruck(
          -5.8, 22, 0.12,
          new THREE.MeshStandardMaterial({ color: 0x36453b, roughness: 0.6 }),
          new THREE.MeshStandardMaterial({ color: 0x4b5842, roughness: 0.75 }),
          new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
        );

        // Arco / Túnel de Concreto 1 (Z = +10) + Portão de Segurança 1
        this.addBox(-6.5, 2.2, 10, 7, 4.4, 8, matConcrete, true);
        this.addBox(6.5, 2.2, 10, 7, 4.4, 8, matConcrete, true);
        this.addBox(0, 4.6, 10, 20, 0.8, 8, matConcrete, false);
        this.addSecurityGate('gate_1', 0, 10, 5.4, matMetal, matHazard);
        this.addSecurityCamera(-2.8, 3.8, 14.1, 0.2);

        // 3. SETOR B: Pátio Central, Pier Inferior (Ilha do Silo) & Sala de Controle (Z = -25 a -42)
        this.addBox(-4.8, 0.85, -16, 1.8, 1.7, 1.8, matHazard, true);
        this.addBox(-3.2, 0.6, -16.5, 1.2, 1.2, 1.2, matMetal, true);
        this.addBox(4.8, 0.75, -6, 1.6, 1.5, 1.6, matMetal, true);
        // Sala de Controle (Modem Secreto) + Painel do Portão 2 + Janela de Vidro Quebrável
        this.addBox(5.5, 2.0, -28, 8, 4.0, 0.4, matDarkWall, true);
        this.addBox(5.5, 2.0, -38, 8, 4.0, 0.4, matDarkWall, true);
        this.addBox(1.5, 2.0, -30.5, 0.4, 4.0, 4.6, matDarkWall, true);
        this.addBox(5.5, 4.1, -33, 8.4, 0.3, 10.6, matMetal, false);
        this.addBreakableGlass(1.48, 2.1, -35.2, 0.08, 1.4, 2.6);

        // Escadaria e Pier Inferior da Represa (Ilha Clássica do N64 em Z = -44)
        this.addBox(-11.5, -0.2, -44, 4.5, 0.5, 7.5, matConcrete, false);
        this.addBox(-15.5, -2.5, -44, 5.5, 5.0, 6.0, matConcrete, true);
        this.addBox(-15.5, 0.2, -44, 5.8, 0.4, 6.4, matMetal, false);
        // Torre de vigia na ilha inferior com colete balístico e munição
        this.addBox(-17.2, 2.2, -44, 0.4, 4.0, 5.2, matDarkWall, true);
        this.addBox(-15.5, 4.3, -44, 5.4, 0.3, 5.8, matMetal, false);
        this.addPickup('armor', -15.2, 0.85, -43.2);
        this.addPickup('ammo', -15.2, 0.65, -45.0);

        // Console do Modem Secreto e Interruptor do Portão 2
        this.addBox(8.2, 0.7, -33, 1.4, 1.4, 3.2, matMetal, true);
        const modemScreen = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.65, 1.2),
          new THREE.MeshBasicMaterial({ color: 0x0ea5e9 })
        );
        modemScreen.position.set(7.45, 1.15, -33);
        this.levelGroup.add(modemScreen);

        const gateSwitch2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.28, 0.28),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        gateSwitch2.position.set(7.45, 1.45, -30.2);
        this.levelGroup.add(gateSwitch2);

        this.interactables.push({
          id: 'open_gate_2',
          type: 'gate_switch',
          gateId: 'gate_2',
          position: new THREE.Vector3(6.8, 1.0, -30.2),
          radius: 2.6,
          prompt: 'Pressione [E] para destravar o Portão da Torre Norte',
          completed: false,
          visualMesh: gateSwitch2
        });

        this.interactables.push({
          id: 'place_modem',
          type: 'gadget',
          position: new THREE.Vector3(6.8, 1.0, -33),
          radius: 3.0,
          prompt: 'Pressione [E] para instalar o Modem Secreto',
          completed: false,
          visualMesh: modemScreen
        });

        // 4. SETOR C: Torre de Vigia, Portão 2, Torres de Transmissão & Servidor (Z = -54 a -85)
        this.addBox(-6.5, 2.2, -54, 7, 4.4, 7, matConcrete, true);
        this.addBox(6.5, 2.2, -54, 7, 4.4, 7, matConcrete, true);
        this.addBox(0, 4.6, -54, 20, 0.8, 7, matConcrete, false);
        this.addSecurityGate('gate_2', 0, -54, 5.4, matMetal, matHazard);
        this.addSecurityCamera(2.8, 3.8, -50.4, -0.2);
        this.addPickup('ammo', 7.2, 0.55, -80.5);

        // Base das torres no piso (y=0): antes eram criadas com y=18,
        // o que fazia os quatro pés flutuarem 18m acima da represa.
        // Sapatas se apoiam sobre a borda do reservatório (nível -1.7).
        for (const towerZ of [-22, -88]) {
          this.addBox(13.5, -0.9, towerZ, 3.6, 1.8, 3.6,
            matConcrete, false, false);
          this.buildTransmissionTower(13.5, 0, towerZ, matMetal);
        }

        // Sala do Servidor (Backup de Dados - 00 Agent)
        this.addBox(5.5, 2.0, -72, 8, 4.0, 0.4, matDarkWall, true);
        this.addBox(5.5, 2.0, -82, 8, 4.0, 0.4, matDarkWall, true);
        this.addBox(1.5, 2.0, -79.5, 0.4, 4.0, 4.6, matDarkWall, true);
        this.addBox(5.5, 4.1, -77, 8.4, 0.3, 10.6, matMetal, false);

        this.addBox(8.2, 1.1, -77, 1.2, 2.2, 2.8, matMetal, true);
        const backupLed = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.8, 1.0),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        backupLed.position.set(7.52, 1.35, -77);
        this.levelGroup.add(backupLed);

        this.interactables.push({
          id: 'data_backup',
          type: 'terminal',
          position: new THREE.Vector3(6.8, 1.0, -77),
          radius: 3.0,
          prompt: 'Pressione [E] para interceptar Backup de Dados',
          completed: false,
          visualMesh: backupLed
        });

        // 5. SETOR D: Casa de Máquinas / Torre de Controle do Salto de Bungee + Turbina Giratória no Teto
        // Porta funcional na frente da sala de máquinas, não parede maciça.
        // O vão X=3.3..5.9 dá acesso ao colete e à patrulha finais.
        this.addBox(2.5,2.2,-116,1.6,4.4,.4,matDarkWall,true);
        this.addBox(7.6,2.2,-116,3.4,4.4,.4,matDarkWall,true);
        this.addBox(4.6,4.05,-116,2.6,.5,.45,matMetal,false,false);
        this.addBox(1.7, 2.2, -120.5, 0.4, 4.4, 9.0, matDarkWall, true);
        this.addBox(5.5, 4.5, -120.5, 8.0, 0.3, 9.6, matMetal, false);
        this.addBreakableGlass(1.68, 2.2, -118.0, 0.08, 1.4, 2.4);
        this.addPickup('armor', 7.4, 0.85, -122.0);
        this.buildTransmissionTower(6.5, 4.6, -121.0, matMetal);

        // Radar / Turbina giratória no topo da torre final da barragem
        const radarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 8), matMetal);
        radarMast.position.set(3.5, 5.6, -118);
        const radarDish = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 0.14), matHazard);
        radarDish.position.set(3.5, 6.6, -118);
        this.levelGroup.add(radarMast, radarDish);
        this.animatedProps.push({ type: 'propeller', mesh: radarDish });

        // BUNGEE 2.0: plataforma utilizável, 6.5 m, apoiada na abertura do parapeito.
        // Centro X -11.65, ponta X -14.9; corredor livre de Z -120.45 a -115.75.
        const matBungeeSteel = new THREE.MeshStandardMaterial({
          color: 0x334155, metalness: 0.72, roughness: 0.38
        });
        const matBungeeGrate = new THREE.MeshStandardMaterial({
          color: 0x738897, metalness: 0.56, roughness: 0.55
        });
        const matBungeeSignal = new THREE.MeshBasicMaterial({color: 0xfacc15});
        const deck = this.addBox(-11.65, -0.18, -118.1, 6.5, 0.34, 4.7,
          matBungeeGrate, false, false);
        deck.receiveShadow = true;
        // Estrutura inferior do balanço: sem colisores na zona da queda.
        for (const z of [-119.92, -116.28]) {
          this.addBox(-11.65, -0.52, z, 6.5, 0.28, 0.24,
            matBungeeSteel, false, false);
          this.addBox(-11.65, 0.77, z, 6.5, 1.5, 0.15, matBungeeSteel, true);
          this.addBox(-11.65, 1.65, z, 6.5, 0.14, 0.18,
            matBungeeSignal, false, false);
          for(const x of [-14.4, -12.1, -9.7]) {
            this.addBox(x, 0.81, z, 0.16, 1.45, 0.2,
              matBungeeSteel, false, false);
          }
        }
        for(const x of [-14.38,-12.8,-11.2,-9.6]){
          this.addBox(x, -.007, -118.1, 0.12, 0.025, 4.38,
            matBungeeSteel, false, false);
        }
        // Contraventamentos leves por baixo da plataforma.
        for(const z of [-119.6,-116.6]){
          const brace = new THREE.Mesh(
            new THREE.CylinderGeometry(.09,.13,7,7),matBungeeSteel
          );
          brace.position.set(-11.65,-3.5,z);
          brace.rotation.z=-0.58;
          this.levelGroup.add(brace);
        }
        // Faixas amarelas de advertência e borda de salto sem bloqueio físico.
        this.addBox(-14.47, .024, -118.1, .25, .03, 4.15,
          matBungeeSignal, false, false);
        for(const x of [-13.5,-12.35,-11.2]){
          this.addBox(x,.022,-118.1,.13,.025,2.1,
            matBungeeSignal,false,false);
        }
        // Guincho de ancoragem, corpo metálico + bobina, preso à lateral.
        const spool = new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.8,12),matBungeeSteel);
        spool.rotation.z=Math.PI/2;
        spool.position.set(-13.15,.85,-119.65);
        const spoolHub = new THREE.Mesh(
          new THREE.CylinderGeometry(.23,.23,.9,12),matBungeeSignal
        );
        spoolHub.rotation.z=Math.PI/2;
        spoolHub.position.copy(spool.position);
        this.levelGroup.add(spool,spoolHub);
        const bungeeBeacon = new THREE.Mesh(
          new THREE.RingGeometry(.61,.82,30),
          new THREE.MeshBasicMaterial({color:0x22d3ee,side:THREE.DoubleSide})
        );
        bungeeBeacon.rotation.x=-Math.PI/2;
        bungeeBeacon.position.set(-13.92,.04,-118.1);
        this.levelGroup.add(bungeeBeacon);
        this.damJumpAnchor=new THREE.Vector3(-13.2,1.0,-119.62);
        this.damJumpPoint=new THREE.Vector3(-14.1,.02,-118.1);
        this.interactables.push({
          id:'bungee', type:'exit',
          position:new THREE.Vector3(-13.92,1,-118.1),
          radius:1.75,
          prompt:'Pressione [E] na ponta da passarela para iniciar o bungee',
          completed:false,visualMesh:bungeeBeacon
        });

        // 6. CAIXAS DE ALARME DESTRUTÍVEIS (3 unidades estratégicas)
        this.addAlarmBox('alarm_1', 3.22, 1.8, 29.8, -Math.PI / 2);
        this.addAlarmBox('alarm_2', 1.22, 1.9, -29.0, -Math.PI / 2);
        this.addAlarmBox('alarm_3', 1.22, 1.9, -81.0, -Math.PI / 2);

        // 7. ILUMINAÇÃO ATMOSFÉRICA + HOLOFOTES NOS TÚNEIS
        const ambientLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.85);
        this.levelGroup.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xf1f5f9, 1.1);
        dirLight.position.set(-35, 55, 25);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 5;
        dirLight.shadow.camera.far = 190;
        const d = 85;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        this.levelGroup.add(dirLight);

        [29, -33, -77, -118].forEach(zPos => {
          const pLight = new THREE.PointLight(0x7dd3fc, 0.9, 18);
          pLight.position.set(zPos === -118 ? -10 : 5.5, 3.2, zPos);
          this.levelGroup.add(pLight);
        });

        // 8. PONTOS DE PATRULHA DOS GUARDAS (Distribuídos pelos 4 setores + Ilha Inferior)
        this.guardSpawns = [
          { pos: new THREE.Vector3(-7.4, 0, 39.5), patrol: [new THREE.Vector3(-7.4, 0, 39.5), new THREE.Vector3(-3.5, 0, 36)] },
          { pos: new THREE.Vector3(6.5, 0, 29), patrol: [new THREE.Vector3(6.5, 0, 29), new THREE.Vector3(-2, 0, 27)] },
          { pos: new THREE.Vector3(-4, 0, 2), patrol: [new THREE.Vector3(-4, 0, 2), new THREE.Vector3(4, 0, -4)] },
          { pos: new THREE.Vector3(-2, 0, -24), patrol: [new THREE.Vector3(-2, 0, -24), new THREE.Vector3(-6, 0, -36)] },
          { pos: new THREE.Vector3(6.0, 0, -35), patrol: [new THREE.Vector3(6.0, 0, -35), new THREE.Vector3(4.5, 0, -29)] },
          { pos: new THREE.Vector3(-14.5, 0.4, -44), patrol: [new THREE.Vector3(-14.5, 0.4, -44), new THREE.Vector3(-11.5, 0.4, -42)] },
          { pos: new THREE.Vector3(6.0, 0, -75), patrol: [new THREE.Vector3(6.0, 0, -75), new THREE.Vector3(4.0, 0, -80)] },
          { pos: new THREE.Vector3(-2, 0, -104), patrol: [new THREE.Vector3(-2, 0, -104), new THREE.Vector3(3, 0, -114)] },
          { pos: new THREE.Vector3(5.5, 0, -120), patrol: [new THREE.Vector3(5.5, 0, -120), new THREE.Vector3(-4, 0, -118)] }
        ];
      }

      buildFacilityLevel() {
        this.bounds = { minX: -17.2, maxX: 17.2, minZ: -86.2, maxZ: 39.2, isDam: false };

        const texTile = ProceduralTextures.createNoiseTexture('#cbd5e1', 14, 14, 24, true);
        const texLabWall = ProceduralTextures.createNoiseTexture('#475569', 18, 10, 3, true);
        const texFloorDark = ProceduralTextures.createNoiseTexture('#1e293b', 20, 12, 22, true);

        const matFloor = new THREE.MeshStandardMaterial({ map: texFloorDark, roughness: 0.45, metalness: 0.25 });
        const matWall = new THREE.MeshStandardMaterial({ map: texLabWall, roughness: 0.55, metalness: 0.15 });
        const matTile = new THREE.MeshStandardMaterial({ map: texTile, roughness: 0.35 });
        const matSteel = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
        const matHazard = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.45 });
        const matCeiling = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const matPipeGreen = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.65, roughness: 0.3 });
        const matPipeRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.65, roughness: 0.3 });

        // Piso, Teto e Paredes Externas da Instalação Subterrânea (X: -18..+18, Z: +40..-87)
        this.addBox(0, -0.5, -24, 36, 1.0, 128, matFloor, false);
        this.addBox(0, 4.4, -24, 36, 0.5, 128, matCeiling, false, false);
        this.addBox(-18, 2.1, -24, 1.0, 4.4, 128, matWall, true);
        this.addBox(18, 2.1, -24, 1.0, 4.4, 128, matWall, true);
        this.addBox(0, 2.1, 40, 36, 4.4, 1.0, matWall, true);
        this.addBox(0, 2.1, -87, 36, 4.4, 1.0, matWall, true);

        // AUDITORIA DE GEOMETRIA: acabamento fixado às paredes e ao teto.
        // A face interna do muro está em X=±17.5 e a face inferior do teto
        // fica em Y=4.15. Todos os apliques ficam dentro desses limites.
        const matFrame = new THREE.MeshStandardMaterial({
          color: 0x64748b, metalness: 0.53, roughness: 0.45
        });
        const matLamp = new THREE.MeshBasicMaterial({color:0xdff7ff});
        const matInset = new THREE.MeshStandardMaterial({
          color: 0x394b5a, metalness:0.17, roughness:0.76
        });
        for(const x of [-17.43,17.43]){
          for(const z of [29,17,5,-7,-19,-31,-43,-55,-67,-79]){
            // Frisos embutidos na alvenaria: sem colisão extra.
            this.addBox(x,2.12,z,.075,3.42,.12,matFrame,false,false);
            this.addBox(x,.14,z,.10,.20,9,matInset,false,false);
          }
        }
        for(const z of [32,20,8,-5,-18,-29,-42,-55,-68,-80]){
          // Fixtures de duas barras fora das tubulações centrais (X=±2.2).
          for(const x of [-7.0,7.0]){
            this.addBox(x,4.07,z,3.5,.12,.66,matFrame,false,false);
            this.addBox(x,3.985,z,3.04,.045,.32,matLamp,false,false);
          }
        }
        // Portais e bordas superiores deixam clara a divisão de setores.
        for(const z of [26,14,-34]){
          this.addBox(0,4.045,z,7.3,.20,.64,matFrame,false,false);
        }

        // Tubulações químicas industriais percorrendo o teto da Facility
        for (let zPipe = 24; zPipe >= -80; zPipe -= 26) {
          const pipeL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 24, 10), matPipeGreen);
          pipeL.rotation.x = Math.PI / 2;
          pipeL.position.set(-2.2, 3.95, zPipe);
          const pipeR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 24, 10), matPipeRed);
          pipeR.rotation.x = Math.PI / 2;
          pipeR.position.set(2.2, 3.95, zPipe);
          this.levelGroup.add(pipeL, pipeR);
        }

        // 1. SETOR 1: DUTO DE VENTILAÇÃO COM EXAUSTOR GIRATÓRIO & BANHEIROS CLÁSSICOS (Z = +39 a +14)
        this.addBox(-3.2, 2.1, 33, 0.5, 4.2, 13, matSteel, true);
        this.addBox(3.2, 2.1, 33, 0.5, 4.2, 13, matSteel, true);
        // Exaustor de ventilação giratório no início do duto
        const ventFan = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.22), matHazard);
        ventFan.position.set(0, 3.8, 37.5);
        this.levelGroup.add(ventFan);
        this.animatedProps.push({ type: 'propeller', mesh: ventFan });

        // Abertura central real permite sair do duto para os banheiros.
        // Antes uma parede inteira bloqueava a única passagem inicial da Facility.
        this.addBox(-11.0, 2.1, 26, 14, 4.2, 0.5, matTile, true);
        this.addBox(11.0, 2.1, 26, 14, 4.2, 0.5, matTile, true);
        // Cabines de banheiro: portas penduradas em dobradiças reais,
        // em vez de placas que começavam 0.5m longe das divisórias.
        [-12, -8.5, -5.0, -1.5].forEach((cx, i) => {
          this.addBox(cx,1.5,21,.25,3.0,3.2,matTile,true);
          const hinge=new THREE.Group();
          hinge.position.set(cx+.13,0,19.4);
          hinge.rotation.y=-.38-(i%2)*.16;
          const door=new THREE.Mesh(new THREE.BoxGeometry(1.72,2.36,.12),matSteel);
          door.position.set(.86,1.37,0);
          hinge.add(door);
          const grip=new THREE.Mesh(new THREE.BoxGeometry(.09,.18,.045),matFrame);
          grip.position.set(1.47,1.38,.09);
          hinge.add(grip);
          this.levelGroup.add(hinge);
          // A porta já está visualmente entreaberta; sem collider invisível.
        });
        // Espelhos antes flutuavam em Z=20.5 sem nenhuma parede atrás.
        // Painel de apoio verdadeiro, com superfície dos espelhos encostada.
        this.addBox(10,1.65,21.0,7.6,3.3,.32,matTile,true);
        this.addBox(10,.9,20,6.5,1.8,1.2,matTile,true);
        this.addBreakableGlass(8.2,2.47,20.79,2.4,1.2,.08);
        this.addBreakableGlass(11.8,2.47,20.79,2.4,1.2,.08);
        // Lavatórios sobre a bancada, sem flutuar acima dela.
        for(const x of [8.2,11.8]){
          const basin=new THREE.Mesh(new THREE.CylinderGeometry(.42,.36,.11,14),matFrame);
          basin.position.set(x,1.83,19.9);
          const tap=new THREE.Mesh(new THREE.CylinderGeometry(.037,.045,.25,8),matSteel);
          tap.position.set(x,2.02,20.13);
          this.levelGroup.add(basin,tap);
        }
        this.addPickup('ammo', 14.5, 0.5, 18.5);
        this.addAlarmBox('fac_alarm_1', -1.8, 1.8, 14.4, 0);

        // Parede sul dos banheiros com Portão Blindado 1
        this.addBox(-11.5, 2.1, 14, 12, 4.2, 0.6, matWall, true);
        this.addBox(7.5, 2.1, 14, 19, 4.2, 0.6, matWall, true);
        this.addSecurityGate('fac_gate_1', -3.8, 14, 3.2, matSteel, matHazard);
        const switchFac1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.2), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        switchFac1.position.set(-6.2, 1.4, 14.4);
        this.levelGroup.add(switchFac1);
        this.interactables.push({
          id: 'open_fac_gate_1', type: 'gate_switch', gateId: 'fac_gate_1',
          position: new THREE.Vector3(-6.2, 1.2, 15.2), radius: 2.5,
          prompt: 'Pressione [E] para abrir a Porta do Corredor Químico',
          completed: false, visualMesh: switchFac1
        });

        // 2. SETOR 2: LABORATÓRIOS COM JANELAS DE VIDRO QUEBRÁVEIS & DR. DOAK (Z = +12 a -28)
        // Divisórias das salas de pesquisa com aberturas para janelas de observação quebráveis
        this.addBox(-4.5, 2.1, 5.5, 0.5, 4.2, 7.0, matWall, true);
        this.addBox(-4.5, 0.55, -2.5, 0.5, 1.1, 9.0, matWall, true);
        this.addBox(-4.5, 3.65, -2.5, 0.5, 1.1, 9.0, matWall, true);
        this.addBreakableGlass(-4.5, 2.1, -2.5, 0.1, 2.0, 8.6);
        this.addBox(-4.5, 2.1, -14.0, 0.5, 4.2, 14.0, matWall, true);

        this.addBox(5.5, 2.1, 2.0, 0.5, 4.2, 8.0, matWall, true);
        this.addBox(5.5, 0.55, -6.5, 0.5, 1.1, 9.0, matWall, true);
        this.addBox(5.5, 3.65, -6.5, 0.5, 1.1, 9.0, matWall, true);
        this.addBreakableGlass(5.5, 2.1, -6.5, 0.1, 2.0, 8.6);
        this.addBox(5.5, 2.1, -17.0, 0.5, 4.2, 12.0, matWall, true);
        // Caixilhos ancorados nas paredes, não placas soltas sobre vidros.
        for(const [wx,wz] of [[-4.5,-2.5],[5.5,-6.5]]){
          for(const y of [1.1,3.1])
            this.addBox(wx,y,wz,.29,.105,9.0,matFrame,false,false);
          for(const z of [wz-4.4,wz+4.4])
            this.addBox(wx,2.1,z,.29,2.0,.11,matFrame,false,false);
        }

        // Bancadas de laboratório com centrífugas, tubos de ensaio luminescentes e computadores
        [-11.5, 11.5].forEach(lx => {
          [-2, -14].forEach(lz => {
            this.addBox(lx, 0.6, lz, 4.5, 1.2, 1.6, matSteel, true);
            const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
            monitor.position.set(lx - 0.9, 1.45, lz);
            const vat = new THREE.Mesh(
              new THREE.CylinderGeometry(0.24, 0.24, 0.75, 12),
              new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 })
            );
            vat.position.set(lx + 1.1, 1.55, lz);
            this.levelGroup.add(monitor, vat);
          });
        });

        // Dr. Doak no laboratório leste (Z = -18, X = 12) + Cofre de Suprimentos
        this.addCharacterNPC('dr_doak', 'doak', 12.2, -18, -Math.PI / 2, 0xf8fafc);
        this.interactables.push({
          id: 'contact_doak', type: 'npc',
          position: new THREE.Vector3(12.2, 1.2, -18), radius: 3.0,
          prompt: 'Pressione [E] para falar com Dr. Doak (Receber Decodificador & Minas)',
          completed: false
        });
        this.addPickup('ammo', 15.2, 0.55, -21.5);

        // Cientistas civis nos laboratórios
        this.addCharacterNPC('sci_1', 'scientist', -11.5, -8, 0.6, 0xf1f5f9);
        this.addCharacterNPC('sci_2', 'scientist', 10.5, -4, -0.8, 0xf1f5f9);
        this.addCharacterNPC('sci_3', 'scientist', -12.0, -19, 1.2, 0xf1f5f9);
        this.addPickup('armor', -14.8, 0.85, -24.5);

        // 3. SETOR 3: CONTROLE / PORTA DA CÂMARA DE ENGARRAFAMENTO.
        // A janela antiga estava DESENHADA POR CIMA de uma parede sólida!
        // Abrir o vão em quatro painéis preserva a colisão do peitoril.
        this.addBox(-14.375,2.1,-34,6.25,4.2,.6,matWall,true);
        this.addBox(-3.625,2.1,-34,4.25,4.2,.6,matWall,true);
        this.addBox(-8.5,.70,-34,5.5,1.4,.6,matWall,true);
        this.addBox(-8.5,3.6,-34,5.5,1.2,.6,matWall,true);
        this.addBox(10.5,2.1,-34,14,4.2,.6,matWall,true);
        this.addBreakableGlass(-8.5,2.2,-33.65,5.5,1.5,.1);
        // A moldura fica sobre o paramento, não atravessa o portão.
        for(const x of [-11.25,-5.75])
          this.addBox(x,2.2,-33.64,.12,1.55,.1,matFrame,false,false);
        for(const y of [1.44,2.96])
          this.addBox(-8.5,y,-33.64,5.55,.09,.10,matFrame,false,false);
        this.addSecurityGate('fac_gate_2', 1.0, -34, 4.6, matSteel, matHazard);
        this.addSecurityCamera(-1.8, 3.6, -33.4, 0.25);
        this.addAlarmBox('fac_alarm_2', -4.2, 1.8, -33.5, 0);

        const decoderReader = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 0.2), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        decoderReader.position.set(3.8, 1.4, -33.6);
        this.levelGroup.add(decoderReader);
        this.interactables.push({
          id: 'open_fac_gate_2', type: 'gate_switch', gateId: 'fac_gate_2',
          requiresDoak: true,
          position: new THREE.Vector3(3.8, 1.2, -32.6), radius: 2.8,
          prompt: 'Pressione [E] para usar Decodificador na Porta da Câmara',
          completed: false, visualMesh: decoderReader
        });

        // 4. SETOR 4: CÂMARA DE ENGARRAFAMENTO, ESTEIRA INDUSTRIAL, 006 & 5 TANQUES QUÍMICOS (Z = -46 a -85)
        // Passarelas técnicas agora têm colunas APOIADAS NO PISO.
        // Antes a plataforma Y=2.8 pairava sem nenhum pilar sob ela.
        for(const side of [-1,1]){
          const x=side*15.2;
          const deck=this.addBox(x,2.8,-62,3.6,.28,36,matSteel,false,false);
          deck.receiveShadow=true;
          for(const z of [-78,-62,-46]){
            // Pilar vai de Y=0 até Y=2.70, encaixando no tablado.
            this.addBox(side*16.10,1.35,z,.38,2.70,.38,matFrame,true);
            this.addBox(side*15.2,2.61,z,3.4,.12,.30,matFrame,false,false);
          }
          const innerX=side*13.54;
          for(const y of [3.37,3.97])
            this.addBox(innerX,y,-62,.09,.09,35.6,matFrame,false,false);
          for(const z of [-79,-70,-61,-52,-45])
            this.addBox(innerX,3.55,z,.09,1.05,.11,matFrame,false,false);
        }
        [[-10, -52], [10, -52], [-10, -70], [10, -70]].forEach(([px, pz]) => {
          this.addBox(px, 2.1, pz, 1.4, 4.2, 1.4, matSteel, true);
        });

        // Esteira central de engarrafamento de gás nervoso com frascos brilhantes
        this.addBox(0, 0.45, -77, 11.5, 0.9, 1.6, matSteel, true);
        [-4.2, -2.1, 0, 2.1, 4.2].forEach(bx => {
          const canister = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.55, 10),
            new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.7 })
          );
          canister.position.set(bx, 1.15, -77);
          this.levelGroup.add(canister);
        });

        // 5 Tanques Químicos Destrutíveis no centro da câmara
        this.addChemicalTank('tank_1', -4.5, -54);
        this.addChemicalTank('tank_2', 4.5, -54);
        this.addChemicalTank('tank_3', 0, -61);
        this.addChemicalTank('tank_4', -4.5, -68);
        this.addChemicalTank('tank_5', 4.5, -68);

        // Barris explosivos próximos aos tanques + Suprimentos de combate
        this.addExplosiveBarrel(-2.2, -55);
        this.addExplosiveBarrel(2.2, -67);
        this.addPickup('armor', 14.5, 0.85, -50);
        this.addPickup('ammo', -14.5, 0.55, -76);

        // Alec Trevelyan (006) aguardando próximo aos tanques
        this.addCharacterNPC('agent_006', '006', -8.5, -60, Math.PI / 2, 0x1e293b);
        this.interactables.push({
          id: 'meet_006', type: 'npc',
          position: new THREE.Vector3(-8.5, 1.2, -60), radius: 3.2,
          prompt: 'Pressione [E] para coordenar sabotagem com Alec Trevelyan (006)',
          completed: false
        });

        // Porta final de fuga (Z = -86)
        const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 }));
        exitDoor.position.set(0, 1.7, -86.3);
        this.levelGroup.add(exitDoor);
        this.interactables.push({
          id: 'facility_exit', type: 'exit',
          position: new THREE.Vector3(0, 1.2, -84.8), radius: 3.0,
          prompt: 'Pressione [E] para escapar pelos túneis da instalação',
          completed: false, visualMesh: exitDoor
        });

        // Iluminação fluorescente clínica da instalação subterrânea
        const hemi = new THREE.HemisphereLight(0xd1fae5, 0x0f172a, 0.95);
        this.levelGroup.add(hemi);
        [30, 18, -6, -24, -46, -64, -80].forEach(zPos => {
          const light = new THREE.PointLight(0x99f6e4, 0.95, 24);
          light.position.set(0, 3.8, zPos);
          this.levelGroup.add(light);
        });

        // Patrulha dos guardas da Facility
        this.guardSpawns = [
          { pos: new THREE.Vector3(6, 0, 22), patrol: [new THREE.Vector3(6, 0, 22), new THREE.Vector3(-8, 0, 17)] },
          { pos: new THREE.Vector3(-10, 0, 2), patrol: [new THREE.Vector3(-10, 0, 2), new THREE.Vector3(-10, 0, -18)] },
          { pos: new THREE.Vector3(10, 0, -10), patrol: [new THREE.Vector3(10, 0, -10), new THREE.Vector3(10, 0, -24)] },
          { pos: new THREE.Vector3(0, 0, -28), patrol: [new THREE.Vector3(-6, 0, -28), new THREE.Vector3(6, 0, -28)] },
          { pos: new THREE.Vector3(-7, 0, -48), patrol: [new THREE.Vector3(-7, 0, -48), new THREE.Vector3(7, 0, -48)] },
          { pos: new THREE.Vector3(7, 0, -62), patrol: [new THREE.Vector3(7, 0, -62), new THREE.Vector3(-6, 0, -72)] },
          { pos: new THREE.Vector3(0, 0, -78), patrol: [new THREE.Vector3(-5, 0, -78), new THREE.Vector3(5, 0, -78)] }
        ];
      }

      buildRunwayLevel() {
        this.bounds = { minX: -24.2, maxX: 24.2, minZ: -138.2, maxZ: 45.2, isDam: false };

        const texRunway = ProceduralTextures.createRoadTexture();
        texRunway.repeat.set(2, 22);
        const texSnow = ProceduralTextures.createNoiseTexture('#cbd5e1', 20, 10, 16, false);
        const texConcrete = ProceduralTextures.createNoiseTexture('#64748b', 20, 8, 4, true);

        const matRunway = new THREE.MeshStandardMaterial({ map: texRunway, roughness: 0.78, metalness: 0.1 });
        const matSnow = new THREE.MeshStandardMaterial({ map: texSnow, roughness: 0.88 });
        const matConcrete = new THREE.MeshStandardMaterial({ map: texConcrete, roughness: 0.7, metalness: 0.15 });
        const matMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
        const matHangar = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.35 });
        const matHazard = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 });

        // Pista principal de asfalto + terreno nevado lateral + faixa de taxiamento
        this.addBox(0, -0.5, -48, 22, 1.0, 190, matRunway, false);
        this.addBox(-24, -0.52, -48, 26, 1.0, 190, matSnow, false);
        this.addBox(24, -0.52, -48, 26, 1.0, 190, matSnow, false);

        // Muros de perímetro da base aérea + cercas de segurança
        this.addBox(-25, 2.5, -48, 1.0, 5.5, 190, matConcrete, true);
        this.addBox(25, 2.5, -48, 1.0, 5.5, 190, matConcrete, true);
        this.addBox(0, 2.5, 46, 52, 5.5, 1.0, matConcrete, true);
        this.addBox(0, 2.5, -139, 52, 5.5, 1.0, matConcrete, true);

        // Montanhas nevadas ao redor da pista
        [[-55, -145, 45, 70], [15, -165, 55, 80], [65, -130, 48, 65], [-62, -20, 40, 58]].forEach(([px, pz, rad, h]) => {
          const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), matSnow);
          m.position.set(px, h / 2 - 2, pz);
          this.levelGroup.add(m);
        });

        // 1. SETOR INICIAL: PRÉDIO DA ADMINISTRAÇÃO, PORTÃO DA GARAGEM & HANGAR OESTE (Z = +44 a +5)
        // Corredor de saída do bunker com portão deslizante para o pátio
        this.addBox(-7.5, 2.4, 36, 0.6, 4.8, 18, matConcrete, true);
        this.addBox(7.5, 2.4, 36, 0.6, 4.8, 18, matConcrete, true);
        this.addBox(0, 4.8, 36, 15.6, 0.4, 18, matMetal, false);
        // Checkpoint inteiro, de cerca a cerca. Antes havia SOMENTE o portão
        // central e o jogador passava por fora, como na captura enviada.
        // Paredes ocupam [-24.5,-2.9] e [2.9,24.5] no eixo X:
        // sem espaços laterais, mas com a abertura central de 5.8m.
        this.addBox(-13.7,2.65,27.5,21.6,5.3,.74,matHangar,true);
        this.addBox(13.7,2.65,27.5,21.6,5.3,.74,matHangar,true);
        this.addBox(0,5.05,27.5,6.2,.5,.95,matMetal,false,false);
        this.addSecurityGate('run_gate_1',0,27.5,5.8,matMetal,matHazard);
        // Reforço visual discreto: listras de perigo no acesso real.
        for(const x of [-3.56,3.56]){
          this.addBox(x,1.55,27.02,.12,2.95,.08,matHazard,false,false);
        }
        const checkpointMarker=new THREE.Mesh(
          new THREE.BoxGeometry(2.3,.32,.09),
          new THREE.MeshBasicMaterial({color:0x38bdf8})
        );
        checkpointMarker.position.set(0,4.62,27.0);
        this.levelGroup.add(checkpointMarker);

        const switchRunGate = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.34, 0.22),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        switchRunGate.position.set(6.9, 1.35, 30.2);
        this.levelGroup.add(switchRunGate);
        this.interactables.push({
          id: 'open_run_gate_1', type: 'gate_switch', gateId: 'run_gate_1',
          position: new THREE.Vector3(6.2, 1.2, 30.2), radius: 2.8,
          prompt: 'Pressione [E] para abrir o Portão Blindado da Pista',
          completed: false, visualMesh: switchRunGate
        });

        // Hangar Oeste / Escritório de Operações com janelas quebráveis (Z = +22 a +6)
        this.addBox(-15, 3.2, 22, 14, 6.4, 0.5, matHangar, true);
        this.addBox(-15, 3.2, 6, 14, 6.4, 0.5, matHangar, true);
        this.addBox(-21.8, 3.2, 14, 0.5, 6.4, 16, matHangar, true);
        this.addBox(-8.2, 3.2, 19.2, 0.5, 6.4, 5.2, matHangar, true);
        this.addBox(-15, 6.5, 14, 14.5, 0.4, 16.5, matMetal, false);
        this.addBreakableGlass(-8.2, 2.1, 14.5, 0.1, 1.6, 3.6);
        this.addPickup('armor', -19.5, 0.85, 19.5);
        this.addPickup('ammo', -19.5, 0.65, 9.0);
        this.addAlarmBox('run_alarm_1', -7.8, 1.8, 20.5, Math.PI / 2);

        // Mesa de Comando no Hangar com a Chave de Ignição + Suprimento de Minas (Z = +14, X = -13.5)
        this.addBox(-14.2, 0.65, 14, 1.4, 1.3, 3.2, matMetal, true);
        const keyMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.14, 0.46),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        keyMesh.position.set(-13.8, 1.38, 14);
        this.levelGroup.add(keyMesh);
        this.interactables.push({
          id: 'ignition_key', type: 'item',
          position: new THREE.Vector3(-13.2, 1.2, 14), radius: 2.8,
          prompt: 'Pressione [E] para pegar a Chave de Ignição da Aeronave',
          completed: false, visualMesh: keyMesh
        });

        // TANQUE BLINDADO SOVIÉTICO T-55 PILOTÁVEL (Clássico da Fase Runway! X = 12.5, Z = +12)
        this.buildDrivableTank(12.5, 12, 0);
        this.interactables.push({
          id: 'board_tank', type: 'vehicle',
          position: new THREE.Vector3(12.5, 1.2, 12), radius: 3.6,
          prompt: 'Pressione [E] para pilotar o Tanque Blindado T-55 (Canhão: clique esq.)',
          completed: false
        });

        // Caminhão militar na pista + Barris explosivos estratégicos
        // Caminhão estacionado APÓS o checkpoint, sem intersectar a parede.
        this.buildTruck(
          15.5, 19.5, -0.25,
          new THREE.MeshStandardMaterial({ color: 0x36453b, roughness: 0.6 }),
          new THREE.MeshStandardMaterial({ color: 0x4b5842, roughness: 0.75 }),
          new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
        );
        this.addExplosiveBarrel(-4.5, 10);
        this.addExplosiveBarrel(6.5, -24);
        this.addExplosiveBarrel(-6.5, -58);
        this.addExplosiveBarrel(-5.8, -85);

        // 2. SETOR CENTRAL: TORRE DE CONTROLE COM JANELAS & METRALHADORAS PESADAS ATIVAS (Z = -15 a -90)
        this.addBox(16, 2.5, -24, 12, 5.0, 0.5, matConcrete, true);
        this.addBox(16, 2.5, -38, 12, 5.0, 0.5, matConcrete, true);
        this.addBox(10.2, 2.5, -26.5, 0.5, 5.0, 4.5, matConcrete, true);
        this.addBreakableGlass(10.2, 2.2, -31.0, 0.1, 1.6, 4.2);
        this.addBox(16, 5.1, -31, 12.4, 0.35, 14.5, matMetal, false);
        this.buildTransmissionTower(18, 5.2, -31, matMetal);

        // Radar giratório sobre a Torre de Controle da Pista
        const radarDish = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 0.16), matHazard);
        radarDish.position.set(14.5, 6.2, -31);
        this.levelGroup.add(radarDish);
        this.animatedProps.push({ type: 'propeller', mesh: radarDish });

        // Terminal de Planos de Voo na Torre de Controle (00 Agent)
        this.addBox(20.5, 0.8, -32, 1.4, 1.6, 3.0, matMetal, true);
        const intelScreen = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.7, 1.2),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        intelScreen.position.set(19.75, 1.35, -32);
        this.levelGroup.add(intelScreen);
        this.interactables.push({
          id: 'runway_intel', type: 'terminal',
          position: new THREE.Vector3(18.8, 1.2, -32), radius: 2.8,
          prompt: 'Pressione [E] para interceptar Planos de Voo',
          completed: false, visualMesh: intelScreen
        });

        // 3 Armamentos Pesados Destrutíveis e Ativos (2 Metralhadoras Pesadas + 1 Bateria de Mísseis)
        this.addHeavyEmplacement('emp_gun_1', 'gun', -7.5, -22, 0.2);
        this.addHeavyEmplacement('emp_gun_2', 'gun', 7.5, -56, -0.2);
        this.addHeavyEmplacement('emp_missile', 'missile', -8.0, -86, 0.15);

        // Barricadas e caixotes de cobertura ao longo da pista + Coletes
        this.addBox(-4.2, 0.9, -40, 2.2, 1.8, 2.2, matHazard, true);
        this.addBox(4.5, 0.9, -74, 2.2, 1.8, 2.2, matMetal, true);
        this.addPickup('ammo', 5.8, 0.55, -74);
        this.addPickup('armor', -14.5, 0.85, -68);

        // 3. SETOR NORTE: AVIÃO DE FUGA NA CABECEIRA DA PISTA (Z = -114)
        this.buildEscapePlane(0, -114);
        const planeBeacon = new THREE.Mesh(
          new THREE.RingGeometry(0.85, 1.15, 28),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
        );
        planeBeacon.rotation.x = -Math.PI / 2;
        planeBeacon.position.set(-3.2, 0.05, -112);
        this.levelGroup.add(planeBeacon);

        this.interactables.push({
          id: 'runway_plane', type: 'exit',
          position: new THREE.Vector3(-3.2, 1.2, -112), radius: 3.8,
          prompt: 'Pressione [E] para embarcar no Avião e Decolar',
          completed: false, visualMesh: planeBeacon
        });

        // Iluminação externa da pista nevada + balizas luminosas de pouso
        const hemi = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.9);
        this.levelGroup.add(hemi);
        const dirLight = new THREE.DirectionalLight(0xf8fafc, 1.15);
        dirLight.position.set(-40, 60, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.levelGroup.add(dirLight);

        for (let rz = 22; rz >= -128; rz -= 18) {
          [-10.4, 10.4].forEach(rx => {
            const beacon = new THREE.Mesh(
              new THREE.SphereGeometry(0.16, 8, 8),
              new THREE.MeshBasicMaterial({ color: rz < -95 ? 0x22c55e : 0x38bdf8 })
            );
            beacon.position.set(rx, 0.2, rz);
            this.levelGroup.add(beacon);
          });
        }

        // Guardas patrulhando a pista de pouso
        this.guardSpawns = [
          { pos: new THREE.Vector3(-14, 0, 14), patrol: [new THREE.Vector3(-14, 0, 14), new THREE.Vector3(-9, 0, 10)] },
          { pos: new THREE.Vector3(8, 0, 20), patrol: [new THREE.Vector3(8, 0, 20), new THREE.Vector3(-4, 0, 18)] },
          { pos: new THREE.Vector3(-5, 0, -18), patrol: [new THREE.Vector3(-5, 0, -18), new THREE.Vector3(4, 0, -24)] },
          { pos: new THREE.Vector3(15, 0, -31), patrol: [new THREE.Vector3(15, 0, -31), new THREE.Vector3(12, 0, -35)] },
          { pos: new THREE.Vector3(5, 0, -52), patrol: [new THREE.Vector3(5, 0, -52), new THREE.Vector3(-5, 0, -60)] },
          { pos: new THREE.Vector3(-6, 0, -84), patrol: [new THREE.Vector3(-6, 0, -84), new THREE.Vector3(6, 0, -88)] },
          { pos: new THREE.Vector3(4, 0, -104), patrol: [new THREE.Vector3(4, 0, -104), new THREE.Vector3(-5, 0, -106)] }
        ];
      }

      updateEnvironment(dt, nowSec) {
        for (const prop of this.animatedProps) {
          if (prop.type === 'water' && prop.tex) {
            prop.tex.offset.y -= dt * 0.06;
            prop.tex.offset.x = Math.sin(nowSec * 0.4) * 0.03;
          } else if (prop.type === 'beacon' && prop.mesh) {
            prop.mesh.material.opacity = 0.45 + Math.sin(nowSec * 4.5) * 0.3;
          } else if (prop.type === 'aircraft-propeller' && prop.mesh) {
            prop.mesh.rotation.z += dt * 26;
          } else if (prop.type === 'aircraft-light' && prop.mesh) {
            prop.mesh.material.emissiveIntensity =
              0.65 + (0.5 + Math.sin(nowSec * 5 + prop.phase) * 0.5) * 1.2;
          } else if (prop.type === 'propeller' && prop.mesh) {
            prop.mesh.rotation.y += dt * 3.2;
            prop.mesh.rotation.z += dt * 18;
          } else if (prop.type === 'waterfall' && prop.mesh) {
            prop.mesh.material.opacity = 0.42 + Math.sin(nowSec * 6 + prop.baseZ) * 0.15;
          }
        }

        // Anima abertura deslizante dos portões de segurança
        for (const gate of this.gates) {
          if (gate.isOpen && gate.progress < 1) {
            gate.progress = Math.min(1, gate.progress + dt * 1.4);
            const curX = THREE.MathUtils.lerp(gate.closedX, gate.openX, gate.progress);
            gate.mesh.position.x = curX;
            if (gate.progress >= 0.85) {
              // Remove colisão quando o portão já abriu
              gate.collider.minX = 9999;
              gate.collider.maxX = 9999;
            }
          }
        }

        // Rotação contínua das câmeras de vigilância intactas
        for (const cam of this.cameras) {
          if (!cam.destroyed) {
            cam.currentYaw = cam.baseYaw + Math.sin(nowSec * 1.1) * 0.65;
            cam.head.rotation.y = cam.currentYaw;
          }
        }

        // Flutuação sutil dos suprimentos coletáveis
        for (const p of this.pickups) {
          if (!p.collected) {
            p.mesh.rotation.y += dt * 1.8;
          }
        }
      }
    }

    /**
     * =========================================================================
     * 4. IA DOS GUARDAS & PERCEPÇÃO FURTIVA (GDD SEÇÃO 5.5)
     * Máquina de estados: PATROL -> SUSPICIOUS -> ALERTED -> DEAD
     * =========================================================================
     */
