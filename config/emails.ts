// Ficheiro: config/emails.ts
// Contrato compartilhado (app e servidor) dos e-mails automáticos da JRS: tipos, destinatários FIXOS padrão
// (PARA / CC / CCO), assinaturas do Presidente e do Supervisor e a saudação do e-mail de faltas. O Admin edita tudo isso em Configurações (documento
// config/emails no Firestore; só o Admin grava). O servidor lê o documento e cai nestes padrões quando um
// campo não existe (servidor/email/comum.ts).
//
// Os destinatários DINÂMICOS não são configuráveis aqui — o servidor sempre os acrescenta:
//   - resultadoIS:     PARA = e-mail do inspecionado.
//   - agendaIS:        PARA += institucionais dos user_medicos/user_medicos_mpi; CC += Gmail de Admin, médicos, MPI e Secretaria.
//   - agendamentoIS:   PARA = e-mail do inspecionado; CC += institucional do médico da IS.
//   - faltasHNRe:      CC += e-mails dos inspecionados (quando cadastrados).
//   - inaptosConcurso: nenhum.
// "Responder para" (Reply-To) é sempre a caixa da JRS (`responderPara`).

export type TipoEmail = 'resultadoIS' | 'agendaIS' | 'agendamentoIS' | 'faltasHNRe' | 'inaptosConcurso';

export interface DestinatariosEmail { para: string[]; cc: string[]; cco: string[] }

export interface AssinaturaPresidente {
  presidenteNome: string; presidentePosto: string;
  /** Supervisor: assinatura fixa ("Por ordem de:") do e-mail interno das IS agendadas (agendaIS). */
  supervisorNome: string; supervisorPosto: string; supervisorCargo: string;
}

/** Documento config/emails. */
export interface ConfigEmails {
  /** Caixa da JRS: Reply-To de todos os e-mails. */
  responderPara: string;
  assinatura: AssinaturaPresidente;
  /** Saudação do e-mail de faltas do HNRe (encarregada da Divisão de Pessoal). */
  saudacaoFaltasHNRe: string;
  destinatarios: Record<TipoEmail, DestinatariosEmail>;
}

export const CAIXA_JRS = 'hnre.jrs@marinha.mil.br';

export const CONFIG_EMAILS_PADRAO: ConfigEmails = {
  responderPara: CAIXA_JRS,
  assinatura: {
    presidenteNome: 'Mauriston Renan Martins Silva', presidentePosto: 'Capitão-Tenente (Md)',
    supervisorNome: 'Alessandro Giorginis Fidelis de Souza', supervisorPosto: 'Suboficial-RM1-EF', supervisorCargo: 'Supervisor',
  },
  saudacaoFaltasHNRe: 'Prezada CT (S) Luciana Madruga e demais Militares da Divisão de Pessoal,',
  destinatarios: {
    resultadoIS: { para: [], cc: [], cco: [CAIXA_JRS] },
    agendaIS: { para: [CAIXA_JRS], cc: [], cco: [] },
    agendamentoIS: { para: [], cc: [CAIXA_JRS], cco: [] },
    faltasHNRe: {
      para: ['luciana.madruga@marinha.mil.br', 'romero.andion@marinha.mil.br', 'daniel.barros2@marinha.mil.br', 'amanda.ribeiro@marinha.mil.br'],
      cc: ['fernanda.rocha@marinha.mil.br', CAIXA_JRS],
      cco: [],
    },
    inaptosConcurso: { para: ['eampe.concursos@marinha.mil.br'], cc: [CAIXA_JRS], cco: [] },
  },
};

