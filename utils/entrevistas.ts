// Ficheiro: utils/entrevistas.ts
// Funções puras de APRESENTAÇÃO da entrevista gravada da IS (sem Firebase): tempo mm:ss,
// nomes dos falantes pelo `mapaFalantes`, anamnese efetiva (editada ?? original), busca na
// transcrição, edição de listas e o texto formatado que o perito copia para o laudo.
// Contrato dos dados em config/entrevistas.ts.
import {
  ROTULO_SITUACAO,
  type AnamneseEntrevista, type EntrevistaRecord, type FalaTranscrita, type FonteInformacao,
  type ItemCronologia, type ParticipanteEntrevista, type SituacaoEntrevista,
} from '../config/entrevistas';

/** Segundos → "mm:ss" (ou "h:mm:ss" a partir de 1 hora). Valores inválidos viram "00:00". */
export const formatarTempo = (seg: unknown): string => {
  const n = typeof seg === 'number' && Number.isFinite(seg) && seg > 0 ? Math.floor(seg) : 0;
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  const p = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

/** Duração legível ("23 min", "45 s", "1 h 05 min"). */
export const formatarDuracao = (seg: unknown): string => {
  const n = typeof seg === 'number' && Number.isFinite(seg) && seg > 0 ? Math.round(seg) : 0;
  if (n < 60) return `${n} s`;
  const min = Math.round(n / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
};

/** Converte o `em` de QuemQuando (Timestamp do Firestore, Date, número, {seconds}) em Date. */
export const dataDe = (em: unknown): Date | null => {
  if (!em) return null;
  if (em instanceof Date) return Number.isNaN(em.getTime()) ? null : em;
  if (typeof em === 'number') return new Date(em);
  if (typeof em === 'string') { const d = new Date(em); return Number.isNaN(d.getTime()) ? null : d; }
  if (typeof em === 'object') {
    const o = em as { toDate?: () => Date; seconds?: number };
    if (typeof o.toDate === 'function') return o.toDate();
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000);
  }
  return null;
};

/** "08/11/2026 14:05" (fuso do navegador); '' se não houver data. */
export const dataHoraEntrevista = (em: unknown): string => {
  const d = dataDe(em);
  if (!d) return '';
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** "AAAA-MM-DD" → "DD/MM/AAAA" (o `audio.apagarApos`). */
export const dataIsoBr = (iso: string | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

export const ROTULO_FONTE: Record<FonteInformacao, string> = {
  relato_inspecionado: 'Relato do inspecionado',
  documento_citado: 'Documento citado',
  perito: 'Perito',
  acompanhante: 'Acompanhante',
  outro: 'Outro',
};

/** Tom da StatusTag para cada situação (nomes do DS: components/ui/StatusTag). */
export const tomSituacao = (s: SituacaoEntrevista): 'success' | 'danger' | 'attention' | 'neutral' =>
  s === 'pronta' ? 'success' : s === 'erro' ? 'danger' : s === 'aguardando_envio' ? 'neutral' : 'attention';

export const rotuloSituacao = (s: SituacaoEntrevista): string => ROTULO_SITUACAO[s] ?? s;

/** Anamnese mostrada e copiada: a editada pelo perito, senão a da IA. */
export const anamneseEfetiva = (e: Pick<EntrevistaRecord, 'anamnese' | 'anamneseEditada'>): AnamneseEntrevista | null =>
  e.anamneseEditada ?? e.anamnese ?? null;

/** Nome do falante pelo mapa ("F1" → "CT Fulano"); sem mapa, "Falante 1". */
export const nomeDoFalante = (rotulo: string, mapa?: Record<string, string> | null): string => {
  const nome = mapa?.[rotulo]?.trim();
  if (nome) return nome;
  const n = /^F?(\d+)$/i.exec(rotulo || '');
  return n ? `Falante ${n[1]}` : (rotulo || 'Falante');
};

export type FalaComNome = FalaTranscrita & { nome: string };

/** Aplica o `mapaFalantes` à transcrição (cada fala ganha o nome do falante). */
export const aplicarMapaFalantes = (falas: FalaTranscrita[] | undefined, mapa?: Record<string, string> | null): FalaComNome[] =>
  (falas || []).map(f => ({ ...f, nome: nomeDoFalante(f.falante, mapa) }));

/** Rótulos dos falantes na ordem em que aparecem pela primeira vez, com a primeira fala de cada um. */
export const primeirasFalas = (falas: FalaTranscrita[] | undefined): { rotulo: string; fala: FalaTranscrita }[] => {
  const vistos = new Map<string, FalaTranscrita>();
  for (const f of falas || []) if (f.falante && !vistos.has(f.falante)) vistos.set(f.falante, f);
  return [...vistos.entries()]
    .map(([rotulo, fala]) => ({ rotulo, fala }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { numeric: true }));
};

/**
 * Mapa inicial do formulário "Confirmar falantes": o sugerido pela IA, desde que o nome seja de
 * um participante; os demais rótulos ficam '' (não identificado).
 */
export const mapaInicial = (falas: FalaTranscrita[] | undefined, participantes: ParticipanteEntrevista[], sugerido?: Record<string, string> | null): Record<string, string> => {
  const nomes = new Set(participantes.map(p => p.nome));
  const mapa: Record<string, string> = {};
  for (const { rotulo } of primeirasFalas(falas)) {
    const s = sugerido?.[rotulo];
    mapa[rotulo] = s && nomes.has(s) ? s : '';
  }
  return mapa;
};

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca simples na transcrição (texto ou nome do falante; ignora maiúsculas e acentos). */
export const filtrarTranscricao = <T extends FalaTranscrita & { nome?: string }>(falas: T[], busca: string): T[] => {
  const q = semAcento(busca.trim());
  if (!q) return falas;
  return falas.filter(f => semAcento(f.texto).includes(q) || semAcento(f.nome || '').includes(q));
};

/** Lista ↔ texto de uma linha por item (edição em textarea). */
export const listaParaTexto = (l: string[] | undefined): string => (l || []).join('\n');
export const textoParaLista = (t: string): string[] => t.split('\n').map(s => s.trim()).filter(Boolean);

/** Anamnese vazia (base quando a IA não devolveu algum campo). */
export const anamneseVazia = (): AnamneseEntrevista => ({
  resumoExecutivo: '', queixaPrincipal: '', alegacoesInspecionado: [], historiaCronologica: [], antecedentes: [],
  medicacoes: [], tratamentos: [], examesCitados: [], repercussaoFuncional: '', secaoFinalidade: { titulo: '', texto: '' },
  pontosAEsclarecer: [], citacoes: [],
});

/** Completa campos ausentes (a IA pode omitir algum) para a tela e a edição não quebrarem. */
export const normalizarAnamnese = (a: Partial<AnamneseEntrevista> | null | undefined): AnamneseEntrevista => {
  const v = anamneseVazia();
  const s = (x: unknown) => (typeof x === 'string' ? x : '');
  const l = (x: unknown) => (Array.isArray(x) ? x.filter(i => typeof i === 'string') as string[] : []);
  return {
    resumoExecutivo: s(a?.resumoExecutivo),
    queixaPrincipal: s(a?.queixaPrincipal),
    alegacoesInspecionado: l(a?.alegacoesInspecionado),
    historiaCronologica: Array.isArray(a?.historiaCronologica) ? a!.historiaCronologica.filter(Boolean) : v.historiaCronologica,
    antecedentes: l(a?.antecedentes),
    medicacoes: l(a?.medicacoes),
    tratamentos: l(a?.tratamentos),
    examesCitados: l(a?.examesCitados),
    repercussaoFuncional: s(a?.repercussaoFuncional),
    secaoFinalidade: { titulo: s(a?.secaoFinalidade?.titulo), texto: s(a?.secaoFinalidade?.texto) },
    pontosAEsclarecer: l(a?.pontosAEsclarecer),
    citacoes: Array.isArray(a?.citacoes) ? a!.citacoes.filter(Boolean) : v.citacoes,
  };
};

/** Limpa a anamnese editada antes de gravar: apara textos, tira itens vazios e campos `undefined`. */
export const limparAnamnese = (a: AnamneseEntrevista): AnamneseEntrevista => {
  const lista = (l: string[]) => l.map(s => s.trim()).filter(Boolean);
  return {
    resumoExecutivo: a.resumoExecutivo.trim(),
    queixaPrincipal: a.queixaPrincipal.trim(),
    alegacoesInspecionado: lista(a.alegacoesInspecionado),
    historiaCronologica: a.historiaCronologica
      .map(i => {
        const item: ItemCronologia = { quando: (i.quando || '').trim(), evento: (i.evento || '').trim(), fonte: i.fonte || 'outro' };
        if (typeof i.tempoSeg === 'number' && Number.isFinite(i.tempoSeg)) item.tempoSeg = i.tempoSeg;
        return item;
      })
      .filter(i => i.evento),
    antecedentes: lista(a.antecedentes),
    medicacoes: lista(a.medicacoes),
    tratamentos: lista(a.tratamentos),
    examesCitados: lista(a.examesCitados),
    repercussaoFuncional: a.repercussaoFuncional.trim(),
    secaoFinalidade: { titulo: a.secaoFinalidade.titulo.trim(), texto: a.secaoFinalidade.texto.trim() },
    pontosAEsclarecer: lista(a.pontosAEsclarecer),
    citacoes: a.citacoes
      .map(c => ({ falante: c.falante || '', texto: (c.texto || '').trim(), tempoSeg: typeof c.tempoSeg === 'number' ? c.tempoSeg : 0 }))
      .filter(c => c.texto),
  };
};

/** Seções da anamnese, na ordem da anamnese médico-pericial (tela e texto copiado). */
export const SECOES_ANAMNESE = [
  { id: 'resumoExecutivo', titulo: 'Resumo executivo' },
  { id: 'queixaPrincipal', titulo: 'Queixa principal' },
  { id: 'alegacoesInspecionado', titulo: 'Alegações do inspecionado' },
  { id: 'historiaCronologica', titulo: 'História em ordem cronológica' },
  { id: 'antecedentes', titulo: 'Antecedentes' },
  { id: 'medicacoes', titulo: 'Medicações' },
  { id: 'tratamentos', titulo: 'Tratamentos' },
  { id: 'examesCitados', titulo: 'Exames citados' },
  { id: 'repercussaoFuncional', titulo: 'Repercussão funcional' },
  { id: 'secaoFinalidade', titulo: 'Finalidade' },
  { id: 'pontosAEsclarecer', titulo: 'Pontos a esclarecer' },
  { id: 'citacoes', titulo: 'Citações literais' },
] as const;

/** Título da seção da finalidade (o da IA ou "Finalidade: …"). */
export const tituloSecaoFinalidade = (a: AnamneseEntrevista, finalidade?: string): string =>
  a.secaoFinalidade?.titulo?.trim() || (finalidade ? `Finalidade: ${finalidade}` : 'Finalidade');

export const AVISO_IA = 'Rascunho gerado por IA — revisar antes de usar no laudo.';

/**
 * Texto da anamnese para a área de transferência (colar no laudo/prontuário): títulos em
 * maiúsculas, listas com "- ", cronologia "quando — evento (fonte)", citações com o nome do falante.
 */
export const textoAnamnese = (
  a: AnamneseEntrevista,
  opcoes: { finalidade?: string; mapaFalantes?: Record<string, string> | null; cabecalho?: string } = {},
): string => {
  const an = normalizarAnamnese(a);
  const blocos: string[] = [];
  if (opcoes.cabecalho) blocos.push(opcoes.cabecalho);
  const sec = (titulo: string, corpo: string) => { if (corpo.trim()) blocos.push(`${titulo.toUpperCase()}\n${corpo.trim()}`); };
  const lista = (l: string[]) => l.map(s => `- ${s}`).join('\n');
  sec('Resumo executivo', an.resumoExecutivo);
  sec('Queixa principal', an.queixaPrincipal);
  sec('Alegações do inspecionado', lista(an.alegacoesInspecionado));
  sec('História em ordem cronológica', an.historiaCronologica
    .map(i => `- ${i.quando || 'não referido'} — ${i.evento} (${ROTULO_FONTE[i.fonte] ?? i.fonte})`).join('\n'));
  sec('Antecedentes', lista(an.antecedentes));
  sec('Medicações', lista(an.medicacoes));
  sec('Tratamentos', lista(an.tratamentos));
  sec('Exames citados', lista(an.examesCitados));
  sec('Repercussão funcional', an.repercussaoFuncional);
  sec(tituloSecaoFinalidade(an, opcoes.finalidade), an.secaoFinalidade.texto);
  sec('Pontos a esclarecer', lista(an.pontosAEsclarecer));
  sec('Citações literais', an.citacoes
    .map(c => `- ${nomeDoFalante(c.falante, opcoes.mapaFalantes)} (${formatarTempo(c.tempoSeg)}): "${c.texto}"`).join('\n'));
  blocos.push(`(${AVISO_IA})`);
  return blocos.join('\n\n');
};

/** A primeira entrevista em processamento (o hook de acompanhamento avança só uma por vez). */
export const entrevistaEmAndamento = <T extends Pick<EntrevistaRecord, 'situacao'>>(lista: T[]): T | null =>
  lista.find(e => e.situacao === 'transcrevendo' || e.situacao === 'organizando') ?? null;

/**
 * Entrevista criada mas cujo áudio nunca chegou ao servidor (o perito fechou o fluxo antes de
 * enviar): fica `aguardando_envio` sem `audio`. Mostrada como "Não enviada"; não abre o resultado.
 */
export const naoEnviada = (e: Pick<EntrevistaRecord, 'situacao' | 'audio'>): boolean => e.situacao === 'aguardando_envio' && !e.audio;
