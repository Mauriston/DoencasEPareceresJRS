// Ficheiro: utils/catalogoMinutasMSG.ts
// Catálogo das 23 minutas de mensagem (modelos de referência da JRS/HNRe), editáveis em Administração › Modelos de Minuta MSG.
//  1–5   IS de finalidades gerais (resultado de 1 e de várias IS, falta à IS agendada, não comparecimento ao agendamento, resposta à APS);
//  6–10  Atestado de Origem (AO) — GUARDADAS: sem gatilho no app até os registros de AO serem implantados no app web;
//  11–23 IS finalidade Benefícios (padrão em utils/minutasBeneficiosPadrao.ts).
// Cada minuta tem DE/PARA/INFO/ASSUNTO/TEXTO com {{placeholders}} (PLACEHOLDERS_CATALOGO). Gravadas em config/minutasMSG.{chave}
// (mesmo documento dos 3 modelos em uso — utils/modelosMinutaMSG.ts), campo vazio = texto padrão. Os 3 modelos em uso
// (resultado, incapacidade definitiva, cancelamento) seguem gerando as minutas do app; o catálogo ainda não tem gatilhos.
// Observação sobre a transcrição: "exarou o seguinte laudo:" repetido e aspas sem fechar foram corrigidos; placeholders
// {{OM Origem}} etc. viraram chaves em snake_case.

export type GrupoMinuta = 'gerais' | 'ao' | 'beneficios';
export const ROTULO_GRUPO_MINUTA: Record<GrupoMinuta, { titulo: string; ajuda: string }> = {
  gerais: { titulo: 'IS de finalidades gerais', ajuda: 'Minutas 1 a 5: resultado, arquivamento por falta ou não agendamento e resposta às APS.' },
  ao: { titulo: 'Atestado de Origem', ajuda: 'Minutas 6 a 10. Guardadas: ainda não há gatilho no app (dependem do registro dos AO no app web).' },
  beneficios: { titulo: 'IS finalidade Benefícios', ajuda: 'Minutas 11 a 23: resposta à APS e resultados por tipo de beneficiário. O padrão está em "Padrão dos Benefícios" abaixo.' },
};

export interface CampoMinuta { chave: 'de' | 'para' | 'info' | 'assunto' | 'texto'; rotulo: string; longo?: boolean }
export interface MinutaCatalogo {
  n: number;
  chave: string;
  grupo: GrupoMinuta;
  titulo: string;
  /** Contexto de uso / norma. */
  ajuda: string;
  /** Anotação do modelo original sobre como PARA/INFO são definidos. */
  roteamento?: string;
  /** Campos editáveis (os que o modelo usa). */
  campos: CampoMinuta[];
  padrao: Record<string, string>;
}

const C = {
  de: { chave: 'de', rotulo: 'DE' } as CampoMinuta,
  para: { chave: 'para', rotulo: 'PARA' } as CampoMinuta,
  info: { chave: 'info', rotulo: 'INFO' } as CampoMinuta,
  assunto: { chave: 'assunto', rotulo: 'ASSUNTO' } as CampoMinuta,
  texto: { chave: 'texto', rotulo: 'TEXTO', longo: true } as CampoMinuta,
};
const TODOS: CampoMinuta[] = [C.de, C.para, C.info, C.assunto, C.texto];
const SEM_INFO: CampoMinuta[] = [C.de, C.para, C.assunto, C.texto];
const chave = (n: number) => `m${String(n).padStart(2, '0')}`;
const L = (...linhas: string[]) => linhas.join('\n');

