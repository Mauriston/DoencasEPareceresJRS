// Ficheiro: utils/emailNac.ts
// Regras puras do e-mail "INSPEÇÕES DE SAÚDE VDF E TÉRMINOS" ao NAC (Núcleo de Avaliação e Controle) — servidor em
// servidor/email/nac.ts; testes em utils/__tests__/emailNac.test.ts:
//  - pendente = IS em situação "Finalizada" (não cancelada) do grupo "Verificações e Términos" ainda sem e-mail ao NAC;
//  - período do e-mail/anexo = data do laudo mais antiga e mais recente das IS enviadas;
//  - paginação do anexo (A4 paisagem): 9 linhas por página, com espaço para a assinatura na última.

export const ASSUNTO_NAC = 'INSPEÇÕES DE SAÚDE VDF E TÉRMINOS';

const semAcento = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export interface ISParaNac {
  situacao?: string;
  status?: string;
  grupoFinalidade?: string;
  dataLaudo?: string;
  emailNacEnviadoEm?: unknown;
}

/** IS em situação "Finalizada" (não cancelada) de Verificações e Términos ainda não enviada ao NAC. */
export const pendenteNac = (is: ISParaNac): boolean =>
  (is.situacao === 'finalizada' || is.status === 'tis_assinado') && is.status !== 'cancelada' && semAcento(is.grupoFinalidade || '') === 'verificacoes e terminos' && !is.emailNacEnviadoEm;

/** Pendentes ordenadas pela data do laudo (mais antiga primeiro). */
export const pendentesNac = <T extends ISParaNac>(lista: T[]): T[] =>
  lista.filter(pendenteNac).sort((a, b) => String(a.dataLaudo || '').localeCompare(String(b.dataLaudo || '')));

/** "2026-11-03" → "03/11/2026" ('' se inválida). */
export const dataBrNac = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/** Período (dd/mm/aaaa) entre a data de laudo mais antiga e a mais recente; datas vazias são ignoradas. */
export const periodoNac = (datasLaudo: string[]): { inicio: string; fim: string } => {
  const validas = datasLaudo.filter(d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''))).map(d => d.slice(0, 10)).sort();
  return { inicio: dataBrNac(validas[0] || ''), fim: dataBrNac(validas[validas.length - 1] || '') };
};

/** Linhas por página do anexo (no design eram 11; com laudos longos a 11ª não cabia na página A4 paisagem). */
export const LINHAS_POR_PAGINA = 9;
/** Linhas equivalentes ao bloco de assinatura na última página (mesma regra do design). */
const LINHAS_ASSINATURA = 4;

/** Divide as linhas em páginas de `porPagina`, deixando espaço para a assinatura na última (como o design do anexo). */
export const paginarNac = <T>(linhas: T[], porPagina = LINHAS_POR_PAGINA): { linhas: T[]; num: number; total: number; multi: boolean; ultima: boolean }[] => {
  const n = Math.max(LINHAS_ASSINATURA + 2, porPagina);
  const blocos: T[][] = [];
  for (let i = 0; i < linhas.length; i += n) blocos.push(linhas.slice(i, i + n));
  if (!blocos.length) blocos.push([]);
  const ultima = blocos[blocos.length - 1];
  if (ultima.length > n - LINHAS_ASSINATURA) {
    const fica = ultima.length - Math.max(1, ultima.length - (n - LINHAS_ASSINATURA));
    blocos[blocos.length - 1] = ultima.slice(0, fica);
    blocos.push(ultima.slice(fica));
  }
  const total = blocos.length;
  return blocos.map((l, i) => ({ linhas: l, num: i + 1, total, multi: total > 1, ultima: i === total - 1 }));
};

/** Cargo "SMI" (sem caixa, acento nem espaços nas pontas). */
export const ehCargoSmi = (cargo: string | undefined): boolean => semAcento(cargo || '') === 'smi';
