/**
 * GoldenEye 077 v2.6 — combate com animações procedurais leves.
 * Camada visual independente: não altera hitboxes, IA, modelos ou tempo dos corpos.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof GoldenEyeDamGame === 'undefined' ||
      typeof GuardAgent === 'undefined') return;
  const GAME = GoldenEyeDamGame.prototype, GUARD = GuardAgent.prototype;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const reloadTime = w => w?.id === 'sniper' ? 1.18 : w?.id === 'kf7' ? 1.04 : 0.82;

  const oldBuild = GUARD.buildCharacterMesh;
  GUARD.buildCharacterMesh = function(...args) {
    const group = oldBuild.apply(this, args);
    if (this.weaponArmGroup && !this.guardMuzzle) {
      const flash = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.075, 0),
        new THREE.MeshBasicMaterial({
          color: 0xffc96a, transparent: true, opacity: 0.92, depthWrite: false
        })
      );
      flash.name = 'guard-shot-flash';
      flash.position.set(-0.04, -0.02, 0.94);
      flash.scale.set(0.9, 0.9, 1.7);
      flash.visible = false;
      this.weaponArmGroup.add(flash);
      this.guardMuzzle = flash;
    }
    return group;
  };

  const oldDamage = GUARD.takeDamage;
  GUARD.takeDamage = function(amount, attacker) {
    const killed = oldDamage.call(this, amount, attacker);
    if (!this.mesh?.isObject3D || !this.pos) return killed;
    this.hitSide = attacker && attacker.x >= this.pos.x ? -1 : 1;
    if (killed) {
      this.deathAnim = { elapsed: 0, duration: 0.48, side: this.hitSide };
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = 0;
      this.mesh.position.y = this.pos.y;
      if (this.guardMuzzle) this.guardMuzzle.visible = false;
    } else if (this.state !== 'DEAD') this.hitReaction = 0.22;
    return killed;
  };

  const oldGuardUpdate = GUARD.update;
  GUARD.update = function(dt, ...args) {
    const previousCooldown = this.fireCooldown || 0;
    const result = oldGuardUpdate.call(this, dt, ...args);
    const step = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    if (this.state === 'DEAD') {
      if (this.guardMuzzle) this.guardMuzzle.visible = false;
      const anim = this.deathAnim;
      if (anim && this.mesh?.isObject3D) {
        anim.elapsed = Math.min(anim.duration, anim.elapsed + step);
        const t = anim.elapsed / anim.duration;
        const eased = 1 - Math.pow(1 - t, 3);
        this.mesh.rotation.x = -Math.PI / 2 * eased;
        this.mesh.rotation.z = anim.side * 0.09 * Math.sin(t * Math.PI);
        this.mesh.position.y = this.pos.y + 0.25 * eased;
      }
      return result;
    }
    if (this.state === 'ALERTED' && this.fireCooldown > previousCooldown + 0.2)
      this.guardShotKick = 1;
    this.guardShotKick = (this.guardShotKick || 0) * Math.exp(-step * 16);
    if (this.weaponArmGroup) this.weaponArmGroup.rotation.x -= this.guardShotKick * 0.24;
    if (this.guardMuzzle) this.guardMuzzle.visible = this.guardShotKick > 0.52;
    this.hitReaction = Math.max(0, (this.hitReaction || 0) - step);
    const impact = Math.sin(Math.PI * this.hitReaction / 0.22) *
      (this.hitSide || 1) * 0.11;
    if (this.torsoGroup) this.torsoGroup.rotation.z = impact;
    if (this.meshySpecialVisual) this.meshySpecialVisual.rotation.z += impact;
    return result;
  };

  const oldCreateWeapon = GAME.createFirstPersonWeaponModel;
  GAME.createFirstPersonWeaponModel = function(...args) {
    const gun = oldCreateWeapon.apply(this, args);
    const material = new THREE.MeshStandardMaterial({
      color: 0x202b37, metalness: 0.72, roughness: 0.32
    });
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.23), material);
    receiver.position.set(0, -0.02, 0.005);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.17, 0.085), material);
    grip.position.set(0.005, -0.155, 0.045);
    grip.rotation.x = -0.22;
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.17, 0.085), material);
    mag.position.set(-0.01, -0.14, -0.045);
    mag.visible = false;
    mag.name = 'reload-magazine';
    gun.add(receiver, grip, mag);
    this.mi6Combat = { shotKick: 0, reload: null, magazine: mag,
      lastOffset: { y: 0, x: 0, z: 0 } };
    return gun;
  };

  const oldStart = GAME.startMission;
  GAME.startMission = function(...args) {
    if (this.mi6Combat) {
      this.mi6Combat.reload = null;
      this.mi6Combat.shotKick = 0;
      this.mi6Combat.magazine.visible = false;
    }
    return oldStart.apply(this, args);
  };

  // A carga só muda no fim da animação; cancelar não consome munição.
  const oldReload = GAME.reloadWeapon;
  GAME.reloadWeapon = function(...args) {
    const visual = this.mi6Combat;
    if (!visual || this.appState !== 'PLAYING' || this.player?.inTank)
      return oldReload.apply(this, args);
    if (visual.reload) return;
    const index = this.player.weaponIdx;
    const weapon = this.player.weapons[index];
    if (!weapon || weapon.clip >= weapon.maxClip || weapon.reserve <= 0)
      return oldReload.apply(this, args);
    visual.reload = { index, elapsed: 0, duration: reloadTime(weapon) };
    this.audio?.playReload?.();
    this.notifyHUD?.('RECARREGANDO ' + weapon.name);
  };

  const oldFire = GAME.fireWeapon;
  GAME.fireWeapon = function(...args) {
    if (this.mi6Combat?.reload && this.appState === 'PLAYING' &&
        !this.player?.inTank) return;
    const w = this.player?.weapons?.[this.player.weaponIdx], prior = w?.clip;
    const result = oldFire.apply(this, args);
    if (this.mi6Combat && w && w.clip < prior &&
        this.appState === 'PLAYING' && !this.player.inTank)
      this.mi6Combat.shotKick = 1;
    return result;
  };

  const oldSwitch = GAME.switchWeapon;
  GAME.switchWeapon = function(...args) {
    const before = this.player?.weaponIdx;
    const result = oldSwitch.apply(this, args);
    if (this.mi6Combat?.reload && this.player.weaponIdx !== before) {
      this.mi6Combat.reload = null;
      this.mi6Combat.magazine.visible = false;
    }
    return result;
  };

  const oldUpdate = GAME.update;
  GAME.update = function(dt, ...args) {
    const visual = this.mi6Combat, gun = this.weaponMeshGroup;
    if (visual && gun && this.appState === 'PLAYING') {
      gun.position.y -= visual.lastOffset.y;
      gun.rotation.x -= visual.lastOffset.x;
      gun.rotation.z -= visual.lastOffset.z;
      visual.lastOffset = { y: 0, x: 0, z: 0 };
    }
    const result = oldUpdate.call(this, dt, ...args);
    if (!visual || !gun || this.appState !== 'PLAYING' || this.player?.inTank)
      return result;
    const step = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    visual.shotKick *= Math.exp(-step * 18);
    let rise = 0;
    if (visual.reload) {
      const anim = visual.reload;
      if (this.player.weaponIdx !== anim.index) visual.reload = null;
      else {
        anim.elapsed = Math.min(anim.duration, anim.elapsed + step);
        const progress = anim.elapsed / anim.duration;
        rise = Math.sin(progress * Math.PI);
        visual.magazine.visible = progress > 0.28 && progress < 0.75;
        visual.magazine.position.y = -0.14 - rise * 0.16;
        if (progress >= 1) {
          const w = this.player.weapons[anim.index];
          const amount = Math.min(w.maxClip - w.clip, w.reserve);
          if (amount > 0) { w.clip += amount; w.reserve -= amount; }
          this.updateHUD?.();
          visual.reload = null;
          visual.magazine.visible = false;
        }
      }
    } else visual.magazine.visible = false;
    const offset = {
      y: -rise * 0.21, x: rise * 0.48 + visual.shotKick * 0.045,
      z: -rise * 0.16
    };
    gun.position.y += offset.y;
    gun.rotation.x += offset.x;
    gun.rotation.z += offset.z;
    visual.lastOffset = offset;
    return result;
  };

  if (typeof window !== 'undefined') window.GoldenEyeCombatAnimations = {
    version: '2.6', reloadTime
  };
})();
