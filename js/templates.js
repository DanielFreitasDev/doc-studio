/**
 * Modelos de documento e combinações prontas de blocos.
 *
 * Os textos são exemplos ilustrativos (normas e números marcados como
 * "exemplo"): servem para mostrar a estrutura e devem ser substituídos.
 */
import { DESIGN_PRESETS } from './design.js';

const preset = (id) => DESIGN_PRESETS.find((p) => p.id === id).design;

export const TEMPLATES = [
  {
    id: 'manual',
    name: 'Manual operacional',
    description: 'Manual completo com sumário, cronograma, passo a passo, tabelas e dúvidas comuns. É a estrutura dos manuais oficiais.',
    design: { ...preset('manual') },
    meta: {
      kicker: 'DETRAN/CE · Diretoria de Veículos',
      title: 'Manual do\nAtendimento',
      subtitle: 'Agendamento de Vistoria',
      description: 'Portal de Serviços · Vistoria veicular · Passo a passo',
      audienceLabel: 'Para',
      audience: 'Atendentes e parceiros\nque realizam o agendamento',
      version: 'Versão 1.0 · Outubro de 2026',
      headerTitle: 'Manual do Atendimento',
      headerSubtitle: '· Agendamento de Vistoria',
      headerRight: 'DETRAN/CE · Diretoria de Veículos',
    },
    blocks: [
      { type: 'section', kicker: 'Visão geral', title: 'Em resumo', intro: 'Este manual mostra como agendar a vistoria veicular pelo **Portal de Serviços**, o que conferir antes do atendimento e o que fazer quando algo não sai como esperado.' },
      { type: 'stats', style: 'kpi', tone: 'alternate', items: [
        { value: '3', label: 'Etapas', sub: 'agendar, comparecer, concluir' },
        { value: '15 min', label: 'Duração média', sub: 'da vistoria presencial' },
        { value: '24 h', label: 'Resultado', sub: 'disponível no portal' },
      ] },
      { type: 'heading', text: 'Quem participa', level: '2' },
      { type: 'cards', columns: '2', marker: 'letter', tone: 'alternate', items: [
        { title: 'Cidadão', text: 'Solicita o agendamento no portal e comparece com o veículo no dia marcado.' },
        { title: 'Atendente', text: 'Confere os dados, orienta o cidadão e registra o atendimento no sistema.' },
        { title: 'Vistoriador', text: 'Realiza a vistoria, registra as evidências e informa o resultado.' },
        { title: 'DETRAN/CE', text: 'Define as regras, acompanha os prazos e confere os casos com pendência.' },
      ] },
      { type: 'toc', title: 'Neste manual', columns: '2' },

      { type: 'section', kicker: 'Contexto', title: 'Prazos e normas', newPage: true, intro: 'As regras entram em vigor em etapas. Confira abaixo o que muda em cada data.' },
      { type: 'timeline', tone: 'alternate', items: [
        { date: '06/10', title: 'Novas regras em produção', text: 'Agendamento pelo portal disponível, de forma opcional.' },
        { date: '19/10', title: 'Operação assistida', text: 'Portal passa a ser o canal preferencial, com apoio das unidades.' },
        { date: '26/10', title: 'Implantação plena', text: 'Agendamento obrigatório pelo portal para todos os serviços.' },
      ] },
      { type: 'heading', text: 'Normas de referência', level: '2' },
      { type: 'table', header: ['Norma', 'O que define'], rows: [
        ['Resolução CONTRAN nº 000/2026', 'Regras gerais da vistoria veicular *(exemplo)*'],
        ['Portaria DETRAN/CE nº 000/2026', 'Locais e horários autorizados para a vistoria *(exemplo)*'],
        ['Comunicado DIREV nº 00/2026', 'Cronograma de implantação do agendamento *(exemplo)*'],
      ], tone: 'navy', zebra: true, keyColumn: true, note: 'Substitua pelas normas vigentes do seu procedimento.' },
      { type: 'callout', tone: 'tip', title: 'Onde conferir', text: 'Os atos normativos completos ficam no portal do DETRAN/CE, na seção **Legislação**.' },

      { type: 'section', kicker: 'Operação', title: 'Como agendar', newPage: true, intro: 'O processo tem duas fases: a solicitação no portal e o atendimento presencial no dia marcado.' },
      { type: 'flow', label: 'Fase', tone: 'alternate', items: [
        { title: 'Solicitação', text: 'Cidadão escolhe serviço, local e horário no portal.' },
        { title: 'Atendimento', text: 'Vistoria presencial no local e horário agendados.' },
        { title: 'Resultado', text: 'Aprovação informada no portal em até 24 horas.' },
      ] },
      { type: 'steps', title: 'Fase 1 · Solicitação no portal', start: 1, tone: 'theme', items: [
        { title: 'Acesse o Portal de Serviços', text: 'Entre com a conta gov.br e escolha **Vistoria veicular** no menu de serviços.' },
        { title: 'Informe o veículo', text: 'Digite a placa ou o chassi. O portal confere se o veículo pode ser agendado.' },
        { title: 'Escolha local e horário', text: 'Somente locais autorizados aparecem na lista. Horários esgotados ficam indisponíveis.' },
        { title: 'Confirme e guarde o comprovante', text: 'O comprovante traz o código do agendamento, que será pedido no atendimento.' },
      ] },
      { type: 'steps', title: 'Fase 2 · Atendimento presencial', start: 5, tone: 'teal', items: [
        { title: 'Confira o código do agendamento', text: 'Localize o atendimento pelo código ou pela placa.' },
        { title: 'Registre a vistoria', text: 'Faça as fotos pedidas pelo aplicativo, na ordem indicada.' },
        { title: 'Conclua o atendimento', text: 'O resultado é enviado ao portal e o cidadão recebe o aviso.' },
      ] },
      { type: 'callout', tone: 'warning', title: 'Atenção', text: 'Veículos com restrição judicial não podem ser agendados pelo portal. Oriente o cidadão a procurar uma unidade de atendimento.' },

      { type: 'section', kicker: 'Evidências', title: 'O que conferir no veículo' },
      { type: 'table', header: ['Item', 'Como conferir', 'Quando'], rows: [
        ['Chassi', 'Foto nítida da gravação, sem reflexo', 'Sempre'],
        ['Frente e traseira', 'Veículo inteiro no quadro, placa legível', 'Sempre'],
        ['Hodômetro', 'Painel ligado, número legível', 'Veículos usados'],
        ['Motor', 'Número de identificação visível', 'Quando pedido pelo app'],
      ], tone: 'theme', zebra: true, keyColumn: true, note: '' },
      { type: 'chips', label: 'Não é preciso apresentar', items: '~~Nota fiscal original~~\n~~Cópia autenticada~~\n~~Comprovante impresso~~', tone: 'navy' },

      { type: 'section', kicker: 'Resultado', title: 'Conferência e resultado', intro: 'Logo após o envio, o sistema confere as evidências. Quando está tudo certo, a vistoria é aprovada na hora.' },
      { type: 'cards', columns: '2', marker: 'check', tone: 'green', items: [
        { title: 'Aprovada automaticamente', text: 'Todas as evidências conferem. O cidadão é avisado pelo portal.' },
        { title: 'Conferência por vistoriador', text: 'Alguma evidência precisa de análise. O resultado sai em até 24 horas.' },
      ] },
      { type: 'message', label: 'Mensagem no portal', text: 'Agendamento confirmado. Compareça ao local escolhido no dia e horário marcados.', tone: 'success' },

      { type: 'section', kicker: 'Dúvidas', title: 'Situações comuns', newPage: true },
      { type: 'faq', questionLabel: 'Dúvida comum', answerLabel: 'O que fazer', tone: 'teal', items: [
        { question: '“O horário que eu queria não aparece.”', answer: 'Horários esgotados ficam ocultos. Escolha outro local ou tente novamente no dia seguinte, quando novas vagas são liberadas.' },
        { question: '“O portal diz que o veículo não pode ser agendado.”', answer: 'Há alguma restrição no cadastro. Confira a situação do veículo e, se necessário, encaminhe para atendimento presencial.' },
        { question: '“Perdi o comprovante.”', answer: 'O código do agendamento pode ser consultado no portal, em **Meus agendamentos**.' },
      ] },
      { type: 'glossary', title: 'Glossário rápido', tone: 'navy', items: [
        { term: 'Agendamento', definition: 'Reserva de data, horário e local para a vistoria.' },
        { term: 'Evidências', definition: 'Fotos e registros feitos durante a vistoria.' },
        { term: 'Portal de Serviços', definition: 'Canal on-line do DETRAN/CE para solicitações do cidadão.' },
      ] },
    ],
  },

  {
    id: 'guide',
    name: 'Guia rápido',
    description: 'Poucas páginas, direto ao ponto: o que muda, como fazer e o que observar. Ideal para comunicar uma regra nova.',
    design: { ...preset('guide') },
    meta: {
      kicker: 'DETRAN/CE · Diretoria de Veículos',
      title: 'Guia Rápido do\nDespachante',
      subtitle: 'Nova regra de atendimento',
      description: 'Sistema de Veículos · Função de atendimento',
      audienceLabel: 'Para',
      audience: 'Despachantes e\nequipes de atendimento',
      version: 'Versão 1.0 · Outubro de 2026',
      headerTitle: 'Guia Rápido do Despachante',
      headerSubtitle: '· Nova regra de atendimento',
      headerRight: 'DETRAN/CE · Diretoria de Veículos',
    },
    blocks: [
      { type: 'section', kicker: 'Orientação', title: 'Objetivo', intro: 'Orientar os despachantes sobre a nova regra aplicada aos atendimentos, especialmente quanto à **nota fiscal** e à **vistoria**.' },
      { type: 'stats', style: 'sheet', tone: 'theme', items: [
        { value: 'Sistema de Veículos', label: 'Sistema', sub: 'acesso do despachante' },
        { value: 'Atendimento', label: 'Função', sub: 'tela de serviços' },
        { value: '260 e 261', label: 'Serviços', sub: 'códigos de exemplo' },
      ] },
      { type: 'heading', text: 'O que muda na tela', level: '2' },
      { type: 'cards', columns: '2', marker: 'number', tone: 'alternate', items: [
        { title: 'Nota fiscal eletrônica', text: 'Precisa estar vinculada ao atendimento. Enquanto não estiver, a tela mostra o aviso **Vincular nota fiscal**.' },
        { title: 'Vistoria válida e apta', text: 'Quando exigida, a vistoria é selecionada numa lista. Só aparecem vistorias válidas.' },
        { title: 'Coleta externa', text: 'Só aparece a vistoria ligada ao próprio despachante ou a um funcionário vinculado a ele.' },
        { title: 'Seleção obrigatória', text: 'Havendo vistoria disponível e exigida, ela deve ser selecionada antes de prosseguir.' },
      ] },
      { type: 'section', kicker: 'Ação', title: 'Passo a passo', newPage: true },
      { type: 'steps', start: 1, tone: 'theme', items: [
        { title: 'Abra o atendimento', text: 'Na tela de serviços, localize o atendimento pelo chassi ou pela placa.' },
        { title: 'Vincule a nota fiscal', text: 'Clique em **Vincular nota fiscal**, informe a chave de acesso e confirme.' },
        { title: 'Selecione a vistoria', text: 'Em **Serviço de vistoria**, marque a vistoria desejada e clique em **Concluir**.' },
        { title: 'Conclua os demais serviços', text: 'Trabalhe os outros serviços normalmente e feche o atendimento.' },
      ] },
      { type: 'callout', tone: 'warning', title: 'Vistoria de outro despachante não aparece', text: 'A vistoria feita para outro despachante não fica disponível, mesmo que o veículo tenha a vistoria.' },
      { type: 'faq', questionLabel: 'Dúvida comum', answerLabel: 'Resposta', tone: 'teal', items: [
        { question: '“Eu sei que o veículo tem vistoria, mas ela não aparece para mim.”', answer: 'Se foi feita por coleta externa, ela só aparece para o despachante que a coletou ou para seus funcionários. Confira também se está válida e apta.' },
      ] },
      { type: 'message', label: 'Mensagem no sistema', text: 'Não há vistoria para ser utilizada.', tone: 'danger' },
    ],
  },

  {
    id: 'pop',
    name: 'Procedimento (POP)',
    description: 'Procedimento Operacional Padrão: objetivo, responsáveis, materiais, execução, riscos, registros e controle de versões.',
    design: { theme: 'teal', cover: 'minimal', backCover: 'minimal', header: 'rule', footer: 'bar', pageNumber: 'text', sectionStyle: 'number', cardStyle: 'outline' },
    meta: {
      kicker: 'Procedimento Operacional Padrão',
      title: 'POP 012\nConferência de\nDocumentos',
      subtitle: 'Atendimento presencial',
      description: 'Unidades de atendimento · Rotina diária',
      audienceLabel: 'Aplicação',
      audience: 'Todas as unidades\nde atendimento',
      version: 'Revisão 01 · Outubro de 2026',
      headerTitle: 'POP 012 · Conferência de Documentos',
      headerSubtitle: '',
      headerRight: 'DETRAN/CE',
    },
    blocks: [
      { type: 'section', kicker: 'Objetivo', title: 'Para que serve', intro: 'Padronizar a conferência de documentos no atendimento presencial, reduzindo retrabalho e devoluções.' },
      { type: 'section', kicker: 'Responsáveis', title: 'Quem faz o quê' },
      { type: 'table', header: ['Papel', 'Responsabilidade'], rows: [
        ['Atendente', 'Recebe e confere os documentos conforme este POP'],
        ['Supervisor', 'Esclarece dúvidas e valida exceções'],
        ['Gestor da unidade', 'Garante a aplicação do POP e a atualização da equipe'],
      ], tone: 'theme', zebra: true, keyColumn: true, note: '' },
      { type: 'section', kicker: 'Materiais', title: 'O que é necessário' },
      { type: 'list', style: 'check', items: 'Acesso ao sistema de atendimento\nScanner calibrado\nLista de documentos por serviço (anexo)' },
      { type: 'section', kicker: 'Execução', title: 'Procedimento', newPage: true },
      { type: 'steps', start: 1, tone: 'theme', items: [
        { title: 'Identifique o serviço', text: 'Confirme com o cidadão qual serviço será solicitado.' },
        { title: 'Confira os documentos', text: 'Compare cada documento com a lista do serviço. Verifique validade e legibilidade.' },
        { title: 'Digitalize', text: 'Digitalize em cores, frente e verso, um arquivo por documento.' },
        { title: 'Registre no sistema', text: 'Anexe os arquivos e registre a conferência no atendimento.' },
      ] },
      { type: 'section', kicker: 'Riscos', title: 'Pontos de atenção' },
      { type: 'callout', tone: 'danger', title: 'Documento com sinais de adulteração', text: 'Não devolva o documento ao cidadão. Acione o supervisor imediatamente.' },
      { type: 'callout', tone: 'warning', title: 'Documento ilegível', text: 'Solicite nova via. Não aceite cópia de cópia.' },
      { type: 'section', kicker: 'Controle', title: 'Histórico de revisões' },
      { type: 'table', header: ['Revisão', 'Data', 'Alteração'], rows: [
        ['00', '01/2026', 'Emissão inicial'],
        ['01', '10/2026', 'Inclusão da digitalização em cores'],
      ], tone: 'minimal', zebra: false, keyColumn: true, note: '' },
    ],
  },

  {
    id: 'report',
    name: 'Relatório de resultados',
    description: 'Indicadores em destaque, linha do tempo, comparativos e conclusões. Visual sóbrio para a gestão.',
    design: { ...preset('report') },
    meta: {
      kicker: 'Relatório de gestão',
      title: 'Resultados do\n3º trimestre',
      subtitle: 'Atendimento de veículos',
      description: 'Julho a setembro de 2026',
      audienceLabel: 'Para',
      audience: 'Diretoria e\ncoordenações',
      version: 'Outubro de 2026',
      headerTitle: 'Relatório de Resultados',
      headerSubtitle: '· 3º trimestre de 2026',
      headerRight: 'DETRAN/CE',
    },
    blocks: [
      { type: 'section', kicker: 'Síntese', title: 'Resumo executivo', intro: 'O trimestre fechou com aumento do atendimento digital e redução do tempo médio de espera. Os números abaixo são **ilustrativos**.' },
      { type: 'stats', style: 'kpi', tone: 'alternate', items: [
        { value: '+38%', label: 'Atendimentos digitais', sub: 'em relação ao 2º trimestre' },
        { value: '12 min', label: 'Espera média', sub: 'antes: 21 minutos' },
        { value: '94%', label: 'Satisfação', sub: 'pesquisa pós-atendimento' },
        { value: '1.240', label: 'Vistorias externas', sub: 'no período' },
      ] },
      { type: 'quote', text: 'Atender melhor é chegar antes: no canal certo, com a informação certa.', author: 'Diretoria de Veículos' },
      { type: 'section', kicker: 'Marcos', title: 'O que aconteceu no período' },
      { type: 'timeline', tone: 'alternate', items: [
        { date: 'Jul', title: 'Piloto', text: 'Agendamento digital em duas unidades.' },
        { date: 'Ago', title: 'Expansão', text: 'Todas as unidades da capital.' },
        { date: 'Set', title: 'Interior', text: 'Início nas unidades do interior.' },
        { date: 'Out', title: 'Consolidação', text: 'Canal digital como preferencial.' },
      ] },
      { type: 'section', kicker: 'Comparativo', title: 'Indicadores por unidade', newPage: true },
      { type: 'table', header: ['Unidade', 'Atendimentos', 'Espera média', 'Satisfação'], rows: [
        ['Unidade A', '8.420', '10 min', '96%'],
        ['Unidade B', '6.115', '13 min', '93%'],
        ['Unidade C', '4.980', '15 min', '91%'],
      ], tone: 'navy', zebra: true, keyColumn: true, note: 'Valores ilustrativos.' },
      { type: 'section', kicker: 'Próximos passos', title: 'Recomendações' },
      { type: 'cards', columns: '3', marker: 'number', tone: 'alternate', items: [
        { title: 'Ampliar horários', text: 'Abrir vagas aos sábados nas unidades com maior demanda.' },
        { title: 'Capacitar equipes', text: 'Treinamento sobre o novo fluxo para todas as unidades.' },
        { title: 'Medir continuamente', text: 'Painel mensal com os indicadores deste relatório.' },
      ] },
    ],
  },

  {
    id: 'notice',
    name: 'Comunicado',
    description: 'Comunicado ou nota técnica em papel timbrado: título, contexto, orientação e assinatura.',
    design: { ...preset('notice') },
    meta: {
      kicker: 'Comunicado DIREV nº 00/2026',
      title: 'Novo fluxo de\natendimento',
      subtitle: 'Vigência a partir de 26/10/2026',
      description: '',
      audienceLabel: 'Para',
      audience: 'Unidades de atendimento,\ndespachantes e parceiros',
      version: 'Fortaleza, 7 de outubro de 2026',
      headerTitle: 'Comunicado DIREV nº 00/2026',
      headerSubtitle: '',
      headerRight: '',
    },
    blocks: [
      { type: 'section', kicker: 'Comunicado', title: 'Novo fluxo de atendimento', intro: 'A Diretoria de Veículos comunica que, a partir de **26 de outubro de 2026**, o atendimento passa a seguir o fluxo descrito abaixo.' },
      { type: 'paragraph', style: 'normal', text: 'A medida busca reduzir o tempo de espera e padronizar a conferência das informações em todas as unidades.' },
      { type: 'heading', text: 'O que muda', level: '2' },
      { type: 'list', style: 'bullet', items: 'O agendamento passa a ser feito pelo Portal de Serviços.\nO comprovante digital substitui o impresso.\nCasos excepcionais seguem para atendimento presencial.' },
      { type: 'callout', tone: 'info', title: 'Dúvidas', text: 'Entre em contato com a coordenação responsável pelo canal oficial da Diretoria.' },
      { type: 'divider', style: 'space' },
      { type: 'paragraph', style: 'normal', text: '**Nome do Diretor**\nDiretor de Veículos · DETRAN/CE' },
    ],
  },

  {
    id: 'blank',
    name: 'Em branco',
    description: 'Capa, uma seção e um parágrafo. Comece do zero com a identidade visual pronta.',
    design: { ...preset('manual') },
    meta: {
      kicker: 'DETRAN/CE',
      title: 'Título do\nDocumento',
      subtitle: 'Subtítulo',
      description: '',
      audienceLabel: 'Para',
      audience: 'Público-alvo',
      version: 'Versão 1.0 · Outubro de 2026',
      headerTitle: 'Título do Documento',
      headerSubtitle: '',
      headerRight: 'DETRAN/CE',
    },
    blocks: [
      { type: 'section', kicker: 'Introdução', title: 'Comece por aqui', intro: '' },
      { type: 'paragraph', style: 'normal', text: 'Escreva seu texto. Use **negrito**, *itálico* e ==destaque==. Digite / num parágrafo vazio para escolher outro tipo de bloco.' },
    ],
  },
];

