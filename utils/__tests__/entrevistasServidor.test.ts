import { describe, it, expect } from 'vitest';
import {
  dataApagarApos, extensaoDoCaminhoOriginal, extensaoDoMime, idValido, mimeDaExtensao,
} from '../../servidor/entrevistas/audio';
import {
  duracaoEmSegundos, interpretarRespostaBatch, montarPedidoBatch, resultadoParaFalas,
} from '../../servidor/entrevistas/transcricao';
import { formatarTempo, montarPromptAnamnese } from '../../servidor/entrevistas/prompt';
import { ESQUEMA_RESPOSTA, NAO_IDENTIFICADO, NAO_REFERIDO, normalizarResultado } from '../../servidor/entrevistas/organizacao';
import { TRAVA_VENCIDA_MS, travaVencida } from '../../servidor/entrevistas/fluxo';
import type { ParticipanteEntrevista } from '../../config/entrevistas';

const w = (word: string, ini: number, fim: number, speakerLabel?: string) => ({
  word, speakerLabel, startOffset: { seconds: String(Math.floor(ini)), nanos: Math.round((ini % 1) * 1e9) }, endOffset: { seconds: Math.floor(fim), nanos: Math.round((fim % 1) * 1e9) },
});

describe('audio', () => {
  it('valida ids', () => {
    expect(idValido('abc_DEF-123')).toBe(true);
    for (const v of ['', 'a/b', '..', 'a b', 'x'.repeat(129), 12, null]) expect(idValido(v)).toBe(false);
  });
  it('extensão pelo MIME (com parâmetros) e recusa tipos estranhos', () => {
    expect(extensaoDoMime('audio/webm;codecs=opus')).toBe('webm');
    expect(extensaoDoMime('Audio/MP4')).toBe('m4a');
    expect(extensaoDoMime('audio/x-wav')).toBe('wav');
    expect(extensaoDoMime('video/mp4')).toBeNull();
    expect(extensaoDoMime(undefined)).toBeNull();
    expect(mimeDaExtensao('m4a')).toBe('audio/mp4');
  });
  it('só aceita o caminho exato do original', () => {
    expect(extensaoDoCaminhoOriginal('entrevistas/is1/e1/original.webm', 'is1', 'e1')).toBe('webm');
    expect(extensaoDoCaminhoOriginal('entrevistas/is1/e2/original.webm', 'is1', 'e1')).toBeNull();
    expect(extensaoDoCaminhoOriginal('entrevistas/is1/e1/original.exe', 'is1', 'e1')).toBeNull();
    expect(extensaoDoCaminhoOriginal('entrevistas/is1/e1/original.webm/../x', 'is1', 'e1')).toBeNull();
    expect(extensaoDoCaminhoOriginal('outra/is1/e1/original.webm', 'is1', 'e1')).toBeNull();
    expect(extensaoDoCaminhoOriginal('entrevistas/is1/e1/original.webm', '../is1', 'e1')).toBeNull();
  });
  it('data de apagamento = entrevista + dias', () => {
    expect(dataApagarApos(new Date('2026-11-08T13:00:00Z'), 90)).toBe('2027-02-06');
    expect(dataApagarApos(new Date('2026-12-31T23:00:00Z'), 1)).toBe('2027-01-01');
  });
});

