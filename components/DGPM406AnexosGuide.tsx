// Ficheiro: components/DGPM406AnexosGuide.tsx
import React from 'react';
import { Header } from './Header';
import { MoreVertical } from 'lucide-react'; // Ícone dos 3 pontinhos

interface Anexo {
  id: string;
  anexo: string;
  title: string;
  link: string;
}

const ANEXOS: Anexo[] = [
  { id: 'a1', anexo: 'ANEXO A', title: 'Estrutura básica do SMP', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a2', anexo: 'ANEXO D', title: 'Pedido de parecer DS-2', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a3', anexo: 'ANEXO E', title: 'Atestado de Origem', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a4', anexo: 'ANEXO E', title: 'EXAME DE SANIDADE', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a5', anexo: 'ANEXO G', title: 'Guia de atendimento médico para perícia menor', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a6', anexo: 'ANEXO I', title: 'Papeleta de dispensa', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a7', anexo: 'ANEXO J', title: 'TCLE para realização de exame toxicológico', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a8', anexo: 'ANEXO K', title: 'Perícia menor paragestantes saudáveis', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a9', anexo: 'ANEXO M', title: 'Tramitação de documentos e conclusões médico periciais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a10', anexo: 'ANEXO N', title: 'Padrões psicofísicos admissionais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a11', anexo: 'ANEXO O', title: 'Exames mínimos', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a12', anexo: 'ANEXO P', title: 'Padrões psicofísicos pós-admissionais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a13', anexo: 'ANEXO R', title: 'Modelos da processualística do ISO', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a14', anexo: 'ANEXO T', title: 'Reconhecimento de recurso', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a15', anexo: 'ANEXO U', title: 'Doenças previstas em lei', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a16', anexo: 'ANEXO V', title: 'Documentação médica pertinente às doenças previstas em lei', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a17', anexo: 'ANEXO W', title: 'Folha de anamnese dirigida', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a18', anexo: 'ANEXO Y', title: 'Cientificação resultado ingresso', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a19', anexo: 'ANEXO AB', title: 'Índices mínimos e condições incapacitantes para o serviço de praticagem', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
];

export const DGPM406AnexosGuide: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="ANEXOS DGPM-406 REV 9" />
      
      <div className="p-4 animate-fade-in overflow-auto pb-24 max-w-4xl mx-auto w-full">
        {/* Documentação: Contentor único da lista com separadores internos (divide-y) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden divide-y divide-gray-100">
          {ANEXOS.map((item) => (
            <a 
              key={item.id} 
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none cursor-pointer"
            >
              {/* Documentação: Lado esquerdo com os textos alinhados numa coluna */}
              <div className="flex flex-col pr-4 flex-1">
                <h3 className="text-[#050F41] font-heading font-bold text-[14px] leading-snug mb-1 group-hover:text-[#079551] transition-colors">
                  {item.anexo}
                </h3>
                <p className="text-gray-500 font-body text-[11px] font-medium leading-relaxed line-clamp-2">
                  {item.title}
                </p>
              </div>
              
              {/* Documentação: Lado direito com o ícone de 3 pontinhos alinhado */}
              <div className="text-gray-400 group-hover:text-[#050F41] transition-colors flex-shrink-0 bg-gray-50 group-hover:bg-blue-50/50 p-2 rounded-full">
                <MoreVertical size={18} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
