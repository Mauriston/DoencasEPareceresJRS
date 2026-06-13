// Ficheiro: components/LawReference.tsx
import React from 'react';
import { Info } from 'lucide-react'; // Importação do ícone de Info
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
    title: 'Lei do Servi o Militar',
    provisions: 'Estabelece a natureza, a obrigatoriedade e a dura o do servi o militar para todos os brasileiros, abrangendo o Ex rcito, a Marinha e a Aeron utica.',
    link: 'https://drive.google.com/open?id=1luWEIf0Lqd-UsvZUqZV6jcfFGn5ielNS',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l2',
    legislation: 'LEI n  6.880/1980',
    title: 'Estatuto dos Militares',
    provisions: 'Regula a situa o jur dica, obriga es, deveres, direitos e prerrogativas dos membros da Marinha, Ex rcito e Aeron utica. Suas provid ncias abrangem desde as condi es de ingresso e a estrutura o da hierarquia e disciplina at  a defini o de cargos, fun es e os preceitos  ticos que devem nortear a conduta militar.',
    link: 'https://drive.google.com/open?id=1Rg207oonhofRRX2fBDUrBcx0FQ5yIGT6',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l3',
    legislation: 'LEI n  6.782/1980',
    title: 'Equipara o do Acidente de Servi  Doen a Profissional',
    provisions: 'Equipara ao acidente em servi o a doen a profissional e as especificadas em lei para efeito de pens o especial e d  outras provid ncias.',
    link: 'https://drive.google.com/open?id=12zgDnVuXb4MWTQJv-dZSgqIu1gH61UDp',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l4',
    legislation: 'MP n  2.215/2001.',
    title: 'Reestrutura o da Remunera o das For as Armadas',
    provisions: 'Disp e sobre a reestrutura o da remunera o dos militares das For as Armadas, altera as Leis n 3.765, de 4 de maio de 1960, e 6.880, de 9 de dezembro de 1980, e d  outras provid ncias.',
    link: 'https://drive.google.com/open?id=1CnNQjfuAJiyslZ7Te821ui_MM8NAMzxO',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l5',
    legislation: 'DP n  7.003/2009',
    title: 'Regulamenta o da Licen a para Tratamento de Sa de',
    provisions: 'Regulamenta a licenã para tratamento de saúde, de que tratam os arts. 202 a 205 da Lei no 8.112, de 11 de dezembro de 1990, e d  outras provid ncias.',
    link: 'https://drive.google.com/open?id=1EZ1y8Kl-ADWCGfZb0QH7TihaEVTnMB-z',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l6',
    legislation: 'LEI n  13.954/2019',
    title: 'Sistema de Prote o Social dos Militares',
    provisions: 'Altera a Lei no 6.880, de 9 de dezembro de 1980 (Estatuto dos Militares), a Lei no 3.765, de 4 de maio de 1960, a Lei no 4.375, de 17 de agosto de 1964 (Lei do Servi o Militar), a Lei no 5.821, de 10 de novembro de 1972, a Lei no 12.705, de 8 de agosto de 2012, e o Decreto- Lei no 667, de 2 de julho de 1969, para reestruturar a carreira militar e dispor sobre o Sistema de Prote o Social dos Militares; revoga dispositivos e anexos da Medida Provis ria no 2.215-10, de 31 de agosto de 2001, e da Lei no 11.784, de 22 de setembro de 2008; e d  outras provid ncias.',
    link: 'https://drive.google.com/open?id=1JiLQ54Zy6QEnwiuWab2ZvHBF2ul1T17c',
    imageUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png'
  },
  {
    id: 'l7',
    legislation: 'PORTARIA GM-MD n  3551/2021',
    title: 'Portaria Normativa MD',
    provisions: 'Aprova as normas para a avalia o pericial dos portadores de doen as especificadas em lei pelas Juntas de Inspe o de Sa de e pelos Agentes M dico-Periciais da Marinha, do Ex rcito, da Aeron utica e do Hospital das For as Armadas, bem como os padr es e crit rios para a concess o de benef cios aos seus pensionistas, dependentes ou benefici rios.',
    link: 'https://drive.google.com/open?id=1Rf2al57vzBQqb8uniy3m9ME_3xnOZFH4',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Emblema_do_Minist%C3%A9rio_da_Defesa_do_Brasil_%282%29.jpg'
  },
  {
    id: 'l8',
    legislation: 'DGPM-310 REV 5',
    title: 'Norma de Nomea es e Afastamentos na MB',
    provisions: 'NORMAS PARA DESIGNA O, NOMEA O E AFASTAMENTOS TEMPOR RIOS DO SERVI O PARA O PESSOAL MILITAR DA MB',
    link: 'https://drive.google.com/open?id=1jdnBqUzMklCf1bOHXuwWWVA71zf_gHMa',
    imageUrl: 'https://i.imgur.com/99GKrPB.png'
  },
  {
    id: 'l9',
    legislation: 'RES CFM N  2.381/2024',
    title: 'Resolu o do CFM que normatiza a emiss o de Documentos M dicos',
    provisions: 'Normatiza a emiss o de documentos m dicos e d  outras provid ncias.',
    link: 'https://drive.google.com/open?id=12I9nEHYewc43L-Z26kTr5B1LJtjEg26j',
    imageUrl: 'https://portal.cfm.org.br/wp-content/themes/portalcfm/assets/images/cfm_logo_bola.png'
  },
  {
    id: 'l10',
    legislation: 'RES CFM N  2.430/2025',
    title: 'Resolu o do CFM que normatiza o Acto M dico-Pericial',
    provisions: 'Disp e sobre o ato m dico pericial, a produ o da prova t cnica m dica, estabelece crit rios m nimos de seguran a na constru o da prova pericial, atualiza o uso de tecnologias de comunica o na avalia dico pericial',
    link: 'https://drive.google.com/open?id=1Kr8kPQEzDHZPkWiJwtePht-X-7eNsfDu',
    imageUrl: 'https://portal.cfm.org.br/wp-content/themes/portalcfm/assets/images/cfm_logo_bola.png'
  },
  {
    id: 'l11',
    legislation: 'RES CFM N  1.658/2002',
    title: 'Resolu o do CFM que normatiza a emiss o de Atestados M dicos',
    provisions: 'Normatiza a emiss o de atestados m dicos e d  outras provid ncias.',
    link: 'https://drive.google.com/open?id=12zOFmT5exRbO6whqQasPqL_iMY1SfKB5',
    imageUrl: 'https://portal.cfm.org.br/wp-content/themes/portalcfm/assets/images/cfm_logo_bola.png'
  }
];

