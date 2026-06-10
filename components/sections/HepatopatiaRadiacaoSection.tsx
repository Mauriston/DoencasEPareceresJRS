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
          <p>
            38.1. As hepatopatias graves compreendem um grupo de doenças que atingem o fígado, de forma crítico ou secundária, com evolução aguda ou crítica, ocasionando alteração estrutural extensa e intensa progressiva e grave deficiência funcional, além de incapacidade para atividades laborativas e risco de vida.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">39. Características</p>
          <p>
            39.1. Constituem características das hepatopatias graves:
            <br />
            <strong>39.1.1. Quadro clínico:</strong> a) emagrecimento; b) icterícia; c) ascite; d) edemas periféricos; e) fenômenos hemorrágicos; f) alterações cutâneomucosas sugestivas: aranhas vasculares, eritema palmar, queda de pelos, sufusões hemorrágicas, mucosas hipocoradas; e g) alterações neuropsiquiátricas de encefalopatia hepática.
            <br />
            <strong>39.1.2. Quadro laboratorial:</strong>
            <br />
            a) alterações hematológicas: 1) pancitopenia (completa ou parcial); anemia, leucopenia e trombocitopenia; e 2) distúrbios da coagulação: hipoprotrombinemia e queda dos fatores da coagulação (V, VII, fibrinogênio);
            <br />
            b) alterações bioquímicas: 1) hipoglicemia predominante; 2) hipocolesterolemia; e 3) hiponatremia;
            <br />
            c) testes de avaliação hepática alterados: 1) retenção de bilirrubinas; 2) transaminases elevadas; 3) fosfatase alcalina e gama-GT elevadas; e 4) albumina reduzida.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-1">40. Exames de imagem</p>
          <p>
            Nos exames de imagem são observadas as seguintes alterações:
            <br />
            a) ultra-sonografia: alterações estruturais do fígado e baço, ascite, dilatação das veias do sistema porta; b) tomografia computadorizada e ressonância nuclear magnética abdominal: alterações dependentes da doença primária; c) endoscopia digestiva alta: presença de varizes esofagianas e de gastropatia hipertensiva; e d) cintilografia hepática: redução da captação hepática, forma heterogênea, com aumento da captação esplénica e na medula Óssea.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-1">41. Classificação</p>
          <p>
            41.1. A insuficiência hepática desenvolve-se em consequência da perda de massa celular funcionante, decorrente da necrose causada por doenças infecciosas, inflamatórias, tóxicas, alérgicas, infiltrativas, tumorais, vasculares ou por obstrução do fluxo biliar.
            <br />
            41.2. A gravidade do comprometimento funcional é graduada, com finalidade prognóstica, em tabela universalmente aceita, conhecida como <span className="bg-yellow-105 text-navy font-semibold rounded px-1">Classificação de Child-Turcotte-Pugh</span>, nela considerados cinco indicadores:
          </p>

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
                <tr>
                  <td className="p-2 border-r font-bold text-left">Albumina</td>
                  <td className="p-2 border-r">&gt; 3,5 G%</td>
                  <td className="p-2 border-r">3,0 a 3,5 g%</td>
                  <td className="p-2">&lt; 3,0 g%</td>
                </tr>
                <tr>
                  <td className="p-2 border-r font-bold text-left">Bilirrubina</td>
                  <td className="p-2 border-r">&lt; 2,0 mg%</td>
                  <td className="p-2 border-r">2,0 a 3,0 mg%</td>
                  <td className="p-2">&gt; 3,0 mg%</td>
                </tr>
                <tr>
                  <td className="p-2 border-r font-bold text-left">Ascite</td>
                  <td className="p-2 border-r">Ausente</td>
                  <td className="p-2 border-r">Discreta</td>
                  <td className="p-2">Tensa</td>
                </tr>
                <tr>
                  <td className="p-2 border-r font-bold text-left">Grau de encefalopatia</td>
                  <td className="p-2 border-r">Não</td>
                  <td className="p-2 border-r">Leve</td>
                  <td className="p-2">Grave</td>
                </tr>
                <tr>
                  <td className="p-2 border-r font-bold text-left">Atividade de protrombina</td>
                  <td className="p-2 border-r">&gt; 75%</td>
                  <td className="p-2 border-r">20 a 74 %</td>
                  <td className="p-2">&lt; 50 %</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>41.2.1. De acordo com o total de pontos obtidos, os prognósticos dividem-se em:</p>
          <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm inline-block">
            <table className="min-w-[180px] text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
              <thead className="bg-gray-50 text-gray-700 font-bold">
                <tr>
                  <th className="p-2 border-r">CLASSE</th>
                  <th className="p-2">TOTAL DE PONTOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="p-2 border-r font-bold text-center">A</td><td className="p-2 text-center">5 a 6</td></tr>
                <tr className="bg-gray-50"><td className="p-2 border-r font-bold text-center">B</td><td className="p-2 text-center">7 a 9</td></tr>
                <tr><td className="p-2 border-r font-bold text-center">C</td><td className="p-2 text-center">10 a 15</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            41.2.1.1. Os indivíduos situados na Classe A têm bom prognóstico de sobrevida, habitualmente acima de cinco anos, enquanto os da Classe C têm mau prognóstico, possivelmente menor que um ano.
          </p>
          <p>
            41.3. A <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">encefalopatia hepática</span>, também denominada encefalopatia portossistêmica, incluída na tabela constante do item 42.2. deste Normativo, obedece à seguinte gradação:
            <br />
            a) Subclínica: alteração em testes psicométricos;
            <br />
            b) Estágio 1: desatenção, irritabilidade, alterações da personalidade, tremores periféricos e incoordenação motora;
            <br />
            c) Estágio 2: sonolência, redução da memória, alterações do comportamento, tremores, fala arrastada, ataxia;
            <br />
            d) Estágio 3: confusão, desorientação, amnésia, sonolência, nistagmo, hiporreflexia e rigidez muscular; e
            <br />
            e) Estágio 4: coma, midríase e postura de descerebração, arreflexia.
            <br />
            41.3.1. A pontuação leve na Tabela de Child inclui os Estágios Subclínico, 1 e 2, enquanto a pontuação grave os Estágios 3 e 4.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-1">42. São causas das hepatopatias graves:</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>a) hepatites fulminantes: virais, tóxicas, metabólicas, autoimunes, vasculares;</li>
            <li>b) cirroses hepáticas: virais, tóxicas, metabólicas, autoimunes, vasculares;</li>
            <li>c) doenças parasitárias e granulomatosas;</li>
            <li>d) tumores hepáticos malignos: primários ou metastáticos; e</li>
            <li>e) doenças hepatobiliares e da vesícula biliar levando a cirrose biliar secundária.</li>
          </ul>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-1">43. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP - Hepatopatias Graves</p>
          <p>
            43.1. As hepatopatias classificadas na Classe A de Child não são consideradas graves.
            <br />
            43.2. As hepatopatias classificadas na Classe B de Child, quando houver presença de ascite e/ou encefalopatia de forma recidivante, serão consideradas como hepatopatia grave.
            <br />
            43.3. As hepatopatias classificadas na Classe C de Child serão enquadradas como hepatopatia grave.
            <br />
            43.4. Como é possível a regressão de classes mais graves para menos graves, com tratamento específico, o enquadramento se dará após 24 (vinte e quatro) meses, a contar da data do início do tratamento específico.
            <br />
            43.5. Os indivíduos que desenvolveram formas fulminantes ou subfulminantes de hepatite e foram submetidos a transplante hepático de urgência serão avaliados pelas Juntas de Inspeção de Saúde e pelos AMP após 24 (vinte e quatro) meses do transplante.
            <br />
            43.6. Os laudos das Juntas de Inspeção de Saúde e dos AMP deverão conter, obrigatoriamente, os diagnósticos anatomopatológico, etiológico e funcional, com a afirmativa ou negativa de tratar-se de hepatopatia grave.
            <br />
            43.6.1. O diagnóstico anatomopatológico poderá ser dispensado nos casos de contra-indicação médica formalizada, a exemplo das coagulopatias, sendo substituído por outros exames que possam comprovar e caracterizar a gravidade do quadro.
            <br />
            43.7. Para o diagnóstico do <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">hepatocarcinoma</span> a comprovação histológica obtida pela biópsia pode ser substituída pela presença de elevados níveis séricos de alfa-fetoproteína (mais de 400 ng/ml) e alterações típicas no eco-Doppler, na tomografia computadorizada helicoidal ou retenção do lipiodol após arteriografia seletiva, em indivíduos com condições predisponentes para o hepatocarcinoma: cirroses, doenças metabólicas congênitas, portadores de vírus B e C, alcoólatras.
          </p>

          <p className="p-3 bg-gray-50 rounded border border-gray-100 italic">
            <strong>44. Constitui exemplo de laudo:</strong>
            <br />
            "Cirrose hepática consequente à hepatite crítica pelo vírus B, com insuficiência hepática Classe C de Child, é hepatopatia grave."
          </p>
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
          <p>
            45.1. Consideram-se "doenças causadas por Radiação ionizante em estágio avançado" todas patologias que tenham, comprovadamente, relação de causa e efeito com a Radiação ionizante, com comprometimento da capacidade laboral. As doenças por radiação ionizante, em todos os seus tipos e gravidades, se desenvolvem por exposição do indivíduo à referida radiação, com ou sem contaminação interna ou externa por material radioativo, sendo, portanto, o mesmo grupo de doenças.
            <br />
            45.2. Radiação ionizante: qualquer partícula ou radiação eletromagnética que, ao interagir com a matéria, desloca elétrons dos átomos ou moléculas produzindo íons.
            <br />
            45.3. Exposição à radiação ionizante: ato ou condição de estar submetido à radiação ionizante.
            <br />
            45.4. Contaminação radioativa: deposição indesejável de materiais radioativos em qualquer meio ou local.
            <br />
            45.5. As Juntas de Inspeção de Saúde e os AMP deverão comprovar a relação de causa e efeito da radiação ionizante com a patologia apresentada pelo indivíduo.
            <br />
            45.6. A afirmativa de que uma patologia possui relação de causa e efeito com a radiação ionizante necessita ser perfeitamente documentada por atestado de origem, inquérito sanitário de origem ou ficha de evacuação.
            <br />
            45.7. As Juntas de Inspeção de Saúde e os AMP deverão atentar para os quadros, cujas medidas terapêuticas disponíveis estejam em andamento, com prognóstico favorável e possibilidade de recuperação funcional.
            <br />
            45.8. As Juntas de Inspeção de Saúde e os AMP deverão identificar, no mínimo, uma das seguintes síndromes:
            <br />
            <strong>a) síndrome aguda da radiação:</strong> é um conjunto de sinais e sintomas decorrentes de exposição de corpo inteiro a alta dose de radiação por curto espaço de tempo; é um evento determinístico que se desenvolve quando um limite de dose é ultrapassado (0,8 a 1,0 Gy); e
            <br />
            <strong>b) síndrome cutânea da radiação:</strong> é um conjunto de sinais e sintomas decorrentes da exposição localizada ou de corpo inteiro e que levam a alterações cutâneas e de tecidos e estruturas subjacentes.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">46. Quadros clínicos que cursam com a síndrome aguda da radiação</p>
          <p>
            46.1. São necessariamente quadros de síndrome aguda da radiação os quadros sindrômicos que sejam decorrentes de evento considerado determinístico, no qual o limite de dose de 0,8 a 1,0 Gy tenha sido ultrapassado, a saber:
            <br />
            <strong>a) o quadro hematopoiético:</strong> caracteriza-se por alterações hematológicas (leucopenia, trombocitopenia, reticulocitopenia) provenientes de exposição à radiação ionizante das células tronco e precursoras da medula óssea. O quadro surge ao ser alcançado o limiar de dose de 0,8 a 1,0 Gy, considerando-se uma distribuição uniforme e homogênea de dose;
            <br />
            <strong>b) o quadro gastrointestinal:</strong> caracteriza-se por alterações da mucosa gastrointestinal, decorrentes de exposição de corpo inteiro à radiação ionizante, levando à síndrome disabsortiva, perda hidroeletrolítica e sanguínea. As lesões da mucosa ocorrem, em geral, a partir do limiar de 7,0 Gy; e
            <br />
            <strong>c) o quadro neurovascular:</strong> caracteriza-se por depletamentos neurológicos e manifestações neurológicas e vasculares que conduzem, inevitavelmente, à morte, e ocorre com doses extremamente altas de radiação, superiores a 20 Gy.
            <br />
            46.2. Os quadros clínicos decorrentes do acúmulo de pequenas doses de exposição por longo período de tempo não são considerados quadros de síndrome aguda da radiação.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">47. Quadros clínicos que cursam com a síndrome cutânea da radiação</p>
          <p>
            47.1. A síndrome cutânea da radiação pode ser classificada, quanto ao seu grau de severidade, em:
            <br />
            <strong>Grau I ou Leve (exposição de 8,0 a 10,0 Gy):</strong> evolui com pele seca e pigmentação;
            <br />
            <strong>Grau ll ou Moderada (exposição &gt; 12,0 a 30,0 Gy):</strong> evolui com atrofia de pele, podendo se estender ao subcutâneo e músculos, e com úlcera tardia;
            <br />
            <strong>Grau III ou Grave (exposição de 30,0 a 50,0 Gy):</strong> evolui com cicatrizes, fibrose, alterações escleróticas, degenerativas e necrose; e
            <br />
            <strong>Grau IV ou Muito Grave (exposição acima de 50,0 Gy):</strong> evolui com deformidade e recidiva de úlceras, podendo necessitar de amputação.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">48. Meios de diagnóstico</p>
          <p>
            48.1. Os meios de diagnóstico a serem empregados na avaliação da síndrome aguda da radiação e da síndrome cutânea da radiação são:
            <br />
            a) história clínica, com dados evolutivos da doença; b) exame clínico; c) dosimetria física (avaliação de dosímetro individual, de dosimetria de área e reconstrução do acidente com modelo experimental); d) dosimetria clínica (avaliação do tempo de surgimento dos sintomas e do tempo de duração das manifestações); e) avaliação hematológica; f) avaliação bioquímica (glicose, ureia, creatinina, amilase, lipase, fosfatase alcalina, desidrogenase lática, transaminases glutâmico oxalacética e pirúvica); g) dosimetria citogenética; h) tomografia computadorizada; i) ressonância magnética; j) termografia; k) avaliação fotográfica seriada; l) estudos cintilográficos; e m) estudos Doppler.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">49. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP - Contaminação por radiação</p>
          <p>
            49.1. Os portadores da síndrome cutânea da radiação de Graus III e IV, descrita no item 47.1 destas Normas, serão considerados pelas Juntas de Inspeção de Saúde e pelos AMP como portadores de doença causada por radiação ionizante em estágio avançado, desde que haja limitação significativa da capacidade física para exercer atividades laborais básicas.
            <br />
            49.2. As Juntas de Inspeção de Saúde e os AMP farão o enquadramento por síndrome aguda da radiação dos inspecionados que satisfizerem a uma das seguintes condições:
            <br />
            a) apresentarem alterações físicas e mentais de mau prognóstico a curto prazo;
            <br />
            b) apresentarem alterações físicas e mentais que tenham durado ou têm expectativa de duração por período contínuo igual ou maior que doze meses; ou
            <br />
            c) apresentarem sequelas que limitam, significativamente, a capacidade física e mental do inspecionando para executar atividades laborais básicas.
            <br />
            49.3. Nos casos descritos nos subitens 49.1 e 49.2, constatada a irreversibilidade do quadro clínico, deverá constar após o laudo que o enquadramento será por tempo indeterminado.
            <br />
            49.4. Os portadores de síndrome cutânea da radiação Grau IV, passível de amputação, desde que em condições físicas satisfatórias para se submeterem a tal procedimento, terão seu enquadramento reavaliado após o tratamento instituído.
            <br />
            49.5. As Juntas de Inspeção de Saúde e os AMP deverão fazer constar, obrigatoriamente, nos laudos declaratórios do portador de doença causada por radiação ionizante os seguintes dados:
            <br />
            a) a síndrome básica, inclusive o diagnóstico numérico, de acordo com a Classificação Internacional de Doenças (CID);
            <br />
            b) o estágio evolutivo; e
            <br />
            c) a expressão "sequela" se for o quadro determinante da incapacidade.
          </p>

          <p className="p-3 bg-gray-50 rounded border border-gray-100 font-bold">
            50. Constituem exemplos de laudos:
            <br />
            a) "Síndrome Cutânea da Radiação, W.88 CID-Rev10, estágio grave (Grau III) ou severo (Grau IV)";
            <br />
            b) "Sequela de Síndrome Cutânea da Radiação, W.88 CIDRev10, irremissível";
            <br />
            c) "Síndrome Aguda da Radiação, W.88 CID-Rev10, estágio pré-terminal grave"; e
            <br />
            d) "Sequela de Síndrome Aguda da Radiação, W.88 CIDRev10, irremissível."
          </p>
        </div>
      </section>

    </div>
  );
};
