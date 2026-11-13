/**
 * Atualização tática 1.3 — busca sem visão onisciente, cobertura,
 * sinalização de portas da Facility e decolagem cinematográfica da Runway.
 * Carregado depois de mission-enhancements.js, antes do DOMContentLoaded.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof GuardAgent === 'undefined' ||
      typeof GoldenEyeDamGame === 'undefined') return;

  const GR = GuardAgent.prototype;
  const GAME = GoldenEyeDamGame.prototype;
  const clamp01 = n => Math.min(1, Math.max(0, n));
  const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };

  // Testa o mesmo espaço físico usado pelo jogador, sem teleporte de NPCs.
  function walkable(x, z, blocks, radius = 0.39) {
    return !blocks.some(b => b.minX <= b.maxX &&
      (b.maxY ?? 5) > 0.4 && (b.minY ?? 0) < 2.1 &&
      x + radius > b.minX && x - radius < b.maxX &&
      z + radius > b.minZ && z - radius < b.maxZ);
  }
  function pathClear(a, b, blocks) {
    const distance = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(distance / 0.4));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!walkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, blocks)) return false;
    }
    return true;
  }
  function chooseCover(guard, player, colliders) {
    const playerEye = new THREE.Vector3(player.x, 1.55, player.z);
    let best = null, bestScore = Infinity;
    for (const b of colliders) {
      if (b.minX >= b.maxX || (b.maxY ?? 5) < 1.5 || (b.minY ?? 0) > 1.2) continue;
      const midX = (b.minX + b.maxX) * 0.5;
      const midZ = (b.minZ + b.maxZ) * 0.5;
      const places = [
        [b.minX - 0.65, midZ], [b.maxX + 0.65, midZ],
        [midX, b.minZ - 0.65], [midX, b.maxZ + 0.65]
      ];
      for (const [x, z] of places) {
        const distance = Math.hypot(x - guard.pos.x, z - guard.pos.z);
        if (distance < 0.7 || distance > 7.5 || !walkable(x, z, colliders)) continue;
        const target = new THREE.Vector3(x, guard.pos.y, z);
        if (!pathClear(guard.pos, target, colliders)) continue;
        // Abrigo real: o volume físico bloqueia a visão do jogador para o ponto.
        if (hasLineOfSight(playerEye, new THREE.Vector3(x, 1.3, z), colliders)) continue;
        const score = distance + Math.abs(Math.hypot(x - player.x, z - player.z) - 8) * 0.12;
        if (score < bestScore) { bestScore = score; best = target; }
      }
    }
    return best;
  }

  const originalTakeDamage = GR.takeDamage;
  GR.takeDamage = function (amount, attackerPos) {
    const killed = originalTakeDamage.call(this, amount, attackerPos);
    if (!killed && this.state !== 'DEAD' && attackerPos) {
      this.tacticalCoverRequest = true;
      this.tacticalCoverTimer = 0;
    }
    return killed;
  };

  // Aplica busca e movimento tático DEPOIS da detecção normal e das colisões v1.2.
  // O guarda nunca recebe a posição real do jogador quando ela está oculta.
  const originalGuardUpdate = GR.update;
  GR.update = function (dt, playerPos, blocks, damagePlayer) {
    if (this.state === 'DEAD') return;
    const before = this.pos.clone();
    const coverActive = this.tacticalCoverTarget && this.tacticalCoverTimer > 0;
    const visible = hasLineOfSight(
      new THREE.Vector3(before.x, 1.45, before.z),
      new THREE.Vector3(playerPos.x, playerPos.y || 1.65, playerPos.z),
      blocks
    );
    originalGuardUpdate.call(this, dt, playerPos, blocks, damagePlayer);
    if (this.state === 'DEAD') return;

    if (this.state === 'ALERTED' && !visible && this.searchTimer > 4.2 &&
        !this.tacticalCoverTarget) {
      // Após perder o contato, investigar o último setor visto, não a posição atual.
      const base = this.lastKnownPlayerPos || before;
      const step = this.searchVariant = ((this.searchVariant || 0) + 1) % 4;
      const offsets = [[2, 0], [0, 2], [-2, 0], [0, -2]];
      const [ox, oz] = offsets[step];
      const target = new THREE.Vector3(base.x + ox, base.y, base.z + oz);
      this.state = 'SUSPICIOUS';
      this.searchTimer = 4.5;
      this.suspicion = 0;
      this.lastKnownPlayerPos = walkable(target.x, target.z, blocks) &&
        pathClear(this.pos, target, blocks) ? target : base.clone();
      this.statusOrb.material.color.setHex(0xf59e0b);
      if (this.laserSight) this.laserSight.visible = false;
    }

    if (this.tacticalCoverRequest && this.state === 'ALERTED') {
      this.tacticalCoverRequest = false;
      const target = chooseCover(this, playerPos, blocks);
      if (target) {
        this.tacticalCoverTarget = target;
        this.tacticalCoverTimer = 5.5;
        this.coverArrivalTimer = 0;
      }
    }

    if (coverActive && this.state === 'ALERTED') {
      const target = this.tacticalCoverTarget;
      const direction = target.clone().sub(before);
      direction.y = 0;
      const distance = direction.length();
      const step = Math.min(distance, 2.15 * dt);
      if (step > 0.002) direction.multiplyScalar(step / distance);
      // Cancela a perseguição automática nesse intervalo para não atravessar cobertura.
      this.pos.copy(before);
      const nx = before.x + direction.x, nz = before.z + direction.z;
      if (walkable(nx, nz, blocks)) {
        this.pos.x = nx; this.pos.z = nz;
        if (step > 0.002) this.yaw = Math.atan2(direction.x, direction.z);
      }
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y = this.yaw;
      if (distance < 0.35) this.coverArrivalTimer += dt;
      if (this.coverArrivalTimer > 1.1) this.tacticalCoverTimer = 0;
    }

    if (this.tacticalCoverTimer > 0) this.tacticalCoverTimer = Math.max(0, this.tacticalCoverTimer - dt);
    if (this.tacticalCoverTimer === 0) this.tacticalCoverTarget = null;
  };

  const oldStart = GAME.startMission;
  GAME.startMission = function () {
    this.v13GateDisplays = [];
    this.v13Dust = [];
    this.v13Exit = null;
    oldStart.call(this);
    if (this.currentMissionId !== 'facility') return;
    for (const entry of this.levelBuilder.interactables) {
      if (entry.type !== 'gate_switch' || !entry.gateId?.startsWith('fac_gate')) continue;
      const gate = this.levelBuilder.gates.find(g => g.id === entry.gateId);
      if (!gate) continue;
      const indicator = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      indicator.position.copy(entry.position);
      indicator.position.y = 1.92;
      this.levelBuilder.levelGroup.add(indicator);
      this.v13GateDisplays.push({ gate, entry, indicator, wasOpening: false });
    }
  };

  const oldInteract = GAME.interact;
  GAME.interact = function () {
    if (this.appState !== 'PLAYING') return;
    if (this.currentMissionId === 'facility') {
      // Resolve a interação mais próxima, evitando usar um terminal atrás de outro.
      this.levelBuilder.interactables.sort((a, b) =>
        this.player.pos.distanceTo(a.position) - this.player.pos.distanceTo(b.position));
    }
    oldInteract.call(this);
  };

  const oldOutro = GAME.startOutroCutscene;
  GAME.startOutroCutscene = function () {
    oldOutro.call(this);
    if (this.currentMissionId === 'facility') {
      const door = this.levelBuilder.interactables.find(i => i.id === 'facility_exit');
      this.v13Exit = door?.visualMesh || null;
    }
    if (this.currentMissionId !== 'runway' || !this.levelBuilder.planeMesh) return;
    // Partículas simples, com quantidade fixa e sem textura pesada.
    const plane = this.levelBuilder.planeMesh;
    const shape = new THREE.SphereGeometry(0.55, 7, 5);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 ? 0xb9c5d0 : 0xf1f5f9,
        transparent: true, opacity: 0.31, depthWrite: false
      });
      const puff = new THREE.Mesh(shape, mat);
      const side = i % 2 ? -1 : 1;
      puff.position.set(plane.position.x + side * (1.1 + i * 0.25), 0.4,
        plane.position.z + 2 + (i % 4) * 1.3);
      puff.raycast = () => {};
      this.levelBuilder.levelGroup.add(puff);
      this.v13Dust.push({ mesh: puff, offset: i });
    }
  };

  const oldUpdate = GAME.update;
  GAME.update = function (dt) {
    oldUpdate.call(this, dt);
    const level = this.levelBuilder;
    if (this.appState === 'PLAYING' && this.currentMissionId === 'facility') {
      for (const { gate, entry, indicator } of (this.v13GateDisplays || [])) {
        const doak = level.interactables.find(i => i.id === 'contact_doak');
        const needDecoder = entry.requiresDoak && this.difficulty !== 'AGENT' && !doak?.completed;
        const opening = gate.isOpen && gate.progress < 0.85;
        const color = gate.isOpen ? (opening ? 0x38bdf8 : 0x22c55e) :
          (needDecoder ? 0xef4444 : 0xf59e0b);
        indicator.material.color.setHex(color);
        if (opening) indicator.scale.setScalar(0.82 + Math.sin(this.simulationTime * 12) * 0.22);
        else indicator.scale.setScalar(1);
        if (entry.requiresDoak && !gate.isOpen) {
          entry.prompt = needDecoder ?
            'ACESSO RESTRITO: encontre Dr. Doak para obter o decodificador' :
            'Pressione [E] para utilizar o decodificador na porta blindada';
        }
      }
    }

    if (this.appState !== 'CUTSCENE_OUTRO') return;
    const p = clamp01(this.cutsceneTimer / 4.0);
    const ease = smooth(p);
    if (this.currentMissionId === 'facility' && this.v13Exit) {
      // A porta final abre em sincronia com a câmera de fuga.
      this.v13Exit.position.y = 1.7 + 3.9 * smooth(p / 0.65);
    }
    if (this.currentMissionId !== 'runway' || !level.planeMesh) return;
    const plane = level.planeMesh;
    const lift = smooth((p - 0.34) / 0.66);
    plane.position.z = -114 - 66 * ease;
    plane.position.y = 19 * lift;
    plane.rotation.x = 0.14 * lift;
    plane.rotation.z = Math.sin(p * 9) * 0.015 * lift;
    this.camera.position.set(
      THREE.MathUtils.lerp(-16, 13, ease),
      THREE.MathUtils.lerp(5, 15.5, lift),
      THREE.MathUtils.lerp(-104, -145, ease)
    );
    this.camera.lookAt(plane.position.x, plane.position.y + 2.0, plane.position.z - 2.0);
    for (const prop of level.animatedProps) {
      if (prop.type === 'propeller') prop.mesh.rotation.z += dt * 38;
    }
    for (const part of (this.v13Dust || [])) {
      const alpha = clamp01(1 - p * 2.25);
      const mesh = part.mesh;
      mesh.visible = alpha > 0.01;
      if (!mesh.visible) continue;
      mesh.position.y += dt * (0.25 + part.offset * 0.025);
      mesh.scale.setScalar(1 + p * 3.7);
      mesh.material.opacity = alpha * 0.31;
    }
    const subtitle = document.getElementById('cutscene-subtitle');
    if (subtitle) subtitle.textContent = p < 0.34 ?
      'PISTA DE ARKHANGELSK // Motores na potência máxima...' :
      p < 0.68 ? 'DECOLAGEM // Aeronave ganhando altitude.' :
        'EXTRAÇÃO CONCLUÍDA // Deixando a instalação para trás.';
  };
})();
