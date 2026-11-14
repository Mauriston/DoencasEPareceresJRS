// Ficheiro: config/sobre.ts
// Conteúdo da página "Sobre o app" — a interna (components/Sobre.tsx, só as áreas que o perfil acessa) e a
// pública sem login (components/sobre/SobrePublico.tsx, #/publico/sobre, todas as áreas). Texto para o
// usuário final — edite aqui, sem mexer nos componentes. As duas versões leem o MESMO registro de cada área
// (o campo `textoPublico` traz a redação para quem é de fora: sem nomes de botão nem jargão de tela), para
// não divergirem.
//
// Regras (auditoria v3, §6):
// - `destaque`: as 4 áreas mais usadas (Início, IS, Perícias, Concursos) ganham linha própria com as telas;
//   as demais vão para "Também no app" (cards pequenos, sem imagem). A ordem do array é a ordem de uso.
// - `itens`: benefícios curtos; a página mostra no máximo 4 (3 no celular) e "Ver tudo (N)" para o resto.
// - `imagens`: nome-base das capturas em public/sobre/telas/ (geradas por scripts/sobre/gerar-capturas.ts,
//   com dados fictícios). Sem captura gerada, a página mostra uma moldura com o ícone da área.
// - `paginas`: a área aparece (e o botão "Abrir" leva à 1ª liberada) se o perfil acessa QUALQUER uma delas.
import type { NavItem } from '../types';

export interface TextoAreaSobre {
  /** Título da linha (se diferente do título da área). */
  titulo?: string;
  /** Benefício em 1–2 frases. */
  resumo: string;
  /** Benefícios curtos (máx. 4 visíveis). */
  itens: string[];
}

export interface AreaSobre {
  id: string;
  titulo: string;
  /** Rótulo curto dos chips do índice. */
  chip: string;
  icone: string;
  /** Páginas da área, por prioridade; a 1ª é a do botão "Abrir". 'home' é sempre liberada. */
  paginas: NavItem[];
  /** Linha com imagem (4 áreas) ou card em "Também no app". */
  destaque: boolean;
  /** Benefício em 1–2 frases (texto da linha em destaque). */
  resumo: string;
  /** Uma linha para o card de "Também no app". */
  resumoCurto: string;
  itens: string[];
  /** Capturas (nome-base em public/sobre/telas/) e o texto alternativo de cada uma. */
  imagens?: { desktop: string; celular: string; altDesktop: string; altCelular: string };
  /** Redação para a página pública (sem login). */
  textoPublico: TextoAreaSobre & { resumoCurto: string };
}

