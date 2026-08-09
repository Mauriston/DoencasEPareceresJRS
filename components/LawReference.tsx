// Ficheiro: components/LawReference.tsx
import React from 'react';
import { Info } from 'lucide-react';
import { Header } from './Header';

interface Legislation {
  id: string;
  title: string;
  legislation: string;
  provisions: string;
  link: string;
  imageUrl: string;
}

const LEGISLATIONS: Legislation[] = [
  {
    id: 'l1',
    legislation: 'LEI n  4.375/1964',
    title: 'Lei do Serviço Militar',
    provisions: 'Estabelece a natureza, a obrigatoriedade e a duração do serviço militar para todos os brasileiros, abrangendo o Exército, a Marinha e a Aeronáutica.',
    link: 'https://drive.google.com/open?id=1luWEIf0Lqd-UsvZUqZV6jcfFGn5ielNS',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l2',
    legislation: 'LEI n  6.880/1980',
    title: 'Estatuto dos Militares',
    provisions: 'Regula a situação jurídica, obrigações, deveres, direitos e prerrogativas dos membros da Marinha, Exército e Aeronáutica.',
    link: 'https://drive.google.com/open?id=1Rg207oonhofRRX2fBDUrBcx0FQ5yIGT6',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l3',
    legislation: 'LEI n  6.782/1980',
    title: 'Equiparação do Acidente de Serviço à Doença Profissional',
    provisions: 'Equipara ao acidente em serviço a doença profissional e as específicas em lei para efeito de pensão especial e dá outras providências.',
    link: 'https://drive.google.com/open?id=12zgDnVuXb4MWTQJv-dZSgqIu1gH61UDp',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l4',
    legislation: 'MP n  2.215/2001.',
    title: 'Reestruturação da Remuneração das Forças Armadas',
    provisions: 'Dispõe sobre a reestruturação da remuneração dos militares das Forças Armadas, altera as Leis nº 3.765, de 4 de maio de 1960, e 6.880, de 9 de dezembro de 1980, e dá outras providências.',
    link: 'https://drive.google.com/open?id=1CnNQjfuAJiyslZ7Te821ui_MM8NAMzxO',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l5',
    legislation: 'DP n  7.003/2009',
    title: 'Regulamentação da Licença para Tratamento de Saúde',
    provisions: 'Regulamenta a licença para tratamento de saúde, de que tratam os arts. 202 a 205 da Lei no 8.112, de 11 de dezembro de 1990, e dá outras providências.',
    link: 'https://drive.google.com/open?id=1EZ1y8Kl-ADWCGfZb0QH7TihaEVTnMB-z',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l6',
    legislation: 'LEI n  13.954/2019',
    title: 'Sistema de Proteção Social dos Militares',
    provisions: 'Altera a Lei no 6.880, de 9 de dezembro de 1980 (Estatuto dos Militares) e dá outras providências.',
    link: 'https://drive.google.com/open?id=1JiLQ54Zy6QEnwiuWab2ZvHBF2ul1T17c',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l7',
    legislation: 'PORTARIA GM-MD n  3551/2021',
    title: 'Portaria Normativa MD',
    provisions: 'Aprova as normas para a avaliação pericial dos portadores de doenças especificadas em lei pelas Juntas de Inspeção de Saúde e pelos Agentes Médico-Periciais da Marinha, do Exército, da Aeronáutica e do Hospital das Forças Armadas.',
    link: 'https://drive.google.com/open?id=1Rf2al57vzBQqb8uniy3m9ME_3xnOZFH4',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Emblema_do_Minist%C3%A9rio_da_Defesa_do_Brasil_%282%29.jpg'
  },
  {
    id: 'l8',
    legislation: 'DGPM-310 REV 5',
    title: 'Norma de Nomeações e Afastamentos na MB',
    provisions: 'NORMAS PARA DESIGNAÇÃO, NOMEAÇÃO E AFASTAMENTOS TEMPORÁRIOS DO SERVIÇO PARA O PESSOAL MILITAR DA MB',
    link: 'https://drive.google.com/open?id=1jdnBqUzMklCf1bOHXuwWWVA71zf_gHMa',
    imageUrl: 'https://i.imgur.com/99GKrPB.png'
  },
  {
    id: 'l9',
    legislation: 'RES CFM N  2.381/2024',
    title: 'Resolução do CFM que normatiza a emissão de Documentos Médicos',
    provisions: 'Normatiza a emissão de documentos médicos e dá outras providências.',
    link: 'https://drive.google.com/open?id=12I9nEHYewc43L-Z26kTr5B1LJtjEg26j',
    imageUrl: 'https://portal.cfm.org.br/wp-content/themes/portalcfm/assets/images/cfm_logo_bola.png'
  },
  {
    id: 'l10',
    legislation: 'RES CFM N  2.430/2025',
    title: 'Resolução do CFM que normatiza o Acto Médico-Pericial',
    provisions: 'Dispõe sobre o ato médico pericial, a produção da prova técnica médica, estabelece critérios mínimos de segurança na construção da prova pericial.',
    link: 'https://drive.google.com/open?id=1Kr8kPQEzDHZPkWiJwtePht-X-7eNsfDu',
    imageUrl: 'https://portal.cfm.org.br/wp-content/themes/portalcfm/assets/images/cfm_logo_bola.png'
  },
  {
    id: 'l11',
    legislation: 'RES CFM N  1.658/2002',
    title: 'Resolução do CFM que normatiza a emissão de Atestados Médicos',
    provisions: 'Normatiza a emissão de atestados médicos e dá outras providências.',
    link: 'https://drive.google.com/open?id=12zOFmT5exRbO6whqQasPqL_iMY1SfKB5',
    imageUrl: 'https://portal.cfm.org.br/wp-content/themes/portalcfm/assets/images/cfm_logo_bola.png'
  }
];

export const LawReference: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Legislação" />
      
      <div className="p-4 animate-fade-in overflow-auto pb-24 max-w-4xl mx-auto w-full">
        <div className="mb-4 bg-white p-6 rounded-2xl shadow-md border border-gray-200/80 text-center">
          <h2 className="text-xl font-heading font-black text-[#050F41] tracking-wide uppercase">
            LEGISLAÇÃO MÉDICO-PERICIAL
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {LEGISLATIONS.map((law) => {
            const isBrasao = law.imageUrl.includes('brasao-da-republica');

            return (
              <div key={law.id} className="relative group bg-white rounded-2xl shadow-sm border border-gray-200/60 hover:border-[#079551] hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                <a 
                  href={law.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(law.link, '_blank');
                  }}
                  className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors focus:outline-none cursor-pointer gap-3 h-full"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-50 rounded-full overflow-hidden border border-gray-100 flex items-center justify-center p-0.5">
                    <img 
                      src={law.imageUrl} 
                      alt={law.legislation} 
                      className={`w-full h-full object-contain transition-transform duration-300 ${
                        isBrasao ? 'scale-[1.5]' : ''
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="text-[#050F41] font-heading font-bold text-[14px] leading-snug mb-0.5 group-hover:text-[#079551] transition-colors">
                      {law.legislation}
                    </h3>
                    <p className="text-gray-500 font-body text-[11px] font-medium leading-relaxed line-clamp-2">
                      {law.title}
                    </p>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      alert(law.provisions);
                    }}
                    title={law.provisions}
                    className="text-gray-400 hover:text-[#050F41] transition-colors flex-shrink-0 focus:outline-none p-1.5"
                  >
                    <Info size={18} />
                  </button>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
