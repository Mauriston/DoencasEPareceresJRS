// Ficheiro: servidor/assessor/contexto.ts
// Dados da IS que o Assessor IA junta ao comando do médico (Admin SDK, só leitura): a IS, o cadastro do
// inspecionado (SEM nome, NIP, CPF, celular ou e-mail — só o que a redação usa: posto/quadro, OM, sexo, idade e
// vínculo), os PDFs já transcritos pela IA do app (inspecoes/{id}/exames), as entrevistas gravadas
// (anamnese organizada) e o histórico das outras IS do inspecionado, com as regras de laudo da finalidade
// (data/formasConclusaoIS.json — as mesmas do LaudoAssistidoIS).
// `montarTextoContexto` e `resumoRegra` são puras e testadas (utils/__tests__/assessorServidor.test.ts).
import type { Firestore } from 'firebase-admin/firestore';
import formasJson from '../../data/formasConclusaoIS.json';
import { derivarContexto, tipoServicoDoCadastro, vinculoDoCadastro, type CadastroContexto, type ContextoLaudo } from '../../utils/contextoLaudo';
import { regraDaIS, type FormasConclusao } from '../../utils/validacaoLaudo';
import { laudosDaIS } from '../../utils/finalidadesMultiplas';
import { idadeEmAnos } from '../../utils/format';

const FORMAS = formasJson as unknown as FormasConclusao;

export interface ItemDocumento { tipo?: string; titulo?: string; data?: string; emissor?: string; texto?: string; valores?: { nome: string; valor: string; referencia?: string }[] }
export interface DocumentoContexto { arquivo: string; classificacao?: string; textoIncompleto?: boolean; itens: ItemDocumento[] }
export interface HistoricoContexto { is: number; dataAbertura?: string; finalidade?: string; status?: string; dataLaudo?: string; laudo?: string; restricoes?: string; cid?: string }
export interface RegraContexto { finalidade: string; chave: string; fonte: string; laudos: { id: string; modelo: string; aplicarQuando?: string; exige?: string[] }[]; regrasDeAplicacao: string[]; observacoes: string[] }

export interface ContextoAssessor {
  isNumero: number;
  finalidades: string[];
  grupoFinalidade: string;
  amp: string;
  status: string;
  dataAbertura: string;
  dataEntrevista: string;
  peritoNome: string;
  observacoes: string;
  laudo: string;
  restricoes: string;
  cid: string;
  redacao: { entrevista: string; exameClinico: string; conclusao: string };
  inspecionado: { pgq: string; om: string; sexo: string; idade: number | null; vinculo: string; tipoServico: string; tipo: string; servidorCivil: boolean };
  derivado: ContextoLaudo;
  regras: RegraContexto[];
  documentos: DocumentoContexto[];
  entrevistas: string[];
  historico: HistoricoContexto[];
}

const txt = (v: unknown): string => (v == null ? '' : String(v)).trim();

/** Regra de laudo da finalidade (chave, fonte e modelos permitidos). */
export const resumoRegra = (f: FormasConclusao, finalidade: string, vinculo: string, tipoServico: string): RegraContexto | null => {
  const chave = regraDaIS(f, finalidade, vinculo, tipoServico as never);
  const regra = chave ? f.regras[chave] : null;
  if (!chave || !regra) return null;
  return {
    finalidade, chave, fonte: regra.fonte,
    laudos: regra.laudosPermitidos.filter(id => f.laudos[id]).map(id => {
      const l = f.laudos[id] as unknown as { modelo: string; aplicarQuando?: string; exige?: string[] };
      return { id, modelo: l.modelo, ...(l.aplicarQuando ? { aplicarQuando: l.aplicarQuando } : {}), ...(l.exige?.length ? { exige: l.exige } : {}) };
    }),
    regrasDeAplicacao: regra.regrasDeAplicacao ?? [],
    observacoes: regra.observacoes ?? [],
  };
};

