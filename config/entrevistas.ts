// Ficheiro: config/entrevistas.ts
// Contrato compartilhado (app + servidor) da GRAVAÇÃO DA ENTREVISTA da IS:
// o perito grava a entrevista pelo CELULAR, o servidor transcreve com separação de falantes
// (Speech-to-Text, Chirp 3) e organiza a anamnese pericial (Gemini, Vertex AI); o resultado
// fica no Firestore em `inspecoes/{isId}/entrevistas/{entrevistaId}`.
//
// Regras do negócio (decisões do Presidente da JRS, 08/11/2026):
//  - só Admin e `user_medicos` (membros da junta) gravam, leem e revisam — e TODOS eles veem as
//    entrevistas de qualquer IS (a junta trabalha em conjunto);
//  - gravação SÓ no celular (os PCs do HNRe não têm microfone); no computador, QR para abrir no celular;
//  - o áudio fica no Storage (`entrevistas/{isId}/{entrevistaId}/…`) e é apagado 90 dias após a
//    entrevista (regra de ciclo de vida do bucket); nenhum PDF é gerado: o resultado vive no Firestore;
//  - processamento pode ser nos EUA (região do Chirp 3).

/** Perfis com acesso à funcionalidade (espelhado em firestore.rules, storage.rules e server.ts). */
export const PERFIS_ENTREVISTA = ['admin', 'user_medicos'] as const;
export const podeUsarEntrevista = (perfil: unknown): boolean => (PERFIS_ENTREVISTA as readonly string[]).includes(String(perfil || ''));

export const MAX_PARTICIPANTES = 4;
export const MIN_PARTICIPANTES = 2;
/** Duração máxima de uma gravação (as entrevistas duram 20–25 min). */
export const MAX_DURACAO_SEG = 60 * 60;
/** Tamanho máximo do áudio enviado (Opus/AAC de 60 min fica bem abaixo disso). */
export const MAX_BYTES_AUDIO = 80 * 1024 * 1024;
/** O áudio é apagado do Storage 90 dias após a entrevista (ciclo de vida do bucket). */
export const DIAS_RETENCAO_AUDIO = 90;
/** Pasta do Storage: entrevistas/{isId}/{entrevistaId}/original.{ext} (enviado pelo celular) e audio.flac (convertido pelo servidor). */
export const caminhoAudioOriginal = (isId: string, entrevistaId: string, ext: string) => `entrevistas/${isId}/${entrevistaId}/original.${ext}`;

export type PapelParticipante = 'perito' | 'inspecionado' | 'membro_junta' | 'acompanhante' | 'outro';
export const ROTULO_PAPEL: Record<PapelParticipante, string> = {
  perito: 'Perito', inspecionado: 'Inspecionado', membro_junta: 'Membro da junta', acompanhante: 'Acompanhante', outro: 'Outro',
};
export interface ParticipanteEntrevista { nome: string; papel: PapelParticipante }

/**
 * Ciclo de vida:
 *  aguardando_envio (app criou o doc e está gravando/enviando)
 *  → transcrevendo (servidor converteu o áudio e iniciou o Speech-to-Text)
 *  → organizando (transcrição pronta; Gemini organizando a anamnese)
 *  → pronta (resultado disponível) | erro (mensagem em `erro`; pode reprocessar).
 */
export type SituacaoEntrevista = 'aguardando_envio' | 'transcrevendo' | 'organizando' | 'pronta' | 'erro';
export const ROTULO_SITUACAO: Record<SituacaoEntrevista, string> = {
  aguardando_envio: 'Aguardando envio', transcrevendo: 'Transcrevendo', organizando: 'Organizando', pronta: 'Pronta', erro: 'Erro',
};
export const situacaoEmAndamento = (s: SituacaoEntrevista) => s === 'transcrevendo' || s === 'organizando';

/** Fala da transcrição: `falante` é o rótulo do Speech-to-Text ("F1", "F2"…); o nome vem de `mapaFalantes`. */
export interface FalaTranscrita { falante: string; inicioSeg: number; fimSeg: number; texto: string }

export type FonteInformacao = 'relato_inspecionado' | 'documento_citado' | 'perito' | 'acompanhante' | 'outro';
export interface ItemCronologia {
  /** Quando ocorreu, como dito (ex.: "mar/2024", "há 2 anos", "não referido"). */
  quando: string;
  evento: string;
  fonte: FonteInformacao;
  /** Segundo do áudio onde foi dito (se identificado). */
  tempoSeg?: number;
}
export interface CitacaoLiteral { falante: string; texto: string; tempoSeg: number }

