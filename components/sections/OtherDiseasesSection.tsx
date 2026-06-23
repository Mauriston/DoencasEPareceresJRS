import React from 'react';

export const OtherDiseasesSection: React.FC = () => {
  return (
    <div className="space-y-8 divide-y divide-gray-100">
      
      <section id="doenca-espondilite" className="scroll-mt-16 pt-4 first:border-none">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">4</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Espondilite Anquilosante</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">11. Conceituação</p>
          <p>11.1. A Espondilite Anquilosante é uma doença inflamatória de etiologia desconhecida, que afeta principalmente as articulações sacroiliacas, interapofisárias e costovertebrais. O processo geralmente se inicia pelas sacroiliacas e, ascensionalmente, atinge a coluna vertebral.</p>
        </div>
      </section>

      <section id="doenca-paget" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">5</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Estados Avançados da Doença de Paget</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">13. Conceituação</p>
          <p>13.1. A doença de Paget é uma afecção óssea crônica, caracterizada por deformações ósseas de evolução lenta e progressiva, de etiologia desconhecida, geralmente assintomática.</p>
        </div>
      </section>

      <section id="doenca-hanseniase" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">6</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Hanseníase</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>15.1. A hanseníase é uma doença infecto-contagiosa de notificação compulsória, causada pelo Mycobacterium leprae (bacilo de Hansen), de curso crônico. O diagnóstico é essencialmente clínico e epidemiológico.</p>
        </div>
      </section>

      <section id="doenca-parkinson" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">7</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Doença de Parkinson</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>17.1. O mal de Parkinson é um quadro mórbido de etiologia ainda não estabelecida, resultante do comprometimento do sistema nervoso extrapiramidal e caracterizado pelos seguintes sinais: tremor, rigidez muscular e oligocinesia.</p>
        </div>
      </section>

      <section id="doenca-nefropatia" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">8</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Nefropatias Graves</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>São consideradas nefropatias graves as patologias que, de modo irreversível, acarretam insuficiência renal, determinando incapacidade permanente para o trabalho e/ou risco de morte prematura.</p>
          <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
            <table className="min-w-full text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
              <thead className="bg-gray-50 text-gray-700 font-bold">
                <tr>
                  <th className="p-2 border-r">Estágio</th>
                  <th className="p-2 border-r">Filtração Glomerular (ml/min)</th>
                  <th className="p-2 border-r">Creatinina (mg/dl)</th>
                  <th className="p-2">Grau de I.R.C.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="p-2 border-r font-bold">3</td><td className="p-2 border-r">30 - 59</td><td className="p-2 border-r">2,1 - 6,0</td><td className="p-2 bg-yellow-100">I.R moderada</td></tr>
                <tr className="text-red-700 font-bold"><td className="p-2 border-r">4</td><td className="p-2 border-r">15 - 29</td><td className="p-2 border-r">6,1 - 9,0</td><td className="p-2 bg-red-100">I.R grave</td></tr>
                <tr className="bg-gray-50 text-red-900 font-bold"><td className="p-2 border-r">5</td><td className="p-2 border-r">&lt; 15</td><td className="p-2 border-r">&gt; 9,0</td><td className="p-2 bg-red-200">I.R. terminal</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="doenca-neoplasia" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">9</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Neoplasias Malignas</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>22.1. As neoplasias malignas compreendem um grupo de doenças caracterizadas pelo desenvolvimento incontrolado de células anormais que se disseminam, podendo acometer outros órgãos, a partir de um sítio anatômico primitivo.</p>
        </div>
      </section>

      <section id="doenca-paralisia" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">10</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Paralisia Irreversível e Incapacitante</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>25.1. Entende-se por paralisia a incapacidade de contração voluntária de um músculo ou grupo de músculos, resultante de uma lesão orgânica de natureza destrutiva ou degenerativa.</p>
        </div>
      </section>

      <section id="doenca-penfigo" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-heading">11</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Pênfigos</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>28.1. Os pênfigos compreendem um grupo de dermatoses de curso crônico não contagiosas, de etiologia ainda desconhecida, cujas características principais são: erupção bolhosa, acantólise e auto-imunidade.</p>
        </div>
      </section>

      <section id="doenca-aids" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">12</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Síndrome da Imunodeficiência Adquirida (SIDA/Aids)</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>31.1. A Síndrome da Imunodeficiência Adquirida (SIDA/Aids) é a manifestação mais grave da infecção pelo vírus da imunodeficiência humana (HIV), caracterizando-se por apresentar uma severa imunodeficiência, manifesta no aparecimento de doenças oportunistas.</p>
        </div>
      </section>

      <section id="doenca-tuberculose" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-heading">13</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Tuberculose Ativa</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>34.1. A tuberculose é uma doença infectocontagiosa causada pelo Mycobacterium tuberculosis, de evolução aguda ou crônica, de notificação compulsória. Pode acometer qualquer órgão, tendo, no entanto, nítida predileção pelo pulmão.</p>
        </div>
      </section>

      <section id="doenca-esclerose" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-heading">16</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Esclerose Múltipla</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>51.1. É uma doença desmielinizante do sistema nervoso central, progressiva, caracterizada por placas disseminadas de desmielinização no cérebro e na medula espinhal, resultando em múltiplos e variados sintomas e sinais.</p>
        </div>
      </section>

      <section id="doenca-fibrose" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-heading">17</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Fibrose Cística (Mucoviscidose)</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p>52.1. É uma doença genética autossômica recessiva, decorrente da ausência, deficiência da produção ou defeito na função de um polipeptídeo regulador da condutância transmembrana (CFTR).</p>
        </div>
      </section>

      <section className="scroll-mt-16 pt-6 border-t border-gray-200">
        <h3 className="text-xs font-bold text-navy uppercase mb-3">CAPÍTULO IV — DAS DISPOSIÇÕES FINAIS</h3>
        <div className="space-y-3 text-xs text-gray-500 text-justify leading-relaxed">
          <p><strong>53.</strong> As Forças Armadas poderão sugerir ao Ministério da Defesa, a qualquer tempo, as alterações que julgarem pertinentes para manter o valor atual e prático destas Normas e facilitar a sua aplicação.</p>
          <p className="text-center italic text-[11px] mt-4 text-gray-400">"Este conteúdo não substitui o publicado na versão certificada"</p>
        </div>
      </section>

    </div>
  );
};