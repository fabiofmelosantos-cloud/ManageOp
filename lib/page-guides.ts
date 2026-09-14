export type GuideConnection = {
  label: string
  href: string
  note: string
}

export type PageGuide = {
  title: string
  intro: string
  steps: string[]
  connections: GuideConnection[]
}

// Guia de utilização mostrado no topo de cada página.
// A chave é a rota exata (pathname). Rotas sem entrada (ex.: login) não mostram guia.
export const pageGuides: Record<string, PageGuide> = {
  "/": {
    title: "Como usar o Dashboard",
    intro:
      "Este é o ponto de partida da aplicação. Aqui vê o estado das operações do dia e navega para todas as áreas.",
    steps: [
      "Escolha a data no topo para ver as operações desse dia.",
      "Abra uma linha de produção (Honetop / Barritas) para requisitar materiais e registar a produção.",
      "Use os cartões para ir a BOM, Planeamento, Horário, Férias, Tarefas e Suporte.",
    ],
    connections: [
      { label: "Honetop", href: "/production/honetop", note: "Registar a produção da linha" },
      { label: "Planeamento", href: "/planning", note: "Definir o que se produz" },
      { label: "Horário", href: "/schedules", note: "Escala dos trabalhadores" },
      { label: "BOM", href: "/bom", note: "Materiais e stock" },
    ],
  },
  "/production/honetop": {
    title: "Como usar a produção Honetop",
    intro:
      "Fluxo sequencial da linha Honetop: siga os pontos 1 a 6 pela ordem, do pedido de materiais ao fecho da produção.",
    steps: [
      "1. Preparar produção: escolha o produto, a quantidade e o lote de produção acabado.",
      "2. Requisitar materiais ao armazém, indicando a data da produção a que se refere.",
      "3. Fechar as paletes de matéria-prima recebida (sacos, lote e validade).",
      "4. Definir a produção do dia, arrancar o cronómetro, indicar operadores e acompanhar o consumo.",
      "5. Registar as paletes de produto acabado (quantidade, lote, validade e destino).",
      "6. Rever tudo e fechar a produção para gerar o resumo com tempos e horas-homem.",
    ],
    connections: [
      { label: "Linhas de Produção", href: "/production-lines", note: "Define as receitas usadas aqui" },
      { label: "BOM", href: "/bom", note: "Materiais e stock disponível" },
      { label: "Produtos Acabados", href: "/finished-products", note: "Onde entram as paletes fechadas" },
      { label: "Dashboard", href: "/", note: "Voltar à visão geral" },
    ],
  },
  "/bom": {
    title: "Como usar o BOM",
    intro:
      "O BOM (lista de materiais) mostra os materiais e o stock necessários para cada produto.",
    steps: [
      "Consulte os materiais e quantidades associados a cada produto.",
      "Verifique o stock disponível antes de requisitar materiais na produção.",
    ],
    connections: [
      { label: "Linhas de Produção", href: "/production-lines", note: "Origem das receitas" },
      { label: "Honetop", href: "/production/honetop", note: "Consome estes materiais" },
    ],
  },
  "/planning": {
    title: "Como usar o Planeamento",
    intro: "Planeamento geral da produção, que alimenta o plano semanal e o trabalho do coordenador.",
    steps: [
      "Defina o que vai ser produzido e organize as prioridades.",
      "O que planear aqui reflete-se no plano semanal e no quadro do coordenador.",
    ],
    connections: [
      { label: "Plano Semanal", href: "/production-plan", note: "Detalhe por linha e turno" },
      { label: "Coordenador", href: "/coordinator", note: "Execução no terreno" },
    ],
  },
  "/production-plan": {
    title: "Como usar o Plano Semanal",
    intro: "Define o plano de produção da semana, por linha e por turno.",
    steps: [
      "Selecione a semana a planear.",
      "Atribua produtos e quantidades a cada linha e turno.",
      "Guarde para que o coordenador e as linhas executem o plano.",
    ],
    connections: [
      { label: "Coordenador", href: "/coordinator", note: "Quem executa o plano" },
      { label: "Linhas de Produção", href: "/production-lines", note: "Linhas e produtos disponíveis" },
      { label: "Planeamento", href: "/planning", note: "Visão geral" },
    ],
  },
  "/production-lines": {
    title: "Como usar as Linhas de Produção",
    intro: "Gere as linhas, os produtos e as receitas/requisitos que alimentam toda a produção.",
    steps: [
      "Crie ou edite as linhas de produção.",
      "Associe produtos e as respetivas receitas de materiais.",
      "Estes dados alimentam o BOM, o plano semanal e a produção Honetop.",
    ],
    connections: [
      { label: "BOM", href: "/bom", note: "Materiais derivados das receitas" },
      { label: "Honetop", href: "/production/honetop", note: "Usa estas receitas" },
      { label: "Plano Semanal", href: "/production-plan", note: "Onde as linhas são planeadas" },
    ],
  },
  "/schedules": {
    title: "Como usar os Horários",
    intro:
      "Gera o horário do Turno 1 com rotação das horas de almoço e controlo de qualidade da linha Honetop hora a hora.",
    steps: [
      "Selecione o dia a organizar e gere o horário — cada geração alterna as horas de almoço, ficando sempre diferente da anterior.",
      "Na primeira hora indique a sala e a tarefa no formato \"Sala / Tarefa\" (ex.: Honetop / Selar); nas horas seguintes repete-se apenas a sala.",
      "Limpeza fica sempre às 17:00 e Saída às 18:00, mesmo ao propagar a sala.",
      "No quadro Honetop, o envelope no canto superior direito pisca a vermelho (com som) quando há perguntas de qualidade por responder na hora atual.",
      "Responda OK / NOK às perguntas de cada hora — às 09:00 há a pergunta extra do teste organolético. Qualquer NOK bloqueia o arranque da linha.",
      "Pode eliminar horários já gerados através do botão Eliminar em cada cartão do histórico.",
    ],
    connections: [
      { label: "Coordenador", href: "/coordinator", note: "Usa a escala no terreno" },
      { label: "RH", href: "/hr", note: "Férias e ausências afetam a escala" },
      { label: "Trabalhadores", href: "/workers", note: "Quem pode ser escalado" },
    ],
  },
  "/hr": {
    title: "Como usar Recursos Humanos",
    intro: "Gestão de férias e ausências dos trabalhadores.",
    steps: [
      "Registe férias e ausências de cada trabalhador.",
      "Estes registos refletem-se automaticamente nas escalas e no dashboard.",
    ],
    connections: [
      { label: "Escalas", href: "/schedules", note: "Ausências afetam o horário" },
      { label: "Trabalhadores", href: "/workers", note: "Quem gere aqui" },
      { label: "Dashboard", href: "/", note: "Resumo de presenças" },
    ],
  },
  "/coordinator": {
    title: "Como usar o Quadro do Coordenador",
    intro: "Painel diário para gerir as linhas e os trabalhadores no terreno.",
    steps: [
      "Veja as linhas planeadas para o dia e os trabalhadores atribuídos.",
      "Acompanhe o progresso de cada linha.",
      "Ajuste as atribuições conforme as necessidades do dia.",
    ],
    connections: [
      { label: "Plano Semanal", href: "/production-plan", note: "Origem do plano diário" },
      { label: "Escalas", href: "/schedules", note: "Horário dos trabalhadores" },
      { label: "Linhas de Produção", href: "/production-lines", note: "Linhas e produtos" },
    ],
  },
  "/workers": {
    title: "Como usar a Gestão de Trabalhadores",
    intro: "Cadastro de trabalhadores e das respetivas especialidades.",
    steps: [
      "Adicione ou edite os trabalhadores.",
      "Defina as especialidades de cada um.",
      "Ficam disponíveis para escalas e para o coordenador.",
    ],
    connections: [
      { label: "Escalas", href: "/schedules", note: "Onde são escalados" },
      { label: "RH", href: "/hr", note: "Férias e ausências" },
      { label: "Coordenador", href: "/coordinator", note: "Atribuição às linhas" },
    ],
  },
  "/tasks": {
    title: "Como usar as Tarefas",
    intro: "Escala mensal de tarefas da equipa.",
    steps: [
      "Consulte e organize as tarefas ao longo do mês.",
      "Coordene com as escalas para distribuir o trabalho.",
    ],
    connections: [
      { label: "Escalas", href: "/schedules", note: "Disponibilidade dos trabalhadores" },
      { label: "Coordenador", href: "/coordinator", note: "Execução diária" },
    ],
  },
  "/finished-products": {
    title: "Como usar os Produtos Acabados",
    intro: "Registo e consulta das paletes de produto acabado.",
    steps: [
      "Consulte as paletes de produto acabado registadas.",
      "As paletes chegam aqui quando fecha a produção na linha Honetop.",
    ],
    connections: [
      { label: "Honetop", href: "/production/honetop", note: "Onde as paletes são registadas" },
      { label: "Dashboard", href: "/", note: "Visão geral" },
    ],
  },
  "/support": {
    title: "Como usar o Suporte",
    intro: "Área para pedir ajuda e reportar problemas.",
    steps: [
      "Descreva o problema ou a dúvida.",
      "Acompanhe o estado do seu pedido.",
    ],
    connections: [{ label: "Dashboard", href: "/", note: "Voltar à visão geral" }],
  },
  "/settings": {
    title: "Como usar as Configurações",
    intro: "Configurações do sistema, disponíveis apenas para administradores.",
    steps: [
      "Ajuste as definições gerais da aplicação.",
      "Gira acessos e parâmetros do sistema.",
    ],
    connections: [
      { label: "RH", href: "/hr", note: "Gestão de pessoas" },
      { label: "Dashboard", href: "/", note: "Voltar à visão geral" },
    ],
  },
  "/admin/audit-logs": {
    title: "Como usar os Logs de Auditoria",
    intro: "Registo das ações realizadas no sistema, para controlo e rastreabilidade.",
    steps: [
      "Consulte o histórico de ações por utilizador.",
      "Use os filtros para investigar eventos específicos.",
    ],
    connections: [{ label: "Configurações", href: "/settings", note: "Administração do sistema" }],
  },
}
