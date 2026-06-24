
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import Icon from '../components/Icon';

const Capitulo6: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 6</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            VDF, Término de Incapacidade e Restrições
          </h1>
        </header>

        <Section title="Definições das Inspeções" icon="manage_search">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCard title="Verificação de Deficiência Funcional (VDF)" icon="person_search">
              <p className="text-sm">Perícia clínico-funcional para esclarecer o grau de comprometimento de uma enfermidade sobre a atividade do militar da ativa.</p>
            </InfoCard>
            <InfoCard title="Término de Restrições" icon="event_available">
              <p className="text-sm">Perícia que se segue ao término de um período de restrições, visando à reavaliação do estado de saúde do militar.</p>
            </InfoCard>
            <InfoCard title="Término de Incapacidade" icon="healing">
              <p className="text-sm">Perícia que se segue ao término de um período de LTS, visando à reavaliação.</p>
            </InfoCard>
          </div>
        </Section>
        
        <Section title="Orientações Gerais" icon="gavel">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Competência" icon="workspaces">
              <p className="text-sm">Realizadas por JRS, JSAE, JSD e JSS. Excepcionalmente, MPI podem efetuar VDF em localidades sem Junta de Saúde.</p>
            </InfoCard>
            <InfoCard title="Reavaliação por Fato Novo" icon="notification_important">
              <p className="text-sm">Melhora, agravamento ou nova patologia durante uma restrição demanda uma IS para VDF por "Fato Novo".</p>
            </InfoCard>
            <InfoCard title="Restrição por Tempo Indeterminado" icon="lock_clock">
              <p className="text-sm">Não cabe IS para Término de Restrições. A reavaliação ocorre por "Fato Novo".</p>
            </InfoCard>
          </div>
        </Section>

        <Section title="Formas de Conclusão" icon="fact_check">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Aptidão" icon="thumb_up">
              <p className="font-semibold text-gray-600 text-sm">Laudos: "Apto para o SAM" ou "Apto para o SAM (com restrições)".</p>
            </InfoCard>
            <InfoCard title="Incapacidade Temporária" icon="timer_off">
              <p className="font-semibold text-gray-600 text-sm">Laudo: "Incapaz temporariamente para o SAM".</p>
            </InfoCard>
            <InfoCard title="Incapacidade Definitiva" icon="report_off">
              <p className="font-semibold text-gray-600 text-sm">Laudo: "Incapaz definitivamente para o SAM".</p>
            </InfoCard>
            <InfoCard title="Incapacidade Definitiva (Especialidade)" icon="work_off">
              <p className="font-semibold text-gray-600 text-sm">Laudo: "Incapaz definitivamente para o exercício da especialidade de [...]".</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo6;
