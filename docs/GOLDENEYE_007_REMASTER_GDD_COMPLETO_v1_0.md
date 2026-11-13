# GOLDENEYE 007 — REMASTERED
## Game Design Document (GDD) completo — versão 1.0

**Documento de design para estudo e prototipagem | Data: 13/11/2026**  
**Base de referência:** *GoldenEye 007*, Nintendo 64 (1997).  
**Proposta:** modernizar a apresentação e a jogabilidade sem perder a identidade, a progressão de missões, as cutscenes, os objetivos e o estilo de espionagem.

> **Escopo e propriedade intelectual.** James Bond, GoldenEye, personagens, história, música e conteúdo original pertencem a seus respectivos titulares. Este é um GDD conceitual de remasterização não oficial, **não** uma licença de uso nem um pacote de assets originais. Não publicar comercialmente nem redistribuir vídeo, músicas, vozes, ROM ou modelos extraídos sem as permissões necessárias. Para publicação pública independente, licenciar os direitos ou converter o documento em uma obra autoral com personagens, nomes e cenas próprios.

> **Regra de fidelidade:** toda cena realmente existente no original deve ser inventariada, decupada e recriada **em encenação equivalente** antes de qualquer cena adicional. As descrições abaixo são *beats de design*, não transcrições literais ou a garantia de que toda fase tenha no original uma sequência cinematográfica longa. O jogo de 1997 conta a história também por briefings, ações e diálogos durante as missões.

---

## 1. VISÃO EXECUTIVA

### 1.1 Objetivo
Criar uma versão modernizada com cara de um FPS tático de espionagem: fluidez atual, animação e cenário refinados, mas com o desenho e ritmo de missões característicos do N64. O jogador deve reconhecer imediatamente corredores, pontos de referência, tipos de desafio, aproximações silenciosas, alarmes, dispositivos de Q, objetivos secundários e fugas.

### 1.2 Pilares de design
1. **Fidelidade reconhecível:** ordem, localização, lógica dos objetivos, encontros relevantes, finais de fases e sequência dos acontecimentos preservados.
2. **Cutscenes preservadas:** abertura/encerramento e ações roteirizadas recriadas e registradas por identificador; opções de visual clássico e apresentação cinematográfica modernizada.
3. **Espionagem acima de tiroteio:** reconhecimento, silencioso/ruidoso, alarmes, interação com computadores, câmeras, cofres, reféns e equipamento.
4. **FPS com precisão moderna:** mouse e teclado, dois analógicos, mira suave, feedback nítido, movimentação responsiva.
5. **Inimigos mais convincentes, não oniscientes:** patrulhas, escuta, busca, percepção de cadáveres, cobertura e comunicação com regras explicáveis.
6. **Leveza e modularidade:** cenários em setores, geometria simples bem iluminada, streaming de assets e preparação para web/PC.
7. **Replay:** dificuldades Agent, Secret Agent e 00 Agent, desbloqueios por tempo, estatísticas, rotas e modos extras.

### 1.3 Público e classificação indicativa
Fãs do clássico, jogadores de FPS de infiltração e de campanhas curtas e rejogáveis. Violência de ação estilizada, sem gore como requisito de design; classificação final depende da execução e jurisdição.

### 1.4 Escopo e plataformas
- **Primário:** campanha solo FPS no PC; execução sugerida no navegador desktop via Three.js/WebGL2 (GitHub Pages) com possibilidade de empacotar como aplicativo de PC.
- **Secundário:** mobile otimizado com controles adaptáveis e, futuramente, multiplayer local/online. Mobile não deve atrasar o vertical slice.
- **Modos de sensação:** `Clássico` (física, ritmo, objetivos e limitações próximas do original) e `Modernizado` (controles, IA e apresentação refinados, sem alterar os eventos da história). Não misturar placares competitivos entre modos.
- **Meta visual:** estilo de remaster HD de era PS2/PS3, preservando silhuetas e planta das salas; opção de filtro retrô.
- **Metas de desempenho, não promessas:** desktop 60 FPS em 1080p na máquina-alvo definida em QA; celulares compatíveis 30 FPS na qualidade baixa.

### 1.5 O que NÃO fazer
- Não transformar os mapas em corredores lineares; não deslocar objetivo principal de sala sem motivo validado.
- Não usar regeneração automática de vida no modo clássico; não criar horda infinita fora das regras de alarme/roteiro.
- Não inserir sprint obrigatório, slide, loot por raridade, crafting, árvore de habilidade nem monetização.
- Não substituir a direção narrativa por longas cinematics genéricas; não fazer Natalya agir como um inimigo ou teleportar para resolver trajetos quebrados.
- Não recriar o jogo como um único arquivo JS/HTML monolítico.

## 2. PESQUISA E DELIMITAÇÃO DO ORIGINAL

A campanha N64 contém **18 fases principais** e **2 fases bônus** (Aztec e Egyptian), nesta ordem: Dam, Facility, Runway, Surface 1, Bunker 1, Silo, Frigate, Surface 2, Bunker 2, Statue, Archives, Streets, Depot, Train, Jungle, Control, Caverns, Cradle, Aztec, Egyptian.

A organização geográfica/histórica agrupa as fases em Arkhangelsk, Severnaya, Kirghizstan, Monte Carlo, Severnaya de retorno, St. Petersburg, Cuba e duas missões bônus. O original emprega briefings de M/Q/Moneypenny, cutscenes curtas de entrada/saída, eventos roteirizados, diálogos no cenário e objetivos que mudam com a dificuldade.

### 2.1 Política de referência
- **FATO ORIGINAL:** terreno, localização principal, personagens e objetivos de missão conforme referências e capturas de gameplay.
- **REMASTER:** melhorias introduzidas neste documento, não presentes necessariamente no original.
- **EXPANSÃO OPCIONAL:** conteúdo extra que não muda o caminho crítico e pode ser desligado.
- Para cada fase, capturar: vídeo de entrada, primeira posição jogável, mapa topológico, todos os gatilhos, telas de briefing, eventos de objetivo, áudio e sequência final.
- Uma cutscene sem evidência de existência no original deve ser marcada `PROPOSTA`, nunca `ORIGINAL`.

### 2.2 Critério de fidelidade
`Fidelidade da missão = ordem dos acontecimentos + funcionalidade dos objetivos + identidade espacial + relações entre personagens + saída correta`. O detalhe estético é modernizável; o funcionamento estratégico das fases deve continuar reconhecível.

## 3. EXPERIÊNCIA DO JOGADOR E LOOP PRINCIPAL

1. Abrir o jogo: checagem de configurações, tela de estúdio própria, animação de entrada temática e menu.
2. Selecionar um slot de agente e entrar no **dossiê**.
3. Escolher fase disponível, dificuldade e modo Clássico/Modernizado.
4. Ler briefing: contexto, M, Q, Moneypenny, objetivos e equipamento autorizado.
5. Exibir intro da missão original reconstruída. O botão `Pular` aparece quando adequado; pular deve aplicar o estado final da sequência.
6. Explorar, desativar vigilância, completar objetivos, proteger aliados, reagir aos guardas.
7. Verificar objetivos completos e entrar na zona de saída exigida; não concluir só por alcançar a saída.
8. Tocar cena de conclusão correspondente ao original; mostrar tela de resultados com tempo, precisão, alarmes, baixas civis e desbloqueios.
9. Salvar progresso e liberar próximo estágio.

### 3.1 Ritmo
- Primeiros 15–30 segundos: orientação espacial e visual do objetivo.
- Depois: múltiplas rotas e oportunidades de furtividade, com consequência real para disparos ruidosos.
- Tensão cresce por reforços, objetivos cronometrados e encontros de personagens.
- Finais: fuga ou clímax com transição cinematográfica, nunca tela preta sem explicação.

### 3.2 Jogabilidade primeiro, espetáculo depois
Toda ação crítica — instalar modem, invadir computador, resgatar refém, fotografar satélite, cortar grade com relógio — deve **funcionar como mecânica interativa**. Cinemáticas complementam, mas não substituem a execução do objetivo.

## 4. INTERFACE, MENUS, HUD E PAUSA

### 4.1 Menu principal — direção visual
Ambiente 3D escuro de inteligência/MI6, luzes controladas e câmera lenta passeando sobre pasta de missão, mapa e relógio. Sem exigir 3D pesado na tela de início: modelos simples, texturas com detalhe e parallax leve.

**Opções:** `Continuar`, `Campanha`, `Selecionar Missão`, `Multijogador` (bloqueado até implementação), `Extras`, `Configurações`, `Créditos`, `Sair` (PC); em web, `Voltar ao portal` em vez de sair. Cursor funcional, teclado, navegação via gamepad e foco visual claro.

### 4.2 Seleção de missão
- Arquivo de agentes com slots separados: 3 no mínimo; suporte para copiar, apagar e confirmar exclusão.
- Grade visual com 20 miniaturas e título da missão; as 2 bônus com regra clara de desbloqueio.
- Painel lateral: local, horário narrativo, foto de referência original/inspirada, recordes e indicadores `Agent / Secret Agent / 00 Agent`.
- Estrelas/carteira de medalhas não substituem a conclusão por dificuldade.
- Dossiê com abas `Contexto`, `M`, `Q`, `Moneypenny`, `Objetivos`, `Equipamento`.
- Botão `Iniciar missão`; carregar assets necessários antes da cutscene.

