// Página Férias (utils/afastamentos.ts), casamento do nome lido pela IA e regra do e-mail de resultado.
import { describe, expect, it } from 'vitest';
import {
  dataFimDe, statusEfetivo, statusAoGravar, grupoDoPerfil, geraBloqueioNaAgenda, podeVerFerias, tituloEventoAfastamento,
  janelaDeMeses, posicaoNaJanela, diasEntre, janelaCentrada,
} from '../afastamentos';
import { casarUsuario } from '../../components/ferias/AfastamentoForm';
import { resultadoPendente, elegivelResultado } from '../emailResultadoIS';
import { pendenteNac } from '../emailNac';

describe('datas e status', () => {
  it('data fim = início + duração − 1', () => {
    expect(dataFimDe('2027-01-05', 15)).toBe('2027-01-19');
    expect(dataFimDe('2026-12-25', 10)).toBe('2027-01-03');
    expect(dataFimDe('2027-01-05', 0)).toBe('');
    expect(dataFimDe('', 10)).toBe('');
  });
  it('status automático: Gozada, Em gozo ou o escolhido', () => {
    const a = { dataInicio: '2027-01-05', dataFim: '2027-01-19' };
    expect(statusEfetivo({ ...a, status: 'confirmada' }, '2026-11-12')).toBe('confirmada');
    expect(statusEfetivo({ ...a, status: 'programada' }, '2026-11-12')).toBe('programada');
    expect(statusEfetivo({ ...a, status: 'programada' }, '2027-01-05')).toBe('em_gozo');
    expect(statusEfetivo({ ...a, status: 'programada' }, '2027-01-19')).toBe('em_gozo');
    expect(statusEfetivo({ ...a, status: 'confirmada' }, '2027-01-20')).toBe('gozada');
  });
  it('período passado já nasce Gozada', () => {
    expect(statusAoGravar({ dataInicio: '2026-01-05', dataFim: '2026-01-19', status: 'programada' }, '2026-11-12')).toBe('gozada');
  });
  it('dias entre datas', () => { expect(diasEntre('2026-12-31', '2027-01-02')).toBe(2); });
});

describe('perfis e agenda', () => {
  it('grupos JRS / MPI / Secretaria', () => {
    expect(grupoDoPerfil('admin')).toBe('jrs');
    expect(grupoDoPerfil('user_medicos')).toBe('jrs');
    expect(grupoDoPerfil('user_medicos_mpi')).toBe('mpi');
    expect(grupoDoPerfil('user_secretaria')).toBe('secretaria');
  });
  it('médicos bloqueiam a agenda; Secretaria não', () => {
    expect(geraBloqueioNaAgenda('admin')).toBe(true);
    expect(geraBloqueioNaAgenda('user_medicos_mpi')).toBe(true);
    expect(geraBloqueioNaAgenda('user_secretaria')).toBe(false);
  });
  it('página só para os usuários da JRS', () => {
    expect(['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'].every(podeVerFerias)).toBe(true);
    expect(podeVerFerias('user_medicos_geral')).toBe(false);
  });
  it('título do evento no Google Agenda', () => {
    expect(tituloEventoAfastamento('CT MAURISTON', 'ferias', '2026')).toBe('CT MAURISTON - FÉRIAS 2026');
    expect(tituloEventoAfastamento('1SG FULANO', 'lic_adm', undefined, 'Núpcias')).toBe('1SG FULANO - LIC ADM (Núpcias)');
  });
});

describe('timeline', () => {
  const j = janelaDeMeses('2027-01-01', '2027-12-31');
  it('12 meses no ano', () => {
    expect(j.meses).toHaveLength(12);
    expect(j.inicio).toBe('2027-01-01');
    expect(j.fim).toBe('2027-12-31');
    expect(j.meses[1].dias).toBe(28);
  });
  it('posição da barra cortada nas bordas', () => {
    expect(posicaoNaJanela(j, '2027-01-01', '2027-12-31')).toEqual({ esquerda: 0, largura: 100 });
    expect(posicaoNaJanela(j, '2026-12-20', '2027-01-10')!.esquerda).toBe(0);
    expect(posicaoNaJanela(j, '2026-01-01', '2026-02-01')).toBeNull();
  });
});

describe('timeline centrada em hoje', () => {
  it('quadrimestral: 2 meses antes e 2 depois, hoje no meio', () => {
    const j = janelaCentrada('2026-11-12', 2);
    expect(j.inicio).toBe('2026-09-12');
    expect(j.fim).toBe('2027-01-12');
    expect(j.meses.map(m => m.rotulo)).toEqual(['SET/26', 'OUT/26', 'NOV/26', 'DEZ/26', 'JAN/27']);
    expect(j.meses[0].dias).toBe(19);
    expect(j.meses[4].dias).toBe(12);
    expect(j.meses.reduce((s, m) => s + m.dias, 0)).toBe(diasEntre(j.inicio, j.fim) + 1);
    expect(posicaoNaJanela(j, '2026-11-12', '2026-11-12')!.esquerda).toBeCloseTo(50, 0);
  });
  it('anual: 6 meses de cada lado; fim de mês ajustado', () => {
    const j = janelaCentrada('2026-08-31', 6);
    expect(j.inicio).toBe('2026-02-28');
    expect(j.fim).toBe('2027-02-28');
  });
});

describe('IA: casar o nome lido com o usuário', () => {
  const usuarios = [
    { id: 'a', usuario: 'CT MAURISTON', nome: 'Mauriston Renan Martins Silva' },
    { id: 'b', usuario: 'CT JÚLIO CÉSAR', nome: 'Júlio César Xavier Filho' },
  ];
  it('escolhe quem tem mais palavras em comum (≥ 2)', () => {
    expect(casarUsuario('MAURISTON RENAN MARTINS SILVA', usuarios)).toBe('a');
    expect(casarUsuario('JULIO CESAR XAVIER FILHO', usuarios)).toBe('b');
    expect(casarUsuario('FULANO DE TAL', usuarios)).toBeNull();
  });
});

describe('Inspeções: qualificação dos e-mails', () => {
  it('resultado: situação Finalizada, Verificações e Términos ou Benefícios, com laudo, sem envio', () => {
    const base = { situacao: 'finalizada', status: 'tis_assinado', grupoFinalidade: 'Benefícios', laudo: 'Apto' };
    expect(resultadoPendente(base)).toBe(true);
    expect(resultadoPendente({ ...base, grupoFinalidade: 'Verificações e Términos' })).toBe(true);
    expect(resultadoPendente({ ...base, grupoFinalidade: 'Ingresso' })).toBe(false);
    expect(resultadoPendente({ ...base, situacao: 'andamento', status: 'assinaturas_pendentes' })).toBe(false);
    expect(resultadoPendente({ ...base, status: 'cancelada' })).toBe(false);
    expect(resultadoPendente({ ...base, emailResultadoPara: 'x@y.com' })).toBe(false);
    expect(elegivelResultado({ ...base, laudo: '' })).toBe(true);
  });
  it('NAC: só situação Finalizada (não cancelada) de Verificações e Términos', () => {
    expect(pendenteNac({ situacao: 'finalizada', status: 'tis_assinado', grupoFinalidade: 'Verificações e Términos' })).toBe(true);
    expect(pendenteNac({ situacao: 'finalizada', status: 'cancelada', grupoFinalidade: 'Verificações e Términos' })).toBe(false);
    expect(pendenteNac({ situacao: 'andamento', status: 'votacao_pendente', grupoFinalidade: 'Verificações e Términos' })).toBe(false);
  });
});
