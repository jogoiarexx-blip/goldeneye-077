/**
 * GoldenEye 077 — guarda Meshy v2.5
 * Um guarda de cada missão usa o modelo Meshy otimizado, preservando
 * GuardAgent, patrulhas, tiros, hitboxes, estado DEAD e limpeza após 5 s.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof GoldenEyeDamGame === 'undefined' ||
      typeof GuardAgent === 'undefined') return;
  const GAME = GoldenEyeDamGame.prototype;
  const GUARD = GuardAgent.prototype;
  const ASSET = 'assets/models/meshy-guard-special.glb';
  let template = null, loading = false, failed = false;
  const activeGames = new Set();

  function cloneVisual(source) {
    // Não compartilhar geometrias/materiais entre cadáveres e próximos mapas:
    // a auditoria global descarta recursos do guarda após 5 segundos.
    const visual = source.clone(true);
    visual.traverse(node => {
      if (!node.isMesh) return;
      if (node.geometry?.clone) node.geometry = node.geometry.clone();
      if (Array.isArray(node.material))
        node.material = node.material.map(mat => mat?.clone ? mat.clone() : mat);
      else if (node.material?.clone) node.material = node.material.clone();
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;
    });
    return visual;
  }

  function attach(game) {
    const guard = game.meshyGuardTarget;
    if (!template || !guard || guard.state === 'DEAD' || guard.corpseRemoved ||
        !game.guards?.includes(guard) || guard.meshySpecialVisual) return false;

    const body = cloneVisual(template);
    body.name = 'meshy-soldier-fbx-optimized';
    const rig = new THREE.Group();
    rig.name = 'guarda-meshy-especial';
    rig.add(body);

    // Mantém o indicador de estado e a arma procedural funcionando.
    guard.leftLeg.visible = false;
    guard.rightLeg.visible = false;
    guard.torsoGroup.visible = false;
    const weapon = guard.weaponArmGroup;
    if (weapon?.parent) weapon.parent.remove(weapon);
    if (weapon) {
      weapon.position.set(0.24, 1.40, 0.08);
      guard.mesh.add(weapon);
    }

    guard.mesh.add(rig);
    guard.meshySpecialVisual = rig;
    guard.meshySpecialModel = body;
    guard.meshyWalkCycle = 0;
    return true;
  }

  function load(game) {
    activeGames.add(game);
    if (template) { attach(game); return; }
    if (loading || failed || typeof THREE.GLTFLoader !== 'function') return;
    loading = true;
    new THREE.GLTFLoader().load(ASSET, gltf => {
      loading = false;
      if (!gltf?.scene) { failed = true; return; }
      template = gltf.scene;
      // Se o carregamento terminar no meio de outra missão, só aplica
      // a um guarda que ainda pertence à lista atual.
      for (const target of activeGames) attach(target);
      activeGames.clear();
    }, undefined, error => {
      loading = false;
      failed = true;
      activeGames.clear();
      console.warn('[GoldenEye] Modelo Meshy indisponível: guarda original mantido.', error);
    });
  }

  function cleanup(game) {
    // Limpa apenas o clone anterior; a cópia-base continua em cache.
    for (const guard of game.guards || []) {
      if (!guard.meshySpecialModel || guard.corpseRemoved) continue;
      guard.meshySpecialModel.traverse(node => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const mat of materials) mat?.dispose?.();
      });
    }
    game.meshyGuardTarget = null;
  }

  const previousStart = GAME.startMission;
  GAME.startMission = function(...args) {
    cleanup(this);
    const result = previousStart.apply(this, args);
    // Um único soldado especial por fase; os outros permanecem originais.
    this.meshyGuardTarget = (this.guards || []).find(g => g.state !== 'DEAD') || null;
    if (this.meshyGuardTarget) load(this);
    return result;
  };

  const previousGuardUpdate = GUARD.update;
  GUARD.update = function(dt, ...args) {
    const beforeX = this.pos.x, beforeZ = this.pos.z;
    const result = previousGuardUpdate.call(this, dt, ...args);
    const rig = this.meshySpecialVisual;
    if (!rig || this.state === 'DEAD') return result;

    // Movimento suave do corpo durante patrulha, sem mixer caro por NPC.
    const moving = Math.hypot(this.pos.x - beforeX, this.pos.z - beforeZ) > 0.005;
    this.meshyWalkCycle += Math.max(0, dt) * (moving ? 9 : 1.3);
    const swing = Math.sin(this.meshyWalkCycle);
    rig.position.y = moving ? Math.abs(swing) * 0.018 : swing * 0.004;
    rig.rotation.z = moving ? swing * 0.025 : swing * 0.005;

    // Os acertos agora piscam também no material Meshy.
    if (this.meshySpecialModel) {
      const flash = this.hitFlashTimer > 0 ? 0x40100a : 0x000000;
      this.meshySpecialModel.traverse(node => {
        if (!node.isMesh) return;
        for (const mat of Array.isArray(node.material) ? node.material : [node.material])
          if (mat?.emissive && mat.emissive.getHex() !== flash)
            mat.emissive.setHex(flash);
      });
    }
    return result;
  };

  window.GoldenEyeMeshyGuard = {
    version: '2.5', asset: ASSET, get loaded() { return !!template; }
  };
})();