/** Texto da anamnese organizada de uma entrevista gravada (a editada pelo perito, se houver). */
const textoAnamnese = (a: Record<string, unknown> | undefined): string => {
  if (!a) return '';
  const lista = (v: unknown) => (Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : txt((x as { evento?: string; quando?: string }).quando ? `${(x as any).quando}: ${(x as any).evento}` : (x as any)?.evento))).filter(Boolean) : []);
  const linhas = [
    a.resumoExecutivo ? `Resumo: ${txt(a.resumoExecutivo)}` : '',
    a.queixaPrincipal ? `Queixa principal: ${txt(a.queixaPrincipal)}` : '',
    ...lista(a.alegacoesInspecionado).map(x => `Alegação: ${x}`),
    ...lista(a.historiaCronologica).map(x => `História: ${x}`),
    ...lista(a.antecedentes).map(x => `Antecedente: ${x}`),
    ...lista(a.medicacoes).map(x => `Medicação: ${x}`),
    ...lista(a.tratamentos).map(x => `Tratamento: ${x}`),
    ...lista(a.examesCitados).map(x => `Exame citado: ${x}`),
    a.repercussaoFuncional ? `Repercussão funcional relatada: ${txt(a.repercussaoFuncional)}` : '',
    (a.secaoFinalidade as any)?.texto ? `${txt((a.secaoFinalidade as any).titulo) || 'Finalidade'}: ${txt((a.secaoFinalidade as any).texto)}` : '',
    ...lista(a.condutaPerito).map(x => `Conduta do perito: ${x}`),
    ...lista(a.pontosAEsclarecer).map(x => `A esclarecer: ${x}`),
  ];
  return linhas.filter(Boolean).join('\n');
};

/** Lê tudo o que o Assessor usa da IS. Devolve null se a IS não existir. */
export const carregarContextoIS = async (db: Firestore, isId: string, hoje: string): Promise<ContextoAssessor | null> => {
  const snap = await db.collection('inspecoes').doc(isId).get();
  if (!snap.exists) return null;
  const is = snap.data() as Record<string, any>;
  const nip = txt(is.inspecionadoId);
  const [milSnap, examesSnap, entrevistasSnap, historicoSnap] = await Promise.all([
    nip ? db.collection('militares').doc(nip).get() : Promise.resolve(null),
    db.collection('inspecoes').doc(isId).collection('exames').get(),
    db.collection('inspecoes').doc(isId).collection('entrevistas').get(),
    nip ? db.collection('inspecoes').where('inspecionadoId', '==', nip).get() : Promise.resolve(null),
  ]);
  const mil = (milSnap && milSnap.exists ? milSnap.data() : null) as Record<string, any> | null;
  const cadastro: CadastroContexto | null = mil ? { tipo: mil.tipo, temporario: mil.temporario, rm1: mil.rm1, refo: mil.refo, pgq: mil.pgq } : null;
  const vinculo = vinculoDoCadastro(cadastro);
  const tipoServico = tipoServicoDoCadastro(cadastro);
  const historicoDocs = (historicoSnap?.docs ?? []).filter(d => d.id !== isId).map(d => d.data() as Record<string, any>);
  const derivado = derivarContexto(cadastro, historicoDocs.map(h => ({ is: Number(h.is) || 0, dataLaudo: h.dataLaudo, laudo: h.laudo, afastamentos: h.afastamentos })),
    { is: Number(is.is) || 0, dataAbertura: is.dataAbertura, dataEntrevista: is.dataEntrevista });
  // As mesmas partes que o detalhe da IS mostra (finalidade composta → um laudo por parte).
  const finalidades = laudosDaIS(is as never).map(l => l.finalidade);
  const servidorCivil = /\bSC\b|servidor civil|SCNS/i.test(txt(mil?.pgq));
  const regras = (finalidades.length ? finalidades : [txt(is.finalidade)])
    .map(f => resumoRegra(FORMAS, f, vinculo, tipoServico)).filter((r): r is RegraContexto => !!r);

  const documentos: DocumentoContexto[] = examesSnap.docs
    .map(d => d.data() as Record<string, any>)
    .sort((a, b) => (a.enviadoEm?.toMillis?.() ?? 0) - (b.enviadoEm?.toMillis?.() ?? 0))
    .map((e, i) => ({
      arquivo: `Documento ${i + 1}`,
      classificacao: txt(e.classificacao) || undefined,
      textoIncompleto: !!e.textoIncompleto,
      itens: (Array.isArray(e.itens) ? e.itens : []).map((it: any) => ({
        tipo: txt(it.tipo), titulo: txt(it.titulo), data: txt(it.data), emissor: txt(it.emissor), texto: txt(it.texto),
        valores: Array.isArray(it.valores) ? it.valores.map((v: any) => ({ nome: txt(v.nome), valor: txt(v.valor), ...(v.referencia ? { referencia: txt(v.referencia) } : {}) })) : undefined,
      })),
    }));
  const entrevistas = entrevistasSnap.docs.map(d => d.data() as Record<string, any>)
    .map(e => textoAnamnese(e.anamneseEditada || e.anamnese)).filter(Boolean);
  const historico: HistoricoContexto[] = historicoDocs
    .map(h => ({ is: Number(h.is) || 0, dataAbertura: txt(h.dataAbertura), finalidade: txt(h.finalidade), status: txt(h.status), dataLaudo: txt(h.dataLaudo), laudo: txt(h.laudo), restricoes: txt(h.restricoes), cid: txt(h.cid) }))
    .sort((a, b) => b.dataAbertura.localeCompare(a.dataAbertura));

  return {
    isNumero: Number(is.is) || Number(isId) || 0,
    finalidades: finalidades.length ? finalidades : [txt(is.finalidade)],
    grupoFinalidade: txt(is.grupoFinalidade),
    amp: txt(is.amp),
    status: txt(is.status),
    dataAbertura: txt(is.dataAbertura),
    dataEntrevista: txt(is.dataEntrevista),
    peritoNome: txt(is.peritoNome),
    observacoes: txt(is.observacoes),
    laudo: txt(is.laudo),
    restricoes: txt(is.restricoes),
    cid: txt(is.cid),
    redacao: { entrevista: txt(is.redacaoEntrevista), exameClinico: txt(is.redacaoExameClinico), conclusao: txt(is.redacaoConclusao) },
    inspecionado: {
      pgq: txt(mil?.pgq), om: txt(mil?.om), sexo: txt(mil?.sexo),
      idade: mil?.dataNascimento ? idadeEmAnos(String(mil.dataNascimento), hoje) : null,
      vinculo, tipoServico, tipo: txt(mil?.tipo) || 'militar', servidorCivil,
    },
    derivado,
    regras,
    documentos,
    entrevistas,
    historico,
  };
};

