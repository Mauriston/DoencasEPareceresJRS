// Ficheiro: utils/validadeExames.ts
// Validade dos exames mínimos enviados à IS (Ficha › Exames / Atestados e Laudos), conforme a norma:
//   - exames laboratoriais: 90 dias a contar da COLETA;
//   - exame toxicológico: 60 dias a contar da coleta;
//   - Beta-HCG qualitativo na IS para Ingresso no SAM/SMV: colhido no máximo 7 dias corridos antes da data inicial do
//     prazo da IS no Cronograma do Concurso (aqui comparado com a data de referência da IS — conferir o cronograma);
//   - Radiografia, Teste Ergométrico, Ecocardiograma e Eletroencefalograma: 1 ano.
// A IA só LÊ a data do laudo (coleta/realização); a conta da validade é feita aqui, de forma determinística.
// Só se aplica aos documentos enquadrados num exame mínimo da finalidade (item.exameMinimo).
import type { ItemExame } from './examesIS';

export type TipoValidade = 'laboratorial' | 'toxicologico' | 'beta_hcg_ingresso' | 'anual';

export interface RegraValidade { tipo: TipoValidade; dias: number; descricao: string }

const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const ANUAL = /radiograf|\brx\b|raio[\s-]*x|ergometr|ecocardiogra|\beco\b|eletroencefalogra|\beeg\b/;
const LAB = /hemograma|glicem|glicose|ureia|creatinin|colesterol|triglicer|\btgo\b|\btgp\b|transaminase|gama[\s-]*gt|\bggt\b|acido urico|urina|\beas\b|parasitolog|fezes|vdrl|sifilis|hiv|hepatite|hbs|anti[\s-]*hcv|tipagem|\babo\b|\brh\b|coagulograma|tsh|t4|hemoglobina glicada|plaquet|sangue|soro|laborat|bioquim|sorolog|psa|beta[\s-]*hcg/;

/** Regra de validade do exame mínimo (ou null quando a norma não fixa prazo para ele). */
export const regraValidade = (item: Pick<ItemExame, 'exameMinimo' | 'titulo' | 'tipo'>, finalidade = ''): RegraValidade | null => {
  if (!item.exameMinimo) return null;
  const nome = sem(`${item.exameMinimo} ${item.titulo}`);
  if (/toxicolog/.test(nome)) return { tipo: 'toxicologico', dias: 60, descricao: 'Exame toxicológico: 60 dias a contar da coleta' };
  if (/beta[\s-]*hcg/.test(nome) && /ingresso/.test(sem(finalidade)) && /\bsam\b|\bsmv\b/.test(sem(finalidade))) {
    return { tipo: 'beta_hcg_ingresso', dias: 7, descricao: 'Beta-HCG (Ingresso no SAM/SMV): colhido até 7 dias corridos antes do início do prazo da IS no Cronograma' };
  }
  if (ANUAL.test(nome)) return { tipo: 'anual', dias: 365, descricao: 'Radiografia, Teste Ergométrico, Ecocardiograma e Eletroencefalograma: 1 ano' };
  if (item.tipo === 'exame_laboratorial' || LAB.test(nome)) return { tipo: 'laboratorial', dias: 90, descricao: 'Exames laboratoriais: 90 dias a contar da coleta' };
  return null;
};

export type SituacaoValidade = 'valido' | 'vencido' | 'sem_data' | 'futuro';

export interface AvaliacaoValidade {
  regra: RegraValidade;
  situacao: SituacaoValidade;
  /** Último dia válido (AAAA-MM-DD), quando há data. */
  validoAte?: string;
  /** Dias entre a data do laudo e a referência. */
  dias?: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const diaUTC = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const isoDeDia = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DIA = 86_400_000;

/**
 * Avalia o exame na data de referência (a data da IS; sem ela, hoje). Vencido quando passaram mais dias que o prazo.
 * Beta-HCG do Ingresso: vencido se colhido mais de 7 dias antes da referência.
 */
export const avaliarValidade = (
  item: Pick<ItemExame, 'exameMinimo' | 'titulo' | 'tipo' | 'data'>,
  referenciaISO: string,
  finalidade = '',
): AvaliacaoValidade | null => {
  const regra = regraValidade(item, finalidade);
  if (!regra) return null;
  const data = (item.data || '').slice(0, 10);
  const ref = (referenciaISO || '').slice(0, 10);
  if (!ISO.test(data) || !ISO.test(ref)) return { regra, situacao: 'sem_data' };
  const dias = Math.round((diaUTC(ref) - diaUTC(data)) / DIA);
  const validoAte = isoDeDia(diaUTC(data) + regra.dias * DIA);
  if (dias < 0) return { regra, situacao: 'futuro', validoAte, dias };
  return { regra, situacao: dias > regra.dias ? 'vencido' : 'valido', validoAte, dias };
};
