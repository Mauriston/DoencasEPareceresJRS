// E-mails das guias de exames (servidor/email/guiasIS.ts; regras em utils/emailGuiasIS.ts).
import { describe, expect, it } from 'vitest';
import {
  ASSUNTO_GUIAS_INSPECIONADO, assuntoGuiasSecretaria, caminhoGuiasExames, inspecionadoSemNip, linhasExamesGuias, nomeAnexoGuias,
  rotuloTipoGuia, tratamentoInspecionado, vocativoInspecionado,
} from '../emailGuiasIS';
import {
  DADOS_FICTICIOS_GUIAS, montarEmailGuiasInspecionado, montarEmailGuiasInspecionadoFicticio, montarEmailGuiasSecretaria,
  montarEmailGuiasSecretariaFicticio,
} from '../../servidor/email/guiasIS';
import { assinaturaSemSignatario } from '../../servidor/email/comum';

const placeholder = /\{\{[#^/]?\w+\}\}/;
const assinaturaSec = { ...assinaturaSemSignatario(), mostrar_signatario: true, signatario_nome: 'BELTRANO DE SOUZA', signatario_posto: '1SG-ES', signatario_cargo: 'Secretário' };

describe('inspecionadoSemNip', () => {
  it('tira o NIP e mantém posto, quadro e nome', () => {
    expect(inspecionadoSemNip('CT (Md) 12.3456.78 MAURISTON RENAN MARTINS SILVA')).toBe('CT (Md) MAURISTON RENAN MARTINS SILVA');
    expect(inspecionadoSemNip('2SG-HN 09.0169.88 EVERTON DA COSTA BRAGA')).toBe('2SG-HN EVERTON DA COSTA BRAGA');
    expect(inspecionadoSemNip('CT (RM2-Md) 12345678 FULANO DE TAL')).toBe('CT (RM2-Md) FULANO DE TAL');
    expect(inspecionadoSemNip('DEP-CT 01.2345.67 FULANA')).toBe('DEP-CT FULANA');
  });
  it('sem NIP, devolve o texto (sem espaços sobrando)', () => {
    expect(inspecionadoSemNip('  FULANO   DE TAL ')).toBe('FULANO DE TAL');
    expect(inspecionadoSemNip(undefined)).toBe('');
  });
});

describe('vocativo e tratamento', () => {
  it('Prezado/Prezada conforme o sexo do cadastro', () => {
    expect(vocativoInspecionado('CT (Md) 12.3456.78 FULANO')).toBe('Prezado CT (Md) FULANO');
    expect(vocativoInspecionado('CT (Md) 12.3456.78 FULANA', 'Feminino')).toBe('Prezada CT (Md) FULANA');
  });
  it('o Senhor / a Senhora / o(a) Senhor(a)', () => {
    expect(tratamentoInspecionado('Masculino')).toBe('o Senhor');
    expect(tratamentoInspecionado('Feminino', true)).toBe('A Senhora');
    expect(tratamentoInspecionado(undefined, true)).toBe('O(a) Senhor(a)');
  });
});

describe('tabela Tipo | Exame', () => {
  it('laboratoriais numa linha só, separados por vírgula; demais um por linha', () => {
    const l = linhasExamesGuias([
      { grupo: 'Exames laboratoriais', exames: ['Hemograma', 'Glicemia', 'TIG'] },
      { grupo: 'Exames de imagem', exames: ['Radiografia de tórax', 'Mamografia'] },
      { grupo: 'Avaliações', exames: [] },
    ]);
    expect(l).toEqual([
      { tipo: 'Exames Laboratoriais', exame: 'Hemograma, Glicemia, TIG', primeira: true, rowspan: 1 },
      { tipo: 'Exames de Imagem', exame: 'Radiografia de tórax', primeira: true, rowspan: 2 },
      { tipo: 'Exames de Imagem', exame: 'Mamografia', primeira: false, rowspan: 2 },
    ]);
    expect(linhasExamesGuias(undefined)).toEqual([]);
    expect(rotuloTipoGuia('outros exames')).toBe('Outros Exames');
  });
  it('assuntos, anexo e caminho', () => {
    expect(ASSUNTO_GUIAS_INSPECIONADO).toBe('GUIA DOS EXAMES PARA INSPEÇÃO DE SAÚDE');
    expect(assuntoGuiasSecretaria('CT (Md) FULANO')).toBe('EXAMES DE CT (Md) FULANO');
    expect(nomeAnexoGuias(1234567)).toBe('Guias de exames - IS 1234567.pdf');
    expect(caminhoGuiasExames('1234567')).toBe('inspecoes/1234567/guias/guias-exames.pdf');
  });
});

describe('montarEmailGuiasInspecionado', () => {
  const r = montarEmailGuiasInspecionado(DADOS_FICTICIOS_GUIAS, assinaturaSec);
  it('assunto, vocativo sem NIP, finalidade, tabela e assinatura dupla', () => {
    expect(r.assunto).toBe('GUIA DOS EXAMES PARA INSPEÇÃO DE SAÚDE');
    expect(r.anexoNome).toBe('Guias de exames - IS 1234567.pdf');
    expect(r.html).toContain('Prezado CT (Md) FULANO DE TAL DA SILVA,');
    expect(r.html).not.toContain('12.3456.78');
    expect(r.html).toContain('participo em anexo as guias dos exames necessários para a realização da IS fim <strong>Controle anual de praça de máquinas</strong>, a saber:');
    expect(r.html).toContain('Anti-HIV, Colesterol total e frações, Glicemia de jejum');
    expect(r.html).toContain('rowspan="2"');
    expect(r.html).toContain('ATT/RPT,');
    expect(r.html).toContain('Por ordem de:');
    expect(r.html).toContain('BELTRANO DE SOUZA');
    expect(r.html).toContain('Presidente');
    expect(r.html).not.toMatch(/INFORMA[CÇ][AÃ]O PESSOAL/i);
    expect(r.html).not.toMatch(/<script/i);
    expect(r.html).not.toMatch(placeholder);
  });
  it('texto simples equivalente', () => {
    expect(r.texto).toContain('Prezado CT (Md) FULANO DE TAL DA SILVA,');
    expect(r.texto).toContain('Exames Laboratoriais: Anti-HIV, Colesterol total e frações');
    expect(r.texto).toContain('Avaliações: Audiometria');
    expect(r.texto).toContain('Por ordem de:');
    expect(r.texto).not.toMatch(placeholder);
  });
  it('envio do Admin: só o Presidente', () => {
    const a = montarEmailGuiasInspecionadoFicticio();
    expect(a.html).not.toContain('Por ordem de:');
    expect(a.html).not.toMatch(placeholder);
  });
});

describe('montarEmailGuiasSecretaria', () => {
  const r = montarEmailGuiasSecretariaFicticio();
  it('assunto com o inspecionado sem NIP, texto curto e só a assinatura de quem enviou', () => {
    expect(r.assunto).toBe('EXAMES DE CT (Md) FULANO DE TAL DA SILVA');
    expect(r.html).toContain('Seguem as guias dos exames da IS fim <strong>Controle anual de praça de máquinas</strong> de <strong>CT (Md) 12.3456.78 FULANO DE TAL DA SILVA</strong>.');
    expect(r.html).toContain('BELTRANO DE SOUZA');
    expect(r.html).toContain('1SG-ES');
    expect(r.html).not.toContain('Presidente');
    expect(r.html).not.toContain('Por ordem de:');
    expect(r.html).not.toMatch(placeholder);
    expect(r.texto).toContain('ATT/RPT,');
    expect(r.texto).not.toMatch(placeholder);
  });
  it('sem posto e cargo: só o nome', () => {
    const s = montarEmailGuiasSecretaria(DADOS_FICTICIOS_GUIAS, { nome: 'FULANO' });
    expect(s.html).toContain('FULANO');
    expect(s.html).not.toMatch(placeholder);
    expect(s.texto).not.toContain('undefined');
  });
});