export const AREAS_SOBRE: AreaSobre[] = [
  {
    id: 'inicio', titulo: 'Início', chip: 'Início', icone: 'home', paginas: ['home'], destaque: true,
    resumo: 'A tela inicial mostra o que precisa ser feito hoje, conforme a sua função: contadores do dia, a agenda de hoje e as pendências — com avisos no celular e no computador.',
    resumoCurto: 'O que pede ação hoje, conforme a sua função.',
    itens: [
      'Contadores do dia por função, que abrem a lista já filtrada',
      'Agenda de hoje com o horário primeiro',
      'Pendências: pareceres atrasados e IS sem agendamento',
      'Avisos no celular e no computador, mesmo com o app fechado',
    ],
    imagens: {
      desktop: 'inicio-desktop', celular: 'inicio-celular',
      altDesktop: 'Tela Início no computador, com os contadores do dia e a agenda de hoje',
      altCelular: 'Tela Início no celular, com os contadores do dia',
    },
    textoPublico: {
      titulo: 'Tudo o que pede ação, num só lugar',
      resumo: 'A tela inicial mostra o que precisa ser feito hoje, conforme a função de cada usuário, com notificações no celular e no computador.',
      resumoCurto: 'O que pede ação hoje, conforme a função de cada usuário.',
      itens: ['Contadores do dia por função', 'Agenda de hoje com o horário primeiro', 'Avisos mesmo com o app fechado'],
    },
  },
  {
    id: 'inspecoes', titulo: 'Inspeções de Saúde', chip: 'Inspeções', icone: 'event_available', paginas: ['inspecoes'], destaque: true,
    resumo: 'Do print do SINAIS ao resultado: a IA cadastra, a agenda respeita os turnos de cada perito e os e-mails saem prontos.',
    resumoCurto: 'Do cadastro da IS ao resultado, com agenda por perito.',
    itens: [
      'Cadastro pelo print da tela do SINAIS',
      'Agenda por perito, com bloqueios e Google Agenda',
      'E-mails de agendamento, resultado e faltas',
      'Entrevista gravada no celular, com anamnese sugerida',
      'Prazos acompanhados, com alerta de IS atrasada e minuta de cancelamento',
      'Exames em PDF lidos e transcritos pela IA',
      'Pedido de parecer a partir da própria IS',
    ],
    imagens: {
      desktop: 'inspecoes-desktop', celular: 'inspecoes-celular',
      altDesktop: 'Tela de Inspeções de Saúde no computador, com a agenda do dia',
      altCelular: 'Tela de Inspeções de Saúde no celular, com as IS de hoje',
    },
    textoPublico: {
      resumo: 'Do print da tela do SINAIS ao TIS assinado: a IA cadastra a IS, a agenda respeita os turnos de cada perito e os e-mails da OM saem prontos.',
      resumoCurto: 'Do cadastro da IS ao resultado, com agenda por perito.',
      itens: [
        'Cadastro a partir do print do SINAIS',
        'Agenda por perito, com bloqueios e Google Agenda',
        'Prazos acompanhados e alertas de atraso',
        'Entrevista gravada no celular, com anamnese sugerida',
        'Exames em PDF lidos e transcritos pela IA',
      ],
    },
  },
  {
    id: 'pericia-menor', titulo: 'Perícias Menores', chip: 'Perícias', icone: 'personal_injury', paginas: ['pericia-menor'], destaque: true,
    resumo: 'Fotografe o atestado e a IA lê militar, tempo, CID e médico. O app confere o limite de 20 dias por perícia e 30 acumulados.',
    resumoCurto: 'Atestados lidos por foto, com os limites conferidos.',
    itens: [
      'Leitura do atestado por foto',
      'Saldo de dias conferido na hora',
      'Histórico do militar a um toque',
      'Aviso dos atestados do último mês e PDF arquivado',
    ],
    imagens: {
      desktop: 'pericias-desktop', celular: 'pericias-celular',
      altDesktop: 'Tela de Perícias Menores no computador, com a lista e o detalhe de uma perícia',
      altCelular: 'Tela de Perícias Menores no celular, com o detalhe de uma perícia',
    },
    textoPublico: {
      resumo: 'Uma foto do atestado basta: a IA lê militar, tempo, CID e médico, e o app confere os limites de dias antes de registrar.',
      resumoCurto: 'Atestados lidos por foto, com os limites de dias conferidos.',
      itens: ['Leitura do atestado por foto', 'Limite de 20 dias por perícia e 30 acumulados', 'Histórico do militar a um toque'],
    },
  },
  {
    id: 'concursos', titulo: 'Concursos', chip: 'Concursos', icone: 'fact_check', paginas: ['concursosJRS'], destaque: true,
    resumo: 'Da mensagem de apresentação ao resultado: o PDF cria o concurso, os candidatos e a agenda; a planilha mostra como está cada dia.',
    resumoCurto: 'Da mensagem de apresentação ao resultado dos candidatos.',
    itens: [
      'Concurso criado a partir do PDF da mensagem',
      'Exames do candidato lidos pela IA',
      'Termos, pareceres e minuta de resultados',
      'Triagem pela MPI: biometria e oftalmologia',
      'Dias de IS no calendário e no Google Agenda',
      'E-mail dos candidatos inaptos com um clique',
      'Alertas de IS atrasadas e de laudos de inaptidão e IDM',
    ],
    imagens: {
      desktop: 'concursos-desktop', celular: 'concursos-celular',
      altDesktop: 'Tela de Concursos no computador, com os concursos em andamento e os próximos dias',
      altCelular: 'Tela de Concursos no celular, com os concursos em andamento',
    },
    textoPublico: {
      resumo: 'A mensagem de apresentação em PDF cria o concurso, os candidatos e a agenda. A planilha mostra, dia a dia, aptos, inaptos e faltas.',
      resumoCurto: 'Da mensagem de apresentação ao resultado dos candidatos.',
      itens: ['Concurso criado a partir do PDF', 'Exames do candidato lidos pela IA', 'Termos, pareceres e minuta de resultados', 'Triagem pela MPI: biometria e oftalmologia'],
    },
  },
  {
    id: 'pareceres', titulo: 'Pareceres', chip: 'Pareceres', icone: 'assignment', paginas: ['pareceres'], destaque: false,
    resumo: 'Pedidos de parecer médico por especialidade, com acompanhamento até a conclusão.',
    resumoCurto: 'Pedido em PDF com quesitos por especialidade.',
    itens: [
      'Pedido em PDF com quesitos sugeridos por especialidade, arquivado no Drive',
      'Envio para impressão com um toque',
      'Acompanhamento: solicitado, atrasado (20 dias ou mais) e concluído',
    ],
    textoPublico: {
      resumo: 'Pedidos de parecer médico por especialidade, com quesitos sugeridos e acompanhamento do prazo.',
      resumoCurto: 'Pedidos em PDF com quesitos por especialidade.',
      itens: ['Quesitos sugeridos por especialidade', 'Acompanhamento do prazo de 20 dias'],
    },
  },
  {
    id: 'inspecionados', titulo: 'Inspecionados', chip: 'Inspecionados', icone: 'groups', paginas: ['militares'], destaque: false,
    resumo: 'Base única de militares, dependentes e pensionistas, com o histórico de cada um.',
    resumoCurto: 'Base de militares, dependentes e pensionistas.',
    itens: [
      'Cadastro em cascata (vínculo, posto, corpo/quadro e especialidade) ou pelo print do SINAIS',
      'Dependentes ligados ao titular e pensionistas',
      'Importação em lote por CSV, que também completa dados que faltam',
      'Promoção, serviço do HNRe e inativação em lote; histórico de IS, pareceres e perícias',
    ],
    textoPublico: {
      resumo: 'Base única de militares, dependentes e pensionistas, com o histórico pericial de cada um.',
      resumoCurto: 'Base de militares, dependentes e pensionistas.',
      itens: ['Cadastro pelo print do SINAIS', 'Histórico de IS, pareceres e perícias'],
    },
  },
  {
    id: 'escala', titulo: 'Escala SVÇ', chip: 'Escala', icone: 'calendar_month', paginas: ['escala'], destaque: false,
    resumo: 'Supervisão e plantões do SPA num calendário mensal.',
    resumoCurto: 'Supervisão e plantões do SPA.',
    itens: [
      'Calendário mensal com supervisão, retém e plantões de dia e de noite, feriados destacados',
      'Próximos serviços de cada médico',
    ],
    textoPublico: {
      resumo: 'Supervisão e plantões do SPA num calendário mensal.',
      resumoCurto: 'Supervisão e plantões do SPA.',
      itens: ['Calendário mensal com feriados destacados'],
    },
  },
  {
    id: 'ferias', titulo: 'Férias e afastamentos', chip: 'Férias', icone: 'beach_access', paginas: ['ferias'], destaque: false,
    resumo: 'Férias, LTS e licenças da equipe da JRS, já descontadas da agenda das IS.',
    resumoCurto: 'Férias e licenças da equipe, fora da agenda.',
    itens: [
      'Cadastro com leitura do documento pela IA e situação automática (em gozo, gozada)',
      'Bloqueio da agenda das IS dos médicos e evento no Google Agenda',
      'Visões em tabela e linha do tempo',
    ],
    textoPublico: {
      resumo: 'Férias, LTS e licenças da equipe da JRS, já descontadas da agenda das inspeções.',
      resumoCurto: 'Férias e licenças da equipe, fora da agenda.',
      itens: ['Agenda dos peritos bloqueada automaticamente'],
    },
  },
  {
    id: 'consulta', titulo: 'Consulta', chip: 'Consulta', icone: 'manage_search', paginas: ['guide', 'dgpm406', 'portaria', 'laws', 'exames'], destaque: false,
    resumo: 'Normas e critérios à mão durante a inspeção.',
    resumoCurto: 'Doenças de Lei, DGPM-406, Portaria e Legislação.',
    itens: [
      'Doenças de Lei, com critérios, exames, documentos e calculadoras (CDR, Webster, Child-Pugh)',
      'Índices mínimos dos concursos e exames mínimos por finalidade de IS',
      'DGPM-406, Portaria GM-MD nº 3.551/2021 e Legislação em PDF',
    ],
    textoPublico: {
      resumo: 'Normas e critérios à mão durante a inspeção.',
      resumoCurto: 'Doenças de Lei, DGPM-406, Portaria e Legislação.',
      itens: ['Calculadoras clínicas (CDR, Webster, Child-Pugh)', 'Exames mínimos por finalidade de IS'],
    },
  },
  {
    id: 'formacao', titulo: 'Formação', chip: 'Formação', icone: 'school', paginas: ['roteiro', 'casos', 'videos', 'infograficos', 'apresentacoes'], destaque: false,
    resumo: 'Capacitação dos AMP.',
    resumoCurto: 'Roteiro de estudos e casos periciais comentados.',
    itens: [
      'Roteiro JRS: trilha de estudos',
      'Casos periciais comentados, vídeos, infográficos e apresentações',
    ],
    textoPublico: {
      resumo: 'Capacitação dos Agentes Médico-Periciais.',
      resumoCurto: 'Roteiro de estudos e casos periciais comentados.',
      itens: ['Trilha de estudos e casos comentados'],
    },
  },
  {
    id: 'painel', titulo: 'Painel', chip: 'Painel', icone: 'monitoring', paginas: ['painel'], destaque: false,
    resumo: 'As tendências do período, por área.',
    resumoCurto: 'Tendências do período: IS, perícias e concursos.',
    itens: [
      'Painel com as tendências do período (IS, perícias e concursos). O uso do app é medido só em contagens — páginas abertas e ações por usuário, sem nenhum dado de inspecionado —, visíveis apenas ao Admin e guardadas por 12 meses.',
    ],
    textoPublico: {
      resumo: 'As tendências do período, por área.',
      resumoCurto: 'Tendências do período: IS, perícias e concursos.',
      itens: ['Uso do app medido só em contagens, sem dado de inspecionado'],
    },
  },
];

