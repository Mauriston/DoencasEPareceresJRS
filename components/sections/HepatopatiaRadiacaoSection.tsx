import React from 'react';

export const HepatopatiaRadiacaoSection: React.FC = () => {
  return (
    <div className="space-y-8">
      
      {/* 14. Hepatopatia Grave */}
      <section id="doenca-hepatopatia" className="scroll-mt-16 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-lime-100 text-lime-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">14</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Hepatopatia Grave</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">38. Conceituação</p>
          <p>38.1. As hepatopatias graves compreendem um grupo de doenças que atingem o fígado, de forma crítico ou secundária, com evolução aguda ou crítica, ocasionando alteração estrutural extensa e intensa progressiva e grave deficiência funcional, além de incapacidade para atividades laborativas e risco de vida.</p>
          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">41. Classificação - Child-Turcotte-Pugh</p>
          <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
            <table className="min-w-full text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
              <thead className="bg-gray-50 text-gray-700 font-bold">
                <tr>
                  <th className="p-2 border-r text-left">INDICADORES</th>
                  <th className="p-2 border-r">1 Ponto</th>
                  <th className="p-2 border-r">2 Pontos</th>
                  <th className="p-2">3 Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="p-2 border-r font-bold text-left">Albumina</td><td className="p-2 border-r">&gt; 3,5 G%</td><td className="p-2 border-r">3,0 a 3,5 g%</td><td className="p-2">&lt; 3,0 g%</td></tr>
                <tr><td className="p-2 border-r font-bold text-left">Bilirrubina</td><td className="p-2 border-r">&lt; 2,0 mg%</td><td className="p-2 border-r">2,0 a 3,0 mg%</td><td className="p-2">&gt; 3,0 mg%</td></tr>
                <tr><td className="p-2 border-r font-bold text-left">Ascite</td><td className="p-2 border-r">Ausente</td><td className="p-2 border-r">Discreta</td><td className="p-2">Tensa</td></tr>
                <tr><td className="p-2 border-r font-bold text-left">Grau de encefalopatia</td><td className="p-2 border-r">Não</td><td className="p-2 border-r">Leve</td><td className="p-2">Grave</td></tr>
                <tr><td className="p-2 border-r font-bold text-left">Atividade de protrombina</td><td className="p-2 border-r">&gt; 75%</td><td className="p-2 border-r">20 a 74 %</td><td className="p-2">&lt; 50 %</td></tr>
              </tbody>
            </table>
          </div>
          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">43. Normas - Hepatopatias Graves</p>
          <p>43.1. As hepatopatias classificadas na Classe A de Child não são consideradas graves.<br/>43.2. As hepatopatias classificadas na Classe B de Child, quando houver presença de ascite e/ou encefalopatia de forma recidivante, serão consideradas como hepatopatia grave.<br/>43.3. As hepatopatias classificadas na Classe C de Child serão enquadradas como hepatopatia grave.</p>
        </div>
      </section>

      {/* 15. Contaminação por Radiação */}
      <section id="doenca-radiacao" className="scroll-mt-16 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100 text-emerald-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">15</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Contaminação por Radiação</h2>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">45. Conceituação</p>
          <p>45.1. Consideram-se "doenças causadas por Radiação ionizante em estágio avançado" todas patologias que tenham, comprovadamente, relação de causa e efeito com a Radiação ionizante, com comprometimento da capacidade laboral.</p>
          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">47. Síndrome cutânea - Graus de severidade</p>
          <p><strong>Grau I ou Leve (8,0 a 10,0 Gy):</strong> pele seca e pigmentação.<br/><strong>Grau II ou Moderada (&gt; 12,0 a 30,0 Gy):</strong> atrofia de pele, úlcera tardia.<br/><strong>Grau III ou Grave (30,0 a 50,0 Gy):</strong> cicatrizes, fibrose, necrose.<br/><strong>Grau IV ou Muito Grave (&gt; 50,0 Gy):</strong> deformidade, recidiva de úlceras, amputação.</p>
        </div>
      </section>
    </div>
  );
};