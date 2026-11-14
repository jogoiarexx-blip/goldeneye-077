# GoldenEye 077 — personagens animados e múltiplos guardas (v3.2)

- Todos os NPCs de laboratório (Dra., cientista e pesquisadora) agora usam o clipe esquelético **Walking** como base de pose, em velocidade lenta quando imóveis e normal quando andam. Os clipes de repouso de alguns modelos deixavam os braços abertos em T; não são mais utilizados como pose-base.
- A pesquisadora Meshy continua usando o modelo feminino e sua animação Walk; sem ficar pausada em T-pose.
- O guarda Meshy reconstruído é um GLB estático sem esqueleto. O jogo mantém a malha e a textura corrigidas, usando deformação **pequena e suave das pernas e mangas** na geometria clonada para dar caminhada, preservando o tronco, cabeça, UVs e hitboxes. Não utiliza o rig automático defeituoso.
- Em cada missão agora existem **3 ou 4 guardas Meshy**, conforme a quantidade de inimigos existentes, escolhidos de patrulhas espaçadas. Não cria novos soldados nem faz downloads duplicados. Os demais guardas permanecem originais.
- Deformação Meshy atualizada a aproximadamente 25 FPS de perto e 7 FPS de longe para proteger desempenho. Corpo morto mantém pose e desaparece após os 5 segundos já estabelecidos.
- Testes: `tests/guard-motion-v3-2.cjs`, `tests/npc-integration.cjs`, `tests/check.cjs`.
- A inspeção visual no navegador ainda é necessária para avaliar o aspecto final de cada animação.
