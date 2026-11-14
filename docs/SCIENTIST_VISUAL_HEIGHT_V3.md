# GoldenEye 077 — correção da escala visual dos cientistas (v3.0)

As versões anteriores mediam a caixa do GLB na posição-base e não mediam os vértices movidos pelo esqueleto. Como o motor embutido utiliza Three.js de 2021, Box3.setFromObject(SkinnedMesh) não inclui necessariamente o skinning visível.

A versão 3.0 utiliza `boneTransform()` antes de `matrixWorld` para obter o volume do personagem desenhado, escala os modelos reais em **1,72 m (cientistas)** e **1,75 m (médica)**, mantém os pés no piso e corrige discrepâncias nas animações. No carregamento usa todos os vértices, com amostragem limitada de 1600 vértices por malha a cada 0,22 segundos de jogo ativo.

Os modelos originais, ossos, objetivos, IA e arma dos inimigos permanecem intactos. Aplicado à Facility e ao Silo.

Verificação: `node tests/check.cjs` inclui regressão que simula osso com altura 5x; os testes de integração medem a altura *visível*, além da caixa de geometria.
