// Ficheiro: utils/chat.ts
// Regras puras do Chat entre usuários (sem Firebase): permissões por perfil, id da conversa, validação de
// anexos, texto do aviso (banner/push), presença por heartbeat, retenção dos anexos (LGPD) e não lidas.
// Usadas pelo app (components/Chat.tsx, components/chat/, services/chat.ts) e pelo servidor (server.ts,
// servidor/chat/). Os mesmos limites estão em firestore.rules e storage.rules — ao mudar aqui, mude lá.

// ---- Permissões por perfil (config/chat, editada em Administração › Chat) ----
export type PerfilChat = 'admin' | 'user_medicos' | 'user_medicos_mpi' | 'user_medicos_geral' | 'user_secretaria';
export type ChavePermissaoChat = 'enviar' | 'receber' | 'anexos';
export interface PermissaoChat { enviar: boolean; receber: boolean; anexos: boolean }
export type MatrizChat = Partial<Record<string, Partial<PermissaoChat>>>;

export const PERFIS_CHAT: { id: PerfilChat; rotulo: string }[] = [
  { id: 'admin', rotulo: 'Administrador' },
  { id: 'user_medicos', rotulo: 'User Médicos' },
  { id: 'user_medicos_mpi', rotulo: 'User Médicos MPI' },
  { id: 'user_medicos_geral', rotulo: 'User Médicos Geral' },
  { id: 'user_secretaria', rotulo: 'User Secretaria' },
];

export const CHAVES_CHAT: { id: ChavePermissaoChat; rotulo: string }[] = [
  { id: 'enviar', rotulo: 'Enviar chat' },
  { id: 'receber', rotulo: 'Receber chat' },
  { id: 'anexos', rotulo: 'Enviar anexos' },
];

/** Padrão quando o Admin ainda não mexeu na célula: tudo liberado (firestore.rules/storage.rules usam o mesmo `true`). */
export const PADRAO_CHAT: PermissaoChat = { enviar: true, receber: true, anexos: true };

/** Permissão efetiva de um perfil. Perfil desconhecido (ou sem perfil) não usa o chat. */
export const permissaoChat = (matriz: MatrizChat | null | undefined, perfil: string | undefined | null): PermissaoChat => {
  if (!perfil || !PERFIS_CHAT.some(p => p.id === perfil)) return { enviar: false, receber: false, anexos: false };
  const c = matriz?.[perfil] || {};
  const enviar = c.enviar ?? PADRAO_CHAT.enviar;
  return {
    enviar,
    receber: c.receber ?? PADRAO_CHAT.receber,
    // Anexo é uma forma de enviar: sem "enviar", não há anexo.
    anexos: enviar && (c.anexos ?? PADRAO_CHAT.anexos),
  };
};

/** O Chat aparece (menu do avatar, banner) para quem pode enviar ou receber. */
export const usaChat = (p: PermissaoChat): boolean => p.enviar || p.receber;

/** Matriz completa (todos os perfis × chaves) para a tela do Admin. */
export const matrizCompleta = (matriz: MatrizChat | null | undefined): Record<PerfilChat, PermissaoChat> =>
  Object.fromEntries(PERFIS_CHAT.map(p => {
    const c = matriz?.[p.id] || {};
    return [p.id, { enviar: c.enviar ?? true, receber: c.receber ?? true, anexos: c.anexos ?? true }];
  })) as Record<PerfilChat, PermissaoChat>;

// ---- Conversa ----
/** Id determinístico da conversa um a um: os dois uids em ordem, separados por "_" (as regras conferem). */
export const idConversa = (a: string, b: string): string => (a < b ? `${a}_${b}` : `${b}_${a}`);
export const participantesDe = (conversaId: string): string[] => conversaId.split('_');
export const outroParticipante = (conversaId: string, uid: string): string => participantesDe(conversaId).find(p => p !== uid) || '';

export const TEXTO_MAX = 4000;

// ---- Anexos ----
export const TAMANHO_MAX_ANEXO = 10 * 1024 * 1024; // 10 MB (storage.rules)
export const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const TIPOS_ANEXO = [...TIPOS_IMAGEM, 'application/pdf'] as const;
export const ACCEPT_ANEXO = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

export type TipoAnexo = 'imagem' | 'pdf';
export const tipoAnexo = (mime: string): TipoAnexo | null =>
  (TIPOS_IMAGEM as readonly string[]).includes(mime) ? 'imagem' : mime === 'application/pdf' ? 'pdf' : null;

