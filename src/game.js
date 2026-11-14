    class GoldenEyeDamGame {
      constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x64748b);
        this.scene.fog = new THREE.FogExp2(0x64748b, 0.0085);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 260);
        this.scene.add(this.camera);

        this.audio = new ProceduralAudio();
        this.levelBuilder = new DamLevelBuilder(this.scene);

        // Estado global da aplicação
        this.appState = 'MENU'; // MENU | CUTSCENE_INTRO | PLAYING | PAUSED | CUTSCENE_OUTRO | RESULTS
        this.currentMissionId = 'dam';
        this.difficulty = '00_AGENT';
        this.objectives = [];
        this.guards = [];
        this.sparks = [];

        // Estado do jogador
        this.player = {
          pos: new THREE.Vector3(0, 1.65, 40),
          yaw: 0,
          pitch: 0,
          hp: 100,
          armor: 50,
          inTank: false,
          crouched: false,
          zoomed: false,
          weaponIdx: 0,
          mouseSensitivity: 1.0,
          baseFov: 75,
          remoteMines: 5,
          placedMines: [],
          weapons: [
            { id: 'pp7', name: 'PP7 SILENCIADA', clip: 7, maxClip: 7, reserve: 49, damage: 36, noiseRadius: 5.5, silenced: true, fireRate: 0.24, zoomFactor: 0.58 },
            { id: 'kf7', name: 'KF7 SOVIET', clip: 30, maxClip: 30, reserve: 120, damage: 26, noiseRadius: 38.0, silenced: false, fireRate: 0.11, zoomFactor: 0.52 },
            { id: 'sniper', name: 'SNIPER RIFLE', clip: 8, maxClip: 8, reserve: 24, damage: 95, noiseRadius: 16.0, silenced: true, fireRate: 0.65, zoomFactor: 0.24, unlocked: false }
          ],
          fireTimer: 0
        };

        // Estatísticas da tentativa
        this.stats = {
          timeElapsed: 0,
          shotsFired: 0,
          shotsHit: 0,
          kills: 0,
          alarmsTriggered: 0
        };

        // Controle de Cutscenes e Skip
        this.cutsceneTimer = 0;
        this.skipHoldTime = 0;
        this.isHoldingSkip = false;

        // Input
        this.keys = {};
        this.gamepadPrevious = {};
        this.gamepadMovement = { forward: 0, right: 0 };
        this.gamepadAiming = false;
        this.mouseAiming = false;
        this.simulationTime = 0;
        this.weaponMeshGroup = this.createFirstPersonWeaponModel();
        this.camera.add(this.weaponMeshGroup);

        this.levelBuilder.build();
        this.bindUIEvents();
        this.bindInputEvents();
        this.refreshDossierUI();
        this.loadBestTime();

        this.lastFrameTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
      }

      createFirstPersonWeaponModel() {
        const group = new THREE.Group();
        const barrel = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.06, 0.34),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
        );
        const silencer = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, 0.22, 12),
          new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.7, roughness: 0.3 })
        );
        silencer.rotation.x = Math.PI / 2;
        silencer.position.set(0, 0.01, -0.26);
        this.fpSilencerMesh = silencer;

        group.add(barrel, silencer);
        group.position.set(0.24, -0.22, -0.42);
        return group;
      }

      loadBestTime() {
        try {
          const saved = localStorage.getItem(`ge007_${this.currentMissionId}_best_${this.difficulty}`);
          const seconds = saved && saved.includes(':') ? (Number(saved.split(':')[0]) * 60 + Number(saved.split(':')[1])) : Number(saved);
          document.getElementById('record-badge').textContent = saved && Number.isFinite(seconds)
            ? `MELHOR TEMPO: ${this.formatTime(seconds)}`
            : 'MELHOR TEMPO: --:--';
        } catch (e) {}
      }

      formatTime(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
      }

      setScreen(screenName) {
        ['screen-dossier', 'screen-cutscene', 'screen-hud', 'screen-qwatch', 'screen-results'].forEach(id => {
          const el = document.getElementById(id);
          el.classList.add('hidden');
          el.classList.remove('flex');
        });
        if (screenName) {
          const target = document.getElementById(screenName);
          target.classList.remove('hidden');
          if (screenName !== 'screen-hud') target.classList.add('flex');
        }
      }

      refreshDossierUI() {
        const mission = MISSIONS_DATA[this.currentMissionId];
        const cfg = mission.difficulties[this.difficulty];
        document.getElementById('dossier-mission-subtitle').textContent = mission.subtitle;
        document.getElementById('briefing-m-text').textContent = mission.briefingM;
        document.getElementById('briefing-q-text').textContent = mission.briefingQ;
        document.getElementById('selected-diff-label').textContent = cfg.label;
        const listEl = document.getElementById('dossier-objectives-list');
        listEl.innerHTML = cfg.objectives.map((obj, i) => `
          <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm">
            <span class="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-400 font-mono-tech font-bold flex items-center justify-center text-xs">0${i + 1}</span>
            <span class="text-slate-200 font-medium">${obj.title}</span>
          </div>
        `).join('');
        this.loadBestTime();
      }

      selectMission(missionId) {
        if (!MISSIONS_DATA[missionId]) return;
        this.currentMissionId = missionId;
        document.querySelectorAll('.mission-btn').forEach(b => {
          const active = b.dataset.mission === missionId;
          b.className = active
            ? 'mission-btn px-3 py-2.5 rounded-xl border text-left transition-all bg-sky-500/20 border-sky-400/60 cursor-pointer'
            : 'mission-btn px-3 py-2.5 rounded-xl border text-left transition-all bg-white/[0.03] border-white/10 hover:bg-white/[0.07] cursor-pointer';
          const tag = b.querySelector('div:first-child');
          if (tag) tag.className = active ? 'text-[10px] font-mono-tech text-sky-300' : 'text-[10px] font-mono-tech text-slate-400';
        });
        this.levelBuilder.build(this.currentMissionId);
        this.refreshDossierUI();
      }

      startMission() {
        this.audio.init();
        this.audio.startMusic();
        this.audio.combatIntensity = false;

        // Reconstrói fase limpa e instancia guardas conforme missão e dificuldade
        const mission = MISSIONS_DATA[this.currentMissionId];
        this.levelBuilder.build(this.currentMissionId);
        const cfg = mission.difficulties[this.difficulty];
        this.objectives = cfg.objectives.map(o => ({
          ...o,
          completed: o.type === 'civilians' // Preservar cientistas começa válido até algum ser atingido
        }));

        this.guards.forEach(g => this.scene.remove(g.mesh));
        this.guards = this.levelBuilder.guardSpawns.map(sp => new GuardAgent(this.scene, sp, cfg, this.audio));

        // Reset do jogador e estatísticas
        this.player.pos.set(mission.spawn.x, mission.spawn.y, mission.spawn.z);
        this.player.yaw = mission.spawn.yaw;
        this.player.pitch = 0;
        this.player.hp = 100;
        this.player.armor = this.difficulty === '00_AGENT' ? 25 : 60;
        this.player.inTank = false;
        this.player.crouched = false;
        this.player.zoomed = false;
        this.mouseAiming = false;
        this.gamepadAiming = false;
        this.player.fireTimer = 0;
        this.keys = {};
        this.player.weaponIdx = 0;
        this.player.weapons[0].clip = 7;
        this.player.weapons[0].reserve = 49;
        this.player.weapons[1].clip = 30;
        this.player.weapons[1].reserve = 120;
        this.player.weapons[2].clip = 8;
        this.player.weapons[2].reserve = 24;
        this.player.weapons[2].unlocked = false;
        this.fpSilencerMesh.visible = true;
        this.player.remoteMines = 5;
        this.player.placedMines.forEach(m => this.scene.remove(m.mesh));
        this.player.placedMines = [];

        this.stats = { timeElapsed: 0, shotsFired: 0, shotsHit: 0, kills: 0, alarmsTriggered: 0 };
        this.simulationTime = 0;
        clearTimeout(this.notifyTimeout);
        clearTimeout(this.vigTimeout);
        document.getElementById('hud-notification').classList.add('hidden');
        document.getElementById('damage-vignette').style.opacity = '0';
        this.weaponMeshGroup.visible = false;

        // Inicia Cutscene de Introdução da Missão
        this.appState = 'CUTSCENE_INTRO';
        this.cutsceneTimer = 0;
        this.skipHoldTime = 0;
        document.getElementById('cutscene-tag').textContent = mission.introTag;
        document.getElementById('cutscene-subtitle').textContent = mission.introSub;
        this.setScreen('screen-cutscene');
      }

      finishIntroCutscene() {
        const mission = MISSIONS_DATA[this.currentMissionId];
        this.appState = 'PLAYING';
        this.weaponMeshGroup.visible = true;
        this.player.pos.set(mission.spawn.x, mission.spawn.y, mission.spawn.z);
        this.player.yaw = mission.spawn.yaw;
        this.player.pitch = 0;
        this.setScreen('screen-hud');
        this.updateHUD();
        this.requestPointerLockSafe(true);
      }

      requestPointerLockSafe(showBannerOnFail = false) {
        try {
          if (document.pointerLockElement === this.canvas) return;
          const promise = this.canvas.requestPointerLock();
          if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {
              if (showBannerOnFail && this.appState === 'PLAYING') {
                document.getElementById('pointer-lock-banner').classList.remove('hidden');
              }
            });
          }
        } catch (e) {
          if (showBannerOnFail && this.appState === 'PLAYING') {
            document.getElementById('pointer-lock-banner').classList.remove('hidden');
          }
        }
      }

      startOutroCutscene() {
        const mission = MISSIONS_DATA[this.currentMissionId];
        this.appState = 'CUTSCENE_OUTRO';
        this.cutsceneTimer = 0;
        this.skipHoldTime = 0;
        this.weaponMeshGroup.visible = false;
        if (document.pointerLockElement) document.exitPointerLock();

        document.getElementById('cutscene-tag').textContent = mission.outroTag;
        document.getElementById('cutscene-subtitle').textContent = mission.outroSub;
        this.setScreen('screen-cutscene');
      }

      completeMissionSuccess() {
        const mission = MISSIONS_DATA[this.currentMissionId];
        this.appState = 'RESULTS';
        this.audio.stopMusic();
        if (document.pointerLockElement) document.exitPointerLock();

        const formattedTime = this.formatTime(this.stats.timeElapsed);
        try {
          const recordKey = `ge007_${this.currentMissionId}_best_${this.difficulty}`;
          const oldRecord = localStorage.getItem(recordKey);
          const oldTime = oldRecord && oldRecord.includes(':')
            ? Number(oldRecord.split(':')[0]) * 60 + Number(oldRecord.split(':')[1])
            : Number(oldRecord);
          if (!oldRecord || !Number.isFinite(oldTime) || this.stats.timeElapsed < oldTime) {
            localStorage.setItem(recordKey, this.stats.timeElapsed.toFixed(2));
          }
        } catch (e) {}

        const acc = this.stats.shotsFired > 0
          ? Math.min(100, Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100))
          : 100;

        document.getElementById('results-status-badge').className = 'inline-block px-3 py-1 rounded-full text-xs font-mono-tech font-bold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-2';
        document.getElementById('results-status-badge').textContent = 'MISSÃO CONCLUÍDA';
        document.getElementById('results-title').textContent = mission.title;

        const nextMissionMap = { dam: 'facility', facility: 'runway' };
        const nextMissionId = nextMissionMap[this.currentMissionId];
        const nextBtn = document.getElementById('btn-results-next');

        if (nextMissionId) {
          const nextName = nextMissionId === 'facility' ? 'Facility' : 'Runway';
          document.getElementById('results-subtitle').textContent = `Dificuldade ${mission.difficulties[this.difficulty].label} concluída. Próxima fase liberada: ${nextName}.`;
          nextBtn.textContent = `Próxima Fase: ${nextName}`;
          nextBtn.dataset.nextMission = nextMissionId;
          nextBtn.classList.remove('hidden');
        } else {
          document.getElementById('results-subtitle').textContent = `Arco I (Arkhangelsk) concluído com sucesso na dificuldade ${mission.difficulties[this.difficulty].label}!`;
          nextBtn.classList.add('hidden');
        }

        document.getElementById('stat-time').textContent = formattedTime;
        document.getElementById('stat-accuracy').textContent = `${acc}%`;
        document.getElementById('stat-kills').textContent = `${this.stats.kills}`;
        document.getElementById('stat-alarms').textContent = `${this.stats.alarmsTriggered}`;

        this.setScreen('screen-results');
      }

      failMission(reason) {
        this.appState = 'RESULTS';
        this.audio.stopMusic();
        this.weaponMeshGroup.visible = false;
        if (document.pointerLockElement) document.exitPointerLock();

        document.getElementById('btn-results-next').classList.add('hidden');
        document.getElementById('results-status-badge').className = 'inline-block px-3 py-1 rounded-full text-xs font-mono-tech font-bold tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-2';
        document.getElementById('results-status-badge').textContent = 'AGENTE NEUTRALIZADO';
        document.getElementById('results-title').textContent = 'MISSÃO FRACASSADA';
        document.getElementById('results-subtitle').textContent = reason;

        document.getElementById('stat-time').textContent = this.formatTime(this.stats.timeElapsed);
        document.getElementById('stat-accuracy').textContent = '--%';
        document.getElementById('stat-kills').textContent = `${this.stats.kills}`;
        document.getElementById('stat-alarms').textContent = `${this.stats.alarmsTriggered}`;

        this.setScreen('screen-results');
      }

      togglePauseQWatch() {
        const mission = MISSIONS_DATA[this.currentMissionId];
        if (this.appState === 'PLAYING') {
          this.appState = 'PAUSED';
          if (document.pointerLockElement) document.exitPointerLock();

          document.getElementById('qwatch-timer').textContent = this.formatTime(this.stats.timeElapsed);
          document.getElementById('qwatch-diff').textContent = mission.difficulties[this.difficulty].label;
          const activeGuards = this.guards.filter(g => g.state !== 'DEAD').length;
          document.getElementById('qwatch-guards-left').textContent = `GUARNICÃO: ${activeGuards} ATIVOS`;
          document.getElementById('qwatch-objectives').innerHTML = this.objectives.map(obj => `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border ${obj.completed ? 'border-emerald-500/40' : 'border-slate-800'} text-xs">
              <span class="${obj.completed ? 'text-emerald-300 line-through' : 'text-slate-200'}">${obj.title}</span>
              <span class="font-mono-tech font-bold ${obj.completed ? 'text-emerald-400' : 'text-amber-400'}">
                ${obj.completed ? 'CONCLUÍDO' : 'PENDENTE'}
              </span>
            </div>
          `).join('');

          this.audio.stopMusic();
          this.keys = {};
          this.player.zoomed = false;
          this.setScreen('screen-qwatch');
        } else if (this.appState === 'PAUSED') {
          this.appState = 'PLAYING';
          this.setScreen('screen-hud');
          if (this.audio.enabled) this.audio.startMusic();
          this.requestPointerLockSafe(true);
        }
      }

      notifyHUD(text) {
        const el = document.getElementById('hud-notification');
        el.textContent = text;
        el.classList.remove('hidden');
        clearTimeout(this.notifyTimeout);
        this.notifyTimeout = setTimeout(() => el.classList.add('hidden'), 3200);
      }

      updateHUD() {
        const w = this.player.weapons[this.player.weaponIdx];
        document.getElementById('hud-health-val').textContent = `${Math.max(0, Math.ceil(this.player.hp))}%`;
        document.getElementById('hud-health-bar').style.width = `${Math.max(0, this.player.hp)}%`;

        document.getElementById('hud-armor-val').textContent = `${Math.max(0, Math.ceil(this.player.armor))}%`;
        document.getElementById('hud-armor-bar').style.width = `${Math.max(0, this.player.armor)}%`;

        if (this.player.inTank) {
          document.getElementById('hud-weapon-name').textContent = 'CANHÃO T-55 100MM (BLINDADO)';
          document.getElementById('hud-ammo-clip').textContent = '∞';
          document.getElementById('hud-ammo-reserve').textContent = 'HE';
        } else {
          document.getElementById('hud-weapon-name').textContent = w.name;
          document.getElementById('hud-ammo-clip').textContent = w.clip.toString().padStart(2, '0');
          document.getElementById('hud-ammo-reserve').textContent = w.reserve.toString().padStart(2, '0');
        }
        const gadgetInfo = document.getElementById('hud-gadget-info');
        if (gadgetInfo) {
          gadgetInfo.textContent = this.player.inTank
            ? 'MODO TANQUE ATIVO • [E] SAIR DO VEÍCULO'
            : `MINAS REMOTAS [G]/[F]: ${this.player.remoteMines} (${this.player.placedMines.length} ATIVAS)`;
        }

        const posture = document.getElementById('hud-posture');
        if (posture) posture.textContent = this.player.inTank ? 'TANQUE' : (this.player.crouched ? 'AGACHADO' : 'EM PÉ');
        const crouchBtn = document.getElementById('btn-mobile-crouch');
        if (crouchBtn) {
          crouchBtn.textContent = this.player.crouched ? 'LEVANTAR' : 'AGACHAR';
          crouchBtn.setAttribute('aria-pressed', this.player.crouched ? 'true' : 'false');
        }
        const done = this.objectives.filter(o => o.completed).length;
        document.getElementById('hud-obj-count').textContent = `${done}/${this.objectives.length}`;
      }

      plantRemoteMine() {
        if (this.appState !== 'PLAYING' || this.player.inTank) return;
        if (this.player.remoteMines <= 0) {
          this.audio.playGadgetBeep(false);
          this.notifyHUD('SEM MINAS REMOTAS RESTANTES — PRESSIONE [F] PARA DETONAR');
          return;
        }
        this.player.remoteMines--;
        const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
        const minePos = this.player.pos.clone().addScaledVector(forward, 1.25);
        minePos.y = 0.12;

        const mineGroup = new THREE.Group();
        mineGroup.position.copy(minePos);
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.26, 0.1, 14),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
        );
        const led = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        led.position.y = 0.06;
        mineGroup.add(disc, led);
        this.scene.add(mineGroup);

        this.player.placedMines.push({ position: minePos, mesh: mineGroup });
        this.audio.playGadgetBeep(true);
        this.notifyHUD('MINA REMOTA PLANTADA! PRESSIONE [F] PARA DETONAR À DISTÂNCIA');
        this.updateHUD();
      }

      detonateRemoteMines() {
        if (this.appState !== 'PLAYING' || this.player.placedMines.length === 0) return;
        this.audio.playShot(false);
        this.notifyHUD(`DETONANDO ${this.player.placedMines.length} MINA(S) REMOTA(S)!`);

        while (this.player.placedMines.length > 0) {
          const mine = this.player.placedMines.pop();
          this.scene.remove(mine.mesh);
          this.spawnSpark(mine.position, 0xf97316);

          // Propaga ruído e dano em área aos tanques químicos, barris, guardas e armas pesadas
          this.guards.forEach(g => {
            g.hearNoise(mine.position, 36);
            if (g.state !== 'DEAD' && g.pos.distanceTo(mine.position) < 7.0) {
              if (g.takeDamage(140, this.player.pos)) this.stats.kills++;
            }
          });
          this.levelBuilder.tanks.forEach(t => {
            if (!t.destroyed && t.position.distanceTo(mine.position) < 7.2) {
              this.damageChemicalTank(t, 120, t.position);
            }
          });
          this.levelBuilder.barrels.forEach(b => {
            if (!b.exploded && b.position.distanceTo(mine.position) < 6.5) {
              this.detonateBarrel(b);
            }
          });
          this.levelBuilder.emplacements.forEach(emp => {
            if (!emp.destroyed && emp.position.distanceTo(mine.position) < 7.5) {
              this.damageEmplacement(emp, 120, emp.position);
            }
          });
        }
        this.updateHUD();
      }

      fireWeapon() {
        if (this.appState !== 'PLAYING' || this.player.fireTimer > 0) return;

        // Disparo do Canhão de 100mm quando pilotando o Tanque T-55 na Runway
        if (this.player.inTank) {
          this.player.fireTimer = 0.85;
          this.stats.shotsFired++;
          this.audio.playShot(false);

          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
          const allTargets = [
            ...this.levelBuilder.emplacements.filter(e => !e.destroyed).map(e => e.mesh),
            ...this.levelBuilder.barrels.filter(b => !b.exploded).map(b => b.mesh),
            ...this.guards.filter(g => g.state !== 'DEAD').map(g => g.mesh),
            this.levelBuilder.levelGroup
          ];
          const hits = raycaster.intersectObjects(allTargets, true);
          if (hits.length > 0 && hits[0].distance < 95) {
            const impactPos = hits[0].point;
            this.spawnSpark(impactPos, 0xf97316);

            // Dano explosivo de canhão em área (destrói baterias de mísseis, metralhadoras e guardas)
            this.levelBuilder.emplacements.forEach(emp => {
              if (!emp.destroyed && emp.position.distanceTo(impactPos) < 6.5) {
                this.stats.shotsHit = Math.min(this.stats.shotsFired, this.stats.shotsHit + 1);
                this.damageEmplacement(emp, 140, impactPos);
              }
            });
            this.levelBuilder.barrels.forEach(b => {
              if (!b.exploded && b.position.distanceTo(impactPos) < 6.5) {
                this.detonateBarrel(b);
              }
            });
            this.guards.forEach(g => {
              if (g.state !== 'DEAD' && g.pos.distanceTo(impactPos) < 6.5) {
                this.stats.shotsHit = Math.min(this.stats.shotsFired, this.stats.shotsHit + 1);
                if (g.takeDamage(160, this.player.pos)) this.stats.kills++;
              }
            });
          }
          this.updateHUD();
          return;
        }

        const w = this.player.weapons[this.player.weaponIdx];
        if (w.clip <= 0) {
          this.reloadWeapon();
          return;
        }

        w.clip--;
        this.player.fireTimer = w.fireRate;
        this.stats.shotsFired++;
        this.audio.playShot(w.silenced);

        // Animação de recuo na arma em 1ª pessoa
        this.weaponMeshGroup.position.z = -0.35;
        this.weaponMeshGroup.rotation.x = 0.09;

        // Propaga som para guardas no raio auditivo
        this.guards.forEach(g => g.hearNoise(this.player.pos, w.noiseRadius));

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // 1. Verifica acerto em cadeados de portão, vidros quebráveis, caixas de alarme, barris, tanques e câmeras
        for (const lock of this.levelBuilder.padlocks) {
          if (lock.destroyed) continue;
          const hits = raycaster.intersectObject(lock.mesh, true);
          const gate = this.levelBuilder.gates.find(g => g.id === lock.gateId);
          if (hits.length > 0 && hits[0].distance < 55 &&
              hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders, gate && gate.collider)) {
            this.stats.shotsHit++;
            lock.destroyed = true;
            lock.mesh.visible = false;
            this.spawnSpark(hits[0].point, 0xfacc15);
            this.audio.playGadgetBeep(true);
            if (gate && !gate.isOpen) {
              gate.isOpen = true;
              this.notifyHUD('CADEADO DESTRUÍDO — PORTÃO LIBERADO!');
            }
            this.updateHUD();
            return;
          }
        }

        for (const pane of this.levelBuilder.glassPanes) {
          if (pane.broken) continue;
          const hits = raycaster.intersectObject(pane.mesh, true);
          if (hits.length > 0 && hits[0].distance < 55 &&
              hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders)) {
            pane.broken = true;
            pane.mesh.visible = false;
            this.spawnSpark(hits[0].point, 0xbae6fd);
          }
        }

        for (const barrel of this.levelBuilder.barrels) {
          if (barrel.exploded) continue;
          const hits = raycaster.intersectObject(barrel.mesh, true);
          if (hits.length > 0 && hits[0].distance < 48 &&
              hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders)) {
            this.stats.shotsHit++;
            this.detonateBarrel(barrel);
            this.updateHUD();
            return;
          }
        }

        for (const emp of this.levelBuilder.emplacements) {
          if (emp.destroyed) continue;
          const hits = raycaster.intersectObject(emp.mesh, true);
          if (hits.length > 0 && hits[0].distance < 55 &&
              hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders)) {
            this.stats.shotsHit++;
            this.damageEmplacement(emp, w.damage, hits[0].point);
            this.updateHUD();
            return;
          }
        }

        for (const tank of this.levelBuilder.tanks) {
          if (tank.destroyed) continue;
          const hits = raycaster.intersectObject(tank.mesh, true);
          if (hits.length > 0 && hits[0].distance < 45 &&
              hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders)) {
            this.stats.shotsHit++;
            this.damageChemicalTank(tank, w.damage, hits[0].point);
            this.updateHUD();
            return;
          }
        }

        for (const npc of this.levelBuilder.npcs) {
          if (npc.dead) continue;
          const hits = raycaster.intersectObject(npc.mesh, true);
          if (hits.length > 0 && hits[0].distance < 45 && npc.role === 'scientist' &&
              hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders)) {
            npc.dead = true;
            npc.mesh.rotation.x = -Math.PI / 2;
            npc.mesh.position.y = 0.25;
            this.spawnSpark(hits[0].point, 0xef4444);
            const civObj = this.objectives.find(o => o.type === 'civilians');
            if (civObj) {
              this.failMission('Um cientista civil foi atingido! Diretiva 00 Agent violada.');
              return;
            } else {
              this.notifyHUD('AVISO: CIENTISTA CIVIL ATINGIDO');
            }
            return;
          }
        }

        for (const alarm of this.levelBuilder.alarms) {
          if (alarm.destroyed) continue;
          const hits = raycaster.intersectObject(alarm.mesh, true);
          if (hits.length > 0 && hits[0].distance < 45 &&
              hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders)) {
            this.stats.shotsHit++;
            this.destroyAlarm(alarm);
            this.spawnSpark(hits[0].point, 0xffaa00);
            this.updateHUD();
            return;
          }
        }

        for (const cam of this.levelBuilder.cameras) {
          if (cam.destroyed) continue;
          const hits = raycaster.intersectObject(cam.mesh, true);
          if (hits.length > 0 && hits[0].distance < 45 &&
              hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders)) {
            this.stats.shotsHit++;
            cam.destroyed = true;
            cam.lens.material.color.setHex(0x1f2937);
            cam.head.rotation.x = 0.65;
            this.audio.playGadgetBeep(true);
            this.spawnSpark(hits[0].point, 0x38bdf8);
            this.notifyHUD('CÂMERA DE VIGILÂNCIA DESTRUÍDA');
            return;
          }
        }

        // 2. Verifica acerto nos guardas
        let closestGuard = null;
        let closestDist = 65;
        let hitPoint = null;

        for (const guard of this.guards) {
          if (guard.state === 'DEAD') continue;
          const hits = raycaster.intersectObject(guard.mesh, true);
          if (hits.length > 0 && hits[0].distance < closestDist) {
            if (hasLineOfSight(this.camera.position, hits[0].point, this.levelBuilder.colliders)) {
              closestDist = hits[0].distance;
              closestGuard = guard;
              hitPoint = hits[0].point;
            }
          }
        }

        if (closestGuard && hitPoint) {
          this.stats.shotsHit++;
          const isHeadshot = hitPoint.y > 1.52;
          const dmg = isHeadshot ? w.damage * 2.2 : w.damage;
          const killed = closestGuard.takeDamage(dmg, this.player.pos);
          this.spawnSpark(hitPoint, isHeadshot ? 0xef4444 : 0xfacc15);
          if (killed) {
            this.stats.kills++;
            this.notifyHUD(isHeadshot ? 'ABATE PRECISO (HEADSHOT)' : 'GUARDA NEUTRALIZADO');
          }
        }

        this.updateHUD();
      }

      detonateBarrel(barrel) {
        if (barrel.exploded) return;
        barrel.exploded = true;
        barrel.mesh.visible = false;
        this.audio.playShot(false);
        this.spawnSpark(barrel.position, 0xf97316);
        this.notifyHUD('DETONAÇÃO DE BARRIL EXPLOSIVO!');

        // Dano em área nos guardas e tanques próximos
        this.guards.forEach(g => {
          if (g.state !== 'DEAD' && g.pos.distanceTo(barrel.position) < 6.5) {
            if (g.takeDamage(120, this.player.pos)) this.stats.kills++;
          }
        });
        this.levelBuilder.tanks.forEach(t => {
          if (!t.destroyed && t.position.distanceTo(barrel.position) < 6.5) {
            this.damageChemicalTank(t, 80, t.position);
          }
        });
        this.levelBuilder.emplacements.forEach(emp => {
          if (!emp.destroyed && emp.position.distanceTo(barrel.position) < 7.5) {
            this.damageEmplacement(emp, 90, emp.position);
          }
        });
      }

      damageEmplacement(emp, dmg, hitPoint) {
        emp.hp -= dmg;
        this.spawnSpark(hitPoint, 0xf97316);
        if (emp.hp <= 0 && !emp.destroyed) {
          emp.destroyed = true;
          emp.turret.material.color.setHex(0x1f2937);
          emp.mesh.rotation.z = 0.25;
          emp.mesh.scale.set(1, 0.55, 1);
          this.audio.playShot(false);

          const destroyedCount = this.levelBuilder.emplacements.filter(e => e.destroyed).length;
          const totalEmps = this.levelBuilder.emplacements.length;
          const empObj = this.objectives.find(o => o.id === 'destroy_emplacements');
          if (empObj) {
            empObj.title = `Destruir todas as armas pesadas e bateria de mísseis (${destroyedCount}/${totalEmps})`;
            if (destroyedCount >= totalEmps) {
              empObj.completed = true;
              this.notifyHUD('OBJETIVO CONCLUÍDO: DEFESAS ANTIAÉREAS DESTRUÍDAS');
            } else {
              this.notifyHUD(`ARMAMENTO PESADO DESTRUÍDO (${destroyedCount}/${totalEmps})`);
            }
          } else {
            this.notifyHUD(`ARMAMENTO PESADO DESTRUÍDO (${destroyedCount}/${totalEmps})`);
          }
        }
      }

      damageChemicalTank(tank, dmg, hitPoint) {
        tank.hp -= dmg;
        this.spawnSpark(hitPoint, 0x34d399);
        if (tank.hp <= 0 && !tank.destroyed) {
          tank.destroyed = true;
          tank.glass.material.color.setHex(0x1f2937);
          tank.glass.material.emissive.setHex(0x000000);
          tank.mesh.scale.set(1, 0.45, 1);
          this.audio.playShot(false);

          const destroyedCount = this.levelBuilder.tanks.filter(t => t.destroyed).length;
          const totalTanks = this.levelBuilder.tanks.length;
          const tankObj = this.objectives.find(o => o.id === 'destroy_tanks');
          if (tankObj) {
            tankObj.title = `Destruir todos os tanques químicos da instalação (${destroyedCount}/${totalTanks})`;
            if (destroyedCount >= totalTanks) {
              tankObj.completed = true;
              this.notifyHUD('OBJETIVO CONCLUÍDO: TODOS OS TANQUES DESTRUÍDOS');
            } else {
              this.notifyHUD(`TANQUE QUÍMICO DESTRUÍDO (${destroyedCount}/${totalTanks})`);
            }
          }
        }
      }

      destroyAlarm(alarm) {
        alarm.destroyed = true;
        alarm.light.material.color.setHex(0x1f2937);
        alarm.mesh.rotation.z = 0.35;
        this.audio.playGadgetBeep(true);

        const destroyedCount = this.levelBuilder.alarms.filter(a => a.destroyed).length;
        const totalAlarms = this.levelBuilder.alarms.length;

        const alarmObj = this.objectives.find(o => o.id === 'disable_alarms');
        if (alarmObj) {
          alarmObj.title = `Neutralizar todas as caixas de alarme da represa (${destroyedCount}/${totalAlarms})`;
          if (destroyedCount >= totalAlarms && !alarmObj.completed) {
            alarmObj.completed = true;
            this.notifyHUD('OBJETIVO CONCLUÍDO: REDE DE ALARMES NEUTRALIZADA');
          } else {
            this.notifyHUD(`CAIXA DE ALARME DESTRUÍDA (${destroyedCount}/${totalAlarms})`);
          }
        } else {
          this.notifyHUD(`CAIXA DE ALARME DESTRUÍDA (${destroyedCount}/${totalAlarms})`);
        }
      }

      reloadWeapon() {
        const w = this.player.weapons[this.player.weaponIdx];
        if (w.clip === w.maxClip || w.reserve <= 0) return;
        const needed = w.maxClip - w.clip;
        const load = Math.min(needed, w.reserve);
        w.clip += load;
        w.reserve -= load;
        this.audio.playReload();
        this.updateHUD();
      }

      switchWeapon(idx) {
        if (idx < 0 || idx >= this.player.weapons.length) return;
        if (this.player.weapons[idx].unlocked === false) {
          this.notifyHUD('SNIPER RIFLE AINDA NÃO COLETADO NA TORRE');
          return;
        }
        this.player.weaponIdx = idx;
        this.fpSilencerMesh.visible = this.player.weapons[idx].silenced;
        this.updateHUD();
      }

      // Agachamento real: a postura altera câmera, velocidade e altura de colisão.
      // Nunca se levanta quando o teto está sobre o jogador.
      toggleCrouch() {
        if (this.appState !== 'PLAYING' || this.player.inTank) return false;
        if (this.player.crouched) {
          const radius = 0.47;
          const x = this.player.pos.x, z = this.player.pos.z;
          const blocked = this.levelBuilder.colliders.some(box =>
            box.minX <= box.maxX &&
            x + radius > box.minX && x - radius < box.maxX &&
            z + radius > box.minZ && z - radius < box.maxZ &&
            (box.maxY ?? 5) > 1.20 && (box.minY ?? 0) < 1.74
          );
          if (blocked) {
            this.notifyHUD('TETO BAIXO: AFASTE-SE PARA LEVANTAR');
            return false;
          }
        }
        this.player.crouched = !this.player.crouched;
        this.updateHUD();
        return true;
      }

      interact() {
        if (this.appState !== 'PLAYING') return;

        // Se já estiver dentro do Tanque T-55, [E] desembarca a menos que esteja ao lado do avião de fuga
        if (this.player.inTank) {
          const planeItem = this.levelBuilder.interactables.find(i => i.id === 'runway_plane');
          if (planeItem && this.player.pos.distanceTo(planeItem.position) <= planeItem.radius + 1.5) {
            this.player.inTank = false;
            this.tryTriggerMissionExit('runway_plane');
            return;
          }
          this.player.inTank = false;
          this.player.crouched = false;
          this.player.pos.y = 1.65;
          this.weaponMeshGroup.visible = true;
          const boardItem = this.levelBuilder.interactables.find(i => i.id === 'board_tank');
          if (boardItem && this.levelBuilder.tankVehicle) {
            boardItem.position.copy(this.levelBuilder.tankVehicle.position);
            boardItem.position.y = 1.2;
          }
          this.audio.playGadgetBeep(true);
          this.notifyHUD('DESEMBARCOU DO TANQUE T-55');
          this.updateHUD();
          return;
        }

        // Verifica proximidade com terminais, tanque, NPCs, interruptores de portão e saídas
        for (const item of this.levelBuilder.interactables) {
          if (this.player.pos.distanceTo(item.position) <= item.radius) {
            if (item.completed && item.type !== 'exit') continue;
            if (item.type === 'vehicle' && this.levelBuilder.tankVehicle) {
              this.player.inTank = true;
              this.weaponMeshGroup.visible = false;
              this.player.pos.x = this.levelBuilder.tankVehicle.position.x;
              this.player.pos.z = this.levelBuilder.tankVehicle.position.z;
              this.player.pos.y = 2.35;
              this.player.armor = Math.max(this.player.armor, 100);
              this.audio.playGadgetBeep(true);
              this.notifyHUD('TANQUE T-55 ATIVADO! USE CLIQUE ESQ. PARA DISPARAR O CANHÃO 100MM');
              this.updateHUD();
              return;
            }

            if (item.type === 'gate_switch') {
              if (item.requiresDoak) {
                const doakObj = this.objectives.find(o => o.id === 'contact_doak');
                const doakItem = this.levelBuilder.interactables.find(i => i.id === 'contact_doak');
                if (doakObj && !doakObj.completed && (!doakItem || !doakItem.completed)) {
                  this.audio.playGadgetBeep(false);
                  this.notifyHUD('ACESSO NEGADO: OBTENHA O DECODIFICADOR COM DR. DOAK');
                  return;
                }
              }
              const gate = this.levelBuilder.gates.find(g => g.id === item.gateId);
              if (gate && !gate.isOpen) {
                gate.isOpen = true;
                item.completed = true;
                if (item.visualMesh) item.visualMesh.material.color.setHex(0x22c55e);
                this.audio.playGadgetBeep(true);
                this.notifyHUD('PORTA DE SEGURANÇA DESTRAVADA');
              }
              return;
            }

            if (item.type === 'exit') {
              this.tryTriggerMissionExit(item.id);
              return;
            }

            const obj = this.objectives.find(o => o.id === item.id);
            if (obj && !obj.completed) {
              obj.completed = true;
              item.completed = true;
              if (item.visualMesh) item.visualMesh.material.color.setHex(0x22c55e);
              this.audio.playGadgetBeep(true);
              if (item.id === 'contact_doak') {
                this.player.remoteMines += 3;
                this.notifyHUD('DR. DOAK: "USE ESTE DECODIFICADOR NA PORTA BLINDADA E ESTAS MINAS REMOTAS [G]!"');
              } else if (item.id === 'meet_006') {
                const npc006 = this.levelBuilder.npcs.find(n => n.role === '006');
                if (npc006) npc006.mesh.position.set(-14.5, 0, -48);
                this.notifyHUD('006 (TREVELYAN): "PELO REINO UNIDO, JAMES! DETONE OS 5 TANQUES, JÁ ESTOU EM COBERTURA!"');
              } else {
                this.notifyHUD(`OBJETIVO CONCLUÍDO: ${obj.title.toUpperCase()}`);
              }
              this.updateHUD();
            } else if (!obj) {
              item.completed = true;
              this.audio.playGadgetBeep(true);
              if (item.id === 'contact_doak') {
                this.player.remoteMines += 3;
                this.notifyHUD('DR. DOAK ENTREGOU O DECODIFICADOR DE PORTAS E +3 MINAS REMOTAS!');
                this.updateHUD();
              } else {
                this.notifyHUD('CONTATO REALIZADO (ITEM SECUNDÁRIO NESTA DIFICULDADE)');
              }
            }
            return;
          }
        }
      }

      tryTriggerMissionExit(exitId) {
        const pending = this.objectives.filter(o => o.id !== exitId && !o.completed);
        if (pending.length > 0) {
          this.audio.playGadgetBeep(false);
          this.notifyHUD(`BLOQUEADO: COMPLETE "${pending[0].title.toUpperCase()}" ANTES DE SAIR`);
          return;
        }
        const exitObj = this.objectives.find(o => o.id === exitId);
        if (exitObj) exitObj.completed = true;
        this.updateHUD();
        this.startOutroCutscene();
      }

      damagePlayer(amount) {
        if (this.appState !== 'PLAYING') return;
        this.audio.playHitPlayer();

        if (this.player.armor > 0) {
          const absorbed = Math.min(this.player.armor, amount * 0.65);
          this.player.armor -= absorbed;
          this.player.hp -= (amount - absorbed);
        } else {
          this.player.hp -= amount;
        }

        const vig = document.getElementById('damage-vignette');
        vig.style.opacity = '1';
        clearTimeout(this.vigTimeout);
        this.vigTimeout = setTimeout(() => { vig.style.opacity = '0'; }, 180);

        this.updateHUD();
        if (this.player.hp <= 0) {
          this.failMission('007 foi neutralizado pela guarnição da represa.');
        }
      }

      spawnSpark(pos, hexColor) {
        const spark = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 6, 6),
          new THREE.MeshBasicMaterial({ color: hexColor })
        );
        spark.position.copy(pos);
        this.scene.add(spark);
        this.sparks.push({ mesh: spark, life: 0.16 });
      }

      resolvePlayerCollision(nextPos) {
        const r = 0.48;
        const b = this.levelBuilder.bounds;
        if (b.isDam) {
          const onPierZ = nextPos.z <= -40.2 && nextPos.z >= -47.8;
          const minBorderX = onPierZ ? -17.6 : b.minX;
          nextPos.x = Math.max(minBorderX, Math.min(b.maxX, nextPos.x));
        } else {
          nextPos.x = Math.max(b.minX, Math.min(b.maxX, nextPos.x));
        }
        nextPos.z = Math.max(b.minZ, Math.min(b.maxZ, nextPos.z));

        const eyeHeight = this.player.inTank ? 2.35 : (this.player.crouched ? 1.13 : 1.65);
        for (const box of this.levelBuilder.colliders) {
          if ((box.minY ?? 0) > eyeHeight + 0.08 || (box.maxY ?? 5) < eyeHeight - (this.player.crouched ? 1.1 : 1.62)) continue;
          if (nextPos.x + r > box.minX && nextPos.x - r < box.maxX &&
              nextPos.z + r > box.minZ && nextPos.z - r < box.maxZ) {
            const overlapLeft = (nextPos.x + r) - box.minX;
            const overlapRight = box.maxX - (nextPos.x - r);
            const overlapTop = (nextPos.z + r) - box.minZ;
            const overlapBottom = box.maxZ - (nextPos.z - r);
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapLeft) nextPos.x = box.minX - r;
            else if (minOverlap === overlapRight) nextPos.x = box.maxX + r;
            else if (minOverlap === overlapTop) nextPos.z = box.minZ - r;
            else if (minOverlap === overlapBottom) nextPos.z = box.maxZ + r;
          }
        }
      }

      update(dt) {
        // Animações ambientais contínuas (água ondulada, luzes de torre, portões e câmeras)
        if (this.appState !== 'PAUSED' && this.appState !== 'RESULTS') {
          this.simulationTime += dt;
          this.levelBuilder.updateEnvironment(dt, this.simulationTime);
        }

        // Atualiza partículas de impacto
        for (let i = this.sparks.length - 1; i >= 0; i--) {
          this.sparks[i].life -= dt;
          if (this.sparks[i].life <= 0) {
            this.scene.remove(this.sparks[i].mesh);
            this.sparks.splice(i, 1);
          }
        }

        // 1. Câmera panorâmica no Menu Dossiê
        if (this.appState === 'MENU') {
          const t = performance.now() * 0.00025;
          if (this.currentMissionId === 'facility') {
            this.camera.position.set(Math.sin(t) * 8, 2.8, -52 + Math.cos(t) * 10);
            this.camera.lookAt(0, 1.4, -64);
          } else if (this.currentMissionId === 'runway') {
            this.camera.position.set(Math.sin(t) * 11, 7.5, -75 + Math.cos(t) * 14);
            this.camera.lookAt(0, 2.0, -114);
          } else {
            this.camera.position.set(Math.sin(t) * 6, 9, 25 + Math.cos(t) * 12);
            this.camera.lookAt(0, 1, -45);
          }
          return;
        }

        // 2. Cutscene de Introdução
        if (this.appState === 'CUTSCENE_INTRO') {
          this.cutsceneTimer += dt;
          if (this.isHoldingSkip) {
            this.skipHoldTime += dt;
            document.getElementById('skip-progress-bar').style.width = `${Math.min(100, (this.skipHoldTime / 0.5) * 100)}%`;
            if (this.skipHoldTime >= 0.5) {
              this.finishIntroCutscene();
              return;
            }
          }

          const progress = Math.min(1, this.cutsceneTimer / 4.2);
          if (this.currentMissionId === 'facility') {
            this.camera.position.set(
              0,
              THREE.MathUtils.lerp(3.6, 1.65, progress),
              THREE.MathUtils.lerp(39, 36, progress)
            );
            this.camera.lookAt(0, 1.5, 18);
          } else if (this.currentMissionId === 'runway') {
            this.camera.position.set(
              THREE.MathUtils.lerp(-14, 0, progress),
              THREE.MathUtils.lerp(11, 1.65, progress),
              THREE.MathUtils.lerp(46, 42, progress)
            );
            this.camera.lookAt(0, 1.8, -30);
          } else {
            this.camera.position.set(
              THREE.MathUtils.lerp(-14, 0, progress),
              THREE.MathUtils.lerp(14, 1.65, progress),
              THREE.MathUtils.lerp(48, 40, progress)
            );
            this.camera.lookAt(0, 1.5, THREE.MathUtils.lerp(-20, 10, progress));
          }

          if (progress >= 1) {
            this.finishIntroCutscene();
          }
          return;
        }

        // 3. Cutscene Final da Missão
        if (this.appState === 'CUTSCENE_OUTRO') {
          this.cutsceneTimer += dt;
          if (this.isHoldingSkip) {
            this.skipHoldTime += dt;
            document.getElementById('skip-progress-bar').style.width = `${Math.min(100, (this.skipHoldTime / 0.5) * 100)}%`;
            if (this.skipHoldTime >= 0.5) {
              this.completeMissionSuccess();
              return;
            }
          }

          const p = Math.min(1, this.cutsceneTimer / 4.0);
          if (this.currentMissionId === 'facility') {
            this.camera.position.set(Math.sin(p * 2) * 3, 2.2, THREE.MathUtils.lerp(-78, -85, p));
            this.camera.lookAt(0, 1.5, -87);
          } else if (this.currentMissionId === 'runway') {
            if (this.levelBuilder.planeMesh) {
              this.levelBuilder.planeMesh.position.z = -114 - p * 45;
              this.levelBuilder.planeMesh.position.y = Math.max(0, (p - 0.35) * 18);
              this.levelBuilder.planeMesh.rotation.x = Math.max(0, (p - 0.35) * 0.25);
            }
            this.camera.position.set(14, 5.5 + p * 6, -108 - p * 22);
            this.camera.lookAt(0, 2 + Math.max(0, (p - 0.35) * 16), -114 - p * 45);
          } else {
            this.camera.position.set(
              -12.5 - p * 4.5,
              THREE.MathUtils.lerp(2.2, -26, p * p),
              -118 + Math.sin(p * 3) * 1.5
            );
            this.camera.lookAt(-10, -12, -118);
          }

          if (p >= 1) {
            this.completeMissionSuccess();
          }
          return;
        }

        if (this.appState !== 'PLAYING') return;

        // 4. Loop Ativo de Gameplay FPS
        this.stats.timeElapsed += dt;
        if (this.player.fireTimer > 0) this.player.fireTimer -= dt;

        // Recuperação suave do recuo da arma
        this.weaponMeshGroup.position.z = THREE.MathUtils.lerp(this.weaponMeshGroup.position.z, -0.42, dt * 12);
        this.weaponMeshGroup.position.y = THREE.MathUtils.lerp(
          this.weaponMeshGroup.position.y, this.player.crouched ? -0.31 : -0.22, Math.min(1, dt * 10)
        );
        this.weaponMeshGroup.rotation.x = THREE.MathUtils.lerp(this.weaponMeshGroup.rotation.x, 0, dt * 12);
        // Zoom da mira (Botão Direito) respeitando FOV configurado e lente telescópica do Sniper Rifle
        const curWeapon = this.player.weapons[this.player.weaponIdx];
        const targetFov = this.player.zoomed ? Math.max(18, this.player.baseFov * (curWeapon.zoomFactor || 0.55)) : this.player.baseFov;
        if (Math.abs(this.camera.fov - targetFov) > 0.1) {
          this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 14);
          this.camera.updateProjectionMatrix();
        }

        // Movimentação WASD
        const moveForward = Math.max(-1, Math.min(1, (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0) + this.gamepadMovement.forward));
        const moveRight = Math.max(-1, Math.min(1, (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0) + this.gamepadMovement.right));

        if (moveForward !== 0 || moveRight !== 0) {
          const speed = this.player.inTank ? 6.1 : (this.player.crouched ? 2.1 : 4.3);
          const forwardVec = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
          const rightVec = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));

          const velocity = new THREE.Vector3()
            .addScaledVector(forwardVec, moveForward)
            .addScaledVector(rightVec, moveRight)
            .normalize()
            .multiplyScalar(speed * dt);

          const nextPos = this.player.pos.clone().add(velocity);
          this.resolvePlayerCollision(nextPos);
          this.player.pos.copy(nextPos);
        }

        if (!this.player.inTank) {
          this.player.pos.y = THREE.MathUtils.lerp(this.player.pos.y, this.player.crouched ? 1.13 : 1.65, Math.min(1, dt * 12));
        }

        // Sincroniza posição do Tanque T-55 quando pilotado e permite atropelar guardas
        if (this.player.inTank && this.levelBuilder.tankVehicle) {
          this.player.pos.y = 2.35;
          this.levelBuilder.tankVehicle.position.set(this.player.pos.x, 0, this.player.pos.z);
          this.levelBuilder.tankVehicle.mesh.position.set(this.player.pos.x, 0, this.player.pos.z);
          this.levelBuilder.tankVehicle.turret.rotation.y = this.player.yaw - this.levelBuilder.tankVehicle.yaw;

          for (const g of this.guards) {
            if (g.state !== 'DEAD' && g.pos.distanceTo(this.levelBuilder.tankVehicle.position) < 2.5) {
              if (g.takeDamage(200, this.player.pos)) {
                this.stats.kills++;
                this.notifyHUD('GUARDA NEUTRALIZADO PELO TANQUE BLINDADO');
              }
            }
          }
        }

        // Torres de metralhadora pesada e bateria de mísseis ativas na Runway
        for (const emp of this.levelBuilder.emplacements) {
          if (emp.destroyed) continue;
          const dist = emp.position.distanceTo(this.player.pos);
          if (dist < 42 && hasLineOfSight(emp.position, this.player.pos, this.levelBuilder.colliders)) {
            const dx = this.player.pos.x - emp.position.x;
            const dz = this.player.pos.z - emp.position.z;
            emp.mesh.rotation.y = Math.atan2(dx, dz);
            emp.fireCooldown -= dt;
            if (emp.fireCooldown <= 0) {
              emp.fireCooldown = emp.kind === 'missile' ? 2.2 : 0.95;
              this.audio.playShot(false);
              this.spawnSpark(emp.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xfacc15);
              if (Math.random() < 0.45) {
                this.damagePlayer(this.player.inTank ? 3 : (emp.kind === 'missile' ? 16 : 9));
              }
            }
          }
        }

        // Coleta automática de munição, colete balístico e Sniper Rifle
        for (const p of this.levelBuilder.pickups) {
          if (!p.collected && this.player.pos.distanceTo(p.position) < 1.8) {
            p.collected = true;
            p.mesh.visible = false;
            this.audio.playGadgetBeep(true);
            if (p.type === 'armor') {
              this.player.armor = Math.min(100, this.player.armor + 50);
              this.notifyHUD('COLETE À PROVA DE BALAS COLETADO (+50%)');
            } else if (p.type === 'sniper') {
              this.player.weapons[2].unlocked = true;
              this.switchWeapon(2);
              this.notifyHUD('SNIPER RIFLE COLETADO! PRESSIONE BOTÃO DIREITO PARA LENTE 4X');
            } else {
              this.player.weapons[0].reserve += 21;
              this.player.weapons[1].reserve += 60;
              this.player.weapons[2].reserve += 8;
              this.notifyHUD('MUNIÇÃO SUPLEMENTAR COLETADA');
            }
            this.updateHUD();
          }
        }

        // Detecção pelas câmeras de vigilância motorizadas
        let anyAlerted = false;
        let anySuspicious = false;
        for (const cam of this.levelBuilder.cameras) {
          if (cam.destroyed) continue;
          const toPlayer = new THREE.Vector3().subVectors(this.player.pos, cam.position);
          if (toPlayer.length() < 16) {
            toPlayer.normalize();
            const camDir = new THREE.Vector3(Math.sin(cam.currentYaw), -0.25, Math.cos(cam.currentYaw)).normalize();
            if (camDir.angleTo(toPlayer) < THREE.MathUtils.degToRad(34) &&
                hasLineOfSight(cam.position, this.player.pos, this.levelBuilder.colliders)) {
              anyAlerted = true;
            }
          }
        }

        // Atualiza câmera em primeira pessoa
        this.camera.position.copy(this.player.pos);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.player.yaw;
        this.camera.rotation.x = this.player.pitch;

        // Atualiza IA de todos os guardas
        for (const guard of this.guards) {
          guard.update(dt, this.player.pos, this.levelBuilder.colliders, (dmg) => this.damagePlayer(dmg));
          if (guard.state === 'ALERTED') anyAlerted = true;
          if (guard.state === 'SUSPICIOUS') anySuspicious = true;
        }

        // Atualiza indicador de furtividade e música dinâmica
        const badge = document.getElementById('stealth-badge');
        const dot = document.getElementById('stealth-dot');
        const text = document.getElementById('stealth-text');

        if (anyAlerted) {
          if (!this.audio.combatIntensity) {
            this.stats.alarmsTriggered++;
            this.audio.playAlarmPulse();
          }
          this.audio.combatIntensity = true;
          badge.className = 'px-3.5 py-1.5 rounded-xl bg-rose-950/85 border border-rose-500/60 backdrop-blur-sm flex items-center gap-2.5 animate-alert';
          dot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
          text.className = 'font-mono-tech text-xs font-bold tracking-wider text-rose-300';
          text.textContent = 'EM COMBATE';
        } else if (anySuspicious) {
          this.audio.combatIntensity = false;
          badge.className = 'px-3.5 py-1.5 rounded-xl bg-amber-950/85 border border-amber-500/60 backdrop-blur-sm flex items-center gap-2.5';
          dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
          text.className = 'font-mono-tech text-xs font-bold tracking-wider text-amber-300';
          text.textContent = 'SUSPEITA';
        } else {
          this.audio.combatIntensity = false;
          badge.className = 'px-3.5 py-1.5 rounded-xl bg-slate-950/75 border border-emerald-500/40 backdrop-blur-sm flex items-center gap-2.5';
          dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
          text.className = 'font-mono-tech text-xs font-bold tracking-wider text-emerald-300';
          text.textContent = 'FURTIVO';
        }

        // Verifica prompt contextual de interação ([E])
        const promptEl = document.getElementById('hud-interact-prompt');
        let activePrompt = null;

        for (const item of this.levelBuilder.interactables) {
          if (this.player.pos.distanceTo(item.position) <= item.radius) {
            if (item.type === 'gate_switch' && !item.completed) {
              activePrompt = item.prompt;
            } else if (item.type === 'exit') {
              activePrompt = item.prompt;
            } else if (!item.completed) {
              activePrompt = item.prompt;
            }
            break;
          }
        }

        if (activePrompt) {
          promptEl.textContent = activePrompt;
          promptEl.classList.remove('hidden');
        } else {
          promptEl.classList.add('hidden');
        }
      }

      loop(now) {
        const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
        this.lastFrameTime = now;

        this.pollGamepad(dt);
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame((t) => this.loop(t));
      }

      pollGamepad(dt) {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = Array.from(pads || []).find(p => p && p.connected);
        if (!pad) {
          this.gamepadPrevious = {};
          this.gamepadMovement.forward = 0;
          this.gamepadMovement.right = 0;
          this.gamepadAiming = false;
          return;
        }
        const button = i => !!(pad.buttons[i] && pad.buttons[i].pressed);
        const edge = i => button(i) && !this.gamepadPrevious[i];
        const axis = i => Math.abs(pad.axes[i] || 0) > 0.17 ? pad.axes[i] : 0;
        if (this.appState === 'PLAYING') {
          if (edge(9)) this.togglePauseQWatch();
          else {
            this.gamepadMovement.forward = -axis(1);
            this.gamepadMovement.right = axis(0);
            const sensitivity = this.player.mouseSensitivity * (button(6) ? 1.2 : 2.6);
            this.player.yaw -= axis(2) * sensitivity * dt;
            this.player.pitch -= axis(3) * sensitivity * dt;
            this.player.pitch = THREE.MathUtils.clamp(this.player.pitch, -Math.PI / 2.3, Math.PI / 2.3);
            this.gamepadAiming = button(6);
            this.player.zoomed = this.gamepadAiming || this.mouseAiming;
            if (button(7)) this.fireWeapon();
            if (edge(2)) this.interact();
            if (edge(3)) this.reloadWeapon();
            if (edge(1)) this.toggleCrouch();
            if (edge(4)) this.plantRemoteMine();
            if (edge(5)) this.detonateRemoteMines();
            if (edge(14)) this.switchWeapon((this.player.weaponIdx + this.player.weapons.length - 1) % this.player.weapons.length);
            if (edge(15)) this.switchWeapon((this.player.weaponIdx + 1) % this.player.weapons.length);
          }
        } else {
          this.gamepadMovement.forward = 0;
          this.gamepadMovement.right = 0;
          this.gamepadAiming = false;
          if (this.appState === 'PAUSED' && edge(9)) this.togglePauseQWatch();
          if (this.appState === 'CUTSCENE_INTRO' || this.appState === 'CUTSCENE_OUTRO') {
            if (button(0)) this.isHoldingSkip = true;
            else if (this.gamepadPrevious[0] && !button(0)) {
              this.isHoldingSkip = false;
              this.skipHoldTime = 0;
              document.getElementById('skip-progress-bar').style.width = '0%';
            }
          }
        }
        for (let i = 0; i < 16; i++) this.gamepadPrevious[i] = button(i);
      }

      bindUIEvents() {
        // Abas do Dossiê
        document.querySelectorAll('.dossier-tab').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.dossier-tab').forEach(b => {
              b.className = 'dossier-tab px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800/60 text-slate-400 hover:text-white border border-transparent cursor-pointer';
            });
            btn.className = 'dossier-tab px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/40 cursor-pointer';

            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
          });
        });

        // Seleção de Missão no Dossiê
        document.querySelectorAll('.mission-btn').forEach(btn => {
          btn.addEventListener('click', () => this.selectMission(btn.dataset.mission));
        });

        // Seleção de Dificuldade Clean
        document.querySelectorAll('.diff-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            this.difficulty = btn.dataset.diff;
            document.querySelectorAll('.diff-btn').forEach(b => {
              b.className = 'diff-btn w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between bg-white/[0.03] border-white/10 hover:bg-white/[0.07] cursor-pointer';
              const dot = b.querySelector('.diff-dot');
              if (dot) dot.className = 'diff-dot w-2.5 h-2.5 rounded-full border border-slate-500';
            });
            btn.className = 'diff-btn w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between bg-sky-500/15 border-sky-400/60 cursor-pointer';
            const activeDot = btn.querySelector('.diff-dot');
            if (activeDot) activeDot.className = 'diff-dot w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]';
            this.refreshDossierUI();
          });
        });

        // Toggle de Áudio
        document.getElementById('btn-audio-toggle').addEventListener('click', (e) => {
          this.audio.init();
          const on = this.audio.toggle();
          e.target.textContent = on ? 'SOM: ON' : 'SOM: OFF';
        });

        // Botão Iniciar Missão
        document.getElementById('btn-start-mission').addEventListener('click', () => this.startMission());

        // Segurar Pular Cutscene (Mouse / Touch)
        const skipBtn = document.getElementById('btn-skip-cutscene');
        skipBtn.addEventListener('mousedown', () => { this.isHoldingSkip = true; });
        skipBtn.addEventListener('mouseleave', () => { this.isHoldingSkip = false; this.skipHoldTime = 0; document.getElementById('skip-progress-bar').style.width = '0%'; });
        skipBtn.addEventListener('mouseup', () => { this.isHoldingSkip = false; this.skipHoldTime = 0; document.getElementById('skip-progress-bar').style.width = '0%'; });
        skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.isHoldingSkip = true; });
        skipBtn.addEventListener('touchend', () => { this.isHoldingSkip = false; this.skipHoldTime = 0; document.getElementById('skip-progress-bar').style.width = '0%'; });

        // Banner de Pointer Lock
        document.getElementById('pointer-lock-banner').addEventListener('click', () => {
          document.getElementById('pointer-lock-banner').classList.add('hidden');
          this.requestPointerLockSafe(false);
        });

        // Abas do Menu de Pause (Q Watch)
        document.querySelectorAll('.qw-tab').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.qw-tab').forEach(b => {
              b.className = 'qw-tab px-3.5 py-1.5 rounded-lg text-xs font-mono-tech font-bold bg-slate-900/80 text-slate-400 hover:text-white border border-transparent cursor-pointer transition';
            });
            btn.className = 'qw-tab px-3.5 py-1.5 rounded-lg text-xs font-mono-tech font-bold bg-sky-500/20 text-sky-300 border border-sky-400/40 cursor-pointer transition';

            document.querySelectorAll('.qw-tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById('qw-tab-' + btn.dataset.qwtab).classList.remove('hidden');
          });
        });

        // Controles em Tempo Real no Q Watch
        document.getElementById('input-mouse-sens').addEventListener('input', (e) => {
          this.player.mouseSensitivity = parseFloat(e.target.value);
          document.getElementById('val-mouse-sens').textContent = `${this.player.mouseSensitivity.toFixed(1)}x`;
        });

        document.getElementById('input-fov').addEventListener('input', (e) => {
          this.player.baseFov = parseInt(e.target.value, 10);
          this.camera.fov = this.player.baseFov;
          this.camera.updateProjectionMatrix();
          document.getElementById('val-fov').textContent = `${this.player.baseFov}°`;
        });

        document.getElementById('btn-qwatch-audio').addEventListener('click', (e) => {
          this.audio.init();
          const on = this.audio.toggle();
          e.target.textContent = on ? 'ATIVADO' : 'DESATIVADO';
          document.getElementById('btn-audio-toggle').textContent = on ? 'SOM: ON' : 'SOM: OFF';
        });

        // Botões Q Watch (Pausa)
        document.getElementById('btn-open-qwatch').addEventListener('click', () => this.togglePauseQWatch());
        const crouchButton = document.getElementById('btn-mobile-crouch');
        if (crouchButton) crouchButton.addEventListener('pointerdown', event => {
          event.preventDefault();
          this.toggleCrouch();
        });
        document.getElementById('btn-qwatch-resume').addEventListener('click', () => this.togglePauseQWatch());
        document.getElementById('btn-qwatch-restart').addEventListener('click', () => this.startMission());
        document.getElementById('btn-qwatch-abort').addEventListener('click', () => {
          this.appState = 'MENU';
          this.audio.stopMusic();
          this.keys = {};
          this.weaponMeshGroup.visible = false;
          this.setScreen('screen-dossier');
        });

        // Botões Tela de Resultados
        document.getElementById('btn-results-next').addEventListener('click', (e) => {
          const nextId = e.target.dataset.nextMission || 'facility';
          this.selectMission(nextId);
          this.startMission();
        });
        document.getElementById('btn-results-replay').addEventListener('click', () => this.startMission());
        document.getElementById('btn-results-menu').addEventListener('click', () => {
          this.appState = 'MENU';
          this.refreshDossierUI();
          this.setScreen('screen-dossier');
        });
      }

      bindInputEvents() {
        window.addEventListener('resize', () => {
          this.camera.aspect = window.innerWidth / window.innerHeight;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('keydown', (e) => {
          if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code) && ['PLAYING','PAUSED','CUTSCENE_INTRO','CUTSCENE_OUTRO'].includes(this.appState)) e.preventDefault();
          this.keys[e.code] = true;
          if (e.repeat && this.appState === 'PLAYING' && ['KeyE','KeyG','KeyF','KeyR','ControlLeft','ControlRight'].includes(e.code)) return;

          if (e.code === 'Space' && (this.appState === 'CUTSCENE_INTRO' || this.appState === 'CUTSCENE_OUTRO')) {
            this.isHoldingSkip = true;
          }

          if (e.code === 'Escape' || e.code === 'Tab') {
            if (this.appState === 'PLAYING' || this.appState === 'PAUSED') {
              e.preventDefault();
              this.togglePauseQWatch();
            }
          }

          if (this.appState === 'PLAYING') {
            if (e.code === 'KeyE') this.interact();
            if (e.code === 'KeyR') this.reloadWeapon();
            if (['ControlLeft', 'ControlRight', 'KeyC'].includes(e.code) && !e.repeat) this.toggleCrouch();
            if (e.code === 'KeyG') this.plantRemoteMine();
            if (e.code === 'KeyF') this.detonateRemoteMines();
            if (e.code === 'Digit1') this.switchWeapon(0);
            if (e.code === 'Digit2') this.switchWeapon(1);
            if (e.code === 'Digit3') this.switchWeapon(2);
          }
        });

        window.addEventListener('keyup', (e) => {
          this.keys[e.code] = false;
          if (e.code === 'Space') {
            this.isHoldingSkip = false;
            this.skipHoldTime = 0;
            document.getElementById('skip-progress-bar').style.width = '0%';
          }
        });

        document.addEventListener('pointerlockchange', () => {
          const locked = document.pointerLockElement === this.canvas;
          const banner = document.getElementById('pointer-lock-banner');
          if (!locked && this.appState === 'PLAYING') {
            banner.classList.remove('hidden');
          } else {
            banner.classList.add('hidden');
          }
        });

        window.addEventListener('mousemove', (e) => {
          if (this.appState === 'PLAYING' && document.pointerLockElement === this.canvas) {
            const sensitivity = (this.player.zoomed ? 0.0011 : 0.0022) * this.player.mouseSensitivity;
            this.player.yaw -= e.movementX * sensitivity;
            this.player.pitch -= e.movementY * sensitivity;
            this.player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.player.pitch));
          }
        });

        window.addEventListener('mousedown', (e) => {
          if (this.appState !== 'PLAYING') return;
          if (document.pointerLockElement !== this.canvas) {
            this.requestPointerLockSafe(false);
            return;
          }
          if (e.button === 0) this.fireWeapon();
          if (e.button === 2) { this.mouseAiming = true; this.player.zoomed = true; }
        });

        window.addEventListener('mouseup', (e) => {
          if (e.button === 2) { this.mouseAiming = false; this.player.zoomed = this.gamepadAiming; }
        });

        window.addEventListener('blur', () => {
          this.keys = {};
          this.mouseAiming = false;
          this.player.zoomed = false;
          if (this.appState === 'PLAYING') this.togglePauseQWatch();
        });
        window.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    }

    // Inicialização segura após carregar o DOM
    window.addEventListener('load', () => {
      try {
        if (!window.THREE) throw new Error('Biblioteca 3D não carregada. Verifique sua conexão.');
        window.gameInstance = new GoldenEyeDamGame();
      } catch (error) {
        console.error('Falha ao iniciar o jogo:', error);
        const panel = document.getElementById('screen-dossier');
        panel.innerHTML = '<div class="mi6-panel mx-auto p-8 rounded-2xl max-w-lg"><h1 class="text-xl font-bold text-white mb-4">Não foi possível carregar o jogo</h1><p id="startup-error" class="text-sm text-slate-300"></p><button class="mt-5 px-5 py-3 rounded-lg bg-sky-500 text-slate-950" onclick="location.reload()">Tentar novamente</button></div>';
        document.getElementById('startup-error').textContent = error.message || 'Navegador sem suporte ao WebGL.';
      }
    });
