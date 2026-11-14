# GoldenEye 007 Remastered — protótipo não oficial

Protótipo de FPS de espionagem para navegador. Contém **dez missões**: Dam, Facility, Runway, Surface 1, Bunker 1, Silo, Frigate, Surface 2, Bunker 2 e Statue, com desbloqueio sequencial das missões novas. O GDD completo de 20 fases está em `docs/` como referência; as demais missões ainda não foram implementadas.

## Jogar pelo GitHub Pages

**Site:** https://jogoiarexx-blip.github.io/goldeneye-077/

O repositório está configurado para publicar automaticamente da branch `main`, pasta `/(root)`, pelo processo nativo **pages build and deployment** do GitHub. O `index.html` está na raiz; os arquivos de jogo ficam em `src/`. A pasta `docs/` contém o GDD.

Se houver erro 404, consulte **Settings → Pages** e confirme **Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**. Veja o status em **Actions → pages build and deployment**. A página `404.html` oferece uma rota de volta para o jogo quando um endereço interno antigo é acessado.

O jogo usa arquivos estáticos e depende da conexão à internet para Three.js, Tailwind e fontes externas.

## Runway — portão e itens visuais (v2.0.3)

**Correção da terceira missão (Runway) a partir de captura enviada pelo jogador:**

- **Portão contornável resolvido:** antes, `run_gate_1` ocupava só a faixa central em `Z=27.5`, deixando dois desvios livres entre o portão e os muros do campo aéreo. Adicionadas duas seções sólidas entre o batente e as cercas laterais, atravessando toda a largura transitável; a abertura central mantém **5,8 unidades**, com leitura por **E** no console do lado de entrada, cadeado destrutível e animação deslizante original.
- **Sem objetos atravessando a nova barreira:** caminhão militar movido para depois do checkpoint. Nova travessa superior, faixa refletiva e moldura do portão tornam claro onde abrir.
- **Itens reconhecíveis em 3D:** o coletável **MUNIÇÃO** agora é uma caixa militar com tampa, fecho e cartuchos de latão; o **COLETE** agora tem placas, alças, ombreiras e símbolo, em vez de um cubo azul. Ambos usam halo no chão e etiqueta que fica orientada para a câmera. A identidade visual é aplicada por `addPickup()` a todas as fases, sem alterar raio, quantidade ou efeitos de coleta. Texturas de etiquetas são compartilhadas por tipo e liberadas quando o mapa é descartado.
- **Orientação contextual:** quando `run_gate_1` está fechado, o guia indica o controle do portão antes de apontar ao objetivo seguinte, deixando claro por onde o jogador precisa avançar.
- **Teste de rota real:** `tests/dam-rework.cjs` utiliza busca de caminho com colisores (AABB) e raio de jogador para verificar que a porta fechada impede passagem pelo centro **e pelos dois lados**, e a porta aberta permite atingir todos os objetivos relevantes e os pickups existentes. Os testes rodam em `node tests/check.cjs`.

**Validação:** verificações automáticas concluídas; a experiência final ainda exige teste visual manual no navegador com WebGL.

## Auditoria de cenários — correção de estrutura flutuante (v2.0.2)

Correção da primeira fase a partir de uma captura de tela enviada pelo jogador:

- **Torres suspensas:** duas torres de transmissão de Dam eram chamadas com `buildTransmissionTower(13.5, 18, z)`, mas o segundo parâmetro é a **altura da base**, não o comprimento da estrutura. Agora usam `baseY=0`, com sapatas e bases de concreto apoiadas no reservatório. A torre da sala de máquinas continua apoiada no teto a `4.6` unidades; a de Runway permanece sobre o prédio a `5.2`.
- **Penhascos gigantes retangulares:** retiradas as duas caixas de rocha que formavam paredes imensas ao lado da pista. No lugar, encostas facetadas de poucos polígonos, fora dos limites de movimentação, com montanhas distantes reposicionadas e base apoiada no terreno.
- **Transição entre níveis:** os pontos de ancoragem e salto não persistem nas outras missões.
- **Otimização comum a todas as missões:** `DamLevelBuilder.clear()` agora descarta geometrias, materiais e texturas da fase anterior quando o jogador reinicia ou muda de missão. Os recursos compartilhados são liberados uma única vez, sem afetar os modelos do jogador e das armas.
- **Testes preventivos:** `tests/dam-rework.cjs`, chamado por `node tests/check.cjs`, confere a altura das três torres na Dam, a torre de Runway, a ausência dos grandes cubos, as colisões da plataforma de salto, a limpeza ao entrar em Facility/Runway e a liberação de memória.

