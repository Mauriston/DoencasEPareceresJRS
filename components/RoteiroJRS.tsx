// Ficheiro: components/RoteiroJRS.tsx
import React, { useState } from 'react';
import { Header } from './Header';
import { 
  MonitorPlay, FileText, Image as ImageIcon, PlayCircle, 
  GraduationCap, BookOpen, Book, Gavel, Scale, ChevronDown, X 
} from 'lucide-react';

const ROTEIRO_DATA = {
  "curso": "ROTEIRO JRS",
  "modulos": [
    {
      "modulo_id": 1,
      "modulo": "A JRS/HNRe",
      "materiais": [
        { "formato": "Apresentação", "titulo": "Apresentação JRS VD 2025", "descricao": "Apresentação do setor ao Vice-Diretor empossado DEZ2025", "url": "<iframe src=\"https://www.canva.com/design/DAG7oG7M1_E/n7oCvyKXsf3T3vWB2v7hiA/view?embed\"></iframe>" },
        { "formato": "Ordem Interna", "titulo": "OI JRS/HNRe 2026", "descricao": "Minuta da Atualização da OI da JRS/HNRe completamente reformulada para atender a DGPM-406 9ª Rev", "url": "https://drive.google.com/file/d/1-G8Wh1nDhqyLeXzTkWFaZbnMtBU8_EAR/view?usp=sharing" },
        { "formato": "Apresentação", "titulo": "Rotinas SEC/JRS", "descricao": "Apresentação feita aos praças da SEC/JRS no momento que foram apresentados para servir no setor.", "url": "<iframe src=\"https://www.canva.com/design/DAG3TxsqQqk/-BCZzcHZ5nZb_7K_BNgJ7g/view?embed\"></iframe>" },
        { "formato": "Infográfico", "titulo": "Guia Administrativo SEC/JRS", "descricao": "Guia prático que visa padronizar o fluxo administrativo das Inspeções de Saúde na Secretaria JRS/HNRe", "url": "https://i.imgur.com/ikM4xEx.jpeg" },
        { "formato": "Infográfico", "titulo": "Guia Atribuições SEC/JRS", "descricao": "Guia prático que visa definir as atribuições e responsabilidades de cada cargo na equipe da Secretaria JRS/HNRe.", "url": "https://i.imgur.com/UKl4JRv.jpeg" },
        { "formato": "Vídeo", "titulo": "Funcionamento SEC/JRS", "descricao": "Neste vídeo, detalhamos os processos administrativos por trás de cada Inspeção de Saúde.", "url": "<iframe src=\"https://www.youtube.com/embed/V-4x_EHvGSk?si=smdnIQ93YJR8E-ki\"></iframe>" }
      ]
    },
    {
      "modulo_id": 2,
      "modulo": "INTRODUÇÃO PERÍCIAS MÉDICAS",
      "materiais": [
        { "formato": "Aula", "titulo": "Perícia, Peritos e Procedimentos Médico-Legais", "descricao": "Aula da CF (Md) Patrícia Sorrentino, Presidente de JRS1/CPMM, no C-EXP-PERMED 2026", "url": "https://drive.google.com/file/d/1GFiIVInWwHAN_O13USqmfLtYKTHS-2in/view?usp=sharing" },
        { "formato": "Artigo", "titulo": "Direito e Perícia Médica", "descricao": "TCC de aluno de graduação da UFAL. Simples, mas que conceitua bem os tipos / aplicações das perícias médicas.", "url": "https://drive.google.com/file/d/19midfQ9Brh9r5dpd1LOoA6g735C_qo3U/view?usp=sharing" },
        { "formato": "Capítulo de Livro", "titulo": "Medicina Legal e Perícia Médica - Conceitos, Histórico e Competências.", "descricao": "Capítulo de abertura do livro \"Medicina Legal e Perícia Médica\" do Prof. Daniel Muñoz da FCMUSP.", "url": "https://drive.google.com/file/d/1hH9O_TTpROg5QVhIMemxZcPHR5KD4UIz/view?usp=sharing" },
        { "formato": "Capítulo de Livro", "titulo": "Perícia Médica", "descricao": "Capítulo do Livro de Perícias Médicas do CREMEGO", "url": "https://drive.google.com/file/d/11fPnkfGWcVt-nBQGc_ZnIHsW03mLTB9V/view?usp=sharing" },
        { "formato": "Capítulo de Livro", "titulo": "Direitos e Deveres do Médico Perito - Aspectos Éticos", "descricao": "Capítulo 3 do livro \"Medicina Legal e Perícia Médica\" do Prof. Daniel Muñoz da FCMUSP.", "url": "https://drive.google.com/file/d/15p8m5zJdr0TLYs8cBrhFkwLzo6iJlJGf/view?usp=sharing" },
        { "formato": "Capítulo de Livro", "titulo": "O Perfil do Médico Perito", "descricao": "Capítulo do Livro de Perícias Médicas do CREMEGO", "url": "https://drive.google.com/file/d/1scZFeUN9jbAc4c4K4iXwOChurEpIdhzt/view?usp=sharing" },
        { "formato": "Norma", "titulo": "RES CFM 2.430/2025", "descricao": "Dispõe sobre o ato médico pericial, a produção da prova técnica médica, estabelece critérios mínimos de segurança na construção da prova pericial", "url": "https://drive.google.com/file/d/1Kr8kPQEzDHZPkWiJwtePht-X-7eNsfDu/view?usp=sharing" }
      ]
    },
    {
      "modulo_id": 3,
      "modulo": "SUBSISTEMA MÉDICO-PERICIAL",
      "materiais": [
        { "formato": "Norma", "titulo": "Diagrama da Estrutura básica do SMP", "descricao": "Anexo A - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1m2KpS4K57h5tpoL9h-7Y7CMbXCsDmmhU/view?usp=sharing" },
        { "formato": "Norma", "titulo": "Estrutura do Subsistema Médico-Pericial na MB", "descricao": "Cap 1 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1nVX3dkkGHHyWDwVhPdVjw7DWItD0y1sy/view?usp=sharing" },
        { "formato": "Aula", "titulo": "Estrutura do Subsistema Médico-Pericial", "descricao": "Aula para a turma SMIO Md 2026 EAMPE", "url": "<iframe src=\"https://www.canva.com/design/DAGvDg5SgbM/tst9TbwHSl9nnWLdupPtyA/view?embed\"></iframe>" }
      ]
    },
    {
      "modulo_id": 4,
      "modulo": "PROCESSOS DAS IS",
      "materiais": [
        { "formato": "Infográfico", "titulo": "Inspeções de Saúde na MB", "descricao": "Guia da estrutura do SMP, principais IS e seus prazos", "url": "https://i.imgur.com/NKD2d1P.jpeg" },
        { "formato": "Vídeo", "titulo": "JRS/HNRe - Tipos de Inspeções de Saúde", "descricao": "Guia completo sobre as Inspeções de Saúde (IS) no Hospital Naval de Recife (HNRe).", "url": "<iframe src=\"https://www.youtube.com/embed/rVMOfIavgw8?si=82gLpr8jIaUeAn2I\"></iframe>" },
        { "formato": "Norma", "titulo": "Processos das Inspeções de Saúde na MB", "descricao": "Cap 2 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1L7TLBKFsRGaRI-rpaMEVvwg9bV_Y2A58/view?usp=sharing" },
        { "formato": "Aula", "titulo": "Processos das Inspeções de Saúde na MB", "descricao": "Aula para a turma SMIO Md 2026 EAMPE", "url": "<iframe src=\"https://www.canva.com/design/DAGvk9OK928/gSCmk4amMSlEaE_zY1ukag/view?embed\"></iframe>" },
        { "formato": "Infográfico", "titulo": "Guia de orientações sobre as IS para MIL ativa", "descricao": "Guia sobre as Inspeções de Saúde (IS) para militares da ativa.", "url": "https://i.imgur.com/jqsFu2K.jpeg" },
        { "formato": "Infográfico", "titulo": "Competências dos AMP", "descricao": "Guia prático com as principais IS de competência do MPI e da JRS", "url": "https://i.imgur.com/n2gvLwQ.png" }
      ]
    },
    {
      "modulo_id": 5,
      "modulo": "IS CONTROLE PERIÓDICO",
      "materiais": [
        { "formato": "Aula", "titulo": "Padrões de Aptidão Funcional nas IS de Rotina", "descricao": "Aula para a turma SMIO Md 2026 EAMPE", "url": "<iframe src=\"https://www.canva.com/design/DAGvk5lnr_s/WQX_F9BfcmY1D-0qJ-PtGQ/view?embed\"></iframe>" },
        { "formato": "Norma", "titulo": "Padrões Psicofísicos Pós-Admissionais", "descricao": "Anexo P - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1IBpnfLMVe_Ncve11DZAiM3aXQWFwJ23j/view?usp=sharing" },
        { "formato": "Norma", "titulo": "Exames mínimos por finalidade de IS", "descricao": "Anexo O - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1XiStpUGHQ0UuIkiJ7wWhg63VEBI3ASaj/view?usp=sharing" },
        { "formato": "Norma", "titulo": "Procedimentos Médico-Periciais nas Inspeções de Saúde Pós-Admissionais (CONTROLE PERIÓDICO)", "descricao": "Cap 4 - DGPM-406 REV 9 (Exceto os itens 4.2 e 4.4)", "url": "https://drive.google.com/file/d/1lblyFP5bbCKdQyXuO1--JCz1VmlJOG38/view?usp=sharing" }
      ]
    },
    {
      "modulo_id": 6,
      "modulo": "SINAIS",
      "materiais": [
        { "formato": "Manual", "titulo": "SINAIS 3.0", "descricao": "Manual do usuário do SINAIS", "url": "https://drive.google.com/file/d/10apPXfEYcmjPEtXhQD16t6mcplqeIVBH/view?usp=sharing" },
        { "formato": "Manual", "titulo": "SINAIS 3.0 FAQ", "descricao": "Orientações Gerais e Dúvidas Frequentes sobre o SINAIS", "url": "https://drive.google.com/file/d/13NkKIn6V9s0ymzLCGidjL2uggnU9A4kQ/view?usp=sharing" }
      ]
    },
    {
      "modulo_id": 7,
      "modulo": "IS INGRESSO",
      "materiais": [
        { "formato": "Norma", "titulo": "Padrões Psicofísicos Admissionais", "descricao": "Anexo N - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1-HURtUmzyCHhXY3DfRVA4C8wMQdV8_wF/view?usp=sharing" },
        { "formato": "Capítulo de Livro", "titulo": "Semiologia Pericial", "descricao": "Capítulo do Livro de Perícias Médicas do CREMEGO", "url": "https://drive.google.com/file/d/1ABmEtfF_2JKTCWppYlqXlOWgU5kEjWkp/view?usp=drive_link" },
        { "formato": "Norma", "titulo": "Procedimentos Médico-Periciais para Ingressar no SAM", "descricao": "Cap 3 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1FielRLlQ7rmcjtaVJafdGF2x1SN90DE3/view?usp=sharing" },
        { "formato": "Infográfico", "titulo": "Inaptidões Ortopédicas", "descricao": "Resumo das condições de inaptidões ortopédicas nas IS de Ingresso.", "url": "https://i.imgur.com/yf9CtlL.png" },
        { "formato": "Infográfico", "titulo": "Inaptidões Oftalmológicas", "descricao": "Resumo das condições de inaptidões oftalmológicas nas IS de Ingresso.", "url": "https://i.imgur.com/LGMDQOm.png" },
        { "formato": "Vídeo", "titulo": "Avaliação Ortopédica em Inspeções de Saúde (IS)", "descricao": "Guia Prático e Passo a Passo", "url": "<iframe src=\"https://www.youtube.com/embed/sMsYaNRuEHs?si=QHKZFoxYHomb5tOs\"></iframe>" },
        { "formato": "Norma", "titulo": "POP - CONFECÇÃO DE MENSAGENS COM RESULTADOS DE IS INGRESSO", "descricao": "POP JRS/HNRe 1/2026", "url": "https://drive.google.com/file/d/1Hadhw0gQyBIhc4_n8MrJMThLVrFZ3c5B/view?usp=sharing" },
        { "formato": "Infográfico", "titulo": "Infográfico POP JRS/HNRe 1/2026", "descricao": "Detalha o Procedimento Operacional Padrão para resultados de concursos.", "url": "https://i.imgur.com/MkZIYu9.png" },
        { "formato": "Vídeo", "titulo": "Vídeo POP JRS/HNRe 1/2026", "descricao": "Vídeo Tutorial que detalha o POP para o registro e envio de resultados de concursos.", "url": "<iframe src=\"https://www.youtube.com/embed/KJ85yOXeFTI?si=dUhoBz-c03MUoM7D\"></iframe>" }
      ]
    },
    {
      "modulo_id": 8,
      "modulo": "PERÍCIAS MENORES",
      "materiais": [
        { "formato": "Aula", "titulo": "Rotina para Perícias Menores", "descricao": "Aula para a turma SMIO Md 2026 EAMPE", "url": "<iframe src=\"https://www.canva.com/design/DAGvkz_XrS8/7bBKUSHPH9dFEdAS9dAHhA/view?embed\"></iframe>" },
        { "formato": "Norma", "titulo": "Procedimentos para Perícias Menores", "descricao": "Cap 4.4 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1lblyFP5bbCKdQyXuO1--JCz1VmlJOG38/view?usp=sharing" }
      ]
    },
    {
      "modulo_id": 9,
      "modulo": "LTS E RESTRIÇÕES",
      "materiais": [
        { "formato": "Lei", "titulo": "LEI nº 6.880/1980", "descricao": "Estatuto dos Militares", "url": "https://drive.google.com/file/d/1Rg207oonhofRRX2fBDUrBcx0FQ5yIGT6/view?usp=drive_link" },
        { "formato": "Lei", "titulo": "LEI nº 13.954/2019", "descricao": "Sistema de Proteção Social dos Militares", "url": "https://drive.google.com/open?id=1JiLQ54Zy6QEnwiuWab2ZvHBF2ul1T17c" },
        { "formato": "Norma", "titulo": "DGPM-310 REV 5", "descricao": "Norma de Nomeações e Afastamentos na MB", "url": "https://drive.google.com/open?id=1jdnBqUzMklCf1bOHXuwWWVA71zf_gHMa" },
        { "formato": "Capítulo de Livro", "titulo": "Perícia Médica Administrativa", "descricao": "Capítulo do Livro de Perícias Médicas do CREMEGO", "url": "https://drive.google.com/file/d/1FrYHWE2jNXqisfPzFgX5489NeB-agmNj/view?usp=sharing" },
        { "formato": "Aula", "titulo": "Perícias Administrativas e Ocupacionais", "descricao": "Aula da CC (Md) CARLA LEMOS, da JSD/CPMM, no C-EXP-PERMED 2026 TI", "url": "https://docs.google.com/presentation/d/1uk0kLTcB8Ri-j6jDaiNH0xap-xvOaQYJwz4bOThGCds/present?usp=sharing" },
        { "formato": "Infográfico", "titulo": "Guia de Verificação de Deficiência Funcional", "descricao": "Execução, responsabilidades e prazos das Verificações de Deficiências Funcionais", "url": "https://i.imgur.com/iZInomR.jpeg" },
        { "formato": "Norma", "titulo": "Procedimentos Médico-Periciais para VDF e Restrições", "descricao": "Cap 6 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1Lus5R4-UjHGZ8Ff5sylgfl8cN6qQpeo5/view?usp=sharing" },
        { "formato": "Vídeo", "titulo": "JRS/HNRe - Afastamentos de militares da ativa", "descricao": "Guia essencial sobre Afastamentos por Saúde para os militares da ativa", "url": "<iframe src=\"https://www.youtube.com/embed/zjqTtXkYFh0?si=i4dF8RkIIb9QVGC8\"></iframe>" },
        { "formato": "Infográfico", "titulo": "Afastamento de Militares da Ativa", "descricao": "Resumo das particularidades dos afastamentos dos Militares de Carreira", "url": "https://i.imgur.com/3rmVrM3.jpeg" },
        { "formato": "Capítulo de Livro", "titulo": "Propedêutica Ortopédica Pericial", "descricao": "Capítulo do Livro de Perícias Médicas do CREMEGO", "url": "https://drive.google.com/file/d/1GSfNvat2kJhhBjjb3dJLIrnqRgJqEWLV/view?usp=drive_link" },
        { "formato": "Aula", "titulo": "Introdução à Psiquiatria Forense", "descricao": "Aula do CMG(RM1-Md) Almir do CPMM no C-EXP-PERMED 2026", "url": "https://drive.google.com/file/d/1cwFu1v534r2OUHNvytK5GHBht8NWRc-0/view?usp=sharing" },
        { "formato": "Capítulo de Livro", "titulo": "Perícia Médica em Psiquiatria", "descricao": "Capítulo do Livro de Perícias Médicas do CREMEGO", "url": "https://drive.google.com/file/d/1iJjWHOwvZg6L5l5hrZHkS5uI9JaUYo-t/view?usp=drive_link" }
      ]
    },
    {
      "modulo_id": 10,
      "modulo": "LTS E RESTRIÇOES SMV/SMI",
      "materiais": [
        { "formato": "Infográfico", "titulo": "Afastamento de Militares Temporários (SMV e SMI)", "descricao": "Resumo das particularidades dos afastamentos dos Militares do SMV e SMI", "url": "https://i.imgur.com/SAX9pkh.jpeg" },
        { "formato": "Aula", "titulo": "Procedimentos Médico-Periciais para o Serviço Militar Temporário", "descricao": "Aula do CT (Md) Pinheiro, membro da JRS3/CPMM", "url": "https://drive.google.com/file/d/1xw9kCiQUJ0etKoAcXwH7fd1PWLoz-t08/view?usp=sharing" },
        { "formato": "Norma", "titulo": "Procedimentos Médico-Periciais para o Serviço Militar Temporário", "descricao": "Cap 11 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1jFWJMETC-w6L8t7ylJyQgBVVQDfKDJNV/view?usp=sharing" },
        { "formato": "Vídeo", "titulo": "Afastamento de Militares Temporários, Licenciamento por Motivo de Saúde", "descricao": "Conceitos Chave: Sem Nexo ou Incapacidade Temporária.", "url": "<iframe src=\"https://www.youtube.com/embed/-Jwnf8qoBSo?si=Iv9R7ID1tP5M-8cV\"></iframe>" },
        { "formato": "Lei", "titulo": "LEI nº 4.375/1964", "descricao": "Lei do Serviço Militar", "url": "https://drive.google.com/open?id=1luWEIf0Lqd-UsvZUqZV6jcfFGn5ielNS" }
      ]
    },
    {
      "modulo_id": 11,
      "modulo": "COMPROVAÇÃO DE NEXO CAUSAL",
      "materiais": [
        { "formato": "Lei", "titulo": "LEI nº 6.782/1980", "descricao": "Equiparação do Acidente de Serviço à Doença Profissional", "url": "https://drive.google.com/file/d/12zgDnVuXb4MWTQJv-dZSgqIu1gH61UDp/view" },
        { "formato": "Norma", "titulo": "Procedimentos Médico-Periciais para Comprovação de Nexo Causal", "descricao": "Cap 13 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1K17M2dVRqpRVpRrqbSaYHvX0Gt31jxdN/view?usp=sharing" },
        { "formato": "Infográfico", "titulo": "Infográfico Atestado de Origem", "descricao": "Resumo da processualística dos Atestados de Origem", "url": "https://i.imgur.com/gpY5uPV.jpeg" },
        { "formato": "Vídeo", "titulo": "POP Tramitação de Atestados de Origem da JRS/HNRe", "descricao": "Guia sobre o novo POP 02 da JRS/HNRe para AOs.", "url": "<iframe src=\"https://www.youtube.com/embed/eViYH9rdi5U?si=hfZab9oykskDaWAL\"></iframe>" },
        { "formato": "Norma", "titulo": "PARECER CREMESE nº 006/2017", "descricao": "Prerrogativa do médico perito oficial em avaliar a capacidade laboral.", "url": "https://drive.google.com/file/d/1BGqM9H5mnikocdgTrBpiUZSiHDyO1uoa/view?usp=sharing" }
      ]
    },
    {
      "modulo_id": 12,
      "modulo": "IS LICENCIAMENTO",
      "materiais": [
        { "formato": "Norma", "titulo": "Procedimentos Médico-Periciais para Exclusão do SAM", "descricao": "Cap 8 - DGPM-406 REV 9", "url": "https://drive.google.com/open?id=1ozUl0F2YNU_SEVkzDI8Dl-CeIn_gN6XC" },
        { "formato": "Norma", "titulo": "Procedimentos Médico-Periciais para o Serviço Militar Temporário", "descricao": "Cap 11 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1jFWJMETC-w6L8t7ylJyQgBVVQDfKDJNV/view?usp=sharing" }
      ]
    },
    {
      "modulo_id": 13,
      "modulo": "IS BENEFÍCIOS",
      "materiais": [
        { "formato": "Norma", "titulo": "Inspeções de Saúde para Concessão de Benefícios", "descricao": "Cap 9 - DGPM-406 REV 9", "url": "https://drive.google.com/open?id=1JlzkalbaF4R7zrjt8qk9XvFu_jp4BMhL" },
        { "formato": "Norma", "titulo": "Portaria Normativa MD 3551/2021", "descricao": "Enquadramento nas Doenças Previstas em Lei", "url": "https://drive.google.com/open?id=1Rf2al57vzBQqb8uniy3m9ME_3xnOZFH4" },
        { "formato": "Norma", "titulo": "Doenças Previstas em Lei", "descricao": "Anexo U - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1FBANLwxPTHTy-FDOM5DmI05nsG9DBPg2/view?usp=drive_link" },
        { "formato": "Norma", "titulo": "Documentação Técnica Pertinente - Doenças Especificadas", "descricao": "Anexo V - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1j3tU5CHO-wCBsoJUdTNzTwehfil4PaQk/view?usp=drive_link" },
        { "formato": "Infográfico", "titulo": "Infográfico Doenças Previstas em Lei", "descricao": "Resumo das Condições de enquadramento das Doenças Previstas em Lei.", "url": "https://i.imgur.com/JfJHmyO.jpeg" },
        { "formato": "Infográfico", "titulo": "Finalidades das IS para Concessão de Benefícios", "descricao": "Resumo das Finalidades das IS para Concessão de Benefícios.", "url": "https://i.imgur.com/0dXKFFi.png" }
      ]
    },
    {
      "modulo_id": 14,
      "modulo": "IS RECURSOS E REVISÕES",
      "materiais": [
        { "formato": "Norma", "titulo": "Inspeções de Saúde em grau de Revisão e Recurso", "descricao": "Cap 12 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1G5_BSDseclb32cu4T3ZaUVyFnmH5Rf9E/view?usp=drive_link" },
        { "formato": "Norma", "titulo": "Estrutura do Departamento de Auditoria Médico-Pericial", "descricao": "Cap 15 - DGPM-406 REV 9", "url": "https://drive.google.com/file/d/1sUi1tvbGMtQkWAcqJc9wXz7n8koZLizM/view?usp=drive_link" }
      ]
    }
  ]
};

