import { describe, it, expect } from 'vitest';
import {
  acharCid, camposDoCid, exigeCid, laudoMencionaRestricoes, mostraCampoRestricoesEdicao, preenchimentoDoSinais, type EstadoEdicaoIS,
} from '../edicaoIS';
import { contarISPorDia } from '../agendaIS';
import { prefixoAnoTis } from '../inspecoes';

const VT = 'Verificações e Términos';
const CIDS = [
  { SUBCAT: 'M545', DESCRICAO: 'Dor lombar baixa', DESCRABREV: 'M54.5 Dor lombar baixa' },
  { SUBCAT: 'F320', DESCRICAO: 'Episódio depressivo leve', DESCRABREV: 'F32.0 Episodio depress leve' },
];

describe('Restrições na edição', () => {
  it('detecta restrição/restrições sem diferença de maiúsculas e acentos', () => {
    expect(laudoMencionaRestricoes('Apto para o SAM com restrições por 30 dias')).toBe(true);
    expect(laudoMencionaRestricoes('APTO COM RESTRICAO')).toBe(true);
    expect(laudoMencionaRestricoes('apto com Restrição temporária')).toBe(true);
    expect(laudoMencionaRestricoes('Apto para o SAM')).toBe(false);
    expect(laudoMencionaRestricoes('')).toBe(false);
  });
  it('só com Verificações e Términos E laudo com restrição', () => {
    expect(mostraCampoRestricoesEdicao({ grupoFinalidade: VT, laudo: 'Apto para o SAM com restrições por 30 dias' })).toBe(true);
    expect(mostraCampoRestricoesEdicao({ grupoFinalidade: VT, laudo: 'Apto para o SAM' })).toBe(false);
    expect(mostraCampoRestricoesEdicao({ grupoFinalidade: 'Benefícios', laudo: 'Apto com restrições' })).toBe(false);
  });
});

describe('CID', () => {
  it('obrigatório só em Verificações e Términos', () => {
    expect(exigeCid(VT)).toBe(true);
    expect(exigeCid('Benefícios')).toBe(false);
    expect(exigeCid(undefined)).toBe(false);
  });
  it('acha pelo código com ou sem ponto e grava DESCRABREV + SUBCAT', () => {
    expect(acharCid('M54.5', CIDS)?.SUBCAT).toBe('M545');
    expect(acharCid('f32', CIDS)?.SUBCAT).toBe('F320');
    expect(acharCid('Z99', CIDS)).toBeNull();
    expect(camposDoCid(CIDS[0])).toEqual({ cid: 'M54.5 Dor lombar baixa', cidCodigo: 'M545' });
    expect(camposDoCid(null)).toEqual({ cid: '', cidCodigo: '' });
  });
});

describe('preenchimentoDoSinais', () => {
  const tis = `${prefixoAnoTis()}.000.48930`;
  const base: EstadoEdicaoIS = {
    status: 'agendada', dataEntrevista: '2026-11-10T08:00', finalidade: 'Término de Incapacidade', grupoFinalidade: VT,
    dataLaudo: '', laudo: '', restricoes: '', tis: '', ds1a: '', observacoes: '', cid: '', cidCodigo: '',
  };
  const conclusao = { tipo: 'conclusao', numInspecao: '123', laudos: [{ laudo: 'Apto para o SAM com restrições por 30 dias' }], restricoes: ['Esforço físico'], dataLaudo: '2026-11-12', cids: ['M54.5'] };
  const telaIs = { tipo: 'is', numInspecao: '123', junta: 'JRS/HNRE', numTis: tis, ds1a: 'AB12' };

  it('preenche só os campos vazios, na ordem do fluxo', () => {
    const r = preenchimentoDoSinais(base, 123, [conclusao, telaIs], { cids: CIDS, hoje: '2026-11-20' });
    expect(r.patch).toMatchObject({
      laudo: 'Apto para o SAM com restrições por 30 dias', dataLaudo: '2026-11-12', restricoes: 'Esforço físico',
      cid: 'M54.5 Dor lombar baixa', cidCodigo: 'M545', tis, ds1a: 'AB12', status: 'tis_assinado',
    });
    expect(r.preenchidos).toEqual(['Laudo', 'Restrições', 'CID', 'Nº do TIS', 'DS-1a']);
  });

  it('não sobrescreve o que já está preenchido', () => {
    const r = preenchimentoDoSinais({ ...base, laudo: 'Apto', dataLaudo: '2026-11-11', cid: 'F32.0 Episodio depress leve', cidCodigo: 'F320' }, 123, [conclusao], { cids: CIDS });
    expect(r.patch.laudo).toBeUndefined();
    expect(r.patch.dataLaudo).toBeUndefined();
    expect(r.patch.cid).toBeUndefined();
    expect(r.patch.restricoes).toBe('Esforço físico');
  });

  it('sem CID (obrigatório), não preenche Nº do TIS nem DS-1a', () => {
    const r = preenchimentoDoSinais(base, 123, [{ ...conclusao, cids: [] }, telaIs], { cids: CIDS });
    expect(r.patch.tis).toBeUndefined();
    expect(r.patch.ds1a).toBeUndefined();
    expect(r.avisos.some(a => /CID/.test(a))).toBe(true);
  });

  it('ignora prints de outra IS e imagens não reconhecidas', () => {
    const r = preenchimentoDoSinais(base, 123, [{ ...conclusao, numInspecao: '999' }, {}], { cids: CIDS });
    expect(r.patch).toEqual({});
    expect(r.avisos.length).toBe(2);
  });
});

describe('contarISPorDia', () => {
  it('conta por dia, sem canceladas, por AMP e sem a própria IS', () => {
    const lista = [
      { id: '1', dataEntrevista: '2026-11-20T08:00', status: 'agendada', amp: 'JRS' },
      { id: '2', dataEntrevista: '2026-11-20T09:00', status: 'agendada', amp: 'JRS' },
      { id: '3', dataEntrevista: '2026-11-20T10:00', status: 'cancelada', amp: 'JRS' },
      { id: '4', dataEntrevista: '2026-11-20T10:00', status: 'agendada', amp: 'MPI' },
      { id: '5', dataEntrevista: '', status: 'aberta', amp: 'JRS' },
    ];
    expect(contarISPorDia(lista).get('2026-11-20')).toBe(3);
    expect(contarISPorDia(lista, { amp: 'JRS' }).get('2026-11-20')).toBe(2);
    expect(contarISPorDia(lista, { amp: 'JRS', ignorarId: '1' }).get('2026-11-20')).toBe(1);
  });
});