const linha = (rotulo: string, valor: unknown) => {
  const v = txt(valor);
  return v ? `${rotulo}: ${v}` : '';
};

/** Texto do contexto da IS para o modelo (dados do app; NÃO são instruções). */
export const montarTextoContexto = (c: ContextoAssessor, hoje: string): string => {
  const partes: string[] = [];
  partes.push([
    '## IS',
    linha('Número', c.isNumero),
    linha(c.finalidades.length > 1 ? 'Finalidades' : 'Finalidade', c.finalidades.join(' / ')),
    linha('Grupo da finalidade', c.grupoFinalidade),
    linha('Competência (AMP)', c.amp),
    linha('Status no app', c.status),
    linha('Data de abertura', c.dataAbertura),
    linha('Data da entrevista', c.dataEntrevista.replace('T', ' ')),
    linha('Perito', c.peritoNome),
    linha('Observações registradas', c.observacoes),
    linha('Laudo já registrado no app', c.laudo),
    linha('Restrições registradas', c.restricoes),
    linha('CID registrado', c.cid),
    linha('Data de hoje', hoje),
  ].filter(Boolean).join('\n'));
  if (c.redacao.entrevista || c.redacao.exameClinico || c.redacao.conclusao) {
    partes.push(['## Redação já inserida na IS (versão atual dos campos)',
      c.redacao.entrevista ? `### Entrevista\n${c.redacao.entrevista}` : '',
      c.redacao.exameClinico ? `### Exame Clínico\n${c.redacao.exameClinico}` : '',
      c.redacao.conclusao ? `### Conclusão\n${c.redacao.conclusao}` : ''].filter(Boolean).join('\n\n'));
  }
  const i = c.inspecionado;
  partes.push([
    '## Inspecionado (sem dados de identificação)',
    linha('Tipo', i.tipo),
    linha('Posto/graduação e quadro (sigla)', i.pgq),
    linha('OM', i.om),
    linha('Sexo', i.sexo),
    i.idade != null ? `Idade: ${i.idade} anos` : 'Idade: não cadastrada',
    linha('Vínculo', i.vinculo),
    linha('Tipo de serviço', i.tipoServico),
  ].filter(Boolean).join('\n'));
  const d = c.derivado;
  if (d.historicoDisponivel) {
    partes.push([
      '## Situação derivada do histórico (cálculo do app)',
      d.ltsAnterior != null ? `Vem de LTS na IS anterior: ${d.ltsAnterior ? 'sim' : 'não'}` : '',
      linha('Término da LTS anterior', d.ltsAnteriorTermino),
      d.apresentadoNoPrazo != null ? `Apresentado no prazo: ${d.apresentadoNoPrazo ? 'sim' : 'não'}` : '',
      d.ltsIninterruptaDias != null ? `Dias de LTS ininterrupta antes desta IS: ${d.ltsIninterruptaDias}` : '',
      d.agregado != null ? `Agregado (LTS ≥ 1 ano, carreira): ${d.agregado ? 'sim' : 'não'}` : '',
      d.restricoesAcumuladasMeses != null ? `Meses acumulados de LTS/Restrições: ${d.restricoesAcumuladasMeses}` : '',
    ].filter(Boolean).join('\n'));
  }
  partes.push(c.regras.length
    ? ['## Formas de conclusão aplicáveis (catálogo do app, a partir da DGPM-406)', ...c.regras.map(r => [
      `### ${r.finalidade} — regra ${r.chave} (DGPM-406, ${r.fonte})`,
      'Laudos permitidos (use SOMENTE estes modelos, preenchendo os campos {{...}}):',
      ...r.laudos.map(l => `- ${l.id}: "${l.modelo}"${l.aplicarQuando ? ` — aplicar quando: ${l.aplicarQuando}` : ''}${l.exige?.length ? ` — exige: ${l.exige.join(', ')}` : ''}`),
      ...(r.regrasDeAplicacao.length ? ['Regras de aplicação:', ...r.regrasDeAplicacao.map(x => `- ${x}`)] : []),
      ...(r.observacoes.length ? ['Observações:', ...r.observacoes.map(x => `- ${x}`)] : []),
    ].join('\n'))].join('\n\n')
    : '## Formas de conclusão aplicáveis\nA finalidade não está no catálogo do app: localize o modelo de laudo no capítulo da DGPM-406 enviado.');
  partes.push(c.documentos.length
    ? [`## Documentos em PDF enviados na IS, já transcritos pelo app (${c.documentos.length})`, ...c.documentos.map(doc => [
      `### ${doc.arquivo}${doc.classificacao ? ` (${doc.classificacao})` : ''}${doc.textoIncompleto ? ' — ATENÇÃO: texto possivelmente incompleto' : ''}`,
      ...doc.itens.map(it => [
        `[${it.tipo || 'documento'}] ${it.titulo || ''} — data: ${it.data || 'n/c'}; emissor: ${it.emissor || 'n/c'}`,
        it.texto || '',
        ...(it.valores?.length ? it.valores.map(v => `- ${v.nome}: ${v.valor}${v.referencia ? ` (ref.: ${v.referencia})` : ''}`) : []),
      ].filter(Boolean).join('\n')),
    ].join('\n\n'))].join('\n\n')
    : '## Documentos em PDF enviados na IS\nNenhum.');
  partes.push(c.entrevistas.length
    ? ['## Entrevistas gravadas (anamnese organizada pelo app)', ...c.entrevistas.map((t, n) => `### Entrevista ${n + 1}\n${t}`)].join('\n\n')
    : '## Entrevistas gravadas\nNenhuma.');
  partes.push(c.historico.length
    ? ['## Histórico de outras IS do inspecionado (mais recente primeiro)', ...c.historico.map(h =>
      `- IS ${h.is} · abertura ${h.dataAbertura || 'n/c'} · ${h.finalidade || 'finalidade n/c'} · status ${h.status || 'n/c'}${h.laudo ? ` · laudo (${h.dataLaudo || 'sem data'}): ${h.laudo}` : ''}${h.restricoes ? ` · restrições: ${h.restricoes}` : ''}${h.cid ? ` · CID: ${h.cid}` : ''}`)].join('\n')
    : '## Histórico de outras IS do inspecionado\nNenhuma.');
  return partes.join('\n\n');
};
