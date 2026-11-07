import { describe, it, expect } from 'vitest';
import {
  dataApagarApos, extensaoDoCaminhoOriginal, extensaoDoMime, idValido, mimeDaExtensao,
} from '../../servidor/entrevistas/audio';
import {
  BOOST_NOME, BOOST_SIGLA, SIGLAS_JUNTA, duracaoEmSegundos, frasesAdaptacao, interpretarRespostaBatch, montarPedidoBatch,
  recusouAdaptacao, resultadoParaFalas,
} from '../../servidor/entrevistas/transcricao';
import { formatarTempo, montarPromptAnamnese, roteiroMinimo } from '../../servidor/entrevistas/prompt';
import { ESQUEMA_RESPOSTA, NAO_IDENTIFICADO, NAO_REFERIDO, normalizarResultado } from '../../servidor/entrevistas/organizacao';
import { CAMPOS_DESCARTADOS_AO_REFAZER, TRAVA_VENCIDA_MS, travaVencida } from '../../servidor/entrevistas/fluxo';
import { contextoParaFinalidade, finalidadesDaIS, TRECHOS_DGPM } from '../../servidor/entrevistas/contexto';
import { GLOSSARIO_JRS } from '../../servidor/entrevistas/contexto/textos';
import * as TEXTOS from '../../servidor/entrevistas/contexto/textos';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
    expect('adaptation' in p.config).toBe(false);
  });

  it('frases de adaptação: nomes completos, palavras com 4+ letras e siglas, sem duplicatas', () => {
    const f = frasesAdaptacao([
      { nome: 'CC (Md) Mauriston Mademann', papel: 'perito' },
      { nome: '3SG João Mademann', papel: 'inspecionado' },
      { nome: '  ', papel: 'outro' },
    ]);
    const valores = f.map(x => x.value);
    expect(valores.slice(0, 4)).toEqual(['CC (Md) Mauriston Mademann', 'Mauriston', 'Mademann', '3SG João Mademann']);
    expect(valores).toContain('João');
    expect(valores).not.toContain('CC');
    expect(valores).not.toContain('Md');
    expect(valores).not.toContain('');
    expect(valores.filter(v => v.toLowerCase() === 'mademann')).toHaveLength(1);
    expect(f.find(x => x.value === 'Mauriston')?.boost).toBe(BOOST_NOME);
    for (const s of SIGLAS_JUNTA) expect(f.find(x => x.value === s)?.boost).toBe(BOOST_SIGLA);
    expect(new Set(valores.map(v => v.toLowerCase())).size).toBe(valores.length);
    expect(frasesAdaptacao(undefined).map(x => x.value)).toEqual([...SIGLAS_JUNTA]);
    // Sigla igual a palavra de nome não duplica.
    expect(frasesAdaptacao([{ nome: 'DGPM', papel: 'outro' }]).filter(x => x.value === 'DGPM')).toHaveLength(1);
  });

  it('pedido com adaptação (inlinePhraseSet) e detecção da recusa', () => {
    const frases = frasesAdaptacao([{ nome: 'Mademann', papel: 'perito' }]);
    const p = montarPedidoBatch('gs://b/a.flac', 2, { projeto: 'p', localizacao: 'us', frases });
    expect(p.config.adaptation).toEqual({ phraseSets: [{ inlinePhraseSet: { phrases: frases } }] });
    expect(recusouAdaptacao({ code: 3, message: '3 INVALID_ARGUMENT: adaptation is not supported for model chirp_3' })).toBe(true);
    expect(recusouAdaptacao({ code: 3, details: 'Phrase sets are not supported' })).toBe(true);
    expect(recusouAdaptacao({ code: 3, message: 'Invalid audio' })).toBe(false);
    expect(recusouAdaptacao({ code: 7, message: 'adaptation permission denied' })).toBe(false);
    expect(recusouAdaptacao(null)).toBe(false);
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
  it('regras de fonte, conduta do perito, finalidade sem juízo e pontos sem recomendações', () => {
    const t = montarPromptAnamnese({ finalidade: 'VDF', participantes, transcricao: [{ falante: 'F1', inicioSeg: 0, fimSeg: 1, texto: 'Dor no joelho direito.' }] });
    expect(t).toContain('FONTE RIGOROSA DO EXAME FÍSICO');
    expect(t).toContain('NUNCA são atribuídos ao exame físico');
    expect(t).toContain('"condutaPerito"');
    expect(t).toMatch(/"repercussaoFuncional": só as limitações que o INSPECIONADO relatou/);
    expect(t).toMatch(/"tratamentos": só medidas terapêuticas/);
    expect(t).toContain('PROIBIDO juízo ou conclusão');
    expect(t).toContain('Não abordado na entrevista: <item>');
    expect(t).toContain('NUNCA sugere exames, relatórios, pareceres');
    expect(t).toContain('Exemplo do que NÃO fazer: "Apresentação de relatório médico detalhado do ortopedista assistente');
    expect(t).toMatch(/mal transcrito/);
    // Roteiro da VDF + osteomuscular (joelho na transcrição).
    expect(t).toContain('- limitações nas atividades diárias e no serviço');
    expect(t).toContain('- sintomas mecânicos (bloqueio, falseio)');
  });
  it('com mapa confirmado, manda repeti-lo', () => {
    const t = montarPromptAnamnese({ finalidade: 'VDF', participantes, transcricao: [{ falante: 'F1', inicioSeg: 0, fimSeg: 1, texto: 'x' }], mapaConfirmado: { F1: 'CC (Md) Fulano' } });
    expect(t).toContain('MAPA DE FALANTES CONFIRMADO');
    expect(t).toContain('- F1 = CC (Md) Fulano');
  });
});

