#!/usr/bin/env node
// Verificações rápidas sem dependências externas; executar: node tests/check.cjs
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\s+src="(src\/[^"]+\.js)"\s+defer><\/script>/g)]
  .map(m => m[1]);
const expected = [
  'src/audio.js', 'src/missions.js', 'src/world.js', 'src/guards.js',
  'src/game.js', 'src/mission-enhancements.js', 'src/tactics-v1-3.js', 'src/surface-v1-4.js', 'src/bunker-v1-5.js', 'src/silo-v1-6.js', 'src/frigate-v1-7.js', 'src/surface2-v1-8.js', 'src/bunker2-v1-9.js', 'src/statue-v2-0.js', 'src/dam-rework-v2-0-1.js', 'src/global-audit-v2-0-5.js'
];
assert.deepEqual(scripts, expected, 'Os scripts precisam carregar na ordem correta.');
for (const rel of scripts) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  new vm.Script(source, { filename: rel });
  console.log('OK sintaxe:', rel);
}
const missions = fs.readFileSync(path.join(root, 'src/missions.js'), 'utf8');
for (const mission of ['dam', 'facility', 'runway']) {
  assert.ok(missions.includes(mission + ': {'), 'Fase ausente: ' + mission);
}
const surface = fs.readFileSync(path.join(root, 'src/surface-v1-4.js'), 'utf8');
for (const key of [
  'MISSIONS_DATA[MISSION]', 'buildSurface1Level',
  "'disable_antenna'", "'get_safe_key'", "'get_plans'", "'surface_vent'",
  'requiresKey: true', "finished === 'runway'",
  'WORLD.updateEnvironment', 'paintMissionButton()'
]) assert.ok(surface.includes(key), 'Surface 1 incompleta: ' + key);
assert.ok(html.includes('data-mission="surface1"'), 'Surface 1 não aparece no menu');
const bunker = fs.readFileSync(path.join(root, 'src/bunker-v1-5.js'), 'utf8');
for (const required of [
  "const ID = 'bunker1'", 'WORLD.buildBunker1Level',
  "'disable_cctv'", "'copy_goldeneye_key'", "'boot_computer'",
  "'download_goldeneye_data'", "'photo_main_screen'", "'bunker_exit'",
  'originalKeyRetained', 'dot<0.94', 'this.bunkerDownload',
  "finished==='surface1'", 'SAVE_KEY'
]) assert.ok(bunker.includes(required), 'Bunker 1 incompleto: ' + required);
assert.ok(html.includes('data-mission="bunker1"'), 'Bunker 1 não aparece no menu');
assert.ok(html.includes('id="bunker-download-progress"'), 'HUD do download ausente');
const silo = fs.readFileSync(path.join(root, 'src/silo-v1-6.js'), 'utf8');
for (const token of [
  "const ID='silo'", 'WORLD.buildSiloLevel',
  "'plant_silo_fuel_1'", "'plant_silo_fuel_2'",
  "'photo_silo_satellite'", "'silo_telemetry'", "'silo_circuits'",
  "'protect_silo_scientists'", "'silo_exit'",
  'this.siloCountdown={remaining:config.timeLimit',
  "if(this.appState!=='PLAYING'||!this.siloCountdown)return",
  "finished==='bunker1'"
]) assert.ok(silo.includes(token), 'Mecânica do Silo ausente: ' + token);
assert.ok(html.includes('data-mission="silo"'), 'Silo não aparece no menu');
assert.ok(html.includes('id="silo-countdown"'), 'HUD de tempo do Silo ausente');
const frigate = fs.readFileSync(path.join(root, 'src/frigate-v1-7.js'), 'utf8');
for (const token of [
  "const ID = 'frigate'", 'WORLD.buildFrigateLevel',
  "'frigate_rescue_hostages'", "'frigate_disarm_bridge'",
  "'frigate_disarm_engine'", "'frigate_heli_tracker'", "'frigate_exit'",
  "type:'frigate_hostage'", 'helicopterId', 'this.frigateDisarm',
  "finished==='silo'", 'rescueComplete(this)', 'npc.frigateHostage=true',
  'npc.dead', "this.failMission('REFÉM ATINGIDO"
]) assert.ok(frigate.includes(token), 'Mecânica de Frigate ausente: ' + token);
assert.ok(html.includes('data-mission="frigate"'), 'Frigate não aparece no menu');
assert.ok(html.includes('id="frigate-bomb-progress"'), 'HUD do desarme ausente');
const surface2 = fs.readFileSync(path.join(root, 'src/surface2-v1-8.js'), 'utf8');
for(const token of [
  "const ID = 'surface2'", 'WORLD.buildSurface2Level',
  "'s2_disable_surveillance'", "'s2_cut_bunker_link'",
  "'s2_disable_helicopter'", "'s2_bunker_entry'",
  'originalBuild.call(this,', "this.addSecurityGate('s2_gate'",
  's.helicopterDisabled=true', "finished==='frigate'",
  'snow.geometry.setAttribute('
]) assert.ok(surface2.includes(token),'Surface 2 incompleta: '+token);
assert.ok(html.includes('data-mission="surface2"'),'Surface 2 não aparece no menu');
require('./surface2.cjs');
const bunker2=fs.readFileSync(path.join(root,'src/bunker2-v1-9.js'),'utf8');
for(const token of [
  "const ID='bunker2'", 'WORLD.buildBunker2Level',
  "id:'b2_free_natalya'", "'b2_compare_records'",
  "'b2_get_videotape'", "'b2_destroy_cameras'",
  "'b2_get_manual'", "'b2_escape_with_natalya'",
  "npc.position.set(nextX,0,nextZ)", 'st.routeIndex',
  'state.camerasDestroyed===list.length',
  "finished==='surface2'", 'natalyaCloseToDoor'
]) assert.ok(bunker2.includes(token),'Funcionalidade Bunker 2 ausente: '+token);
assert.ok(html.includes('data-mission="bunker2"'),'Bunker 2 não aparece no dossiê');
assert.ok(html.includes('id="bunker2-ally-status"'),'HUD de Natalya ausente');
require('./bunker2.cjs');
const statue=fs.readFileSync(path.join(root,'src/statue-v2-0.js'),'utf8');
for(const token of [
  "const ID='statue'", 'WORLD.buildStatueLevel',
  "'st_valentin'", "'st_janus'", "'st_helicopter'",
  "'st_natalya'", "'st_flight_recorder'", "'st_exit'",
  'st.recorderRevealed=true', 'st.janus.mesh.visible=true',
  "finished==='bunker2'", 'STATUE_SCENE', 'cue(game,position)'
]) assert.ok(statue.includes(token),'Statue v2.0 incompleta: '+token);
assert.ok(html.includes('data-mission="statue"'),'Statue não aparece no menu');
assert.ok(html.includes('id="statue-cinematic"'),'HUD das cenas de Statue ausente');
require('./statue.cjs');
const damRework=fs.readFileSync(path.join(root,'src/dam-rework-v2-0-1.js'),'utf8');
for(const token of [
  'b.minX=-15.95', 'this.damStunt=buildStunt',
  'new THREE.Line(lineGeo', 'stuntPosition(p)',
  'damDeathAge', 'damEnhanced', 'hasLineOfSight('
]) assert.ok(damRework.includes(token),'Melhoria Dam ausente: '+token);
const worldDam=fs.readFileSync(path.join(root,'src/world.js'),'utf8');
for(const token of [
  "'bungee'", 'this.damJumpAnchor=new THREE.Vector3',
  "'Pressione [E] na ponta da passarela",
  'this.addBox(-9.8,0.75,2.575',
  'this.addBox(-9.8, 0.75, -125.2'
]) assert.ok(worldDam.includes(token),'Acesso de bungee defeituoso: '+token);
require('./dam-rework.cjs');
require('./facility-audit.cjs');
require('./global-audit.cjs');
require('./campaign-audit.cjs');




