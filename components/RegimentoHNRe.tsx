// Ficheiro: components/RegimentoHNRe.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp, Download } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const RegimentoHNRe: React.FC<Props> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    if (!scrollContainer) return;

    const handleScroll = () => {
      setShowScrollTop(scrollContainer.scrollTop > 250);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const rawMarkdown = `
## REGIMENTO INTERNO DO HOSPITAL NAVAL DE RECIFE
## CAPÍTULO I
## Da Organização
Art. 1 - A estrutura organizacional básica do Hospital Naval de Recife (HNRe) encontra-se definida em seu Regulamento, aprovado pela Portaria nº 56/2010, do Comando de Operações Navais (ComOpNav). O detalhamento dessa estrutura está disposto nos artigos deste capítulo e representado, de forma sintética, no organograma constante do Anexo A do presente Regimento Interno (RI).
Art. 2 - O HNRe tem como titular um Diretor (HNRe-01), oficial superior da ativa do Quadro de Médicos do Corpo de Saúde da Marinha (CSM), sendo diretamente auxiliado pelo Vice-Diretor (HNRe-02), seguindo sua antiguidade em relação ao Diretor.
Parágrafo único – Subordinados diretamente ao Diretor encontram-se ainda:
I - Assessoria de Inteligência (HNRe-01.1);
II - Assessoria Jurídica (HNRe-01.2);
III - Assessoria de Gestão e Controle (HNRe-01.3);
IV - Assessoria de Comunicação Social (HNRe-01.4);
V - Serviço de Ouvidoria (HNRe-01.5);
VI - Conselho Técnico (HNRe-03);
VII - Gabinete (HNRe-04); e
VIII - Conselho de Gestão (HNRe-05).
## CAPÍTULO II
## Das Atribuições dos Elementos Componentes
## CAPÍTULO III
## Do Pessoal
Art. 112 - A Força de Trabalho é composta por todo o pessoal que serve ou trabalha de forma permanente ou temporária na OM, distribuídos com base na Tabela Mestra da Força de Trabalho – TMFT.
## CAPÍTULO IV
## Dos Deveres Funcionais
Art. 115 - Compete ao Diretor:
I - presidir as reuniões dos conselhos técnico e de gestão;
## CAPÍTULO V
## Das Substituições Funcionais Eventuais
Art. 124 - A substituição no exercício dos diversos cargos, previstos neste RI, far-se-á como se segue:
I - o Diretor, pelo Vice-Diretor:
## CAPÍTULO VI
## Outros Assuntos
Art. 125 - O presente RI será complementado por Ordens Internas, emanadas pelo Diretor em função dos temas e assuntos que se fizerem necessários, no interesse do bom funcionamento do HNRe.
  `;

  // Processamento do texto para remover notas de página e transformar os headers
  const processedText = useMemo(() => {
    return rawMarkdown
      .replace(/-\s*\d+\s*de\s*\d+\s*-/g, '') // Remove "- X de 32 -"
      .replace(/Continuação do anexo, da Port nº 107\/2025, do HNRe\./g, '') // Remove "Continuação..."
      .replace(/Anexo da Port nº 107\/2025, do HNRe\./g, '') // Remove "Anexo da Port..."
      .split('\n')
      .filter(line => line.trim() !== ''); // Limpa linhas vazias
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="REGIMENTO INTERNO HNRE" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-4 max-w-3xl mx-auto w-full flex-1 pb-32">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm font-body">
          {processedText.map((line, idx) => {
            if (line.startsWith('##')) {
              const text = line.replace('##', '').trim();
              return (
                <h2 key={idx} className="text-lg md:text-xl font-heading font-bold text-[#050F41] mt-8 mb-3 uppercase border-b border-gray-100 pb-2">
                  {text}
                </h2>
              );
            }
            
            const articleMatch = line.match(/^(Art\.?\s*\d+\s*[-–]?\s*|§\s*\d+º\s*[-–]?\s*|Parágrafo [uú]nico\s*[-–]?\s*)(.*)/i);
            
            if (articleMatch) {
               return (
                 <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-3 text-justify">
                   <strong className="text-[#050F41]">{articleMatch[1]}</strong>
                   {articleMatch[2]}
                 </p>
               );
            }

            const itemMatch = line.match(/^([IVXLCDM]+\s*[-–]\s*)(.*)/)
            if (itemMatch) {
                return (
                 <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-2 text-justify pl-4 border-l-2 border-gray-200">
                   <strong className="text-gray-900">{itemMatch[1]}</strong>
                   {itemMatch[2]}
                 </p>
               );
            }

            return (
              <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-3 text-justify">
                {line}
              </p>
            );
          })}
        </div>

        {/* FAB: Download PDF */}
        <a 
          href="https://drive.google.com/file/d/1ZrC8DC-RvOHAIETaAiFM5RkRk4YwpxT7/view?usp=sharing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#050F41] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-slate-700 z-50"
          title="Baixar PDF Original"
        >
          <Download size={24} />
        </a>

        {/* FAB: Scroll to Top */}
        {showScrollTop && (
          <button 
            onClick={scrollToTop}
            className="fixed bottom-40 right-6 w-12 h-12 bg-white text-[#050F41] shadow-xl rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all border border-gray-200 z-50"
            title="Voltar ao topo"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </div>
    </div>
  );
};