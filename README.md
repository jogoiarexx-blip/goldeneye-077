# GoldenEye 007 Remastered — protótipo não oficial

Protótipo de FPS de espionagem para navegador. Contém **quatro missões**: Dam, Facility, Runway e Surface 1 (desbloqueada após concluir Runway). O GDD completo de 20 fases está em `docs/` como referência; as demais missões ainda não foram implementadas.

## Jogar pelo GitHub Pages

**Site:** https://jogoiarexx-blip.github.io/goldeneye-077/

O repositório está configurado para publicar automaticamente da branch `main`, pasta `/(root)`, pelo processo nativo **pages build and deployment** do GitHub. O `index.html` está na raiz; os arquivos de jogo ficam em `src/`. A pasta `docs/` contém o GDD.

Se houver erro 404, consulte **Settings → Pages** e confirme **Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**. Veja o status em **Actions → pages build and deployment**. A página `404.html` oferece uma rota de volta para o jogo quando um endereço interno antigo é acessado.

O jogo usa arquivos estáticos e depende da conexão à internet para Three.js, Tailwind e fontes externas.

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

Teclado/mouse: WASD mover, mouse mirar, clique esquerdo atirar, direito zoom, E interagir, R recarregar, Ctrl agachar, G plantar mina, F detonar, 1–3 trocar arma, Esc/Tab pausar, H mostrar/ocultar guia de objetivos.

Gamepad padrão: analógicos para mover/mirar, RT/R2 disparar, LT/L2 zoom, X/Quadrado interagir, Y/Triângulo recarregar, B/Círculo agachar, LB/L1 plantar, RB/R1 detonar, Menu/Options pausa.

## Direitos e limites

Projeto **não oficial e de estudo**. GoldenEye 007, James Bond e conteúdo relacionado pertencem aos respectivos titulares. A publicação do código não concede licenças sobre marcas, enredo ou materiais protegidos. Não foram incluídos ROMs, vozes, música ou modelos extraídos do original. A campanha de 20 fases, o multiplayer e o modo mobile estão fora desta versão.
