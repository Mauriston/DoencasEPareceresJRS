import { describe, it, expect } from 'vitest';
import {
  formatarTempo, formatarDuracao, dataDe, anamneseEfetiva, nomeDoFalante, aplicarMapaFalantes,
  filtrarTranscricao, normalizarAnamnese, textoAnamnese, tomSituacao, entrevistaEmAndamento, anamneseVazia, naoEnviada,
} from '../entrevistas';
import type { AnamneseEntrevista, FalaTranscrita } from '../../config/entrevistas';

const falas: FalaTranscrita[] = [
  { falante: 'F2', inicioSeg: 0, fimSeg: 4, texto: 'Bom dia, sente-se.' },
  { falante: 'F1', inicioSeg: 5, fimSeg: 9, texto: 'Bom dia, doutor. Sinto dor na coluna.' },
  { falante: 'F2', inicioSeg: 10, fimSeg: 12, texto: 'Desde quando?' },
  { falante: 'F10', inicioSeg: 13, fimSeg: 14, texto: 'Desde março.' },
];

const anamnese = (): AnamneseEntrevista => ({
  ...anamneseVazia(),
  resumoExecutivo: 'Lombalgia crônica.',
  queixaPrincipal: 'Dor lombar',
  alegacoesInspecionado: ['Dor ao carregar peso'],
  historiaCronologica: [{ quando: 'mar/2024', evento: 'Início da dor', fonte: 'relato_inspecionado', tempoSeg: 13 }],
  secaoFinalidade: { titulo: '', texto: 'Refere relação com o serviço.' },
  citacoes: [{ falante: 'F1', texto: 'Sinto dor na coluna', tempoSeg: 65 }],
});

describe('tempo e datas', () => {
  it('formata mm:ss e h:mm:ss', () => {
    expect(formatarTempo(0)).toBe('00:00');
    expect(formatarTempo(65.7)).toBe('01:05');
    expect(formatarTempo(3725)).toBe('1:02:05');
    expect(formatarTempo(undefined)).toBe('00:00');
    expect(formatarTempo(-3)).toBe('00:00');
  });
  it('formata a duração', () => {
    expect(formatarDuracao(45)).toBe('45 s');
    expect(formatarDuracao(23 * 60 + 10)).toBe('23 min');
    expect(formatarDuracao(65 * 60)).toBe('1 h 05 min');
  });
  it('converte Timestamp, Date e {seconds}', () => {
    const d = new Date(2026, 10, 8, 14, 5);
    expect(dataDe({ toDate: () => d })).toBe(d);
    expect(dataDe({ seconds: 10 })?.getTime()).toBe(10000);
    expect(dataDe(null)).toBeNull();
  });
});

describe('falantes', () => {
  it('usa o mapa ou "Falante n"', () => {
    expect(nomeDoFalante('F1', { F1: 'CT Fulano' })).toBe('CT Fulano');
    expect(nomeDoFalante('F3', { F1: 'CT Fulano' })).toBe('Falante 3');
    expect(nomeDoFalante('F2', { F2: '  ' })).toBe('Falante 2');
  });
  it('aplica o mapa à transcrição', () => {
    const r = aplicarMapaFalantes(falas, { F1: 'Inspecionado', F2: 'Perito' });
    expect(r.map(f => f.nome)).toEqual(['Perito', 'Inspecionado', 'Perito', 'Falante 10']);
    expect(aplicarMapaFalantes(undefined, null)).toEqual([]);
  });
});

describe('transcrição e listas', () => {
  it('busca sem acento e por falante', () => {
    const r = aplicarMapaFalantes(falas, { F1: 'Inspecionado' });
    expect(filtrarTranscricao(r, 'MARCO').length).toBe(1);
    expect(filtrarTranscricao(r, 'inspecionado').length).toBe(1);
    expect(filtrarTranscricao(r, '  ').length).toBe(4);
  });
});

describe('anamnese', () => {
  it('efetiva = editada ?? original', () => {
    const a = anamnese();
    const ed = { ...a, queixaPrincipal: 'Editada' };
    expect(anamneseEfetiva({ anamnese: a, anamneseEditada: ed })?.queixaPrincipal).toBe('Editada');
    expect(anamneseEfetiva({ anamnese: a })?.queixaPrincipal).toBe('Dor lombar');
    expect(anamneseEfetiva({})).toBeNull();
  });
  it('normaliza campos ausentes', () => {
    const n = normalizarAnamnese({ queixaPrincipal: 'x' } as Partial<AnamneseEntrevista>);
    expect(n.medicacoes).toEqual([]);
    expect(n.secaoFinalidade).toEqual({ titulo: '', texto: '' });
    expect(n.condutaPerito).toEqual([]); // doc antigo, sem o campo
  });
  it('gera o texto para copiar na ordem da anamnese, com o aviso de IA', () => {
    const t = textoAnamnese(anamnese(), { finalidade: 'Atestado de Origem', mapaFalantes: { F1: 'SG B' } });
    expect(t.indexOf('RESUMO EXECUTIVO')).toBeLessThan(t.indexOf('QUEIXA PRINCIPAL'));
    expect(t).toContain('- mar/2024 — Início da dor (Relato do inspecionado)');
    expect(t).toContain('FINALIDADE: ATESTADO DE ORIGEM');
    expect(t).toContain('- SG B (01:05): "Sinto dor na coluna"');
    expect(t).not.toContain('MEDICAÇÕES');
    expect(t).not.toContain('CONDUTA E ENCAMINHAMENTOS');
    const c = textoAnamnese({ ...anamnese(), condutaPerito: ['Restrição de TAF por 30 dias'] }, { finalidade: 'Atestado de Origem' });
    expect(c).toContain('CONDUTA E ENCAMINHAMENTOS DO PERITO\n- Restrição de TAF por 30 dias');
    expect(c.indexOf('FINALIDADE: ATESTADO DE ORIGEM')).toBeLessThan(c.indexOf('CONDUTA E ENCAMINHAMENTOS'));
    expect(t).not.toContain('Rascunho gerado por IA');
  });
});

describe('situação', () => {
  it('tom e entrevista em andamento', () => {
    expect(tomSituacao('pronta')).toBe('success');
    expect(tomSituacao('erro')).toBe('danger');
    expect(tomSituacao('transcrevendo')).toBe('attention');
    expect(entrevistaEmAndamento([{ situacao: 'pronta' }, { situacao: 'organizando' }])).toEqual({ situacao: 'organizando' });
    expect(entrevistaEmAndamento([{ situacao: 'aguardando_envio' }])).toBeNull();
  });
  it('"Não enviada" = aguardando_envio sem áudio', () => {
    expect(naoEnviada({ situacao: 'aguardando_envio' })).toBe(true);
    expect(naoEnviada({ situacao: 'aguardando_envio', audio: { caminho: 'c', mimeType: 'audio/webm', bytes: 1, duracaoSeg: 1, apagarApos: '2027-01-01' } })).toBe(false);
    expect(naoEnviada({ situacao: 'transcrevendo' })).toBe(false);
  });
});
