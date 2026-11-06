// Ficheiro: utils/periciaMenorRegras.ts
// Regras de tempo da Perícia Menor / Atestado (funções puras, testadas em utils/__tests__):
// - sem homologação, o tempo do atestado vale como tempo de dispensa e é limitado a 20 dias;
// - com homologação (atestado externo), o tempo do atestado é livre e o "Tempo homologado" é que
//   conta, limitado a 20 dias;
// - somado às perícias do mesmo militar vigentes ou concluídas há até 10 dias, o total não passa de 30.
export const MAX_DIAS_PERICIA = 20;
export const MAX_DIAS_ACUMULADOS = 30;
export const JANELA_ACUMULO_DIAS = 10;

/** Só dígitos, mínimo 1; acima de `max` vira `max` (e avisa com `cortado`). */
export const limitarDias = (texto: string, max?: number): { valor: string; cortado: boolean } => {
  const n = texto.replace(/\D/g, '');
  if (!n) return { valor: '', cortado: false };
  const num = Math.max(parseInt(n, 10), 1);
  if (max && num > max) return { valor: String(max), cortado: true };
  return { valor: String(num), cortado: false };
};

const somarDias = (iso: string, dias: number): string => {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export interface PericiaAnterior { dataTermino: string; tempoHomologado: number }

/** Perícias do militar ainda vigentes ou concluídas há até 10 dias (pela data de término). */
export const periciasNaJanela = <T extends PericiaAnterior>(lista: T[], hoje: string): T[] => {
  const limite = somarDias(hoje, -JANELA_ACUMULO_DIAS);
  return lista.filter(p => p.dataTermino && p.dataTermino >= limite);
};

/** Dias já usados na janela e quantos ainda cabem no limite de 30. */
export const saldoAcumulado = (lista: PericiaAnterior[], hoje: string): { usados: number; restante: number; quantidade: number } => {
  const janela = periciasNaJanela(lista, hoje);
  const usados = janela.reduce((s, p) => s + (p.tempoHomologado || 0), 0);
  return { usados, restante: Math.max(0, MAX_DIAS_ACUMULADOS - usados), quantidade: janela.length };
};

/** Máscara "dd/mm/aaaa" enquanto se digita. */
export const mascaraDataBR = (texto: string): string => {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
