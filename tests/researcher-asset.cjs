#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const filename='Medica_Otimizada_Walk_Menos25MB.glb';
const data=fs.readFileSync(path.join(root,'assets/models',filename));
assert.ok(data.length>100_000,'O terceiro modelo não pode estar vazio');
assert.ok(data.length<25*1024*1024,'Manter o modelo abaixo de 25 MB');
assert.equal(data.toString('ascii',0,4),'glTF','GLB inválido');
assert.equal(data.readUInt32LE(4),2);
assert.equal(data.readUInt32LE(8),data.length);
assert.equal(data.toString('ascii',16,20),'JSON');
const jsonSize=data.readUInt32LE(12);
const json=JSON.parse(data.toString('utf8',20,20+jsonSize));
assert.equal(json.asset.version,'2.0');
assert.ok(json.meshes?.length,'Arquivo da pesquisadora sem malha 3D');
assert.ok(json.nodes?.length,'Arquivo da pesquisadora sem nós');
const animations=(json.animations||[]).map(x=>x.name);
console.log('OK pesquisadora Meshy:',data.length,'bytes,',
  json.meshes.length,'meshes,',json.skins?.length||0,'skins,',
  'animacoes:',animations.join(', ')||'(pose estática)');
const src=fs.readFileSync(path.join(root,'src/npc-models-v3-2.js'),'utf8');
for(const s of [
 'Medica_Otimizada_Walk_Menos25MB',"'sci_2'","'silo_scientist_2'",
 'walkOnlyIdle','npc.modelVariant=variant'
])assert.ok(src.includes(s),'Integração da pesquisadora incompleta: '+s);
