// Ficheiro: utils/ajustesDocumentosIS.ts
// Ajustes editáveis (Administração › Templates de documentos) dos documentos gerados a partir de uma IS.
// Gravados no Firestore em config/documentosIS, um campo por tipo: config/documentosIS.{tipo} = Partial<AjustesX>.
// O servidor entrega o campo cru em ctx.ajustes (servidor/documentos/is/servico.ts); os geradores devem usar
// `ajustesDocumentoIS(tipo, ctx.ajustes)` para obter os valores com os padrões abaixo (string vazia = padrão).
//
import type { TipoDocumentoIS } from './documentosIS';

// Chaves = exatamente as lidas pelos geradores em servidor/documentos/is/<tipo>.ts. Listas (avisos, observações,
// parágrafos do e-mail) são texto multi-linha: uma linha por item. Vazio = padrão do gerador (idêntico ao abaixo).
type Campo = { chave: string; rotulo: string; longo?: boolean; ajuda?: string };
export type AjustesDocumentosIS = { [T in TipoDocumentoIS]: Record<string, string> };

const AVISO_DOCS = 'Todos os recursos deverão ser instruídos por documentos apensos que possam respaldar as pretensões do inspecionado, a fim de possibilitar o deferimento do pleito.';
const AVISO_NOVA = 'Caso o requerimento seja deferido, o candidato será convocado para nova Inspeção de Saúde na JSD/COM3ºDN localizada no Hospital Naval de Natal.';

export const AJUSTES_PADRAO_DOCUMENTOS_IS: AjustesDocumentosIS = {
  solicitacaoExames: {
    titulo: 'SOLICITAÇÃO DE EXAMES COMPLEMENTARES PERICIAIS',
    solicito: 'SOLICITO:',
    instrucoes: '',
    observacao: '',
  },
  declaracaoComparecimento: {
    titulo: 'DECLARAÇÃO DE COMPARECIMENTO',
    corpo: 'Declaro para os devidos fins e a quem possa interessar que o {{INSPECIONADO}} esteve nesta Junta Regular em {{DATA}} das {{HORA_CHEGADA}} às {{HORA_SAIDA}} para atividades relacionadas à Inspeção de Saúde.',
    observacao: '',
  },
  termoRecurso: {
    titulo: 'IS {{Finalidade}}',
    tituloBeneficios: 'IS para Concessão de Benefício',
    avisosVerificacoes: [
      'Prazos para recursos à JSD para militares da ativa: até 45 dias a contar da data da comunicação do laudo pela JRS (data de assinatura deste termo).',
      'O recurso deve ser feito através de requerimento dirigido ao Titular do SDP, via Titular da OM do Militar.',
      AVISO_DOCS, AVISO_NOVA,
    ].join('\n'),
    avisosBeneficios: [
      'Prazos para recursos à JSD: até 45 dias a contar da data da comunicação do laudo pela JRS (data de assinatura deste termo ou do envio do e-mail informando o resultado).',
      'O recurso deve ser feito através de requerimento junto à Capitania dos Portos do estado do inspecionado.',
      AVISO_DOCS, AVISO_NOVA,
    ].join('\n'),
  },
  papeletaDispensa: {
    titulo: 'PAPELETA DE DISPENSA',
    subtitulo: '(DGPM-406 ANEXO I)',
    observacoes: [
      'a) As dispensas na presente papeleta não deverão exceder vinte dias, podendo ser prorrogadas por mais dez dias, mediante preenchimento de nova papeleta; e',
      'b) Os períodos de afastamento do serviço nos casos de doenças infectoparasitárias deverão ser orientados pela clínica especializada.',
    ].join('\n'),
    paragrafosEmail: [
      'Segue em anexo a Papeleta de Dispensa de {{dias}} referente à IS nº {{is}} fim {{finalidade}}.',
      'ATENÇÃO: a papeleta anexa é apenas uma cópia sem assinatura digital, para simples conferência. A via original, assinada, deve ser entregue pelo inspecionado na Divisão de Pessoal da sua OM.',
    ].join('\n'),
  },
  laudoPericial: {
    titulo: 'LAUDO PERICIAL',
    obs1: '1- O laudo deverá ser fundamentado com exposição das observações, estudos, exames efetuados, registros das conclusões e emitido por SERVIÇO MÉDICO OFICIAL da União, dos Estados, do Distrito Federal ou dos Municípios.',
    obs2: '2 – Moléstias relacionadas no inciso XIV do art. 6° da Lei n° 7.713/88, e no § 2° do art. 30 da Lei n° 9.250/95:',
    rotuloCarimbo: 'CARIMBO DE IDENTIFICAÇÃO DO SERVIÇO MÉDICO OFICIAL',
    rotuloAssinatura: '',
  },
};

