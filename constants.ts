// Ficheiro: constants.ts
import { Disease, Law } from './types';

export const DISEASES: Disease[] = [
  {
    id: "alienacao_mental",
    name: "Alienação Mental",
    definition: "todo caso de distúrbio mental ou neuromental grave e persistente, no qual, esgotados os meios habituais de tratamento, haja alteração completa ou considerável da personalidade, comprometendo gravemente os juízos de valor e realidade, destruindo a autodeterminação e do pragmatismo e tornando o indivíduo total e permanentemente inválido para qualquer trabalho.",
    documents: [
      "Laudo médico de especialista em neurologia, psiquiatria e/ou geriatria",
      "Diagnóstico atual e data do início do acompanhamento (dd/mm/aaaa)",
      "Exame clínico da primeira consulta",
      "Relato da evolução e tratamento da doença",
      "Exames de imagem originais ou autenticados (TC, RM) para demência",
      "Escala de Avaliação Clínica de Demência (CDR)",
      "Certidão de Curatela (se o paciente for curatelado)"
    ],
    diagnoses: [
      {
        name: "Autismo infantil e atípico",
        criteria: ["próprio diagnóstico"]
      },
      {
        name: "Casos graves de epilepsia",
        criteria: [
          "predominância de sintomas de demenciação",
          "resistência terapêutica ou elevada frequência de surtos psicóticos"
        ]
      },
      {
        name: "Demência",
        criteria: [
          "provoque alteração completa ou considerável da personalidade",
          "comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
          "torne o indivíduo total e permanentemente inválido para qualquer trabalho"
        ]
      },
      {
        name: "Esquizofrenia",
        criteria: [
          "provoque alteração completa ou considerável da personalidade",
          "comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
          "torne o indivíduo total e permanentemente inválido para qualquer trabalho"
        ]
      },
      {
        name: "Outros",
        criteria: [
          "seja enfermidade mental ou neuromental",
          "seja grave e persistente",
          "seja refratária aos meios habituais de tratamento",
          "provoque alteração completa ou considerável da personalidade",
          "comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
          "torne o indivíduo total e permanentemente inválido para qualquer trabalho",
          "haver um nexo sintomático entre o quadro psíquico e a personalidade do indivíduo"
        ]
      },
      {
        name: "Retardo mental moderado",
        criteria: [
          "atraso acentuado no desenvolvimento na infância",
          "mínimo grau de independência quanto aos cuidados pessoais",
          "mínimo grau de comunicação social e habilidade acadêmica"
        ]
      },
      {
        name: "Retardo mental profundo ou grave.",
        criteria: [
          "provoque alteração completa ou considerável da personalidade",
          "comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
          "torne o indivíduo total e permanentemente inválido para qualquer trabalho"
        ]
      },
      {
        name: "Síndrome de Rett.",
        criteria: ["próprio diagnóstico"]
      },
      {
        name: "Transtorno afetivo bipolar grave com sintomas psicóticos",
        criteria: [
          "seja grave e persistente",
          "seja refratária aos meios habituais de tratamento"
        ]
      },
      {
        name: "Transtorno de personalidade e do comportamento devido à doença, lesão ou disfunção cerebral",
        criteria: [
          "grave",
          "persistente",
          "refratário aos meios habituais de tratamento"
        ]
      },
      {
        name: "Transtorno delirante persistente",
        criteria: [
          "provoque alteração completa ou considerável da personalidade",
          "comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
          "torne o indivíduo total e permanentemente inválido para qualquer trabalho"
        ]
      },
      {
        name: "Transtorno depressivo recorrente grave com sintomas psicóticos",
        criteria: [
          "seja grave e persistente",
          "seja refratária aos meios habituais de tratamento"
        ]
      },
      {
        name: "Transtornos mentais e comportamentais devido ao uso de substância psicoativa",
        criteria: [
          "presença de sintomas psicóticos",
          "comprometimento grave e irreversível de personalidade"
        ]
      }
    ]
  },
  {
    id: "cardiopatia_grave",
    name: "Cardiopatia Grave",
    definition: "São consideradas cardiopatias graves, as doenças cardiovasculares agudas ou crônicas que acarretam, de modo irreversível, em maior ou menor período de tempo, a perda da capacidade física e funcional do coração, ultrapassando os limites de eficiência dos mecanismos de compensação, determinando incapacidade permanente para todo e qualquer trabalho ou o risco de morte prematura, não obstante o tratamento clínico ou cirúrgico adequado.",
    documents: [
      "Relatório médico com data do início do acompanhamento e terapêutica",
      "Eletrocardiograma (ECG)",
      "Holter",
      "Teste Ergométrico",
      "Ecocardiograma",
      "Ergoespirometria",
      "Teste de Caminhada",
      "Ecocardiograma com Estresse",
      "Radiografia de tórax (mínimo duas incidências) focando em coração, vasos e campos pulmonares .",
      "Cintilografia Miocárdica",
      "Cinecoronarioventriculografia",
      "Angiotomografia computadorizada .",
      "tomografia coronariana computadorizada",
      "Angio-ressonância magnética",
      "Ressonância magnética cardíaca .",
      "Exames de função cardiológica pós-cirúrgicos (se aplicável)"
    ],
    diagnoses: [
      {
        name: "Aortopatias - Aneurisma de Aorta Torácica",
        criteria: [
          "diâmetro > 5,5 cm (ascendente) ou > 6 cm (descendente)",
          "sintomas de compressão de estruturas vizinhas",
          "diâmetro > 5 cm em portadores de síndrome de Marfan ou válvula bicúspide",
          "aneurismas de rápida progressão"
        ]
      },
      {
        name: "Aortopatias - Dissecção e Hematoma de Aorta",
        criteria: [
          "dissecção aguda Tipo A",
          "dissecção aguda Tipo B associada a comprometimento de órgão-alvo ou iminência de ruptura",
          "dissecção não aguda com sintomas recorrentes ou progressão da lesão",
          "hematoma intramural de aorta"
        ]
      },
      {
        name: "Arritmias Cardíacas",
        criteria: [
          "arritmias graves resistentes ao tratamento ou à ablação",
          "episódios tromboembólicos",
          "disfunção do nó sinusal sintomática",
          "bAV II grau Mobitz II ou BAVT sintomático",
          "fibrilação atrial com baixa resposta ventricular",
          "taquicardias ventriculares ou supraventriculares sintomáticas com comprometimento hemodinâmico",
          "síndrome de preexcitação com alto risco de morte súbita",
          "portadores de marcapasso definitivo com capacidade funcional limitada pela doença de base"
        ]
      },
      {
        name: "Cardiopatia Hipertensiva",
        criteria: [
          "hipertrofia ventricular esquerda detectada por ECG ou Ecocardiograma (massa > 163 g/m em homens e > 121 g/m em mulheres) persistente",
          "disfunção ventricular esquerda sistólica com fração de ejeção < 0,40",
          "arritmias complexas relacionadas à hipertensão arterial",
          "cardiopatia isquêmica grave associada",
          "comprometimento de órgãos-alvo: Cérebro (AVC), Rins (creatinina > 3mg/dl ou clearence < 30 ml/min), Artérias periféricas (aneurisma ou dissecção de aorta), Retina (papiledema)"
        ]
      },
      {
        name: "Cardiopatia Isquêmica - Forma Aguda - SCA C/ SST ou BRE novo",
        criteria: [
          "choque cardiogênico (Killip IV) em casos com supradesnível de ST",
          "insuficiência cardíaca aguda (Killip II ou III) em casos com supradesnível de ST",
          "arritmia ventricular maligna em casos com supradesnível de ST",
          "complicação mecânica do IAM (ruptura de parede livre, CIV, disfunção de músculo papilar)",
          "iAM anterior extenso (V1-V6, D1, AVL)",
          "bAV II grau Mobitz II",
          "bAVT ou distúrbio de condução interventricular",
          "infarto perioperatório de cirurgia de revascularização do miocárdio",
          "infarto agudo do miocárdio em indivíduo com infarto prévio de grande extensão ou com insuficiência cardíaca já estabelecida"
        ]
      },
      {
        name: "Cardiopatia Isquêmica - Forma Aguda - SCA S/ SST",
        criteria: [
          "baixo débito cardíaco",
          "insuficiência cardíaca aguda",
          "arritmia ventricular maligna",
          "disfunção ventricular mecânica em paciente já revascularizado ou sem condições de submeter-se à revascularização"
        ]
      },
      {
        name: "Cardiopatia Isquêmica - Forma Crônica (Angina Estável)",
        criteria: [
          "angina classes III e IV da CCS, a despeito da otimização da terapêutica",
          "insuficiência cardíaca associada à isquemia aguda ou disfunção ventricular progressiva",
          "arritmias ventriculares graves (salvas de extrassístoles, taquicardia ventricular não sustentada ou sustentada)",
          "zona elétrica inativa no ECG",
          "alterações isquêmicas de ST-T permanentemente elevado",
          "distúrbios da condução atrioventricular e intraventricular (QRS >120ms)",
          "cardiomegalia com índice cardiotorácico superior a 0,5",
          "limitação da capacidade funcional (<5 MET) no teste ergométrico",
          "angina em carga baixa (<5 MET) no teste ergométrico",
          "fração de Ejeção (FE) < 0,40 em repouso ou esforço",
          "lesão de tronco de coronária esquerda ≥ 50% na cinecoronariografia",
          "lesões em três vasos ≥ 70% ou lesões em um ou dois vasos com grande massa miocárdica em risco"
        ]
      },
      {
        name: "Cardiopatias Congênitas",
        criteria: [
          "crises hipoxêmicas ou hemoptises",
          "insuficiência cardíaca classes III e IV",
          "arritmias de difícil controle e potencialmente malignas",
          "anomalias anatômicas graves (doença arterial pulmonar, hipoplasia/atresia de valvas, ventrículo único, etc.)",
          "sobrecargas ventriculares com hipocontratilidade acentuada ou hipertrofia desproporcionada"
        ]
      },
      {
        name: "Cor Pulmonale Crônico",
        criteria: [
          "hipóxia cerebral e periférica (baqueteamento digital)",
          "insuficiência cardíaca direita",
          "angina de peito classe III a IV da NYHA ou síncope",
          "galope ventricular direito (B3)",
          "gasometria com PO2 < 60 mmHg e PCO2 > 50 mmHg",
          "pressão sistólica em artéria pulmonar ≥ 60 mmHg",
          "insuficiência tricúspide importante"
        ]
      },
      {
        name: "Miocardiopatias - Cardiopatia Chagásica Crônica",
        criteria: [
          "história de síncope e/ou fenômenos tromboembólicos",
          "cardiomegalia acentuada",
          "insuficiência cardíaca classes III e IV",
          "fibrilação atrial ou arritmias ventriculares complexas",
          "bloqueio bi ou trifascicular sintomático",
          "bloqueio atrioventricular total"
        ]
      },
      {
        name: "Miocardiopatias - Dilatadas",
        criteria: [
          "história de fenômenos tromboembólicos sistêmicos",
          "cardiomegalia importante",
          "ritmo de galope (B3)",
          "insuficiência cardíaca classes III e IV",
          "fração de ejeção ≤ 0,40",
          "fibrilação atrial ou arritmias ventriculares complexas",
          "distúrbios da condução intraventricular com QRS > 120 ms"
        ]
      },
      {
        name: "Miocardiopatias - Hipertróficas",
        criteria: [
          "indivíduo sintomático (síncope, angina, insuficiência cardíaca e embolia sistêmica)",
          "diagnóstico na infância",
          "hipertrofia moderada ou severa com alterações isquêmicas de ST-T",
          "cardiomegalia",
          "disfunção ventricular esquerda sistólica com FE < 40%",
          "fibrilação atrial ou arritmias ventriculares complexas",
          "regurgitação mitral importante",
          "forma obstrutiva com gradiente de via de saída ≥ 50 mmHg"
        ]
      },
      {
        name: "Miocardiopatias - Restritivas",
        criteria: [
          "história de fenômenos tromboembólicos",
          "cardiomegalia acentuada",
          "insuficiência cardíaca classes III e IV",
          "envolvimento do ventrículo direito",
          "fibrose miocárdica acentuada",
          "regurgitação mitral e/ou tricúspide importante"
        ]
      },
      {
        name: "Pericardiopatias - Pericardites",
        criteria: [
          "extrema restrição do enchimento ventricular por inflamação crônica",
          "congestão circulatória periférica",
          "pulso paradoxal",
          "turgência jugular e refluxo hepato-jugular",
          "hepatomegalia"
        ]
      },
      {
        name: "Valvopatias - Estenose Aórtica",
        criteria: [
          "sintomas de baixo débito cerebral, angina e insuficiência cardíaca",
          "área valvar < 0,75 cm²",
          "gradiente médio > 50 mmHg ou máximo > 70 mmHg",
          "sinais de hipocinesia ventricular esquerda"
        ]
      },
      {
        name: "Valvopatias - Estenose Mitral",
        criteria: [
          "fenômenos tromboembólicos",
          "insuficiência cardíaca classes III e IV",
          "edema pulmonar agudo ou hemoptises",
          "área valvar < 1,0 cm²",
          "gradiente transvalvar médio > 15 mmHg",
          "pressão sistólica da artéria pulmonar > 50 mmHg"
        ]
      },
      {
        name: "Valvopatias - Insuficiência Aórtica",
        criteria: [
          "insuficiência cardíaca classes III e IV",
          "manifestações de baixo débito cerebral (síncope)",
          "pressão diastólica próxima a zero",
          "fluxo reverso holodiastólico da aorta descendente",
          "queda da FE abaixo de 40% no esforço",
          "fração de regurgitação > 60%"
        ]
      },
      {
        name: "Valvopatias - Insuficiência Mitral",
        criteria: [
          "insuficiência cardíaca classes III e IV",
          "sopro holossistólico de intensidade maior que 3+/6+",
          "fibrilação atrial",
          "comprometimento progressivo da função ventricular sistólica",
          "onda 'v' elevada (3 vezes a média do capilar pulmonar) na hemodinâmica",
          "fração de regurgitação > 60%"
        ]
      },
      {
        name: "Valvopatias - Prolapso Valvar Mitral",
        criteria: [
          "história familiar de morte súbita ou síncope",
          "arritmias ventriculares complexas ou fibrilação atrial",
          "regurgitação mitral importante",
          "rotura de cordoalhas tendíneas"
        ]
      }
    ]
  },
  {
    id: "cegueira",
    name: "Cegueira",
    definition: "A Cegueira ou amaurose é um estado patológico no qual a acuidade visual de um olho (monocular) ou de ambos os olhos é igual a zero (CID H54.0), sem percepção luminosa, após esgotados os recursos de correção óptica.",
    documents: [
      "Laudo oftalmológico completo atual e da época do diagnóstico",
      "Acuidade visual da época do diagnóstico",
      "Evolução da doença e procedimentos cirúrgicos realizados",
      "Atestado de esgotamento de recursos terapêuticos (se aplicável)"
    ],
    diagnoses: [
      {
        name: "Cegueira",
        criteria: [
          "20/400 x 20/1.200 ou 0,02 ou capacidade de contar dedos a 1 metro",
          "20/1.200 ou 0,02 ou capacidade de contar dedos a 1 metro x Percepção de luz",
          "ausência de Percepção de luz"
        ]
      },
      {
        name: "Visão subnormal",
        criteria: [
          "20/70  x 20/200",
          "20/200 x 20/400"
        ]
      }
    ]
  },
  {
    id: "contaminacao_por_radiacao",
    name: "Contaminação por Radiação",
    definition: "Compreende o estado patológico, agudo ou crônico, decorrente da exposição do indivíduo a radiações ionizantes, de origem nuclear ou não, em níveis superiores aos limites estabelecidos em normas específicas, e que acarrete incapacidade definitiva para o serviço militar.",
    documents: [
      "Atestado de Origem ou Inquérito Sanitário de Origem",
      "Laudos do serviço especializado com data do diagnóstico",
      "Exames subsidiários realizados",
      "Sequelas definitivas e segmentos corporais atingidos"
    ],
    diagnoses: [
      {
        name: "Quadro Clínico Geral",
        criteria: [
          "Compreende o estado patológico, agudo ou crônico, decorrente da exposição a radiações ionizantes em níveis superiores aos limites estabelecidos",
          "Incapacidade definitiva para o serviço militar"
        ]
      }
    ]
  },
  {
    id: "doenca_de_parkinson",
    name: "Doença de Parkinson",
    definition: "É uma afecção degenerativa do sistema nervoso central, de caráter progressivo, caracterizada por tremor de repouso, rigidez muscular, bradicinesia e instabilidade postural.",
    documents: [
      "Relatório médico de especialista em neurologia e/ou geriatria",
      "Diagnóstico e data de início do acompanhamento (dd/mm/aaaa)",
      "Exame clínico à época e tratamento instituído",
      "Evolução e data de observação de maior gravidade (dd/mm/aaaa)"
    ],
    diagnoses: [
      {
        name: "Quadro Clínico Geral",
        criteria: [
          "tremor: hipercinesia, predominantemente postural, rítmica e não intencional, que diminui com a execução de movimentos voluntários e pode cessar com o relaxamento total",
          "rigidez muscular: sinal característico e eventualmente dominante, acompanha-se do exagero dos reflexos tônicos de postura e determina o aparecimento de movimentos em sucessão fracionária, conhecidos como \"sinal da roda dentada\" (Negro)",
          "oligocinesia: diminuição da atividade motora espontânea e consequente lentidão de movimentos"
        ]
      }
    ]
  },
  {
    id: "esclerose_multipla",
    name: "Esclerose Múltipla (EM)",
    definition: "É uma doença inflamatória crônica, desmielinizante, de provável etiologia autoimune, que acomete o sistema nervoso central, caracterizada por surtos e remissões ou por evolução progressiva, resultando em graus variáveis de incapacidade.",
    documents: [
      "Relatório ou atestado do médico assistente ou serviço de Neurologia",
      "Data do início do acompanhamento (dd/mm/aaaa)",
      "Grau de incapacidade pela escala EDSS no início",
      "Situação atual na escala EDSS",
      "Exames complementares de suporte ao diagnóstico definitivo",
      "Relação de medicações em uso"
    ],
    diagnoses: [
      {
        name: "Quadro Clínico Geral",
        criteria: [
          "exame do líquido cefalorraquidiano: anormal em até 55% dos casos",
          "ressonância magnética: é a técnica mais sensível, podendo mostrar as placas",
          "potencial evocado: analisa as respostas elétricas repetidas pela estimulação de um sistema sensorial e, geralmente, estão alteradas",
          "curso progressivo, com comprometimento motor ou outros distúrbios orgânicos que caracterizem a incapacidade para o exercício de suas atividades laborais"
        ]
      }
    ]
  },
  {
    id: "espondilite_anquilosante",
    name: "Espondilite Anquilosante (EA)",
    definition: "A Espondilite Anquilosante, inadequadamente denominada de espondiloartrose anquilosante nos textos legais, é uma doença inflamatória de etiologia desconhecida, que afeta principalmente as articulações sacroilíacas, interapofisárias e costovertebrais, os discos intervertebrais e o tecido conjuntivo frouxo que circunda os corpos vertebrais, entre estes e os ligamentos da coluna. O processo geralmente se inicia pelas sacroilíacas e, ascensionalmente, atinge a coluna vertebral.",
    documents: [
      "Laudo médico radiológico do comprometimento da coluna vertebral e bacia (articulações sacroilíacas)",
      "Tomografia computadorizada de articulações sacroilíacas e coluna",
      "Cintilografia óssea",
      "Teste sorológico específico HLA-B27"
    ],
    diagnoses: [
      {
        name: "Quadro Clínico Geral",
        criteria: [
          "Comprometimento inflamatório das articulações sacroilíacas, interapofisárias e costovertebrais",
          "Comprovação por exames radiológicos, tomográficos, cintilografia ou sorológico HLA-B27"
        ]
      }
    ]
  },
  {
    id: "estados_avancados_de_doenca_de_paget",
    name: "Estados Avançados de Doença de Paget",
    definition: "A doença de Paget é uma afecção óssea crônica, caracterizada por deformações ósseas de evolução lenta e progressiva, de etiologia desconhecida, geralmente assintomática e acometendo um só osso ou, menos frequentemente, atingindo várias partes do esqueleto.",
    documents: [
      "Relatório médico completo informando a data (mm/aaaa) do diagnóstico",
      "Resultados dos exames elucidatórios que subsidiaram o laudo",
      "Descrição dos segmentos ósseos acometidos (osteíte deformante)",
      "Descrição de complicações neurológicas, sensoriais ou cardiovasculares"
    ],
    diagnoses: [
      {
        name: "Complicações cardiovasculares",
        criteria: [
          "insuficiência cardíaca",
          "arteriosclerose periférica",
          "hipertensão arterial"
        ]
      },
      {
        name: "Complicações neurológicas e sensoriais",
        criteria: [
          "surdez",
          "perturbações olfativas",
          "neuralgias"
        ]
      },
      {
        name: "Lesões ósseas generalizadas",
        criteria: [
          "deformidades ósseas,",
          "osteoartrites secundárias",
          "fraturas espontâneas",
          "degeneração maligna (sarcoma osteogênico, fibrossarcoma e sarcoma de células redondas)"
        ]
      }
    ]
  },
  {
    id: "hanseniase",
    name: "Hanseníase",
    definition: "A hanseníase é uma doença infecto-contagiosa de notificação compulsória, causada pelo Mycobacterium leprae (bacilo de Hansen), de curso crônico, podendo apresentar surtos reacionais intercorrentes. Apresenta alta infectividade e baixa patogenicidade, sendo passível de tratamento e cura; a alta por cura é dada após a administração do número de doses preconizado pelo esquema terapêutico, dentro do prazo recomendado. O diagnóstico é essencialmente clínico e epidemiológico, realizado por meio da análise da história e condições de vida do paciente e do exame dermato-neurológico, para identificar lesões ou áreas de pele com alteração de sensibilidade e/ou comprometimento de nervos periféricos (sensitivo motor e/ou autonômico).",
    documents: [
      "Exame original confirmatório da doença",
      "Relatório do serviço de saúde com evolução e tempo de tratamento",
      "Descrição da data de início e término da poliquimioterapia",
      "Informação sobre atividade da doença ou recidiva",
      "Detalhamento de sequelas",
      "Comprovação de alta por cura"
    ],
    diagnoses: [
      {
        name: "Critérios clínicos de atividade da doença",
        criteria: [
          "presença de eritema e/ou infiltração nas lesões",
          "aparecimento de novas lesões",
          "aumento de lesões preexistentes",
          "espessamento e/ou parestesia de nervos ou troncos nervosos previamente normais",
          "paresia ou paralisia de músculos não afetados anteriormente",
          "surgimento de novas áreas anestésicas"
        ]
      },
      {
        name: "Lesões reacionais",
        criteria: [
          "reação de Mitsuda positiva",
          "o exame bacterioscópico pode ser positivo",
          "o exame histológico revela o granuloma tuberculóide com edema inter e intracelular",
          "o exame clínico mostra placas eritemato-violáceas edematosas, escamosas, elevadas, com contornos nítidos, de localização palmoplantar, periorificial da face e occipital, ou tomam as extremidades dos membros a maneira de bota ou luva. As lesões geralmente são polimorfas e os tubérculos e nódulos eritemato-violáceos são sugestivos do diagnóstico"
        ]
      }
    ]
  },
  {
    id: "hepatopatias_graves",
    name: "Hepatopatias Graves",
    definition: "um grupo de doenças que atingem o fígado, de forma crítico ou secundária, com evolução aguda ou crítica, ocasionando alteração estrutural extensa e intensa progressiva e grave deficiência funcional, além de incapacidade para atividades laborativas e risco de vida.",
    documents: [
      "Relatório médico completo com data do início do acompanhamento",
      "Resultados de exames para classificação de Child-Turgotte-Pugh",
      "Laudo histopatológico (se submetido a biópsia hepática)",
      "Quadro clínico da época do diagnóstico"
    ],
    diagnoses: [
      {
        name: "Quadro Clínico Geral",
        criteria: [
          "Alteração estrutural extensa e intensa progressiva do fígado",
          "Grave deficiência funcional, incapacidade para atividades laborativas e risco de vida"
        ]
      }
    ]
  },
  {
    id: "nefropatia_grave",
    name: "Nefropatia Grave",
    definition: "São consideradas nefropatias graves as patologias de evolução aguda, subaguda ou crônica que, de modo irreversível, acarretam insuficiência renal, determinando incapacidade permanente para o trabalho e/ou risco de morte prematura ou que rapidamente evoluírem para o óbito.",
    documents: [
      "Relatório médico com descrição da terapêutica e evolução",
      "Exames sequenciais de provas de função renal (ureia, creatinina)",
      "Cintilografias renais",
      "Ultrassonografias renais",
      "Exame que determinou o início da terapia dialítica",
      "Data do início da hemodiálise ou diálise peritoneal"
    ],
    diagnoses: [
      {
        name: "Estágio 3",
        criteria: [
          "fG= 30 - 59 ",
          "cr = 2,1 - 6,0 ",
          "i.R moderada ou Laboratorial",
          "sinais e/ou sintomas clínicos relevantes"
        ]
      },
      {
        name: "Estágio 4",
        criteria: [
          "fG= 15 - 29",
          "cr = 6,1 - 9,0",
          "i.R grave ou clínica"
        ]
      },
      {
        name: "Estágio 5",
        criteria: [
          "fG < 15 ",
          "cr > 9,0",
          "i.R. terminal ou pré-dialítica"
        ]
      }
    ]
  },
  {
    id: "neoplasia_maligna",
    name: "Neoplasia Maligna",
    definition: "As neoplasias malignas compreendem um grupo de doenças caracterizadas pelo desenvolvimento incontrolado de células anormais que se disseminam, podendo acometer outros órgãos, a partir de um sítio anatômico primitivo.",
    documents: [
      "Laudos histopatológicos ou anatomopatológicos originais ou autenticados (biópsia e peça cirúrgica)",
      "Relatório do médico assistente com estadiamento e terapia",
      "Laudo citológico (se aplicável)",
      "Exames de imagem (RX, TC, RM, colonoscopia, etc)",
      "Receitas e relação de medicações em uso",
      "Data de início e término de terapia adjuvante"
    ],
    diagnoses: [
      {
        name: "Quadro Clínico Geral",
        criteria: [
          "estar fundamentadas em laudo histopatológico",
          "citar o tipo histopatológico da neoplasia",
          "citar a sua localização",
          "citar a presença ou não de metástase",
          "citar o estadiamento clínico"
        ]
      }
    ]
  },
  {
    id: "paralisia_irreversivel",
    name: "Paralisia Irreversível e Incapacitante",
    definition: "Entende-se por paralisia a incapacidade de contração voluntária de um músculo ou grupo de músculos, resultante de uma lesão orgânica de natureza destrutiva ou degenerativa, a qual implica interrupção de uma das vias motoras, em qualquer ponto, desde o córtex cerebral até a própria fibra muscular, pela lesão do neurônio motor central ou periférico.",
    documents: [
      "Relatório médico completo com diagnóstico e data da manifestação",
      "Segmentos corporais acometidos",
      "Tratamento instituído e sequelas definitivas",
      "Exames de imagem (TC, RM, etc)"
    ],
    diagnoses: [
      {
        name: " Lesões osteo músculoarticulares ",
        criteria: [
          "alterações extensas e definitivas das funções nervosas, da mobilidade e da troficidade",
          "esgotados os recursos terapêuticos da medicina especializada e os prazos necessários a recuperação"
        ]
      },
      {
        name: "Ausências de membros, segmentos de membros ou de feixes musculares",
        criteria: [
          "resultantes de amputação ou ressecções cirúrgicas ",
          "resultem em distúrbios graves e extensos da mobilidade de um ou mais membros"
        ]
      },
      {
        name: "Lesões vasculares graves e crônicas",
        criteria: [
          "alterações extensas e definitivas das funções nervosas, da mobilidade e da troficidade",
          "esgotados os recursos terapêuticos da medicina especializada e os prazos necessários a recuperação"
        ]
      },
      {
        name: "Paresias",
        criteria: [
          "alterações extensas das funções nervosas e da motilidade ",
          "esgotados os recursos terapêuticos da medicina especializada e os prazos necessários a recuperação"
        ]
      }
    ]
  },
  {
    id: "penfigo",
    name: "Pênfigo",
    definition: "Dermatoses de caráter autoimune que formam bolhas na pele e mucosas.",
    documents: ["Relatórios e laudos médicos atualizados (Padrão Geral)"],
    diagnoses: [
      { name: "Pênfigo vulgar", criteria: ["Dermatose bolhosa crônica com volumosas bolhas intra-epidérmicas e manifestações graves"] },
      { name: "Pênfigo foliáceo", criteria: ["Endêmico, crônico com espoliação proteíca. Manchas eritematosas, bolhas flácidas com descamação e ardor"] },
      { name: "Pênfigo vegetante", criteria: ["Bolhas que se rompem e exsudam líquido fétido, formando vegetações papilomatosas. Alto índice de mortalidade se não tratado"] },
      { name: "Pênfigo eritematoso", criteria: ["Síndrome de Senear-Usher: lesões em face e tronco lembrando lúpus. Evolução benigna"] }
    ]
  },
  {
    id: "sida_aids",
    name: "SIDA/AIDS",
    definition: "A Síndrome da Imunodeficiência Adquirida (SIDA/Aids) é a manifestação mais grave da infecção pelo vírus da imunodeficiência humana (HIV), caracterizando-se por apresentar uma severa imunodeficiência, manifesta no aparecimento de doenças oportunistas.",
    documents: [
      "Relatório informando doenças oportunísticas e respectivas datas",
      "Exame inicial (ELISA)",
      "Exame confirmatório (Western-Blot)",
      "Exames de linfócitos CD4 e CD8",
      "Carga viral para HIV",
      "Informações sobre terapia antirretroviral e falhas esquemáticas"
    ],
    diagnoses: [
      {
        name: "Categoria A3",
        criteria: [
          "cD4 < 200",
          "infecção assintomática: indivíduos com sorologia positiva para o HIV, sem apresentar sintomas",
          "linfadenopatia generalizada persistente: linfadenomegalia, envolvendo duas ou mais regiões extra-inguinais, com duração de pelo menos 3 (três) meses, associada à sorologia positiva para o HIV; e",
          "infecção aguda: síndrome de mononucleose, caracterizada por febre, linfadenomegalia e esplenomegalia. A sorologia para o HIV é negativa, tornando-se positiva geralmente duas a três semanas após o início do quadro clínico"
        ]
      },
      {
        name: "Categoria B3",
        criteria: [
          "cD4 < 200",
          "angiomatose bacilar",
          "candidíase vulvovaginal persistente, de mais de um mês, que não responde ao tratamento específico",
          "candidíase orofaringeana",
          "sintomas constitucionais (febre maior que 38,5o C ou diarréia com mais de um mês de duraçãO"
        ]
      },
      {
        name: "Categoria C",
        criteria: [
          "candidíase esofágica, traqueal ou brônquica ",
          "criptococose extrapulmonar ",
          "câncer cervical uterino ",
          "rinite, esplenite ou hepatite por citomegalovírus ",
          "herpes simples mucocutâneo com mais de um mês de evolução ",
          "histoplasmose disseminada ",
          "isosporíase crônica ",
          "micobacteriose atípica ",
          "tuberculose pulmonar ou extrapulmonar ",
          "pneumonia por  P. carinii  ",
          "pneumonia recorrente com mais de dois episódios em um ano ",
          "bacteremia recorrente por \"salmonella\" ",
          "toxoplasmose cerebral ",
          "leucoencefalopatia multifocal progressiva ",
          "criptosporidiose intestinal crônica ",
          "sarcoma de Kaposi ",
          "linfoma de Burkit, imunoblástico ou primário de cérebro ",
          "encefalopatia pelo HIV ",
          "síndrome consumptiva pelo HIV "
        ]
      }
    ]
  },
  {
    id: "tuberculose_ativa",
    name: "Tuberculose Ativa",
    definition: "A tuberculose é uma doença infectocontagiosa causada pelo Mycobacterium tuberculosis, de evolução aguda ou crônica, de notificação compulsória. Pode acometer qualquer órgão, tendo, no entanto, nítida predileção pelo pulmão.",
    documents: [
      "Comprovação do diagnóstico por exames subsidiários (bacteriológico, imagem, etc)",
      "Declaração médica com medicações e período de tratamento",
      "Exames de função pulmonar (em caso de sequelas)",
      "Avaliação funcional do órgão (em tuberculose extrapulmonar)"
    ],
    diagnoses: [
      {
        name: "Quadro Clínico Geral",
        criteria: [
          "Comprovação do diagnóstico por exames subsidiários (bacteriológico, imagem, etc)",
          "Declaração médica com medicações e período de tratamento atestando a atividade da doença"
        ]
      }
    ]
  }
];

export const LAWS: Law[] = [
  {
    id: 'lei_6880',
    number: 'Lei nº 6.880/1980',
    title: 'Estatuto dos Militares',
    description: 'Define as situações de reforma por incapacidade definitiva e invalidez.',
    keyArticles: ['Art. 108 (Causalidade)', 'Art. 110 (Benefícios)']
  },
  {
    id: 'portaria_3551',
    number: 'Portaria GM-MD nº 3.551/2021',
    title: 'Normas Técnicas de Perícia',
    description: 'Padroniza os procedimentos das Juntas de Inspeção de Saúde das Forças Armadas.',
    keyArticles: ['Definição de doenças graves', 'Critérios de invalidez']
  },
  {
    id: 'lei_7713',
    number: 'Lei nº 7.713/1988',
    title: 'Isenção de Imposto de Renda',
    description: 'Regula a isenção de IR para portadores de moléstias graves.',
    keyArticles: ['Art. 6º, XIV (Rol de doenças)']
  }
];