### 4.3 HUD durante a ação
- Tela limpa: mira central opcional, munição carregador/reserva, armadura/vida em camada discreta, dispositivo contextual.
- Objetivo atualizado por notificação pequena, sem preencher a tela inteira.
- Marcador opcional `contextual`: aparece somente quando próximo do dispositivo; no Clássico, desativado por padrão.
- Ícones de estado: ruído emitido, suspeita e alerta com três níveis; **nunca** um minimapa com todos os inimigos por padrão.
- Aviso de falha de objetivo imediatamente legível e persistente até fechar o painel.

### 4.4 Q Watch / pausa
Relógio 3D de transição curta (ou 2D leve no modo desempenho), com abas `Estado`, `Objetivos`, `Armas e gadgets`, `Mapa esquemático opcional`, `Controles`, `Áudio/Vídeo`, `Retomar`, `Reiniciar`, `Abortar`. Pausa congela simulação, IA, áudio posicional não musical, timers e físicos; não deixa a cutscene continuar por baixo. Confirmar ações destrutivas.

### 4.5 Configurações detalhadas
| Categoria | Controles |
|---|---|
| Vídeo | resolução, escala dinâmica, janela/tela cheia, VSync quando disponível, limite 30/60, FOV 65–110, brilho/gama, contraste, AA, filtro retrô, sombras, SSAO opcional, reflexos limitados |
| Performance | Low/Medium/High/Ultra, distância de visão, densidade de partículas, LOD, qualidade de texturas, física simplificada, indicador FPS |
| Gameplay | Clássico/Modernizado, sensibilidade X/Y, mira invertida, assistência opcional, inclinar, segurar/alternar mirar, dano de aliados, vibração |
| Som | geral, música, armas, diálogos, ambiente, alcance dinâmico, legenda de sons, estéreo/fones |
| Acessibilidade | legendas PT-BR, tamanho e fundo das legendas, daltonismo, contraste de alvos, sem tremor de câmera, opção sem flashing, remapeamento, prompts de objetivo |
| Controles | teclado/mouse, Xbox, PlayStation e gamepad genérico; bindings por ação, deadzone, curvas e sensibilidade por mira |

### 4.6 Controles padrão
| Ação | PC | Controle |
|---|---|---|
| Mover | WASD | analógico esquerdo |
| Câmera | mouse | analógico direito |
| Atirar | botão esquerdo | RT/R2 |
| Mirar/zoom | botão direito | LT/L2 |
| Usar/interagir | E | X/Quadrado |
| Recarregar | R | Y/Triângulo |
| Agachar/levantar | Ctrl | B/Círculo |
| Inclinar esquerda/direita | Q / E ao mirar (configurável) | L3/R3 ou botões remapeáveis |
| Trocar arma | roda do mouse / 1–9 | direcional horizontal |
| Gadget | G | direcional vertical |
| Pausa/Q Watch | Esc/Tab | Menu/Options |

**Conflito Q/E:** inclinar à direita só assume E enquanto mira com opção `inclinar`, ou mapear para Alt+D; o mapeamento sempre pode ser alterado. Suporte a 2 esquemas: moderno e um de nostalgia N64 (sem impor controle antigo).

## 5. CÂMERA, MOVIMENTAÇÃO E COMBATE

### 5.1 Câmera e câmera cinematográfica
- Gameplay **100% em primeira pessoa**. Cenas externas em terceira pessoa somente em intros, saídas e ações cinematográficas autorizadas.
- Câmera com rotação livre, sem sacudida compulsória; FOV ajustável; interpolação independente do frame rate.
- No final da cutscene, blend da câmera para o `PlayerCameraAnchor`, aplicação do snapshot de objetos e soltura de controle.
- Evitar atravessar paredes com arma/câmera; armas próximas da parede baixam levemente.

### 5.2 Movimento — parâmetros iniciais de teste
| Parâmetro | Clássico reinterpretado | Modernizado | Observação |
|---|---:|---:|---|
| Altura do personagem | 1,75 m | 1,75 m | escala técnica do protótipo, não dado canônico |
| Olhos | 1,63 m | 1,63 m | ajustável por animação de agachamento |
| Caminhada | 3,5 m/s | 4,0 m/s | calibrar contra geometria e tempo de conclusão |
| Agachado | 1,7 m/s | 2,0 m/s | diminui ruído e silhueta |
| Deslocamento lateral | 85% da frente | 100% | base de responsividade |
| Sprint | não | opcional e moderado | nunca necessário para objetivo original |
| Aceleração | 12 m/s² | 17 m/s² | evitar sensação de deslizar |

Estas são **hipóteses de balanceamento** para o remake, não medições históricas. O clássico poderá aplicar perfil de movimento verificado por replay.

### 5.3 Sistema de dano
- Vida sem regeneração; armadura como barra separada. Armaduras fixas e compatíveis com o desenho de cada dificuldade.
- Regiões de dano: cabeça (alto), tronco (padrão), braço (baixo + pequena reação), perna (baixo + desequilíbrio ocasional). Proibido forçar desmembramento como requisito.
- Recuo direcional, faísca/impacto conforme material, animações rápidas de reação e sons diferentes por superfície.
- Feedback de alvo sem hitmarker obrigatório; efeitos discretos.
- Sem penalidades injustas de mira: recuo reproduzível, dispersão calibrada e confirmação visual clara.

### 5.4 Arsenal: identidade e função
| Família / exemplos do original | Papel no remake | Renovação |
|---|---|---|
| PP7 e versão silenciada | precisão/furtividade | recuo legível, posição da mão correta, 3 animações de recarga |
| DD44, Magnum | alto dano e ruído | efeito de impacto forte, disparo mais espaçado |
| Klobb, D5K, ZMG, Phantom | combate curto | dispersão progressiva e troca rápida |
| KF7, AR33 | alcance médio | miras limpas, perfil de ricochete limitado |
| RC-P90 | volume de fogo | aquecimento visual do cano, consumo significativo |
| Rifle de precisão | controle de área | zoom ajustável, respiração opcional sem penalidade exagerada |
| Escopetas | combate muito próximo | queda de dano clara com distância |
| Lançador de granadas/foguetes | alvos e turmas difíceis | área de explosão telegráfica e física contida |
| Facas, minas e granadas | furtividade/armadilhas | colisão e tempo deterministicamente simulados |
| Golden Gun, armas bônus | extras/desbloqueios | evitar usá-las como equipamento principal da campanha |

- Preserve a **distribuição de armas por missão** no modo Clássico. Não iniciar toda fase com armamento acumulado entre missões.
- Animações por arma: `equip`, `idle`, `walk_sway`, `aim`, `fire`, `reload_empty`, `reload_tactical`, `melee`, `lower`, `inspect_optional`.
- Duas armas simultâneas somente quando a regra de missão/desbloqueio permite, sem quebrar interações de gadgets.
- Portas, vidros, interruptores, câmeras e alarmes reagem a disparos conforme material e requisitos.

### 5.5 Furtividade e percepção
**Máquina de estados:** `PATROL -> CURIOUS -> INVESTIGATE -> SEARCH -> ALERTED -> COMBAT -> RETURN -> PATROL`, com estados adicionais `STUNNED`, `TAKE_COVER`, `CALL_BACKUP`, `DEAD`.

- Visão: cone horizontal inicial de 95° com checagem de linha de visão; visão periférica menor, detecção por exposição e distância.
- Audição: alcance por categoria (pistola silenciada 3–6 m; passos rápidos 7–12 m; arma ruidosa 20–45 m), atenuação por porta/parede. Valores iniciais para ajuste.
- Luz e sombra influem até um limite; não transformar o jogo em simulador obrigatório de luz.
- Guardas distinguem **posição observada** e **última posição estimada**; perder visão gera busca, não tiro através da parede.
- Sistemas de rádio e alarme: o soldado precisa comunicar ou alcançar um alarme; um guarda não alerta magicamente toda a instalação.
- Reforços têm pontos e orçamento por fase. Pode haver reforços recorrentes onde o original prevê, mas nunca aparecer no campo visual à distância zero.
- Corpos descobertos elevam suspeita; eliminação furtiva é mais fácil que combate aberto, mas não totalmente livre de consequências.
- Guardas preservam postos importantes; não podem todos abandonar o objetivo e perseguir pelo mapa inteiro.

### 5.6 Inimigos e perfis
- `GUARD_PATROL`: patrulha, investiga ruídos, usa pistola/SMG.
- `GUARD_OFFICER`: chama reforços, prioriza alarmes e comunicação.
- `SOLDIER_ASSAULT`: avance/recuo/cobertura simples, flanqueamento limitado.
- `SNIPER`: vigia corredor e telhado, tem janela de reação.
- `HEAVY`: mais armadura, menos velocidade, impacto maior.
- `SCIENTIST`: civil da instalação; foge, obedece ou interage com terminal conforme roteiro.
- `HOSTAGE`: não atira, animação de medo, pode se afastar quando o captor cai.
- `BOSS`: comportamento único e fases de encontro, sem barras de vida gigantes quando incompatíveis com o original.

**Regras de justiça:** jamais ler posição do jogador atrás de obstáculo sem fonte sensorial; teleporte de NPC somente em transição de cena invisível e validada, nunca dentro de confronto.

