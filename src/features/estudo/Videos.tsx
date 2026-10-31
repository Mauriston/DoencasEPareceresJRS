// Ficheiro: components/Videos.tsx
// Vídeos sobre os processos das IS, guardados no Firestore (coleção "videos"; antes vinham da
// planilha). O Admin adiciona um vídeo informando só a URL do YouTube: o título e a thumbnail
// são obtidos do próprio YouTube. Tocar no card abre o player em tela cheia e registra a visualização;
// o Admin vê no card o olho com o total e, ao passar o mouse, a lista de quem assistiu.
import React, { useContext, useEffect, useState } from 'react';
import { Loader2, Play, X } from '@/components/ui/icons';
import { Container, PageHeader } from '@/components/ui/Page';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Toast } from '@/components/ui/Toast';
import { VisualizacoesBadge } from '@/components/ui/VisualizacoesBadge';
import { NavContext } from '@/context/NavContext';
import {
  observarVideos, criarVideo, apagarVideo, extrairYoutubeId, buscarDadosYoutube, observarVisualizacoes, registrarVisualizacao,
  type VideoRecord, type VisualizacaoExtra,
} from '@/services/firestoreExtras';

const NovoVideoDialog: React.FC<{ existentes: VideoRecord[]; criadoPor: string; onClose: () => void; onCriado: (titulo: string) => void }> = ({ existentes, criadoPor, onClose, onCriado }) => {
  const [url, setUrl] = useState('');
  const [previa, setPrevia] = useState<{ youtubeId: string; titulo: string; thumbnailUrl: string } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const youtubeId = extrairYoutubeId(url);
  const duplicado = !!youtubeId && existentes.some(v => v.youtubeId === youtubeId);

  // Ao colar/digitar uma URL válida, busca título e thumbnail no YouTube.
  useEffect(() => {
    setPrevia(null);
    setErro('');
    if (!youtubeId || duplicado) return;
    let ativo = true;
    setBuscando(true);
    buscarDadosYoutube(youtubeId)
      .then(d => { if (ativo) setPrevia({ youtubeId, ...d }); })
      .catch((e: Error) => { if (ativo) setErro(e.message || 'Não foi possível obter os dados do vídeo.'); })
      .finally(() => { if (ativo) setBuscando(false); });
    return () => { ativo = false; };
  }, [youtubeId, duplicado]);

  const erroUrl = url.trim() && !youtubeId ? 'URL do YouTube inválida.' : duplicado ? 'Este vídeo já está na lista.' : erro;

  const salvar = async () => {
    if (!previa) return;
    setSalvando(true);
    try {
      await criarVideo({ ...previa, titulo: previa.titulo || 'Vídeo sem título', criadoPor });
      onCriado(previa.titulo);
    } catch {
      setErro('Não foi possível salvar o vídeo.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title="Novo vídeo" icon="smart_display" size="md" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button><Button icon="save" onClick={salvar} loading={salvando} disabled={!previa}>Salvar</Button></>}
    >
      <div className="space-y-4">
        <Field label="URL do vídeo no YouTube" required error={erroUrl || undefined} help="O título e a imagem do vídeo são preenchidos automaticamente.">
          {a => <input {...a} type="url" inputMode="url" autoFocus placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={e => setUrl(e.target.value)} autoComplete="off" />}
        </Field>
        {buscando && <p className="flex items-center gap-2 text-xs text-ink-3"><Loader2 className="animate-spin" size={16} />Buscando dados do vídeo…</p>}
        {previa && (
          <div className="flex gap-3 items-center p-2 rounded-lg border border-line">
            <img src={previa.thumbnailUrl} alt="" className="w-32 aspect-video object-cover rounded-md bg-black shrink-0" />
            <p className="text-sm font-bold text-navy leading-snug line-clamp-3">{previa.titulo || 'Vídeo sem título'}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export const Videos: React.FC = () => {
  const nav = useContext(NavContext);
  const ehAdmin = nav?.authUser?.perfil === 'admin';
  const [videos, setVideos] = useState<VideoRecord[] | null>(null);
  const [erro, setErro] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [apagando, setApagando] = useState<VideoRecord | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; tom: 'success' | 'error' } | null>(null);

  useEffect(() => observarVideos(v => { setVideos(v); setErro(false); }, () => setErro(true)), []);
  const [visualizacoes, setVisualizacoes] = useState<Record<string, VisualizacaoExtra[]>>({});
  useEffect(() => (ehAdmin ? observarVisualizacoes('video', setVisualizacoes, () => { /* silencioso */ }) : undefined), [ehAdmin]);

  // Registra a visualização (o Admin, que audita, não entra na contagem).
  const abrir = (video: VideoRecord) => {
    setSelectedVideo(video.youtubeId);
    const u = nav?.authUser;
    if (u && nav?.perfilReal !== 'admin') registrarVisualizacao('video', video.id, { uid: u.uid, nome: u.usuario || u.nome }).catch(() => { /* silencioso */ });
  };
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3500); return () => clearTimeout(t); }, [aviso]);

  const confirmarApagar = async () => {
    if (!apagando) return;
    setOcupado(true);
    try {
      await apagarVideo(apagando.id);
      setAviso({ msg: 'Vídeo removido.', tom: 'success' });
    } catch {
      setAviso({ msg: 'Não foi possível remover o vídeo.', tom: 'error' });
    } finally {
      setOcupado(false);
      setApagando(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 relative">
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-6">
        <PageHeader
          title="Vídeos" description="Vídeos sobre os processos das IS."
          actions={ehAdmin ? <IconButton icon="add_link" label="Adicionar vídeo" onClick={() => setNovo(true)} /> : undefined}
        />

        {videos === null && !erro ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-navy" size={40} />
            <p className="text-sm font-semibold text-ink-3 font-body">Carregando os vídeos…</p>
          </div>
        ) : erro ? (
          <div className="text-center py-16 text-ink-3">Não foi possível carregar os vídeos. Verifique a conexão e tente novamente.</div>
        ) : videos!.length === 0 ? (
          <div className="text-center py-16 text-ink-3">Nenhum vídeo disponível no momento.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
            {videos!.map(video => (
              <div key={video.id} className="relative group bg-white rounded-lg shadow-sm border border-line/60 flex flex-col hover:shadow-md hover:border-navy transition-all animate-fade-in">
                <button type="button" className="flex flex-col w-full text-left focus:outline-none active:scale-[0.98] transition-transform" onClick={() => abrir(video)}>
                  <div className="w-full aspect-video bg-black relative flex-shrink-0 rounded-t-lg overflow-hidden">
                    <img src={video.thumbnailUrl} alt={`Thumbnail de ${video.titulo}`} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg pl-1 group-hover:scale-110 transition-transform">
                        <Play size={18} className="text-navy" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-3 flex flex-col items-center justify-center min-w-0 bg-white rounded-b-lg">
                    <h3 className="text-xs font-heading font-bold text-navy leading-snug line-clamp-3 text-center">{video.titulo}</h3>
                  </div>
                </button>
                {ehAdmin && <VisualizacoesBadge lista={visualizacoes[video.id] ?? []} className="absolute top-1.5 left-1.5" />}
                {ehAdmin && <IconButton icon="delete" label={`Remover vídeo ${video.titulo}`} variant="overlay" className="absolute top-1.5 right-1.5" onClick={() => setApagando(video)} />}
              </div>
            ))}
          </div>
        )}
      </Container>

      {selectedVideo && (
        <div className="fixed inset-0 z-dialog flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <button
            onClick={() => setSelectedVideo(null)}
            aria-label="Fechar vídeo"
            className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-50 focus:outline-none"
          >
            <X size={24} />
          </button>
          <div className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border border-navy">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1&rel=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {novo && (
        <NovoVideoDialog
          existentes={videos ?? []} criadoPor={nav?.authUser?.usuario ?? ''}
          onClose={() => setNovo(false)}
          onCriado={() => { setNovo(false); setAviso({ msg: 'Vídeo adicionado.', tom: 'success' }); }}
        />
      )}

      {apagando && (
        <Dialog
          title="Remover vídeo" icon="delete" onClose={() => !ocupado && setApagando(null)}
          footer={<><Button variant="secondary" onClick={() => setApagando(null)} disabled={ocupado}>Cancelar</Button><Button variant="destructive" icon="delete" onClick={confirmarApagar} loading={ocupado}>Remover</Button></>}
        >
          <p>Remover <strong>{apagando.titulo}</strong> da página Vídeos? O vídeo continua no YouTube.</p>
        </Dialog>
      )}

      <Toast message={aviso?.msg ?? null} tone={aviso?.tom} />
    </div>
  );
};
