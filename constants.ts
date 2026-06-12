// Ficheiro: constants.ts
import { Disease, Law } from './types';

const RAW_DISEASES: Record<string, { definicao: string, documentos: string[], diagnosticos: Record<string, string[]> }> = {
  "Alienação Mental": {
    "definicao": "Todo caso de distúrbio mental ou neuromental grave e persistente, no qual, esgotados os meios habituais de tratamento, haja alteração completa ou considerável da personalidade, comprometendo gravemente os juízos de valor e realidade, destruindo a autodeterminação e do pragmatismo e tornando o indivíduo total e permanentemente inválido para qualquer trabalho.",
    "documentos": [
      "Laudo médico de especialista em neurologia, psiquiatria e/ou geriatria",
      "Diagnóstico atual e data do início do acompanhamento (dd/mm/aaaa)",
      "Exame clínico da primeira consulta",
      "Relato da evolução e tratamento da doença",
      "Exames de imagem originais ou autenticados (TC, RM) para demência",
      "CDR Score",
      "Certidão de Curatela (se o paciente for curatelado)"
    ],
    "diagnosticos": {
      "Geral": [
        "Seja enfermidade mental ou neuromental",
        "Seja grave e persistente",
        "Seja refratária aos meios habituais de tratamento",
        "Provoque alteração completa ou considerável da personalidade",
        "Comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
        "Torne o indivíduo total e permanentemente inválido para qualquer trabalho",
        "Haver um nexo sintomático entre o quadro psíquico e a personalidade do indivíduo"
      ],
      "Demência": [
        "Provoque alteração completa ou considerável da personalidade",
        "Comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
        "Torne o indivíduo total e permanentemente inválido para qualquer trabalho"
      ],
      "Esquizofrenia": [
        "Provoque alteração completa ou considerável da personalidade",
        "Comprometa gravemente os juízos de valor e realidade, com destruction da autodeterminação e do pragmatismo",
        "Torne o indivíduo total e permanentemente inválido para qualquer trabalho"
      ],
      "Transtorno delirante persistente": [
        "Provoque alteração completa ou considerável da personalidade",
        "Comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
        "Torne o indivíduo total e permanentemente inválido para qualquer trabalho"
      ],
      "Retardo mental profundo ou grave": [
        "Provoque alteração completa ou considerável da personalidade",
        "Comprometa gravemente os juízos de valor e realidade, com destruição da autodeterminação e do pragmatismo",
        "Torne o indivíduo total e permanentemente inválido para qualquer trabalho"
      ],
      "Transtorno de personalidade e do comportamento": [
        "Seja grave e persistente",
        "Seja refratária aos meios habituais de tratamento"
      ],
      "Retardo mental moderado": [
        "Atraso acentuado no desenvolvimento na infância",
        "Mínimo grau de independência quanto aos cuidados pessoais",
        "Mínimo grau de comunicação social e habilidade acadêmica"
      ],
      "Transtorno afetivo bipolar ou depressivo recorrente": [
        "Seja grave e persistente",
        "Seja refratária aos meios habituais de tratamento"
      ],
      "Transtornos devido ao uso de substância psicoativa": [
        "Presença de sintomas psicóticos",
        "Comprometimento grave e irreversível de personalidade"
      ],
      "Casos graves de epilepsia": [
        "Predominância de sintomas de demencia",
        "Resistência terapêutica ou elevada frequência de surtos psicóticos"
      ],
      "Autismo infantil e atípico": [
        "Próprio diagnóstico"
      ],
      "Síndrome de Rett": [
        "Próprio diagnóstico"
      ]
    }
  },
  "Cardiopatia Grave": {
    "definicao": "São consideradas cardiopatias graves, as doenças cardiovasculares agudas ou crónicas que acarretam, de modo irreversível, em maior ou menor período de tempo, a perda da capacidade física e funcional do coração, determinando incapacidade permanente para todo e qualquer trabalho ou o risco de morte prematura.",
    "documentos": [
      "Relatório médico com data do início do acompanhamento e terapêutica",
      "Eletrocardiograma (ECG)",
      "Holter",
      "Teste Ergométrico",
      "Ecocardiograma",
      "Ergoespirometria",
      "Teste de Caminhada",
      "Ecocardiograma com Estresse",
      "Radiografia de tórax (mínimo duas incidências)",
      "Cintilografia Miocárdica",
      "Cinecoronarioventriculografia",
      "Angiotomografia computadorizada",
      "Tomografia coronariana computadorizada",
      "Angio-ressonância magnética",
      "Ressonância magnética cardíaca",
      "Exames de função cardiológica pós-cirúrgicos (se aplicável)"
    ],
    "diagnosticos": {
      "Cardiopatia Isquêmica - Forma Aguda - SCA S/ SST": [
        "Baixo débito cardíaco",
        "Insuficiência cardíaca aguda",
        "Arritmia ventricular maligna",
        "Disfunção ventricular mecânica em paciente já revascularizado ou sem condi"
      ],
      "Cardiopatia Isquêmica - Forma Aguda - SCA C/ SST ou BRE novo": [
        "Choque cardiogênico (Killip IV)",
        "Insuficiência cardíaca aguda (Killip II ou III)",
        "Arritmia ventricular maligna",
        "Complicação mecânica do IAM",
        "IAM anterior extenso (V1-V6, D1, AVL)",
        "BAV II grau Mobitz II",
        "BAVT ou distúrbio de condução interventricular",
        "Infarto perioperatório de cirurgia de revasculariza",
        "Infarto agudo em indivíduo com infarto prévio de grande extens"
      ],
      "Cardiopatia Isquêmica - Forma Crônica (Angina Estável)": [
        "Angina classes III e IV da CCS",
        "Insuficiência cardíaca associada à isquemia aguda",
        "Arritmias ventriculares graves",
        "Zona elétrica inativa no ECG",
        "Alterações isquêmicas de ST-T permanentemente elevado",
        "Distúrbios da condução atrioventricular e intraventricular (QRS >120ms)",
        "Cardiomegalia com índice cardiotorácico superior a 0,5",
        "Limitação da capacidade funcional (<5 MET)",
        "Angina em carga baixa (<5 MET)",
        "Fração de Ejeção (FE) < 0,40",
        "Lesão de tronco de coronária esquerda ≥ 50%",
        "Lesões em três vasos ≥ 70%"
      ],
      "Cardiopatia Hipertensiva": [
        "Hipertrofia ventricular esquerda detectada por ECG ou Ecocardiograma",
        "Disfunção ventricular esquerda sistólica com fração de ejeção < 0,40",
        "Arritmias complexas",
        "Cardiopatia isquêmica grave associada",
        "Comprometimento de órgãos-alvo (Cérebro, Rins, Artérias, Retina)"
      ],
      "Miocardiopatias - Hipertróficas": [
        "Indivíduo sintomático (síncope, angina, etc)",
        "Diagnóstico na infância",
        "Hipertrofia moderada ou severa com alterações isquêmicas",
        "Cardiomegalia",
        "Disfunção ventricular esquerda com FE < 40%",
        "Fibrilação atrial ou arritmias",
        "Regurgitação mitral importante",
        "Forma obstrutiva com gradiente ≥ 50 mmHg"
      ],
      "Miocardiopatias - Dilatadas": [
        "História de fenômenos tromboembólicos sistêmicos",
        "Cardiomegalia importante",
        "Ritmo de galope (B3)",
        "Insuficiência cardíaca classes III e IV",
        "Fração de ejeção < 0,40",
        "Fibrilação atrial ou arritmias",
        "Distúrbios da condução intraventricular"
      ],
      "Miocardiopatias - Restritivas": [
        "História de fenômenos tromboembólicos",
        "Cardiomegalia acentuada",
        "Insuficiência cardíaca classes III e IV",
        "Envolvimento do ventrículo direito",
        "Fibrose miocárdica acentuada",
        "Regurgitação mitral e/ou tricúspide importante"
      ],
      "Miocardiopatias - Cardiopatia Chagásica Crônica": [
        "História de síncope e/ou tromboembolismo",
        "Cardiomegalia acentuada",
        "Insuficiência cardíaca classes III e IV",
        "Fibrilação atrial ou arritmias ventriculares",
        "Bloqueio bi ou trifascicular sintomático",
        "Bloqueio atrioventricular total"
      ],
      "Arritmias Cardíacas": [
        "Arritmias graves resistentes ao tratamento",
        "Episódios tromboembólicos",
        "Disfunção do nó sinusal sintomática",
        "BAV II grau Mobitz II ou BAVT sintomático",
        "Fibrilação atrial com baixa resposta",
        "Taquicardias ventriculares com comprometimento hemodinâmico",
        "Síndrome de preexcitação com alto risco de morte súbita",
        "Portadores de marcapasso definitivo COM CAPACIDADE FUNCIONAL LIMITADA"
      ],
      "Cor Pulmonale Crônico": [
        "Hipóxia cerebral e periférica (baqueteamento digital)",
        "Insuficiência cardíaca direita",
        "Angina de peito classe III a IV ou síncope",
        "Galope ventricular direito (B3)",
        "Gasometria com PO2 < 60 mmHg e PCO2 > 50 mmHg",
        "Pressão sistólica em artéria pulmonar ≥ 60 mmHg",
        "Insuficiência tricúspide importante"
      ],
      "Cardiopatias Congênitas": [
        "Crises hipoxêmicas ou hemoptises",
        "Insuficiência cardíaca classes III e IV",
        "Arritmias de difícil controle",
        "Anomalias anatômicas graves",
        "Sobrecargas ventriculares com hipocontratilidade"
      ],
      "Valvopatias": [
        "Insuficiência ou Estenose Mitral/Aórtica avançadas",
        "Fenômenos tromboembólicos ou insuficiência classe III/IV",
        "Alterações ecocardiográficas e hemodinâmicas severas"
      ],
      "Pericardiopatias e Aortopatias": [
        "Restrição de enchimento ventricular (Pericardite)",
        "Aneurisma de Aorta Torácica > 5,5cm ou compress",
        "Dissecção aguda e hematoma de aorta"
      ]
    }
  },
  "Cegueira": {
    "definicao": "A Cegueira ou amaurose é um estado patológico no qual a acuidade visual de um olho (monocular) ou de ambos os olhos é igual a zero, sem percepção luminosa, após esgotados os recursos de corre ptica.",
    "documentos": [
      "Laudo oftalmológico completo atual e da época do diagnóstico",
      "Acuidade visual da época do diagnóstico",
      "Evolução da doença e procedimentos cirúrgicos realizados",
      "Atestado de esgotamento de recursos terapêuticos (se aplicável)"
    ],
    "diagnosticos": {
      "Visão subnormal": [
        "20/70 x 20/200",
        "20/200 x 20/400"
      ],
      "Cegueira Total": [
        "20/400 x 20/1.200 ou 0,02 ou capacidade de contar dedos a 1 metro",
        "20/1.200 ou 0,02 ou capacidade de contar dedos a 1 metro x Percepção de luz",
        "Ausência de Percepção de luz"
      ]
    }
  },
  "Contaminação por Radiação": {
    "definicao": "Compreende o estado patológico, agudo ou crônico, decorrente da exposição do indivíduo a radiações ionizantes, de origem nuclear ou não, em níveis superiores aos limites estabelecidos em normas específicas, e que acarrete incapacidade definitiva.",
    "documentos": [
      "Atestado de Origem ou Inquérito Sanitário de Origem",
      "Laudos do serviço especializado com data do diagnóstico",
      "Exames subsidiários realizados",
      "Sequelas definitivas e segmentos corporais atingidos"
    ],
    "diagnosticos": {
      "Síndrome aguda da radiação": [
        "Quadro hematopoiético: alterações hematológicas provenientes de exposição (0,8 a 1,0 Gy)",
        "Quadro gastrointestinal: alterações da mucosa levando ndrome disabsortiva (> 7,0 Gy)",
        "Quadro neurovascular: manifestações que conduzem à morte (superiores a 20 Gy)"
      ],
      "Síndrome cutânea da radiação": [
        "Grau I ou Leve (8,0 a 10,0 Gy): pele seca e pigmenta",
        "Grau II ou Moderada (12,0 a 30,0 Gy): atrofia de pele e úlcera tardia",
        "Grau III ou Grave (30,0 a 50,0 Gy): cicatrizes, fibrose, alterações escleróticas e necrose",
        "Grau IV ou Muito Grave (acima de 50,0 Gy): deformidade e recidiva de úlceras"
      ]
    }
  },
  "Doença de Parkinson": {
    "definicao": "É uma afecção degenerativa do sistema nervoso central, de caráter progressivo, caracterizada por tremor de repouso, rigidez muscular, bradicinesia e instabilidade postural.",
    "documentos": [
      "Relatório médico de especialista em neurologia e/ou geriatria",
      "Diagnóstico e data de início do acompanhamento",
      "Exame clínico época e tratamento instituído",
      "Evolução e data de observação de maior gravidade"
    ],
    "diagnosticos": {
      "Geral": [
        "Tremor: hipercinesia, predominantemente postural",
        "Rigidez muscular: acompanhada do sinal da roda dentada",
        "Oligocinesia: diminuição da atividade motora espontânea e lentid"
      ]
    }
  },
  "Esclerose Múltipla (EM)": {
    "definicao": "É uma doença inflamatória crônica, desmielinizante, de provável etiologia autoimune, que acomete o sistema nervoso central, resultando em graus variáveis de incapacidade.",
    "documentos": [
      "Relatório ou atestado do médico assistente ou serviço de Neurologia",
      "Data do início do acompanhamento",
      "Grau de incapacidade pela escala EDSS no início e situação atual",
      "Exames complementares de suporte",
      "Relação de medicações em uso"
    ],
    "diagnosticos": {
      "Geral": [
        "Exame do líquido cefalorraquidiano anormal",
        "Ressonância magnética mostrando placas",
        "Potencial evocado alterado",
        "Curso progressivo com comprometimento motor ou distúrbios incapacitantes"
      ]
    }
  },
  "Espondilite Anquilosante": {
    "definicao": "Doença inflamatória de etiologia desconhecida, que afeta principalmente as articulações sacroilíacas, interapofisárias e a coluna vertebral.",
    "documentos": [
      "Laudo médico radiológico do comprometimento da coluna e bacia",
      "Tomografia computadorizada de articulações sacroilíacas",
      "Cintilografia óssea",
      "Teste sorológico específico HLA-B27"
    ],
    "diagnosticos": {
      "Geral": [
        "Comprovação radiológica de anquilose",
        "Cintilografia óssea compatível",
        "Teste sorológico específico HLA-B27",
        "Tomografia computadorizada indicando acometimento"
      ]
    }
  },
  "Estados Avançados de Doença de Paget": {
    "definicao": "A doença de Paget é uma afec ssea crônica, caracterizada por deforma sseas de evolução lenta e progressiva.",
    "documentos": [
      "Relatório médico completo informando a data do diagnóstico",
      "Resultados dos exames elucidatórios",
      "Descrição dos segmentos ósseos acometidos",
      "Descrição de complicações neurológicas, sensoriais ou cardiovasculares"
    ],
    "diagnosticos": {
      "Osteíte Deformante": [
        "Les sseas generalizadas, deformidades, fraturas espontâneas e degeneração maligna",
        "Complicações neurológicas e sensoriais: surdez, perturbações olfativas e neuralgias",
        "Complicações cardiovasculares: insuficiência cardíaca e hipertensão ligadas à patologia"
      ]
    }
  },
  "Fibrose Cística": {
    "definicao": "Informação especificada nas definições, mas enquadrada nas normativas legais aplicáveis.",
    "documentos": [
      "Relatórios e laudos médicos atualizados (Padrão Geral)"
    ],
    "diagnosticos": {
      "Geral": [
        "Teste do suor confirmado com concentração superior a 60 mEq/L",
        "Radiografia de campos pleuro-pulmonares",
        "Cultura do escarro positiva para Pseudomonas aeruginosa",
        "Ultrassonografia abdominal e dosagem de enzimas hepáticas e pancreáticas"
      ]
    }
  },
  "Hanseníase": {
    "definicao": "Doença infecto-contagiosa crônica causada pelo Mycobacterium leprae. O diagnóstico é essencialmente clínico e epidemiológico, identificando lesões com alteração de sensibilidade e comprometimento de nervos.",
    "documentos": [
      "Exame original confirmatório da doen",
      "Relatório do serviço de saúde com evolução e tempo de tratamento",
      "Descrição da data de início e término da poliquimioterapia",
      "Informação sobre atividade da doença, recidiva ou alta por cura",
      "Detalhamento de sequelas"
    ],
    "diagnosticos": {
      "Critérios clínicos de atividade da doença": [
        "Presença de eritema e/ou infiltração nas lesões",
        "Aparecimento de novas lesões ou aumento de preexistentes",
        "Espessamento e/ou parestesia de nervos previamente normais",
        "Paresia ou paralisia de músculos e surgimento de novas áreas anestésicas"
      ],
      "Lesões reacionais": [
        "Reação de Mitsuda positiva ou bacterioscópico positivo",
        "Exame histológico revela granuloma tuberculóide",
        "Clínica mostra placas eritemato-violáceas edematosas, escamosas e nódulos sugestivos"
      ]
    }
  },
  "Hepatopatia Grave": {
    "definicao": "Grupo de doenças que atingem o fígado com evolução aguda ou crítica, ocasionando alteração estrutural extensa, deficiência funcional grave e incapacidade para atividades laborativas.",
    "documentos": [
      "Relatório médico completo com data do início do acompanhamento",
      "Resultados de exames para classificação de Child-Turgotte-Pugh",
      "Laudo histopatológico (se submetido a biópsia)",
      "Quadro clínico da época do diagnóstico"
    ],
    "diagnosticos": {
      "Geral": [
        "Emagrecimento, icterícia, ascite, edemas e fenômenos hemorrágicos",
        "Alterações cutaneomucosas e neuropsiquiátricas"
      ],
      "Encefalopatia Hepática": [
        "Estágio 3: Confusão, desorientação, amnésia, nistagmo e rigidez",
        "Estágio 4: Coma, midríase, postura de descerebração e arreflexia"
      ],
      "Hepatocarcinoma": [
        "Níveis de alfa-fetoproteína > 400 ng/ml com alterações típicas em imagens"
      ],
      "Child-Pugh": [
        "B: considerada grave se houver ascite e/ou encefalopatia recidivante",
        "C: enquadramento obrigatório como grave (pontuação 10 a 15)"
      ]
    }
  },
  "Nefropatia Grave": {
    "definicao": "Patologias de evolução aguda, subaguda ou crônica que acarretam insuficiência renal de modo irreversível, determinando incapacidade permanente.",
    "documentos": [
      "Relatório médico com descrição da terapêutica",
      "Exames sequenciais de provas de função renal (ureia, creatinina)",
      "Cintilografias e Ultrassonografias renais",
      "Exame que determinou o início da terapia dialítica e data de início"
    ],
    "diagnosticos": {
      "Estágio 3": [
        "FG = 30 - 59",
        "Cr = 2,1 - 6,0",
        "Insuficiência Renal moderada ou Laboratorial com sintomas clínicos"
      ],
      "Estágio 4": [
        "FG = 15 - 29",
        "Cr = 6,1 - 9,0",
        "Insuficiência Renal grave ou clínica"
      ],
      "Estágio 5": [
        "FG < 15",
        "Cr > 9,0",
        "Insuficiência Renal terminal ou pré-dialítica"
      ]
    }
  },
  "Neoplasia Maligna": {
    "definicao": "Grupo de doenças caracterizadas pelo desenvolvimento incontrolado de células anormais que se disseminam a partir de um sítio anatômico primitivo.",
    "documentos": [
      "Laudos histopatológicos originais",
      "Relatório do médico com estadiamento e terapia",
      "Laudo citológico e Exames de imagem (RX, TC, RM)",
      "Relação de medicações e datas de terapias adjuvantes"
    ],
    "diagnosticos": {
      "Geral": [
        "Fundamentação em laudo histopatológico",
        "Citação do tipo histopatológico e localização",
        "Citação da presença ou não de metástase",
        "Citação do estadiamento clínico"
      ]
    }
  },
  "Paralisia Irreversível e Incapacitante": {
    "definicao": "Incapacidade de contração voluntária de um músculo ou grupo de músculos, resultante de uma lesão orgânica destrutiva ou degenerativa nas vias motoras.",
    "documentos": [
      "Relatório médico completo com diagnóstico e data da manifesta",
      "Segmentos corporais acometidos",
      "Tratamento instituído e sequelas definitivas",
      "Exames de imagem"
    ],
    "diagnosticos": {
      "Geral": [
        "Lesões crônicas com alterações extensas e definitivas, esgotados recursos terapêuticos",
        "Paresias resultantes em alterações extensas",
        "Ausências de membros decorrentes de amputações que causem distúrbios graves"
      ]
    }
  },
  "Pênfigo": {
    "definicao": "Dermatoses de caráter autoimune que formam bolhas na pele e mucosas (não possui definição detalhada no anexo principal).",
    "documentos": [
      "Relatórios e laudos médicos atualizados (Padrão Geral)"
    ],
    "diagnosticos": {
      "Pênfigo vulgar": [
        "Dermatose bolhosa crônica com volumosas bolhas intra-epidérmicas e manifestações graves"
      ],
      "Pênfigo foliáceo": [
        "Endêmico, crônico com espoliação proteica. Manchas eritematosas, bolhas flácidas com descamação e ardor"
      ],
      "Pênfigo vegetante": [
        "Bolhas que se rompem e exsudam líquido fétido, formando vegetações papilomatosas. Alto índice de mortalidade se não tratado"
      ],
      "Pênfigo eritematoso": [
        "Síndrome de Senear-Usher: lesões em face e tronco lembrando lúpus. Evolução benigna"
      ]
    }
  },
  "SIDA/AIDS": {
    "definicao": "Manifestação mais grave da infecção pelo HIV, caracterizando-se por severa imunodeficiência e aparecimento de doenças oportunistas.",
    "documentos": [
      "Relatório informando doenças oportunísticas",
      "Exame inicial (ELISA) e confirmatório (Western-Blot)",
      "Exames de CD4, CD8 e Carga viral",
      "Informações sobre terapia antirretroviral"
    ],
    "diagnosticos": {
      "Categoria A3": [
        "CD4 < 200",
        "Infecção assintomática, infecção aguda ou Linfadenopatia generalizada persistente"
      ],
      "Categoria B3": [
        "CD4 < 200",
        "Angiomatose bacilar, candidíase vulvovaginal persistente ou orofaringeana",
        "Sintomas constitucionais (febre persistente ou diarreia crônica)"
      ],
      "Categoria C": [
        "Candidíase esofágica, brônquica ou pulmonar; Criptococose; Câncer cervical; Infecções por Citomegalovírus",
        "Herpes, Histoplasmose, Micobacteriose, Tuberculose, Pneumonias, Toxoplasmose cerebral, Sarcoma de Kaposi e Linfomas"
      ]
    }
  },
  "Tuberculose Ativa": {
    "definicao": "Doença infectocontagiosa causada pelo Mycobacterium tuberculosis, de evolução aguda ou crônica. Pode acometer qualquer órgão com predileção pelo pulmão.",
    "documentos": [
      "Comprovação do diagnóstico por exames subsidiários (bacteriológico, imagem)",
      "Declaração médica com medicações e período de tratamento",
      "Exames de função pulmonar ou avaliação funcional do órgão atingido"
    ],
    "diagnosticos": {
      "Geral": [
        "Diagnóstico clínico, laboratorial ou por imagem atestando a atividade da doen"
      ]
    }
  }
};

export const DISEASES: Disease[] = Object.keys(RAW_DISEASES).map(key => {
  const data = RAW_DISEASES[key];
  return {
    id: key.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    name: key,
    definition: data.definicao,
    documents: data.documentos,
    diagnoses: Object.keys(data.diagnosticos || {}).map(diagKey => ({
      name: diagKey,
      criteria: data.diagnosticos[diagKey]
    }))
  };
});

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