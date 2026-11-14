/**
 * GoldenEye 077 v2.7 — patrulhas em equipe sem visão onisciente.
 * O rádio compartilha somente posições testemunhadas por um guarda ALERTED
 * que vê o jogador; companheiros investigam, não atiram sem visão própria.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof GoldenEyeDamGame === 'undefined' ||
      typeof GuardAgent === 'undefined') return;
  const GAME = GoldenEyeDamGame.prototype;
  const GUARD = GuardAgent.prototype;
  const INTERVAL = 0.45, RADIO_RADIUS_SQ = 17 * 17;
  const MAX_RADIOS = 2, MAX_RECEIVERS = 3;

  function canStand(x, z, blocks) {
    for (const b of blocks || []) {
      if (b.minX > b.maxX || (b.maxY ?? 5) < 0.45 || (b.minY ?? 0) > 1.9) continue;
      if (x + 0.34 > b.minX && x - 0.34 < b.maxX &&
          z + 0.34 > b.minZ && z - 0.34 < b.maxZ) return false;
    }
    return true;
  }

  function searchSector(guard, center, blocks, index, bounds) {
    if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.z)) return null;
    if (index === 0) return center.clone();
    // Posições fixas por soldado: evita um grupo inteiro no mesmo ponto.
    for (let k = 0; k < 5; k++) {
      const angle = (index * 2.399963229728653 + k * 1.25663706);
      const radius = k < 3 ? 1.9 + (index % 3) * 0.55 : 0.9;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      if (bounds && (x < bounds.minX + 0.4 || x > bounds.maxX - 0.4 ||
                     z < bounds.minZ + 0.4 || z > bounds.maxZ - 0.4)) continue;
      if (canStand(x, z, blocks)) return new THREE.Vector3(x, center.y ?? guard.pos.y, z);
    }
    return center.clone();
  }

  const oldHearNoise = GUARD.hearNoise;
  GUARD.hearNoise = function(location, radius) {
    const prevState = this.state;
    const result = oldHearNoise.call(this, location, radius);
    if (prevState !== 'ALERTED' && this.state === 'SUSPICIOUS' &&
        Number.isInteger(this.squadIndex) && this.lastKnownPlayerPos) {
      const target = searchSector(this, this.lastKnownPlayerPos,
        this.squadBlocks, this.squadIndex, this.squadBounds);
      if (target) this.lastKnownPlayerPos.copy(target);
    }
    return result;
  };

  function setup(game) {
    game.squadClock = 0;
    game.squadTimer = 0;
    const guards = game.guards || [];
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      guard.squadIndex = i;
      guard.squadBlocks = game.levelBuilder?.colliders || [];
      guard.squadBounds = game.levelBuilder?.bounds || null;
      guard.squadRadioUntil = 0;
      guard.squadBroadcastAt = -99;
      guard.squadFireSequence = false;
      guard.squadCoverNext = 0;
    }
  }

  function pulse(game) {
    const guards = game.guards || [];
    const blocks = game.levelBuilder?.colliders || [];
    const bounds = game.levelBuilder?.bounds;
    const now = game.squadClock;
    let radios = 0, coverIssued = false;

    // Não amplificar o custo a cada quadro nem ativar guardas mortos.
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      if (!Number.isInteger(guard.squadIndex)) {
        guard.squadIndex = i; // reforço instanciado depois do início da fase
        guard.squadBlocks = blocks;
        guard.squadBounds = bounds || null;
      }
      if (guard.state !== 'ALERTED') {
        guard.squadFireSequence = false;
        continue;
      }
      if (!guard.canSeePlayer || !guard.lastKnownPlayerPos) continue;

      // Distribuir a cadência inicial: três rifles não disparam no mesmo instante.
      if (!guard.squadFireSequence) {
        guard.fireCooldown = Math.max(0, guard.fireCooldown || 0) +
          (guard.squadIndex % 4) * 0.12;
        guard.squadFireSequence = true;
      }

      // Cobertura só para quem tem contato visual; um pedido por ciclo,
      // reaproveitando o planejador de obstáculos já existente (v1.3).
      if (!coverIssued && !guard.tacticalCoverRequest &&
          !guard.tacticalCoverTarget && now >= (guard.squadCoverNext || 0)) {
        const distanceSq = guard.pos.distanceToSquared(game.player.pos);
        if (distanceSq > 7 * 7 && distanceSq < 28 * 28) {
          guard.tacticalCoverRequest = true;
          guard.squadCoverNext = now + 9;
          coverIssued = true;
        }
      }

      if (radios >= MAX_RADIOS || now - (guard.squadBroadcastAt ?? -99) < 2.4)
        continue;
      guard.squadBroadcastAt = now;
      radios++;
      const lastSeen = guard.lastKnownPlayerPos;
      let sent = 0;
      for (let j = 0; j < guards.length && sent < MAX_RECEIVERS; j++) {
        const mate = guards[j];
        if (mate === guard || mate.state === 'DEAD' ||
            mate.state === 'ALERTED' || mate.canSeePlayer ||
            now < (mate.squadRadioUntil || 0)) continue;
        const dx = mate.pos.x - guard.pos.x, dz = mate.pos.z - guard.pos.z;
        if (dx * dx + dz * dz > RADIO_RADIUS_SQ) continue;

        // Rádio transmite o último setor confirmado, jamais a posição atual
        // de um jogador escondido. O colega ainda precisa identificar o alvo.
        const target = searchSector(mate, lastSeen, blocks,
          mate.squadIndex, bounds);
        if (!target) continue;
        if (mate.lastKnownPlayerPos) mate.lastKnownPlayerPos.copy(target);
        else mate.lastKnownPlayerPos = target;
        mate.state = 'SUSPICIOUS';
        mate.searchTimer = Math.max(mate.searchTimer || 0, 5.0);
        mate.suspicion = Math.max(0, Math.min(mate.suspicion || 0, 0.4));
        mate.statusOrb?.material?.color?.setHex(0xf59e0b);
        if (mate.laserSight) mate.laserSight.visible = false;
        mate.squadRadioUntil = now + 3.3;
        sent++;
      }
    }
  }

  const oldStart = GAME.startMission;
  GAME.startMission = function(...args) {
    const result = oldStart.apply(this, args);
    setup(this);
    return result;
  };

  const oldUpdate = GAME.update;
  GAME.update = function(dt, ...args) {
    const playing = this.appState === 'PLAYING';
    const result = oldUpdate.call(this, dt, ...args);
    if (!playing || this.appState !== 'PLAYING') return result;
    const step = Math.max(0, Math.min(0.05, Number.isFinite(dt) ? dt : 0));
    this.squadClock = (this.squadClock || 0) + step;
    this.squadTimer = (this.squadTimer || 0) + step;
    if (this.squadTimer >= INTERVAL) {
      this.squadTimer -= INTERVAL;
      pulse(this);
    }
    return result;
  };

  if (typeof window !== 'undefined') window.GoldenEyeSquadAI = {
    version: '2.7', interval: INTERVAL, radioRadius: 17
  };
})();
