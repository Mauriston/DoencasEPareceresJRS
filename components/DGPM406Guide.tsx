import React from 'react';
import { ExternalLink, Anchor } from 'lucide-react';
import { Header } from './Header';

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
      <div className="p-4 space-y-3 animate-fade-in overflow-auto pb-24">
        {CHAPTERS.map((item) => (
          <a 
            key={item.id} 
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-[#079551] transition-all duration-300"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1 pr-4">
                <h3 className="text-navy font-heading font-bold text-base mb-1 group-hover:text-[#079551] transition-colors">{item.chapter}</h3>
                <p className="text-gray-500 font-body text-xs font-semibold uppercase">{item.title}</p>
              </div>
              <div 
                className="flex items-center justify-center p-3 bg-navy/5 group-hover:bg-[#079551] group-hover:text-white rounded-full flex-shrink-0 transition-all text-navy"
                title="Acessar Documento"
                aria-label={`Acessar ${item.chapter}`}
              >
                <ExternalLink size={20} className="currentColor" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
