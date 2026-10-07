/**
 * Modelos de documento e combinações prontas de blocos.
 *
 * Os textos são exemplos ilustrativos (normas e números marcados como
 * "exemplo"): servem para mostrar a estrutura e devem ser substituídos.
 */
import { DESIGN_PRESETS } from './design.js';
import { monthYear, longDate } from './utils.js';

const preset = (id) => DESIGN_PRESETS.find((p) => p.id === id).design;

/** Textos de capa neutros para quem começa do zero (sem conteúdo de exemplo). */
const BLANK_META = {
  kicker: 'DETRAN/CE',
  title: 'Título do\nDocumento',
  subtitle: 'Subtítulo',
  description: '',
  audienceLabel: 'Para',
  audience: 'Público a quem o documento se destina',
  version: `Versão 1.0 · ${monthYear()}`,
  headerTitle: 'Título do Documento',
  headerSubtitle: '',
  headerRight: 'DETRAN/CE',
};

/**
 * Categorias dos modelos prontos, pela finalidade do documento: organizam a
 * galeria (filtro) e o catálogo para agentes.
 */
export const TEMPLATE_CATEGORIES = [
  { id: 'manuals', label: 'Manuais e guias', description: 'Ensinar um processo a equipes, parceiros ou ao cidadão' },
  { id: 'procedures', label: 'Procedimentos e técnicos', description: 'Padronizar uma rotina ou documentar um sistema' },
  { id: 'management', label: 'Gestão e projetos', description: 'Prestar contas de resultados ou apresentar um projeto' },
  { id: 'official', label: 'Comunicação oficial', description: 'Comunicados e ofícios em papel timbrado' },
];