### 5.7 Companheira Natalya
- Navegação em navmesh com seguimento elástico, prevenção de bloqueio de portas e antecipação de degraus.
- Estados: `FOLLOW`, `HIDE`, `RUN_TO_TERMINAL`, `HACKING`, `UNDER_FIRE`, `RETREAT`, `WAIT_FOR_BOND`, `EXTRACT`.
- Verificar ameaças antes de expor a NPC; ela busca cobertura e não atravessa linha de tiro deliberadamente.
- Botão contextual para pedir `Aguarde` / `Siga` apenas em cenas onde isso não conflita com roteiro.
- Invulnerabilidade temporária só durante cenas sob controle de timeline; na missão, falha por morte deve continuar respeitada.
- Se Natalya ficar presa por `>8 s`, aplicar recuperação de caminho; registrar erro e não teleportar em frente à câmera.

### 5.8 Gadgets de Q
Modem secreto, decodificador, analisador de chave, câmera, rastreador, ladrão de dados, desarmador de bombas, minas remotas, relógio laser e magneto. Cada dispositivo usa o mesmo contrato de interação: `equip -> validar alvo/range -> executar -> confirmar resultado -> atualizar objetivo`.

- `USE_GADGET` deve exigir item correto e alvo correto.
- Ação crítica jamais completa apenas por proximidade sem interação.
- Gadgets não podem ser consumidos duas vezes por toques repetidos.
- Opcional moderno: zoom contextual e animação curta de uso, sem minigame imposto.

## 6. DIREÇÃO DE CUTSCENES — SISTEMA OBRIGATÓRIO

### 6.1 Regra absoluta de preservação
Nenhuma cutscene do original pode ser descartada por conveniência técnica. Para cada fase, coletar e verificar **o que realmente existe no jogo N64**: câmera de aproximação, cena de início, gesto/diálogo em gameplay, roteiro do meio e sequência de vitória/escape. Uma reconstrução pode mudar qualidade de modelos e fluidez, mas não a consequência da cena.

### 6.2 Registro por cena
Cada entrada na planilha `cinematics_manifest.json` terá:
`id`, `phaseId`, `sourceEvidence`, `originalKind` (`INTRO`, `OUTRO`, `IN_WORLD`, `ENDING`, `BONUS`), `preserveBeat`, `timeline`, `characters`, `cameraPath`, `animationClips`, `audioCues`, `subtitles`, `gameplayLock`, `startState`, `endState`, `skipPolicy`, `tested`.

### 6.3 Perfil de exibição
- **Fiel:** enquadramento e duração comparáveis ao N64, ajustando apenas suavidade e resolução.
- **Cinema HD:** mesmos eventos com câmeras mais suaves, gestos faciais e iluminação moderna; diferenças de duração controladas.
- **Expansão cinematográfica (opcional):** cenas adicionais curtas antes/depois do material essencial; não são parte histórica do jogo.

### 6.4 Pular, repetir e salvar
- Cinemática pode ser pulada por `Segurar Pular` por 0,5 s, evitando toque acidental.
- Pular aplica o `endState`: chaves obtidas, NPCs posicionados, armas/dano corretos, portas fechadas/abertas, áudio de combate, objetivo alterado e câmera restaurada.
- Cena no meio da missão tem `resumeAnchor` e retoma exato estado simulado.
- Biblioteca `Galeria de Cenas` liberada por missão concluída, separando `Original reconstruída` de `Extra proposto`.
- Legendas em PT-BR, com idioma e duração ajustáveis. Não reutilizar áudio original sem direito de uso.

### 6.5 Pipeline de fidelidade
1. Capturar gameplay de referência próprio e validar o conteúdo com o original.
2. Criar storyboard simples de todas as tomadas presentes.
3. Modelar bonecos e cenário usando escala real do novo projeto.
4. Fazer animatic com placeholders para tempo e posicionamento.
5. Animar rig, olhar, mãos, armas, portas e efeitos.
6. Sincronizar câmera, áudio, evento lógico e transição para gameplay.
7. Comparar `origem x remake` lado a lado por marcos de evento e duração.
8. Testar caminho normal, pular, reiniciar, entrar na missão novamente e frame rate baixo.

### 6.6 Exemplo de timeline de implementação — bungee no Dam
`DAM_OUTRO_01` (original a verificar): término dos objetivos -> chegada ao corrimão/plataforma -> movimento de Bond -> preparação do salto -> salto visual -> fade/gancho para fase seguinte. A apresentação não deve exigir uma física de corda completa para funcionar; timeline precisa reproduzir o marco visual e fazer transição sem travar.

### 6.7 Princípios cinematográficos
- Evitar câmera atravessar parede, arma flutuar ou personagem entrar em T-pose.
- Travar controles **somente** durante a timeline; esconder HUD; não acumular entradas de tiro no retorno.
- Iluminação/som do cenário persistem coerentes entre tomada externa e FPS.
- Extras opcionais não podem contradizer a história, eliminar um objetivo ou mudar o motivo da missão seguinte.

## 7. CAMPANHA COMPLETA — 20 FASES

**Convenção:** `Objetivos essenciais` resume o **conjunto máximo inspirado em 00 Agent**; Agent/Secret Agent selecionam subconjuntos exatos após validação por fonte. `Cenas` descreve o que precisa ser **preservado/decupado** e sugere tratamento modernizado, sem afirmar que cada beat corresponde a um clipe longo no N64. `Adição opcional` não altera a história. O padrão é ter briefing antes, saída após objetivos e resultado.

### Arcos narrativos
- **Arco I — Arkhangelsk:** infiltração, agentes 007/006, sabotagem e fuga.
- **Arco II — Severnaya/Kirghizstan:** satélite GoldenEye, inteligência e descoberta de infraestrutura.
- **Arco III — Monte Carlo e retorno:** helicóptero Pirate e operação de Natalya.
- **Arco IV — St. Petersburg:** Janus, Valentin, traição e perseguição.
- **Arco V — Cuba:** confronto final e bloqueio da arma orbital.
- **Bônus:** Aztec e Egyptian, desbloqueios independentes do final principal.

### 7.01 — DAM — Represa de Byelomorye

**Local:** Arkhangelsk · entrada do complexo  
**Função dramática:** Aproximação clandestina pela represa, avanço pelo posto de guarda e travessia até a plataforma de salto.

**Objetivos essenciais (base 00 Agent):** Neutralizar alarmes; instalar modem secreto; interceptar backup de dados; chegar ao salto de bungee.

**Layout e identidade visual:** Guaritas, pontes, torres, salas de controle e acesso à plataforma. Preservar a geografia legível e o ponto do salto.

**Cenas/cutscenes a preservar e modernizar:** Intro: chegada de Bond à área controlada, enquadramento inicial e transferência para FPS. Durante: uso do modem e sistema de alarmes. Outro: salto de bungee reconstruído com câmera e transição fluida.

**Melhorias concretas:** Ruído de vento e reverberação sobre água; vigias orientados por postos; explosões locais discretas; cobertura nas guaritas sem mover os objetivos.

**Critérios de aceitação:** Validação: destruir alarmes corretos, instalar modem no alvo certo, recuperar dados e impedir finalização sem todos os objetivos exigidos.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.02 — FACILITY — Instalação química

**Local:** Arkhangelsk · laboratório  
**Função dramática:** Infiltração pela ventilação e sanitários, identificação do contato, encontro com 006 e sabotagem dos tanques.

**Objetivos essenciais (base 00 Agent):** Entrar no laboratório; contatar Dr. Doak; encontrar 006; destruir tanques; minimizar mortes de cientistas.

**Layout e identidade visual:** Banheiros, corredores estreitos, laboratórios, salas de controle, portas eletrônicas e depósito de tanques.

**Cenas/cutscenes a preservar e modernizar:** Intro: passagem da ventilação à instalação. Durante: conversa/contato com Dr. Doak e encontro roteirizado com Trevelyan. Outro: evento de sabotagem e fuga com destino coerente.

**Melhorias concretas:** IA de cientistas não combatentes; escolta de guardas; portas com leitor; gás/alarme visual leve quando a sabotagem inicia.

**Critérios de aceitação:** Teste: Doak acessível por rota prevista, gadget de porta funcional, Trevelyan no ponto correto, destruição de todos os tanques e contagem de cientistas.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.03 — RUNWAY — Pista de pouso

**Local:** Arkhangelsk · rota de escape  
**Função dramática:** Obter chave e alcançar a aeronave enquanto neutraliza armamentos de defesa da pista.

**Objetivos essenciais (base 00 Agent):** Encontrar chave da ignição; destruir armas pesadas; destruir bateria de mísseis; escapar de avião.

**Layout e identidade visual:** Campo aberto, torre, hangar, blindados, área de bateria antiaérea e avião de saída.

**Cenas/cutscenes a preservar e modernizar:** Intro: saída urgente do complexo. Durante: entrada em veículo se escolhida. Outro: sequência do avião saindo da pista, com tomada externa e transição.

**Melhorias concretas:** Veículo tanque opcional conforme missão; poeira, fumaça, som de turbina, inimigos com postos definidos em vez de spawns aleatórios.

**Critérios de aceitação:** Teste: entrar no avião antes de neutralizar a bateria não conclui; chave é exigida; disparos do tanque e colisões não quebram o objetivo.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.04 — SURFACE 1 — Campo nevado

**Local:** Severnaya · primeira infiltração  
**Função dramática:** Explorar base na neve, reduzir as comunicações e acessar a entrada camuflada da estação.

**Objetivos essenciais (base 00 Agent):** Desligar antena de comunicações; obter chave do cofre; pegar planos; entrar pela torre de ventilação.

**Layout e identidade visual:** Neve extensa, céu encoberto, torres de rádio, cabanas e acessos subterrâneos.

**Cenas/cutscenes a preservar e modernizar:** Intro: aproximação na neve. Durante: computadores/antena. Outro: entrada na ventilação.

