// Ficheiro: utils/escalaSpa.ts
// Regras puras da Escala SVÇ do SPA (testadas em utils/__tests__/escalaSpa.test.ts):
//  - feriados (nacionais, PE e Recife) e dias "roxos" (Natal/Réveillon, Carnaval, Semana Santa), como na
//    página https://github.com/Mauriston/escalasupervisao;
//  - leitura do CSV enviado pelo Admin: o modelo simplificado (DATA;SERVICO;MEDICOS;RETEM) ou o CSV
//    exportado direto da aba "Agenda" da planilha (Início, SVC, Medico, Retens);
//  - cruzamento dos nomes da escala com o login do usuário ("CT MAURISTON" = "CT (Md) MAURISTON").
import { parseCsvGenerico } from './concursosUtils';
import { dataCivilISO } from './dados';
import type { EscalaDia } from '../services/firestoreEscala';

const pad = (n: number) => String(n).padStart(2, '0');
export const chaveDia = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const chaveDe = (d: Date) => chaveDia(d.getFullYear(), d.getMonth(), d.getDate());
const deslocar = (base: Date, dias: number) => { const d = new Date(base); d.setDate(base.getDate() + dias); return d; };

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
const pascoa = (y: number): Date => {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
};

/** Feriados nacionais, de Pernambuco e do Recife: chave AAAA-MM-DD → nome. */
export const feriados = (y: number): Record<string, string> => {
  const h: Record<string, string> = {};
  ([[0, 1, 'Confraternização'], [2, 6, 'Data Magna PE'], [3, 21, 'Tiradentes'], [4, 1, 'Dia do Trabalho'], [5, 24, 'São João'], [6, 16, 'N. Sra. do Carmo'],
    [8, 7, 'Independência'], [9, 12, 'N. Sra. Aparecida'], [10, 2, 'Finados'], [10, 15, 'Proclamação'], [10, 20, 'Consciência Negra'], [11, 8, 'N. Sra. Conceição'], [11, 25, 'Natal']] as const)
    .forEach(([m, d, nome]) => { h[chaveDia(y, m, d)] = nome; });
  const e = pascoa(y);
  ([[-48, 'Carnaval'], [-47, 'Carnaval'], [-2, 'Paixão de Cristo'], [60, 'Corpus Christi']] as const)
    .forEach(([o, nome]) => { h[chaveDe(deslocar(e, o))] = nome; });
  return h;
};

/** Festas maiores (escala "roxa"): 24, 25 e 31/12, 01/01, Carnaval (sáb. a quarta de cinzas) e Semana Santa. */
export const diasRoxos = (y: number): Set<string> => {
  const s = new Set([chaveDia(y, 11, 24), chaveDia(y, 11, 25), chaveDia(y, 11, 31), chaveDia(y, 0, 1)]);
  const e = pascoa(y);
  [-50, -49, -48, -47, -46, -2, -1, 0].forEach(o => s.add(chaveDe(deslocar(e, o))));
  return s;
};

export type CorDia = 'branca' | 'vermelha' | 'roxa';
/** Cor do dia na escala: roxa (festas maiores), vermelha (sáb., dom. e feriados) ou branca. */
export const corDoDia = (chave: string): CorDia => {
  const [y, m, d] = chave.split('-').map(Number);
  if (diasRoxos(y).has(chave)) return 'roxa';
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6 || feriados(y)[chave] ? 'vermelha' : 'branca';
};

// ---------------------------------------------------------------- nomes

/** Nome na escala → chave de comparação: sem o "(RM2-Md)", sem acento, maiúsculas, espaços simples. */
export const chaveNome = (nome: string | undefined): string => (nome || '')
  .replace(/\([^)]*\)/g, ' ')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Remove o "(RM2-Md)" para exibir: "1T (RM2-Md) COSTA" → "1T COSTA". */
