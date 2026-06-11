// Ficheiro: components/Aulas.tsx
import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { Header } from './Header';
import { fetchExtras, ExtraItem } from '../services/extrasService';

export const Aulas: React.FC = () => {
  const [aulas, setAulas] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fallbackAulas: ExtraItem[] = [
    {
      id: 'extra-fb-aula1',
      format: 'Aulas',
      title: 'Inspeções de Saúde na MB',
      description: 'Aula Introdutória sobre Inspeções de Saúde à Turma de Médicos SMIO 2026',
      link: 'https://canva.link/yh0yllqc0bygt58',
      canvaEmbedUrl: 'https://www.canva.com/design/DAGvDg5SgbM/tst9TbwHSl9nnWLdupPtyA/view?embed',
      canvaViewUrl: 'https://www.canva.com/design/DAGvDg5SgbM/tst9TbwHSl9nnWLdupPtyA/view',
      imageUrl: 'https://i.imgur.com/WtweIXn.png'
    },
    {
      id: 'extra-fb-aula2',
      format: 'Aulas',
      title: 'Processos das Inspeções de Saúde',
      description: 'Aula sobre os Capítulos 1 e 2 da DGPM 406 à Turma de Médicos SMIO 2026',
      link: 'https://canva.link/yh0yllqc0bygt58',
      canvaEmbedUrl: 'https://www.canva.com/design/DAGvDg5SgbM/tst9TbwHSl9nnWLdupPtyA/view?embed',
      canvaViewUrl: 'https://www.canva.com/design/DAGvDg5SgbM/tst9TbwHSl9nnWLdupPtyA/view',
      imageUrl: 'https://i.imgur.com/WtweIXn.png'
    }
  ];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExtras();
      const filtered = data.filter(item => item.format === 'Aulas');
      setAulas(filtered);
    } catch (err) {
      console.error('Erro ao buscar aulas da planilha:', err);
      setError('Não foi possível sincronizar as aulas com o Google Sheets. Carregando dados offline do cache local.');
      setAulas(fallbackAulas);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getClickableLink = (item: ExtraItem): string => {
    if (item.canvaViewUrl && !item.canvaViewUrl.trim().startsWith('<iframe')) {
      return item.canvaViewUrl.trim();
    }
    const trimmed = (item.link || '').trim();
    if (trimmed.startsWith('<iframe')) {
      const srcMatch = trimmed.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1].replace(/&amp;/g, '&');
      }
    }
    return trimmed;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
      <Header title="Aulas e Slides" />
      
      <div className="p-4 space-y-6 overflow-y-auto w-full max-w-full flex-1 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="animate-spin text-navy" size={40} />
            <p className="text-sm font-semibold text-gray-500 font-body">
              Carregando as aulas da planilha do Google...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1">
                  <p className="font-semibold" id="offline-error-alert">Sincronização Offline</p>
                  <p className="mt-0.5 opacity-90">{error}</p>
                </div>
                <button 
                  onClick={loadData}
                  className="p-1 hover:bg-amber-100 rounded-lg text-amber-900 flex items-center justify-center transition-colors self-center"
                  title="Tentar recarregar"
                  id="reload-aulas-btn"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            )}

            {aulas.length === 0 ? (
              <div className="text-center py-16 text-gray-500 font-body" id="no-aulas-message">
                Nenhuma aula disponível no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="aulas-grid">
                {aulas.map((aula, idx) => {
                  const clickUrl = getClickableLink(aula);
                  
                  return (
                    <a 
                      key={aula.id} 
                      href={clickUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row items-stretch p-0 w-full animate-fade-in hover:shadow-md hover:border-[#079551] transition-all duration-300 cursor-pointer text-left"
                      id={`aula-card-${idx}`}
                    >
                      <div className="w-full sm:w-44 h-48 sm:h-auto bg-gray-50 relative flex-shrink-0 overflow-hidden border-b sm:border-b-0 sm:border-r border-gray-100">
                        {aula.imageUrl ? (
                          <img 
                            src={aula.imageUrl} 
                            alt={aula.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-50/50 text-navy flex flex-col items-center justify-center p-4">
                            <span className="material-symbols-outlined text-navy/30 mb-1" style={{ fontSize: '36px' }}>co_present</span>
                            <span className="text-[10px] font-bold tracking-wider text-navy/40 uppercase">Aula / Slides</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                        <div className="space-y-2">
                          <h3 className="text-base font-bold text-navy font-heading leading-snug group-hover:text-[#079551] transition-colors">
                            {aula.title}
                          </h3>
                          <p className="text-sm text-gray-600 font-body leading-relaxed line-clamp-3">
                            {aula.description || 'Instrução do curso de saúde'}
                          </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-end">
                          <span 
                            className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center transition-all shadow-sm group-hover:bg-[#079551] group-hover:text-white"
                            title="Abrir Link"
                            id={`action-icon-trigger-${idx}`}
                          >
                            <ExternalLink size={18} />
                          </span>
                        </div>
                      </div>
                    </a>
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