**Melhorias concretas:** Neve em partículas simples; marcas de passos opcionais; silhuetas e holofotes legíveis na distância; som ambiente de vento.

**Critérios de aceitação:** Teste: caminhos alternativos da neve preservados; chave abre cofre correto; só a entrada certa encerra missão.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.05 — BUNKER 1 — Centro de controle

**Local:** Severnaya · inteligência  
**Função dramática:** Infiltração discreta em salas técnicas e extração de dados do sistema GoldenEye.

**Objetivos essenciais (base 00 Agent):** Interromper vigilância; copiar chave GoldenEye e manter o original; forçar ativação de computador; baixar dados; fotografar tela central.

**Layout e identidade visual:** Salas de monitores, vigilância, corredores de concreto, câmeras e mesas de operadores.

**Cenas/cutscenes a preservar e modernizar:** Intro: chegada ao bunker. Durante: agente/copiar chave, fotografia e interação no terminal. Outro: conclusão da extração.

**Melhorias concretas:** Guardas usam rádio e câmeras com cone visível apenas em assistência opcional; terminais com display reproduzível e sem textos minúsculos.

**Critérios de aceitação:** Teste: foto registra alvo e ângulo válidos; chave original não some incorretamente; terminal não dispara objetivo duplicado.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.06 — SILO — Instalação de lançamento

**Local:** Kirghizstan · missão cronometrada  
**Função dramática:** Infiltrar instalação de foguetes, coletar provas e instalar explosivos antes da evacuação.

**Objetivos essenciais (base 00 Agent):** Plantar explosivos em salas de combustível; fotografar satélite; obter telemetria; recuperar circuitos; minimizar mortes de cientistas.

**Layout e identidade visual:** Silos verticais, passarelas, salas técnicas, elevadores e áreas de combustível.

**Cenas/cutscenes a preservar e modernizar:** Intro: infiltração no complexo. Durante: encontro/retirada de Ourumov e pressão de tempo. Outro: corrida ao elevador com a instalação sob risco.

**Melhorias concretas:** Alarme gradual, luzes vermelhas, fumaça e tremor visual opcional; timer só após gatilho verificado e não adiantado por carregamento.

**Critérios de aceitação:** Teste: todos os locais de explosivo são alcançáveis; cientistas contabilizados; cronômetro congela na pausa e falha no fim previsto.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.07 — FRIGATE — Fragata no porto

**Local:** Monte Carlo · resgate  
**Função dramática:** Libertar reféns e rastrear o helicóptero roubado sem provocar baixas civis.

**Objetivos essenciais (base 00 Agent):** Resgatar reféns; desarmar bomba na ponte; desarmar bomba na sala de máquinas; instalar rastreador no helicóptero.

**Layout e identidade visual:** Conveses, passarelas estreitas, cabines, ponte, máquinas e convés de helicóptero.

**Cenas/cutscenes a preservar e modernizar:** Intro: aproximação ao navio. Durante: resgate de reféns e desarme dos dispositivos. Outro: saída do navio após marcar o helicóptero.

**Melhorias concretas:** Reféns reagem a disparos; inimigos usam cobertura de caixas e portas; animações legíveis de rendição e corrida.

**Critérios de aceitação:** Teste: eliminar captor não mata refém por script; bombas permanecem desarmadas; rastreador confirma no helicóptero correto.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.08 — SURFACE 2 — Retorno à neve

**Local:** Severnaya · contraoperação  
**Função dramática:** Revisitar local familiar sob segurança intensificada e cortar reforços exteriores.

**Objetivos essenciais (base 00 Agent):** Desativar vigilância; interromper enlace com bunker; neutralizar aeronave de apoio; entrar no bunker.

**Layout e identidade visual:** Mesma identidade topológica do Surface 1, com mudanças de iluminação, novas patrulhas e bloqueios.

**Cenas/cutscenes a preservar e modernizar:** Intro: chegada à zona sob maior risco. Durante: cortes de comunicação. Outro: transição para bunker.

**Melhorias concretas:** Nevasca mais densa e visibilidade controlada sem cegar o jogador; holofotes e drones/câmeras reinterpretados com fidelidade.

**Critérios de aceitação:** Teste: reutilizar base do mapa sem perder marcos; vigilância não alcança através de paredes; helicóptero não sobrevive se objetivo concluído.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.09 — BUNKER 2 — Fuga com Natalya

**Local:** Severnaya · resgate  
**Função dramática:** Escapar da detenção, recuperar provas e retirar Natalya do bunker.

**Objetivos essenciais (base 00 Agent):** Comparar registros de funcionários e baixas; recuperar fita de vídeo; destruir câmeras; recuperar manual; fugir com Natalya.

**Layout e identidade visual:** Celas, arquivo, câmeras, corredores estreitos e saída controlada.

**Cenas/cutscenes a preservar e modernizar:** Intro: situação de confinamento. Durante: libertação de Natalya, diálogo contextual e ida ao painel. Outro: fuga conjunta.

**Melhorias concretas:** NPC aliada usa cobertura e aguarda quando necessário; interface clara para arquivos e fita; reforços de alarme limitados.

**Critérios de aceitação:** Teste: Natalya acompanha e chega viva; sua rota não trava nas portas; a fuga nunca conclui se ela ficar no bunker.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.10 — STATUE — Parque das estátuas

**Local:** St. Petersburg · investigação  
**Função dramática:** Encontrar Valentin, entender o contato com Janus, localizar Natalya e recuperar prova do helicóptero.

**Objetivos essenciais (base 00 Agent):** Falar com Valentin; confrontar Janus; localizar helicóptero; resgatar Natalya; achar gravador de voo.

**Layout e identidade visual:** Parque escuro com estátuas, túneis, plataformas e clareiras ligadas por caminhos reconhecíveis.

**Cenas/cutscenes a preservar e modernizar:** Intro: Bond se aproxima do parque. Durante: encontro com Valentin e revelação de Janus; descoberta do helicóptero e Natalya. Outro: extração narrativa.

**Melhorias concretas:** Neblina volumétrica falsa (planos/sprites) de baixo custo, silhuetas de pedra bem iluminadas e áudio direcional para localização.

**Critérios de aceitação:** Teste: contatos precisam aparecer no roteiro correto; cenas não pulam objetivo; gravador só se torna disponível no momento apropriado.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.11 — ARCHIVES — Arquivos militares

**Local:** St. Petersburg · evasão  
**Função dramática:** Fugir do interrogatório e resgatar Natalya sem perder a caixa-preta.

**Objetivos essenciais (base 00 Agent):** Escapar da sala de interrogatório; encontrar Natalya; recuperar caixa-preta; sair com Natalya.

**Layout e identidade visual:** Salas de documentos, biblioteca, escadarias, corredores estreitos e acesso final.

**Cenas/cutscenes a preservar e modernizar:** Intro: começo do interrogatório. Durante: fuga e encontro com Natalya. Outro: retirada conjunta.

**Melhorias concretas:** Papel solto econômico, móveis simples com boas texturas, inimigos reagindo a portas e ruídos em pavimentos diferentes.

**Critérios de aceitação:** Teste: arma inicial/cena de escape coerentes; Natalya não perde caminho na escada; caixa-preta não desaparece.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.12 — STREETS — Ruas da cidade

**Local:** St. Petersburg · perseguição  
**Função dramática:** Perseguir Ourumov e Natalya, utilizando tanque quando necessário sem atingir civis.

**Objetivos essenciais (base 00 Agent):** Encontrar Valentin; perseguir Ourumov e Natalya; minimizar baixas civis.

**Layout e identidade visual:** Ruas largas, interseções, barreiras, edifícios históricos e rota de tanque.

**Cenas/cutscenes a preservar e modernizar:** Intro: saída dos arquivos. Durante: contato com Valentin e perseguição; presença do tanque. Outro: transição para o depósito.

**Melhorias concretas:** Tanque com direção e câmera modernas, colisão confiável, sinalização visual de civis e partículas simples de destruição.

**Critérios de aceitação:** Teste: civis atingidos pelo tanque contam; rota segue marcos previstos; jogador consegue concluir a pé ou em veículo conforme regras.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.13 — DEPOT — Depósito militar

**Local:** St. Petersburg · entrada do trem  
**Função dramática:** Destruir infraestrutura de armas de Janus e encontrar o trem de fuga.

**Objetivos essenciais (base 00 Agent):** Destruir estoque de armas ilegais; destruir rede de computadores; obter chave do cofre; recuperar planta do helicóptero; localizar trem.

**Layout e identidade visual:** Galpões, contêineres, plataformas, pátio ferroviário e salas de escritório.

**Cenas/cutscenes a preservar e modernizar:** Intro: infiltração industrial. Durante: destruição coordenada de equipamentos. Outro: acesso ao trem.

**Melhorias concretas:** Materiais metálicos e efeitos de explosão baixos; posicionamento coerente de sentinelas; caminhos alternativos sem reduzir objetivos.

**Critérios de aceitação:** Teste: computadores e cargas são entidades distintas; abrir cofre não conclui sem blueprint; o trem é a saída efetiva.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.14 — TRAIN — Trem blindado

**Local:** St. Petersburg · confronto  
**Função dramática:** Avançar entre vagões, resgatar Natalya, obter localização da base de Janus e escapar.

**Objetivos essenciais (base 00 Agent):** Destruir unidades de freio; salvar Natalya; descobrir a base; descobrir senha de Boris; fugir em segurança.

