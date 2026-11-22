// Ficheiro: utils/pendenciasHomeIS.ts
// Regras puras das pendências de IS do card "Pendências" da Início (components/Home.tsx), além das de e-mail
// (utils/pendenciasEmailIS.ts). Perfis: todos que veem IS, exceto user_medicos_mpi — que só vê as duas pendências
// de prazo (sem agendamento / conclusão pendente) e apenas das IS de MPI. Testes: utils/__tests__/pendenciasHomeIS.test.ts.
import { diasEntre, diasUteisEntre, GRUPO_BENEFICIOS, PRAZO_ATRASO_DIAS_BENEFICIOS, PRAZO_ATRASO_DIAS } from './inspecoes';
import { ehGrupoBeneficios, ehVdfOuTermino, laudoEnquadramento, ehMilitarInativo } from './documentosIS';
import { laudoIncapazDefinitivoSAM } from './minutaMensagemResultado';
import { podeMinutarMsg } from './mensagensIS';
import { pendentesNac, type ISParaNac } from './emailNac';

export const PERFIL_MPI = 'user_medicos_mpi';
export const DIAS_NAC_PENDENTE = 7;
export const DIAS_CONCLUSAO_PENDENTE = 20;

export interface ISPendenciaHome {
  status?: string;
  situacao?: string;
  amp?: string;
  dataAbertura?: string;
  dataEntrevista?: string;
  grupoFinalidade?: string;
  finalidade?: string;
  laudo?: string;
  tis?: string;
  guiasEntregues?: boolean;
  emailAberturaPara?: string;
  emailAberturaEnviadoEm?: unknown;
  inspecionadoId?: string;
}

const dia = (s?: string) => String(s || '').slice(0, 10);

/** E-mail de abertura ainda não enviado (IS aberta, antes do agendamento). */
export const aberturaPendente = (is: ISPendenciaHome): boolean =>
  is.situacao === 'aberta' && !is.emailAberturaEnviadoEm && !is.emailAberturaPara;

/** IS aberta há mais de 7 dias úteis (60 dias corridos em Benefícios), sem agendamento e sem guias entregues. */
export const semAgendamentoNoPrazo = (is: ISPendenciaHome, hoje: string): boolean => {
  if (is.situacao !== 'aberta' || is.dataEntrevista || is.guiasEntregues || !is.dataAbertura) return false;
  return is.grupoFinalidade === GRUPO_BENEFICIOS
    ? diasEntre(dia(is.dataAbertura), hoje) > PRAZO_ATRASO_DIAS_BENEFICIOS
    : diasUteisEntre(dia(is.dataAbertura), hoje) > PRAZO_ATRASO_DIAS;
};

/** Entrevista há mais de 20 dias e IS ainda em "Conclusão pendente", sem laudo. */
export const conclusaoPendenteAntiga = (is: ISPendenciaHome, hoje: string): boolean =>
  is.status === 'conclusao_pendente' && !!is.dataEntrevista && diasEntre(dia(is.dataEntrevista), hoje) > DIAS_CONCLUSAO_PENDENTE && !(is.laudo || '').trim();

/** Finalizada pela JSD (não é com a JRS): Benefícios de militar inativo com enquadramento; VDF/Término com incapacidade definitiva para o SAM. */
export const finalizadaPelaJSD = (is: ISPendenciaHome, militar: { tipo?: unknown; rm1?: unknown; refo?: unknown } | null | undefined): boolean =>
  (ehGrupoBeneficios(is) && laudoEnquadramento(is.laudo) && ehMilitarInativo(militar))
  || (ehVdfOuTermino(is) && laudoIncapazDefinitivoSAM(is.laudo));

/** IS finalizada (não cancelada) sem minuta MSG de resultado registrada; exceto as finalizadas pela JSD. */
export const semMinutaMsg = (is: ISPendenciaHome, temMensagem: boolean, militar?: { tipo?: unknown; rm1?: unknown; refo?: unknown } | null): boolean =>
  is.situacao === 'finalizada' && is.status !== 'cancelada' && !temMensagem && podeMinutarMsg(is) && !finalizadaPelaJSD(is, militar);

/** Falta registrada (status "Faltou") que ainda não virou "Cancelada" pela minuta de cancelamento / e-mail de falta do HNRe. */
export const faltaNaoCancelada = (is: ISPendenciaHome): boolean => is.status === 'faltou';

/** NAC: a lista encerrada tem IS cuja data de laudo mais antiga passou de 7 dias (a pendência é a lista inteira). */
export const nacAtrasado = (lista: ISParaNac[], hoje: string): boolean => {
  const mais = pendentesNac(lista)[0];
  return !!mais && !!dia(mais.dataLaudo) && diasEntre(dia(mais.dataLaudo), hoje) > DIAS_NAC_PENDENTE;
};
