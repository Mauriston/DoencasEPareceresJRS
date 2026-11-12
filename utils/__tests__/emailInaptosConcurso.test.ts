// E-mail "{concurso} - Candidatos Inaptos" à EAMPE: regra de pendência e montagem (servidor/email/inaptosConcurso.ts).
import { describe, expect, it } from 'vitest';
import { inaptoPendente, concursoAceitaEmailInaptos, assuntoInaptos, dataBrCurta } from '../emailInaptosConcurso';
import { montarEmailInaptos } from '../../servidor/email/inaptosConcurso';
import { assinaturaSemSignatario } from '../../servidor/email/comum';

describe('regras', () => {
  it('pendente = INAPTO sem e-mail enviado', () => {
    expect(inaptoPendente({ status: 'INAPTO' })).toBe(true);
    expect(inaptoPendente({ status: 'INAPTO', emailInaptoEnviadoEm: '2026-11-12T10:00:00Z' })).toBe(false);
    expect(inaptoPendente({ status: 'APTO' })).toBe(false);
    expect(inaptoPendente({ status: 'INSUF DOCUMENTAL' })).toBe(false);
  });
  it('só concurso em andamento', () => {
    expect(concursoAceitaEmailInaptos('em_andamento')).toBe(true);
    expect(concursoAceitaEmailInaptos('em_breve')).toBe(false);
    expect(concursoAceitaEmailInaptos('encerrado')).toBe(false);
  });
  it('assunto e data', () => {
    expect(assuntoInaptos('CP-C-FSD-FN-TI/2027')).toBe('CP-C-FSD-FN-TI/2027 - Candidatos Inaptos');
    expect(dataBrCurta('2026-11-04')).toBe('04/11/2026');
  });
});

describe('montarEmailInaptos', () => {
  const lista = [
    { matricula: '65599-8', candidato: 'DAYVID RUAN DA SILVA OLIVEIRA', dataAgendamento: '2026-11-04' },
    { matricula: '63143-5', candidato: 'ERIVALDO ALVES DA SILVA JUNIOR', dataAgendamento: '2026-11-10' },
  ];
  it('preenche tudo, sem JavaScript, com zebra e "Sim" no Anexo T', () => {
    const r = montarEmailInaptos('CP-C-FSD-FN-TI/2027', lista);
    expect(r.assunto).toBe('CP-C-FSD-FN-TI/2027 - Candidatos Inaptos');
    expect(r.html).not.toMatch(/\{\{[#^/]?\w+\}\}/);
    expect(r.html).not.toMatch(/<script|javascript:|\son\w+=|flaticon|dfsrc|data-marker/i);
    expect(r.html).toContain('INAPTOS PARA INGRESSO NO CP-C-FSD-FN-TI/2027');
    expect(r.html).toContain('65599-8');
    expect(r.html).toContain('04/11/2026');
    expect(r.html).toContain('background-color:#f9f9f9');
    expect(r.html.match(/>Sim</g)).toHaveLength(2);
    expect(r.html).toContain('Divisão de Apoio aos Concursos da EAMPE');
  });
  it('assinatura: sem signatário não tem "Por ordem de"; com signatário tem', () => {
    expect(montarEmailInaptos('X', lista).html).not.toContain('Por ordem de');
    const com = montarEmailInaptos('X', lista, { ...assinaturaSemSignatario(), mostrar_signatario: true, signatario_nome: 'Fulano de Tal', signatario_posto: 'Suboficial-RM1-EF', signatario_cargo: 'Secretário' });
    expect(com.html).toContain('Por ordem de:');
    expect(com.html).toContain('Fulano de Tal');
    expect(com.texto).toContain('Por ordem de:\nFulano de Tal');
  });
});
