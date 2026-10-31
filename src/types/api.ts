/**
 * Envelope de resposta unificado para as APIs do sistema (Apps Script e Servidor Node).
 * 
 * O apiClient.ts consome este envelope, extrai o conteúdo de sucesso e lança
 * um ApiError tipado em caso de erro, por isso as funções de serviço geralmente
 * retornam apenas o tipo T diretamente.
 */
export interface ApiResponse<T = any> {
  // Padrão Apps Script (Config.gs / ResponseUtils.gs)
  sucesso?: boolean;
  dados?: T;
  erro?: string;

  // Padrão Servidor Node (server.ts) e Legado Gemini (GeminiService.gs)
  success?: boolean;
  data?: T;
  message?: string; // Usado no erro legado
  error?: string;   // Usado no erro do servidor Node
}

export interface AtestadoDTO {
  action: 'extrair_dados_atestado';
  base64Image: string;
}

export interface MinutaMensagemDTO {
  action: 'gerarMinutaMensagem';
  images: Array<{ mimeType?: string; data: string }>;
}

export interface ConcursoBaseDTO {
  idToken: string;
  ano: string;
  nomeConcurso: string;
}

export interface SalvarPdfCandidatoDTO extends ConcursoBaseDTO {
  action: 'salvarPdfCandidato';
  candidatoId: string;
  candidatoNome: string;
  tipoDocumento: string;
  pdfBase64: string;
}

export interface SalvarExamesCandidatoDTO extends ConcursoBaseDTO {
  action: 'salvarExamesCandidato';
  candidatoId?: string; // opcional para alguns fluxos
  candidatoNome: string;
  pdfBase64: string;
  mimeType: string;
}

export interface SolicitarParecerDTO {
  action: 'gerarSolicitacaoParecer' | 'gerarPedidoParecer';
  candidatoId?: string;
  candidatoNome?: string;
  nomeConcurso?: string;
  especialidade: string;
  historico: string;
  nomeUsuario: string;
  postoGraduacao: string;
  cargo: string;
  crmPe: string;
  email?: string;
  inspecionado?: string;
  finalidade?: string;
  quesitos?: string[];
}
