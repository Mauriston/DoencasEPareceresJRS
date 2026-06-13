// Ficheiro: components/CasosPericiais.tsx
import React, { useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ChevronRight, RotateCcw } from 'lucide-react';

// Documentação: Dados extraídos do JSON fornecido, contendo os 24 casos periciais
const CASOS_DATA = [
  {
    "caso": "01",
    "enunciado": "Um Sargento da ativa apresenta-se ao senhor para a realização da Inspeção de Saúde de Controle Trienal. Ao analisar os exames complementares obrigatórios, o senhor identifica, pela primeira vez, um resultado de Anti-HIV Reagente. Ao consultar o prontuário e o SINAIS, observa que o militar não possui histórico prévio de Inspeção de Verificação de Deficiência Funcional (VDF) por esse motivo. De acordo com a DGPM-406 (9ª Revisão), qual deve ser a sua conduta imediata?",
    "alternativas": {
      "A": "O senhor deve concluir a IS de Controle Trienal como 'Apto com Restrições', lançar as restrições de embarque e determinar que o militar passe a realizar o Controle Anual.",
      "B": "O senhor deve abrir uma IS de VDF, conceder 30 dias de Licença para Tratamento de Saúde (LTS) e solicitar parecer da Infectologia antes de concluir.",
      "C": "O senhor deve declinar competência à JRS/HNRe, pois, em caso de detecção de sorologia reagente para o HIV pela primeira vez e sem histórico prévio de VDF por esse motivo, o declínio é obrigatório.",
      "D": "O senhor deve considerar o militar 'Inapto para o Serviço Ativo da Marinha' e encaminhá-lo diretamente para a Junta Superior Distrital (JSD) para fins de reforma."
    },
    "gabarito": "C",
    "explicacao": "A conduta baseia-se no item 2.1.5, inciso II, alínea 'a', que reserva à Junta Regular de Saúde (JRS) a competência para casos encaminhados por declínio de competência pelos MPI. Visto que se trata de diagnóstico inicial de doença especificada em lei, o MPI não possui competência para o enquadramento original, devendo observar o item 1.3.1, que limita a atuação do MPI em casos de VDF a situações excepcionais de ausência de JS na localidade. Ademais, a Portaria Normativa nº 3.551/GM-MD/2021 exige que a avaliação pericial para portadores de HIV seja realizada por Juntas de Saúde para a correta classificação clínica."
  },
  {
    "caso": "02",
    "enunciado": "Você é o Oficial Médico de Dia no Hospital Naval de Recife e está triando as Solicitações de Inspeção de Saúde (SEIS) recebidas no sistema. Considerando que sua Organização Militar possui Juntas de Saúde constituídas, qual das situações abaixo NÃO pode ser realizada monocraticamente por você (Médico Perito Isolado), exigindo obrigatoriamente o agendamento em Junta Regular de Saúde (JRS)?",
    "alternativas": {
      "a": "Um Segundo-Sargento que necessita de Inspeção de Saúde para fim de Reengajamento bienal.",
      "b": "Um Capitão-Tenente designado para Missão no Exterior por 6 meses, sem dependentes e sem restrições médicas prévias.",
      "c": "Um Marinheiro que apresenta um Atestado de Origem (AO) em aberto e necessita de Exame de Sanidade para verificação de sequelas.",
      "d": "Um Primeiro-Tenente que necessita de Inspeção de Saúde para matrícula em Curso de Carreira (C-CAISO), sem exigência de atividades especiais.",
      "e": "Um Cabo que está sendo licenciado ex-officio e necessita de Inspeção de Saúde para Deixar o Serviço Ativo da Marinha (SAM)."
    },
    "gabarito": "c",
    "explicacao": "De acordo com o item 2.1.5, inciso II, alínea 'm', o Exame de Sanidade em Atestado de Origem (AO) é competência expressa da Junta Regular de Saúde (JRS). O MPI tem competência restrita às modalidades listadas no item 2.1.5, inciso I, que incluem Engajamento, Missão no Exterior e Deixar o SAM, mas excluem perícias que envolvam nexo causal laborativo. O Capítulo 13, item 13.1, reforça que a verificação de sequelas e a confirmação do nexo em AO/ISO exigem a ritualística colegiada da JRS para validade administrativa."
  },
  {
    "caso": "03",
    "enunciado": "Um militar apresenta-se ao serviço de saúde com quadro de síndrome gripal. Como Médico Perito Isolado (MPI), você decide realizar uma Perícia Menor para conceder dispensa médica. De acordo com as normas vigentes, qual é o prazo máximo permitido para a dispensa médica total nesta modalidade?",
    "alternativas": {
      "A": "Até 30 dias, sendo inicialmente de até 20 dias, prorrogáveis por mais 10 dias.",
      "B": "Até 60 dias, desde que o militar seja reavaliado a cada 15 dias pelo médico de bordo.",
      "C": "Até 10 dias, devendo qualquer período superior ser avaliado obrigatoriamente por Junta Regular de Saúde.",
      "D": "Até 15 dias, não sendo permitida prorrogação por MPI."
    },
    "gabarito": "C",
    "explicacao": "A fundamentação encontra-se no Capítulo 4, item 4.4, que define a 'Rotina para Perícias Menores', limitando o afastamento total do serviço a um período máximo de 10 dias. Esta modalidade simplificada utiliza o Modelo DS-5, conforme o item 2.2.2, alínea 'e'. Qualquer necessidade de afastamento superior a 10 dias configura Licença para Tratamento de Saúde (LTS), exigindo Inspeção de Saúde formal para VDF, que é competência da JRS conforme o item 2.1.5, inciso II, alínea 'b'."
  },
  {
    "caso": "04",
    "enunciado": "Durante a realização de uma Inspeção de Saúde de Controle Periódico de um militar da ativa, o MPI identifica uma condição clínica que sugere a necessidade de início de restrições laborais permanentes. Qual deve ser a conduta imediata do MPI de acordo com o fluxo de competências?",
    "alternativas": {
      "A": "Solicitar um parecer especializado e, após o recebimento, concluir o TIS com o laudo de incapacidade temporária.",
      "B": "Exarar o laudo de aptidão com restrições e numerar o Termo de Inspeção de Saúde (TIS) no SINAIS.",
      "C": "Declinar competência para a Junta Regular de Saúde (JRS) da jurisdição.",
      "D": "Conceder uma dispensa médica de 20 dias para que o militar realize exames e retorne para conclusão do laudo pelo próprio MPI."
    },
    "gabarito": "C",
    "explicacao": "Conforme o item 2.1.5, inciso I, alínea 'a', o MPI tem competência para controles periódicos 'com ou sem restrições', mas o item 1.3, alínea 'n', determina que diante de anormalidades que exorbitem sua competência de decisão final, o AMP deve declinar para a instância adequada. A obrigatoriedade do declínio para a JRS é ratificada pelo item 2.1.5, inciso II, alínea 'c', que atribui à junta a exclusividade para deliberar sobre o Término de Incapacidade ou Restrições permanentes."
  },
  {
    "caso": "05",
    "enunciado": "Durante a prestação do Serviço Militar Inicial (SMI), um conscrito é encaminhado à Junta Regular de Saúde para Verificação de Deficiência Funcional (VDF). A Junta identifica uma patologia ortopédica recuperável em um prazo de 6 meses. Qual o laudo pericial correto a ser aplicado neste caso?",
    "alternativas": {
      "A": "Apto com restrições.",
      "B": "Incapaz B-1",
      "C": "Incapaz C.",
      "D": "Incapaz B-2."
    },
    "gabarito": "D",
    "explicacao": "Para militares do Serviço Militar Inicial (SMI), o Capítulo 11, item 11.3, regula a VDF. O laudo 'Incapaz B-2' é aplicado quando a lesão ou doença é temporária e impede o serviço, mas é passível de recuperação. No SMI não se aplica o laudo B-1 (incapacidade temporária para algumas atividades), pois o conscrito deve possuir higidez plena para o ciclo de formação, conforme os padrões admissionais do Anexo N."
  },
  {
    "caso": "06",
    "enunciado": "Um militar prestando Serviço Militar Voluntário (SMV) como Oficial médico apresenta uma condição de saúde não relacionada ao serviço que exige afastamento total (LTS). De acordo com os procedimentos para o SMV, qual é o limite de tempo de LTS que, se atingido ou superado, impede a reapresentação para 'Término de Incapacidade' e gera o licenciamento administrativo?",
    "alternativas": {
      "A": "180 dias.",
      "B": "90 dias.",
      "C": "45 dias.",
      "D": "30 dias."
    },
    "gabarito": "B",
    "explicacao": "A regra para militares do Serviço Militar Voluntário (SMV) está detalhada no Capítulo 11, item 11.8. O licenciamento ex-officio ocorre quando o militar temporário atinge 90 dias de afastamento total (LTS) por motivo de doença não relacionada ao serviço. Este limite é uma salvaguarda administrativa que diferencia o regime do militar temporário do de carreira, cuja validade de inspeções segue o Capítulo 2, item 2.1.2, alínea 'g'."
  },
  {
    "caso": "07",
    "enunciado": "Sobre a realização de Perícia Menor para militares grávidas saudáveis no âmbito da sua Unidade Militar, qual é o procedimento correto a ser adotado segundo a DGPM-406?",
    "alternativas": {
      "A": "Utilizar o formulário do Anexo K, em duas vias, sendo dispensável o preenchimento de TIS.",
      "B": "Conceder Licença à Gestante imediatamente após a confirmação laboratorial do Beta-HCG.",
      "C": "Realizar Inspeção de Saúde completa com lavratura de Termo de Inspeção de Saúde (TIS) no SINAIS.",
      "D": "Encaminhar obrigatoriamente para a Junta Regular de Saúde para homologação do estado gestacional."
    },
    "gabarito": "A",
    "explicacao": "O item 2.2.2, alínea 'j', introduz o 'Anexo K - Perícia Menor para Gestantes Saudáveis' como o instrumento normativo simplificado. O procedimento é detalhado no Capítulo 4, item 4.4, que dispensa a abertura de TIS formal no SINAIS para gestantes sem patologias. Essa medida garante a aplicação imediata de restrições protetivas (como proibição de embarque), sendo um ato administrativo célere conduzido pelo MPI, conforme o item 1.3.1."
  },
  {
    "caso": "08",
    "enunciado": "Um médico recém-formado servindo em uma localidade remota onde não há Junta de Saúde (JS) é designado como Médico Perito Isolado (MPI). Qual o procedimento correto ao realizar uma Inspeção de Saúde (IS) para Concessão de Benefícios ou Verificação de Deficiência Funcional (VDF)?",
    "alternativas": {
      "A": "Concluir a IS no sistema SINAIS de forma definitiva, sendo a homologação automática por se tratar de oficial médico.",
      "B": "Realizar a perícia e encaminhar o Termo de Inspeção de Saúde (TIS) ex officio para a Junta Regular de Saúde (JRS) da jurisdição para apreciação documental.",
      "C": "Solicitar que o inspecionado se desloque para a Organização Militar com JS mais próxima, pois o MPI só pode realizar IS de rotina.",
      "D": "Declinar a competência imediatamente para a Junta Superior Distrital (JSD), visto que MPI não possui atribuição para estas modalidades."
    },
    "gabarito": "B",
    "explicacao": "A base legal é o item 1.3.1, parágrafo único, que permite ao MPI realizar excepcionalmente IS para VDF e Benefícios em localidades sem JS, mediante encaminhamento ex officio para a JRS para apreciação documental. Este trâmite é reforçado no item 2.1.2, alínea 'h', garantindo que o exame físico seja feito localmente, mas a decisão final seja ratificada por órgão colegiado."
  },
  {
    "caso": "09",
    "enunciado": "Durante a realização de uma IS de rotina no sistema SINAIS, qual procedimento é considerado obrigatório para que o ato médico-pericial seja juridicamente válido e concluído?",
    "alternativas": {
      "A": "conclusão da IS no sistema por meio da assinatura digital de todos os Agentes Médico-Periciais (AMP) envolvidos.",
      "B": "O envio imediato de mensagem via SISMS informando o diagnóstico por extenso e o CID correspondente.",
      "C": "A presença física de três médicos peritos durante toda a anamnese, independentemente de ser MPI ou JS.",
      "D": "A impressão do TIS em papel timbrado com assinatura manual e carimbo, sendo o registro digital apenas opcional"
    },
    "gabarito": "A",
    "explicacao": "A obrigatoriedade da assinatura digital é estabelecida no item 2.3.1, alínea 'l', que especifica o uso de Token pessoal e intransferível. Além disso, o item 2.3.3, alínea 'h', reforça que as IS só são consideradas concluídas quando numeradas e assinadas digitalmente no sistema SINAIS, servindo este registro como única comprovação válida do ato médico-pericial para fins de atos administrativos."
  },
  {
    "caso": "10",
    "enunciado": "Uma Oficial RM2 (SMV), grávida e sem intercorrências clínicas, é apresentada ao MPI para a inspeção de saúde com a finalidade de 'Deixar o SMV'. Qual conduta o MPI deve adotar?",
    "alternativas": {
      "A": "Deve ser considerada Inapta para deixar o SMV, com posterior encaminhamento para VDF na JRS.",
      "B": "Deve ser considerada Apta para deixar o SMV, devendo o laudo especificar a idade gestacional.",
      "C": "Deve receber laudo de Incapaz Temporariamente até o término da licença-maternidade.",
      "D": "O MPI deve declinar a competência obrigatoriamente para a JRS por tratar-se de militar gestante."
    },
    "gabarito": "B",
    "explicacao": "A conduta segue o Capítulo 11, item 11.9, 'Rotina para Deixar o SMV'. Como a gestação sem complicações não é causa de inaptidão nos Padrões Psicofísicos Pós-admissionais (Anexo O), o laudo deve ser 'Apto'. Pericialmente, a oficial mantém capacidade laboral para desligamento, resguardados direitos à estabilidade temporária se aplicáveis, conforme a Lei nº 9.029/1995 citada nas normas."
  },
  {
    "caso": "11",
    "enunciado": "Um militar da ativa, sabidamente portador assintomático do vírus HIV, é apresentado para sua inspeção de saúde de rotina. De acordo com as normas de controle periódico, qual a periodicidade obrigatória desta IS e qual o Agente Médico- Pericial (AMP) competente para realizá-la?",
    "alternativas": {
      "A": "Trienal, realizada por MPI.",
      "B": "Anual, realizada por MPI.",
      "C": "Semestral, realizada por JRS.",
      "D": "Anual, realizada obrigatoriamente por JRS."
    },
    "gabarito": "B",
    "explicacao": "A periodicidade anual para portadores assintomáticos de HIV fundamenta-se na Portaria Normativa nº 3.551/GM-MD/2021 (Anexo V). O item 2.1.5, inciso I, alínea 'a', atribui ao MPI a competência para o 'Controle Periódico', mesmo com restrições preexistentes. A JRS intervém apenas em missões no exterior ou agravamento do quadro (mudança de categoria clínica), conforme o item 2.1.5, inciso II, alínea 'd'."
  },
  {
    "caso": "12",
    "enunciado": "Um militar da ativa é apresentado para Inspeção de Saúde de Controle Trienal, porém o Médico Perito Isolado (MPI) observa que o inspecionado encontra-se em gozo de Licença para Tratamento de Saúde (LTS). De acordo com as normas para inspeções pós-admissionais, qual a conduta correta a ser adotada pelo MPI?",
    "alternativas": {
      "A": "Realizar a inspeção de controle e concluir pela incapacidade temporária no mesmo Termo de Inspeção de Saúde (TIS).",
      "B": "Orientar a OM que não cabe apresentação para controle periódico de militar em LTS, devendo aguardar a aptidão para nova apresentação.",
      "C": "Declinar a competência da inspeção de controle imediatamente para a Junta Regular de Saúde (JRS).",
      "D": "Concluir a inspeção de controle como 'Inapto para o SAM' e solicitar a abertura de Verificação de Deficiência Funcional (VDF)."
    },
    "gabarito": "B",
    "explicacao": "O item 2.1.2, alínea 'f', esclarece que o laudo de aptidão por término de incapacidade não exclui outras modalidades de IS. No entanto, o Capítulo 4, item 4.1 (Controle Periódico), pressupõe higidez funcional. Estando o militar em LTS (Modelo DS-1 exarado por JS), a inspeção de controle é tecnicamente impossível de ser concluída como 'Apto' até que a causa da incapacidade seja sanada conforme o Capítulo 6."
  },
  {
    "caso": "13",
    "enunciado": "Durante uma Inspeção de Saúde realizada por um Médico Perito Isolado (MPI), o inspecionado solicita a entrada de um acompanhante na sala de exames. De acordo com a DGPM-406, qual é a norma sobre a presença de acompanhantes e a autonomia do Agente Médico-Pericial (AMP)?",
    "alternativas": {
      "A": "A presença de acompanhante é um direito absoluto do periciado em qualquer modalidade de inspeção de saúde na Marinha.",
      "B": "Fica a critério do AMP a presença de acompanhante, desde que este não interfira, nem seja motivo de constrangimento ou pressão.",
      "C": "O acompanhante deve obrigatoriamente participar da discussão técnica para validar o laudo pericial exarado pelo MPI.",
      "D": "É expressamente proibida a entrada de civis ou militares como acompanhantes em atos médicos periciais devido ao sigilo militar."
    },
    "gabarito": "B",
    "explicacao": "A norma está explícita no item 1.3, alínea 'o', que garante ao AMP autonomia: 'Fica a critério do AMP a presença de acompanhante durante a perícia'. Essa regra visa proteger o ato pericial de interferências ou pressões, mantendo o sigilo profissional estabelecido pelo Código de Ética Médica e resoluções dos conselhos de classe citadas no item 2.3.1, alínea 'b'."
  },
  {
    "caso": "14",
    "enunciado": "Você é um Médico Perito Isolado (MPI) servindo em uma localidade onde não existe Junta de Saúde (JS) da Marinha instalada. Ao realizar uma Inspeção de Saúde para Verificação de Deficiências Funcionais (VDF), qual o procedimento obrigatório quanto à tramitação do laudo?",
    "alternativas": {
      "A": "Concluir a IS e arquivá-la localmente no SINAIS, sem necessidade de revisão externa.",
      "B": "Encaminhar a IS ex officio para a Junta Regular de Saúde (JRS) geográfica mais próxima para apreciação documental.",
      "C": "Solicitar autorização prévia ao Diretor do CPMM por mensagem antes de exarar o laudo de incapacidade.",
      "D": "Declinar a competência obrigatoriamente, enviando o militar para a sede da JSD da jurisdição."
    },
    "gabarito": "B",
    "explicacao": "O procedimento para localidades desprovidas de JS é definido no item 1.3.1, parágrafo único, exigindo encaminhamento ex officio do TIS para a JRS da jurisdição para 'apreciação documental'. Este fluxo é reiterado no item 2.1.5, inciso II, alínea 'n', garantindo que perícias de VDF feitas por MPI tenham validação colegiada para produzir efeitos administrativos conforme o Anexo M."
  },
  {
    "caso": "15",
    "enunciado": "Um militar recém-formado apresenta-se ao MPI para verificação de sua situação médico-pericial logo após a conclusão do curso de formação. Qual o prazo de validade das Inspeções de Saúde (IS) de ingresso no SAM e SMV para efeito de controle periódico?",
    "alternativas": {
      "A": "Um ano, devendo ser renovada obrigatoriamente ao final do estágio probatório.",
      "B": "Três anos, a partir da data do documento que publicou a aptidão na seleção psicofísica.",
      "C": "Cinco anos, para coincidir com o primeiro ciclo de avaliação de desempenho.",
      "D": "Seis meses, sendo necessária nova IS para todas as renovações de compromisso anual."
    },
    "gabarito": "B",
    "explicacao": "A validade é estabelecida no Capítulo 2, item 2.1.2, alínea 'g', que define o prazo de três anos para as IS de ingresso no SAM e SMV. A contagem inicia na data da publicação do resultado de aptidão na seleção psicofísica. Esta regra padroniza o ciclo de controle trienal, dispensando novas inspeções para renovações de compromisso anual durante esse período."
  },
  {
    "caso": "16",
    "enunciado": "Um militar de carreira realizou a Inspeção de Saúde de Controle Trienal com um Médico Perito Isolado (MPI) e a perícia foi numerada no SINAIS. De acordo com a DGPM-406, qual o prazo máximo para a expedição da mensagem de conclusão aos destinatários?",
    "alternativas": {
      "A": "Cinco dias úteis após a data de conclusão da IS.",
      "B": "Sete dias úteis após a data de conclusão da IS.",
      "C": "Dez dias úteis após a data de conclusão da IS.",
      "D": "Vinte dias corridos após a data de conclusão da IS."
    },
    "gabarito": "C",
    "explicacao": "Conforme o item 2.3.2 das Normas para Encaminhamento, a mensagem informando o resultado da IS deve ser expedida aos destinatários no máximo em dez dias úteis após a data de conclusão da IS. Esta mensagem deve conter dados completos do inspecionado, finalidade, data de conclusão, laudo (sem diagnóstico) e o número do TIS."
  },
  {
    "caso": "17",
    "enunciado": "Um militar apresenta-se para Inspeção de Saúde portando exames complementares realizados em laboratório civil. De acordo com a DGPM-406, como o Agente Médico-Pericial (AMP) deve proceder em relação a esses exames?",
    "alternativas": {
      "A": "O AMP deve obrigatoriamente aceitar qualquer exame de laboratório civil, desde que esteja dentro do prazo de validade.",
      "B": "O AMP deve recusar sumariamente exames externos, exigindo a repetição em Organização Militar de Saúde (OMS).",
      "C": "O AMP apreciará os resultados, mas tem autonomia para determinar a repetição ou novos exames se julgar necessário.",
      "D": "Exames civis só têm validade se forem acompanhados de firma reconhecida do médico responsável pelo laboratório."
    },
    "gabarito": "C",
    "explicacao": "O item 3.1.1 estabelece que a JS/AMP apreciará os resultados de exames complementares apresentados, mas não ficará restrita a eles. Com base na autonomia da função pericial (item 1.3, alínea 'o'), o perito pode valer-se dos subsídios técnicos que julgar necessários e determinar a repetição ou novos exames para melhor avaliar a aptidão psicofísica."
  },
  {
    "caso": "18",
    "enunciado": "Qual o procedimento correto para o preenchimento dos diagnósticos no Termo de Inspeção de Saúde (TIS) digital, visando a preservação do sigilo médico conforme a DGPM-406?",
    "alternativas": {
      "A": "Os diagnósticos devem ser lançados apenas por meio de códigos CID-10 no modelo DS-1A para facilitar a leitura administrativa.",
      "B": "O diagnóstico por extenso deve constar no modelo DS-1 (completo), enquanto o modelo DS-1A (simplificado) deve omiti-lo.",
      "C": "É proibido o lançamento de qualquer diagnóstico, mesmo codificado, em qualquer via do TIS devido à Lei Geral de Proteção de Dados.",
      "D": "O diagnóstico deve ser escrito em vermelho e centralizado no cabeçalho de todas as mensagens de conclusão de IS."
    },
    "gabarito": "B",
    "explicacao": "O item 2.3.1 define que o TIS possui dois modelos: o DS-1 (completo), destinado à autoridade médica e arquivos, e o DS-1A (simplificado), para autoridade administrativa. O DS-1A contém apenas o sumário da IS e, conforme o item 2.3.2, as mensagens de conclusão devem conter o laudo sem menção ao diagnóstico, preservando o sigilo profissional conforme a Constituição e a Lei de Acesso à Informação."
  },
  {
    "caso": "19",
    "enunciado": "Um militar não comparece à Inspeção de Saúde agendada e não apresenta justificativa em tempo hábil. Qual deve ser a conduta do Agente Médico-Pericial (AMP) segundo as normas vigentes?",
    "alternativas": {
      "A": "O AMP deve aguardar por 30 dias antes de tomar qualquer medida administrativa.",
      "B": "O AMP deve proceder ao arquivamento da IS no SINAIS após comunicação da ausência por mensagem.",
      "C": "O AMP deve emitir automaticamente um laudo de 'Inapto' por falta de comparecimento.",
      "D": "O AMP deve solicitar à Polícia Naval a condução coercitiva do militar para a realização da perícia."
    },
    "gabarito": "B",
    "explicacao": "De acordo com o item 2.1.2, alíneas 'b' e 'c', os militares devem comparecer ou agendar a IS em até sete dias úteis. A inobservância desse prazo ou a ausência na data agendada sem comunicação antecipada demanda o arquivamento da IS no SINAIS pelo AMP, após comunicação da ausência por mensagem. Caberá então à OM do inspecionado reapresentá-lo."
  },
  {
    "caso": "20",
    "enunciado": "Sobre a composição das Juntas de Saúde, qual o procedimento correto caso ocorra empate em uma votação pericial devido à ausência ou impedimento de um dos membros?",
    "alternativas": {
      "A": "O voto do Presidente tem peso duplo para desempatar a questão (Voto de Minerva).",
      "B": "A Junta deve suspender a sessão e aguardar o retorno do membro ausente por até 60 dias.",
      "C": "A Junta deverá declinar a competência para outra Junta de mesma instância ou instância superior.",
      "D": "O médico mais antigo da OM deve ser convocado extraordinariamente apenas para proferir o voto de desempate."
    },
    "gabarito": "C",
    "explicacao": "Conforme o item 1.3, alínea 'm', se houver empate de votos (em situações de ausência ou impedimento), a JS deverá declinar competência para outra JS de mesma instância ou, na impossibilidade, para instância imediatamente superior. O processo deve obedecer preferencialmente ao critério geográfico e requer entendimento prévio entre os titulares das OM envolvidas."
  },
  {
    "caso": "21",
    "enunciado": "Em relação às IS Extraordinárias, quem detém a competência para requisitá-las no âmbito da Marinha?",
    "alternativas": {
      "A": "Apenas o Diretor de Saúde da Marinha (DSM).",
      "B": "Qualquer Oficial com posto de Capitão de Mar e Guerra ou superior.",
      "C": "CM, DGPM, DSM, Titulares de SDP e Autoridade Judiciária.",
      "D": "Apenas o Comandante da Marinha por meio de Portaria específica."
    },
    "gabarito": "C",
    "explicacao": "As IS Extraordinárias são aquelas determinadas por autoridade judiciária ou de interesse da Administração Naval não previstas como rotina. Segundo o item 2.1.4, alínea 'b', a competência para requisitá-las é do Comandante da Marinha (CM), Diretor-Geral do Pessoal (DGPM), Diretor de Saúde (DSM), Titulares de SDP em suas áreas e Autoridade Judiciária."
  },
  {
    "caso": "22",
    "enunciado": "Um militar julgado 'Inapto' em uma IS de rotina deseja contestar o laudo. Qual o procedimento e o prazo para solicitar o recurso?",
    "alternativas": {
      "A": "O militar tem 30 dias para solicitar recurso ao Diretor do CPMM.",
      "B": "O militar deve assinar o 'Conhecimento de Recurso' e requerer nova IS para a instância superior em tempo hábil.",
      "C": "Não cabe recurso para IS de rotina, apenas para IS de ingresso ou seleção.",
      "D": "O recurso é automático e a JRS deve reavaliar o caso em até 48 horas após a primeira conclusão."
    },
    "gabarito": "B",
    "explicacao": "O direito ao recurso é garantido pelo item 2.1.2, alínea 'd', permitindo que o inspecionado requeira IS para o AMP de instância imediatamente superior. Por ocasião da conclusão da IS, o militar deve ser informado de seus direitos através do formulário 'Conhecimento de Recurso' (Anexo T), conforme o item 2.3.1, alínea 'h'. Os prazos e trâmites específicos seguem o Capítulo 12 das normas."
  },
  {
    "caso": "23",
    "enunciado": "Qual a validade de uma Inspeção de Saúde para fim de 'Justiça e Disciplina' e 'Exclusão do Serviço Ativo' (ESAM) para produzir efeito administrativo?",
    "alternativas": {
      "A": "30 dias para Justiça e Disciplina; 180 dias para ESAM.",
      "B": "90 dias para ambas as modalidades.",
      "C": "1 ano, desde que o estado de saúde do militar não se altere.",
      "D": "15 dias para Justiça e Disciplina; 30 dias para ESAM."
    },
    "gabarito": "A",
    "explicacao": "Conforme o item 2.3.3, alínea 'f', a OM deve observar o prazo de validade de trinta dias para IS de Justiça e Disciplina e de 180 dias para IS de ESAM. Estes prazos são definidos para garantir a atualidade do estado psicofísico do militar no momento do ato administrativo, em conformidade com o Estatuto dos Militares."
  },
  {
    "caso": "24",
    "enunciado": "Sobre a realização de IS em Servidores Civis (SC), qual documento é obrigatório para a sua apresentação formal ao Agente Médico-Pericial?",
    "alternativas": {
      "A": "Sistema Eletrônico de Inspeção de Saúde (SEIS).",
      "B": "Guia de Encaminhamento Digital via SINAIS.",
      "C": "Ofício assinado pelo Titular da OM.",
      "D": "Papeleta de Atendimento Médico (PAM)."
    },
    "gabarito": "C",
    "explicacao": "O item 2.1.2, alínea 'a', especifica que enquanto os militares da ativa são apresentados preferencialmente pelo SEIS, os Servidores Civis devem ser, obrigatoriamente, apresentados por ofício. O Capítulo 10 detalha as rotinas específicas para SC, incluindo ingresso, controle periódico e VDF, mantendo a necessidade da formalização documental por ofício."
  }
];

