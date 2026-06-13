// Ficheiro: components/Videos.tsx
import React, { useState, useEffect } from 'react';
import { Share2, Copy, ChevronDown, ChevronUp, Loader2, RefreshCw, AlertCircle, Play, X } from 'lucide-react';
import { Header } from './Header';
import { fetchExtras, ExtraItem } from '../services/extrasService';

export const Videos: React.FC = () => {
  const [videos, setVideos] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Novo estado para o Modal de Vídeo e estado mantido para a descrição
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [expandedVideoIdx, setExpandedVideoIdx] = useState<number | null>(null);

  const fallbackVideos: ExtraItem[] = [
    {
      id: 'extra-fb1',
      format: 'Vídeos',
      title: 'Guia de Inspeções de Saúde para concessão de Benefícios para Agentes Médico-Periciais',
      description: 'Orientações detalhadas sobre as Inspeções de Saúde para a concessão de benefícios previstos na Marinha do Brasil, focado em normativas e procedimentos.',
      link: '<iframe width="560" height="315" src="https://www.youtube.com/embed/VIjKagjinSA?si=2fkYfnCz3OCVZE0i" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
      youtubeId: 'VIjKagjinSA'
    },
    {
      id: 'extra-fb2',
      format: 'Vídeos',
      title: 'Aspectos Normativos e Técnicos das Inspeções de Saúde para Concessão de Benefícios',
      description: 'Vídeo complementar detalhando procedimentos legais, médicos e normativas vigentes sobre doenças previstas em lei aplicáveis ao contexto da Marinha.',
      link: '<iframe width="560" height="315" src="https://www.youtube.com/embed/ZMv3oXBOVa4?si=vBPXGQN5ohsSSI_u" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
      youtubeId: 'ZMv3oXBOVa4'
    }
  ];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExtras();
      const filtered = data.filter(item => item.format === 'Vídeos');
      setVideos(filtered);
    } catch (err) {
      console.error('Erro ao buscar vídeos da planilha:', err);
      setError('Não foi possível sincronizar os dados com o Google Sheets. Carregando vídeos offline do cache local.');
      setVideos(fallbackVideos);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (idx: number) => {
    setExpandedVideoIdx(expandedVideoIdx === idx ? null : idx);
  };

  const shareVideo = async (youtubeId: string) => {
    try {
      const shareUrl = `https://youtube.com/watch?v=${youtubeId}`;
      if (navigator.share) {
        await navigator.share({
          title: 'Vídeo HNRe',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link do vídeo copiado para a área de transferência!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyLink = async (youtubeId: string) => {
    try {
      await navigator.clipboard.writeText(`https://youtube.com/watch?v=${youtubeId}`);
      alert('Link do vídeo copiado para a área de transferência!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Vídeos de Instrução" />
      
      <div className="p-4 space-y-6 overflow-y-auto w-full max-w-full flex-1 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-[#050F41]" size={40} />
            <p className="text-sm font-semibold text-gray-500 font-body">Carregando os vídeos da planilha do Google...</p>
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
                <button 
                  onClick={loadData}
                  className="p-1 hover:bg-amber-100 rounded-lg text-amber-900 flex items-center justify-center transition-colors self-center"
                  title="Tentar recarregar"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            )}

            {videos.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                Nenhum vídeo disponível no momento.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
                {videos.map((video, idx) => {
                  const hasYoutube = !!video.youtubeId;
                  
                  return (
                    <div key={video.id} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden flex flex-col w-full animate-fade-in hover:shadow-md hover:border-[#079551] transition-all">
                      
                      {/* Clique na imagem abre o Modal */}
                      <div 
                        className="w-full aspect-video bg-black relative cursor-pointer group"
                        onClick={() => {
                          if (hasYoutube) {
                            setSelectedVideo(video.youtubeId!);
                          } else {
                            alert("Este vídeo não possui link do YouTube compatível.");
                          }
                        }}
                      >
                        {hasYoutube ? (
                          <img 
                            src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} 
                            alt={`Thumbnail de ${video.title}`} 
                            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500 font-medium text-[10px] p-2 leading-relaxed text-center">
                            Link direto indisponível
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          {hasYoutube && (
                            <div className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg pl-1 group-hover:scale-110 transition-transform">
                              <Play size={18} className="text-[#050F41]" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Clique no texto expande a descrição */}
                      <div 
                        className="p-3 flex flex-col cursor-pointer transition-colors"
                        onClick={() => toggleExpand(idx)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-1">
                            <h3 className={`text-[11px] font-heading font-bold text-[#050F41] leading-snug ${expandedVideoIdx === idx ? '' : 'line-clamp-3'}`}>
                              {video.title}
                            </h3>
                          </div>
                          <div className="pt-0.5 text-gray-400 flex-shrink-0">
                            {expandedVideoIdx === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                        
                        {/* Área Expansível (Descrição e Botões) */}
                        {expandedVideoIdx === idx && (
                          <div className="mt-3 animate-fade-in cursor-default" onClick={(e) => e.stopPropagation()}>
                            <p className="text-[10px] font-body text-gray-600 leading-relaxed bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                              {video.description || 'Sem descrição cadastrada.'}
                            </p>
                            
                            {video.youtubeId && (
                              <div className="flex justify-end items-center gap-1 mt-2">
                                <button 
                                  onClick={() => copyLink(video.youtubeId!)}
                                  className="p-2 rounded-full hover:bg-[#050F41]/10 text-[#050F41] transition-colors focus:outline-none flex items-center justify-center w-8 h-8"
                                  title="Copiar link"
                                >
                                  <Copy size={16} />
                                </button>
                                <button 
                                  onClick={() => shareVideo(video.youtubeId!)}
                                  className="p-2 rounded-full hover:bg-[#050F41]/10 text-[#050F41] transition-colors focus:outline-none flex items-center justify-center w-8 h-8"
                                  title="Compartilhar"
                                >
                                  <Share2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Reprodução de Vídeo */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <button 
            onClick={() => setSelectedVideo(null)} 
            className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-50 focus:outline-none"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border border-gray-800">
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
    </div>
  );
};
