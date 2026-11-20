// Ficheiro: utils/edicaoIS.ts
// Regras puras do detalhe/edição da IS (components/inspecoes/InspecaoDetalhe.tsx) que se somam às da
// Conclusão (utils/conclusaoIS.ts):
//  - Restrições: o campo só aparece na edição com finalidade de "Verificações e Términos" E Laudo que
//    fale em restrição/restrições ("Apto para o SAM com restrições por 30 dias").
//  - CID (obrigatório em Verificações e Términos): gravado como na Perícia Menor/concursos — `cid` com a
//    DESCRABREV do public/cid.json ("M54.5 Dor lombar baixa") e `cidCodigo` com o SUBCAT ("M545").
//  - Prints do SINAIS: o que a IA leu (services/sinaisIA.ts) preenche SÓ os campos vazios da IS, na
//    ordem do fluxo (Laudo → Data do laudo → Restrições → CID → Nº do TIS → DS-1a), com as mesmas regras
//    de status do autosave (patchConclusao).
// Testadas em utils/__tests__/edicaoIS.test.ts.
import { normalizarBusca, type CidItem } from './corposQuadros';
import { GRUPO_VERIFICACOES, hojeISO, tisValido } from './inspecoes';
import { mostraRestricoes, patchConclusao, type EstadoConclusao, type PatchConclusao } from './conclusaoIS';
import { conclusaoDaLeitura, dataDoSinais, laudoDaConclusao, numeroDaIs, restricoesDaConclusao, tipoDoPrint, type LeituraPrint } from './importacaoIS';

/** Campos novos do documento da IS (coleção "inspecoes"), opcionais em docs antigos. */
export interface CamposCidIS {
  /** CID no formato "descrição abreviada" do cid.json (DESCRABREV), ex.: "M54.5 Dor lombar baixa". */
  cid?: string;
  /** SUBCAT do cid.json (sem ponto), ex.: "M545". */
  cidCodigo?: string;
}

const norm = (s: string | undefined | null): string => normalizarBusca(String(s || '')).toLowerCase();

/** O Laudo fala em restrição/restrições (sem diferença de maiúsculas e acentos). */
export const laudoMencionaRestricoes = (laudo: string | undefined | null): boolean => /restri(cao|coes)\b/.test(norm(laudo));

/** Campo Restrições na edição: finalidade de Verificações e Términos e Laudo com "restrição(ões)". */
export const mostraCampoRestricoesEdicao = (is: { grupoFinalidade?: string; laudo?: string }): boolean =>
  mostraRestricoes({ grupoFinalidade: is.grupoFinalidade || '' }) && laudoMencionaRestricoes(is.laudo);

/** CID obrigatório: finalidades do grupo Verificações e Términos. */
export const exigeCid = (grupoFinalidade: string | undefined): boolean => grupoFinalidade === GRUPO_VERIFICACOES;

