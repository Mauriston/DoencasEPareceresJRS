// Ficheiro: components/chat/Conversa.tsx
// Uma conversa do Chat: cabeçalho com o contato (bolinha verde se online), mensagens com recibo de leitura,
// anexos (prévia da imagem; PDF abre em nova aba; "Anexo expirado" depois de 7 dias) e o campo de envio
// (botão de anexo só para quem pode enviar anexos). O Admin modera: apaga o anexo ou a mensagem.
// No celular, a página abre esta conversa em tela cheia (components/Chat.tsx).
import React, { useEffect, useRef, useState } from 'react';
import { Avatar } from '../shell/UserMenu';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { BolinhaOnline, useChat } from './ChatContext';
import {
  apagarAnexo, apagarMensagem, enviarMensagem, marcarComoLidas, observarMensagens, type MensagemChat,
} from '../../services/chat';
import {
  ACCEPT_ANEXO, TEXTO_MAX, expiraEm, naoLidasDe, outroParticipante, permissaoChat, situacaoEntrega, tamanhoLegivel, validarAnexo,
} from '../../utils/chat';

const hora = (d: Date | null) => (d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
const dia = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

const Recibo: React.FC<{ m: MensagemChat; destinatario: string }> = ({ m, destinatario }) => {
  const s = situacaoEntrega(m, destinatario);
  const icone = s === 'enviando' ? 'schedule' : s === 'lida' ? 'done_all' : 'done';
  const rotulo = s === 'enviando' ? 'Enviando' : s === 'lida' ? 'Lida' : 'Enviada';
  return (
    <span className={`inline-flex items-center ${s === 'lida' ? 'text-gold' : 'text-white/70'}`} title={rotulo}>
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icone}</span>
      <span className="sr-only">{rotulo}</span>
    </span>
  );
};

