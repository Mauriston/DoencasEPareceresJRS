import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { preencherInspecionadoDoSinais } from '../inspecionadoSinais';
import type { CorposQuadros, OrganizacaoMilitar } from '../corposQuadros';

const cq = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/corposQuadrosMB.json'), 'utf8')) as CorposQuadros;
const oms = (JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/omsMB.json'), 'utf8')) as { oms: OrganizacaoMilitar[] }).oms;

describe('preencherInspecionadoDoSinais', () => {
  it('praça temporária recruta (exemplo do SINAIS)', () => {
    const r = preencherInspecionadoDoSinais({
      nome: 'Elivandro Vitor dos Santos', situacao: 'Ativa', omSigla: 'CPPE', posto: 'Marinheiro-Recruta',
      corpo: 'CPRM', dataNascimento: '2007-02-05', nip: '26075920', especialidade: '', quadro: '', tipo: 'Titular',
    }, cq, oms);
    expect(r).toMatchObject({ tipo: 'militar', vinculo: 'Temporário', situacao: '', posto: 'MN-RC', nome: 'ELIVANDRO VITOR DOS SANTOS', nip: '26.0759.20', dataNascimento: '2007-02-05' });
    expect(r.omSigla === 'CPPE' || r.avisos.some(a => a.includes('CPPE'))).toBe(true);
  });

  it('oficial médico temporário (CORM, RM2-Md) e de carreira (CSM, Md)', () => {
    const t = preencherInspecionadoDoSinais({ situacao: 'Ativa', posto: 'Primeiro-Tenente', corpo: 'CORM', quadro: 'Médicos' }, cq, oms);
    expect(t).toMatchObject({ vinculo: 'Temporário', posto: '1T', quadroChave: 'CORM|RM2-Md' });
    const c = preencherInspecionadoDoSinais({ situacao: 'Ativa', posto: 'Capitão-Tenente', corpo: 'CSM', quadro: 'MD' }, cq, oms);
    expect(c).toMatchObject({ vinculo: 'Carreira', posto: 'CT', quadroChave: 'CSM|Md' });
  });

  it('praça de carreira com especialidade, fuzileiro e temporária', () => {
    expect(preencherInspecionadoDoSinais({ situacao: 'Ativa', posto: 'Primeiro-Sargento', corpo: 'CPA', especialidade: 'AM' }, cq, oms))
      .toMatchObject({ vinculo: 'Carreira', posto: '1SG', espSigla: 'AM', cpfn: false });
    expect(preencherInspecionadoDoSinais({ situacao: 'Ativa', posto: 'Cabo', corpo: 'CPFN', especialidade: 'Artilharia' }, cq, oms))
      .toMatchObject({ posto: 'CB', cpfn: true, espSigla: 'AT' });
    expect(preencherInspecionadoDoSinais({ situacao: 'Ativa', posto: 'Terceiro-Sargento', corpo: 'CPRM', especialidade: 'EF' }, cq, oms))
      .toMatchObject({ vinculo: 'Temporário', posto: '3SG', espSigla: 'RM2-EF' });
  });

  it('inativos: reserva → RM1, reformado → Refº', () => {
    expect(preencherInspecionadoDoSinais({ situacao: 'Inativo - Reserva', posto: 'Suboficial', corpo: 'CPA', especialidade: 'EF' }, cq, oms))
      .toMatchObject({ vinculo: 'Inativo', situacao: 'RM1', posto: 'SO' });
    expect(preencherInspecionadoDoSinais({ situacao: 'Reformado', posto: 'Capitão de Fragata', corpo: 'CSM', quadro: 'Md' }, cq, oms))
      .toMatchObject({ vinculo: 'Inativo', situacao: 'Refº', posto: 'CF', quadroChave: 'CSM|Md' });
  });

  it('dependente/pensionista e campos ilegíveis', () => {
    expect(preencherInspecionadoDoSinais({ situacao: 'Ativa', tipo: 'Dependente' }, cq, oms).tipo).toBe('dependente');
    expect(preencherInspecionadoDoSinais({ situacao: 'Pensionista' }, cq, oms).tipo).toBe('pensionista');
    const r = preencherInspecionadoDoSinais({ situacao: 'Ativa', posto: 'Posto Estranho', corpo: 'CPA', nip: '123' }, cq, oms);
    expect(r.posto).toBe('');
    expect(r.nip).toBe('');
    expect(r.avisos.length).toBeGreaterThanOrEqual(2);
  });
});