const TIS_BRAVO = 'BRAVO - O REF TIS (modelo DS-1A) pode ser verificado digitalmente por meio do acesso ao sítio “https://sinais.dsm.mb/tisonline”, informando o código de validação {{ds1a}} e selecionando a opção “Download do TIS” BT';
const ASSUNTO_BENEFICIOS = 'RESULTADO DE IS FIM CONCESSÃO DE BENEFÍCIOS - {{inspecionado}}';
const FRASES_MILITAR = '(Não necessita de internação permanente. Não necessita de assistência ou cuidados permanentes de enfermagem). (Não apresenta histórico de doença especificada na Lei nº 7.713/1988, alterada pelas Leis nº 8.541/1992 e 9.250/1995 e 11.052/2004.) (Não apresenta critérios de incapacidade definitiva para o SAM na presente data.) (Não foi verificada doença grave especificada em Lei na presente data.) (Não está inválido na presente data.)';
const DOENCA_LEI = 'Lei nº 7.713/1988, alterada pelas Leis nº 8.541/1992 e 9.250/1995 e 11.052/2004';
const NAO_DOENCA = `Não apresenta histórico de doença especificada na ${DOENCA_LEI}. Não foi verificada doença grave especificada em Lei na presente data.`;
const COM_DOENCA = `Tem histórico médico de doença especificada na ${DOENCA_LEI}, a partir de {{data_pre_existencia}}. A doença especificada em Lei é preexistente à {{data_pre_existencia}}.`;

/** Abertura das minutas de resultado de Benefícios (12–18, 20–23). */
const abertura = (qualif: string) => `{{data_hora_aps}}, PTC JRS/HNRe concluiu em {{data_conclusao}}, IS FIM Concessão de Benefícios ${qualif}, e:`;
const resultadoBeneficios = (qualif: string, laudo: string) => L(abertura(qualif), `ALFA - exarou o seguinte laudo: “${laudo}”, ACD TIS nº {{tis}}; e`, TIS_BRAVO);

