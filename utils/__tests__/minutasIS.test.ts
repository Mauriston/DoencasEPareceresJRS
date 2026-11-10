import { describe, expect, it } from 'vitest';
import { PROMPT_MINUTA_MENSAGEM } from '../../config/promptsIA';
import { camposCancelamento, camposResultadoDaIS, minutaCancelamento, minutaResultado, minutaResultadoDaIS } from '../minutasIS';
import {
  camposMensagemResultado, contarPreencher, dataMensagem, inspecionadoMensagem, juntaMensagem, juntarMinuta,
  minutaMensagemResultado, omMensagem, separarMinuta,
} from '../minutaMensagemResultado';
import { tabelaDestinatariosParaPrompt } from '../destinatariosIS';

// Caminho da página Mensagens: o Gemini preenche o "TEMPLATE — IS ÚNICA" do prompt com os dados extraídos do TIS.
// Aqui o mesmo template é lido do próprio prompt e preenchido por substituição literal, para comparar.
const templateDoPrompt = (): string => {
  const ini = PROMPT_MINUTA_MENSAGEM.indexOf('# TEMPLATE — IS ÚNICA');
  const corpo = PROMPT_MINUTA_MENSAGEM.slice(ini).split('\n\n').slice(1);
  return corpo.slice(0, corpo.indexOf('---')).join('\n\n');
};
const preencherTemplate = (v: Record<string, string>): string =>
  templateDoPrompt().replace(/\[(PARA|INFO|FINALIDADE|INSPECIONADO|OM|Junta|DATA|LAUDO|TIS|DS1A)\]/g, (_, k: string) => v[k]);

// IS fictícia finalizada (InspecaoRecord sem os campos de agenda/auditoria).
const IS_FICTICIA = {
  is: 4321, dataAbertura: '2026-10-01', dataEntrevista: '2026-10-20T08:00', finalidade: 'Término de Incapacidade',
  grupoFinalidade: 'Verificações e Términos', amp: 'JRS', peritoNome: 'CT MAURISTON',
  inspecionado: '3SG-EF 12.3456.78 FULANO DE TAL', dataLaudo: '2026-10-20',
  laudo: 'Apto para o SAM com restrições por 30 dias', restricoes: 'Embarque', tis: '026.001.15', ds1a: 'AB12CD34',
};

describe('minuta de resultado no padrão da página Mensagens', () => {
  it('o PROMPT_MINUTA_MENSAGEM leva a tabela do Anexo M (data/destinatariosInspecoes.json)', () => {
    expect(PROMPT_MINUTA_MENSAGEM).toContain(tabelaDestinatariosParaPrompt());
    expect(PROMPT_MINUTA_MENSAGEM).toContain('Anexo M');
  });

  it('IS única: igual ao template do prompt preenchido com os mesmos dados', () => {
    const esperado = preencherTemplate({
      PARA: 'Órgão de Pessoal', INFO: 'SDP, OM de Origem', FINALIDADE: 'TÉRMINO DE INCAPACIDADE',
      INSPECIONADO: '3SG-EF 12.3456.78 FULANO DE TAL', OM: 'HNRe', Junta: 'JRS/HNRe', DATA: '20OUT2026',
      LAUDO: 'Apto para o SAM com restrições por 30 dias', TIS: '026.001.15', DS1A: 'AB12CD34',
    });
    expect(minutaResultadoDaIS(IS_FICTICIA, { om: 'HNRE' })).toBe(esperado);
    expect(esperado).toBe([
      'PARA: Órgão de Pessoal',
      '',
      'INFO: SDP, OM de Origem',
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
    const t = minutaMensagemResultado({ finalidade: 'Controle Anual de Mergulho', inspecionado: 'MN 12345678 BELTRANO' });
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

describe('dependente sem titular conhecido', () => {
  it('Dependência de familiar: PARA indica as opções da tabela e INFO "—"', () => {
    const c = camposMensagemResultado({ finalidade: 'Dependência de familiar de militar', inspecionado: 'X', laudo: 'Apto' });
    expect(c.para).toBe('[preencher: PARA: OM do militar (titular da ativa) ou CPesFN/SVPM/OMAC (titular inativo)]');
    expect(c.info).toBe('—');
  });
});

describe('minuta em campos', () => {
  const VDF_IS = {
    is: 77, dataAbertura: '2026-10-01', finalidade: 'Verificação de Deficiência Funcional', grupoFinalidade: 'Verificações e Términos',
    amp: 'JRS', inspecionado: '3SG-EF 12.3456.78 FULANO DE TAL', dataLaudo: '2026-11-05', laudo: 'Apto com restrições por 90 dias',
    tis: '026.002.30', ds1a: 'ZX98YW76',
  };

  it('VDF "Apto com restrições por 90 dias" (Carreira)', () => {
    expect(camposResultadoDaIS(VDF_IS, { om: 'HNRE', vinculo: 'Carreira' })).toEqual({
      para: 'Órgão de Pessoal',
      info: 'OM de Origem',
      assunto: 'INSPEÇÃO DE SAÚDE FIM VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL - 3SG-EF 12.3456.78 FULANO DE TAL (HNRe)',
      texto: 'ALFA - PTC que a JRS/HNRe concluiu em 05NOV2026 a IS FIM VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL atinente ao 3SG-EF 12.3456.78 FULANO DE TAL (HNRe) e exarou o seguinte laudo: "Apto com restrições por 90 dias". ACD TIS nº 026.002.30; e\n\nBRAVO - O REF TIS (modelo DS-1A) pode ser verificado digitalmente por meio do acesso ao sítio https://sinais.dsm.mb/tisonline, informando o código de validação ZX98YW76 e selecionando a opção "Download do TIS" BT',
    });
  });

  it('texto único = campos juntos; separar ⇄ juntar ida e volta', () => {
    const c = camposResultadoDaIS(VDF_IS, { om: 'HNRe', vinculo: 'Temporário' });
    const t = minutaResultadoDaIS(VDF_IS, { om: 'HNRe', vinculo: 'Temporário' });
    expect(t).toBe(juntarMinuta(c));
    expect(t).toBe(minutaMensagemResultado({ ...VDF_IS, om: 'HNRe', vinculo: 'Temporário' }));
    expect(separarMinuta(t)).toEqual(c);
    expect(c.para).toBe('SDP'); // VDF, temporário, "Apto … com restrições" → SDP / DPM, OM de Origem
  });

  it('cancelamento: DE/PARA/ASSUNTO/texto, sem INFO; texto gravado é separado nos mesmos campos', () => {
    const d = { is: 10, finalidade: 'Deixar o SAM', inspecionado: 'CT (Md) 12.3456.78 FULANO', dataAbertura: '2026-10-01', amp: 'JRS', om: 'HNRe' };
    const c = camposCancelamento(d);
    expect(c.de).toBe('HNRe (JRS)');
    expect(c.info).toBeUndefined();
    expect(c.assunto).toBe('CANCELAMENTO DE INSPEÇÃO DE SAÚDE Nº 10');
    expect(c.texto.startsWith('1. Comunico que a Inspeção de Saúde (IS) nº 10')).toBe(true);
    expect(separarMinuta(minutaCancelamento(d))).toEqual(c);
  });

  it('texto sem cabeçalho vira só o campo Texto', () => {
    expect(separarMinuta('Texto livre\n\nsegunda linha')).toEqual({ para: '', assunto: '', texto: 'Texto livre\n\nsegunda linha' });
  });
});
