// Ficheiro: components/ArtigoPericiaMedica.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ArtigoPericiaMedica: React.FC<Props> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="PERÍCIA MÉDICA" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-6 max-w-3xl mx-auto w-full flex-1 pb-32">
        {/* Bloco Título e Autores */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm text-center">
          <h1 className="text-xl font-heading font-bold text-[#050F41] mb-4 uppercase">Perícia Médica</h1>
          <div className="bg-gray-50 rounded-xl p-4 inline-block text-left text-xs text-gray-600 font-body space-y-1.5 border border-gray-100">
            <p><strong>Simone Moraes Stefani Nakano:</strong> Doutora em Cirurgia do Aparelho Digestivo pela USP. Membro da Câmara Técnica em Perícia do Cremego. Perita médica do INSS em Goiás.</p>
            <p><strong>Salomão Rodrigues Filho:</strong> Médico psiquiatra. Presidente do Cremego.</p>
            <p><strong>Iliam Cardoso dos Santos:</strong> Mestre em Otorrinolaringologia pela Faculdade de Medicina de Ribeirão Preto. Vice-presidente do Cremego.</p>
          </div>
        </div>

        {/* Secção: Introdução */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Introdução: Perícia médica e auditoria médica</h2>
          <p>
            É de início importante estabelecer a marcante diferença entre perícia médica e auditoria médica, quer sob o aspecto ético, quer sob os aspectos administrativo e jurídico, pois, para muitos profissionais médicos, elas se confundem. Auditoria e perícia médica são habilidades profissionais médicas específicas e distintas em suas técnicas de atuações. O Código de Ética Médica (CEM), em seus artigos 92, 93, 94 e 98, estabelece os limites éticos da atuação profissional do auditor médico e do perito médico.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Auditoria médica</h3>
          <p>
            A regulamentação da auditoria médica foi instituída pelo Decreto nº 1.651, de 28 de setembro de 1995, cumprindo o previsto no art. 16, inciso XIX da Lei nº 8.080, de 19 de setembro de 1990, e no art. 6º da Lei nº 8.689, de 27 de junho de 1993 as quais deram origem ao Sistema Nacional de Auditoria (SNA) junto ao Sistema Único de Saúde (SUS), em todos os níveis de governo, sem prejuízo da fiscalização exercida pelos órgãos de controle interno e externo. Conforme o Parecer-consulta CFM nº 11/99, <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">auditoria médica é o conjunto de atividades e ações de fiscalização, controle e avaliação do processo e procedimentos adotados</mark>, bem como o atendimento prestado, objetivando sua melhor adequação e qualidade, detectando e saneando eventuais distorções e propondo medidas para seu melhor desempenho e resolubilidade.
          </p>
          <p>
            Da legislação ética pertinente, depreendemos que o médico investido da função de auditor encontra-se sob a égide do preceituado no CEM, em especial o constante no Capítulo I, incisos VIII, XVI e XVIII, nos artigos 20, 23, 32, 50, 52, 57, 85, 94, 97 e 98 e na Resolução CFM nº 1.614/01, que estabelece as condutas a serem adotadas pelos auditores médicos e norteia as ações da auditoria médica.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Perícia médica</h3>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">Perícia é todo e qualquer ato propedeutico ou exame realizado por médico, com a finalidade de contribuir com as autoridades administrativas, policiais ou judiciárias na formação de juízos a que estão obrigadas.</mark> Para Alcântara (2006, p.3), perícia é a capacidade teórica e prática para empregar, com talento, determinado campo do conhecimento, alcançando sempre os mesmos resultados.
          </p>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">Perícia médica, em sentido amplo, é ato privativo do médico</mark>, podendo ser exercida pelo médico civil ou militar, desde que investido em função que lhe assegure a competência legal e administrativa para tal.
          </p>
          <p>
            O termo perícia provém do latim <em>peritia</em>. Segundo o Dicionário Aurélio, significa qualidade de perito; habilidade, destreza; vistoria ou exame de caráter técnico e especializado; conjunto de peritos (ou um só) que faz essa vistoria; conhecimento, ciência (FERREIRA, 1999). Na linguagem jurídica, significa a pesquisa, o exame, a verificação acerca da verdade ou da realidade de certos fatos; é um meio de prova admitida no Direito, sendo o perito, sob o compromisso da verdade, nomeado pela autoridade judiciária (ou administrativa) para ajudar a esclarecer um fato considerado relevante para o pronunciamento do órgão judicante (FIGUEIREDO, FREIRE, LANA, 2006).
          </p>
          <p>
            Perícia médica é uma sindicância de natureza médica que visa esclarecer fatos que interessam em um procedimento judicial ou administrativo. É um elemento de prova fundamental quando as normas (penais, civis, administrativas etc.) exigem conhecimentos médicos para serem executadas. Trata-se de ramo da Medicina Legal, em que os ensinamentos técnicos e científicos especiais são ministrados e suficientes para a emissão de pareceres.
          </p>
          
          <div className="border-l-4 border-navy pl-4 py-1 my-4 bg-gray-50/50 rounded-r-lg italic">
            "O ato pericial é ato médico. O perito-médico-legista subjuga-se aos preceitos legais que regem a matéria a ser examinada. O perito-médico-legista deve obediência aos preceitos éticos da medicina. O trabalho desempenhado pelo médico-legista é de natureza médico- pericial e não policial."
            <br/><span className="text-xs text-gray-500 mt-2 block">— Conselho Federal de Medicina (CFM), Parecer AJ nº 163/97</span>
          </div>

          <p>
            A finalidade da perícia é produzir a prova, e a prova não é outra coisa senão o elemento demonstrativo do fato. Assim, tem a perícia a faculdade de contribuir com a revelação da existência ou da não existência de um fato contrário ao Direito, dando ao magistrado a oportunidade de se aperceber da verdade e formar sua convicção (FRANÇA, 2000).
          </p>
        </div>

        {/* Secção: O Perito e Normas */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">O Perito</h2>
          <p>
            É todo e qualquer profissional especializado em determinados ofícios, artes ou ciências, capaz de conduzir quem quer que seja à verdade, quando para tal é solicitado. <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">É todo técnico que, designado pela Justiça, recebe o encargo de esclarecer fatos/acontecimentos num processo.</mark> Sua atuação ocorre em qualquer fase, policial ou judiciária, do processo. A legislação define, no Capítulo XI do CEM, nos artigos 92 a 98, as normas de condutas pertinentes ao desempenho ético da perícia médica.
          </p>
          <p>
            O perito, em geral, não tem funções fiscalizadoras, mas função específica no exame de documentos, objetos ou pessoas. Na área médica, consiste no exame de pessoas (ou cadáveres), com a finalidade de avaliar lesões, causas, quantificar sequelas e disfunções para fins de indenização, mensurar comprometimento da capacidade laborativa em trabalhadores ou atestar capacidade para ato ou função.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Normas no desempenho da função pericial</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li><strong>Perito judicial</strong> é o profissional habilitado e nomeado pelo juiz para opinar sobre questões técnicas de sua especialidade.</li>
            <li>A perícia, quando pertinente a profissões regulamentadas, será exercida por profissionais legalmente habilitados, sendo requeridos, ainda, reconhecida idoneidade moral, capacidade técnica e experiência profissional.</li>
            <li>É dever do perito honrar sua função, seguindo os preceitos do CEM.</li>
            <li>A indicação e a nomeação para exercer a função de perito devem ser sempre consideradas como distinção e reconhecimento da capacidade e honorabilidade do profissional, que delas declinará quando impedido por lei, quando ocorrer suspeição de natureza íntima, quando a matéria em litígio não for de sua especialidade ou por motivo de força maior.</li>
            <li>Ciente da indicação e antes de assumir o compromisso, deve o perito inteirar-se dos autos, verificar se não há incompatibilidade e se realmente tem condições de assumir o compromisso e realizar o trabalho.</li>
            <li>Na hipótese de recusa, esta deve ser fundamentada em petição dirigida ao juiz, o mais breve possível.</li>
            <li>Qualquer dificuldade aposta ao bom andamento do trabalho pericial deve ser comunicada ao juiz mediante petição.</li>
            <li>O perito não cria e nem crê, isto é, insere no seu laudo os fatos e atos examinados e estudados, não fundado em simples suposições ou probabilidades, devendo apresentar suas conclusões com toda a objetividade, mantendo sempre a isenção e imparcialidade (RODRIGUES, 2003).</li>
            <li>Admite-se assessoramento no trabalho pericial, desde que sob controle e revisão do perito, que deve adotar os melhores critérios para expressar sua opinião de forma clara e categórica, em linguagem adequada, tendo presente que tais características e o estilo na confecção do laudo definem e denunciam seu autor.</li>
            <li>Todos os quesitos devem receber respostas esclarecedoras e fundamentadas, evitando-se simples afirmativas ou negativas (expressões "sim" ou "não").</li>
            <li>O perito deve evitar qualquer interferência que possa constrangê-lo em seu trabalho, não admitindo, em nenhuma hipótese, subordinar sua apreciação a qualquer fato ou situação que possa comprometer sua independência intelectual e profissional.</li>
            <li>O perito deve arbitrar seus honorários mediante petição ao juiz, em que indicará o tempo despendido e a complexidade do trabalho. É vedado auferir honorários diretamente das partes, qualquer que seja e a qualquer título.</li>
            <li>O perito, cônscio de sua responsabilidade e da distinção que lhe foi conferida, deve zelar por suas prerrogativas, usando-as moderadamente e nos limites de sua função, fazendo-se respeitar como auxiliar da Justiça e agindo sempre com seriedade e discrição, observando o sigilo necessário do que apurar ou souber.</li>
          </ol>
        </div>

        {/* Secção: A importância */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">A importância da perícia médica</h2>
          <p>Na atual conjuntura, o campo de atividade médico-pericial expandiu-se muito, com ampliação do volume de tarefas resultante da abrangência de suas relevantes atividades.</p>
          <p>Segundo França (1977, p. 8),</p>
          
          <div className="border-l-4 border-navy pl-4 py-1 my-4 bg-gray-50/50 rounded-r-lg italic">
            "Cada vez que a astúcia humana torna-se mais e mais sofisticada para fugir da revelação esclarecedora, urge ampliar-se a possibilidade de investir, cada vez com maior empenho, na contribuição da técnica e da ciência, como fatores de excelência na elaboração da prova. O verdadeiro destino da perícia é informar e fundamentar de maneira objetiva todos os elementos consistentes do corpo de delito e, se possível, aproximar-se de uma provável autoria. Não existe outra forma de avaliar retrospectivamente um fato marcado por vestígios que não seja através do seu conjunto probante. A missão da perícia é informar. Visum et repertum - visto e referido, eis a questão."
          </div>

          <p>O exame médico-pericial busca o enquadramento nas situações legais, o pronunciamento conclusivo sobre condições de saúde e a avaliação da capacidade laborativa; visa definir o nexo de causalidade (causa e efeito) entre doença ou lesão e a morte (definição de causa mortis), doença ou sequela de acidente e a incapacidade ou invalidez física e/ou mental, o acidente e a lesão, doença ou acidente e o exercício da atividade laborativa, doença ou acidente e sequela temporária ou permanente, desempenho de atividades e riscos para si e para terceiros. Portanto, o médico perito ocupa lugar de destaque no cenário científico, judicial e social. Na área judicial pode ainda atuar como órgão auxiliar da administração da Justiça, podendo ser classificado como percipiente (simples percepção de fatos) e judicante (percepção de fatos com emissão de juízo de valor) (PAULA, 2007).</p>
          <p>A atividade médico-pericial tem importância capital nas instituições e sistemas de previdências (ASSOCIAÇÃO NACIONAL DE MÉDICOS PERITOS DA PREVIDÊNCIAL SOCIAL, 2007; HURTTADO HOYO, 2002). É, ao mesmo tempo, instrumento de paz social pois garante o amparo legítimo ao beneficiário realmente incapacitado, e instrumento de controle para despesas evitáveis e decorrentes de pressões extradoença que podem colocar em risco o equilíbrio das instituições (SOCIEDADE BRASILEIRA DE PERÍCIAS MÉDICAS, 2007) fato que corroborou para grande progresso entre os médicos profissionais da Previdência Social, com a criação da carreira Perícia Médica.</p>
        </div>

        {/* Secção: Situação atual e áreas */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Situação atual da perícia médica</h2>
          <p>Ao longo das décadas que precederam o início do milênio, o Estado-juiz tinha a difícil tarefa de encontrar o expert entre os profissionais de sua relação que contasse, unicamente, com a confiança necessária para desempenhar o papel de longa manus do julgador. Assim, era comum encontrar um clínico geral procedendo perícia médica judicial em feito cujo réu era um ortopedista, tal era o grau de dificuldade que se apresentava para o Estado-juiz com a lide de avançar, na instrução processual, para a produção de prova técnica (COUTO FILHO; SOUZA, 2005).</p>
          <p>Em nosso país, a evolução da perícia médica se fez notar a partir da Resolução CFM nº 1.634/02, que celebra o convênio de reconhecimento de especialidades médicas firmado entre o CFM, a Associação Médica Brasileira (AMB) e a Comissão Nacional de Residência Médica (CNRM). Esta normatização foi sequencial e dinamicamente modificada pelas resoluções CFM nºs 1.666/03, 1.763/05 e, finalmente, pela Resolução CFM nº 1.785/06, publicada no Diário Oficial da União de 22 de junho de 2006 (Seção I, p. 127), que traz uma relação de 53 especialidades e 54 áreas de atuação reconhecidas e define, atualmente, a norma orientadora e reguladora de reconhecimento das especialidades médicas e áreas de atuação, determinando que os CRMs deverão registrar apenas títulos de especialidade e certificados de áreas de atuação reconhecidos pela Comissão Mista de Especialidades (CME).</p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Perito médico versus médico assistente</h3>
          <p>A atividade médico-pericial é especialmente particular, pois difere frontalmente da atividade da medicina assistencial. Nesta, há a necessidade de um estreito vínculo 'médico-paciente'; naquela, assume o papel de 'juiz' (SOUZA, 2007). No entanto, nada impede ao profissional, sob o ponto de vista ético-legal, desempenhar seu papel de médico e seu papel de perito médico. Evidentemente, deve evitar periciar situações em que haja constrangimento ou impedimento, visando afastar a suspeita de legislar em próprio interesse.</p>
          
          <p>É interessante fazer uma analogia entre o perito médico e o médico assistente com base no excelente texto de Mário Rigatto, O perfil do médico no século XXI (apud SOUSA, 2007, p. 1):</p>
          <div className="border-l-4 border-navy pl-4 py-1 my-4 bg-gray-50/50 rounded-r-lg italic">
            "O médico tem que treinar relações complexas. Ele precisa aprender a ter uma roupagem por fora e outra por dentro, sem ser falso. Ele não pode franzir o cenho, pois o doente vai achar que o seu caso é grave. Não pode se emocionar a ponto de falar com a voz embargada porque a voz embargada perde força de convicção. O médico não pode chorar, pois a lágrima rouba cuidado ao que diagnostica. Ele não pode tremer pois não faz bem ao bisturi. Então, eu quero um médico por fora com um único domínio das emoções, mas por dentro eu quero o mais sentimental dos seres humanos, que se compadeça com a dor e o sofrimento. Esta dupla roupagem é muito difícil vestir."
          </div>

          <p>Embora seja difícil essa "dupla roupagem", ela se faz necessária para o perfil do perito médico, com distintas posições. Adicionalmente, as circunstâncias com as quais este profissional se depara, na maioria das vezes, exigem uma relação de desconfiança que merece, por dever, ser analisada com total imparcialidade e, ao mesmo tempo, com cortesia, atenção e educação por parte do perito. Ao contrário, na relação médico-paciente há um clima de mútua confiança e empatia.</p>
          <p>O médico perito deve estar atento à ética particular de sua atividade. Precisa ter em mente que, ao contrário da medicina assistencial, em que o médico está sempre em estreito vínculo profissional com o paciente, o médico perito é colocado pela instituição seguradora como um juiz, devendo manter um equilíbrio adequado entre as postulações desejadas e as possibilidades da lei vigente que ele deve conhecer. Deve estar preparado para reconhecer o Direito, concedendo o que deva ser concedido, mas negar as pretensões ilegítimas, fruto de desejos pecuniários sem abrigo na lei constituída (GONZAGA, 2004).</p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Áreas de atuação profissional</h3>
          <p>A perícia médica pode ter atuação nas seguintes modalidades de trabalho: administrativa, judicial/forense, médico-legal, previdenciária e securitária.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>A perícia administrativa</strong> pode ser definida como o exame médico-pericial realizado no servidor público, regido por estatuto ou regimento próprio. Destina-se aos servidores públicos civis e militares.</li>
            <li><strong>A perícia médica judicial</strong> é o meio de prova realizada por profissional da medicina legalmente habilitado, visando informar e esclarecer alguma autoridade sobre fato próprio de sua especificidade funcional, no interesse da Justiça.</li>
            <li><strong>A perícia médico-legal</strong> é um conjunto de procedimentos médicos e técnicos que tem como finalidade o esclarecimento de um fato de interesse da Justiça. Segundo a definição de Maranhão (1989, p. 27), é "o uso de conhecimentos médicos e biológicos a serviço do Direito".</li>
            <li><strong>A perícia médica previdenciária</strong> tem por finalidade precípua a emissão de parecer técnico conclusivo, quando da avaliação da incapacidade laborativa, em face de situações previstas em lei.</li>
            <li><strong>A perícia securitária</strong> constitui procedimento técnico diretamente ligado à Medicina de Seguros e ao ramo de seguro de pessoas. Faz avaliação de doenças preexistentes, valoração de danos para indenização e avaliações excludentes de pagamento (suicídio/acidente).</li>
          </ul>
        </div>

        {/* Secção: Preceitos desejáveis e Legislação */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Preceitos desejáveis da atuação médico-pericial</h2>
          <p>O perito médico deve possuir competência técnica e científica. É imprescindível que detenha os conhecimentos necessários das leis, normas e portarias para que consiga o melhor desempenho em sua função. Deve agir com imparcialidade, isenção e independência; ter urbanidade e discrição; ter disciplina operacional, respeitando com rigor os prazos previamente estipulados.</p>
          <p>França (2008) propôs o decálogo de postulados éticos a seguir como orientação ética na condução da arte pericial:</p>
          
          <ol className="list-decimal pl-5 space-y-1 mt-2 mb-4">
            <li>Evitar conclusões intuitivas e precipitadas;</li>
            <li>Falar pouco e em tom sério;</li>
            <li>Agir com modéstia e sem vaidade;</li>
            <li>Manter o sigilo exigido;</li>
            <li>Ter autoridade para ser acreditado;</li>
            <li>Ser livre para agir com isenção;</li>
            <li>Não aceitar a intromissão de ninguém;</li>
            <li>Ser honesto e ter vida pessoal correta;</li>
            <li>Ter coragem para decidir;</li>
            <li>Ser competente para ser respeitado.</li>
          </ol>

          <p className="font-bold text-center text-navy my-4">
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">"Aquele que compreender que não poderá ser um perito honesto, seja honesto, não seja perito" (Abraham Lincoln).</mark>
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4 border-t border-gray-100 mt-4">Perito - processos judiciais - qualificações - especialidade médica</h3>
          <div className="space-y-4 mt-2">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="font-bold text-navy mb-1">Quais são as qualificações necessárias para que um médico atue como perito em processo judicial?</p>
              <p>O perito deve ser preferencialmente um especialista, possuir conhecimentos técnicos e científicos especiais, suficientes para emitir o seu parecer sobre determinada avaliação.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="font-bold text-navy mb-1">É obrigatório que o médico designado perito em processo judicial seja especializado em Medicina Legal?</p>
              <p>Não, o título de especialista não é requisito para exercer qualquer área reconhecida como especialidade médica, mas sim para anunciá-la.</p>
            </div>
          </div>

          <div className="mt-6 border-l-4 border-blue-500 pl-4">
            <p className="font-bold text-[#050F41]">Resolução CFM nº 1.497/98</p>
            <p className="text-xs text-gray-500 mb-2">Determinar que o médico nomeado perito execute e cumpra o encargo, no prazo que lhe for determinado, mantendo-se sempre atento às suas responsabilidades ética, administrativa, penal e civil.</p>
            <p className="text-xs text-gray-500 mb-2"><strong>Parágrafo único:</strong> O médico fará jus aos honorários decorrentes do serviço prestado. O médico designado perito pode, todavia, nos termos do artigo 424 do Código de Processo Civil, escusar-se do encargo alegando motivo legítimo.</p>
          </div>

          <div className="mt-4 border-l-4 border-blue-500 pl-4">
            <p className="font-bold text-[#050F41]">Código de Processo Civil</p>
            <p className="text-xs text-gray-500 mb-1"><strong>Art. 424:</strong> O perito pode ser substituído quando:</p>
            <ol className="list-decimal pl-5 text-xs text-gray-500 space-y-1">
              <li>carecer de conhecimento técnico ou científico;</li>
              <li>sem motivo legítimo, deixar de cumprir o encargo no prazo que lhe foi assinado.</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">Constatada a ausência de motivo legítimo, o profissional deverá responder a processo ético-profissional (PEP), com base no Capítulo I, inciso IV, e nos artigos 17 e 18 do CEM.</p>
          </div>
        </div>

      </div>

      {/* Botão Flutuante (FAB) para Voltar ao Topo */}
      {showScrollTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 bg-[#050F41] text-white shadow-2xl rounded-full p-4 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-slate-700"
          title="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};