// ---------------------------------------------------------------- E-mails do app (bloco "Comunicados prontos")

export type ModoEmail = 'automatico' | 'um-clique';

export interface EmailSobre {
  /** Tipo do e-mail (config/emails.ts) e nome-base da imagem em public/sobre/emails/. */
  tipo: 'agendaIS' | 'agendamentoIS' | 'resultadoIS' | 'faltasHNRe' | 'nac' | 'inaptosConcurso';
  titulo: string;
  modo: ModoEmail;
  /** Quando sai (uma linha). */
  quando: string;
  /** Para quem vai, em texto (o que a imagem mostra não fica só na imagem). */
  para: string;
  /** Imagem do anexo em PDF (nome-base em public/sobre/emails/), se houver. */
  anexo?: { imagem: string; rotulo: string };
}

export const EMAILS_SOBRE: EmailSobre[] = [
  {
    tipo: 'agendaIS', titulo: 'IS agendadas do dia seguinte', modo: 'automatico',
    quando: 'Todo dia às 18h (domingo a quinta), com a agenda do dia seguinte em PDF.',
    para: 'Médicos peritos, MPI e Secretaria da JRS.',
    anexo: { imagem: 'anexo-agendaIS', rotulo: 'Anexo da agenda do dia (PDF, A4 paisagem)' },
  },
  {
    tipo: 'agendamentoIS', titulo: 'Agendamento da IS', modo: 'um-clique',
    quando: 'Depois de agendar uma IS de VDF ou de Término.',
    para: 'O inspecionado, com cópia ao médico da IS.',
  },
  {
    tipo: 'resultadoIS', titulo: 'Resultado da IS', modo: 'um-clique',
    quando: 'Quando o TIS é assinado.',
    para: 'O inspecionado.',
  },
  {
    tipo: 'faltasHNRe', titulo: 'Faltas às IS (HNRe)', modo: 'um-clique',
    quando: 'Comunica à Divisão de Pessoal as faltas dos inspecionados do HNRe.',
    para: 'Divisão de Pessoal do HNRe, com cópia aos inspecionados.',
  },
  {
    tipo: 'nac', titulo: 'IS de Verificações e Términos ao NAC', modo: 'um-clique',
    quando: 'Envia ao NAC as IS de VDF e Términos finalizadas, com PDF.',
    para: 'NAC, com cópia ao SMI.',
    anexo: { imagem: 'anexo-nac', rotulo: 'Anexo do e-mail ao NAC (PDF)' },
  },
  {
    tipo: 'inaptosConcurso', titulo: 'Candidatos inaptos de concurso', modo: 'um-clique',
    quando: 'Comunica à EAMPE os candidatos inaptos do concurso.',
    para: 'EAMPE.',
  },
];
