import React from 'react';

export const CegueiraSection: React.FC = () => {
  return (
    <section id="doenca-cegueira" className="scroll-mt-16 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">3</div>
        <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Cegueira</h2>
      </div>

      <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600">
        <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">7. Perícia Oftalmológica — conceitos</p>
        <p>
          7.1. Acuidade visual (AV) é a capacidade de perceber a forma e o contorno dos objetos e também considerada um dos parâmetros de desempenho funcional do sistema visual.
        </p>
        <p>
          A Tabela de Snellen é o método universalmente aceito, para medir o AV para longe e, a Tabela de Jaeger, para perto. Expressa-se a acuidade visual sob forma de fração: o numerador é a distância em que o periciado vê os optótipos e o denominador na qual deveria vê-los se tivesse uma acuidade visual normal.
        </p>
        <p>
          7.2. Campo Visual: Campo visual, por definição, é a porção do espaço em que os objetos são simultaneamente, visíveis quando se fixa o olhar numa determinada direção.
        </p>
        <p>
          7.3. Conceitos de cegueira e cegueira legal: A amaurose ou cegueira total refere-se à ausência de percepção luminosa. O termo "cegueira" não significa necessariamente "perda visual absoluta". Há o conceito de cegueira parcial, conhecida como legal, econômica ou profissional. Sua definição é a acuidade visual igual ou inferior a 0,1 (20/200) no melhor olho, com a melhor correção óptica.
        </p>

        <p className="font-bold text-center mt-3 uppercase text-[10px]">Tabela de Comprometimento Visual (Graus 1 a 5)</p>
        <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
          <table className="min-w-full text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
            <thead className="bg-gray-50 text-gray-700 font-bold">
              <tr>
                <th className="p-2 border-r text-center">Grau</th>
                <th className="p-2 border-r text-center">Visão do melhor olho inferior a:</th>
                <th className="p-2 text-center">Visão do pior olho igual ou melhor que:</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="p-2 border-r font-bold">1</td><td className="p-2 border-r">20/70 ou 0,3</td><td className="p-2">20/200 ou 0,1</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r font-bold">2</td><td className="p-2 border-r">20/200 ou 0,1</td><td className="p-2">20/400 ou 0,5</td></tr>
              <tr><td className="p-2 border-r font-bold">3</td><td className="p-2 border-r">20/400 ou 0,05</td><td className="p-2">20/1.200 ou 0,02</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r font-bold">4</td><td className="p-2 border-r">20/1.200 ou 0,02</td><td className="p-2">Percepção de luz</td></tr>
              <tr><td className="p-2 border-r font-bold">5</td><td className="p-2 border-r font-bold text-red-500">Ausência da percepção da luz</td><td className="p-2">-</td></tr>
            </tbody>
          </table>
        </div>

        <p className="font-bold text-navy uppercase text-[11px] mt-6 mb-2">10. Normas de Procedimento das Juntas de Inspecção de Saúde e dos AMP — Cegueira</p>
        <p>10.1. As Juntas concluirão pelo enquadramento em cegueira, os portadores de perda total de visão, sem percepção luminosa, determinada por afecção crônica, progressiva e irreversível, à luz de parecer especializado.</p>
        <p>10.2. As Juntas também concluirão pelo enquadramento em cegueira, em qualquer dos graus descritos no item 8 destas Normas, dos inspecionados que apresentarem diminuição acentuada da acuidade visual, de caráter irreversível.</p>
        <p>10.2.1. Ao emitirem laudos de portadores de afecção inclusos nos graus de diminuição da acuidade visual, as Juntas deverão fazer constar entre parênteses a expressão "cegueira".</p>
        <p>10.3. Ao emitirem laudos de isenção do pagamento do IR de portadores de visão monocular, deverão fazer constar a expressão "Visão Monocular".</p>
      </div>
    </section>
  );
};
