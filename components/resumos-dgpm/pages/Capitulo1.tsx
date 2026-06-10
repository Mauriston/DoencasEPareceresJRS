
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import HierarchyNode from '../components/HierarchyNode';
import Icon from '../components/Icon';

const Capitulo1: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 1</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Estrutura do Subsistema Médico-Pericial da MB
          </h1>
        </header>

        <Section title="O que é o Subsistema Médico-Pericial (SMP)?" icon="health_and_safety">
          <p className="text-sm text-center max-w-3xl mx-auto">
            O SMP é responsável pelas avaliações médico-periciais do pessoal da Marinha do Brasil (MB), incluindo pessoal da ativa, veteranos, servidores civis e candidatos a ingresso.
          </p>
        </Section>

        <Section title="Hierarquia Funcional" icon="hub">
          <div className="flex flex-col items-center">
            <HierarchyNode title="Junta Superior de Saúde (JSS)" description="Máxima instância hierárquica" icon="military_tech" isTop />
            <HierarchyNode title="Junta Superior Distrital (JSD)" description="Nível regional mais elevado" icon="gite" />
            <HierarchyNode title="Junta de Saúde para Atividades Especiais (JSAE)" description="Perícias para aviação, mergulho, etc." icon="scuba_diving" />
            <HierarchyNode title="Junta Regular de Saúde (JRS)" description="Juntas de saúde comuns" icon="groups" />
            <HierarchyNode title="Médico Perito Isolado (MPI / MPIQ)" description="Atuação individual de peritos" icon="person" isBottom />
          </div>
        </Section>

        <Section title="Composição dos Agentes Médico-Periciais" icon="groups_3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Junta de Saúde (JS)" icon="groups">
              <p className="text-sm">Reunião formal de <strong>três ou mais médicos</strong> (militares ou civis da MB) para exercer funções periciais.</p>
            </InfoCard>
            <InfoCard title="JSS" icon="military_tech">
              <p className="text-sm">Presidida pelo Diretor do CPMM, composta por <strong>quatro membros</strong> e dois secretários médicos.</p>
            </InfoCard>
            <InfoCard title="JSD" icon="gite">
              <p className="text-sm">Compostas por um Presidente (Oficial Superior Médico) e <strong>quatro membros</strong>.</p>
            </InfoCard>
            <InfoCard title="JSAE/CPMM" icon="stars">
              <p className="text-sm">Presidente (Oficial Sup. qualificado em Med. de Aviação/Submarina) e <strong>quatro membros</strong>.</p>
            </InfoCard>
            <InfoCard title="JSAE (Outras)" icon="scuba_diving">
              <p className="text-sm">Compostas por um Presidente (Oficial Sup. Médico) e <strong>dois membros</strong> qualificados na área.</p>
            </InfoCard>
             <InfoCard title="JRS" icon="group">
              <p className="text-sm">Compostas por um Presidente (Oficial Sup. Médico) e <strong>dois membros</strong> médicos.</p>
            </InfoCard>
          </div>
        </Section>

        <Section title="Serviço de Apoio ao SMP" icon="support_agent">
          <div className="bg-gray-50-light p-6 rounded-lg shadow-lg border border-gray-200 max-w-2xl mx-auto">
            <h3 className="font-heading text-md text-[#B8860B] font-semibold text-center mb-4">Odontologia Legal</h3>
            <p className="text-center text-sm text-gray-600">
              Realiza perícias odontológicas, preenchendo odontogramas e mantendo um banco de dados digitais para fins de identificação de pessoal, especialmente em casos de infortúnio.
            </p>
          </div>
        </Section>
        
      </div>
      
    </div>
  );
};

export default Capitulo1;
