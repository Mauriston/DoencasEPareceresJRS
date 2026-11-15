// Ficheiro: components/Mensagens.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button, ButtonLink } from './ui/Button';
import { Card } from './ui/Card';
import { IconButton } from './ui/IconButton';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { chamarScript } from '../services/apiClient';
import { gerarComGemini } from '../services/geminiAI';
import { PROMPT_MINUTA_MENSAGEM } from '../config/promptsIA';
import { logErroSeguro } from '../utils/logSeguro';

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
      // A minuta é gerada pelo Gemini (Firebase AI Logic); o Apps Script só a guarda como Google Doc no Drive.
      const r = await gerarComGemini({
        contexto: 'minuta de mensagem',
        instrucoes: PROMPT_MINUTA_MENSAGEM,
        arquivos: images.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
      });
      const texto = r.texto.trim();
      if (!texto) throw new Error('A IA não devolveu a minuta. Tente novamente.');
      setMinuta(texto);
      // Cópia no Drive: se falhar, a minuta continua na tela para copiar.
      chamarScript<{ docUrl: string }>('salvarMinutaMensagem', { minuta: texto })
        .then(d => setDocUrl(d.docUrl || null))
        .catch(e => logErroSeguro('Salvar minuta no Drive', e));
    } catch (err) {
      setError('Erro ao gerar minuta: ' + ((err as Error)?.message || 'tente novamente.'));
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

      <Container size="form" className="py-6 md:py-8 pt-4 md:pt-8 pb-10 space-y-6">
        <PageHeader title="Mensagens" description="Minutas das mensagens de IS auxiliadas por IA." />


        <Card as="section" titleAs="h2" title="Imagens da IS" className="space-y-4">

          <p className="text-xs text-ink-3 leading-relaxed">
            Adicione <strong>2 imagens por IS</strong>: a 1ª com os <strong>dados da inspeção</strong> e a 2ª com o <strong>resultado/laudo</strong>.
            Para múltiplas IS, adicione sempre em pares na ordem correta.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-line rounded-lg py-8 flex flex-col items-center justify-center gap-2 text-ink-3 hover:border-navy hover:text-navy transition-colors bg-paper/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <span className="material-symbols-outlined text-[40px]" aria-hidden="true">photo_camera</span>
            <span className="text-sm font-semibold">Tirar foto ou selecionar imagem</span>
            <span className="text-xs">
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
                  <div key={isIdx} className="bg-paper rounded-lg p-3 border border-line">
                    <p className="eyebrow mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">assignment</span>
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
                              <IconButton
                                icon="close" label={`Remover imagem ${offset + 1} da IS ${isIdx + 1}`} variant="overlay" size="sm"
                                className="absolute top-1 right-1" onClick={() => removeImage(isIdx * 2 + offset)}
                              />
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
                  {images.length} {images.length === 1 ? 'imagem' : 'imagens'} · {numIS} {numIS === 1 ? 'IS completa' : 'IS completas'}
                  {hasOddImage && (
                    <span className="text-gold-600 font-semibold">· par incompleto</span>
                  )}
                </span>
                <Button variant="ghost" size="sm" icon="delete" className="!text-wine" onClick={handleReset}>Limpar tudo</Button>
              </div>
            </div>
          )}
        </Card>

        {error && (
          <div role="alert" className="bg-wine-50 border border-wine-200 text-wine-700 text-sm p-4 rounded-xl flex items-start gap-2.5">
            <span className="material-symbols-outlined text-wine-500 text-[18px] shrink-0 mt-0.5">error</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {!minuta && (
          <Button icon="auto_awesome" fullWidth loading={isLoading} disabled={images.length === 0 || hasOddImage} onClick={handleGenerate}>
            {isLoading ? 'Analisando e gerando minuta…' : 'Gerar minuta'}
          </Button>
        )}

        {isLoading && (
          <p className="text-center text-xs text-ink-3 animate-pulse -mt-2">
            O Gemini AI está analisando as imagens e redigindo a minuta. Pode levar alguns segundos…
          </p>
        )}

        {minuta && (
          <Card as="section" padding="none" titleAs="h2" title="Minuta gerada" className="animate-fade-in">
            <pre className="px-5 pb-5 text-sm text-navy whitespace-pre-wrap font-body leading-relaxed border-b border-line">{minuta}</pre>

            {/* Uma primária por região (B4): Abrir no Drive; copiar e nova minuta como secundárias. */}
            <div className="px-5 py-4 flex flex-wrap gap-2">
              <Button variant="ghost" icon="refresh" onClick={handleReset}>Nova minuta</Button>
              <span className="flex-1" />
              <Button variant={docUrl ? 'secondary' : 'primary'} icon={copied ? 'check' : 'content_copy'} onClick={handleCopy}>{copied ? 'Copiado' : 'Copiar'}</Button>
              {docUrl && <ButtonLink href={docUrl} icon="open_in_new">Abrir no Drive</ButtonLink>}
            </div>
          </Card>
        )}
      </Container>
    </div>
  );
};