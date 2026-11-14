# GoldenEye 077 — Atualização de combate v2.6

## Implementado
- PP7: recarga de 0,82 s; KF7: 1,04 s; sniper: 1,18 s.
- A munição só é transferida ao final da animação e o disparo fica bloqueado durante ela.
- Troca de arma cancela a recarga sem perder munição; pausa congela a contagem.
- Arma em primeira pessoa com receptor, empunhadura, carregador animado e recuo.
- Guardas com clarão de disparo e recuo, reação visual aos acertos e queda suave em 0,48 s.
- Animações procedurais sem novos modelos ou texturas; compatíveis com o soldado especial Meshy.
- Regra original de remoção de cadáveres em cinco segundos preservada.

## Verificação
- Executar `node tests/check.cjs`, incluindo o novo `tests/combat-animations.cjs`.
- Revisar visualmente em navegador com WebGL: recarga, disparos, quedas e FPS.