describe('transcrição', () => {
  it('duração em segundos de vários formatos', () => {
    expect(duracaoEmSegundos({ seconds: '3', nanos: 500_000_000 })).toBe(3.5);
    expect(duracaoEmSegundos({ seconds: { toNumber: () => 7 }, nanos: 0 })).toBe(7);
    expect(duracaoEmSegundos('2.25s')).toBe(2.25);
    expect(duracaoEmSegundos({ nanos: 100_000_000 })).toBe(0.1);
    expect(duracaoEmSegundos(null)).toBe(0);
  });

  it('agrupa palavras consecutivas do mesmo falante e renumera rótulos', () => {
    const falas = resultadoParaFalas([
      { alternatives: [{ words: [w('Bom', 0.04, 0.3, '2'), w('dia', 0.3, 0.6, '2'), w('.', 0.6, 0.6, '2'), w('O', 1.0, 1.1, '1'), w('que', 1.1, 1.3, '1'), w('houve?', 1.3, 1.76, '1')] }] },
      { alternatives: [{ words: [w('Dor', 2.0, 2.4, '1'), w('nas', 2.4, 2.6, '2'), w('costas', 2.6, 3.04)] }] },
    ]);
    expect(falas).toEqual([
      { falante: 'F1', inicioSeg: 0, fimSeg: 0.6, texto: 'Bom dia.' },
      { falante: 'F2', inicioSeg: 1, fimSeg: 2.4, texto: 'O que houve? Dor' },
      { falante: 'F1', inicioSeg: 2.4, fimSeg: 3, texto: 'nas costas' },
    ]);
  });

  it('sem palavras usa o transcript do resultado', () => {
    expect(resultadoParaFalas([{ alternatives: [{ transcript: ' Olá ' }], resultEndOffset: { seconds: 4 } }]))
      .toEqual([{ falante: 'F1', inicioSeg: 0, fimSeg: 4, texto: 'Olá' }]);
    expect(resultadoParaFalas([])).toEqual([]);
    expect(resultadoParaFalas(undefined)).toEqual([]);
  });

  it('interpreta a resposta do BatchRecognize (inline) e erros por arquivo', () => {
    const uri = 'gs://b/entrevistas/i/e/audio.flac';
    const ok = interpretarRespostaBatch({ results: { [uri]: { inlineResult: { transcript: { results: [{ alternatives: [{ words: [w('Oi', 0, 0.5, '1')] }] }] } } } } }, uri);
    expect(ok).toEqual({ concluida: true, falas: [{ falante: 'F1', inicioSeg: 0, fimSeg: 0.5, texto: 'Oi' }] });
    expect(interpretarRespostaBatch({ results: { [uri]: { error: { code: 3, message: 'x' } } } })).toMatchObject({ concluida: true, erro: expect.stringContaining('3') });
    expect(interpretarRespostaBatch({ results: {} })).toMatchObject({ erro: expect.any(String) });
    expect(interpretarRespostaBatch({ results: { [uri]: { inlineResult: { transcript: { results: [] } } } } })).toMatchObject({ erro: expect.stringContaining('Nenhuma fala') });
  });

  it('monta o pedido do Chirp 3 com diarização', () => {
    const p = montarPedidoBatch('gs://b/a.flac', 3, { projeto: 'proj', localizacao: 'us', limitesFalantes: true });
    expect(p.recognizer).toBe('projects/proj/locations/us/recognizers/_');
    expect(p.config.model).toBe('chirp_3');
    expect(p.config.languageCodes).toEqual(['pt-BR']);
    expect(p.config.features).toMatchObject({ enableAutomaticPunctuation: true, enableWordTimeOffsets: true, diarizationConfig: { minSpeakerCount: 3, maxSpeakerCount: 3 } });
    expect(p.files).toEqual([{ uri: 'gs://b/a.flac' }]);
    expect(p.recognitionOutputConfig).toEqual({ inlineResponseConfig: {} });
    expect(montarPedidoBatch('gs://b/a.flac', 2, { limitesFalantes: false }).config.features.diarizationConfig).toEqual({});
  });
});

const participantes: ParticipanteEntrevista[] = [
  { nome: 'CC (Md) Fulano', papel: 'perito' },
  { nome: '3SG Beltrano', papel: 'inspecionado' },
];

describe('prompt', () => {
  it('formata tempos', () => {
    expect(formatarTempo(75.3)).toBe('01:15');
    expect(formatarTempo(3725)).toBe('1:02:05');
  });
  it('inclui finalidade, participantes, transcrição e regras', () => {
    const t = montarPromptAnamnese({
      finalidade: 'Atestado de Origem',
      participantes,
      transcricao: [{ falante: 'F1', inicioSeg: 0, fimSeg: 2, texto: 'O que aconteceu?' }, { falante: 'F2', inicioSeg: 2.5, fimSeg: 9, texto: 'Caí da escada no navio.' }],
    });
    expect(t).toContain('Junta Regular de Saúde');
    expect(t).toContain('FINALIDADE DA IS: Atestado de Origem');
    expect(t).toContain('CC (Md) Fulano — Perito');
    expect(t).toContain('3SG Beltrano — Inspecionado');
    expect(t).toContain('[F2 00:02–00:09 | 2.5s] Caí da escada no navio.');
    expect(t).toContain('ORDEM LÓGICA DA ANAMNESE MÉDICO-PERICIAL');
    expect(t).toContain('ORDEM CRONOLÓGICA');
    expect(t).toContain('ALEGA');
    expect(t).toContain('Não referido');
    expect(t).toMatch(/Não emita conclusão pericial/);
    expect(t).not.toContain('MAPA DE FALANTES CONFIRMADO');
  });
  it('com mapa confirmado, manda repeti-lo', () => {
    const t = montarPromptAnamnese({ finalidade: 'VDF', participantes, transcricao: [{ falante: 'F1', inicioSeg: 0, fimSeg: 1, texto: 'x' }], mapaConfirmado: { F1: 'CC (Md) Fulano' } });
    expect(t).toContain('MAPA DE FALANTES CONFIRMADO');
    expect(t).toContain('- F1 = CC (Md) Fulano');
  });
});

