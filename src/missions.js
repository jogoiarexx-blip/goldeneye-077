    const MISSIONS_DATA = {
      dam: {
        id: 'dam',
        subtitle: 'Missão 01 — Represa de Byelomorye',
        title: 'REPRESA DE BYELOMORYE',
        introTag: 'DAM_INTRO // REPRESA DE BYELOMORYE',
        introSub: '"Arkhangelsk, URSS. Infiltre a represa, sabote as comunicações e alcance o salto de bungee."',
        outroTag: 'DAM_BUNGEE // EXTRAÇÃO CONCLUÍDA',
        outroSub: '"Salto de bungee executado com precisão. Infiltrando a instalação química subterrânea..."',
        briefingM: '"A inteligência indica atividades clandestinas na represa de Byelomorye, Arkhangelsk. Infiltre o perímetro, desative a rede de alarmes e acesse a plataforma de salto."',
        briefingQ: '"Equipamos você com a Walther PP7 silenciada para abates furtivos e um Modem de Interceptação para o terminal da sala de controle."',
        spawn: { x: 0, y: 1.65, z: 40, yaw: 0 },
        difficulties: {
          AGENT: {
            label: 'AGENT', guardHp: 55, guardDamage: 7, guardReaction: 1.05,
            objectives: [
              { id: 'place_modem', title: 'Instalar Modem Secreto no terminal da guarita central', type: 'gadget' },
              { id: 'bungee', title: 'Alcançar a plataforma de salto de bungee', type: 'exit' }
            ]
          },
          SECRET_AGENT: {
            label: 'SECRET AGENT', guardHp: 75, guardDamage: 11, guardReaction: 0.75,
            objectives: [
              { id: 'disable_alarms', title: 'Neutralizar todas as caixas de alarme da represa (0/3)', type: 'alarms' },
              { id: 'place_modem', title: 'Instalar Modem Secreto no terminal da guarita central', type: 'gadget' },
              { id: 'bungee', title: 'Alcançar a plataforma de salto de bungee', type: 'exit' }
            ]
          },
          '00_AGENT': {
            label: '00 AGENT', guardHp: 95, guardDamage: 15, guardReaction: 0.52,
            objectives: [
              { id: 'disable_alarms', title: 'Neutralizar todas as caixas de alarme da represa (0/3)', type: 'alarms' },
              { id: 'place_modem', title: 'Instalar Modem Secreto no terminal da guarita central', type: 'gadget' },
              { id: 'data_backup', title: 'Interceptar backup de dados no servidor da torre', type: 'terminal' },
              { id: 'bungee', title: 'Alcançar a plataforma de salto de bungee', type: 'exit' }
            ]
          }
        }
      },
      facility: {
        id: 'facility',
        subtitle: 'Missão 02 — Instalação Química Subterrânea',
        title: 'INSTALAÇÃO QUÍMICA (FACILITY)',
        introTag: 'FAC_INTRO // DUTOS DE VENTILAÇÃO',
        introSub: '"Subsolo de Byelomorye. Desça pelos dutos, encontre o Dr. Doak e sabote os tanques de gás nervoso com 006."',
        outroTag: 'FAC_ESCAPE // SABOTAGEM CONCLUÍDA',
        outroSub: '"Tanques químicos destruídos. Escapando pelos túneis de acesso à pista de pouso!"',
        briefingM: '"Alec Trevelyan (006) já está infiltrado na câmara de engarrafamento. Encontre nosso contato interno, Dr. Doak, obtenha o decodificador e destrua os tanques."',
        briefingQ: '"Cuidado com os cientistas civis nos laboratórios. Use disparos precisos nos tanques químicos ou nos barris pressurizados."',
        spawn: { x: 0, y: 1.65, z: 36, yaw: 0 },
        difficulties: {
          AGENT: {
            label: 'AGENT', guardHp: 60, guardDamage: 8, guardReaction: 1.0,
            objectives: [
              { id: 'meet_006', title: 'Encontrar Alec Trevelyan (006) na câmara de engarrafamento', type: 'npc' },
              { id: 'destroy_tanks', title: 'Destruir todos os tanques químicos da instalação (0/5)', type: 'tanks' },
              { id: 'facility_exit', title: 'Escapar pela porta blindada de saída', type: 'exit' }
            ]
          },
          SECRET_AGENT: {
            label: 'SECRET AGENT', guardHp: 80, guardDamage: 12, guardReaction: 0.72,
            objectives: [
              { id: 'contact_doak', title: 'Contatar Dr. Doak e obter o Decodificador de Portas', type: 'npc' },
              { id: 'meet_006', title: 'Encontrar Alec Trevelyan (006) na câmara de engarrafamento', type: 'npc' },
              { id: 'destroy_tanks', title: 'Destruir todos os tanques químicos da instalação (0/5)', type: 'tanks' },
              { id: 'facility_exit', title: 'Escapar pela porta blindada de saída', type: 'exit' }
            ]
          },
          '00_AGENT': {
            label: '00 AGENT', guardHp: 100, guardDamage: 16, guardReaction: 0.5,
            objectives: [
              { id: 'contact_doak', title: 'Contatar Dr. Doak e obter o Decodificador de Portas', type: 'npc' },
              { id: 'meet_006', title: 'Encontrar Alec Trevelyan (006) na câmara de engarrafamento', type: 'npc' },
              { id: 'destroy_tanks', title: 'Destruir todos os tanques químicos da instalação (0/5)', type: 'tanks' },
              { id: 'minimize_civs', title: 'Preservar a vida dos cientistas civis', type: 'civilians' },
              { id: 'facility_exit', title: 'Escapar pela porta blindada de saída', type: 'exit' }
            ]
          }
        }
      },
      runway: {
        id: 'runway',
        subtitle: 'Missão 03 — Pista de Pouso de Arkhangelsk',
        title: 'PISTA DE POUSO (RUNWAY)',
        introTag: 'RUN_INTRO // SAÍDA DO COMPLEXO',
        introSub: '"Arkhangelsk. Recupere a chave de ignição, destrua as baterias antiaéreas e decole antes do cerco soviético."',
        outroTag: 'RUN_PLANE // DECOLAGEM EXECUTADA',
        outroSub: '"Baterias neutralizadas. Decolando sob fogo pesado — Arco I de Arkhangelsk concluído!"',
        briefingM: '"Alarme geral disparado em Arkhangelsk. Recupere a chave da aeronave na guarita do hangar e neutralize as defesas antiaéreas antes de decolar."',
        briefingQ: '"Use os barris de combustível ou disparos concentrados para destruir as torres de metralhadora pesada e a bateria de mísseis."',
        spawn: { x: 0, y: 1.65, z: 42, yaw: 0 },
        difficulties: {
          AGENT: {
            label: 'AGENT', guardHp: 65, guardDamage: 9, guardReaction: 0.95,
            objectives: [
              { id: 'ignition_key', title: 'Recuperar a Chave de Ignição na guarita do hangar', type: 'item' },
              { id: 'runway_plane', title: 'Embarcar no avião e decolar da pista', type: 'exit' }
            ]
          },
          SECRET_AGENT: {
            label: 'SECRET AGENT', guardHp: 85, guardDamage: 13, guardReaction: 0.68,
            objectives: [
              { id: 'ignition_key', title: 'Recuperar a Chave de Ignição na guarita do hangar', type: 'item' },
              { id: 'destroy_emplacements', title: 'Destruir todas as armas pesadas e bateria de mísseis (0/3)', type: 'emplacements' },
              { id: 'runway_plane', title: 'Embarcar no avião e decolar da pista', type: 'exit' }
            ]
          },
          '00_AGENT': {
            label: '00 AGENT', guardHp: 105, guardDamage: 17, guardReaction: 0.48,
            objectives: [
              { id: 'ignition_key', title: 'Recuperar a Chave de Ignição na guarita do hangar', type: 'item' },
              { id: 'destroy_emplacements', title: 'Destruir todas as armas pesadas e bateria de mísseis (0/3)', type: 'emplacements' },
              { id: 'runway_intel', title: 'Interceptar planos de voo na torre de controle', type: 'terminal' },
              { id: 'runway_plane', title: 'Embarcar no avião e decolar da pista', type: 'exit' }
            ]
          }
        }
      }
    };

    /**
     * =========================================================================
     * 3. GERADOR DE TEXTURAS PROCEDURAIS & CENÁRIO 3D DETALHADO (DAM)
     * Gera texturas PBR (asfalto, concreto industrial, metal rebitado, rocha e
     * água ondulada) + torres de transmissão, comportas, caminhão militar,
     * holofotes e montanhas nevadas.
     * =========================================================================
     */
