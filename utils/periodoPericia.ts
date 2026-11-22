// Ficheiro: utils/periodoPericia.ts
// Filtro de PERÍODO da lista da Perícia Menor (seletor "Período": Este mês · Este trimestre · Este semestre ·
// Este ano · Personalizado — de/até). A data de referência de cada registro é a do atestado (registro) ou, na
// homologação, a data da homologação (dataPericia) — não a data de gravação no banco. Trimestre e semestre são os do ano civil.
// URL: ?periodo=mes|trimestre|semestre|ano|personalizado&de=AAAA-MM-DD&ate=AAAA-MM-DD; os atalhos antigos
// ?mes=atual / ?ano=atual (Início/Painel) continuam valendo como "Este mês" / "Este ano".
// Testes em utils/__tests__/periodoPericia.test.ts.

export type PeriodoPericia = '' | 'mes' | 'trimestre' | 'semestre' | 'ano' | 'personalizado';

export const OPCOES_PERIODO: { valor: PeriodoPericia; rotulo: string }[] = [
  { valor: '', rotulo: 'Todo o período' },
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'trimestre', rotulo: 'Este trimestre' },
  { valor: 'semestre', rotulo: 'Este semestre' },
  { valor: 'ano', rotulo: 'Este ano' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const p2 = (n: number) => String(n).padStart(2, '0');
const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

/** Período lido da URL (com os atalhos antigos ?mes=atual / ?ano=atual). */
export const periodoDaUrl = (p: { periodo?: string | null; mes?: string | null; ano?: string | null }): PeriodoPericia => {
  const v = p.periodo ?? '';
  if (OPCOES_PERIODO.some(o => o.valor === v && v)) return v as PeriodoPericia;
  if (p.mes === 'atual') return 'mes';
  if (p.ano === 'atual') return 'ano';
  return '';
};

/** Intervalo [início, fim] (AAAA-MM-DD, inclusive) do período; null = sem filtro (ou personalizado incompleto). */
export const intervaloPeriodo = (periodo: PeriodoPericia, hoje: string, de = '', ate = ''): { inicio: string; fim: string } | null => {
  const [a, m] = hoje.split('-').map(Number);
  if (!a || !m) return null;
  const faixa = (m1: number, m2: number) => ({ inicio: `${a}-${p2(m1)}-01`, fim: `${a}-${p2(m2)}-${p2(ultimoDia(a, m2))}` });
  switch (periodo) {
    case 'mes': return faixa(m, m);
    case 'trimestre': { const q = Math.floor((m - 1) / 3) * 3 + 1; return faixa(q, q + 2); }
    case 'semestre': return m <= 6 ? faixa(1, 6) : faixa(7, 12);
    case 'ano': return faixa(1, 12);
    case 'personalizado': {
      const i = ISO.test(de) ? de : '';
      const f = ISO.test(ate) ? ate : '';
      if (!i && !f) return null;
      // Só um dos lados: aberto no outro; invertidos: troca.
      const ini = i || '0000-01-01';
      const fim = f || '9999-12-31';
      return ini <= fim ? { inicio: ini, fim } : { inicio: fim, fim: ini };
    }
    default: return null;
  }
};

/** Data de referência do registro: a do atestado ou, na homologação, a data da homologação (dataPericia) —
 *  nunca a data em que o registro foi gravado no banco (criadoEm). */
export const dataReferenciaPericia = (p: { dataAtestado?: string; dataPericia?: string; homologacao?: boolean }): string =>
  String((p.homologacao ? p.dataPericia || p.dataAtestado : p.dataAtestado || p.dataPericia) || '').slice(0, 10);

export const noPeriodo = (data: string, intervalo: { inicio: string; fim: string } | null): boolean =>
  !intervalo || (!!data && data >= intervalo.inicio && data <= intervalo.fim);
