import React, { useState } from 'react';
import { Header } from './Header';
import { ChevronDown, CheckCircle2, User, Calendar, FileText } from 'lucide-react';

interface ExameCondicao {
  Exame: string;
  Condicao_Genero: 'Masculino' | 'Feminino' | null;
  Condicao_Idade_Minima: string | null;
}

interface InspecaoItem {
  ID_Inspecao: string | null;
  Finalidade_Inspecao: string;
  Exames: ExameCondicao[];
}

// EXAMES_DATA: exames mínimos por finalidade de IS, conforme o Anexo O
// da DGPM-406 (9ª Revisão). Cada entrada: { ID_Inspecao, Finalidade_Inspecao, Exames[] }.
// Exames filtram por Condicao_Genero (Masculino|Feminino|null) e Condicao_Idade_Minima (idade mínima|null).
const EXAMES_DATA: InspecaoItem[] = [
  {
    "Finalidade_Inspecao": "Controle anual de praça de máquinas",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Seleção por amostragem. Validade de 60 dias a partir da data da coleta."
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal. \nSe positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo."
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Controle semestral Raios-X",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal.\nDeverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização. "
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade anual"
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": "Periodicidade anual"
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade anual"
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade anual"
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Seleção por amostragem. Validade de 60 dias a partir da data da coleta."
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": "Periodicidade anual"
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal.\nSe positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Controle trienal",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Seleção por amostragem. Validade de 60 dias a partir da data da coleta."
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Manipulação e admin Terapia Antineoplásica",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal.\nDeverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade anual"
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": "Periodicidade anual"
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Beta-HCG qualitativo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 90 dias a partir da data da coleta."
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade anual"
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Seleção por amostragem. Validade de 60 dias a partir da data da coleta."
      },
      {
        "Exame": "Função Hepática",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Transaminases , Bilirrubinas Totais e frações, Albumina, Fosfatase Alcalina, Gama-GT e Atividade da protrombina"
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Ureia",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal.\nSe positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal.\nSe positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Prorrogação do Tempo de Serviço",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Seleção por amostragem. Validade de 60 dias a partir da data da coleta."
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Reengajamento",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 60 dias a partir da data da coleta."
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Serviço com explosivos",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia Especial",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "fundoscopia e biomicroscopia"
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Função Hepática",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Transaminases , Bilirrubinas Totais e frações, Albumina, Fosfatase Alcalina, Gama-GT e Atividade da protrombina"
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal.\nSe positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": " com D2 longo"
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Serviço com OTTO FUELL II",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia Especial",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "avaliação da Pressão Intra Ocular – PIO"
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal"
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Seleção por amostragem. Validade de 60 dias a partir da data da coleta."
      },
      {
        "Exame": "Função Hepática",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Transaminases , Bilirrubinas Totais e frações, Albumina, Fosfatase Alcalina, Gama-GT e Atividade da protrombina"
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Periodicidade trienal.\nSe positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": " com D2 longo"
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Tarefa por Tempo Certo e prorrogações",
    "Grupo_Finalidade_Inspecao": "Controle Periódico",
    "Exames": [
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Seleção por amostragem. Validade de 60 dias a partir da data da coleta."
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Engajamento e Ingresso no SMV \n(oriundos do SMI)",
    "Grupo_Finalidade_Inspecao": "Ingresso",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "🚫 Teste Rápido"
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Ingresso no SPG",
    "Grupo_Finalidade_Inspecao": "Ingresso",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Ultrassonografia de mamas",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Ultrassonografia transvaginal ou pélvica",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Beta-HCG qualitativo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 90 dias a partir da data da coleta."
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Ingresso SAM / SMV\n(oriundos do meio civil)",
    "Grupo_Finalidade_Inspecao": "Ingresso",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Ultrassonografia de mamas",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Ultrassonografia transvaginal ou pélvica",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "🚫 Teste Rápido"
      },
      {
        "Exame": "Beta-HCG qualitativo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser colhido em, no máximo, sete dias corridos antes da data inicial do prazo de Inspeção de Saúde estabelecido no Cronograma de Eventos do Concurso/Processo Seletivo;"
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Nasofibroscopia",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Para os candidados a SG-MU, naipe cantor tenor e cantora soprano"
      },
      {
        "Exame": "Teste ergométrico",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Para todos os candidatos ao ingresso no SMV que exercerão atividades na área de treinamento físico-militar (atletas RM2) e para os demais candidatos quando apresentarem queixas relacionadas ao aparelho cardiovascular. Exame com validade de 1 ano."
      },
      {
        "Exame": "Videolaringoestroboscopia",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Para os candidados a SG-MU, naipe cantor tenor e cantora soprano. Validade de 1 ano."
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Deixar o SAM, SMV, SMI ou SPG",
    "Grupo_Finalidade_Inspecao": "Licenciamento",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": " Exceto para o Serviço Público Geral - SPG"
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Para as militares/servidoras civis que estão deixando o Serviço Ativo/Serviço Público e que não serão incluídas na Reserva Remunerada da Marinha ou quadro de servidoras civis inativas"
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "ou sorologia para sífilis.\nSe VDRL positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Incapacidade definitiva para o SAM/SPG",
    "Grupo_Finalidade_Inspecao": "Licenciamento",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": " Exceto para o Serviço Público Geral - SPG"
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": "Para as militares/servidoras civis que estão deixando o Serviço Ativo/Serviço Público e que não serão incluídas na Reserva Remunerada da Marinha ou quadro de servidoras civis inativas"
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "ou sorologia para sífilis.\nSe VDRL positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Localidade com deficiência em assistência sanitária (LDAS)",
    "Grupo_Finalidade_Inspecao": "Missões",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia Especial",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "tonometria, fundoscopia e biomicroscopia"
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Radiografia panorâmica das arcadas dentárias",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Ecocardiograma bidimensional com Doppler",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 45,
        "Observacoes": "ou quando houver indicação clínica. Validade de 1 ano."
      },
      {
        "Exame": "Ecocardiograma bidimensional com Doppler",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 45,
        "Observacoes": "ou quando houver indicação clínica. Validade de 1 ano"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Com D2 longo"
      },
      {
        "Exame": "Teste ergométrico",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 45,
        "Observacoes": "ou quando houver indicação clínica. Validade de 1 ano"
      },
      {
        "Exame": "Teste ergométrico",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 45,
        "Observacoes": "ou quando houver indicação clínica. Validade de 1 ano"
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Missão Antártica",
    "Grupo_Finalidade_Inspecao": "Missões",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia Especial",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "(tonometria, fundoscopia e biomicroscopia"
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "PA e perfil. Validade de 1 ano."
      },
      {
        "Exame": "Radiografia panorâmica das arcadas dentárias",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Ácido úrico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hepatograma",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Parasitológico das fezes",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Provas de atividade reumática",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Ureia",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Ecocardiograma bidimensional com Doppler",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 40,
        "Observacoes": "ou quando houver indicação clínica. Validade de 1 ano."
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Com D2 longo"
      },
      {
        "Exame": "Eletroencefalograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Teste ergométrico",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 40,
        "Observacoes": "ou quando houver indicação clínica"
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Missão no exterior (< 3m c/ trienal OK)",
    "Grupo_Finalidade_Inspecao": "Missões",
    "Exames": [
      {
        "Exame": "Radiografia panorâmica das arcadas dentárias",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Missão no exterior (> 3m)",
    "Grupo_Finalidade_Inspecao": "Missões",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Radiografia panorâmica das arcadas dentárias",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Transaminases",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Designação de militares RM1",
    "Grupo_Finalidade_Inspecao": "Outros",
    "Exames": [
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "IS para conclusão de Curso de Formação",
    "Grupo_Finalidade_Inspecao": "Outros",
    "Exames": [
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Observar o disposto no capítulo 17 da DGPM-406"
      }
    ]
  },
  {
    "Finalidade_Inspecao": "IS inopinada de avaliação toxicológica preventiva direcionada",
    "Grupo_Finalidade_Inspecao": "Outros",
    "Exames": [
      {
        "Exame": "Exame toxicológico",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Observar o disposto no capítulo 17 da DGPM-407"
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Reversão ou Reintegração ao SPG",
    "Grupo_Finalidade_Inspecao": "Outros",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  },
  {
    "Finalidade_Inspecao": "Seleção para Cursos de carreira (🚫 AE)",
    "Grupo_Finalidade_Inspecao": "Outros",
    "Exames": [
      {
        "Exame": "Audiometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Deverá ser precedidos de repouso auditivo de cerca de 14h, não devendo haver uso de fones de ouvido ou exposição a ambientes com níveis elevados de ruído no dia anterior à realização."
      },
      {
        "Exame": "Biometria",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Exame odontológico geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Oftalmologia geral",
        "Grupo_Exame": "Avaliações",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Mamografia",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Radiografia de tórax",
        "Grupo_Exame": "Exames de imagem",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Validade de 1 ano"
      },
      {
        "Exame": "Anti-HIV",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Colesterol total e frações",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "Colpocitologia oncótica",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Creatinina",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "EAS",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Glicemia de jejum",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Hemograma completo",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "PSA total",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Masculino",
        "Condicao_Idade_Minima": 40,
        "Observacoes": null
      },
      {
        "Exame": "Teste Imunológico de Gravidez (TIG)",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": "Feminino",
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      },
      {
        "Exame": "Triglicerídeos",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": 30,
        "Observacoes": null
      },
      {
        "Exame": "VDRL",
        "Grupo_Exame": "Exames laboratoriais",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": "Se positivo, o FTA-ABS (IgG e IgM) deverá ser solicitado para o diagnóstico definitivo"
      },
      {
        "Exame": "Eletrocardiograma",
        "Grupo_Exame": "Outros exames",
        "Condicao_Genero": null,
        "Condicao_Idade_Minima": null,
        "Observacoes": null
      }
    ]
  }
];

interface ExamesGuideProps {
  onBack?: () => void;
}

export const ExamesGuide: React.FC<ExamesGuideProps> = ({ onBack }) => {
  const [genero, setGenero] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [idade, setIdade] = useState<string>('30');
  const [selectedFinalidade, setSelectedFinalidade] = useState<string>('Ingresso SAM');

  const uniqueFinalidades = Array.from(new Set(EXAMES_DATA.map(item => item.Finalidade_Inspecao))).sort((a, b) => a.localeCompare(b));

  const activeInspecao = EXAMES_DATA.find(item => item.Finalidade_Inspecao === selectedFinalidade);

  const parsedIdade = parseInt(idade, 10) || 0;

  const filteredExames = activeInspecao
    ? activeInspecao.Exames.filter(ex => {
        if (ex.Condicao_Genero !== null && ex.Condicao_Genero !== genero) {
          return false;
        }
        if (ex.Condicao_Idade_Minima !== null) {
          const minAge = parseInt(ex.Condicao_Idade_Minima, 10);
          if (parsedIdade < minAge) {
            return false;
          }
        }
        return true;
      })
    : [];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Exames Mínimos" onBack={onBack} />
      
      <div className="p-4 space-y-4 animate-fade-in overflow-auto pb-24 h-full">
        <div className="text-center mb-1">
          <h2 className="text-xl font-bold text-navy font-heading leading-tight uppercase">EXAMES MÍNIMOS</h2>
          <p className="text-sm text-gray-600 font-body mt-2 leading-snug">
            Exames mínimos por finalidade de IS observando o sexo e a idade de acordo com o Anexo O da DGPM-406.
          </p>
        </div>

        <div id="exames-config-card" className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col space-y-4">
          
          <div className="flex flex-col space-y-2">
            <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1">
              <User size={14} className="text-gold" /> Sexo Biológico:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="gender-btn-masculino"
                type="button"
                className={`py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1 focus:outline-none ${
                  genero === 'Masculino'
                    ? 'bg-navy text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setGenero('Masculino')}
              >
                Masculino
              </button>
              <button
                id="gender-btn-feminino"
                type="button"
                className={`py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1 focus:outline-none ${
                  genero === 'Feminino'
                    ? 'bg-navy text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setGenero('Feminino')}
              >
                Feminino
              </button>
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label htmlFor="age-input" className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1">
              <Calendar size={14} className="text-gold" /> Idade (Anos):
            </label>
            <div className="relative">
              <input
                id="age-input"
                type="number"
                min="0"
                max="120"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                placeholder="Digite a idade..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy font-body shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label htmlFor="finalidade-select" className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1">
              <FileText size={14} className="text-gold" /> Finalidade da Inspeção:
            </label>
            <div className="relative">
              <select
                id="finalidade-select"
                value={selectedFinalidade}
                onChange={(e) => setSelectedFinalidade(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold rounded-lg p-3 pr-10 focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy appearance-none cursor-pointer transition-all font-body shadow-inner"
              >
                {uniqueFinalidades.map((key) => (
                  <option key={key} value={key} className="text-gray-800 font-medium font-body bg-white py-1">
                    {key}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-navy">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

        </div>

        <div id="exams-card" className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
            <h3 className="font-heading font-bold text-navy text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-gold" style={{ fontSize: '22px' }}>
                medical_information
              </span>
              Relação de Exames Mínimos
            </h3>
            <span className="text-xs bg-navy/5 text-navy px-2.5 py-1 rounded-full font-bold font-mono">
              {filteredExames.length} exames
            </span>
          </div>

          {filteredExames.length > 0 ? (
            <div className="flex flex-col divide-y divide-gray-100 px-1" id="exams-display-list">
              {filteredExames.map((ex, index) => (
                <div
                  key={index}
                  id={`exam-item-${index}`}
                  className="flex items-center justify-between gap-3 py-2 hover:bg-gray-50 transition-all animate-fade-in"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 size={16} className="text-gold flex-shrink-0" />
                    <span className="text-sm font-semibold text-navy font-body truncate">{ex.Exame}</span>
                  </div>
                  {(ex.Condicao_Genero || ex.Condicao_Idade_Minima) && (
                    <span className="text-[10px] text-navy bg-navy/5 font-bold px-2 py-0.5 rounded flex-shrink-0">
                      {ex.Condicao_Genero ? `${ex.Condicao_Genero}` : ''}
                      {ex.Condicao_Genero && ex.Condicao_Idade_Minima ? ' • ' : ''}
                      {ex.Condicao_Idade_Minima ? `≥ ${ex.Condicao_Idade_Minima} anos` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 font-body text-sm font-medium" id="no-exams-placeholder">
              Nenhum exame mínimo correspondente aos filtros estabelecidos.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
