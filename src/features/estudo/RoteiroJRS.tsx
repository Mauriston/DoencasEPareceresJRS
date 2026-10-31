// Ficheiro: features/estudo/RoteiroJRS.tsx
import React, { useState } from 'react';
import { Container, PageHeader } from '@/components/ui/Page';
import { getDriveEmbedUrl, isGoogleDriveUrl } from '@/utils/googleDrive';
import { 
  MonitorPlay, FileText, Image as ImageIcon, PlayCircle, 
  GraduationCap, BookOpen, Book, Gavel, Scale, ChevronDown, X 
} from '@/components/ui/icons';
import ROTEIRO_DATA from '@/../content/resumos-dgpm/roteiro.json';

const extractLink = (htmlString: string) => {
  const srcMatch = htmlString.match(/src="([^"]+)"/);
  if (srcMatch) return srcMatch[1];
  const hrefMatch = htmlString.match(/href="([^"]+)"/);
  if (hrefMatch) return hrefMatch[1];
  return htmlString;
};

const getIconForFormat = (formato: string) => {
  const fmt = formato.toLowerCase();
  if (fmt.includes('apresentação')) return <MonitorPlay size={18} />;
  if (fmt.includes('vídeo')) return <PlayCircle size={18} />;
  if (fmt.includes('aula')) return <GraduationCap size={18} />;
  if (fmt.includes('infográfico')) return <ImageIcon size={18} />;
  if (fmt.includes('ordem') || fmt.includes('manual')) return <FileText size={18} />;
  if (fmt.includes('capítulo') || fmt.includes('artigo')) return <BookOpen size={18} />;
  if (fmt.includes('norma')) return <Scale size={18} />;
  if (fmt.includes('lei')) return <Gavel size={18} />;
  return <Book size={18} />;
};

export const RoteiroJRS: React.FC = () => {
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);

  const toggleModule = (id: number) => {
    setExpandedModule(expandedModule === id ? null : id);
  };

  const handleMaterialClick = (rawUrl: string) => {
    const link = extractLink(rawUrl);
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      setActiveVideoUrl(link);
    } else if (link.includes('imgur.com')) {
      setActiveImageUrl(link);
    } else if (isGoogleDriveUrl(link)) {
      const embedUrl = getDriveEmbedUrl(link);
      if (embedUrl) setActivePdfUrl(embedUrl);
      else window.open(link, '_blank');
    } else {
      window.open(link, '_blank');
    }
  };

  return (
    <div className="flex flex-col flex-1">
      
      <Container size="reading" className="py-6 md:py-8 pb-10 ">
        <PageHeader title="Roteiro JRS" description="Trilha de estudos para capacitação dos AMP." />

        <div className="mb-4 bg-white p-5 rounded-2xl shadow-sm border border-line/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink font-body leading-relaxed">
                Trilha estruturada de aprendizagem e consulta rápida para capacitação dos Agentes Médico-Periciais.
              </p>
            </div>
            <div className="text-navy p-1 flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>school</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {ROTEIRO_DATA.modulos.map((mod) => {
            const isExpanded = expandedModule === mod.modulo_id;

            return (
              <div key={mod.modulo_id} className="bg-white rounded-2xl shadow-sm border border-line/60 overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => toggleModule(mod.modulo_id)}
                  className={`w-full group flex items-center justify-between p-4 transition-colors focus:outline-none cursor-pointer ${isExpanded ? 'bg-paper/50' : 'hover:bg-paper/80'}`}
                >
                  <div className="flex flex-col pr-4 flex-1 text-left">
                    <h3 className={`font-heading font-bold text-sm leading-snug mb-1 transition-colors ${isExpanded ? 'text-navy' : 'text-navy group-hover:text-navy'}`}>
                      {mod.modulo}
                    </h3>
                    <p className="text-ink-3 font-body text-xs font-medium leading-relaxed uppercase">
                      Módulo {mod.modulo_id}
                    </p>
                  </div>
                  <div className={`text-ink-3 p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 text-navy' : 'group-hover:text-navy group-hover:bg-thead'}`}>
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="bg-white border-t border-line divide-y divide-line flex flex-col">
                    {mod.materiais.map((mat, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleMaterialClick(mat.url)}
                        className="group flex items-center justify-between py-3 px-4 hover:bg-paper transition-colors focus:outline-none cursor-pointer text-left"
                      >
                        <div className="flex flex-col pr-3 flex-1 min-w-0">
                          <h4 className="text-navy font-heading font-bold text-sm leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">
                            {mat.titulo}
                          </h4>
                          <p className="text-ink-3 font-body text-xs leading-relaxed line-clamp-1 uppercase tracking-wider font-semibold">
                            {mat.formato}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-ink-3 group-hover:text-blue-600 p-2 rounded-full bg-paper group-hover:bg-blue-50 border border-line shadow-sm transition-all">
                          {getIconForFormat(mat.formato)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>

      {activeVideoUrl && (
        <div className="fixed inset-0 z-dialog bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-4xl relative">
            <button 
              onClick={() => setActiveVideoUrl(null)} 
              className="absolute -top-12 right-0 text-white hover:text-ink-5 bg-white/10 p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-black border border-navy">
              <iframe 
                src={activeVideoUrl} 
                className="w-full h-full border-0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {activeImageUrl && (
        <div className="fixed inset-0 z-dialog bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
            <button 
              onClick={() => setActiveImageUrl(null)} 
              className="absolute top-4 right-4 text-white hover:text-ink-5 bg-white/10 p-2 rounded-full transition-colors z-10"
            >
              <X size={24} />
            </button>
            <img
              src={activeImageUrl}
              alt="Visualização em ecrã inteiro"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {activePdfUrl && (
        <div className="fixed inset-0 z-dialog bg-black/95 flex flex-col p-4 animate-fade-in backdrop-blur-sm">
          <button
            onClick={() => setActivePdfUrl(null)}
            className="self-end text-white hover:text-ink-5 bg-white/10 p-2 rounded-full transition-colors mb-2 shrink-0"
          >
            <X size={24} />
          </button>
          <iframe
            src={activePdfUrl}
            title="Documento"
            className="flex-1 w-full rounded-xl bg-white shadow-2xl border-0"
          />
        </div>
      )}
    </div>
  );
};
