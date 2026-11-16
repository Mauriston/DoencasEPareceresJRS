// Ficheiro: config/notificacoesAcoes.ts
// Catálogo das ações do app que geram notificação para os outros usuários.
// Compartilhado entre o app (services/notificacoesPush.ts → notificarAcao) e o
// servidor (server.ts, /api/notificacoes/evento), que:
//   1. confere se quem fez a ação tem permissão para executá-la;
//   2. monta o texto a partir do modelo abaixo (o navegador nunca manda texto);
//   3. notifica só os usuários ativos cujo perfil PODE EXECUTAR a mesma ação
//      (página + funcionalidade da matriz de permissões; ações exclusivas do
//      Admin só chegam aos outros Admins). Ex.: o perfil user_medicos_geral,
//      que só tem a Perícia Menor, só é avisado das ações da Perícia Menor.
//
// Modelos de texto: {ator} = quem fez; {concurso} = nome do concurso;
// {is} = número da IS. Nenhum modelo traz nome de candidato ou inspecionado.
import { featurePermitida, paginaPermitida, type FeatureKey, type MatrizPermissoesArmazenada } from './permissoesPadrao';

export type AlvoAcao = 'concurso' | 'is' | 'nenhum';

export interface AcaoNotificavel {
  titulo: string;
  texto: string;
  /** Página do app que precisa estar liberada (ver permissoesPadrao). */
  pagina: string;
  /** Funcionalidade que precisa estar liberada; ausente = basta a página. */
  feature?: FeatureKey;
  /** Ação exclusiva do Admin: só os outros Admins são avisados. */
  soAdmin?: boolean;
  alvo: AlvoAcao;
  /**
   * Janela (ms) em que repetições da mesma ação, pelo mesmo usuário e no mesmo
   * alvo, não geram novo aviso — evita uma notificação por célula editada.
   */
  intervaloMs?: number;
  /**
   * E-mails: quem notifica é o servidor, ao enviar (config/notificacoesEmails.ts, para Admin e Secretaria). O evento
   * do app — de versões antigas em cache — é aceito e ignorado.
   */
  peloServidor?: boolean;
}

const MIN = 60_000;

