// Ficheiro: types.ts
export type NavItem = 'splash' | 'guide' | 'laws' | 'videos' | 'dgpm406' | 'dgpm406-anexos' | 'concursos' | 'portaria' | 'finalidades' | 'exames' | 'aulas' | 'infograficos' | 'resumos' | 'pareceres' | 'templates' | 'artigos' | 'artigo-pericia' | 'artigo-perfil' | 'artigo-administrativa' | 'artigo-psiquiatria' | 'casos';

export interface Diagnosis {
  name: string;
  criteria: string[];
}

export interface Disease {
  id: string;
  name: string;
  definition: string;
  documents: string[];
  diagnoses: Diagnosis[];
}

export interface Law {
  id: string;
  number: string;
  title: string;
  description: string;
  keyArticles: string[];
}