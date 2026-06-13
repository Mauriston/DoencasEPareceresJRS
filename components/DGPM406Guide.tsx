// Ficheiro: components/DGPM406Guide.tsx
import React from 'react';
import { Header } from './Header';
import { MoreVertical } from 'lucide-react'; // Ícone dos 3 pontinhos

interface Chapter {
  id: string;
  chapter: string;
  title: string;
  link: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'c0',
    chapter: 'DGPM-406 9ª REV',
    title: 'NORMAS REGULADORAS PARA INSPEÇÕES DE SAÚDE NA MARINHA',
    link: 'https://drive.google.com/open?id=1NlCZR1I24epU0-nucN4zHd2fUmO7SOFn'
  },
  {
    id: 'c1',
    chapter: 'Capítulo 1',
    title: 'ESTRUTURA DO SUBSISTEMA MÉDICO-PERICIAL DA MB',
    link: 'https://drive.google.com/open?id=1nVX3dkkGHHyWDwVhPdVjw7DWItD0y1sy'
  },
  {
    id: 'c2',
    chapter: 'Capítulo 2',
    title: 'PROCESSOS DAS INSPEÇÕES DE SAÚDE NA MB',
    link: 'https://drive.google.com/open?id=1L7TLBKFsRGaRI-rpaMEVvwg9bV_Y2A58'
  },
  {
    id: 'c3',
    chapter: 'Capítulo 3',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INGRESSAR NO SERVIÇO ATIVO NA MARIINHA',
    link: 'https://drive.google.com/open?id=1FielRLlQ7rmcjtaVJafdGF2x1SN90DE3'
  },
  {
    id: 'c4',
    chapter: 'Capítulo 4',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PÓS-ADMISSIONAIS',
    link: 'https://drive.google.com/open?id=1lblyFP5bbCKdQyXuO1--JCz1VmlJOG38'
  },
  {
    id: 'c6',
    chapter: 'Capítulo 6',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PÓS-ADMISSIONAIS',
    link: 'https://drive.google.com/open?id=1Lus5R4-UjHGZ8Ff5sylgfl8cN6qQpeo5'
  },
  {
    id: 'c7',
    chapter: 'Capítulo 7',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA IS DE JUSTIÇA E DISCIPLINA',
    link: 'https://drive.google.com/file/d/1fWgkRno35s4AzhA9BJqw_3eHXePYF2YC/view?usp=drivesdk'
  },
  {
    id: 'c8',
    chapter: 'Capítulo 8',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA EXCLUSÃO DO SERVIÇO ATIVO DA MARINHA',
    link: 'https://drive.google.com/open?id=1ozUl0F2YNU_SEVkzDI8Dl-CeIn_gN6XC'
  },
  {
    id: 'c9',
    chapter: 'Capítulo 9',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PARA CONCESSÃO DE BENEFÍCIOS NA MB',
    link: 'https://drive.google.com/open?id=1JlzkalbaF4R7zrjt8qk9XvFu_jp4BMhL'
  },
  {
    id: 'c10',
    chapter: 'Capítulo 10',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE DE SERVIDORES CIVIS DA MB',
    link: 'https://drive.google.com/open?id=1LusI_DszPSwjbLPIJqTJkh1E9hP4RtxQ'
  },
  {
    id: 'c11',
    chapter: 'Capítulo 11',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA O SERVIÇO MILITAR TEMPORÁRIO',
    link: 'https://drive.google.com/open?id=1jFWJMETC-w6L8t7ylJyQgBVVQDfKDJNV'
  },
  {
    id: 'c12',
    chapter: 'Capítulo 12',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE EM GRAU DE REVISÃO E RECURSOS',
    link: 'https://drive.google.com/file/d/1G5_BSDseclb32cu4T3ZaUVyFnmH5Rf9E/view?usp=drive_link'
  },
  {
    id: 'c13',
    chapter: 'Capítulo 13',
    title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA COMPROVAÇÃO DE NEXO CAUSAL LABORATIVO',
    link: 'https://drive.google.com/open?id=1K17M2dVRqpRVpRrqbSaYHvX0Gt31jxdN'
  },
  {
    id: 'c14',
    chapter: 'Capítulo 14',
    title: 'PRONTUÁRIO MÉDICO INDIVIDUAL E GUIA SANITÁRIA',
    link: 'https://drive.google.com/open?id=121eIh1v3YPehkFJktqr70sDI0mSrw6Qs'
  },
  {
    id: 'c15',
    chapter: 'Capítulo 15',
    title: 'ESTRUTURA E ROTINA DE FUNCIONAMENTO DO DEPARTAMENTO DE AUDITORIA MÉDICO-PERICIAL',
    link: 'https://drive.google.com/open?id=1sUi1tvbGMtQkWAcqJc9wXz7n8koZLizM'
  },
  {
    id: 'c17',
    chapter: 'Capítulo 17',
    title: 'EXAME TOXICOLÓGICO',
    link: 'https://drive.google.com/open?id=1CL-hNZs5mhJlfqhJWe4Sq3YJwQPtnE2p'
  },
  {
    id: 'c18',
    chapter: 'Capítulo 18',
    title: 'INSPEÇÃO DE SAÚDE DE VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL E DETÉRMINO DE INCAPACIDADE NO SERVIÇO DE PRATICAGEM',
    link: 'https://drive.google.com/open?id=1_CJ9YqoixMsXp7Hjm25EyISFPitHBLaS'
  }
];

export const DGPM406Guide: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="CAPÍTULOS DGPM-406 REV 9" />
      
      <div className="p-4 animate-fade-in overflow-auto pb-24 max-w-4xl mx-auto w-full">
        {/* Documentação: Contentor único da lista com separadores internos (divide-y) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden divide-y divide-gray-100">
          {CHAPTERS.map((item) => (
            <a 
              key={item.id} 
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none cursor-pointer"
            >
              {/* Documentação: Lado esquerdo com os textos alinhados numa coluna */}
              <div className="flex flex-col pr-4 flex-1">
                <h3 className="text-[#050F41] font-heading font-bold text-[14px] leading-snug mb-1 group-hover:text-[#079551] transition-colors">
                  {item.chapter}
                </h3>
                <p className="text-gray-500 font-body text-[11px] font-medium leading-relaxed line-clamp-2">
                  {item.title}
                </p>
              </div>
              
              {/* Documentação: Lado direito com o ícone de 3 pontinhos alinhado */}
              <div className="text-gray-400 group-hover:text-[#050F41] transition-colors flex-shrink-0 bg-gray-50 group-hover:bg-blue-50/50 p-2 rounded-full">
                <MoreVertical size={18} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
