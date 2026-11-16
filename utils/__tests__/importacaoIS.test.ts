import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  acharCidDoSinais, acharFinalidade, agruparPrints, ampDaJunta, cidPrincipalDoSinais, codigoCidDoSinais, conclusaoDaLeitura, conclusaoValida, dadosDaLeitura, preenchimentoDosPrints, tipoDoPrint, dataDoSinais, laudoDaConclusao, proporImportacao, restricoesDaConclusao,
  statusDaConclusao, statusDosDados, type DadosISSinais,
} from '../importacaoIS';
import { militarDoPreenchimento, preencherInspecionadoDoSinais } from '../inspecionadoSinais';
import type { CorposQuadros, GrupoFinalidadeIS, OrganizacaoMilitar } from '../corposQuadros';

const grupos = (JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/finalidadesIS.json'), 'utf8')) as { grupos: GrupoFinalidadeIS[] }).grupos;
const cq = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/corposQuadrosMB.json'), 'utf8')) as CorposQuadros;
const oms = (JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/omsMB.json'), 'utf8')) as { oms: OrganizacaoMilitar[] }).oms;

// Exemplo do SINAIS (foto 1).
const foto1: DadosISSinais = {
  numInspecao: '1235690', junta: 'JRS/HNRE', finalidadeTis: 'VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL',
  dataCriacao: '2026-09-02', dataAgendamento: '2026-09-21', ds1a: '2026Z12DAEA', dataLaudo: '2026-09-21', numTis: '026.000.48930',
  nome: 'ELIVANDRO VITOR DOS SANTOS', situacao: 'Ativa', tipo: 'Titular', omSigla: 'CPPE', posto: 'Marinheiro-Recruta', corpo: 'CPRM', nip: '26075920', dataNascimento: '2007-02-05',
};
const foto2 = {
  numInspecao: '1235690', nip: '26075920', finalidade: 'VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL',
  laudos: [{ resultado: 'Apto', finalidade: 'VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL - MILITAR', laudo: 'Apto para o SAM com restrições por 90 dias.' }],
  restricoes: ['', 'Serviço Noturno', 'Carregar peso', 'Serviço Armado'],
};

describe('leituras do SINAIS', () => {
  it('junta → AMP', () => {
    expect(ampDaJunta('JRS/HNRE')).toBe('JRS');
    expect(ampDaJunta('MPI/CASSUNDÉ')).toBe('MPI');
    expect(ampDaJunta('')).toBe('');
  });
  it('datas', () => {
    expect(dataDoSinais('2026-09-21')).toBe('2026-09-21');
    expect(dataDoSinais('21/09/2026')).toBe('2026-09-21');
    expect(dataDoSinais('2026-09-21 às 09:47:34')).toBe('2026-09-21');
    expect(dataDoSinais('-')).toBe('');
  });
  it('finalidade: igual ou a mais longa que inicia o texto', () => {
    expect(acharFinalidade('VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL - MILITAR', grupos)?.finalidade).toBe('Verificação de Deficiência Funcional');
    expect(acharFinalidade('Verificação de Deficiência Funcional - SMI', grupos)?.finalidade).toBe('Verificação de Deficiência Funcional - SMI');
    expect(acharFinalidade('TÉRMINO DE RESTRIÇÕES', grupos)).toMatchObject({ finalidade: 'Término de Restrições', grupo: 'Verificações e Términos' });
    expect(acharFinalidade('qualquer coisa', grupos)).toBeNull();
  });
  it('laudo e restrições da conclusão', () => {
    expect(laudoDaConclusao(foto2)).toBe('Apto para o SAM com restrições por 90 dias.');
    expect(restricoesDaConclusao(foto2, ['SERVIÇO NOTURNO'])).toBe('SERVIÇO NOTURNO; Carregar peso; Serviço Armado');
  });
});

describe('status', () => {
  it('só a foto 1: Aberta ou Agendada (e IS já cadastrada segue statusAoAgendar)', () => {
    expect(statusDosDados('')).toBe('aberta');
    expect(statusDosDados('2026-09-21T08:00')).toBe('agendada');
    expect(statusDosDados('2026-09-22T08:00', { status: 'agendada', dataEntrevista: '2026-09-21T09:00' })).toBe('reagendada');
    expect(statusDosDados('2026-09-21T08:00', { status: 'agendada', dataEntrevista: '2026-09-21T09:00' })).toBe('agendada');
    expect(statusDosDados('2026-09-22T08:00', { status: 'votacao_pendente', dataEntrevista: '2026-09-21T09:00' })).toBe('votacao_pendente');
  });
  it('com a conclusão: Laudo, Nº do TIS e DS-1A', () => {
    expect(statusDaConclusao({ laudo: 'Apto', tis: '', ds1a: '' })).toBe('votacao_pendente');
    expect(statusDaConclusao({ laudo: 'Apto', tis: '026.000.1', ds1a: '' })).toBe('assinaturas_pendentes');
    expect(statusDaConclusao({ laudo: 'Apto', tis: '026.000.1', ds1a: 'X' })).toBe('assinaturas_pendentes');
    expect(statusDaConclusao({ laudo: 'Apto', tis: '026.000.1', ds1a: 'X', dataConclusao: '2026-11-16' })).toBe('tis_assinado');
    expect(statusDaConclusao({ laudo: 'Apto', tis: '', ds1a: '' }, 'auditoria')).toBe('auditoria');
  });
});

describe('proporImportacao', () => {
  it('só a foto 1: ignora DS-1A, Data do Laudo e Num. TIS', () => {
    const { proposta } = proporImportacao(foto1, undefined, grupos);
    expect(proposta).toMatchObject({
      numero: '1235690', nip: '26075920', amp: 'JRS', finalidade: 'Verificação de Deficiência Funcional',
      dataAbertura: '2026-09-02', dataAgendamento: '2026-09-21', temConclusao: false, laudo: '', tis: '', ds1a: '', dataLaudo: '',
    });
  });
  it('as duas fotos: laudo, restrições, TIS e DS-1A', () => {
    const { proposta } = proporImportacao(foto1, foto2, grupos);
    expect(proposta).toMatchObject({
      temConclusao: true, laudo: 'Apto para o SAM com restrições por 90 dias.', dataLaudo: '2026-09-21',
      tis: '026.000.48930', ds1a: '2026Z12DAEA', restricoes: 'Serviço Noturno; Carregar peso; Serviço Armado',
    });
  });
  it('junta MPI prevalece; fotos de IS diferentes; sem número', () => {
    expect(proporImportacao({ ...foto1, junta: 'MPI/CASSUNDÉ' }, undefined, grupos).proposta?.amp).toBe('MPI');
    expect(proporImportacao(foto1, { ...foto2, numInspecao: '1245271' }, grupos).erro).toMatch(/IS diferentes/);
    expect(proporImportacao({ ...foto1, numInspecao: '' }, undefined, grupos).erro).toMatch(/nº da IS/);
  });
  it('DS-1A sem TIS é ignorado', () => {
    const { proposta } = proporImportacao({ ...foto1, numTis: '-' }, foto2, grupos);
    expect(proposta).toMatchObject({ tis: '', ds1a: '' });
    expect(proposta!.avisos.join(' ')).toMatch(/DS-1A sem Num\. TIS/);
  });
});

describe('militarDoPreenchimento', () => {
  it('cadastro completo vira militar; incompleto ou HNRe, null', () => {
    const p = preencherInspecionadoDoSinais(foto1, cq, oms);
    const m = militarDoPreenchimento(p, cq);
    if (p.avisos.length === 0) expect(m).toMatchObject({ pgq: 'MN-RC', nip: '26.0759.20', temporario: true, inspecionado: 'MN-RC 26.0759.20 ELIVANDRO VITOR DOS SANTOS' });
    else expect(m).toBeNull();
    expect(militarDoPreenchimento({ ...p, avisos: [], omSigla: 'HNRe' }, cq)).toBeNull();
    expect(militarDoPreenchimento({ ...p, nome: '' }, cq)).toBeNull();
  });
});

describe('várias fotos, várias IS', () => {
  it('tipo da tela', () => {
    expect(tipoDoPrint({ tipo: 'is' })).toBe('is');
    expect(tipoDoPrint({ tipo: 'conclusao' })).toBe('conclusao');
    expect(tipoDoPrint({ tipo: 'outra' })).toBe('');
    expect(tipoDoPrint({ laudos: [{ laudo: 'Apto' }] })).toBe('conclusao');
    expect(tipoDoPrint({ junta: 'JRS/HNRE' })).toBe('is');
  });
  it('agrupa pelo nº da IS em qualquer ordem; repetidas e não reconhecidas à parte', () => {
    const { grupos, naoReconhecidas } = agruparPrints([
      { leitura: { tipo: 'conclusao', ...foto2 }, origem: 'a' },
      { leitura: { tipo: 'is', numInspecao: '999', nip: '11111111' }, origem: 'b' },
      { leitura: { ...foto1, tipo: 'is', tipoInspecionado: 'Titular' }, origem: 'c' },
      { leitura: { tipo: 'outra' }, origem: 'd' },
      { leitura: { tipo: 'is', numInspecao: '1235690' }, origem: 'e' },
    ]);
    expect(grupos.map(g => g.numero)).toEqual(['1235690', '999']);
    expect(grupos[0]).toMatchObject({ conclusao: { origem: 'a' }, dados: { origem: 'c' }, repetidas: ['e'] });
    expect(grupos[0].dados!.leitura.tipo).toBe('Titular');
    expect(naoReconhecidas).toEqual(['d']);
  });
  it('só a conclusão: atualiza a IS cadastrada; sem IS cadastrada, erro', () => {
    expect(proporImportacao(undefined, foto2, grupos).erro).toMatch(/não cadastrada/);
    const { proposta } = proporImportacao(undefined, foto2, grupos, [], { inspecionadoId: '26075920', finalidade: 'Verificação de Deficiência Funcional', dataAbertura: '2026-09-02' });
    expect(proposta).toMatchObject({ numero: '1235690', temDados: false, temConclusao: true, laudo: 'Apto para o SAM com restrições por 90 dias.', tis: '', ds1a: '', dataAbertura: '2026-09-02' });
    const comData = proporImportacao(undefined, { ...foto2, dataLaudo: '01/10/2026' }, grupos, [], { inspecionadoId: '26075920', finalidade: '', dataAbertura: '2026-09-02' });
    expect(comData.proposta?.dataLaudo).toBe('2026-10-01');
    expect(proporImportacao(undefined, foto2, grupos, [], { inspecionadoId: '99999999', finalidade: '', dataAbertura: '' }).erro).toMatch(/NIP/);
  });
});

describe('prints no detalhe da IS (completa só o que falta)', () => {
  const atualIS = { inspecionadoId: '26075920', finalidade: 'Verificação de Deficiência Funcional', dataAbertura: '2026-09-02' };
  const proposta = proporImportacao(foto1, foto2, grupos, ['Serviço Noturno'], atualIS).proposta!;
  const vazia = { grupoFinalidade: 'Verificações e Términos', laudo: '', dataLaudo: '', restricoes: '', tis: '', ds1a: '', cid: '' };
  it('CID do SINAIS → SUBCAT', () => {
    expect(codigoCidDoSinais('M54.5')).toBe('M545');
    expect(codigoCidDoSinais('cid f32.1 - episódio')).toBe('F321');
    expect(codigoCidDoSinais('Z00')).toBe('Z00');
    expect(codigoCidDoSinais('-')).toBe('');
  });
  it('IS vazia: completa tudo, na ordem', () => {
    expect(preenchimentoDosPrints(vazia, proposta, ['M54.5'])).toEqual({
      laudo: 'Apto para o SAM com restrições por 90 dias.', dataLaudo: '2026-09-21', cidCodigo: 'M545',
      restricoes: 'Serviço Noturno; Carregar peso; Serviço Armado', tis: '026.000.48930', ds1a: '2026Z12DAEA',
    });
  });
  it('não sobrescreve o que já está preenchido', () => {
    const cheia = { ...vazia, laudo: 'Apto com restrições por 30 dias', dataLaudo: '2026-09-20', cid: 'F32.1 Episodio depress moderado', restricoes: 'Marchas' };
    expect(preenchimentoDosPrints(cheia, proposta, ['M54.5'])).toEqual({ tis: '026.000.48930', ds1a: '2026Z12DAEA' });
    expect(preenchimentoDosPrints({ ...cheia, tis: '026.000.1' }, proposta)).toEqual({ ds1a: '2026Z12DAEA' });
  });
  it('restrições só com laudo que as menciona; CID e restrições só em Verificações e Términos', () => {
    expect(preenchimentoDosPrints({ ...vazia, laudo: 'Apto para o SAM' }, proposta).restricoes).toBeUndefined();
    const fora = preenchimentoDosPrints({ ...vazia, grupoFinalidade: 'Benefícios' }, proposta, ['M54.5']);
    expect(fora.cidCodigo).toBeUndefined();
    expect(fora.restricoes).toBeUndefined();
  });
  it('a leitura do print leva os CID para a conclusão, não para os dados', () => {
    const l = { tipo: 'conclusao', numInspecao: '1', cids: ['M54.5'], laudos: [] };
    expect(conclusaoDaLeitura(l).cids).toEqual(['M54.5']);
    expect('cids' in dadosDaLeitura(l)).toBe(false);
  });
});

describe('Data da Conclusão (prints do SINAIS)', () => {
  const atualIS = { inspecionadoId: '26075920', finalidade: 'Verificação de Deficiência Funcional', dataAbertura: '2026-09-02' };
  const vazia = { grupoFinalidade: 'Verificações e Términos', laudo: '', dataLaudo: '', restricoes: '', tis: '', ds1a: '', cid: '', dataConclusao: '' };
  const comConclusao = (dataConclusao: string, extra: Partial<DadosISSinais> = {}) =>
    proporImportacao({ ...foto1, ...extra, dataConclusao }, foto2, grupos, [], atualIS).proposta!;

  it('lida da tela da IS (AAAA-MM-DD ou DD/MM/AAAA), só a data', () => {
    expect(comConclusao('2026-09-22').dataConclusao).toBe('2026-09-22');
    expect(comConclusao('22/09/2026 às 10:15').dataConclusao).toBe('2026-09-22');
    expect(comConclusao('-').dataConclusao).toBe('');
    expect(proporImportacao(foto1, foto2, grupos, [], atualIS).proposta!.dataConclusao).toBe('');
  });
  it('no mesmo dia da Data do Laudo vale; anterior é descartada (com aviso)', () => {
    expect(comConclusao('2026-09-21').dataConclusao).toBe('2026-09-21');
    const anterior = comConclusao('2026-09-20');
    expect(anterior.dataConclusao).toBe('');
    expect(anterior.avisos.join(' ')).toMatch(/Data da Conclusão anterior/);
  });
  it('sem a tela da IS, vale a do rodapé da conclusão, conferida com a Data do Laudo já gravada', () => {
    const so2 = (dataConclusao: string, dataLaudo?: string) =>
      proporImportacao(undefined, conclusaoDaLeitura({ ...foto2, tipo: 'conclusao', dataConclusao }), grupos, [], { ...atualIS, dataLaudo }).proposta!;
    expect(so2('2026-10-02').dataConclusao).toBe('2026-10-02');
    expect(so2('2026-10-02', '2026-10-05').dataConclusao).toBe('');
  });
  it('conclusaoValida', () => {
    expect(conclusaoValida('2026-09-21', '2026-09-21T00:00')).toBe(true);
    expect(conclusaoValida('2026-09-20', '2026-09-21')).toBe(false);
    expect(conclusaoValida('2026-09-20', '')).toBe(true);
    expect(conclusaoValida('', '2026-09-21')).toBe(true);
  });
  it('preenchimento: só vazia, só com Laudo e nunca anterior à Data do laudo', () => {
    const p = comConclusao('2026-09-23');
    expect(preenchimentoDosPrints(vazia, p).dataConclusao).toBe('2026-09-23');
    expect(preenchimentoDosPrints({ ...vazia, dataConclusao: '2026-09-25' }, p).dataConclusao).toBeUndefined();
    // Laudo já gravado com Data do laudo posterior à conclusão lida: descarta.
    expect(preenchimentoDosPrints({ ...vazia, laudo: 'Apto', dataLaudo: '2026-09-24' }, p).dataConclusao).toBeUndefined();
    expect(preenchimentoDosPrints({ ...vazia, laudo: 'Apto', dataLaudo: '2026-09-23' }, p).dataConclusao).toBe('2026-09-23');
    // Sem Laudo (nem gravado nem lido): não há conclusão a datar.
    const semLaudo = proporImportacao({ ...foto1, dataConclusao: '2026-09-23' }, undefined, grupos, [], atualIS).proposta!;
    expect(preenchimentoDosPrints(vazia, semLaudo).dataConclusao).toBeUndefined();
    // Também fora de Verificações e Términos.
    expect(preenchimentoDosPrints({ ...vazia, grupoFinalidade: 'Benefícios' }, p).dataConclusao).toBe('2026-09-23');
  });
  it('a leitura do print leva a Data da Conclusão para a conclusão e para os dados', () => {
    const l = { tipo: 'conclusao', numInspecao: '1', dataConclusao: '2026-09-22', laudos: [] };
    expect(conclusaoDaLeitura(l).dataConclusao).toBe('2026-09-22');
    expect(dadosDaLeitura({ tipo: 'is', numInspecao: '1', dataConclusao: '2026-09-22' }).dataConclusao).toBe('2026-09-22');
  });
});

describe('CID dos prints do SINAIS', () => {
  const atualIS = { inspecionadoId: '26075920', finalidade: 'Verificação de Deficiência Funcional', dataAbertura: '2026-09-02' };
  const vazia = { grupoFinalidade: 'Verificações e Términos', laudo: '', dataLaudo: '', restricoes: '', tis: '', ds1a: '', cid: '' };
  it('código com ou sem ponto, minúsculas, prefixo CID-10 e descrição', () => {
    expect(codigoCidDoSinais('M545')).toBe('M545');
    expect(codigoCidDoSinais('m54.5')).toBe('M545');
    expect(codigoCidDoSinais('M54,5')).toBe('M545');
    expect(codigoCidDoSinais('M54. 5 - Dor lombar baixa')).toBe('M545');
    expect(codigoCidDoSinais('CID10 M54.5')).toBe('M545');
    expect(codigoCidDoSinais('CID-10: F32.1')).toBe('F321');
    expect(codigoCidDoSinais('I10 Hipertensão essencial')).toBe('I10');
    expect(codigoCidDoSinais('(S83.2)')).toBe('S832');
    expect(codigoCidDoSinais('G63.2*')).toBe('G632');
    expect(codigoCidDoSinais('M5455')).toBe('');
    expect(codigoCidDoSinais('')).toBe('');
  });
  it('vários CID: o principal (o 1º legível)', () => {
    expect(cidPrincipalDoSinais(['M54.5', 'M51.1'])).toBe('M545');
    expect(cidPrincipalDoSinais(['-', 'm51.1 Transt disco lombar'])).toBe('M511');
    expect(cidPrincipalDoSinais(undefined)).toBe('');
  });
  it('a proposta leva o CID principal; o preenchimento usa os cids lidos ou, sem eles, o da proposta', () => {
    const p = proporImportacao(foto1, { ...foto2, cids: ['M51.1', 'M54.5'] }, grupos, [], atualIS).proposta!;
    expect(p.cidCodigo).toBe('M511');
    expect(preenchimentoDosPrints(vazia, p).cidCodigo).toBe('M511');
    expect(preenchimentoDosPrints(vazia, p, ['F32.1']).cidCodigo).toBe('F321');
    expect(preenchimentoDosPrints({ ...vazia, cid: 'M54.5 Dor lombar baixa' }, p).cidCodigo).toBeUndefined();
    expect(proporImportacao(foto1, foto2, grupos, [], atualIS).proposta!.cidCodigo).toBe('');
  });
  it('acharCidDoSinais: SUBCAT exato ou a categoria de 3 caracteres', () => {
    const lista = [{ SUBCAT: 'M545', DESCRABREV: 'M54.5 Dor lombar baixa' }, { SUBCAT: 'I10', DESCRABREV: 'I10   Hipertensao essencial' }];
    expect(acharCidDoSinais('M54.5', lista)?.SUBCAT).toBe('M545');
    expect(acharCidDoSinais('I10.0', lista)?.SUBCAT).toBe('I10');
    expect(acharCidDoSinais('M54', lista)).toBeNull();
    expect(acharCidDoSinais('', lista)).toBeNull();
  });
});
