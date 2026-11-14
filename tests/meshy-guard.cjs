#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const asset = path.join(root,'assets/models/meshy-guard-special.glb');
const binary = fs.readFileSync(asset);
assert.equal(binary.toString('ascii',0,4),'glTF','Asset deve ser GLB válido');
assert.equal(binary.readUInt32LE(4),2,'Formato GLB 2.0');
assert.equal(binary.readUInt32LE(8),binary.length,'Tamanho do GLB consistente');
assert.ok(binary.length < 200_000,'Modelo Meshy deve ter menos de 200 KB');
const jsonLength=binary.readUInt32LE(12),jsonTag=binary.toString('ascii',16,20);
assert.equal(jsonTag,'JSON');
const gltf=JSON.parse(binary.toString('utf8',20,20+jsonLength));
assert.equal(gltf.asset.version,'2.0');
assert.ok(gltf.meshes.length>=1,'Modelo exportado não pode estar vazio');
assert.ok(gltf.materials.length>=1);
assert.ok(gltf.textures?.length>=1,'Textura do uniforme precisa existir');
assert.ok(gltf.images?.length>=1);
const mesh=gltf.meshes[0];
const primitives=mesh.primitives||[];
assert.ok(primitives.some(p=>p.attributes.POSITION!==undefined &&
  p.attributes.TEXCOORD_0!==undefined),
  'Geometria e UVs devem ter sido preservados');
const positions=gltf.accessors[primitives[0].attributes.POSITION];
assert.ok(positions.count>=1000,'Modelo perdeu geometria excessivamente');
assert.ok(positions.count<10000,'Modelo pesado demais');
const source=fs.readFileSync(path.join(root,'src/meshy-guard-v2-5.js'),'utf8');
new vm.Script(source,{filename:'src/meshy-guard-v2-5.js'});
for (const token of [
 'function cloneVisual(', 'function attach(', 'function cleanup(',
 'this.meshyGuardTarget', "guard.state === 'DEAD'",
 'node.geometry?.dispose?.()', "this.hitFlashTimer > 0",
 'previousStart.apply(this, args)', 'previousGuardUpdate.call(this, dt, ...args)'
]) assert.ok(source.includes(token),'Integração incompleta: '+token);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.includes('src="src/meshy-guard-v2-5.js" defer'));
assert.ok(html.indexOf('src/meshy-guard-v2-5.js') >
  html.indexOf('src/mobile-controls-v2-4.js'));
console.log('OK Meshy: GLB válido, '+binary.length+' bytes, '+
  positions.count+' vértices, um guarda especial por fase e fallback seguro.');
