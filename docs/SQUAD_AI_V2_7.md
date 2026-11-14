# GoldenEye 077 — IA tática v2.7

## Alterações
- Soldado que **vê** o jogador e entra em alerta transmite seu último setor confirmado por rádio aos colegas num raio de 17 m.
- Companheiros passam a **investigar** (SUSPICIOUS), cada um em um setor distinto. Eles só disparam depois de reconhecer o jogador com o campo de visão e a linha de visão normais.
- O contato é verificado no processamento original do guarda. Sem radar, informação de posição contínua através de paredes ou teleporte.
- Barulho de tiro/explosão já existente espalha os guardas em setores próximos, quando o local escolhido não invade objetos sólidos.
- Guardas com contato visual podem pedir cobertura periodicamente: o planejador anterior agora avalia até 14 obstáculos próximos, em vez de toda a fase.
- Cadência de tiro inicial desencontrada entre guardas, sem mudar dano, taxa de disparos normal nem armamento.
- Rádio é atualizado em intervalos de 0,45 s (máx. 2 transmissores e 3 colegas por chamada). Reforços recebem ID de esquadrão ao aparecer.
- Mantidas as 10 missões, colisões, animações GLB/Meshy, controles touch, objetivos e remoção dos corpos após 5 segundos.

## Testes
`node tests/check.cjs` executa as regressões da campanha e `tests/squad-ai.cjs`. Conferir manualmente no navegador o comportamento em paredes, portas e zonas estreitas.
