// Ficheiro: components/Mensagens.tsx
import React, { useState, useRef } from 'react';
import { Header } from './Header';

const GAS_URL = "https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec";

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

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: ImageItem[] = [];
    for (const file of Array.from(files)) {
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
      const payload = {
        action: 'gerarMinutaMensagem',
        images: images.map(img => ({ data: img.base64, mimeType: img.mimeType })),
      };
      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setMinuta(data.minuta);
        setDocUrl(data.docUrl);
      } else {
        setError('Erro ao gerar minuta: ' + (data.message || 'Tente novamente.'));
      }
    } catch (err) {
      console.error(err);
      setError('Falha na comunicação com o servidor. Verifique a conexão e tente novamente.');
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
      // fallback for older browsers
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
    <div className="flex flex-col h-full bg-gray-50 relative">
      <Header title="MENSAGENS" />

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-28 w-full max-w-2xl mx-auto space-y-5">

        {/* Upload Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="font-heading font-bold text-navy text-base flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="material-symbols-outlined text-gold">add_photo_alternate</span>
            Imagens da IS
          </h2>

          <p className="text-xs text-gray-500 leading-relaxed">
            Adicione <strong>2 imagens por IS</strong>: a 1ª com os <strong>dados da inspeção</strong> e a 2ª com o <strong>resultado/laudo</strong>.
            Para múltiplas IS, adicione sempre em pares na ordem correta.
          </p>

          {/* Click/tap zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#050F41] hover:text-[#050F41] transition-colors bg-gray-50/50 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[40px]">photo_camera</span>
            <span className="text-sm font-semibold">Tirar foto ou selecionar imagem</span>
            <span className="text-xs opacity-60">Câmera · Galeria · Arquivos do dispositivo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFilesSelected(e.target.files)}
          />

          {/* Image preview pairs */}
          {images.length > 0 && (
            <div className="space-y-3 pt-1">
              {Array.from({ length: Math.ceil(images.length / 2) }).map((_, isIdx) => {
                const img1 = images[isIdx * 2];
                const img2 = images[isIdx * 2 + 1];
                return (
                  <div key={isIdx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-[#050F41]/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[12px]">assignment</span>
                      IS {isIdx + 1}
                      {!img2 && <span className="text-amber-500 font-semibold">· aguardando Img 2</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[img1, img2].map((img, offset) => (
                        <div key={offset} className="relative group">
                          {img ? (
                            <>
                              <img
                                src={img.preview}
                                alt={`IS ${isIdx + 1} Imagem ${offset + 1}`}
                                className="w-full aspect-video object-cover rounded-lg border border-gray-200 bg-gray-100"
                              />
                              <span className="absolute top-1.5 left-1.5 bg-[#050F41]/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                Img {offset + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeImage(isIdx * 2 + offset)}
                                className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[13px]">close</span>
                              </button>
                            </>
                          ) : (
                            <div className="w-full aspect-video border-2 border-dashed border-amber-200 rounded-lg flex flex-col items-center justify-center gap-1 bg-amber-50/50 text-amber-400">
                              <span className="material-symbols-outlined text-[20px]">image</span>
                              <span className="text-[10px] font-medium">Img 2 pendente</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Summary bar */}
              <div className="flex items-center justify-between pt-1 px-1">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">photo_library</span>
                  {images.length} imagem{images.length !== 1 ? 's' : ''} · {numIS} IS completa{numIS !== 1 ? 's' : ''}
                  {hasOddImage && (
                    <span className="text-amber-600 font-semibold">· par incompleto</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Limpar tudo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">error</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Generate button */}
        {!minuta && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || images.length === 0 || hasOddImage}
            className="w-full py-4 bg-[#050F41] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#050F41]/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-sm"
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
          <p className="text-center text-xs text-gray-400 animate-pulse -mt-2">
            O Gemini AI está analisando as imagens e redigindo a minuta. Pode levar alguns segundos...
          </p>
        )}

        {/* Result card */}
        {minuta && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">

            {/* Card header */}
            <div className="bg-[#050F41] px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[18px] text-[#079551]">task_alt</span>
                <span className="font-heading font-bold text-sm uppercase tracking-wide">Minuta Gerada</span>
              </div>
              <div className="flex items-center gap-3">
                {docUrl && (
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-white transition-colors"
                    title="Abrir no Google Docs"
                  >
                    <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Copiar texto"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {copied ? 'check_circle' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Minuta text */}
            <pre className="p-5 text-sm text-gray-800 whitespace-pre-wrap font-body leading-relaxed border-b border-gray-100">
              {minuta}
            </pre>

            {/* Action buttons */}
            <div className="px-5 py-4 flex gap-2.5">
              {docUrl && (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-[#079551] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-green-700 transition-colors active:scale-[0.97]"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Abrir no Drive
                </a>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors active:scale-[0.97]"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-2.5 px-4 bg-gray-100 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors active:scale-[0.97]"
                title="Nova minuta"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