**Layout e identidade visual:** Vagões com compartimentos diferenciados, portas, passagens e último vagão para confronto.

**Cenas/cutscenes a preservar e modernizar:** Intro: infiltração do trem. Durante: confronto com Ourumov/Xenia/Trevelyan, resgate e terminal com Boris. Outro: escape com laser do relógio e sequência externa.

**Melhorias concretas:** Padrão suave de vibração do trem, janelas com cenário em movimento sem looping brusco; recorte de grade com feedback de progresso.

**Critérios de aceitação:** Teste: refém não morre por tiro atravessando aliado; evento de senha é válido; timer de fuga não inicia antes do gatilho; laser corta cada ponto necessário.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.15 — JUNGLE — Selva cubana

**Local:** Cuba · aproximação à base  
**Função dramática:** Atravessar mata hostil, destruir torres de defesa e enfrentar Xenia enquanto Natalya acompanha.

**Objetivos essenciais (base 00 Agent):** Destruir armas automáticas; derrotar Xenia; destruir depósito de munição; escoltar Natalya à base.

**Layout e identidade visual:** Vegetação, caminhos de terra, ponte, cursos de água e portas da base.

**Cenas/cutscenes a preservar e modernizar:** Intro: chegada e inserção na floresta. Durante: emboscada/combate com Xenia na área correspondente. Outro: entrada na base com Natalya.

**Melhorias concretas:** LOD agressivo de folhagem, sons de pássaros, neblina limitada, inimigos distinguíveis do fundo e animações de Xenia responsivas.

**Critérios de aceitação:** Teste: armamentos automatizados desativáveis, boss alcançável sem bloqueio, Natalya não morre por seguir Bond até fogo sem cobertura.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.16 — CONTROL — Centro de controle

**Local:** Cuba · neutralização orbital  
**Função dramática:** Proteger Natalya enquanto ela sabota o sistema GoldenEye e destruir os componentes críticos.

**Objetivos essenciais (base 00 Agent):** Proteger Natalya; desativar o satélite; destruir mainframes blindados.

**Layout e identidade visual:** Sala de comando vertical, passarelas, elevadores, terminais e posições de defesa com linhas de tiro controláveis.

**Cenas/cutscenes a preservar e modernizar:** Intro: entrada no centro. Durante: encontro com Boris e operação de Natalya sob ataque. Outro: falha do controle orbital e saída para a área seguinte.

**Melhorias concretas:** Inimigos partem de pontos definidos; Natalya sinaliza tempo de hack; som reativo de alarmes, terminais e sistema de comunicação.

**Critérios de aceitação:** Teste: não concluir com Natalya morta; progressão de hack não reinicia; mainframes são destruídos conforme regra; reforços não surgem sobre o player.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.17 — CAVERNS — Cavernas de água

**Local:** Cuba · sabotagem industrial  
**Função dramática:** Destruir a infraestrutura hidráulica da instalação e comunicar a extração.

**Objetivos essenciais (base 00 Agent):** Destruir controles de bombas de entrada; destruir controles de saída; destruir console mestre; usar rádio para contatar Jack Wade; minimizar mortes de cientistas.

**Layout e identidade visual:** Água, passarelas, turbinas, tubulações, elevadores, salas técnicas e rádio da missão.

**Cenas/cutscenes a preservar e modernizar:** Intro: entrada no sistema hídrico. Durante: rádio e sabotagem de consoles. Outro: acesso ao complexo da antena.

**Melhorias concretas:** Água em shader leve, reflexos aproximados, som de máquinas e partículas de vapor locais; rádio com indicação visual suficiente.

**Critérios de aceitação:** Teste: explosão antecipada não destrói o rádio sem feedback claro; bombas têm IDs únicos; civis/cientistas contabilizados; saída validada.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.18 — CRADLE — Antena gigante

**Local:** Cuba · final principal  
**Função dramática:** Enfrentar Trevelyan nas passarelas da antena e encerrar a ameaça Janus.

**Objetivos essenciais (base 00 Agent):** Destruir console de controle; alcançar e derrotar Trevelyan.

**Layout e identidade visual:** Passarelas metálicas expostas, torre/antena, plataformas, estruturas de apoio e ponto de clímax.

**Cenas/cutscenes a preservar e modernizar:** Intro: chegada à antena. Durante: perseguição e confrontos com Trevelyan em locais roteirizados. Outro: desfecho principal e sequência final da campanha.

**Melhorias concretas:** Medidas de segurança para quedas, animações de boss sem teleporte visível, vento forte e câmera cinematográfica na conclusão.

**Critérios de aceitação:** Teste: boss passa pelas etapas certas e não ressuscita indevidamente; console obrigatório; fim só desbloqueia após a cena final válida.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.19 — AZTEC — Complexo secreto (bônus)

**Local:** Missão bônus · instalação espacial  
**Função dramática:** Encontrar sistema de orientação espacial, reprogramar lançamento e sair da área.

**Objetivos essenciais (base 00 Agent):** Reprogramar orientação da nave; executar lançamento.

**Layout e identidade visual:** Templos/paredes industriais, passagens ocultas, hangares e plataforma do veículo espacial.

**Cenas/cutscenes a preservar e modernizar:** Intro/Outro bônus: estabelecer a instalação especial e o lançamento; manter visual e eventos distintos da narrativa principal.

**Melhorias concretas:** Inimigos de elite, segurança reforçada, portas secretas, efeitos de plataforma sem custo alto de física.

**Critérios de aceitação:** Teste: rotas e terminais corretos; sequência de lançamento não quebra se a cena for pulada; desbloqueio bônus separado do final da campanha.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

### 7.20 — EGYPTIAN — Templo secreto (bônus)

**Local:** Missão bônus · desafio final  
**Função dramática:** Resolver trajeto do templo, obter Golden Gun e derrotar Baron Samedi.

**Objetivos essenciais (base 00 Agent):** Obter a Golden Gun; derrotar Baron Samedi.

**Layout e identidade visual:** Salas simétricas, armadilhas espaciais, piso/padrão de solução e arenas do oponente.

**Cenas/cutscenes a preservar e modernizar:** Intro/Outro bônus: apresentação estilizada do templo; sequências de aparição/confronto com Samedi; conclusão bônus não modifica o final de Cuba.

**Melhorias concretas:** Puzzles com feedback espacial, material de pedra, animações de boss reconhecíveis e leitura dos ataques.

**Critérios de aceitação:** Teste: caminho de puzzle sempre pode ser concluído; arma dourada liberada apenas pelo mecanismo correto; boss encerra na etapa final.

**Extensões opcionais, apenas após fidelidade:** colecionável de inteligência ou diálogo ambiental curto que **não** mude objetivos, rotas obrigatórias ou cronologia.

## 8. MATRIZ DE PRESERVAÇÃO DAS CENAS

**Atenção:** nomes de eventos abaixo são identificadores de produção **criados para o remake**. Não significam que existe no N64 uma animação longa com exatamente aquele conteúdo. `VERIFICAR_ORIGINAL` exige vídeo/registro comparativo antes da aprovação.

| Fase | ID de intro | ID de evento dentro da fase | ID final | Fonte exata validada? |
|---|---|---|---|---|
| Dam | `DAM_INTRO` | `DAM_MODEM` | `DAM_BUNGEE` | VERIFICAR_ORIGINAL |
| Facility | `FAC_INTRO` | `FAC_DOAK_006` | `FAC_ESCAPE` | VERIFICAR_ORIGINAL |
| Runway | `RUN_INTRO` | `RUN_TANK` | `RUN_PLANE` | VERIFICAR_ORIGINAL |
| Surface 1 | `SUR1_INTRO` | `SUR1_DISH` | `SUR1_VENT` | VERIFICAR_ORIGINAL |
| Bunker 1 | `BUN1_INTRO` | `BUN1_KEYCOPY` | `BUN1_EXIT` | VERIFICAR_ORIGINAL |
| Silo | `SIL_INTRO` | `SIL_OURUMOV` | `SIL_LIFT` | VERIFICAR_ORIGINAL |
| Frigate | `FRI_INTRO` | `FRI_HOSTAGE` | `FRI_EXIT` | VERIFICAR_ORIGINAL |
| Surface 2 | `SUR2_INTRO` | `SUR2_RADIO` | `SUR2_ENTRY` | VERIFICAR_ORIGINAL |
| Bunker 2 | `BUN2_INTRO` | `BUN2_NATALYA` | `BUN2_ESCAPE` | VERIFICAR_ORIGINAL |
| Statue | `STA_INTRO` | `STA_JANUS` | `STA_END` | VERIFICAR_ORIGINAL |
| Archives | `ARC_INTRO` | `ARC_NATALYA` | `ARC_ESCAPE` | VERIFICAR_ORIGINAL |
| Streets | `STR_INTRO` | `STR_TANK` | `STR_END` | VERIFICAR_ORIGINAL |
| Depot | `DEP_INTRO` | `DEP_SABOTAGE` | `DEP_TRAIN` | VERIFICAR_ORIGINAL |
| Train | `TRN_INTRO` | `TRN_HOSTAGE` | `TRN_ESCAPE` | VERIFICAR_ORIGINAL |
| Jungle | `JUN_INTRO` | `JUN_XENIA` | `JUN_ENTRY` | VERIFICAR_ORIGINAL |
| Control | `CON_INTRO` | `CON_BORIS_HACK` | `CON_EXIT` | VERIFICAR_ORIGINAL |
| Caverns | `CAV_INTRO` | `CAV_RADIO` | `CAV_EXIT` | VERIFICAR_ORIGINAL |
| Cradle | `CRA_INTRO` | `CRA_TREVELYAN` | `CRA_ENDING` | VERIFICAR_ORIGINAL |
| Aztec | `AZT_INTRO` | `AZT_GUIDANCE` | `AZT_LAUNCH` | VERIFICAR_ORIGINAL |
| Egyptian | `EGY_INTRO` | `EGY_SAMEDI` | `EGY_BONUS_END` | VERIFICAR_ORIGINAL |

