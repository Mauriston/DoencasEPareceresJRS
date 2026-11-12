import { describe, it, expect } from 'vitest';
import { interpretarCsvInspecionados, MODELO_CSV_INSPECIONADOS, COLUNAS_CSV_INSPECIONADOS } from '../importarInspecionados';

const postos = { GR: { nome: 'Grumete', categoria: 'Praça', ordem: 30 }, CT: { nome: 'Capitão-Tenente', categoria: 'Oficial', ordem: 5 } } as any;

describe('interpretarCsvInspecionados', () => {
  it('lê o formato da planilha (ponto e vírgula, BOM, acentos) e monta o cadastro', () => {
    const csv = '﻿nip;vinculo;posto;nomeCompleto;om;nasc\n26.0045.42;Carreira;GR;Adrielly do Nascimento Medeiros;EAMPE;02/12/2006\n08.1371.88;Temporário;GR;ÁGATA ADRIENNY;EAMPE;29/04/2008\n';
    const r = interpretarCsvInspecionados(csv, { existentes: new Set(), postos, omsConhecidas: new Set(['EAMPE']) });
    expect(r.totais).toEqual({ novo: 2, atualizar: 0, existente: 0, duplicado: 0, erro: 0 });
    expect(r.novos[0]).toMatchObject({
      nip: '26.0045.42', pgq: 'GR', om: 'EAMPE', nome: 'ADRIELLY DO NASCIMENTO MEDEIROS', temporario: false, ativo: true,
      dataNascimento: '2006-12-02', inspecionado: 'GR 26.0045.42 ADRIELLY DO NASCIMENTO MEDEIROS',
    });
    expect(r.novos[1].temporario).toBe(true);
    expect(r.linhas.every(l => l.avisos.length === 0)).toBe(true);
  });

  it('separa existentes, repetidos e erros; repõe zero à esquerda do NIP', () => {
    const csv = 'NIP,Vínculo,Posto,Nome Completo,OM,Nasc\n26004542,Carreira,GR,A,EAMPE,\n26004542,Carreira,GR,A,EAMPE,\n11111111,Carreira,GR,B,EAMPE,\n123,Carreira,GR,C,EAMPE,\n22222222,Outro,GR,D,EAMPE,31/02/2000\n8137188,Carreira,XX,E,ZZZ,\n';
    const r = interpretarCsvInspecionados(csv, { existentes: new Set(['11111111']), postos, omsConhecidas: new Set(['EAMPE']) });
    expect(r.linhas.map(l => l.situacao)).toEqual(['novo', 'duplicado', 'existente', 'erro', 'erro', 'novo']);
    expect(r.linhas[4].erros).toHaveLength(2);
    expect(r.novos[1].nip).toBe('08.1371.88');
    expect(r.linhas[5].avisos).toHaveLength(3);
  });

  it('recusa cabeçalho sem colunas obrigatórias', () => {
    expect(() => interpretarCsvInspecionados('nip;nome\n1;2', { existentes: new Set() })).toThrow(/vinculo/);
  });

  const servicosHnre = [{ servico_id: 'HNRe-02.2', servico: 'JRS', servico_label: 'JRS (HNRe-02.2)' }];

  it('o modelo traz todas as colunas do cadastro e é lido sem erro', () => {
    const cab = MODELO_CSV_INSPECIONADOS.split('\n')[0].split(';');
    expect(cab).toEqual([...COLUNAS_CSV_INSPECIONADOS]);
    expect(cab).toEqual(expect.arrayContaining(['nasc', 'email', 'celular', 'servicoHnre', 'nomeGuerra', 'especialidade', 'rqe', 'crm', 'emailPessoal', 'cpf', 'identidadeMilitar']));
    const r = interpretarCsvInspecionados(MODELO_CSV_INSPECIONADOS, { existentes: new Set(), servicosHnre });
    expect(r.totais.erro).toBe(0);
    expect(r.novos[1]).toMatchObject({
      om: 'HNRe', pgq: 'CT (Md)', email: 'beltrano.tal@marinha.mil.br', celular: '81988880000', dataNascimento: '1988-03-15',
      servico_label: 'JRS (HNRe-02.2)', nomeGuerra: 'CT BELTRANO', especialidade: 'Ortopedia e Traumatologia',
      rqe: '12345', crm: '23456', emailPessoal: 'beltrano@email.com', cpf: '52998224725', identidadeMilitar: '1234567',
    });
    expect(r.novos[0].servico_label).toBeUndefined();
  });

  it('serviço por código, situação RM1/Refº e colunas fora do HNRe ignoradas com aviso', () => {
    const csv = [
      'nip;vinculo;posto;nomeCompleto;om;servicoHnre;nomeGuerra;situacao',
      '11111111;Carreira;CT (Md);A;HNRe;HNRe-02.2;;',
      '22222222;Carreira;GR;B;EAMPE;JRS (HNRe-02.2);GR B;',
      '33333333;Inativo;CT (RM1-Md);C;HNRe;;;',
      '44444444;Inativo;CT (Md);D;HNRe;;;',
      '55555555;Carreira;CT (Md);E;HNRe;Inexistente;;',
    ].join('\n');
    const r = interpretarCsvInspecionados(csv, { existentes: new Set(), servicosHnre });
    expect(r.linhas.map(l => l.situacao)).toEqual(['novo', 'novo', 'novo', 'erro', 'erro']);
    expect(r.novos[0].servico_label).toBe('JRS (HNRe-02.2)');
    expect(r.linhas[1].avisos).toHaveLength(2);
    expect(r.novos[1].nomeGuerra).toBeUndefined();
    expect(r.novos[2]).toMatchObject({ rm1: true, refo: false });
  });

  it('valida e-mail, celular e CPF', () => {
    const csv = 'nip;vinculo;posto;nomeCompleto;om;email;celular;cpf\n11111111;Carreira;CT (Md);A;HNRe;x@;123;111.111.111-11\n';
    const r = interpretarCsvInspecionados(csv, { existentes: new Set() });
    expect(r.linhas[0].erros).toHaveLength(3);
  });

  it('já cadastrado: completa só os campos vazios no banco; sem nada novo, ignora', () => {
    const csv = [
      'nip;vinculo;posto;nomeCompleto;om;nasc;email;celular',
      '11111111;Carreira;GR;OUTRO NOME;EAMPE;02/12/2006;novo@marinha.mil.br;(81) 99999-0000',
      '22222222;Carreira;GR;B;EAMPE;;;',
    ].join('\n');
    const existentes = new Map([
      ['11111111', { nome: 'A', email: 'antigo@marinha.mil.br', celular: '' }],
      ['22222222', { nome: 'B' }],
    ]);
    const r = interpretarCsvInspecionados(csv, { existentes });
    expect(r.linhas.map(l => l.situacao)).toEqual(['atualizar', 'existente']);
    expect(r.atualizacoes).toEqual([{ id: '11111111', patch: { dataNascimento: '2006-12-02', celular: '81999990000' } }]);
    expect(r.novos).toHaveLength(0);
    expect(r.totais.atualizar).toBe(1);
  });
});