export const nomeExibicao = (nome: string | undefined): string => (nome || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

export type FuncaoEscala = 'Supervisão' | 'Retém supervisão' | 'Dia' | 'Retém dia' | 'Noite' | 'Retém noite';
export interface ServicoUsuario { data: string; funcao: FuncaoEscala }

/** Serviços de um usuário (pelo login, ex.: "CT MAURISTON") nos dias informados, em ordem. */
export const servicosDoUsuario = (dias: EscalaDia[], usuario: string | undefined): ServicoUsuario[] => {
  const eu = chaveNome(usuario);
  if (!eu) return [];
  const sou = (n?: string) => chaveNome(n) === eu;
  const out: ServicoUsuario[] = [];
  [...dias].sort((a, b) => a.data.localeCompare(b.data)).forEach(d => {
    if (sou(d.supervisor)) out.push({ data: d.data, funcao: 'Supervisão' });
    if (sou(d.retemSupervisao)) out.push({ data: d.data, funcao: 'Retém supervisão' });
    if ((d.dia ?? []).some(sou)) out.push({ data: d.data, funcao: 'Dia' });
    if (sou(d.retemDia)) out.push({ data: d.data, funcao: 'Retém dia' });
    if ((d.noite ?? []).some(sou)) out.push({ data: d.data, funcao: 'Noite' });
    if (sou(d.retemNoite)) out.push({ data: d.data, funcao: 'Retém noite' });
  });
  return out;
};

/** Face inicial do calendário: plantão se o usuário só aparece nos plantões dia/noite; senão supervisão. */
export const faceInicial = (dias: EscalaDia[], usuario: string | undefined): 'supervisao' | 'plantao' => {
  const s = servicosDoUsuario(dias, usuario);
  const supervisao = s.filter(x => x.funcao === 'Supervisão' || x.funcao === 'Retém supervisão').length;
  return s.length - supervisao > supervisao ? 'plantao' : 'supervisao';
};

// ---------------------------------------------------------------- CSV

export const COLUNAS_CSV_ESCALA = ['DATA', 'SERVICO', 'MEDICOS', 'RETEM'] as const;

/** Modelo para download: uma linha por serviço; nos plantões, os dois médicos separados por vírgula (entre aspas). */
export const MODELO_CSV_ESCALA = [
  'DATA;SERVICO;MEDICOS;RETEM',
  '01/12/2026;Supervisão;CT FULANO;1T BELTRANO',
  '01/12/2026;DIA;"1T CICRANO, 2T FULANA";1T BELTRANO',
  '01/12/2026;NOITE;"2T MENGANO, 1T SICRANA";2T FULANA',
  '',
].join('\n');

export interface LinhaEscalaComErro { linha: number; motivo: string }
export interface ResultadoCsvEscala { dias: EscalaDia[]; erros: LinhaEscalaComErro[]; meses: string[] }

const chaveCab = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const ALIASES: Record<(typeof COLUNAS_CSV_ESCALA)[number], string[]> = {
  DATA: ['data', 'inicio'],
  SERVICO: ['servico', 'svc', 'svco', 'tipo'],
  MEDICOS: ['medicos', 'medico', 'escalado', 'escalados'],
  RETEM: ['retem', 'retens'],
};

const detectarSeparador = (texto: string): string => {
  const cab = texto.split(/\r?\n/, 1)[0] ?? '';
  const n = (c: string) => cab.split(c).length - 1;
  return [';', '\t', ','].reduce((melhor, c) => (n(c) > n(melhor) ? c : melhor), ',');
};

/** Lê o CSV da escala. Linhas inválidas viram erros (com o número da linha); as válidas são agrupadas por dia. */
export const lerCsvEscala = (texto: string): ResultadoCsvEscala => {
  const limpo = texto.replace(/^﻿/, '');
  const tabela = parseCsvGenerico(limpo, detectarSeparador(limpo));
  if (tabela.length === 0) throw new Error('O arquivo está vazio.');
  const cab = tabela[0].map(chaveCab);
  const idx = {} as Record<(typeof COLUNAS_CSV_ESCALA)[number], number>;
  const faltando: string[] = [];
  COLUNAS_CSV_ESCALA.forEach(c => {
    const i = cab.findIndex(h => ALIASES[c].includes(h));
    idx[c] = i;
    if (i < 0 && c !== 'RETEM') faltando.push(c);
  });
  if (faltando.length) throw new Error(`Cabeçalho inválido: faltam as colunas ${faltando.join(', ')}. Use o modelo (${COLUNAS_CSV_ESCALA.join(';')}).`);

  const porDia = new Map<string, EscalaDia>();
  const erros: LinhaEscalaComErro[] = [];
  tabela.slice(1).forEach((cols, i) => {
    const linha = i + 2;
    const val = (c: (typeof COLUNAS_CSV_ESCALA)[number]) => (idx[c] >= 0 ? (cols[idx[c]] ?? '').trim() : '');
    const dataBruta = val('DATA').split(/\s+/)[0];
    const data = dataCivilISO(dataBruta);
    const servico = chaveCab(val('SERVICO'));
    const medicos = val('MEDICOS').split(/[,/+]| e /).map(s => s.trim()).filter(Boolean);
    const retem = val('RETEM');
    if (!data) { erros.push({ linha, motivo: `Data "${val('DATA')}" inválida (use DD/MM/AAAA).` }); return; }
    if (!['supervisao', 'dia', 'noite'].includes(servico)) { erros.push({ linha, motivo: `Serviço "${val('SERVICO')}" inválido (use Supervisão, DIA ou NOITE).` }); return; }
    if (medicos.length === 0) { erros.push({ linha, motivo: 'Sem médico escalado.' }); return; }
    const dia = porDia.get(data) ?? { data };
    if (servico === 'supervisao') { dia.supervisor = medicos[0]; if (retem) dia.retemSupervisao = retem; }
    if (servico === 'dia') { dia.dia = medicos; if (retem) dia.retemDia = retem; }
    if (servico === 'noite') { dia.noite = medicos; if (retem) dia.retemNoite = retem; }
    porDia.set(data, dia);
  });
  const dias = [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data));
  const meses = [...new Set(dias.map(d => d.data.slice(0, 7)))];
  return { dias, erros, meses };
};
