// Ficheiro: components/shell/BannerAniversariantes.tsx
// Banner flutuante no topo da área de conteúdo (pilha com o do Chat, em App.tsx), um por aniversariante do dia, para todos os perfis menos a
// Secretaria (e nunca para o próprio aniversariante). "Enviar mensagem" abre o WhatsApp do aniversariante:
// o Admin com a mensagem completa de parabéns; os demais com o cabeçalho e um campo para o próprio texto.
// Fechar (X) ou enviar esconde aquele banner de vez neste aparelho; sem ação, ele some sozinho no fim do dia
// (só aparece enquanto o aniversário é hoje — no máximo 24 h).
import React, { useEffect, useMemo, useState } from 'react';
import { listUsuarios, type UsuarioRecord } from '../../services/firestoreUsuarios';
import type { AuthUser } from '../../context/NavContext';
import {
  aniversariantesDoMes, hojeEmRecife, linkWhatsApp, mensagemParabens, mensagemParabensLivre, nomeSemPosto,
} from '../../utils/aniversarios';

const chaveFechado = (uid: string, aniversarianteId: string, data: string) => `aniversario-banner:${uid}:${aniversarianteId}:${data}`;

const lerFechado = (chave: string): boolean => {
  try { return localStorage.getItem(chave) === '1'; } catch { return false; }
};
const gravarFechado = (chave: string) => {
  try { localStorage.setItem(chave, '1'); } catch { /* sem armazenamento: fecha só nesta sessão */ }
};

export const BannerAniversariantes: React.FC<{ authUser: AuthUser | null }> = ({ authUser }) => {
  const [usuarios, setUsuarios] = useState<UsuarioRecord[]>([]);
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const [hoje, setHoje] = useState(hojeEmRecife);
  const ativo = !!authUser && authUser.perfil !== 'user_secretaria';

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    listUsuarios().then(u => { if (vivo) setUsuarios(u); }).catch(() => { /* silencioso: o banner é só um aviso */ });
    // Vira o dia com o app aberto: o banner de ontem some.
    const t = setInterval(() => setHoje(hojeEmRecife()), 60_000);
    return () => { vivo = false; clearInterval(t); };
  }, [ativo]);

  const banners = useMemo(() => {
    if (!ativo || !authUser) return [];
    return aniversariantesDoMes(usuarios, hoje)
      .filter(a => a.ehHoje && a.pessoa.id !== authUser.uid)
      .map(a => ({ ...a, chave: chaveFechado(authUser.uid, a.pessoa.id, hoje) }))
      .filter(a => !fechados.has(a.chave) && !lerFechado(a.chave));
  }, [ativo, authUser, usuarios, hoje, fechados]);

  if (!banners.length) return null;

  const fechar = (chave: string) => {
    gravarFechado(chave);
    setFechados(prev => new Set(prev).add(chave));
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 pointer-events-none">
      {banners.map(a => {
        const nome = nomeSemPosto(a.pessoa.usuario);
        const texto = authUser?.perfil === 'admin' ? mensagemParabens(a.pessoa.usuario, a.idade) : mensagemParabensLivre(a.pessoa.usuario);
        const link = linkWhatsApp(a.pessoa.celular, texto);
        return (
          <section
            key={a.chave}
            aria-label={`Aniversariante do dia: ${a.pessoa.usuario}`}
            className="pointer-events-auto w-full max-w-5xl flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 p-2 pl-2 sm:pr-2 rounded-xl bg-navy text-white shadow-lg animate-fade-in"
          >
            <span className="w-10 h-10 shrink-0 rounded-lg bg-white/15 flex items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined text-[22px] text-gold">cake</span>
            </span>
            <p className="flex-1 min-w-0 text-sm leading-snug">
              <span className="font-bold">Hoje é aniversário de {a.pessoa.usuario}!</span>{' '}
              <span className="text-white/80">Envie uma mensagem de parabéns{link ? ' pelo WhatsApp' : ''}.</span>
            </p>
            <button
              type="button"
              onClick={() => fechar(a.chave)}
              aria-label={`Fechar o aviso do aniversário de ${nome}`}
              className="order-2 sm:order-3 w-10 h-10 shrink-0 rounded-lg inline-flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
            </button>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => fechar(a.chave)}
                className="order-3 sm:order-2 basis-full sm:basis-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white text-navy text-sm font-bold hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">send</span>
                Enviar mensagem
                <span className="sr-only">(abre o WhatsApp em nova aba)</span>
              </a>
            )}
          </section>
        );
      })}
    </div>
  );
};
