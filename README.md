# GoldenEye 007 Remastered — protótipo não oficial

Protótipo de FPS de espionagem para navegador. Contém **três missões**: Dam, Facility e Runway. O GDD completo de 20 fases está em `docs/` como referência; as demais missões ainda não foram implementadas.

## Jogar pelo GitHub Pages

1. Abra **Settings → Pages** neste repositório.
2. Em **Build and deployment**, escolha **Source: GitHub Actions**.
3. O workflow `Publicar protótipo no GitHub Pages` já está em `.github/workflows/pages.yml`. Se necessário, acesse **Actions** e execute-o com **Run workflow**.
4. Após a implantação aparecer como concluída, acesse a URL apresentada em Pages. A URL esperada é `https://jogoiarexx-blip.github.io/goldeneye-077/` (não foi possível verificar se já está ativa).

O jogo usa arquivos `index.html` e `src/*.js`, hospedados estaticamente. Depende da conexão à internet para Three.js, Tailwind e fontes externas.

## Controles

Teclado/mouse: WASD mover, mouse mirar, clique esquerdo atirar, direito zoom, E interagir, R recarregar, Ctrl agachar, G plantar mina, F detonar, 1–3 trocar arma, Esc/Tab pausar.

Gamepad padrão: analógicos para mover/mirar, RT/R2 disparar, LT/L2 zoom, X/Quadrado interagir, Y/Triângulo recarregar, B/Círculo agachar, LB/L1 plantar, RB/R1 detonar, Menu/Options pausa.

## Direitos e limites

Projeto **não oficial e de estudo**. GoldenEye 007, James Bond e conteúdo relacionado pertencem aos respectivos titulares. A publicação do código não concede licenças sobre marcas, enredo ou materiais protegidos. Não foram incluídos ROMs, vozes, música ou modelos extraídos do original. A campanha de 20 fases, o multiplayer e o modo mobile estão fora desta versão.
