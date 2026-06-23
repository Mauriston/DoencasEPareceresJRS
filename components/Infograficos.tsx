import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle, ArrowLeft, Download, Share2, ChevronRight } from 'lucide-react';
import { Header } from './Header';
import { fetchExtras, ExtraItem } from '../services/extrasService';

export const Infograficos: React.FC = () => {
  const [infograficos, setInfograficos] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ExtraItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExtras();
      const filtered = data.filter(item => item.format === 'Infográficos');
      const sorted = filtered.sort((a, b) => a.title.localeCompare(b.title));
      setInfograficos(sorted);
    } catch (err) {
      console.error('Erro ao buscar infográficos:', err);
      setError('Não foi possível sincronizar os dados com o Google Sheets. Carregando dados locais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDownload = async (item: ExtraItem) => {
    if (!item.imageUrl) return;
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const filename = `${item.title.replace(/[^a-zA-Z0-9 -]/g, '').trim()}.jpg`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: item.title });
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
      if (err.name !== 'AbortError') {
        window.open(item.imageUrl, '_blank');
      }
    }
  };

  const handleShare = async (item: ExtraItem) => {
    if (!item.imageUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url: item.imageUrl });
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Erro ao compartilhar:', err);
      }
    } else {
      navigator.clipboard.writeText(item.imageUrl);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (selectedItem) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-fade-in pb-env-safe">
        <div className="flex-shrink-0 w-full sticky top-0 z-50 shadow-sm bg-[#050F41] text-white h-[56px] flex items-center justify-between px-4 border-b border-transparent">
          <div className="flex-1 text-center font-heading text-[16px] font-semibold truncate pr-4 text-white uppercase tracking-wide">
            {selectedItem.title}
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button onClick={() => handleDownload(selectedItem)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" title="Baixar">
              <Download size={18} />
            </button>
            <button onClick={() => handleShare(selectedItem)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" title="Compartilhar">
              <Share2 size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto w-full bg-gray-900 flex flex-col items-center justify-center relative p-4">
          {selectedItem.imageUrl ? (
            <img src={selectedItem.imageUrl} alt={selectedItem.title} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl block" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-gray-400 h-full">
              <span className="material-symbols-outlined text-4xl mb-4 opacity-50">broken_image</span>
              <p>Imagem não disponível</p>
            </div>
          )}
          <button onClick={() => setSelectedItem(null)} className="absolute bottom-6 right-6 bg-[#FAB932] text-[#050F41] shadow-2xl rounded-2xl p-4 hover:scale-105 active:scale-95 transition-all border border-amber-400 flex items-center justify-center z-50" title="Voltar para a lista">
            <ArrowLeft size={22} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
      <Header title="Infográficos" />
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-[#050F41]" size={40} />
            <p className="text-sm font-semibold text-gray-500 font-body">Carregando infográficos...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1">
                  <p className="font-semibold">Sincronização Offline</p>
                  <p className="mt-0.5 opacity-90">{error}</p>
                </div>
                <button onClick={loadData} className="p-1 hover:bg-amber-100 rounded-lg text-amber-900 flex items-center justify-center transition-colors self-center">
                  <RefreshCw size={14} />
                </button>
              </div>
            )}
            {infograficos.length === 0 ? (
              <div className="text-center py-16 text-gray-500 font-body">Nenhum infográfico disponível no momento.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {infograficos.map((item) => (
                  <button key={item.id} onClick={() => setSelectedItem(item)} className="group bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col w-full hover:shadow-md hover:border-[#079551] transition-all duration-300 text-left p-4">
                    <div className="flex justify-between items-start gap-4 w-full">
                      <h3 className="text-sm font-bold text-[#050F41] font-heading leading-snug group-hover:text-[#079551] transition-colors">{item.title}</h3>
                      <ChevronRight className="text-gray-400 group-hover:text-[#079551] transform group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" size={18} />
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 font-body leading-relaxed line-clamp-2 mt-2">{item.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
