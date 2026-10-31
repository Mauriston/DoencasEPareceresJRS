// Ficheiro: components/Infograficos.tsx
// Infográficos (resumos ilustrados), guardados no Firestore (coleção "infograficos"; antes vinham
// da planilha) com a imagem no Firebase Storage. O Admin adiciona um infográfico com título e
// imagem. Tocar no card abre a imagem num modal em tela cheia (baixar, compartilhar, fechar) e registra a
// visualização; o Admin vê no card o olho com o total e, ao passar o mouse, a lista de quem viu.
import React, { useContext, useEffect, useState } from 'react';
import { Loader2, Download, Share2, X } from '@/components/ui/icons';
import { Container, PageHeader } from '@/components/ui/Page';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Toast } from '@/components/ui/Toast';
import { VisualizacoesBadge } from '@/components/ui/VisualizacoesBadge';
import { NavContext } from '@/context/NavContext';
import { useEscapeEmpilhado } from '@/hooks/useEscapeEmpilhado';
import {
  observarInfograficos, criarInfografico, apagarInfografico, LIMITE_INFOGRAFICO_MB, observarVisualizacoes, registrarVisualizacao,
  type InfograficoRecord, type VisualizacaoExtra,
} from '@/services/firestoreExtras';

const NovoInfograficoDialog: React.FC<{ criadoPor: string; onClose: () => void; onCriado: () => void }> = ({ criadoPor, onClose, onCriado }) => {
  const [titulo, setTitulo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const inputArquivo = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!arquivo) { setPrevia(null); return; }
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const erroArquivo = arquivo && !arquivo.type.startsWith('image/') ? 'Escolha um arquivo de imagem (JPG, PNG, WebP…).'
    : arquivo && arquivo.size > LIMITE_INFOGRAFICO_MB * 1024 * 1024 ? `A imagem deve ter até ${LIMITE_INFOGRAFICO_MB} MB.` : '';
  const valido = !!titulo.trim() && !!arquivo && !erroArquivo;

  const salvar = async () => {
    if (!valido || !arquivo) return;
    setSalvando(true);
    setErro('');
    try {
      await criarInfografico(titulo, arquivo, criadoPor);
      onCriado();
    } catch {
      setErro('Não foi possível salvar o infográfico.');
      setSalvando(false);
    }
  };

  return (
    <Dialog
      title="Novo infográfico" icon="image" size="md" onClose={onClose} travado={salvando}
      footer={<><Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button><Button icon="save" onClick={salvar} loading={salvando} disabled={!valido}>Salvar</Button></>}
    >
      <div className="space-y-4">
        <Field label="Título do infográfico" required>
          {a => (
            <div className="flex gap-2">
              <input {...a} autoFocus value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} autoComplete="off" />
              <IconButton icon="add_photo_alternate" label={arquivo ? 'Trocar imagem' : 'Adicionar imagem'} variant="secondary" onClick={() => inputArquivo.current?.click()} disabled={salvando} />
              <input ref={inputArquivo} type="file" accept="image/*" className="hidden" onChange={e => setArquivo(e.target.files?.[0] ?? null)} />
            </div>
          )}
        </Field>
        <p className={`text-xs ${erroArquivo ? 'font-semibold text-wine' : 'text-ink-3'}`} role={erroArquivo ? 'alert' : undefined}>
          {erroArquivo || (arquivo ? arquivo.name : `Imagem de até ${LIMITE_INFOGRAFICO_MB} MB.`)}
        </p>
        {previa && !erroArquivo && <img src={previa} alt="Prévia do infográfico" className="w-full max-h-64 object-contain rounded-lg border border-line bg-thead" />}
        {erro && <p role="alert" className="text-xs font-semibold text-wine">{erro}</p>}
      </div>
    </Dialog>
  );
};

/** Infográfico em tela cheia: baixar, compartilhar e fechar (Esc também fecha). */
const InfograficoFullscreen: React.FC<{ item: InfograficoRecord; onClose: () => void }> = ({ item, onClose }) => {
  useEscapeEmpilhado(onClose);

  const handleDownload = async () => {
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const ext = item.imagePath.split('.').pop() || 'jpg';
      const filename = `${item.titulo.replace(/[^\p{L}\p{N} -]/gu, '').trim() || 'infografico'}.${ext}`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: item.titulo });
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.name !== 'AbortError') window.open(item.imageUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: item.titulo, url: item.imageUrl });
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error('Erro ao compartilhar:', err);
      }
    } else {
      navigator.clipboard.writeText(item.imageUrl);
      alert('Link copiado para a área de transferência!');
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={item.titulo} className="fixed inset-0 z-dialog bg-navy flex flex-col animate-fade-in pb-env-safe">
      <div className="flex-shrink-0 w-full h-[56px] flex items-center justify-between gap-2 px-4 text-white">
        <h2 className="flex-1 min-w-0 font-heading text-[16px] font-semibold truncate uppercase tracking-wide">{item.titulo}</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={handleDownload} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors" title="Baixar" aria-label="Baixar"><Download size={18} /></button>
          <button onClick={handleShare} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors" title="Compartilhar" aria-label="Compartilhar"><Share2 size={18} /></button>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors" title="Fechar" aria-label="Fechar"><X size={20} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto w-full flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <img src={item.imageUrl} alt={item.titulo} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
      </div>
    </div>
  );
};

