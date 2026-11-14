import React, { useRef, useState } from 'react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { chamarServidor } from '../services/apiClient';

export const ImageScanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      // Remove data:image/jpeg;base64, prefix
      const base64Data = image.split(',')[1];
      const data = await chamarServidor<{ text: string }>("/api/gemini/analyze-image", { image: base64Data });
      setResult(data.text);
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao analisar a imagem.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-white hover:text-gold transition-colors flex items-center justify-center w-10 h-10 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        title="Analisar imagem" aria-label="Analisar imagem"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px' }} aria-hidden="true">document_scanner</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-dialog flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-navy/15 flex justify-between items-center bg-navy text-white">
              <h3 className="text-h3 flex items-center">
                <span className="material-symbols-outlined mr-2" aria-hidden="true">document_scanner</span>
                Extrair informações
              </h3>
              <button
                type="button"
                onClick={() => { setIsOpen(false); reset(); }}
                aria-label="Fechar" title="Fechar"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-navy/5 flex flex-col gap-4">
              {!image ? (
                <button
                  type="button"
                  className="w-full border-2 border-dashed border-navy/30 rounded-lg p-8 flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-navy/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-[28px] text-navy/50 mb-2" aria-hidden="true">add_a_photo</span>
                  <p className="text-navy/70 font-medium">Selecionar uma imagem</p>
                  <p className="text-sm text-navy/50 mt-1">JPEG, PNG ou WebP</p>
                </button>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative rounded-xl overflow-hidden border border-navy/20 bg-white max-h-64 flex justify-center">
                    <img src={image} alt="Preview" className="max-h-64 object-contain" />
                    <IconButton icon="close" label="Remover imagem" variant="overlay" size="sm" className="absolute top-2 right-2" onClick={reset} />
                  </div>
                  
                  {!result && !isAnalyzing && (
                    <Button icon="auto_awesome" fullWidth onClick={handleAnalyze}>Analisar imagem</Button>
                  )}

                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-navy font-semibold text-base animate-pulse">
                        Extraindo informações...
                      </p>
                    </div>
                  )}

                  {error && (
                    <div role="alert" className="bg-wine/10 text-wine p-4 rounded-lg text-base border border-wine/30">
                      {error}
                    </div>
                  )}

                  {result && (
                    <div className="bg-white p-4 rounded-xl border border-line">
                      <h4 className="text-h3 text-navy mb-2 flex items-center border-b border-line pb-2">
                        <span className="material-symbols-outlined mr-2 text-navy" aria-hidden="true">check_circle</span>
                        Resultado da análise
                      </h4>
                      <div className="whitespace-pre-wrap text-base text-navy/80 font-body">
                        {result}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
