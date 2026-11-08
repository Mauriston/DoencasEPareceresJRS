import { describe, expect, it } from 'vitest';
import { PROMPT_MINUTA_MENSAGEM } from '../../config/promptsIA';
import { minutaCancelamento, minutaResultado, minutaResultadoDaIS } from '../minutasIS';
import {
  DESTINOS_MENSAGEM, contarPreencher, dataMensagem, destinatariosDaMensagem, finalidadeDaTabela, inspecionadoMensagem,
  juntaMensagem, minutaMensagemResultado, omMensagem,
} from '../minutaMensagemResultado';

// Caminho da página Mensagens: o Gemini preenche o "TEMPLATE — IS ÚNICA" do prompt com os dados extraídos do TIS.
// Aqui o mesmo template é lido do próprio prompt e preenchido por substituição literal, para comparar.
const templateDoPrompt = (): string => {
  const ini = PROMPT_MINUTA_MENSAGEM.indexOf('# TEMPLATE — IS ÚNICA');
  const corpo = PROMPT_MINUTA_MENSAGEM.slice(ini).split('\n\n').slice(1);
  return corpo.slice(0, corpo.indexOf('---')).join('\n\n');
};
const preencherTemplate = (v: Record<string, string>): string =>
  templateDoPrompt().replace(/\[(PARA|INFO|FINALIDADE|INSPECIONADO|OM|Junta|DATA|LAUDO|TIS|DS1A)\]/g, (_, k: string) => v[k]);
const tabelaDoPrompt = (): unknown => {
  const m = /conforme o JSON:\n\n(\[[\s\S]*?\])\n\n/.exec(PROMPT_MINUTA_MENSAGEM);
  return JSON.parse(m![1]);
};

// IS fictícia finalizada (InspecaoRecord sem os campos de agenda/auditoria).
const IS_FICTICIA = {
  is: 4321, dataAbertura: '2026-10-01', dataEntrevista: '2026-10-20T08:00', finalidade: 'Término de Incapacidade',
  grupoFinalidade: 'Verificações e Términos', amp: 'JRS', peritoNome: 'CT MAURISTON',
  inspecionado: '3SG-EF 12.3456.78 FULANO DE TAL', dataLaudo: '2026-10-20',
  laudo: 'Apto para o SAM com restrições por 30 dias', restricoes: 'Embarque', tis: '026.001.15', ds1a: 'AB12CD34',
};

describe('minuta de resultado no padrão da página Mensagens', () => {
  it('a tabela de destinatários é a mesma do PROMPT_MINUTA_MENSAGEM', () => {
    expect(DESTINOS_MENSAGEM).toEqual(tabelaDoPrompt());
  });

  it('IS única: igual ao template do prompt preenchido com os mesmos dados', () => {
    const esperado = preencherTemplate({
      PARA: 'Órgão de Pessoal', INFO: 'SDP + OM de Origem', FINALIDADE: 'TÉRMINO DE INCAPACIDADE',
      INSPECIONADO: '3SG-EF 12.3456.78 FULANO DE TAL', OM: 'HNRe', Junta: 'JRS/HNRe', DATA: '20OUT2026',
      LAUDO: 'Apto para o SAM com restrições por 30 dias', TIS: '026.001.15', DS1A: 'AB12CD34',
    });
    expect(minutaResultadoDaIS(IS_FICTICIA, { om: 'HNRE' })).toBe(esperado);
    expect(esperado).toBe([
      'PARA: Órgão de Pessoal',
      '',
      'INFO: SDP + OM de Origem',
      '',
      'ASSUNTO: INSPEÇÃO DE SAÚDE FIM TÉRMINO DE INCAPACIDADE - 3SG-EF 12.3456.78 FULANO DE TAL (HNRe)',
      '',
      'ALFA - PTC que a JRS/HNRe concluiu em 20OUT2026 a IS FIM TÉRMINO DE INCAPACIDADE atinente ao 3SG-EF 12.3456.78 FULANO DE TAL (HNRe) e exarou o seguinte laudo: "Apto para o SAM com restrições por 30 dias". ACD TIS nº 026.001.15; e',
      '',
      'BRAVO - O REF TIS (modelo DS-1A) pode ser verificado digitalmente por meio do acesso ao sítio https://sinais.dsm.mb/tisonline, informando o código de validação AB12CD34 e selecionando a opção "Download do TIS" BT',
    ].join('\n'));
  });

  it('chamada atual da página Inspeções (sem ds1a/peritoNome) continua funcionando e marca o que falta', () => {
    const { ds1a: _d, peritoNome: _p, ...semExtras } = IS_FICTICIA;
    const t = minutaResultado({ ...semExtras, amp: 'MPI', om: 'CPesFN' });
    expect(t).toContain('MPI/HNRe [preencher: nome do perito]');
    expect(t).toContain('código de validação [preencher: código DS-1A]');
    expect(contarPreencher(t)).toBe(2);
  });

  it('concordância feminina fora do laudo', () => {
    const t = minutaResultadoDaIS({ ...IS_FICTICIA, laudo: 'Apto para o SAM' }, { om: 'HNRe', feminino: true });
    expect(t).toContain('atinente à 3SG-EF');
  });

  it('campos ausentes viram [preencher]', () => {
    const t = minutaMensagemResultado({ finalidade: 'Engajamento', inspecionado: 'MN 12345678 BELTRANO' });
    expect(t).toContain('PARA: [preencher: PARA]');
    expect(t).toContain('INFO: [preencher: INFO]');
    expect(t).toContain('MN 12.3456.78 BELTRANO ([preencher: OM])');
    expect(t).toContain('[preencher: data do laudo]');
    expect(t).toContain('"[preencher: laudo]"');
    expect(t).toContain('TIS nº [preencher: nº do TIS]');
    expect(t).toContain('[preencher: Junta');
  });
});