/** Código do CID sem pontuação, minúsculo ("M54.5" → "m545"). */
const codigoLimpo = (codigo: string): string => String(codigo || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Item do cid.json pelo código lido (igual, ou o primeiro que começa com ele) — como na Perícia Menor. */
export const acharCid = (codigo: string | undefined, cids: CidItem[]): CidItem | null => {
  const c = codigoLimpo(codigo || '');
  if (!c) return null;
  return cids.find(x => x.SUBCAT.toLowerCase() === c) ?? cids.find(x => x.SUBCAT.toLowerCase().startsWith(c)) ?? null;
};

/** O que vai para o Firestore ao escolher um CID. */
export const camposDoCid = (c: CidItem | null): Required<CamposCidIS> => (c ? { cid: c.DESCRABREV, cidCodigo: c.SUBCAT } : { cid: '', cidCodigo: '' });

// ---------------------------------------------------------------- Prints do SINAIS na edição

/** Leitura de um print do SINAIS na edição da IS (tela da IS ou da conclusão, com os CIDs associados). */
export type LeituraEdicaoIS = LeituraPrint & { cids?: string[] };

export type EstadoEdicaoIS = EstadoConclusao & { cid: string; cidCodigo: string };
export type PatchEdicaoIS = PatchConclusao & CamposCidIS;

export interface PreenchimentoSinais {
  /** Campos a gravar (vazio = nada a preencher). */
  patch: PatchEdicaoIS;
  /** Laudo inserido com "Parecer solicitado": os pareceres da IS passam a Concluído. */
  concluirPareceres: boolean;
  /** Rótulos dos campos preenchidos, para o aviso. */
  preenchidos: string[];
  /** Avisos (prints de outra IS, CID fora da tabela…). */
  avisos: string[];
}

interface OpcoesPreenchimento {
  /** Opções do campo Restrições (grafia do app). */
  opcoesRestricoes?: string[];
  cids?: CidItem[];
  hoje?: string;
}

/**
 * Preenche, a partir dos prints do SINAIS, SÓ os campos vazios da IS. Prints com outro nº de IS são
 * ignorados. As Restrições seguem a regra do grupo (Verificações e Términos); com CID obrigatório e
 * ainda vazio, o Nº do TIS e o DS-1a não são preenchidos (o CID vem antes).
 */
export const preenchimentoDoSinais = (atual: EstadoEdicaoIS, numeroIs: number | string, leituras: LeituraEdicaoIS[], opcoes: OpcoesPreenchimento = {}): PreenchimentoSinais => {
  const hoje = opcoes.hoje ?? hojeISO();
  const avisos: string[] = [];
  const numero = numeroDaIs(String(numeroIs));
  const validas = leituras.filter(l => {
    if (!tipoDoPrint(l)) { avisos.push('Uma das imagens não foi reconhecida como tela do SINAIS.'); return false; }
    const n = numeroDaIs(l.numInspecao);
    if (n && n !== numero) { avisos.push(`Print da IS ${n} ignorado (esta é a IS ${numero}).`); return false; }
    return true;
  });
  const telasIs = validas.filter(l => tipoDoPrint(l) === 'is');
  const conclusoes = validas.filter(l => tipoDoPrint(l) === 'conclusao').map(conclusaoDaLeitura);
  const juntas = { laudos: conclusoes.flatMap(c => c.laudos ?? []), restricoes: conclusoes.flatMap(c => c.restricoes ?? []) };

  const laudo = laudoDaConclusao(juntas);
  const restricoes = restricoesDaConclusao(juntas, opcoes.opcoesRestricoes ?? []);
  const dataLaudo = dataDoSinais(conclusoes.find(c => c.dataLaudo)?.dataLaudo || telasIs.find(l => l.dataLaudo)?.dataLaudo);
  const tis = String(telasIs.find(l => l.numTis)?.numTis || '').replace(/\s+/g, '');
  const ds1a = String(telasIs.find(l => l.ds1a)?.ds1a || '').trim().toUpperCase();
  const codigosCid = validas.flatMap(l => l.cids ?? []).map(c => String(c || '').trim()).filter(Boolean);

  let estado: EstadoEdicaoIS = { ...atual };
  const patch: PatchEdicaoIS = {};
  const preenchidos: string[] = [];
  let concluirPareceres = false;
  const aplicar = (campo: 'laudo' | 'restricoes' | 'tis' | 'ds1a', valor: string, rotulo: string) => {
    const r = patchConclusao(estado, campo, valor, hoje);
    if (Object.keys(r.patch).length === 0) return;
    Object.assign(patch, r.patch);
    estado = { ...estado, ...r.patch };
    concluirPareceres = concluirPareceres || r.concluirPareceres;
    preenchidos.push(rotulo);
  };

  if (!estado.laudo.trim() && laudo) aplicar('laudo', laudo, 'Laudo');
  if (!atual.dataLaudo && dataLaudo && estado.laudo.trim()) {
    patch.dataLaudo = dataLaudo;
    estado = { ...estado, dataLaudo };
    if (!preenchidos.includes('Laudo')) preenchidos.push('Data do laudo');
  }
  if (!estado.restricoes.trim() && restricoes && mostraRestricoes(estado)) aplicar('restricoes', restricoes, 'Restrições');

  if (exigeCid(estado.grupoFinalidade) && !estado.cid.trim() && codigosCid.length) {
    const achado = codigosCid.map(c => acharCid(c, opcoes.cids ?? [])).find((c): c is CidItem => !!c) ?? null;
    if (achado) {
      const campos = camposDoCid(achado);
      Object.assign(patch, campos);
      estado = { ...estado, ...campos };
      preenchidos.push('CID');
    } else avisos.push(`CID ${codigosCid[0]} não encontrado na tabela; escolha na lista.`);
  }

  const cidPendente = exigeCid(estado.grupoFinalidade) && !estado.cid.trim();
  if (!estado.tis.trim() && tis) {
    if (cidPendente) avisos.push('Nº do TIS não preenchido: informe o CID antes.');
    else if (!tisValido(tis)) avisos.push(`Nº do TIS "${tis}" fora do formato; confira.`);
    else if (estado.laudo.trim()) aplicar('tis', tis, 'Nº do TIS');
  }
  if (!estado.ds1a.trim() && ds1a && estado.tis.trim() && !cidPendente) aplicar('ds1a', ds1a, 'DS-1a');

  return { patch, concluirPareceres, preenchidos, avisos: Array.from(new Set(avisos)) };
};
