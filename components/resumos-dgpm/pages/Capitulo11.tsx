
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import Icon from '../components/Icon';

const Capitulo11: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 11</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Serviço Militar Temporário
          </h1>
        </header>

        <Section title="Procedimentos Médico-Periciais" icon="military_tech">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Ingresso no SMI" icon="login">
              <p className="text-sm">Para conscritos e MFDV, inclui Seleção de Triagem, Geral e Complementar.</p>
            </InfoCard>
            <InfoCard title="VDF durante o SMI" icon="healing">
              <p className="text-sm">Realizada pela JRS quando um militar apresenta restrição na capacidade laboral. A conclusão pode ser Apto A, Incapaz B-1, B-2 ou C.</p>
            </InfoCard>
            <InfoCard title="Conclusão do SMI" icon="logout">
              <p className="text-sm">Ao final do Estágio de Adaptação, IS verifica se os militares estão aptos para Deixar o SMI.</p>
            </InfoCard>
            <InfoCard title="Ingresso no SMV (oriundos do SMI)" icon="person_add">
              <p className="text-sm">IS verifica a aptidão para Ingresso no SMV (Oficiais) ou Engajamento (Praças). Competência é do MPI.</p>
            </InfoCard>
            <InfoCard title="Prorrogação e Reengajamento" icon="event_repeat">
              <p className="text-sm">IS de competência do MPI para prorrogar o tempo de serviço. A aptidão tem validade de três anos.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo11;