const guideSource = fs.readFileSync(path.join(root, 'src/mission-enhancements.js'), 'utf8');
assert.ok(guideSource.includes("id === 'frigate_rescue_hostages'"), 'Guia não mostra os reféns restantes');
const gameSource = fs.readFileSync(path.join(root, 'src/game.js'), 'utf8');
for (const crouch of [
  'toggleCrouch() {', 'TETO BAIXO', 'this.player.crouched ? 1.13 : 1.65',
  "['ControlLeft', 'ControlRight', 'KeyC']", 'this.toggleCrouch()'
]) assert.ok(gameSource.includes(crouch), 'Agachamento incompleto: ' + crouch);
assert.ok(html.includes('id="btn-mobile-crouch"'), 'Botão agachar mobile ausente');


assert.ok(surface.includes("this.currentMissionId === MISSION"), 'Fase nova não ativa interações contextuais');
const enemies = fs.readFileSync(path.join(root, 'src/guards.js'), 'utf8');
assert.ok(enemies.includes('hasLineOfSight'), 'Guardas devem checar obstáculos na visão');
const tactics = fs.readFileSync(path.join(root, 'src/tactics-v1-3.js'), 'utf8');
for (const required of [
  'chooseCover(', 'this.searchTimer = 4.5', 'v13Discovered',
  'v13GateDisplays', 'v13Dust', 'facility_exit', 'this.camera.lookAt('
]) assert.ok(tactics.includes(required), 'Funcionalidade ausente: ' + required);
const visuals = fs.readFileSync(path.join(root, 'src/world.js'), 'utf8');
assert.ok(visuals.includes("addSecurityGate('fac_gate_2'"), 'Porta do laboratório ausente.');
assert.ok(visuals.includes("buildEscapePlane("), 'Avião de fuga ausente.');
console.log('OK: dez missões, módulos, objetivos, Dam rework, auditoria Facility e global, IA, portas e cutscenes (checagens estáticas).');
