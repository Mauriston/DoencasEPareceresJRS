// Ficheiro: components/ArtigoPerfilPerito.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ArtigoPerfilPerito: React.FC<Props> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;
    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 56);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="O PERFIL DO MÉDICO PERITO" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-6 max-w-3xl mx-auto w-full flex-1 pb-32">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm text-center">
          <h1 className="text-xl font-heading font-bold text-[#050F41] mb-4 uppercase">O Perfil do Perito Médico</h1>
          <div className="bg-gray-50 rounded-xl p-4 inline-block text-left text-xs text-gray-600 font-body space-y-1.5 border border-gray-100">
            <p><strong>Tereza Chedid:</strong> Especialista em Psiquiatria Clínica e Legal/Forense, atuando na área da Perícia Médica Previdenciária e Forense, como assistente técnica, ou perita de Juízo, desde 1983.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Atributos importantes ao perfil do perito médico</h2>
          <p><mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">Na definição da palavra perito vimos que este especialista terá que deter conhecimentos especiais e minuciosos, gostar de estudar leis e decretos muitas vezes de áreas diversas à medicina, pois, sem dúvida, a atividade pericial é interdisciplinar com a Administração, com o Direito, com a Biologia, com a Física.</mark></p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>sólida formação clínica;</li>
            <li>dominio amplo e atualização constante da legislação pertinente;</li>
            <li>ser imparcial, isento de preconceitos, resolutivo e independente no sentido decisório;</li>
            <li>elaborar seus laudos/relatórios/pareceres de forma clara, objetiva, resolutiva, concisa e coerente;</li>
            <li>jamais basear suas conclusões em suposições, probabilidades ou possibilidades;</li>
            <li>o perito médico deve ter conhecimento pleno do Código de Ética Médica vigente.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">O perito médico previdênciario</h2>
          <p><mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">O perito médico não examina o segurado com a finalidade de assisti-lo ou medicá-lo. O profissional imbuído da função pericial está a serviço de uma autoridade, de um ministério com uma legislação própria.</mark></p>
          <div className="border-l-4 border-navy pl-4 py-2 my-4 bg-gray-50/50 rounded-r-lg italic font-medium">
            "O perito médico não deve negar o que é legítimo e nem conceder o que não é devido e não é seu" (BRASIL, 1993).
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Mensagem</h2>
          <p className="font-bold text-center text-[#050F41] mt-4 uppercase">Acima de tudo, somos médicos, sempre!</p>
        </div>

      </div>

      {showScrollTop && (
        <button 
          onClick={() => {
              const container = document.querySelector('main');
              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          className="fixed bottom-24 right-6 bg-[#050F41] text-white shadow-2xl rounded-full p-4 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-slate-700"
          title="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};