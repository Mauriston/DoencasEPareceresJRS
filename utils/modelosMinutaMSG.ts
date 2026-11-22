// Ficheiro: utils/modelosMinutaMSG.ts
// Modelos editáveis das Minutas MSG (Administração › Modelos de Minuta MSG; só Admin). Três modelos:
//  - 'resultado'     minuta de resultado da IS (ALFA/BRAVO; PARA/INFO vêm da tabela do Anexo M, não são editáveis);
//  - 'incapacidade'  VDF/Término com incapacidade definitiva para o SAM (DE HOSCRF; PARA HOSNAT + OM);
//  - 'cancelamento'  cancelamento de IS (por falta ou por prazo).
// Cada campo é um texto com {{placeholders}} (PLACEHOLDERS_MSG). Os padrões abaixo reproduzem exatamente o texto que
// o app gerava antes. Gravados em config/minutasMSG.{tipo} (services/modelosMinutaMSG.ts); as funções de minuta
// (utils/minutaMensagemResultado.ts, utils/minutasIS.ts) leem o modelo ativo. Testes: utils/__tests__/modelosMinutaMSG.test.ts.

export const TIPOS_MODELO_MSG = ['resultado', 'incapacidade', 'cancelamento'] as const;
export type TipoModeloMSG = typeof TIPOS_MODELO_MSG[number];

export const ROTULO_MODELO_MSG: Record<TipoModeloMSG, { titulo: string; ajuda: string }> = {
  resultado: { titulo: 'Resultado da IS', ajuda: 'Mensagem de resultado (ALFA/BRAVO). PARA e INFO vêm da tabela de destinatários do Anexo M da DGPM-406.' },
  incapacidade: { titulo: 'Incapacidade definitiva para o SAM', ajuda: 'VDF e Término de Incapacidade com laudo "Incapaz definitivamente para o SAM". PARA = HOSNAT + OM do inspecionado.' },
  cancelamento: { titulo: 'Cancelamento de IS', ajuda: 'Cancelamento por falta ou por não agendamento no prazo. PARA = OM do inspecionado.' },
};

export interface CampoModeloMSG { chave: string; rotulo: string; longo?: boolean }
export const CAMPOS_MODELO_MSG: Record<TipoModeloMSG, CampoModeloMSG[]> = {
  resultado: [
    { chave: 'assunto', rotulo: 'ASSUNTO' },
    { chave: 'texto', rotulo: 'TEXTO (ALFA e BRAVO)', longo: true },
  ],
  incapacidade: [
    { chave: 'de', rotulo: 'DE' },
    { chave: 'info', rotulo: 'INFO' },
    { chave: 'assunto', rotulo: 'ASSUNTO' },
    { chave: 'texto', rotulo: 'TEXTO (REF, ALFA, BRAVO e CHARLIE)', longo: true },
  ],
  cancelamento: [
    { chave: 'de', rotulo: 'DE' },
    { chave: 'assunto', rotulo: 'ASSUNTO' },
    { chave: 'texto', rotulo: 'TEXTO', longo: true },
  ],
};

export interface PlaceholderMSG { chave: string; descricao: string; exemplo: string }
export const PLACEHOLDERS_MSG: Record<TipoModeloMSG, PlaceholderMSG[]> = {
  resultado: [
    { chave: 'is', descricao: 'Nº da IS', exemplo: '1254539' },
    { chave: 'finalidade', descricao: 'Finalidade (MAIÚSCULAS)', exemplo: 'CONTROLE PERIÓDICO DE SAÚDE' },
    { chave: 'inspecionado', descricao: 'Posto/quadro e nome do inspecionado', exemplo: '1T (MD) FULANO DE TAL' },
    { chave: 'om', descricao: 'OM do inspecionado', exemplo: 'HNRe' },
    { chave: 'junta', descricao: 'Junta (JRS/HNRe ou MPI com o perito)', exemplo: 'JRS/HNRe' },
    { chave: 'data_laudo', descricao: 'Data do laudo (ex.: 18JUN2026)', exemplo: '18JUN2026' },
    { chave: 'laudo', descricao: 'Laudo exarado (uma linha)', exemplo: 'Apto para o SAM' },
    { chave: 'atinente', descricao: '"atinente ao" / "atinente à" (sexo)', exemplo: 'atinente ao' },
    { chave: 'dispensa', descricao: 'Frase de dispensa por restrições (vazia sem restrições; já traz o espaço antes)', exemplo: '' },
    { chave: 'tis', descricao: 'Nº do TIS', exemplo: '026.001.1' },
    { chave: 'ds1a', descricao: 'Código de validação do DS-1A', exemplo: 'ABC123' },
  ],
  incapacidade: [
    { chave: 'is', descricao: 'Nº da IS', exemplo: '1254539' },
    { chave: 'finalidade', descricao: 'Finalidade (MAIÚSCULAS)', exemplo: 'VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL' },
    { chave: 'inspecionado', descricao: 'Posto/quadro e nome do inspecionado', exemplo: '1T (MD) FULANO DE TAL' },
    { chave: 'om', descricao: 'OM do inspecionado', exemplo: 'HNRe' },
    { chave: 'atinente', descricao: '"atinente ao" / "atinente à" (sexo)', exemplo: 'atinente ao' },
    { chave: 'data_laudo', descricao: 'Data do laudo (ex.: 18JUN2026)', exemplo: '18JUN2026' },
    { chave: 'laudo', descricao: 'Laudo exarado (uma linha)', exemplo: 'Incapaz definitivamente para o SAM' },
    { chave: 'tis', descricao: 'Nº do TIS', exemplo: '026.001.1' },
  ],
  cancelamento: [
    { chave: 'is', descricao: 'Nº da IS', exemplo: '1254539' },
    { chave: 'finalidade', descricao: 'Finalidade', exemplo: 'Controle Periódico de Saúde' },
    { chave: 'data_abertura', descricao: 'Data de abertura (dd/mm/aaaa)', exemplo: '03/11/2026' },
    { chave: 'inspecionado', descricao: 'Inspecionado', exemplo: '1T (MD) FULANO DE TAL' },
    { chave: 'motivo', descricao: 'Motivo (falta à entrevista ou prazo sem agendamento)', exemplo: 'por não ter sido agendada no prazo de 7 dias (9 dias em aberto)' },
    { chave: 'prazo', descricao: 'Prazo de agendamento em dias (7; 60 em Benefícios)', exemplo: '7' },
    { chave: 'dias_em_aberto', descricao: 'Dias desde a abertura', exemplo: '9' },
  ],
};