/** Combinações de blocos prontas para inserir de uma vez. */
export const SNIPPETS = [
  {
    id: 'section-steps', name: 'Seção com passo a passo', description: 'Título, introdução e etapas numeradas',
    blocks: [
      { type: 'section', kicker: 'Operação', title: 'Como fazer', intro: 'Resumo do procedimento em uma frase.' },
      { type: 'steps', start: 1, tone: 'theme', items: [{ title: 'Primeiro passo', text: '' }, { title: 'Segundo passo', text: '' }, { title: 'Terceiro passo', text: '' }] },
    ],
  },
  {
    id: 'who', name: 'Quem participa', description: 'Subtítulo e cartões com letras',
    blocks: [
      { type: 'heading', text: 'Quem participa', level: '2' },
      { type: 'cards', columns: '2', marker: 'letter', tone: 'alternate', items: [{ title: 'Parte A', text: 'Papel no processo.' }, { title: 'Parte B', text: 'Papel no processo.' }] },
    ],
  },
  {
    id: 'numbers', name: 'Resumo em números', description: 'Três indicadores lado a lado',
    blocks: [{ type: 'stats', style: 'kpi', tone: 'alternate', items: [{ value: '00', label: 'Indicador', sub: 'complemento' }, { value: '00', label: 'Indicador', sub: 'complemento' }, { value: '00', label: 'Indicador', sub: 'complemento' }] }],
  },
  {
    id: 'faq', name: 'Dúvidas comuns', description: 'Seção com perguntas e respostas',
    blocks: [
      { type: 'section', kicker: 'Dúvidas', title: 'Situações comuns' },
      { type: 'faq', questionLabel: 'Dúvida comum', answerLabel: 'Resposta', tone: 'teal', items: [{ question: 'Pergunta 1?', answer: 'Resposta 1.' }, { question: 'Pergunta 2?', answer: 'Resposta 2.' }] },
    ],
  },
  {
    id: 'rules', name: 'Normas de referência', description: 'Tabela de normas com dica',
    blocks: [
      { type: 'heading', text: 'Normas de referência', level: '2' },
      { type: 'table', header: ['Norma', 'O que define'], rows: [['Norma nº 000/2026', 'Assunto'], ['Norma nº 000/2026', 'Assunto']], tone: 'navy', zebra: true, keyColumn: true, note: '' },
      { type: 'callout', tone: 'tip', title: 'Onde conferir', text: 'Indique onde encontrar o texto completo.' },
    ],
  },
  {
    id: 'before-after', name: 'Como era × como fica', description: 'Comparação em dois cartões',
    blocks: [
      { type: 'heading', text: 'O que muda', level: '2' },
      { type: 'cards', columns: '2', marker: 'none', tone: 'alternate', items: [{ title: 'Como era', text: 'Situação anterior.' }, { title: 'Como fica', text: 'Situação nova.' }] },
    ],
  },
  {
    id: 'rollout', name: 'Cronograma de implantação', description: 'Subtítulo e linha do tempo',
    blocks: [
      { type: 'heading', text: 'Cronograma', level: '2' },
      { type: 'timeline', tone: 'alternate', items: [{ date: '00/00', title: 'Etapa 1', text: '' }, { date: '00/00', title: 'Etapa 2', text: '' }, { date: '00/00', title: 'Etapa 3', text: '' }] },
    ],
  },
  {
    id: 'alert', name: 'Aviso com mensagem da tela', description: 'Destaque de alerta e a mensagem exibida',
    blocks: [
      { type: 'callout', tone: 'danger', title: 'Importante', text: 'Explique a regra que gera o bloqueio.' },
      { type: 'message', label: 'Mensagem no sistema', text: 'Texto exato exibido na tela.', tone: 'danger' },
    ],
  },
];
