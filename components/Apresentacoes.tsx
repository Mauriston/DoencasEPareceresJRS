// Ficheiro: components/Apresentacoes.tsx
// Apresentações de slides (Google Slides, Canva, GitHub Pages), guardadas no Firestore (coleção
// "apresentacoes"). O Admin adiciona uma apresentação informando só a URL: o título e a capa são
// lidos da própria URL pelo backend (og:title/og:image; miniatura do Drive no Google Slides;
// screenshot da página quando não há imagem). URL do Google Slides é convertida para /present.
// Tocar no card abre a apresentação em nova aba e registra a visualização; o Admin vê no card o
// olho com o total e, ao passar o mouse, a lista de quem abriu.
import React, { useContext, useEffect, useState } from 'react';
import { Loader2 } from './ui/icons';
import { Container, PageHeader } from './ui/Page';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { IconButton } from './ui/IconButton';
import { Toast } from './ui/Toast';
import { VisualizacoesBadge } from './ui/VisualizacoesBadge';
import { NavContext } from '../context/NavContext';
import {
  observarApresentacoes, criarApresentacao, apagarApresentacao, normalizarUrlApresentacao, buscarDadosApresentacao,
  observarVisualizacoes, registrarVisualizacao, type ApresentacaoRecord, type PlataformaApresentacao, type VisualizacaoExtra,
} from '../services/firestoreExtras';

const PLATAFORMA: Record<PlataformaApresentacao, string> = { google: 'Google Slides', canva: 'Canva', github: 'GitHub Pages' };

/** Capa 16:9; se a imagem falhar, mostra o ícone de apresentação. */
const Capa: React.FC<{ src: string; className?: string }> = ({ src, className = '' }) => {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [src]);
  return (
    <div className={`w-full aspect-video bg-navy relative overflow-hidden ${className}`}>
      {src && !falhou
        ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} className="absolute inset-0 w-full h-full object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center material-symbols-outlined text-[40px] text-white/60" aria-hidden="true">slideshow</span>}
    </div>
  );
};

