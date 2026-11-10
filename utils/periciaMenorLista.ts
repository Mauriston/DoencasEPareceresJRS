// Ficheiro: utils/periciaMenorLista.ts
// Funções puras da tabela de Perícias Menores (components/PericiaMenor.tsx), testadas em
// utils/__tests__/periciaMenorLista.test.ts:
// - data de referência e dias de cada registro (Registrar × Homologar atestado);
// - médico perito no formato "CT Mauriston";
// - CID pela descrição abreviada (DESCRABREV do public/cid.json);
// - tags "Dispensas" / "Restrições" a partir da lista de dispensas.

export interface RegistroDataPericia {
  /** true = "Homologar atestado" (atestado externo); ausente/false = "Registrar atestado". */
  homologacao?: boolean;
  /** AAAA-MM-DD: emissão do atestado (no "Registrar atestado" é emitido na própria perícia). */
  dataAtestado: string;
  /** AAAA-MM-DD da realização da perícia, se o registro tiver o campo (registros atuais não têm). */
  dataPericia?: string;
  tempoAtestado?: number;
  tempoHomologado: number;
}

/** Data mostrada na 1ª coluna e quantidade de dias abaixo dela.
 *  - Homologar atestado: data de emissão do atestado homologado + dias homologados.
 *  - Registrar atestado: data da realização da perícia (o atestado é emitido nela) + dias de dispensa. */
export const dataReferenciaPericia = (p: RegistroDataPericia): { data: string; dias: number } => {
  if (p.homologacao) return { data: p.dataAtestado, dias: p.tempoHomologado || 0 };
  return { data: p.dataPericia || p.dataAtestado, dias: p.tempoHomologado || p.tempoAtestado || 0 };
};

// Postos/graduações (siglas) que podem abrir o texto do perito.
const POSTO = /^(AE|AM|VA|CA|CMG|CF|CC|CT|[12]º?T|GM|ASP|SO|[123]º?SG|CB|MN(?:-RC)?|SD|GR|CEL|TC|MAJ|CAP|TEN|[12]º?TEN)$/i;
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

const capitalizar = (palavra: string, i: number): string => {
  const p = palavra.toLocaleLowerCase('pt-BR');
  if (i > 0 && PARTICULAS.has(p)) return p;
  return p.replace(/(^|[-'])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase('pt-BR'));
};

/** Tem posto/graduação na 1ª palavra (ex.: "CT MAURISTON")? */
export const temPosto = (texto: string): boolean => POSTO.test((texto || '').trim().split(/\s+/)[0] ?? '');

/** "CT MAURISTON" → "CT Mauriston": posto em maiúsculas + nome de guerra só com as iniciais maiúsculas.
 *  Sem posto reconhecido, só capitaliza o nome. */
export const formatarMedicoPerito = (texto: string): string => {
  const palavras = (texto || '').trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return '';
  const [primeira, ...resto] = palavras;
  if (POSTO.test(primeira)) return [primeira.toUpperCase(), ...resto.map((w, i) => capitalizar(w, i))].join(' ');
  return palavras.map(capitalizar).join(' ');
};

/** Perito responsável do registro: "peritoNome" quando traz o posto (perito escolhido no formulário);
 *  senão o login de quem registrou ("peritoUsuario", ex.: "CT MAURISTON"); por fim o "peritoNome". */
export const medicoDaPericia = (p: { peritoNome?: string; peritoUsuario?: string }): string => {
  const nome = (p.peritoNome || '').trim();
  const usuario = (p.peritoUsuario || '').trim();
  return formatarMedicoPerito(temPosto(nome) ? nome : usuario || nome);
};

/** Código do CID sem ponto, em maiúsculas ("M23.2 - …" → "M232"): do "cidCodigo" ou do início do rótulo. */
export const codigoCid = (p: { cid?: string; cidCodigo?: string }): string => {
  const bruto = (p.cidCodigo || (p.cid || '').trim().split(/[\s\-–—]/)[0] || '').toUpperCase().replace(/\./g, '');
  return /^[A-Z]\d{2,3}[A-Z0-9]?$/.test(bruto) ? bruto : '';
};

/** Rótulo do CID na tabela: "M23.2 — Transt menisco dev ruptura…" (DESCRABREV do cid.json).
 *  Sem o CID na lista (ou antes de carregá-la), devolve o rótulo gravado no registro. */
export const rotuloCidAbreviado = (p: { cid?: string; cidCodigo?: string }, abreviados: ReadonlyMap<string, string> | null): string => {
  const abrev = abreviados?.get(codigoCid(p));
  if (!abrev) return (p.cid || '').trim();
  const m = abrev.trim().match(/^(\S+)\s+(.+)$/);
  return m ? `${m[1]} — ${m[2]}` : abrev.trim();
};

/** Índice SUBCAT → DESCRABREV do public/cid.json. */
export const indiceCidAbreviado = (lista: ReadonlyArray<{ SUBCAT: string; DESCRABREV: string }>): Map<string, string> =>
  new Map(lista.map(c => [c.SUBCAT.toUpperCase().replace(/\./g, ''), c.DESCRABREV]));

/** "Dispensas" quando há "TODAS AS ATIVIDADES"; "Restrições" quando há qualquer outro item. Podem vir as duas. */
export const tiposDispensa = (dispensas: ReadonlyArray<string> | undefined): { dispensa: boolean; restricoes: boolean } => {
  const itens = (dispensas ?? []).map(d => d.trim()).filter(Boolean);
  const total = (d: string) => d.toUpperCase().includes('TODAS AS ATIVIDADES');
  return { dispensa: itens.some(total), restricoes: itens.some(d => !total(d)) };
};
