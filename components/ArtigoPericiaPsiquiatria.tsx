// Ficheiro: components/ArtigoPericiaPsiquiatria.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ArtigoPericiaPsiquiatria: React.FC<Props> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;
    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 56);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="PERÍCIA MÉDICA EM PSIQUIATRIA" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-6 max-w-3xl mx-auto w-full flex-1 pb-32">
        {/* Bloco Título e Autores */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm text-center">
          <h1 className="text-xl font-heading font-bold text-[#050F41] mb-4 uppercase">Perícia Médica em Psiquiatria</h1>
          <div className="bg-gray-50 rounded-xl p-4 inline-block text-left text-xs text-gray-600 font-body space-y-1.5 border border-gray-100">
            <p><strong>Tereza Chedid:</strong> Especialista em Psiquiatria Clínica e Legal/Forense, atuando na área da Perícia Médica Previdenciária e Forense como assistente técnica, ou perita de Juízo, desde 1983, em Medicina do Trabalho e Saúde Ocupacional, desde 1985, e em Hipnose Médica, desde 1998. Psicanalista clínica, com diversos cursos de extensão na área comportamental, terapias breves e análise transacional. Formada em Medicina pela Universidade Federal Fluminense, em 1977. Professora de cursos de pós-graduação e graduação em Psicanálise Clínica.</p>
          </div>
        </div>

        {/* Secção: Considerações Gerais */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Considerações gerais</h2>
          <p>
            Sendo a Psiquiatria o ramo da Medicina que lida com a prevenção, o atendimento, o diagnóstico, o prognóstico, o tratamento, a reabilitação e até a adaptação das doenças psiquiátricas, quer sejam estruturais, orgânicas ou controláveis, contudo ainda incuráveis, como as psicoses ou os transtornos neuróticos de forma geral, deve o médico psiquiatra, como objetivo, fazer o diagnóstico correto – no mais das vezes, tarefa trabalhosa e complexa – do transtorno psíquico do seu paciente. Com o diagnóstico firmado, determinar a conduta a seguir perante a doença desafiadora e subjetiva em seus caprichos e perante o paciente, seus familiares, sua situação de vida social, laborativa, afetiva.
          </p>
          <p>
            Quando defrontado com uma psicose severa, incurável, deve conscientizar o doente, no limite possível, e especialmente seus familiares, acerca da importância do tratamento contínuo e correto; de que a doença é incurável, sim, todavia pode ser controlável; deve desmistificar os preconceitos e crenças quanto a contágio, perigos, necessidade das temíveis internações que cursam, geralmente, com a acomodação e o abandono familiar.
          </p>
          <p>
            Quando diante de transtornos neuróticos – estes incuráveis –, deve estabelecer o <em>rapport</em>, a solidariedade sem paternalismo com seu paciente. Criar elos de empatia, esperança, responsabilidade, acolhimento. Estabelecer, se não exerce a Psicoterapia, o tratamento multidisciplinar com psicólogo ou psicanalista. Enfim, nos casos sombrios e mais leves, objetivar o alívio ou cura dos sintomas psíquicos que atormentam o doente, devolvendo-lhe o bem-estar, o equilíbrio e readaptando-o social, laborativa e afetivamente.
          </p>
          <p>
            Nos casos psicóticos severos, manter o doente estável, controlado, vivendo no seio da família em condições respeitosas e dignas, protegido, amparado, amado.
          </p>
          <p>
            Com essas diretrizes, o psiquiatra alcança o seu objetivo e as metas desejáveis e possíveis em cada caso. Não à toa a palavra psiquiatra vem do grego e quer dizer "arte de curar a alma" (WIKIPÉDIA, 2007b).
          </p>
        </div>

        {/* Secção: Subespecializações */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Evolução da Psiquiatria em subespecializações</h2>
          <p>Com o progresso do mundo moderno, temos hoje, na Psiquiatria, uma série de subespecialidades, algumas das quais reconhecidas pela Associação Brasileira de Psiquiatria, e outras ainda em fase de avaliação:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Psiquiatria da Infância e Adolescência – Pedopsiquiatria;</li>
            <li>Psicogeriatria ou gerontopsiquiatria;</li>
            <li>Psicoterapia;</li>
            <li>Psiquiatria clínica geral;</li>
            <li>Psiquiatria voltada à toxicodependência;</li>
            <li>Interconsulta em hospital geral ou psiquiatria de ligação;</li>
            <li>Psiquiatria de emergências;</li>
            <li>Psicopatologia;</li>
            <li>Psiquiatria epidemiológica – comunitária – transcultural.</li>
          </ul>
        </div>

        {/* Secção: O que é ser louco? */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">O que é ser louco?</h2>
          <p>
            Desde a infância, ouço o ditame popular: "De médico, poeta e louco, todo mundo tem um pouco". Sempre brinquei muito com isso, pois sou médica e, nas raras horas vagas, poeta, e costumo dizer: "da tríade popular, só falta ser louca". Mas... o que é ser louco?
          </p>
          <p>
            Podemos perceber que os conceitos de loucura e/ou de transtornos mentais estão muito arraigados ao quanto o "louco" ou o "transtornado psíquico" se adapta às relações psicossociais, ao admirável mundo novo, cheio de tecnologia, mudanças de costumes, escalada da violência, novos rumos laborais, transformações nas ligações afetivas e familiares. Enfim, ao mundo em que, no presente, vivemos.
          </p>
          <p>
            Quando esses parâmetros começam a ser comprometidos, quando o indivíduo não se adapta em maior ou menor grau, vêm os estigmas e conceitos de que há algo errado quanto à sua conduta psíquica e estado mental. A normalidade seria, para muitos, sinônimo de boa adaptação à situação citada, reações de satisfação, prazer, produtividade e outras atitudes consideradas de uma pessoa "normal". O ser humano "normal" não ‘incomoda’; não tem (ou finge que não tem?) predomínio de sentimentos negativos, pessimistas, como medo, culpa, insegurança, excesso de preocupação, ansiedade antecipatória e outros sentimentos e emoções que o estigmatizam como "anormal".
          </p>
          <p>Em recente estudo, tentou-se estabelecer alguns critérios e parâmetros para definir normalidade. Veremos três deles:</p>

          <ul className="list-disc pl-5 space-y-3 mt-2">
            <li>
              <strong>Critério estatístico:</strong> define como normal o mais numeroso e frequente quanto a condutas e sentimentos compatíveis com a maioria. É um parâmetro de média estatística, como utilizamos na área clínica para estabelecer que a pressão arterial 120 x 70 é a ideal, como utilizamos para estipular valores de normalidade para glicemia, uremia e outros índices mensuráveis bioquimicamente e comprováveis cientificamente. Estatisticamente, nem sempre a maioria determina um padrão de normalidade que a sociedade exige.
            </li>
            <li>
              <strong>Critério valorativo:</strong> como o nome diz, considera que há doença não pelo número maior ou menor de pessoas com uma conduta ou comportamento, mas sim pelos sintomas desagradáveis e o incômodo que a conduta causa. Um bom exemplo é a depressão, doença em crescimento vertiginoso, pandêmica, pansexual, em todas as faixas etárias. Atinge tanta gente, é tão cosmopolita! Por que não é considerada como reação normal do psiquismo humano? Pelos sintomas negativos e mórbidos que causa. Pela desadaptação afetiva e social que provoca, incomoda o meio que cerca o deprimido, a família, o próprio doente. Este critério também se mostra desigual para as pessoas, no momento em que os retardados mentais estão codificados no CID 10 e no DSM IV como "doentes mentais". E os gênios? Os superdotados? Os prodígios? Estes não estão codificados... São os valores sociais.
            </li>
            <li>
              <strong>Critério intuitivo:</strong> a intuição se define como "ideias conclusivas sem trâmite habitual de raciocínio, mas que resultam de conjunto complexo de conhecimentos anteriormente adquiridos e mobilizados instantaneamente diante de um estímulo ou solicitação específica (...) É inspiração patrocinada pelas experiências prévias e conhecimentos bem elaborados" (BALLONE, 2007a). Decodifico estas definições tão interessantes como o nosso "olho clínico", "a nossa impressão clínica" diante de um periciando, de um paciente.
            </li>
          </ul>

          <p className="mt-4">
            Por derradeiro, achei interessante suscitar para todos, peritos ou não, esta discussão sobre como é complexo definir "normalidade". Os critérios, apresentados resumidamente, têm partes positivas e falhas. O mais importante é abrirmos a mente e refletirmos quanto aos conceitos de exclusão social, de alienação mental, de inimputabilidade, de deficiência mental e tantos outros rótulos e estigmas criados pela sociedade e pela cultura vigente.
          </p>
        </div>

        {/* Secção: Divisão dos transtornos */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Perícia médica em Psiquiatria e a divisão dos transtornos psiquiátricos</h2>
          <p>
            Independentemente de a perícia psiquiátrica ser na área legal forense ou previdenciária, o exame psiquiátrico com fins fiscalizatórios, técnicos, legais, previdenciários, jurídicos, de comprovação de incapacidade, inimputabilidade, alienação mental e interdição obedecem uma diretriz, uma base organizacional e didática de abordagem do periciando, assim como da técnica e ordenação das fases do exame, que facilitam nosso trabalho, além de gerar clareza e objetividade no laudo pericial.
          </p>
          <p>Dividimos as patologias psiquiátricas em dois grandes grupos-base:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Psiquiátricos estruturais:</strong> são os que têm um substrato orgânico com base anatomoclínica e causas conhecidas. Entre eles, temos as psicoses (esquizofrenia e transtornos de humor/afetivos), as demências e as epilepsias com comprometimento psiquiátrico.</li>
            <li><strong>Transtornos psiquiátricos não estruturais:</strong> são os que não têm substrato orgânico, nem base anatomoclínica. São exemplos deste grupo os transtornos neuróticos (transtornos do estresse, os casos de estresse pós-traumático, os distúrbios somatoformes, a ansiedade, as fobias e a depressão neurótica).</li>
          </ul>
          <p className="mt-4">
            Na psiquiatria pericial, é importantíssimo determinar esta origem do transtorno. No primeiro grupo, teremos os inimputáveis, os alienados mentais, os grandes transtornos da memória e comportamento comuns nas epilepsias temporais complexas. Na perícia psiquiátrica forense, temos o grupo responsável pela maioria das causas de interdição, seja pelas demências, paranoia ou prodigalidade.
          </p>
          <p>
            No segundo grupo, o dos transtornos não estruturais, teremos a imensa gama de transtornos neuróticos. Estes não causam alienação mental, os criminosos portadores destes transtornos são puníveis e conscientes de seus atos. As neuroses não são casos para interdição.
          </p>
        </div>

        {/* Secção: Peculiaridades e dificuldades */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Peculiaridades e dificuldades do exame psiquiátrico</h2>
          <p>Começaremos por avaliar o ser humano por dois eixos de sua estrutura psíquica:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>O longitudinal:</strong> que corresponde à linha da vida, com início desde o período pré-natal até o momento presente;</li>
            <li><strong>O transversal:</strong> que corresponde ao exame do estado mental na ocasião da avaliação.</li>
          </ul>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Outras peculiaridades do exame psiquiátrico</h3>
          <p>Quanto a outras peculiaridades do exame psiquiátrico, temos as seguintes situações como fatores complicadores:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>predomínio de elementos abstratos para a análise das funções psíquicas;</li>
            <li>ausência de exames complementares comprobatórios, na maioria dos casos;</li>
            <li>pode haver, na avaliação, a presença de julgamento de valores e preconceitos com relação a possível portador de transtorno mental;</li>
            <li>dificuldades na entrevista quanto à colaboração para o fornecimento de informações e credibilidade da descrição sintomática;</li>
            <li>maior rejeição por parte da população em questão, por ser mais sujeita às dificuldades do mercado de trabalho, o que leva a risco de desemprego e danos socioeconômicos;</li>
            <li>dificuldade na validação dos informes técnicos fornecidos por diversos profissionais, pelo segurado à perícia.</li>
          </ul>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Dificuldades que podem ser observadas durante a avaliação</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Transtorno factoide ou simulação.</li>
            <li>CID firmado pelo médico assistente incompatível com a clínica observada.</li>
            <li>CID firmado pelo médico assistente incompatível com o tempo estimado de recuperação.</li>
            <li>Medicamentos utilizados não atingem os sintomas-alvo para o tratamento do transtorno codificado.</li>
            <li>Dois ou mais CIDs incompatíveis.</li>
            <li>Diversidades de CID em exames consequentes. Muito comum na perícia previdenciária.</li>
            <li>Transtorno informado incompatível com a função laborativa.</li>
            <li>Persistente ineficácia da medicação e piora contínua das queixas, sem melhora visível.</li>
            <li>Relação do examinado com o acompanhante. Exemplo: diagnóstico de F32 que não responde a qualquer pergunta formulada, esperando o acompanhante responder.</li>
            <li>Quadro clínico existente pela ação medicamentosa, iatrogênica e/ou por uso autoprovocado, e possibilidade de desintoxicação em curto tempo.</li>
          </ul>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Bases para o exame psiquiátrico pericial</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Avaliação geral da pessoa;</li>
            <li>Exame clínico das funções mentais;</li>
            <li>Avaliação de funções psicofisiológicas.</li>
          </ul>
        </div>

        {/* Secção: Perícia psiquiátrica forense-legal */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Perícia psiquiátrica forense-legal</h2>
          
          <h3 className="font-heading font-bold text-[#050F41]">Atributos necessários à formação do perito psiquiatra</h3>
          <p>
            Obviamente que, como em qualquer especialidade médica, há que se possuir o dom vocacional, a tendência inata para lidar com área tão complexa e subjetiva como a mente humana. O psiquiatra deve ter algumas características de personalidade e interesse por algumas áreas científicas, mesmo alheias à Medicina. Os psiquiatras devem ter boa formação em Medicina Interna, em Clínica Médica. Devem interessar-se pelas doenças hormonais, pela Neurologia, Psicologia, Psicanálise, Sociologia e Psicofarmacologia, bem como pelo Direito e seus meandros, considerando que seu paciente, periciando, autor, réu ou segurado muitas vezes dependerá de seu parecer para uma série de situações judiciais, trabalhistas, administrativas e legais, de acordo com seu grau de saúde ou doença mental.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Histórico, evolução e progresso no diagnóstico e tratamento das doenças psiquiátricas</h3>
          <p>
            Não podemos negar que no último século tivemos expressivo avanço com relação às condutas psiquiátricas e também à terapêutica farmacológica para algumas entidades nosológicas, como, por exemplo, a depressão, que conta hoje, já muito mais entendida, estudada e explicada, com um arsenal medicamentoso potente e diversificado, o que não impede, infelizmente, que seja a doença mental que mais cresce em todo o mundo. São os casos em que a Medicina evolui na cura, no tratamento, porém as causas e fatores determinantes da eclosão do aparecimento da doença até aumentam, em vez de diminuir – ou seja, não há prevenção.
          </p>
          <p>
            Hoje, luta-se e incentiva-se o não internamento do paciente, em prol de sua integração afetiva, social e, sempre que possível, laboral, logicamente respeitando suas limitações ao meio, com o apoio de seus familiares, do seu trabalho e, é claro, do seu psiquiatra.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Perícia médica em Psiquiatria</h3>
          <p>
            O termo perícia vem do latim <em>peritia</em> e, segundo o dicionário Aurélio, quer dizer "vistoria ou exame de caráter técnico e especializado" (FERREIRA, 2002). O Código de Processo Civil, em seu art. 420, traz a mesma conceituação com as seguintes palavras: "A prova pericial consiste em exame, vistoria ou avaliação".
          </p>
          <p>Os tipos de perícia médica mais abrangentes são:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Perícia forense;</li>
            <li>Perícia médico-legal;</li>
            <li>Perícia médico-previdenciária;</li>
            <li>Perícia médica pública ou administrativa.</li>
          </ul>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Atributos do perito psiquiatra</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>conhecimento amplo da área clínica, endocrinológica e de medicina interna;</li>
            <li>bons conhecimentos e interesse efetivo pelo Direito, Ciências Sociais, Sociologia;</li>
            <li>conhecimentos na área da Psicologia;</li>
            <li>gostar da área de legislação pública. Atualizar-se constantemente quanto aos atos, normas, leis, decretos, portarias e afins;</li>
            <li>ter personalidade imparcial; ausência de preconceitos; temperamento racional, seguro, sólido em seus conhecimentos e facilidade em assumir atitudes decisórias e conclusivas;</li>
            <li>ter sólido conhecimento do Código de Ética Médica, particularmente do Capítulo IX – Sigilo profissional;</li>
            <li>ter a sabedoria de estabelecer o <em>rapport</em>, sem o qual não há como fazer uma boa abordagem psiquiátrica, porém mantendo a postura neutra e impassível;</li>
            <li>equilíbrio psíquico, emocional e afetivo sólido;</li>
            <li>estudar as formas de linguagem não verbal, especialmente corporal, gestual, comportamental, o que muito ajudará na identificação de simulações.</li>
          </ul>
        </div>

        {/* Secção: Perícia psiquiátrica forense */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Perícia psiquiátrica forense</h2>
          <p>A perícia psiquiátrica ou exame pericial psiquiátrico é uma avaliação médica especializada, solicitada pela Justiça, com o objetivo de atestar a condição mental de uma pessoa e embasar, de forma técnica, três tipos de situações, a saber:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>avaliação de interdição civil por razões mentais;</li>
            <li>avaliação da inimputabilidade;</li>
            <li>avaliação trabalhista de capacidade laboral, doença profissional, invalidez por deficiência mental, entre outras.</li>
          </ul>
          <p className="mt-4">
            Em conformidade com a didática e técnica, o ideal será:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>estabelecer com firmeza de opinião o diagnóstico ou diagnósticos médico-psiquiátricos do periciando;</li>
            <li>na área criminal, particularmente, é muito importante estabelecer qual era o estado psíquico, mental, no momento da ação, da prática do delito. Estava lúcido, drogado, embriagado? É um psicótico esquizofrênico paranoide sem medicação? É alienado mental? É um psicopata?</li>
          </ul>
          <p className="mt-4">Devemos seguir a nossa pauta didática e técnica:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>diagnóstico muito bem firmado, claro e objetivo;</li>
            <li>como estava ao cometer o delito? Como é a personalidade prévia?;</li>
            <li>estabelecer um prognóstico: reversível? Curável? Inválido? Alienado?</li>
          </ul>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Psiquiatra médico-legal</h3>
          <p>Muitos autores preocuparam-se em conceituar Medicina Legal. Vamos a alguns desses conceitos e definições:</p>
          <div className="border-l-4 border-navy pl-4 py-2 my-4 bg-gray-50/50 rounded-r-lg italic font-medium">
            "É a aplicação dos conhecimentos médicos aos problemas judiciais" (PARÉ apud HISTÓRIA, 2007).<br/><br/>
            "É o conjunto de conhecimentos médicos e paramédicos destinados a servir ao Direito e cooperando na elaboração, interpretação e execução dos dispositivos legais no seu campo de ação de medicina aplicada" (GOMES, 2003).
          </div>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Perfil do psiquiatra legal</h3>
          <p>O perito legista/legal em Psiquiatria não pode ter apenas bons conhecimentos e domínios da ciência da mente humana, ele necessita ter:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>apuro técnico, clareza, capacidade decisória, poder de síntese, objetividade na elaboração de laudos, pareceres e resposta aos quesitos judiciais;</li>
            <li>conhecimento e familiarização com a linguagem jurídica e técnica para a redação de seus laudos, relatórios e pareceres;</li>
            <li>equilíbrio psíquico, emocional e afetivo, racionalidade, não abrindo mão do senso de humanidade e compaixão;</li>
            <li>senso extremo de responsabilidade, pois como cita Tourdes, a honra, a liberdade e até a vida de um cidadão podem depender de suas decisões.</li>
          </ul>
        </div>

        {/* Secção: Perícia Previdenciária e Psiquiatria */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Perícia médica previdenciária e Psiquiatria</h2>
          <p>
            Na estrutura previdenciária o perito médico é o profissional especializado que tem a função de avaliar as condições de saúde do periciando/segurado, correlacionando-as com a existência de incapacidade laboral e, caso esta incapacidade exista, definir objetivamente o grau de incapacidade e o tempo de afastamento pertinente ao quadro incapacitante, sempre relacionado com a atividade laborativa e com a legislação própria.
          </p>
          <p>
            O próprio segurado psiquiátrico tem vergonha e preconceito quanto à sua doença. A família, nem se fala, então! No trabalho, ele é logo afastado porque está com "problemas na cabeça e toma remédios muito fortes de maluco". O que lhe resta num país onde a ignorância impera e o preconceito é sobejo? Resta ficar "encostado no INSS". Este, senhores, é o melhor quadro, são as pessoas de bem que têm realmente alguma doença/transtorno mental, pois nosso ‘time principal’ é constituído de simuladores, de histriônicos, que mentem ou exageram os sintomas em prol do ganho secundário que é o benefício previdenciário.
          </p>
          <p>
            Numa depressão maior, o segurado diz que não quer fazer nada. E não quer mesmo! Não é que não queira, o deprimido simplesmente não consegue produzir. Ele se isola, foge do contato social, é improdutivo, fala em morrer, em se matar... Onde reabilitá-lo? Como retorná-lo às suas funções? Falo na depressão, pois é, de longe, não só na perícia, mas no mundo, a doença mais preocupante do século XXI.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Perícia psiquiátrica e simulação</h3>
          <p>
            A simulação existe em todas as áreas periciais. A Psiquiatria Forense e Legal também tem grandes problemas com este tipo de conduta. Na área previdenciária, os simuladores, em quase totalidade, o são na área psiquiátrica.
          </p>
          <div className="border-l-4 border-navy pl-4 py-2 my-4 bg-gray-50/50 rounded-r-lg italic font-medium">
            "Simular é fingir o que não é" (FERREIRA, 2002).<br/><br/>
            "É a produção intencional ou invenção de sintomas ou incapacidade, tanto físicos como psicológicos, motivados por ‘estresse’ ou incentivos externos" (ORGANIZAÇÃO MUNDIAL DA SAÚDE, 1993).<br/><br/>
            "Há motivação consciente + produção consciente de sintomas + intuito de enganar" (OMS, 1993).
          </div>
          <p>
            Temos de ter muito cuidado para não confundir simulação com doenças que se arrastam e têm substrato e agravamento pelo desequilíbrio psíquico por estresse grave, depressão reativa ou ansiedade severa, como, por exemplo, neurastenia, transtorno doloroso persistente, fibromialgia, síndrome da fadiga crônica, transtornos conversivos e somatoformes, que têm motivação inconsciente por parte do periciando que não tem o <em>insight</em> disso, sofrendo realmente e em quadro neurótico a ser tratado.
          </p>
          <p>No livro <em>Psiquiatria forense</em>, Taborda, Chalub e Abdalla Filho fazem a seguinte divisão em relação à simulação:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Simulação pura:</strong> ato de falsificar doença ou incapacidade inexistente;</li>
            <li><strong>Simulação parcial:</strong> exagero consciente de sintomas que não existem;</li>
            <li><strong>Simulação falsa imputação:</strong> é a atribuição de sintomas reais a uma causa conscientemente estendida e que não tem relação com os sintomas.</li>
          </ul>
        </div>

        {/* Secção: Referências */}
        <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 shadow-inner space-y-2 font-body text-[11px] text-gray-500 leading-relaxed text-left">
          <h3 className="font-heading font-bold uppercase mb-2 text-gray-700">Referências Bibliográficas</h3>
          <p>AMERICAN PSYCHIATRIC ASSOCIATION. Diagnostic and statistical manual of mental disorders: DSM IV. 4ª ed. Washington: APA, 1994.</p>
          <p>BALLONE, G. J. Diagnóstico psiquiátrico. Revisto em 2005.</p>
          <p>BRASIL. Ministério da Previdência e Assistência Social. INSS. Manual do médico perito da previdência social. 3ª ed. 1993.</p>
          <p>CONSELHO FEDERAL DE MEDICINA. Código de Ética Médica. Resolução CFM nº 1.931/09.</p>
          <p>DEJOURS, C. A loucura do trabalho, estudo da psicopatologia do trabalho. 5ª ed. São Paulo: Oboré, 1992.</p>
          <p>ORGANIZAÇÃO MUNDIAL DA SAÚDE. CID-10: classificação dos transtornos mentais e de comportamento da CID 10. Porto Alegre: Artes Médicas, 1993</p>
          <p>TABORDA, J. G.; CHALUB, M; ABDALLA FILHO. Psiquiatria forense. Porto Alegre: Artmed, 1998.</p>
        </div>

      </div>

      {/* Botão Flutuante (FAB) para Voltar ao Topo */}
      {showScrollTop && (
        <button 
          onClick={() => {
              const container = document.querySelector('main');
              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          className="fixed bottom-24 right-6 bg-[#050F41] text-white shadow-2xl rounded-full p-4 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-slate-700"
          title="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};