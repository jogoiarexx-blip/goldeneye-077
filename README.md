# GoldenEye 007 Remastered — protótipo não oficial

Protótipo de FPS de espionagem para navegador. Contém **sete missões**: Dam, Facility, Runway, Surface 1, Bunker 1, Silo e Frigate, com desbloqueio sequencial das missões novas. O GDD completo de 20 fases está em `docs/` como referência; as demais missões ainda não foram implementadas.

## Jogar pelo GitHub Pages

**Site:** https://jogoiarexx-blip.github.io/goldeneye-077/

O repositório está configurado para publicar automaticamente da branch `main`, pasta `/(root)`, pelo processo nativo **pages build and deployment** do GitHub. O `index.html` está na raiz; os arquivos de jogo ficam em `src/`. A pasta `docs/` contém o GDD.

Se houver erro 404, consulte **Settings → Pages** e confirme **Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**. Veja o status em **Actions → pages build and deployment**. A página `404.html` oferece uma rota de volta para o jogo quando um endereço interno antigo é acessado.

O jogo usa arquivos estáticos e depende da conexão à internet para Three.js, Tailwind e fontes externas.

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