/** Anamnese organizada pela IA, na ordem lógica da anamnese médico-pericial (não emite conclusão pericial). */
export interface AnamneseEntrevista {
  resumoExecutivo: string;
  queixaPrincipal: string;
  alegacoesInspecionado: string[];
  historiaCronologica: ItemCronologia[];
  antecedentes: string[];
  medicacoes: string[];
  tratamentos: string[];
  examesCitados: string[];
  /** Só as limitações que o INSPECIONADO relatou (restrições propostas pelo perito vão em `condutaPerito`). */
  repercussaoFuncional: string;
  /** Seção específica da finalidade da IS: organiza os elementos relevantes, sem juízo nem conclusão. */
  secaoFinalidade: { titulo: string; texto: string };
  /**
   * Conduta e encaminhamentos ditos pelo perito (restrições propostas, prazos, exames/pareceres
   * solicitados, orientações). Ausente em docs antigos: tratar como [].
   */
  condutaPerito: string[];
  pontosAEsclarecer: string[];
  citacoes: CitacaoLiteral[];
}

/**
 * Marcos do processamento (Date.now() do servidor). Reiniciados a cada /processar; `transcricaoIniciada`
 * é sobrescrito quando a transcrição é refeita sem adaptação de frases (`transcricaoRefeita`);
 * `organizacaoConcluida` registra só a primeira organização (o "Reorganizar" não o altera).
 */
export interface TemposEntrevista {
  processamentoIniciado?: number;
  transcricaoIniciada?: number;
  transcricaoConcluida?: number;
  organizacaoConcluida?: number;
  transcricaoRefeita?: boolean;
}

export interface QuemQuando { uid: string; nome: string; em: unknown /* Timestamp do Firestore */ }

/** Documento `inspecoes/{isId}/entrevistas/{entrevistaId}`. */
export interface EntrevistaRecord {
  id: string;
  isId: string;
  participantes: ParticipanteEntrevista[];
  finalidade: string;
  consentimento: QuemQuando;
  criadoPor: QuemQuando;
  situacao: SituacaoEntrevista;
  erro?: string;
  // ---- gravados pelo servidor (Admin SDK) ----
  audio?: { caminho: string; mimeType: string; bytes: number; duracaoSeg: number; apagarApos: string /* AAAA-MM-DD */ };
  operacaoSpeech?: string;
  transcricao?: FalaTranscrita[];
  /** Sugestão da IA (ou confirmação do perito): rótulo do falante → nome do participante. */
  mapaFalantes?: Record<string, string>;
  anamnese?: AnamneseEntrevista;
  modelos?: { speech: string; gemini: string };
  /** Marcos do processamento (ms epoch, só servidor) para medir a duração de cada etapa. */
  tempos?: TemposEntrevista;
  atualizadoEm?: unknown;
  // ---- os ÚNICOS campos que o app atualiza depois de criar (firestore.rules) ----
  falantesConfirmados?: boolean;
  anamneseEditada?: AnamneseEntrevista;
  editadoPor?: QuemQuando;
  revisada?: QuemQuando;
}

/** Campos que o app pode alterar num doc existente (o resto é do servidor). */
export const CAMPOS_EDITAVEIS_APP = ['mapaFalantes', 'falantesConfirmados', 'anamneseEditada', 'editadoPor', 'revisada'] as const;
/** Campos aceitos na criação pelo app. */
export const CAMPOS_CRIACAO_APP = ['isId', 'participantes', 'finalidade', 'consentimento', 'criadoPor', 'situacao'] as const;

// ---------------------------------------------------------------- Rotas do servidor (só Admin e user_medicos)
// POST /api/entrevistas/audio          corpo binário (Content-Type audio/*), cabeçalhos X-Is-Id, X-Entrevista-Id
//                                      → { caminho }   (reserva quando o upload direto ao Storage falhar)
// POST /api/entrevistas/processar      { isId, entrevistaId, caminho, mimeType, duracaoSeg } → { situacao }
// POST /api/entrevistas/situacao       { isId, entrevistaId } → { situacao }  (avança: verifica o Speech; organiza)
// POST /api/entrevistas/reorganizar    { isId, entrevistaId } → { situacao }  (refaz a organização com o mapaFalantes confirmado)
// POST /api/entrevistas/ouvir          { isId, entrevistaId } → áudio (binário), enquanto existir
