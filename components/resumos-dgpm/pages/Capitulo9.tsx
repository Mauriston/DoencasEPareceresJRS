
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import Icon from '../components/Icon';

const Capitulo9: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">

        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 9</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Concessão de Benefícios
          </h1>
        </header>

        <Section title="Rotina para Concessão de Benefícios" icon="assignment">
          <p className="text-sm text-center max-w-3xl mx-auto">
            A IS para concessão de benefícios verifica o estado de saúde do inspecionado para enquadrá-lo na legislação de um benefício.
          </p>
        </Section>
        
        <Section title="Principais Modalidades de IS para Benefícios" icon="category">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="Auxílio Invalidez" icon="accessible_forward">
              <p className="text-sm">Para militar inativo considerado inválido que necessita de internação ou cuidados permanentes de enfermagem.</p>
            </InfoCard>
            <InfoCard title="Verificação Post-mortem" icon="history_edu">
              <p className="text-sm">Verifica se um ex-militar falecido era portador de doença que resultaria em incapacidade definitiva.</p>
            </InfoCard>
            <InfoCard title="Isenção de Imposto de Renda" icon="request_quote">
              <p className="text-sm">Verifica se o militar inativo, pensionista ou reformado é portador de doença especificada em lei para isenção do IR.</p>
            </InfoCard>
            <InfoCard title="Dependência de Familiar" icon="family_restroom">
              <p className="text-sm">Avalia a invalidez de um familiar para fins de comprovação de dependência econômica.</p>
            </InfoCard>
            <InfoCard title="Revisão de Reforma" icon="manage_history">
              <p className="text-sm">Reavalia a condição de saúde de militares reformados por acidente, doença ou idade-limite.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo9;
