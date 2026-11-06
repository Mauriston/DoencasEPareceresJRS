// Ficheiro: utils/importarInspecionados.ts
// Importação em lote de INSPECIONADOS (militares) a partir de CSV — uso exclusivo do Admin.
// Colunas esperadas (cabeçalho na 1ª linha, em qualquer ordem; maiúsculas/acentos ignorados):
//   nip | vinculo | posto | nomeCompleto | om | nasc
// Ex.: 26.0045.42;Carreira;GR;ADRIELLY DO NASCIMENTO MEDEIROS;EAMPE;02/12/2006
// Separador: vírgula, ponto e vírgula ou tabulação (detectado pelo cabeçalho). Funções puras,
// sem Firestore: a gravação fica em services/firestoreMilitares.ts (criarMilitaresEmLote).
import { parseCsvGenerico } from './concursosUtils';
import { normalizarNip, formatarNip, dataCivilISO } from './dados';
import { montarInspecionado, separarPosto, type CorposQuadros } from './corposQuadros';
import type { MilitarDoc } from '../services/firestoreMilitares';

export const COLUNAS_CSV_INSPECIONADOS = ['nip', 'vinculo', 'posto', 'nomeCompleto', 'om', 'nasc'] as const;
type Coluna = typeof COLUNAS_CSV_INSPECIONADOS[number];

/** Modelo para download (mesma estrutura da planilha de origem). */
export const MODELO_CSV_INSPECIONADOS =
  `${COLUNAS_CSV_INSPECIONADOS.join(';')}\n26.0045.42;Carreira;GR;FULANA DE TAL;EAMPE;02/12/2006\n`;

export type SituacaoLinha = 'novo' | 'existente' | 'duplicado' | 'erro';

export interface LinhaImportacao {
  /** Número da linha no arquivo (cabeçalho = 1). */
  linha: number;
  situacao: SituacaoLinha;
  nip: string;
  nome: string;
  pgq: string;
  om: string;
  /** Erros impedem a importação da linha; avisos não. */
  erros: string[];
  avisos: string[];
  /** Só nas linhas "novo": documento pronto para gravar. */
  doc?: MilitarDoc;
}

export interface ResultadoImportacao {
  linhas: LinhaImportacao[];
  novos: MilitarDoc[];
  totais: Record<SituacaoLinha, number>;
}

const chave = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Sinônimos aceitos no cabeçalho. */
const ALIASES: Record<Coluna, string[]> = {
  nip: ['nip'],
  vinculo: ['vinculo'],
  posto: ['posto', 'pgq', 'postograduacao', 'postograduacaoquadro'],
  nomeCompleto: ['nomecompleto', 'nome'],
  om: ['om', 'organizacaomilitar'],
  nasc: ['nasc', 'nascimento', 'datanascimento', 'datadenascimento', 'dtnasc'],
};

const detectarSeparador = (texto: string): string => {
  const cabecalho = texto.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  const contar = (c: string) => cabecalho.split(c).length - 1;
  return [';', '\t', ','].reduce((melhor, c) => (contar(c) > contar(melhor) ? c : melhor), ',');
};

/** "Carreira" | "Temporário" (RM2) → temporario; outro valor → null. */
const lerVinculo = (v: string): boolean | null => {
  const k = chave(v);
  if (k === 'carreira') return false;
  if (k === 'temporario' || k === 'rm2') return true;
  return null;
};

export interface OpcoesImportacao {
  /** Ids (NIP só dígitos) já cadastrados na base. */
  existentes: Set<string>;
  /** Hierarquia de postos (corposQuadrosMB.json) para validar o posto; sem ela, não valida. */
  postos?: CorposQuadros['postos'];
  /** Siglas de OM conhecidas (omsMB.json); sem elas, não valida. */
  omsConhecidas?: Set<string>;
}