### 8.1 Exemplos de shot list recomendada (proposta de remaster)
**DAM_BUNGEE:** plano aberto da represa → aproximação de Bond → foco nas mãos/equipamento → salto em plano geral → corte para a transição seguinte. Respeitar a essência e o momento exato do salto.

**FAC_DOAK_006:** contato com Dr. Doak é um evento jogável (não tirar controle onde o original não tira) → chegada de 006 como evento do nível → encenação de confronto no ponto da história → retorno ao FPS.

**TRN_HOSTAGE:** plano de tensão do compartimento → foco na posição dos reféns/inimigos → movimento/resposta de Bond guiado por gameplay → janela de fuga e uso do laser. Não usar longa cena não-interativa para resolver a mira do jogador.

**CRA_ENDING:** confronto final terminado pelo jogador → animação de desfecho → estabelecimento do resultado da missão → créditos/final da campanha. Falha de renderização do boss nunca pode impedir créditos.

### 8.2 Checklist por cena
- [ ] Fonte em vídeo analisada e metadados registrados
- [ ] Personagens, roupas e armas correspondentes ao momento
- [ ] Gatilho e condição de saída identificados
- [ ] Tomadas e duração principais mapeadas
- [ ] Áudio/legendas sincronizados
- [ ] Nenhum diálogo decisivo perdido
- [ ] Teste do botão `Pular`
- [ ] Objetivos e NPCs corretos após pular
- [ ] Teste com 30 e 60 FPS
- [ ] Comparação antes/depois aprovada

## 9. OBJETIVOS, DIFICULDADES E REJOGABILIDADE

### 9.1 Dificuldades
| Modo | Ideia | Objetivos | Resistência, precisão e recursos |
|---|---|---|---|
| Agent | entrada | conjunto mínimo do original | inimigos mais permissivos, recursos de apoio conforme mapa |
| Secret Agent | intermediário | acrescenta objetivos da matriz original | menos tolerância a erro |
| 00 Agent | domínio do jogo | conjunto máximo do original | mais perigo, mais câmeras/pressão, menos armadura conforme referência |
| Custom (extra) | treino/acessibilidade | usuário escolhe | não contabiliza recordes oficiais |

**IMPORTANTE:** número e conteúdo de objetivos por dificuldade devem ser copiados de uma **tabela de verificação** contra referência jogável. O conjunto 00 Agent nesta versão do GDD serve de cobertura, não substitui a tabela histórica de cada modo.

### 9.2 Sistema de objetivos
Cada objetivo armazena `LOCKED`, `ACTIVE`, `COMPLETED`, `FAILED`, com `requiredOnDifficulty`, condição de ativação, pré-requisitos, e falha. O HUD não deve marcar `COMPLETED` se a ação exigida não aconteceu. Objetivos de proteger cientista/refém precisam de contador individual e limite validado.

### 9.3 Checkpoints e salvamento
- **Modo Clássico:** sem checkpoints automáticos em meio à fase, salvo recurso de acessibilidade explicitamente habilitado que separa o recorde.
- **Modo Modernizado:** checkpoint opcional após grandes subobjetivos (nunca em timer crítico ou dentro de cutscene). Estado salvo inclui alarmes, guardas mortos, NPCs, munição, portas, dispositivos e timers.
- Recomeçar missão sempre restaura estado inicial limpo. O progresso fora da fase (desbloqueios, recordes, conclusão por modo) persiste.

### 9.4 Estatísticas e desbloqueios
Tempo de conclusão, tiros, acertos, precisão, alarmes, mortes civis, baixas, dano recebido, objetivos opcionais e medalha por modo. Cheats clássicos e armas extras exigem desafios próprios, previamente mapeados. Dificuldade livre não pode premiar medalha de 00 Agent.

### 9.5 Falha honesta
Mostrar **qual** objetivo falhou e **por quê**: cientista morto, Natalya morta, alarme crítico, tempo, explosão, objeto essencial destruído. Em falha irreversível, oferecer `Reiniciar` ou `Continuar explorando` com aviso (se possível), sem falso progresso.

## 10. MULTIJOGADOR — FASE POSTERIOR

Preservar o espírito de 2–4 jogadores do original, mas **não** tentar construir rede antes da campanha/IA estarem estáveis.

### 10.1 MVP multijogador
- 2 jogadores local por tela dividida em PC com controles independentes.
- Arenas originais verificadas em reinterpretação HD (Library, Complex, Temple, Facility, Archives etc. conforme autorização de conteúdo).
- Regras: deathmatch, armas por categoria, respawn com intervalo e proteção curta, limites de tempo/pontos e seleção de personagens.
- Divisão vertical/horizontal configurável e resolução dinâmica por viewport.

### 10.2 Evolução
3–4 jogadores local, presets clássicos (ex.: License to Kill), bots honestos, lobbies online regionais e servidores autoritativos. Anti-cheat mínimo, interpolação, rollback ou reconciliação apenas se desempenho permitir. **Não prometer** online no MVP.

### 10.3 Integridade
Nenhum jogador deve controlar NPCs da campanha ou acessar menu de pausa de todos sem consenso; não misturar saves de campanha com partidas multiplayer.

## 11. ARTE, PERSONAGENS, ANIMAÇÃO E SOM

### 11.1 Estilo visual
- **Remaster PS2+/HD:** modelagem geométrica legível, proporções realistas, texturas nítidas e superfícies PBR simplificadas, sem ultra-realismo pesado.
- Paleta por missão: cinza/azul na represa, verde clínico na instalação, branco/frio na neve, âmbar/azul no navio, verde escuro na selva, vermelho de alerta no controle, azul industrial nas cavernas.
- Modo retrô: redução de resolução interna, filtragem pontual, contraste e animação mais rígida opcionais; o player escolhe.
- Edifícios marcantes devem manter volume/silhueta, mesmo quando recebem mais detalhes.

### 11.2 Padrão de modelos e rig
- Personagens principais: ~8–18 mil triângulos no LOD0 (meta de produção para web); LOD1 4–8 mil; LOD2 1–3 mil. Guarda comum: ~5–10 mil LOD0.
- Rig humanoide compartilhado com retarget: `idle`, `walk`, `run`, `strafe`, `crouch`, `shoot`, `reload`, `aim`, `hit`, `fall`, `death`, `interact`, `cover`, `raise_alarm`, `surrender`.
- Mãos e armas separados para primeira pessoa; shadow body simplificado, não duplicar skin completa desnecessariamente.
- Cutscene recebe expressões faciais mínimas, sincronismo labial opcional e foco de olhar.
- Congelar, cair, morrer e sair de cena devem preservar colisão e nunca deixar T-pose visível.

### 11.3 Cenários
Assets modulares: kits de concreto, canos, portas, trincos, guarda-corpos, computadores, cabos, neve e móveis. Materiais instanciados e texturas de 512–2048px conforme proximidade. Cenário distante com LOD/proxies ou skybox, não geometria de alta complexidade.

### 11.4 VFX
Disparo, cápsulas limitadas em pool, faíscas, fumaça curta, vidro quebrado leve, neve em GPU ou planos, poeira, explosão com decalques limitados. Proibido partículas ilimitadas, pós-processamento obrigatório ou luz dinâmica por cada projétil.

### 11.5 Áudio
- Camadas de música `stealth`, `combat`, `climax` conforme estado de alarme, preservando **a função dramática** das transições musicais originais. Música protegida exige licença; para obra pública independente compor temas próprios.
- Sons espaciais de passos, explosões, recargas, portas, operadores, rádio e maquinaria.
- Sons de alarme propagam influência para IA apenas por evento lógico; reduzir volume de áudio não altera detecção.
- Dublagem nova apenas com autorização de personagens/diálogos e vozes próprias contratadas; nunca imitação enganosa de atores.
- Legendas de interações críticas: `Alarme ativado`, `Servidor copiado`, `Natalya precisa de cobertura`.

## 12. ARQUITETURA TÉCNICA SUGERIDA (THREE.JS / GITHUB PAGES)

> Esta arquitetura é uma **proposta** compatível com o objetivo de projeto web. O GDD permanece utilizável em Godot, Unity ou engine própria desde que os contratos dos sistemas sejam mantidos.

