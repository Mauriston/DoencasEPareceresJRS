import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROMPT_MINUTA_MENSAGEM } from '../../config/promptsIA';
import { camposCancelamento, camposResultadoDaIS, minutaCancelamento, minutaResultado, minutaResultadoDaIS } from '../minutasIS';
import {
  DESTINOS_MENSAGEM, camposMensagemResultado, contarPreencher, dataMensagem, destinatariosDaMensagem, finalidadeDaTabela,
  inspecionadoMensagem, juntaMensagem, juntarMinuta, minutaMensagemResultado, omMensagem, separarMinuta, tipoDoLaudo,
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
    expect(destinatariosDaMensagem('Término de Incapacidade', 'Apto para o SMV com restrições por 60 dias')).toEqual({ para: 'DN', info: 'DPM + OM de Origem', regra: 'tabela' });
    expect(destinatariosDaMensagem('Término de Incapacidade', 'APTO PARA O SAM')).toEqual({ para: 'Órgão de Pessoal', info: 'SDP + OM de Origem', regra: 'tabela' });
    expect(destinatariosDaMensagem('Verificação de Deficiência Funcional', 'Incapaz temporariamente para o SPG por 90 dias')).toEqual({ para: 'OM de Origem', info: '—', regra: 'tabela' });
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

// ---------------------------------------------------------------------------
// PARA/INFO para todas as finalidades de public/finalidadesIS.json × resultados típicos
// ---------------------------------------------------------------------------

interface FinalidadeJson { nome: string; vinculos: string[] }
const FINALIDADES: FinalidadeJson[] = (JSON.parse(readFileSync(join(process.cwd(), 'public/finalidadesIS.json'), 'utf8')) as { grupos: { finalidades: FinalidadeJson[] }[] })
  .grupos.flatMap(g => g.finalidades);

const LAUDOS = {
  apto: 'Apto',
  aptoSam: 'Apto para o SAM',
  aptoRestricoes: 'Apto com restrições por 90 dias',
  incapazTemp: 'Incapaz temporariamente, necessitando de 30 dias de LTS',
  inaptoTemp: 'Inapto temporariamente por 60 dias',
  incapazDef: 'Incapaz definitivamente para o SAM',
};

const OP_OM = { para: 'Órgão de Pessoal', info: 'OM de Origem' };
const DN = { para: 'DN', info: 'DPM + OM de Origem' };
const INATIVOS = { para: 'DPM ou CPesFN', info: 'SVPM' };
const PENSIONISTAS = { para: 'SVPM', info: 'OM de Origem' };

/** Finalidades com linha "Any" na tabela (qualquer laudo): destino esperado. */
const POR_FINALIDADE: Record<string, { para: string; info: string } | Record<string, { para: string; info: string }>> = {
  'Controle semestral Raios-X': { para: 'DSM', info: 'Órgão de Pessoal* + OM de Origem' },
  'Controle trienal': OP_OM,
  'Manipulação e admin Terapia Antineoplásica': { para: 'DSM', info: 'Órgão de Pessoal* + OM de Origem' },
  'Prorrogação do Tempo de Serviço': DN,
  'Reengajamento': OP_OM,
  'Tarefa por Tempo Certo e prorrogações': { para: 'OM de Origem', info: '—' },
  'Deixar o SAM': OP_OM,
  'Deixar o SMV': DN,
  'Deixar o SMI': { para: 'DN', info: 'OM de Origem' },
  'Deixar o SPG': OP_OM,
  'Localidade com deficiência em assistência sanitária (LDAS)': OP_OM,
  'Missão no exterior (< 3m c/ trienal OK)': OP_OM,
  'Missão no exterior (> 3m)': OP_OM,
  'LTSPF': { para: 'SDP', info: 'Órgão de Pessoal* + OM de Origem' },
  'Auxílio invalidez de militar inativo': INATIVOS,
  'Isenção de pagamento de imposto de renda': { Inativo: INATIVOS, Pensionista: PENSIONISTAS },
  'Pensão militar para beneficiário inválido': PENSIONISTAS,
  'Pensão de ex-combatente para beneficiário inválido': PENSIONISTAS,
  'Pensão especial à viúva de militar': PENSIONISTAS,
  'Revisão de reforma relacionada ao serviço': INATIVOS,
  'Revisão de reforma para portadores de SIDA/AIDS': INATIVOS,
  'Revisão de reforma por idade-limite': INATIVOS,
  'Reforma de militar RM1': INATIVOS,
  'IS para verificação de preexistência de invalidez': INATIVOS,
  'IS para verificação de preexistência de doença especificada em Lei': INATIVOS,
  'IS para verificação de preexistência de incapacidade definitiva para o SAM': INATIVOS,
};

/** Dependem do laudo (tabela por RESULTADO): [vínculo, laudo] → destino (null = a tabela não cobre). */
type Caso = [string, keyof typeof LAUDOS, { para: string; info: string } | null];
const VDF: Caso[] = [
  ['Carreira', 'apto', OP_OM], // analogia: Apto ⇄ Apto com restrições
  ['Carreira', 'aptoSam', OP_OM],
  ['Carreira', 'aptoRestricoes', OP_OM],
  ['Carreira', 'incapazTemp', { para: 'SDP', info: 'Órgão de Pessoal* + OM de Origem' }],
  ['Carreira', 'inaptoTemp', { para: 'SDP', info: 'Órgão de Pessoal* + OM de Origem' }],
  ['Carreira', 'incapazDef', OP_OM],
  ['Temporário', 'apto', DN], // analogia: todas as linhas SMV da finalidade dão DN
  ['Temporário', 'aptoRestricoes', DN],
  ['Temporário', 'incapazTemp', DN],
  ['Temporário', 'inaptoTemp', DN],
];
const POR_LAUDO: Record<string, Caso[]> = {
  'Verificação de Deficiência Funcional': VDF,
  'Verificação de Deficiência Funcional - Fato novo': VDF,
  'Verificação de Deficiência Funcional - SMI': [
    ['Temporário', 'apto', null], ['Temporário', 'aptoRestricoes', null], ['Temporário', 'incapazTemp', null],
  ],
  'Verificação de Deficiência Funcional - SC': [
    ['Carreira', 'apto', null], ['Carreira', 'aptoRestricoes', null],
    ['Carreira', 'incapazTemp', { para: 'OM de Origem', info: '—' }],
    ['Carreira', 'incapazDef', OP_OM], // o laudo cita o SAM
  ],
  'Término de Incapacidade': [
    ['Carreira', 'apto', { para: 'Órgão de Pessoal', info: 'SDP + OM de Origem' }],
    ['Carreira', 'aptoSam', { para: 'Órgão de Pessoal', info: 'SDP + OM de Origem' }],
    ['Carreira', 'aptoRestricoes', { para: 'Órgão de Pessoal', info: 'SDP + OM de Origem' }],
    ['Carreira', 'incapazTemp', null], // "Incapaz temporariamente para o SAM" não está na tabela
    ['Carreira', 'incapazDef', OP_OM],
    ['Temporário', 'apto', DN], ['Temporário', 'aptoRestricoes', DN], ['Temporário', 'incapazTemp', DN],
  ],
  'Término de Restrições': [
    ['Carreira', 'apto', null], ['Carreira', 'aptoRestricoes', null], ['Carreira', 'incapazTemp', null], ['Carreira', 'incapazDef', null],
    ['Temporário', 'apto', DN], ['Temporário', 'aptoRestricoes', DN], ['Temporário', 'incapazTemp', DN],
  ],
};

/** Finalidades sem linha na tabela do prompt (PARA/INFO ficam "[preencher]"). */
const NAO_COBERTAS = [
  'Controle anual de praça de máquinas', 'Serviço com explosivos', 'Serviço com OTTO FUELL II', 'Controle Anual de Mergulho',
  'Ingresso no SMV (oriundos do SMI)', 'Engajamento', 'Missão Antártica', 'Designação de militares RM1',
  'IS para conclusão de Curso de Formação', 'IS inopinada de avaliação toxicológica preventiva direcionada',
  'Reversão ou Reintegração ao SPG', 'Seleção para Cursos de carreira (🚫 AE)', 'Exame de Sanidade em IPM',
  'Reintegração de Militar', 'Reintegração de Candidato', 'Dependência de familiar de militar', 'Verificação Post-mortem de ex-militar',
];

describe('PARA/INFO: todas as finalidades da IS × resultados', () => {
  it('cada finalidade de finalidadesIS.json está classificada', () => {
    const classificadas = new Set([...Object.keys(POR_FINALIDADE), ...Object.keys(POR_LAUDO), ...NAO_COBERTAS]);
    expect(FINALIDADES.map(f => f.nome).filter(n => !classificadas.has(n))).toEqual([]);
  });

  for (const f of FINALIDADES) {
    const esperado = POR_FINALIDADE[f.nome];
    if (!esperado) continue;
    it(`${f.nome}: preenchido para qualquer laudo`, () => {
      for (const v of f.vinculos) for (const laudo of Object.values(LAUDOS)) {
        const e = 'para' in esperado ? esperado : (esperado as Record<string, { para: string; info: string }>)[v];
        expect(destinatariosDaMensagem(f.nome, laudo, { vinculo: v }), `${v} / ${laudo}`).toMatchObject(e as object);
      }
    });
  }

  for (const [nome, casos] of Object.entries(POR_LAUDO)) {
    it(`${nome}: pelo resultado e vínculo`, () => {
      for (const [v, k, e] of casos) {
        const d = destinatariosDaMensagem(nome, LAUDOS[k], { vinculo: v });
        if (e) expect(d, `${v} / ${LAUDOS[k]}`).toMatchObject(e);
        else expect(d, `${v} / ${LAUDOS[k]}`).toBeNull();
      }
    });
  }

  it('finalidades sem regra no prompt ficam sem PARA/INFO', () => {
    for (const nome of NAO_COBERTAS) {
      const f = FINALIDADES.find(x => x.nome === nome)!;
      for (const v of f.vinculos) expect(destinatariosDaMensagem(nome, LAUDOS.apto, { vinculo: v }), nome).toBeNull();
    }
  });

  it('o serviço explícito no laudo prevalece sobre o vínculo; RM2 no posto indica SMV', () => {
    expect(destinatariosDaMensagem('Verificação de Deficiência Funcional', 'Incapaz temporariamente para o SMV por 30 dias', { vinculo: 'Carreira' })).toMatchObject(DN);
    expect(destinatariosDaMensagem('Verificação de Deficiência Funcional', 'Apto com restrições por 90 dias', { inspecionado: '1T (RM2-Md) 12.3456.78 FULANO' })).toMatchObject(DN);
    expect(destinatariosDaMensagem('Verificação de Deficiência Funcional', 'Apto para o SAM (com restrições) por 90 dias', {})).toMatchObject(OP_OM);
    expect(destinatariosDaMensagem('Verificação de Deficiência Funcional', 'Incapaz definitivamente para o exercício da especialidade, estando apto para o SAM com restrições')).toMatchObject(OP_OM);
    // Sem serviço no laudo e sem vínculo: não dá para escolher a linha.
    expect(destinatariosDaMensagem('Verificação de Deficiência Funcional', 'Apto com restrições por 90 dias')).toBeNull();
  });

  it('tipo do laudo ignora período e "em prorrogação"', () => {
    expect(tipoDoLaudo('Apto com restrições por 90 dias')).toBe('apto_restricoes');
    expect(tipoDoLaudo('Apto para o SAM com restrições por 90 dias, em prorrogação')).toBe('apto_restricoes');
    expect(tipoDoLaudo('Inapto com restrições')).toBeNull();
    expect(tipoDoLaudo('Continua incapaz temporariamente para o SAM')).toBe('incapaz_temporario');
    expect(tipoDoLaudo('Incapaz definitivamente para o SAM')).toBe('incapaz_definitivo');
  });

  it('Dependência de familiar: PARA indica as duas opções da tabela e INFO "—"', () => {
    const c = camposMensagemResultado({ finalidade: 'Dependência de familiar de militar', inspecionado: 'X', laudo: 'Apto' });
    expect(c.para).toBe('[preencher: PARA: OM do militar (ativa) ou CPesFN/SVPM/OMAC (inativo)]');
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
    expect(c.para).toBe('DN');
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
