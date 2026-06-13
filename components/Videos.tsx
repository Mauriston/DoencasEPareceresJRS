// Ficheiro: components/Videos.tsx
import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle, Play, X } from 'lucide-react';
import { Header } from './Header';
import { fetchExtras, ExtraItem } from '../services/extrasService';

export const Videos: React.FC = () => {
  const [videos, setVideos] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para o Modal de Vídeo
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

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
                {videos.map((video) => {
                  const hasYoutube = !!video.youtubeId;
                  
                  return (
                    <button 
                      key={video.id} 
                      className="group bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden flex flex-col w-full text-left focus:outline-none hover:shadow-md hover:border-[#079551] active:scale-[0.98] transition-all animate-fade-in"
                      onClick={() => {
                        if (hasYoutube) {
                          setSelectedVideo(video.youtubeId!);
                        } else {
                          alert("Este vídeo não possui link do YouTube compatível.");
                        }
                      }}
                    >
                      {/* Área da Imagem/Thumbnail */}
                      <div className="w-full aspect-video bg-black relative flex-shrink-0">
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

                      {/* Área do Título (Sem subtítulo e expansão) */}
                      <div className="flex-1 p-3 flex flex-col items-center justify-center min-w-0 bg-white">
                        <h3 className="text-[11px] font-heading font-bold text-[#050F41] leading-snug line-clamp-3 text-center group-hover:text-[#079551] transition-colors">
                          {video.title}
                        </h3>
                      </div>
                    </button>
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
