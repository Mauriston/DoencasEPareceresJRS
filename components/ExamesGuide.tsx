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

// EXAMES_DATA: 22+ inspection types per Anexo O da DGPM-406
// Each entry: { ID_Inspecao, Finalidade_Inspecao, Exames[] }
// Exames filter by Condicao_Genero (Masculino|Feminino|null) and Condicao_Idade_Minima (string age|null)
const EXAMES_DATA: InspecaoItem[] = [
  {
    "ID_Inspecao": "1",
    "Finalidade_Inspecao": "Engajamento",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ácido úrico", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Anti-HCV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG Pélvica ou Transvaginal", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de mamas", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de próstata", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" }
    ]
  },
  {
    "ID_Inspecao": "2",
    "Finalidade_Inspecao": "Ingresso SAM",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "Beta-HCG", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "3",
    "Finalidade_Inspecao": "Ingresso no SPG",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "4",
    "Finalidade_Inspecao": "IS para conclusão de Curso de Formação",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "5",
    "Finalidade_Inspecao": "Controle trienal",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG Pélvica ou Transvaginal", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de mamas", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de próstata", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" }
    ]
  },
  {
    "ID_Inspecao": "6",
    "Finalidade_Inspecao": "Seleção para Cursos de carreira",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "7",
    "Finalidade_Inspecao": "Controle semestral Raios-X",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "8",
    "Finalidade_Inspecao": "Manipulação e admin Terapia Antineoplásica",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Plaquetas", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "9",
    "Finalidade_Inspecao": "Serviço com OTTO FUELL II",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Pesquisa de chumbo no sangue", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "10",
    "Finalidade_Inspecao": "Serviço com explosivos",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EEG (Eletroencefalograma)", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "11",
    "Finalidade_Inspecao": "Missão no exterior (> 3m)",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Anti-HCV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG Pélvica ou Transvaginal", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de próstata", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" }
    ]
  },
  {
    "ID_Inspecao": "12",
    "Finalidade_Inspecao": "Missão no exterior (< 3m c/ trienal OK)",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "13",
    "Finalidade_Inspecao": "Deixar o SMV / SMI",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "14",
    "Finalidade_Inspecao": "Controle anual de praça de máquinas",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EEG (Eletroencefalograma)", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "15",
    "Finalidade_Inspecao": "LDAS",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Anti-HCV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG Pélvica ou Transvaginal", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de mamas", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de próstata", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" }
    ]
  },
  {
    "ID_Inspecao": "16",
    "Finalidade_Inspecao": "Missão Antártica",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Anti-HCV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Espirometria", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ergometria", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Odontológico", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "17",
    "Finalidade_Inspecao": "Reversão ou Reintegração ao SPG",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "18",
    "Finalidade_Inspecao": "Tarefa por Tempo Certo",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "19",
    "Finalidade_Inspecao": "Designação de militares RM1",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "20",
    "Finalidade_Inspecao": "Reengajamento",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG Pélvica ou Transvaginal", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de mamas", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de próstata", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" }
    ]
  },
  {
    "ID_Inspecao": "21",
    "Finalidade_Inspecao": "Ingresso no SMV (candidatos civis)",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "Beta-HCG", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": "22",
    "Finalidade_Inspecao": "Deixar o SAM ou SPG / INCDEF",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Anti-HCV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG Pélvica ou Transvaginal", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de mamas", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de próstata", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" }
    ]
  },
  {
    "ID_Inspecao": null,
    "Finalidade_Inspecao": "Ingresso no SMV (oriundos do SMI)",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "Beta-HCG", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null }
    ]
  },
  {
    "ID_Inspecao": null,
    "Finalidade_Inspecao": "Prorrogação do Tempo de Serviço",
    "Exames": [
      { "Exame": "Hemograma completo", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Glicemia de jejum", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Ureia e Creatinina", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "TGO/AST e TGP/ALT", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Colesterol total e frações", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Triglicerídeos", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "EAS/Urinálise", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Sorologia para HIV", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "HBsAg", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "VDRL", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Raios-X de tórax PA", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "ECG de repouso", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Audiometria tonal", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "Acuidade visual", "Condicao_Genero": null, "Condicao_Idade_Minima": null },
      { "Exame": "PSA total", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Mamografia", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": "40" },
      { "Exame": "Colpocitologia oncótica (Papanicolau)", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG Pélvica ou Transvaginal", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de mamas", "Condicao_Genero": "Feminino", "Condicao_Idade_Minima": null },
      { "Exame": "USG de próstata", "Condicao_Genero": "Masculino", "Condicao_Idade_Minima": "40" }
    ]
  }
];

export const ExamesGuide: React.FC = () => {
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
      <Header title="Exames Mínimos" />
      
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
