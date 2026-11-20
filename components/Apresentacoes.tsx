// Ficheiro: components/Apresentacoes.tsx
// Apresentações feitas no Claude Design, servidas como HTML estático (config/apresentacoes.ts).
// Tocar no card abre a apresentação em tela cheia (Esc volta à página; no celular em retrato, antes
// mostra a animação pedindo para girar o aparelho). Cada card tem copiar/compartilhar o link público,
// que abre a apresentação direto, sem login. O Admin vê no card o total de visualizações.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Loader2 } from './ui/icons';
import { Container, PageHeader } from './ui/Page';
import { Card } from './ui/Card';
import { GradeCards } from './ui/Grade';
import { IconButton } from './ui/IconButton';
import { Toast } from './ui/Toast';
import { VisualizacoesBadge } from './ui/VisualizacoesBadge';
import { NavContext } from '../context/NavContext';
import { useEscapeEmpilhado } from '../hooks/useEscapeEmpilhado';
import { observarVisualizacoes, registrarVisualizacao, type VisualizacaoExtra } from '../services/firestoreExtras';
import { APRESENTACOES, caminhoApresentacao, capaApresentacao, urlPublicaApresentacao, type Apresentacao } from '../config/apresentacoes';

const ehMobileRetrato = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(orientation: portrait)').matches;

/** Capa 16:9; se a imagem falhar, mostra o ícone de apresentação. */
const Capa: React.FC<{ src: string }> = ({ src }) => {
  const [falhou, setFalhou] = useState(false);
  return (
    <div className="w-full aspect-video bg-navy relative overflow-hidden">
      {!falhou
        ? <img src={src} alt="" loading="lazy" onError={() => setFalhou(true)} className="absolute inset-0 w-full h-full object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center material-symbols-outlined text-[40px] text-white/60" aria-hidden="true">slideshow</span>}
    </div>
  );
};

/** Animação "gire o celular" (celular girando de retrato para paisagem). */
const GireOCelular: React.FC<{ onContinuar: () => void }> = ({ onContinuar }) => {
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const f = () => { if (mq.matches) onContinuar(); };
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [onContinuar]);
  return (
    <div className="absolute inset-0 z-10 bg-navy flex flex-col items-center justify-center gap-6 px-8 text-center text-white">
      <style>{`@keyframes girar-celular{0%,15%{transform:rotate(0)}45%,70%{transform:rotate(-90deg)}100%{transform:rotate(0)}}`}</style>
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true" style={{ animation: 'girar-celular 2.4s ease-in-out infinite' }}>
        <rect x="30" y="10" width="36" height="76" rx="6" fill="none" stroke="#FAB932" strokeWidth="4" />
        <line x1="42" y1="78" x2="54" y2="78" stroke="#FAB932" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <p className="text-h3">Gire o celular para a horizontal</p>
      <button type="button" onClick={onContinuar} className="px-5 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
        Continuar
      </button>
    </div>
  );
};

/** Apresentação em tela cheia; Esc (também com o foco dentro dos slides) volta à página. */
const ApresentacaoFullscreen: React.FC<{ item: Apresentacao; onClose: () => void }> = ({ item, onClose }) => {
  const quadro = useRef<HTMLDivElement>(null);
  const [carregando, setCarregando] = useState(true);
  const [girar, setGirar] = useState(ehMobileRetrato);
  useEscapeEmpilhado(onClose);
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Tenta a tela cheia nativa (requer o gesto do toque que abriu) e travar em paisagem no celular.
    quadro.current?.requestFullscreen?.()
      .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
      .catch(() => { /* sem suporte */ });
    return () => {
      document.body.style.overflow = anterior;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { /* ignora */ });
    };
  }, []);
  // Sair da tela cheia nativa (Esc do navegador) volta à página.
  useEffect(() => {
    let entrou = false;
    const f = () => { if (document.fullscreenElement) entrou = true; else if (entrou) onClose(); };
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, [onClose]);
  // O iframe é da mesma origem: escuta o Esc dentro dele.
  const aoCarregar = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    setCarregando(false);
    try {
      e.currentTarget.contentWindow?.addEventListener('keydown', ev => { if (ev.key === 'Escape') onClose(); });
      e.currentTarget.contentWindow?.focus();
    } catch { /* ignora */ }
  };

  return (
    <div ref={quadro} role="dialog" aria-modal="true" aria-label={item.titulo} className="fixed inset-0 z-dialog bg-black animate-fade-in">
      {carregando && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white/70" size={36} /></div>}
      <iframe src={caminhoApresentacao(item)} title={item.titulo} className="absolute inset-0 w-full h-full border-0" allow="fullscreen; autoplay" allowFullScreen onLoad={aoCarregar} />
      <button type="button" onClick={onClose} aria-label="Fechar (Esc)" title="Fechar (Esc)"
        className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-lg bg-black/40 text-white/80 hover:bg-black/70 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
      </button>
      {girar && <GireOCelular onContinuar={() => setGirar(false)} />}
    </div>
  );
};

