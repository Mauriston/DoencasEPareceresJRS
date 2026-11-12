// Ficheiro: utils/importarInspecionados.ts
// Importação em lote de INSPECIONADOS (militares) a partir de CSV — uso exclusivo do Admin.
// Colunas (cabeçalho na 1ª linha, em qualquer ordem; maiúsculas/acentos ignorados) — as mesmas do cadastro:
//   obrigatórias: nip | vinculo | posto | nomeCompleto | om
//   opcionais:    nasc | email | celular | situacao (RM1/Refº)
//   só HNRe:      servicoHnre (rótulo ou código do serviço, ex.: "JRS (HNRe-02.2)" ou "HNRe-02.2")
//   só oficiais médicos do HNRe ("Informações adicionais"):
//                 nomeGuerra | especialidade | rqe | crm | emailPessoal | cpf | identidadeMilitar
// Ex.: 26.0045.42;Carreira;GR;ADRIELLY DO NASCIMENTO MEDEIROS;EAMPE;02/12/2006;;;;;;;;;;;
// Separador: vírgula, ponto e vírgula ou tabulação (detectado pelo cabeçalho). Funções puras,
// sem Firestore: a gravação fica em services/firestoreMilitares.ts (criarMilitaresEmLote).
import { parseCsvGenerico } from './concursosUtils';
import { normalizarNip, formatarNip, dataCivilISO } from './dados';
import { montarInspecionado, separarPosto, omEhHnre, ehOficialMedico, type CorposQuadros, type ServicoHnre } from './corposQuadros';
import { cpfValido } from './format';
import type { MilitarDoc } from '../services/firestoreMilitares';

export const COLUNAS_CSV_INSPECIONADOS = [
  'nip', 'vinculo', 'posto', 'nomeCompleto', 'om', 'nasc', 'email', 'celular', 'situacao',
  'servicoHnre', 'nomeGuerra', 'especialidade', 'rqe', 'crm', 'emailPessoal', 'cpf', 'identidadeMilitar',
] as const;
type Coluna = typeof COLUNAS_CSV_INSPECIONADOS[number];
/** Sem estas o arquivo é recusado; as demais podem faltar no cabeçalho ou vir em branco. */
export const COLUNAS_OBRIGATORIAS_CSV: readonly Coluna[] = ['nip', 'vinculo', 'posto', 'nomeCompleto', 'om'];

/** Modelo para download: todas as colunas do cadastro, com um exemplo de praça e um de oficial médico do HNRe. */
export const MODELO_CSV_INSPECIONADOS = [
  COLUNAS_CSV_INSPECIONADOS.join(';'),
  '26.0045.42;Carreira;GR;FULANA DE TAL;EAMPE;02/12/2006;fulana.tal@marinha.mil.br;(81) 99999-0000;;;;;;;;;',
  '12.3456.78;Carreira;CT (Md);BELTRANO DE TAL;HNRe;15/03/1988;beltrano.tal@marinha.mil.br;(81) 98888-0000;;JRS (HNRe-02.2);CT BELTRANO;Ortopedia e Traumatologia;12345;23456;beltrano@email.com;529.982.247-25;123456-7',
].join('\n') + '\n';

/** existente = já cadastrado e nada a acrescentar (ignorado); atualizar = já cadastrado, mas o CSV traz dados que faltam no cadastro. */
export type SituacaoLinha = 'novo' | 'atualizar' | 'existente' | 'duplicado' | 'erro';

/**
 * Campos que a importação pode COMPLETAR num cadastro existente: só os que estão vazios no banco e vêm
 * preenchidos no CSV. Nada do que já está gravado é sobrescrito (posto, nome, OM e vínculo nunca mudam aqui).
 */
export const CAMPOS_COMPLETAVEIS = [
  'dataNascimento', 'email', 'celular', 'servico_label', 'nomeGuerra', 'especialidade', 'rqe', 'crm',
  'emailPessoal', 'cpf', 'identidadeMilitar',
] as const satisfies readonly (keyof MilitarDoc)[];

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
  /** Só nas linhas "atualizar": id do cadastro e os campos que faltavam nele. */
  id?: string;
  patch?: Partial<MilitarDoc>;
}

