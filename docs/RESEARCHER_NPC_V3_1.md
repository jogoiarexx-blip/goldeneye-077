# GoldenEye 077 — Terceira personagem da equipe de laboratório (v3.1)

Os três modelos presentes no repositório agora são usados:
- `dra.glb`: **Dra.**, a personagem `dr_doak` da Facility que entrega o código/decodificador. Sua missão e diálogo permanecem intactos.
- `scientist.glb`: cientista original, usado pelos demais cientistas.
- `Medica_Otimizada_Walk_Menos25MB.glb`: a pesquisadora, colocada na vaga de `sci_2` da Facility e `silo_scientist_2` do Silo. Não cria novas entidades ou objetivos.

A pesquisadora tem o papel de cientista como as demais NPCs (inclusive para a missão de preservação dos cientistas no Silo). Mantém a normalização de altura **1,72 m** com medições da malha já deformada pelos ossos; a Dra. mantém **1,75 m**. Clipes com nomes Walk/Walking/Idle/Talk (ou o único clipe) são aceitos, e se só houver Walk, ele fica congelado quando a personagem não caminha.

O terceiro GLB tem aproximadamente **23,6 MB**; só é solicitado ao entrar na Facility ou no Silo, e o mesmo URL aproveita o cache do navegador nas visitas seguintes. Os arquivos 3D originais não foram alterados.

Verificação: `tests/researcher-asset.cjs` inspeciona a estrutura real do GLB; `tests/npc-integration.cjs` garante que as três variantes estão atribuídas e que a Dra. permanece na entrega do código.