### 12.1 Separação obrigatória
```text
src/
  main.ts
  core/
    Game.ts                   # ciclo fixo / render
    SceneRouter.ts
    EventBus.ts
    Clock.ts
    SaveRepository.ts
    InputMap.ts
    Accessibility.ts
  player/
    PlayerController.ts
    WeaponController.ts
    PlayerHealth.ts
    CameraRig.ts
  combat/
    Ballistics.ts
    DamageSystem.ts
    WeaponData.ts
    Explosions.ts
  ai/
    AgentBrain.ts
    Perception.ts
    AlarmNetwork.ts
    SquadDirector.ts
    CompanionNatalya.ts
    NavGraph.ts
  mission/
    MissionLoader.ts
    ObjectiveGraph.ts
    TriggerSystem.ts
    MissionState.ts
    DifficultyResolver.ts
  cinematic/
    TimelineRunner.ts
    CutsceneRegistry.ts
    CameraTracks.ts
    SubtitleController.ts
    SkipStateApplier.ts
  world/
    ChunkManager.ts
    LevelCollision.ts
    LODManager.ts
    Interactable.ts
    Doors.ts
    Destructibles.ts
  ui/
    MainMenu.ts
    MissionSelect.ts
    Dossier.ts
    QWatch.ts
    HUD.ts
    Results.ts
  audio/
    AudioBus.ts
    MusicDirector.ts
  render/
    GraphicsPresets.ts
    EffectsPool.ts
    Materials.ts
  data/
    missionIndex.ts
    weapons.json
    enemies.json
    cinematicManifest.json
    objectives/*.json
  scenes/
    dam/
    facility/
    runway/
    ... outras missões
public/
  assets/
    shared/characters/
    shared/weapons/
    shared/audio/
    levels/dam/
    levels/facility/
    ...
  manifest.webmanifest
  icons/
tests/
  mission/
  cinematic/
  ai/
  performance/
```

### 12.2 Loop de simulação
- Render usa `requestAnimationFrame` e `delta` calculado/clamp; física e AI rodando em passos fixos (ex.: 1/60 s) com limite de iterações por frame.
- Ordem: `input -> mission triggers -> player simulation -> projectiles/physics -> enemy perception -> ai -> animation -> audio -> cinematic/state -> render`.
- Quando timeline trava jogador, gameplay recebe `inputLocked`; não desabilitar globalmente eventos de missão.
- `SceneRouter` aborta requests pendentes, timers e listeners ao mudar de nível; não acumular updates de fases anteriores.

### 12.3 Otimizações obrigatórias
- Frustum culling e chunk/room streaming. Em interiores, portal/occlusion aproximado entre salas, não renderizar setor invisível.
- Texturas `.webp` para UI e fundos; GLB/GLTF com geometria compacta para modelos. Avaliar compressão Meshopt/Draco e KTX2 quando pipeline suportar.
- Materiais reutilizados, instanced meshes para árvores/grades repetidas, impostors de vegetação distante.
- Luz baked/fake na maioria dos ambientes; no máximo 1–3 luzes dinâmicas influentes por área próxima, medindo impacto.
- IA de guardas fora de visão pode atualizar percepção em 4–10 Hz; guardas em combate 15–30 Hz e física necessária em passo fixo.
- Pool de projéteis, decalques, partículas e cápsulas. Sem criar/destruir centenas de objetos por frame.
- Pré-carregar áudio/animatic da cutscene antes de iniciar; vídeo incorporado somente se tiver direitos e necessidade técnica.
- Somente carregar os GLBs e texturas da fase escolhida + shared; liberar referências ao sair.

### 12.4 Metas de orçamento (referências internas para QA)
| Item | Desktop (1080p) | Mobile compatível (qualidade baixa) |
|---|---|---|
| FPS de alvo | 60 | 30 |
| Draw calls na cena de gameplay | até 500 (meta) | até 180 (meta) |
| Triângulos visíveis médios | até 700 mil | até 170 mil |
| NPCs com IA completa simultânea | 12–20 | 5–10 |
| Qualidade sombras | moderada/baked | baked, dinâmica só onde necessária |
| Memória total estimada | medir máquina-alvo | evitar picos acima de ~350 MB do projeto, validar no browser |
| Carregamento inicial | menu leve | menu muito leve |

Esses números são **alvos de engenharia**, não garantias universais. O perfil real deverá ser medido em hardware definido.

### 12.5 PWA/GitHub Pages
- Paths relativos à base do repositório, suporte correto a `/nome-do-repo/`.
- Service worker versão/cache com invalidation em update; nunca prender usuário em build antigo.
- Pré-cache do shell/menu e uma fase opcionalmente selecionada; o jogo completo pode exigir downloads adicionais.
- Página offline útil (`fase disponível offline / baixar fases`) e botões de controle que funcionem em touch.
- Para assets pesados, avisar tamanho antes de baixar e opção de limpar cache.

### 12.6 Modelo de dados de missão — exemplo
```json
{
  "id": "dam",
  "displayName": "Dam",
  "difficulty": "00_AGENT",
  "spawn": "dam_guardhouse_entry",
  "introCutscene": "DAM_INTRO",
  "outroCutscene": "DAM_BUNGEE",
  "objectives": [
    {"id": "disable_alarms", "type": "destroy_all", "tag": "dam_alarm", "required": true},
    {"id": "place_modem", "type": "use_gadget", "target": "dam_terminal", "gadget": "covert_modem", "required": true},
    {"id": "data_backup", "type": "use_terminal", "target": "dam_backup", "required": true},
    {"id": "bungee", "type": "reach_exit", "target": "dam_jump_point", "required": true,
     "prerequisites": ["disable_alarms", "place_modem", "data_backup"]}
  ],
  "exit": "dam_jump_point"
}
```

### 12.7 Dados de cinematics — exemplo
```json
{
  "id": "DAM_BUNGEE",
  "phaseId": "dam",
  "classification": "ORIGINAL_RECONSTRUCTION_PENDING_VERIFICATION",
  "onTrigger": "all_required_objectives_complete_and_exit_reached",
  "cameraTrack": "dam_bungee_cam_v1",
  "durationSeconds": null,
  "actorAnimations": ["bond_jump_prep", "bond_jump"],
  "skipPolicy": "APPLY_END_STATE",
  "endState": {
    "playerInputLocked": false,
    "missionResult": "SUCCESS",
    "nextMissionUnlock": "facility"
  }
}
```

### 12.8 Salvamento
`IndexedDB` em web, versão de schema e migrations; `localStorage` apenas para configurações leves. Nunca guardar arquivos de grandes fases na save. Salvar `unlock`, `record`, `difficulty`, `currentPhase`, `options`, e snapshots opcionais. Testar `soft refresh`, fechamento forçado e aba duplicada.

## 13. PRODUÇÃO FASEADA — DO PRIMEIRO PROTÓTIPO AO JOGO COMPLETO

### M0 — Pré-produção e inventário do original
**Entregáveis:** lista completa de 20 fases, objetivos por dificuldade e vídeo de referência próprio, planilha de cutscenes, lista de personagens e dispositivos, mapa topológico.  
**Saída:** nenhuma cutscene marcada como `VALIDADA` sem captura; riscos de licenças documentados.

### M1 — Fundação e vertical slice de DAM
- Menu → seleção de missão → briefing → intro → FPS → objetivos → bungee → resultado → save.
- 1 arma PP7, 1 rifle KF7, vida, armadura, tiro, 3 perfis de guarda, alarme, portas, modem, dados e saída.
- Cenário da represa inteiro em geometria simples, LOD e colisões; ao menos 1 trecho visual HD final.
- Pular intro/outro e reiniciar sem vazar timers/eventos.
**Saída:** Dam concluível em Agent e 00 Agent com teste automatizado dos objetivos e sem softlock.

### M2 — FACILITY e RUNWAY
- Cientistas, Dr. Doak, 006, portas codificadas, tanque, bateria antiaérea, avião e transições de cutscenes.
- Testes de mortes de cientistas, explosivos e objetivos falháveis.
**Saída:** primeiro arco completo e jogável, com todas as cenas do arco aprovadas.

### M3 — Engine de dispositivos + gelo/bunker
- Surface 1/2, Bunker 1/2, câmeras, antena, filmadora, analisador, ladrão de dados, Natalya e arquivos.
- Compartilhar assets sem duplicar a mesma geometria de neve.  
**Saída:** fases reconhecíveis, save seguro e NPC aliada confiável.

### M4 — Silo e Frigate
- Timer de missão, bombas, resgate de reféns, rastreador, desarmador, IA de captor.
**Saída:** objetivos de tempo/reféns confiáveis em 30 e 60 FPS.

### M5 — St. Petersburg
- Statue, Archives, Streets, Depot, Train; atuação de personagens, tanque, trem, relógio laser, cutscenes do arco Janus.
**Saída:** cada fase encerra na saída correta e a narrativa avança sem cenas faltantes.

### M6 — Cuba / final
- Jungle, Control, Caverns, Cradle; Xenia, proteção de Natalya, console orbital, rádio, Trevelyan e final.
**Saída:** campanha principal zerável de ponta a ponta, todas as cenas e créditos testados.

### M7 — Conteúdo bônus e polimento
- Aztec, Egyptian, desafios por tempo, cheats/recompensas, refino de iluminação/som, português BR, remapeamento e opções avançadas.
**Saída:** 20 fases, 3 dificuldades e extras coerentes.

### M8 — Multijogador e distribuição
- 2P local primeiro; 4P local se performance comportar; multiplayer online opcional e separado.
- Versão Web/Pages, teste de PWA, empacotamento desktop se licenciado.
**Saída:** build estável e reprodutível, sem regressão da campanha.

### 13.1 Ordem obrigatória por fase
`layout cinza -> objetivos -> inimigos -> gadgets -> cena intro/outro -> arte -> luz/som -> performance -> regressão -> publicar build de teste`. Melhor terminar uma fase completa antes de abrir dez níveis superficiais.

