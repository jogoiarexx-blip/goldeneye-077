# Revisão dos dez cenários — 14/11/2026

Base: auditoria v2.0.5, seção 4 e recomendações 5.5 e Lote D.

## Implementado

Camada de acabamento estático, aderente às dimensões das paredes existentes, com materiais compartilhados e instanciamento. Não amplia limites nem cria salas novas: amplia o detalhamento das dez fases existentes. Até 300 pequenas peças, três lotes instanciados e cinco placas por mapa; nenhuma luz dinâmica nova, download de textura ou alteração de salvamento.

| Fase | Acabamento |
|---|---|
| Dam | Juntas de concreto, rodapés, canaletas e placas de manutenção |
| Facility | Painéis de laboratório, juntas, grelhas e identificação técnica |
| Runway | Acabamento de hangares, canaletas e placas de operações aéreas |
| Surface 1 | Fachadas das cabanas e camada de neve apoiada nos quatro telhados |
| Bunker 1 | Conduítes presos às paredes, grelhas e setores de comunicações |
| Silo | Conduítes, grelhas e placas de área de combustível |
| Frigate | Acabamento de divisórias e identificação de compartimentos |
| Surface 2 | Neve sobre telhados e paleta/placas de ocupação militar |
| Bunker 2 | Conduítes e identificação de setores de detenção |
| Statue | Juntas de alvenaria em doze bases e pedestais |

Placas são identificação passiva de infraestrutura, não novos objetivos. Não há portas falsas, indicação de escada utilizável ou objetos luminosos simulando interações. Partes novas ficam nas superfícies existentes; sem obstáculos novos no caminho. GLB do jogador, headshots, cadáveres de cinco segundos e progressão permanecem.

Também corrigida GE-008: mensagem de morte identifica a missão atual em vez de sempre citar a represa.

## Evidência

`node tests/check.cjs` aprovado, incluindo a campanha completa. O teste da campanha passou a usar Three.js real (geometria, matrizes e instâncias), mantendo canvas simulado e execução sem GPU. Valida matrizes finitas e positivas, orçamento de instâncias, quatro coberturas de neve em cada Surface, pedestais e descarte de buffers de instância, materiais, geometrias e texturas exatamente uma vez. As áreas navegáveis, colisores, guardas, objetivos e portões mantiveram os valores anteriores nas dez missões.

## Limites e continuidade da auditoria

Sem homologação visual em WebGL, capturas antes/depois ou benchmarks reais de FPS nesta entrega. O Chromium do ambiente recusou iniciar por restrição de socket na tentativa anterior. A contagem de lotes é um orçamento de desenho adicional, não uma medição de desempenho.

Esta revisão não conclui todos os lotes A–E da auditoria. Navegação vertical, planejamento de rotas da IA, recuperação geral da escolta, revisão completa de efeitos/memória e conclusão E2E das 30 combinações missão/dificuldade continuam pendentes. Não foram apresentadas como correções concluídas. A passagem elevada da Facility continua cenográfica.
