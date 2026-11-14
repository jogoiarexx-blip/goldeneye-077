# GoldenEye 077 — correção visual v2.8

## Soldado especial Meshy (Facility e demais fases)
- A integração v2.7 criava pesos de pele/ossos apenas pelas coordenadas do modelo; o resultado deformava braços e tronco.
- O jogo **não carrega mais** `src/meshy-rig-v2-7.js` no navegador.
- Novo `src/meshy-safe-v2-8.js` mantém a malha original rígida, com balanço ao caminhar, recuo ao disparar e queda do guarda a partir dos scripts existentes.
- `src/meshy-guard-v2-5.js` dimensiona e assenta o guarda especial em 1,78 m, sem modificar a geometria ou as texturas.
- Preservados IA, hitboxes, sistema de tiros, número de guardas e remoção de corpos após 5 s.

## Cientistas
- `src/doctor-model.js` padroniza **todos os cientistas** da Facility e do Silo em 1,72 m e a médica Doak em 1,75 m.
- A versão provisória procedural (enquanto baixa o GLB ou se falhar) também fica em 1,72 m, com os pés no chão.
- Os modelos GLB são calibrados individualmente; inspeção eventual da altura a cada 0,8 s de jogo ativo corrige aumentos grandes causados por escala/pose.
- Não altera posição dos NPCs no mapa, interações, missões nem compartilha esqueleto entre clones.

## Testes
`node tests/check.cjs` cobre a altura fixa, fallback, aumento simulado de 5x, o Meshy sem rig deformador e a preservação de IA/combate.

*Nota:* animações completas de articulações do soldado exigirão um rig de origem com pesos artísticos; esta versão usa animações rígidas seguras para não deformar o asset.
