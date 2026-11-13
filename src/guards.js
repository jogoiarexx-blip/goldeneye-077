    function hasLineOfSight(origin, target, colliders, ignoreCollider = null) {
      const direction = target.clone().sub(origin);
      const length = direction.length();
      if (length < 0.001) return true;
      const ray = new THREE.Ray(origin.clone(), direction.divideScalar(length));
      const hit = new THREE.Vector3();
      for (const box of colliders) {
        if (box === ignoreCollider || box.minX > box.maxX) continue;
        const bounds = new THREE.Box3(
          new THREE.Vector3(box.minX, box.minY ?? 0, box.minZ),
          new THREE.Vector3(box.maxX, box.maxY ?? 5, box.maxZ)
        );
        if (ray.intersectBox(bounds, hit) && origin.distanceTo(hit) < length - 0.12) return false;
      }
      return true;
    }

    class GuardAgent {
      constructor(scene, spawnData, diffCfg, audio) {
        this.scene = scene;
        this.audio = audio;
        this.pos = spawnData.pos.clone();
        this.patrolPoints = spawnData.patrol.map(p => p.clone());
        this.patrolIdx = 1 % this.patrolPoints.length;

        this.hp = diffCfg.guardHp;
        this.maxHp = diffCfg.guardHp;
        this.damage = diffCfg.guardDamage;
        this.reactionDelay = diffCfg.guardReaction;

        this.state = 'PATROL'; // PATROL | SUSPICIOUS | ALERTED | DEAD
        this.yaw = 0;
        this.suspicion = 0;
        this.lastKnownPlayerPos = null;
        this.fireCooldown = 0;
        this.searchTimer = 0;
        this.walkCycle = Math.random() * Math.PI * 2;
        this.hitFlashTimer = 0;

        this.mesh = this.buildCharacterMesh();
        this.mesh.position.copy(this.pos);
        this.scene.add(this.mesh);
      }

      buildCharacterMesh() {
        const group = new THREE.Group();

        // Materiais táticos detalhados
        const matUniform = new THREE.MeshStandardMaterial({ color: 0x3b4d3b, roughness: 0.72, metalness: 0.08 });
        const matPants = new THREE.MeshStandardMaterial({ color: 0x263128, roughness: 0.8 });
        const matVest = new THREE.MeshStandardMaterial({ color: 0x182026, roughness: 0.55, metalness: 0.25 });
        const matSkin = new THREE.MeshStandardMaterial({ color: 0xd6a588, roughness: 0.65 });
        const matBoots = new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.4, metalness: 0.3 });
        const matGun = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.3, metalness: 0.85 });

        this.bodyMaterials = [matUniform, matPants, matVest];

        // Pernas articuladas (pivô no quadril)
        const createLeg = (offsetX) => {
          const legPivot = new THREE.Group();
          legPivot.position.set(offsetX, 0.88, 0);

          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.46, 10), matPants);
          thigh.position.y = -0.22;
          thigh.castShadow = true;

          const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.22), matBoots);
          boot.position.set(0, -0.64, 0.03);
          boot.castShadow = true;

          legPivot.add(thigh, boot);
          return legPivot;
        };

        this.leftLeg = createLeg(-0.13);
        this.rightLeg = createLeg(0.13);

        // Tronco & Colete Tático Soviético
        this.torsoGroup = new THREE.Group();
        this.torsoGroup.position.y = 1.24;

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.64, 0.26), matUniform);
        torso.castShadow = true;

        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.52, 0.30), matVest);
        vest.position.y = 0.03;
        vest.castShadow = true;

        // Bolsos de munição no peito + mochila tática nas costas
        [-0.13, 0.13].forEach(px => {
          const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.07), matUniform);
          pouch.position.set(px, -0.06, 0.16);
          this.torsoGroup.add(pouch);
        });

        const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.16), matPants);
        backpack.position.set(0, 0.04, -0.2);
        backpack.castShadow = true;

        // Ombreiras articuladas
        [-0.27, 0.27].forEach(sx => {
          const pad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.26), matVest);
          pad.position.set(sx, 0.24, 0);
          this.torsoGroup.add(pad);
        });

        // Cabeça, Rosto, Viseira & Quepe Militar
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.48;

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 14), matSkin);
        head.scale.set(0.95, 1.08, 1.0);
        head.castShadow = true;

        const visor = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.065, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.9 })
        );
        visor.position.set(0, 0.02, 0.12);

        const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.145, 0.09, 14), matUniform);
        capCrown.position.y = 0.12;
        const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14, 1, false, -0.8, 1.6), matBoots);
        capBrim.position.set(0, 0.08, 0.06);
        const capBadge = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        capBadge.position.set(0, 0.12, 0.16);

        headGroup.add(head, visor, capCrown, capBrim, capBadge);

        // Braços & Fuzil KF7 com Mira e Laser Tático
        this.weaponArmGroup = new THREE.Group();
        this.weaponArmGroup.position.set(0.24, 0.16, 0.08);

        const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.44, 8), matUniform);
        rightArm.rotation.x = Math.PI / 2.2;
        rightArm.position.set(0, -0.05, 0.18);

        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.46, 8), matUniform);
        leftArm.rotation.x = Math.PI / 2.3;
        leftArm.rotation.z = -0.35;
        leftArm.position.set(-0.24, -0.06, 0.24);

        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.11, 0.56), matGun);
        gunBody.position.set(-0.04, -0.04, 0.38);

        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 8), matGun);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.set(-0.04, -0.02, 0.74);

        const gunMag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.08), matVest);
        gunMag.rotation.x = 0.25;
        gunMag.position.set(-0.04, -0.14, 0.44);

        // Feixe laser vermelho visível apenas quando em estado ALERTED
        this.laserSight = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.006, 7.5, 6),
          new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55 })
        );
        this.laserSight.rotation.x = Math.PI / 2;
        this.laserSight.position.set(-0.04, -0.02, 4.5);
        this.laserSight.visible = false;

        this.weaponArmGroup.add(rightArm, leftArm, gunBody, gunBarrel, gunMag, this.laserSight);
        this.torsoGroup.add(torso, vest, backpack, headGroup, this.weaponArmGroup);

        // Indicador discreto de estado acima do quepe
        this.statusOrb = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        this.statusOrb.position.set(0, 2.08, 0);

        group.add(this.leftLeg, this.rightLeg, this.torsoGroup, this.statusOrb);
        return group;
      }

      takeDamage(amount, attackerPos) {
        if (this.state === 'DEAD') return false;
        this.hp -= amount;
        this.hitFlashTimer = 0.12;
        if (attackerPos) {
          this.lastKnownPlayerPos = attackerPos.clone();
          this.setAlerted();
        }
        if (this.hp <= 0) {
          this.state = 'DEAD';
          this.statusOrb.visible = false;
          if (this.laserSight) this.laserSight.visible = false;
          this.mesh.rotation.x = -Math.PI / 2;
          this.mesh.position.y = 0.25;
          return true; // Abatido
        }
        return false;
      }

      setAlerted() {
        if (this.state === 'DEAD') return;
        this.state = 'ALERTED';
        this.statusOrb.material.color.setHex(0xef4444);
        if (this.laserSight) this.laserSight.visible = true;
      }

      hearNoise(noisePos, radius) {
        if (this.state === 'DEAD' || this.state === 'ALERTED') return;
        const dist = this.pos.distanceTo(noisePos);
        if (dist <= radius) {
          this.lastKnownPlayerPos = noisePos.clone();
          this.state = 'SUSPICIOUS';
          this.searchTimer = 4.0;
          this.statusOrb.material.color.setHex(0xf59e0b);
        }
      }

      update(dt, playerPos, colliders, onShootPlayer) {
        if (this.state === 'DEAD') return;

        // Flash visual rápido ao sofrer impacto
        if (this.hitFlashTimer > 0) {
          this.hitFlashTimer -= dt;
          this.bodyMaterials.forEach(m => m.emissive.setHex(this.hitFlashTimer > 0 ? 0x661111 : 0x000000));
        }

        const toPlayer = new THREE.Vector3().subVectors(playerPos, this.pos);
        toPlayer.y = 0;
        const distToPlayer = toPlayer.length();

        // Verifica visão (cone de 100 graus + linha de visão livre)
        let canSeePlayer = false;
        if (distToPlayer < 34) {
          const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
          const angle = forward.angleTo(toPlayer.clone().normalize());
          if (angle < THREE.MathUtils.degToRad(52) || distToPlayer < 4.0) {
            if (hasLineOfSight(new THREE.Vector3(this.pos.x, 1.45, this.pos.z), playerPos, colliders)) {
              canSeePlayer = true;
            }
          }
        }

        if (canSeePlayer) {
          this.lastKnownPlayerPos = playerPos.clone();
          if (this.state !== 'ALERTED') {
            this.suspicion += dt / this.reactionDelay;
            this.statusOrb.material.color.setHex(0xf59e0b);
            if (this.suspicion >= 1.0) {
              this.setAlerted();
            }
          }
        } else if (this.state === 'ALERTED') {
          this.searchTimer += dt;
          if (this.searchTimer > 7.5) {
            this.state = 'PATROL';
            this.suspicion = 0;
            this.searchTimer = 0;
            this.statusOrb.material.color.setHex(0x22c55e);
            if (this.laserSight) this.laserSight.visible = false;
          }
        }

        // Comportamento por estado
        let isMoving = false;
        if (this.state === 'PATROL') {
          const target = this.patrolPoints[this.patrolIdx];
          const dir = new THREE.Vector3().subVectors(target, this.pos);
          dir.y = 0;
          if (dir.length() < 0.4) {
            this.patrolIdx = (this.patrolIdx + 1) % this.patrolPoints.length;
          } else {
            dir.normalize();
            this.yaw = Math.atan2(dir.x, dir.z);
            this.pos.addScaledVector(dir, 1.9 * dt);
            isMoving = true;
          }
        } else if (this.state === 'SUSPICIOUS' && this.lastKnownPlayerPos) {
          const dir = new THREE.Vector3().subVectors(this.lastKnownPlayerPos, this.pos);
          dir.y = 0;
          if (dir.length() > 1.2) {
            dir.normalize();
            this.yaw = Math.atan2(dir.x, dir.z);
            this.pos.addScaledVector(dir, 2.3 * dt);
            isMoving = true;
          }
          this.searchTimer -= dt;
          if (this.searchTimer <= 0 && !canSeePlayer) {
            this.state = 'PATROL';
            this.suspicion = 0;
            this.statusOrb.material.color.setHex(0x22c55e);
            if (this.laserSight) this.laserSight.visible = false;
          }
        } else if (this.state === 'ALERTED') {
          this.searchTimer = canSeePlayer ? 0 : this.searchTimer + dt;
          if (this.lastKnownPlayerPos) {
            const lookDir = new THREE.Vector3().subVectors(this.lastKnownPlayerPos, this.pos);
            lookDir.y = 0;
            if (lookDir.length() > 0.01) {
              this.yaw = Math.atan2(lookDir.x, lookDir.z);
            }
            if (distToPlayer > 11 || !canSeePlayer) {
              lookDir.normalize();
              this.pos.addScaledVector(lookDir, 3.1 * dt);
              isMoving = true;
            }
          }

          if (canSeePlayer) {
            this.fireCooldown -= dt;
            if (this.fireCooldown <= 0) {
              this.fireCooldown = 0.72;
              this.audio.playShot(false);
              const hitChance = Math.max(0.28, 0.78 - distToPlayer * 0.015);
              if (Math.random() < hitChance) {
                onShootPlayer(this.damage);
              }
            }
          }
        }

        // Animação articulada de marcha e postura de combate
        if (isMoving) {
          this.walkCycle += dt * (this.state === 'ALERTED' ? 11 : 6.5);
          const swing = Math.sin(this.walkCycle) * 0.55;
          this.leftLeg.rotation.x = swing;
          this.rightLeg.rotation.x = -swing;
          this.torsoGroup.position.y = 1.24 + Math.abs(Math.cos(this.walkCycle)) * 0.035;
        } else {
          this.leftLeg.rotation.x *= 0.8;
          this.rightLeg.rotation.x *= 0.8;
          this.torsoGroup.position.y = 1.24;
        }

        this.weaponArmGroup.rotation.x = this.state === 'ALERTED' ? -0.18 : 0.12;
        this.mesh.position.copy(this.pos);
        this.mesh.rotation.y = this.yaw;
      }
    }

    /**
     * =========================================================================
     * 5. CONTROLADOR PRINCIPAL DO JOGO (MÁQUINA DE ESTADOS, FPS E CUTSCENES)
     * =========================================================================
     */