export interface ResultadoImportacao {
  linhas: LinhaImportacao[];
  novos: MilitarDoc[];
  atualizacoes: { id: string; patch: Partial<MilitarDoc> }[];
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
  email: ['email', 'emailfuncional', 'emailinstitucional'],
  celular: ['celular', 'telefone', 'tel'],
  situacao: ['situacao', 'rm1refo'],
  servicoHnre: ['servicohnre', 'servico', 'servicodohnre', 'setor', 'servicolabel'],
  nomeGuerra: ['nomeguerra', 'nomedeguerra'],
  especialidade: ['especialidade'],
  rqe: ['rqe'],
  crm: ['crm', 'crmpe'],
  emailPessoal: ['emailpessoal'],
  cpf: ['cpf'],
  identidadeMilitar: ['identidademilitar', 'identidade', 'idmilitar'],
};

const detectarSeparador = (texto: string): string => {
  const cabecalho = texto.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  const contar = (c: string) => cabecalho.split(c).length - 1;
  return [';', '\t', ','].reduce((melhor, c) => (contar(c) > contar(melhor) ? c : melhor), ',');
};

/** "Carreira" | "Temporário" (RM2) → temporario; outro valor → null. */
const lerVinculo = (v: string): boolean | null => {
  const k = chave(v);
  if (k === 'carreira' || k === 'inativo') return false;
  if (k === 'temporario' || k === 'rm2') return true;
  return null;
};

export interface OpcoesImportacao {
  /**
   * Cadastros da base, por id (NIP só dígitos). Com o Map, a linha de um já cadastrado completa os campos
   * vazios (CAMPOS_COMPLETAVEIS); com o Set (só ids), ela é apenas ignorada.
   */
  existentes: Set<string> | Map<string, Partial<MilitarDoc>>;
  /** Hierarquia de postos (corposQuadrosMB.json) para validar o posto; sem ela, não valida. */
  postos?: CorposQuadros['postos'];
  /** Siglas de OM conhecidas (omsMB.json); sem elas, não valida. */
  omsConhecidas?: Set<string>;
  /** Serviços do HNRe (servicosHNRe.json) para validar a coluna servicoHnre; sem eles, grava o texto como veio. */
  servicosHnre?: ServicoHnre[];
}

/** "RM1" | "Refº" (ou "Ref", "Reformado") → a situação; em branco, deduz do posto ("CT (RM1-Md)"). */
const lerSituacao = (v: string, pgq: string): 'RM1' | 'Refº' | '' | null => {
  const k = chave(v);
  if (!k) return /\bRM1\b/i.test(pgq) ? 'RM1' : /\bRef/i.test(pgq) ? 'Refº' : '';
  if (k === 'rm1' || k === 'reserva') return 'RM1';
  if (k === 'ref' || k === 'refo' || k === 'reformado') return 'Refº';
  return null;
};
const EMAIL_OK = /^\S+@\S+\.\S+$/;