describe('roteiro mínimo por finalidade', () => {
  it('casa a finalidade sem acento/caixa e acrescenta o genérico', () => {
    const vdf = roteiroMinimo('Verificação de Deficiência Funcional');
    expect(vdf).toContain('atividades que deixou de fazer');
    expect(vdf).toContain('início dos sintomas');
    expect(vdf).not.toContain('testemunhas');
    expect(roteiroMinimo('vdf')).toEqual(vdf);
    expect(roteiroMinimo('AO')).toContain('testemunhas');
    expect(roteiroMinimo('Atestado de Origem')).toContain('data, hora e local');
    expect(roteiroMinimo('ACIDENTE EM SERVIÇO')).toContain('se estava em serviço');
    // "ao" minúsculo é preposição, não a sigla.
    expect(roteiroMinimo('Término de restrições ao serviço')).not.toContain('testemunhas');
    expect(roteiroMinimo('Término de restrições ao serviço')).toContain('retorno às atividades');
    expect(roteiroMinimo('Doença especificada em lei')).toContain('data do diagnóstico');
    const gen = roteiroMinimo('Outra qualquer');
    expect(gen).toContain('fatores de piora e de melhora');
    expect(gen).not.toContain('mecanismo do trauma');
    expect(new Set(roteiroMinimo('VDF joelho')).size).toBe(roteiroMinimo('VDF joelho').length);
  });
  it('osteomuscular pela finalidade ou pelo conteúdo', () => {
    expect(roteiroMinimo('Lesão de joelho')).toContain('mecanismo do trauma');
    expect(roteiroMinimo('VDF', 'rompeu o menisco')).toContain('uso de órteses ou muletas');
    expect(roteiroMinimo('VDF', 'ansiedade')).not.toContain('analgesia em uso');
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
    expect(r.anamnese.condutaPerito).toEqual([]);
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
        condutaPerito: ['Restrição de TAF por 30 dias', ' ', 'Solicitada RM de joelho'],
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
    expect(r.anamnese.condutaPerito).toEqual(['Restrição de TAF por 30 dias', 'Solicitada RM de joelho']);
    expect(r.anamnese.citacoes).toEqual([{ falante: 'F2', texto: 'Caí da escada', tempoSeg: 5 }, { falante: NAO_IDENTIFICADO, texto: 'Sem falante', tempoSeg: 0 }]);
    expect(r.mapaFalantes).toEqual({ F1: 'CC (Md) Fulano', F2: '3SG Beltrano', F3: NAO_IDENTIFICADO });
  });
  it('esquema exige anamnese e mapaFalantes', () => {
    expect(ESQUEMA_RESPOSTA.required).toEqual(['mapaFalantes', 'anamnese']);
    expect(Object.keys(ESQUEMA_RESPOSTA.properties!.anamnese.properties!)).toHaveLength(13);
    expect(ESQUEMA_RESPOSTA.properties!.anamnese.required).toContain('condutaPerito');
  });
});

