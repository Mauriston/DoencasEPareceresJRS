// Ficheiro: utils/concursosUtils.ts
// Utilitários puros (datas, texto e extração da mensagem administrativa)
// usados pelo menu Concursos ("Planilhas de Controle"). Portados de
// CodeConcursos.gs (Apps Script) para TypeScript na migração do backend
// para o Firebase — mesmas regras e regex, sem dependência de Google Sheets
// ou Apps Script.

export const MAPA_LAUDO_POR_STATUS: Record<string, string> = {
  APTO: 'Apto para Ingresso',
  INAPTO: 'Inapto para Ingresso',
  FALTOU: 'IS não concluída por não comparecimento',
  'INSUF DOCUMENTAL': 'IS não concluída por Insuficiência Documental Médica',
};

export const formatarDataSimples = (data: Date | null | undefined): string => {
  if (!data || isNaN(data.getTime())) return '';
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${data.getFullYear()}`;
};

const MESES_MAIUSC = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export const formatarDataMilitar = (data: Date | null | undefined): string => {
  if (!data || isNaN(data.getTime())) return '';
  const dia = String(data.getDate()).padStart(2, '0');
  return `${dia}${MESES_MAIUSC[data.getMonth()]}${data.getFullYear()}`;
};

export const formatarChaveData = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Constrói um Date ao meio-dia a partir de uma chave "AAAA-MM-DD", evitando
 * problemas de fuso horário na fronteira do dia. */
export const parseChaveData = (chave: string): Date => {
  const [ano, mes, dia] = chave.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

/**
 * Aplica a pontuação padrão de listas nas minutas: item do meio termina em
 * ";", penúltimo em "; e", último em "." (ou sem pontuação, no modo "eco",
 * usado na lista de recursos que já termina em "BT").
 */
export const aplicarPontuacao = (lista: string[], isEcho: boolean): string[] => {
  if (!lista || lista.length === 0) return [];
  return lista.map((item, i) => {
    if (i === lista.length - 1) return isEcho ? item : `${item}.`;
    if (i === lista.length - 2) return `${item}; e`;
    return `${item};`;
  });
};

const UNIDADES = ['', 'UM', 'DOIS', 'TRÊS', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO', 'NOVE'];
const DEZ_A_19 = ['DEZ', 'ONZE', 'DOZE', 'TREZE', 'QUATORZE', 'QUINZE', 'DEZESSEIS', 'DEZESSETE', 'DEZOITO', 'DEZENOVE'];
const DEZENAS = ['', '', 'VINTE', 'TRINTA', 'QUARENTA', 'CINQUENTA', 'SESSENTA', 'SETENTA', 'OITENTA', 'NOVENTA'];
const CENTENAS = ['', 'CENTO', 'DUZENTOS', 'TREZENTOS', 'QUATROCENTOS', 'QUINHENTOS', 'SEISCENTOS', 'SETECENTOS', 'OITOCENTOS', 'NOVECENTOS'];

/** Número cardinal por extenso em pt-BR, maiúsculo (suporta 1 a 999). */
export const numeroCardinalExtenso = (n: number): string => {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DEZ_A_19[n - 10];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return DEZENAS[d] + (u > 0 ? ` E ${UNIDADES[u]}` : '');
  }
  if (n === 100) return 'CEM';
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const resto = n % 100;
    return CENTENAS[c] + (resto > 0 ? ` E ${numeroCardinalExtenso(resto)}` : '');
  }
  return String(n);
};

/** Marcador numérico usado nas listas das mensagens navais: "UNO" para 1. */
export const numeroItemLista = (n: number): string => (n === 1 ? 'UNO' : numeroCardinalExtenso(n));

/** Data da Páscoa (Domingo) pelo algoritmo Anônimo Gregoriano (Meeus/Jones/Butcher). */
export const calcularPascoa = (ano: number): Date => {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
};

/** Feriados nacionais de um ano (fixos + móveis calculados a partir da Páscoa). */
export const obterFeriadosNacionais = (ano: number): Date[] => {
  const feriados: Date[] = [];
  const somarDias = (data: Date, dias: number) => {
    const d = new Date(data.getTime());
    d.setDate(d.getDate() + dias);
    return d;
  };

  const fixos: [number, number][] = [
    [0, 1], [3, 21], [4, 1], [8, 7], [9, 12],
    [10, 2], [10, 15], [10, 20], [11, 25],
  ];
  fixos.forEach(([mes, dia]) => feriados.push(new Date(ano, mes, dia)));

  const pascoa = calcularPascoa(ano);
  feriados.push(somarDias(pascoa, -48), somarDias(pascoa, -47), somarDias(pascoa, -46), somarDias(pascoa, -2), pascoa, somarDias(pascoa, 60));

  return feriados;
};

/** Dias úteis (segunda a sexta) entre duas datas (inclusive), excluindo feriados nacionais. */
export const calcularDiasUteis = (dataInicial: Date, dataFinal: Date): Date[] => {
  const dias: Date[] = [];
  const mapaFeriadosPorAno: Record<number, Record<string, boolean>> = {};

  let atual = new Date(dataInicial.getFullYear(), dataInicial.getMonth(), dataInicial.getDate());
  const fim = new Date(dataFinal.getFullYear(), dataFinal.getMonth(), dataFinal.getDate());

  while (atual.getTime() <= fim.getTime()) {
    const ano = atual.getFullYear();
    if (!mapaFeriadosPorAno[ano]) {
      mapaFeriadosPorAno[ano] = {};
      obterFeriadosNacionais(ano).forEach(d => { mapaFeriadosPorAno[ano][formatarChaveData(d)] = true; });
    }

    const diaSemana = atual.getDay();
    const eFeriado = !!mapaFeriadosPorAno[ano][formatarChaveData(atual)];
    if (diaSemana !== 0 && diaSemana !== 6 && !eFeriado) {
      dias.push(new Date(atual.getTime()));
    }

    atual = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate() + 1);
  }

  return dias;
};

export const NOMES_DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** `dataAgendamento` (AAAA-MM-DD) só vem preenchida quando o candidato foi lido de uma mensagem de agendamento. */
export interface CandidatoBasico { id: string; nome: string; dataAgendamento?: string; }

/**
 * Distribui os candidatos (na ordem recebida) pelas datas disponíveis,
 * preenchendo cada data até "quantidadePorDia" antes de passar para a
 * próxima, na ordem cronológica (algoritmo guloso e determinístico).
 */
export const distribuirCandidatosNasDatas = <T extends CandidatoBasico>(
  candidatos: T[],
  datas: { data: string; diaSemana: string }[],
  quantidadePorDia: number
): { data: string; diaSemana: string; candidatos: T[] }[] => {
  const resultado: { data: string; diaSemana: string; candidatos: T[] }[] = [];
  let indice = 0;

  for (let i = 0; i < datas.length && indice < candidatos.length; i++) {
    const grupo = candidatos.slice(indice, indice + quantidadePorDia);
    if (grupo.length === 0) break;
    resultado.push({ data: datas[i].data, diaSemana: datas[i].diaSemana, candidatos: grupo });
    indice += grupo.length;
  }

  return resultado;
};

/** Extrai o identificador do concurso (ex.: "CPAEAM/2026") do Assunto da mensagem. */
export const extrairNomeConcurso = (subject: string): string => {
  const m = subject.match(/([A-ZÇ]{2,10}\/\d{4})/);
  return m ? m[1] : subject;
};

/**
 * Regra que decide se um candidato está "finalizado": status com laudo
 * válido (ver MAPA_LAUDO_POR_STATUS) E Nº TIS preenchido — e, para os
 * status Inapto e Insuficiência Documental Médica, também Observações
 * preenchidas (motivo da inaptidão/IDM), exigido antes de finalizar.
 */
export const candidatoEstaFinalizado = (statusValor: string, numTisValor: string, observacoesValor: string = ''): boolean => {
  const statusUpper = String(statusValor || '').trim().toUpperCase();
  if (!MAPA_LAUDO_POR_STATUS[statusUpper]) return false;
  if (!String(numTisValor || '').trim()) return false;
  if ((statusUpper === 'INAPTO' || statusUpper === 'INSUF DOCUMENTAL') && !String(observacoesValor || '').trim()) return false;
  return true;
};

// =========================================================================
// EXTRAÇÃO DA MENSAGEM ADMINISTRATIVA (texto já transcrito do PDF)
// =========================================================================

/** Remove ruído de paginação do texto extraído do PDF. */
export const limparRuidoPaginacao = (texto: string): string => {
  return texto
    .replace(/HNRe\s*-?\s*0?2\.2/gi, ' ')
    .replace(/P[áa]gina\s+\d+\s+de\s+\d+/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export interface CabecalhoMensagem {
  dataHora: string;
  sender: string;
  recipient: string;
  info: string;
  subject: string;
  texto: string;
  purpose: 'Apresentação' | 'Agendamento' | 'Outros';
}

/** Extrai os campos do cabeçalho da mensagem SIGAD-MB. */
export const extrairCabecalhoMensagem = (texto: string): CabecalhoMensagem => {
  const extrair = (padrao: RegExp): string => {
    const m = texto.match(padrao);
    return m ? m[1].trim() : '';
  };

  // O código Data-Hora (DTG) é único no documento e tem formato fixo
  // <R|P><DDHHMM>Z/<MÊS>/<ANO> (ex.: R181644Z/SET/2026). Buscar esse padrão
  // diretamente — restrito à região antes de "De:", onde fica o cabeçalho —
  // é mais confiável do que esperar o valor na linha seguinte ao rótulo
  // "Data-Hora": o OCR pode linearizar a tabela do cabeçalho (Data-Hora |
  // Precedência | Restrição Acesso | Status da Mensagem) rótulo-a-rótulo
  // depois valor-a-valor, ou tudo numa linha só, variando conforme o motor.
  const idxDe = texto.search(/\bDe:\s/i);
  const blocoCabecalho = idxDe === -1 ? texto : texto.slice(0, idxDe);
  const mDtg = blocoCabecalho.match(/\b([RP])-?(\d{6}Z\/[A-ZÇ]{3}\/\d{2,4})\b/i);
  const dataHora = mDtg ? (mDtg[1] + mDtg[2]).toUpperCase() : extrair(/Data-Hora\s*[\r\n]*\s*([^\r\n]+)/i);
  const sender = extrair(/\bDe:\s*([^\r\n]+)/i);
  const recipient = extrair(/\bPara:\s*([^\r\n]+)/i);
  const info = extrair(/\bInfo:\s*([^\r\n]+)/i);
  const subject = extrair(/\bAssunto:\s*([^\r\n]+)/i);

  const mTexto = texto.match(/\bTexto:\s*([\s\S]*?)(?:\r?\n\s*Tr[âa]mite:|\r?\n\s*Prazo para Transmiss|$)/i);
  const corpoTexto = mTexto ? mTexto[1].trim() : '';

  const purpose: CabecalhoMensagem['purpose'] = /candidatos\s+abaixo\s+relacionados/i.test(corpoTexto)
    ? 'Apresentação'
    : 'Outros';

  return { dataHora, sender, recipient, info, subject, texto: corpoTexto, purpose };
};

/**
 * Extrai a lista de candidatos do corpo da mensagem: itens em lista não
 * enumerada, precedidos por matrícula no formato 000000-0. Tolerante ao
 * layout em colunas do PDF (corta cada item no próximo código de
 * matrícula, não na quebra de linha).
 */
export const extrairCandidatos = (texto: string): CandidatoBasico[] => {
  const inicio = texto.search(/candidatos\s+abaixo\s+relacionados/i);
  const fim = texto.search(/\bDOIS\s*[-–—]/i);
  const trecho = texto.substring(inicio >= 0 ? inicio : 0, fim >= 0 ? fim : texto.length);

  const candidatos: CandidatoBasico[] = [];
  // Matrícula: 5 a 7 dígitos + hífen + dígito verificador (ex.: 102073-2, 60027-6). \b evita pegar
  // trechos de números maiores (telefones, protocolos).
  const regexItem = /\b(\d{5,7}-\d)\b\s+([\s\S]+?)(?=\b\d{5,7}-\d\b|$)/g;
  let m: RegExpExecArray | null;

  while ((m = regexItem.exec(trecho)) !== null) {
    const id = m[1];
    const nome = m[2]
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/-\s*$/, '')
      .trim()
      .replace(/;\s*e$/i, '')
      .replace(/[;.]$/, '')
      .trim();
    if (nome) candidatos.push({ id, nome });
  }

  // Ordena por nome (não pela ordem em que aparecem na mensagem) para que o
  // agendamento automático — que distribui os candidatos nas datas na ordem
  // desta lista — também siga a ordem alfabética.
  candidatos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  return candidatos;
};

const MESES_ABREV: Record<string, number> = {
  JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5, JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11,
};

interface MarcadorData { inicio: number; fim: number; dia: number; mes: number; ano?: number; }

/** Localiza datas no texto: "06/10/2026", "06/10", "06OUT", "06 OUT 2026", "6 de outubro de 2026"... */
const localizarMarcadoresData = (texto: string): MarcadorData[] => {
  const marcadores: MarcadorData[] = [];
  const ano = (s?: string) => (s ? (s.length === 2 ? 2000 + parseInt(s, 10) : parseInt(s, 10)) : undefined);

  // Numéricas com barra ou ponto (a matrícula usa hífen, então não conflita) e dd-mm-aaaa.
  const regexNumerica = /\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{4}|\d{2}))?\b|\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = regexNumerica.exec(texto)) !== null) {
    const dia = parseInt(m[1] ?? m[4], 10);
    const mes = parseInt(m[2] ?? m[5], 10) - 1;
    if (dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
      marcadores.push({ inicio: m.index, fim: m.index + m[0].length, dia, mes, ano: ano(m[3] ?? m[6]) });
    }
  }

  // Com nome do mês (abreviado ou por extenso).
  const regexMes = /\b(\d{1,2})\s*(?:DE\s+)?(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-ZÇ]*\.?(?:\s*(?:DE\s*)?\/?\s*(\d{4}|\d{2})\b)?/gi;
  while ((m = regexMes.exec(texto)) !== null) {
    const dia = parseInt(m[1], 10);
    const mes = MESES_ABREV[m[2].toUpperCase()];
    if (dia >= 1 && dia <= 31 && mes !== undefined) {
      marcadores.push({ inicio: m.index, fim: m.index + m[0].length, dia, mes, ano: ano(m[3]) });
    }
  }

  return marcadores.sort((a, b) => a.inicio - b.inicio);
};

/**
 * Extrai os candidatos de uma mensagem que pode ser de APRESENTAÇÃO (lista única) ou de
 * AGENDAMENTO (candidatos agrupados em listas por dia, como a enviada pelo HOSRCF). No
 * agendamento, cada candidato recebe a data da lista em que aparece (`dataAgendamento`).
 *
 * É considerada mensagem de agendamento quando os candidatos aparecem sob 2 ou mais datas
 * diferentes — ou sob uma data, se o remetente for o HOSRCF. Datas do período da JRS
 * ("03AGO a 14SET2026 (JRS)") não contam como data de agendamento.
 *
 * `anoPadrao`/`mesReferencia` (do Data-Hora da mensagem) completam datas sem ano; um mês bem
 * anterior ao da mensagem é tratado como do ano seguinte (ex.: mensagem de DEZ com datas de JAN).
 */
export const extrairCandidatosComAgendamento = (
  texto: string,
  opcoes: { remetente?: string; anoPadrao?: number; mesReferencia?: number } = {},
): { candidatos: CandidatoBasico[]; modoAgendamento: boolean } => {
  const inicio = texto.search(/candidatos\s+abaixo\s+relacionados/i);

  // Fim da lista: "BRAVO - Informações complementares" ou o parágrafo "DOIS - ..." que segue a lista.
  // Na mensagem de agendamento os grupos por dia também são numerados ("UNO - 11NOV2026 às 7h30:",
  // "DOIS - 12NOV2026 ..."), então um "DOIS -" seguido logo de uma data é cabeçalho de grupo, não o fim.
  const idxBravo = texto.search(/\bBRAVO\s*[-–—]/i);
  let idxDois = -1;
  const regexDois = /\bDOIS\s*[-–—]/gi;
  let md: RegExpExecArray | null;
  while ((md = regexDois.exec(texto)) !== null) {
    const seguinte = texto.slice(md.index + md[0].length, md.index + md[0].length + 30);
    const primeiraData = localizarMarcadoresData(seguinte)[0];
    if (!primeiraData || primeiraData.inicio > 3) { idxDois = md.index; break; }
  }
  const fim = [idxBravo, idxDois].filter(i => i >= 0).sort((a, b) => a - b)[0] ?? -1;
  const trecho = texto.substring(inicio >= 0 ? inicio : 0, fim >= 0 ? fim : texto.length);

  const ids: { id: string; inicio: number; fim: number }[] = [];
  const regexId = /\b(\d{5,7}-\d)\b/g;
  let m: RegExpExecArray | null;
  while ((m = regexId.exec(trecho)) !== null) ids.push({ id: m[1], inicio: m.index, fim: m.index + m[0].length });

  // Descarta datas que na verdade são parte de uma matrícula (ex.: o "6 MARCOS" de "70123-6 MARCOS ...")
  // e as do período da JRS.
  const spansProibidos: [number, number][] = ids.map(i => [i.inicio, i.fim]);
  const regexPeriodo = /(\d{1,2})\s*([A-ZÇ]{3})\s*(\d{4})?\s*a\s*(\d{1,2})\s*([A-ZÇ]{3})\s*(\d{4})\s*\(\s*JRS\s*\)/gi;
  while ((m = regexPeriodo.exec(trecho)) !== null) spansProibidos.push([m.index, m.index + m[0].length]);
  const marcadores = localizarMarcadoresData(trecho).filter(
    d => !spansProibidos.some(([a, b]) => d.inicio < b && d.fim > a),
  );

  const resolverData = (d: MarcadorData): string => {
    let a = d.ano ?? opcoes.anoPadrao ?? new Date().getFullYear();
    if (d.ano === undefined && opcoes.mesReferencia !== undefined && d.mes < opcoes.mesReferencia - 6) a += 1;
    return formatarChaveData(new Date(a, d.mes, d.dia));
  };

  const candidatos: CandidatoBasico[] = ids.map((item, idx) => {
    const proximoId = idx + 1 < ids.length ? ids[idx + 1].inicio : trecho.length;
    const proximaData = marcadores.find(d => d.inicio >= item.fim);
    const limite = Math.min(proximoId, proximaData ? proximaData.inicio : trecho.length);
    const bruto = trecho.slice(item.fim, limite);
    // Cada item termina em ";" (o último, em "." ou "; e") — o que vier depois é rótulo de grupo etc.
    const nome = (bruto.includes(';') ? bruto.slice(0, bruto.indexOf(';')) : bruto)
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b(?:UNO|DOIS|TR[EÊ]S|QUATRO|CINCO|SEIS|SETE|OITO|NOVE|DEZ|ONZE|DOZE)\s*[-–—]?\s*$/i, '') // numeração do próximo grupo
      .trim()
      .replace(/\b(?:NO\s+)?(?:DIA|DATA|EM)\s*[:\-–]?\s*$/i, '') // rótulo que antecede a data da próxima lista
      .trim()
      .replace(/-\s*$/, '')
      .trim()
      .replace(/;\s*e$/i, '')
      .replace(/[;.:,]+$/, '')
      .trim();
    const anterior = [...marcadores].reverse().find(d => d.inicio < item.inicio);
    return { id: item.id, nome, dataAgendamento: anterior ? resolverData(anterior) : undefined };
  }).filter(c => c.nome);

  const datasDistintas = new Set(candidatos.map(c => c.dataAgendamento).filter(Boolean));
  const remetenteHospital = /HOSRCF/i.test(opcoes.remetente || '');
  const modoAgendamento = datasDistintas.size >= 2 || (datasDistintas.size >= 1 && remetenteHospital);

  if (!modoAgendamento) {
    candidatos.forEach(c => { delete c.dataAgendamento; });
  }

  // Apresentação: ordem alfabética (o agendamento automático segue a ordem da lista).
  // Agendamento: ordem cronológica, depois alfabética dentro do dia.
  candidatos.sort((a, b) =>
    (a.dataAgendamento || '').localeCompare(b.dataAgendamento || '') ||
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  return { candidatos, modoAgendamento };
};

export interface PeriodoJRS { inicio: Date; fim: Date; }

/** Extrai o período de agendamento da JRS, no padrão "03AGO a 14SET2026 (JRS)". */
// =========================================================================
// IMPORTAÇÃO DE CONCURSO A PARTIR DE CSV ("candidatosDataBase" + nome)
// =========================================================================

/** Parser de CSV tolerante a campos entre aspas (com vírgulas/quebras de linha internas). */
export const parseCsvGenerico = (texto: string): string[][] => {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else dentroAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroAspas = true;
    } else if (c === ',') {
      linha.push(campo);
      campo = '';
    } else if (c === '\r') {
      // ignora
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter(l => l.some(v => v.trim() !== ''));
};

const normalizarCabecalho = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Datas de origem variam de formato (algumas planilhas usam AAAA-MM-DD também em
 * dataLaudo) — normaliza dataAgendamento para ISO e dataLaudo para DD/MM/AAAA. */
export const paraDataISO = (valor: string): string => {
  if (!valor) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const m = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return valor;
};
export const paraDataBR = (valor: string): string => {
  if (!valor) return '';
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valor)) return valor;
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return valor;
};

export interface CandidatoImportadoCsv {
  id: string;
  nome: string;
  dataAgendamento: string;
  status: string;
  observacoes: string;
  finalizado: boolean;
  recurso: boolean;
  dataLaudo: string;
  laudo: string;
  numTIS: string;
  termoRecursoUrl: string;
  termoCientificacaoUrl?: string;
}

/**
 * Interpreta um CSV no formato da aba "candidatosDataBase" (+ coluna de nome
 * do candidato em qualquer posição) — colunas identificadas pelo cabeçalho,
 * não pela ordem, tolerante a variações de acentuação/espaçamento.
 */
export const interpretarCsvCandidatosDataBase = (texto: string): CandidatoImportadoCsv[] => {
  const linhas = parseCsvGenerico(texto);
  if (linhas.length === 0) return [];

  const cabecalho = linhas[0].map(normalizarCabecalho);
  const idx = (nomes: string[]): number => {
    for (const n of nomes) {
      const i = cabecalho.indexOf(normalizarCabecalho(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const col = {
    id: idx(['id']),
    nome: idx(['candidato', 'nome']),
    dataAgendamento: idx(['dataAgendamento']),
    status: idx(['status']),
    observacoes: idx(['observacoes']),
    finalizado: idx(['finalizado']),
    recurso: idx(['recurso']),
    dataLaudo: idx(['dataLaudo']),
    laudo: idx(['Laudo']),
    numTIS: idx(['nºTIS', 'nTIS', 'numTIS']),
    termoRecursoUrl: idx(['termoRecursoUrl']),
  };

  if (col.id === -1 || col.nome === -1) {
    throw new Error('O CSV precisa ter ao menos as colunas "id" e "candidato" (ou "nome").');
  }

  const campo = (linha: string[], indice: number): string => (indice !== -1 ? (linha[indice] || '').trim() : '');
  const campoBooleano = (linha: string[], indice: number): boolean =>
    indice !== -1 && campo(linha, indice).toUpperCase() === 'TRUE';

  return linhas
    .slice(1)
    .filter(l => campo(l, col.id))
    .map(linha => ({
      id: campo(linha, col.id),
      nome: campo(linha, col.nome),
      dataAgendamento: paraDataISO(campo(linha, col.dataAgendamento)),
      status: campo(linha, col.status),
      observacoes: campo(linha, col.observacoes),
      finalizado: campoBooleano(linha, col.finalizado),
      recurso: campoBooleano(linha, col.recurso),
      dataLaudo: paraDataBR(campo(linha, col.dataLaudo)),
      laudo: campo(linha, col.laudo),
      numTIS: campo(linha, col.numTIS),
      termoRecursoUrl: campo(linha, col.termoRecursoUrl),
    }));
};

export const extrairPeriodoJRS = (texto: string): PeriodoJRS | null => {
  const meses: Record<string, number> = {
    JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5,
    JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11,
  };

  const regex = /(\d{1,2})\s*([A-ZÇ]{3})\s*(\d{4})?\s*a\s*(\d{1,2})\s*([A-ZÇ]{3})\s*(\d{4})\s*\(\s*JRS\s*\)/i;
  const m = texto.match(regex);
  if (!m) return null;

  const mesIni = meses[m[2].toUpperCase()];
  const mesFim = meses[m[5].toUpperCase()];
  if (mesIni === undefined || mesFim === undefined) return null;

  const diaIni = parseInt(m[1], 10);
  const diaFim = parseInt(m[4], 10);
  const anoFim = parseInt(m[6], 10);
  const anoIni = m[3] ? parseInt(m[3], 10) : anoFim;

  return { inicio: new Date(anoIni, mesIni, diaIni), fim: new Date(anoFim, mesFim, diaFim) };
};
