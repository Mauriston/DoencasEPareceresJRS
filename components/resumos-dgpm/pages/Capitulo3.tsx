
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import Icon from '../components/Icon';

const Capitulo3: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 3</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Procedimentos de Ingresso no SAM
          </h1>
        </header>

        <Section title="O que é a IS para Ingresso?" icon="login">
          <p className="text-sm text-center max-w-3xl mx-auto">
            É a perícia de seleção inicial que verifica se os candidatos preenchem os padrões médicos de aptidão para a Carreira Militar.
          </p>
        </Section>
        
        <Section title="Competências e Situações Especiais" icon="gavel">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Competência Principal" icon="workspaces">
              <p className="text-sm">As Inspeções de Saúde para ingresso são de competência das <strong>Juntas Regulares de Saúde (JRS)</strong>.</p>
            </InfoCard>
            <InfoCard title="Recurso de Inaptidão" icon="person_raised_hand">
              <p className="text-sm">Candidatos considerados inaptos podem recorrer à <strong>Junta Superior Distrital (JSD)</strong>.</p>
            </InfoCard>
            <InfoCard title="Gravidez" icon="pregnant_woman">
              <p className="text-sm">A confirmação de gestação em qualquer etapa implica no <strong>cancelamento da IS</strong>, sem emissão de laudo.</p>
            </InfoCard>
            <InfoCard title="Falta de Documentos" icon="folder_off">
              <p className="text-sm">A não apresentação dos exames do Edital resulta em laudo de <strong>"impossibilidade de concluir"</strong>.</p>
            </InfoCard>
            <InfoCard title="Não Comparecimento" icon="event_busy">
              <p className="text-sm">Candidatos que não comparecem à IS são considerados <strong>desistentes</strong>.</p>
            </InfoCard>
            <InfoCard title="Novos Fatos Médicos" icon="notification_important">
              <p className="text-sm">Qualquer fato novo surgido até a adaptação pode gerar uma <strong>IS em grau de Revisão</strong>.</p>
            </InfoCard>
          </div>
        </Section>
        
      </div>
      
    </div>
  );
};

export default Capitulo3;
