// Ficheiro: utils/resultadoBeneficiosIS.ts
// Regras puras (front) do e-mail "RESULTADO DE IS FIM {finalidade} - {inspecionado}" do grupo Benefícios
// (servidor/email/resultadoBeneficios.ts do pacote B2; rota POST /api/email/resultado-beneficios):
//  - quando o envio fica disponível (Nº do TIS preenchido: Assinaturas pendentes ou TIS assinado) e quando entra
//    nas pendências do menu "Enviar e-mail" (finalizada — TIS assinado — e ainda não enviado);
//  - os três modelos (não enquadramento; enquadramento de militar inativo; enquadramento de não militar —
//    dependente, pensionista, servidor civil) e o pedido à IA (services/resultadoBeneficiosIA.ts), com o ajuste
//    final pelo cadastro: a IA decide enquadramento × não enquadramento pelo laudo; quem é militar vem do cadastro.
// resultadoBeneficiosPendente tem a mesma assinatura da regra do pacote B2 (utils/emailResultadoBeneficios.ts).
// Testes em utils/__tests__/resultadoBeneficiosIS.test.ts.
import { higienizarParaIA } from './minimizacaoIA';

export type ModeloResultadoBeneficios = 'nao_enquadramento' | 'enquadramento_militar' | 'enquadramento_nao_militar';

export const MODELOS_RESULTADO_BENEFICIOS: ModeloResultadoBeneficios[] = ['nao_enquadramento', 'enquadramento_militar', 'enquadramento_nao_militar'];

export const ROTULO_MODELO_RESULTADO_BENEFICIOS: Record<ModeloResultadoBeneficios, string> = {
  nao_enquadramento: 'Não enquadramento',
  enquadramento_militar: 'Enquadramento · militar inativo',
  enquadramento_nao_militar: 'Enquadramento · não militar',
};

const semAcento = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const ehGrupoBeneficios = (grupoFinalidade: string | undefined): boolean => semAcento(grupoFinalidade || '') === 'beneficios';

export interface ISParaResultadoBeneficios {
  grupoFinalidade?: string;
  status?: string;
  tis?: string;
  emailResultadoBeneficiosEnviadoEm?: unknown;
}

/** O e-mail já foi enviado (o servidor grava emailResultadoBeneficiosEnviadoEm). */
export const resultadoBeneficiosEnviado = (is: ISParaResultadoBeneficios): boolean => !!is.emailResultadoBeneficiosEnviadoEm;

/** Envio disponível (menu da IS e detalhe): Benefícios, com Nº do TIS (Assinaturas pendentes ou TIS assinado). */
export const resultadoBeneficiosDisponivel = (is: ISParaResultadoBeneficios): boolean =>
  ehGrupoBeneficios(is.grupoFinalidade) && !!String(is.tis || '').trim()
  && (is.status === 'assinaturas_pendentes' || is.status === 'tis_assinado');

/** Pendente no menu "Enviar e-mail": IS de Benefícios finalizada (TIS assinado), com Nº do TIS, ainda não enviada. */
export const resultadoBeneficiosPendente = (is: ISParaResultadoBeneficios): boolean =>
  ehGrupoBeneficios(is.grupoFinalidade) && is.status === 'tis_assinado' && !!String(is.tis || '').trim() && !resultadoBeneficiosEnviado(is);

// ---------------------------------------------------------------------------
// Inspecionado: militar (inativo) × não militar (dependente, pensionista, servidor civil)
// ---------------------------------------------------------------------------

export type CategoriaBeneficios = 'militar' | 'nao_militar';

/** Pelo cadastro (coleção militares): dependente/pensionista ou servidor civil (posto "SC…") → não militar. */
export const categoriaDoInspecionado = (m?: { tipo?: string; pgq?: string } | null): CategoriaBeneficios | null => {
  if (!m) return null;
  if (m.tipo === 'dependente' || m.tipo === 'pensionista') return 'nao_militar';
  if (/^SC[A-Z]*\b/i.test(String(m.pgq || '').trim())) return 'nao_militar';
  return 'militar';
};

