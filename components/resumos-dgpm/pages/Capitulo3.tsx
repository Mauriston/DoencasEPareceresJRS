
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
            É a perícia de seleção inicial que verifica se os candidatos aos Concursos Públicos (CN, EN, EAM, CFN, etc.) preenchem os padrões médicos de aptidão para a Carreira Militar. Esta inspeção não se destina à investigação clínica.
          </p>
        </Section>
        
        <Section title="Fluxo do Processo de Ingresso" icon="timeline">
          <div className="relative border-l-2 border-gray-200 ml-6 md:ml-0 md:border-l-0 md:border-t-2 md:w-full md:flex">
            
            <div className="mb-10 md:mb-0 md:flex-1 md:relative">
              <div className="md:absolute -top-4 left-0 flex items-center">
                <div className="bg-gold w-8 h-8 rounded-full flex items-center justify-center z-10">
                  <span className="font-heading text-navy font-bold">1</span>
                </div>
                <div className="absolute left-4 md:left-auto md:relative md:ml-2 text-left md:text-center">
                    <h3 className="font-heading text-2xl text-navy">Comparecimento (JRS)</h3>
                    <p className="text-base text-gray-600 mt-1 md:w-48">Candidato se apresenta na Junta Regular de Saúde com os documentos e exames.</p>
                </div>
              </div>
            </div>

            <div className="mb-10 md:mb-0 md:flex-1 md:relative">
              <div className="md:absolute -top-4 left-1/2 md:-translate-x-1/2 flex items-center">
                <div className="bg-gold w-8 h-8 rounded-full flex items-center justify-center z-10">
                  <span className="font-heading text-navy font-bold">2</span>
                </div>
                <div className="absolute left-4 md:left-auto md:relative md:ml-2 text-left md:text-center">
                    <h3 className="font-heading text-2xl text-navy">Análise e Laudo</h3>
                    <p className="text-base text-gray-600 mt-1 md:w-48">A JRS avalia e emite o laudo: Apto, Inapto ou Falta de Comparecimento.</p>
                </div>
              </div>
            </div>

            <div className="mb-10 md:mb-0 md:flex-1 md:relative">
               <div className="md:absolute -top-4 right-0 flex items-center">
                <div className="bg-gold w-8 h-8 rounded-full flex items-center justify-center z-10">
                  <span className="font-heading text-navy font-bold">3</span>
                </div>
                <div className="absolute left-4 md:left-auto md:relative md:ml-2 text-left md:text-center">
                    <h3 className="font-heading text-2xl text-navy">Recurso (JSD)</h3>
                    <p className="text-base text-gray-600 mt-1 md:w-48">Candidatos inaptos podem requerer recurso à Junta Superior Distrital em até 2 dias úteis.</p>
                </div>
              </div>
            </div>

          </div>
        </Section>
        
        <div className="pt-16 md:pt-24">
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
      
    </div>
  );
};

export default Capitulo3;
