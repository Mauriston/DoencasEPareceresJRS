import { describe, expect, it } from 'vitest';
import formas from '../../data/formasConclusaoIS.json';
import { capitulosDaFonte, capitulosDaRegra } from '../../servidor/assessor/referencias';
import { ADAPTACAO_APP, MAX_MENSAGENS, conversaComDados, montarSistema, normalizarConversa } from '../../servidor/assessor/prompt';
import { acharCid, extrairJson, limparBloco, normalizarResposta, subcatDoCodigo, type ItemCid } from '../../servidor/assessor/resposta';
import { montarTextoContexto, resumoRegra, type ContextoAssessor } from '../../servidor/assessor/contexto';
import type { FormasConclusao } from '../validacaoLaudo';

const F = formas as unknown as FormasConclusao;
const TABELA: ItemCid[] = [
  { SUBCAT: 'F312', DESCRICAO: 'Transtorno afetivo bipolar, episódio atual maníaco com sintomas psicóticos', DESCRABREV: 'F31.2 Transt afet bipolar episod atual maniaco c/sint psicot' },
  { SUBCAT: 'F310', DESCRICAO: 'Transtorno afetivo bipolar, episódio atual hipomaníaco', DESCRABREV: 'F31.0 Transt afet bipolar episod atual hipomaniaco' },
  { SUBCAT: 'Z102', DESCRICAO: 'Exame geral de rotina de pessoas das forças armadas', DESCRABREV: 'Z10.2 Exame geral de rotina pessoas forcas armadas' },
];

describe('referências: capítulos da DGPM-406 por finalidade', () => {
  it('lê os capítulos citados na fonte da regra', () => {
    expect(capitulosDaFonte('6.1, 6.2.1, 6.2.4 e 6.3')).toEqual([6]);
    expect(capitulosDaFonte('11.8')).toEqual([11]);
    expect(capitulosDaFonte('4.1.5; 13.2')).toEqual([4, 13]);
    expect(capitulosDaFonte('')).toEqual([]);
  });
  it('soma o Cap. 11 do temporário e o Cap. 10 do servidor civil; sem regra, o capítulo do grupo', () => {
    expect(capitulosDaRegra({ fonte: '11.8', grupoFinalidade: 'Verificações e Términos', vinculo: 'Temporário', tipoServico: 'SMV', servidorCivil: false })).toEqual([11]);
    expect(capitulosDaRegra({ fonte: '6.1', grupoFinalidade: 'Verificações e Términos', vinculo: 'Temporário', tipoServico: 'SMI', servidorCivil: false })).toEqual([6, 11]);
    expect(capitulosDaRegra({ fonte: '', grupoFinalidade: 'Benefícios', vinculo: 'Inativo', tipoServico: 'outro', servidorCivil: false })).toEqual([9]);
    expect(capitulosDaRegra({ fonte: '', grupoFinalidade: 'Controle Periódico', vinculo: 'Carreira', tipoServico: 'carreira', servidorCivil: true })).toEqual([4, 10]);
  });
});

describe('regra de laudo da finalidade', () => {
  it('VDF de temporário no SMV traz a regra 11.8 e os modelos permitidos', () => {
    const r = resumoRegra(F, 'Verificação de Deficiência Funcional', 'Temporário', 'SMV');
    expect(r?.chave).toBe('VDF_SMV');
    expect(r?.fonte).toBe('11.8');
    expect(r?.laudos.map(l => l.id)).toContain('SMV_INCAP_TEMP');
    expect(r?.laudos.find(l => l.id === 'SMV_INCAP_TEMP')?.modelo).toMatch(/Incapaz Temporariamente para o SMV/);
  });
  it('finalidade fora do catálogo: sem regra', () => {
    expect(resumoRegra(F, 'Finalidade inexistente', 'Carreira', 'carreira')).toBeNull();
  });
});

describe('conversa', () => {
  it('limpa papéis, corta o histórico e começa pelo usuário', () => {
    const muitas = Array.from({ length: MAX_MENSAGENS + 5 }, (_, i) => ({ papel: i % 2 ? 'assessor' : 'usuario', texto: `m${i}` }));
    const c = normalizarConversa(muitas);
    expect(c.length).toBeLessThanOrEqual(MAX_MENSAGENS);
    expect(c[0].papel).toBe('usuario');
    expect(normalizarConversa([{ papel: 'x', texto: ' oi ' }, { papel: 'usuario', texto: '' }])).toEqual([{ papel: 'usuario', texto: 'oi' }]);
    expect(normalizarConversa('lixo')).toEqual([]);
  });
  it('os dados do app vão só na primeira mensagem, entre marcas', () => {
    const c = conversaComDados([{ papel: 'usuario', texto: 'Redija a IS 1.' }, { papel: 'assessor', texto: 'ok' }, { papel: 'usuario', texto: 'e o CID?' }], 'DADOS');
    expect(c[0].texto).toMatch(/^<<DADOS DO APP>>\nDADOS\n<<FIM DOS DADOS DO APP>>\n\nRedija a IS 1\.$/);
    expect(c[2].texto).toBe('e o CID?');
  });
  it('o sistema junta a adaptação, a skill e as referências', () => {
    const s = montarSistema({ skill: 'SKILL', apoio: [{ titulo: 'Cap. 11', texto: 'TEXTO 11' }] });
    expect(s.startsWith(ADAPTACAO_APP)).toBe(true);
    expect(s).toContain('SKILL');
    expect(s).toContain('# REFERÊNCIA: Cap. 11\n\nTEXTO 11');
  });
});