export const ACOES_NOTIFICAVEIS = {
  // --- Concursos ---------------------------------------------------------
  'concurso.criado': { titulo: 'Concurso criado', texto: '{ator} registrou a mensagem e criou o {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.registrarMensagemPDF', alvo: 'concurso' },
  'concurso.importado': { titulo: 'Concurso importado', texto: '{ator} importou o {concurso} (CSV)', pagina: 'concursosJRS', feature: 'concursosJRS.importarCsv', alvo: 'concurso' },
  'concurso.aberto': { titulo: 'Concurso aberto', texto: '{ator} abriu o {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.abrirEncerrarConcurso', alvo: 'concurso' },
  'concurso.emBreve': { titulo: 'Concurso Em Breve', texto: '{ator} voltou o {concurso} para "Em Breve"', pagina: 'concursosJRS', feature: 'concursosJRS.abrirEncerrarConcurso', alvo: 'concurso' },
  'concurso.encerrado': { titulo: 'Concurso encerrado', texto: '{ator} encerrou o {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.abrirEncerrarConcurso', alvo: 'concurso' },
  'concurso.periodo': { titulo: 'Período das IS', texto: '{ator} alterou o período das IS do {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.abrirEncerrarConcurso', alvo: 'concurso' },
  'concurso.candidatoAdicionado': { titulo: 'Candidato adicionado', texto: '{ator} adicionou um candidato ao {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.adicionarCandidato', alvo: 'concurso', intervaloMs: 10 * MIN },
  'concurso.planilhaEditada': { titulo: 'Planilha atualizada', texto: '{ator} atualizou a planilha do {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.editarDadosTabela', alvo: 'concurso', intervaloMs: 15 * MIN },
  'concurso.triagem': { titulo: 'Triagem registrada', texto: '{ator} registrou triagem no {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.editarDadosTabela', alvo: 'concurso', intervaloMs: 15 * MIN },
  'concurso.reagendado': { titulo: 'Candidato reagendado', texto: '{ator} reagendou candidato(s) do {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.reagendar', alvo: 'concurso', intervaloMs: 10 * MIN },
  'concurso.termoRecurso': { titulo: 'Termo de Recurso', texto: '{ator} gerou um Termo de Recurso no {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.gerarTermoRecurso', alvo: 'concurso' },
  'concurso.solicitacao': { titulo: 'Parecer / Exames solicitados', texto: '{ator} solicitou parecer ou exames no {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.solicitarParecerExames', alvo: 'concurso', intervaloMs: 5 * MIN },
  'concurso.examesEnviados': { titulo: 'Exames de candidato', texto: '{ator} enviou exames de candidato do {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.enviarExamesCandidato', alvo: 'concurso', intervaloMs: 10 * MIN },
  'concurso.mensagemArquivada': { titulo: 'Mensagem arquivada', texto: '{ator} arquivou uma mensagem no {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.registrarMensagemArquivo', alvo: 'concurso' },
  'concurso.emailInaptos': { titulo: 'E-mail dos inaptos', texto: '{ator} enviou o e-mail dos inaptos do {concurso}', pagina: 'concursosJRS', feature: 'concursosJRS.enviarEmailInaptos', alvo: 'concurso', peloServidor: true },
  'concurso.isLimpa': { titulo: 'IS limpa', texto: '{ator} limpou uma IS do {concurso}', pagina: 'concursosJRS', soAdmin: true, alvo: 'concurso' },

  // --- Inspeções de Saúde ------------------------------------------------
  'is.cadastrada': { titulo: 'IS cadastrada', texto: '{ator} cadastrou a IS {is}', pagina: 'inspecoes', feature: 'inspecoes.cadastrar', alvo: 'is' },
  'is.importada': { titulo: 'IS importada', texto: '{ator} importou a IS {is}', pagina: 'inspecoes', feature: 'inspecoes.cadastrar', alvo: 'is' },
  'is.agendada': { titulo: 'IS agendada', texto: '{ator} agendou a IS {is}', pagina: 'inspecoes', feature: 'inspecoes.agendar', alvo: 'is' },
  'is.editada': { titulo: 'IS atualizada', texto: '{ator} atualizou a IS {is}', pagina: 'inspecoes', feature: 'inspecoes.editar', alvo: 'is', intervaloMs: 15 * MIN },
  'is.cancelada': { titulo: 'IS cancelada', texto: '{ator} cancelou a IS {is}', pagina: 'inspecoes', feature: 'inspecoes.cancelar', alvo: 'is' },
  'is.apagada': { titulo: 'IS apagada', texto: '{ator} apagou a IS {is}', pagina: 'inspecoes', soAdmin: true, alvo: 'is' },
  'is.examesEnviados': { titulo: 'Exames da IS', texto: '{ator} enviou exames da IS {is}', pagina: 'inspecoes', feature: 'inspecoes.enviarExames', alvo: 'is', intervaloMs: 10 * MIN },
  'is.emailAgendamento': { titulo: 'E-mail de agendamento', texto: '{ator} enviou o e-mail de agendamento da IS {is}', pagina: 'inspecoes', feature: 'inspecoes.enviarEmails', alvo: 'is', peloServidor: true },
  'is.emailResultado': { titulo: 'E-mail de resultado', texto: '{ator} enviou o e-mail de resultado da IS {is}', pagina: 'inspecoes', feature: 'inspecoes.enviarEmails', alvo: 'is', peloServidor: true },
  'is.emailFaltas': { titulo: 'E-mail de faltas', texto: '{ator} enviou o e-mail de faltas do HNRe', pagina: 'inspecoes', feature: 'inspecoes.enviarEmails', alvo: 'nenhum', peloServidor: true },
  'is.emailNac': { titulo: 'E-mail NAC', texto: '{ator} enviou o e-mail ao NAC', pagina: 'inspecoes', feature: 'inspecoes.enviarEmails', alvo: 'nenhum', peloServidor: true },
  'is.emailAgendaDia': { titulo: 'E-mail das IS agendadas', texto: '{ator} enviou o e-mail das IS agendadas do dia', pagina: 'inspecoes', soAdmin: true, alvo: 'nenhum', peloServidor: true },
  'is.agendaBloqueada': { titulo: 'Agenda bloqueada', texto: '{ator} bloqueou horários da agenda das IS', pagina: 'inspecoes', feature: 'inspecoes.bloquearAgenda', alvo: 'nenhum', intervaloMs: 5 * MIN },
  'is.agendaLiberada': { titulo: 'Agenda liberada', texto: '{ator} liberou horários da agenda das IS', pagina: 'inspecoes', feature: 'inspecoes.bloquearAgenda', alvo: 'nenhum', intervaloMs: 5 * MIN },
  'is.configAgenda': { titulo: 'Turnos dos peritos', texto: '{ator} alterou a configuração de turnos dos peritos', pagina: 'inspecoes', soAdmin: true, alvo: 'nenhum' },

  // --- Inspecionados -----------------------------------------------------
  'militar.cadastrado': { titulo: 'Inspecionado cadastrado', texto: '{ator} cadastrou um inspecionado', pagina: 'militares', feature: 'militares.cadastrar', alvo: 'nenhum', intervaloMs: 10 * MIN },
  'militar.importados': { titulo: 'Inspecionados importados', texto: '{ator} importou inspecionados em lote', pagina: 'militares', feature: 'militares.cadastrar', alvo: 'nenhum' },
  'militar.editado': { titulo: 'Inspecionado atualizado', texto: '{ator} atualizou dados de inspecionado(s)', pagina: 'militares', soAdmin: true, alvo: 'nenhum', intervaloMs: 15 * MIN },
  'militar.apagado': { titulo: 'Inspecionado apagado', texto: '{ator} apagou um inspecionado', pagina: 'militares', soAdmin: true, alvo: 'nenhum' },

  // --- Pareceres ---------------------------------------------------------
  'parecer.gerado': { titulo: 'Pedido de Parecer', texto: '{ator} gerou um Pedido de Parecer', pagina: 'pareceres', feature: 'pareceres.gerar', alvo: 'nenhum', intervaloMs: 5 * MIN },
  'parecer.concluido': { titulo: 'Parecer concluído', texto: '{ator} marcou um parecer como concluído', pagina: 'pareceres', feature: 'pareceres.gerar', alvo: 'nenhum', intervaloMs: 5 * MIN },

  // --- Perícia Menor -----------------------------------------------------
  'pericia.registrada': { titulo: 'Perícia Menor', texto: '{ator} registrou uma Perícia Menor', pagina: 'pericia-menor', feature: 'pericia-menor.novo', alvo: 'nenhum' },

  // --- Conteúdos e administração (exclusivos do Admin) -------------------
  'video.publicado': { titulo: 'Novo vídeo', texto: '{ator} publicou um vídeo', pagina: 'videos', soAdmin: true, alvo: 'nenhum' },
  'infografico.publicado': { titulo: 'Novo infográfico', texto: '{ator} publicou um infográfico', pagina: 'infograficos', soAdmin: true, alvo: 'nenhum' },
  'apresentacao.publicada': { titulo: 'Nova apresentação', texto: '{ator} publicou uma apresentação', pagina: 'apresentacoes', soAdmin: true, alvo: 'nenhum' },
  'legislacao.publicada': { titulo: 'Nova legislação', texto: '{ator} cadastrou uma legislação', pagina: 'laws', soAdmin: true, alvo: 'nenhum' },
  'afastamento.registrado': { titulo: 'Afastamento', texto: '{ator} registrou ou alterou um afastamento', pagina: 'ferias', soAdmin: true, alvo: 'nenhum', intervaloMs: 5 * MIN },
  'afastamento.apagado': { titulo: 'Afastamento apagado', texto: '{ator} apagou um afastamento', pagina: 'ferias', soAdmin: true, alvo: 'nenhum' },
} satisfies Record<string, AcaoNotificavel>;

