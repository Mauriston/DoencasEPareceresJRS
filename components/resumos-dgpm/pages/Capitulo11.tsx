
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
          <p className="text-sm text-center max-w-3xl mx-auto mb-10">
            Este capítulo descreve os procedimentos para o Serviço Militar Temporário, que se divide em Obrigatório (conscritos e MFDV) e Voluntário (ambos os sexos).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Ingresso no SMI" icon="login">
              <p className="text-sm">Para conscritos e MFDV, inclui Seleção de Triagem, Geral e Complementar. Os padrões seguem os Anexos I, II e III da IGISC.</p>
            </InfoCard>
            <InfoCard title="VDF durante o SMI" icon="healing">
              <p className="text-sm">Realizada pela JRS quando um militar apresenta restrição na capacidade laboral que exceda a perícia menor. A conclusão pode ser Apto A, Incapaz B-1, B-2 ou C.</p>
            </InfoCard>
            <InfoCard title="Conclusão do SMI" icon="logout">
              <p className="text-sm">Ao final do Estágio de Adaptação, é realizada uma IS para verificar se os militares estão aptos para Deixar o SMI ou se possuem patologias com amparo legal.</p>
            </InfoCard>
            <InfoCard title="Ingresso no SMV (oriundos do SMI)" icon="person_add">
              <p className="text-sm">Ao final da Adaptação, uma IS verifica a aptidão para Ingresso no SMV (Oficiais) ou Engajamento (Praças). A competência é do MPI.</p>
            </InfoCard>
            <InfoCard title="Ingresso no SMV (meio civil)" icon="group_add">
              <p className="text-sm">
                Segue os procedimentos do{' '}
                <a href="#/capitulo-3" className="text-[#B8860B] hover:text-[#B8860B] underline inline-flex items-center gap-1 transition-colors">
                  <span>Capítulo 3</span>
                  <Icon name="open_in_new" className="text-sm" />
                </a>
                , com as mesmas condições de inaptidão do SAM, exceto para candidatas grávidas, que são consideradas inaptas.
              </p>
            </InfoCard>
            <InfoCard title="Prorrogação e Reengajamento" icon="event_repeat">
              <p className="text-sm">IS de competência do MPI para prorrogar o tempo de serviço. A aptidão tem validade de três anos. Casos com restrições são encaminhados à JRS.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo11;
