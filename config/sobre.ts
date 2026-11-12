// Ficheiro: config/sobre.ts
// Conteúdo da página "Sobre o app" (components/Sobre.tsx): as principais funcionalidades, por área. Texto para o
// usuário final — edite aqui, sem mexer no componente. `pagina` liga a área à página do app (o botão "Abrir" só
// aparece para quem tem acesso a ela).
import type { NavItem } from '../types';

export interface AreaSobre {
  id: string;
  titulo: string;
  icone: string;
  resumo: string;
  pagina?: NavItem;
  itens: string[];
}

export const AREAS_SOBRE: AreaSobre[] = [
  {
    id: 'inspecoes', titulo: 'Inspeções de Saúde', icone: 'event_available', pagina: 'inspecoes',
    resumo: 'Do cadastro da IS ao resultado, com agenda dos peritos e e-mails prontos.',
    itens: [
      'Cadastro da IS manualmente ou a partir do print da tela do SINAIS, lido pela IA.',
      'Agendamento conforme os horários dos médicos peritos (JRS ou MPI), com a duração definida pela finalidade, arrastar no calendário e bloqueios de agenda.',
      'Sincronização com o Google Agenda da JRS, com convite ao perito.',
      'Envio de e-mails de agendamento, resultado de IS, faltas do HNRe e ao NAC; as IS agendadas do dia seguinte seguem por e-mail às 18h, automaticamente.',
      'Alertas de prazos: IS atrasadas e minuta de mensagem de cancelamento.',
      'Entrevista gravada pelo celular, com transcrição e anamnese sugerida pela IA.',
      'Exames em PDF lidos e transcritos pela IA; pedido de parecer a partir da IS.',
    ],
  },
  {
    id: 'concursos', titulo: 'Concursos', icone: 'fact_check', pagina: 'concursosJRS',
    resumo: 'Planilhas de controle dos candidatos, da mensagem de apresentação ao resultado.',
    itens: [
      'Registro da mensagem de apresentação (PDF): cria o concurso, os candidatos e o agendamento.',
      'Planilha de controle por concurso, com os dias de IS no calendário e no Google Agenda.',
      'Triagem pela MPI: biometria e oftalmologia.',
      'Exames entregues pelo candidato em PDF, guardados no Drive e transcritos pela IA.',
      'Termos de Recurso e de Cientificação, pedidos de parecer e de exames, enviados direto para impressão.',
      'Minuta de resultados e e-mail dos candidatos inaptos.',
      'Alertas de IS de concurso atrasadas e notificações de laudos de inaptidão, IDM e dia concluído.',
    ],
  },
  {
    id: 'inspecionados', titulo: 'Inspecionados', icone: 'groups', pagina: 'militares',
    resumo: 'Base única de militares, dependentes e pensionistas.',
    itens: [
      'Cadastro em cascata (vínculo, posto, corpo/quadro e especialidade) ou pelo print do SINAIS.',
      'Dependentes ligados ao titular e pensionistas.',
      'Importação em lote por CSV, que também completa dados que faltam nos cadastros.',
      'Promoção, serviço do HNRe e inativação em lote; histórico de IS, pareceres e perícias de cada inspecionado.',
    ],
  },
  {
    id: 'pareceres', titulo: 'Pareceres', icone: 'assignment', pagina: 'pareceres',
    resumo: 'Pedidos de parecer médico por especialidade, com acompanhamento.',
    itens: [
      'Pedido em PDF com quesitos sugeridos por especialidade, arquivado no Drive.',
      'Envio para impressão com um toque.',
      'Acompanhamento: solicitado, atrasado (20 dias ou mais) e concluído.',
    ],
  },
  {
    id: 'pericia-menor', titulo: 'Perícia Menor / Atestados', icone: 'personal_injury', pagina: 'pericia-menor',
    resumo: 'Registro e homologação de atestados com leitura por IA.',
    itens: [
      'Foto do atestado lida pela IA: militar, data, tempo, CID e médico emissor.',
      'Limites de dispensa conferidos automaticamente, com aviso dos atestados do último mês.',
      'Histórico por militar e PDF arquivado.',
    ],
  },
  {
    id: 'escala', titulo: 'Escala SVÇ', icone: 'calendar_month', pagina: 'escala',
    resumo: 'Supervisão e plantões do SPA.',
    itens: [
      'Calendário mensal com supervisão, retém e plantões de dia e de noite, feriados destacados.',
      'Próximos serviços de cada médico na Início.',
    ],
  },
  {
    id: 'ferias', titulo: 'Férias e afastamentos', icone: 'beach_access', pagina: 'ferias',
    resumo: 'Férias, LTS e licenças da equipe da JRS.',
    itens: [
      'Cadastro com leitura do documento pela IA e status automático (em gozo, gozada).',
      'Bloqueio da agenda das IS dos médicos e evento no Google Agenda.',
      'Visões em tabela e timeline.',
    ],
  },
  {
    id: 'consulta', titulo: 'Consulta', icone: 'manage_search', pagina: 'guide',
    resumo: 'Normas e critérios à mão durante a inspeção.',
    itens: [
      'Doenças de Lei, com critérios, exames, documentos e calculadoras (CDR, Webster, Child-Pugh).',
      'Índices mínimos dos concursos e exames mínimos por finalidade de IS.',
      'DGPM-406, Portaria GM-MD nº 3.551/2021 e Legislação em PDF.',
    ],
  },
  {
    id: 'formacao', titulo: 'Formação', icone: 'school', pagina: 'roteiro',
    resumo: 'Capacitação dos AMP.',
    itens: [
      'Roteiro JRS: trilha de estudos.',
      'Casos periciais comentados, vídeos, infográficos e apresentações.',
    ],
  },
  {
    id: 'inicio', titulo: 'Início e notificações', icone: 'home', pagina: 'home',
    resumo: 'O que precisa da sua atenção, num só lugar.',
    itens: [
      'Precisa de atenção: pareceres atrasados, IS de hoje, concursos em andamento e IS de concurso atrasadas.',
      'Agenda de inspeções com os eventos do dia e acesso rápido às páginas mais usadas.',
      'Notificações no celular e no computador, mesmo com o app fechado.',
    ],
  },
];
