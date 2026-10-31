// Ficheiro: types/api.ts

export interface ApiResponse<T = any> {
  sucesso: boolean; // Usado pelo script legados
  success?: boolean; // Algumas respostas usavam success, outras sucesso
  dados?: T;
  data?: T;
  erro?: string;
  message?: string;
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
