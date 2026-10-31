// Ficheiro: components/periciaMenor/RecorteAtestado.tsx
// Recorte da foto do atestado (tela cheia): o usuário seleciona a área com nome, datas e CID e a
// imagem recortada (JPEG) volta para a leitura por IA e para o PDF do atestado.
import React, { useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/Button';
import { Crop as CropIcon, X } from '@/components/ui/icons';

interface Props {
  imagem: string;
  onConfirmar: (dataUrl: string) => void;
  onCancelar: () => void;
}

export const RecorteAtestado: React.FC<Props> = ({ imagem, onConfirmar, onCancelar }) => {
  const [crop, setCrop] = useState<Crop>();
  const [concluido, setConcluido] = useState<PixelCrop>();
  const img = useRef<HTMLImageElement>(null);

  const confirmar = () => {
    const el = img.current;
    // Sem seleção: usa a foto inteira.
    if (!el || !concluido || concluido.width <= 0) {
      const inteira = document.createElement('canvas');
      if (!el) { onCancelar(); return; }
      inteira.width = el.naturalWidth; inteira.height = el.naturalHeight;
      inteira.getContext('2d')?.drawImage(el, 0, 0);
      onConfirmar(inteira.toDataURL('image/jpeg', 0.7));
      return;
    }
    const escalaX = el.naturalWidth / el.width;
    const escalaY = el.naturalHeight / el.height;
    const canvas = document.createElement('canvas');
    canvas.width = concluido.width * escalaX; canvas.height = concluido.height * escalaY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(el, concluido.x * escalaX, concluido.y * escalaY, concluido.width * escalaX, concluido.height * escalaY, 0, 0, canvas.width, canvas.height);
    onConfirmar(canvas.toDataURL('image/jpeg', 0.7));
  };

  return (
    <div className="fixed inset-0 z-dialog bg-black/90 flex flex-col animate-fade-in" role="dialog" aria-modal="true" aria-label="Recortar atestado">
      <div className="p-4 bg-black flex justify-between items-center text-white shrink-0 border-b border-white/20">
        <h2 className="font-bold flex items-center gap-2 text-sm"><CropIcon size={20} className="text-gold" aria-hidden="true" /> Recortar atestado</h2>
        <button type="button" onClick={onCancelar} aria-label="Cancelar recorte" className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-lg hover:bg-white/10"><X size={22} aria-hidden="true" /></button>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <ReactCrop crop={crop} onChange={(_, pct) => setCrop(pct)} onComplete={c => setConcluido(c)}>
          <img ref={img} src={imagem} alt="Atestado a recortar" className="max-h-[70vh] w-auto" />
        </ReactCrop>
      </div>
      <div className="p-4 bg-black shrink-0 pb-10">
        <p className="text-white/70 text-sm text-center mb-4">Arraste os cantos para selecionar nome, datas e o CID.</p>
        <Button fullWidth icon="check" onClick={confirmar}>Confirmar recorte</Button>
      </div>
    </div>
  );
};