Os testes simulados aprovam estrutura e lógica; uma conferência visual com WebGL real ainda é necessária. O trabalho visual detalhado foi feito **em Dam**; a auditoria estética de cada uma das outras fases fica para atualizações seguintes.

## Melhorias da primeira missão — Dam v2.0.1

Atualização corretiva focada na primeira missão, sem modificar o roteiro ou objetivos das outras fases.

**Plataforma de salto reconstruída:** a passarela original ficava além do limite de movimento do jogador e atrás de um parapeito contínuo. Corrigimos a abertura na parede da barragem, o limite horizontal **apenas** na região do bungee, a superfície de aço, os corrimãos, os suportes, as faixas de segurança, o guincho/âncora e o círculo de salto na ponta. Use **E** na borda iluminada depois de cumprir os objetivos necessários da dificuldade.

**Cinemática do bungee:** ao executar o salto, o personagem aparece em terceira pessoa, com arnês e corda conectados à plataforma. A sequência percorre preparação, lançamento, descida acompanhando o paredão e rebote da corda. A câmera tem múltiplos ângulos, há névoa leve próxima da água e as legendas mudam conforme a etapa. O corte dura cerca de 6 segundos e pode ser pulado pelos controles existentes. A fase Facility permanece desbloqueada ao concluir Dam.

**Guardas melhorados na Dam:** proteção adicional no uniforme (alças, joelheiras, rádio, coldre), detalhes por função e reação ao dano. Os guardas abatidos não caem instantaneamente para uma pose atravessada; a queda e a posição do corpo são interpoladas. Guardas em alerta podem avisar um companheiro próximo **apenas com visão desobstruída**, sem alerta global ou soldados infinitos. O combate, patrulhas e as dificuldades das demais missões não foram alterados.

**Validação automatizada:** `tests/dam-rework.cjs`, integrado ao `node tests/check.cjs`, constrói a geometria real da fase e testa a passagem no parapeito, o raio da plataforma, a exclusão de atalhos fora da área, a câmera/corda do salto, morte animada e comunicação de esquadrão. Não substitui jogar a fase inteira em um navegador com WebGL e verificar o resultado visual.

## Missão 10 — Statue (v2.0): Parque das Estátuas

**St. Petersburg — investigação no parque noturno.** Nova fase 3D procedural baseada na seção 7.10 do GDD: parque extenso com 12 esculturas de pedra e bronze em pedestais, monumento/obelisco, ruínas, túneis em arcos, clareiras ligadas por caminhos, helicóptero abandonado, iluminação noturna, nove patrulhas finitas e cobertura tática. Otimizada com materiais compartilhados, neblina falsa de **9 planos translúcidos**, poucos pontos de luz e **130 partículas em um único objeto Points**, sem downloads de modelos ou faixas de áudio.

**Roteiro fiel, em ordem:** (1) procurar e falar com **Valentin**, que revela o local de **Janus**; (2) confrontar Janus junto ao obelisco; (3) investigar o **helicóptero** abandonado; (4) encontrar e resgatar **Natalya**; (5) retornar à aeronave e recolher o **gravador de voo**, que fica invisível e indisponível até o resgate; (6) sair do parque. Contatos e pistas não podem ser acionados fora dessa ordem. Encontros principais reproduzem microcenas de câmera e diálogo: o jogo congela o movimento por poucos segundos, retoma o FPS e não marca outros objetivos automaticamente.

- **Agent e Secret Agent (5 diretivas):** Valentin, Janus, helicóptero, Natalya e saída, com dificuldade de combate diferente. O gravador fica disponível opcionalmente após o resgate.
- **00 Agent (6 diretivas):** mesmas tarefas, mas exige recuperar o gravador antes da saída.
- **Pistas sonoras direcionais:** pequenos sinais procedurais no canal esquerdo/direito conforme a posição do próximo objetivo, respeitando a opção de som desligado e sem arquivos externos.
- **Persistência:** conclua Bunker 2 para liberar Statue; progresso e recordes anteriores de Bunker 2 também são reconhecidos.

Código: `src/statue-v2-0.js`. O teste `tests/statue.cjs`, executado por `node tests/check.cjs`, simula rotas navegáveis, sequência de contatos, microcenas, desbloqueio tardio do gravador, proteção de Natalya, saída e compatibilidade de salvamento. Testes automatizados não substituem uma partida real em navegador com WebGL.

