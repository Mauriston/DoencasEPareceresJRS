// Ficheiro: components/OrdemInternaJRS.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const OrdemInternaJRS: React.FC<Props> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    if (!scrollContainer) return;
    const handleScroll = () => {
      setShowScrollTop(scrollContainer.scrollTop > 250);
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const rawMarkdown = `
## MARINHA DO BRASIL
## HOSPITAL NAVAL DE RECIFE
Recife, PE, na data da assinatura.
ORDEM INTERNA Nº HNRe 02-05D
Assunto: Normas para o funcionamento da Junta Regular de Saúde
Referencias: A) Regimento interno deste Hospital Naval;
B) DGPM-406 (9ª Revisão);
C) DGPM-401 (4ª Revisão); e
D) Resolução CFM N° 2.430, de 21 de maio de 2025.
Anexos: A) Fluxograma de Inspeções de Saúde da JRS;
B) Fluxograma de Inspeções de Saúde do MPI;
C) Fluxograma de Inspeções de Saúde do MPIQ; e
D) Fluxograma da tramitação dos Atestados de Origem.

## 1. PROPÓSITO
Estabelecer normas para o funcionamento da Junta Regular de Saúde deste Hospital Naval.

## 2. CONCEITUAÇÃO E FINALIDADE
Estabelecer normas para o funcionamento do Subsistema Médico-Pericial (SMP) no âmbito do Hospital Naval de Recife através da Junta Regular de Saúde (JRS/HNRe) e definir a estrutura administrativa desta.

## 3. ESTRUTURA ORGANIZACIONAL
A Junta Regular de Saúde (HNRe-02.2) é subordinada administrativamente ao Vice-Diretor (HNRe-02) conforme a referência A e tecnicamente à Junta Superior Distrital do Comando do 3ºDN (JSD/COM3ºDN) enquanto elemento do SMP de acordo com o previsto na referência B.
3.1. A JRS/HNRe é organizada administrativamente pelos Agentes Médicos Periciais (AMP) e uma Secretaria (Sec/JRS);
3.2. São os Agentes Médicos Periciais (AMP):
a) JRS/HNRe: composta por um Presidente, preferencialmente um Oficial Superior Médico do Corpo de Saúde da Marinha, e dois membros, designados através de Portaria assinada pelo Comandante do 3ºDN;
I) O Presidente da JRS/HNRe exerce a função administrativa de encarregado do setor.
b) Médico Perito Isolado (MPI): composto por no mínimo dois oficiais médicos, preferencialmente não generalistas, designados por Portaria do Titular do HNRe; e
c) Médico Perito Isolado Qualificado (MPIQ): na existência de Oficial Médico qualificado em Medicina de Aviação ou Medicina de Submarino e Escafandria, este será designado tempestivamente por Portaria do Titular do HNRe.
I) No âmbito do SMP, a depender da sua qualificação, o MPIQ é subordinado tecnicamente à Junta de Saúde para Atividades Especiais do Comando da Força de Submarinos (JSAE/ComForS) ou à Junta de Saúde para Atividades Especiais da Policlínica Naval de São Pedro da Aldeia (JSAE/PNSPA).
3.3. A Sec/JRS é composta por:
a) Supervisor: preferencialmente um Suboficial-EF cumprindo Tarefa por Tempo Certo ou Servidor Civil de formação administrativa;
b) Secretário: preferencialmente um 1º ou 2º Sargento EF;
c) Auxiliares: no mínimo 2 Cabos preferencialmente da especialidade EF.
3.4. A fim de prontificar avaliações e exames necessários para as conclusões das IS, são considerados Serviços de Apoio à JRS:
a) O Serviço de Ambulatório (HNRe-10.5);
b) O Serviço de Diagnóstico por Imagem (HNRe-11.3);
c) A Clínica de Odontologia Preventiva (HNRe-12.8);
d) O Serviço de Fonoaudiologia (HNRe-14.4);
e) A Seção de Emissão de Guias (HNRe-15.2); e
f) O Serviço de Laboratório de Análises Clínicas (HNRe-16.1).
I) Os Serviços de Apoio à JRS devem dar prioridade ao atendimento dos militares da ativa oriunos da JRS/HRNe na realização de exames complementares ou resposta de pareceres especializados, devendo também dar celeridade no que tange aos lançamentos dos resultados dos exames/laudos, de maneira a permitir que os AMP possam dar continuidade nos processos de conclusão das IS em tempo hábil; e
II) Os AMP podem solicitar exames subsidiários e pareceres especializados às clínicas da MB ou extra-MB, quando julgarem pertinentes, para esclarecimento diagnóstico.

## 4. OBJETIVOS
4.1. Verificar o estado de sanidade psicofísica do pessoal em serviço ativo, inativos, veteranos e a ser selecionado para ingresso na MB, bem como aquelas relacionadas aos Servidores Civis da Marinha do Brasil e, excepcionalmente, a avaliação da capacidade laboral no Serviço de Praticagem nos estados de Pernambuco, Paraíba e Alagoas;
4.2. Fazer a devida interlocução deste Hospital dentro da Cadeia Hierárquica do SMP tendo como instância superior JSD/COM3ºDN e instâncias inferiores o MPI/CPAL e MPI/CPPB;
4.3. Assessorar a Direção e Vice-Direção em demandas Médico-Periciais;
4.4. Fornecer subsídios à Assessoria Jurídica (HNRe-01.1) em processos quando demandados temas Médico-Periciais; e
4.5. Fornecer subsídios Médico-Periciais ao Núcleo de Avaliação e Controle (HNRe-02.6) e à Divisão de Pessoal (HNRe-21) para o adequado Controle Médico-Pericial e Assistencial (CMPA) dos Militares da Ativa deste Hospital que apresentem deficiências funcionais (Restrições/LTS) em conformidade com o disposto na referência C.

## 5. ATRIBUIÇÕES
5.1. Compete a todos os AMP, em conformidade com as referências B e D:
a) Realizar todas as Inspeções de Saúde (IS) de sua competência por determinação da autoridade competente a fim de verificar o estado de sanidade psicofísica do pessoal em serviço ativo, inativos, veteranos e a ser selecionado para ingresso na MB, bem como aquelas relacionadas aos Servidores Civis da Marinha do Brasil e, excepcionalmente, a avaliação da capacidade laboral no Serviço de Praticagem;
I) Os AMP deverão avaliar e fazer os devidos registros no Sistema Naval de Inspeções de Saúde (SINAIS) a biometria, acuidade visual e teste cromático, exame clínico, entrevista e o laudo exarado da IS sob sua responsabilidade;
II) Em nenhuma hipótese os AMP concluirão uma IS cujos exames e pareceres não estejam completamente digitados no SINAIS pela Sec/JRS. Neste cenário, o AMP deverá devolver a IS para a área de exames do SINAIS para que a devida digitação seja feita; e
III) Todas as IS concluídas deverão ser votadas (no caso da JRS) e assinadas digitalmente no SINAIS no mesmo dia da conclusão;
IV) Quando houver necessidade de solicitação de exames complementares ou pareceres especializados para concluir a IS, a conclusão deverá ser feita em no máximo 20 dias, mesmo que o inspecionado não apresente os exames ou pareceres solicitados em tempo hábil;
b) Obedecer à propedeütica específica para a finalidade solicitada, sendo de inteira responsabilidade dos AMP o registro completo das informações médico-periciais, assim como pelos laudos exarados, que deverão ser devidamente justificados e tecnicamente embasados por dados da literatura médica reconhecida, à luz da Legislação vigente.
c) Atuar com imparcialidade e isenção, analisando a condição do inspecionado bem como documentos, prontuários, exames complementares e circunstâncias profissionais; contando com autonomia técnica, ética, científica e funcional.
d) Ter em mente que a relação médico-paciente no ato médico-pericial difere da clássica assistencial e que a finalidade primordial do ato médico pericial não é terapêutica, mas avaliativa e elucidativa, podendo apontar recomendações assistenciais.
e) Ter compromisso com os princípios éticos da imparcialidade, do respeito à pessoa, da veracidade, da objetividade e da qualificação profissional.
f) Declinar competência para a instância imediatamente superior ou declarar-se impedido, nos casos dos membros da JRS, se for médico assistente frequente do inspecionado ou com ele tiver quaisquer relações que gerem conflitos de interesse.
5.2. Compete ao MPI:
a) Realizar as IS com finalidade de controle periódico, para deixar o serviço ativo, para deixar o serviço militar inicial ou voluntário e as demais finalidades previstas no capítulo 2 da referência B;
b) Atender as demandas médico-periciais de sua competência de todas as OM do estado de Pernambuco; e
c) Auxiliar e assessorar o Presidente da JRS/HNRe nas demandas administrativas do setor.
5.3. Compete ao MPIQ:
a) realizar as IS que envolvem atividades especiais correlatas à sua qualificação de atuação e por solicitação da autoridade competente; e
b) Atender as demandas médico-periciais de sua competência de todas as OM dos estados de Pernambuco, Paraíba e Alagoas.
5.4. Compete aos membros da JRS/HNRe:
a) Realizar as IS com finalidade de Verificação de Deficiência Funcional (VDF), Término de Restrições, Término de Incapacidade, Concessão de Benefícios, Ingresso na Marinha, Exame de Sanidade de Atestado de Origem e as demais finalidades previstas no capítulo 2 da referência B;
b) Atender as demandas médico-periciais de sua competência de todas as OM dos estados de Pernambuco, Paraíba e Alagoas;
c) Realizar as IS por declínio de competência pelos MPI/HNRe, MPI/CPAL e MPI/CPPB;
d) Realizar apreciação documental Ex-Officio daquelas IS de VDF/Benefício encaminhadas pelos MPI/CPAL e MPI/CPPB. Neste cenário a JRS/HNRe pode:
I) Homologar a IS recebida do MPI;
II) Restituir a IS ao MPI de origem para inserção de informações em falta; ou
III) Convocar o inspecionado para comparecer presencialmente para concluir a IS.
e) Auxiliar e assessorar o Presidente da JRS/HNRe nas demandas administrativas do setor;
f) Assinar e despachar documentos do setor no Impedimento do Presidente da JRS/HNRe; e
g) Executar as funções específicas do Presidente da JRS/HNRe, descritas no item 4.5, na ausência deste.
5.5. Compete ao Presidente da JRS/HNRe:
a) Realizar as funções que competem aos membros da JRS/HNRe descritas no item 4.4. alíneas "a", "b", "c" e "d";
b) Presidir as IS realizadas pela JRS/HNRe em conformidade com a referência B;
c) Exercer a função de encarregado do setor - coordenar a equipe, supervisionar e controlar o cumprimento da rotina e horário de funcionamento;
d) Aprovar para tramitação no SIGAD as minutas de mensagens, ofícios, comunicações padronizadas e demais documentos administrativos redigidos pela Sec/JRS;
e) Controlar as ações desenvolvidas pela Sec/JRS, com respeito ao cumprimento dos prazos estabelecidos;
f) Processar demandas recebidas por mensagens e distribuí-las para os membros da Sec/JRS;
g) Apresentar as estatísticas da JRS/HNRe mensalmente no Conselho de Gestão;
h) Despachar com o Vice-Diretor as demandas da JRS/HNRe; e
i) Fazer a interlocução com a JSD/3ºDN e os MPI/CPAL e MPI/CPPB quando necessário.
5.6. Compete aos Auxiliares da Sec/JRS:
a) Realizar os agendamentos de início e conclusão das IS dos militares da ativa e servidores civis;
b) Digitar os exames e pareceres das IS no SINAIS antes da avaliação dos inspecionados pelos AMP;
c) Realizar os agendamentos de início e conclusão das IS dos militares da ativa e servidores civis;
d) Orientar os inspecionados sobre todos os trâmites da inspeção;
e) Auxiliar no agendamento, quando necessário, dos exames e pareceres solicitados; e
f) Manter estrito controle dos exames e pareceres solicitado pelo AMP para os inspecionados, bem como solicitar a entrega dos resultados de exames e pareceres no prazo previamente estabelecido.
5.7. Compete ao Secretário da Sec/JRS:
a) Supervisionar e controlar as atividades dos Auxiliares da Sec/JRS e ajudá-los quando necessário;
b) Realizar os agendamentos de início e conclusão das IS com finalidade de Ingresso (concursos), Concessão de Benefícios e demais situações recebidas pelo SIGAD;
c) Minutar as mensagens de conclusão das IS e submetê-las à aprovação do Presidente da JRS/HNRe, observando rigorosamente os prazos estipulados na referência B;
d) Organizar e arquivar os diversos tipos de documentos físicos do setor observando os respectivos graus de sigilo;
e) Controlar e organizar a carga de material permanente do setor.
5.8. Compete ao Supervisor da Sec/JRS:
a) Supervisionar e controlar as atividades dos Auxiliares e do Secretário da Sec/JRS e ajudá-los quando necessário;
b) Auxiliar e assessorar o Presidente da JRS/HNRe nas demandas administrativas do setor;
c) Abrir as IS apresentadas via SEIS ou mensagens e fazer o devido registro para controle interno e cumprimento dos prazos;
d) Acompanhar o cumprimento dos prazos regulamentares das IS, encaminhamento de documentos e demais elementos necessários à conclusão das IS:
I) Agendar as IS fim VDF, término de restrições e término de incapacidade recebidas via SEIS do pessoal de bordo e informar o agendamento via zimbra ao Encarregado da Divisão de Pessoal, ao Encarregado do Inspecionado e ao Inspecionado;
II) Proceder ao cancelamento das IS citadas no item anterior por não comparecimento e comunicar a Divisão de Pessoal através de CP;
III) Proceder ao cancelamento das IS recebidas via SEIS de outras OM por não comparecimento do inspecionado no prazo de 7 dias úteis e comunicar o cancelamento à OM solicitante através de Mensagem;
IV) Proceder ao cancelamento das IS com finalidade concessão de benefícios apresentadas através de mensagens por não comparecimento do inspecionado no prazo de 60 dias úteis e comunicar o cancelamento à OM solicitante através de Mensagem;
e) Processar os documentos administrativos recebidos fisicamente ou pelo SIGAD e distribuí-los para o Secretário ou para o Presidente para tomada das providências cabíveis conforme necessidade
f) Minutar as mensagens (exceto as de conclusão de IS) e demais documentos administrativos relacionados ao funcionamento do setor e submetê-los à aprovação do Presidente da JRS/HNRe para tramitação;
g) Receber os Atestados de Origem, fazer a abertura no SINAIS e o devido registro para controle interno e processá-lo conforme disposto no Anexo D;
h) Fazer a interlocução com os Serviços de Apoio à JRS/HNRe e demais setores envolvidos na prontificação e exames e/ou pareceres solicitados nas IS;
i) Fazer a interlocução com o Núcleo de Avaliação e Controle (NAC) e enviar semanalmente a lista de militares que estão em LTS ou com restrições; e
j) Elaborar mensalmente as estatísticas de produtividade da JRS/HNRe e submetê-las ao Presidente para a devida apresentação no Conselho de Gestão.

## 6. ROTINA DE ATENDIMENTO
6.1. Os fluxos de agendamento e realização das IS para os JRS, MPI e MPIQ estão descritos respectivamente nos anexos A, B e C;
6.2. O fluxo de tramitação interna dos Atestados de Origem está descrito no anexo D;
6.3. Os militares da ativa, os militares da reserva cumprindo Tarefa por Tempo Certo e os Servidores Civis deverão ser apresentados para IS via Solicitação Eletrônica de Inspeção de Saúde (SEIS) pelo Encarregado da Divisão de Pessoal da OM solicitante
a) Uma vez apresentados, os inspecionados terão o prazo de sete dias úteis para comparecer presencialmente à Sec/JRS para receber as solicitações dos exames previstos às suas IS ou agendar a IS, quando não houver previsão de exames complementares;
b) O não cumprimento desse prazo acarretará em cancelamento da IS com envio de mensagem para a OM do inspecionado, ou comunicação padronizada para o encarregado do inspecionado se ele for do HNRe, para as medidas administrativas cabíveis;
6.4. As IS com finalidade de concessão de benefícios para militares veteranos e da reserva, servidores civis inativos e pensionistas deverão ser apresentadas via mensagem da OM solicitante e os inspecionados deverão fazer o agendamento da IS presencialmente ou via telefone em até 60 dias a partir da data do documento de apresentação;
6.5. Para solicitar o agendamento de IS domiciliar, o inspecionado deverá enviar à Sec/JRS um requerimento a ser apreciado pelo Presidente da JRS/HNRe acompanhado de relatório médico que ateste a total incapacidade do inspecionado em sair do domicílio, inclusive para realizar outros tratamentos de saúde; e
6.6. Os militares da ativa deverão comparecer às IS devidamente uniformizados e portando o Prontuário Médico Individual (PMI) ou Guia Sanitária.

## 7. RESPONSÁVEL PELA CARGA
7.1. O militar mais antigo será o responsável pela carga do material permanente;
7.2. Compete ao militar responsável pela carga controlar o acervo de material permanente da JRS/HNRe, de acordo com a referência A; e
7.3. Os militares ou civis que utilizam os materiais e equipamentos respondem solidariamente com o responsável pela carga.

## 8. VIGÊNCIA
Esta Ordem Interna entrará em vigor na presente data.

## 9. CANCELAMENTO
Esta Ordem Interna cancela a de nº 02-05C.

ARNALDO OLIVEIRA DE JESUS
Capitão de Mar e Guerra (Md)
Diretor
  `;

  const processedText = useMemo(() => {
    return rawMarkdown
      .replace(/-\s*\d+\s*de\s*\d+\s*-/g, '')
      .replace(/HNRe 02-05D/g, '')
      .split('\n')
      .filter(line => line.trim() !== '');
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="ORDEM INTERNA JRS/HNRE" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-4 max-w-3xl mx-auto w-full flex-1 pb-32">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm font-body">
          {processedText.map((line, idx) => {
            if (line.startsWith('##')) {
              const text = line.replace('##', '').trim();
              return (
                <h2 key={idx} className="text-lg md:text-xl font-heading font-bold text-[#050F41] mt-8 mb-3 uppercase border-b border-gray-100 pb-2">
                  {text}
                </h2>
              );
            }
            
            const numericItemMatch = line.match(/^(\d+\.\d+\.?\s*)(.*)/);
            if (numericItemMatch) {
               return (
                 <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-3 text-justify pl-2">
                   <strong className="text-[#050F41]">{numericItemMatch[1]}</strong>
                   {numericItemMatch[2]}
                 </p>
               );
            }

            const letterItemMatch = line.match(/^([a-z]\)\s*)(.*)/);
            if (letterItemMatch) {
               return (
                 <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-2 text-justify pl-6 border-l-2 border-blue-100">
                   <strong className="text-[#050F41]">{letterItemMatch[1]}</strong>
                   {letterItemMatch[2]}
                 </p>
               );
            }

            const romanItemMatch = line.match(/^([IVXLC]+\)\s*)(.*)/);
            if (romanItemMatch) {
               return (
                 <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-2 text-justify pl-10 border-l-2 border-gray-200">
                   <strong className="text-gray-900">{romanItemMatch[1]}</strong>
                   {romanItemMatch[2]}
                 </p>
               );
            }

            return (
              <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-3 text-justify">
                {line}
              </p>
            );
          })}
        </div>

        {showScrollTop && (
          <button 
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 w-12 h-12 bg-white text-[#050F41] shadow-xl rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all border border-gray-200 z-50"
            title="Voltar ao topo"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </div>
    </div>
  );
};