/** Rótulo, ajuda e se é texto longo, por chave (tela de ajustes). */
export const CAMPOS_AJUSTES_DOCUMENTOS_IS: { [T in TipoDocumentoIS]: Campo[] } = {
  solicitacaoExames: [
    { chave: 'titulo', rotulo: 'Título' },
    { chave: 'solicito', rotulo: 'Rótulo acima da lista' },
    { chave: 'instrucoes', rotulo: 'Instruções ao inspecionado (opcional)', longo: true },
    { chave: 'observacao', rotulo: 'Observação (opcional)', longo: true },
  ],
  declaracaoComparecimento: [
    { chave: 'titulo', rotulo: 'Título' },
    { chave: 'corpo', rotulo: 'Corpo', longo: true, ajuda: '{{INSPECIONADO}} {{DATA}} {{HORA_CHEGADA}} {{HORA_SAIDA}}' },
    { chave: 'observacao', rotulo: 'Observação (opcional)', longo: true },
  ],
  termoRecurso: [
    { chave: 'titulo', rotulo: 'Título — Verificações e Términos', ajuda: '{{Finalidade}}' },
    { chave: 'tituloBeneficios', rotulo: 'Título — Benefícios' },
    { chave: 'avisosVerificacoes', rotulo: 'Avisos — Verificações e Términos (um por linha)', longo: true },
    { chave: 'avisosBeneficios', rotulo: 'Avisos — Benefícios (um por linha)', longo: true },
  ],
  papeletaDispensa: [
    { chave: 'titulo', rotulo: 'Título (1ª linha)' },
    { chave: 'subtitulo', rotulo: 'Título (2ª linha)' },
    { chave: 'observacoes', rotulo: 'OBS. (uma por linha)', longo: true },
    { chave: 'paragrafosEmail', rotulo: 'Parágrafos do e-mail (um por linha)', longo: true, ajuda: '{{dias}} {{is}} {{finalidade}}' },
  ],
  laudoPericial: [
    { chave: 'titulo', rotulo: 'Título' },
    { chave: 'obs1', rotulo: 'Preenchimento obrigatório — item 1', longo: true },
    { chave: 'obs2', rotulo: 'Preenchimento obrigatório — item 2', longo: true },
    { chave: 'rotuloCarimbo', rotulo: 'Legenda do carimbo' },
    { chave: 'rotuloAssinatura', rotulo: 'Legenda sob a assinatura (opcional)' },
  ],
};

/** Ajustes do tipo com os padrões (valores não-string ou vazios caem no padrão). */
export const ajustesDocumentoIS = <T extends TipoDocumentoIS>(tipo: T, cru: unknown): AjustesDocumentosIS[T] => {
  const padrao = AJUSTES_PADRAO_DOCUMENTOS_IS[tipo] as unknown as Record<string, string>;
  const x = (cru && typeof cru === 'object' ? cru : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of Object.keys(padrao)) {
    const v = x[k];
    out[k] = typeof v === 'string' && v.trim() ? v : padrao[k];
  }
  // observacao pode ser deliberadamente vazia: o padrão já é ''.
  return out as unknown as AjustesDocumentosIS[T];
};

/** Substitui {{chave}} pelos valores (chave desconhecida vira ''). Não escapa HTML: o gerador escapa os valores. */
export const preencherModelo = (modelo: string, valores: Record<string, string | number | null | undefined>): string =>
  modelo.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => (valores[k] ?? '').toString());