**Próxima missão do GDD:** Archives (ainda não implementada).

## Missão 09 — Bunker 2 (v1.9): Fuga com Natalya

**Severnaya — complexo subterrâneo de detenção.** Nova missão baseada na seção 7.09 do GDD, com celas, arquivos, monitores, 3 portões, 4 câmeras destruíveis, 8 patrulhas iniciais e, no máximo, 2 reforços após alerta. Cenário gerado com geometria procedural leve, mantendo compatibilidade com GitHub Pages. Bunker 2 é desbloqueado após concluir Surface 2 e também reconhece recordes anteriores.

**Dificuldades:**
- **AGENT (2 diretivas):** recuperar fita de vídeo e escapar com Natalya viva.
- **SECRET AGENT (3 diretivas):** comparar registros, recuperar fita e escapar com Natalya viva.
- **00 AGENT (5 diretivas):** comparar registros de funcionários e baixas; recuperar fita; destruir as 4 câmeras (por tiro ou sabotagem próxima); obter manual GoldenEye; escapar com Natalya.

**Como jogar:** use **E** para abrir portões e libertar Natalya. Ao se aproximar dela novamente, **E** alterna **SEGUIR / AGUARDAR**. Ela percorre o corredor com pontos de passagem, aguarda em portas fechadas, não atravessa paredes e pode se abaixar sob ameaça. O painel no HUD exibe postura, saúde e distância da aliada. Natalya pode sofrer dano dos guardas e um disparo direto contra ela faz a missão fracassar. A saída final só libera após os objetivos concluídos **e Natalya dentro do raio de evacuação**. Dois registros devem ser lidos antes da comparação; a fita e o manual são itens independentes. O guia contextual aponta registros e câmeras restantes.

**Testes:** `node tests/check.cjs` inclui `tests/bunker2.cjs`, que simula portões, alcance de objetivos, arquivo, câmeras, ordens de seguir/aguardar, escolta real até a saída, morte da aliada, reforços e desbloqueio antigo. Testes automáticos não substituem validar a experiência completa no navegador WebGL.

**Próxima missão após Bunker 2:** Statue (implementada na v2.0).

## Missão 08 — Surface 2 (v1.8): Retorno a Severnaya

**Mesmo campo nevado, nova contraoperação.** A missão preserva as quatro cabanas, a antena, a neve e a entrada por ventilação de Surface 1; o código chama o construtor do mapa da quarta missão em vez de manter outra cópia. Novos reforços: **12 soldados, 4 câmeras com visão obstruída pelos colliders, 2 holofotes, barricadas, posto de controle trancado, helicóptero de apoio** e nevasca de **440 partículas em um único objeto Points**. Atmosfera mais fria, com névoa controlada.

**Objetivos por dificuldade:**
- **AGENT (2):** neutralizar o helicóptero e entrar no bunker.
- **SECRET AGENT (3):** interromper enlace, neutralizar o helicóptero e entrar no bunker.
- **00 AGENT (4):** desativar vigilância, interromper enlace, neutralizar helicóptero e entrar no bunker.

O controle CCTV está na cabana leste; o terminal de enlace fica no posto de rádio a oeste; a aeronave está no heliponto do setor norte e só pode ser acessada após abrir o checkpoint de segurança. A neutralização deixa **helicóptero inclinado, rotores parados e fumaça visível**, sem continuar operacional. **A saída somente conclui a missão quando as diretivas daquela dificuldade forem cumpridas**.

A fase é liberada após concluir **Frigate**, com progresso salvo no `localStorage` quando disponível. A próxima fase do GDD é **Bunker 2**, ainda em desenvolvimento.

Arquivos: `src/surface2-v1-8.js` e `tests/surface2.cjs`. O comando `node tests/check.cjs` valida sintaxe e simula a navegação pelo portão para evitar atalhos, os objetivos, o desbloqueio e a compatibilidade com Surface 1. Esses testes não substituem uma sessão completa no navegador com WebGL.

## Missão 07 — Frigate (v1.7)

**Monte Carlo — operação na fragata.** Novo navio jogável com convés, porto, passagens estreitas, quatro cabines, três portões, caixas de cobertura, oito guardas, três câmeras, quatro reféns, duas bombas e heliponto com um helicóptero rastreável. O cenário é procedural, sem modelos ou texturas extraídos do jogo comercial. A missão **Frigate libera após concluir Silo** e mantém desbloqueio em `localStorage` quando disponível.

