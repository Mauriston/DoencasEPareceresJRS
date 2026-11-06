import { describe, it, expect } from 'vitest';
import { interpretarCsvInspecionados } from '../importarInspecionados';

const postos = { GR: { nome: 'Grumete', categoria: 'Praça', ordem: 30 }, CT: { nome: 'Capitão-Tenente', categoria: 'Oficial', ordem: 5 } } as any;

describe('interpretarCsvInspecionados', () => {
  it('lê o formato da planilha (ponto e vírgula, BOM, acentos) e monta o cadastro', () => {
    const csv = '﻿nip;vinculo;posto;nomeCompleto;om;nasc\n26.0045.42;Carreira;GR;Adrielly do Nascimento Medeiros;EAMPE;02/12/2006\n08.1371.88;Temporário;GR;ÁGATA ADRIENNY;EAMPE;29/04/2008\n';
    const r = interpretarCsvInspecionados(csv, { existentes: new Set(), postos, omsConhecidas: new Set(['EAMPE']) });
    expect(r.totais).toEqual({ novo: 2, existente: 0, duplicado: 0, erro: 0 });
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
});
