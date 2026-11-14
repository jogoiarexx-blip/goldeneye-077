/**
 * GoldenEye 077 — guarda Meshy v2.5
 * Três ou quatro guardas por missão usam o modelo Meshy otimizado, preservando
 * GuardAgent, patrulhas, tiros, hitboxes, estado DEAD e limpeza após 5 s.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof GoldenEyeDamGame === 'undefined' ||
      typeof GuardAgent === 'undefined') return;
  const GAME = GoldenEyeDamGame.prototype;
  const GUARD = GuardAgent.prototype;
  const ASSET = 'assets/models/meshy-guard-fixed-v2-9.glb';
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
    const targets = game.meshyGuardTargets ||
      (game.meshyGuardTarget ? [game.meshyGuardTarget] : []);
    if (!template || !targets.length) return 0;
    let attached = 0;
    for (const guard of targets) {
      if (!guard || guard.state === 'DEAD' || guard.corpseRemoved ||
          !game.guards?.includes(guard) || guard.meshySpecialVisual) continue;

    const body = cloneVisual(template);
    body.name = 'meshy-soldier-fbx-optimized';
    // Scale and center the rigid, textured mesh, never bind estimated
    // skeletal weights (which broke chest/arms in Facility screenshots).
    body.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(body);
    const height = bounds.max.y - bounds.min.y;
    if (Number.isFinite(height) && height > 0.01) {
      const factor = 1.78 / height;
      body.scale.multiplyScalar(factor);
      body.position.set(
        -(bounds.min.x + bounds.max.x) * .5 * factor,
        -bounds.min.y * factor,
        -(bounds.min.z + bounds.max.z) * .5 * factor
      );
    }
    const rig = new THREE.Group();
    rig.name = 'guarda-meshy-especial';
    rig.add(body);

    // Legacy procedural body must not overlap the real textured mesh.
    // Keep hidden group objects to preserve GuardAgent animation references.
    guard.leftLeg.visible = false;
    guard.rightLeg.visible = false;
    guard.torsoGroup.visible = false;
    const weapon = guard.weaponArmGroup;
    if (weapon?.parent) weapon.parent.remove(weapon);
    if (weapon) {
      // The procedural cylindrical forearms looked like broken polygons
      // when superposed on the new character. Keep only the firearm.
      if (weapon.children[0]) weapon.children[0].visible = false;
      if (weapon.children[1]) weapon.children[1].visible = false;
      if (guard.laserSight) guard.laserSight.visible = false;
      weapon.position.set(0.06,1.24,0.14);
      guard.mesh.add(weapon);
    }
    if (guard.statusOrb) guard.statusOrb.scale.setScalar(.65);

    guard.mesh.add(rig);
    guard.meshySpecialVisual = rig;
    guard.meshySpecialModel = body;
    guard.meshyWalkCycle = 0;
    attached++;
    }
    return attached;
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
    game.meshyGuardTargets = [];
  }

  const previousStart = GAME.startMission;
  GAME.startMission = function(...args) {
    cleanup(this);
    const result = previousStart.apply(this, args);
    // Reuse the same GLB/texture for 3-4 existing guards per level.
    // No extra enemies or additional network requests; one new instance per
    // patrol cluster. Clones keep materials/geometry independent for corpse cleanup.
    const active = (this.guards || []).filter(g => g.state !== 'DEAD');
    this.meshyGuardTargets = active.filter((g,i) => i % 3 === 0).slice(0,4);
    this.meshyGuardTarget = this.meshyGuardTargets[0] || null;
    if (this.meshyGuardTargets.length) load(this);
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
      if (this.laserSight) this.laserSight.visible = false;
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
    version: '3.2', asset: ASSET, get loaded() { return !!template; }
  };
})();