export type ModeloMSG = Record<string, string>;
export type ModelosMSG = Record<TipoModeloMSG, ModeloMSG>;

export const MODELOS_MSG_PADRAO: ModelosMSG = {
  resultado: {
    assunto: 'INSPEÇÃO DE SAÚDE FIM {{finalidade}} - {{inspecionado}} ({{om}})',
    texto: [
      'ALFA - PTC que a {{junta}} concluiu em {{data_laudo}} a IS FIM {{finalidade}} {{atinente}} {{inspecionado}} ({{om}}) e exarou o seguinte laudo: "{{laudo}}".{{dispensa}} ACD TIS nº {{tis}}; e',
      '',
      'BRAVO - O REF TIS (modelo DS-1A) pode ser verificado digitalmente por meio do acesso ao sítio https://sinais.dsm.mb/tisonline, informando o código de validação {{ds1a}} e selecionando a opção "Download do TIS" BT',
    ].join('\n'),
  },
  incapacidade: {
    de: 'HOSCRF',
    info: 'TERDIS',
    assunto: 'INCAPACIDADE DEFINITIVA PARA O SAM',
    texto: [
      'REF IS nº {{is}} FIM {{finalidade}} {{atinente}} {{inspecionado}} ({{om}}), PTC:',
      '',
      'ALFA - a JRS/HNRe, em {{data_laudo}}, exarou o seguinte laudo "{{laudo}}" ACD TIS nº {{tis}};',
      '',
      'BRAVO - HOSNAT: o REF TIS foi ENC para Revisão Ex-offício pela JSD/COM3ºDN via SINAIS nos termos da alínea "n" do item 6.1.3 da DGPM-406 (9ª Revisão); e',
      '',
      'CHARLIE - {{om}}: SOL OBS o disposto na alínea "p" do mesmo item da antecitada norma BT',
    ].join('\n'),
  },
  cancelamento: {
    de: 'HNRe (JRS)',
    assunto: 'CANCELAMENTO DE INSPEÇÃO DE SAÚDE Nº {{is}}',
    texto: [
      '1. Comunico que a Inspeção de Saúde (IS) nº {{is}}, finalidade "{{finalidade}}", aberta em {{data_abertura}} em favor de {{inspecionado}}, foi CANCELADA, {{motivo}}.',
      '',
      '2. Caso persista a necessidade da inspeção, solicito nova apresentação do inspecionado a esta Junta Regular de Saúde, com a documentação pertinente.',
    ].join('\n'),
  },
};

const RE_PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/** Substitui {{chave}} pelos valores; chave desconhecida fica como está (a Administração a barra ao salvar). */
export const preencherModelo = (modelo: string, valores: Record<string, string>): string =>
  modelo.replace(RE_PLACEHOLDER, (m, k: string) => (k.toLowerCase() in valores ? valores[k.toLowerCase()] : m));

/** Placeholders usados no texto que o modelo do tipo não conhece. */
export const placeholdersDesconhecidos = (tipo: TipoModeloMSG, texto: string): string[] => {
  const validos = new Set(PLACEHOLDERS_MSG[tipo].map(p => p.chave));
  return [...new Set([...texto.matchAll(RE_PLACEHOLDER)].map(m => m[1].toLowerCase()).filter(k => !validos.has(k)))];
};

/** Modelo do tipo: o salvo (campos de texto não vazios) sobre o padrão. */
export const modeloComPadrao = (tipo: TipoModeloMSG, cru: Record<string, unknown> | undefined | null): ModeloMSG => {
  const out: ModeloMSG = { ...MODELOS_MSG_PADRAO[tipo] };
  for (const c of CAMPOS_MODELO_MSG[tipo]) {
    const v = cru?.[c.chave];
    if (typeof v === 'string' && v.trim()) out[c.chave] = v;
  }
  return out;
};

// Modelos ativos: o app grava aqui o que lê de config/minutasMSG (services/modelosMinutaMSG.ts); sem leitura, os padrões.
let ativos: ModelosMSG = MODELOS_MSG_PADRAO;
export const definirModelosMSG = (cru: Record<string, Record<string, unknown>> | undefined | null): void => {
  ativos = Object.fromEntries(TIPOS_MODELO_MSG.map(t => [t, modeloComPadrao(t, cru?.[t])])) as ModelosMSG;
};
export const modeloMSG = (tipo: TipoModeloMSG): ModeloMSG => ativos[tipo];
