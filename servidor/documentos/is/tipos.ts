// Ficheiro: servidor/documentos/is/tipos.ts
// Contrato dos documentos gerados a partir de uma IS ("Gerar Documento ▾" da Ficha do inspecionado):
// cada tipo tem UM arquivo nesta pasta (solicitacaoExames.ts, declaracaoComparecimento.ts, termoRecurso.ts,
// papeletaDispensa.ts, laudoPericial.ts) que exporta um GeradorDocumentoIS; registro.ts os junta e servico.ts
// faz o resto (IS, assinante, PDF, Storage, Firestore, e-mail). Rota: POST /api/inspecoes/documentos/gerar.
import type { Firestore } from 'firebase-admin/firestore';
import type { DocumentoPaginado } from '../paginado';
import type { TipoDocumentoIS } from '../../../utils/documentosIS';

export type { TipoDocumentoIS };

/** Erro de validação: vira 400/403/404 na rota, com a mensagem para o usuário. */
export class ErroDocumentoIS extends Error {
  constructor(public status: 400 | 403 | 404, message: string) { super(message); }
}

/** IS como está no Firestore (inspecoes/{id}); só o que os geradores costumam usar (o resto vem em `bruto`). */
export interface ISDocumento {
  id: string;
  is: number | string;
  inspecionado: string;
  inspecionadoId: string;
  finalidade: string;
  grupoFinalidade: string;
  situacao: string;
  status: string;
  /** AAAA-MM-DDThh:mm ou ''. */
  dataEntrevista: string;
  dataLaudo: string;
  laudo: string;
  peritoUid: string;
  bruto: Record<string, unknown>;
}

/** Cadastro do inspecionado (militares/{inspecionadoId}); `null` sem cadastro. */
export type MilitarDocumento = (Record<string, unknown> & { email?: string; emailPessoal?: string; om?: string; cpf?: string; nome?: string }) | null;

/** Quem assina o documento. `rubrica`: apor a rubrica do Presidente sobre o bloco (Admin/Presidente). */
export interface AssinanteDocumento {
  uid: string;
  nome: string;
  postoGraduacao: string;
  cargo: string;
  crmPe: string;
  rqe: string;
  rubrica: boolean;
  origem: 'gerador' | 'presidente';
}

export interface ContextoDocumentoIS {
  db: Firestore;
  /** uid e perfil de quem gerou. */
  uid: string;
  perfil: string;
  is: ISDocumento;
  militar: MilitarDocumento;
  assinante: AssinanteDocumento;
  agora: Date;
  /** Modo teste (Admin › ajustes dos templates): IS/inspecionado fictícios, sem regras, sem e-mail nem registro. */
  teste: boolean;
  /** Ajustes do template deste tipo (Firestore config/documentosIS → campo {tipo}); {} sem ajustes. */
  ajustes: Record<string, unknown>;
}

/** Ajustes do e-mail ao inspecionado, por tipo (todos opcionais; o padrão está em email.ts). */
export interface AjusteEmailDocumento {
  assunto?: string;
  /** Parágrafos (texto simples) do corpo, depois do vocativo. Padrão: "Segue em anexo o {título}…". */
  paragrafos?: string[];
  /** Cópias além das fixas (config/emails, tipo documentoIS). */
  cc?: string[];
  /** Destinatários além do inspecionado. */
  para?: string[];
}

export interface GeradorDocumentoIS<D = Record<string, unknown>> {
  tipo: TipoDocumentoIS;
  /** Título do documento (lista, e-mail, nome do arquivo). */
  titulo: string;
  /** Perfis que podem gerar (conferido no servidor). */
  perfis: readonly string[];
  /** 'gerador' = quem gerou assina (rubrica se Admin); 'presidente' = sempre o Presidente com rubrica. */
  assinante: 'gerador' | 'presidente';
  /** Valida a IS (finalidade, situação…) e os dados do formulário; lança ErroDocumentoIS. Devolve os dados limpos. */
  validar: (dados: Record<string, unknown>, ctx: Omit<ContextoDocumentoIS, 'assinante'>) => D | Promise<D>;
  /** HTML (ou documento paginado) para htmlParaPdf. */
  gerarHtml: (dados: D, ctx: ContextoDocumentoIS) => string | DocumentoPaginado | Promise<string | DocumentoPaginado>;
  /** Ajustes do e-mail ao inspecionado (CC extra, corpo…). */
  email?: (dados: D, ctx: ContextoDocumentoIS) => AjusteEmailDocumento | Promise<AjusteEmailDocumento>;
  /** Depois de salvo (ex.: tirar a tag "LAUDO PERICIAL PENDENTE"). Erros aqui não desfazem o documento. */
  aposGerar?: (dados: D, ctx: ContextoDocumentoIS, salvo: DocumentoISSalvo) => Promise<void>;
  /** Dados aleatórios do formulário para o modo teste (padrão: validar({}) ). */
  dadosTeste?: (ctx: Omit<ContextoDocumentoIS, 'assinante'>) => D;
  /** Resumo curto guardado no registro (ex.: "5 dias"), opcional. */
  resumo?: (dados: D, ctx: ContextoDocumentoIS) => string;
}

/** O que a rota devolve (e o registro inspecoes/{isId}/documentos/{id} guarda, mais criadoEm). */
export interface DocumentoISSalvo {
  id: string;
  tipo: TipoDocumentoIS;
  titulo: string;
  caminho: string;
  pdfUrl: string;
  assinante: { uid: string; nome: string; origem: 'gerador' | 'presidente' };
  emailEnviado: boolean;
  emailPara?: string[];
  /** Mensagem quando o e-mail foi pedido mas não saiu (o documento foi gerado mesmo assim). */
  erroEmail?: string;
}