export const interpretarCsvInspecionados = (texto: string, opcoes: OpcoesImportacao): ResultadoImportacao => {
  const limpo = texto.replace(/^﻿/, '');
  const tabela = parseCsvGenerico(limpo, detectarSeparador(limpo));
  if (tabela.length === 0) throw new Error('O arquivo está vazio.');

  const cab = tabela[0].map(chave);
  const indice = {} as Record<Coluna, number>;
  const faltando: string[] = [];
  for (const col of COLUNAS_CSV_INSPECIONADOS) {
    const i = cab.findIndex(c => ALIASES[col].includes(c));
    if (i < 0 && COLUNAS_OBRIGATORIAS_CSV.includes(col)) faltando.push(col);
    indice[col] = i;
  }
  if (faltando.length) {
    throw new Error(`Cabeçalho inválido: faltam as colunas ${faltando.map(c => `"${c}"`).join(', ')}. Obrigatórias: ${COLUNAS_OBRIGATORIAS_CSV.join(', ')}.`);
  }

  const omsUpper = opcoes.omsConhecidas ? new Set([...opcoes.omsConhecidas].map(o => o.toUpperCase())) : undefined;
  const vistos = new Set<string>();
  const linhas: LinhaImportacao[] = [];
  const novos: MilitarDoc[] = [];
  const atualizacoes: { id: string; patch: Partial<MilitarDoc> }[] = [];

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

    const email = val('email').toLowerCase();
    if (email && !EMAIL_OK.test(email)) erros.push(`E-mail "${email}" inválido.`);
    const celular = val('celular').replace(/\D/g, '');
    if (celular && (celular.length < 10 || celular.length > 11)) erros.push(`Celular "${val('celular')}" inválido (DDD + número).`);
    const sitMilitar = lerSituacao(val('situacao'), pgq);
    if (sitMilitar === null) erros.push(`Situação "${val('situacao')}" inválida (use RM1, Refº ou deixe em branco).`);
    else if (sitMilitar && temporario === true) erros.push('RM1/Refº só vale para vínculo Carreira (Inativo).');
    if (chave(vinculoBruto) === 'inativo' && sitMilitar === '') erros.push('Vínculo Inativo: informe a situação (RM1 ou Refº).');

    // HNRe: serviço; oficial médico do HNRe: "Informações adicionais". Fora disso, as colunas são ignoradas.
    const hnre = omEhHnre(om);
    const medico = hnre && ehOficialMedico(pgq);
    const extras: Partial<MilitarDoc> = {};
    const servicoBruto = val('servicoHnre');
    if (servicoBruto) {
      if (!hnre) avisos.push('Serviço do HNRe ignorado: a OM não é o HNRe.');
      else if (opcoes.servicosHnre) {
        const k = chave(servicoBruto);
        const s = opcoes.servicosHnre.find(x => [x.servico_label, x.servico_id, x.servico].some(c => chave(c) === k));
        if (s) extras.servico_label = s.servico_label;
        else erros.push(`Serviço do HNRe "${servicoBruto}" não encontrado (use o rótulo, ex.: "JRS (HNRe-02.2)", ou o código).`);
      } else extras.servico_label = servicoBruto;
    }
    const COLS_MEDICO: Coluna[] = ['nomeGuerra', 'especialidade', 'rqe', 'crm', 'emailPessoal', 'cpf', 'identidadeMilitar'];
    if (COLS_MEDICO.some(c => val(c))) {
      if (!medico) avisos.push('Informações adicionais ignoradas: só valem para oficial médico do HNRe.');
      else {
        const emailPessoal = val('emailPessoal').toLowerCase();
        if (emailPessoal && !EMAIL_OK.test(emailPessoal)) erros.push(`E-mail pessoal "${emailPessoal}" inválido.`);
        const cpf = val('cpf').replace(/\D/g, '');
        if (cpf && !cpfValido(cpf)) erros.push(`CPF "${val('cpf')}" inválido.`);
        const idMil = val('identidadeMilitar').replace(/\D/g, '');
        if (idMil && idMil.length !== 7) erros.push(`Identidade militar "${val('identidadeMilitar')}" inválida (000000-0).`);
        const especialidade = val('especialidade');
        Object.assign(extras, {
          nomeGuerra: val('nomeGuerra').replace(/\s+/g, ' ').toUpperCase(), especialidade, emailPessoal, cpf,
          identidadeMilitar: idMil, crm: val('crm').replace(/\D/g, ''), rqe: especialidade ? val('rqe').replace(/\D/g, '') : '',
        });
        if (val('rqe') && !especialidade) avisos.push('RQE ignorado: sem especialidade.');
      }
    }

    let situacao: SituacaoLinha = 'novo';
    if (erros.length) situacao = 'erro';
    else if (vistos.has(id)) situacao = 'duplicado';
    else if (opcoes.existentes.has(id)) situacao = 'existente';
    if (id.length === 8) vistos.add(id);

    const linha: LinhaImportacao = { linha: i + 2, situacao, nip, nome, pgq, om, erros, avisos };
    if (situacao === 'novo' || situacao === 'existente') {
      const doc: MilitarDoc = {
        om, temporario: temporario as boolean, pgq, nip, nome,
        inspecionado: montarInspecionado(pgq, nip, nome), email, ativo: true,
        rm1: sitMilitar === 'RM1', refo: sitMilitar === 'Refº',
        ...(dataNascimento ? { dataNascimento } : {}),
        ...(celular ? { celular } : {}),
        ...extras,
      };
      if (situacao === 'novo') {
        linha.doc = doc;
        novos.push(doc);
      } else {
        const atual = opcoes.existentes instanceof Map ? opcoes.existentes.get(id) : undefined;
        const patch: Partial<MilitarDoc> = {};
        if (atual) {
          for (const campo of CAMPOS_COMPLETAVEIS) {
            const novo = doc[campo];
            if (novo && !String(atual[campo] ?? '').trim()) (patch as Record<string, unknown>)[campo] = novo;
          }
        }
        if (Object.keys(patch).length) {
          linha.situacao = 'atualizar';
          linha.id = id;
          linha.patch = patch;
          atualizacoes.push({ id, patch });
        }
      }
    }
    linhas.push(linha);
  });

  const totais: Record<SituacaoLinha, number> = { novo: 0, atualizar: 0, existente: 0, duplicado: 0, erro: 0 };
  linhas.forEach(l => { totais[l.situacao]++; });
  return { linhas, novos, atualizacoes, totais };
};
