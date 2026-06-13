// Ficheiro: components/RegimentoHNRe.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp, Download } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const RegimentoHNRe: React.FC<Props> = ({ onBack }) => {
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

  // Documentação: Transcrição integral do ficheiro .md
  const rawMarkdown = `
## REGIMENTO INTERNO DO HOSPITAL NAVAL DE RECIFE
## CAPÍTULO I
## Da Organização
Art. 1 - A estrutura organizacional básica do Hospital Naval de Recife (HNRe) encontra-se definida em seu Regulamento, aprovado pela Portaria nº 56/2010, do Comando de Operações Navais (ComOpNav). O detalhamento dessa estrutura está disposto nos artigos deste capítulo e representado, de forma sintética, no organograma constante do Anexo A do presente Regimento Interno (RI).
Art. 2 - O HNRe tem como titular um Diretor (HNRe-01), oficial superior da ativa do Quadro de Médicos do Corpo de Saúde da Marinha (CSM), sendo diretamente auxiliado pelo Vice-Diretor (HNRe-02), seguindo sua antiguidade em relação ao Diretor.
Parágrafo único – Subordinados diretamente ao Diretor encontram-se ainda:
I - Assessoria de Inteligência (HNRe-01.1);
II - Assessoria Jurídica (HNRe-01.2);
III - Assessoria de Gestão e Controle (HNRe-01.3);
IV - Assessoria de Comunicação Social (HNRe-01.4);
V - Serviço de Ouvidoria (HNRe-01.5);
VI - Conselho Técnico (HNRe-03);
VII - Gabinete (HNRe-04); e
VIII - Conselho de Gestão (HNRe-05).
Art. 3 – A Assessoria de Inteligência (HNRe-01.1) é composta por militares de carreira, designados pelo Diretor, sendo um oficial desempenhando a função de Oficial de Inteligência e uma praça na função de Auxiliar do Oficial de Inteligência. Não é necessário que os militares tenham dedicação exclusiva.
Art. 4 - A Assessoria Jurídica (HNRe-01.2) tem como Encarregado um oficial da ativa, do Quadro Técnico (T), bacharel em Direito, auxiliado por uma praça, preferencialmente também com formação em Direito.
Art. 5 - A Assessoria de Gestão e Controle (HNRe-01.3) é composta pelo Controle Interno e pelo Programa Netuno. O Elemento de Controle Interno é um oficial, preferencialmente oficial superior do Corpo de Intendentes da Marinha ou do Quadro Técnico, habilitado em Administração, Economia ou Ciências Contábeis. Não é necessária dedicação exclusiva. O Programa Netuno (HNRe-01.3.1) é coordenado por um oficial de qualquer corpo ou quadro, e estruturado por meio de uma Comissão instituída por portaria do Diretor. Essa Comissão tem como Presidente o Vice-Diretor e como membros permanentes o Elemento de Controle Interno e os Chefes dos Departamentos de Saúde e de Administração. Os demais integrantes são oficiais, praças ou civis assemelhados, compondo um grupo de caráter multidisciplinar.
Art. 6 – A Assessoria de Comunicação Social (HNRe-01.4) é composta por um oficial intermediário ou subalterno de qualquer quadro e por uma praça na função de auxiliar, não sendo necessário que os militares tenham dedicação exclusiva.
Art. 7 - O Serviço de Ouvidoria (HNRe-01.5) é composto por um oficial de qualquer quadro, designado pelo Diretor, e uma praça, preferencialmente Suboficial ou Sargento, de qualquer quadro.
Art 8 - O Conselho Técnico (HNRe-03) é constituído pelo Diretor, Vice-Diretor e Chefe do Departamento de Saúde (CDS) como membros permanentes, e por consultores específicos convocados pelo Diretor, de acordo com sua expertise técnica, além de um Secretário designado pelo CDS.
Art. 9 - O Gabinete (HNRe-04) é composto por um Suboficial-Mor (SO-Mor), um Secretário (praça de qualquer especialidade) e uma praça de especialidade “AR” (com graduação mínima de Terceiro-Sargento).
Parágrafo único – O SO-Mor é um suboficial da ativa, com o Curso Especial de Preparação para Suboficial-Mor (C-Esp-SOMor) e pode exercer suas atividades cumulativamente com as atribuições já exercidas na OM, a critério do Diretor.
Art. 10 - O Conselho de Gestão (HNRe-05) é constituído pelo Diretor, Vice-Diretor, Chefe do Departamento de Saúde, Chefe do Departamento de Administração, Elemento de Controle Interno e Agente Financeiro (quando este não for o Vice-Diretor), como membros permanentes e consultores técnicos, consultores específicos, comissões executivas e relatores, sob forma convocatória.
Art. 11 - O Vice-Diretor (HNRe-02), deve ser um oficial superior da ativa do Corpo de Saúde da Marinha (CSM), do quadro Médico, Cirurgião-Dentista ou Apoio à Saúde, auxiliado pelo Chefe de Departamento de Saúde (HNRe-10) e pelo Chefe do Departamento de Administração (HNRe-20).
Parágrafo único – Subordinados diretamente ao Vice-Diretor, encontram-se:
I - Centro de Estudos (HNRe-02.1);
II - Junta Regular de Saúde – JRS (HNRe-02.2);
III - Serviço de Secretaria e Comunicações – SECOM (HNRe-02.3);
IV - Serviço de Auditoria em Saúde (HNRe-02.4);
V – Assessoria de Segurança Orgânica (HNRe-02.5);
VI - Núcleo de Avaliação e Controle - NAC (HNRe-02.6);
VII – Comissão de Controle de Infecção Hospitalar - CCIH (HNRe-02.7); e
VIII - Comissão de Esportes e TAF (HNRe-02.8).
Art. 12 - O Centro de Estudos (HNRe-02.1) tem como Encarregado um oficial da ativa ou servidor civil assemelhado. Não é necessário que o militar seja de dedicação exclusiva.
Art. 13 - A Junta Regular de Saúde (HNRe-02.2) é constituída por 3 (três) médicos e uma secretaria que desempenha atividades de apoio, constituída por praças.
Art. 14 – O Serviço de Secretaria e Comunicações – SECOM (HNRe-02.3) tem como supervisor uma praça do Corpo Auxiliar de Praças (CAP), de graduação não inferior a Primeiro-Sargento, especializado em Escrita (ES), e seus auxiliares, preferencialmente com especialização em Sinais (SI) e/ou Comunicações Navais (CN).
Art. 15 - O Serviço de Auditoria em Saúde (HNRe-02.4) tem como encarregado um oficial da ativa do CSM, ou servidor civil assemelhado, preferencialmente com formação em Auditoria de Contas Médico-Hospitalares, auxiliado por uma equipe de ajudantes/auxiliares com formação em Auditoria de Contas Médico-Hospitalares, e auxiliares administrativos.
Art. 16 - A Assessoria de Segurança Orgânica (HNRe-02.5) tem como encarregado um oficial preferencialmente da ativa, com cursos na área de Segurança Orgânica e uma ou mais praças na graduação não inferior a Terceiro-Sargento, preferencialmente com formação em Segurança Orgânica.
Art. 17 – Núcleo de Avaliação e Controle - NAC (HNRe-02.6), instituído por portaria do Diretor, é composto por uma equipe multidisciplinar (01 oficial médico, 01 oficial enfermeiro, 01 oficial fisioterapeuta, 01 oficial psicólogo e 01 oficial assistente social), sendo secretariado por uma praça “EF” e/ou servidor civil assemelhado. Tem como Encarregado o oficial mais antigo da portaria, não sendo necessária dedicação exclusiva.
Art. 18 – A Comissão de Controle de Infecção Hospitalar – CCIH (HNRe-02.7) é instituída por portaria do Diretor e composta por um presidente, preferencialmente médico infectologista, dois membros consultores, sendo um médico e um farmacêutico, além de cinco membros executores: um médico, dois profissionais de enfermagem (1 enfermeiro e 1 técnico de enfermagem), um farmacêutico ou técnico em laboratório e um cirurgião-dentista. Na ausência do médico infectologista, o presidente pode ser qualquer dos membros designados pelo Diretor.
Art. 19 - A Comissão de Esportes e TAF (HNRe-02.8) é instituída por portaria do Diretor, formada por uma equipe composta por oficiais e praças de qualquer corpo e quadro.
Art. 20 - O Departamento de Saúde tem como chefe um oficial superior da ativa, do CSM, preferencialmente do Quadro Médico, sendo constituído pelas seguintes Divisões:
I - Divisão de Medicina (HNRe-11);
II - Divisão de Odontologia (HNRe-12);
III - Divisão de Enfermagem (HNRe-13);
IV - Divisão de Serviços Complementares (HNRe-14);
V - Divisão de Regulação em Saúde (HNRe-15); e
VI - Divisão de Farmácia e Laboratório (HNRe-16).
§ 1º As Divisões guardarão coerência com a Tabela Mestra da Força de Trabalho (TMFT), de acordo com as normas vigentes.
§ 2º – São também subordinados ao Departamento de Saúde:
I - Núcleo de Atendimento ao Idoso na Marinha - NAIM (HNRe-10.1);
II - Serviço de Pronto Atendimento - SPA (HNRe-10.2);
III - Serviço de Arquivo Médico e Estatística - SAME (HNRe-10.3);
IV - Unidade de Pacientes Graves – UPG (HNRe-10.4);
V – Serviço de Ambulatório (HNRe-10.5);
VI - Núcleo de Segurança do Paciente - NSP (HNRe-10.6)
VII – Serviço Integrado de Atenção Domiciliar – SIAD (HNRe-10.7); e
VIII - Serviço de Credenciamento (HNRe-10.8).
§ 3º – Sob a coordenação do Departamento de Saúde funcionam ainda as seguintes comissões permanentes, compostas por militares e servidores civis do Departamento de Saúde:
I - Comissão de Revisão de Óbitos;
II - Comissão de Revisão de Prontuários;
III - Comissão de Planejamento Familiar;
IV - Comissão de Farmácia e Terapêutica;
V - Comissão de Avaliação e Acompanhamento de Pacientes Internados em Organizações de Saúde Extra-Marinha (CAAPIOSE);
VI - Comissão de Credenciamento de Serviços de Saúde (CCSS);
VII - Núcleo de Doenças Crônicas não Transmissíveis (NDCNT); e
VIII - Programas de Saúde da Marinha.
Art. 21 - O Núcleo de Atendimento ao Idoso na Marinha - NAIM (HNRe-10.1) é composto por um encarregado, oficial da ativa do CSM, do Quadro Médico, preferencialmente especialista em Geriatria, apoiado por uma equipe multidisciplinar formada por Enfermeiro, Fisioterapeuta, Psicólogo, Assistente Social e uma Praça “EF” e/ou servidor civil assemelhado. A equipe multidisciplinar não precisa ser de dedicação exclusiva.
Art. 22 - O Serviço de Pronto Atendimento - SPA (HNRe-10.2) tem como encarregado um oficial do CSM, do Quadro Médico, de qualquer especialidade, e um oficial enfermeiro Coordenador de Enfermagem, preferencialmente com especialização em Urgência e Emergência, apoiado por um ajudante oficial enfermeiro e uma equipe de técnicos de enfermagem militares ou servidores civis.
Art. 23 - O Serviço de Arquivo Médico e Estatística - SAME (HNRe-10.3) tem como encarregado um oficial de qualquer corpo ou quadro, apoiado por uma praça na graduação mínima de Terceiro-Sargento ou servidor civil assemelhado.
Art. 24 - Unidade de Pacientes Graves – UPG (HNRe-10.4) tem como encarregado um oficial do CSM, do Quadro Médico, preferencialmente com formação em Terapia Intensiva, e um oficial enfermeiro Coordenador, preferencialmente com especialização em Terapia Intensiva, auxiliado por uma equipe de técnicos em enfermagem.
Art. 25 – O Serviço de Ambulatório (HNRe-10.5) tem como encarregado um oficial do Quadro de Apoio à Saúde, Enfermeiro, apoiado por uma praça supervisora na graduação mínima de Terceiro-Sargento ou servidor civil assemelhado.
Art. 26 - O Núcleo de Segurança do Paciente (HNRe-10.6) é composto por representantes das Divisões de Medicina, Enfermagem (Unidades de Internação e Centro Cirúrgico), Farmácia, Odontologia e Comissão de Controle de Infecção Hospitalar (CCIH), sendo o oficial mais antigo designado para exercer a função de Coordenador do Núcleo, além de uma praça “EF”, para apoio administrativo, com dedicação exclusiva.
Art. 27 - O Serviço Integrado de Atenção Domiciliar – SIAD (HNRe-10.7) é composto por uma Comissão de Avaliação e Acompanhamento de Pacientes em Assistência Domiciliar (CAAPAD), instituída por portaria do Diretor, formada por uma equipe multiprofissional, composta minimamente por médico, enfermeiro, fisioterapeuta, fonoaudiólogo, nutricionista, além de uma praça para apoio administrativo, sendo pelo menos um dos membros da comissão com dedicação exclusiva.
Art. 28 - O Serviço de Credenciamento (HNRe-10.8) tem como encarregado um oficial da ativa do CSM, auxiliado, preferencialmente, por um oficial com formação em Administração, apoiado por praças auxiliares.
Art. 29 – A Divisão de Medicina (HNRe-11), sob a responsabilidade do respectivo encarregado, é constituída pelas seguintes seções e serviços:
I - Seção de Medicina Clínica (HNRe-11.1);
II - Seção de Medicina Cirúrgica (HNRe-11.2);
III - Serviço de Diagnóstico por Imagem (HNRe-11.3);
IV - Serviço de Medicina Integral - SMI (HNRe-11.4); e
V – Serviço de Medicina Operativa (HNRe-11.5).
Art. 30 - As Seções de Medicina Clínica (HNRe-11.1) e de Medicina Cirúrgica (HNRe-11-2) são compostas por oficiais e/ou servidores civis médicos, tendo como encarregado o oficial mais antigo das respectivas seções.
Art. 31 – O Serviço de Diagnóstico por Imagem (HNRe-11.3) tem como encarregado um oficial do CSM, do Quadro Médico, com formação em Radiologia, ou servidor civil assemelhado, apoiado por uma equipe de técnicos em Radiologia Médica.
Art. 32 - O Serviço de Medicina Integral - SMI (HNRe-11.4) é composto por um gerente de equipe, Oficial Superior Médico, preferencialmente com formação em Clínica Médica, ajudado por uma equipe de três oficiais médicos, da ativa ou veteranos, e auxiliado por duas praças “EF” e uma praça recepcionista, de qualquer especialidade. Quando o oficial Encarregado do SMI for mais antigo que o oficial Encarregado da Divisão de Medicina, o SMI poderá ficar subordinado diretamente ao CDS.
Art. 33 – O Serviço de Medicina Operativa (HNRe-11.5) tem como encarregado um oficial do CSM, do Quadro Médico, não sendo necessária dedicação exclusiva.
Art. 34 - A Divisão de Odontologia (HNRe-12), sob a responsabilidade do respectivo encarregado, um oficial do CSM, do Quadro de Cirurgiões-Dentistas, apresenta a seguinte composição:
I – Clínica de Dentística (HNRe-12.1);
II – Clínica de Endodontia (HNRe-12.2);
III - Clínica de Periodontia (HNRe-12.3);
IV - Clínica de Cirurgia Bucomaxilofacial (HNRe-12.4);
V - Clínica de Odontopediatria (HNRe-12.5);
VI - Clínica de Ortodontia (HNRe-12.6);
VII - Clínica de Prótese (HNRe-12.7); e
VII - Clínica de Odontologia Preventiva (HNRe-12.8).
§ 1º – A Secretaria da Divisão de Odontologia é formada por praças da ativa ou veteranos, preferencialmente com formação em Higiene Dental (HD), ficando diretamente subordinada ao encarregado da divisão.
§ 2º – As Clínicas têm como encarregados oficiais da ativa ou servidores civis assemelhados, com a respectiva especialidade, auxiliados por praça com formação em Higiene Dental (HD) ou Prótese Dentária (PT).
Art. 35 - A Divisão de Enfermagem (HNRe-13), sob a responsabilidade do respectivo encarregado, um oficial do CSM, do Quadro de Apoio à Saúde, com formação em Enfermagem, é constituída pelos seguintes setores:
I – Unidades de Internação (HNRe-13.1);
II – Serviço de Imunização (HNRe-13.2);
III - Centro Cirúrgico (HNRe-13.3);
IV – Central de Material e Esterilização - CME (HNRe-13.4);
V – Serviço de Curativos Especiais (HNRe-13.5); e
VI - Serviço de Rouparia (HNRe-13.6).
§ 1º – As Unidades de Internação (HNRe-13.1), o Serviço de Imunização (HNRe-13.2), o Centro Cirúrgico (HNRe-13.3) e a CME (HNRe-13.4) devem ter como encarregados oficiais enfermeiros distintos, em conformidade com as legislações e normas vigentes.
§ 2º – O Serviço de Curativos Especiais (HNRe-13.5) tem como encarregado um oficial enfermeiro, preferencialmente com especialização em Estomaterapia, não sendo necessário dedicação exclusiva.
§ 3º – O Serviço de Rouparia (HNRe-13.6) tem como encarregado um oficial de qualquer corpo ou quadro, não sendo necessário dedicação exclusiva.
Art. 36 - A Divisão de Serviços Complementares (HNRe-14), sob a responsabilidade do respectivo encarregado, um oficial do CSM, do Quadro de Apoio à Saúde, preferencialmente não enfermeiro, é constituída pelos seguintes serviços:
I - Serviço de Fisioterapia e Reabilitação (HNRe-14.1);
II - Serviço de Nutrição (HNRe-14.2);
III - Serviço de Psicologia (HNRe-14.3);
IV - Serviço de Fonoaudiologia (HNRe-14.4); e
V - Serviço de Assistência Social (HNRe-14.5).
§ 1º - O Serviço de Fisioterapia e Reabilitação (HNRe-14.1) tem como encarregado um oficial da ativa, do CSM, Quadro de Apoio a Saúde, fisioterapeuta, ou servidor civil assemelhado.
§ 2º - O Serviço de Nutrição (HNRe-14.2) tem como encarregado um oficial da ativa, do CSM do Quadro de Apoio à Saúde, nutricionista, ou servidor civil assemelhado.
§ 3º - O Serviço de Psicologia (HNRe-14.3) tem como encarregado um oficial da ativa, do CSM, Quadro de Apoio a Saúde, psicólogo, ou servidor civil assemelhado.
§ 4º - O Serviço de Fonoaudiologia (HNRe-14.4) tem como encarregado um oficial da Ativa, do CSM, do Quadro de Apoio a Saúde, fonoaudiólogo ou servidor civil assemelhado.
§ 5º - O Serviço de Assistência Social (HNRe-14.5) tem como Encarregado um oficial da ativa, do Corpo Auxiliar da Marinha (CAM), do Quadro Técnico ou servidor civil assemelhado, com graduação em Serviço Social.
Art. 37 - A Divisão de Regulação em Saúde (HNRe-15), tem como encarregado um oficial do CSM, preferencialmente do Quadro Médico, sendo constituída pelas seguintes seções:
I - Seção de Orçamentos em Saúde (HNRe-15.1); e
II - Seção de Emissão de Guias (HNRe-15.2).
Art. 38 - A Divisão de Farmácia e Laboratório (HNRe-16), tem como encarregado um oficial do CSM, do Quadro de Apoio à Saúde, farmacêutico, sendo constituída pelos seguintes setores:
I – Serviço de Laboratório de Análises Clínicas (HNRe-16.1);
II - Serviço de Farmácia Hospitalar (HNRe-16.2);
III - Setor de Dispensação de Medicamentos - SeDiMe (HNRe-16.3); e
IV - Central de Abastecimento Farmacêutico - CAF (HNRe-16.4).
Parágrafo Único – Os setores subordinados à Divisão de Farmácia e Laboratório têm como encarregados oficiais Farmacêuticos da ativa ou veteranos, ou servidor civil assemelhado.
Art. 39 - O Departamento de Administração tem como chefe um oficial superior da ativa, preferencialmente do Corpo de Intendentes da Marinha (CIM), do Corpo Auxiliar da Marinha (CAM), do Quadro Técnico (T) ou Auxiliar da Armada (AA). Subordinados diretamente ao Departamento de Administração, o HNRe dispõe de:
I - Serviço de Tecnologia da Informação – STI (HNRe-20.1); e
II. Comissão de Gestão Ambiental (HNRe-20.2).
§ 1º - O Serviço de Tecnologia da Informação - STI (HNRe-20.1) tem como encarregado um oficial da ativa, do Quadro Técnico (T), com formação na área de Informática, ou servidor civil assemelhado.
§ 2º – A Comissão de Gestão Ambiental tem como encarregado um oficial de qualquer corpo ou quadro, não sendo necessária dedicação exclusiva.
Art. 40 – O Departamento de Administração é constituído pelas seguintes Divisões:
I - Divisão de Pessoal (HNRe-21);
II - Divisão de Intendência (HNRe-22); e
III - Divisão de Serviços Gerais (HNRe-23).
Art. 41 - A Divisão de Pessoal (HNRe-21) tem como encarregado um oficial preferencialmente do Quadro Técnico (T), com formação desejável em Administração, sendo constituída pelas seguintes Seções:
I - Seção de Pessoal Militar (HN-21.1); e
II - Seção de Pessoal Civil (HN-21.2).
Art. 42 - A Divisão de Intendência (HNRe-22) tem como encarregado, preferencialmente, um oficial superior da ativa do Corpo de Intendentes da Marinha (CIM). É constituída pelas seguintes seções:
I - Seção de Execução Financeira (HNRe-22.1);
II - Seção de Municiamento (HNRe-22.2);
III - Seção de Indenização Médico-Hospitalar – IMH (HNRe-22.3);
IV - Seção de Material (HNRe-22.4);
V - Seção de Obtenção, Licitação e Acordos Administrativos (HNRe-22.5);
VI – Seção de Operações de Créditos e Finanças (HNRe-22.6); e
VII – Seção de Conforto (HNRe-22.7).
§ 1º – Os setores subordinados à Divisão de Intendência tem como encarregados oficiais da ativa, preferencialmente do quadro Técnico, ou servidores civis assemelhados.
§ 2º – A Seção de Conforto (HNRe-22.7) é estruturada por meio de uma comissão indicada por Portaria do Diretor, formada por oficiais e praças, não sendo necessária dedicação exclusiva.
Art. 43 - A Divisão de Serviços Gerais - DSG (HNRe-23), tem como encarregado um oficial da ativa, preferencialmente do Corpo Auxiliar da Marinha (CAM), do Quadro Auxiliar da Armada (AA), sendo constituída pelas seguintes seções:
I - Seção de Manutenção (HNRe-23.1);
II - Seção de Transportes (HNRe-23.2); e
III – Seção de Conservação e Limpeza (HNRe-23.3).
## CAPÍTULO II
## Das Atribuições dos Elementos Componentes
Subordinados diretamente ao Diretor:
Art. 44 - À Assessoria de Inteligência (HNRe-01.1) compete exercer as atribuições previstas em legislação, regulamentos e normas vigentes, especialmente nas versões atualizadas dos volumes I e II do EMA-353, no que for aplicável à OM.
Art. 45 - À Assessoria Jurídica (HNRe-01.2) compete:
I - assessorar o Diretor em assuntos de natureza jurídica;
II - compilar elementos de fato e de direito e preparar as informações que devam ser prestadas em mandados de segurança, habeas corpus e habeas data, visando subsidiar a autoridade impetrada, bem como preparar as informações a serem prestadas à Advocacia-Geral da União (AGU) na defesa dos interesses da União e da Marinha do Brasil;
III - assessorar os encarregados de sindicância/IPM quanto à sua elaboração, confecção de relatórios e a conclusão; e
IV - executar quaisquer outros encargos de natureza jurídica que lhes forem designados pelo titular da OM.
Art. 46 - Ao Elemento de Controle Interno (HNRe-01.3) compete assessorar o Diretor nos assuntos relativos ao Controle Interno, principalmente quanto à conformidade de atos e fatos da gestão orçamentária, financeira, patrimonial e operacional.
Parágrafo Único – Ao Coordenador do Programa Netuno compete:
I - assessorar o Diretor nos assuntos afetos à gestão;
II – auxiliar o Elemento do Controle Interno no gerenciamento, elaboração e atualização do Planejamento da Gestão Organizacional –PGO, do Plano de Melhoria da Gestão – PMGes, do Plano de Gerenciamento de Riscos Operacionais – PGRO e do Conselho de Gestão;
III – monitorar e controlar por meio do Programa de Acompanhamento da Gestão (PAG), os resultados alcançados das iniciativas estratégicas planejadas nos documentos da gestão hospitalar (PEO, PMGes e PGRO), aferindo por meio dos indicadores de desempenho o alcance das metas;
IV – mapear, revisar, atualizar e aperfeiçoar os processos organizacionais, mediante análise integral de todos os fluxos de trabalho da OM;
V - monitorar os riscos organizacionais, com o objetivo de prevenir, aumentar a probabilidade de eventos positivos, potencializar resultados, reduzir repercussões negativas e mitigar ameaças; e
VI – realizar, periodicamente, a Pesquisa de Clima Organizacional.
Art. 47 – À Assessoria de Comunicação Social (HNRe-01.4) compete:
I - assessorar a Direção em assuntos de cerimonial, protocolo e imprensa, organizando cerimônias cívico-militares e apoiando eventos institucionais;
II - planejar e executar ações de Relações Públicas, conforme o Plano de Comunicação Social do Comando do 3ºDistrito Naval;
III – apoiar visitas oficiais e realizar cobertura fotográfica de eventos institucionais;
IV – realizar, anualmente, o levantamento das necessidades financeiras referentes ao PM “OSCAR” e encaminhá-las ao Com3ºDN;
V – encaminhar matérias relativas ao HNRe para publicação nos canais oficiais da Marinha do Brasil;
VI – gerenciar o conteúdo do sítio eletrônico e da intranet do HNRe, avaliando e autorizando publicações institucionais;
VII – coordenar o processo de eleição do Militar e do Servidor Civil Padrão, conforme normas internas; e
VIII – manter atualizado o arquivo histórico e o acervo fotográfico do HNRe.
Art. 48 - Ao Serviço de Ouvidoria (HNRe-01.5) compete:
I - receber e analisar todas as manifestações (reclamações, sugestões e elogios) referentes ao atendimento no HNRe, encaminhá-las aos setores competentes para apuração, propor soluções possíveis e informar aos interessados as providências tomadas;
II - exercer a função de elemento de ligação (E-Lig) entre a Direção e o público/usuários (clientes internos e externos) do hospital;
III - conhecer e avaliar, por meio de pesquisa, a satisfação dos usuários com os serviços ofertados pelo HNRe e Organizações de Saúde Extra-Marinha (OSE) credenciadas; e
IV - enviar relatórios estatísticos para a DSM e Com3ºDN, conforme previsto nas normas em vigor relativas ao funcionamento dos serviços de ouvidoria das Organizações Militares Hospitalares (OMH).
Art. 49 - Ao Conselho Técnico (HNRe-03) compete:
I - assessorar o Diretor nos assuntos e questões técnicas pertinentes às atividades de saúde; e
II – subsidiar o Diretor com dados técnicos nas deliberações referentes às demandas de procedimentos de alta complexidade de urgência e demais casos inerentes à sua prerrogativa como Ordenador de Despesas; e
III - analisar as solicitações de medicamentos especiais e de órteses, próteses e materiais especias (OPME).
Art. 50 - Ao Gabinete (HNRe-04) compete:
I - assistir o Diretor nos assuntos de sua competência;
II – auxiliar no planejamento, coordenação e execução das atividades internas e externas, em apoio à Assessoria de Comunicação Social;
III - preparar e processar as correspondências funcionais do Diretor;
IV - programar reuniões, audiências e representações do Diretor; e
V - coordenar, sob sua responsabilidade, os serviços de rancho, de taifa e de transporte do Diretor.
Parágrafo Único – O SO-Mor é um suboficial da ativa, com o Curso Especial de Preparação para Suboficial-Mor (C-Esp-SOMor) e pode exercer suas atividades cumulativamente com as atribuições já exercidas na OM, a critério do Diretor.
Art. 51 - Ao Conselho de Gestão (HNRe-05) compete:
I – planejar, programar, disciplinar e se pronunciar sobre a gestão econômico-financeira da OM;
II -assessorar a Direção na gestão dos recursos humanos, orçamentários e patrimoniais, mediante fiscalização de sua aplicação, análise de indicadores e emprego de ferramentas gerenciais; e
III - promover o desenvolvimento organizacional, por meio da implementação de melhores práticas de gestão e a avaliação dos seus processos, com foco no cumprimento de metas e o aprimoramento contínuo.
Subordinados ao Vice-Diretor:
Art. 52 - Ao Centro de Estudos (HNRe-02.1) compete:
I - auxiliar o Vice-Diretor na elaboração dos planos, projetos e programas técnico-científicos, visando ao aprimoramento profissional do pessoal;
II – auxiliar na promoção de sessões clínicas, estudos de casos, conferências, simpósios, adestramentos, cursos e palestras;
III - auxiliar o intercâmbio com profissionais qualificados, entidades congêneres, associações científicas e de ensino da área de saúde; e
IV – coordenar a preparação do auditório e a execução das atividades nos eventos.
Art. 53 - À Junta Regular de Saúde (HNRe-02.2) compete:
I - realizar as Inspeções de Saúde (IS) para ingresso na MB e para os controles periódicos, em conformidade com as normas em vigor;
II - realizar as IS para Verificação de Deficiência Funcional (VDF) e Concessão de Benefícios, executando os atos médico-periciais de sua competência, de acordo com as normas em vigor;
III – minutar e tramitar as mensagens de laudos de conclusão de IS realizadas, de acordo com as normas vigentes;
IV – assessorar e orientar os setores responsáveis na lavratura de Atestados de Origem, bem como concluí-los por ocasião do Exame de Sanidade;
V – assessorar, dentro dos limites da ética médica, a Direção na resposta a demandas de natureza jurídica, de acordo com as normas vigentes; e
VI – assessorar a Direção, em conjunto com a Divisão de Pessoal e o NAC, nos assuntos afetos à gestão de pessoal, em particular os casos de afastamentos e restrições médicas.
Parágrafo Único – - Aos Médicos Peritos Isolados (MPI) cabem realizar as diversas IS de rotina (controles periódicos), de militares da ativa e servidores civis, além de exercer a função de Médicos da Guarnição, para avaliação e/ou homologação de dispensas médicas com intervalo inferior ou igual a 10 (dez) dias.
Art. 54 - Ao Serviço de Secretaria e Comunicações - SECOM (HNRe-02.3) compete:
I – coletar, transmitir e dirigir o tráfego de mensagens e expedientes a bordo;
II - controlar e registrar o trâmite de expedientes e mensagens;
III - salvaguardar e organizar o histórico de documentação do HNRe;
IV - manter atualizadas as coletâneas de regulamentos, instruções permanentes, boletins e demais documentos de interesse para a MB e, em especial, para o HNRe;
V – auxiliar o oficial Encarregado do Material Controlado (EMC) a exercer a custódia e manter, em arquivo próprio, as publicações e documentos sigilosos que estejam sob sua guarda;
VI - organizar, controlar e manter atualizados os arquivos administrativos, com especial atenção para os documentos que, por seu grau de sigilo, devam possuir cuidados de arquivamento e temporalidades específicos; e
VII – elaborar, revisar, corrigir, numerar e tramitar os documentos administrativos de interesse da Direção.
Art. 55 - Ao Serviço de Auditoria em Saúde (HNRe-02.4) compete:
I – planejar, organizar e executar as atividades de auditoria, em conformidade com as normas vigentes e com as diretrizes da Diretoria de Saúde da Marinha (DSM);
II – alimentar a Seção de Execução Financeira com os valores finais a serem pagos em nota fiscal às OSE;
III – alimentar a Seção de Indenização Médico-Hospitalar -IMH com as faturas auditadas que comporão a base de cálculo para os lançamentos de descontos aos usuários;
IV - elaborar e encaminhar relatórios gerenciais e planilhas de custos à DSM, dentro dos prazos estabelecidos; e
V - monitorar e apresentar indicadores de desempenho relacionados aos gastos com OSE no Conselho de Gestão.
Art. 56 - À Assessoria de Segurança Orgânica (HNRe-02.5) compete:
I - planejar, coordenar e controlar a execução das atividades relacionadas à segurança orgânica;
II - responsabilizar-se pelo Plano de Segurança Orgânica (PSO), em conjunto com a Assessoria de Inteligência, o Oficial de Segurança das Informações Digitais e Comunicação (OSIC) e a SECOM;
III - coordenar, em conjunto com a SECOM, a salvaguarda de conhecimentos e dados sigilosos durante as ações de transmissão e recepção, relativas à segurança das comunicações e documentações, cujo acesso irrestrito ou divulgação não autorizada possa acarretar prejuízos à MB, à sociedade e ao Estado;
IV - coordenar, em conjunto com o OSIC, as medidas que visem estabelecer padrões que permitam garantir a segurança e a integridade dos servidores, hardwares, dos softwares, dos sistemas de gerenciamento dos bancos de dados e dos próprios bancos de dados;
V - responsabilizar-se diretamente pela segurança de áreas e instalações, cujas atividades requerem proteção das áreas sigilosas, sensíveis, comuns, perímetro interno, barreiras externas, pessoal de bordo, acesso e trânsito de visitantes, usuários, prestadores de serviços, bem como de materiais existentes, visando à salvaguarda dos interesses da MB;
VI - efetuar o controle, a guarda e a manutenção do armamento e da munição, de forma a mantê-los em condições de pronto uso, bem como a atualização do Requisito Operacional do Armamento (ROA), de acordo com as normas em vigor; e
VII - providenciar o adestramento de manuseio de armas portáteis, a realização de exercícios de tiro e o envio dos respectivos relatórios para a Diretoria de Sistemas de Armas da Marinha (DSAM).
Art. 57 – Ao Núcleo de Avaliação e Controle - NAC (HNRe-02.6) compete:
I - acompanhar os militares da ativa em situação de aptidão com restrições e incapacidade temporária (LTSP), nos programas de saúde pertinentes a cada caso;
II - realizar o controle do cumprimento das prescrições e orientações fornecidas pela Junta de Saúde (JS) de origem;
III - interceder junto ao Subsistema Assistencial, facilitando e agilizando respostas de pareceres médicos, realização de exames a agendamento de consultas; e
IV - assessorar a Direção, em conjunto com a Divisão de Pessoal e a JRS, nos assuntos afetos à gestão de pessoal, em particular os casos de afastamentos e restrições médicas.
Art. 58 - À Comissão de Controle de Infecção Hospitalar - CCIH (HNRe- 02.7) compete:
I - definir e desenvolver as ações que visam ao controle e prevenção das infecções relacionadas à assistência à saúde (IRAS);
II - realizar investigação epidemiológica de casos isolados ou surtos, sempre que indicado, implantando medidas imediatas de controle;
III – elaborar e monitorar indicadores, apresentando relatórios mensais; e
IV - realizar vigilância epidemiológica das doenças infectocontagiosas e encaminhar as notificações aos órgãos competentes.
Art. 59 – À Comissão de Esportes e TAF (HNRe-02.8) compete:
I – planejar, coordenar e supervisionar a prática do Treinamento Físico Militar (TFM) a bordo, bem como as atividades esportivas e de condicionamento físico desenvolvidas no âmbito do HNRe, de caráter recreativo ou de competição;
II – organizar, aplicar e registrar os Testes de Aptidão Física (TAF) dos militares do HNRe e encaminhar os relatórios, em conformidade com as normas vigentes; e
III – promover atividades e programas que estimulem a prática esportiva e a melhoria do condicionamento físico do efetivo, como ação de promoção à saúde.
Art. 60 - Ao Departamento de Saúde (HNRe-10) compete:
I - planejar e supervisionar as atividades técnicas de medicina assistencial e operativa prestadas aos usuários do SSM no âmbito do HNRe;
II - planejar e controlar o processo de convocação de médicos, dentistas e demais profissionais de apoio à saúde da reserva não remunerada, assim como a contratação de profissionais civis da área de saúde;
III – planejar, controlar e supervisionar as atividades referentes às comissões diretamente subordinadas: CAAPIOSE, CAAPAD, Revisão de Prontuários, Revisão de Óbitos, Programas de Saúde, Farmácia e Terapêutica, Planejamento Familiar, NDCNT e CCSS;
IV - supervisionar a execução das atividades de ensino, pesquisa e educação continuada, afetas ao Departamento;
V - supervisionar as atividades técnicas de saúde nas situações de mobilização, guerra, estado de defesa, calamidade pública ou na vigência de manobras militares na área;
VI - verificar e acompanhar o cadastro do pessoal que opera com aparelhos de raios-X e a aplicação das medidas apropriadas de radioproteção;
VII – acompanhar os indicadores e estatísticas das diversas Divisões e Comissões do Departamento;
VIII – assessorar a Direção nos assuntos afetos ao seu Departamento; e
IX – coordenar, em seu nível, as ações de interoperabilidade com os demais hospitais militares da região.
Art. 61 - Às Divisões, Seções e Serviços que compõem o Departamento de Saúde, além de suas atribuições específicas, compete:
I - coordenar, executar e fazer cumprir as determinações técnico-administrativas do Departamento de Saúde;
II - zelar pela boa qualidade dos serviços prestados;
III - zelar pela conservação dos equipamentos e materiais do setor, provendo reposição, modernização e reparo sempre que necessário;
IV - manter as equipes devidamente preparadas para o desempenho das atividades inerentes aos setores;
V - coletar, analisar e manter atualizados os indicadores e dados estatísticos relacionados às atividades dos setores, elaborando relatórios gerenciais para subsidiar o planejamento e a tomada de decisão;
VI - participar tecnicamente dos processos licitatórios relacionados à aquisição de equipamentos e materiais, elaborando termos de referência, especificações, pareceres, estudos técnicos preliminares e demais documentos necessários;
VII - elaborar acordos administrativos e acompanhar a prestação de serviços aos usuários do Sistema de Saúde da Marinha (SSM) pelas OSE credenciadas, garantindo a continuidade, qualidade e conformidade da assistência; e
VIII - submeter, ao Chefe do Departamento de Saúde, as escalas de serviço de profissionais relacionadas a assistência em saúde.
Art. 62 - Ao Núcleo de Atendimento ao Idoso na Marinha - NAIM (HNRe-10.1), compete:
I - atender o idoso frágil ou em risco de fragilidade;
II - realizar acompanhamento multidisciplinar dos pacientes idosos; e
III – promover atividades de conscientização, treinamento de cuidadores, oficinas terapêuticas e ciclos de palestras aos pacientes e familiares.
Art. 63 - Ao Serviço de Pronto Atendimento - SPA (HNRe-10.2) compete:
I - prestar atendimento imediato e contínuo a pacientes em situação de urgência ou emergência, assegurando a integridade física e a estabilização clínica;
II – avaliar, classificar e priorizar pacientes de acordo com protocolos de triagem e classificação de risco;
III – coordenar a assistência multiprofissional, garantindo a comunicação eficiente entre as equipes;
IV – garantir a disponibilidade e conservação de materiais, medicamentos e equipamentos necessários ao atendimento emergencial;
V –assegurar a transferência segura de pacientes para outras unidades hospitalares, quando indicado; e
VI – elaborar relatórios estatísticos sobre atendimentos, incidentes e indicadores assistenciais, subsidiando a gestão do serviço.
Art. 64 - Ao Serviço de Arquivo Médico e Estatística - SAME (HNRe-10.3) compete:
I - providenciar abertura e arquivamento dos prontuários médicos;
II - zelar pela organização do arquivo de prontuários médicos, garantindo a segurança e qualidade na guarda dos prontuários;
III – fornecer cópia de prontuários quando devidamente solicitadas pelos usuários, segundo os critérios legais de sigilo de informações médicas; e
IV – elaborar, coletar e analisar dados estatísticos e de produtividade das atividades assistenciais desenvolvidas no HNRe, assessorando a Direção na tomada de decisões.
Art. 65 - À Unidade de Pacientes Graves - UPG (HNRe-10.4) compete prover o suporte avançado e o atendimento de medicina semi-intensiva e intensiva aos pacientes do SSM, observando as normas pertinentes e a capacidade instalada vigente.
Art. 66 - Ao Serviço de Ambulatório (HNRe-10.5) compete:
I - prestar atendimento ambulatorial nos níveis primário e secundário aos pacientes do SSM;
II - gerir o agendamento de consultas, exames e procedimentos ambulatoriais, assegurando fluxo eficiente de atendimento;
III – monitorar indicadores de tempo de aprazamento e taxa de absenteísmo; e
III – manter atualizado o prontuário e registros clínicos dos pacientes, garantindo confidencialidade e segurança das informações.
Art. 67 - Ao Núcleo de Segurança do Paciente - NSP (HNRe-10.6) compete:
I - desenvolver, implementar e revisar políticas, protocolos e procedimentos relacionados à segurança do paciente, em conformidade com as normas vigentes;
II – fiscalizar, identificar, registrar e analisar incidentes, eventos adversos e quase acidentes, propondo ações corretivas e preventivas;
III – monitorar indicadores de segurança do paciente, elaborando relatórios periódicos para subsidiar a gestão do hospital;
IV – promover adestramentos da equipe multiprofissional sobre práticas seguras de assistência; e
V – avaliar e acompanhar a implementação de medidas de segurança em todos os setores do hospital, incluindo equipamentos, infraestrutura e processos assistenciais.
Art. 68 - Ao Serviço Integrado de Atenção Domiciliar - SIAD (HNRe-10.7), compete:
I - prover assistência domiciliar aos pacientes que, por limitação funcional ou problemas de saúde, não podem manter acompanhamento em regime ambulatorial;
II - realizar visitas domiciliares pela equipe de saúde multiprofissional aos pacientes, acompanhando a evolução do quadro clínico;
III - gerenciar e coordenar a elaboração do Plano de Atenção Domiciliar (PAD) individualizado, pela CAAPAD; e
IV – avaliar as demandas por assistência domiciliar e home-care, por meio da CAAPAD.
Art. 69 - Ao Serviço de Credenciamento (HNRe-10.8) compete:
I – elaborar e atualizar os editais de credenciamento em conformidade com as normas em vigor;
II - providenciar suas publicações, bem como elaborar os Termos de Contrato, garantindo continuidade da assistência ao usuário do SSM, na área de abrangência do HNRe;
III – assessorar e orientar os fiscais de contrato no desempenho de suas funções; e
IV – assessorar e subsidiar a Direção nas tratativas e negociações contratuais com as OSE credenciadas.
Art. 70 - À Divisão de Medicina (HNRe-11) compete:
I - prestar assistência médico-cirúrgica aos usuários do SSM, em regime ambulatorial ou de internação;
II – coordenar e executar programas de saúde e de educação sanitária;
III - supervisionar o atendimento médico de pacientes nos ambulatórios, nas unidades de internação, no centro cirúrgico e no SPA;
IV – gerenciar, detalhar e distribuir o pessoal médico nas diversas fainas nas quais se faça necessário; e
V – coordenar e promover, em conjunto com o Centro de Estudos, atividades, adestramentos, palestras e eventos de sua área de conhecimento.
§ 1º - Às Seções de Medicina Clínica (HNRe-11.1) e de Medicina Cirúrgica (HNRe-11.2) competem prestar assistência médica, nas diversas especialidades, aos pacientes ambulatoriais e internados, conforme suas especialidades.
Art. 71 - Ao Serviço de Diagnóstico por Imagem (HNRe-11.3) compete:
I - realizar os exames radiográficos e ultrassonográficos solicitados pelo corpo clínico do HNRe e emitir os respectivos laudos; e
II - controlar o cadastramento do pessoal que opera com raios-X e a aplicação das medidas apropriadas de radioproteção.
Art. 72 - Ao Serviço de Medicina Integral - SMI (HNRe-11.4) compete:
I - realizar atendimento objetivando a resolutividade dos casos, de forma a reduzir os encaminhamentos para OSE credenciadas;
II - garantir a qualidade e adequação da assistência primária conforme preconizado na Política Assistencial para o Sistema de Saúde da Marinha (PASSM);
III - promover e priorizar a atenção básica à saúde na prevenção de doenças; e
IV - manter o acompanhamento do usuário após a alta do especialista (contra-referência).
Art. 73 - Ao Serviço de Medicina Operativa (HNRe-11.5) compete:
I – planejar, coordenar e executar as atividades de medicina operativa na área de jurisdição do HNRe;
II - desenvolver programas de treinamento e executar adestramentos relacionados à sua área de atuação; e
III - coordenar, com as outras OM da área, ações conjuntas que envolvam medicina operativa e Defesa Nuclear, Biológica, Química e Radiológica (NBQR).
Art. 74 - À Divisão de Odontologia (HNRe-12) compete:
I - prestar assistência odontológica aos usuários do SSM, em regime ambulatorial e de internação, eletivos e de urgência, nas diversas especialidades e suas áreas de competências;
II – elaborar termos de referência, mapas comparativos de preços, pareceres e estudos técnicos preliminares afetos à aquisição de material permanente e de consumo odontológico;
III - assessorar na elaboração dos acordos administrativos e serviços eventuais prestados ao HNRe, executados por OSE, em sua esfera de responsabilidade;
IV – realizar inspeções de saúde nas finalidades segundo sua competência e de acordo com a norma vigente;
V – coordenar e executar ações e campanhas de promoção de saúde bucal; e
VI - gerenciar e apresentar dados estatísticos de atendimento e produtividade dos setores da Divisão.
Art. 75 - À Divisão de Enfermagem (HNRe-13) compete:
I – prestar assistência de enfermagem nos diversos setores de atendimento aos usuários do SSM;
II – elaborar e supervisionar as escalas de serviço do pessoal de enfermagem;
III – gerenciar a qualidade da assistência de enfermagem prestada aos pacientes;
IV – supervisionar as ações de aquisição e manutenção de materiais e equipamentos necessários e de sua competência;
V – prover e coordenar a capacitação da equipe de enfermagem; e
VI – planejar e distribuir pessoal necessário à prestação de apoios de saúde hospitalares, operativos e em caso de mobilização.
Art. 76 - Às Unidades de Internação (HNRe-13.1) compete prestar atendimento e assistência de enfermagem clínica e cirúrgica aos pacientes internados no HNRe.
Art. 77 – Ao Serviço de Imunização (HNRe-13.2) compete:
I - planejar, coordenar e executar a vacinação dos usuários, em conformidade com protocolos institucionais e normas vigentes;
II – manter atualizado o calendário vacinal, garantindo a cobertura completa e adequada da população atendida;
III – controlar, armazenar e zelar pelos imunobiológicos, assegurando condições de conservação, validade e rastreabilidade;
IV – garantir a atualização vacinal dos militares da ativa, com atenção especial às necessidades específicas para a participação em missões, e realizar censos vacinais periódicos da tripulação; e
V – Participar das campanhas e ações de imunização regionais e nacionais, quando demandado.
Art. 78 - Ao Centro Cirúrgico (HNRe- 13.3) compete:
I – planejar, organizar e coordenar todas as atividades relacionadas aos procedimentos cirúrgicos, assegurando segurança e qualidade da assistência pré, intra e pós-operatória aos pacientes; e
II – garantir a disponibilidade, conservação e manutenção de equipamentos, materiais e insumos necessários à realização das cirurgias.
Art. 79 - À Central de Material e Esterilização - CME (HNRe-13.4) compete:
I - planejar, executar e avaliar todas as etapas relacionadas ao processamento dos materiais médico-cirúrgicos: recepção, limpeza, secagem, preparo, desinfecção e/ou esterilização, armazenamento e distribuição para as unidades consumidoras;
II – realizar o monitoramento e controle das etapas de limpeza e desinfecção e/ou esterilização, bem como da manutenção dos equipamentos em uso na CME; e
III – controlar, por meio de inventários, a dotação dos instrumentais cirúrgicos, materiais de saúde e dos equipamentos.
Art. 80 - À Divisão de Serviços Complementares (HNRe-14) compete:
I - prestar serviços e atendimentos nas áreas de Fisioterapia, Nutrição, Psicologia, Fonoaudiologia e Serviço Social.
Art. 81 - Ao Serviço de Fisioterapia e Reabilitação (HNRe-14.1) compete prestar assistência na sua área específica aos pacientes ambulatoriais e internados.
Art. 82 - Ao Serviço de Nutrição (HNRe-14.2) compete:
I - promover, planejar e supervisionar as atividades de assistência nutricional aos pacientes internados e em atendimento ambulatorial, bem como os serviços contratados de copeiragem; e
II - supervisionar e avaliar, em apoio à Seção de Municiamento, a elaboração dos cardápios e a produção das refeições confeccionadas no hospital, tanto para a Tripulação como para os pacientes internados, de acordo com as normas sanitárias vigentes.
Art. 83 - Ao Serviço de Psicologia (HNRe-14.3) compete:
I - prestar acompanhamento psicológico aos pacientes ambulatoriais e internados, bem como fornecer apoio emocional aos seus familiares por meio de ações diagnósticas, terapêuticas, de informação e orientação; e
II – triar e encaminhar os pacientes elegíveis para tratamento psicoterápico, para as OSE credenciadas.
Art. 84 - Ao Serviço de Fonoaudiologia (HNRe-14.4) compete:
I - prestar assistência fonoaudiológica aos pacientes ambulatoriais e internados; e
II - promover a realização de avaliação auditiva especializada para os pacientes ambulatoriais e nos procedimentos periciais.
Art. 85 - Ao Serviço de Assistência Social (HNRe-14.5) compete prestar assistência na área social aos militares e aos seus dependentes, bem como aos pacientes internados e aos seus familiares, de acordo com as normas definidas pela Diretoria de Assistência Social da Marinha (DASM).
Art. 86 - À Divisão de Regulação em Saúde (HNRe-15) compete:
I - executar e controlar os processos referentes à autorização de consultas e procedimentos médico-hospitalares de baixa, média e alta complexidade em OSE credenciadas, em conformidade com as diretrizes emanadas pela DSM.
Art. 87 - À Seção de Orçamentos em Saúde (HNRe-15.1) compete pesquisar, analisar e negociar os custos dos procedimentos a serem realizados em OSE credenciada, sobretudo os que empregam o uso de Órteses, Próteses e Materiais Especiais (OPME), quimioterápicos e/ou medicamentos especiais, com a finalidade de otimizar o emprego dos recursos financeiros.
Art. 88 - À Seção de Emissão de Guias (HNRe- 15.2) compete emitir, cancelar e revalidar as Guias de Apresentação ao Usuário (GAU) para consultas, exames e procedimentos diagnósticos/terapêuticos, assim definidos pelas normas vigentes emitidas pela DSM.
Art. 89 - À Divisão de Farmácia e Laboratório (HNRe-16) compete coordenar e supervisionar as atividades técnicas do Serviço de Laboratório de Análises Clínicas, Farmácia Hospitalar, SeDiMe e Central de Abastecimento Farmacêutico - CAF.
Art. 90 - Ao Serviço de Laboratório de Análises Clínicas (HNRe-16.1) compete:
I - realizar os exames laboratoriais dos pacientes internados, ambulatoriais e do SPA, solicitados pelo corpo clínico do HNRe, pelos especialistas de OSE credenciadas e pela JRS; e
II - proceder o encaminhamento, para laboratório credenciado, do material biológico relativo aos exames que não são realizados no HNRe.
Art. 91 - Ao Serviço de Farmácia Hospitalar (HNRe-16.2) compete:
I - estabelecer um sistema organizacional de fracionamento, armazenagem e dispensação de medicamentos, de modo a atender os setores assistenciais e os pacientes internados, conforme prescrição médica;
II - armazenar os medicamentos sujeitos a controle especial segundo legislação vigente; e
III - exercer atividades relacionadas à farmácia clínica e farmacovigilância.
Art. 92 – Ao Setor de Dispensação de Medicamentos - SeDiMe (HNRe-16.3) compete:
I - controlar, armazenar e dispensar os medicamentos disponibilizados pelo Sistema de Distribuição de Medicamentos (SisDiMe) da DSM aos usuários do SSM, procedendo a indenização dos medicamentos de acordo com as normas vigentes; e
II - atender e orientar os pacientes cadastrados no Programa Saúde ao seu Alcance.
Art. 93 - À Central de Abastecimento Farmacêutico - CAF (HNRe-16.4) compete:
I - planejar, conduzir e controlar o processo de aquisição, recepção, armazenamento, controle de estoque e distribuição de medicamentos e materiais médico-hospitalares, visando à disponibilidade em tempo oportuno e nas quantidades necessárias às demandas; e
II - receber e atender as requisições dos setores assistenciais e de dispensação, promovendo a separação, distribuição e registro de saídas.
Art. 94 - Ao Departamento de Administração (HNRe-20) compete:
I - planejar, coordenar, supervisionar e controlar as atividades administrativas do hospital, assegurando o cumprimento das normas vigentes e a eficiência dos processos;
II – prover o apoio necessário às atividades finalísticas do HNRe; e
III – coordenar os setores subordinados, assegurando a integração operacional e a gestão eficiente dos recursos financeiros e patrimoniais.
Art. 95 - Às diversas Divisões, Seções e Serviços que compõem o Departamento de Administração, além de suas atribuições específicas, compete:
I - coordenar, executar e fazer cumprir as determinações técnico-administrativas do Departamento de Administração;
II - zelar pela boa qualidade dos serviços prestados;
III - zelar pela manutenção dos equipamentos, materiais e meios existentes no HNRe, elaborando os pedidos de material, sobressalentes e reparos que se fizerem necessários;
IV - manter elevados níveis de capacitação e de adestramento para o desempenho das atividades inerentes ao setor;
V - zelar pela limpeza, conservação e melhoria da estrutura física do HNRe; e
VI - assessorar o Chefe do Departamento de Administração nos assuntos pertinentes ao setor.
Art. 96 - Ao Serviço de Tecnologia da Informação – STI (HNRe-20.1) compete:
I - prestar suporte de orientação técnica aos usuários de equipamentos de informática;
II - administrar as atividades relacionadas à segurança das informações digitais, em consonância com os documentos condicionantes em vigor, especialmente as publicações da Diretoria-Geral do Material da Marinha - DGMM-540 (3ª Revisão) e demais instruções da Diretoria de Comunicações e Tecnologia da Informação da Marinha (DCTIM);
III - elaborar termos de referência, mapas comparativos de preços, pareceres e estudos técnicos preliminares afetos à aquisição de material permanente, hardware e software;
IV – prestar suporte de redes, de manutenção e de reparos dos equipamentos de informática;
V - manter os sistemas operacionais e aplicativos padronizados pela MB atualizados; e
VI - gerenciar as atividades desenvolvidas na utilização da rede de computadores, observando a Doutrina de Informática da MB e em conformidade com o Centro Local de Tecnologia da Informação (CLTI) distrital;
Art. 97 - À Comissão de Gestão Ambiental (HNRe-20.2) compete:
I - assessorar o Chefe do Departamento de Administração nos assuntos relacionados à coleta seletiva, ao gerenciamento de resíduos, ao planejamento e execução do Plano de Educação Ambiental, ao uso de tecnologias envolvendo sustentabilidade e à política ambiental da OM; e
II - manter atualizada a documentação interna concernente à gestão ambiental.
Art. 98 - À Divisão de Pessoal (HNRe-21) compete:
I - coordenar e controlar a movimentação, distribuição, frequência, municiamento, licenciamento, regresso, adestramento e controle periódico de saúde do pessoal;
II - coordenar e controlar as atividades ligadas aos direitos e deveres do pessoal lotado na OM, de acordo com o Estatuto dos Militares, legislações e normas vigentes;
III - manter atualizados os cadastros e registros do pessoal, bem como a alimentação dos sistemas digitais dos Órgãos de Pessoal da MB, de acordo com as normas em vigor;
IV - manter atualizados o Livro de Quartos do Estabelecimento da OM;
V - organizar os detalhes de serviço e escalas de bordo, tais como as de férias, de representações, de relatorias, balanços de paióis, dentre outras; e
VI - manter atualizados os registros de contravenções disciplinares do pessoal lotado na OM e conduzi-lo às audiências.
Art. 99 - À Seção de Pessoal Militar (HNRe-21.1) compete:
I - manter atualizado o fichário do pessoal militar e a escrituração das folhas de alterações de Caderneta Registro (CR) dos oficiais e praças, em conformidade com as instruções pertinentes;
II - manter atualizada a Tabela Mestra da Força de Trabalho - TMFT do HNRe no SisPessoal;
III - manter efetivo controle, por ocasião de embarque, desembarque e afastamentos dos militares, tomando as providências necessárias, de acordo com as normas vigentes;
IV - providenciar a remessa de documentos inerentes à avaliação dos militares, de acordo com as normas em vigor;
V - zelar pela higidez física do pessoal, implementando o programa de Treinamento Físico Militar (TFM), de acordo com as normas pertinentes;
VI - aplicar o Teste de Aptidão Física (TAF) dos militares, na época prevista, de acordo com as normas pertinentes;
VII - coordenar as atividades desportivas, onde a OM se fizer representar.
VIII- elaborar o programa de adestramento anual e o relatório semestral de adestramento;
IX - elaborar o mapa geral de cursados e o prontuário individual dos militares;
X - organizar e controlar os estágios iniciais e de aplicação dos militares recém-embarcados;
XI - apresentar subsídios referentes às necessidades de cursos e estágios da tripulação; e
XII – gerenciar mapas de cômputos de tempos de embarque, de instrutoria, exercício de funções técnicas, critérios para condecorações e medalhas, dentre outros.
Art. 100 - À Seção de Pessoal Civil (HNRe-21.2) compete:
I - manter atualizados o fichário e o cadastro do pessoal civil, de acordo com as instruções estabelecidas pela Diretoria do Pessoal Militar – Brasília;
II - cuidar dos processos de admissão, exoneração, aposentadoria, licenças, salário-família, prêmio mérito funcional, pagamentos de anuênios, auxílio natalino, dentre outros;
III - controlar a frequência e afastamentos do pessoal civil; e
IV - manter atualizada a TMFT de servidores civis e contratados.
Art. 101 - À Divisão de Intendência (HNRe-22) compete:
I - coordenar e controlar a execução das atividades relacionadas à administração de finanças, material, municiamento e rancho, de acordo com as normas e legislação vigentes;
II - coordenar e controlar a elaboração de contratos, convênios e cartas-contrato para prestação de serviços por terceiros, exceto os relacionados ao credenciamento de serviços de saúde;
III - assessorar o conselho de gestão e os chefes de departamentos, nos assuntos de sua competência;
IV - cumprir o Calendário de Trabalho do Plano Diretor (CTPD), no tocante ao acompanhamento financeiro do Plano de Ação;
V - participar da elaboração da proposta de subsídios para revisão do Plano de Ação;
VI - coordenar os procedimentos previstos para a cobrança de indenização médico hospitalar; e
VII – coordenar os serviços inerentes à gestoria de material junto ao Sistema de Gestão de Bens da Fazenda Nacional (SISBENF) e materiais de consumo junto ao SisMat.
Art. 102 - À Seção de Execução Financeira (HNRe-22.1) compete:
I - realizar, no Sistema Integrado de Administração Financeira do Governo Federal (SIAFI), os registros contábeis inerentes às gestões orçamentária, financeira e patrimonial da OM;
II - emitir as notas de empenho e ordens de pagamento autorizadas pelo ordenador de despesa ou seu substituto; e
III - assessorar o Ordenador de Despesa ou seu substituto em todos os assuntos de natureza financeira e contábil relacionados às correspondentes contas de gestão.
Art. 103 - À Seção de Municiamento (HNRe-22.2) compete:
I - executar os processos inerentes à gestoria de municiamento, de acordo com as normas e legislação em vigor;
II - executar os serviços inerentes à administração dos ranchos;
III - prover e abastecer a OM com os itens necessários ao fornecimento da alimentação da Tripulação e dos pacientes internados, bem como adquirir, receber e armazenar os gêneros e materiais necessários aos ranchos;
IV – elaborar, sob a supervisão do Serviço de Nutrição, os cardápios para os ranchos e pacientes internados;
V – preparar e servir as refeições destinadas aos comensais; e
VI – zelar pela manutenção das condições de limpeza e higiene dos ranchos e cozinha, bem como pela correta destinação de resíduos.
Art. 104 - À Seção de Indenização Médico-Hospitalar - IMH (HNRe-22.3) compete:
I – executar os lançamentos no Sistema CINHOS dos valores processados correspondentes às IMH referentes aos serviços de saúde prestados pelos diversos setores do HNRe;
II - executar os lançamentos no Sistema CINHOS dos valores processados correspondentes às IMH referentes aos serviços de saúde prestados pelas OSE credenciadas, fornecidos pelo Serviço de Auditoria em Saúde – SAS, após a auditagem das contas médicas;
III – manter o acompanhamento das metas de arrecadação da parcela “INHOS” estabelecidas pela DSM, buscando o seu cumprimento; e
IV – elaborar as Ordens de Serviço com os lançamentos dos descontos a serem implantados em Bilhete de Pagamento dos usuários.
Art. 105 - À Seção de Material (HNRe-22.4) compete:
I - executar e controlar os processos inerentes à gestão patrimonial de bens móveis no Sistema de Gestão de Bens da Fazenda Nacional (SISBENF), providenciando a documentação pertinente, em conformidade com as normas vigentes;
II - executar e controlar os pedidos de material fornecido pelo Sistema de Informações Gerenciais do Abastecimento (SINGRA), de acordo com as normas pertinentes;
III - executar os serviços inerentes ao recebimento, armazenagem e controle dos estoques do material de consumo no paiol de material comum, bem como a sua distribuição interna na OM; e
IV - elaborar inventários, balanços, demonstrativos e laudos de vistoria, avaliação e destinação (LVAD) do material.
Art. 106 - À Seção de Obtenção, Licitação e Acordos Administrativos (HNRe-22.5) compete:
I – planejar e executar os processos de obtenção de bens, materiais e contratação de serviços, observando os princípios da legalidade, impessoalidade, moralidade, publicidade e eficiência, em conformidade com a legislação e normas em vigor;
II – conduzir os procedimentos licitatórios, inclusive de dispensa e de inexigibilidade, de acordo com as normas legais e regulamentares aplicadas à administração pública militar;
III – revisar os termos de referência, pesquisas de preços e demais artefatos digitais, bem como elaborar editais, contratos e demais documentos administrativos relacionados aos processos de obtenção e licitação;
IV – manter registro atualizado e controle dos processos licitatórios e contratações realizadas, assegurando a transparência e rastreabilidade dos atos administrativos;
V – manter cadastro atualizado de fornecedores de material e prestadores de serviço em condições regulares;
VI – apoiar tecnicamente os pregoeiros e a Comissão de Credenciamento;
VII – encaminhar os processos licitatórios para apreciação das autoridades militares e jurídicas competentes, cumprindo as recomendações e orientações exaradas; e
VIII – subsidiar a Direção, em conjunto com a Assessoria Jurídica, na aplicação de penalidades aos entes contratados, quando necessário.
Art. 107 – À Seção de Operações de Créditos e Finanças (HNRe-22.6) compete:
I - controlar os créditos e recursos financeiros sob a responsabilidade da Unidade Gestora (UG), de acordo com o disposto nas normas em vigor; e
II - assessorar o Ordenador de Despesa ou seu substituto nos assuntos de natureza orçamentária relacionados às correspondentes contas de gestão.
Art. 108 - À Divisão de Serviços Gerais - DSG (HNRe-23) compete:
I - coordenar, organizar e controlar a execução dos serviços de manutenção, reparo e limpeza das dependências, instalações, equipamentos e viaturas;
II - fiscalizar a execução de contratos e cartas-contrato de manutenção, formulados pela OM, inerentes às atividades da divisão;
III - coordenar e controlar o emprego das viaturas;
IV - controlar o consumo mensal de combustíveis, lubrificantes e graxas, observando as cotas anuais distribuídas, de acordo com as normas pertinentes;
V - controlar o material e coordenar as atividades relacionadas com o combate a incêndio (CbInc) e Controle de Avarias (CAv);
VI - providenciar a manutenção de instalações e equipamentos da rede de aguada; e
VII - manter atualizado o plano piloto da OM, de acordo com as normas pertinentes.
Art. 109 - À Seção de Manutenção (HNRe-23.1) compete:
I - executar serviços de manutenção e reparo das estruturas prediais do HNRe;
II - executar os serviços de controle de avarias (CAv); e
III - cumprir as normas de combate a incêndio (CbInc) e realizar o adestramento da Tripulação.
Art. 110 - À Seção de Transportes (HNRe-23.2) compete:
I - manter as viaturas em condições de operacionalidade, providenciando o gerenciamento da frota, controle do consumo de combustível, manutenção preventiva e a execução dos reparos, quando necessários; e
II - manter atualizado o lançamento dos registros no Sistema de Viaturas (SISVTR).
Art. 111 - À Seção de Conservação e Limpeza (HNRe-23.3) compete planejar, coordenar e executar as atividades de limpeza, higienização e conservação das áreas internas e externas do Hospital, em conformidade com as normas técnicas, protocolos institucionais e legislações vigentes.
## CAPÍTULO III
## Do Pessoal
Art. 112 - A Força de Trabalho é composta por todo o pessoal que serve ou trabalha de forma permanente ou temporária na OM, distribuídos com base na Tabela Mestra da Força de Trabalho – TMFT.
Art. 113 - Os cargos, funções e incumbências, detalhados no presente RI e previstos na TMFT, conforme o constante no anexo B, serão ocupados por pessoal alocado, cabendo à Direção determinar as acumulações que se fizerem necessárias.
Art. 114 - As Funções Comissionadas Executivas (FCE) são distribuídas conforme o quadro abaixo:
DENOMINAÇÃO DA FUNÇÃO FCE
Encarregado da Seção de Pessoal Civil FCE 1.04
Encarregado da Seção de Execução Financeira FCE 1.04
Encarregado da Seção de Material FCE 1.04
Encarregado da Seção de IMH FCE 1.04
Encarregado da Seção de Operações de Créditos e Finanças FCE 1.04
Assistente da Seção de Transporte FCE 2.01
Assistente do Serviço de Arquivo Médico e Estatística FCE 2.02
## CAPÍTULO IV
## Dos Deveres Funcionais
Art. 115 - Compete ao Diretor:
I - presidir as reuniões dos conselhos técnico e de gestão;
II - exercer as atribuições previstas em legislação, regulamentos e normas vigentes, especialmente no constante do Capítulo 2, Título V, da OGSA, no que couber, e no Regime Jurídico dos Servidores Públicos Civis da União, para o chefe de repartição ou cargo correspondente, no que for aplicável;
III - julgar o pessoal em audiência;
IV - administrar os serviços e atividades da OM;
V - cumprir e fazer cumprir as determinações do Comando do 3º Distrito Naval (Com3ºDN), COMIMSUP, sobre os assuntos de caráter militar e administrativo;
VI - cumprir e fazer cumprir as orientações da Diretoria de Saúde da Marinha (DSM), Diretoria Especializada, sobre os assuntos de caráter técnico;
VII - manter entendimentos com os demais titulares de OM;
VIII - representar o HNRe perante o Conselho Regional de Medicina do Estado de Pernambuco (CREMEPE), entidades sanitárias e instituições de saúde públicas e privadas;
IX - coordenar as atividades do HNRe com as demais unidades militares de saúde da área;
X - apresentar, ao Com3ºDN e à DSM, nas épocas determinadas, os relatórios das atividades da OM;
XI - coordenar a elaboração dos subsídios para o Plano de Ação e encaminhá-los ao Comando do 3º Distrito Naval;
XII - expedir ordens, portarias, instruções e normas relativas às atividades da OM;
XIII - desempenhar a função de Ordenador de Despesa;
XIV – representar o HNRe, quando autorizado, perante a mídia e veículos de comunicação;
XV – delegar competência, quando previsto em norma e julgado necessário, a subordinado devidamente capacitado ao desempenho da tarefa; e
XVI - dirimir as dúvidas e resolver os casos omissos que, porventura, surgirem na aplicação deste RI.
Art. 116 - Compete ao Vice-Diretor:
I - exercer as atribuições previstas em legislação, regulamentos e normas vigentes, especialmente no constante do Capítulo 3, Título VI, da OGSA, no que lhe for aplicado;
II - cumprir e fazer cumprir as determinações do Diretor sobre assuntos de caráter militar e administrativo;
III - presidir as reuniões da Comissão de Planejamento de Adestramento (CPA);
IV - participar das reuniões dos conselhos técnico e de gestão;
V - distribuir o pessoal pelos departamentos e elementos organizacionais subordinados;
VI - supervisionar a execução dos serviços de quarto, de Oficial de Sala de Estado (OSE) de Oficial Superior de Pernoite (OSP) e plantão médico;
VII - prover atos administrativos que consubstanciem as decisões do Diretor;
VIII - assessorar o Diretor no exercício de suas atribuições, e substituí-lo nos impedimentos eventuais;
IX - expedir ordens e instruções sobre a execução dos serviços da OM, de acordo com a autoridade que lhe for delegada pelo Diretor e a que lhe couber especificamente;
X - coordenar e estimular as atividades do Centro de Estudos, presidindo suas reuniões;
XI - gerenciar a SECOM; e
XII - coordenar e controlar as atividades da OM, fazendo cumprir a rotina de bordo, planejando e supervisionando a execução e o cumprimento das atividades dos departamentos e demais elementos organizacionais a ele subordinados.
Art. 117 - Compete aos Chefes dos Departamentos:
I - conduzir os trabalhos pertinentes à sua esfera de responsabilidade;
II - prover os atos administrativos que consubstanciem as decisões do Diretor e Vice-Diretor;
III - exercer as atribuições previstas em legislação, regulamentos e normas vigentes, especialmente no constante da Seção II, Capítulo 4, Título VI, da OGSA, no que lhe for aplicado;
IV - dirigir as atividades dos respectivos departamentos, cumprindo e fazendo cumprir as instruções e ordens expedidas pelo Diretor;
V - expedir ordens e instruções internas sobre assuntos pertinentes aos respectivos departamentos, desde que previamente aprovadas pelo Diretor;
VI - supervisionar as atividades das divisões subordinadas;
VII - intermediar o contato com órgãos externos, de interesse do departamento, determinados pelo Diretor;
VIII - distribuir o pessoal pelas divisões subordinadas;
IX - elaborar relatórios das atividades do departamento, quando determinado;
X - elaborar as propostas de subsídios relativos ao departamento para o Plano de Ação;
XI - participar das reuniões do conselho de gestão;
XII - acompanhar os acordos administrativos e serviços prestados ao hospital, que são executados por organizações de saúde civis credenciadas e não credenciadas, pertinentes ao departamento;
XIII - fiscalizar o cumprimento de legislações, instruções e normas pertinentes aos serviços desenvolvidos na OM; e
XIV - coordenar e controlar o aprimoramento técnico e o adestramento do pessoal subordinado, dentro de suas áreas profissionais.
Art. 118 - Competem aos Encarregados das Divisões:
I - exercer as atribuições previstas em legislação, regulamentos e normas vigentes, especialmente no constante da Seção III, Capítulo 4, Título VI, da OGSA, no que lhes for aplicável;
II - coordenar e fazer executar os serviços técnicos e administrativos de suas divisões, cumprindo e fazendo cumprir as instruções, ordens e normas expedidas pelos respectivos chefes de departamentos;
III - manter estreita cooperação entre as divisões dos respectivos departamentos, promovendo a necessária colaboração nos estudos de assuntos e na realização de trabalhos de interesse comum;
IV - supervisionar as atividades das respectivas seções e serviços;
V - distribuir o pessoal designado para servir nas respectivas seções e serviços e controlar sua presença;
VI - elaborar relatórios das atividades de suas divisões e apresentá-las ao Chefe do Departamento, nas épocas determinadas;
VII - zelar pela disciplina, conservação e limpeza nas dependências de suas divisões, tomando as providências necessárias para a correção de falhas e deficiências verificadas;
VIII - zelar pela atualização dos arquivos e cadastros pertinentes às atividades setoriais de sua área de atuação;
IX - submeter à apreciação do respectivo chefe do departamento todas as comunicações transmitidas ou recebidas;
X - verificar, conferir e autenticar qualquer documento originário de suas respectivas seções e serviços;
XI - coordenar e controlar a coleta de dados estatísticos setoriais pertinentes; e
XII - controlar o acervo de material, sendo o responsável pela carga ou delegando a responsabilidade a outro militar do setor, de acordo com as normas em vigor.
Art. 119 - Compete aos Encarregados de Serviços e Seções:
I - cumprir e fazer cumprir as ordens emanadas dos respectivos chefes dos departamentos e encarregados das divisões;
II - assessorar o encarregado da divisão nos assuntos pertinentes ao serviço ou à seção;
III - elaborar as normas de funcionamento do serviço ou da seção;
IV - participar de reuniões e colaborar nos estudos e trabalhos conjuntos, relativos ao serviço ou à seção;
V - executar o aperfeiçoamento e o adestramento dos militares e servidores civis do serviço ou da seção;
VI - elaborar os relatórios e mapas de suas atividades;
VII - fornecer subsídios para a padronização e o plano de aquisição de materiais e equipamentos;
VIII - coletar e fornecer dados estatísticos ao SAME, quando previsto nas normas definidas pela DSM; e
IX - manter, em boas condições de conservação, os materiais e equipamentos necessários ao desempenho de suas atividades e zelar por eles.
Art. 120 - Compete ao Mestre:
I - assessorar o Diretor na composição do Cerimonial da Marinha, por ocasião de eventos em que ocorra a recepção de autoridades militares e/ou civis;
II - tomar parte em cerimoniais de recepção e despedida de autoridades, executando os toques de apito;
III - acompanhar o Diretor nas inspeções programadas e realizadas nas dependências da OM, anotando as discrepâncias apontadas; e
IV - auxiliar o Encarregado da Divisão de Serviços Gerais na distribuição do pessoal, coordenação e execução das fainas de limpeza e manutenção dos diversos setores.
Art. 121 - Compete às demais praças os deveres inerentes às incumbências previstas na TMFT e Ordens Internas dos setores onde estão lotadas.
Art. 122 - Compete ao pessoal militar, além do disposto nos artigos anteriores deste capítulo, os deveres estabelecidos na OGSA e outros fixados em normas específicas.
Art. 123 - Compete ao Pessoal Civil, além do disposto nos artigos anteriores deste capítulo, os deveres previstos no Regime Jurídico dos Servidores Públicos Civis da União, das Autarquias e das Fundações Públicas Federais (RJU) e no Código de Ética Profissional do Servidor Público Civil do Poder Executivo Federal e outros fixados em normas específicas.
## CAPÍTULO V
## Das Substituições Funcionais Eventuais
Art. 124 - A substituição no exercício dos diversos cargos, previstos neste RI, far-se-á como se segue:
I - o Diretor, pelo Vice-Diretor:
Parágrafo único - Na ausência do Diretor, as decisões de caráter médico ficarão sob a responsabilidade do oficial médico mais antigo presente, com a ciência prévia do Vice-Diretor, visando preservar os aspectos éticos e legais do exercício da Medicina, junto aos órgãos fiscalizadores da classe.
II - o Vice-Diretor, pelo oficial mais antigo que se segue, entre o Chefe do Departamento de Saúde e o Chefe do Departamento de Administração;
III - o Chefe do Departamento de Saúde, pelo oficial encarregado de divisão mais antigo presente do respectivo departamento;
IV - o Chefe do Departamento de Administração, pelo oficial encarregado de divisão mais antigo presente do respectivo departamento;
V - o Encarregado de Divisão, pelo encarregado de seção ou serviço mais antigo presente da respectiva divisão; e
VI - o Encarregado de Seção ou Serviço, pelo militar mais antigo ou servidor civil que se suceda na hierarquia funcional da respectiva seção ou serviço.
## CAPÍTULO VI
## Outros Assuntos
Art. 125 - O presente RI será complementado por Ordens Internas, emanadas pelo Diretor em função dos temas e assuntos que se fizerem necessários, no interesse do bom funcionamento do HNRe.
  `;

  // Processamento do texto para remover notas de página e transformar os headers
  const processedText = useMemo(() => {
    return rawMarkdown
      .replace(/-\s*\d+\s*de\s*\d+\s*-/g, '') // Remove "- X de 32 -"
      .replace(/Continuação do anexo, da Port nº 107\/2025, do HNRe\./g, '') // Remove "Continuação..."
      .replace(/Anexo da Port nº 107\/2025, do HNRe\./g, '') // Remove "Anexo da Port..."
      .split('\n')
      .filter(line => line.trim() !== ''); // Limpa linhas vazias
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="REGIMENTO INTERNO HNRE" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-4 max-w-3xl mx-auto w-full flex-1 pb-32">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm font-body">
          {processedText.map((line, idx) => {
            // Documentação: Tratamento de Cabeçalhos
            if (line.startsWith('##')) {
              const text = line.replace('##', '').trim();
              return (
                <h2 key={idx} className="text-lg md:text-xl font-heading font-bold text-[#050F41] mt-8 mb-3 uppercase border-b border-gray-100 pb-2">
                  {text}
                </h2>
              );
            }
            
            // Documentação: Negrito para 'Art. X -' e 'Parágrafo único'
            const articleMatch = line.match(/^(Art\.\s*\d+\s*[-–]?\s*|§\s*\d+º\s*[-–]?\s*|Parágrafo [uú]nico\s*[-–]?\s*)(.*)/i);
            
            if (articleMatch) {
               return (
                 <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-3 text-justify">
                   <strong className="text-[#050F41]">{articleMatch[1]}</strong>
                   {articleMatch[2]}
                 </p>
               );
            }

            // Documentação: Negrito para Inicisos ('I - ', 'II - ', etc.)
            const itemMatch = line.match(/^([IVXLCDM]+\s*[-–]\s*)(.*)/);
            if (itemMatch) {
                return (
                 <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-2 text-justify pl-4 border-l-2 border-gray-200">
                   <strong className="text-gray-900">{itemMatch[1]}</strong>
                   {itemMatch[2]}
                 </p>
               );
            }

            // Parágrafo Normal
            return (
              <p key={idx} className="text-sm md:text-[15px] text-gray-700 leading-relaxed mb-3 text-justify">
                {line}
              </p>
            );
          })}
        </div>

        {/* FAB: Download PDF */}
        <a 
          href="https://drive.google.com/file/d/1ZrC8DC-RvOHAIETaAiFM5RkRk4YwpxT7/view?usp=sharing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#050F41] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-slate-700 z-50"
          title="Baixar PDF Original"
        >
          <Download size={24} />
        </a>

        {/* FAB: Scroll to Top */}
        {showScrollTop && (
          <button 
            onClick={scrollToTop}
            className="fixed bottom-40 right-6 w-12 h-12 bg-white text-[#050F41] shadow-xl rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all border border-gray-200 z-50"
            title="Voltar ao topo"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </div>
    </div>
  );
};