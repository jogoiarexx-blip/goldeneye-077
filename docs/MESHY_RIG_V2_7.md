# GoldenEye 077 — Guarda Meshy v2.7 (rig procedural)

O GLB Meshy original (118 KB) não contém esqueleto. O módulo v2.7 cria em tempo de execução 17 ossos com pesos automáticos por região, preservando malha, UVs, textura e tamanho do arquivo. Os ossos controlam quadril, coluna, peito, pescoço, cabeça, braços, antebraços, mãos, coxas, canelas e pés.

**Animações:** marcha com braços e pernas alternados; postura de mira; reação ao disparo e dano; queda com pose estável. A animação genérica de morte v2.6 continua controlando o grupo do inimigo. Não há AnimationMixer adicional, downloads ou mais inimigos.

**Limitação:** pesos automáticos não substituem o weight painting artístico no Blender. Conferir visualmente a deformação das articulações em navegador WebGL.

**Testes:** `node tests/check.cjs`, incluindo `tests/meshy-rig.cjs`.