// Extrator de Links puros
const extractLink = (htmlString: string) => {
  const srcMatch = htmlString.match(/src="([^"]+)"/);
  if (srcMatch) return srcMatch[1];
  const hrefMatch = htmlString.match(/href="([^"]+)"/);
  if (hrefMatch) return hrefMatch[1];
  return htmlString;
};

// Ícones visuais
const getIconForFormat = (formato: string) => {
  const fmt = formato.toLowerCase();
  if (fmt.includes('apresentação')) return <MonitorPlay size={18} />;
  if (fmt.includes('vídeo')) return <PlayCircle size={18} />;
  if (fmt.includes('aula')) return <GraduationCap size={18} />;
  if (fmt.includes('infográfico')) return <ImageIcon size={18} />;
  if (fmt.includes('ordem') || fmt.includes('manual')) return <FileText size={18} />;
  if (fmt.includes('capítulo') || fmt.includes('artigo')) return <BookOpen size={18} />;
  if (fmt.includes('norma')) return <Scale size={18} />;
  if (fmt.includes('lei')) return <Gavel size={18} />;
  return <Book size={18} />;
};

export const RoteiroJRS: React.FC = () => {
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  const toggleModule = (id: number) => {
    setExpandedModule(expandedModule === id ? null : id);
  };

  const handleMaterialClick = (rawUrl: string) => {
    const link = extractLink(rawUrl);
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      setActiveVideoUrl(link);
    } else if (link.includes('imgur.com')) {
      setActiveImageUrl(link);
    } else {
      window.open(link, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Roteiro JRS" />
      
      <div className="p-4 animate-fade-in overflow-auto pb-24 max-w-4xl mx-auto w-full">
        {/* Banner Descritivo Superior */}
        <div className="mb-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-heading font-bold text-[#050F41] uppercase">{ROTEIRO_DATA.curso}</h2>
              <p className="text-sm text-gray-600 font-body mt-2 text-justify leading-relaxed">
                Trilha estruturada de aprendizagem e consulta rápida para capacitação dos Agentes Médico-Periciais.
              </p>
            </div>
            <div className="text-[#050F41] p-1 flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>school</span>
            </div>
          </div>
        </div>

        {/* Lista de Módulos Separados (gap-3) */}
        <div className="flex flex-col gap-3">
          {ROTEIRO_DATA.modulos.map((mod) => {
            const isExpanded = expandedModule === mod.modulo_id;

            return (
              <div key={mod.modulo_id} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden transition-all duration-300">
                
                {/* Botão Principal do Cartão (Expande/Retrai) */}
                <button 
                  onClick={() => toggleModule(mod.modulo_id)}
                  className={`w-full group flex items-center justify-between p-4 transition-colors focus:outline-none cursor-pointer ${isExpanded ? 'bg-gray-50/50' : 'hover:bg-gray-50/80'}`}
                >
                  <div className="flex flex-col pr-4 flex-1 text-left">
                    <h3 className={`font-heading font-bold text-[14px] leading-snug mb-1 transition-colors ${isExpanded ? 'text-[#079551]' : 'text-[#050F41] group-hover:text-[#079551]'}`}>
                      {mod.modulo}
                    </h3>
                    <p className="text-gray-500 font-body text-[11px] font-medium leading-relaxed uppercase">
                      Módulo {mod.modulo_id}
                    </p>
                  </div>
                  <div className={`text-gray-400 p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#079551]' : 'group-hover:text-[#050F41] group-hover:bg-gray-100'}`}>
                    <ChevronDown size={18} />
                  </div>
                </button>

                {/* Sub-itens de Materiais renderizados caso Expandido */}
                {isExpanded && (
                  <div className="bg-white border-t border-gray-100 divide-y divide-gray-100 flex flex-col">
                    {mod.materiais.map((mat, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleMaterialClick(mat.url)}
                        className="group flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors focus:outline-none cursor-pointer text-left"
                      >
                        <div className="flex flex-col pr-3 flex-1 min-w-0">
                          <h4 className="text-[#050F41] font-heading font-bold text-[13px] leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">
                            {mat.titulo}
                          </h4>
                          {/* Substituído: Exibindo Formato com estilo de Badge no subtítulo */}
                          <p className="text-gray-500 font-body text-[11px] leading-relaxed line-clamp-1 uppercase tracking-wider font-semibold">
                            {mat.formato}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-600 p-2 rounded-full bg-gray-50 group-hover:bg-blue-50 border border-gray-100 shadow-sm transition-all">
                          {getIconForFormat(mat.formato)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE VÍDEO (Youtube) */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-4xl relative">
            <button 
              onClick={() => setActiveVideoUrl(null)} 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 bg-white/10 p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-black border border-gray-800">
              <iframe 
                src={activeVideoUrl} 
                className="w-full h-full border-0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMAGEM (Imgur) */}
      {activeImageUrl && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
            <button 
              onClick={() => setActiveImageUrl(null)} 
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-white/10 p-2 rounded-full transition-colors z-10"
            >
              <X size={24} />
            </button>
            <img 
              src={activeImageUrl} 
              alt="Visualização em ecrã inteiro" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};