const NovaApresentacaoDialog: React.FC<{ existentes: ApresentacaoRecord[]; criadoPor: string; onClose: () => void; onCriada: () => void }> = ({ existentes, criadoPor, onClose, onCriada }) => {
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const norm = normalizarUrlApresentacao(url);
  const duplicada = !!norm && existentes.some(a => a.url === norm.url);

  // Ao colar/digitar uma URL válida, busca título e capa.
  useEffect(() => {
    setTitulo(''); setThumbnailUrl(''); setAviso(''); setErro('');
    if (!norm || duplicada) return;
    let ativo = true;
    setBuscando(true);
    buscarDadosApresentacao(norm)
      .then(d => { if (!ativo) return; setTitulo(d.titulo); setThumbnailUrl(d.thumbnailUrl); setAviso(d.aviso ?? ''); })
      .catch((e: Error) => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setBuscando(false); });
    return () => { ativo = false; };
  }, [norm?.url, duplicada]); // eslint-disable-line react-hooks/exhaustive-deps

  const erroUrl = url.trim() && !norm ? 'Use uma URL do Google Slides, do Canva ou do GitHub Pages (https).' : duplicada ? 'Esta apresentação já está na lista.' : '';
  const pronto = !!norm && !duplicada && !buscando && !!thumbnailUrl;

  const salvar = async () => {
    if (!norm || !pronto || !titulo.trim()) return;
    setSalvando(true);
    try {
      await criarApresentacao({ url: norm.url, plataforma: norm.plataforma, titulo, thumbnailUrl, criadoPor });
      onCriada();
    } catch {
      setErro('Não foi possível salvar a apresentação.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title="Nova apresentação" icon="slideshow" size="md" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button><Button icon="save" onClick={salvar} loading={salvando} disabled={!pronto || !titulo.trim()}>Salvar</Button></>}
    >
      <div className="space-y-4">
        <Field label="URL da apresentação" required error={erroUrl || undefined} help="Google Slides, Canva ou GitHub Pages. O título e a capa são preenchidos automaticamente.">
          {a => <input {...a} type="url" inputMode="url" autoFocus placeholder="https://docs.google.com/presentation/d/..." value={url} onChange={e => setUrl(e.target.value)} autoComplete="off" />}
        </Field>
        {norm?.plataforma === 'google' && norm.url !== url.trim() && !duplicada && (
          <p className="text-xs text-ink-3 break-all">Abrirá no modo de apresentação: <span className="font-semibold text-navy">{norm.url}</span></p>
        )}
        {buscando && <p className="flex items-center gap-2 text-xs text-ink-3"><Loader2 className="animate-spin" size={16} />Lendo título e capa…</p>}
        {pronto && (
          <>
            <Capa src={thumbnailUrl} className="rounded-lg border border-line" />
            <Field label="Título" required help={aviso || 'Lido da apresentação; ajuste se precisar.'}>
              {a => <input {...a} value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={150} autoComplete="off" />}
            </Field>
          </>
        )}
        {erro && <p role="alert" className="text-xs font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};

export const Apresentacoes: React.FC = () => {
  const nav = useContext(NavContext);
  const ehAdmin = nav?.authUser?.perfil === 'admin';
  const [itens, setItens] = useState<ApresentacaoRecord[] | null>(null);
  const [erro, setErro] = useState(false);
  const [novo, setNovo] = useState(false);
  const [apagando, setApagando] = useState<ApresentacaoRecord | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; tom: 'success' | 'error' } | null>(null);

  useEffect(() => observarApresentacoes(l => { setItens(l); setErro(false); }, () => setErro(true)), []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3500); return () => clearTimeout(t); }, [aviso]);
  const [visualizacoes, setVisualizacoes] = useState<Record<string, VisualizacaoExtra[]>>({});
  useEffect(() => (ehAdmin ? observarVisualizacoes('apresentacao', setVisualizacoes, () => { /* silencioso */ }) : undefined), [ehAdmin]);

  // Abre em nova aba e registra a visualização (o Admin, que audita, não entra na contagem).
  const abrir = (item: ApresentacaoRecord) => {
    window.open(item.url, '_blank', 'noopener,noreferrer');
    const u = nav?.authUser;
    if (u && nav?.perfilReal !== 'admin') registrarVisualizacao('apresentacao', item.id, { uid: u.uid, nome: u.usuario || u.nome }).catch(() => { /* silencioso */ });
  };

  const confirmarApagar = async () => {
    if (!apagando) return;
    setOcupado(true);
    try {
      await apagarApresentacao(apagando.id);
      setAviso({ msg: 'Apresentação removida.', tom: 'success' });
    } catch {
      setAviso({ msg: 'Não foi possível remover a apresentação.', tom: 'error' });
    } finally {
      setOcupado(false);
      setApagando(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 relative">
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-6">
        <PageHeader
          title="Apresentações" description="Apresentações de slides sobre os processos das IS."
          actions={ehAdmin ? <IconButton icon="add_to_queue" label="Adicionar apresentação" onClick={() => setNovo(true)} /> : undefined}
        />

        {itens === null && !erro ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-navy" size={40} />
            <p className="text-sm font-semibold text-ink-3 font-body">Carregando as apresentações…</p>
          </div>
        ) : erro ? (
          <div className="text-center py-16 text-ink-3">Não foi possível carregar as apresentações. Verifique a conexão e tente novamente.</div>
        ) : itens!.length === 0 ? (
          <div className="text-center py-16 text-ink-3">Nenhuma apresentação disponível no momento.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {itens!.map(item => (
              <div key={item.id} className="relative group bg-white rounded-lg shadow-sm border border-line/60 flex flex-col hover:shadow-md hover:border-navy transition-all animate-fade-in">
                <button type="button" onClick={() => abrir(item)} className="flex flex-col w-full text-left focus:outline-none active:scale-[0.98] transition-transform">
                  <div className="relative w-full rounded-t-lg overflow-hidden">
                    <Capa src={item.thumbnailUrl} />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[36px] text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">open_in_new</span>
                    </span>
                  </div>
                  <div className="flex-1 p-3 min-w-0 rounded-b-lg">
                    <h3 className="text-xs md:text-sm font-heading font-bold text-navy leading-snug line-clamp-3">{item.titulo}</h3>
                    <p className="mt-1 text-[11px] text-ink-3">{PLATAFORMA[item.plataforma] ?? ''}</p>
                  </div>
                </button>
                {ehAdmin && <VisualizacoesBadge lista={visualizacoes[item.id] ?? []} className="absolute top-1.5 left-1.5" />}
                {ehAdmin && <IconButton icon="delete" label={`Remover apresentação ${item.titulo}`} variant="overlay" className="absolute top-1.5 right-1.5" onClick={() => setApagando(item)} />}
              </div>
            ))}
          </div>
        )}
      </Container>

      {novo && (
        <NovaApresentacaoDialog
          existentes={itens ?? []} criadoPor={nav?.authUser?.usuario ?? ''}
          onClose={() => setNovo(false)}
          onCriada={() => { setNovo(false); setAviso({ msg: 'Apresentação adicionada.', tom: 'success' }); }}
        />
      )}

      {apagando && (
        <Dialog
          title="Remover apresentação" icon="delete" onClose={() => !ocupado && setApagando(null)}
          footer={<><Button variant="secondary" onClick={() => setApagando(null)} disabled={ocupado}>Cancelar</Button><Button variant="destructive" icon="delete" onClick={confirmarApagar} loading={ocupado}>Remover</Button></>}
        >
          <p>Remover <strong>{apagando.titulo}</strong> da página Apresentações? A apresentação original não é apagada.</p>
        </Dialog>
      )}

      <Toast message={aviso?.msg ?? null} tone={aviso?.tom} />
    </div>
  );
};
