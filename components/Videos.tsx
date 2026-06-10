import React, { useState, useEffect } from 'react';
import { Share2, Copy, ChevronDown, ChevronUp, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Header } from './Header';
import { fetchExtras, ExtraItem } from '../services/extrasService';

export const Videos: React.FC = () => {
  const [videos, setVideos] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVideoIdx, setPlayingVideoIdx] = useState<number | null>(null);
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

  const handlePlayVideo = (idx: number) => {
    setPlayingVideoIdx(idx);
  };
  
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
      
      <div className="p-4 space-y-6 overflow-y-auto w-full max-w-full flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-navy" size={40} />
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
              <div className="space-y-6">
                {videos.map((video, idx) => {
                  const hasYoutube = !!video.youtubeId;
                  
                  return (
                    <div key={video.id} className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col w-full animate-fade-in">
                      {/* Imagem do Vídeo / Player */}
                      <div className="w-full aspect-video bg-black relative">
                        {playingVideoIdx === idx ? (
                          hasYoutube ? (
                            <iframe 
                              className="w-full h-full"
                              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`} 
                              title={video.title}
                              frameBorder="0" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                              referrerPolicy="strict-origin-when-cross-origin" 
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <div 
                              className="w-full h-full p-2 flex items-center justify-center text-center bg-gray-900"
                              dangerouslySetInnerHTML={{ __html: video.link }}
                            />
                          )
                        ) : (
                          <div 
                            className="absolute inset-0 cursor-pointer group flex items-center justify-center bg-gray-900"
                            onClick={() => handlePlayVideo(idx)}
                          >
                            {hasYoutube ? (
                              <img 
                                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} 
                                alt={`Thumbnail de ${video.title}`} 
                                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500 font-medium text-xs p-4 leading-relaxed">
                                Clique para carregar o player integrado
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                            <div className="relative z-10 w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-red-600 transition-colors">
                              <svg className="w-6 h-6 text-white fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content Area - Material Design 3 */}
                      <div 
                        className="p-4 flex flex-col cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleExpand(idx)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-2">
                            {/* Headline */}
                            <h3 className="text-sm font-heading font-medium text-gray-900">
                              {video.title}
                            </h3>
                            
                            {/* Subhead */}
                            <div className="flex items-center text-xs font-body text-gray-500 mt-1 space-x-2">
                              <span className="bg-blue-50 text-navy px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]">
                                Vídeo de Instrução
                              </span>
                            </div>
                          </div>
                          <div className="pt-1 text-gray-400">
                            {expandedVideoIdx === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                        
                        {/* Expandable Area */}
                        {expandedVideoIdx === idx && (
                          <div className="mt-3 animate-fade-in cursor-default" onClick={(e) => e.stopPropagation()}>
                            {/* Supporting text */}
                            <p className="text-sm font-body text-gray-700 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                              {video.description || 'Sem descrição cadastrada.'}
                            </p>
                            
                            {/* Actions */}
                            {video.youtubeId && (
                              <div className="flex justify-end items-center gap-1 mt-2">
                                <button 
                                  onClick={() => copyLink(video.youtubeId!)}
                                  className="p-2 rounded-full hover:bg-navy/10 text-navy transition-colors focus:outline-none flex items-center justify-center w-10 h-10"
                                  aria-label="Copiar link"
                                  title="Copiar link"
                                >
                                  <Copy size={20} />
                                </button>
                                <button 
                                  onClick={() => shareVideo(video.youtubeId!)}
                                  className="p-2 rounded-full hover:bg-navy/10 text-navy transition-colors focus:outline-none flex items-center justify-center w-10 h-10"
                                  aria-label="Compartilhar"
                                  title="Compartilhar"
                                >
                                  <Share2 size={20} />
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
    </div>
  );
};
