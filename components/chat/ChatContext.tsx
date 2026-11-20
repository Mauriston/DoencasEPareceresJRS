// Ficheiro: components/chat/ChatContext.tsx
// Estado do Chat compartilhado pelo shell (badge no avatar e no item "Chat" do UserMenu, banner de nova
// mensagem) e pela página do Chat: permissões do perfil (config/chat), conversas do usuário, usuários que
// podem receber, presença (heartbeat) e a conversa aberta no momento.
//
// Presença: heartbeat no Firestore (presenca/{uid}.ultimaAtividade a cada ~60 s; online se < 2 min — utils/chat.ts).
// Escolhido no lugar do Realtime Database com onDisconnect porque o app só usa Firestore (sem RTDB criado,
// sem regras nem SDK a mais no bundle); a imprecisão de até ~2 min ao fechar o app é aceitável para um aviso
// visual, e o envio nunca depende da presença (a mensagem fica gravada e o push avisa).
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../../context/NavContext';
import { listUsuarios, type UsuarioRecord } from '../../services/firestoreUsuarios';
import { observarConfigChat, observarConversas, observarPresenca, registrarAtividade, type ConversaChat } from '../../services/chat';
import { INTERVALO_HEARTBEAT_MS, estaOnline, permissaoChat, totalNaoLidas, usaChat, type MatrizChat, type PermissaoChat } from '../../utils/chat';

export interface ChatEstado {
  ativo: boolean;
  permissao: PermissaoChat;
  matriz: MatrizChat | null;
  conversas: ConversaChat[];
  naoLidas: number;
  usuarios: UsuarioRecord[];
  /** Usuários ativos que podem receber chat (sem o próprio). */
  destinatarios: UsuarioRecord[];
  online: (uid: string) => boolean;
  conversaAberta: string | null;
  setConversaAberta: (id: string | null) => void;
}

const SEM_PERMISSAO: PermissaoChat = { enviar: false, receber: false, anexos: false };
const ChatCtx = createContext<ChatEstado | null>(null);
export const useChat = (): ChatEstado | null => useContext(ChatCtx);

export const ChatProvider: React.FC<{ authUser: AuthUser | null; children: React.ReactNode }> = ({ authUser, children }) => {
  const uid = authUser?.uid || '';
  const [matriz, setMatriz] = useState<MatrizChat | null>(null);
  const [conversas, setConversas] = useState<ConversaChat[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioRecord[]>([]);
  const [presenca, setPresenca] = useState<Record<string, number>>({});
  const [agora, setAgora] = useState(() => Date.now());
  const [conversaAberta, setConversaAberta] = useState<string | null>(null);

  useEffect(() => (uid ? observarConfigChat(setMatriz) : undefined), [uid]);
  const permissao = useMemo(() => (uid ? permissaoChat(matriz, authUser?.perfil) : SEM_PERMISSAO), [uid, matriz, authUser?.perfil]);
  const ativo = !!uid && usaChat(permissao);

  useEffect(() => {
    if (!ativo) { setConversas([]); return; }
    return observarConversas(uid, setConversas, () => setConversas([]));
  }, [ativo, uid]);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    listUsuarios().then(u => { if (vivo) setUsuarios(u); }).catch(() => {});
    const parar = observarPresenca(setPresenca);
    return () => { vivo = false; parar(); };
  }, [ativo]);

  // Heartbeat: só com a aba visível (aba em segundo plano deixa de contar como online em ~2 min).
  useEffect(() => {
    if (!ativo) return;
    const bater = () => { if (document.visibilityState === 'visible') registrarAtividade(uid).catch(() => {}); };
    bater();
    const t = window.setInterval(() => { bater(); setAgora(Date.now()); }, INTERVALO_HEARTBEAT_MS);
    const vis = () => { bater(); setAgora(Date.now()); };
    document.addEventListener('visibilitychange', vis);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [ativo, uid]);

  const valor = useMemo<ChatEstado>(() => ({
    ativo,
    permissao,
    matriz,
    conversas,
    naoLidas: ativo ? totalNaoLidas(conversas, uid) : 0,
    usuarios,
    destinatarios: usuarios
      .filter(u => u.id !== uid && u.ativo !== false && permissaoChat(matriz, u.perfil).receber)
      .sort((a, b) => (a.usuario || '').localeCompare(b.usuario || '', 'pt-BR')),
    online: (id: string) => estaOnline(presenca[id], agora),
    conversaAberta,
    setConversaAberta,
  }), [ativo, permissao, matriz, conversas, uid, usuarios, presenca, agora, conversaAberta]);

  return <ChatCtx.Provider value={valor}>{children}</ChatCtx.Provider>;
};

/** Bolinha verde de "online" (com texto para leitor de tela). */
export const BolinhaOnline: React.FC<{ online: boolean; className?: string }> = ({ online, className = '' }) =>
  online ? (
    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-600 ring-2 ring-white ${className}`}>
      <span className="sr-only">online</span>
    </span>
  ) : null;