### 13.2 Matriz de prioridade
| Prioridade | Sistema | Por que primeiro |
|---|---|---|
| P0 | objetividade/estado de fases, FPS/colisão, salvar, cutscene runner | sem isso, o jogo não progride |
| P0 | evento de saída e regras de falha | evita falso fim e softlock |
| P0 | nível Dam completo | valida o pipeline inteiro |
| P1 | IA/alarme e dispositivos | essência do GoldenEye |
| P1 | Natalya e cenas de história | risco alto de bugs de missão |
| P1 | 20 fases e 3 dificuldades | escopo central |
| P2 | gráficos premium, áudio, extras | polimento que depende do core |
| P3 | online, editor, conteúdo opcional | não bloquear jogo solo |

## 14. QUALIDADE, TESTES E CRITÉRIOS DE CONCLUSÃO

### 14.1 Testes globais
| ID | Teste | Resultado obrigatório |
|---|---|---|
| QA-01 | Jogar Dam→Cradle sem reiniciar aplicativo | campanha pode ser concluída; ordem e progressão corretas |
| QA-02 | Rodar cada fase nas 3 dificuldades | objetivos exatos por dificuldade; sem objetivo impossível |
| QA-03 | Pular cada intro/outro no primeiro frame permitido | gameplay/salvamento mantém estado válido |
| QA-04 | Pausar durante timer, hack e animação | nenhum relógio ou inimigo avança indevidamente |
| QA-05 | Finalizar com 30/60 FPS e queda artificial | timers, mira, combate e gatilhos consistentes |
| QA-06 | Natalya atravessar porta e escada | sem teleporte visível, deadlock ou chegada impossível |
| QA-07 | Matar aliado/refém quando aplicável | objetivo falha com motivo claro e não conclui |
| QA-08 | Tentar sair sem concluir objetivos | saída bloqueada/sem sucesso; informação útil |
| QA-09 | Reiniciar fase após explosão/cutscene | objetos, timers e IA resetados, sem duplicatas |
| QA-10 | Abrir e fechar menu 100 vezes | sem listeners duplicados, sons presos ou FPS degradado |
| QA-11 | Recarregar página/fechar aplicação após salvar | slot e recordes persistentes; nenhuma corrupção |
| QA-12 | Cache antigo do PWA após atualização | versão correta sem tela branca |
| QA-13 | Controle PS/Xbox, teclado, touch secundário | ações e menus 100% navegáveis |
| QA-14 | Configurações low/high | LOD sem pops extremos e sombras sem artefatos graves |
| QA-15 | Cada intro/outro comparada à referência | nenhum beat original conhecido ausente |

### 14.2 Testes específicos de sequência
- **Dam:** modem/tela correta, alarmes, dados, bungee e câmera pós-pulo.
- **Facility:** cientista, Doak, 006, botijões e explosivos.
- **Silo:** explosivos/áreas e tempo em PAUSE.
- **Frigate:** bombas e resgate de cada refém.
- **Bunker 2/Control:** caminho, cobertura, hack e vida da Natalya.
- **Streets:** tanque x pedestres e colisões.
- **Train:** hostages, terminal, laser, portas e janela de fuga.
- **Cradle:** estados do boss, console e sequência final.
- **Aztec/Egyptian:** desbloqueio, puzzles e créditos/resultado bônus.

### 14.3 Definition of Done por fase
- [ ] Layout completo e navegável, sem buraco de colisão
- [ ] Objetivos de Agent, Secret Agent e 00 Agent conferidos
- [ ] Todos os gatilhos, falhas e saída reproduzíveis
- [ ] Inimigos e dispositivos consistentes
- [ ] Performance dentro do orçamento no hardware-alvo
- [ ] Intro/eventos/outro inventariados e implementados
- [ ] Intro/outro puláveis sem quebrar estado
- [ ] Morte, reinício, pause, save e retorno ao menu testados
- [ ] UI e legendas PT-BR completas
- [ ] Build de regressão aprovada

### 14.4 Indicadores de sucesso
- 100% dos 20 cenários completos e acessíveis.
- 100% dos objetivos exigidos por dificuldade registrados, testados e concluíveis.
- 100% das cutscenes comprovadamente presentes no original inventariadas e reencenadas.
- 0 softlocks conhecidos em caminho principal; 0 progresso falso.
- 60 FPS desktop / 30 FPS mobile no hardware-alvo acordado; frames estáveis sem travamento nas cenas.
- Controle e pausa corretos nas entradas e saídas de cinematics.

### 14.5 Principais riscos
| Risco | Severidade | Mitigação |
|---|---|---|
| IP/cenas/áudio sem autorização | crítica para distribuição | obter licença ou converter em universo autoral antes de lançar |
| Recriar 20 cenários sem base mensurada | alta | aprovar Dam primeiro; reuso de sistemas e kits |
| Cenas bonitas e objetivos quebrados | crítica | cenas orquestradas pelo estado da missão, testes de skip |
| Natalya travando rotas | alta | navmesh e smoke tests com cada porta e elevador |
| FPS baixo por shader/luzes | alta | iluminação baked e perfis de desempenho desde a primeira fase |
| Muitos comportamentos de IA reescritos | alta | baseline clássico validado e modernizações por feature flag |
| Time multiplayer consumindo produção | média/alta | congelar multijogador até campanha consistente |

## 15. ENTREGÁVEIS E ESTRATÉGIA DE PUBLICAÇÃO

### 15.1 Pacotes por marco
- `GOLDENEYE-REMASTER-M0-DOCS.zip`: GDD, fontes históricas, checklist de scenes/assets e riscos de IP.
- `GOLDENEYE-REMASTER-M1-DAM-FONTE.zip`: código completo modular, GLBs/assets autorizados e testes.
- `GOLDENEYE-REMASTER-M1-DAM-WEB.zip`: build leve pronta para GitHub Pages (uso conforme direitos).
- Releases seguintes registram changelog, matrizes de testes, screenshots comparativas e problemas abertos.

### 15.2 Versionamento
`v0.1.0` base e menu → `v0.2.0` Dam completo → `v0.3.0` Arkhangelsk completo → `v0.4.0` Severnaya etc. Todo incremento com teste de regressão. A nomenclatura descreve **artefatos planejados**, não arquivos já produzidos.

### 15.3 O que a primeira versão jogável PRECISA ter
Uma fase Dam do começo ao salto, combate, furtividade, alarme, gadgets, todos os objetivos daquela dificuldade, intro e outro com skip correto, HUD, Q Watch, áudio, save e retorno ao menu. Uma demo curta completa vale mais do que 20 cenários vazios.

---

## 16. PERGUNTAS EM ABERTO PARA PRÉ-PRODUÇÃO (NÃO BLOQUEIAM O GDD)

1. A versão final será **fan remake com direitos licenciados** ou **jogo original inspirado em mecânicas de GoldenEye**? Define nomes, histórias e reutilização de cenas/áudio.
2. A engine final será Three.js (proposta deste documento), Godot ou outra? Os contratos de dados continuam os mesmos.
3. Deseja replicação de movimentação/câmeras 1:1 ao N64 em modo Clássico ou fidelidade aproximada? Precisa de captura verificável para parametrizar.
4. Tolerância máxima a tamanho de download offline/mobile e classes de hardware de referência.
5. Terá multiplayer local nesta primeira versão ou só após o jogo solo zerável?

## 17. REFERÊNCIAS DE PESQUISA

**Fontes de referência do jogo original e da sua estrutura:**
- Manual de *GoldenEye 007* (Nintendo 64), transcrição: https://www.world-of-nintendo.com/manuals/nintendo_64/goldeneye_007.shtml
- The GoldenEye Depot, índice dos níveis: https://goldeneyedepot.com/levels
- The GoldenEye Depot, áudio e associações de música por fase: https://goldeneyedepot.com/audio
- GoldenEye 007 N64, histórico oficial da Nintendo Brasil: https://www.nintendo.com/pt-br/whatsnew/goldeneye-007-retorna-para-assinantes-do-nintendo-switch-online-pacote-adicional/
- Ars Technica, criação narrativa por briefing, cenas e objetivos: https://arstechnica.com/gaming/2022/07/book-excerpt-anti-game-design-and-the-making-of-goldeneye-007/
- Referência comunitária secundária, comportamento/objetivos 00 Agent (**verificar com jogo/decomp**, pois pode conter imprecisões): https://github.com/jkdansereau/goldeneye-pc-port/blob/main/docs/dev/game-behavior-reference.md
- Catálogo comunitário de fases: https://goldeneye.fandom.com/wiki/Levels

**Nota metodológica:** fontes secundárias são apoio ao inventário. Para garantir preservação exata de cutscenes, objetivos, tempos e comportamentos, é indispensável confrontar a execução do N64 ou registros verificados de cada fase, observando direitos de uso.

---

## 18. RESUMO EXECUTÁVEL PARA UM AGENTE DE DESENVOLVIMENTO

> Construa o projeto descrito neste GDD de maneira modular. Comece pela missão **Dam**, completamente jogável do menu até o salto final, preservando a lógica histórica e seus eventos de história. Implemente o sistema de objetivo/falha, FPS, armas, vigilância/IA, gadgets, pausa Q Watch, cutscenes com estado de skip, save e resultados. **Não** crie somente menus ou um cenário sem objetivos. Não altere a ordem das fases nem substitua cutscenes existentes por texto. Faça smoke tests de caminho vitorioso e falha, compile uma build web que não quebre ao carregar do subdiretório do GitHub Pages e mantenha changelog + plano de regressão. A cada nova versão, conclua uma fase/funcionalidade principal antes da próxima. Use apenas conteúdo que possa ser legalmente utilizado ou distribuição autorizada; se necessário, realize uma conversão autoral de IP antes da publicação.

**Fim do GDD v1.0.**
