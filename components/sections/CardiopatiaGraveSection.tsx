import React from 'react';

export const CardiopatiaGraveSection: React.FC = () => {
  return (
    <section id="doenca-cardiopatia" className="scroll-mt-16 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-red-100 text-red-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">2</div>
        <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Cardiopatia Grave</h2>
      </div>

      <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600">
        <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">4. Conceituação</p>
        <p>
          4.1. Cardiopatia grave não é um diagnóstico clínico. A sua classificação se baseia nos aspectos de gravidade das cardiopatias, colocados em perspectiva com a capacidade de exercer as funções laborativas e suas relações como prognóstico de longo prazo e a sobrevivência do inspecionado.
        </p>
        <p>
          São consideradas cardiopatias graves, as doenças cardiovasculares agudas ou crônicas que acarretam, de modo irreversível, em maior ou menor período de tempo, a perda da capacidade física e funcional do coração, ultrapassando os limites de eficiência dos mecanismos de compensação, determinando incapacidade permanente para todo e qualquer trabalho ou o risco de morte prematura, não obstante o tratamento clínico ou cirúrgico adequado. Desta forma, deve-se ter em mente a afirmativa de Besser de que "É preciso não confundir gravidade de uma cardiopatia com Cardiopatia Grave, uma entidade médico pericial". Torna-se fundamental esta distinção, para que se possa efetivamente considerar um inspecionado portador de Cardiopatia Grave, levando-se em conta o conceito dinâmico de "reversibilidade" da evolução das cardiopatias, que podem em função da terapêutica instituída deixar de configurar uma condição de Cardiopatia Grave. Cabe ressaltar a influência benéfica dos avanços tecnológicos com o desenvolvimento de procedimentos intervencionistas diagnósticos e terapêuticos que alteram radicalmente a história natural da doença para melhor, modificando sua evolução e, consequentemente, a categoria de gravidade no momento da avaliação pericial. Esta deve ser pontual e baseada em evidências clínicas e em dados fornecidos por avaliações funcionais cardiológicas recentes.
        </p>
        <p>
          Por outro lado, nunca se deve concluir, de antemão, que pacientes submetidos a quaisquer das intervenções mencionadas têm a condição médico pericial de Cardiopatia Grave como erroneamente interpretado por muitos. Considera-se um inspecionado como portador de Cardiopatia Grave, quando existir uma doença cardíaca que acarrete o total e definitivo impedimento das condições laborativas, existindo, implicitamente, uma expectativa de vida reduzida, baseando-se o avaliador na documentação e no diagnóstico da cardiopatia, evitando-se as conclusões baseadas em impressões subjetivas ou alegações emanadas dos pacientes, sem o corroborativo complementar, tão sujeitas a erros ou interpretações enganosas.
        </p>
        
        <p>
          4.2. São consideradas cardiopatias graves:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>a) as cardiopatias agudas, rápidas em sua evolução para óbito ou que se tornam crônicas, caracterizadas por perda da capacidade física e funcional do coração;</li>
          <li>b) as cardiopatias crônicas, quando limitam, progressivamente, a capacidade física e funcional do coração (ultrapassando os limites de eficiência dos mecanismos de compensação), não obstante o tratamento clínico e/ou cirúrgico adequado;</li>
          <li>c) as cardiopatias agudas ou crônicas que apresentam dependência total de suporte inotrópico farmacológico ou mecânico; e</li>
          <li>d) a cardiopatia terminal: cardiopatia grave em que a expectativa de vida encontra-se extremamente reduzida, geralmente não responsiva à terapia farmacológica máxima ou a suporte hemodinâmico externo. Devido à severidade do quadro clínico ou à existência de comorbidades associadas, os portadores desta forma de cardiopatia não são candidatos à cirurgia para correção do distúrbio de base ou a transplante cardíaco.</li>
        </ul>

        <p>
          4.3. A limitação da capacidade física e funcional é definida, habitualmente, pela presença de uma ou mais das seguintes síndromes:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>a) insuficiência cardíaca;</li>
          <li>b) insuficiência coronariana;</li>
          <li>c) arritmias complexas;</li>
          <li>d) hipoxemia; e</li>
          <li>e) manifestações de baixo débito cerebral, secundárias à cardiopatia.</li>
        </ul>

        <p>
          4.4. A avaliação da capacidade funcional do coração permite a distribuição dos indivíduos em classes ou graus assim descritos, de acordo com a Classificação da New York Heart Association (NYHA):
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>a) Classe/Grau I:</strong> indivíduos portadores de doença cardíaca sem limitação da atividade física. A atividade física normal não provoca sintomas de fadiga acentuada, nem palpitações, nem dispneias, nem angina de peito;
          </li>
          <li>
            <strong>b) Classe/Grau II:</strong> indivíduos portadores de doença cardíaca com leve limitação da atividade física. Estes indivíduos sentem-se bem em repouso, porém os grandes esforços provocam fadiga, dispneia, palpitações ou angina de peito;
          </li>
          <li>
            <strong>c) Classe/Grau III:</strong> indivíduos portadores de doença cardíaca com nítida limitação da atividade física. Estes indivíduos sentem-se bem em repouso, embora acusem fadiga, dispneia, palpitações ou angina de peito quando efetuam pequenos esforços; e
          </li>
          <li>
            <strong>d) Classe/Grau IV:</strong> indivíduos portadores de doença cardíaca que os impossibilita de qualquer atividade física. Estes indivíduos, mesmo em repouso, apresentam dispneia, palpitações, fadiga ou angina de peito.
          </li>
        </ul>

        <p>
          4.4.1. Os meios de diagnóstico a serem empregados na avaliação da capacidade funcional do coração, são, entre outros:
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 list-disc pl-5 text-gray-500">
          <li>a) história clínica, com dados evolutivos da doença; história</li>
          <li>b) exame clínico;</li>
          <li>c) eletrocardiograma, em repouso;</li>
          <li>d) eletrocardiografia dinâmica (Holter);</li>
          <li>e) teste ergométrico;</li>
          <li>f) ecocardiograma, em repouso;</li>
          <li>g) ergoespirometria (vo2 pico &lt; 14ml/kg/min);</li>
          <li>h) teste de caminhada de 6 minutos;</li>
          <li>i) ecocardiograma associado a esforço ou procedimentos farmacológicos;</li>
          <li>j) estudo radiológico do tórax, usando de duas incidências;</li>
          <li>k) cintilografia miocárdica (Tálio, MIBI, Tecnécio);</li>
          <li>l) cintilografia miocárdica associada a Dipiridamol;</li>
          <li>m) cinecoronarioventriculografia;</li>
          <li>n) angiotomografia computadorizada;</li>
          <li>o) tomografia coronariana computadorizada;</li>
          <li>p) angio-ressonância magnética; e</li>
          <li>q) ressonância magnética cardíaca.</li>
        </ul>

        <p>
          4.4.2. Nos indivíduos portadores de doenças cardíacas não identificáveis com os meios de diagnóstico, citados no item 4.4.1. Desta Legislação, deverão ser utilizados outros exames e métodos complementares que a medicina especializada venha a exigir.
        </p>
        <p>
          4.5. Os achados patológicos isolados em exames complementares por si só, não são suficientes para o enquadramento legal de cardiopatia grave, devendo, para tanto, ser realizada a análise do conjunto dos exames complementares pertinentes a cada tipo de cardiopatia e observada a correlação anátomo-funcional que caracteriza uma doença cardíaca incapacitante.
        </p>
        <p>
          4.6. O quadro clínico, bem como os recursos complementares, com os sinais e sintomas que permitem estabelecer o diagnóstico de cardiopatia grave estão relacionados para as seguintes patologias cardíacas:
          <br />
          a) cardiopatia isquêmica; b) cardiopatia hipertensiva; c) miocardiopatias; d) arritmias cardíacas; e) "cor pulmonale" crônico; f) cardiopatias congênitas; g) valvopatias; h) pericardiopatias; e i) aortopatias.
        </p>

        <p className="font-bold text-navy uppercase text-[11px] mt-6 border-t border-gray-150 pt-4">5. Afecções descritas capazes de causar cardiopatia grave</p>
        <p>
          São descritas diversas afecções capazes de caracterizar cardiopatia grave, sendo, no entanto, necessário frisar a importância da observação do preconizado no item 4.4., devendo ser avaliados de forma criteriosa, a condição clínica do inspecionado, os exames complementares, os procedimentos terapêuticos instituídos, observando-se a correlação anatomofuncional e respeitando-se os prazos preconizados para reavaliação funcional. As manifestações clínicas relacionadas e as respectivas alterações dos exames complementares são indicativos de gravidade do ponto de vista clínico, servindo de subsídios para o enquadramento legal, não devendo ser consideradas individualmente.
          <br />
          Serão definidos os tópicos importantes a serem valorizados na definição de gravidade das diferentes cardiopatias.
          <br />
          As cardiopatias discriminadas abaixo podem manifestar-se de diversas formas clínicas e, de um modo geral, são avaliadas do ponto de vista pericial posteriormente aos eventos agudos, quando já foram instituídas medidas terapêuticas pertinentes.
        </p>

        {/* 5.1 Cardiopatia Isquêmica */}
        <div className="space-y-3 pl-2 border-l border-gray-200">
          <p className="font-bold text-[#050f41] text-[10.5px]">5.1. Cardiopatia Isquêmica</p>
          
          <p className="font-bold text-gray-500">5.1.1. Forma aguda (IAM ou Angina instável)</p>
          
          <p id="cardio-isquemica-aguda-ssst" className="font-bold text-[#050f41] scroll-mt-24">
            a) <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Síndromes coronarianas agudas sem supradesnível de ST</span>:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>1) baixo débito cardíaco;</li>
            <li>2) insuficiência cardíaca aguda;</li>
            <li>3) arritmia ventricular maligna; e</li>
            <li>4) disfunção ventricular mecânica;</li>
          </ul>
          <p className="text-gray-400 italic">
            Os tópicos acima em paciente já revascularizado, sem condições de submeter-se à revascularização cirúrgica ou percutânea.
          </p>

          <p id="cardio-isquemica-aguda-csst" className="font-bold text-[#050f41] scroll-mt-24 mt-2">
            b) <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Síndromes coronarianas agudas com supradesnível de ST ou BRE novo</span>:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>1) choque cardiogênico (Killip IV);</li>
            <li>2) insuficiência cardíaca aguda (Killip II ou III);</li>
            <li>3) arritmia ventricular maligna;</li>
            <li>4) complicação mecânica do IAM (ruptura de parede livre, CIV, disfunção de músculo papilar);</li>
            <li>5) IAM anterior extenso (V1-V6, D1, AVL);</li>
            <li>6) BAV II grau Mobitz II;</li>
            <li>7) BAVT ou distúrbio de condução interventricular;</li>
            <li>8) infarto perioperatório de cirurgia de revascularização do miocárdio; e</li>
            <li>9) infarto agudo do miocárdio em indivíduo já com infarto prévio de grande extensão ou com insuficiência cardíaca já estabelecida.</li>
          </ul>
          <p className="text-gray-500">
            Cabe ressaltar que, apesar de mencionadas as formas agudas das Cardiopatias Isquêmicas, a avaliação pericial dar-se-á posteriormente às medidas terapêuticas instituídas, a fim de viabilizar o enquadramento em Cardiopatia Grave, de acordo com os critérios definidos nesta Portaria, exceto nos casos em que haja rápida evolução para óbito.
          </p>

          <p id="cardio-isquemica-cronica" className="font-bold text-[#050f41] scroll-mt-24 mt-4">
            5.1.2. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Forma crônica (Angina estável)</span>
          </p>
          <p><strong>a) Quadro clínico:</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) angina classes III e IV da CCS (Canadian Cardiovascular Society), a despeito da otimização da terapêutica;</li>
            <li>2) clínica de insuficiência cardíaca associada à isquemia aguda nas formas crônicas, a presença de disfunção ventricular progressiva; e</li>
            <li>3) arritmias graves associadas a quadro anginoso, em especial as ventriculares (salvas de extrassístoles, taquicardia ventricular não sustentada ou sustentada), (associar dados do ECG e Holter).</li>
          </ul>
          <p><strong>b) Eletrocardiograma (repouso):</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) zona elétrica inativa (localização e magnitude);</li>
            <li>2) alterações isquêmicas de ST-T (segmento ST permanentemente elevado configurando possível aneurisma ventricular);</li>
            <li>3) alterações permanentes e significativas da repolarização ventricular;</li>
            <li>4) distúrbios da condução atrioventricular e intraventricular (QRS &gt;120ms);</li>
            <li>5) hipertrofia ventricular esquerda;</li>
            <li>6) fibrilação atrial crônica; e</li>
            <li>7) arritmias ventriculares complexas (associar com dados do Holter).</li>
          </ul>
          <p><strong>c) Radiografia do tórax:</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) cardiomegalia (com índice cardiotorácico superior a 0,5);</li>
            <li>2) congestão venocapilar pulmonar; e</li>
            <li>3) derrame pleural bilateral ou unilateral importante.</li>
          </ul>
          <p><strong>d) Teste ergométrico:</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) limitação da capacidade funcional (&lt;5 MET);</li>
            <li>2) angina em carga baixa (&lt;5MET);</li>
            <li>3) infradesnível do segmento ST: (a) precoce (carga baixa); (b) acentuado (&gt;3mm); (c) morfologia horizontal ou descendente; (d) múltiplas derivações; e (e) duração prolongada (&gt; 6 min no período de recuperação).</li>
            <li>4) supradesnível de ST, sobretudo em área não relacionada a infarto prévio;</li>
            <li>5) comportamento anormal da pressão arterial diastólica (variação de PAD &gt; 30mmHg);</li>
            <li>6) insuficiência cronotrópica (elevação insuficiente da frequência cardíaca, descartado o uso de betabloqueadores, bloqueadores de cálcio ou amiodarona);</li>
            <li>7) sinais de disfunção ventricular esquerda associada ao esforço; e</li>
            <li>8) arritmias ventriculares complexas, durante ou pós-esforço;</li>
          </ul>
          <p><strong>e) Cintilografia miocárdica:</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) defeitos de perfusão múltiplos ou áreas extensas;</li>
            <li>2) dilatação da cavidade ventricular esquerda ao esforço;</li>
            <li>3) hipercaptação pulmonar;</li>
            <li>4) fração de ejeção (FE) em repouso ou esforço 0,40;</li>
            <li>5) comportamento anormal da FE ao exercício (variação da FE &lt;5%); e</li>
            <li>6) motilidade parietal regional ou global anormal.</li>
          </ul>
          <p><strong>f) Cintilografia com dipiridamol:</strong> interpretação semelhante à do teste ergométrico.</p>
          
          <p><strong>g) Ecocardiograma (em repouso):</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) fração de ejeção 0,40 (valor específico para o método de Simpson);</li>
            <li>2) alterações segmentares significativas ou de vários segmentos que alteram a contratilidade ventricular global;</li>
            <li>3) anormalidades em dois segmentos da parede ventricular em repouso;</li>
            <li>4) dilatação das câmaras esquerdas, especialmente se associada à hipertrofia ventricular esquerda; e</li>
            <li>5) complicações associadas: disfunção dos músculos papilares, insuficiência mitral, comunicação interventricular, pseudo-aneurismas, aneurismas, trombos intracavitários.</li>
          </ul>
          
          <p><strong>h) Ecocardiograma de estresse:</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) aparecimento de alterações de contratilidade segmentar inexistentes no ecocardiograma em repouso;</li>
            <li>2) anormalidades em dois segmentos induzidas com doses baixas de dobutamina;</li>
            <li>3) resposta inotrópica inadequada ao uso de drogas cardioestimulantes;</li>
            <li>4) acentuação das alterações de contratilidade preexistentes; e</li>
            <li>5) comportamento anormal da FE ao exercício (variação da FE &lt; 5%).</li>
          </ul>
          
          <p><strong>i) Holter:</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) alterações isquêmicas dinâmicas (ST-T) com ou sem dor anginosa;</li>
            <li>2) isquemia miocárdica silenciosa;</li>
            <li>3) arritmias ventriculares complexas;</li>
            <li>4) fibrilação atrial ou de ramo induzidos pelo esforço físico.</li>
          </ul>
          
          <p><strong>j) Cinecoronarioventriculografia:</strong></p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>1) lesão de tronco de coronária esquerda 50%;</li>
            <li>2) lesões em três vasos, moderadas a importantes (70% em terço proximal ou médio);</li>
            <li>3) lesões em um ou dois vasos maiores que 70%, com grande massa miocárdica em risco;</li>
            <li>4) lesões ateromatosas extensas e difusas sem viabilidade de correção;</li>
            <li>5) fração de ejeção &lt; 0,40;</li>
            <li>6) hipertrofia e dilatação do VE;</li>
            <li>7) acinesia, hipocinesia e discinesia; e</li>
            <li>8) aneurisma de VE e complicações mecânicas.</li>
          </ul>
          
          <p><strong>k) Fatores de risco:</strong> 1) idade 70 anos; 2) hipertensão arterial sistêmica; 3) diabetes de longa evolução; 4) hipercolesterolemia familiar; 5) vasculopatia aterofibrótica importante.</p>
          <p><strong>l) Pós-infarto do miocárdio:</strong> 1) cintilografia com Tálio / PET / RNM com viabilidade de necrose confirmada; 2) disfunção de VE; 3) isquemia à distância; 4) arritmias ventriculares complexas; 5) idade avançada (70 anos); e 6) comorbidades associadas.</p>
        </div>

        {/* 5.2 Cardiopatia Hipertensiva */}
        <p id="cardio-hipertensiva" className="font-bold text-[#050f41] scroll-mt-24 mt-4">
          5.2. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Cardiopatia Hipertensiva</span>
        </p>
        <p>
          A definição de cardiopatia grave na doença hipertensiva não depende exclusivamente dos níveis tensionais, mas da concomitância de lesões em órgãos-alvo: rins, coração, cérebro, retina e artérias periféricas. Em alguns casos, um ou mais órgãos-alvo podem estar envolvidos, sem que o coração o esteja. Nesses casos, não se trata de cardiopatia hipertensiva, mas de hipertensão arterial complicada. O comprometimento do coração na hipertensão arterial é que identifica a cardiopatia hipertensiva. A gravidade clínica é caracterizada pela presença das seguintes condições:
          <br />
          a) hipertrofia ventricular esquerda detectada pelo ECG (com alterações da repolarização ventricular) ou ecocardiograma (com massa ventricular esquerda acima de 163 g/m em homens e 121 g/m em mulheres), que não regride com o tratamento;
          <br />
          b) disfunção ventricular esquerda sistólica, com fração de ejeção &lt; 0,40;
          <br />
          c) arritmias supraventriculares e ventriculares complexas relacionadas à hipertensão arterial; e
          <br />
          d) cardiopatia isquêmica grave associada.
        </p>
        <p>
          5.2.1. A Cardiopatia Hipertensiva é agravada, ainda, pelo comprometimento de outros órgãos alvo, como discriminado a seguir:
          <br />
          a) cérebro: isquemia cerebral transitória, acidente de origem central isquêmico ou hemorrágico;
          <br />
          b) rins: caracterizado por creatinina &gt;3mg/dl ou clearence de creatinina &lt;30 ml/min, presença de albuminúria e/ou sinais de insuficiência renal crônica (redução de tamanho, anemia, depletamento plaquetário);
          <br />
          c) artérias periféricas: aneurisma ou dissecção da aorta; e
          <br />
          d) retina: hemorragias, exudato e papiledema, especialmente quando não regridem com tratamento adequado.
        </p>

        {/* 5.3 Miocardiopatias */}
        <p className="font-bold text-gray-500 mt-4">5.3. Miocardiopatias</p>
        
        <p id="cardio-miocardio-hiper" className="font-bold text-[#050f41] scroll-mt-24">
          5.3.1. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Miocardiopatias Hipertróficas</span>
        </p>
        <p>
          A gravidade é caracterizada pela presença de um ou mais fatores abaixo:
          <br />
          a) individuo sintomático, especialmente com história de síncope, angina, insuficiência cardíaca e embolia sistêmica;
          <br />
          b) diagnóstico na infância (baixa idade);
          <br />
          c) hipertrofia moderada ou severa, com alterações isquêmicas de ST-T;
          <br />
          d) cardiomegalia;
          <br />
          e) disfunção ventricular esquerda sistólica (com FE&lt;40%);
          <br />
          f) fibrilação atrial;
          <br />
          g) síndrome de Wolff-Parkinson-White associada;
          <br />
          h) arritmias ventriculares complexas;
          <br />
          i) regurgitação mitral importante;
          <br />
          j) doença arterial coronariana grave associada;
          <br />
          k) forma obstrutiva com gradiente de via de saída 50 mmHg; e
          <br />
          l) perfil citogenético de alto risco.
        </p>

        <p id="cardio-miocardio-dilatada" className="font-bold text-[#050f41] scroll-mt-24 mt-2">
          5.3.2. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Miocardiopatias Dilatadas</span> (primárias ou secundárias) caracterizada por:
        </p>
        <p>
          a) história de fenômenos tromboembólicos sistêmicos; b) cardiomegalia importante; c) ritmo de galope (B3); d) insuficiência cardíaca (classes funcionais III e IV); e) fração de ejeção 0,40; f) fibrilação atrial; g) arritmias ventriculares complexas; h) distúrbios da condução intraventricular, com complexos QRS &gt; 120 ms; e i) presença de assincronia ventricular demonstrada por ecocardiograma com Doppler tissular.
        </p>

        <p id="cardio-miocardio-restritiva" className="font-bold text-[#050f41] scroll-mt-24 mt-2">
          5.3.3. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Miocardiopatias Restritivas</span> (endomiocardiofibrose, fibroelastose, miocardiopatias infiltrativas-amiloidose):
        </p>
        <p>
          A gravidade é caracterizada pela presença de um ou mais fatores abaixo:
          <br />
          a) história de fenômenos tromboembólicos; b) cardiomegalia acentuada; c) insuficiência cardíaca (classes funcionais III e IV); d) envolvimento do ventrículo direito; e) fibrose miocárdica acentuada; e f) regurgitação mitral e/ou tricúspide importante.
        </p>

        <p id="cardio-miocardio-chagas" className="font-bold text-[#050f41] scroll-mt-24 mt-2">
          5.3.4. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Cardiopatia Chagásica Crônica</span>
        </p>
        <p>
          A gravidade é caracterizada pela presença das seguintes condições:
          <br />
          a) história de síncope e/ou fenômenos tromboembólicos; b) cardiomegalia acentuada; c) insuficiência cardíaca (classes funcionais III e IV); d) fibrilação atrial; e) arritmias ventriculares complexas; f) bloqueio bi ou trifascicular sintomático; e g) bloqueio atrioventricular total.
        </p>

        {/* 5.4 Arritmias Cardíacas */}
        <p id="cardio-arritmias" className="font-bold text-[#050f41] scroll-mt-24 mt-4">
          5.4. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Arritmias Cardíacas</span>
        </p>
        <p>
          As arritmias graves, comprovadas eletrocardiograficamente, resistentes ao tratamento medicamentoso ou à ablação por radiofrequência nos casos indicados, ou cursando com episódios tromboembólicos, serão consideradas como Cardiopatia Grave, mesmo na ausência de outros sinais clínicos, radiológicos ou ecocardiográficos de alterações cardiovasculares.
          <br />
          Constituem características de maior gravidade:
          <br />
          a) disfunção do nó sinusal, sintomática, com comprovada correlação sintomas/arritmia, especialmente em presença de síndrome bradi-taquiarritmia;
          <br />
          b) bradiarritmias:
          <br />
          1) bloqueio atrioventricular (BAV) do 2° grau, tipo Mobitz II;
          <br />
          2) bloqueio atrioventricular total (BAVT): (a) sintomático; (b) com resposta cronotrópica inadequada ao esforço; (c) com cardiomegalia progressiva; e (d) com insuficiência cardíaca;
          <br />
          3) fibrilação atrial com baixa resposta ventricular; e
          <br />
          4) bloqueios de ramo (direito ou esquerdo), de alto grau.
          <br />
          c) taquiarritmias:
          <br />
          1) taquicardias ventriculares sintomáticas (claudicação cerebral e/ou comprometimento hemodinâmico) de qualquer etiologia; e
          <br />
          2) taquicardias supraventriculares sintomáticas (claudicação cerebral, comprometimento hemodinâmico, taquicardiomiopatia, fenômenos tromboembólicos) de qualquer etiologia e desencadeadas por qualquer mecanismo.
          <br />
          d) síndrome de preexcitação ventricular, com alto risco de morte súbita, determinado por estudos invasivos; e
          <br />
          e) portadores de marcapasso cardíaco definitivo, cuja capacidade funcional se mantém limitada pela cardiopatia de base.
        </p>

        {/* 5.5 Cor Pulmonale Crônico */}
        <p id="cardio-cor-pulmonale" className="font-bold text-[#050f41] scroll-mt-24 mt-4">
          5.5. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Cor Pulmonale Crônico</span>
        </p>
        <p>
          Constituem características de maior gravidade:
          <br />
          a) Quadro clínico:
          <br />
          1) manifestações de hipóxia cerebral e periférica (dedos em baqueta de tambor);
          <br />
          2) insuficiência cardíaca direita;
          <br />
          3) angina de peito classe III a IV da NYHA;
          <br />
          4) crises sincopais;
          <br />
          5) hiperfonese de segunda bulha no foco pulmonar;
          <br />
          6) galope ventricular direito (B3); e
          <br />
          7) gasometria com PO2 &lt; 60 mm Hg; PCO2 &gt; 50 mm Hg.
          <br />
          b) Eletrocardiograma: 1) sinais de sobrecarga importante de câmaras direitas.
          <br />
          c) Ecocardiograma: 1) hipertrofia ventricular direita com disfunção; 2) dilatação importante de átrio direito; 3) pressão sistólica em artéria pulmonar &gt; 60 mmHg; 4) insuficiência tricúspide importante; e 5) reversão de fluxo sistólico na sístole atrial.
          <br />
          d) Estudos hemodinâmicos: 1) dilatação de tronco da pulmonar; 2) dilatação do VD; 3) dilatação do AD; 4) pressão na pulmonar &gt; 60 mmHg; 5) pressão no AD &gt; 15 mmHg; 6) insuficiência pulmonar; e 7) insuficiência tricúspide.
        </p>

        {/* 5.6 Cardiopatias Congênitas */}
        <p id="cardio-congenitas" className="font-bold text-[#050f41] scroll-mt-24 mt-4">
          5.6. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Cardiopatias Congênitas</span>
        </p>
        <p>
          São consideradas graves as que apresentam:
          <br />
          a) Do ponto de vista clínico: 1) crises hipoxêmicas; 2) insuficiência cardíaca (classes funcionais III e IV); 3) hemoptises, pela presença de circulação colateral brônquica; e 4) arritmias de difícil controle e potencialmente malignas.
          <br />
          b) Do ponto de vista anatômico: 1) doença arterial pulmonar; 2) necrose miocárdica; 3) drenagem anômala infracardíaca; 4) hipotrofia de VD; 5) agenesia valvar; 6) hipoplasia de valvas; 7) atresia de coração esquerdo; 8) estenose mitral rígida; 9) transposição de grandes vasos; 10) ventrículo único; 11) ectopia cardíaca; 12) cardiopatias complexas.
          <br />
          c) Do ponto de vista anatomofuncional: 1) sobrecarga diastólica importante e insuficiência ventricular acentuada; 2) sobrecarga sistólica severa; 3) cardiopatias obstrutivas com severo gradiente; 4) formas corrigidas tardiamente com ascite e cirrose cardíaca.
        </p>

        {/* 5.7 Valvopatias */}
        <p id="cardio-valvopatias" className="font-bold text-[#050f41] scroll-mt-24 mt-4">
          5.7. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Valvopatias</span>
        </p>
        <p>
          <strong>5.7.1. Insuficiência Mitral:</strong>
          <br />
          a) Quadro clínico: 1) IC Classes III/IV; 2) frêmito palpável na ponta; 3) B1 hipofonética; 4) sopro holográfico &gt; 3+/6+; 5) B2 hipofonética; 6) desdobramento amplo de B2; 7) IM aguda associada a enfarte.
          <br />
          b) ECG: sobrecarga atrial/ventricular esquerda e FA.
          <br />
          c) Ecocardiograma: FE diminuída com diâmetros sistólicos severamente aumentados e padrão de regurgitação catastrófica.
          <br />
          d) Hemodinâmica: onda "v" tres vezes a média capilar pulmonar e fração de regurgitação &gt; 60%.
        </p>
        <p>
          <strong>5.7.2. Estenose Mitral:</strong> área valvar &lt; 1,0 cm², gradiente transvalvar médio &gt; 15 mmHg e PAP sistólica &gt; 50 mmHg com crises de edema agudo e hemoptise repetida.
        </p>
        <p>
          <strong>5.7.3. Insuficiência Aórtica:</strong> sopro de Austin-Flint, íctus hipercinético deslocado, queda na pressão diferencial com comportamento de fração de ejeção abaixo de 40%, além de dilatação importante de VE ao ecocardiograma.
        </p>
        <p>
          <strong>5.7.4. Estenose Aórtica:</strong> síncope aos esforços, angina severa, área valvar &lt; 0,75 cm², gradiente de pressão transvalvar médio &gt; 50 mmHg (e máximo &gt; 70 mmHg). O tratamento cirúrgico com implante de prótese deixa gradiente menor, e o enquadramento dependerá do grau de comprometimento funcional residual.
        </p>
        <p>
          <strong>5.7.5 e 5.7.6 Outras Valvopatias e Próteses:</strong> Prolapso com rotura de cordoalha, hemodiálise com hemólise induzida por prótese, disfunção protética severa refratária de alto gradiente.
        </p>

        {/* 5.8 e 5.9 Pericardio e Aorta */}
        <p id="cardio-pericardiopatias" className="font-bold text-[#050f41] scroll-mt-24 mt-4">
          5.8. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Pericardites e Aortopatias</span>
        </p>
        <p>
          As pericardites por tuberculose ou radiação com restrição de diástole (congestão sistêmica, pulso paradoxal, turgência jugular acentuada).
          <br />
          5.9 Aneurismas de aorta torácica ascendente &gt; 5.5 cm ou descendente &gt; 6 cm ou dissecções agudas catastróficas Tipo A ou B (Stanford).
        </p>

        {/* 6. Normas de Procedimento */}
        <p className="font-bold text-navy uppercase text-[11px] mt-6 border-t border-gray-150 pt-4">
          6. Normas de Procedimento das Juntas de Inspeção de Saúde e dos AMP - Cardiopatia Grave
        </p>
        <p>
          6.1. Os portadores de lesões cardíacas que se enquadrem nas especificações dos Graus III ou IV da avaliação de capacidade funcional descrita no item 4.4, observando-se o subitem 4.4.1, destas Normas, esgotados todos os recursos terapêuticos da medicina especializada, serão considerados como portadores de cardiopatia grave pelas Juntas de Inspeção de Saúde e pelos AMP.
        </p>
        <p>
          6.2. Os portadores de lesões cardíacas que se enquadrem nas especificações dos Graus I e II da avaliação de capacidade funcional descrita no item 4.4, observando-se o subitem 4.4.1, destas Normas, e que puderem desempenhar tarefas compatíveis com a eficiência funcional, ou que a avaliação funcional através de exames diagnósticos não evidenciar padrões de incapacidade em exercer atividades da vida diária, somente serão considerados portadores de cardiopatia grave, quando, fazendo uso de terapêutica específica apresentarem progressão da patologia, comprovada mediante exame clínico evolutivo e exames complementares. Para tal conclusão, as Juntas de Saúde deverão analisar os exames funcionais disponíveis e, quando considerarem o enquadramento, justificá-lo a partir de quando a condição médico pericial Cardiopatia Grave se configurou.
        </p>
        <p>
          6.3. A idade do indivíduo, sua atividade profissional e a incapacidade de reabilitação são parâmetros que devem ser considerados na avaliação dos portadores de lesões cardíacas, a que se refere o item 6.2 destas Normas.
        </p>
        <p>
          6.4. Os portadores de hipertensão arterial secundária e/ou lesões cardíacas passíveis de correção cirúrgica que, de acordo com expressa avaliação por serviços de Cardiologia e Cirurgia Cardíaca, tenham relação risco-benefício favorável à execução do procedimento, não serão inicialmente considerados portadores de Cardiopatia Grave e serão reavaliados após a cirurgia, decorridos os prazos previstos pela medicina especializada.
        </p>
        <p>
          6.5. Os laudos das Juntas de Inspeção de Saúde e dos AMP deverão conter, obrigatoriamente, os diagnósticos etiológicos e a afirmação ou negação de cardiopatia grave para o enquadramento legal da lesão incapacitante. Nas observações deverão ser lançadas as justificativas anatômicas e funcionais.
        </p>
        <p>
          6.5.1. Quando não for possível firmar-se o diagnóstico etiológico, este deverá ser citado como sendo desconhecido.
        </p>
        <p>
          6.6. Considera-se um indivíduo como portador de Cardiopatia Grave, quando existir uma doença cardíaca que acarrete o total e definitivo impedimento das condições laborativas ou de suas atividades rotineiras, existindo implicitamente, uma expectativa de vida diminuída, baseando-se o avaliador na documentação e no diagnóstico da cardiopatia, tendo sido esgotados todos os recursos terapêuticos disponíveis.
        </p>
      </div>
    </section>
  );
};
