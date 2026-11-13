/**
 * Surface 1 / Severnaya — primeira versão jogável da quarta missão (v1.4).
 * Fase inédita dentro deste protótipo, inspirada no GDD fornecido.
 * Carregado após os módulos do motor, antes do evento window.load.
 */
(() => {
  'use strict';
  if (typeof THREE === 'undefined' || typeof DamLevelBuilder === 'undefined' ||
      typeof GoldenEyeDamGame === 'undefined' || typeof MISSIONS_DATA === 'undefined') return;

  const MISSION = 'surface1';
  const UNLOCK_KEY = 'ge007_surface1_unlocked';
  let unlockedInSession = false;
  function isUnlocked() {
    if (unlockedInSession) return true;
    try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch (_) { return false; }
  }

  MISSIONS_DATA[MISSION] = {
    id: MISSION,
    subtitle: 'Missão 04 — Severnaya: Campo Nevado',
    title: 'SEVERNAYA — SURFACE 1',
    introTag: 'SURFACE_INTRO // INFILTRAÇÃO NA NEVE',
    introSub: '"Severnaya. Atravesse o campo nevado, neutralize as comunicações e localize a entrada subterrânea."',
    outroTag: 'SURFACE_EXIT // ACESSO SUBTERRÂNEO',
    outroSub: '"Antena desativada. Entrada de ventilação localizada. Descendo para o centro de controle..."',
    briefingM: '"A estação em Severnaya mantém contato com a rede orbital. Atravesse o terreno nevado, silencie as comunicações e encontre a entrada camuflada do bunker."',
    briefingQ: '"Procure a cabana leste para obter a chave, o cofre na estação oeste para recuperar os planos e o painel de rádio para desligar a antena. A entrada final é uma torre de ventilação ao norte."',
    spawn: { x: 0, y: 1.65, z: 46, yaw: 0 },
    difficulties: {
      AGENT: {
        label: 'AGENT', guardHp: 60, guardDamage: 8, guardReaction: 1.1,
        objectives: [
          { id: 'disable_antenna', title: 'Desligar a antena de comunicações', type: 'terminal' },
          { id: 'surface_vent', title: 'Entrar pela torre de ventilação do bunker', type: 'exit' }
        ]
      },
      SECRET_AGENT: {
        label: 'SECRET AGENT', guardHp: 85, guardDamage: 12, guardReaction: 0.74,
        objectives: [
          { id: 'disable_antenna', title: 'Desligar a antena de comunicações', type: 'terminal' },
          { id: 'get_plans', title: 'Recuperar os planos no cofre da estação', type: 'item' },
          { id: 'surface_vent', title: 'Entrar pela torre de ventilação do bunker', type: 'exit' }
        ]
      },
      '00_AGENT': {
        label: '00 AGENT', guardHp: 108, guardDamage: 17, guardReaction: 0.5,
        objectives: [
          { id: 'disable_antenna', title: 'Desligar a antena de comunicações', type: 'terminal' },
          { id: 'get_safe_key', title: 'Encontrar a chave do cofre na cabana leste', type: 'item' },
          { id: 'get_plans', title: 'Recuperar os planos no cofre da estação', type: 'item' },
          { id: 'surface_vent', title: 'Entrar pela torre de ventilação do bunker', type: 'exit' }
        ]
      }
    }
  };

  const WORLD = DamLevelBuilder.prototype;
  const originalBuild = WORLD.build;

  WORLD.buildSurface1Level = function () {
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    this.bounds = { minX: -46, maxX: 46, minZ: -176, maxZ: 57, isDam: false };
    this.surface1 = { antennaOff: false, snow: null };
    const snowTex = ProceduralTextures.createNoiseTexture('#d5e1e7', 20, 8, 18);
    const iceTex = ProceduralTextures.createNoiseTexture('#778c99', 20, 4, 8, true);
    const roofTex = ProceduralTextures.createNoiseTexture('#334155', 20, 3, 3);
    const snow = new THREE.MeshStandardMaterial({ map: snowTex, roughness: 0.97 });
    const path = new THREE.MeshStandardMaterial({ color: 0xa3b3bd, roughness: 0.95 });
    const ice = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.8, metalness: 0.12 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x182536, roughness: 0.66, metalness: 0.4 });
    const roof = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85 });
    const green = new THREE.MeshStandardMaterial({ color: 0x144338, roughness: 0.7 });
    const orange = new THREE.MeshBasicMaterial({ color: 0xffb947 });
    const red = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.42, metalness: 0.68 });

    // Terreno largo: o jogador pode contornar as cabanas pelas duas laterais.
    this.addBox(0, -0.55, -59, 97, 1, 238, snow, false, false);
    this.addBox(0, -0.045, -60, 6.5, 0.08, 220, path, false, false);
    for (let i = 0; i < 42; i++) {
      const x = Math.sin(i * 13.7) * 36;
      const z = 51 - i * 5.1;
      if (Math.abs(x) < 8) continue;
      const drift = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + (i % 5) * 0.42, 0), snow);
      drift.scale.y = 0.35;
      drift.position.set(x, 0.05, z);
      this.levelGroup.add(drift);
    }

    // Picos externos ao limite navegável; mantêm a sensação de campo nevado.
    [[-73,-135,23,38], [75,-158,30,52], [-74,-34,32,46],
      [76,-28,29,47], [8,-238,36,53]].forEach(([x,z,r,h]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), snow);
      cone.position.set(x, h / 2 - 2, z);
      this.levelGroup.add(cone);
    });

    // Cercas visíveis sem travar os caminhos de exploração.
    for (const edge of [-44, 44]) {
      for (let z = 50; z >= -168; z -= 13) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.3, 6), metal);
        post.position.set(edge, 1.15, z);
        this.levelGroup.add(post);
      }
    }

    const cabin = (x, z, w, d, tone) => {
      const y = 2.05;
      // Porta no centro da parede frontal (+Z), abertura de 3.6m.
      this.addBox(x - w/2, y, z, 0.48, 4.1, d, tone, true);
      this.addBox(x + w/2, y, z, 0.48, 4.1, d, tone, true);
      this.addBox(x, y, z - d/2, w, 4.1, 0.48, tone, true);
      const flank = (w - 3.6)/2;
      this.addBox(x - (w + 3.6)/4, y, z + d/2, flank, 4.1, 0.48, tone, true);
      this.addBox(x + (w + 3.6)/4, y, z + d/2, flank, 4.1, 0.48, tone, true);
      this.addBox(x, 4.4, z, w+0.9, 0.38, d+0.9, roof, false);
      // Janela iluminada acima da entrada e luz interna barata.
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.12), orange);
      lamp.position.set(x, 3.3, z + d/2 + 0.07);
      this.levelGroup.add(lamp);
      const point = new THREE.PointLight(0xffcf85, 0.9, 18);
      point.position.set(x, 2.7, z);
      this.levelGroup.add(point);
    };

    // Estações distantes: os percursos leste/oeste são alternativas reais.
    cabin(21, -35, 14, 14, green);      // Chave do cofre
    cabin(-22, -64, 16, 15, ice);       // Painel de rádio
    cabin(-22, -121, 17, 16, green);    // Cofre de inteligência
    cabin(24, -113, 13, 12, ice);       // Cabana opcional / cobertura

    // Mobília com colisões reais, mas com espaço livre de acesso aos terminais.
    this.addBox(25.1, 0.65, -38, 2.6, 1.3, 1.7, dark, true);
    this.addBox(-27, 0.65, -68, 2.3, 1.3, 1.5, dark, true);
    this.addBox(-27.8, 0.75, -125, 2.4, 1.5, 1.8, dark, true);
    const radio = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.95, 0.42), red);
    radio.position.set(-22, 1.42, -65);
    this.levelGroup.add(radio);
    this.interactables.push({
      id: 'disable_antenna', type: 'terminal', position: v(-22, 1.3, -65),
      radius: 3.25, prompt: 'Pressione [E] para cortar as comunicações da antena',
      completed: false, visualMesh: radio
    });

    const key = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 14), orange);
    key.position.set(20.5, 1.2, -35.2);
    key.rotation.y = Math.PI / 2;
    this.levelGroup.add(key);
    this.interactables.push({
      id: 'get_safe_key', type: 'item', position: v(20.5, 1.3, -35.2),
      radius: 3, prompt: 'Pressione [E] para recolher a chave do cofre',
      completed: false, visualMesh: key
    });

    const safe = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1), dark.clone());
    safe.position.set(-22, 1.1, -123);
    this.levelGroup.add(safe);
    const lock = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 8, 14), orange);
    lock.position.set(-22, 1.15, -122.43);
    this.levelGroup.add(lock);
    this.interactables.push({
      id: 'get_plans', type: 'safe', position: v(-22, 1.25, -122.2),
      radius: 3.0, prompt: 'Pressione [E] para abrir o cofre e obter os planos',
      completed: false, requiresKey: true, visualMesh: safe, lockMesh: lock
    });

    // Torre/antena de transmissão visível do campo todo.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.52, 22, 8), metal);
    mast.position.set(-31, 11, -81);
    this.levelGroup.add(mast);
    for (const h of [7, 12, 17]) {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 0.18), dark);
      cross.position.set(-31, h, -81);
      this.levelGroup.add(cross);
    }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.43, 12, 8), red.clone());
    beacon.position.set(-31, 22.2, -81);
    this.levelGroup.add(beacon);
    this.surface1.beacon = beacon;
    const beaconLight = new THREE.PointLight(0xef4444, 1.4, 28);
    beaconLight.position.copy(beacon.position);
    this.levelGroup.add(beaconLight);
    this.surface1.beaconLight = beaconLight;

    // A entrada da torre de ventilação é a única saída válida da missão.
    const vent = new THREE.Group();
    vent.position.set(4, 0, -161);
    const ventBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.1, 0.55, 10), ice);
    ventBase.position.y = 0.23;
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.12, 14), dark);
    hatch.position.y = 0.58;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.14, 9, 20), orange.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.67;
    vent.add(ventBase, hatch, ring);
    for (const ix of [-1.2, -0.6, 0, 0.6, 1.2]) {
      const grate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 2.5), metal);
      grate.position.set(ix, 0.69, 0);
      vent.add(grate);
    }
    this.levelGroup.add(vent);
    this.interactables.push({
      id: 'surface_vent', type: 'exit', position: v(4, 1.15, -161),
      radius: 3.4, prompt: 'Pressione [E] para descer à estação pela torre de ventilação',
      completed: false, visualMesh: hatch
    });
    this.addPickup('ammo', 26, 0.55, -100);
    this.addPickup('armor', -8, 0.8, -146);

    // Patrulhas fixas por setor e sem aparição infinita de guardas.
    const patrol = (a, b) => ({
      pos: v(a[0], 0, a[1]), patrol: [v(a[0],0,a[1]), v(b[0],0,b[1])]
    });
    this.guardSpawns = [
      patrol([-10,30],[8,30]), patrol([18,-12],[8,-20]),
      patrol([35,-55],[27,-49]), patrol([-35,-41],[-35,-58]),
      patrol([-9,-88],[5,-91]), patrol([30,-98],[35,-110]),
      patrol([-37,-112],[-37,-137]), patrol([18,-143],[11,-150])
    ];

    const ambient = new THREE.HemisphereLight(0xdbeafe, 0x334155, 1.08);
    this.levelGroup.add(ambient);
    const sunlight = new THREE.DirectionalLight(0xf0f9ff, 0.9);
    sunlight.position.set(-28, 52, 25);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -95;
    sunlight.shadow.camera.right = 95;
    sunlight.shadow.camera.top = 95;
    sunlight.shadow.camera.bottom = -95;
    this.levelGroup.add(sunlight);

    // Partículas de neve leves: um único Points (sem draw calls por floco).
    const flakes = 260, points = new Float32Array(flakes * 3);
    for (let i = 0; i < flakes; i++) {
      points[i*3] = (Math.random() - .5) * 90;
      points[i*3+1] = 1 + Math.random() * 24;
      points[i*3+2] = -176 + Math.random() * 232;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const snowFX = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xf8fafc, size: 0.23, transparent: true, opacity: 0.72,
      depthWrite: false, sizeAttenuation: true
    }));
    snowFX.raycast = () => {};
    this.levelGroup.add(snowFX);
    this.surface1.snow = snowFX;
  };

  WORLD.build = function (missionId = 'dam') {
    if (missionId !== MISSION) {
      this.surface1 = null; // evita atualizar neve/antena de uma fase já descarregada
      const result = originalBuild.call(this, missionId);
      this.scene.background = new THREE.Color(0x64748b);
      this.scene.fog = new THREE.FogExp2(0x64748b, 0.0085);
      return result;
    }
    this.clear();
    this.buildSurface1Level();
    this.scene.background = new THREE.Color(0x9baeb9);
    this.scene.fog = new THREE.FogExp2(0x9baeb9, 0.0115);
  };

  const originalEnvironment = WORLD.updateEnvironment;
  WORLD.updateEnvironment = function (dt, t) {
    originalEnvironment.call(this, dt, t);
    if (!this.surface1) return;
    const active = this.surface1;
    const pulse = 0.62 + Math.sin(t * 3.4) * 0.35;
    if (active.beacon) active.beacon.material.color.setHex(active.antennaOff ? 0x475569 : 0xef4444);
    if (active.beaconLight) active.beaconLight.intensity = active.antennaOff ? 0 : pulse;
    if (active.snow) {
      const attr = active.snow.geometry.getAttribute('position');
      const positions = attr.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += dt * 0.65;
        positions[i+1] -= dt * (1.5 + (i % 7) * .2);
        if (positions[i] > 44) positions[i] = -44;
        if (positions[i+1] < 0.3) positions[i+1] = 21 + (i % 5);
      }
      attr.needsUpdate = true;
    }
  };

  const GAME = GoldenEyeDamGame.prototype;
  const originalSelect = GAME.selectMission;
  function paintMissionButton() {
    const btn = document.querySelector('[data-mission="surface1"]');
    if (!btn) return;
    const locked = !isUnlocked();
    btn.setAttribute('aria-label', locked ? 'Missão 04 Surface 1 bloqueada, conclua Runway' :
      'Selecionar missão 04 Surface 1');
    btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    btn.style.opacity = locked ? '0.63' : '1';
    const text = btn.querySelector('.surface-status');
    if (text) text.textContent = locked ? 'BLOQUEADA' : 'LIBERADA';
  }
  GAME.selectMission = function (id) {
    if (id === MISSION && !isUnlocked()) {
      document.getElementById('dossier-mission-subtitle').textContent =
        'SURFACE 1 bloqueada — conclua Runway para liberar.';
      paintMissionButton();
      return;
    }
    originalSelect.call(this, id);
    paintMissionButton();
  };

  const originalSuccess = GAME.completeMissionSuccess;
  GAME.completeMissionSuccess = function () {
    const finished = this.currentMissionId;
    originalSuccess.call(this);
    const subtitle = document.getElementById('results-subtitle');
    const btn = document.getElementById('btn-results-next');
    if (finished === 'runway') {
      unlockedInSession = true;
      try { localStorage.setItem(UNLOCK_KEY, '1'); } catch (_) {}
      subtitle.textContent = 'Arco Arkhangelsk concluído! Próxima missão: Surface 1, Severnaya.';
      btn.textContent = 'Próxima Fase: Surface 1';
      btn.dataset.nextMission = MISSION;
      btn.classList.remove('hidden');
      paintMissionButton();
    } else if (finished === MISSION) {
      subtitle.textContent = 'Missão de infiltração na neve concluída. Próximo objetivo da campanha: Bunker 1 (ainda em desenvolvimento).';
      btn.classList.add('hidden');
    }
  };

  const originalInteract = GAME.interact;
  GAME.interact = function () {
    if (this.appState === 'PLAYING' && this.currentMissionId === MISSION) {
      const key = this.levelBuilder.interactables.find(x => x.id === 'get_safe_key');
      const safe = this.levelBuilder.interactables.find(x => x.id === 'get_plans');
      if (safe && !safe.completed && this.player.pos.distanceTo(safe.position) <= safe.radius &&
          !key?.completed) {
        this.audio.playGadgetBeep(false);
        this.notifyHUD('COFRE TRANCADO: PROCURE A CHAVE NA CABANA LESTE');
        return;
      }
      const antenna = this.levelBuilder.interactables.find(x => x.id === 'disable_antenna');
      const alreadyOff = !!antenna?.completed;
      const result = originalInteract.call(this);
      if (!alreadyOff && antenna?.completed && this.levelBuilder.surface1) {
        this.levelBuilder.surface1.antennaOff = true;
        this.notifyHUD('COMUNICAÇÕES CORTADAS — ANTENA FORA DO AR');
      }
      if (key?.completed && key.visualMesh) key.visualMesh.visible = false;
      if (safe?.completed && safe.lockMesh) safe.lockMesh.material.color.setHex(0x22c55e);
      return result;
    }
    return originalInteract.call(this);
  };

  const originalUpdate = GAME.update;
  GAME.update = function (dt) {
    originalUpdate.call(this, dt);
    if (this.currentMissionId !== MISSION) return;
    if (this.appState === 'MENU') {
      const t = performance.now() * 0.00019;
      this.camera.position.set(15 + Math.sin(t) * 10, 12, -49);
      this.camera.lookAt(-28, 10, -81);
    } else if (this.appState === 'CUTSCENE_INTRO') {
      const p = Math.min(1, this.cutsceneTimer / 4.2);
      this.camera.position.set(-22 + p * 22, 9 - 7.35 * p, 60 - 14 * p);
      this.camera.lookAt(0, 1.5, 4 - p * 20);
    } else if (this.appState === 'CUTSCENE_OUTRO') {
      const p = Math.min(1, this.cutsceneTimer / 4);
      this.camera.position.set(10 - p * 6, 3.8 - p * 4.1, -153 - p * 8);
      this.camera.lookAt(4, -5 - p * 11, -161);
    }
  };

  // Menu e resultado partilham os eventos do motor; pinta estado inicial após carregar.
  window.addEventListener('load', () => setTimeout(paintMissionButton, 0));
})();
