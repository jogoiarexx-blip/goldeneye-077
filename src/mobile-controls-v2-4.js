/**
 * GoldenEye 077 — controles touch v2.4 (todas as missões).
 * O joystick soma movimento analógico ao mesmo sistema de gamepad.
 * Não altera física, controles de teclado, IA ou disparo do jogo.
 */
(() => {
  'use strict';
  if (typeof GoldenEyeDamGame === 'undefined') return;
  const GAME = GoldenEyeDamGame.prototype;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const get = id => document.getElementById(id);
  const isTouchDevice = () => {
    const coarse = typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    const points = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    return !!(coarse || points);
  };
  function normalizeStick(dx, dy, radius) {
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    const right = clamp(dx * scale / radius, -1, 1);
    const forward = clamp(-dy * scale / radius, -1, 1);
    // Pequena zona morta para o joystick não andar sozinho.
    return Math.hypot(right, forward) < 0.10
      ? { forward: 0, right: 0 } : { forward, right };
  }
  function reset(game, retainAim = false) {
    const state = game.mi6Touch;
    if (!state) return;
    state.movePointer = null;
    state.lookPointer = null;
    state.firePointer = null;
    state.forward = state.right = 0;
    state.firing = false;
    if (!retainAim) state.aim = false;
    const knob = get('mobile-stick-knob');
    if (knob) knob.style.transform = 'translate(-50%, -50%)';
    const aim = get('mobile-aim');
    if (aim) aim.setAttribute('aria-pressed', String(state.aim));
    if (game.player) game.player.zoomed = !!(game.gamepadAiming || game.mouseAiming || state.aim);
  }
  function install(game) {
    if (game.mi6Touch) return;
    const touch = isTouchDevice();
    game.mi6Touch = {
      enabled: touch, movePointer: null, lookPointer: null, firePointer: null,
      forward: 0, right: 0, firing: false, aim: false
    };
    if (!touch) return;
    document.documentElement.classList.add('touch-fps-enabled');
    const state = game.mi6Touch;
    const joystick = get('mobile-joystick');
    const knob = get('mobile-stick-knob');
    const lookZone = get('mobile-look-zone');
    const fire = get('mobile-fire');
    if (!joystick || !knob || !lookZone || !fire) return;

    const start = (element, event) => {
      event.preventDefault();
      event.stopPropagation();
      try { element.setPointerCapture(event.pointerId); } catch (_) {}
    };
    const updateStick = event => {
      const rect = joystick.getBoundingClientRect();
      const radius = Math.max(30, Math.min(rect.width, rect.height) * .35);
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const coords = normalizeStick(dx, dy, radius);
      state.forward = coords.forward;
      state.right = coords.right;
      knob.style.transform = 'translate(calc(-50% + ' +
        (coords.right * radius).toFixed(1) + 'px), calc(-50% - ' +
        (coords.forward * radius).toFixed(1) + 'px))';
    };
    joystick.addEventListener('pointerdown', event => {
      if (game.appState !== 'PLAYING' || state.movePointer !== null) return;
      state.movePointer = event.pointerId;
      start(joystick, event);
      updateStick(event);
    });
    joystick.addEventListener('pointermove', event => {
      if (state.movePointer === event.pointerId) updateStick(event);
    });
    const endStick = event => {
      if (state.movePointer !== event.pointerId) return;
      state.movePointer = null;
      state.forward = state.right = 0;
      knob.style.transform = 'translate(-50%, -50%)';
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      joystick.addEventListener(type, endStick);
    }

    let lastX = 0, lastY = 0;
    lookZone.addEventListener('pointerdown', event => {
      if (game.appState !== 'PLAYING' || state.lookPointer !== null) return;
      if (event.pointerType === 'mouse') return;
      state.lookPointer = event.pointerId;
      lastX = event.clientX;lastY = event.clientY;
      start(lookZone, event);
    });
    lookZone.addEventListener('pointermove', event => {
      if (state.lookPointer !== event.pointerId || game.appState !== 'PLAYING') return;
      event.preventDefault();
      const dx = clamp(event.clientX - lastX, -90, 90);
      const dy = clamp(event.clientY - lastY, -90, 90);
      lastX = event.clientX;lastY = event.clientY;
      const sensitivity = (state.aim ? .0024 : .0042) *
        (game.player.mouseSensitivity || 1);
      game.player.yaw -= dx * sensitivity;
      game.player.pitch = clamp(game.player.pitch - dy * sensitivity,
        -Math.PI / 2.3, Math.PI / 2.3);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      lookZone.addEventListener(type, event => {
        if (state.lookPointer === event.pointerId) state.lookPointer = null;
      });
    }

    fire.addEventListener('pointerdown', event => {
      if (game.appState !== 'PLAYING' || state.firePointer !== null) return;
      state.firePointer = event.pointerId;
      state.firing = true;
      start(fire, event);
      game.fireWeapon();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      fire.addEventListener(type, event => {
        if (state.firePointer !== event.pointerId) return;
        state.firePointer = null;
        state.firing = false;
      });
    }

    const actions = [
      ['mobile-aim', () => {
        state.aim = !state.aim;
        get('mobile-aim').setAttribute('aria-pressed', String(state.aim));
        game.player.zoomed = !!(state.aim || game.gamepadAiming || game.mouseAiming);
      }],
      ['mobile-use', () => game.interact()],
      ['mobile-reload', () => game.reloadWeapon()],
      ['mobile-weapon', () => {
        const weapons = game.player.weapons;
        for (let i = 1; i <= weapons.length; i++) {
          const idx = (game.player.weaponIdx + i) % weapons.length;
          if (weapons[idx].unlocked !== false) {
            game.switchWeapon(idx);
            break;
          }
        }
      }],
      ['mobile-mine', () => game.plantRemoteMine()],
      ['mobile-detonate', () => game.detonateRemoteMines()]
    ];
    for (const [id, action] of actions) {
      const button = get(id);
      if (!button) continue;
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (game.appState === 'PLAYING') action();
      });
    }
    const clear = () => reset(game);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clear();
    });
  }

  const previousBind = GAME.bindUIEvents;
  GAME.bindUIEvents = function(...args) {
    const result = previousBind.apply(this, args);
    install(this);
    return result;
  };
  const previousUpdate = GAME.update;
  GAME.update = function(dt) {
    const state = this.mi6Touch;
    if (!state?.enabled || this.appState !== 'PLAYING') {
      return previousUpdate.call(this, dt);
    }
    const movement = this.gamepadMovement;
    const oldForward = movement.forward, oldRight = movement.right;
    movement.forward = clamp(oldForward + state.forward, -1, 1);
    movement.right = clamp(oldRight + state.right, -1, 1);
    this.player.zoomed = !!(state.aim || this.gamepadAiming || this.mouseAiming);
    try {
      // Respeita fireRate, munição e recarga do motor original.
      if (state.firing && this.player.fireTimer <= 0) this.fireWeapon();
      return previousUpdate.call(this, dt);
    } finally {
      movement.forward = oldForward;
      movement.right = oldRight;
    }
  };
  const previousSetScreen = GAME.setScreen;
  GAME.setScreen = function(screen, ...rest) {
    if (screen !== 'screen-hud') reset(this);
    const result = previousSetScreen.call(this, screen, ...rest);
    return result;
  };
  const previousPointerLock = GAME.requestPointerLockSafe;
  GAME.requestPointerLockSafe = function(...args) {
    if (this.mi6Touch?.enabled) {
      const banner = get('pointer-lock-banner');
      if (banner) banner.classList.add('hidden');
      return;
    }
    return previousPointerLock.apply(this, args);
  };
  window.GoldenEyeTouchFPS = {
    version: '2.4', normalizeStick, reset, isTouchDevice
  };
})();
