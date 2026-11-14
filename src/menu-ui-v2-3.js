/* GoldenEye 077 • MI6 Menu UX v2.3
 * Acessibilidade, menus responsivos, navegação por teclado/controle e inventário real.
 * Mantém os handlers originais de missões, dificuldade, pausa e resultados.
 */
(() => {
  'use strict';
  if (typeof GoldenEyeDamGame === 'undefined') return;
  const proto = GoldenEyeDamGame.prototype;
  const menus = ['screen-dossier','screen-qwatch','screen-results'];
  const byId = id => document.getElementById(id);

  function missionButtons() {
    return Array.from(document.querySelectorAll('#screen-dossier .mission-btn'));
  }
  function syncMission(game) {
    let unlocked = 0;
    for (const btn of missionButtons()) {
      const active = btn.dataset.mission === game.currentMissionId;
      const locked = btn.getAttribute('aria-disabled') === 'true';
      if (!locked) unlocked++;
      btn.setAttribute('aria-current', String(active));
      btn.setAttribute('aria-pressed', String(active));
      if (!btn.hasAttribute('title')) {
        btn.title = locked ? 'Complete a missão anterior para desbloquear' : 'Selecionar missão';
      }
    }
    const summary = byId('campaign-progress');
    if (summary) summary.textContent = unlocked + ' DE 10 DISPONÍVEIS';
    const current = byId('campaign-selection');
    const selected = missionButtons().find(b => b.dataset.mission === game.currentMissionId);
    if (current && selected) {
      const title = selected.querySelector('div:nth-child(2)');
      current.textContent = title ? title.textContent : game.currentMissionId.toUpperCase();
    }
  }
  function syncDifficulty(game) {
    for (const btn of document.querySelectorAll('#screen-dossier .diff-btn')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.diff === game.difficulty));
    }
  }
  function syncTabs() {
    for (const [selector, prefix, attr] of [
      ['.dossier-tab','tab-','tab'], ['.qw-tab','qw-tab-','qwtab']
    ]) {
      for (const btn of document.querySelectorAll(selector)) {
        const name = btn.dataset[attr];
        const target = byId(prefix + name);
        const selected = !!target && !target.classList.contains('hidden');
        btn.setAttribute('aria-selected', String(selected));
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-controls', prefix + name);
        if (target) {
          target.setAttribute('role','tabpanel');
          target.setAttribute('aria-labelledby', btn.id || '');
        }
      }
    }
  }
  function makeCard(title, value, detail, extraClass = '') {
    const card = document.createElement('article');
    card.className = 'qw-live-card ' + extraClass;
    const label = document.createElement('span');
    label.className = 'eyebrow';label.textContent = title;
    const strong = document.createElement('strong');
    strong.textContent = value;
    const paragraph = document.createElement('p');
    paragraph.textContent = detail;
    card.append(label, strong, paragraph);
    return card;
  }
  function renderInventory(game) {
    const wrap = byId('qwatch-live-loadout');
    if (!wrap || !game.player) return;
    wrap.textContent = '';
    const p = game.player;
    const weapons = p.weapons || [];
    const equipped = weapons[p.weaponIdx] || {};
    const health = Math.max(0, Math.ceil(p.hp || 0));
    const armor = Math.max(0, Math.ceil(p.armor || 0));
    wrap.append(
      makeCard('ARMA EQUIPADA', equipped.name || 'SEM ARMA',
        'CARREGADOR: ' + (equipped.clip || 0) + '  /  RESERVA: ' + (equipped.reserve || 0)),
      makeCard('STATUS DO AGENTE', 'SAÚDE ' + health + '%',
        'COLETE: ' + armor + '%  •  POSTURA: ' + (p.crouched ? 'AGACHADO' : 'EM PÉ')),
      makeCard('ARSENAL DISPONÍVEL', weapons.filter(w=>w.unlocked !== false)
        .map(w=>w.name).join('  •  ') || 'SEM EQUIPAMENTO',
        'Troque de arma pelas teclas 1, 2 e 3 (quando desbloqueada).'),
      makeCard('Q BRANCH / SUPRIMENTOS', (p.remoteMines || 0) + ' MINAS REMOTAS',
        'Missão: ' + game.currentMissionId.toUpperCase() +
        '  •  Dificuldade: ' + (game.difficulty || 'AGENT').replaceAll('_',' '))
    );
  }

  function activeScreen(game) {
    if (!game) return null;
    if (game.appState === 'MENU') return byId('screen-dossier');
    if (game.appState === 'PAUSED') return byId('screen-qwatch');
    if (game.appState === 'RESULTS') return byId('screen-results');
    return null;
  }
  function focusable(game) {
    const screen = activeScreen(game);
    if (!screen) return [];
    return Array.from(screen.querySelectorAll('button, input[type="range"]')).filter(el =>
      !el.disabled && el.getAttribute('aria-disabled') !== 'true' &&
      !el.closest('.hidden,[hidden]') && el.getClientRects().length > 0
    );
  }
  function moveFocus(game, direction) {
    const items = focusable(game);
    if (!items.length) return false;
    const current = items.indexOf(document.activeElement);
    const next = current === -1 ? (direction > 0 ? 0 : items.length - 1)
      : (current + direction + items.length) % items.length;
    items[next].focus({preventScroll:false});
    return true;
  }
  function focusDefault(id) {
    const target = {
      'screen-dossier':'btn-start-mission',
      'screen-qwatch':'btn-qwatch-resume',
      'screen-results':'btn-results-replay'
    }[id];
    if (target) byId(target)?.focus({preventScroll:true});
  }

  const previousSelect = proto.selectMission;
  proto.selectMission = function(...args) {
    const result = previousSelect.apply(this,args);
    syncMission(this);
    return result;
  };
  const previousRefresh = proto.refreshDossierUI;
  proto.refreshDossierUI = function(...args) {
    const result = previousRefresh.apply(this,args);
    syncDifficulty(this);
    syncMission(this);
    return result;
  };
  const previousPause = proto.togglePauseQWatch;
  proto.togglePauseQWatch = function(...args) {
    const result = previousPause.apply(this,args);
    if (this.appState === 'PAUSED') renderInventory(this);
    return result;
  };
  const previousScreen = proto.setScreen;
  proto.setScreen = function(id) {
    const result = previousScreen.call(this,id);
    if (menus.includes(id)) {
      if (id === 'screen-qwatch') renderInventory(this);
      if (id === 'screen-dossier') {
        syncMission(this);syncDifficulty(this);
      }
      syncTabs();
      focusDefault(id);
    }
    return result;
  };
  const prevPoll = proto.pollGamepad;
  proto.pollGamepad = function(dt) {
    const result = prevPoll.call(this,dt);
    const screen = activeScreen(this);
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads
      ? Array.from(navigator.getGamepads() || []) : [];
    const pad = pads.find(p=>p && p.connected);
    if (!pad || !screen) {
      this.mi6PadButtons = {};
      return result;
    }
    const last = this.mi6PadButtons || {};
    const pressed = i => !!pad.buttons[i]?.pressed;
    const edge = i => pressed(i) && !last[i];
    if (edge(12) || edge(14)) moveFocus(this,-1);
    if (edge(13) || edge(15)) moveFocus(this,1);
    if (edge(0)) {
      const current = document.activeElement;
      const items = focusable(this);
      if (items.includes(current)) {
        if (current.tagName === 'BUTTON') current.click();
        else if (typeof current.focus === 'function') current.focus();
      } else moveFocus(this,1);
    }
    if (edge(1) && this.appState === 'PAUSED') this.togglePauseQWatch();
    const next = {};
    for(let i=0;i<16;i++)next[i]=pressed(i);
    this.mi6PadButtons=next;
    return result;
  };
  function onKeyDown(event) {
    const game = window.gameInstance;
    if (!game || !activeScreen(game) || event.ctrlKey || event.altKey || event.metaKey) return;
    const target = event.target;
    if (target && target.matches && target.matches('input[type="range"]')) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' || event.key === 'ArrowLeft' ||
        (event.key === 'Tab' && game.appState === 'PAUSED')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      moveFocus(game, event.key === 'ArrowDown' || event.key === 'ArrowRight'
        || (event.key === 'Tab' && !event.shiftKey) ? 1 : -1);
    }
  }
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('load', () => {
    const game = window.gameInstance;
    if (!game) return;
    for(const btn of document.querySelectorAll('.dossier-tab,.qw-tab')) {
      btn.addEventListener('click',syncTabs);
    }
    for(const btn of document.querySelectorAll('.diff-btn')) {
      btn.addEventListener('click',()=>syncDifficulty(game));
    }
    syncTabs();syncMission(game);syncDifficulty(game);
    const audio = byId('btn-audio-toggle');
    if(audio)audio.setAttribute('aria-label','Ativar ou desativar som');
    const hint = byId('menu-footer-hint');
    if(hint)hint.textContent='MOUSE / TOQUE: SELECIONAR  •  TECLADO: SETAS E ENTER  •  CONTROLE: DIRECIONAL + A';
  });
  window.GoldenEyeMenuUX={version:'2.3',syncMission,renderInventory,moveFocus};
})();