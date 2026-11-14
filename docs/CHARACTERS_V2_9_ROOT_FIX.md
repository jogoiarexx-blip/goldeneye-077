# GoldenEye 077 — personagens corrigidos v2.9

A malha Meshy antiga de 118 KB perdeu geometria/UVs na simplificação e tinha fragmentos pretos; o desligamento do rig não bastava. A nova `meshy-guard-fixed-v2-9.glb` foi reconstruída do FBX original preservando **42.774 triângulos e 24.517 vértices**, textura 1024px, e braços reposicionados. Peso ~1,93 MB. O arquivo anterior é mantido apenas para histórico e não é carregado.

O código `meshy-guard-v2-9.js` não superpõe braços cilíndricos do guarda procedural com o GLB. Preserva arma, IA e hitboxes.

`npc-models-v2-9.js` isola escala num contêiner que o AnimationMixer não modifica. Normaliza todos os cientistas para 1,72 m e a médica para 1,75 m, com checagem de altura e alinhamento ao piso a cada 0,12 s. Fallback segue 1,72 m.

Verificação: `node tests/check.cjs`. A inspeção final de WebGL no dispositivo do jogador é recomendada.