export const interpretarCsvInspecionados = (texto: string, opcoes: OpcoesImportacao): ResultadoImportacao => {
  const limpo = texto.replace(/^﻿/, '');
  const tabela = parseCsvGenerico(limpo, detectarSeparador(limpo));
  if (tabela.length === 0) throw new Error('O arquivo está vazio.');

  const cab = tabela[0].map(chave);
  const indice = {} as Record<Coluna, number>;
  const faltando: string[] = [];
  for (const col of COLUNAS_CSV_INSPECIONADOS) {
    const i = cab.findIndex(c => ALIASES[col].includes(c));
    if (i < 0 && col !== 'nasc') faltando.push(col);
    indice[col] = i;
  }
  if (faltando.length) {
    throw new Error(`Cabeçalho inválido: faltam as colunas ${faltando.map(c => `"${c}"`).join(', ')}. Esperado: ${COLUNAS_CSV_INSPECIONADOS.join(', ')}.`);
  }

  const omsUpper = opcoes.omsConhecidas ? new Set([...opcoes.omsConhecidas].map(o => o.toUpperCase())) : undefined;
  const vistos = new Set<string>();
  const linhas: LinhaImportacao[] = [];
  const novos: MilitarDoc[] = [];

  tabela.slice(1).forEach((cols, i) => {
    const val = (c: Coluna) => (indice[c] >= 0 ? (cols[indice[c]] ?? '').trim() : '');
    const erros: string[] = [];
    const avisos: string[] = [];

    // O Excel costuma tirar o zero à esquerda de NIP numérico ("08137188" → "8137188"): repõe e avisa.
    let id = normalizarNip(val('nip'));
    if (/^\d{7}$/.test(val('nip'))) { id = `0${id}`; avisos.push('NIP com 7 dígitos: zero à esquerda reposto.'); }
    const nip = id.length === 8 ? formatarNip(id) : val('nip');
    const nome = val('nomeCompleto').replace(/\s+/g, ' ').toUpperCase();
    const pgq = val('posto').replace(/\s+/g, ' ');
    const om = val('om').replace(/\s+/g, ' ');
    const vinculoBruto = val('vinculo');
    const nascBruto = val('nasc');

    if (id.length !== 8) erros.push('NIP inválido (precisa ter 8 dígitos).');
    if (!nome) erros.push('Nome completo em branco.');
    if (!pgq) erros.push('Posto em branco.');
    if (!om) erros.push('OM em branco.');
    const temporario = lerVinculo(vinculoBruto);
    if (temporario === null) erros.push(`Vínculo "${vinculoBruto || '—'}" inválido (use Carreira ou Temporário).`);
    let dataNascimento = '';
    if (nascBruto) {
      const iso = dataCivilISO(nascBruto);
      if (iso) dataNascimento = iso;
      else erros.push(`Data de nascimento "${nascBruto}" inválida (use DD/MM/AAAA).`);
    }
    if (pgq && opcoes.postos && !separarPosto(pgq, opcoes.postos)) avisos.push(`Posto "${pgq}" não reconhecido na tabela de postos.`);
    if (om && omsUpper && !omsUpper.has(om.toUpperCase())) avisos.push(`OM "${om}" não consta da lista de OM.`);

    let situacao: SituacaoLinha = 'novo';
    if (erros.length) situacao = 'erro';
    else if (vistos.has(id)) situacao = 'duplicado';
    else if (opcoes.existentes.has(id)) situacao = 'existente';
    if (id.length === 8) vistos.add(id);

    const linha: LinhaImportacao = { linha: i + 2, situacao, nip, nome, pgq, om, erros, avisos };
    if (situacao === 'novo') {
      const doc: MilitarDoc = {
        om, temporario: temporario as boolean, pgq, nip, nome,
        inspecionado: montarInspecionado(pgq, nip, nome), email: '', ativo: true,
        rm1: false, refo: false,
        ...(dataNascimento ? { dataNascimento } : {}),
      };
      linha.doc = doc;
      novos.push(doc);
    }
    linhas.push(linha);
  });

  const totais: Record<SituacaoLinha, number> = { novo: 0, existente: 0, duplicado: 0, erro: 0 };
  linhas.forEach(l => { totais[l.situacao]++; });
  return { linhas, novos, totais };
};
