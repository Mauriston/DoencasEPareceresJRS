
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import Icon from '../components/Icon';

const Capitulo8: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 8</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Exclusão do Serviço Ativo da Marinha
          </h1>
        </header>

        <Section title="Rotina para Exclusão do SAM" icon="logout">
          <p className="text-sm text-center max-w-3xl mx-auto">
            A IS para exclusão do SAM visa estabelecer as condições psicofísicas atuais e as eventuais repercussões de doenças ou acidentes ocorridos durante o período de atividade.
          </p>
        </Section>

        <Section title="Competência e Procedimentos" icon="list_alt_add">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Competência Principal (MPI)" icon="person">
              <p className="text-sm">Esta IS é de competência dos <strong>Médicos Peritos Isolados (MPI)</strong>.</p>
            </InfoCard>
            <InfoCard title="Declínio para a JS" icon="upgrade">
              <p className="text-sm">Tratando-se de enfermidade que possa gerar incapacidade definitiva, os MPI deverão <strong>declinar a competência</strong> para as Juntas de Saúde (JS).</p>
            </InfoCard>
          </div>
        </Section>
        
        <Section title="Formas de Conclusão" icon="fact_check">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Apto para Deixar o SAM" icon="check_circle">
              <p className="text-sm">Laudo principal para quem atende os critérios de saúde para a exclusão.</p>
            </InfoCard>
            <InfoCard title="Apto para Deixar (com sequela)" icon="sentiment_satisfied">
              <p className="text-sm">Para casos de sequela de acidente ou doença ocupacional que não geram incapacidade total.</p>
            </InfoCard>
            <InfoCard title="Incapaz Temporariamente para Deixar o SAM" icon="timer">
              <p className="text-sm">Para quem necessita de tratamento por até seis meses.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo8;
