// Ficheiro: components/ArtigoPerfilPerito.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ArtigoPerfilPerito: React.FC<Props> = ({ onBack }) => {
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
        title="O PERFIL DO MÉDICO PERITO" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-6 max-w-3xl mx-auto w-full flex-1 pb-32">
        {/* Bloco Título e Autores */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm text-center">
          <h1 className="text-xl font-heading font-bold text-[#050F41] mb-4 uppercase">O Perfil do Perito Médico</h1>
          <div className="bg-gray-50 rounded-xl p-4 inline-block text-left text-xs text-gray-600 font-body space-y-1.5 border border-gray-100">
            <p><strong>Tereza Chedid:</strong> Especialista em Psiquiatria Clínica e Legal/Forense, atuando na área da Perícia Médica Previdenciária e Forense. Psicanalista clínica. Formada em Medicina pela UFF em 1977.</p>
          </div>
        </div>

        {/* Secção: Introdução */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <p>
            Antes de iniciar este capítulo, quero agradecer, com muita emoção, aos membros do Conselho Regional de Medicina do Estado de Goiás (Cremego) o convite para participar desta obra e louvar a iniciativa de, enfim, podermos colocar em literatura aberta a toda a classe médica um livro cujo tema seja a perícia médica.
          </p>
          <p>
            Aos leitores, quero expressar que foi bem mais difícil escrevê-lo do que imaginara. Particularmente no que tange aos médicos peritos, a bibliografia sobre perícia médica, de forma geral, é escassa quanto a sua personalidade, características, dificuldades e aspirações no exercício diário das atividades. As áreas periciais forense e legal já têm base bibliográfica mais sólida e ampla, porém a parte referente à perícia médica previdenciária só agora começa a despontar no sentido de prestar-se atenção ao perito médico da Previdência Social, a sua importância no contexto institucional e às condições de execução de seu trabalho. Mesmo assim, o pouco que encontramos refere-se mais às partes técnica e acadêmica.
          </p>
          <p>
            Esta obra nos dá oportunidade ao aprofundamento, à análise das situações complexas do dia a dia de um perito médico no desempenho de suas funções, bem como às suas características de personalidade e temperamento para a escolha de atividade tão especial.
          </p>
          <p>
            Traçar um perfil abrange não só a parte intelectual, técnica, didática de uma profissão ou atividade laborativa. Devemos também englobar a parte humana, psíquica, comportamental e estrutural do profissional que exercerá a referida função. Mesmo que o médico, em nosso caso específico, tenha as atribuições de personalidade, intelecto, inteligência emocional e dom vocacional para exercer com brilhantismo a atividade de perito médico, não nos esqueçamos de que o homem é um todo complexo.
          </p>
          <p>
            Exercer bem uma função, profissão ou atividade passa pela satisfação pessoal e profissional implícitas neste desempenho, pelo reconhecimento afetivo e emocional, condições ambientais, retorno material que a instituição mantenedora oferece e pelo respeito, moral e autoestima elevada e valorizada para que o profissional, juntando o dom e o perfil às condições dignas e satisfatórias de execução de seu trabalho, possa dele extrair a maior produtividade possível e gerar bons resultados em relação às metas que precisa atingir.
          </p>
          <p>
            Como este livro destina-se aos colegas médicos, peritos ou não, e, sendo peritos, abrangendo todas as áreas da atuação médico-pericial, procurarei traçar um perfil único e amplo, no qual o leitor possa melhor compreender a personalidade base do perito médico, independente da área em que atue. Tentarei colocar o máximo possível de esclarecimentos das dificuldades no exercício da função, das dúvidas e mal-entendidos que fazem com que esta 'especialidade' seja ainda tão mal compreendida, em qualquer das áreas de atuação médico-pericial.
          </p>
          <p>
            Nossa intenção, ainda, é levar aos colegas médicos que desejam exercer atividades periciais, em particular legais, forenses ou previdenciárias, um apanhado geral das atribulações e das responsabilidades de que estarão imbuídos no exercício desta nobre, todavia, espinhosa atividade.
          </p>
          <p>
            Aos colegas médicos peritos ainda novos em seus cargos — atualmente são muitos os que ingressaram na Previdência Social —, que este traçado de perfil possa ajudá-los a centrar-se de forma mais íntima na estrutura psicológica, humana e social dos atributos, qualidades e também das dificuldades que integram a rotina desta atividade instigante e desafiadora: a perícia médica.
          </p>
          <p>
            E ao término da leitura desta obra, que os colegas médicos das áreas não periciais tenham sobre nós, peritos, uma visão mais compreensiva, mais próxima e clara de nossa missão, sempre lembrando que, antes de tudo, somos todos médicos, exercendo, não importa em que área ou especialidade e quão diferentes estas possam ser, o sacerdócio da medicina com responsabilidade, humanidade e compaixão pelo próximo.
          </p>
        </div>

        {/* Secção: Considerações Gerais */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Considerações Gerais</h2>
          <p>Encontramos as seguintes definições para as palavras perito e perfil:</p>
          <div className="pl-4 border-l-2 border-gray-200 space-y-2 text-gray-600 bg-gray-50/50 p-3 rounded-r-lg">
            <p>Do latim <em>peritus, -a, -um</em>. Que tem experiência, conhecedor.</p>
            <p><strong>Perito:</strong> 1. Que ou aquele que se especializou em determinado ramo de atividade ou assunto; 2. Que tem experiência ou habilidade em determinada atividade; 3. Diz-se de ou técnico nomeado pelo juiz ou pelas partes para que opine sobre questões que lhe são submetidas em determinado processo (HOUAISS, 2001, p. 2.191).</p>
            <p><strong>Perito:</strong> 1. Experimentado, experiente, prático; 2. Sábio, douto, erudito; 3. Hábil, sagaz; 4. Aquele que é sabedor ou especialista em determinado assunto; experto 5. Aquele que é nomeado judicialmente para exame ou vistoria (HOLANDA, 2002, p. 529).</p>
            <p><strong>Perfil:</strong> 4. Descrição de uma pessoa em traços que destacam suas características básicas (HOUAISS, 2001, p. 2.186).</p>
          </div>
        </div>

        {/* Secção: Considerações sobre a Perícia Médica */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Considerações sobre a Perícia Médica</h2>
          <p>
            Por não termos nossa área de atuação pericial reconhecida como matéria curricular, ninguém sai da faculdade como 'perito médico'. Mesmo os que seguem a Medicina Legal, para tornarem-se peritos legistas após concurso público, têm que obter um treinamento mais especializado na instituição pública onde exercerão a função. Assim também ocorre na perícia previdenciária, forense/legal ou securitária.
          </p>
          <p>
            Nos longos anos de escola médica cursamos, em caráter obrigatório, várias matérias, especialidades da Medicina, e sempre encontramos a que melhor se encaixa em nosso temperamento, perfil ou ideal. Por vezes, nos apaixonamos por mais de uma delas e essa diversidade é o que cria o encanto de, numa mesma profissão, termos tão diferentes tipos de atuações, especialidades, caminhos e escolhas. Assim, para as inúmeras especialidades médicas temos um perfil próprio nas peculiaridades que estas exigem, quer a Clínica Geral, a Cirurgia, a Psiquiatria, a Pediatria e tantas outras que, com certeza, reunirão profissionais de perfis totalmente diversos, apesar de médicos.
          </p>
          <p>
            A 'especialidade' perícia médica exige um perfil próprio, um tipo de personalidade, temperamento e caráter peculiares ao médico que a pretende exercer.
          </p>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">
              Na definição da palavra perito vimos que este especialista terá que deter conhecimentos especiais e minuciosos, gostar de estudar leis e decretos muitas vezes de áreas diversas à medicina, pois, sem dúvida, a atividade pericial é interdisciplinar com a Administração, com o Direito, com a Biologia, com a Física (na área de Medicina Legal, por exemplo), exigindo de quem pretende seguir este caminho interesses outros que não os somente relacionados às disciplinas médicas.
            </mark>
          </p>
          <p>
            Como bem define Paulo Gonzaga, nobre colega médico perito do INSS: "A perícia médica é a difícil área da Medicina que não se aprende nas faculdades tradicionais, mas na faculdade da vida diária, acumulando conhecimentos da Medicina e do Direito".
          </p>
          <p>
            Realmente, esta é uma definição extremamente verdadeira quanto à atividade médico-pericial, que é mista, complexa, multidisciplinar, com implicações legais, forenses, previdenciárias, trabalhistas e socioeconômicas, porém, e acima de tudo, uma atividade médica.
          </p>
          <p>
            O candidato a perito médico, e o perito médico em exercício, deve ter plena consciência desses conceitos e refletir sobre os mesmos para avaliar, assim como fez na escolha de sua especialidade: "Será que quero ser perito? Tenho o perfil, vocação e atributos essenciais a essa especialidade?".
          </p>
          <p>
            Com grande propriedade, a Associação Nacional de Médicos Peritos da Previdência Social (ANMP) criou seus logotipos com imagens muito elucidativas, nas quais o símbolo da medicina, o bastão de Asclépio, está interligado ao símbolo do Direito, da Justiça, da lei, da investigação, lembrando ao perito médico a complexidade e interdisciplinaridade de sua missão.
          </p>
        </div>

        {/* Secção: Atributos Importantes */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Atributos importantes ao perfil do perito médico de forma global</h2>
          <p>
            Como existem as modalidades periciais previdenciária, administrativa, securitária, médico-legal e forense/judicial é claro que alguns requisitos e caracteres serão mais importantes para alguma área pericial em particular, contudo este é um perfil base para o exercício da especialidade médico-pericial, especialmente no que concerne ao lado psicológico humano, comportamental e de afinidade intelectual.
          </p>
          <p>Podemos relacionar os seguintes fatores como necessários, e alguns até indispensáveis, ao perfil do perito médico, devendo integrar sua formação, qualificação e temperamento:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Sólida formação clínica, mesmo não sendo a Clínica Geral sua área de atuação especializada;</li>
            <li>Curso de especialização em Medicina do Trabalho/Saúde Ocupacional;</li>
            <li>Curso/especialização ou domínio de conhecimentos na área de perícia forense/legal;</li>
            <li>Domínio amplo e atualização constante da legislação pertinente à sua área de atuação (forense, previdenciária, médico-legal etc.);</li>
            <li>Estar sempre atento aos atos, portarias, decretos e tudo o mais que seja concernente aos pilares legais e administrativos da atividade médico-pericial;</li>
            <li>Conhecimentos de informática, pelo menos no tocante aos sistemas habituais para a execução de suas atribuições;</li>
            <li>Ser participativo e interessado nos treinamentos e atualizações ministrados por seu órgão gerencial/mantenedor;</li>
            <li>Ser imparcial, isento de preconceitos, resolutivo e independente no sentido decisório;</li>
            <li>Assumir suas decisões embasado na segurança que provém de domínio e conhecimento na área de atuação e no apuro de sua técnica;</li>
            <li>Elaborar seus laudos/relatórios/pareceres de forma clara, objetiva, resolutiva, concisa e coerente com o que irá, ao fim, concluir, de modo a não deixar dúvidas ou questionamentos pendentes. Lembrar que uma conclusão médico-pericial sempre tem implicações legais, administrativas, previdenciárias ou criminais, sendo de suma responsabilidade para o perito a emissão de suas opiniões nos laudos, pareceres e relatórios que vier a emitir;</li>
            <li>Jamais basear suas conclusões em suposições, probabilidades ou possibilidades. Na atividade médico-pericial não há lugar para o "eu acho que...", "pode ser que...". Fundamentar seu trabalho em fatos concretos, situações objetivas, não dando margem a interpretações duvidosas e/ou inconsistentes;</li>
            <li>Comunicar-se e expressar-se com serenidade, clareza, ponderação e equilíbrio;</li>
            <li>Saber a medida certa entre a razão e a emoção;</li>
            <li>Manter o humanismo inerente ao exercício da medicina, contrabalanceado com o distanciamento emocional necessário à execução do ato médico pericial;</li>
            <li>Ser justo e seguir sua consciência. Ter sempre bom-senso frente a qualquer decisão;</li>
            <li>Procurar cultivar em seu local de trabalho um bom relacionamento interpessoal com os colegas médicos e com o pessoal administrativo;</li>
            <li>Lembrar que o periciando, na quase totalidade, não sabe a função exata do exame pericial ou, se sabe, não gosta deste tipo de exame que é, por força da função pericial, um exame não assistencialista, seja na perícia previdenciária, num exame de corpo de delito, num exame pericial forense etc.;</li>
            <li>O perito médico não tem pacientes, mas sim periciandos, examinandos, autores, segurados, vítimas, réus e outras denominações, dependendo da área de sua atuação. Por isso, deve exercer a arte do ouvir e explicar, dentro do possível, a finalidade do ato pericial, que foge à rotina da consulta médica e da relação médico-paciente habitual nas outras especialidades da medicina;</li>
            <li>Nunca abrir mão de um exame físico/psíquico/anatômico/médico-legal apurado e preciso para formar sua opinião sobre base sólida;</li>
            <li>Abster-se ao máximo de comentários diante do segurado sobre o laudo pericial anterior, o atestado do médico ou profissional de saúde que assiste o paciente que está sendo periciado (fisioterapeuta, psicólogo e outros) e os exames complementares apresentados;</li>
            <li>Ser o mais técnico e isento possível, guardando seus comentários para depois, caso necessários, em ambiente protegido e ético;</li>
            <li>O perito médico deve ter conhecimento pleno do Código de Ética Médica vigente e das resoluções e atos do CFM e dos conselhos regionais, particularmente dos artigos e atos inerentes à sua área de atuação.</li>
          </ul>

          <p className="mt-4">
            Com pertinência ao perfil do perito médico, não podemos deixar de ressaltar, no caso do perito legista e/ou criminal, que grandes mudanças e evoluções ocorreram na área da Medicina Legal, exigindo do perito constante atualização e novos conhecimentos, além de adaptação às condições psicossociais no que concerne ao aumento desenfreado da violência e de tipos de crimes que no passado não eram de relevância ou até mesmo não existiam.
          </p>
          <p>
            O desmesurado aumento dos acidentes de trânsito, das mortes trágicas de crianças e jovens, dos óbitos por ingestão de drogas, das balas perdidas, das chacinas e extermínios, pelo menos nos grandes centros, vêm elevando a demanda de trabalho do médico-legista de forma acentuada e dele exigindo maior equilíbrio psicológico ante a perversão cada vez mais grave dos tipos de crime.
          </p>
          <p>
            Em paralelo, os grupos de direitos humanos têm conseguido excelente trabalho ao atuarem nas denúncias de agressões a mulheres, idosos e crianças, de crimes sexuais, enfim, tudo o que havia mas não era denunciado, demandando, em decorrência, maior esforço e sobrecarga dos peritos legistas quanto aos exames de corpo de delito e afins.
          </p>
          <p>
            A evolução da ciência médica na Genética e Toxicologia forense, entre outros progressos científicos atuais, exigirão do perito legista atualização, informação, interesse pelo novo e, também, adaptação psíquica à nova organização social no que se refere ao crime e à violência em suas mais diversas modalidades.
          </p>
        </div>

        {/* Secção: O Perito Previdenciário */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">O perito médico previdenciário</h2>
          <p>
            Por definição, perito médico é o profissional especializado que, dentro da estrutura previdenciária, tem a missão de avaliar as condições de saúde do periciando/segurado, correlacionando-as com a existência de incapacidade laboral e, caso esta exista, definir objetivamente o grau dessa incapacidade e o tempo de afastamento pertinente ao quadro incapacitante, sempre relacionado com a atividade laborativa e a legislação própria.
          </p>
          <p>
            No caso da perícia médica previdenciária, o periciando/examinando é denominado "segurado".
          </p>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">
              O perito médico não examina o segurado com a finalidade de assisti-lo ou medicá-lo. O profissional imbuído da função pericial está a serviço de uma autoridade, de um ministério com uma legislação própria, e o ato pericial faz parte de um sistema que, se concessório, gerará benefícios pagos com a disponibilização de verbas públicas, do erário público.
            </mark>
          </p>
          <p>
            O perito médico não deve negar o que é legítimo e nem conceder o que não é devido e não é seu" (BRASIL, 1993).
          </p>
          <p>
            O profissional deve ter sedimentado que, para executar seu trabalho com probidade e correção, jamais poderá se esquecer dos três pilares que regem a perícia médica previdenciária: as alterações mórbidas, a doença; a atividade profissional/cargo/função laborativa; o enquadramento na legislação previdenciária pertinente e vigente à época do exame.
          </p>
          <p>
            Logo, é importante ressaltar que, no exercício pericial, o fato de existir doença não significa que exista incapacidade laborativa, necessidade de afastamento do trabalho e enquadramento no benefício pleiteado pelo segurado.
          </p>
        </div>

        {/* Secção: O Conflito e Estrutura Emocional */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">A posição conflituosa entre a atividade médico-pericial e a medicina assistencial: influência na estrutura emocional do perito médico</h2>
          <p>
            No dia a dia do perito médico não há como negar o conflito entre a atividade médico-pericial e a do médico assistente. Ambos são médicos, exercem nobilíssimas funções, mas estas divergem profundamente quanto às finalidades, objetivos e metas a cumprir.
          </p>
          <p>
            A perícia médica, com seus três pilares básicos e inflexíveis — a doença, a atividade laboral e a lei —, caminha por vezes em sentido contrário à visão médico-assistencial do ser ou estar incapaz, sem que nenhum dos dois lados esteja 'errado'. A diferença reside no objetivo do paciente ao procurar o médico assistente e no objetivo do segurado, que não o procura, porém, por força de lei, é obrigado a ser examinado por um médico perito para obter ou não o que requereu à Previdência Social.
          </p>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">
              A relação do paciente com o médico assistente é de confiança, lealdade, empatia e franqueza - desarmada e humanizada. O ideal comum, o objetivo, é o restabelecimento ou a manutenção da saúde. Este é o benefício-alvo: a prevenção, a cura ou a melhora do paciente.
            </mark>
          </p>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">
              A relação do segurado com o perito médico é de desconfiança, de defensiva, dissimulada, de antipatia. Não há caminho conjunto, não há ideal comum. O objetivo-alvo, o que o segurado deseja, não é a prevenção, a cura ou o restabelecimento da saúde, mas sim outras formas de benefício, com compensações socioeconômicas e laborais pertinentes ou não.
            </mark>
          </p>
          <p>
            A atuação médico-pericial exercida segundo o controle legal de uma autoridade central, no caso o INSS, caso admita a incapacidade do segurado, gerará benefícios pagos com a verba pública. Porém, caso discorde da incapacidade, pode gerar processos judiciais, trabalhistas ou recursos administrativos, entre outros meandros da lei.
          </p>
          <p>
            É de suma importância ressaltar que o perito médico não é o responsável pela concessão do benefício pleiteado pelo segurado. O exame médico-pericial e sua conclusão são apenas parte do processo concessório. Não nos esqueçamos do pilar legal a nortear se haverá concessão do benefício requerido.
          </p>
          <div className="border-l-4 border-navy pl-4 py-2 my-4 bg-gray-50/50 rounded-r-lg italic font-medium">
            "O perito 'não dá ou nega, ou corta ou tira o benefício', ele atesta, conclui, em seu laudo/parecer, se há ou não incapacidade do ponto de vista médico-pericial."
          </div>
          <p>
            O segurado, a grande maioria da população, a mídia e até muitos de nossos colegas médicos não sabem disso. Cria-se, então, uma situação perversa e maniqueísta expressa nas afirmações "o perito é mau e negou o benefício", "o perito é bom e deu o benefício". Como se do profissional dependesse todo o processo concessório... - o que está longe da realidade.
          </p>
          <p>
            No I Congresso de Perícia Médica Previdenciária, realizado em maio de 2007, em Salvador (BA), o vice-presidente da ANMP, Eduardo Henrique Rodrigues de Almeida, em sua palestra-debate no curso de Semiologia médico-pericial, destacou as diferenças marcantes entre a atuação médico-pericial e médico-assistencial no tema Técnicas de consulta em perícia:
          </p>
          <p className="pl-4 border-l-2 border-gray-300 italic text-gray-600">
            "Há uma situação conflitante e constrangedora entre a autoridade do médico assistente e do médico perito. Há uma linha de tensão perene, que necessita de normatização, de limites, de regras quanto à posição de cada profissional quanto aos atestado emitidos. Achamos que o CFM e os conselhos regionais podem nos ajudar muito a mediar a organizar e arrefecer estes conflitos através de maior entrosamento entre estes canais médico assistente/médico perito, em prol de maior harmonia e coesão" (ALMEIDA, 2007, p. 36).
          </p>
          <p>
            Reforçando com um exemplo prático quanto às interações e intermediações entre médicos, relato uma experiência bem interessante e produtiva ocorrida no primeiro semestre deste ano, em nossa Gerência (GEXNIT - Niterói, RJ). Em virtude da grave situação na área da Psiquiatria, quanto a atestados, desencontro de diagnósticos, diversidades de CIDs e outros problemas, a chefia da Gbenin realizou reuniões e palestras esclarecedoras sobre a função da perícia médica. Participei como psiquiatra da Gerência, e os colegas assistentes do Sistema Único de Saúde (SUS) da cidade de Niterói também compareceram, com grande representatividade e interesse, até mesmo cedendo espaço para os encontros.
          </p>
          <p>
            Os médicos assistentes também estavam ávidos por orientações, informações e esclarecimentos de dúvidas sobre a conduta médico-pericial e nossos conceitos de invalidez, de incapacidade. Entretanto, à medida que tudo ia sendo explicitado, as coisas tomavam uma posição de equilíbrio. Achei interessante, do ponto de vista humano e de solidariedade aos colegas assistentes, saber que também são pressionados emocional e afetivamente, bem como ameaçados e constrangidos por "pacientes segurados" que querem os atestados, solicitando que o assistente coloque CIDs que "sabem que 'darão' o benefício!".
          </p>
          <p>
            Os colegas assistentes também tinham muitas histórias desagradáveis para contar. Após esses encontros, senti significativa melhora na relação entre os psiquiatras assistentes de Niterói e os peritos de nossa Gerência.
          </p>
          <p>
            Em outra ocasião, abril de 2007, participei de reunião com a Gerência Caxias, onde se encontravam psiquiatras do SUS, chefes de Caps, de ambulatórios, ONGs, representantes do Ministério da Saúde e do Ministério Público, enfim, um encontro multidisciplinar, com ótimo proveito para todos. Fica aqui o relato dessas experiências e a sugestão de que este entrosamento se amplie.
          </p>
          <p>
            Contamos, também, para futuros projetos, com o CFM, que teve bela participação em nosso congresso último, já citado, na pessoa de seu presidente, Edson Andrade, cuja palestra consta da revista da ANMP, ano I, nº 2, p. 8. Esperamos que cada conselho regional apoie a categoria médica em prol de uma classe unida e com ideais comuns, do bem-estar da população e de nossa valorização como profissionais da medicina, independente das especialidades exercidas.
          </p>
        </div>

        {/* Secção: Perícia Previdenciária Carreira de Risco */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Perícia médica previdenciária: uma carreira de risco</h2>
          <p>
            Por tudo o que até agora vimos, o perito médico previdenciário, em sua rotina, há que ter um equilíbrio psíquico invejável e serenidade a toda prova. Há que ser corajoso e determinado, caso contrário, com certeza, não suportará os riscos que a cada dia se avolumam num crescendo. Rotineiramente, há segurados descontentes com o não reconhecimento de sua incapacidade, ou com seus pleitos negados por força da lei. As pressões são imensas e somos agredidos verbal, moral e fisicamente, com frequência assustadora.
          </p>
          <p>Como frases-chavão publicáveis, cito algumas que, com certeza, a maioria dos peritos médicos certamente já ouviu:</p>
          <ul className="list-disc pl-5 space-y-2 italic text-gray-600">
            <li>"Então, o senhor está dizendo que meu médico não sabe nada??!! Meu doutor dá aula e trabalha na faculdade tal, e o senhor?"</li>
            <li>"Vou contar para o meu médico que o senhor disse que eu estou bom!"</li>
            <li>"Então o atestado que eu trouxe pedindo minha aposentadoria não vale nada? Ah!, vou ao conselho! Vou processar o senhor."</li>
            <li>"Meu doutor pediu seis meses de licença, e o senhor me dá um mês? Vou ao conselho, vou processar o senhor."</li>
            <li>"A senhora é o quê? É médica mesmo? Chama um doutor aí!"</li>
            <li>"Se o senhor me tirar o benefício não tenho nada para perder, aí nós vamos 'acertar' depois."</li>
            <li>"Moça, você nem médica é... é perita, não é? Não sabe nada mesmo, só serve pra dar alta na gente."</li>
            <li>"Estou recorrendo porque o perito é muito mau e me deu alta."</li>
            <li>"Olha, se eu não ganhar o benefício, sua vida não vale mais nada, viu?"</li>
          </ul>
          <p className="mt-4">
            Parece cômico, mas é trágico. O perito médico previdenciário é a todo momento agredido em sua moral, autoestima, brios — sem contar as agressões físicas e ameaças de morte, concretizadas ou tentadas, cada vez mais rotineiras em nosso exercício médico-pericial.
          </p>
          <p>
            Independente da vocação, perfil, atributos e qualidades é óbvio que o perito médico previdenciário trabalha em carga de estresse máximo, inseguro e intranquilo. Destaque-se que a segurança é a mola-mestra para o exercício da atividade pericial. É essencial para o bom andamento do exercício desta função que, urgentemente, a perícia médica previdenciária seja tratada como uma carreira de risco, inerente ao exercício da profissão, com sistemas de segurança modernos e eficazes.
          </p>
        </div>

        {/* Secção: Fatores Externos */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Fatores externos à atividade médico-pericial que influem negativamente na estrutura psíquica e laboral do perito médico</h2>
          <p>Além do estresse e riscos inerentes ao exercício da atividade médico-pericial, o perito médico, em sua rotina, se vê ainda mais pressionado por fatores externos, tais como:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>ausência de informação quanto à sua real função à população, de forma clara e elucidativa, o que gera, em parte, as condutas hostis a que nos reportamos;</li>
            <li>ausência de informação e educação populacional quanto aos deveres a cumprir com a Previdência Social para, então, ter acesso aos direitos que vem reivindicar.</li>
          </ul>
          <p>
            Alie-se a tais problemas a crença de parte da população de que a previdência é ótimo negócio no sentido do "emprego complementar", ou seja, a cultura do "vou me encostar no INSS", "vou pegar o benefício para completar minha renda"; ou simplesmente que vejam o benefício previdenciário como um "salário, um emprego".
          </p>
          <p>
            Essa mentalidade gera os simuladores, as situações fraudulentas, fazendo com que o perito se veja, além de suas atribuições, premido a atuar com desconfiança extrema e espírito policialesco, no temor de ser enganado, no zelo de seu perfil, íntegro e leal, por esse tipo de 'clientela' que ainda, infelizmente, é muito expressiva em nosso trabalho.
          </p>
          <p>
            São também fatores negativos o fato de conviver diariamente com situações médico-periciais que poderiam ser concluídas e resolvidas, mas não o são, por falhas/deficiências do SUS. Ora são exames que levam meses para ficar prontos (isso quando é possível fazê-los, como uma ressonância magnética, por exemplo), ora são cirurgias 'eternamente adiadas' por falta de vagas e que devolveriam o segurado ao trabalho; outras vezes, a falta deste ou daquele especialista, não permitindo que o segurado se trate convenientemente e, não sendo culpa deste, a não melhora, a estagnação do quadro mórbido, repercutindo na manutenção de benefícios que poderiam ser curtos e resolutivos.
          </p>
          <p>
            Como podemos concluir, o perito médico deverá usar, no exercício de sua atividade, os seus atributos máximos de bom-senso, justiça, poder decisório e resolutivo, iniciativa e conhecimento técnico e legal apurado para lidar não apenas com os problemas inerentes ao seu desempenho, mas também com os fatores exteriores que muito prejudicam o bom andamento de seu trabalho, além de contribuir para um desgaste psicológico e moral que se soma ao do exercício da função em si.
          </p>
        </div>

        {/* Secção: Linguagem Corporal */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Linguagem corporal e expressão do perito médico</h2>
          <p>
            No I Congresso de Perícia Médica Previdenciária, quando palestrei e debati com o ilustre professor e psiquiatra forense José Geraldo Taborda e com Everson Buchi, nobre colega perito médico, sobre como identificar os simuladores, vários colegas solicitaram que posteriormente eu falasse acerca do quanto a expressão e comunicação não verbal podem influir em nossa imagem e até provocar ou evitar agressões, ofensas e outras situações inerentes à relação humana.
          </p>
          <p>
            Assim como o paciente/periciando/segurado/vítima/réu/autor tem uma 'linguagem própria', que no decorrer dos anos de experiência aprendemos a 'traduzir', também a temos e acho interessante, para todas as áreas periciais e médicos de forma geral, falar algo sobre o assunto.
          </p>
          <p>
            O grande médico e escritor Pedro Nava dizia que "o bom médico é um sujeito indiscreto, que com o olhar vive a abrir a 'correspondência' alheia". Como peritos e médicos, já vimos o quanto nosso perfil tem de ser sereno, impassível, isento e fleumático. Não é de bom alvitre que o periciando, com o olhar, "abra a nossa correspondência".
          </p>
          <p>
            Devemos, mesmo com o emocional 'gritando' dentro de nós - seja pela compaixão, amor ao próximo, indignação ou revolta -, manter o equilíbrio e uma postura exterior imparcial e isenta. Diria que isso abrange o exercício da medicina como um todo, diante dos quadros tristes, de desespero, dor e sofrimento com os quais o médico se deparam diariamente. Não à toa somos proibidos de tratar de nossa parentela próxima ou periciar parentes ou amigos.
          </p>
          <p>
            O ser humano tem seu mundo interno, inexpugnável, seu "eu interior", com base, sobretudo, em três funções do seu psiquismo: o humor, a memória e o pensamento. Só você, querido colega que lê estas linhas, sabe como 'está por dentro', como está seu humor. Só você sabe o que pensa e de que forma, com que sentimento, registrou na memória as situações até agora vividas.
          </p>
          <p>
            Este ego, este "eu externo", podemos 'manipular, maquiar', e, mesmo que internamente estejamos desequilibrados em nossas emoções, podemos, por necessidade, no caso do médico, dissimular certas emoções que só nos levarão a conflitos e situações de perigo, fragilidade ou constrangimento diante do periciando e do paciente.
          </p>
          <p>
            Para ilustrar como este domínio emocional é importante conto a breve história de um familiar que passava por grande depressão. Por ser parente, o encaminhei a um colega para tratamento psiquiátrico. Quando meu familiar retornou, estava bem pior do que quando saiu. Revelou que o doutor era maravilhoso, humano, mas "tanto, tanto" que, no meio de seus relatos depressivos, confidenciou que também passava por situação similar. Abraçou-o, chorando e lastimando a triste situação em que ambos se encontravam...
          </p>
          <p>
            Não preciso contar a trabalheira que deu para consertar tão grave 'estrago'. Ouvi do familiar: "Ora, se este médico está 'igual a mim' e 'atende' tão bem, até chorou comigo e tudo, para que vou me tratar?". Sabemos, por exemplo, que como médicos psiquiatras, e no exercício da psicoterapia, não devemos tratar casos onde tenhamos dramas e traumas pessoais não resolvidos, pois há o processo de transferência que foi o que aconteceu na 'desastrosa consulta' que lhes relatei.
          </p>
          <p>
            Os profissionais das áreas de saúde e segurança (médicos, bombeiros, policiais etc.) têm de aprender a treinar o controle da emoção e dos sentimentos. São profissões estressantes, que lidam com violência, mortes, catástrofes, sofrimentos físico, social e moral, rejeição afetiva, antipatia, incompreensão populacional e da mídia e os médicos peritos estão enquadrados neste perfil.
          </p>
          <p>
            O médico perito deve ter cuidado não apenas com o que fala, mas como fala e com a entonação da voz. A rispidez, a agressividade velada, a ironia e a impaciência são sentimentos que não devemos demonstrar mesmo ante os casos que detectamos como indevidos, fraudados ou simulados, comuns nas perícias previdenciária, securitária, criminal, legal.
          </p>
          <p>
            Nas perícias legal e criminal os exames para avaliação de sanidade mental em criminosos psicopatas - que nada têm de doença mental, mas a simulam - são de tirar o profissional do equilíbrio. Muitos dos exames de corpo de delito, em vítimas, geram pena e compaixão intensa. É preciso ter realmente o controle emocional que o ego exterioriza, embora o eu interior sinta e vibre de forma diversa. Dirão alguns: mas isso é neurotizante! e quem disse que não o é? Por isso, devemos treinar técnicas de controle mental para o exercício de trabalho tão desgastante sob o ponto de vista emocional.
          </p>
          <p>
            O corpo fala, e como! O periciando/segurado/réu/vítima/autor observa se você está trêmulo, se apresenta sudorese profusa, especialmente nas mãos e rosto, súbito rubor nas faces, pernas inquietas, agitação na cadeira, muxoxos, caretas, expressão facial contraída, suspiros, enfim, sinais que a eles não passam despercebidos, e o pior: quem mais atenta para os mesmos não são as pessoas de bem, mas sim os fraudadores, os simuladores, os especialistas em mentir, enganar.
          </p>
          <p>
            Eles adoram nos 'provocar', querem exames rápidos, tumultuados, nervosos, com irritação, confusão... Contudo, nada desconcerta mais um simulador do que a nossa 'aparente' fleuma, impassibilidade, a expressão corporal e facial neutra — postura importantíssima no perfil do perito médico de qualquer área.
          </p>
          <p>
            A conduta fria e impassível, de forma geral, e o distanciamento psíquico diante da provocação também desestimulam a agressão física. Os agressores, em geral, desencorajam-se diante de uma postura 'aparentemente' firme, calma, conciliadora. Mostrar medo, raiva, irritação ou indignação, de forma objetiva e confrontadora, é estímulo à agressão, particularmente a física.
          </p>
          <p>
            Não quero com este texto pedir aos colegas médicos de todas as áreas de atuação que se tornem 'monges tibetanos', mas podem acreditar que essas despretensiosas linhas são baseadas em estudos profundos e comprovados por mestres do comportamento humano, como Pierre Weil, Roland Tompakow, Cristophe Dejours, Ana Cristina França, elencados na bibliografia.
          </p>
        </div>

        {/* Secção: Adaptação do Novo Perito */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Problemas na adaptação do novo perito médico previdenciário</h2>
          <p>
            Nos últimos meses, até julho de 2007, mais de trinta médicos deixaram o quadro do INSS, a grande maioria constituída de médicos novos no sistema. Desde 2005, o número de médicos que abandonaram a perícia previdenciária após aprovação em concurso já excede 200 profissionais (ARGOLO, 2007, p. 43).
          </p>
          <p>
            Não podemos, atribuir esta demanda apenas à insegurança que ronda a atividade médico-pericial. Os que tiveram a gentileza e paciência de ler este capítulo constatarão que procurei traçar um perfil do que é ser um médico perito, o que é imbuir-se e integrar-se à missão que, como vimos, não é fácil nem leve.
          </p>
          <p>
            Se não temos a perícia como especialidade médica nas matérias curriculares, o médico já formado e especializado em alguma área da medicina resolve prestar concurso e ser um perito médico, mas desconhece os atributos essenciais ao entrosamento e adaptação à carreira pericial.
          </p>
          <p>
            Acredito que a criação de uma Diretoria de Perícias Médicas ordenaria melhor as atividades médico-periciais com base em nosso conhecimento técnico, experiência, perfil psicológico para o trato direto com o médico, com uma estrutura organizacional voltada ao perito médico, evitando que este, após o ingresso e treinamento, venha a desistir de suas funções.
          </p>
        </div>

        {/* Secção: Repercussão na saúde */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">O perfil do perito médico e a repercussão da atividade em sua saúde</h2>
          <p>
            O perito médico trabalha em atividade de estresse permanente, seja pela insegurança nos locais de trabalho, seja pela atividade incompreendida e antipatizada, pela falta de retorno afetivo e emocional no exercício da função, por ter que equilibrar seu lado assistencialista e humanista com a frieza e rigidez dos dispositivos legais aos quais tem de obedecer e acatar, muitas das vezes penalizado e sofrendo com a situação social do periciando, porém respeitando os pilares laborais e legais que complementam a atividade e tendo de negar aquilo que não é devido e não nos pertence a alguém que não tem por lei o direito de obter o requerido.
          </p>
          <p>
            É comum a este tipo de perfil profissional o sofrimento de determinadas doenças agravadas pelo estresse crônico. Hipertensão arterial descompensada, distúrbios do sono, gastrites, enxaqueca, ansiedade com irritabilidade e dores crônicas, em geral tensionais, osteoarticulares e musculares são bastante frequentes.
          </p>
          <p>
            Em médicos legistas, quando exerci minhas funções periciais como psiquiatra da Perícia do Estado do Rio de Janeiro, atendi casos de síndrome do pânico e depressão com condutas de isolamento, desmotivação, evitação.
          </p>
          <p>
            Em qualquer profissão/função com perfil muito estressante e sem retorno emocional e afetivo é sempre bom falar sobre a síndrome de burnout, síndrome do desgaste profissional, da queima de todo o potencial energético e motivador para o exercício da função. O interessante a destacar é que o profissional se vai tornando negligente, relapso, faltoso, desinteressado. Defende-se psiquicamente do desgaste com o afastamento, a frieza emocional e laboral que, numa área como a pericial, obviamente terá repercussões bastante severas para si e para o trabalho como um todo. Em geral, esta frieza no trato humano se manifesta com ironia, deboche, arrogância no trato com os colegas, os administrativos e o periciando. Se este profissional tiver tendências compulsivas, provavelmente as seguirá, sendo comum o excesso no tabagismo e álcool.
          </p>
          <p>
            A síndrome de burnout decorre da decepção, da desilusão, do desgaste com a área profissional abraçada. Quem a adquire é o bom profissional que se queimou, desgastou até o extremo. Nos países de Primeiro Mundo esta entidade nosológica é muito relevante nas empresas, pois em quantidade significativa é sinal de que a empresa vai mal.
          </p>
          <p>
            No Brasil, começa-se a dar o valor devido a este quadro, que transforma profissionais produtivos e capazes em negligentes e relapsos. Não conheço estatísticas nas atividades médico-periciais desta doença para mensurá-la, mas fica o alerta para que um caso de burnout possa ser identificado e tratado quando se apresente.
          </p>
        </div>

        {/* Secção: Qualidade de Vida */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Qualidade de vida para o perito médico</h2>
          <p>Apesar de todas as nuances, complexidades e dificuldades relacionadas no decorrer deste capítulo, como pontos a serem considerados para a vocação médico-pericial para o perfil do perito médico, creio que várias medidas podem ser tomadas para que esta atividade, bela, instigante e desafiadora possa ser exercida de forma mais suave, mais humana e amena para o médico que, mesmo gostando de sua função e bem adaptado a ela, sofre com carências e deficiências não de seu perfil, mas institucionais e que podem ser saneadas em prol da diminuição do estresse e aumento da autoestima do perito médico.</p>
          <p>Tais medidas poderiam ser:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>condições de segurança nos locais de trabalho, permitindo que o perito trabalhe com tranquilidade, confiança e, consequentemente, com índices reduzidos de estresse;</li>
            <li>condições ambientais, desde o mobiliário até os materiais, equipamentos e insumos necessários a cada área de atuação médico-pericial o que aumenta a autoestima, o moral da equipe e evita doenças ocupacionais;</li>
            <li>condições salariais dignas que permitam ao perito a paz de espírito e tranquilidade pessoal e material para dedicação máxima à função exercida;</li>
            <li>treinamentos, capacitações e atualizações constantes fornecidas pelas próprias instituições em que o perito exerça sua atividades;</li>
            <li>no caso específico da perícia médica previdenciária, campanhas amplas de esclarecimento à população acerca do papel do perito médico;</li>
            <li>uniformização das condutas médico-periciais mediante diretrizes e bases criadas por peritos médicos que contribuam com sua experiência e motivação.</li>
          </ul>
        </div>

        {/* Secção: Mensagem */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Mensagem</h2>
          <p>Por derradeiro, desejo aos colegas médicos peritos e à classe médica de forma geral que sejamos cada vez mais unidos e presentes em nossas lutas de classe por qualidade de vida e valorização não só da perícia médica mas da medicina como um todo.</p>
          <p>Espero que nesses novos tempos, nesse novo século ao qual chegamos, nada embace o orgulho de sermos médicos. Tenhamos esperança e confiança em dias melhores. Que as dificuldades e injustiças sofridas por nossa classe sejam molas propulsoras para prosseguirmos em nossa jornada, árdua, espinhosa, porém iluminada por nossa vocação, pelo ideal que nos guiará sempre no exercício honroso e sacerdotal da profissão querida!</p>
          <p className="font-bold text-center text-[#050F41] mt-4 uppercase">Acima de tudo, somos médicos, sempre!</p>
        </div>

        {/* Secção: Referências (Concisa) */}
        <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 shadow-inner space-y-2 font-body text-[11px] text-gray-500 leading-relaxed text-left">
          <h3 className="font-heading font-bold uppercase mb-2 text-gray-700">Referências Bibliográficas</h3>
          <p>ALMEIDA, E. H. Técnicas de consulta em perícia. In: CONGRESSO BRASILEIRO DE PERÍCIA MÉDICA PREVIDENCIÁRIA, Palestra-debate do Curso de Semiologia Médica, p. 36, maio de 2007.</p>
          <p>ANMP EM FOCO. Revista da Associação dos Médicos Peritos da Previdência Social, Ano I, nº 2, ago. 2007.</p>
          <p>ARGOLO, L. C. A luta pela diretoria de perícias médicas. Revista da Associação dos Médicos Peritos da Previdência Social, Ano 1, nº 2, p. 42-3, ago. 2007.</p>
          <p>BRASIL. Ministério da Previdência e Assistência Social. INSS. Manual do médico perito da previdência social. 3ª ed. Brasília: MPAS, 1993.</p>
          <p>DEJOURS, C. A loucura do trabalho, estudo da psicopatologia do trabalho. 5ª ed. São Paulo: Oboré, 1992.</p>
          <p>FRANÇA, A. C.; RODRIGUES, L. A. Stress e trabalho, uma abordagem psicossomática. 2ª ed. São Paulo: Atlas, 1999.</p>
          <p>TABORDA, J. G. Simulação: só os fracassados são estudados. In: I CONGRESSO BRASILEIRO DE PERÍCIA MÉDICA PREVIDENCIÁRIA, maio de 2007.</p>
          <p>WEIL, P., TOMPAKOW, R. O corpo fala. 50ª ed. Petrópolis: Vozes, 2000.</p>
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
