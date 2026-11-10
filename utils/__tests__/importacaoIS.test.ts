import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  acharFinalidade, ampDaJunta, dataDoSinais, laudoDaConclusao, proporImportacao, restricoesDaConclusao,
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
    expect(statusDaConclusao({ laudo: 'Apto', tis: '026.000.1', ds1a: 'X' })).toBe('tis_assinado');
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
    expect(proporImportacao({ ...foto1, numInspecao: '' }, undefined, grupos).erro).toMatch(/Num\. Inspeção/);
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
