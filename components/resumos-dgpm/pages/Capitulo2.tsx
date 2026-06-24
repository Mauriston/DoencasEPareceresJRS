
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
            É a perícia médico-legal oficial, de caráter administrativo-militar, para verificar o estado de sanidade psicofísica de uma pessoa.
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
                <li>Concessão de Benefícios</li>
                <li>Recurso de IS de MPI</li>
              </ul>
            </InfoCard>
            <InfoCard title="JSD" icon="gite">
              <p className="font-semibold text-gray-600 text-sm">Junta Superior Distrital</p>
              <ul className="list-disc list-inside mt-2 text-base space-y-1">
                <li>Recurso de IS de JRS</li>
                <li>Revisão de IS de JRS ou de reforma</li>
                <li>Verificação de Invalidez de Pensionista</li>
                <li>Auxílio-Invalidez</li>
                <li>Isenção de Imposto de Renda</li>
              </ul>
            </InfoCard>
          </div>
        </Section>

      </div>
      
    </div>
  );
};

export default Capitulo2;
