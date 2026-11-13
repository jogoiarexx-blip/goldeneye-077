# GoldenEye 007 Remastered — protótipo não oficial

Protótipo de FPS de espionagem para navegador. Contém **três missões**: Dam, Facility e Runway. O GDD completo de 20 fases está em `docs/` como referência; as demais missões ainda não foram implementadas.

## Jogar pelo GitHub Pages

**Site:** https://jogoiarexx-blip.github.io/goldeneye-077/

O repositório está configurado para publicar automaticamente da branch `main`, pasta `/(root)`, pelo processo nativo **pages build and deployment** do GitHub. O `index.html` está na raiz; os arquivos de jogo ficam em `src/`. A pasta `docs/` contém o GDD.

Se houver erro 404, consulte **Settings → Pages** e confirme **Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**. Veja o status em **Actions → pages build and deployment**. A página `404.html` oferece uma rota de volta para o jogo quando um endereço interno antigo é acessado.

O jogo usa arquivos estáticos e depende da conexão à internet para Three.js, Tailwind e fontes externas.

## Controles

Teclado/mouse: WASD mover, mouse mirar, clique esquerdo atirar, direito zoom, E interagir, R recarregar, Ctrl agachar, G plantar mina, F detonar, 1–3 trocar arma, Esc/Tab pausar.

Gamepad padrão: analógicos para mover/mirar, RT/R2 disparar, LT/L2 zoom, X/Quadrado interagir, Y/Triângulo recarregar, B/Círculo agachar, LB/L1 plantar, RB/R1 detonar, Menu/Options pausa.

## Direitos e limites

Projeto **não oficial e de estudo**. GoldenEye 007, James Bond e conteúdo relacionado pertencem aos respectivos titulares. A publicação do código não concede licenças sobre marcas, enredo ou materiais protegidos. Não foram incluídos ROMs, vozes, música ou modelos extraídos do original. A campanha de 20 fases, o multiplayer e o modo mobile estão fora desta versão.
