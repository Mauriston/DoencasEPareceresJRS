// Ficheiro: utils/historicoEmailsIS.ts
// Regras puras da seção "E-mails enviados" do detalhe da IS (components/inspecoes/emails/HistoricoEmailsIS.tsx):
//  - junta os registros de inspecoes/{isId}/emails (contrato em utils/registroEmailsIS.ts) com os envios que só
//    existem nos campos antigos da IS (emailResultadoEnviadoEm, emailAgendamentoEnviadoEm, emailNacEnviadoEm,
//    emailFaltaEnviadoEm), quando não há registro do mesmo tipo perto daquele horário (IS anteriores ao histórico);
//  - ordem do mais recente; data/hora "dd/mm/aaaa hh:mm" no horário de Recife; rótulo do tipo e da variante.
// Testes em utils/__tests__/historicoEmailsIS.test.ts.
import { TIPOS_EMAIL, type TipoEmail } from '../config/emails';
import { ROTULO_TIPO_EMAIL_IS, type RegistroEmailIS } from './registroEmailsIS';
import { ROTULO_MODELO_RESULTADO_BENEFICIOS, ehModeloResultadoBeneficios } from './resultadoBeneficiosIS';

export interface ItemHistoricoEmail {
  chave: string;
  tipo: TipoEmail;
  /** "Agendamento (Benefícios) · reagendamento". */
  rotulo: string;
  assunto: string;
  para: string[];
  enviadoEmMs: number;
  /** Login de quem enviou ('' quando não se sabe — registro antigo). */
  usuario: string;
  /** Veio dos campos antigos da IS (sem registro no histórico). */
  legado: boolean;
}

/** Timestamp do Firestore, Date, ms ou { seconds } → ms (0 quando não há). */
export const msDeCarimbo = (t: unknown): number => {
  if (!t) return 0;
  if (typeof t === 'number') return t;
  if (t instanceof Date) return t.getTime();
  const o = t as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
  if (typeof o.toMillis === 'function') return o.toMillis();
  if (typeof o.toDate === 'function') return o.toDate().getTime();
  if (typeof o.seconds === 'number') return o.seconds * 1000;
  return 0;
};

const rotuloDoTipo = (tipo: TipoEmail): string =>
  ROTULO_TIPO_EMAIL_IS[tipo] || TIPOS_EMAIL.find(t => t.tipo === tipo)?.rotulo || tipo;

/** Rótulo do envio: tipo + variante (reagendamento ou modelo do resultado de Benefícios). */
export const rotuloDoEnvio = (tipo: TipoEmail, variante?: string): string => {
  const base = rotuloDoTipo(tipo);
  if (!variante) return base;
  if (variante === 'reagendamento') return `${base} · reagendamento`;
  if (ehModeloResultadoBeneficios(variante)) return `${base} · ${ROTULO_MODELO_RESULTADO_BENEFICIOS[variante].toLowerCase()}`;
  return base;
};

const fmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Recife', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
/** ms → "dd/mm/aaaa hh:mm" (horário de Recife). */
export const dataHoraDoEnvio = (ms: number): string => {
  if (!ms) return '';
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
};

/** Campos antigos da IS que registravam o último envio de cada e-mail. */
export interface LegadoEmailsIS {
  emailResultadoPara?: string;
  emailResultadoEnviadoEm?: unknown;
  emailResultadoEnviadoPor?: string;
  emailAgendamentoPara?: string;
  emailAgendamentoEnviadoEm?: unknown;
  emailNacEnviadoEm?: unknown;
  emailNacEnviadoPor?: string;
  emailFaltaEnviadoEm?: unknown;
}

/** Mesma família de e-mail (os três modelos de agendamento contam como um). */
const familia = (tipo: TipoEmail): string =>
  tipo === 'agendamentoIS' || tipo === 'agendamentoGeral' || tipo === 'agendamentoBeneficios' ? 'agendamento' : tipo;

/** Registro e campo antigo do mesmo envio: horários a até 10 minutos um do outro. */
export const TOLERANCIA_LEGADO_MS = 10 * 60 * 1000;

export const mesclarHistoricoEmails = (
  registros: (RegistroEmailIS & { id: string })[],
  is: LegadoEmailsIS,
  /** Login de um uid (campos antigos guardam só o uid de quem enviou). */
  usuarioDoUid: (uid: string) => string | undefined = () => undefined,
): ItemHistoricoEmail[] => {
  const itens: ItemHistoricoEmail[] = registros.map(r => ({
    chave: r.id, tipo: r.tipo, rotulo: rotuloDoEnvio(r.tipo, r.variante), assunto: r.assunto || '',
    para: Array.isArray(r.para) ? r.para : [], enviadoEmMs: Number(r.enviadoEmMs) || 0,
    usuario: r.enviadoPor?.usuario || '', legado: false,
  }));

  const legados: { tipo: TipoEmail; ms: number; assunto: string; para?: string; por?: string }[] = [
    { tipo: 'resultadoIS', ms: msDeCarimbo(is.emailResultadoEnviadoEm), assunto: 'RESULTADO DE INSPEÇÃO DE SAÚDE', para: is.emailResultadoPara, por: is.emailResultadoEnviadoPor },
    { tipo: 'agendamentoIS', ms: msDeCarimbo(is.emailAgendamentoEnviadoEm), assunto: 'AGENDAMENTO DE INSPEÇÃO DE SAÚDE', para: is.emailAgendamentoPara },
    { tipo: 'nac', ms: msDeCarimbo(is.emailNacEnviadoEm), assunto: 'INSPEÇÕES DE SAÚDE VDF E TÉRMINOS', por: is.emailNacEnviadoPor },
    { tipo: 'faltasHNRe', ms: msDeCarimbo(is.emailFaltaEnviadoEm), assunto: 'COMUNICAÇÃO DE FALTAS A INSPEÇÕES DE SAÚDE' },
  ];
  for (const l of legados) {
    if (!l.ms) continue;
    const temRegistro = itens.some(i => familia(i.tipo) === familia(l.tipo) && Math.abs(i.enviadoEmMs - l.ms) <= TOLERANCIA_LEGADO_MS);
    if (temRegistro) continue;
    itens.push({
      chave: `legado-${l.tipo}`, tipo: l.tipo, rotulo: l.tipo === 'agendamentoIS' ? 'Agendamento' : rotuloDoTipo(l.tipo), assunto: l.assunto,
      para: l.para ? [l.para] : [], enviadoEmMs: l.ms, usuario: (l.por && usuarioDoUid(l.por)) || '', legado: true,
    });
  }
  return itens.sort((a, b) => b.enviadoEmMs - a.enviadoEmMs);
};
