// Ficheiro: types.ts
export type NavItem = 'splash' | 'home' | 'guide' | 'laws' | 'dgpm406' | 'dgpm406-anexos' | 'concursos' | 'concursosJRS' | 'portaria' | 'exames' | 'infograficos' | 'pareceres' | 'templates' | 'casos' | 'videos' | 'roteiro' | 'pericia-menor' | 'mensagens' | 'usuarios' | 'perfil';

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