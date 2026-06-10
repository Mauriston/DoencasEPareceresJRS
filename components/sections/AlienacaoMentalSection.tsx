import React from 'react';

export const AlienacaoMentalSection: React.FC = () => {
  return (
    <section id="doenca-alienacao" className="scroll-mt-16 pt-4 border-t border-gray-100">
      <h3 className="text-sm font-bold text-navy font-heading mb-3 uppercase flex items-center gap-2 border-b border-gray-100 pb-2">
        <span className="bg-navy text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">1</span>
        Alienação Mental
      </h3>
      
      <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600">
        <p className="font-bold text-navy uppercase text-[11px] mb-2">1. Conceituação</p>
        <p>
          1.1. Conceitua-se como alienação mental todo caso de distúrbio mental ou neuromental grave e persistente, no qual, esgotados os meios habituais de tratamento, haja alteração completa ou considerável da personalidade, comprometendo gravemente os juízos de valor e realidade, destruindo a autodeterminação e do pragmatismo e tornando o indivíduo total e permanentemente inválido para qualquer trabalho.
        </p>
        <p>
          1.2. As Juntas de Inspeção de Saúde e os AMP deverão "preservar-se contra uma exagerada admissão de irresponsabilidade" (N. Hungria) e identificar, no quadro clínico de alienação mental, os seguintes elementos:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>a) transtorno intelectual:</strong> atinge as funções mentais em conjunto e não apenas algumas delas;</li>
          <li><strong>b) falta de autoconsciência:</strong> o indivíduo ignora o caráter patológico de seu transtorno ou tem dele uma noção parcial ou descontínua;</li>
          <li><strong>c) inadaptabilidade:</strong> o transtorno mental é evidenciado pela desarmonia de conduta do indivíduo em relação às regras que disciplinam a vida normal em sociedade; e</li>
          <li><strong>d) ausência de utilidade:</strong> a perda da adaptabilidade redunda em prejuízo para o indivíduo e para a sociedade (Beca Soto).</li>
        </ul>
        
        <p>
          1.3. As Juntas de Inspeção de Saúde e os AMP poderão identificar alienação mental no curso de qualquer enfermidade psiquiátrica desde que, em seu estágio evolutivo, estejam satisfeitas todas as condições a seguir discriminadas:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 font-body">
          <li>a) seja enfermidade mental ou neuromental;</li>
          <li>b) seja grave persistente;</li>
          <li>c) seja refratária aos meios habituais de tratamento;</li>
          <li>d) provoque alteração completa ou considerável da personalidade;</li>
          <li>e) comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo;</li>
          <li>f) torne o indivíduo total e permanentemente inválido para qualquer trabalho; e</li>
          <li>g) haja um nexo sintomático entre o quadro psíquico e a personalidade do indivíduo.</li>
        </ul>

        <p>
          1.4. São considerados meios habituais de tratamento:
          <br />
          a) psicoterapia;
          <br />
          b) psicofarmacoterapia; e
          <br />
          c) terapêutica biológica (eletroconvulsoterapia, insulinoterapia, entre outros).
        </p>
        <p>
          1.5. Não é considerado meio de tratamento a utilização de psicofármacos em fase de experiência laboratorial.
        </p>

        <p className="font-bold text-navy uppercase text-[11px] mt-6 mb-2">2. Quadros clínicos que cursam com a alienação mental</p>
        <p>
          2.1. São necessariamente casos de alienação mental, satisfeitas as condições discriminadas nas alíneas "d", "e" e "f" do subitem 1.3:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>a) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">demência</span>;</li>
          <li>b) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">esquizofrenia</span>;</li>
          <li>c) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">transtorno delirante persistente</span>; e</li>
          <li>d) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">retardo mental profundo ou grave</span>.</li>
        </ul>

        <p>
          2.2. São excepcionalmente considerados casos de alienação:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-2">
          <li>
            a) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">transtorno de personalidade e do comportamento</span> devido à doença, lesão ou disfunção cerebral e que satisfizer as três condições a seguir citadas: seja grave, cronificado e resistente ao tratamento;
          </li>
          <li>
            b) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">retardo mental moderado</span> e que satisfizer as três condições a seguir citadas: atraso acentuado no desenvolvimento na infância, mínimo grau de independência quanto aos cuidados pessoais e mínimo grau de comunicação social e habilidade acadêmica;
          </li>
          <li>
            c) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">transtorno afetivo bipolar</span> grave com sintomas psicóticos ou <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">transtorno depressivo recorrente</span> grave com sintomas psicóticos e que satisfizerem as duas condições a seguir citadas: sejam cronificados e resistentes ao tratamento;
          </li>
          <li>
            d) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">transtornos mentais e comportamentais devido ao uso de substância psicoativa</span> e que satisfizerem as três condições a seguir citadas: presença de sintomas psicóticos, comprometimento grave e irreversível de personalidade e refratariedade ao tratamento;
          </li>
          <li>
            e) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">casos graves de epilepsia</span> e que satisfizerem a uma das condições a seguir citadas: predominância de sintomas de demenciação, resistência terapêutica ou elevada frequência de surtos psicóticos;
          </li>
          <li>
            f) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">autismo infantil ou atípico</span>; e
          </li>
          <li>
            g) <span className="bg-yellow-100 text-navy font-bold px-1.5 py-0.5 rounded">Síndrome de Rett</span>.
          </li>
        </ul>

        <p>
          2.3. Não são casos de alienação mental:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>a) síndrome amnésica orgânica;</li>
          <li>b) transtornos esquizotípico, esquizoafetivo ou psicótico agudo e transitório;</li>
          <li>c) transtornos afetivos, exceto os que satisfizerem as condições apresentadas no subitem 2.2;</li>
          <li>d) delirium;</li>
          <li>e) transtornos mentais e comportamentais devido ao uso de substância psicoativa, exceto os que satisfizerem as condições apresentadas no subitem 2.2;</li>
          <li>f) transtornos fóbico, ansioso, obsessivo-compulsivo, dissociativo, somatoforme, relacionado ao estresse ou de adaptação;</li>
          <li>g) síndromes comportamentais associadas a disfunções fisiológicas e a fatores físicos;</li>
          <li>h) transtornos da personalidade e do comportamento do adulto, exceto os devidos a doença, a lesão ou a disfunção cerebral e que satisfizerem as condições apresentadas no subitem 2.2;</li>
          <li>i) transtornos dos hábitos e dos impulsos, de preferência sexual ou associados ao desenvolvimento sexual e à sua orientação;</li>
          <li>j) retardo mental leve;</li>
          <li>k) transtornos do desenvolvimento psicológico, exceto autismo e Síndrome de Rett; e</li>
          <li>l) transtornos hipercinéticos ou de conduta.</li>
        </ul>
        <p>
          2.3.1. Os casos excepcionalmente graves e persistentes de estados psicopatológicos, citados nas letras "a", "b" e "c" do item 2.3. desta Legislação podem, entretanto, causar invalidez.
        </p>

        <p className="font-bold text-navy uppercase text-[11px] mt-6 mb-2">3. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP - Alienação Mental</p>
        <p>
          3.1. As Juntas de Inspeção de Saúde e os AMP, para maior clareza e definição imediata da situação do inspecionando, deverão fazer constar, obrigatoriamente, nos laudos de alienação mental os seguintes dados:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>a) diagnóstico da enfermidade básica, inclusive o diagnóstico numérico, de acordo com a Classificação Internacional de Doenças (CID), edição aprovada para uso nas Forças Armadas;</li>
          <li>b) estado da condição que confere a alienação mental nos casos discriminados no subitem 2.2; e</li>
          <li>c) expressão "alienação mental" entre parênteses.</li>
        </ul>
        <p>
          3.1.1. Se os laudos concluírem por alienação mental, deverão ser firmados em diagnósticos que não se confundam com os quadros de reações psíquicas isoladas, intercorrências psicorreativas e distúrbios orgânicos subjacentes, dos quais sejam simples epifenômenos.
        </p>
        <p>
          3.1.2. Para os casos discriminados no subitem 2.2., a simples menção do grau ou intensidade da enfermidade não esclarece a condição de "alienação mental" se não estiver mencionado o estado da condição que confere a alienação mental.
        </p>
        <p>
          3.1.3. Não poderão ser emitidos laudos de alienação mental com base em diagnóstico de enfermidade psiquiátrica aguda.
        </p>
        <p>
          3.1.4. Constituem exemplos de laudos:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1.5">
          <li>a) "Esquizofrenia Paranoide, F.20.0 CID 10 (É caso de Alienação Mental)";</li>
          <li>b) "Demência na doença de Alzheimer, FOO.1 CID 10 (É caso de Alienação mental)";</li>
          <li>c) "Transtorno depressivo recorrente grave com sintomas psicóticos - estado cronificado e resistente ao tratamento, F33.3 CID 10 (É caso de Alienação Mental)";</li>
          <li>d) "Transtorno mental e comportamental devido ao uso de álcool - estado psicótico, com comprometimento grave e irreversível de personalidade e refratariedade ao tratamento, F10.7 CID 10 (É caso de Alienação Mental)";</li>
          <li>e) "Retardo mental moderado - estado de atraso acentuado no desenvolvimento na infância, mínimo grau de independência quanto aos cuidados pessoais e mínimo grau de comunicação social e habilidade acadêmica, F71 CID 10 (É caso de Alienação Mental)";</li>
          <li>f) "Síndrome amnésica orgânica não induzida pelo álcool, FO4 CID 10 (Não é caso de Alienação Mental)";</li>
          <li>g) "Amnésia dissociativa, F44.0 CID 10 (Não é caso de Alienação Mental)"; e</li>
          <li>h) Transtorno de Personalidade Paranóica, F60.0 CID 10 (Não é caso de Alienação Mental).</li>
        </ul>
        <p>
          3.2. A alienação mental é condição que determina a invalidez.
        </p>
        <p>
          3.3. As Juntas de Inspeção de Saúde e os AMP, ao concluírem seus laudos com um diagnóstico subordinado ao conceito de alienação mental, deverão encaminhar o inspecionando ao órgão competente de sua Força Singular para condução da medida legal conveniente ao caso: medida de segurança, interdição, administração provisória e outros casos, na forma prevista em Lei.
        </p>
        <p>
          3.4. A medida legal superveniente à conclusão das Juntas de Inspeção de Saúde e dos AMP complementará, indispensavelmente, o processo administrativo de reforma (ou aposentadoria) do inspecionando portador de alienação mental.
        </p>
      </div>
    </section>
  );
};