export const descricaoCategoria = (m?: { tipo?: string; pgq?: string; rm1?: boolean; refo?: boolean } | null): string => {
  if (!m) return 'sem cadastro';
  if (m.tipo === 'dependente') return 'dependente';
  if (m.tipo === 'pensionista') return 'pensionista';
  if (categoriaDoInspecionado(m) === 'nao_militar') return 'servidor civil';
  return m.refo ? 'militar reformado' : m.rm1 ? 'militar da reserva (RM1)' : 'militar';
};

/**
 * Ajuste final da sugestão: enquadramento × não enquadramento vem da IA (laudo); militar × não militar vem do
 * cadastro quando ele existe (o cadastro manda).
 */
export const ajustarModeloPeloCadastro = (modelo: ModeloResultadoBeneficios, categoria: CategoriaBeneficios | null): ModeloResultadoBeneficios => {
  if (modelo === 'nao_enquadramento' || !categoria) return modelo;
  return categoria === 'militar' ? 'enquadramento_militar' : 'enquadramento_nao_militar';
};

export const ehModeloResultadoBeneficios = (v: unknown): v is ModeloResultadoBeneficios =>
  MODELOS_RESULTADO_BENEFICIOS.includes(v as ModeloResultadoBeneficios);

export interface DadosModeloBeneficios {
  finalidade: string;
  laudo: string;
  restricoes?: string;
  observacoes?: string;
  /** "militar reformado", "dependente", "servidor civil"… (descricaoCategoria). */
  inspecionado: string;
  /** Só posto/quadro (sem NIP e nome). */
  posto?: string;
}

/** Instruções para a IA (Firebase AI Logic). Minimização: sem nome, NIP nem OM; textos higienizados. */
export const instrucoesModeloBeneficios = (d: DadosModeloBeneficios): string => [
  'Você escolhe o modelo do e-mail de RESULTADO de uma Inspeção de Saúde (IS) do grupo Benefícios da Marinha do Brasil (DGPM-406).',
  'Leia o laudo/conclusão registrado na IS. Uma IS de Benefícios costuma ter MAIS DE UMA finalidade (ex.: reforma, isenção de imposto de renda, auxílio-invalidez, pensão, assistência médico-hospitalar).',
  'Enquadramento = o laudo reconhece, em pelo menos UMA das finalidades, que o inspecionado se enquadra/faz jus (ex.: "enquadra-se", "é portador de doença especificada em lei", "inválido", "incapaz definitivamente", "faz jus").',
  'Não enquadramento = o laudo não reconhece o enquadramento em NENHUMA das finalidades (ex.: "não se enquadra", "não é portador", "não faz jus").',
  'Se ao menos uma finalidade for de enquadramento, o modelo é de enquadramento.',
  'Escolha "enquadramento_militar" para militar inativo (reserva/reformado ou militar); "enquadramento_nao_militar" para dependente, pensionista ou servidor civil; "nao_enquadramento" quando não houver enquadramento.',
  'Responda com o modelo e uma justificativa curta (uma frase, até 25 palavras, em português).',
  '',
  'IS:',
  `- Finalidade: ${higienizarParaIA(d.finalidade || '(não informada)', 300)}`,
  `- Inspecionado: ${higienizarParaIA(d.inspecionado || '(não informado)', 60)}`,
  `- Posto/quadro: ${higienizarParaIA(d.posto || '(não informado)', 40)}`,
  `- Laudo: ${higienizarParaIA(d.laudo || '(sem laudo)', 1200)}`,
  `- Restrições: ${higienizarParaIA(d.restricoes || '(nenhuma)', 300)}`,
  `- Observações: ${higienizarParaIA(d.observacoes || '(nenhuma)', 400)}`,
].join('\n');
