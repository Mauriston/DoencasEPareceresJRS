
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';

const Capitulo17: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 17</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Exame Toxicológico
          </h1>
        </header>

        <Section title="Modalidades e Orientações" icon="science">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Modalidades de IS" icon="checklist">
              <p className="text-sm">Inclui IS de Ingresso, Engajamento, Controle Periódico, Inopinada, Seleção para Atividades Especiais e Conclusão de Curso de Formação.</p>
            </InfoCard>
            <InfoCard title="Matriz Biológica" icon="biotech">
              <p className="text-sm">Utiliza-se a matriz "fâneros" (cabelo, pelo ou raspas de unhas), com janela de detecção mínima de 90 dias.</p>
            </InfoCard>
            <InfoCard title="Resultado Positivo" icon="report">
              <p className="text-sm">É impeditivo para ingresso na MB e pode levar à inaptidão em outras IS. Garante-se o direito à contraprova.</p>
            </InfoCard>
          </div>
        </Section>

        <Section title="Procedimentos Chave" icon="rule_folder">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="IS Inopinada" icon="notification_important">
              <p className="text-sm">Pode ser "direcionada" (com suspeita razoável) ou "aleatória" (sorteio). A solicitação é pontual e discriçionária do Titular da OM.</p>
            </InfoCard>
            <InfoCard title="Recusa de Realização" icon="block">
              <p className="text-sm">A recusa, formalizada no TCLE, resulta no afastamento das funções e na impossibilidade de realizar a IS pretendida.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo17;
