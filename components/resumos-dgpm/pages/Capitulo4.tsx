
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import Icon from '../components/Icon';

const Capitulo4: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 4</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Inspeções Pós-Admissionais
          </h1>
        </header>

        <Section title="Controle Periódico de Saúde" icon="event_repeat">
          <p className="text-sm text-center max-w-3xl mx-auto mb-10">
            Visa verificar se o pessoal da ativa preenche os requisitos de saúde para o desempenho profissional.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="bg-gray-50-light p-4 rounded-lg border border-gray-200">
              <h3 className="font-heading text-md text-[#B8860B]">Trienal</h3>
              <p className="text-base">Regra geral para militares da ativa</p>
            </div>
            <div className="bg-gray-50-light p-4 rounded-lg border border-gray-200">
              <h3 className="font-heading text-md text-[#B8860B]">Bienal</h3>
              <p className="text-base">Reengajamento e militares RM1</p>
            </div>
            <div className="bg-gray-50-light p-4 rounded-lg border border-gray-200">
              <h3 className="font-heading text-md text-[#B8860B]">Anual</h3>
              <p className="text-base">Praças de máquinas, explosivos, HIV+</p>
            </div>
            <div className="bg-gray-50-light p-4 rounded-lg border border-gray-200">
              <h3 className="font-heading text-md text-[#B8860B]">Semestral</h3>
              <p className="text-base">Operadores de reator nuclear</p>
            </div>
          </div>
        </Section>
        
        <Section title="Outras Inspeções de Saúde Pós-Admissionais" icon="assignment_turned_in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Cursos de Carreira" icon="school">
              <p className="text-sm">Verifica os requisitos de saúde para cursos específicos. Competência do <strong>MPI</strong>, que declina para a <strong>JRS</strong> se houver restrições.</p>
            </InfoCard>
            <InfoCard title="Servir em LDAS" icon="public">
              <p className="text-sm">Para Localidade Deficiente em Assistência Sanitária. Competência da <strong>JRS</strong>. Avalia militar e dependentes.</p>
            </InfoCard>
            <InfoCard title="Licença (LTSPF)" icon="family_restroom">
              <p className="text-sm">Para acompanhar tratamento de familiar. Competência da <strong>JRS</strong>.</p>
            </InfoCard>
            <InfoCard title="Missões no Exterior" icon="flight_takeoff">
              <p className="text-sm">Perícia para missões. Competência do <strong>MPI</strong> ou <strong>JRS</strong>, dependendo da complexidade.</p>
            </InfoCard>
            <InfoCard title="Missão na Antártica" icon="ac_unit">
              <p className="text-sm">Realizada exclusivamente por <strong>JRS</strong>, com critérios rigorosos.</p>
            </InfoCard>
            <InfoCard title="Perícias Menores" icon="medical_services">
              <p className="text-sm">Para dispensa médica ou convalescença. Realizada por <strong>Médicos de OM ou MPI</strong>.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo4;