export const Apresentacoes: React.FC = () => {
  const nav = useContext(NavContext);
  const ehAdmin = nav?.authUser?.perfil === 'admin';
  const [aberta, setAberta] = useState<Apresentacao | null>(null);
  const [aviso, setAviso] = useState<{ msg: string; tom: 'success' | 'error' } | null>(null);
  const [visualizacoes, setVisualizacoes] = useState<Record<string, VisualizacaoExtra[]>>({});
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3500); return () => clearTimeout(t); }, [aviso]);
  useEffect(() => (ehAdmin ? observarVisualizacoes('apresentacao', setVisualizacoes, () => { /* silencioso */ }) : undefined), [ehAdmin]);

  const abrir = (item: Apresentacao) => {
    setAberta(item);
    const u = nav?.authUser;
    if (u && nav?.perfilReal !== 'admin') registrarVisualizacao('apresentacao', item.slug, { uid: u.uid, nome: u.usuario || u.nome }).catch(() => { /* silencioso */ });
  };
  const copiar = async (item: Apresentacao) => {
    try {
      await navigator.clipboard.writeText(urlPublicaApresentacao(item));
      setAviso({ msg: 'Link público copiado.', tom: 'success' });
    } catch {
      setAviso({ msg: 'Não foi possível copiar o link.', tom: 'error' });
    }
  };
  const compartilhar = async (item: Apresentacao) => {
    const url = urlPublicaApresentacao(item);
    if (navigator.share) {
      try { await navigator.share({ title: item.titulo, url }); } catch { /* cancelado */ }
    } else copiar(item);
  };

  return (
    <div className="flex flex-col flex-1 relative">
      <Container size="data" className="py-6 md:py-8 pt-4 md:pt-8 pb-10 space-y-6">
        <PageHeader title="Apresentações" description="Apresentações de slides sobre os processos das IS." />
        {APRESENTACOES.length === 0 ? (
          <div className="text-center py-16 text-ink-3">Nenhuma apresentação disponível no momento.</div>
        ) : (
          <GradeCards>
            {APRESENTACOES.map(item => (
              <Card key={item.slug} padding="none" className="relative group flex flex-col hover:border-navy transition-colors animate-fade-in">
                <button type="button" onClick={() => abrir(item)} className="flex flex-col w-full text-left rounded-t-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold">
                  <div className="relative w-full overflow-hidden">
                    <Capa src={capaApresentacao(item)} />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[40px] text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">play_circle</span>
                    </span>
                  </div>
                  <div className="p-4 pb-2 min-w-0">
                    <h3 className="text-h3 text-navy line-clamp-3">{item.titulo}</h3>
                    {item.descricao && <p className="mt-1 text-xs text-ink-3">{item.descricao}</p>}
                  </div>
                </button>
                <div className="mt-auto flex items-center justify-end gap-1 px-2 pb-2">
                  <IconButton icon="content_copy" label={`Copiar link público de ${item.titulo}`} variant="ghost" size="sm" onClick={() => copiar(item)} />
                  <IconButton icon="share" label={`Compartilhar ${item.titulo}`} variant="ghost" size="sm" onClick={() => compartilhar(item)} />
                </div>
                {ehAdmin && <VisualizacoesBadge lista={visualizacoes[item.slug] ?? []} className="absolute top-1.5 left-1.5" />}
              </Card>
            ))}
          </GradeCards>
        )}
      </Container>
      {aberta && <ApresentacaoFullscreen item={aberta} onClose={() => setAberta(null)} />}
      <Toast message={aviso?.msg ?? null} tone={aviso?.tom} />
    </div>
  );
};
