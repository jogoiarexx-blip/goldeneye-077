# Dra. — modelo otimizado e integração

Fonte: `dra-medica-otimizada.glb` enviado pelo usuário, 23.949.260 bytes, 1.008.748 triângulos. Resultado: `assets/models/dra.glb`, 6.021.600 bytes, 179.475 triângulos. Redução de arquivo de 74,86%, triângulos de 82,21%. Texturas base color, normal e metallic/roughness preservadas, reduzidas de 2048 para 1024 px; JPEG qualidade 85. UVs mantidos pelo decimador; pequenas alterações visuais são esperadas pela redução de malha e resolução.

Sem Draco ou extensões obrigatórias: compatível com o GLTFLoader local. O arquivo original não contém rig nem animações; esta entrega não cria animação esquelética.

A Dra. substitui `sci_2` na Facility e `silo_scientist_1` no Silo, mantendo IDs, papel de cientista, posição, orientação, testes de tiro, morte e regras de proteção. Doak e os demais NPCs continuam com seus papéis. Modelo normalizado para 1,75 m, com pés no plano do NPC. Carregamento somente nas duas fases pertinentes, mantendo personagem procedural se falhar; resposta atrasada de fase antiga é descartada. Geometria/texturas descartadas ao remover o cadáver, e pelo clear da fase nas trocas normais.

Verificação: `node tests/check.cjs` e `node tests/doctor-model.cjs`. O teste usa GLTFLoader e Three.js reais, simula apenas a decodificação de imagem sem GPU, valida índices, posições, UV, três canais de textura, escala, apoio, fallback e resposta atrasada após trocar de cenário. Não equivale a uma sessão interativa WebGL ou medição em celular.

Comparação visual: renderizações do original e do otimizado em Blender/Cycles. Uma tentativa de redução mais forte foi descartada após mostrar artefatos no jaleco; a malha final usa razão 0,18, limpeza de normais e três texturas 1024 px. A aparência foi conferida em render estático; o teste interativo WebGL permanece pendente.
