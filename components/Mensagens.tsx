// Ficheiro: components/Mensagens.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Container, PageHeader } from './ui/Page';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { ApiError, chamarScript } from '../services/apiClient';

interface ImageItem {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

export const Mensagens: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [minuta, setMinuta] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: file.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const newItems: ImageItem[] = [];
    for (const file of files) {
      const { base64, mimeType } = await fileToBase64(file);
      newItems.push({
        file,
        preview: URL.createObjectURL(file),
        base64,
        mimeType,
      });
    }
    setImages(prev => [...prev, ...newItems]);
    setMinuta(null);
    setDocUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Desktop: cola (Ctrl+V) uma ou mais imagens da área de transferência
  // diretamente no campo, sem precisar selecionar arquivo/câmera. Ouve a
  // página inteira (não só o campo) para não depender de foco em elemento
  // específico, evitando as inconsistências de foco em <button> entre navegadores.
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = Array.from(items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((f): f is File => !!f);
    if (imageFiles.length === 0) return;
    e.preventDefault();
    handleFilesSelected(imageFiles);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isDesktop, handlePaste]);

  const removeImage = (idx: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleGenerate = async () => {
    if (images.length === 0) { setError('Adicione pelo menos duas imagens (par por IS).'); return; }
    if (images.length % 2 !== 0) { setError('Cada IS requer exatamente 2 imagens. Verifique se todos os pares estão completos.'); return; }

    setIsLoading(true);
    setMinuta(null);
    setDocUrl(null);
    setError(null);

    try {
      const resultado = await chamarScript<{ minuta: string; docUrl: string }>('gerarMinutaMensagem', {
        images: images.map(img => ({ data: img.base64, mimeType: img.mimeType })),
      });
      setMinuta(resultado.minuta);
      setDocUrl(resultado.docUrl);
    } catch (err) {
      setError(err instanceof ApiError && err.codigo === 'negocio'
        ? 'Erro ao gerar minuta: ' + err.message
        : err instanceof ApiError ? err.message : 'Falha na comunicação com o servidor. Verifique a conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!minuta) return;
    try {
      await navigator.clipboard.writeText(minuta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = minuta;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setMinuta(null);
    setDocUrl(null);
    setError(null);
  };

  const numIS = Math.floor(images.length / 2);
  const hasOddImage = images.length % 2 !== 0;

  return (
    <div className="flex flex-col flex-1 relative">

      <Container size="form" className="py-6 md:py-8 pb-10 space-y-5">
        <PageHeader title="Mensagens" description="Minutas das mensagens de IS auxiliadas por IA." />


        <div className="bg-white rounded-2xl border border-line shadow-sm p-5 space-y-4">
          <h2 className="font-heading font-bold text-navy text-base flex items-center gap-2 border-b border-line pb-2">
            <span className="material-symbols-outlined text-navy">add_photo_alternate</span>
            Imagens da IS
          </h2>

          <p className="text-xs text-ink-3 leading-relaxed">
            Adicione <strong>2 imagens por IS</strong>: a 1ª com os <strong>dados da inspeção</strong> e a 2ª com o <strong>resultado/laudo</strong>.
            Para múltiplas IS, adicione sempre em pares na ordem correta.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-line rounded-xl py-8 flex flex-col items-center justify-center gap-2 text-ink-3 hover:border-navy hover:text-navy transition-colors bg-paper/50 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[40px]">photo_camera</span>
            <span className="text-sm font-semibold">Tirar foto ou selecionar imagem</span>
            <span className="text-xs opacity-60">
              {isDesktop ? 'Galeria · Arquivos · Colar (Ctrl+V)' : 'Câmera · Galeria · Arquivos do dispositivo'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFilesSelected(Array.from(e.target.files || []))}
          />

          {images.length > 0 && (
            <div className="space-y-3 pt-1">
              {Array.from({ length: Math.ceil(images.length / 2) }).map((_, isIdx) => {
                const img1 = images[isIdx * 2];
                const img2 = images[isIdx * 2 + 1];
                return (
                  <div key={isIdx} className="bg-paper rounded-xl p-3 border border-line">
                    <p className="text-xs font-bold text-navy/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">assignment</span>
                      IS {isIdx + 1}
                      {!img2 && <span className="text-gold-600 font-semibold">· aguardando Img 2</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[img1, img2].map((img, offset) => (
                        <div key={offset} className="relative group">
                          {img ? (
                            <>
                              <img
                                src={img.preview}
                                alt={`IS ${isIdx + 1} Imagem ${offset + 1}`}
                                className="w-full aspect-video object-cover rounded-lg border border-line bg-thead"
                              />
                              <span className="absolute top-1.5 left-1.5 bg-navy/75 text-white text-xs font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                Img {offset + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeImage(isIdx * 2 + offset)}
                                aria-label="Remover imagem" title="Remover imagem"
                                className="absolute top-1 right-1 bg-wine text-white rounded-full w-11 h-11 flex items-center justify-center hover:bg-wine-dark transition-colors shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                              </button>
                            </>
                          ) : (
                            <div className="w-full aspect-video border-2 border-dashed border-gold-200 rounded-lg flex flex-col items-center justify-center gap-1 bg-gold-50/50 text-gold-400">
                              <span className="material-symbols-outlined text-[20px]">image</span>
                              <span className="text-xs font-medium">Img 2 pendente</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-1 px-1">
                <span className="text-xs text-ink-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">photo_library</span>
                  {images.length} imagem{images.length !== 1 ? 's' : ''} · {numIS} IS completa{numIS !== 1 ? 's' : ''}
                  {hasOddImage && (
                    <span className="text-gold-600 font-semibold">· par incompleto</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-wine-500 hover:text-wine-600 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Limpar tudo
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-wine-50 border border-wine-200 text-wine-700 text-sm p-4 rounded-xl flex items-start gap-2.5">
            <span className="material-symbols-outlined text-wine-500 text-[18px] shrink-0 mt-0.5">error</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {!minuta && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || images.length === 0 || hasOddImage}
            className="w-full py-4 bg-navy text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-navy/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-sm"
          >
            {isLoading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                Analisando e gerando minuta...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                Gerar Minuta
              </>
            )}
          </button>
        )}

        {isLoading && (
          <p className="text-center text-xs text-ink-3 animate-pulse -mt-2">
            O Gemini AI está analisando as imagens e redigindo a minuta. Pode levar alguns segundos...
          </p>
        )}

        {minuta && (
          <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden animate-fade-in">
            <div className="bg-navy px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[18px] text-gold">task_alt</span>
                <span className="font-heading font-bold text-sm uppercase tracking-wide">Minuta Gerada</span>
              </div>
              <div className="flex items-center gap-3">
                {docUrl && (
                  <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors" title="Abrir no Google Docs">
                    <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                  </a>
                )}
                <button type="button" onClick={handleCopy} className="text-white/60 hover:text-white transition-colors" title="Copiar texto">
                  <span className="material-symbols-outlined text-[20px]">{copied ? 'check_circle' : 'content_copy'}</span>
                </button>
              </div>
            </div>

            <pre className="p-5 text-sm text-navy whitespace-pre-wrap font-body leading-relaxed border-b border-line">{minuta}</pre>

            <div className="px-5 py-4 flex gap-2.5">
              {docUrl && (
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-green-700 transition-colors active:scale-[0.97]">
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Abrir no Drive
                </a>
              )}
              <button type="button" onClick={handleCopy} className="flex-1 py-2.5 bg-thead text-ink rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-line transition-colors active:scale-[0.97]">
                <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button type="button" onClick={handleReset} className="py-2.5 px-4 bg-thead text-ink-3 rounded-lg text-sm font-semibold hover:bg-line transition-colors active:scale-[0.97]" title="Nova minuta">
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};