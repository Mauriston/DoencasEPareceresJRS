// Ficheiro: components/chat/ListaContatos.tsx
// Lista do Chat: conversas (mais recentes primeiro, com não lidas e prévia) e, abaixo, os demais contatos que
// podem receber chat. Cada linha tem a bolinha verde de quem está online. Busca por nome.
import React, { useMemo, useState } from 'react';
import { Avatar } from '../shell/UserMenu';
import { BolinhaOnline, useChat } from './ChatContext';
import { idConversa, naoLidasDe, outroParticipante } from '../../utils/chat';
import type { UsuarioRecord } from '../../services/firestoreUsuarios';

const horaCurta = (ms: number): string => {
  if (!ms) return '';
  const d = new Date(ms);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString()
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const ListaContatos: React.FC<{ uid: string; selecionada: string | null; onAbrir: (conversaId: string) => void }> = ({ uid, selecionada, onAbrir }) => {
  const chat = useChat()!;
  const [busca, setBusca] = useState('');

  const { comConversa, outros } = useMemo(() => {
    const porId = new Map(chat.usuarios.map(u => [u.id, u]));
    const filtro = (u?: UsuarioRecord) => !busca.trim() || sem(`${u?.usuario || ''} ${u?.nome || ''}`).includes(sem(busca.trim()));
    const comConversa = chat.conversas
      .filter(c => c.ultimaMensagem)
      .map(c => ({ c, u: porId.get(outroParticipante(c.id, uid)) }))
      .filter(x => filtro(x.u));
    const jaTem = new Set(comConversa.map(x => x.u?.id));
    // Sem "enviar", o perfil só responde a conversas existentes: não lista novos contatos.
    const outros = chat.permissao.enviar ? chat.destinatarios.filter(u => !jaTem.has(u.id) && filtro(u)) : [];
    return { comConversa, outros };
  }, [chat.usuarios, chat.conversas, chat.destinatarios, chat.permissao.enviar, busca, uid]);

  const Linha: React.FC<{ id: string; u?: UsuarioRecord; previa?: string; quando?: number; naoLidas?: number }> = ({ id, u, previa, quando, naoLidas = 0 }) => {
    const nome = u?.usuario || u?.nome || 'Usuário';
    const online = !!u && chat.online(u.id);
    return (
      <li>
        <button
          type="button"
          onClick={() => onAbrir(id)}
          aria-current={selecionada === id ? 'true' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 min-h-[56px] text-left rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${selecionada === id ? 'bg-thead' : 'hover:bg-thead'}`}
        >
          <span className="relative inline-flex shrink-0">
            <Avatar nome={nome} imageProfile={u?.imageProfile} size={40} tone="light" />
            <BolinhaOnline online={online} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className={`flex-1 min-w-0 truncate text-sm ${naoLidas ? 'font-bold text-navy' : 'font-semibold text-ink'}`}>{nome}</span>
              {!!quando && <span className="text-xs text-ink-3 tabular-nums shrink-0">{horaCurta(quando)}</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className={`flex-1 min-w-0 truncate text-xs ${naoLidas ? 'text-ink font-semibold' : 'text-ink-3'}`}>{previa ?? (online ? 'Online agora' : u?.cargo || '')}</span>
              {naoLidas > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-wine text-white text-xs font-bold leading-5 text-center shrink-0">
                  {naoLidas > 99 ? '99+' : naoLidas}<span className="sr-only"> não lidas</span>
                </span>
              )}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="p-3 border-b border-line">
        <label htmlFor="chat-busca" className="sr-only">Buscar contato</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3" aria-hidden="true">search</span>
          <input
            id="chat-busca" type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar contato"
            className="w-full h-11 pl-10 pr-3 rounded-lg border border-line bg-white text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {comConversa.length > 0 && (
          <>
            <h2 className="px-3 pt-1 pb-1 text-xs font-bold uppercase tracking-wide text-ink-3">Conversas</h2>
            <ul className="space-y-0.5">
              {comConversa.map(({ c, u }) => (
                <Linha key={c.id} id={c.id} u={u} previa={`${c.ultimaMensagem!.autor === uid ? 'Você: ' : ''}${c.ultimaMensagem!.previa}`} quando={c.ultimaMensagem!.emMs} naoLidas={naoLidasDe(c, uid)} />
              ))}
            </ul>
          </>
        )}
        {outros.length > 0 && (
          <>
            <h2 className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-ink-3">Contatos</h2>
            <ul className="space-y-0.5">
              {outros.map(u => <Linha key={u.id} id={idConversa(uid, u.id)} u={u} />)}
            </ul>
          </>
        )}
        {!comConversa.length && !outros.length && (
          <p className="px-3 py-6 text-sm text-ink-3 text-center">{busca ? 'Nenhum contato encontrado.' : 'Nenhuma conversa ainda.'}</p>
        )}
      </div>
    </div>
  );
};
