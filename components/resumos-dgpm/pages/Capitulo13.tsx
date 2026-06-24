
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';

const Capitulo13: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 13</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Comprovação de Nexo Causal
          </h1>
        </header>

        <Section title="Atestado de Origem (AO)" icon="assignment">
          <p className="text-sm text-center max-w-3xl mx-auto mb-10">
            Documento para registrar doença ocupacional ou acidente e comprovar se a condição de saúde atual tem relação com o evento.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Composição" icon="layers">
              <p className="text-sm">Composto pelo Termo de Acidente ou Doença Ocupacional e pelo Exame de Sanidade, que verifica a relação entre a saúde atual e o registro do AO.</p>
            </InfoCard>
            <InfoCard title="Tramitação" icon="send">
              <p className="text-sm">O AO é lavrado em três vias. A abertura é comunicada em CR pela OM.</p>
            </InfoCard>
          </div>
        </Section>

        <Section title="Inquérito Sanitário de Origem (ISO)" icon="fact_check">
          <p className="text-sm text-center max-w-3xl mx-auto mb-10">
            Destina-se a apurar se uma condição de saúde é consequência de acidente ou doença com relação de causa e efeito com o serviço. É instaurado na falta de um AO.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Instaurarção" icon="play_arrow">
              <p className="text-sm">Pode ser instaurado por determinação do Comandante/Diretor, a pedido da JS.</p>
            </InfoCard>
            <InfoCard title="Processualística" icon="rule_folder">
              <p className="text-sm">O Encarregado do ISO reúne documentação, ouve testemunhas e elabora relatório conclusivo. Prazo: 60 dias, prorrogável.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo13;