export const TEMPLATES = [
  {
    id: 'manual',
    category: 'manuals',
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
      version: `Versão 1.0 · ${monthYear()}`,
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
    category: 'manuals',
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
      version: `Versão 1.0 · ${monthYear()}`,
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
    category: 'procedures',
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
      version: `Revisão 01 · ${monthYear()}`,
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
    category: 'management',
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
      version: monthYear(),
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
    category: 'official',
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
      version: `Fortaleza, ${longDate()}`,
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
      { type: 'paragraph', style: 'normal', text: `Fortaleza, ${longDate()}.` },
      { type: 'divider', style: 'space' },
      { type: 'paragraph', style: 'normal', text: '**Nome do Diretor**\nDiretor de Veículos · DETRAN/CE' },
    ],
  },

  {
    id: 'project',
    category: 'management',
    name: 'Apresentação de projeto',
    description: 'Contexto, objetivos, etapas, investimento e equipe, com capa de placa de obra do MIV. Ideal para projetos e obras.',
    design: { ...preset('works') },
    meta: {
      kicker: 'DETRAN/CE · Projeto',
      title: 'Nova unidade\nde vistoria',
      subtitle: 'Região do Cariri',
      description: 'Apresentação do projeto · exemplo',
      audienceLabel: 'Para',
      audience: 'Diretoria e\nequipes envolvidas',
      version: `Versão 1.0 · ${monthYear()}`,
      headerTitle: 'Nova unidade de vistoria',
      headerSubtitle: 'Região do Cariri',
      headerRight: 'DETRAN/CE',
    },
    blocks: [
      { type: 'section', kicker: 'Contexto', title: 'Por que este projeto', intro: 'A demanda por vistorias na região cresceu e o deslocamento até a unidade mais próxima passa de **100 km** para parte dos cidadãos (dados de exemplo).' },
      { type: 'stats', style: 'kpi', tone: 'alternate', items: [
        { value: '18 mil', label: 'Vistorias por ano', sub: 'estimativa (exemplo)' },
        { value: '–60%', label: 'Deslocamento', sub: 'para quem mora na região' },
        { value: '12 meses', label: 'Prazo total', sub: 'da licitação à inauguração' },
      ] },
      { type: 'section', kicker: 'Objetivos', title: 'O que queremos alcançar' },
      { type: 'cards', columns: '3', marker: 'check', tone: 'alternate', items: [
        { title: 'Atender perto', text: 'Levar a vistoria para perto de quem mora no interior.' },
        { title: 'Reduzir filas', text: 'Distribuir a demanda entre as unidades da região.' },
        { title: 'Padronizar', text: 'Aplicar o mesmo fluxo e a mesma identidade visual.' },
      ] },
      { type: 'section', kicker: 'Etapas', title: 'Cronograma', newPage: true },
      { type: 'timeline', tone: 'alternate', items: [
        { date: 'Mês 1', title: 'Projeto', text: 'Definição do terreno e do projeto básico.' },
        { date: 'Mês 3', title: 'Licitação', text: 'Publicação e contratação.' },
        { date: 'Mês 9', title: 'Obra', text: 'Construção e instalação dos equipamentos.' },
        { date: 'Mês 12', title: 'Inauguração', text: 'Início do atendimento.' },
      ] },
      { type: 'section', kicker: 'Equipe', title: 'Quem participa' },
      { type: 'table', header: ['Área', 'Responsabilidade'], rows: [
        ['Diretoria de Veículos', 'Coordenação geral e fluxo de atendimento'],
        ['Engenharia', 'Projeto e acompanhamento da obra'],
        ['Tecnologia', 'Sistemas, rede e equipamentos'],
      ], tone: 'theme', zebra: true, keyColumn: true, note: 'Exemplo: substitua pelas áreas reais.' },
    ],
  },

  {
    id: 'citizen',
    category: 'manuals',
    name: 'Cartilha para o cidadão',
    description: 'Linguagem simples, passo a passo, documentos necessários e dúvidas comuns, com capa de totem do MIV.',
    design: { ...preset('totem') },
    meta: {
      kicker: 'DETRAN/CE · Orientação ao cidadão',
      title: 'Como agendar\nsua vistoria',
      subtitle: 'Rápido, pelo celular',
      description: '',
      audienceLabel: 'Para',
      audience: 'Proprietários de veículos',
      version: monthYear(),
      headerTitle: 'Como agendar sua vistoria',
      headerSubtitle: '',
      headerRight: 'DETRAN/CE',
    },
    blocks: [
      { type: 'section', kicker: 'Antes de começar', title: 'Tenha em mãos', intro: 'Separe estes itens para fazer tudo de uma vez.' },
      { type: 'chips', label: 'Documentos e dados', tone: 'theme', items: 'Placa do veículo\nRenavam\nCPF do proprietário\nConta gov.br' },
      { type: 'section', kicker: 'Passo a passo', title: 'Agende em 4 passos' },
      { type: 'steps', start: 1, tone: 'theme', items: [
        { title: 'Entre no Portal de Serviços', text: 'Use sua conta gov.br.' },
        { title: 'Escolha “Vistoria veicular”', text: 'Informe a placa e o Renavam.' },
        { title: 'Escolha local, dia e hora', text: 'Só aparecem horários disponíveis.' },
        { title: 'Guarde o comprovante', text: 'Ele chega também por e-mail.' },
      ] },
      { type: 'callout', tone: 'tip', title: 'Dica', text: 'Chegue 15 minutos antes do horário marcado (exemplo).' },
      { type: 'section', kicker: 'Dúvidas', title: 'Perguntas frequentes', newPage: true },
      { type: 'faq', questionLabel: 'Pergunta', answerLabel: 'Resposta', tone: 'teal', items: [
        { question: 'Posso remarcar?', answer: 'Sim, pelo próprio portal, até 24 horas antes (exemplo).' },
        { question: 'Preciso imprimir o comprovante?', answer: 'Não. Basta mostrar no celular.' },
      ] },
    ],
  },

  {
    id: 'letter',
    category: 'official',
    name: 'Ofício',
    description: 'Ofício em papel timbrado do MIV: número, destinatário, assunto, texto e assinatura, em uma página.',
    design: { ...preset('notice') },
    meta: {
      ...BLANK_META,
      title: 'Ofício',
      subtitle: '',
      audience: '',
      version: '',
      headerTitle: 'Departamento Estadual de Trânsito do Ceará',
      headerSubtitle: '',
      headerRight: '',
    },
    blocks: [
      { type: 'paragraph', style: 'normal', text: `**Ofício nº 000/2026 – DIREV/DETRAN-CE**\nFortaleza, ${longDate()}.` },
      { type: 'paragraph', style: 'normal', text: 'A Sua Senhoria o(a) Senhor(a)\n**Nome do destinatário**\nCargo · Órgão (exemplo)' },
      { type: 'paragraph', style: 'normal', text: '**Assunto:** escreva aqui o assunto do ofício.' },
      { type: 'paragraph', style: 'normal', text: 'Senhor(a) Diretor(a),' },
      { type: 'paragraph', style: 'normal', text: 'Escreva aqui o texto do ofício (exemplo). Use parágrafos curtos e objetivos.\n\nNo segundo parágrafo, detalhe o pedido, os prazos e os contatos para resposta.' },
      { type: 'paragraph', style: 'normal', text: 'Atenciosamente,' },
      { type: 'divider', style: 'space' },
      { type: 'paragraph', style: 'normal', text: '**Nome do signatário**\nCargo · DETRAN/CE' },
    ],
  },

  {
    id: 'technical',
    category: 'procedures',
    name: 'Nota técnica',
    description: 'Documento técnico de sistema: requisitos, configuração com comandos, procedimento, mensagens de erro e links de referência.',
    design: { theme: 'navy', cover: 'envelope', backCover: 'minimal', header: 'logo', footer: 'stripe', pageNumber: 'text', sectionStyle: 'number', cardStyle: 'outline', chapterStyle: 'folder', headingWeight: 'regular' },
    meta: {
      kicker: 'Nota técnica · Tecnologia da Informação',
      title: 'Integração do\nAgendamento\nde Vistoria',
      subtitle: 'Configuração e operação',
      description: 'Portal de Serviços · Sistema de atendimento',
      audienceLabel: 'Para',
      audience: 'Equipe técnica e\nsuporte das unidades',
      version: `Versão 1.0 · ${monthYear()}`,
      headerTitle: 'Nota técnica',
      headerSubtitle: 'Integração do agendamento',
      headerRight: 'DETRAN/CE',
    },
    blocks: [
      { type: 'section', kicker: 'Contexto', title: 'Objetivo', intro: 'Descrever como configurar e verificar a integração entre o **Portal de Serviços** e o sistema de atendimento das unidades.' },
      { type: 'paragraph', style: 'normal', align: 'justify', text: 'Esta nota substitui as orientações enviadas por e-mail e vale para todas as unidades. Em caso de dúvida, consulte a [central de serviços](https://www.detran.ce.gov.br) antes de abrir um chamado.' },
      { type: 'section', kicker: 'Antes de começar', title: 'Requisitos' },
      { type: 'table', header: ['Item', 'Versão mínima', 'Observação'], rows: [
        ['Sistema de atendimento', '4.2 (exemplo)', 'Atualização automática nas unidades'],
        ['Navegador', 'Chrome 120 ou Edge 120', 'Outros navegadores não são suportados'],
        ['Rede', 'Acesso ao endereço do portal', 'Liberado no firewall da unidade'],
      ], tone: 'navy', zebra: true, keyColumn: true, note: 'Versões ilustrativas: confira as vigentes com a equipe de TI.' },
      { type: 'section', kicker: 'Configuração', title: 'Como configurar', newPage: true },
      { type: 'steps', start: 1, tone: 'theme', items: [
        { title: 'Verifique o serviço', text: 'No servidor da unidade, confira se o serviço de integração está ativo.' },
        { title: 'Ajuste o endereço do portal', text: 'Edite o arquivo de configuração com o endereço informado pela TI.' },
        { title: 'Reinicie e teste', text: 'Reinicie o serviço e faça um agendamento de teste.' },
      ] },
      { type: 'code', title: 'Comandos no servidor (exemplo)', numbers: true, text: '$ sudo systemctl status agendamento.service\n$ sudo nano /etc/agendamento/config.ini\n$ sudo systemctl restart agendamento.service' },
      { type: 'code', title: 'Trecho do arquivo config.ini (exemplo)', numbers: false, text: '[portal]\nendereco = https://portal.exemplo.ce.gov.br\ntempo_limite = 30' },
      { type: 'section', kicker: 'Suporte', title: 'Mensagens de erro' },
      { type: 'message', label: 'Mensagem na tela', text: 'Não foi possível conectar ao Portal de Serviços. Tente novamente em instantes.', tone: 'danger' },
      { type: 'callout', tone: 'tip', title: 'O que fazer', text: 'Confira a rede da unidade e o endereço do portal no arquivo de configuração. Persistindo, abra um chamado informando o horário do erro.' },
      { type: 'section', kicker: 'Referências', title: 'Para saber mais' },
      { type: 'list', style: 'bullet', items: '[Portal do DETRAN/CE](https://www.detran.ce.gov.br)\nManual do sistema de atendimento, capítulo 3\nPOP 012 · Conferência de Documentos' },
    ],
  },

  /* ---------------------------------------------------------------- começar do zero */
  {
    id: 'blank',
    group: 'blank',
    name: 'Documento em branco',
    description: 'Capa, contracapa e páginas com a identidade visual, sem nenhum texto de exemplo.',
    design: { ...preset('manual') },
    meta: BLANK_META,
    blocks: [],
  },
  {
    id: 'letterhead',
    group: 'blank',
    name: 'Papel timbrado',
    description: 'O papel timbrado do MIV: assinatura centralizada no alto, endereço e faixa no pé. Para ofício, memorando ou nota.',
    design: { ...preset('notice') },
    meta: { ...BLANK_META, headerTitle: 'Departamento Estadual de Trânsito do Ceará', headerRight: '' },
    blocks: [],
  },
  {
    id: 'plain',
    group: 'blank',
    name: 'Folha simples',
    description: 'Só as páginas, sem capa e sem contracapa: cabeçalho, faixa do MIV no pé e número da página.',
    design: { ...preset('manual'), cover: 'none', backCover: 'none' },
    meta: BLANK_META,
    blocks: [],
  },
  {
    id: 'from-text',
    group: 'blank',
    then: 'import',
    name: 'Já tenho o texto',
    description: 'Cole o texto do Word ou do e-mail: títulos, listas e tabelas viram blocos formatados.',
    design: { ...preset('manual') },
    meta: BLANK_META,
    blocks: [],
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