Objetivos por dificuldade:
- **AGENT:** libertar pelo menos dois reféns, instalar rastreador no helicóptero identificado e evacuar (3 diretivas).
- **SECRET AGENT:** libertar pelo menos três reféns, desarmar bomba da ponte, instalar rastreador e evacuar (4).
- **00 AGENT:** libertar quatro reféns, desarmar as bombas da ponte e das máquinas, instalar rastreador e evacuar (5).

Interações: **E** para libertar refém (sem matar refém por eliminação automática de captor), desarmar bomba (3 s por dispositivo; cancelamento ao afastar e pausa congela tempo) e aplicar rastreador ao helicóptero certo. Um tiro direto em refém causa falha. Reféns assustados se abaixam e, quando resgatados, recuam para uma posição mais protegida. A saída final só funciona depois de cumprir as diretivas da dificuldade. **Surface 2** permanece em desenvolvimento.

O guia de objetivos **H** identifica os reféns restantes e as demais tarefas. `src/frigate-v1-7.js` implementa o cenário e sua lógica; `tests/check.cjs` verifica carregamento, sintaxe e elementos essenciais. Foram realizados testes simulados adicionais de caminhos, portões, reféns, desarme, rastreador e falha de missão; não substituem testes visuais completos com WebGL.

## Missão 06 — Silo (v1.6) e agachamento aperfeiçoado

**Nova fase Kirghizstan / Silo:** instalação militar de lançamento com dois foguetes em escala, passarelas, portas blindadas, painéis, quatro câmeras, oito patrulhas, cientistas e elevador final. Desbloqueada após concluir Bunker 1. Toda a geometria é procedural e criada com as primitivas 3D existentes.

- **AGENT:** instalar explosivos nas duas salas de combustível e chegar ao elevador (3 objetivos / 7 min).
- **SECRET AGENT:** explosivos, fotografia de satélite, telemetria e evacuação (5 objetivos / 6 min).
- **00 AGENT:** explosivos, foto, telemetria, circuitos, proteção de cientistas e evacuação (7 objetivos / 5 min).
- O **cronômetro só começa quando o jogador interage com o terminal inicial**, não durante a carga ou cutscene. Ao pausar, o tempo congela; ao zerar, a missão falha. O elevador só permite sair depois de cumprir os objetivos.
- Alarme e iluminação vermelha progressiva, checagem do enquadramento da foto com mira e linha de visão. O próximo cenário do GDD é **Frigate**, ainda não implementado.

**Agachar e levantar (todas as fases):** use **Ctrl ou C no teclado**, **B/Círculo no controle** ou botão **AGACHAR/LEVANTAR** em dispositivo com toque. A câmera e a arma baixam, a velocidade cai, a colisão usa altura menor e **o personagem não consegue levantar se houver teto baixo**. O HUD informa EM PÉ / AGACHADO e o botão reflete o estado.

**Validação:** verificação estática automatizada em `node tests/check.cjs` e 17 testes simulados adicionais de colisões, navegação, ativação e pausa do temporizador. Ainda não representam testes visuais completos em diferentes dispositivos WebGL.

## Missão 05 — Bunker 1 (v1.5)

Novo centro subterrâneo de Severnaya, inspirado no GDD, com três portas de segurança, cinco câmeras, postos de monitoramento, oito patrulhas e equipamentos de inteligência. **Bunker 1 é desbloqueado ao concluir Surface 1**; o progresso é salvo em `localStorage` quando disponível.

Objetivos por dificuldade:

- **AGENT:** ativar computador, baixar dados, sair pelo acesso de manutenção (3).
- **SECRET AGENT:** copiar a chave GoldenEye sem retirar a original, iniciar computador, copiar dados, sair (4).
- **00 AGENT:** neutralizar vigilância, copiar chave preservando original, ativar computador, baixar dados, fotografar tela central e sair (6).

A ordem é aplicada quando necessária: computador exige cópia prévia da chave nas dificuldades que a requerem; download leva **4 segundos** e é cancelado se o jogador se afasta; fotografia só vale após o download, com enquadramento correto e linha de visão. O sistema impede repetir objetivos já realizados. A próxima fase do GDD, **Silo**, ainda não está implementada.

Arquivo: `src/bunker-v1-5.js`; os testes automáticos `node tests/check.cjs` verificam a carga e a presença das mecânicas. Também foram executados testes simulados de caminhos, portões e sequência das interações. Essa validação não substitui testes visuais em WebGL no navegador.

## Missão 04 — Surface 1 (v1.4)

