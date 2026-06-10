import React from 'react';

export const IntroSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center border-b border-gray-100 pb-4 mb-4">
        <p className="text-[11px] font-bold text-gray-400 tracking-widest leading-none uppercase">DIÁRIO OFICIAL DA UNIÃO</p>
        <p className="text-[10px] text-gray-500 mt-1">
          Publicado em: 31/08/2021 | Edição: 165 | Seção: 1 | Página: 13
          <br />
          Órgão: Ministério da Defesa/Gabinete do Ministro
        </p>
      </div>

      <div className="bg-navy/5 p-4 rounded-xl border border-navy/10 text-center">
        <h2 className="text-sm font-bold text-navy uppercase font-heading tracking-wide">
          PORTARIA GM-MD N° 3.551, DE 26 DE AGOSTO DE 2021
        </h2>
        <p className="text-xs text-gray-600 mt-2 text-justify leading-relaxed max-w-xl mx-auto italic">
          "Aprova as normas para a avaliação pericial dos portadores de doenças especificadas em lei pelas Juntas de Inspeção de Saúde e pelos Agentes Médico-Periciais da Marinha, do Exército, da Aeronáutica e do Hospital das Forças Armadas, bem como os padrões e critérios para a concessão de benefícios aos seus pensionistas, dependentes ou beneficiários."
        </p>
      </div>

      <div className="text-xs text-gray-600 space-y-3 leading-relaxed text-justify">
        <p>
          O MINISTRO DE ESTADO DA DEFESA, no uso das atribuições que lhe confere o art. 87, parágrafo único, inciso II da Constituição, tendo em vista o disposto no art. 43, inciso XII, do Anexo I do Decreto nº 9.570, de 20 de novembro de 2018, e considerando o que consta do Processo Administrativo nº 60550.003348/2021-97, resolve:
        </p>
        <p>
          <strong>Art. 1º</strong> Ficam aprovadas as normas para avaliação pericial dos portadores de doenças especificadas em lei pelas Juntas de Inspeção de Saúde e pelos Agentes Médico-Periciais (AMP) da Marinha, do Exército, da Aeronáutica e do Hospital das Forças Armadas (HFA), bem como os padrões e critérios para a concessão de benefícios aos seus pensionistas, dependentes ou beneficiários, na forma do Anexo a esta Portaria.
        </p>
        <p>
          <strong>Art. 2º</strong> Ficam revogadas:
          <br />
          I - a Portaria Normativa nº 47/GM-MD, de 21 de julho de 2016, publicada no Diário Oficial da União nº 147, Seção 1, página 8, de 2 de agosto de 2016; e
          <br />
          II - a Portaria Normativa nº 93/GM-MD, de 29 de outubro de 2020, publicada no Diário Oficial da União nº 217, Seção 1, página 17, de 13 de novembro de 2020.
        </p>
        <p>
          <strong>Art. 3º</strong> Esta Portaria entra em vigor em 1º de outubro de 2021.
        </p>
        
        <p className="text-center font-bold text-navy mt-4 uppercase">WALTER SOUZA BRAGA NETTO</p>
      </div>

      <div className="w-full h-px bg-gray-100 my-4" />

      {/* ANEXO */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-navy text-center uppercase tracking-wide">
          ANEXO — NORMAS PARA AVALIAÇÃO PERICIAL
        </h2>
        <p className="text-xs text-gray-500 italic text-justify leading-relaxed">
          NORMAS PARA AVALIAÇÃO PERICIAL DOS PORTADORES DE DOENÇAS ESPECIFICADAS EM LEI PELAS JUNTAS DE INSPEÇÃO DE SAÚDE E PELOS AGENTES MÉDICO PERICIAIS (APM) DA MARINHA, DO EXÉRCITO, DA AERONÁUTICA E DO HOSPITAL DAS FORÇAS ARMADAS, E PARA ESTABELECIMENTO DOS PADRÕES E CRITÉRIOS PARA A CONCESSÃO DE BENEFÍCIOS AOS SEUS PENSIONISTAS, DEPENDENTES OU BENEFICIÁRIOS.
        </p>

        <h3 className="text-xs font-bold text-navy uppercase mt-6">
          CAPÍTULO I — DA FINALIDADE, DA APLICAÇÃO E DA FUNDAMENTAÇÃO LEGAL
        </h3>
        
        <p className="text-xs font-bold text-navy mt-2">Finalidade</p>
        <p className="text-xs text-gray-600 text-justify">
          As normas têm por finalidade relacionar as doenças que, à luz de dispositivos legais, são consideradas graves e potencialmente incapacitantes, e padronizar os procedimentos a serem adotados pelas Juntas de Inspeção de Saúde e pelos Agentes Médico-Periciais (AMP) da Marinha, do Exército, da Aeronáutica e do Hospital das Forças Armadas (HFA), visando à uniformização dos laudos médico-periciais por elas exarados.
          Também visam padronizar os critérios internos para concessão de benefícios de isenção de Imposto de Renda (IR) na avaliação de militares reformados pensionistas e dependentes de militares.
        </p>

        <p className="text-xs font-bold text-navy mt-3">Aplicação</p>
        <p className="text-xs text-gray-600 text-justify">
          Aplicam-se às Juntas de Inspeção de Saúde e aos AMP das Forças Armadas e do HFA e sua utilização será facilitada por instruções de cada Força, de maneira a atender às peculiaridades dos respectivos sistemas médico-periciais.
        </p>

        <p className="text-xs font-bold text-navy mt-3">Fundamentação</p>
        <p className="text-xs text-gray-600 text-justify">
          Os seguintes instrumentos legais serviram de base à elaboração destes normativos:
          <br />
          a) Lei nº 6.880, de 9 de dezembro de 1980;
          <br />
          b) Lei nº 7.670, de 8 de setembro de 1988;
          <br />
          c) Lei nº 7.713, de 22 de dezembro de 1988 (inciso XIV do art. 6º, alterado pela Lei nº 11.052, de 29 de dezembro de 2004) e Lei nº 8.541, de 23 de dezembro de 1992; e
          <br />
          d) Instrução Normativa nº 1.500/RFB, de 29 de outubro de 2014.
        </p>

        <h3 className="text-xs font-bold text-navy uppercase mt-6">
          CAPÍTULO II — DAS CONSIDERAÇÕES PRELIMINARES
        </h3>

        <p className="text-xs font-bold text-navy mt-2">Apresentação</p>
        <p className="text-xs text-gray-600 text-justify">
          A rápida evolução dos conhecimentos científicos, o aparecimento de métodos semiológicos mais sensíveis, as novas descobertas sobre as doenças e seus mecanismos e os avanços terapêuticos ocorridos após a aprovação da 1ª edição da FA-N-06 "Normas para Avaliação das Doenças Incapacitantes", tornaram imperativas a revisão e atualização periódica dessa publicação, com suas últimas revisões realizadas por meio da Portaria Normativa nº 1.174, em 6 de setembro de 2006, e da Portaria Normativa nº 183, de 8 de fevereiro de 2010, ambas deste Ministério da Defesa.
          <br />
          Esta edição é resultado do trabalho conjunto desenvolvido pelo Ministério da Defesa, por intermédio do Departamento de Saúde e Assistência Social (DESAS), da Secretaria de Pessoal, Ensino, Saúde e Desporto (SEPESD) e pelas Diretorias de Saúde dos Comandos das Forças.
          <br />
          Por fim, modificações significativas foram introduzidas, sendo mantidos os dados considerados indispensáveis para o enquadramento legal dos inspecionados, visando a um critério uniforme na emissão dos laudos médico-periciais. Foram utilizados também, como subsídios, diversos consensos e diretrizes emitidos pelas Sociedades Médicas de Classes.
        </p>

        <p className="text-xs font-bold text-navy mt-4">Conceitos relevantes</p>
        <p className="text-xs text-gray-600 text-justify space-y-2">
          Para o entendimento desta legislação, são relevantes os seguintes conceitos:
          <br />
          <strong>a) incapacidade:</strong> é a perda temporária ou definitiva pelo inspecionado da capacidade laboral em decorrência das repercussões clínicas de determinada patologia; e
          <br />
          <strong>b) invalidez:</strong> é a perda definitiva pelo inspecionado das condições mínimas de saúde para o exercício de qualquer atividade laboral formal, nos âmbitos civil ou militar.
          <br />
          Nos casos de inspecionados em atividade, pensionistas e dependentes, o enquadramento em invalidez obedece a parâmetros clínico-funcionais específicos para cada caso, comprovada a repercussão da doença sobre a capacidade laboral em caráter amplo e definitivo, seja por doença especificada em lei ou não.
          <br />
          Para a avaliação de inspecionados inativos, já reformados por idade-limite ou por doença, a invalidez deverá ser avaliada pelo grau de limitação imposto pela doença especificada na realização das atividades rotineiras inerentes às suas faixas etárias.
          <br />
          Não há critérios rígidos para enquadramento em invalidez, mesmo nos casos em que tal condição decorra de doenças especificadas em lei. Por outro lado, nos casos daquelas doenças em que por denominação ou definição, a incapacidade para todo e qualquer trabalho seja condição inerente, como nos casos de alienação mental, cardiopatia grave, cegueira, estados avançados da doença de Paget, nefropatia grave, paralisia irreversível e incapacitante e hepatopatia grave, o enquadramento em invalidez torna-se mandatório.
          <br />
          Nos casos das doenças em que o enquadramento legal não está necessariamente atrelado à condição de invalidez, esta decorrerá da análise de todos os fatores médico-periciais pertinentes a cada caso em particular que subsidiem tal enquadramento, como a condição clínica do periciado, quer seja decorrente da própria doença ou de seus tratamentos; a reversibilidade ou não das repercussões da doença sobre a capacidade laboral ou atividades rotineiras; a progressão inexorável a despeito do tratamento, dentre outras, podendo as Juntas de Inspeção de Saúde e os AMP se valerem de todo e qualquer elemento preconizado pela literatura médica, como a utilização de escalas de avaliação clínica e de incapacidade.
          <br />
          Tais fatores abrangem também a avaliação médico-pericial dos militares da ativa, quando do diagnóstico de doenças especificadas em lei consideradas passíveis de controle.
          <br />
          Cada Força Singular deverá emitir normas e criar formatações de laudos no que diz respeito à validade do laudo pericial realizado em militar, dependente ou pensionista, em atendimento ao disposto no § 1º do art. 30 da Lei nº 9.250, de 26 de dezembro de 1995. Constatada invalidez ou a irreversibilidade do quadro clínico que subsidiou o enquadramento legal, deverá constar após o laudo a expressão "por tempo indeterminado".
          <br />
          Nos casos de doenças previstas em lei passíveis de controle, as Juntas de Inspeção de Saúde e os AMP determinarão o período de validade do respectivo enquadramento, com base nos dados da literatura especializada, respeitadas as peculiaridades de cada doença e a individualidade do inspecionado.
          <br />
          Não haverá inspeção de saúde para fins de manutenção da isenção do benefício do imposto de renda incidente nos proventos de reforma ou de pensão dela decorrentes.
        </p>

        <p className="text-xs font-bold text-navy mt-4">Revisão de laudo de incapacidade ou invalidez</p>
        <p className="text-xs text-gray-600 text-justify">
          A revisão de laudo de incapacidade ou invalidez, em qualquer situação, somente será feita por meio de nova inspeção de saúde, pela mesma instância da Junta de Saúde na qual o laudo foi exarado, ou outra de instância superior, quando determinado por órgão de pessoal competente ou por solicitação de uma Junta de Inspeção de Saúde ou AMP, quando verificar insubsistência para a manutenção do laudo anteriormente exarado.
        </p>

        <p className="text-xs font-bold text-navy mt-4">Quadro sinóptico de patologias</p>
        <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
          <table className="min-w-full text-center text-[10px] bg-white text-gray-600 divide-y divide-gray-100">
            <thead className="bg-gray-50 text-gray-700 font-bold">
              <tr>
                <th className="p-2 border-r text-left">Condição legal</th>
                <th className="p-2 border-r">Lei nº 6.880/80 (Estatuto)</th>
                <th className="p-2">Lei nº 11.052/04 (Imposto de Renda)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="p-2 border-r text-left font-bold">Alienação Mental</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r text-left font-bold">Cardiopatia Grave</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr><td className="p-2 border-r text-left font-bold">Cegueira</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r text-left font-bold">Espondilite Anquilosante</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr><td className="p-2 border-r text-left font-bold">Mal de Paget (Avançado)</td><td className="p-1 border-r text-red-500">Não</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r text-left font-bold">Hanseníase</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr><td className="p-2 border-r text-left font-bold">Doença de Parkinson</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r text-left font-bold">Nefropatia Grave</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr><td className="p-2 border-r text-left font-bold">Neoplasia Maligna</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r text-left font-bold">Paralisia Irreversível</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr><td className="p-2 border-r text-left font-bold">Pênfigo</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-red-500">Não</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r text-left font-bold">SIDA/AIDS</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr><td className="p-2 border-r text-left font-bold">Tuberculose Ativa</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r text-left font-bold">Hepatopatia Grave</td><td className="p-1 border-r text-red-500">Não</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr><td className="p-2 border-r text-left font-bold">Contaminação por Radiação</td><td className="p-1 border-r text-red-500">Não</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr className="bg-gray-50"><td className="p-2 border-r text-left font-bold">Esclerose Múltipla</td><td className="p-1 border-r text-green-600">Sim</td><td className="p-1 text-green-600">Sim</td></tr>
              <tr><td className="p-2 border-r text-left font-bold">Fibrose Cística</td><td className="p-1 border-r text-red-500">Não</td><td className="p-1 text-green-600">Sim</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
