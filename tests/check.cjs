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
  'src/game.js', 'src/mission-enhancements.js', 'src/tactics-v1-3.js', 'src/surface-v1-4.js'
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
console.log('OK: quatro missões, módulos, objetivos, IA, portas e cutscenes (checagens estáticas).');