export const Infograficos: React.FC = () => {
  const nav = useContext(NavContext);
  const ehAdmin = nav?.authUser?.perfil === 'admin';
  const [infograficos, setInfograficos] = useState<InfograficoRecord[] | null>(null);
  const [erro, setErro] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InfograficoRecord | null>(null);
  const [novo, setNovo] = useState(false);
  const [apagando, setApagando] = useState<InfograficoRecord | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; tom: 'success' | 'error' } | null>(null);

  useEffect(() => observarInfograficos(l => { setInfograficos(l); setErro(false); }, () => setErro(true)), []);
  const [visualizacoes, setVisualizacoes] = useState<Record<string, VisualizacaoExtra[]>>({});
  useEffect(() => (ehAdmin ? observarVisualizacoes('infografico', setVisualizacoes, () => { /* silencioso */ }) : undefined), [ehAdmin]);

  // Registra a visualização (o Admin, que audita, não entra na contagem).
  const abrir = (item: InfograficoRecord) => {
    setSelectedItem(item);
    const u = nav?.authUser;
    if (u && nav?.perfilReal !== 'admin') registrarVisualizacao('infografico', item.id, { uid: u.uid, nome: u.usuario || u.nome }).catch(() => { /* silencioso */ });
  };
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3500); return () => clearTimeout(t); }, [aviso]);

  const confirmarApagar = async () => {
    if (!apagando) return;
    setOcupado(true);
    try {
      await apagarInfografico(apagando);
      setAviso({ msg: 'Infográfico removido.', tom: 'success' });
    } catch {
      setAviso({ msg: 'Não foi possível remover o infográfico.', tom: 'error' });
    } finally {
      setOcupado(false);
      setApagando(null);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-6">
        <PageHeader
          title="Infográficos" description="Resumos ilustrados para consultas rápidas."
          actions={ehAdmin ? <IconButton icon="add_photo_alternate" label="Adicionar infográfico" onClick={() => setNovo(true)} /> : undefined}
        />

        {infograficos === null && !erro ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-navy" size={40} />
            <p className="text-sm font-semibold text-ink-3 font-body">Carregando infográficos…</p>
          </div>
        ) : erro ? (
          <div className="text-center py-16 text-ink-3 font-body">Não foi possível carregar os infográficos. Verifique a conexão e tente novamente.</div>
        ) : infograficos!.length === 0 ? (
          <div className="text-center py-16 text-ink-3 font-body">Nenhum infográfico disponível no momento.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {infograficos!.map(item => (
              <div key={item.id} className="relative group bg-white rounded-xl border border-line/60 shadow-sm flex flex-col hover:shadow-md hover:border-navy transition-all">
                <button type="button" onClick={() => abrir(item)} className="flex flex-col w-full text-left focus:outline-none">
                  <div className="w-full aspect-[4/5] bg-thead overflow-hidden rounded-t-xl">
                    <img src={item.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform" />
                  </div>
                  <h3 className="p-3 text-sm font-bold text-navy font-heading leading-snug line-clamp-3">{item.titulo}</h3>
                </button>
                {ehAdmin && <VisualizacoesBadge lista={visualizacoes[item.id] ?? []} className="absolute top-1.5 left-1.5" />}
                {ehAdmin && <IconButton icon="delete" label={`Remover infográfico ${item.titulo}`} variant="overlay" className="absolute top-1.5 right-1.5" onClick={() => setApagando(item)} />}
              </div>
            ))}
          </div>
        )}
      </Container>

      {selectedItem && <InfograficoFullscreen item={selectedItem} onClose={() => setSelectedItem(null)} />}

      {novo && (
        <NovoInfograficoDialog
          criadoPor={nav?.authUser?.usuario ?? ''}
          onClose={() => setNovo(false)}
          onCriado={() => { setNovo(false); setAviso({ msg: 'Infográfico adicionado.', tom: 'success' }); }}
        />
      )}

      {apagando && (
        <Dialog
          title="Remover infográfico" icon="delete" onClose={() => !ocupado && setApagando(null)}
          footer={<><Button variant="secondary" onClick={() => setApagando(null)} disabled={ocupado}>Cancelar</Button><Button variant="destructive" icon="delete" onClick={confirmarApagar} loading={ocupado}>Remover</Button></>}
        >
          <p>Remover <strong>{apagando.titulo}</strong> da página Infográficos? A imagem também será apagada.</p>
        </Dialog>
      )}

      <Toast message={aviso?.msg ?? null} tone={aviso?.tom} />
    </div>
  );
};