describe('auxiliares da minuta de mensagem', () => {
  it('datas DDMMMAAAA', () => {
    expect(dataMensagem('2026-06-18')).toBe('18JUN2026');
    expect(dataMensagem('2025-10-15')).toBe('15OUT2025');
    expect(dataMensagem('')).toBe('');
  });
  it('OM e Junta com a grafia HNRe', () => {
    expect(omMensagem('hnre')).toBe('HNRe');
    expect(omMensagem('CPesFN')).toBe('CPesFN');
    expect(juntaMensagem('JRS')).toBe('JRS/HNRe');
    expect(juntaMensagem('MPI', 'CT MAURISTON')).toBe('MPI/HNRe MAURISTON');
  });
  it('mascara NIP solto', () => {
    expect(inspecionadoMensagem('CT (Md) 12345678 FULANO')).toBe('CT (Md) 12.3456.78 FULANO');
    expect(inspecionadoMensagem('CT (Md) 12.3456.78 FULANO')).toBe('CT (Md) 12.3456.78 FULANO');
  });
  it('mapeia finalidades da IS para a tabela do prompt', () => {
    expect(finalidadeDaTabela('Controle trienal')).toBe('Controle Trienal');
    expect(finalidadeDaTabela('Localidade com deficiência em assistência sanitária (LDAS)')).toBe('Localidade Deficiente em Assistência Sanitária');
    expect(finalidadeDaTabela('Missão no exterior (> 3m)')).toBe('Missão no Exterior');
    expect(finalidadeDaTabela('Prorrogação do Tempo de Serviço')).toBe('Prorrogação de Tempo de Serviço');
    expect(finalidadeDaTabela('Controle semestral Raios-X')).toBe('Semestral de RX, substâncias radioativas e Terapia Antineoplásica');
    expect(finalidadeDaTabela('Verificação de Deficiência Funcional - Fato novo')).toBe('Verificação de Deficiência Funcional');
    expect(finalidadeDaTabela('LTSPF')).toBe('Licença para tratamento de saúde de pessoa da família');
    expect(finalidadeDaTabela('Isenção de pagamento de imposto de renda')).toBeNull();
    expect(finalidadeDaTabela('Isenção de pagamento de imposto de renda', 'Inativo')).toBe('Benefícios (Militares inativos)');
    expect(finalidadeDaTabela('Engajamento')).toBeNull();
  });
  it('escolhe a linha pelo início do laudo (a mais específica), ignorando o período', () => {
    expect(destinatariosDaMensagem('Término de Incapacidade', 'Apto para o SMV com restrições por 60 dias')).toEqual({ para: 'DN', info: 'DPM + OM de Origem' });
    expect(destinatariosDaMensagem('Término de Incapacidade', 'APTO PARA O SAM')).toEqual({ para: 'Órgão de Pessoal', info: 'SDP + OM de Origem' });
    expect(destinatariosDaMensagem('Verificação de Deficiência Funcional', 'Incapaz temporariamente para o SPG por 90 dias')).toEqual({ para: 'OM de Origem', info: '—' });
    expect(destinatariosDaMensagem('Término de Restrições', 'Apto para o SAM')).toBeNull();
  });
});

describe('minuta de cancelamento (formato próprio, inalterado)', () => {
  it('mantém cabeçalho e texto', () => {
    const t = minutaCancelamento({ is: 10, finalidade: 'Deixar o SAM', inspecionado: 'CT (Md) 12.3456.78 FULANO', dataAbertura: '2026-10-01', amp: 'JRS', om: 'HNRe' });
    expect(t.startsWith('DE: HNRe (JRS)\nPARA: HNRe\nASSUNTO: CANCELAMENTO DE INSPEÇÃO DE SAÚDE Nº 10\n')).toBe(true);
    expect(t).toContain('foi CANCELADA, por não ter sido agendada no prazo de 7 dias');
  });
});

describe('minutaCancelamento: motivo', () => {
  const base = { is: 1, finalidade: 'VDF', grupoFinalidade: 'Verificações e Términos', inspecionado: 'CT X', dataAbertura: '2026-10-01', amp: 'JRS' };
  it('sem entrevista: prazo', () => { expect(minutaCancelamento(base)).toMatch(/não ter sido agendada no prazo/); });
  it('com entrevista: falta', () => {
    const t = minutaCancelamento({ ...base, dataEntrevista: '2026-10-10T08:00' });
    expect(t).toMatch(/não comparecimento do inspecionado à entrevista agendada para 10\/10\/2026/);
    expect(t).not.toMatch(/prazo/);
  });
});