export const CATALOGO_MINUTAS_MSG: MinutaCatalogo[] = [
  // ---- 1 a 5: finalidades gerais
  {
    n: 1, chave: chave(1), grupo: 'gerais', titulo: 'Resultado de 1 IS', ajuda: 'Comunicação do resultado de uma IS de finalidade geral (referência do modelo "Resultado da IS" em uso).', campos: TODOS,
    roteamento: 'PARA e INFO: tabela de destinatários do Anexo M (data/destinatariosInspecoes.json).',
    padrao: {
      de: 'HOSRCF', para: '{{para}}', info: '{{info}}', assunto: 'IS FIM {{finalidade}} - {{inspecionado}} ({{om}})',
      texto: L('ALFA - PTC {{amp}} concluiu em {{data_conclusao}}, a IS FIM {{finalidade}} atinente ao {{inspecionado}} ({{om}}) e exarou o seguinte laudo: “{{laudo}}”. (Deverá ser dispensada de {{restricoes}}.  ACD TIS nº {{tis}}; e', TIS_BRAVO),
    },
  },
  {
    n: 2, chave: chave(2), grupo: 'gerais', titulo: 'Resultado de mais de uma IS', ajuda: 'Só IS de mesma finalidade e mesmos destinatários (PARA/INFO). Repetir UNO, DOIS, TRÊS… uma linha por IS.', campos: TODOS,
    padrao: {
      de: 'HOSCRF', para: '{{para}}', info: '{{info}}', assunto: 'INSPEÇÕES DE SAÚDE FIM {{finalidade}}',
      texto: L('ALFA - PTC JRS/HNRe concluiu as IS FIM {{finalidade}} dos MIL abaixo relacionados:',
        'UNO - em {{data_conclusao}}: {{inspecionado}} ({{om}}) e exarou o seguinte laudo: “{{laudo}}”. (Deverá ser dispensada de {{restricoes}})  ACD TIS nº {{tis}} e Código DS-1A: {{ds1a}};',
        'DOIS - em {{data_conclusao}}: {{inspecionado}} ({{om}}) e exarou o seguinte laudo: “{{laudo}}”. (Deverá ser dispensada de {{restricoes}})  ACD TIS nº {{tis}} e Código DS-1A: {{ds1a}};',
        'TRÊS…',
        'BRAVO - Os REF TIS (modelo DS-1A) podem ser verificados digitalmente por meio do acesso ao sítio “https://sinais.dsm.mb/tisonline”, informando o respectivo Código DS-1A e selecionando a opção “Download do TIS” BT'),
    },
  },
  {
    n: 3, chave: chave(3), grupo: 'gerais', titulo: 'Falta à IS agendada', ajuda: 'Arquivamento da IS por não comparecimento na data agendada.', campos: TODOS,
    roteamento: 'PARA e INFO seguem a mesma lógica das mensagens de envio de resultados.',
    padrao: {
      de: 'HOSRCF', para: '{{para}}', info: '{{info}}', assunto: 'ARQUIVAMENTO IS FIM {{finalidade}} - {{inspecionado}} ({{om}})',
      texto: L('CFM alíneas “a” e “b” do inciso  2.1.2 e alínea “e” do inciso 2.3.3 da DGPM-406 (9ª rev), PTC:',
        'ALFA - JRS/HNRe procedeu ao arquivamento da IS FIM {{finalidade}} atinente ao {{inspecionado}} ({{om}}) agendada em {{data_entrevista}} por não comparecimento;',
        'BRAVO - o REF MIL deverá ser APS novamente via SEIS pelo encarregado da Divisão de Pessoal dessa OM para nova IS; e',
        'CHARLIE - os inspecionados são responsáveis pelo agendamento e comparecimento às JS na data marcada para realização de sua IS, podendo a inobservância de tal orientação ser caracterizada como contravenção disciplinar com medidas cabíveis a critério do Titular da OM BT'),
    },
  },
  {
    n: 4, chave: chave(4), grupo: 'gerais', titulo: 'Não comparecimento para agendamento (exceto Benefícios)', ajuda: 'Arquivamento da IS não agendada em 7 dias úteis da APS via SEIS.', campos: TODOS,
    roteamento: 'PARA e INFO seguem a mesma lógica das mensagens de envio de resultados.',
    padrao: {
      de: 'HOSRCF', para: '{{para}}', info: '{{info}}', assunto: 'ARQUIVAMENTO IS FIM {{finalidade}} - {{inspecionado}} ({{om}})',
      texto: L('CFM alíneas “a” e “b” do inciso  2.1.2 e alínea “e” do inciso 2.3.3 da DGPM-406 (9ª rev), PTC:',
        'ALFA - JRS/HNRe procedeu ao arquivamento da IS FIM {{finalidade}} atinente ao {{inspecionado}} ({{om}}) por não comparecer a esta JRS dentro do prazo de 7 dias úteis a contar da data de APS via SEIS;',
        'BRAVO - o REF MIL deverá ser APS novamente via SEIS pelo encarregado da Divisão de Pessoal para nova IS; e',
        'CHARLIE - os inspecionados são responsáveis pelo agendamento e comparecimento às JS na data marcada para realização de sua IS, podendo a inobservância de tal orientação ser caracterizada como contravenção disciplinar com medidas cabíveis a critério do Titular da OM BT'),
    },
  },
  {
    n: 5, chave: chave(5), grupo: 'gerais', titulo: 'Resposta às APS de militar da ativa por mensagem', ajuda: 'Resposta ao remetente da mensagem que apresentou o militar.', campos: TODOS,
    roteamento: 'PARA, INFO e ASSUNTO: o remetente e o assunto da mensagem que apresentou o militar.',
    padrao: {
      de: 'HOSCRF', para: '{{para}}', info: '{{info}}', assunto: '{{assunto_aps}}',
      texto: L('{{data_hora_aps}}, PTC:',
        'ALFA - ACS APS de {{inspecionado}} para IS FIM {{finalidade}} em {{data_entrevista}};',
        'BRAVO - CFM alíneas “a” e “b” do inciso  2.1.2  DGPM-406 (9ª rev) o inspecionado é responsável pelo agendamento da IS e deverá fazê-lo em no prazo máximo de 07 dias úteis, observando: ',
        'UNO - preferencialmente, deverá comparecer à secretaria da JRS/HNRe para agendar a IS; e',
        'DOIS - alternativamente, o agendamento poderá ser feito através do e-mail hnre.jrs@marinha.mil.br ou (81) 3036-9073.',
        'CHARLIE - a impossibilidade de comparecimento à data agendada deverá ser comunicada à secretaria da JRS/HNRe, de forma antecipada, para que seja procedido o reagendamento;',
        'DELTA - a inobservância ao prazo para agendamento constante no item BRAVO acarretará no arquivamento da IS BT'),
    },
  },
  // ---- 6 a 10: Atestado de Origem (guardadas)
  {
    n: 6, chave: chave(6), grupo: 'ao', titulo: 'Solicitação de AO — IS de licenciamento em andamento', ajuda: 'Subalínea II, alínea “a” do item 13.1.6 da DGPM-406 (9ª Rev).', campos: TODOS,
    padrao: {
      de: 'HOSRCF', para: '{{om_acidente}}', info: '{{om_atual}}', assunto: 'SOLICITAÇÃO DE ENVIO DE ATESTADO DE ORIGEM - {{inspecionado}} ({{om}})',
      texto: L('REF IS nº {{is}} FIM {{finalidade}} atinente ao {{inspecionado}} ({{om}}), PTC:',
        'ALFA - há registros de lavratura de Atestado de Origem relativo à acidente sofrido pelo REF inspecionado nessa OM em {{data_acidente}};',
        'BRAVO - SOL ENV 3 vias do AO por ofício a este Hospital Naval, tão logo seja possível, para que seja realizado o Exame de Sanidade para concluir o AO;',
        'CHARLIE - CFM subalinea II, alínea “a” do item 13.1.6 da DGPM-406 (9ª Revisão), a IS fim {{finalidade}} em andamento só poderá ser concluída após o fechamento do REF AO através da realização do Exame de Sanidade por esta Junta Regular BT'),
    },
  },
  {
    n: 7, chave: chave(7), grupo: 'ao', titulo: 'Solicitação de AO — IS de término em andamento (cura ou sequela)', ajuda: 'Subalínea IV, alínea “a” do item 13.1.6 da DGPM-406 (9ª Rev).', campos: TODOS,
    padrao: {
      de: 'HOSRCF', para: '{{om_acidente}}', info: '{{om_atual}}', assunto: 'SOLICITAÇÃO DE ENVIO DE ATESTADO DE ORIGEM - {{inspecionado}} ({{om}})',
      texto: L('REF IS nº {{is}} FIM {{finalidade}} atinente ao {{inspecionado}} ({{om}}), PTC:',
        'ALFA - há registros de lavratura de Atestado de Origem relativo à acidente sofrido pelo REF inspecionado nessa OM em {{data_acidente}};',
        'BRAVO - SOL ENV 3 vias do AO por ofício a este Hospital Naval, tão logo seja possível, para que seja realizado o Exame de Sanidade para concluir o AO;',
        'CHARLIE - CFM subalinea IV, alínea “a” do item 13.1.6 da DGPM-406 (9ª Revisão), a IS fim {{finalidade}} em andamento só poderá ser concluída após o fechamento do REF AO através da realização do Exame de Sanidade por esta Junta Regular BT'),
    },
  },
  {
    n: 8, chave: chave(8), grupo: 'ao', titulo: 'Solicitação de abertura de AO — militar com nexo causal', ajuda: 'Alínea “d” do item 13.1.3 e alínea “a” do item 13.1.2 da DGPM-406 (9ª Rev).', campos: TODOS,
    padrao: {
      de: 'HOSRCF', para: '{{om_origem}}', info: 'PERMED, PESMAR, TERDIS', assunto: 'LAVRATURA DE ATESTADO DE ORIGEM - {{inspecionado}} ({{om}})',
      texto: L('Em estrita observância ao disposto na alínea "d” item 13.1.3 da DGPM-406 (9ª Revisão), PTC:',
        'ALFA - {{inspecionado}} ({{om}}) foi submetido à IS fim {{finalidade}} pela JRS/HNRE em {{data_conclusao}} e foram verificados indícios de nexo de causalidade entre a Incapacidade Laboral constatada na IS e um acidente a bordo relatado pelo MIL, que desconhece a lavratura de AO à época;',
        'BRAVO - caso seja confirmada a não lavratura do AO e uma vez transcorridos 6 meses do acidente, a lavratura do AO deverá ser acompanhada por registros de convicção sobre os fatos envolvidos no acidente. Se necessário, caberá ao Titular dessa OM a abertura de sindicância para apurar os fatos, sobretudo se não houver testemunhas, nos termos da alínea “a” do item 13.1.2 da antecipada norma BT'),
    },
  },
  {
    n: 9, chave: chave(9), grupo: 'ao', titulo: 'Fechamento de AO — militar temporário', ajuda: 'Item 13.1.6 da DGPM-406 (9ª Rev). Uma via segue para o COM/3ºDN.', campos: TODOS,
    padrao: {
      de: 'HOSRCF', para: '{{om_origem}}', info: 'PERMED, TERDIS', assunto: 'FECHAMENTO DE ATESTADO DE ORIGEM - {{inspecionado}} ({{om}})',
      texto: L('Em observância ao disposto no item 13.1.6 da DGPM-406 (9ª Revisão), PTC:',
        'ALFA - JRS/HNRE concluiu em {{data_exame_sanidade}} o Exame de Sanidade do AO atinente ao {{inspecionado}} ({{om}}), cujas 3 vias físicas foram enviadas para numeração pelo DAMP/CPMM;',
        'BRAVO - Após a auditagem e numeração naquele Centro de Perícias, uma via do AO seguirá para essa OM para que seja anexada à CR do MIL e outra via seguirá para arquivamento no COM/3ºDN BT'),
    },
  },
  {
    n: 10, chave: chave(10), grupo: 'ao', titulo: 'Fechamento de AO — militar de carreira', ajuda: 'Item 13.1.6 da DGPM-406 (9ª Rev). Uma via segue para a DPM.', campos: TODOS,
    padrao: {
      de: 'HOSRCF', para: '{{om_origem}}', info: 'PERMED, PESMAR', assunto: 'FECHAMENTO DE ATESTADO DE ORIGEM - {{inspecionado}} ({{om}})',
      texto: L('Em observância ao disposto no item 13.1.6 da DGPM-406 (9ª Revisão), PTC:',
        'ALFA - JRS/HNRE concluiu em {{data_exame_sanidade}} o Exame de Sanidade do AO atinente ao {{inspecionado}} ({{om}}), cujas 3 vias físicas foram enviadas para numeração pelo DAMP/CPMM;',
        'BRAVO - Após a auditagem e numeração naquele Centro de Perícias, uma via do AO seguirá para essa OM para que seja anexada à CR do MIL e outra via seguirá para arquivamento na DPM BT'),
    },
  },
  // ---- 11 a 23: Benefícios
  {
    n: 11, chave: chave(11), grupo: 'beneficios', titulo: 'Resposta às APS — IS finalidade Benefícios', ajuda: 'Itens 2.1.2 “b” e “e” da DGPM-406 (9ª rev); prazo de agendamento de 60 dias.', campos: TODOS,
    roteamento: 'PARA e INFO: o remetente da mensagem que apresentou o militar; ASSUNTO: o da mensagem de APS.',
    padrao: {
      de: 'HOSCRF', para: '{{para}}', info: '{{info}}', assunto: '{{assunto_aps}}',
      texto: L('{{data_hora_aps}}, PTC:',
        'ALFA - ACS APS de {{inspecionado}} para IS FIM concessão de benefícios em {{data_atual}};',
        'BRAVO - CFM DGPM-406 (9ª rev) item 2.1.2 alínea “b” e “e” o inspecionado é responsável pelo agendamento da IS e deverá fazê-lo em no prazo máximo de 60 dias, observando: ',
        'UNO - preferencialmente, deverá comparecer (ou seu representante legal portando certidão de curatela ou procuração) à JRS/HNRe para fazer o agendamento da IS portando os documentos médicos que possam subsidiar o benefício pleiteado;',
        'DOIS - alternativamente, o agendamento poderá ser feito através do e-mail hnre.jrs@marinha.mil.br ou (81) 3036-9073; e',
        'TRÊS - em se tratando de IS domiciliar, o representante legal deverá apresentar a declaração recente do médico assistente onde conste textualmente que o inspecionado está recebendo visita médico-assistencial exclusivamente em sua residência, por encontrar-se impossibilitado de deslocar-se (inclusive de cadeira de rodas) para todo e qualquer atendimento na área de saúde; ',
        'CHARLIE - a inobservância ao prazo para agendamento constante no item BRAVO acarretará no arquivamento da IS BT'),
    },
  },
  {
    n: 12, chave: chave(12), grupo: 'beneficios', titulo: 'Resultado — não enquadramento de militar inativo do CFN (inclui almirantes)', ajuda: 'Alíneas “a”, “g”, “h”, “i” e “k” do inciso 9.1.6.', campos: TODOS,
    roteamento: 'Cada trecho entre parênteses do laudo entra ou não conforme as finalidades da IS e os laudos exarados.',
    padrao: {
      de: '{{remetente}}', para: 'PESCFN', info: 'SVCVPM', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('atinente ao {{inspecionado}}', FRASES_MILITAR),
    },
  },
  {
    n: 13, chave: chave(13), grupo: 'beneficios', titulo: 'Resultado — não enquadramento de almirante inativo (exceto CFN)', ajuda: 'Alíneas “a”, “g”, “h”, “i” e “k” do inciso 9.1.6.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'PESMAR', info: 'SVCVPM', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('atinente ao {{inspecionado}}', FRASES_MILITAR),
    },
  },
  {
    n: 14, chave: chave(14), grupo: 'beneficios', titulo: 'Resultado — não enquadramento de militar inativo (exceto almirante e CFN)', ajuda: 'Alíneas “a”, “g”, “h”, “i” e “k” do inciso 9.1.6.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'SVCVPM', info: 'PESMAR', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('atinente ao {{inspecionado}}', FRASES_MILITAR),
    },
  },
  {
    n: 15, chave: chave(15), grupo: 'beneficios', titulo: 'Resultado — não enquadramento de pensionista', ajuda: 'Alíneas “g” e “i” do inciso 9.1.6.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'SVCVPM', info: '', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('atinente à Sra {{inspecionado}} pensionista do ex-Militar {{posto_grad}} {{nip}} {{nome_militar}}', NAO_DOENCA),
    },
  },
  {
    n: 16, chave: chave(16), grupo: 'beneficios', titulo: 'Resultado — enquadramento de pensionista', ajuda: 'Alíneas “g” e “i” do inciso 9.1.6.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'SVCVPM', info: '', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('atinente à Sra {{inspecionado}} pensionista do ex-Militar {{posto_grad}} {{nip}} {{nome_militar}}', COM_DOENCA),
    },
  },
  {
    n: 17, chave: chave(17), grupo: 'beneficios', titulo: 'Resultado — enquadramento de servidor civil inativo', ajuda: 'Alíneas “f” e “g” do inciso 10.16.4.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'DPMBSB', info: '', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('atinente ao Servidor Civil Inativo {{nip_inspecionado}} {{nome_completo}} {{siape}} pensionista do ex-Militar {{posto_grad}} {{nip}} {{nome_militar}}', COM_DOENCA),
    },
  },
  {
    n: 18, chave: chave(18), grupo: 'beneficios', titulo: 'Resultado — não enquadramento de servidor civil inativo', ajuda: 'Alíneas “f” e “g” do inciso 10.16.4.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'DPMBSB', info: 'SVCVPM', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('atinente ao Servidor Civil Inativo {{nip_inspecionado}} {{nome_completo}} {{siape}} pensionista do ex-Militar {{posto_grad}} {{nip}} {{nome_militar}}', NAO_DOENCA),
    },
  },
  {
    n: 19, chave: chave(19), grupo: 'beneficios', titulo: 'Solicitação de autorização de inclusão de auxílio-invalidez', ajuda: 'Alínea “a” do inciso 9.1.2. Enquadramento de militar inativo.', campos: TODOS,
    padrao: {
      de: 'HOSRCF', para: '{{orgao_pessoal}}', info: 'SVCVPM', assunto: ASSUNTO_BENEFICIOS,
      texto: '{{data_hora_aps}}, CNS PSB AUT inclusão de alínea "a", (auxílio invalidez de militar inativo), inciso 9.1.2, DGPM-406 (9ª Revisão) BT',
    },
  },
  {
    n: 20, chave: chave(20), grupo: 'beneficios', titulo: 'Resultado — enquadramento de pensão militar para beneficiário inválido', ajuda: 'Alínea “a” do inciso 9.1.2.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'DPMBSB', info: 'SVCVPM ou OM que APS', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('à Sr(a) {{inspecionado}} filho(a) do (ex-Militar) {{posto_grad}} {{nip}} {{nome_militar}}', 'É portador de doença, estando inválido para todo e qualquer trabalho, não podendo prover a própria subsistência, a partir de {{data_pre_existencia}}'),
    },
  },
  {
    n: 21, chave: chave(21), grupo: 'beneficios', titulo: 'Resultado — não enquadramento de pensão militar para beneficiário inválido', ajuda: 'Alínea “a” do inciso 9.1.2.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'DPMBSB', info: 'SVCVPM ou OM que APS', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('à Sr(a) {{inspecionado}} filho(a) do (ex-Militar) {{posto_grad}} {{nip}} {{nome_militar}}', 'Não está invalido(a), na presente data.'),
    },
  },
  {
    n: 22, chave: chave(22), grupo: 'beneficios', titulo: 'Resultado — enquadramento de dependência de familiar de militar', ajuda: 'Alínea “f” do inciso 9.1.6.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'DPMBSB', info: 'SVCVPM ou OM que APS', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('à Sr(a) {{inspecionado}} {{parentesco}} do (ex-Militar) {{posto_grad}} {{nip}} {{nome_militar}}', 'É portador de doença, estando inválido para todo e qualquer trabalho'),
    },
  },
  {
    n: 23, chave: chave(23), grupo: 'beneficios', titulo: 'Resultado — não enquadramento de dependência de familiar de militar', ajuda: 'Alínea “f” do inciso 9.1.6.', campos: TODOS,
    padrao: {
      de: '{{remetente}}', para: 'DPMBSB', info: 'SVCVPM ou OM que APS', assunto: ASSUNTO_BENEFICIOS,
      texto: resultadoBeneficios('à Sr(a) {{inspecionado}} {{parentesco}} do (ex-Militar) {{posto_grad}} {{nip}} {{nome_militar}}', 'Não está invalido (a) para todo e qualquer trabalho na presente data.'),
    },
  },
];