const Anexo: React.FC<{ m: MensagemChat; minha: boolean }> = ({ m, minha }) => {
  if (m.anexoRemovido) {
    return (
      <p className={`flex items-center gap-1.5 text-xs italic ${minha ? 'text-white/80' : 'text-ink-3'}`}>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{m.anexoRemovido.motivo === 'expirado' ? 'timer_off' : 'block'}</span>
        {m.anexoRemovido.motivo === 'expirado' ? 'Anexo expirado' : 'Anexo removido pelo Admin'}
      </p>
    );
  }
  const a = m.anexo;
  if (!a) return null;
  const expira = a.enviadoEm?.toMillis ? new Date(expiraEm(a.enviadoEm.toMillis())).toLocaleDateString('pt-BR') : '';
  if (a.tipo === 'imagem') {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded-lg">
        <img src={a.url} alt={a.nome} loading="lazy" className="max-h-64 max-w-full rounded-lg object-contain bg-black/5" />
        <span className="sr-only">(abre a imagem em nova aba)</span>
        {expira && <span className={`block mt-1 text-xs ${minha ? 'text-white/70' : 'text-ink-3'}`}>Disponível até {expira}</span>}
      </a>
    );
  }
  return (
    <a
      href={a.url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${minha ? 'bg-white/15 hover:bg-white/25' : 'bg-thead hover:bg-line'}`}
    >
      <span className="material-symbols-outlined text-[24px]" aria-hidden="true">picture_as_pdf</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold truncate">{a.nome}</span>
        <span className={`block text-xs ${minha ? 'text-white/70' : 'text-ink-3'}`}>PDF · {tamanhoLegivel(a.tamanho)}{expira ? ` · até ${expira}` : ''}</span>
      </span>
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
};

export const Conversa: React.FC<{ uid: string; perfil?: string; conversaId: string; onVoltar?: () => void }> = ({ uid, perfil, conversaId, onVoltar }) => {
  const chat = useChat()!;
  const outroId = outroParticipante(conversaId, uid);
  const outro = chat.usuarios.find(u => u.id === outroId);
  const nome = outro?.usuario || outro?.nome || 'Usuário';
  const online = chat.online(outroId);
  const conversa = chat.conversas.find(c => c.id === conversaId);
  const naoLidas = conversa ? naoLidasDe(conversa, uid) : 0;
  const outroRecebe = outro ? permissaoChat(chat.matriz, outro.perfil).receber && outro.ativo !== false : false;
  const podeEnviar = chat.permissao.enviar && outroRecebe;
  const ehAdmin = perfil === 'admin';

  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [moderar, setModerar] = useState<{ m: MensagemChat; acao: 'anexo' | 'mensagem' } | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCarregando(true); setMensagens([]); setErro('');
    return observarMensagens(conversaId, l => { setMensagens(l); setCarregando(false); }, () => { setCarregando(false); setErro('Não foi possível carregar a conversa.'); });
  }, [conversaId]);

  // Conversa aberta: nada de banner para ela, e o que chegou fica lido.
  useEffect(() => { chat.setConversaAberta(conversaId); return () => chat.setConversaAberta(null); }, [conversaId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (document.visibilityState !== 'visible') return;
    marcarComoLidas(conversaId, uid, mensagens, naoLidas).catch(() => {});
  }, [conversaId, uid, mensagens, naoLidas]);
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [mensagens.length]);

  const escolherArquivo = (f: File | undefined) => {
    if (!f) return;
    const e = validarAnexo(f);
    if (e) { setErro(e); setArquivo(null); } else { setErro(''); setArquivo(f); }
    if (inputArquivo.current) inputArquivo.current.value = '';
  };

  const enviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (enviando || (!texto.trim() && !arquivo) || !podeEnviar) return;
    setEnviando(true); setErro('');
    const t = texto; const a = arquivo;
    setTexto(''); setArquivo(null);
    try {
      await enviarMensagem(uid, outroId, t, chat.permissao.anexos ? a : null);
    } catch (err: any) {
      setTexto(t); setArquivo(a);
      setErro(err?.message && !/permission/i.test(err.message) ? err.message : 'Não foi possível enviar. Tente de novo.');
    } finally { setEnviando(false); }
  };

  const confirmarModeracao = async () => {
    if (!moderar) return;
    try {
      if (moderar.acao === 'anexo') await apagarAnexo(conversaId, moderar.m); else await apagarMensagem(conversaId, moderar.m);
    } catch { setErro('Não foi possível apagar.'); }
    setModerar(null);
  };

  let diaAnterior = '';
  return (
    <div className="flex flex-col h-full min-h-0 bg-canvas">
      <header className="flex items-center gap-2 px-2 md:px-4 h-16 shrink-0 border-b border-line bg-white">
        {onVoltar && (
          <button type="button" onClick={onVoltar} aria-label="Voltar para a lista de conversas" className="w-11 h-11 shrink-0 rounded-lg inline-flex items-center justify-center text-navy hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">arrow_back</span>
          </button>
        )}
        <span className="relative inline-flex shrink-0">
          <Avatar nome={nome} imageProfile={outro?.imageProfile} size={40} tone="light" />
          <BolinhaOnline online={online} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-navy truncate">{nome}</h2>
          <p className="text-xs text-ink-3 truncate">{online ? 'Online agora' : 'Offline · recebe quando abrir o app (e por notificação)'}</p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-6 py-4" aria-live="polite" aria-label={`Mensagens com ${nome}`}>
        {carregando && <p className="text-sm text-ink-3 text-center py-6" role="status">Carregando…</p>}
        {!carregando && !mensagens.length && <p className="text-sm text-ink-3 text-center py-6">Nenhuma mensagem ainda. Diga olá!</p>}
        <ul className="space-y-2">
          {mensagens.map(m => {
            const minha = m.autor === uid;
            const d = dia(m.em);
            const separador = d && d !== diaAnterior;
            if (d) diaAnterior = d;
            return (
              <React.Fragment key={m.id}>
                {separador && <li className="text-center"><span className="inline-block px-3 py-1 rounded-full bg-thead text-xs font-semibold text-ink-3">{d}</span></li>}
                <li className={`flex items-end gap-1 ${minha ? 'justify-end' : 'justify-start'}`}>
                  {ehAdmin && minha && <Moderacao m={m} onEscolher={acao => setModerar({ m, acao })} />}
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 space-y-1.5 ${minha ? 'bg-navy text-white rounded-br-md' : 'bg-white text-ink border border-line rounded-bl-md'}`}>
                    <Anexo m={m} minha={minha} />
                    {m.texto && <p className="text-sm whitespace-pre-wrap break-words">{m.texto}</p>}
                    <p className={`flex items-center justify-end gap-1 text-xs ${minha ? 'text-white/70' : 'text-ink-3'}`}>
                      {hora(m.em)}
                      {minha && <Recibo m={m} destinatario={outroId} />}
                    </p>
                  </div>
                  {ehAdmin && !minha && <Moderacao m={m} onEscolher={acao => setModerar({ m, acao })} />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <div ref={fimRef} />
      </div>

      {erro && <p role="alert" className="px-4 py-2 text-sm font-semibold text-wine bg-wine/10 border-t border-line">{erro}</p>}

      {podeEnviar ? (
        <form onSubmit={enviar} className="shrink-0 border-t border-line bg-white px-2 md:px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {arquivo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-thead text-sm">
              <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">{arquivo.type === 'application/pdf' ? 'picture_as_pdf' : 'image'}</span>
              <span className="flex-1 min-w-0 truncate">{arquivo.name} · {tamanhoLegivel(arquivo.size)}</span>
              <button type="button" onClick={() => setArquivo(null)} aria-label="Remover o anexo" className="w-11 h-11 -my-2 -mr-2 rounded-lg inline-flex items-center justify-center text-ink-3 hover:bg-line">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            {chat.permissao.anexos && (
              <>
                <input ref={inputArquivo} type="file" accept={ACCEPT_ANEXO} className="sr-only" id="chat-anexo" onChange={e => escolherArquivo(e.target.files?.[0])} />
                <label htmlFor="chat-anexo" title="Anexar PDF ou imagem (até 10 MB)" className="w-11 h-11 shrink-0 rounded-lg inline-flex items-center justify-center text-navy hover:bg-thead cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-gold">
                  <span className="material-symbols-outlined text-[24px]" aria-hidden="true">attach_file</span>
                  <span className="sr-only">Anexar PDF ou imagem (até 10 MB)</span>
                </label>
              </>
            )}
            <label htmlFor="chat-texto" className="sr-only">Mensagem para {nome}</label>
            <textarea
              id="chat-texto" rows={1} value={texto} maxLength={TEXTO_MAX}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void enviar(); } }}
              placeholder="Escreva uma mensagem"
              className="flex-1 min-h-[44px] max-h-40 resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit" disabled={enviando || (!texto.trim() && !arquivo)} aria-label="Enviar"
              className="w-11 h-11 shrink-0 rounded-lg inline-flex items-center justify-center bg-navy text-white hover:bg-navy-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span className={`material-symbols-outlined text-[22px] ${enviando ? 'animate-spin' : ''}`} aria-hidden="true">{enviando ? 'progress_activity' : 'send'}</span>
            </button>
          </div>
        </form>
      ) : (
        <p className="shrink-0 border-t border-line bg-white px-4 py-3 text-sm text-ink-3">
          {!chat.permissao.enviar ? 'Seu perfil só recebe mensagens no chat.' : `${nome} não recebe mensagens no chat.`}
        </p>
      )}

      {moderar && (
        <Dialog
          title={moderar.acao === 'anexo' ? 'Apagar o anexo?' : 'Apagar a mensagem?'}
          icon="delete"
          onClose={() => setModerar(null)}
          footer={<><Button variant="secondary" onClick={() => setModerar(null)}>Cancelar</Button><Button variant="destructive" onClick={confirmarModeracao}>Apagar</Button></>}
        >
          <p className="text-sm text-ink">
            {moderar.acao === 'anexo' ? 'O arquivo sai do armazenamento e a mensagem fica com a indicação "Anexo removido pelo Admin".' : 'A mensagem e o anexo saem da conversa para os dois participantes.'} Não dá para desfazer.
          </p>
        </Dialog>
      )}
    </div>
  );
};

const Moderacao: React.FC<{ m: MensagemChat; onEscolher: (a: 'anexo' | 'mensagem') => void }> = ({ m, onEscolher }) => (
  <span className="flex flex-col shrink-0">
    {m.anexo && (
      <button type="button" onClick={() => onEscolher('anexo')} aria-label="Apagar o anexo (moderação)" title="Apagar o anexo" className="w-11 h-11 rounded-lg inline-flex items-center justify-center text-ink-3 hover:bg-thead hover:text-wine">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">hide_image</span>
      </button>
    )}
    <button type="button" onClick={() => onEscolher('mensagem')} aria-label="Apagar a mensagem (moderação)" title="Apagar a mensagem" className="w-11 h-11 rounded-lg inline-flex items-center justify-center text-ink-3 hover:bg-thead hover:text-wine">
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
    </button>
  </span>
);
