import React, { useRef, useState } from 'react';

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
      const response = await fetch("/api/gemini/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.text);
      } else {
        setError(data.error || "Ocorreu um erro ao analisar a imagem.");
      }
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
        onClick={() => setIsOpen(true)}
        className="text-white hover:text-gold transition-colors flex items-center justify-center p-1"
        title="Analisar Imagem"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>document_scanner</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-navy/15 flex justify-between items-center bg-navy text-white">
              <h3 className="font-heading font-bold text-lg flex items-center">
                <span className="material-symbols-outlined mr-2">document_scanner</span>
                Extrair informações
              </h3>
              <button 
                onClick={() => { setIsOpen(false); reset(); }}
                className="text-white hover:text-gold transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-navy/5 flex flex-col gap-4">
              {!image ? (
                <div 
                  className="border-2 border-dashed border-navy/30 rounded-xl p-8 flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-navy/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-4xl text-navy/50 mb-2">add_a_photo</span>
                  <p className="text-navy/70 font-medium">Toque para selecionar uma imagem</p>
                  <p className="text-sm text-navy/50 mt-1">JPEG ou PNG</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative rounded-xl overflow-hidden border border-navy/20 bg-white max-h-64 flex justify-center">
                    <img src={image} alt="Preview" className="max-h-64 object-contain" />
                    <button
                      onClick={reset}
                      className="absolute top-2 right-2 bg-navy/80 text-white p-1 rounded-full hover:bg-[#B42318] transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  
                  {!result && !isAnalyzing && (
                    <button
                      onClick={handleAnalyze}
                      className="w-full bg-navy text-white font-heading font-bold py-3 min-h-[48px] rounded-xl hover:bg-navy/90 transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined mr-2">auto_awesome</span>
                      Analisar Imagem
                    </button>
                  )}

                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-navy font-semibold text-sm animate-pulse">
                        Extraindo informações...
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-[#FEE4E2] text-[#B42318] p-4 rounded-xl text-sm border border-[#FDA29B]">
                      {error}
                    </div>
                  )}

                  {result && (
                    <div className="bg-white p-4 rounded-xl border border-navy/20 shadow-sm">
                      <h4 className="font-heading font-bold text-navy mb-2 flex items-center text-sm border-b pb-2">
                        <span className="material-symbols-outlined mr-2 text-gold">check_circle</span>
                        Resultado da Análise
                      </h4>
                      <div className="whitespace-pre-wrap text-sm text-navy/80 font-body">
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
