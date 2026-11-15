// Ficheiro: utils/emailAberturaIS.ts
// Regras puras e textos do e-mail "ABERTURA DE IS FIM {finalidade} - {inspecionado}" ao inspecionado
// (servidor/email/aberturaIS.ts; template servidor/email/templateAberturaIS.ts). Testadas em
// utils/__tests__/emailAberturaIS.test.ts. Três variantes (DGPM-406 9ª Rev, item 2.1.2, alíneas b e c):
//  - 'exames':      finalidade com exames mínimos (guias) → comparecer à JRS em 7 dias úteis para obter as guias;
//  - 'agendamento': finalidade sem exames mínimos → agendar em 7 dias úteis, presencialmente ou pelo telefone;
//  - 'beneficios':  grupo Benefícios → agendar em 60 dias (a norma diz "sessenta dias"), presencialmente ou pelo telefone.
// Quem diz se a finalidade tem exames mínimos é utils/guiasExames.ts (finalidadeTemExamesMinimos, pacote A):
// aqui entra só o booleano.
import { GRUPO_BENEFICIOS, dataBr, diasUteisEntre, somarDias } from './inspecoes';
import { inspecionadoSemNip, tratamentoInspecionado, type SexoCadastro } from './emailGuiasIS';

export type VarianteAbertura = 'exames' | 'agendamento' | 'beneficios';

export const TELEFONE_JRS = '(81) 3036-9073';
export const PRAZO_DIAS_UTEIS_ABERTURA = 7;
export const PRAZO_DIAS_BENEFICIOS_ABERTURA = 60;

export const assuntoAbertura = (finalidade: string, inspecionado: string): string =>
  `ABERTURA DE IS FIM ${String(finalidade || '').trim()} - ${inspecionadoSemNip(inspecionado)}`;

/** Benefícios prevalece (prazo de 60 dias); senão, com exames mínimos → obter as guias; sem → agendar. */
export const varianteAbertura = (grupoFinalidade: string | undefined, temExamesMinimos: boolean): VarianteAbertura =>
  grupoFinalidade === GRUPO_BENEFICIOS ? 'beneficios' : temExamesMinimos ? 'exames' : 'agendamento';

/** Data-limite (AAAA-MM-DD): 7º dia útil depois da abertura (feriados de utils/inspecoes.ts) ou 60 dias corridos (Benefícios). */
export const prazoFinalAbertura = (dataAbertura: string, variante: VarianteAbertura): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataAbertura || ''))) return '';
  if (variante === 'beneficios') return somarDias(dataAbertura, PRAZO_DIAS_BENEFICIOS_ABERTURA);
  let d = dataAbertura;
  for (let i = 0; i < 40 && diasUteisEntre(dataAbertura, d) < PRAZO_DIAS_UTEIS_ABERTURA; i++) d = somarDias(d, 1);
  return d;
};

export interface TextosAbertura {
  variante: VarianteAbertura;
  /** dd/mm/aaaa da abertura (data de apresentação). */
  data: string;
  /** dd/mm/aaaa da data-limite. */
  prazo: string;
  /** "participo abertura de IS fim … em dd/mm/aaaa." */
  abertura: string;
  /** Título do card do prazo. */
  tituloPrazo: string;
  /** Frase do prazo (o que fazer, em quanto tempo, a partir de quando, como). */
  prazoTexto: string;
  /** Explicação do arquivamento (alínea c do item 2.1.2). */
  arquivamento: string;
  /** Card de destaque: cancelamento (arquivamento no SINAIS) e contravenção disciplinar. */
  destaque: string;
}

/** Textos do corpo (os mesmos no HTML e no texto simples). */
export const textosAbertura = (o: { finalidade: string; dataAbertura: string; variante: VarianteAbertura; sexo?: SexoCadastro }): TextosAbertura => {
  const data = dataBr(o.dataAbertura) || String(o.dataAbertura || '');
  const prazo = dataBr(prazoFinalAbertura(o.dataAbertura, o.variante));
  const voce = tratamentoInspecionado(o.sexo, true);
  const ate = prazo ? `, ou seja, até ${prazo}` : '';
  const prazoTexto = o.variante === 'exames'
    ? `${voce} deverá comparecer à Secretaria da JRS/HNRe em até ${PRAZO_DIAS_UTEIS_ABERTURA} (sete) dias úteis a contar da data de apresentação (${data})${ate}, para obter as guias dos exames necessários à realização da IS.`
    : o.variante === 'agendamento'
      ? `${voce} deverá realizar o agendamento da IS em até ${PRAZO_DIAS_UTEIS_ABERTURA} (sete) dias úteis a contar da data de apresentação (${data})${ate}, presencialmente na Secretaria da JRS/HNRe ou pelo telefone ${TELEFONE_JRS}.`
      : `${voce} deverá realizar o agendamento da IS em até ${PRAZO_DIAS_BENEFICIOS_ABERTURA} (sessenta) dias a contar da data de apresentação (${data})${ate}, presencialmente na Secretaria da JRS/HNRe ou pelo telefone ${TELEFONE_JRS}.`;
  return {
    variante: o.variante,
    data,
    prazo,
    abertura: `participo abertura de IS fim ${String(o.finalidade || '').trim()} em ${data}.`,
    tituloPrazo: o.variante === 'exames' ? 'Prazo para obter as guias dos exames' : 'Prazo para o agendamento da IS',
    prazoTexto,
    arquivamento: 'Conforme as alíneas b e c do item 2.1.2 da DGPM-406 9ª Rev, a ausência de comparecimento ou agendamento nos prazos estabelecidos demandará o arquivamento da IS no SINAIS, cabendo à OM do inspecionado ou à Autoridade solicitante reapresentá-lo para nova IS.',
    destaque: 'O não cumprimento do prazo acima implica o cancelamento (arquivamento no SINAIS) da IS e pode ser enquadrado como contravenção disciplinar, a critério do Titular da OM.',
  };
};

/** Alínea e do item 2.3.3 da DGPM-406 9ª Rev (citação literal). */
export const CITACAO_2_3_3_E = 'os inspecionados são responsáveis ainda pelo agendamento e comparecimento às JS na data marcada para realização de sua IS, podendo a inobservância de tal orientação ser caracterizada como contravenção disciplinar';
