// Ficheiro: types.ts
export type NavItem = 'splash' | 'home' | 'guide' | 'laws' | 'dgpm406' | 'dgpm406-anexos' | 'concursos' | 'concursosJRS' | 'portaria' | 'exames' | 'infograficos' | 'apresentacoes' | 'pareceres' | 'inspecoes' | 'casos' | 'videos' | 'roteiro' | 'pericia-menor' | 'mensagens' | 'usuarios' | 'militares' | 'perfil';

export interface Diagnosis {
  name: string;
  criteria: string[];
  /** Índices de `criteria` exibidos em negrito (enquadramentos positivos). */
  highlight?: number[];
}

export interface Disease {
  id: string;
  name: string;
  definition: string;
  documents: string[];
  diagnoses: Diagnosis[];
  /** Cards extras exibidos após a Definição (quadro clínico, laboratorial, imagem…). */
  sections?: { title: string; items: string[] }[];
}

export interface Law {
  id: string;
  number: string;
  title: string;
  description: string;
  keyArticles: string[];
}