
import React from 'react';
import Section from '../components/Section';
import InfoCard from '../components/InfoCard';
import Icon from '../components/Icon';

const Capitulo2: React.FC = () => {
  return (
    <div className="bg-gray-50 text-gray-800 p-4 sm:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-grow">
        
        <header className="text-center mb-16">
          <p className="font-heading text-green-600 tracking-widest text-sm font-bold uppercase">Capítulo 2</p>
          <h1 className="text-sm sm:text-sm font-heading font-bold text-navy uppercase tracking-wide mt-2">
            Processos das Inspeções de Saúde na MB
          </h1>
        </header>

        <Section title="O que é uma Inspeção de Saúde (IS)?" icon="description">
          <p className="text-sm text-center max-w-3xl mx-auto">
            É a perícia médico-legal oficial, de caráter administrativo-militar, para verificar o estado de sanidade psicofísica de uma pessoa. É um ato médico de responsabilidade dos Agentes Médico-Periciais (AMP), embasado na literatura médica e legislação.
          </p>
        </Section>

        <Section title="Tipos de Inspeção" icon="rule_folder">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-gray-50-light p-6 rounded-lg shadow-lg flex items-center gap-4 border border-gray-200">
              <Icon name="event_repeat" className="text-[#B8860B] text-sm" />
              <div>
                <h3 className="font-heading text-md text-navy font-semibold">De Rotina</h3>
                <p className="mt-1 text-gray-600 text-sm">Inspeções previstas nas normas da MB.</p>
              </div>
            </div>
            <div className="bg-gray-50-light p-6 rounded-lg shadow-lg flex items-center gap-4 border border-gray-200">
              <Icon name="emergency" className="text-[#B8860B] text-sm" />
              <div>
                <h3 className="font-heading text-md text-navy font-semibold">Extraordinárias</h3>
                <p className="mt-1 text-gray-600 text-sm">Determinadas por autoridade judiciária ou de interesse da Administração Naval.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Quem Realiza a Inspeção?" icon="workspaces">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard title="MPI" icon="person">
              <p className="font-semibold text-gray-600 text-sm">Médico Perito Isolado</p>
              <ul className="list-disc list-inside mt-2 text-base space-y-1">
                <li>Controle Periódico de Saúde</li>
                <li>Ingresso no SMI e SMV (exceto SC)</li>
                <li>Prorrogação de Tempo de Serviço</li>
                <li>Cursos de Carreira (não especiais)</li>
                <li>Designação para Missão no Exterior</li>
                <li>LTSP (dispensa/convalescença ≤ 30 dias)</li>
                <li>Exclusão do SAM a pedido</li>
                <li>Término de Incapacidade (por ele concedida)</li>
              </ul>
            </InfoCard>
            <InfoCard title="JRS" icon="groups">
              <p className="font-semibold text-gray-600 text-sm">Junta Regular de Saúde</p>
              <ul className="list-disc list-inside mt-2 text-base space-y-1">
                <li>Ingresso no SAM (Concursos) e SC</li>
                <li>Verificação de Deficiência Funcional (VDF)</li>
                <li>Término de Incapacidade ou Restrições</li>
                <li>Justiça e Disciplina</li>
                <li>Licença para Tratamento de Saúde de Familiar</li>
                <li>Servir em Localidade Especial ou LDAS</li>
                <li>Concessão de Benefícios (ex: dependência)</li>
                <li>Recurso de IS de MPI</li>
                <li>Declínio de competência de MPI</li>
              </ul>
            </InfoCard>
            <InfoCard title="JSD" icon="gite">
              <p className="font-semibold text-gray-600 text-sm">Junta Superior Distrital</p>
              <ul className="list-disc list-inside mt-2 text-base space-y-1">
                <li>Recurso de IS de JRS</li>
                <li>Revisão de IS de JRS ou de reforma</li>
                <li>Exame de sanidade (recurso contestatório)</li>
                <li>Declínio de competência de JRS</li>
                <li>Verificação de Invalidez de Pensionista</li>
                <li>Auxílio-Invalidez</li>
                <li>Isenção de Imposto de Renda</li>
              </ul>
            </InfoCard>
            <InfoCard title="JSAE" icon="scuba_diving">
              <p className="font-semibold text-gray-600 text-sm">Junta de Saúde para Atividades Especiais</p>
              <ul className="list-disc list-inside mt-2 text-base space-y-1">
                <li>Controle periódico (Aviação e Mergulho)</li>
                <li>Seleção para Atividades Especiais</li>
                <li>Missão na Antártica</li>
                <li>Pós-acidente aeronáutico ou hiperbárico</li>
                <li>Incapacidade para Atividade Especial</li>
                <li>Declínio de competência de JRS</li>
              </ul>
            </InfoCard>
            <InfoCard title="JSAE/CPMM" icon="stars">
              <p className="font-semibold text-gray-600 text-sm">JSAE do CPMM</p>
              <ul className="list-disc list-inside mt-2 text-base space-y-1">
                <li>Revisão de laudos de outras JSAE</li>
                <li>Seleção p/ oficialato de Aviação e C-Sub</li>
                <li>Embarque em Submarino Nuclear (SN-BR)</li>
                <li>Recurso de laudos de outras JSAE</li>
                <li>Declínio de competência de outras JSAE</li>
              </ul>
            </InfoCard>
            <InfoCard title="JSS" icon="military_tech">
              <p className="font-semibold text-gray-600 text-sm">Junta Superior de Saúde</p>
              <ul className="list-disc list-inside mt-2 text-base space-y-1">
                <li>Recurso em Última Instância</li>
                <li>Revisão por determinação da DGPM</li>
                <li>Declínio de competência de JSD/JSAE-CPMM</li>
                <li>Término de Incapacidade (por ela concedida)</li>
              </ul>
            </InfoCard>
          </div>
        </Section>
        
        <Section title="Documentação Pericial" icon="folder_shared">
          <div className="bg-gray-50-light p-6 rounded-lg shadow-lg border border-gray-200">
            <p className="text-center mb-4 text-sm">Principais documentos utilizados no processo pericial:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-center text-base">
                <div className="flex flex-col items-center p-2"><Icon name="assignment" className="text-[#B8860B] text-sm mb-1"/><span>TIS</span></div>
                <div className="flex flex-col items-center p-2">
                  <Icon name="local_hospital" className="text-[#B8860B] text-sm mb-1"/>
                  <a href="#/capitulo-13" className="text-[#B8860B] hover:opacity-80 underline inline-flex items-center gap-1 transition-colors text-center">
                    <span>Atestado de Origem (AO)</span>
                    <Icon name="open_in_new" className="text-sm" />
                  </a>
                </div>
                <div className="flex flex-col items-center p-2"><Icon name="ballot" className="text-[#B8860B] text-sm mb-1"/><span>Inquérito Sanitário (ISO)</span></div>
                <div className="flex flex-col items-center p-2"><Icon name="receipt_long" className="text-[#B8860B] text-sm mb-1"/><span>Papeleta de Dispensa</span></div>
                <div className="flex flex-col items-center p-2"><Icon name="emergency_home" className="text-[#B8860B] text-sm mb-1"/><span>Ficha de Evacuação (FE)</span></div>
                <div className="flex flex-col items-center p-2"><Icon name="medical_services" className="text-[#B8860B] text-sm mb-1"/><span>Guia Sanitária (GS)</span></div>
                <div className="flex flex-col items-center p-2"><Icon name="fact_check" className="text-[#B8860B] text-sm mb-1"/><span>Pedido de Parecer</span></div>
                <div className="flex flex-col items-center p-2"><Icon name="person_raised_hand" className="text-[#B8860B] text-sm mb-1"/><span>Conhecimento de Recurso</span></div>
            </div>
          </div>
        </Section>

        <Section title="Responsabilidades Chave" icon="verified_user">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCard title="Titulares de OM" icon="group_work">
              <p className="text-sm">Apresentar seus subordinados para IS antes do vencimento, garantindo o comparecimento a todos os procedimentos.</p>
            </InfoCard>
            <InfoCard title="Inspecionados" icon="person_search">
              <p className="text-sm">Agendar e comparecer à IS na data marcada, e cumprir as restrições e recomendações para melhoria da saúde.</p>
            </InfoCard>
            <InfoCard title="Agentes Médico-Periciais" icon="health_and_safety">
              <p className="text-sm">Registrar obrigatoriamente todos os dados médico-periciais no SINAIS para a conclusão da Inspeção de Saúde.</p>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo2;