interface Props {
  onBack: () => void;
}

export const CasosPericiais: React.FC<Props> = ({ onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const currentCase = CASOS_DATA[currentIndex];
  const totalCases = CASOS_DATA.length;
  // Documentação: Calcula o progresso para a barra
  const progressPercentage = ((currentIndex + 1) / totalCases) * 100;

  // Documentação: Lida com a seleção da alternativa do utilizador
  const handleSelect = (key: string) => {
    if (selectedAnswer !== null) return; // Previne múltiplos cliques
    setSelectedAnswer(key);
  };

  // Documentação: Avança para a próxima questão
  const handleNext = () => {
    if (currentIndex < totalCases - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
    }
  };

  // Documentação: Reinicia o Quiz ao chegar ao fim
  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
  };

  // Documentação: Função de styling dinâmica das alternativas com base no estado de resposta
  const getOptionStyle = (key: string) => {
    if (selectedAnswer === null) {
      return "bg-white border-gray-200 hover:border-[#050F41] hover:shadow-md cursor-pointer font-normal text-gray-700";
    }

    // Normalização para evitar erros com letras maiúsculas/minúsculas vindas do JSON
    const isCorrect = key.toUpperCase() === currentCase.gabarito.toUpperCase();
    const isSelected = key.toUpperCase() === selectedAnswer.toUpperCase();

    if (isCorrect) {
      // Documentação: Alternativa correta destacada a verde e em negrito
      return "bg-green-100 border-green-500 text-green-900 font-bold shadow-sm";
    }
    if (isSelected && !isCorrect) {
      // Documentação: Alternativa errada selecionada destacada a vermelho e em negrito
      return "bg-red-50 border-red-400 text-red-900 font-bold shadow-sm";
    }

    // Documentação: Alternativas não selecionadas perdem destaque
    return "bg-gray-50 border-gray-100 opacity-60 cursor-default font-normal text-gray-500";
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="CASOS PERICIAIS" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      {/* Documentação: Barra de Progresso Discreta */}
      <div className="w-full h-1.5 bg-gray-200">
        <div 
          className="h-full bg-[#079551] transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="p-4 space-y-6 max-w-3xl mx-auto w-full flex-1 pb-32">
        {/* Documentação: Contador de Casos (Removido o box Desafio X) */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Caso {currentIndex + 1} de {totalCases}
          </span>
        </div>

        {/* Documentação: Enunciado com destaque visual discreto */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-[#050F41] font-heading text-[16px] leading-relaxed font-semibold">
            {currentCase.enunciado}
          </p>
        </div>

        {/* Documentação: Alternativas */}
        <div className="space-y-3">
          {Object.entries(currentCase.alternativas).map(([key, text]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={selectedAnswer !== null}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-300 text-sm font-body leading-relaxed flex items-start gap-3 focus:outline-none ${getOptionStyle(key)}`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5 ${
                selectedAnswer === null ? 'border-gray-300 text-gray-500 bg-gray-50' :
                key.toUpperCase() === currentCase.gabarito.toUpperCase() ? 'border-green-500 bg-green-500 text-white' :
                (key.toUpperCase() === selectedAnswer.toUpperCase() ? 'border-red-500 bg-red-500 text-white' : 'border-gray-200 text-gray-300')
              }`}>
                {key.toUpperCase()}
              </div>
              <span className="flex-1 mt-0.5">{text}</span>
            </button>
          ))}
        </div>

        {/* Documentação: Explicação com contraste melhorado */}
        {selectedAnswer !== null && (
          <div className="animate-fade-in bg-yellow-50/80 border border-yellow-200 p-5 rounded-2xl mt-6 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400"></div>
            <h3 className="text-sm font-bold font-heading text-[#050F41] mb-2 uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-yellow-600">lightbulb</span>
              Análise Pericial
            </h3>
            <p className="text-sm text-gray-800 font-body leading-relaxed text-justify">
              {currentCase.explicacao}
            </p>
          </div>
        )}
      </div>

      {/* Documentação: FAB: Botão de Avançar */}
      {selectedAnswer !== null && (
        <button 
          onClick={currentIndex < totalCases - 1 ? handleNext : handleRestart}
          className="fixed bottom-24 right-6 bg-[#050F41] text-white shadow-2xl rounded-full p-4 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-slate-700 animate-fade-in"
          title={currentIndex < totalCases - 1 ? "Próximo Caso" : "Reiniciar Casos"}
        >
          {currentIndex < totalCases - 1 ? <ChevronRight size={24} /> : <RotateCcw size={24} />}
        </button>
      )}
    </div>
  );
};
