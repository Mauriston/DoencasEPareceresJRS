
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import Icon from '../components/Icon';

const Capitulo7: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 7</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            IS para Justiça e Disciplina
          </h1>
        </header>

        <Section title="Definição da IS para Justiça e Disciplina" icon="gavel">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCard title="Condições Psicofísicas" icon="psychology">
              <p className="text-sm">Verificar se o indiciado em IPM, CJ ou CD tem condições mínimas de ser submetido aos procedimentos legais.</p>
            </InfoCard>
            <InfoCard title="Relação com Doença" icon="healing">
              <p className="text-sm">Verificar se fatos apurados resultam de doença que diminua a capacidade de entendimento do indiciado.</p>
            </InfoCard>
            <InfoCard title="Desertores e Insubmissos" icon="person_off">
              <p className="text-sm">Verificar se o desertor ou insubmisso está apto ou incapaz para reiclusão no Serviço Militar.</p>
            </InfoCard>
          </div>
        </Section>
        
        <Section title="Procedimentos e Competência" icon="list_alt">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Competência" icon="workspaces">
              <p className="text-sm">As perícias para Justiça e Disciplina são de competência das <strong>Juntas Regulares de Saúde (JRS)</strong>.</p>
            </InfoCard>
            <InfoCard title="Parecer Psiquiátrico" icon="psychology_alt">
              <p className="text-sm">É <strong>indispensável</strong> um parecer psiquiátrico para verificar as condições mentais.</p>
            </InfoCard>
            <InfoCard title="Recurso Administrativo" icon="block">
              <p className="text-sm"><strong>Não cabe</strong> recurso administrativo de laudo de IS de Justiça e Disciplina.</p>
            </InfoCard>
            <InfoCard title="Validade do Laudo" icon="event_available">
              <p className="text-sm">Laudos de "Apto" em IS para Justiça e Disciplina são válidos por <strong>trinta dias</strong>.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo7;