Novo setor jogável de Severnaya baseado no GDD: cenário nevado amplo com trilhas laterais, três instalações principais, montanhas, antena de rádio, patrulhas, neve procedural leve e entrada de ventilação.

- **AGENT (2 objetivos):** cortar as comunicações e entrar pela ventilação.
- **SECRET AGENT (3 objetivos):** cortar comunicações, recuperar planos no cofre e sair pela ventilação. É obrigatório encontrar a chave para abrir o cofre, mesmo quando isso não é uma diretiva separada.
- **00 AGENT (4 objetivos):** desligar antena, obter a chave, recuperar planos e acessar a ventilação.
- A **chave** está na cabana leste; o **painel de rádio** fica na instalação oeste; o **cofre** fica no edifício mais ao norte; a **saída** é uma torre de ventilação no extremo norte.
- A conclusão de Runway libera Surface 1 nesta sessão e salva o desbloqueio em `localStorage` quando disponível; a próxima fase, Bunker 1, ainda não está implementada.
- Arquivo: `src/surface-v1-4.js`, carregado depois dos demais módulos. O teste `node tests/check.cjs` inclui verificações de integração e sintaxe dessa fase.

**Limitações:** geometria e cutscenes são protótipos procedurais inspirados no GDD; ainda é preciso testar percursos completos e desempenho em navegadores com WebGL. Não há assets extraídos do jogo original.

## Melhorias de fases — v1.3

- **IA dos guardas:** busca pela última posição observada após perda de visão, tentativa de cobertura quando atingidos, desvio tático em áreas abertas e reação local à descoberta de guardas abatidos. A detecção respeita colisão e linha de visão, sem informar a posição atual do jogador através das paredes.
- **Facility:** sinalização adicional de portas com código de cores (vermelho = acesso restrito, amarelo = pronto para abrir, azul = abrindo, verde = aberto); interação prioriza o dispositivo mais próximo e a porta final se abre durante a sequência de fuga.
- **Runway:** decolagem com progressão de altitude e câmera externa suavizada, hélices aceleradas e poeira leve de pista durante a saída.
- **Dam:** continua com a sequência de modem → interceptação e melhorias de colisão/objetivos da versão anterior.
- **Qualidade:** `src/tactics-v1-3.js` é carregado depois de `src/mission-enhancements.js`; `node tests/check.cjs` verifica sintaxe dos scripts, ordem de carregamento e presença dos elementos principais. O workflow `Verificar código do jogo` executa essas verificações sem assumir a publicação.

**Limitação:** os testes automatizados e os testes com simulações não substituem sessões completas de QA visual nas três fases. IA de cobertura e extração cinematográfica são aprimoramentos deste protótipo, não reconstruções validadas quadro a quadro do N64.

## Melhorias de fases — v1.2

- **Dam:** a interceptação do backup agora exige instalar o modem no terminal primeiro.
- **Facility:** alarmes visuais de emergência e reação de proteção dos cientistas após a primeira sabotagem de tanque.
- **Runway:** tanque com colisão mais larga, saída com objetivos pendentes sem desembarque forçado, e fumaça temporária nas defesas destruídas.
- **Três missões:** guardas respeitam obstáculos físicos; orientação contextual apresenta objetivo, direção e distância. Pressione **H** para mostrar/ocultar.
- Arquivos: `src/mission-enhancements.js` contém essas melhorias, carregadas após `src/game.js`.

**Validação:** sintaxe verificada no Node.js e sete testes locais de regressão nos comportamentos principais. Estes testes não substituem QA visual de todas as rotas em navegadores com WebGL.

## Controles

Teclado/mouse: WASD mover, mouse mirar, clique esquerdo atirar, direito zoom, E interagir, R recarregar, Ctrl ou C agachar/levantar, G plantar mina, F detonar, 1–3 trocar arma, Esc/Tab pausar, H mostrar/ocultar guia de objetivos.

Gamepad padrão: analógicos para mover/mirar, RT/R2 disparar, LT/L2 zoom, X/Quadrado interagir, Y/Triângulo recarregar, B/Círculo agachar, LB/L1 plantar, RB/R1 detonar, Menu/Options pausa.

## Direitos e limites

Projeto **não oficial e de estudo**. GoldenEye 007, James Bond e conteúdo relacionado pertencem aos respectivos titulares. A publicação do código não concede licenças sobre marcas, enredo ou materiais protegidos. Não foram incluídos ROMs, vozes, música ou modelos extraídos do original. A campanha de 20 fases, o multiplayer e o modo mobile estão fora desta versão.
