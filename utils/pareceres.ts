// Ficheiro: utils/pareceres.ts
// Regras puras dos Pedidos de Parecer (sem Firebase), usadas pelo app e pelo servidor:
//  - assinanteDoPedido: quem assina o pedido gerado no servidor (servidor/documentos/pedidoParecerServico.ts) —
//    o médico para quem a IS está agendada (peritoUid da IS); se quem gera for médico, os dados de quem gera;
//  - caminhos no Firebase Storage (pareceres/{id}.pdf e a resposta, pareceres/{id}-resposta.pdf) e a URL de
//    download do Storage (com token), o mesmo formato de getDownloadURL;
//  - pedidosPendentes: pedidos ainda sem resposta (escolha do pedido em "Resposta de Parecer");
//  - modoCriarParecer: o "?criar=" da aba Pareceres da Ficha do inspecionado (contrato de navegação:
//    ?aba=pareceres&criar=pedido|resposta&is=<isId>).

/** Perfis médicos que assinam pedidos com os próprios dados (o Admin assina se tiver CRM cadastrado). */
export const PERFIS_MEDICOS_ASSINANTES = ['user_medicos', 'user_medicos_mpi'] as const;

export interface DadosAssinante {
  uid: string;
  perfil?: string;
  nome?: string;
  postoGraduacao?: string;
  cargo?: string;
  crmPe?: string;
  rqe?: string;
}

/** Quem gera é médico (perfil médico ou com CRM cadastrado)? */
export const ehMedicoAssinante = (u: Pick<DadosAssinante, 'perfil' | 'crmPe'> | null | undefined): boolean =>
  !!u && (!!String(u.crmPe ?? '').trim() || (PERFIS_MEDICOS_ASSINANTES as readonly string[]).includes(String(u.perfil ?? '')));

/**
 * Assinatura do pedido: a do médico para quem a IS está agendada (perito); se quem gera for (outro) médico,
 * a de quem gera. Sem perito (pedido fora de uma IS, IS sem agendamento), sempre quem gera.
 */
export const assinanteDoPedido = (
  gerador: DadosAssinante, perito: DadosAssinante | null | undefined,
): { assinante: DadosAssinante; origem: 'gerador' | 'perito' } => {
  if (perito && perito.uid !== gerador.uid && !ehMedicoAssinante(gerador)) return { assinante: perito, origem: 'perito' };
  return { assinante: gerador, origem: 'gerador' };
};

/** Id de pedido/arquivo aceito nos caminhos (UUID ou id do Firestore: letras, dígitos, "-" e "_"). */
export const idParecerValido = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);

export const caminhoPedidoParecer = (id: string) => `pareceres/${id}.pdf`;
export const caminhoRespostaParecer = (id: string) => `pareceres/${id}-resposta.pdf`;

/** URL de download do Firebase Storage com token (o formato que getDownloadURL devolve). */
export const urlDownloadStorage = (bucket: string, caminho: string, token: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(caminho)}?alt=media&token=${encodeURIComponent(token)}`;

/** Pedidos ainda sem resposta (status "solicitado"), do mais antigo para o mais recente; com isId, só os daquela IS. */
export const pedidosPendentes = <P extends { id: string; status: string; isId?: string; resposta?: unknown; criadoEm?: { toMillis?: () => number } | null }>(
  pareceres: ReadonlyArray<P>, isId?: string | null,
): P[] => pareceres
  .filter(p => p.status !== 'concluido' && !p.resposta && (!isId || p.isId === isId))
  .sort((a, b) => (a.criadoEm?.toMillis?.() ?? Number.MAX_SAFE_INTEGER) - (b.criadoEm?.toMillis?.() ?? Number.MAX_SAFE_INTEGER));

export type ModoCriarParecer = 'pedido' | 'resposta';

/** "?criar=" da aba Pareceres: só vale nesta aba e com um dos dois valores. */
export const modoCriarParecer = (aba: string | null | undefined, criar: string | null | undefined): ModoCriarParecer | null =>
  aba === 'pareceres' && (criar === 'pedido' || criar === 'resposta') ? criar : null;
