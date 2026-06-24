
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';

const Capitulo10: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 10</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            IS para Servidores Civis
          </h1>
        </header>

        <Section title="Procedimentos Médico-Periciais para Servidores Civis" icon="badge">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Rotina Geral (SPG)" icon="assignment_ind">
              <p className="text-sm">As perícias seguem o Manual do SIAAS. A apresentação para IS é via Ofício.</p>
            </InfoCard>
            <InfoCard title="Ingresso no SPG" icon="login">
              <p className="text-sm">Verifica se o candidato possui as condições clínico-funcionais exigidas pelo edital para exercer as funções do cargo.</p>
            </InfoCard>
            <InfoCard title="Controle Periódico" icon="event_repeat">
              <p className="text-sm">A periodicidade varia (bienal, anual ou semestral) conforme a idade e exposição a riscos.</p>
            </InfoCard>
            <InfoCard title="VDF e Readaptação" icon="reduce_capacity">
              <p className="text-sm">A VDF esclarece o grau de comprometimento de uma enfermidade. A Readaptação Funcional aloca o servidor em cargo compatível.</p>
            </InfoCard>
            <InfoCard title="Licenças Especiais" icon="family_restroom">
              <p className="text-sm">Regula a concessão de Licença à Gestante (LG) e Licença para Tratamento de Saúde de Pessoa da Família (LTSPF).</p>
            </InfoCard>
            <InfoCard title="Concessão de Benefícios" icon="redeem">
              <p className="text-sm">Perícias para fins de aposentadoria, reintegração e concessão de benefícios como pensões e isenção de imposto de renda.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo10;
