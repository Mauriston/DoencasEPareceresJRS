// Ficheiro: components/ArtigoPericiaAdministrativa.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ArtigoPericiaAdministrativa: React.FC<Props> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Documentação: Observador de scroll para mostrar/esconder o botão flutuante de voltar ao topo
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
        title="PERÍCIA MÉDICA ADMINISTRATIVA" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-6 max-w-3xl mx-auto w-full flex-1 pb-32">
        {/* Bloco Título e Autores */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm text-center">
          <h1 className="text-xl font-heading font-bold text-[#050F41] mb-4 uppercase">Perícia Médica Administrativa</h1>
          <div className="bg-gray-50 rounded-xl p-4 inline-block text-left text-xs text-gray-600 font-body space-y-1.5 border border-gray-100">
            <p><strong>Sonia Maria Rodrigues de Andrade:</strong> Pós-graduada em Gestão em Saúde – Administração e Organização Hospitalar pela Universidade do Estado do Rio de Janeiro. Graduada em 1977 pela UniRio, antiga Escola de Medicina e Cirurgia do Rio de Janeiro. Médica do Trabalho. Perita judicial. Médica perita da Secretaria Municipal de Administração do Rio de Janeiro. Membro efetivo da Câmara Técnica de Perícias Médicas do Conselho Regional de Medicina do Estado do Rio de Janeiro. Membro honorário da Sociedade Brasileira de Perícias Médicas. Professora nos cursos de especialização em Perícia Médica da Fundação Unimed e de Direito Médico da UERJ. Consultora e assistente técnico em empresas privadas.</p>
          </div>
        </div>

        {/* Secção: Conceitos */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Conceitos</h2>
          <p>
            Para que se entenda a abrangência da perícia administrativa, é importante ter uma noção geral da importância da perícia médica como um todo. <del>Embora ainda não reconhecida como especialidade pelo Conselho Federal de Medicina,</del> alguns dos conselhos regionais já têm em seus quadros de câmaras técnicas uma câmara específica para estudar os casos relacionados à perícia médica separadamente dos de Medicina do Trabalho e de Medicina Legal, por entenderem sua especificidade em relação a estas e por ser tamanha a demanda nessa área. São os casos do Rio de Janeiro e do Distrito Federal.
          </p>
          <p>
            Na perícia médica destacam-se as áreas previdenciária, trabalhista, legal, judicial e administrativa. Esta última, foco central de nossa abordagem, destina-se ao servidor público civil e militar. Portanto, servidores estatutários, regidos por seus próprios estatutos, avaliados quanto à capacidade laborativa mediante exame pericial pelo órgão competente.
          </p>
          <p>
            O atual aprimoramento da gestão e administração de pessoal no serviço público fez com que a perícia médica administrativa despontasse como ferramenta imprescindível para o equilíbrio social e financeiro das instituições. Por conta disso, vem-se percebendo crescente progresso no que diz respeito à capacitação de profissionais e à valorização da atuação desta área junto aos mais diversos órgãos do poder público.
          </p>
          <p>
            Impossível falar de perícia médica administrativa sem abordar a noção de previdência. Esta nada mais é do que um seguro que prevê um sistema de proteção social, assegurando o sustento do trabalhador e de sua família, compensando a alteração ou a perda da capacidade de ganho pelo trabalho por motivo de doença, acidente, gravidez, prisão, morte ou velhice.
          </p>
          <p>
            A Previdência Social, de modo geral, compreende o Regime Geral de Seguridade Social e os regimes próprios de previdência dos servidores públicos. Diferentemente regulamentadas, diversas são as legislações que ditam os regimes de previdência, desde o Regime Geral de Previdência Social (INSS), Regime Jurídico Único (servidores federais), estatutos dos servidores estaduais e municipais até o Regulamento da Lei do Serviço Militar (RLSM).
          </p>
          <p>
            Como todo trabalhador, do servidor público é descontado em seus vencimentos um percentual destinado ao órgão de previdência próprio, cuja finalidade é justamente garantir uma série de direitos e benefícios previstos em lei, entre eles aqueles que envolvem aposentadoria por invalidez, licença para tratamento do próprio servidor e seus dependentes, licença-maternidade e aleitamento (em alguns órgãos), licença médica por acidente de trabalho, entre outros.
          </p>
          <p>
            Para que seja legitimado o ato executivo e/ou administrativo de concessão de qualquer benefício ou direito relacionado à saúde ou doença, é necessário que haja uma avaliação técnica do médico perito no caso, que irá concluir sobre a pertinência ou não da concessão. Portanto, podemos definir a perícia médica como <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">ato médico que tem por finalidade informar, esclarecer e amparar alguma autoridade sobre fato específico de sua área de atuação, em prol da Justiça e da administração pública</mark>, mediante o exame direto ou indireto dos fatos, enquadrando-os de acordo com a legislação adequada.
          </p>
        </div>

        {/* Secção: Funções do Perito */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <p>Este profissional da Medicina, legalmente habilitado, tem funções específicas que o diferenciam diametralmente do médico assistente, embora, logicamente, com algumas semelhanças básicas. Dentre as funções do médico perito administrativo, podemos citar:</p>
          
          <ul className="list-disc pl-5 space-y-3">
            <li>
              <strong>Comprovar a situação alegada:</strong> o médico tem de ter provas do que está sendo relatado como fato. Muitas vezes, deverá concluir seu parecer sem levar em conta as informações prestadas pelo examinado. O perito tem que ter em mente que o examinado não se trata de paciente e, sim, de servidor, que ali está em busca de algum ganho. Ao receber as informações haverá necessidade de provas da ocorrência da incapacidade laborativa, não bastando apenas que o servidor relate sintomas se estes não puderem ser respaldados clinicamente mediante exame físico ou complementar. Isto significa que ‘a prova’ tem que ser apresentada por quem busca o benefício;
            </li>
            <li>
              <strong>Caracterizar o estado de saúde ou doença:</strong> note-se que não estamos falando em firmar diagnóstico para estabelecer um tratamento. O perito caracteriza o estado de higidez ou não do servidor, seja para admiti-lo no serviço público quando apto, seja para afastá-lo do trabalho quando incapaz. Portanto, mais importante que atestar um diagnóstico, o perito tem que avaliar se o estado de saúde permite a permanência no trabalho ou exige o afastamento deste;
            </li>
            <li>
              <strong>Definir a incompatibilidade da doença com a atividade a ser exercida pelo servidor:</strong> o perito deve ter em mente o perfil profissiográfico do servidor, conhecendo todas as atividades a que estará exposto no exercício do cargo. Dessa forma, poderá avaliar sua capacidade ou não para realizar estas funções. Estamos, portanto, diante da mesma doença, com conclusões periciais diferentes, por conta da análise das atividades do servidor;
            </li>
            <li>
              <strong>Respeitar a boa técnica médica:</strong> o perito tem o compromisso de examinar e avaliar todos os dados que lhe são apresentados, utilizando-os para fundamentar sua conclusão pelo deferimento ou não do pleito;
            </li>
            <li>
              <strong>Cumprir a disciplina legal e administrativa:</strong> no caso da perícia administrativa é fundamental que o médico perito esteja familiarizado com o Estatuto dos Servidores, a Lei Orgânica, pareceres da Procuradoria e todas as normas e regulamentos vigentes;
            </li>
            <li>
              <strong>Concluir pela concessão ou não do benefício:</strong> esta não só é uma de suas funções, mas a principal finalidade do médico perito administrativo. Diante de sua conclusão, serão legitimados os atos do Executivo perante os órgãos de Previdência, tribunais de contas e controladorias, assim como servirá de amparo à Procuradoria nos casos de demandas judiciais contra o Estado.
            </li>
          </ul>

          <p className="mt-4">
            Este profissional, com funções tão diferenciadas, necessita ter um perfil característico, devendo para isso contar com sólido conhecimento clínico para concluir, como dito, muitas vezes sem contar com a colaboração do examinando, ter conhecimento das bases legais e éticas, firmeza para transmitir sua conclusão e serenidade para não se deixar envolver por pressões externas ou fatores extradoença. Frase comumente citada nos livros de perícia médica diz <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">“o perito deve conceder o que é legítimo e de direito, e negar o que é indevido”</mark>.
          </p>
        </div>

        {/* Secção: Terminologia e Tabela */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Terminologia</h2>
          <p>
            Existem alguns termos que precisam estar bem claros no entendimento do perito, pois serão habitualmente utilizados nas conclusions periciais. Com finalidade didática, exemplificamos no quadro a seguir tal terminologia:
          </p>

          <table className="w-full max-w-sm mx-auto text-center border-collapse border border-gray-200 rounded-lg overflow-hidden mt-4 mb-6 shadow-sm">
            <thead className="bg-gray-50 text-[#050F41] font-bold text-sm uppercase font-heading">
              <tr>
                <th colSpan={2} className="border border-gray-200 p-3">Incapacidade para o trabalho</th>
              </tr>
            </thead>
            <tbody className="text-sm font-body">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="border border-gray-200 p-3 font-semibold text-gray-700 text-left">Quanto ao critério de tempo</td>
                <td className="border border-gray-200 p-3 text-gray-600">Temporária<br/>Permanente</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="border border-gray-200 p-3 font-semibold text-gray-700 text-left">Quanto ao critério de grau</td>
                <td className="border border-gray-200 p-3 text-gray-600"><del className="text-gray-400">Relativa</del><br/>Total<br/><span className="font-bold text-[#050F41]">Parcial</span></td>
              </tr>
            </tbody>
          </table>

          <p>
            Combinando os fatores anteriores, podemos entender que a incapacidade temporária e total irá gerar uma licença médica para tratamento de saúde. Teremos, neste caso, o servidor que não tem capacidade para o exercício de qualquer atividade por tempo determinado ou, pelo menos, com previsão de retorno por recuperação do seu estado de saúde.
          </p>
          <p>
            A incapacidade temporária e relativa, entretanto, permite que o servidor exerça algumas atividades do cargo, impossibilitando-o apenas para algumas outras. Neste caso, estaremos falando da readaptação funcional, pois não há necessidade de um afastamento total do trabalho, mas sim de uma adequação para que sejam realizadas apenas as tarefas compatíveis com o estado de saúde do servidor.
          </p>
          <p>
            O mesmo tipo de raciocínio deve ser empregado na incapacidade permanente. Diante de um caso em que seja concluído pela incapacidade permanente e total, teremos a definição de uma aposentadoria, com caracterização da invalidez para toda e qualquer atividade (total) de forma definitiva (permanente). Quando de incapacidade para o trabalho permanente e relativa, deve-se pensar na readaptação permanente, prevista em algumas legislações, tratada pela perícia previdenciária como reabilitação profissional.
          </p>
          <p>
            No caso da Previdência Social, o trabalhador de fato assume outro tipo de trabalho por força da reabilitação, passando a exercer muitas vezes atividades totalmente diferentes das anteriores. No caso do servidor estatutário, concursado, uma vez nomeado em cargo público, não pode haver mudança do cargo propriamente dito, cabendo ao órgão de perícia sinalizar para o administrador quais as possibilidades de aproveitamento dentro das funções inerentes ao cargo do servidor.
          </p>
        </div>

        {/* Secção: Atuação do órgão médico-pericial */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Atuação do órgão médico-pericial</h2>
          <p>
            O órgão pericial responde pela avaliação para concessão de licença médica, readaptação funcional, aposentadoria por invalidez, benefícios como redução de carga horária e salário-família especial, isenção de imposto de renda, admissão dos servidores estatutários, inclusão do portador de deficiências para concorrer a vagas especiais em concurso público, pensão para dependente inválido, entre outros benefícios.
          </p>
          <p>
            Nota-se que este escopo da atividade pericial é muito ampla e, por seu caráter basicamente administrativo, a maioria dos órgãos de perícia médica é vinculada às secretarias de Administração, já que estas são responsáveis pelo controle de pessoal e obtêm junto à perícia médica o registro e controle do absenteísmo ligado à doença, bem como o remanejamento de pessoal motivado por limitações de saúde e o amparo técnico para a concessão de benefícios gerados por deficiências ou doenças.
          </p>
          <p>
            A perícia administrativa faz interfaces com todas as demais secretarias, a Procuradoria da União, do estado ou do município, órgãos de Previdência, Ministério da Fazenda, órgãos securitários e Poder Judiciário, atuando como verdadeiro instrumento de paz social, pois garante o amparo legítimo ao beneficiário realmente incapacitado, sendo ferramenta no controle para despesas evitáveis e decorrentes de pressões extradoença, que podem colocar em risco o equilíbrio das instituições e do erário público.
          </p>
        </div>

        {/* Secção: Critérios técnicos de avaliação */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Critérios técnicos de avaliação para licença médica</h2>
          <p>
            A licença médica pode ser concedida para tratamento de saúde do próprio servidor, para que preste assistência à pessoa da família, por acidente de trabalho, devido à maternidade e para aleitamento, em algumas legislações.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Tratamento de saúde do próprio servidor</h3>
          <p>
            É a licença concedida ao servidor público acometido por patologia que o incapacite totalmente para o exercício de suas funções, por determinado período. O prazo de licença levará em conta o cargo do servidor, o tipo e o grau da doença apresentada.
          </p>
          <p>
            Existem algumas tabelas que relacionam os tipos de patologia com uma estimativa do tempo de afastamento. Entretanto, é muito importante que o perito tenha autonomia para avaliar cada caso em especial, lembrando-se de que não se trata apenas de caracterizar a doença, mas, particularmente, sua relação com o trabalho. A conclusão quanto à incapacidade para o trabalho exige que o perito verifique no servidor os sinais da patologia referida e que avalie os sintomas relatados.
          </p>
          <p>
            É importante ressaltar que a negativa ou a concessão de uma licença deverão estar sempre embasadas num exame físico acurado, direcionado para as queixas do periciando, levando em conta o tipo de atividade por ele exercida, pois o que se está atestando é a capacidade ou não para o trabalho e não simplesmente a presença ou não de doença. Na visão da perícia administrativa, e também da previdenciária, <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">ninguém é afastado do trabalho para tratamento de saúde porque está doente, mas sim porque está incapaz</mark>.
          </p>
          <p>
            Surge aí um impasse muito discutido: a questão da divergência entre o atestado do médico assistente e a conclusão do médico perito. De acordo com o Código de Ética Médica, o atestado médico deve traduzir o ato profissional realizado, correspondendo à verdade (art. 80), sendo obrigatória sua emissão, sempre que solicitado pelo paciente (art.112). Existem diversos pareceres e resoluções do CFM que ressaltam a autonomia de o perito decidir quanto aos meios necessários para seu convencimento, além do que é exigido, pelas diversas legislações, que o atestado do médico assistente seja homologado pelo perito para que produza efeitos administrativos. Portanto, o perito não estará negando o atestado do médico assistente, ele simplesmente tem a liberdade para um entendimento divergente quanto à capacidade laboral do periciado, não configurando ilícito ético tal divergência.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Assistência à pessoa da família doente</h3>
          <p>
            De acordo com a legislação, é necessário que o servidor prove ser indispensável sua assistência pessoal à pessoa da família doente e que esta assistência não pode ser prestada simultaneamente com o exercício do cargo.
          </p>
          <p>
            O exame pericial deve evidenciar a necessidade da assistência do servidor ao dependente. Quanto ao tempo da concessão, não há relação direta com o período total de doença ou incapacidade do familiar. A licença será concedida apenas durante os dias em que for indispensável a assistência pessoal do servidor.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Por acidente de trabalho</h3>
          <p>
            É o evento que ocorre pelo exercício do trabalho, ou a serviço da instituição, provocando lesão corporal ou perturbação funcional que cause a morte ou a perda/redução temporária/permanente da capacidade laborativa. Não são consideradas como acidente de trabalho ou doença ocupacional as doenças inerentes a grupos etários e as doenças degenerativas.
          </p>
          <p>
            O preenchimento da notificação de acidente de trabalho (NAT) permitirá a caracterização do nexo administrativo do acidente de trabalho. Além da NAT, o servidor deve apresentar todos os documentos de que dispuser para comprovar seu atendimento médico ou mesmo outros tipos de registros, como boletim de ocorrência policial, registro hospitalar etc., para caracterização do nexo causal. É necessário que haja inspeção médico-pericial no intuito de constatar a incapacidade laboral e licenciar o funcionário pelo tempo necessário.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Licença-maternidade e Aleitamento</h3>
          <p>
            Trata-se de direito constitucional e é concedida à servidora gestante a partir do oitavo mês de gravidez. É imprescindível a inspeção médico-pericial.
          </p>
          <p>
            Algumas legislações contemplam a licença-aleitamento, na qual o objeto da perícia é o lactente e, portanto, é imprescindível sua presença no exame médico-pericial. Não são todos os estados e municípios que concedem esta licença.
          </p>
        </div>

        {/* Secção: Readaptação e Aposentadoria */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Readaptação e Aposentadoria</h2>
          
          <h3 className="font-heading font-bold text-[#050F41]">Readaptação funcional</h3>
          <p>
            Significa adequar a função do servidor às limitações impostas por sua doença. O legislador, ao conceber a readaptação funcional, pretendeu proteger, de forma legítima, aquele trabalhador que, sendo acometido por determinada doença, teve sua capacidade laborativa comprometida, não configurando, porém, incapacidade total (licença médica) nem definitiva (aposentadoria). Cabe à perícia médica caracterizar a incapacidade relativa do funcionário por motivo de doença, podendo neste caso ser ele aproveitado em funções diferentes das que lhe cabem, contanto que compatíveis com sua limitação.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Aposentadoria por invalidez</h3>
          <p>
            Para caracterizar a invalidez, o perito tem que analisar a relação da atividade desempenhada e a patologia apresentada pelo servidor. Cabe lembrar que a incapacidade laborativa é a limitação para o exercício de uma atividade determinada. A invalidez é a comprovação da incapacidade permanente e total, para toda e qualquer atividade laboral, e a impossibilidade de ser readaptado/reabilitado.
          </p>
          <p>
            Assim como ninguém é licenciado por estar doente, <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">ninguém é aposentado por ser portador de uma doença, mesmo que seja uma das doenças elencadas em lei</mark>. É óbvio que o fator causal para a concessão de uma aposentadoria por invalidez será sempre uma doença, porém o que deverá ser atestado pela perícia é a incapacidade laboral total e permanente, em razão de tal enfermidade.
          </p>
          <p>
            Raciocínio oposto deve ser feito quanto ao benefício fiscal concedido pela Receita Federal. Estas mesmas doenças permitem o amparo para isenção do imposto de renda, de acordo com a legislação, bastando que o indivíduo seja portador.
          </p>
        </div>

        {/* Secção: Outros Afastamentos e Ingresso */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Afastamentos Especiais e Ingresso</h2>
          
          <h3 className="font-heading font-bold text-[#050F41]">Afastamento compulsório</h3>
          <p>
            É necessário que primeiramente se diferencie com cuidado os casos de notificação compulsória dos outros nos quais deve haver afastamento compulsório. Por definição conceitual, na notificação compulsória há obrigatoriedade, por parte do médico assistente, de comunicar os órgãos de controle epidemiológico quando do diagnóstico das doenças definidas pela legislação.
          </p>
          <p>
            O afastamento compulsório, entretanto, pretende impedir a disseminação pelo portador de alguma doença infectocontagiosa, fazendo com que se mantenha fora do convívio social, de forma a prevenir a ocorrência de outros casos. É o caso da tuberculose em fase bacilífera, ou ainda da epidemia de conjuntivite, por exemplo.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Critérios para o ingresso no serviço público</h3>
          <p>
            Por competência legal, cabe ao órgão de perícia a inspeção médica que visa comprovar a boa saúde do candidato, sendo a aptidão concluída em exame pericial, requisito básico para a posse. Basicamente, o exame médico admissional tem por finalidade avaliar o estado de saúde física e mental do candidato e dar cumprimento a uma das fases eliminatórias do concurso público, portanto, de cunho administrativo.
          </p>
          <p>
            Deverá ser atestado que o candidato apresenta capacidade laborativa para o desempenho das funções do cargo pretendido e a ausência de patologia grave que possa vir a resultar em prejuízo à própria saúde ou em incapacidade para o exercício de suas funções. O parecer pela inaptidão permite ao candidato recurso administrativo, devendo ser designada junta de três médicos para reavaliação do caso.
          </p>

          <h3 className="font-heading font-bold text-[#050F41] pt-4">Inclusão do portador de necessidades especiais</h3>
          <p>
            O candidato, ao declarar-se deficiente, fará prova junto ao órgão responsável pelo concurso mediante documentação exigida no edital ou será avaliado por médico perito da instituição, que caracterizará ou não a deficiência de acordo com a lei.
          </p>
          <p>
            Além do enquadramento legal, o perito conclui sobre a compatibilidade da deficiência com o cargo pretendido. Cada legislação especifica a forma como será formada a junta que irá avaliar a compatibilidade da deficiência com o cargo.
          </p>
        </div>

        {/* Secção: Referências (Concisa) */}
        <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 shadow-inner space-y-2 font-body text-[11px] text-gray-500 leading-relaxed text-left">
          <h3 className="font-heading font-bold uppercase mb-2 text-gray-700">Referências Bibliográficas</h3>
          <p>BRASIL. Decreto nº 3.048, de 6 de maio de 1999.</p>
          <p>______. Decreto nº 57.654, de 20 de janeiro de 1966.</p>
          <p>______. Lei nº 8.112, de 11 de dezembro de 1992. Dispõe sobre o regime jurídico dos servidores públicos civis da União.</p>
          <p>CONSELHO FEDERAL DE MEDICINA. Resolução nº 1.931, de 17 de setembro de 2009. Código de ética médica.</p>
          <p>RIO DE JANEIRO (Município). Lei nº 94, de 14 de março de 1979. Dispõe sobre o Estatuto dos Funcionários Públicos do Poder Executivo.</p>
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