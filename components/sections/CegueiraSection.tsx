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
          7.1. Acuidade visual (AV) é a capacidade de perceber a forma e o contorno dos objetos e também considerada um dos parâmetros de desempenho funcional do sistema visual. Quanto melhor for a acuidade visual, melhor será a nitidez dos objetos focados. Assim, fisiologicamente, a AV é determinada pela habilidade de distinguir dois estímulos separados no espaço em contraste com o fundo.
        </p>
        <p>
          Ela pode be medida para longe e para perto, sem e com correção óptica. A Tabela de Snellen é o método universalmente aceito, para medir o AV para longe e, a Tabela de Jaeger, para perto. Expressa-se a acuidade visual sob forma de fração: o numerador é a distância em que o periciado vê os optótipos e o denominador na qual deveria vê-los se tivesse uma acuidade visual normal (ou de "uma unidade"). Assim, tem-se a notação fracionária 6/m ou 20/p, onde m é o valor da distância em metros e p em pés, na qual o optótipo apresentado deveria ser normalmente visível.
        </p>
        <p>
          O indivíduo que possui 20/20, a visão é normal e significa que enxerga o que a maioria da população vê a seis metros de distância. Quando a visão é 20/40, isso significa que quando fica a seis metros (vinte pés) da tabela de leitura, é capaz de enxergar o que um ser humano normal veria se estivesse a doze metros (quarenta pés). Ou seja, um indivíduo com visão normal a doze metros de distância do quadro e o periciado a seis metros veriam os mesmos detalhes. Outro exemplo: 20/100 significa que quando se está a seis metros (vinte pés), se consegue ver o que um indivíduo com visão normal veria se estivesse a trinta metros (cem pés) de distância.
        </p>
        <p>
          Quando a AV é muito baixa, ou seja, não é possível ler o maior optótipo da Tabela de SNELLEN, então é utilizada uma tabela especial para indivíduos de baixa visão ou, na ausência desta, solicita-se que o indivíduo diga se consegue contar os dedos da mão que o examinador coloca a sua frente a uma distância de três, dois ou um metro, sendo expressa como "contar dedos a x metros" (CD a x m).
        </p>
        <p>
          É importante ressaltar que, por convenção, a medida da AV no exame oftalmológico é realizada a uma distância de seis metros (vinte pés) do examinado em relação a tabela de optótipos, iniciando-se a avaliação pelo olho direito - OD com oclusão do olho esquerdo, e posteriormente, o olho esquerdo e avaliado com a oclusão do OD, sendo as avaliações com o uso de correção óptica recente ou com correção óptica utilizando o buraco estenopeico.
        </p>

        <p>
          7.2. Campo Visual: Campo visual, por definição, é a porção do espaço em que os objetos são simultaneamente, visíveis quando se fixa o olhar numa determinada direção. Para caracterizar as áreas do campo visual com sensibilidade diminuída, usa-se o termo escotoma, que significa sombra. Nas avaliações perimétricas, representa uma área onde a visão está parcialmente comprometida (escotoma relativo) ou totalmente comprometida (escotoma absoluta), numa região em que deveria haver sensibilidade normal. O campo visual tem formato elíptico e seus limites de cada olho são, separadamente, medidos em graus, desde o ponto de fixação do olhar, aproximadamente: sessenta graus no campo superior, setenta e cinco graus no campo inferior, cem graus no temporal e sessenta graus no nasal.
        </p>
        <p>
          Para adequada interpretação e posterior enquadramento legal, a acuidade visual (com a melhor correção ou, simplesmente, dita "corrigida") e o campo visual devem ser analisados criteriosamente, pois dependem da colaboração do examinado.
        </p>

        <p>
          7.3. Conceitos de cegueira e cegueira legal: A amaurose ou cegueira total refere-se à ausência de percepção luminosa, ou perda completa da visão em ambos os olhos sendo está uma das condições previstas para enquadramento, por exemplo, em majoração de vinte e cinco por cento da aposentadoria por invalidez.
        </p>
        <p>
          O termo "cegueira" não significa necessariamente "perda visual absoluta", mas, limitação para tarefas rotineiras possivelmente incapacitantes. Há o conceito de cegueira parcial, conhecida como legal, econômica ou profissional, muito utilizado quando a dificuldade visual passa a comprometer o desempenho profissional. Sua definição é a acuidade visual igual ou inferior a 0,1 (20/200) no melhor olho, com a melhor correção óptica. Nessa categoria, há indivíduos mais próximos da cegueira total, que apenas têm percepção (distinguem claro e escuro) ou projeção luminosa (identificam a direção da luz); Há os que percebem vultos, os capazes de contar dedos a curta distância e os que identificam optótipos (letras, números ou figuras) no exame oftalmológico. Neste sentido, introduz-se o conceito de cegueira, na qual a "acuidade visual é igual ou menor que 0,05 (20/400), no melhor olho, com a melhor correção óptica", conforme do Decreto nº 5.296, de 2 de dezembro de 2004 (alterando a redação do Decreto nº 3.298, de 20 de dezembro de 1999). Todavia, para a Organização Mundial da Saúde (OMS), a definição de cegueira, além do conceito acima, inclui a condição na qual o campo visual seja menor do que dez graus em torno do ponto central de fixação.
        </p>

        <p className="font-bold text-center mt-3 uppercase text-[10px]">CLASSIFICAÇÃO INTERNACIONAL DE DEFICIÊNCIAS, INABILIDADES E DESVANTAGENS DA OMS</p>
        <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
          <table className="min-w-full text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
            <thead className="bg-gray-50 text-gray-700 font-bold">
              <tr>
                <th className="p-2 border-r text-left">DISTÚRBIO</th>
                <th className="p-2 border-r">DEFICIÊNCIA</th>
                <th className="p-2 border-r">INABILIDADE</th>
                <th className="p-2">DESVANTAGEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-left">
              <tr>
                <td className="p-2 border-r font-bold">Mudanças Anatômicas</td>
                <td className="p-2 border-r">Mudanças na função do órgão</td>
                <td className="p-2 border-r">Perda de habilidades individuais</td>
                <td className="p-2">Consequências Sociais</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-2 border-r font-bold">Cicatriz corneapatia / retinopatia</td>
                <td className="p-2 border-r">Acuidade visual, campo visual, visão de cores</td>
                <td className="p-2 border-r">Habilidade de leitura, mobilidade, vida diária</td>
                <td className="p-2">Necessidade extra de esforço, perda da independência, perda do emprego</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="font-bold text-center mt-3 uppercase text-[10px]">CATEGORIAS GERAIS DE HABILIDADE</p>
        <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
          <table className="min-w-full text-left text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-2 font-bold bg-gray-50 w-1/3">ACIMA DO NORMAL</td>
                <td className="p-2">HABILIDADE EXCEPCIONAL</td>
                <td className="p-2">NÃO REQUER AUXÍLIO</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-gray-50">NORMAL</td>
                <td className="p-2">DESEMPENHO NORMAL</td>
                <td className="p-2">NÃO REQUER AUXÍLIO</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-gray-50">PERDA LEVE</td>
                <td className="p-2">DESEMPENHO PRÓXIMO DO NORMAL</td>
                <td className="p-2">AUXÍLIO DE MELHORA</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-gray-50">PERDA MODERADA</td>
                <td className="p-2">DESEMPENHO PRÓXIMO DO NORMAL</td>
                <td className="p-2">AUXÍLIO DE MELHORA</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-gray-50">PERDA SEVERA</td>
                <td className="p-2">DESEMPENHO RESTRITO</td>
                <td className="p-2">AUXÍLIO DE MELHORA</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-gray-50">PERDA PROFUNDA</td>
                <td className="p-2">DESEMPENHO RESTRITO</td>
                <td className="p-2">AUXÍLIO DE MELHORA</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-gray-50">PERDA QUASE TOTAL</td>
                <td className="p-2">DESEMPENHO RESTRITO</td>
                <td className="p-2">AUXÍLIO DE SUBSTITUIÇÃO</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          De acordo com a 10ª Classificação Estatística Internacional das Doenças e Problemas relacionados à Saúde (CID-10), considera-se Visão Subnormal quando o valor da acuidade visual corrigida no melhor olho é pior que 0,3 (20/60) e melhor que ou igual a 0,05 (20/400) ou seu Campo Visual menor que vinte graus no melhor olho com a melhor correção. Considera-se cegueira quando o valor de acuidade visual é pior que 0,05 (20/400) no melhor olho ou no Campo Visual, menor que dez graus.
        </p>
        <p>
          Segundo A OMS, a Baixa Visão pode ser classificada nos seguintes aspectos:
          <br />
          - 20/30 a 20/60: é considerado leve perda de visão, ou próximo de visão normal;
          <br />
          - 20/70 a 20/160: é considerado baixa visão moderada, baixa visão moderada;
          <br />
          - 20/200 a 20/400: é considerado grave deficiência visual, baixa visão grave;
          <br />
          - 20/500 a 20/1000: é considerado visão profunda, baixa visão profunda;
          <br />
          - Inferior a 20/1000: é considerado quase total deficiência visual, cegueira total ou quase;
          <br />
          - Nenhuma Percepção da luz: é considerada total deficiência visual, cegueira total.
        </p>
        <p>
          A Cegueira ou amaurose é um estado patológico no qual a acuidade visual de um olho (monocular) ou de ambos os olhos é igual a zero (CID H54.0), sem percepção luminosa, após esgotados os recursos de correção óptica. A visão monocular com o outro olho normal ou com classes de comprometimento visual 1 e 2 não incapacita a vida laboral ou de relação. De acordo com as peculiaridades entre as Forças Singulares, devem ser avaliadas as restrições laborais que exijam visão binocular.
        </p>

        <p>
          7.4. São consideradas cegueiras, com base na definição de classes de comprometimento visual e Classificação Internacional de Doenças (CID 10), conforme as definições e a tabela a seguir:
          <br />
          a) H54.1 — Cegueira em um olho e <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">visão subnormal</span> em outro — Classes de comprometimento visual 3, 4 e 5 em um olho, com categorias 1 ou 2 no outro olho; e
          <br />
          b) H54.2 — <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">Visão subnormal</span> de ambos os olhos — Classes de comprometimento visual 1 ou 2 em ambos os olhos;
        </p>
        <p>
          7.5. A <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">cegueira em um olho</span> (H54.4) com classes de comprometimento visual 3, 4 ou 5 em um olho (visão normal no outro olho) ou visão monocular será considerada doença especificada na Lei nº 7.713, de 22 de dezembro de 1988, alterada pelas Leis nº 8.541, de 23 de dezembro de 1992, nº 9.250, de 26 de dezembro de 1995, e nº 11.052, de 29 de dezembro de 2004, combinado com o Ato Declaratório nº 3 da PGFN, de 30 de março de 2016.
        </p>
        <p>
          8. A tabela abaixo apresenta a classificação da gravidade do comprometimento visual que foi recomendado pelo Grupo de Estudos sobre a Prevenção da Cegueira da OMS (WHO Technical Report Series nº 518, 1973). O termo "visão subnormal" encontrado na categoria H54 da CID 10 compreende os graus 1 e 2 do quadro abaixo e o termo "cegueira" os graus 3, 4 e 5. Caso a extensão do campo visual venha a ser levada em consideração, os pacientes cujo campo visual no olho de melhor visão se encontre entre os limites normais serão classificados no grau correspondente à acuidade.
        </p>

        <p className="font-bold text-center mt-3 uppercase text-[10px]">Tabela de Comprometimento Visual (Graus 1 a 5)</p>
        <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
          <table className="min-w-full text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
            <thead className="bg-gray-50 text-gray-700 font-bold">
              <tr>
                <th className="p-2 border-r text-center" rowSpan={2}>Grau</th>
                <th className="p-2 text-center" colSpan={2}>Acuidade visual com a melhor correção possível</th>
              </tr>
              <tr>
                <th className="p-2 border-r text-center border-t border-gray-100">Visão do melhor olho inferior a:</th>
                <th className="p-2 text-center border-t border-gray-100">Visão do pior olho igual ou melhor que:</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-2 border-r font-bold">1</td>
                <td className="p-2 border-r">20/70 ou 0,3</td>
                <td className="p-2">20/200 ou 0,1</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-2 border-r font-bold">2</td>
                <td className="p-2 border-r">20/200 ou 0,1</td>
                <td className="p-2">20/400 ou 0,5</td>
              </tr>
              <tr>
                <td className="p-2 border-r font-bold">3</td>
                <td className="p-2 border-r">20/400 ou 0,05</td>
                <td className="p-2">20/1.200 ou 0,02 ou capacidade de contar dedos a 1 metro</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-2 border-r font-bold">4</td>
                <td className="p-2 border-r">20/1.200 ou 0,02 ou capacidade de contar dedos a 1 metro</td>
                <td className="p-2">Percepção de luz</td>
              </tr>
              <tr>
                <td className="p-2 border-r font-bold">5</td>
                <td className="p-2 border-r font-bold text-red-500">Ausência da percepção da luz</td>
                <td className="p-2">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          9. O inspecionado poderá requerer a realização de uma nova Inspeção de Saúde, em caso de agravamento da perda de visão, considerando a possibilidade de ser reformado, mesmo que já esteja na reserva.
        </p>

        <p className="font-bold text-navy uppercase text-[11px] mt-6 mb-2">10. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP — Cegueira</p>
        <p>
          10.1. As Juntas de Inspeção de Saúde e os AMP, concluirão pelo enquadramento em cegueira, os portadores de perda total de visão (cegueira), sem percepção luminosa, determinada por afecção crônica, progressiva e irreversível, à luz de parecer especializado.
        </p>
        <p>
          10.2. As Juntas de Inspeção de Saúde e os AMP, de acordo com a amplitude de conceito legal, também concluirão pelo enquadramento em cegueira, em qualquer dos graus descritos no item 8 destas Normas, dos inspecionados que apresentarem diminuição acentuada da acuidade visual, de caráter irreversível, não suscetível de correção óptica, nem removível por tratamento médico-cirúrgico, à luz de parecer especializado.
        </p>
        <p>
          10.2.1. As Juntas de Inspeção de Saúde e os AMP, ao emitirem laudos de portadores de afecção que os inclua nos graus de diminuição da acuidade visual descritos no item 8 destas normas deverão fazer constar entre parênteses, ao lado do diagnóstico, a expressão "cegueira".
        </p>
        <p>
          10.3. As Juntas de Inspeção de Saúde e os AMP, ao emitirem laudos de isenção do pagamento do Imposto de Renda de portadores da condição visão monocular, conforme os padrões descritos nesta Portaria, deverão fazer constar a expressão "Visão Monocular".
        </p>
      </div>
    </section>
  );
};
