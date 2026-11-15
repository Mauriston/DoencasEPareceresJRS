// Ficheiro: utils/emailResultadoBeneficios.ts
// Regras puras do e-mail "RESULTADO DE IS FIM {finalidade} - {inspecionado}" do grupo Benefícios
// (servidor/email/resultadoBeneficios.ts; testes em utils/__tests__/emailResultadoBeneficios.test.ts):
//  - três modelos: não enquadramento; enquadramento de militar (inativo); enquadramento de não militar
//    (dependentes, pensionistas, servidores civis inativos);
//  - envio disponível quando a IS de Benefícios tem o Nº do TIS (status Assinaturas Pendentes ou TIS assinado);
//  - pendência (lista de pendências de e-mails do app) quando a IS é finalizada (TIS assinado) sem o e-mail;
//  - modeloSugeridoPorTexto: plano B determinístico para o modelo (o app classifica com o Firebase AI Logic).

export type ModeloResultadoBeneficios = 'nao_enquadramento' | 'enquadramento_militar' | 'enquadramento_nao_militar';
export const MODELOS_RESULTADO_BENEFICIOS: ModeloResultadoBeneficios[] = ['nao_enquadramento', 'enquadramento_militar', 'enquadramento_nao_militar'];

export const ROTULO_MODELO_RESULTADO_BENEFICIOS: Record<ModeloResultadoBeneficios, string> = {
  nao_enquadramento: 'Não enquadramento',
  enquadramento_militar: 'Enquadramento (militar inativo)',
  enquadramento_nao_militar: 'Enquadramento (dependente, pensionista ou servidor civil inativo)',
};

const semAcento = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const ehModeloResultadoBeneficios = (m: unknown): m is ModeloResultadoBeneficios =>
  MODELOS_RESULTADO_BENEFICIOS.includes(m as ModeloResultadoBeneficios);

export interface ISParaResultadoBeneficios {
  status?: string;
  grupoFinalidade?: string;
  tis?: string;
  emailResultadoBeneficiosEnviadoEm?: unknown;
}

export const ehGrupoBeneficios = (grupo: string | undefined): boolean => semAcento(grupo || '') === 'beneficios';

/** Pode enviar: IS de Benefícios com Nº do TIS preenchido e status Assinaturas Pendentes ou TIS assinado. */
export const elegivelResultadoBeneficios = (is: ISParaResultadoBeneficios): boolean =>
  ehGrupoBeneficios(is.grupoFinalidade) && !!String(is.tis || '').trim()
  && (is.status === 'assinaturas_pendentes' || is.status === 'tis_assinado');

/** Pendente (lista de pendências): IS finalizada (TIS assinado) de Benefícios sem o e-mail de resultado enviado. */
export const resultadoBeneficiosPendente = (is: ISParaResultadoBeneficios): boolean =>
  is.status === 'tis_assinado' && ehGrupoBeneficios(is.grupoFinalidade) && !is.emailResultadoBeneficiosEnviadoEm;

/** "RESULTADO DE IS FIM {finalidade} - {inspecionado sem NIP}". */
export const assuntoResultadoBeneficios = (finalidade: string | undefined, nomeInspecionado: string): string =>
  `RESULTADO DE IS FIM ${String(finalidade || '').trim()} - ${nomeInspecionado}`;

/** "2026-10-30" → "30/10/2026" (vazio quando não é AAAA-MM-DD). */
export const dataBr = (iso: string | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/**
 * Plano B determinístico do modelo: o laudo é lido por partes (linhas, ";" ou "|" — uma por finalidade); se alguma
 * diz "enquadr…" sem "não enquadr…" / "não se enquadr…" / "sem enquadr…", é enquadramento. Enquadramento de
 * inspecionado do tipo 'militar' (ou sem tipo, cadastros antigos) → enquadramento_militar; senão, de não militar.
 */
export const modeloSugeridoPorTexto = (laudo: string | undefined, tipoInspecionado: string | undefined): ModeloResultadoBeneficios => {
  const partes = semAcento(String(laudo || '')).split(/[\n;|]+/).map(p => p.trim()).filter(Boolean);
  const enquadra = partes.some(p => /enquadr/.test(p) && !/(nao|sem)\s+(se\s+)?enquadr|\bdesenquadr/.test(p));
  if (!enquadra) return 'nao_enquadramento';
  return (tipoInspecionado || 'militar') === 'militar' ? 'enquadramento_militar' : 'enquadramento_nao_militar';
};
