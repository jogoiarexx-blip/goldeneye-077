# Runway: avião de fuga v2.2

A terceira missão mantém o objetivo runway_plane e o embarque com E.
A aeronave tem fuselagem afunilada, asas de baixo polígono, janelas, cockpit,
flaps, empenagem, porta, degraus, trem de pouso retrátil na cena de decolagem,
dois turboélices de três pás com rotação correta e balizas luminosas emissivas.

Sem texturas externas, modelos GLB ou novos PointLights. A geometria e os
materiais são liberados ao reiniciar ou trocar de mapa. O teste de regressão
está em tests/runway-aircraft.cjs e roda com node tests/check.cjs.

A conferência visual e o desempenho em aparelho móvel exigem teste WebGL real.
