#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html');
const css=read('src/menu-v2-3.css');
const js=read('src/menu-ui-v2-3.js');
new vm.Script(js,{filename:'src/menu-ui-v2-3.js'});
assert.ok(html.includes('href="src/menu-v2-3.css"'));
assert.ok(html.includes('src="src/menu-ui-v2-3.js" defer'));
for(const id of ['screen-dossier','screen-qwatch','screen-results',
  'screen-cutscene','campaign-progress','campaign-selection',
  'qwatch-live-loadout','btn-qwatch-resume','btn-results-replay',
  'btn-start-mission','menu-footer-hint']) {
  assert.ok(html.includes('id="'+id+'"'),'Falta UI: '+id);
}
for(const mission of ['dam','facility','runway','surface1','bunker1',
  'silo','frigate','surface2','bunker2','statue']) {
  assert.ok(html.includes('data-mission="'+mission+'"'));
}
for(const tab of ['objetivos','briefing','controles']) {
  assert.ok(html.includes('data-tab="'+tab+'"'));
}
for(const tab of ['objetivos','inventario','ajustes']) {
  assert.ok(html.includes('data-qwtab="'+tab+'"'));
}
for(const token of ['.mi6-workspace','.mission-btn[aria-current="true"]',
  '.diff-btn[aria-pressed="true"]','.qw-live-grid','prefers-reduced-motion',
  '@media(max-width:520px)','@media(max-width:800px)']) {
  assert.ok(css.includes(token),'Estilo ausente: '+token);
}
for(const token of ['renderInventory','syncMission','syncDifficulty','syncTabs',
  'moveFocus','pollGamepad','aria-disabled','document.activeElement',
  'qwatch-live-loadout']) {
  assert.ok(js.includes(token),'Comportamento ausente: '+token);
}
assert.ok(html.indexOf('src/menu-ui-v2-3.js')>html.indexOf('src/doctor-model.js'),
  'Menu UX deve carregar depois dos patches anteriores');
console.log('OK UI MI6 v2.3: 10 fases, dossiê, abas, dificuldade, inventário, pausa, resultados, responsividade e controle.');
