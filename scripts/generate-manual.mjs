import { writeFileSync, mkdirSync } from "node:fs"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx"

const PRIMARY = "1E40AF"
const MUTED = "555555"

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, color: PRIMARY })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true })],
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, color: opts.muted ? MUTED : undefined, italics: !!opts.italics })],
  })
}

function bullet(text, level = 0) {
  return new Paragraph({
    spacing: { after: 60 },
    bullet: { level },
    children: [new TextRun({ text })],
  })
}

function numbered(text, reference) {
  return new Paragraph({
    spacing: { after: 60 },
    numbering: { reference, level: 0 },
    children: [new TextRun({ text })],
  })
}

const doc = new Document({
  numbering: {
    config: [
      { reference: "honetop-steps", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }] },
    ],
  },
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "ManageOp", bold: true, size: 56, color: PRIMARY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 320 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY, space: 8 } },
          children: [new TextRun({ text: "Manual de Utilização — Gestão de Produção", size: 26, color: MUTED })],
        }),

        h1("1. Introdução"),
        para(
          "O ManageOp é um sistema de gestão de produção e operações industriais. Permite planear a produção, gerir linhas e trabalhadores, controlar materiais e registar a produção diária, desde o pedido de matéria-prima ao produto acabado.",
        ),
        para(
          "Este manual descreve, página a página, para que serve cada área da aplicação, como a utilizar e como as páginas se ligam entre si.",
          { muted: true },
        ),

        h1("2. Primeiros passos"),
        bullet("Inicie sessão com as suas credenciais na página de login."),
        bullet("O menu (ícone no canto superior) dá acesso às áreas disponíveis para o seu perfil."),
        bullet("Selecione a data no topo para ver e registar as operações do dia pretendido."),
        bullet("Em cada página encontra um guia \"Como usar esta página\" que pode expandir ou ocultar."),

        h1("3. Perfis de acesso"),
        para("As áreas visíveis dependem do perfil do utilizador:"),
        bullet("Administrador: acesso total, incluindo configurações e auditoria."),
        bullet("Gestor: planeamento e plano semanal de produção."),
        bullet("Coordenador: quadro diário de linhas e trabalhadores."),
        bullet("RH: gestão de férias e ausências."),

        h1("4. Fluxo geral da aplicação"),
        para(
          "Planeamento → Plano Semanal → Coordenador → Produção (Honetop) → Produtos Acabados. Em paralelo, as Linhas de Produção e o BOM definem os produtos e materiais, e as Escalas, os Trabalhadores e o RH garantem a mão de obra.",
        ),

        h1("5. As páginas, uma a uma"),

        h2("Dashboard"),
        para("Ponto de partida. Mostra o estado das operações do dia e dá acesso a todas as áreas."),
        bullet("Escolha a data no topo para ver as operações desse dia."),
        bullet("Abra uma linha de produção para requisitar materiais e registar a produção."),
        bullet("Use os cartões para navegar para as restantes áreas."),
        para("Liga a: Honetop, Planeamento, Horário, BOM, Férias, Tarefas.", { muted: true }),

        h2("Produção Honetop"),
        para("Fluxo sequencial da linha Honetop. Siga os pontos pela ordem:"),
        numbered("Preparar produção: escolha o produto, a quantidade e o lote de produção acabado.", "honetop-steps"),
        numbered("Requisitar materiais ao armazém, indicando a data da produção a que se refere.", "honetop-steps"),
        numbered("Fechar as paletes de matéria-prima recebida (sacos completos, sacos de menor valor em kg, lote e validade). Os sacos de menor valor entram diretamente em kg e somam ao total.", "honetop-steps"),
        numbered("Definir a produção do dia, arrancar o cronómetro e indicar operadores. A MP real consumida (MP que entrou no ponto 3 menos a sobra real indicada no campo \"Sobra de MP (kg)\") é apresentada em kg e em sacos inteiros de matéria-prima de 25 kg mais o restante em kg (ex.: 28 sacos de 25 kg + 2 kg). A sobra teórica mostra a diferença entre o consumo real e o teórico dos sacos produzidos, e o ME consumido é detalhado em sacos e scoops. Ao fechar a produção, o cronómetro do tempo decorrido reinicia automaticamente.", "honetop-steps"),
        numbered("Registar as paletes de produto acabado (quantidade, lote, validade e destino).", "honetop-steps"),
        numbered("Rever tudo e fechar a produção para gerar o resumo com tempos e horas-homem.", "honetop-steps"),
        para(
          "O cronómetro mede o tempo desde o arranque até ao fecho e, com o número de operadores, calcula as horas-homem de cada lote. A informação é guardada automaticamente e não se perde ao trocar de aba ou reiniciar o dispositivo.",
          { muted: true },
        ),
        para("Liga a: Linhas de Produção (receitas), BOM (materiais), Produtos Acabados.", { muted: true }),

        h2("Produção Barritas"),
        para("Sala de produção de barritas com controlo de qualidade por envelope, tal como a Honetop."),
        bullet("O envelope no canto superior esquerdo pisca e emite um sinal sonoro a cada hora, exceto às 17:00 e 18:00."),
        bullet("Abra o envelope e responda OK / NOK às perguntas definidas pela Qualidade para a hora atual."),
        bullet("Indique o lote em produção ao responder; as respostas ficam registadas por lote e por dia em Gestão › Qualidade."),
        para("Liga a: Qualidade, Configurações.", { muted: true }),

        h2("BOM (Lista de Materiais)"),
        para("Mostra os materiais e o stock necessários para cada produto."),
        bullet("Consulte os materiais e quantidades por produto."),
        bullet("Verifique o stock antes de requisitar materiais na produção."),
        bullet('No quadro "Stock atual" os materiais são apresentados em linhas; use a barra de pesquisa para encontrar qualquer artigo por nome, código ou lote.'),
        bullet('Use o botão "Eliminar" na linha do material para o remover do stock.'),
        bullet('No separador "Produção", ao pedir a devolução ao armazém indique no campo "Qtd. a devolver" a quantidade a devolver.'),
        para("Liga a: Linhas de Produção, Honetop.", { muted: true }),

        h2("Gestão"),
        para("Área de gestão das operações, acessível pelo menu lateral. Reúne os módulos de gestão em cartões."),
        bullet('Abra o cartão "Qualidade" para consultar o controlo de qualidade das salas de produção.'),
        para("Liga a: Qualidade, Configurações.", { muted: true }),

        h2("Gestão · Qualidade"),
        para("Acompanhamento das respostas do controlo de qualidade das salas de produção, agrupadas por sala, lote e dia."),
        bullet("Cada cartão representa uma sala e um lote num dia, mostrando as respostas dadas hora a hora."),
        bullet('O selo indica se o lote está "Conforme" ou tem "Não conformidade" (alguma resposta NOK).'),
        bullet("As perguntas são configuradas em Configurações › Qualidade e respondidas nas salas através do envelope."),
        para("Liga a: Configurações, Honetop, Barritas.", { muted: true }),

        h2("Planeamento"),
        para("Planeamento geral da produção, que alimenta o plano semanal e o coordenador."),
        para("Liga a: Plano Semanal, Coordenador.", { muted: true }),

        h2("Plano Semanal"),
        para("Define o plano de produção da semana, por linha e por turno."),
        bullet("Selecione a semana a planear."),
        bullet("Atribua produtos e quantidades a cada linha e turno."),
        bullet("Guarde para que o coordenador e as linhas executem o plano."),
        para("Liga a: Coordenador, Linhas de Produção, Planeamento.", { muted: true }),

        h2("Linhas de Produção"),
        para("Gere as linhas, os produtos e as receitas/requisitos que alimentam toda a produção."),
        bullet("Crie ou edite as linhas de produção."),
        bullet("Associe produtos e as respetivas receitas de materiais."),
        para("Liga a: BOM, Honetop, Plano Semanal.", { muted: true }),

        h2("Horários"),
        para(
          "Gera o horário do Turno 1 com rotação das horas de almoço, sempre diferente da geração anterior.",
        ),
        bullet("Selecione o dia a organizar e gere o horário; cada geração alterna as horas de almoço, ficando sempre diferente da anterior."),
        bullet("Na primeira hora indique a sala e a tarefa no formato \"Sala / Tarefa\" (ex.: Honetop / Selar); nas horas seguintes repete-se apenas a sala."),
        bullet("Limpeza fica sempre às 17:00 e Saída às 18:00, mesmo ao propagar a sala às restantes horas."),
        bullet("Pode eliminar horários já gerados através do botão Eliminar em cada cartão do histórico."),
        para("Nota: o controlo de qualidade deixou de estar nas escalas — passou para as salas de produção (envelope) e para Gestão › Qualidade.", { muted: true }),
        para("Liga a: Coordenador, RH, Trabalhadores.", { muted: true }),

        h2("Recursos Humanos"),
        para("Gestão de férias e ausências dos trabalhadores."),
        bullet("Registe férias e ausências de cada trabalhador."),
        bullet("Os registos refletem-se nas escalas e no dashboard."),
        para("Liga a: Escalas, Trabalhadores, Dashboard.", { muted: true }),

        h2("Quadro do Coordenador"),
        para("Painel diário para gerir as linhas e os trabalhadores no terreno."),
        bullet("Veja as linhas planeadas para o dia e os trabalhadores atribuídos."),
        bullet("Acompanhe o progresso de cada linha e ajuste conforme necessário."),
        para("Liga a: Plano Semanal, Escalas, Linhas de Produção.", { muted: true }),

        h2("Gestão de Trabalhadores"),
        para("Cadastro de trabalhadores e das respetivas especialidades."),
        bullet("Adicione ou edite os trabalhadores e defina especialidades."),
        para("Liga a: Escalas, RH, Coordenador.", { muted: true }),

        h2("Tarefas"),
        para("Escala mensal de tarefas da equipa."),
        para("Liga a: Escalas, Coordenador.", { muted: true }),

        h2("Produtos Acabados"),
        para("Registo e consulta das paletes de produto acabado, que chegam do fecho da produção Honetop."),
        para("No separador \"Produto acabado\" do BOM, as paletes surgem em linhas com pesquisa (produto, palete ou lote) e um filtro por Tudo, data de produção, lote ou data de registo."),
        para("Cada linha tem um botão de edição (lápis) para corrigir os dados da palete — produto, palete, quantidade, lote, validade, data de produção e destino HQ/B2B."),
        para("Na página de Saída de Produto Acabado, cada linha tem também botões para editar (enquanto não estiver expedida) e eliminar a palete, além de validar armazém e registar a expedição."),
        para("Liga a: Honetop, Dashboard.", { muted: true }),

        h2("Suporte"),
        para("Área para pedir ajuda e reportar problemas."),

        h2("Configurações"),
        para("Configurações do sistema, incluindo a aba Qualidade para o controlo de qualidade das salas."),
        bullet("Na aba Qualidade, escolha a sala (Honetop ou Barritas) e crie as perguntas do controlo de qualidade."),
        bullet("Defina se cada pergunta se aplica a todas as horas ou apenas a uma hora específica (ex.: teste organolético às 09:00)."),
        bullet("As perguntas surgem no envelope da sala e as respostas ficam visíveis em Gestão › Qualidade."),

        h2("Logs de Auditoria"),
        para("Registo das ações realizadas no sistema, para controlo e rastreabilidade."),

        h1("6. Dicas úteis"),
        bullet("A informação é guardada automaticamente; pode trocar de aba sem perder dados."),
        bullet("Use o guia no topo de cada página sempre que tiver dúvidas."),
        bullet("Escolha sempre a data correta antes de registar produção ou escalas."),

        new Paragraph({
          spacing: { before: 400 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "ManageOp — Manual de Utilização", size: 18, color: MUTED, italics: true })],
        }),
      ],
    },
  ],
})

mkdirSync("public/docs", { recursive: true })
const buffer = await Packer.toBuffer(doc)
writeFileSync("public/docs/manual-manageop.docx", buffer)
console.log("Manual gerado: public/docs/manual-manageop.docx")