describe('refazer transcrição', () => {
  it('descarta o resultado e as edições, mas não o áudio', () => {
    expect([...CAMPOS_DESCARTADOS_AO_REFAZER].sort()).toEqual(
      ['anamnese', 'anamneseEditada', 'editadoPor', 'erro', 'falantesConfirmados', 'mapaFalantes', 'operacaoSpeech', 'revisada', 'tempos', 'transcricao'],
    );
    expect(CAMPOS_DESCARTADOS_AO_REFAZER).not.toContain('audio' as never);
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

describe('adaptacaoLigada (SPEECH_ADAPTACAO)', () => {
  it('desligada por padrão; só "1" liga', async () => {
    const { adaptacaoLigada } = await import('../../servidor/entrevistas/transcricao');
    const antes = process.env.SPEECH_ADAPTACAO;
    delete process.env.SPEECH_ADAPTACAO;
    expect(adaptacaoLigada()).toBe(false);
    process.env.SPEECH_ADAPTACAO = '0';
    expect(adaptacaoLigada()).toBe(false);
    process.env.SPEECH_ADAPTACAO = 'true';
    expect(adaptacaoLigada()).toBe(false);
    process.env.SPEECH_ADAPTACAO = '1';
    expect(adaptacaoLigada()).toBe(true);
    if (antes === undefined) delete process.env.SPEECH_ADAPTACAO; else process.env.SPEECH_ADAPTACAO = antes;
  });
});

describe('contexto de conhecimento (glossário + DGPM-406 por finalidade)', () => {
  const md = (arquivo: string) => readFileSync(fileURLToPath(new URL(`../../servidor/entrevistas/contexto/${arquivo}`, import.meta.url)), 'utf8');
  it('textos.ts está igual aos .md (rode scripts/entrevistas/gerar-contexto.mjs após editar)', () => {
    expect(TEXTOS.GLOSSARIO_JRS).toBe(md('glossario-jrs.md'));
    expect(TEXTOS.TRECHO_VDF).toBe(md('dgpm-vdf.md'));
    expect(TEXTOS.TRECHO_TERMINO).toBe(md('dgpm-termino.md'));
    expect(TEXTOS.TRECHO_AO).toBe(md('dgpm-ao.md'));
    expect(TEXTOS.TRECHO_BENEFICIO).toBe(md('dgpm-beneficio.md'));
  });
  it('textos dentro do limite de tamanho', () => {
    const palavras = (t: string) => t.split(/\s+/).filter(Boolean).length;
    expect(palavras(GLOSSARIO_JRS)).toBeLessThanOrEqual(5000);
    for (const t of Object.values(TRECHOS_DGPM)) expect(palavras(t)).toBeLessThanOrEqual(2500);
  });
  it('reconhece a finalidade sem acento/caixa (AO só em maiúsculas)', () => {
    expect(finalidadesDaIS('Verificação de Deficiência Funcional')).toEqual(['vdf']);
    expect(finalidadesDaIS('vdf')).toEqual(['vdf']);
    expect(finalidadesDaIS('AO')).toEqual(['ao']);
    expect(finalidadesDaIS('ACIDENTE EM SERVIÇO')).toEqual(['ao']);
    expect(finalidadesDaIS('Término de restrições ao serviço')).toEqual(['termino']);
    expect(finalidadesDaIS('Isenção de IR — doença especificada em lei')).toEqual(['beneficio']);
    expect(finalidadesDaIS('Controle periódico')).toEqual([]);
  });
  it('glossário sempre; trecho só da finalidade', () => {
    const vdf = contextoParaFinalidade('VDF');
    expect(vdf).toContain('TAF — Teste de Aptidão Física');
    expect(vdf).toContain('TFM — Treinamento Físico Militar');
    expect(vdf).toContain('antes que o período permitido por perícia menor seja excedido');
    expect(vdf).not.toContain('Atestado de Origem (AO) é o documento destinado');
    const ao = contextoParaFinalidade('Atestado de Origem');
    expect(ao).toContain('Atestado de Origem (AO) é o documento destinado');
    expect(ao).not.toContain('antes que o período permitido por perícia menor seja excedido');
    expect(contextoParaFinalidade('Término de Incapacidade')).toContain('ao término de um período de LTS');
    expect(contextoParaFinalidade('Benefício')).toContain('perícia médica eventual que verifica o estado de saúde');
    expect(contextoParaFinalidade('Outra')).toBe(GLOSSARIO_JRS.trim());
  });
  it('o prompt traz o conhecimento de referência e mantém a proibição de concluir', () => {
    const transcricao = [{ falante: 'F1', inicioSeg: 0, fimSeg: 1, texto: 'Estou de restrição de TAF.' }];
    const vdf = montarPromptAnamnese({ finalidade: 'VDF', participantes, transcricao });
    expect(vdf).toContain('CONHECIMENTO DE REFERÊNCIA (para entender o vocabulário e o contexto; NÃO use para concluir)');
    expect(vdf).toContain('Teste de Aptidão Física');
    expect(vdf).toContain('Verificação de Deficiência Funcional É a perícia inicial, eminentemente clínico-funcional');
    expect(vdf).toMatch(/Não emita conclusão pericial/);
    const ao = montarPromptAnamnese({ finalidade: 'AO', participantes, transcricao });
    expect(ao).toContain('Atestado de Origem (AO) é o documento destinado primeiramente a registrar doença ocupacional');
    expect(ao).not.toContain('Verificação de Deficiência Funcional É a perícia inicial');
  });
});