export interface PlaceholderCatalogo { chave: string; descricao: string; exemplo: string }
export const PLACEHOLDERS_CATALOGO: PlaceholderCatalogo[] = [
  { chave: 'para', descricao: 'Destinatário (PARA) pela tabela de destinatários', exemplo: 'SVCVPM' },
  { chave: 'info', descricao: 'Destinatário (INFO) pela tabela de destinatários', exemplo: 'PESMAR' },
  { chave: 'remetente', descricao: 'Remetente (DE) quando é a OM de origem', exemplo: 'HOSRCF' },
  { chave: 'orgao_pessoal', descricao: 'Órgão de Pessoal do militar', exemplo: 'PESMAR' },
  { chave: 'assunto_aps', descricao: 'Assunto da mensagem que apresentou o militar (APS)', exemplo: 'APS MIL P/ IS' },
  { chave: 'data_hora_aps', descricao: 'Data-hora da mensagem de APS', exemplo: '121430Z NOV 2026' },
  { chave: 'is', descricao: 'Nº da IS', exemplo: '1254539' },
  { chave: 'finalidade', descricao: 'Finalidade da IS', exemplo: 'Controle Periódico de Saúde' },
  { chave: 'inspecionado', descricao: 'Posto/quadro e nome do inspecionado', exemplo: '1T (MD) FULANO DE TAL' },
  { chave: 'om', descricao: 'OM do inspecionado', exemplo: 'HNRe' },
  { chave: 'amp', descricao: 'Junta que concluiu (JRS/HNRe ou MPI/HNRe com o perito)', exemplo: 'JRS/HNRe' },
  { chave: 'data_conclusao', descricao: 'Data de conclusão da IS', exemplo: '18JUN2026' },
  { chave: 'data_entrevista', descricao: 'Data da entrevista agendada', exemplo: '20NOV2026' },
  { chave: 'data_atual', descricao: 'Data de hoje', exemplo: '23NOV2026' },
  { chave: 'laudo', descricao: 'Laudo exarado', exemplo: 'Apto para o SAM' },
  { chave: 'restricoes', descricao: 'Restrições da IS', exemplo: 'serviço armado' },
  { chave: 'tis', descricao: 'Nº do TIS', exemplo: '026.001.1' },
  { chave: 'ds1a', descricao: 'Código de validação do DS-1A', exemplo: 'ABC123' },
  { chave: 'om_acidente', descricao: 'OM onde aconteceu o acidente (AO)', exemplo: 'NAe São Paulo' },
  { chave: 'om_atual', descricao: 'OM atual do militar', exemplo: 'HNRe' },
  { chave: 'om_origem', descricao: 'OM de origem do AO', exemplo: 'NAe São Paulo' },
  { chave: 'data_acidente', descricao: 'Data do acidente', exemplo: '03MAR2026' },
  { chave: 'data_exame_sanidade', descricao: 'Data do Exame de Sanidade do AO', exemplo: '10NOV2026' },
  { chave: 'posto_grad', descricao: 'Posto/graduação do militar (titular)', exemplo: 'CMG' },
  { chave: 'nip', descricao: 'NIP do militar (titular)', exemplo: '00.1234.56' },
  { chave: 'nome_militar', descricao: 'Nome do militar (titular)', exemplo: 'BELTRANO DA SILVA' },
  { chave: 'nip_inspecionado', descricao: 'NIP do inspecionado', exemplo: '00.7654.32' },
  { chave: 'nome_completo', descricao: 'Nome completo do inspecionado', exemplo: 'MARIA DE TAL' },
  { chave: 'siape', descricao: 'Nº SIAPE do servidor civil', exemplo: '1234567' },
  { chave: 'parentesco', descricao: 'Parentesco com o militar', exemplo: 'mãe' },
  { chave: 'data_pre_existencia', descricao: 'Data de início/pré-existência da doença', exemplo: '10JAN2020' },
];
const CHAVES_CATALOGO = new Set(PLACEHOLDERS_CATALOGO.map(p => p.chave));

/** Placeholders de um texto que o catálogo não conhece. */
export const placeholdersCatalogoDesconhecidos = (texto: string): string[] =>
  [...new Set([...texto.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)].map(m => m[1].toLowerCase()).filter(k => !CHAVES_CATALOGO.has(k)))];

/** Placeholders usados no padrão da minuta (para listar só os pertinentes). */
export const placeholdersDaMinuta = (m: MinutaCatalogo): PlaceholderCatalogo[] => {
  const usados = new Set(Object.values(m.padrao).flatMap(t => [...t.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)].map(x => x[1].toLowerCase())));
  return PLACEHOLDERS_CATALOGO.filter(p => usados.has(p.chave));
};

/** Minuta do catálogo: o salvo (campo de texto não vazio) sobre o padrão. */
export const minutaCatalogoComPadrao = (m: MinutaCatalogo, cru: Record<string, unknown> | undefined | null): Record<string, string> => {
  const out: Record<string, string> = { ...m.padrao };
  for (const c of m.campos) {
    const v = cru?.[c.chave];
    if (typeof v === 'string' && v.trim()) out[c.chave] = v;
  }
  return out;
};
