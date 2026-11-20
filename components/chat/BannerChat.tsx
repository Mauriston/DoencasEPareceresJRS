// Ficheiro: components/chat/BannerChat.tsx
// Aviso flutuante de nova mensagem do Chat, no padrão do banner de aniversariantes
// (components/shell/BannerAniversariantes.tsx): um por conversa com mensagens novas do outro, com o texto
// conforme o tipo (mensagem, arquivo ou imagem — utils/chat.ts → textoAviso) e "Abrir chat". Some ao abrir
// a conversa (as não lidas zeram) ou ao fechar no X (volta só se chegar mensagem mais nova); não aparece
// para a conversa que já está aberta.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from './ChatContext';
import { chaveBanner, conversasComBanner, outroParticipante, textoAviso } from '../../utils/chat';
import { chatPath } from '../../config/routes';

const CHAVE_LOCAL = 'chat-banner-fechados';
const lerFechados = (): Set<string> => {
  try { return new Set<string>(JSON.parse(sessionStorage.getItem(CHAVE_LOCAL) || '[]')); } catch { return new Set(); }
};
const gravarFechados = (s: Set<string>) => {
  try { sessionStorage.setItem(CHAVE_LOCAL, JSON.stringify([...s].slice(-100))); } catch { /* só nesta tela */ }
};

export const BannerChat: React.FC<{ uid: string }> = ({ uid }) => {
  const chat = useChat();
  const navigate = useNavigate();
  const [fechados, setFechados] = useState<Set<string>>(lerFechados);

  const banners = useMemo(
    () => (chat?.ativo ? conversasComBanner(chat.conversas, uid, chat.conversaAberta, fechados) : []),
    [chat?.ativo, chat?.conversas, chat?.conversaAberta, uid, fechados],
  );
  if (!chat || !banners.length) return null;

  const fechar = (chave: string) => {
    const s = new Set<string>(fechados).add(chave);
    gravarFechados(s);
    setFechados(s);
  };

  return (
    <>
      {banners.map(c => {
        const outro = chat.usuarios.find(u => u.id === outroParticipante(c.id, uid));
        const nome = outro?.usuario || outro?.nome || 'Um usuário';
        const texto = textoAviso(nome, c.ultimaMensagem!.tipo);
        const icone = c.ultimaMensagem!.tipo === 'imagem' ? 'image' : c.ultimaMensagem!.tipo === 'arquivo' ? 'attach_file' : 'chat';
        const chave = chaveBanner(c);
        return (
          <section
            key={c.id}
            aria-label="Nova mensagem no chat"
            className="pointer-events-auto w-full max-w-5xl flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 p-2 rounded-xl bg-navy text-white shadow-lg animate-fade-in"
          >
            <span className="w-10 h-10 shrink-0 rounded-lg bg-white/15 flex items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined text-[22px] text-gold">{icone}</span>
            </span>
            <p className="flex-1 min-w-0 text-sm leading-snug font-bold">{texto}</p>
            <button
              type="button"
              onClick={() => fechar(chave)}
              aria-label={`Fechar o aviso da mensagem de ${nome}`}
              className="order-2 sm:order-3 w-11 h-11 shrink-0 rounded-lg inline-flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(chatPath(c.id))}
              className="order-3 sm:order-2 basis-full sm:basis-auto inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-white text-navy text-sm font-bold hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">forum</span>
              Abrir chat
            </button>
          </section>
        );
      })}
    </>
  );
};