describe('organização', () => {
  const ctx = { finalidade: 'Atestado de Origem', participantes, rotulos: ['F1', 'F2', 'F3'] };
  it('normaliza resposta vazia', () => {
    const r = normalizarResultado(null, ctx);
    expect(r.anamnese.resumoExecutivo).toBe(NAO_REFERIDO);
    expect(r.anamnese.queixaPrincipal).toBe(NAO_REFERIDO);
    expect(r.anamnese.repercussaoFuncional).toBe(NAO_REFERIDO);
    expect(r.anamnese.alegacoesInspecionado).toEqual([]);
    expect(r.anamnese.historiaCronologica).toEqual([]);
    expect(r.anamnese.citacoes).toEqual([]);
    expect(r.anamnese.secaoFinalidade).toEqual({ titulo: 'Finalidade: Atestado de Origem', texto: NAO_REFERIDO });
    expect(r.mapaFalantes).toEqual({ F1: NAO_IDENTIFICADO, F2: NAO_IDENTIFICADO, F3: NAO_IDENTIFICADO });
  });
  it('limpa itens, fontes e mapa de falantes', () => {
    const r = normalizarResultado({
      mapaFalantes: [{ rotulo: 'F1', nome: 'cc (md) fulano' }, { rotulo: 'F2', nome: '3SG Beltrano' }, { rotulo: 'F9', nome: '3SG Beltrano' }, { rotulo: 'F3', nome: 'Inventado' }],
      anamnese: {
        resumoExecutivo: '  Resumo ', queixaPrincipal: '', alegacoesInspecionado: ['Dor lombar', '', 3],
        historiaCronologica: [{ quando: '', evento: 'Queda', fonte: 'xyz', tempoSeg: '12.34' }, { evento: '' }, { quando: 'mar/2024', evento: 'Cirurgia', fonte: 'documento_citado' }],
        medicacoes: 'não é lista',
        secaoFinalidade: { titulo: 'Nexo com o serviço', texto: 'Relata queda a bordo.' },
        citacoes: [{ falante: 'F2', texto: 'Caí da escada', tempoSeg: 5 }, { falante: 'F2', texto: '' }, { texto: 'Sem falante' }],
      },
    }, ctx);
    expect(r.anamnese.resumoExecutivo).toBe('Resumo');
    expect(r.anamnese.queixaPrincipal).toBe(NAO_REFERIDO);
    expect(r.anamnese.alegacoesInspecionado).toEqual(['Dor lombar', '3']);
    expect(r.anamnese.historiaCronologica).toEqual([
      { quando: NAO_REFERIDO, evento: 'Queda', fonte: 'outro', tempoSeg: 12.3 },
      { quando: 'mar/2024', evento: 'Cirurgia', fonte: 'documento_citado' },
    ]);
    expect(r.anamnese.medicacoes).toEqual([]);
    expect(r.anamnese.secaoFinalidade.titulo).toBe('Nexo com o serviço');
    expect(r.anamnese.citacoes).toEqual([{ falante: 'F2', texto: 'Caí da escada', tempoSeg: 5 }, { falante: NAO_IDENTIFICADO, texto: 'Sem falante', tempoSeg: 0 }]);
    expect(r.mapaFalantes).toEqual({ F1: 'CC (Md) Fulano', F2: '3SG Beltrano', F3: NAO_IDENTIFICADO });
  });
  it('esquema exige anamnese e mapaFalantes', () => {
    expect(ESQUEMA_RESPOSTA.required).toEqual(['mapaFalantes', 'anamnese']);
    expect(Object.keys(ESQUEMA_RESPOSTA.properties!.anamnese.properties!)).toHaveLength(12);
  });
});

describe('trava de organização', () => {
  it('vence após 5 min ou se ausente', () => {
    const agora = 1_000_000_000;
    expect(travaVencida(undefined, agora)).toBe(true);
    expect(travaVencida(agora - 1000, agora)).toBe(false);
    expect(travaVencida(agora - TRAVA_VENCIDA_MS - 1, agora)).toBe(true);
  });
});
