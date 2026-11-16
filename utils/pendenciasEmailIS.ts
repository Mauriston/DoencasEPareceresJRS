// Ficheiro: utils/pendenciasEmailIS.ts
// Listas de e-mails pendentes da IS, por tipo — as mesmas do menu "Enviar e-mails" de Inspeções
// (components/inspecoes/BotaoEnviarEmail.tsx) e dos itens de e-mail do card "Pendências" da Início.
import type { InspecaoRecord } from '../services/firestoreInspecoes';
import type { TipoEmailPendente } from './emailsDispensados';
import { agendamentoPendente } from './emailAgendamentoIS';
import { resultadoPendente } from './emailResultadoIS';
import { resultadoBeneficiosPendente } from './resultadoBeneficiosIS';
import { faltasPendentesHNRe } from './emailFaltasHNRe';
import { pendentesNac } from './emailNac';

/** Rótulo e ícone de cada tipo, na ordem do menu. `email` é o valor do ?email= de /inspecoes que abre o modal. */
export const TIPOS_EMAIL_PENDENTE: { tipo: TipoEmailPendente; rotulo: string; icone: string; singular: string; plural: string }[] = [
  { tipo: 'agendamento', rotulo: 'E-mails de agendamento', icone: 'forward_to_inbox', singular: 'e-mail de agendamento pendente', plural: 'e-mails de agendamento pendentes' },
  { tipo: 'resultado', rotulo: 'E-mails de resultado', icone: 'mark_email_unread', singular: 'e-mail de resultado pendente', plural: 'e-mails de resultado pendentes' },
  { tipo: 'beneficios', rotulo: 'Resultado (Benefícios)', icone: 'mark_email_unread', singular: 'resultado de Benefícios pendente', plural: 'resultados de Benefícios pendentes' },
  { tipo: 'faltas', rotulo: 'E-mail de faltas (HNRe)', icone: 'unsubscribe', singular: 'falta do HNRe a comunicar', plural: 'faltas do HNRe a comunicar' },
  { tipo: 'nac', rotulo: 'Enviar e-mail NAC', icone: 'assignment_turned_in', singular: 'IS a enviar ao NAC', plural: 'IS a enviar ao NAC' },
];

export const ehTipoEmailPendente = (v: string | null | undefined): v is TipoEmailPendente =>
  TIPOS_EMAIL_PENDENTE.some(t => t.tipo === v);

export type PendenciasEmailIS = Record<TipoEmailPendente, InspecaoRecord[]>;

/** IS com e-mail pendente, por tipo (cada lista já na ordem do modal). `omDe`: OM do inspecionado (faltas do HNRe). */
export const pendenciasEmailIS = (inspecoes: InspecaoRecord[], omDe: (inspecionadoId: string) => string | undefined, hoje: string): PendenciasEmailIS => ({
  agendamento: inspecoes.filter(i => agendamentoPendente(i, hoje)).sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista)),
  resultado: inspecoes.filter(resultadoPendente).sort((a, b) => String(a.dataLaudo || '').localeCompare(String(b.dataLaudo || '')) || a.is - b.is),
  beneficios: inspecoes.filter(resultadoBeneficiosPendente).sort((a, b) => String(a.dataLaudo || '').localeCompare(String(b.dataLaudo || '')) || a.is - b.is),
  faltas: faltasPendentesHNRe(inspecoes, omDe),
  nac: pendentesNac(inspecoes),
});