export type AcaoNotificavelId = keyof typeof ACOES_NOTIFICAVEIS;

export const acaoNotificavel = (id: string): AcaoNotificavel | null =>
  Object.prototype.hasOwnProperty.call(ACOES_NOTIFICAVEIS, id) ? (ACOES_NOTIFICAVEIS as Record<string, AcaoNotificavel>)[id] : null;

/** Rota aberta ao tocar a notificação de cada página. */
export const ROTA_DA_PAGINA: Record<string, string> = {
  concursosJRS: '/concursos',
  inspecoes: '/inspecoes',
  militares: '/inspecionados',
  pareceres: '/pareceres',
  'pericia-menor': '/pericia-menor',
  videos: '/extras/videos',
  infograficos: '/extras/infograficos',
  apresentacoes: '/extras/apresentacoes',
  laws: '/normas/legislacao',
  ferias: '/ferias',
};

/**
 * O perfil pode executar a ação? Página + funcionalidade da matriz; ações só
 * do Admin exigem Admin. Vale tanto para conferir quem fez a ação quanto para
 * escolher quem é notificado dela.
 */
export const perfilExecuta = (
  matriz: MatrizPermissoesArmazenada | null | undefined,
  perfil: string | undefined,
  req: Pick<AcaoNotificavel, 'pagina' | 'feature' | 'soAdmin'>,
): boolean => {
  if (perfil === 'admin') return true;
  if (req.soAdmin) return false;
  if (!paginaPermitida(matriz, req.pagina, perfil)) return false;
  return !req.feature || featurePermitida(matriz, req.feature, perfil);
};
