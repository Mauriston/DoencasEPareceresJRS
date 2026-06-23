// Ficheiro: components/ArtigoPericiaMedica.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ArtigoPericiaMedica: React.FC<Props> = ({ onBack }) => {
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
        title="PERÍCIA MÉDICA" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-6 max-w-3xl mx-auto w-full flex-1 pb-32">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm text-center">
          <h1 className="text-xl font-heading font-bold text-[#050F41] mb-4 uppercase">Perícia Médica</h1>
          <div className="bg-gray-50 rounded-xl p-4 inline-block text-left text-xs text-gray-600 font-body space-y-1.5 border border-gray-100">
            <p><strong>Simone Moraes Stefani Nakano:</strong> Doutora em Cirurgia do Aparelho Digestivo pela USP. Membro da Câmara Técnica em Perícia do Cremego. Perita médica do INSS em Goiás.</p>
            <p><strong>Salomão Rodrigues Filho:</strong> Médico psiquiatra. Presidente do Cremego.</p>
            <p><strong>Iliam Cardoso dos Santos:</strong> Mestre em Otorrinolaringologia pela Faculdade de Medicina de Ribeirão Preto. Vice-presidente do Cremego.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Introdução: Perícia médica e auditoria médica</h2>
          <p>Perícia médica, em sentido amplo, é ato privativo do médico, podendo ser exercida pelo médico civil ou militar, desde que investido em função que lhe assegure a competência legal e administrativa para tal.</p>
          <p><mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">Perícia é todo e qualquer ato propedeutico ou exame realizado por médico, com a finalidade de contribuir com as autoridades administrativas, policiais ou judiciárias na formação de juízos a que estão obrigadas.</mark></p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">O Perito</h2>
          <p><mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">É todo técnico que, designado pela Justiça, recebe o encargo de esclarecer fatos/acontecimentos num processo.</mark> Sua atuação ocorre em qualquer fase, policial ou judiciária, do processo.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Situação atual da perícia médica</h2>
          <h3 className="font-heading font-bold text-[#050F41] pt-4"Áreas de atuação profissional</h3>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>A perícia administrativa</strong> pode ser definida como o exame médico-pericial realizado no servidor público, regido por estatuto ou regimento próprio. Destina-se aos servidores públicos civis e militares.</li>
            <li><strong>A perícia médica judicial</strong> é o meio de prova realizada por profissional da medicina legalmente habilitado, visando informar e esclarecer alguma autoridade sobre fato próprio de sua especificidade funcional, no interesse da Justiça.</li>
            <li><strong>A perícia médico-legal</strong> é um conjunto de procedimentos médicos e técnicos que tem como finalidade o esclarecimento de um fato de interesse da Justiça.</li>
            <li><strong>A perícia médica previdênciaria</strong> tem por finalidade precípua a emissão de parecer técnico conclusivo, quando da avaliação da incapacidade laborativa.</li>
            <li><strong>A perícia securitária</strong> constitui procedimento técnico diretamente ligado à Medicina de Seguros e ao ramo de seguro de pessoas.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Preceitos desejáveis da atuação médico-pericial</h2>
          <p className="font-bold text-center text-navy my-4">
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">"Aquele que compreender que não poderá ser um perito honesto, seja honesto, não seja perito" (Abraham Lincoln).</mark>
          </p>
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