describe('resposta do modelo', () => {
  it('extrai o JSON mesmo com cercas ou texto em volta', () => {
    expect(extrairJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extrairJson('Segue: {"a":2} fim')).toEqual({ a: 2 });
    expect(extrairJson('nada')).toBeNull();
  });
  it('limpa cercas e rótulo repetido dos blocos', () => {
    expect(limparBloco('```txt\nCONCLUSÃO\n- item;\n```', ['CONCLUSÃO'])).toBe('- item;');
    expect(limparBloco('**ENTREVISTA**:\nTexto', ['ENTREVISTA'])).toBe('Texto');
  });
  it('confere o CID na tabela do app', () => {
    expect(subcatDoCodigo('F31.2')).toBe('F312');
    expect(subcatDoCodigo('z10.2 Exame')).toBe('Z102');
    expect(acharCid(TABELA, 'F31')?.SUBCAT).toBe('F312');
    expect(acharCid(TABELA, 'X99.9')).toBeNull();
  });
  it('normaliza laudos, CID e avisos', () => {
    const r = normalizarResposta({
      mensagem: 'ok', entrevista: 'E', exameClinico: 'EX', conclusao: 'C',
      laudos: [{ finalidade: 'outra', laudo: '"Incapaz Temporariamente para o SMV, necessitando de 60 dias de LTS"' }],
      cid: { codigo: 'F31.2', descricao: '' },
    }, TABELA, ['Verificação de Deficiência Funcional']);
    expect(r.laudos).toEqual([{ finalidade: 'Verificação de Deficiência Funcional', laudo: 'Incapaz Temporariamente para o SMV, necessitando de 60 dias de LTS' }]);
    expect(r.cid?.descrAbrev).toMatch(/^F31\.2/);
    expect(r.avisos).toEqual([]);
    const semCid = normalizarResposta({ mensagem: '', laudos: [], cid: { codigo: 'X99.9' } }, TABELA, []);
    expect(semCid.cid).toBeNull();
    expect(semCid.avisos[0]).toMatch(/X99\.9/);
    expect(normalizarResposta(null, TABELA, []).mensagem).toMatch(/Não consegui/);
  });
});

describe('texto do contexto da IS', () => {
  const ctx: ContextoAssessor = {
    isNumero: 1254539, finalidades: ['Verificação de Deficiência Funcional'], grupoFinalidade: 'Verificações e Términos', amp: 'JRS',
    status: 'votacao_pendente', dataAbertura: '2026-11-10', dataEntrevista: '2026-11-11T10:50', peritoNome: 'CT X', observacoes: 'Internado.',
    laudo: '', restricoes: '', cid: '', redacao: { entrevista: '', exameClinico: '', conclusao: '' },
    inspecionado: { pgq: 'CB-RM2-EF', om: 'CPPB', sexo: 'Masculino', idade: 24, vinculo: 'Temporário', tipoServico: 'SMV', tipo: 'militar', servidorCivil: false },
    derivado: { vinculo: 'Temporário', tipoServico: 'SMV', historicoDisponivel: false, ltsAnterior: null, ltsAnteriorTermino: null, apresentadoNoPrazo: null, ltsIninterruptaDias: null, agregado: null, tempoAgregacaoDias: 0, restricoesAcumuladasMeses: null, ao: 'sem_registro' },
    regras: [resumoRegra(F, 'Verificação de Deficiência Funcional', 'Temporário', 'SMV')!],
    documentos: [{ arquivo: 'Documento 1', itens: [{ tipo: 'laudo_medico', titulo: 'Relatório', data: '2026-11-06', emissor: 'Dra. Y', texto: 'Internação psiquiátrica.' }] }],
    entrevistas: [], historico: [],
  };
  it('traz a IS, o inspecionado sem identificação, as regras e os documentos', () => {
    const t = montarTextoContexto(ctx, '2026-11-21');
    expect(t).toContain('Número: 1254539');
    expect(t).toContain('Idade: 24 anos');
    expect(t).toContain('Posto/graduação e quadro (sigla): CB-RM2-EF');
    expect(t).toContain('regra VDF_SMV (DGPM-406, 11.8)');
    expect(t).toContain('Internação psiquiátrica.');
    expect(t).toContain('Histórico de outras IS do inspecionado\nNenhuma.');
    expect(t).not.toMatch(/NIP|CPF/);
  });
});
