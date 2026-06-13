// Ficheiro: components/ArtigoPerfilPerito.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ArtigoPerfilPerito: React.FC<Props> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Documentação: Observador de scroll para mostrar/esconder o botão flutuante de voltar ao topo
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
            Aos leitores, quero expressar que foi bem mais difícil escrevê-lo do que imaginara. Particularmente no que tange aos médicos peritos, a bibliografia sobre perícia médica, de forma geral, é escassa quanto a sua personalidade, características, dificuldades e aspirações no exercício diário das atividades.
          </p>
          <p>
            Traçar um perfil abrange não só a parte intelectual, técnica, didática de uma profissão ou atividade laborativa. Devemos também englobar a parte humana, psíquica, comportamental e estrutural do profissional que exercerá a referida função. Mesmo que o médico, em nosso caso específico, tenha as atribuições de personalidade, intelecto, inteligência emocional e dom vocacional para exercer com brilhantismo a atividade de perito médico, não nos esqueçamos de que o homem é um todo complexo.
          </p>
        </div>

        {/* Secção: Considerações Gerais e sobre a Perícia */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Considerações Gerais e sobre a Perícia Médica</h2>
          <p>
            Por não termos nossa área de atuação pericial reconhecida como matéria curricular, ninguém sai da faculdade como 'perito médico'. Mesmo os que seguem a Medicina Legal, para tornarem-se peritos legistas após concurso público, têm que obter um treinamento mais especializado na instituição pública onde exercerão a função.
          </p>
          <p>
            A 'especialidade' perícia médica exige um perfil próprio, um tipo de personalidade, temperamento e caráter peculiares ao médico que a pretende exercer.
          </p>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">
              Na definição da palavra perito vimos que este especialista terá que deter conhecimentos especiais e minuciosos, gostar de estudar leis e decretos muitas vezes de áreas diversas à medicina, pois, sem dúvida, a atividade pericial é interdisciplinar com a Administração, com o Direito, com a Biologia...
            </mark>
          </p>
          <p>
            Como bem define Paulo Gonzaga, nobre colega médico perito do INSS: "A perícia médica é a difícil área da Medicina que não se aprende nas faculdades tradicionais, mas na faculdade da vida diária, acumulando conhecimentos da Medicina e do Direito".
          </p>
        </div>

        {/* Secção: Atributos Importantes */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Atributos importantes ao perfil do perito médico de forma global</h2>
          <p>Podemos relacionar os seguintes fatores como necessários, e alguns até indispensáveis, ao perfil do perito médico, devendo integrar sua formação, qualificação e temperamento:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Sólida formação clínica, mesmo não sendo a Clínica Geral sua área de atuação especializada;</li>
            <li>Curso de especialização em Medicina do Trabalho/Saúde Ocupacional;</li>
            <li>Curso/especialização ou domínio de conhecimentos na área de perícia forense/legal;</li>
            <li>Domínio amplo e atualização constante da legislação pertinente à sua área de atuação;</li>
            <li>Ser imparcial, isento de preconceitos, resolutivo e independente no sentido decisório;</li>
            <li>Elaborar seus laudos/relatórios/pareceres de forma clara, objetiva, resolutiva, concisa e coerente com o que irá, ao fim, concluir...</li>
            <li>Jamais basear suas conclusões em suposições, probabilidades ou possibilidades. Na atividade médico-pericial não há lugar para o "eu acho que...", "pode ser que...";</li>
            <li>Saber a medida certa entre a razão e a emoção;</li>
            <li>O perito médico não tem pacientes, mas sim periciandos, examinandos, autores, segurados, vítimas, réus... Por isso, deve exercer a arte do ouvir e explicar, dentro do possível, a finalidade do ato pericial;</li>
            <li>Abster-se ao máximo de comentários diante do segurado sobre o laudo pericial anterior, o atestado do médico ou profissional de saúde que assiste o paciente;</li>
          </ul>
        </div>

        {/* Secção: O Perito Previdenciário e o Conflito */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">O perito médico previdenciário e a medicina assistencial</h2>
          <p>
            Por definição, perito médico é o profissional especializado que, dentro da estrutura previdenciária, tem a missão de avaliar as condições de saúde do periciando/segurado, correlacionando-as com a existência de incapacidade laboral e, caso esta exista, definir objetivamente o grau dessa incapacidade e o tempo de afastamento.
          </p>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">
              O perito médico não examina o segurado com a finalidade de assisti-lo ou medicá-lo. O profissional imbuído da função pericial está a serviço de uma autoridade, de um ministério com uma legislação própria.
            </mark>
          </p>
          <h3 className="font-heading font-bold text-[#050F41] pt-4">A posição conflituosa: influência na estrutura emocional</h3>
          <p>
            No dia a dia do perito médico não há como negar o conflito entre a atividade médico-pericial e a do médico assistente. Ambos são médicos, exercem nobilíssimas funções, mas estas divergem profundamente quanto às finalidades, objetivos e metas a cumprir.
          </p>
          <p>
            <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">
              A relação do paciente com o médico assistente é de confiança, lealdade, empatia e franqueza. O ideal comum é o restabelecimento ou a manutenção da saúde. A relação do segurado com o perito médico é de desconfiança, de defensiva, dissimulada, de antipatia.
            </mark>
          </p>
          <p>
            É de suma importância ressaltar que o perito médico não é o responsável pela concessão do benefício pleiteado pelo segurado. O exame médico-pericial e sua conclusão são apenas parte do processo concessório. Não nos esqueçamos do pilar legal.
          </p>
          <div className="border-l-4 border-navy pl-4 py-2 my-4 bg-gray-50/50 rounded-r-lg italic font-medium">
            "O perito 'não dá ou nega, ou corta ou tira o benefício', ele atesta, conclui, em seu laudo/parecer, se há ou não incapacidade do ponto de vista médico-pericial."
          </div>
        </div>

        {/* Secção: Linguagem Corporal e Qualidade de Vida */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Linguagem corporal e qualidade de vida</h2>
          <p>
            O grande médico e escritor Pedro Nava dizia que "o bom médico é um sujeito indiscreto, que com o olhar vive a abrir a 'correspondência' alheia". Como peritos e médicos, já vimos o quanto nosso perfil tem de ser sereno, impassível, isento e fleumático. Não é de bom alvitre que o periciando, com o olhar, "abra a nossa correspondência".
          </p>
          <p>
            Os profissionais das áreas de saúde e segurança têm de aprender a treinar o controle da emoção e dos sentimentos. São profissões estressantes, que lidam com violência, mortes, sofrimentos físico, social e moral, rejeição afetiva... O médico perito deve ter cuidado não apenas com o que fala, mas como fala e com a entonação da voz.
          </p>
          <h3 className="font-heading font-bold text-[#050F41] pt-4">O perfil do perito médico e a repercussão da atividade em sua saúde</h3>
          <p>
            O perito médico trabalha em atividade de estresse permanente, seja pela insegurança nos locais de trabalho, seja pela atividade incompreendida e antipatizada. É comum a este tipo de perfil profissional o sofrimento de determinadas doenças agravadas pelo estresse crônico (hipertensão arterial, distúrbios do sono, gastrites) e a síndrome de burnout.
          </p>
          <p>
            A síndrome de burnout decorre da decepção, da desilusão, do desgaste com a área profissional abraçada. O interessante a destacar é que o profissional se vai tornando negligente, relapso, faltoso, desinteressado. Defende-se psiquicamente do desgaste com o afastamento, a frieza emocional e laboral.
          </p>
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