/** Rótulos e o que o servidor acrescenta sozinho (mostrados na página Configurações). */
export const TIPOS_EMAIL: { tipo: TipoEmail; rotulo: string; assunto: string; dinamicos: string }[] = [
  { tipo: 'resultadoIS', rotulo: 'Resultado da IS ao inspecionado', assunto: 'RESULTADO DE INSPEÇÃO DE SAÚDE', dinamicos: 'PARA: e-mail do inspecionado.' },
  { tipo: 'agendaIS', rotulo: 'IS agendadas do dia seguinte (18h)', assunto: 'IS AGENDADAS EM dd/mm/aaaa', dinamicos: 'PARA: e-mails institucionais dos médicos e do MPI. CC: Gmail do Admin, médicos, MPI e Secretaria. Assinaturas fixas: Supervisor e Presidente.' },
  { tipo: 'agendamentoIS', rotulo: 'Agendamento de IS (Verificações e Términos)', assunto: 'AGENDAMENTO DE INSPEÇÃO DE SAÚDE', dinamicos: 'PARA: e-mail do inspecionado. CC: e-mail institucional do médico da IS.' },
  { tipo: 'faltasHNRe', rotulo: 'Faltas às IS (inspecionados do HNRe)', assunto: 'COMUNICAÇÃO DE FALTAS A INSPEÇÕES DE SAÚDE', dinamicos: 'CC: e-mails dos inspecionados, quando cadastrados.' },
  { tipo: 'inaptosConcurso', rotulo: 'Candidatos inaptos de concurso (EAMPE)', assunto: '{concurso} - Candidatos Inaptos', dinamicos: 'Nenhum.' },
];

const EMAIL_OK = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
export const emailValidoCfg = (e: string): boolean => EMAIL_OK.test(String(e || '').trim());

/** Normaliza uma lista (minúsculas, sem vazios nem repetidos, só endereços válidos). */
export const normalizarLista = (l: unknown): string[] =>
  Array.from(new Set((Array.isArray(l) ? l : []).map(e => String(e || '').trim().toLowerCase()).filter(emailValidoCfg)));

/** Junta o documento salvo com os padrões (campo ausente = padrão). */
export const mesclarConfigEmails = (salvo: unknown): ConfigEmails => {
  const s = (salvo && typeof salvo === 'object' ? salvo : {}) as Partial<ConfigEmails> & Record<string, any>;
  const p = CONFIG_EMAILS_PADRAO;
  const destinatarios = {} as Record<TipoEmail, DestinatariosEmail>;
  (Object.keys(p.destinatarios) as TipoEmail[]).forEach(t => {
    const d = s.destinatarios?.[t] as Partial<DestinatariosEmail> | undefined;
    destinatarios[t] = {
      para: d?.para !== undefined ? normalizarLista(d.para) : p.destinatarios[t].para,
      cc: d?.cc !== undefined ? normalizarLista(d.cc) : p.destinatarios[t].cc,
      cco: d?.cco !== undefined ? normalizarLista(d.cco) : p.destinatarios[t].cco,
    };
  });
  return {
    responderPara: emailValidoCfg(s.responderPara ?? '') ? String(s.responderPara).trim().toLowerCase() : p.responderPara,
    assinatura: {
      presidenteNome: String(s.assinatura?.presidenteNome || '').trim() || p.assinatura.presidenteNome,
      presidentePosto: String(s.assinatura?.presidentePosto || '').trim() || p.assinatura.presidentePosto,
      supervisorNome: String(s.assinatura?.supervisorNome || '').trim() || p.assinatura.supervisorNome,
      supervisorPosto: String(s.assinatura?.supervisorPosto || '').trim() || p.assinatura.supervisorPosto,
      supervisorCargo: String(s.assinatura?.supervisorCargo || '').trim() || p.assinatura.supervisorCargo,
    },
    saudacaoFaltasHNRe: String(s.saudacaoFaltasHNRe || '').trim() || p.saudacaoFaltasHNRe,
    destinatarios,
  };
};

/** Cargo na assinatura, sem "JRS/HNRe" (ex.: "Secretário da JRS/HNRe" → "Secretário"). */
export const cargoSemJrs = (cargo: string): string =>
  String(cargo || '').replace(/\s*(?:[-–—,]\s*)?(?:d[aoe]s?\s+)?JRS\s*\/\s*HNRe\b/gi, '').replace(/\s{2,}/g, ' ').trim();