export const LawReference: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Legislação" />
      
      <div className="p-4 animate-fade-in overflow-auto pb-24 max-w-4xl mx-auto w-full">
        {/* Descrição Superior contextualizada */}
        <div className="mb-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-heading font-bold text-[#050F41]">LEGISLAÇÃO MÉDICO-PERICIAL</h2>
              <p className="text-sm text-gray-600 font-body mt-2 text-justify leading-relaxed">
                Acesso direto às leis, decretos, portarias e resoluções do CFM que regulamentam a atividade pericial. Toque em qualquer item para abrir o documento original.
              </p>
            </div>
            <div className="text-[#050F41] p-1 flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>gavel</span>
            </div>
          </div>
        </div>

        {/* Contentor Único da Lista com Divisores (divide-y) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden divide-y divide-gray-100">
          {LEGISLATIONS.map((law) => (
            <div key={law.id} className="relative group">
              {/* O item inteiro funciona como link para abrir o documento */}
              <a 
                href={law.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 hover:bg-gray-50/80 active:bg-gray-100 transition-colors focus:outline-none cursor-pointer gap-3"
              >
                {/* Imagem Institucional à esquerda */}
                <div className="w-10 h-10 flex-shrink-0 bg-gray-50 rounded-full overflow-hidden border border-gray-100 flex items-center justify-center p-0.5">
                  <img 
                    src={law.imageUrl} 
                    alt={law.legislation} 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Bloco de Texto centralizado à esquerda */}
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-[#050F41] font-heading font-bold text-[14px] leading-snug mb-0.5 group-hover:text-[#079551] transition-colors">
                    {law.legislation}
                  </h3>
                  <p className="text-gray-500 font-body text-[11px] font-medium leading-relaxed line-clamp-2">
                    {law.title}
                  </p>
                </div>
                
                {/* Documentação: Botão de Info limpo, apenas com o ícone purificado (sem fundo ou bordas de círculo) */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert(`Disposições da norma:\n\n${law.provisions}`);
                  }}
                  title={law.provisions}
                  className="text-gray-400 hover:text-[#050F41] transition-colors flex-shrink-0 focus:outline-none p-1.5"
                >
                  <Info size={18} />
                </button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
