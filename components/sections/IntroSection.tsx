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
          "Aprova as normas para a avaliação pericial dos portadores de doenças especificadas em lei pelas Juntas de Inspecção de Saúde e pelos Agentes Médico-Periciais da Marinha, do Exército, da Aeronáutica e do Hospital das Forças Armadas, bem como os padrões e critérios para a concessão de benefícios aos seus pensionistas, dependentes ou beneficiários."
        </p>
      </div>

      <div className="text-xs text-gray-600 space-y-3 leading-relaxed text-justify">
        <p>
          O MINISTRO DE ESTADO DA DEFESA, no uso das atribuições que lhe confere o art. 87, parágrafo único, inciso II da Constituição, tendo em vista o disposto no art. 43, inciso XII, do Anexo I do Decreto nº 9.570, de 20 de novembro de 2018, e considerando o que consta do Processo Administrativo nº 60550.003348/2021-97, resolve:
        </p>
        <p>
          <strong>Art. 1º</strong> Ficam aprovadas as normas para avaliação pericial dos portadores de doenças especificadas em lei pelas Juntas de Inspecção de Saúde e pelos Agentes Médico-Periciais (AMP) da Marinha, do Exército, da Aeronáutica e do Hospital das Forças Armadas (HFA), bem como os padrões e critérios para a concessão de benefícios aos seus pensionistas, dependentes ou beneficiários, na forma do Anexo a esta Portaria.
        </p>
        <p>
          <strong>Art. 2º</strong> Ficam revogadas:
          <br />
          I - a Portaria Normativa nº 47/GM-MD, de 21 de julho de 2016; e
          <br />
          II - a Portaria Normativa nº 93/GM-MD, de 29 de outubro de 2020.
        </p>
        <p>
          <strong>Art. 3º</strong> Esta Portaria entra em vigor em 1º de outubro de 2021.
        </p>
        <p className="text-center font-bold text-navy mt-4 uppercase">WALTER SOUZA BRAGA NETTO</p>
      </div>

      <div className="w-full h-px bg-gray-100 my-4" />

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-navy text-center uppercase tracking-wide">
          ANEXO — NORMAS PARA AVALIAÇÃO PERICIAL
        </h2>
        <p className="text-xs text-gray-500 italic text-justify leading-relaxed">
          NORMAS PARA AVALIAÇÃO PERICIAL DOS PORTADORES DE DOENÇAS ESPECIFICADAS EM LEI PELAS JUNTAS DE INSPECÇÃO DE SAÚDE E PELOS AGENTES MÉDICO PERICIAIS (APM) DA MARINHA, DO EXÉRCITO, DA AERONÁUTICA E DO HOSPITAL DAS FORÇAS ARMADAS.
        </p>

        <h3 className="text-xs font-bold text-navy uppercase mt-6">CAPÍTULO I — DA FINALIDADE, DA APLICAÇÃO E DA FUNDAMENTAÇÃO LEGAL</h3>
        
        <p className="text-xs font-bold text-navy mt-2">Finalidade</p>
        <p className="text-xs text-gray-600 text-justify">
          As normas têm por finalidade relacionar as doenças que, à luz de dispositivos legais, são consideradas graves e potencialmente incapacitantes, e padronizar os procedimentos a serem adotados pelas Juntas de Inspecção de Saúde e pelos Agentes Médico-Periciais (AMP) da Marinha, do Exército, da Aeronáutica e do Hospital das Forças Armadas (HFA), visando à uniformização dos laudos médico-periciais por elas exarados.
        </p>

        <p className="text-xs font-bold text-navy mt-3">Aplicação</p>
        <p className="text-xs text-gray-600 text-justify">
          Aplicam-se às Juntas de Inspecção de Saúde e aos AMP das Forças Armadas e do HFA.
        </p>

        <p className="text-xs font-bold text-navy mt-3">Fundamentação</p>
        <p className="text-xs text-gray-600 text-justify">
          Os seguintes instrumentos legais serviram de base à elaboração destes normativos:
          <br />
          a) Lei nº 6.880, de 9 de dezembro de 1980;
          <br />
          b) Lei nº 7.670, de 8 de setembro de 1988;
          <br />
          c) Lei nº 7.713, de 22 de dezembro de 1988; e
          <br />
          d) Instrução Normativa nº 1.500/RFB, de 29 de outubro de 2014.
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
