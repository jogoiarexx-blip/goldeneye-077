/* Melhorias incrementais das missões Dam, Facility e Runway. */
(() => {
  'use strict';
  if (typeof GoldenEyeDamGame === 'undefined' || typeof GuardAgent === 'undefined') return;

  function overlapsObstacle(x, z, radius, colliders, maxHeight = 1.7) {
    for (const b of colliders) {
      if (b.minX > b.maxX || (b.maxY ?? 5) <= 0.45 || (b.minY ?? 0) >= maxHeight) continue;
      if (x + radius > b.minX && x - radius < b.maxX &&
          z + radius > b.minZ && z - radius < b.maxZ) return true;
    }
    return false;
  }

  // Guardas respeitam volumes de colisão, portas e obstáculos fechados.
  const guardUpdate = GuardAgent.prototype.update;
  GuardAgent.prototype.update = function (dt, playerPos, colliders, shoot) {
    const prev = this.pos.clone();
    guardUpdate.call(this, dt, playerPos, colliders, shoot);
    if (this.state === 'DEAD') return;
    if (!overlapsObstacle(this.pos.x, this.pos.z, 0.34, colliders)) {
      this.blockedSeconds = 0;
      return;
    }
    const intended = this.pos.clone();
    let x = overlapsObstacle(intended.x, prev.z, 0.34, colliders) ? prev.x : intended.x;
    let z = overlapsObstacle(x, intended.z, 0.34, colliders) ? prev.z : intended.z;
    if (overlapsObstacle(x, z, 0.34, colliders)) { x = prev.x; z = prev.z; }
    this.pos.x = x;
    this.pos.z = z;
    this.mesh.position.copy(this.pos);
    this.blockedSeconds = (this.blockedSeconds || 0) + dt;
    if (this.blockedSeconds > 2.8 && this.state === 'PATROL' && this.patrolPoints.length > 1) {
      this.patrolIdx = (this.patrolIdx + 1) % this.patrolPoints.length;
      this.blockedSeconds = 0;
    }
  };

  const game = GoldenEyeDamGame.prototype;
  const originalCollision = game.resolvePlayerCollision;
  game.resolvePlayerCollision = function (nextPos) {
    originalCollision.call(this, nextPos);
    if (!this.player.inTank) return;
    const bounds = this.levelBuilder.bounds;
    const radius = 1.7;
    const canFit = (x, z) => x >= bounds.minX + radius && x <= bounds.maxX - radius &&
      z >= bounds.minZ + radius && z <= bounds.maxZ - radius &&
      !overlapsObstacle(x, z, radius, this.levelBuilder.colliders, 2.4);
    if (canFit(nextPos.x, nextPos.z)) return;
    const original = this.player.pos;
    if (canFit(nextPos.x, original.z)) nextPos.z = original.z;
    else if (canFit(original.x, nextPos.z)) nextPos.x = original.x;
    else { nextPos.x = original.x; nextPos.z = original.z; }
  };

  const oldStart = game.startMission;
  game.startMission = function () {
    if (this.missionFx) this.missionFx.forEach(fx => this.scene.remove(fx.mesh));
    this.missionFx = [];
    this.facilityEmergency = false;
    this.guideTick = 0;
    oldStart.call(this);
    this.emergencyLamps = [];
    if (this.currentMissionId === 'facility') {
      for (const z of [-48, -64, -80]) {
        const material = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), material);
        lens.position.set(0, 3.76, z);
        const light = new THREE.PointLight(0xff3344, 0, 10);
        light.position.copy(lens.position);
        this.levelBuilder.levelGroup.add(lens, light);
        this.emergencyLamps.push({ lens, light });
      }
      this.levelBuilder.npcs.forEach(npc => { npc.originalYaw = npc.mesh.rotation.y; });
    }
  };

  // O backup da Dam só pode ser interceptado depois de instalar o modem.
  const originalInteract = game.interact;
  game.interact = function () {
    if (this.appState !== 'PLAYING') return;
    if (this.currentMissionId === 'dam') {
      const data = this.levelBuilder.interactables.find(x => x.id === 'data_backup');
      const modem = this.levelBuilder.interactables.find(x => x.id === 'place_modem');
      if (data && modem && !data.completed && !modem.completed &&
          this.player.pos.distanceTo(data.position) <= data.radius) {
        this.audio.playGadgetBeep(false);
        this.notifyHUD('ACESSO NEGADO: INSTALE O MODEM NO TERMINAL CENTRAL PRIMEIRO');
        return;
      }
    }
    // Falha na saída do Runway não pode forçar desembarque do tanque.
    if (this.currentMissionId === 'runway' && this.player.inTank) {
      const plane = this.levelBuilder.interactables.find(x => x.id === 'runway_plane');
      if (plane && this.player.pos.distanceTo(plane.position) <= plane.radius + 1.5 &&
          this.objectives.some(obj => obj.id !== 'runway_plane' && !obj.completed)) {
        this.tryTriggerMissionExit('runway_plane');
        return;
      }
    }
    originalInteract.call(this);
  };

  const originalTankDamage = game.damageChemicalTank;
  game.damageChemicalTank = function (tank, damage, hitPoint) {
    const previouslyDestroyed = tank.destroyed;
    originalTankDamage.call(this, tank, damage, hitPoint);
    if (this.currentMissionId === 'facility' && !previouslyDestroyed && tank.destroyed) {
      if (!this.facilityEmergency) this.audio.playAlarmPulse();
      this.facilityEmergency = true;
    }
  };

  const originalEmplacementDamage = game.damageEmplacement;
  game.damageEmplacement = function (emp, damage, hitPoint) {
    const previouslyDestroyed = emp.destroyed;
    originalEmplacementDamage.call(this, emp, damage, hitPoint);
    if (this.currentMissionId !== 'runway' || previouslyDestroyed || !emp.destroyed) return;
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 9, 7),
      new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.42, depthWrite: false })
    );
    smoke.position.copy(emp.position);
    smoke.position.y += 0.85;
    smoke.raycast = () => {};
    this.scene.add(smoke);
    this.missionFx = this.missionFx || [];
    this.missionFx.push({ mesh: smoke, age: 0, lifetime: 13 });
  };

  // Orientação contextual sem minimapa nem localização de inimigos.
  const labels = {
    disable_alarms: 'Neutralizar alarmes', place_modem: 'Instalar modem',
    data_backup: 'Interceptar dados', bungee: 'Plataforma de salto',
    contact_doak: 'Localizar Dra.', meet_006: 'Encontrar agente 006',
    destroy_tanks: 'Destruir tanques químicos', facility_exit: 'Saída da instalação',
    ignition_key: 'Encontrar chave de ignição', destroy_emplacements: 'Destruir defesas',
    runway_intel: 'Planos de voo', runway_plane: 'Avião de fuga',
    frigate_rescue_hostages: 'Libertar reféns', frigate_disarm_bridge: 'Desarmar bomba da ponte',
    frigate_disarm_engine: 'Desarmar bomba das máquinas',
    frigate_heli_tracker: 'Instalar rastreador', frigate_exit: 'Evacuar navio',
    s2_disable_surveillance: 'Desativar câmeras de vigilância',
    s2_cut_bunker_link: 'Cortar enlace com o bunker',
    s2_disable_helicopter: 'Neutralizar helicóptero de apoio',
    s2_bunker_entry: 'Entrada subterrânea',
    b2_compare_records: 'Cruzar registros de funcionários e baixas',
    b2_get_videotape: 'Recuperar fita de vídeo',
    b2_destroy_cameras: 'Destruir câmeras do bunker',
    b2_get_manual: 'Recuperar manual GoldenEye',
    b2_escape_with_natalya: 'Escapar com Natalya',
    st_valentin: 'Encontrar Valentin na clareira oeste',
    st_janus: 'Confrontar Janus junto ao obelisco',
    st_helicopter: 'Investigar o helicóptero abandonado',
    st_natalya: 'Localizar Natalya no setor norte',
    st_flight_recorder: 'Recuperar gravador do helicóptero',
    st_exit: 'Sair do parque das estátuas'
  };
  function guideTarget(gameInstance, id) {
    const level = gameInstance.levelBuilder;
    // Facility: orientar até o controle correto antes de qualquer objetivo
    // atrás de portões. A primeira alavanca fica antes do laboratório.
    if(gameInstance.currentMissionId==='facility'){
      for(const [gateId,readerId] of [
        ['fac_gate_1','open_fac_gate_1'],
        ['fac_gate_2','open_fac_gate_2']
      ]){
        const gate=level.gates.find(g=>g.id===gateId);
        const needsAccess=gateId==='fac_gate_1' ||
          ['meet_006','destroy_tanks','facility_exit'].includes(id);
        if(gate&&!gate.isOpen&&needsAccess){
          const reader=level.interactables.find(i=>i.id===readerId&&!i.completed);
          if(reader)return reader.position;
        }
      }
    }
    // Runway: nunca enviar o jogador pela lateral quando o checkpoint
    // principal estiver fechado; apontar para o leitor do lado de entrada.
    const runwayGate = gameInstance.currentMissionId === 'runway'
      ? level.gates.find(g => g.id === 'run_gate_1') : null;
    if(runwayGate && !runwayGate.isOpen){
      const reader=level.interactables.find(i =>
        i.id === 'open_run_gate_1' && !i.completed);
      if(reader)return reader.position;
    }
    // Em Surface 2 o jogador precisa abrir o checkpoint para chegar ao helicóptero.
    const gate = gameInstance.currentMissionId === 'surface2'
      ? level.gates.find(g => g.id === 's2_gate') : null;
    if (gate && !gate.isOpen && (id === 's2_disable_helicopter' || id === 's2_bunker_entry')) {
      const reader = level.interactables.find(i => i.id === 's2_gate_switch' && !i.completed);
      if (reader) return reader.position;
    }
    let entries = [];
    if (id === 'disable_alarms') entries = level.alarms.filter(x => !x.destroyed);
    else if (id === 'destroy_tanks') entries = level.tanks.filter(x => !x.destroyed);
    else if (id === 'destroy_emplacements') entries = level.emplacements.filter(x => !x.destroyed);
    else if (id === 'frigate_rescue_hostages') entries = level.interactables.filter(x => x.type === 'frigate_hostage' && !x.completed);
    else if (id === 'b2_destroy_cameras') entries = level.interactables.filter(x => x.type === 'b2_camera' && !x.camera.destroyed);
    else if (id === 'b2_compare_records' && level.bunker2State &&
             !level.bunker2State.records.compared) {
      const r = level.bunker2State.records;
      const nextLog = !r.personnel ? 'b2_personnel_log' : !r.casualty ?
        'b2_casualty_log' : 'b2_compare_records';
      entries = level.interactables.filter(x => x.id === nextLog && !x.completed);
    }
    else if (id === 'b2_escape_with_natalya' && level.bunker2State &&
             !level.bunker2State.freed)
      entries = level.interactables.filter(x => x.id === 'b2_free_natalya');
    else entries = level.interactables.filter(x => x.id === id && !x.completed);
    entries.sort((a, b) => gameInstance.player.pos.distanceTo(a.position) - gameInstance.player.pos.distanceTo(b.position));
    return entries[0]?.position || null;
  }
  function updateGuide(gameInstance) {
    let view = document.getElementById('mission-guide');
    if (!view) {
      view = document.createElement('div');
      view.id = 'mission-guide';
      view.style.cssText = 'position:fixed;bottom:94px;left:50%;transform:translateX(-50%);max-width:min(75vw,460px);min-width:210px;text-align:center;padding:8px 12px;border-radius:10px;background:rgba(7,11,16,.78);border:1px solid rgba(56,189,248,.32);font:600 11px/1.5 ui-monospace,monospace;color:#cbd5e1;pointer-events:none;text-shadow:0 1px 2px #000;';
      document.getElementById('screen-hud').appendChild(view);
    }
    if (gameInstance.guideEnabled === false) { view.style.display = 'none'; return; }
    view.style.display = '';
    const objective = gameInstance.objectives.find(o => !o.completed);
    if (!objective) { view.textContent = 'DIRETIVAS CONCLUÍDAS'; return; }
    const target = guideTarget(gameInstance, objective.id);
    let distance = '';
    if (target) {
      const x = target.x - gameInstance.player.pos.x;
      const z = target.z - gameInstance.player.pos.z;
      const forward = -x * Math.sin(gameInstance.player.yaw) - z * Math.cos(gameInstance.player.yaw);
      const right = x * Math.cos(gameInstance.player.yaw) - z * Math.sin(gameInstance.player.yaw);
      const angle = Math.atan2(right, forward);
      const direction = Math.abs(angle) <= Math.PI / 4 ? '↑' :
        Math.abs(angle) >= Math.PI * 3 / 4 ? '↓' : angle > 0 ? '→' : '←';
      distance = ' · ' + Math.round(Math.hypot(x, z)) + 'm ' + direction;
    }
    const gatePending = gameInstance.currentMissionId === 'surface2' &&
      ['s2_disable_helicopter', 's2_bunker_entry'].includes(objective.id) &&
      gameInstance.levelBuilder.gates.some(g => g.id === 's2_gate' && !g.isOpen);
    const runwayGatePending=gameInstance.currentMissionId==='runway' &&
      gameInstance.levelBuilder.gates.some(g => g.id === 'run_gate_1' && !g.isOpen);
    const facilityGatePending=gameInstance.currentMissionId==='facility'
      ? gameInstance.levelBuilder.gates.find(g=>g.id==='fac_gate_1'&&!g.isOpen)
        ? 1 : (['meet_006','destroy_tanks','facility_exit'].includes(objective.id) &&
          gameInstance.levelBuilder.gates.some(g=>g.id==='fac_gate_2'&&!g.isOpen))
          ? 2 : 0
      : 0;
    view.textContent = facilityGatePending
      ? 'ACESSO: ABRIR PORTA '+facilityGatePending+' DA FACILITY' + distance
      : runwayGatePending
        ? 'ACESSO: DESTRAVAR PORTÃO DA PISTA' + distance
        : gatePending
          ? 'ACESSO: ABRIR PORTÃO NORTE' + distance
          : 'DIRETIVA: ' + (labels[objective.id] || objective.title) + distance;
  }

  const originalUpdate = game.update;
  game.update = function (dt) {
    originalUpdate.call(this, dt);
    if (this.appState !== 'PLAYING') return;
    this.guideTick = (this.guideTick || 0) + dt;
    if (this.guideTick >= 0.20) {
      this.guideTick = 0;
      updateGuide(this);
    }
    if (this.currentMissionId === 'facility') {
      const pulse = this.facilityEmergency ? (0.55 + Math.sin(this.stats.timeElapsed * 9) * 0.4) : 0;
      for (const lamp of (this.emergencyLamps || [])) {
        lamp.light.intensity = pulse;
        lamp.lens.material.color.setHex(this.facilityEmergency && pulse > 0.55 ? 0xff3344 : 0x7f1d1d);
      }
      for (const npc of this.levelBuilder.npcs) {
        if (npc.role !== 'scientist' || npc.dead) continue;
        const panic = this.facilityEmergency || this.audio.combatIntensity;
        const dest = panic ? 0.78 : 1;
        npc.mesh.scale.y = THREE.MathUtils.lerp(npc.mesh.scale.y, dest, Math.min(1, dt * 6));
        npc.mesh.rotation.y = THREE.MathUtils.lerp(npc.mesh.rotation.y,
          panic ? Math.atan2(npc.position.x - this.player.pos.x, npc.position.z - this.player.pos.z) : npc.originalYaw,
          Math.min(1, dt * 2));
      }
    }
    for (let i = (this.missionFx || []).length - 1; i >= 0; i--) {
      const fx = this.missionFx[i];
      fx.age += dt;
      fx.mesh.position.y += dt * 0.42;
      fx.mesh.scale.setScalar(1 + fx.age * 0.18);
      fx.mesh.material.opacity = 0.42 * Math.max(0, 1 - fx.age / fx.lifetime);
      if (fx.age >= fx.lifetime) {
        this.scene.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        fx.mesh.material.dispose();
        this.missionFx.splice(i, 1);
      }
    }
  };

  // [H] permite ocultar ou exibir a orientação sem interromper a missão.
  if (typeof window !== 'undefined') window.addEventListener('keydown', (event) => {
    const running = window.gameInstance;
    if (event.code !== 'KeyH' || event.repeat || !running || running.appState !== 'PLAYING') return;
    running.guideEnabled = running.guideEnabled === false;
    updateGuide(running);
    running.notifyHUD(running.guideEnabled ? 'GUIA DE OBJETIVOS ATIVADO' : 'GUIA DE OBJETIVOS DESATIVADO');
  });
})();
