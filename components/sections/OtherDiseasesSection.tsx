import React from 'react';

export const OtherDiseasesSection: React.FC = () => {
  return (
    <div className="space-y-8 divide-y divide-gray-100">
      
      {/* 4. Espondilite Anquilosante */}
      <section id="doenca-espondilite" className="scroll-mt-16 pt-4 first:border-none">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">4</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Espondilite Anquilosante</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">11. Conceituação</p>
          <p>
            11.1. A Espondilite Anquilosante, inadequadamente denominada de espondiloartrose anquilosante nos textos legais, é uma doença inflamatória de etiologia desconhecida, que afeta principalmente as articulações sacroiliacas, interapofisárias e costovertebrais, os discos intervertebrais e o tecido conjuntivo frouxo que circunda os corpos vertebrais, entre estes e os ligamentos da coluna. O processo geralmente se inicia pelas sacroiliacas e, ascensionalmente, atinge a coluna vertebral. Há grande tendência para a ossificação dos tecidos inflamados, resultando rigidez progressiva da coluna. As articulações periféricas também podem ser comprometidas, particularmente as das raízes dos membros (ombros e coxofemorais), daí a designação rizomélia.
          </p>
          <p>
            11.2. Entende-se por anquilose ou ancilose a rigidez ou fixação de uma articulação, reservando-se o conceito de anquilose óssea verdadeira à fixação completa de uma articulação em consequência da fusão patológica dos ossos que a constituem.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">12. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP</p>
          <p>
            12.1. Ao firmarem seus laudos, as Juntas de Inspeção de Saúde e os AMP deverão fazer constar a citação expressa da existência de anquiloses da coluna vertebral com os segmentos acometidos ou da articulação da raiz do membro acometido, sem o qual não há amparo para enquadramento.
          </p>
          <p>
            12.2. As Juntas de Inspeção de Saúde e os AMP acrescentarão, entre parênteses, a expressão "É Espondilite Anquilosante", ao concluírem os laudos dos portadores de afecções da coluna vertebral que, por seu grave comprometimento e extensa imobilidade, se tornarem total e permanentemente incapacitados para qualquer trabalho.
          </p>
          <p>
            12.3. As Juntas de Inspeção de Saúde e os AMP, além dos elementos clínicos de que disponham e dos pareceres da medicina especializada, deverão, obrigatoriamente, ter os seguintes exames subsidiários elucidativos:
            <br />
            a) comprovação radiológica de anquilose; b) cintilografia óssea; c) teste sorológico específico HLA - B27; e d) tomografia computadorizada de articulações sacroiliacas e coluna acometidas.
          </p>
        </div>
      </section>

      {/* 5. Estados Avançados da Doença de Paget (Osteíte Deformante) */}
      <section id="doenca-paget" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">5</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Estados Avançados da Doença de Paget</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">13. Conceituação</p>
          <p>
            13.1. A doença de Paget é uma afecção óssea crônica, caracterizada por deformações ósseas de evolução lenta e progressiva, de etiologia desconhecida, geralmente assintomática e acometendo um só osso ou, menos frequentemente, atingindo várias partes do esqueleto.
          </p>
          <p>
            13.2. A evolução da doença, que pode acompanhar-se de sintomatologia dolorosa e fraturas espontâneas, processa-se em duas fases:
            <br />
            <strong>a) fase ativa ou osteoporótica:</strong> caracterizada pela formação de tecido ósseo ricamente vascularizado, onde são comuns fraturas com consolidação rápida; e
            <br />
            <strong>b) fase de relativa inatividade:</strong> com formação de tecido ósseo denso e menos vascularizado, onde as fraturas têm retardo de consolidação.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">14. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP</p>
          <p>
            14.1. As formas localizadas da doença de Paget, assintomáticas, detectadas em exames radiológicos de rotina, ou oligossintomáticas, não serão legalmente enquadradas nessa afecção.
          </p>
          <p>
            14.2. Os estados avançados da doença de Paget apresentam as seguintes características:
            <br />
            a) lesões ósseas generalizadas, deformidades ósseas, osteoartrites secundárias, fraturas espontâneas e degeneração maligna (sarcoma osteogénico, fibrossarcoma e sarcoma de células redondas);
            <br />
            b) complicações neurológicas e sensoriais: surdez, perturbações olfativas e neuralgias; e
            <br />
            c) complicações cardiovasculares: insuficiência cardíaca, arteriosclerose periférica e hipertensão arterial, comprovadamente relacionadas à patologia.
          </p>
          <p>
            14.3. Ao firmarem o laudo médico pericial, as Juntas de Inspeção de Saúde e os AMP deverão registrar a extensão das deformidades e regiões ósseas atingidas, o tipo de complicação que determinou o enquadramento e exames subsidiários que comprovem o diagnóstico.
            <br />
            <strong>14.3.1. São considerados exames subsidiários elucidativos e indispensáveis:</strong>
            <br />
            a) exame radiológico; b) dosagem da fosfatase alcalina; c) dosagem da hidroxiprolina urinária nas 24 horas; d) tomografia computadorizada e, preferencialmente, ressonância nuclear magnética com biópsia nos casos suspeitos; e e) cintilografia óssea.
          </p>
        </div>
      </section>

      {/* 6. Hanseníase */}
      <section id="doenca-hanseniase" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">6</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Hanseníase</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">15. Conceituação</p>
          <p>
            15.1. A hanseníase é uma doença infecto-contagiosa de notificação compulsória, causada pelo Mycobacterium leprae (bacilo de Hansen), de curso crônico, podendo apresentar surtos reacionais intercorrentes. Apresenta alta infectividade e baixa patogenicidade, sendo passível de tratamento e cura; a alta por cura é dada após a administração do número de doses preconizado pelo esquema terapêutico, dentro do prazo recomendado. O diagnóstico é essencialmente clínico e epidemiológico, realizado por meio da análise da história e condições de vida do paciente e do exame dermato-neurológico, para identificar lesões ou áreas de pele com alteração de sensibilidade e/ou comprometimento de nervos periféricos (sensitivo motor e/ou autonômico).
          </p>
          <p>
            15.2. Fica proscrita a sinonímia "lepra" nos documentos oficiais dos Serviços de Saúde do MD.
          </p>
          <p>
            15.3. Critérios clínicos de atividade da doença:
            <br />
            a) presença de eritema e/ou infiltração nas lesões; b) aparecimento de novas lesões; c) aumento de lesões preexistentes; d) espessamento e/ou parestesia de nervos ou troncos nervosos previamente normais; e) paresia ou paralisia de músculos não afetados anteriormente; e f) surgimento de novas áreas anestésicas.
          </p>
          <p>
            15.4. Lesões reacionais:
            <br />
            a) reação de Mitsuda positiva; b) o exame bacterioscópico pode ser positivo; c) o exame histológico revela o granuloma tuberculoide com edema inter e intracelular; e d) o exame clínico mostra placas eritemato-violáceas edematosas, escamosas, elevadas, com contornos nítidos, de localização palmoplantar, periorificial da face e occipital, ou tomam as extremidades dos membros a maneira de bota ou luva. As lesões geralmente são polimorfas e os tubérculos e nódulos eritemato-violáceos são sugestivos do diagnóstico.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">16. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP</p>
          <p>
            16.1. As Juntas de Inspeção de Saúde e os AMP farão o enquadramento em hanseníase dos inspecionados que:
            <br />
            a) permanecerem com sinais de atividade clínica após completarem o tratamento; b) tiverem a ocorrência de atividade clínica após a alta por cura, isto é, recidiva; c) manifestarem surtos reacionais frequentes durante o tratamento ou após a cura; e d) apresentarem sequelas invalidantes.
          </p>
        </div>
      </section>

      {/* 7. Doença de Parkinson */}
      <section id="doenca-parkinson" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">7</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Doença de Parkinson</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">17. Conceituação</p>
          <p>
            17.1. O mal de Parkinson (doença de Parkinson) é um quadro mórbido de etiologia ainda não estabelecida, resultante do comprometimento do sistema nervoso extrapiramidal e caracterizado pelos seguintes sinais:
            <br />
            <strong>a) tremor:</strong> hipercinesia, predominantemente postural, rítmica e não intencional, que diminui com a execução de movimentos voluntários e pode cessar com o relaxamento total;
            <br />
            <strong>b) rigidez muscular:</strong> sinal característico e eventualmente dominante, acompanha-se do exagero dos reflexos tónicos de postura e determina o aparecimento de movimentos em sucessão fracionária, conhecidos como "sinal da roda dentada" (Negro); e
            <br />
            <strong>c) oligocinesia:</strong> diminuição da atividade motora espontânea e consequente lentidão de movimentos.
            <br />
            17.1.1. A expressão doença de Parkinson, por sua maior abrangência e por melhor atender aos conceitos científicos mais modernos sobre a enfermidade, é preferida a de mal de Parkinson, embora esta denominação se mantenha nestas Normas, de conformidade com a Lei.
            <br />
            17.2. O Parkinsonismo Secundário, também chamado de síndrome de Parkinson, é consequente a lesões degenerativas infecciosas, parasitárias, tóxicas (inclusive medicamentos), endócrinas ou produzidas por traumatismo, choque elétrico e tumores intracranianos.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">18. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP</p>
          <p>
            18.1. As Juntas de Inspeção de Saúde e os AMP somente farão o enquadramento em Doença de Parkinson, os casos com diagnóstico confirmado, obedecidos os critérios preconizados pela Literatura Médica especializada.
            <br />
            18.2. As Juntas de Inspeção de Saúde e os AMP não deverão enquadrar como portadores de Mal de Parkinson os inspecionados com quadro de Parkinsonismo Secundário ao uso de medicamentos quando, pela supressão destes, houver regressão e desaparecimento do quadro clínico.
          </p>
        </div>
      </section>

      {/* 8. Nefropatias Graves */}
      <section id="doenca-nefropatia" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">8</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Nefropatias Graves</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">19. Conceituação</p>
          <p>
            São consideradas nefropatias graves as patologias de evolução aguda, subaguda ou crônica que, de modo irreversível, acarretam insuficiência renal, determinando incapacidade permanente para o trabalho e/ou risco de morte prematura ou que rapidamente evoluírem para o óbito.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">20. Classificação</p>
          <p>
            20.1. Para a avaliação da insuficiência renal crônica pelas alterações bioquímicas, deverá ser adotada a classificação abaixo, baseada na gravidade do distúrbio funcional do rim, medido pela filtração glomerular e dosagem de creatinina:
          </p>

          <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
            <table className="min-w-full text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
              <thead className="bg-gray-50 text-gray-700 font-bold">
                <tr>
                  <th className="p-2 border-r text-center">Estágio</th>
                  <th className="p-2 border-r text-center">Filtração Glomerular (ml/min)</th>
                  <th className="p-2 border-r text-center">Creatinina (mg/dl)</th>
                  <th className="p-2 text-center">Grau de I.R.C.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-2 border-r font-bold">0</td>
                  <td className="p-2 border-r">&gt; 90</td>
                  <td className="p-2 border-r">0,6 - 1,4</td>
                  <td className="p-2">Grupo de risco para D.R.C</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-2 border-r font-bold">1</td>
                  <td className="p-2 border-r">&gt; 90</td>
                  <td className="p-2 border-r">0,6 - 1,4</td>
                  <td className="p-2">Função renal normal em presença de lesão renal</td>
                </tr>
                <tr>
                  <td className="p-2 border-r font-bold">2</td>
                  <td className="p-2 border-r">60 - 89</td>
                  <td className="p-2 border-r">1,5 - 2,0</td>
                  <td className="p-2">I.R. leve ou funcional</td>
                </tr>
                <tr className="bg-gray-50 text-navy font-bold">
                  <td className="p-2 border-r">3</td>
                  <td className="p-2 border-r">30 - 59</td>
                  <td className="p-2 border-r">2,1 - 6,0</td>
                  <td className="p-2 bg-yellow-100">I.R moderada ou Laboratorial</td>
                </tr>
                <tr className="text-red-700 font-bold">
                  <td className="p-2 border-r">4</td>
                  <td className="p-2 border-r">15 - 29</td>
                  <td className="p-2 border-r">6,1 - 9,0</td>
                  <td className="p-2 bg-red-100">I.R grave ou clínica</td>
                </tr>
                <tr className="bg-gray-50 text-red-900 font-bold">
                  <td className="p-2 border-r">5</td>
                  <td className="p-2 border-r">&lt; 15</td>
                  <td className="p-2 border-r">&gt; 9,0</td>
                  <td className="p-2 bg-red-200">I.R. terminal ou pré-dialítica</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 italic">Fonte: Dr. João Egídio Romão Júnior - SBN - Hospital das Clínicas (FMUSP)</p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">21. Normas de Procedimento das Juntas de Saúde e dos AMP</p>
          <p>
            São consideradas nefropatias graves:
            <br />
            21.1. As nefropatias incluídas no Estágio 3, desde que o periciado apresente sintomas e sinais clínicos relevantes.
            <br />
            21.2. As nefropatias classificadas como insuficiência renal grave, Estágios 4 e 5.
            <br />
            21.3. As Juntas de inspeção de Saúde e os AMP deverão, ao exarar o laudo médico-pericial, identificar o tipo de nefropatia seguido da indicação da presença ou não da condição nefropatia grave.
          </p>
        </div>
      </section>

      {/* 9. Neoplasias Malignas */}
      <section id="doenca-neoplasia" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">9</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Neoplasias Malignas</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">22. Conceituação</p>
          <p>
            22.1. As neoplasias malignas compreendem um grupo de doenças caracterizadas pelo desenvolvimento incontrolado de células anormais que se disseminam, podendo acometer outros órgãos, a partir de um sítio anatômico primitivo.
            <br />
            22.2. O prognóstico da doença é influenciado pelos seguintes fatores: a) grau de diferenciação celular; b) grau de proliferação celular; c) grau de invasão vascular e linfática; d) estadiamento clínico e/ou cirúrgico; e) resposta à terapêutica específica; e f) estatísticas de morbidade e mortalidade de cada tipo de neoplasia.
            <br />
            22.3. O sistema de estadiamento das neoplasias malignas deverá ser o TNM, podendo ser utilizada outra classificação em casos específicos, não contemplados no TNM.
            <br />
            22.4. São consideradas neoplasias malignas as relacionadas na Classificação Internacional de Doenças (CID).
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">23. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP</p>
          <p>
            23.1. As Juntas de Inspeção de Saúde e os AMP deverão, ao firmar os laudos de neoplasia maligna:
            <br />
            a) estar fundamentadas em laudo histopatológico;
            <br />
            b) citar o tipo histopatológico da neoplasia;
            <br />
            c) citar a sua localização;
            <br />
            d) citar a presença ou não de metástase;
            <br />
            e) citar o estadiamento clínico; e
            <br />
            f) acrescentar a expressão "neoplasia maligna", para fim de enquadramento legal.
          </p>
          <p>
            24. Os inspecionados serão considerados portadores de neoplasia maligna mesmo que sua doença seja, na ocasião da inspeção, susceptível de tratamento cirúrgico, radioterápico e/ou quimioterápico ou que o seu estadiamento clínico indicar bom prognóstico.
            <br />
            24.1. Nos casos de neoplasias malignas sem possibilidade terapêutica ou cujo curso clínico ou tratamento impossibilitem o exercício de atividades laborais em caráter definitivo, ao final do laudo deverá constar que a sua validade é indeterminada.
            <br />
            24.2. Decorridos cinco anos a contar da data do final do tratamento da neoplasia maligna, tendo sido o inspecionado submetido a tratamento específico com intenção curativa, na ausência de comprovação de doença em atividade, recidiva ou metástase, as Juntas de Inspeção de Saúde e os AMP não firmarão laudo médico pericial com enquadramento em "Neoplasia Maligna".
            <br />
            24.3. A não exigência de comprovação de contemporaneidade de sintomas, nos casos das moléstias graves, passíveis de controle, não suprime a necessidade de avaliação médico pericial pormenorizada, incluindo a documentação médica comprobatória do diagnóstico. Nos casos das neoplasias malignas, em que os inspecionados já tenham alcançado critérios de controle de doença, a forma de conclusão a ser adotada no laudo é a seguinte: "Tem diagnóstico histopatológico da neoplasia maligna (e localização), classificação pela CID 10, (Neoplasia Maligna), a partir de (dd/mm/aaaa)". Neste caso, as juntas de Inspeção de Saúde e os AMP deverão enquadrar o periciado como "história de neoplasia maligna" e o benefício de isenção de imposto de renda deverá ser mantido.
          </p>
        </div>
      </section>

      {/* 10. Paralisia Irreversível e Incapacitante */}
      <section id="doenca-paralisia" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">10</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Paralisia Irreversível e Incapacitante</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">25. Conceituação</p>
          <p>
            25.1. Entende-se por paralisia a incapacidade de contração voluntária de um músculo ou grupo de músculos, resultante de uma lesão orgânica de natureza destrutiva ou degenerativa, a qual implica interrupção de uma das vias motoras, em qualquer ponto, desde o córtex cerebral até a própria fibra muscular, pela lesão do neurônio motor central ou periférico.
            <br />
            25.2. A abolição das funções sensoriais, na ausência de lesões orgânicas das vias nervosas, caracteriza a paralisia funcional.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">26. Classificação</p>
          <p>
            26.1. As paralisias, considerando-se a localização e a extensão das lesões, classificam-se em:
            <br />
            <strong>a) paralisia isolada ou periférica:</strong> quando é atingido um músculo ou um grupo de músculos;
            <br />
            <strong>b) monoplegia:</strong> quando são atingidos todos os músculos de um só membro;
            <br />
            <strong>c) hemiplegia:</strong> quando são atingidos os membros superiores e inferiores do mesmo lado, com ou sem paralisia facial homolateral;
            <br />
            <strong>d) paraplegia ou diplegia:</strong> quando são atingidos os membros superiores ou os inferiores, simultaneamente;
            <br />
            <strong>e) triplegia:</strong> quando resulta da paralisia de três membros; e
            <br />
            <strong>f) tetraplegia:</strong> quando são atingidos os membros superiores e inferiores.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">27. Normas de Procedimento das Juntas de Inspeção de Saúde e os AMP</p>
          <p>
            27.1. A paralisia será considerada irreversível e incapacitante quando, esgotados os recursos terapêuticos da medicina especializada e os prazos necessários a recuperação motora, permanecerem distúrbios graves e extensos que afetem a mobilidade, a sensibilidade e a troficidade, observados os conceitos relevantes constantes do Capítulo II destas Normas.
            <br />
            27.2. São consideradas paralisias as lesões osteomúsculoarticulares e vasculares graves e crônicas, das quais resultem alterações extensas e definitivas das funções nervosas, da mobilidade e da troficidade, esgotados os recursos terapêuticos da medicina especializada e os prazos necessários a recuperação.
            <br />
            27.3. São consideradas paralisias as paresias das quais resultem alterações extensas das funções nervosas e da motilidade, esgotados os recursos terapêuticos da medicina especializada e os prazos necessários a recuperação, devendo os laudos das inspeções de saúde citar entre parênteses, o termo "Paralisia Irreversível e Incapacitante", de acordo com a classificação prevista no item 26 destas Normas.
            <br />
            27.4. São consideradas paralisias as ausências de membros, segmentos de membros ou de feixes musculares, resultantes de amputação ou ressecções cirúrgicas que resultem em distúrbios graves e extensos da mobilidade de um ou mais membros, devendo os laudos das inspeções de saúde citar o termo "Paralisia Irreversível e Incapacitante", de acordo com a classificação prevista no item 26 destas Normas.
            <br />
            27.5. Não se equiparam às paralisias as lesões osteo-músculo-articulares envolvendo a coluna vertebral.
            <br />
            27.6. A paralisia de um músculo ou grupo de músculos não apresenta, por si só, motivo para enquadramento em Paralisia irreversível e incapacitante, pois muitas vezes não configura incapacidade. Por definição, é preciso que, depois de esgotadas todas as medidas terapêuticas disponíveis, seja considerada irreversível e incapacite o inspecionado para o exercício das atividades inerentes ao cargo ou das atividades rotineiras quando se tratar de inspecionados inativos ou dependentes.
            <br />
            27.7. As Juntas de Inspeção de Saúde e os AMP, após enunciar o diagnóstico, deverão declarar, entre parênteses, a expressão "Paralisia Irreversível e Incapacitante".
          </p>
        </div>
      </section>

      {/* 11. Pênfigos */}
      <section id="doenca-penfigo" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-heading">11</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Pênfigos</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">28. Conceituação</p>
          <p>
            28.1. Os pênfigos compreendem um grupo de dermatoses de curso crônico não contagiosas, de etiologia ainda desconhecida, cujas características principais são:
            <br />
            a) erupção bolhosa; b) acantólise; e c) auto-imunidade.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">29. Classificação</p>
          <p>
            29.1. Os pênfigos, por suas características clínicas e histológicas, classificam-se em:
            <br />
            <strong>a) pênfigo vulgar:</strong> dermatose bolhosa, crônica, caracterizada pela presença de volumosas bolhas intra-epidérmicas, intramalpighianas, acantolíticas, suprabasais, disseminadas na pele e mucosas; acompanhada de manifestações orgânicas gerais graves;
            <br />
            <strong>b) pênfigo foliáceo:</strong> dermatose de caráter endêmico, mais comum em jovens, evolução crônica, com progressivo agravamento do estado geral devido à espoliação proteica que pode levar à caquexia e morte. Caracterizada pela presença de manchas eritematosas na pele, sobre as quais se desenvolvem bolhas flácidas, intramalpighianas altas, com células acantolíticas. As lesões tendem para a descamação, com ardor local, febre irregular e exagerada sensibilidade ao frio. As lesões das mucosas não são comuns. Têm-se registrado casos de evolução benigna com regressão e cura da doença;
            <br />
            <strong>c) pênfigo vegetante:</strong> dermatose bolhosa na qual as bolhas frequentemente se rompem e exsudam um líquido de odor fétido. Após o rompimento das bolhas há o aparecimento de formações vegetantes papilomatosas, com maceração da pele ao calor ou à umidade ao nível das grandes dobras cutâneas. Formação de microabscessos intra-epiteliais e presença de acantólise e hiperceratose ao exame histológico. De grande malignidade e evolução rápida, apresenta alto índice de mortalidade quando não tratado; e
            <br />
            <strong>d) pênfigo eritematoso síndrome de Senear-Usher:</strong> dermatose escamosa com lesões eritematosas ou bolhosas na face e regiões pré-esternal e médio-dorsal. Não ataca as mucosas. De evolução benigna, não compromete o estado geral dos indivíduos. As lesões, pelo aspecto em vespertílio, lembram o lúpus eritematoso discoide e as bolhas podem, como no pênfigo foliáceo, localizar-se nas regiões pré-esternal e médio-dorsal.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">30. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP</p>
          <p>
            30.1. As Juntas de Inspeção de Saúde e os AMP somente poderão concluir os seus laudos definitivos quando o diagnóstico clínico de pênfigo for confirmado por meio de exame histológico (citodiagnóstico de Tzanck), de imunofluorescência direta e outros exames que a medicina especializada indicar.
            <br />
            30.2. As Juntas de Inspeção de Saúde e os AMP não deverão enquadrar como pênfigo os casos provocados por fármacos.
          </p>
        </div>
      </section>

      {/* 12. Síndrome da Imunodeficiência Adquirida (SIDA/Aids) */}
      <section id="doenca-aids" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">12</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Síndrome da Imunodeficiência Adquirida (SIDA/Aids)</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">31. Conceituação</p>
          <p>
            31.1. A Síndrome da Imunodeficiência Adquirida (SIDA/Aids) é a manifestação mais grave da infecção pelo vírus da imunodeficiência humana (HIV), caracterizando-se por apresentar uma severa imunodeficiência, manifesta no aparecimento de doenças oportunistas.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">32. Classificação</p>
          <p>
            32.1. A infecção pelo HIV pode ser classificada de acordo com as manifestações clínicas e a contagem de linfócitos CD4.
            <br />
            32.2. Quanto às manifestações clínicas, os indivíduos pertencem às seguintes categorias:
            <br />
            <strong>Category "A":</strong> 1) infecção assintomática; 2) linfadenopatia generalizada persistente; 3) infecção aguda (síndrome de mononucleose com sorologia negativa inicial).
            <br />
            <strong>Category "B":</strong> indivíduos com sorologia positiva para o HIV, sintomáticos, com as seguintes condições clínicas: angiomatose bacilar; candidíase orofaríngea; candidíase vulvovaginal persistente; sintomas constitucionais (febre &gt; 38,5°C ou diarreia crônica).
            <br />
            <strong>Category "C" (Definição de SIDA/Aids clínica):</strong> indivíduos que apresentem infecções oportunistas ou neoplasias: candidíase esofágica/traqueal; criptococose extrapulmonar; câncer cervical uterino; retinite ou hepatite por citomegalovírus; herpes simples com mais de um mês; histoplasmose disseminada; isosporíase crônica; micobacteriose atípica; tuberculose pulmonar/extrapulmonar; pneumonia por P. carinii; pneumonia recorrente; bacteremia recorrente por salmonella; toxoplasmose cerebral; leucoencefalopatia multifocal progressiva; criptosporidíase intestinal; sarcoma de Kaposi; linfoma de Burkitt; encefalopatia ou síndrome respiratória consumptiva pelo HIV.
          </p>
          <p>
            32.3. Quanto à contagem de linfócitos CD4 os indivíduos pertencem aos seguintes grupos:
            <br />
            a) Grupo I: indivíduos com CD4 &gt;= 500/mm³
            <br />
            b) Grupo II: indivíduos com CD4 entre 200 e 499/mm³
            <br />
            c) Grupo III: indivíduos com CD4 menor que 200/mm³
          </p>
          <p className="font-semibold text-center mt-2">Cruzamento Clínico/Laboratorial. Classes A3, B3, C1, C2, C3 são considerados SIDA/AIDS:</p>
          <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm max-w-[200px] mx-auto">
            <table className="min-w-full text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
              <thead className="bg-gray-50 text-gray-700 font-bold">
                <tr>
                  <th className="p-1 border-r">CD4</th>
                  <th className="p-1 border-r">Assint./LPG (A)</th>
                  <th className="p-1 border-r">Sintom. não C (B)</th>
                  <th className="p-1">Oportunistas (C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="p-1 border-r bg-gray-50 font-bold">&gt;=500 (1)</td><td className="p-1 border-r">A1</td><td className="p-1 border-r">B1</td><td className="p-1 bg-red-100 font-bold text-red-700">C1</td></tr>
                <tr><td className="p-1 border-r bg-gray-50 font-bold">200-499 (2)</td><td className="p-1 border-r">A2</td><td className="p-1 border-r">B2</td><td className="p-1 bg-red-100 font-bold text-red-700">C2</td></tr>
                <tr className="bg-red-50 font-bold text-red-800"><td className="p-1 border-r bg-red-100">&lt;200 (3)</td><td className="p-1 border-r">A3</td><td className="p-1 border-r">B3</td><td className="p-1 bg-red-200">C3</td></tr>
              </tbody>
            </table>
          </div>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">33. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP</p>
          <p>
            33.1. Os portadores assintomáticos ou em fase de linfoadenopatia persistente generalizada (LPG), em princípio e a critério de cada Junta de Inspeção de Saúde ou AMP, poderão ser considerados aptos para o Serviço Ativo devendo, porém, ser submetidos a acompanhamento médico especializado e a novas inspeções de saúde em períodos não superiores a 12 (doze) meses.
            <br />
            33.2. Os inspecionandos classificados nas Categorias A2, B1 e B2, se julgada de risco a sua atividade militar para o agravamento da sua condição de saúde, deverão ser considerados incapazes temporariamente para o Serviço Ativo e reavaliados em períodos não superiores a 180 (cento e oitenta) dias.
            <br />
            33.3. Se não julgada de risco, poderão ser considerados aptos para o Serviço Ativo, devendo ser submetidos a acompanhamento médico especializado e a novas inspeções de saúde em períodos não superiores a 180 dias.
            <br />
            33.4. Inspecionados a quem se refere o item 33.3, que não apresentem remissão clínica após 90 dias de tratamento especializado, serão considerados incapazes temporariamente para o Serviço Ativo.
            <br />
            33.5. Serão considerados incapazes definitivamente para o Serviço Ativo e inválidos os inspecionandos classificados nas Categorias A3, B3 e C, levando-se em consideração o quadro clínico e laboratorial, e que não reúnam condições mínimas laborativas.
          </p>
        </div>
      </section>

      {/* 13. Tuberculose Ativa */}
      <section id="doenca-tuberculose" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-heading">13</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Tuberculose Ativa</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">34. Conceituação</p>
          <p>
            34.1. A tuberculose é uma doença infectocontagiosa causada pelo Mycobacterium tuberculosis, de evolução aguda ou crônica, de notificação compulsória. Pode acometer qualquer órgão, tendo, no entanto, nítida predileção pelo pulmão.
          </p>
          <p>
            35.1. As lesões tuberculosas são classificadas em: a) ativas; b) inativas; c) de atividade indeterminada; e d) curadas.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">36. Avaliação do estado evolutivo das lesões tuberculosas</p>
          <p>
            36.1. As lesões ativas apresentam as seguintes características:
            <br />
            a) bacteriológicas: presença do M. tuberculosis ao exame direto e/ou cultura;
            <br />
            b) radiológicas: caráter infiltrativo-inflamatório, instabilidade das infiltrações nas séries radiográficas de tórax, cavidades com paredes espessas ou derrame pleural associado;
            <br />
            c) imunológicas: evidência de viragem tuberculínica recente ou PPD reator forte recente;
            <br />
            d) clínicas: sintomas compatíveis ativos.
          </p>
          <p>
            36.2. As lesões inativas têm as seguintes características: ausência de BAAR na baciloscopia durante pelo menos 3 meses, séries estáveis de radiografia sem infiltrações ou cavidades ativas, remissão completa dos sintomas clínicos por pelo menos 3 meses.
            <br />
            36.3. As de atividade indeterminada são aquelas temporariamente sem elementos de avaliação conclusivos.
            <br />
            36.4. Consideram-se curadas quando apresentarem características de inatividade residual após tratamento regular de pelo menos 6 meses.
          </p>

          <p className="font-bold text-navy uppercase text-[11px] mt-4 mb-2">37. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP</p>
          <p>
            37.1. Reavaliar ao término do tratamento baseado em observações clínicas e exames.
            <br />
            37.2. O parecer definitivo para lesões inativas residualmente ficará condicionado a um período de observação mínimo de seis meses após término de tratamento.
            <br />
            37.3. Portadores com lesões ativas após dois anos de efetivo tratamento serão enquadrados em tuberculose ativa definitiva.
            <br />
            37.4. Sequelas pulmonares severas que induzam "cor pulmonale" ou insuficiência congestiva grave terão enquadramento análogo à cardiopatia grave.
            <br />
            37.7. As sequelas das lesões tuberculosas, quando irreversíveis e causadoras de invalidez, terão enquadramento legal análogo ao dispensado à tuberculose ativa, pois que dela diretamente decorrem.
          </p>
        </div>
      </section>

      {/* 16. Esclerose Múltipla */}
      <section id="doenca-esclerose" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-heading">16</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Esclerose Múltipla</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">51. Conceituação</p>
          <p>
            51.1. É uma doença desmielinizante do sistema nervoso central, progressiva, caracterizada por placas disseminadas de desmielinização no cérebro e na medula espinhal, resultando em múltiplos e variados sintomas e sinais, geralmente com remissões e exacerbações. Sua causa é desconhecida, mas há suspeitas de uma anormalidade imunológica, com poucos indícios de um mecanismo específico.
          </p>
          <p>
            <strong>51.1. Manifestações clínicas:</strong> De início insidioso, a doença se caracteriza por queixas e achados de disfunção do sistema nervoso central, com remissões e exacerbações frequentes. Os sintomas geralmente se iniciam com dormência e fraqueza nas pernas, mãos, face, distúrbios visuais, distúrbio na marcha, dificuldade de controle vesical, vertigens, apatia, falta de julgamento, depressão, choro e riso sem razão aparente, manias e dificuldade para falar. As alterações motoras são marcantes: marcha trêmula, tremores nas mãos e na cabeça; fraqueza muscular. As lesões cerebrais podem resultar em hemiplegia. Atrofia muscular e espasmos musculares dolorosos ocorrem tardiamente. As alterações sensitivas ocorrem principalmente nas mãos e nas pernas com perda da sensibilidade cutânea. Em relação às alterações autonômicas, há dificuldade miccional, incontinência retal e impotência sexual.
          </p>
          <p>
            <strong>51.2. Diagnóstico:</strong> É indireto, por dedução e baseado em características clínicas e laboratoriais. O diagnóstico diferencial deve ser feito com siringomielia, esclerose lateral amiotrófica, sífilis, artrite da coluna cervical, tumores do cérebro, ataxias hereditárias e malformações do cérebro e da medula.
          </p>
          <p>
            <strong>51.3. Exames complementares:</strong> a) exame do líquido cefalorraquidiano: anormal em até 55% dos casos; b) ressonância magnética: é a técnica mais sensível, podendo mostrar as placas de desmielinização ativa; e c) potencial evocado: analisa as respostas elétricas e, geralmente, estão alteradas.
          </p>
          <p>
            <strong>51.4. Normas de procedimento dos AMP:</strong> As Juntas de Inspeção de Saúde e os AMP farão o enquadramento por incapacidade definitiva, por esclerose múltipla, nos casos de curso progressivo, com comprometimento motor ou outros distúrbios orgânicos que caracterizem a incapacidade para o exercício de suas atividades laborais. Quando determinar a incapacidade definitiva para todo e qualquer trabalho será enquadrado como inválido.
          </p>
        </div>
      </section>

      {/* 17. Fibrose Cística */}
      <section id="doenca-fibrose" className="scroll-mt-16 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-heading">17</div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Fibrose Cística (Mucoviscidose)</h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600 font-body">
          <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">52. Conceituação</p>
          <p>
            52.1. É uma doença genética autossômica recessiva, decorrente da ausência, deficiência da produção ou defeito na função de um polipeptídeo regulador da condutância transmembrana (CFTR), que funciona na regulação da permeabilidade do íon cloro através de células de órgãos epiteliais.
          </p>
          <p>
            <strong>52.1. As principais manifestações clínicas são:</strong>
            <br />
            <strong>a) as respiratórias:</strong> tosse persistente, principalmente à noite; pneumonias de repetição, dispneia, hemoptise e sibilância sem resposta aos broncodilatadores; e
            <br />
            <strong>b) digestivas:</strong> obstrução ileal, insuficiência pancreática, má-absorção intestinal e cirrose biliar.
            <br />
            52.2. A doença pulmonar evolui para cor pulmonale em praticamente 100% dos pacientes fibrocísticos. Nas fases avançadas, os pacientes apresentam tórax em barril, expectoração purulenta, principalmente matinal, frequência respiratória (FR) aumentada, dificuldade expiratória, cianose periungueal e baqueteamento digital acentuado.
          </p>
          <p>
            <strong>52.3. Normas de procedimento dos AMP:</strong>
            <br />
            52.3.1. As Juntas de Inspeção de Saúde e os AMP somente farão o enquadramento legal dos portadores de fibrose cística para a isenção do recolhimento do imposto de renda.
            <br />
            52.3.2. As Juntas de Inspeção de Saúde e os AMP, além dos elementos clínicos de que disponham e dos pareceres da medicina especializada, deverão ter os seguintes exames subsidiários elucidativos:
            <br />
            <strong>a) teste do suor:</strong> <span className="bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-250">confirmado quando a concentração de cloretos for superior a 60 mEq/L</span>. Quando os valores estiverem entre 40 e 60 mEq/L, o exame deve ser repetido, principalmente na presença de sinais e sintomas sugestivos de fibrose cística;
            <br />
            b) radiografia de campos pleuro-pulmonares; c) cultura do escarro (geralmente positiva para Pseudomonas aeruginosa); d) ultrassonografia abdominal; e) dosagem das enzimas hepáticas; e f) dosagem de enzimas pancreáticas.
            <br />
            52.4. Pela gravidade e prognóstico reservado da doença, o diagnóstico somente poderá ser confirmado com dois testes do suor positivos, realizados em momentos diferentes.
          </p>
        </div>
      </section>

      {/* CAPÍTULO IV — DAS DISPOSIÇÕES FINAIS */}
      <section className="scroll-mt-16 pt-6 border-t border-gray-200">
        <h3 className="text-xs font-bold text-navy uppercase mb-3">
          CAPÍTULO IV — DAS DISPOSIÇÕES FINAIS
        </h3>
        <div className="space-y-3 text-xs text-gray-500 text-justify leading-relaxed">
          <p>
            <strong>53.</strong> As Forças Armadas poderão sugerir ao Ministério da Defesa, a qualquer tempo, as alterações que julgarem pertinentes para manter o valor atual e prático destas Normas e facilitar a sua aplicação.
          </p>
          <p>
            <strong>53.1</strong> As propostas apresentadas serão examinadas pelos Serviços de Saúde da Marinha, do Exército e da Aeronáutica e, obtido o consenso, serão introduzidas nesta publicação mediante portaria do Ministro de Estado da Defesa, de acordo com as disposições legais em vigor.
          </p>
          <p>
            <strong>53.2.</strong> Estas Normas deverão ser revistas a cada cinco anos, a contar da data de sua publicação no Diário Oficial da União.
          </p>
          <p className="text-center italic text-[11px] mt-4 text-gray-400">
            "Este conteúdo não substitui o publicado na versão certificada"
          </p>
        </div>
      </section>

    </div>
  );
};
