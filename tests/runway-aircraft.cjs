#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const THREE = require('../vendor/three.min.js');
const src = fs.readFileSync(path.join(__dirname, '../src/world.js'), 'utf8');
const sandbox = { THREE, console };
vm.runInNewContext(src + '\nthis.World = DamLevelBuilder;', sandbox);
const world = new sandbox.World(new THREE.Scene());
world.buildEscapePlane(0, -114);
const plane = world.planeMesh;
assert.equal(plane.name, 'runway_aircraft_v2_2');
assert.equal(plane.position.z, -114);
assert.equal(plane.userData.landingGear.length, 3);
assert.equal(world.colliders.length, 0, 'Não criar bloqueios invisíveis na saída');
const meshes = [];
plane.traverse(o => { if (o.isMesh) meshes.push(o); });
for (const part of ['asa_esquerda', 'asa_direita', 'cockpit',
  'leme_vertical', 'porta_embarque', 'degrau']) {
  assert.ok(meshes.some(o => o.name === part), 'Faltando: ' + part);
}
assert.ok(meshes.length < 100, 'Avião excedeu 100 meshes');
const props = world.animatedProps.filter(o => o.type === 'aircraft-propeller');
const lights = world.animatedProps.filter(o => o.type === 'aircraft-light');
assert.equal(props.length, 2);
assert.equal(lights.length, 3);
world.updateEnvironment(0.1, 1);
assert.ok(props[0].mesh.rotation.z > 0);
assert.equal(props[0].mesh.rotation.y, 0, 'Rotor deve girar apenas no eixo Z');
assert.ok(lights.every(o => o.mesh.material.emissiveIntensity > 0));
world.clear();
assert.equal(world.planeMesh, null);
assert.equal(world.animatedProps.length, 0);
console.log('OK: avião Runway bimotor, hélices, trem, luzes, embarque, orçamento e limpeza.');