/** Mensagem de erro para o usuário, ou null se o arquivo pode ser enviado. */
export const validarAnexo = (arq: { type: string; size: number }): string | null => {
  if (!tipoAnexo(arq.type)) return 'Envie só PDF ou imagem (JPG, PNG ou WEBP).';
  if (arq.size <= 0) return 'O arquivo está vazio.';
  if (arq.size > TAMANHO_MAX_ANEXO) return 'O arquivo passa de 10 MB.';
  return null;
};

/** Nome seguro para o caminho no Storage (conversas/{id}/{ts}_{nome}). */
export const nomeArquivoSeguro = (nome: string): string => {
  const limpo = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^[_.]+/, '');
  return (limpo || 'arquivo').slice(-80);
};

export const tamanhoLegivel = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// ---- Aviso de nova mensagem (banner e push) ----
export type TipoMensagem = 'texto' | 'imagem' | 'arquivo';
export const tipoMensagem = (anexoTipo: TipoAnexo | null | undefined): TipoMensagem =>
  anexoTipo === 'imagem' ? 'imagem' : anexoTipo === 'pdf' ? 'arquivo' : 'texto';

export const textoAviso = (nome: string, tipo: TipoMensagem): string => {
  const quem = nome.trim() || 'Alguém';
  const oque = tipo === 'imagem' ? 'uma imagem' : tipo === 'arquivo' ? 'um arquivo' : 'uma mensagem';
  return `${quem} lhe mandou ${oque} no chat.`;
};

/** Prévia curta da última mensagem (lista de conversas). */
export const previaMensagem = (texto: string, tipo: TipoMensagem): string => {
  const t = texto.replace(/\s+/g, ' ').trim();
  if (t) return t.length > 80 ? `${t.slice(0, 79)}…` : t;
  return tipo === 'imagem' ? 'Imagem' : tipo === 'arquivo' ? 'Arquivo PDF' : '';
};

export interface ConversaResumo {
  id: string;
  naoLidas?: Record<string, number>;
  ultimaMensagem?: { autor: string; tipo: TipoMensagem; emMs: number } | null;
}

export const naoLidasDe = (c: ConversaResumo, uid: string): number => Math.max(0, c.naoLidas?.[uid] || 0);
export const totalNaoLidas = (conversas: ConversaResumo[], uid: string): number =>
  conversas.reduce((s, c) => s + naoLidasDe(c, uid), 0);

/** Chave do banner fechado no X: volta a aparecer quando chegar mensagem mais nova. */
export const chaveBanner = (c: ConversaResumo): string => `${c.id}:${c.ultimaMensagem?.emMs || 0}`;

/** Um banner por conversa com mensagens novas do outro, menos a conversa aberta e as fechadas no X. */
export const conversasComBanner = <T extends ConversaResumo>(conversas: T[], uid: string, conversaAberta: string | null, fechados: Set<string>): T[] =>
  conversas.filter(c =>
    naoLidasDe(c, uid) > 0 && !!c.ultimaMensagem && c.ultimaMensagem.autor !== uid &&
    c.id !== conversaAberta && !fechados.has(chaveBanner(c)));

// ---- Presença (heartbeat no Firestore: presenca/{uid}.ultimaAtividade) ----
export const INTERVALO_HEARTBEAT_MS = 60_000;
export const JANELA_ONLINE_MS = 2 * 60_000;
export const estaOnline = (ultimaAtividadeMs: number | null | undefined, agoraMs: number): boolean =>
  !!ultimaAtividadeMs && agoraMs - ultimaAtividadeMs < JANELA_ONLINE_MS && ultimaAtividadeMs - agoraMs < JANELA_ONLINE_MS;

// ---- Retenção dos anexos (LGPD; docs/retencao-lgpd.md) ----
export const DIAS_RETENCAO_ANEXO = 7;
const DIA_MS = 24 * 60 * 60 * 1000;
/** Anexos enviados até este instante já venceram. */
export const limiteRetencaoAnexo = (agoraMs: number): number => agoraMs - DIAS_RETENCAO_ANEXO * DIA_MS;
export const anexoVencido = (enviadoEmMs: number, agoraMs: number): boolean => enviadoEmMs <= limiteRetencaoAnexo(agoraMs);
/** Quando o anexo será apagado (mostrado na conversa). */
export const expiraEm = (enviadoEmMs: number): number => enviadoEmMs + DIAS_RETENCAO_ANEXO * DIA_MS;

// ---- Recibo de leitura ----
export type SituacaoEntrega = 'enviando' | 'enviada' | 'lida';
export const situacaoEntrega = (m: { pendente?: boolean; lidaPor?: string[] }, destinatario: string): SituacaoEntrega =>
  m.pendente ? 'enviando' : (m.lidaPor || []).includes(destinatario) ? 'lida' : 'enviada';
