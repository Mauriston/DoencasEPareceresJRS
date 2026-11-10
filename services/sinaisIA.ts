// Ficheiro: services/sinaisIA.ts
// Lê um print da tela de uma IS do SINAIS e devolve a seção "DADOS DO INSPECIONADO" (Gemini via
// Firebase AI Logic, services/geminiAI.ts), para pré-preencher o cadastro de novo inspecionado
// (utils/inspecionadoSinais.ts faz a conversão para os campos do formulário), e — na "IS por foto" — a
// tela da IS e a da conclusão (utils/importacaoIS.ts monta a IS a criar ou atualizar).
import { gerarComGemini, lerJsonIA } from './geminiAI';
import type { DadosSinais } from '../utils/inspecionadoSinais';
import type { LeituraPrint } from '../utils/importacaoIS';

const INSTRUCOES = [
  'A imagem é um print da tela de uma Inspeção de Saúde do SINAIS (Sistema Naval de Inspeções de Saúde, Marinha do Brasil).',
  'Leia SOMENTE a seção "DADOS DO INSPECIONADO" e devolva os campos do esquema, copiando o texto como aparece:',
  '- nome: campo "Nome".',
  '- situacao: campo "Situação" (ex.: Ativa, Inativa, Reserva, Reformado).',
  '- tipo: campo "Tipo" (ex.: Titular, Dependente, Pensionista).',
  '- omSigla: campo "OM Inspecionado" (sigla).',
  '- posto: campo "Posto" (por extenso, como aparece, ex.: Marinheiro-Recruta, Capitão-Tenente).',
  '- corpo: campo "Corpo" (sigla, ex.: CPRM, CORM, CPA, CPFN, CSM).',
  '- quadro: campo "Quadro" (oficiais).',
  '- especialidade: campo "Especialidade" (praças).',
  '- nip: campo "NIP" (só os dígitos).',
  '- dataNascimento: campo "Data Nascimento", no formato AAAA-MM-DD.',
  'Não leia CPF nem Identidade. Campo vazio ou ilegível: omita. Não invente dados.',
].join('\n');

const CAMPOS = ['nome', 'situacao', 'tipo', 'omSigla', 'posto', 'corpo', 'quadro', 'especialidade', 'nip', 'dataNascimento'] as const;

export const lerInspecionadoDoSinais = async (base64: string, mimeType: string): Promise<DadosSinais> => {
  const r = await gerarComGemini({
    contexto: 'print do SINAIS (novo inspecionado)',
    instrucoes: INSTRUCOES,
    arquivos: [{ base64, mimeType }],
    temperature: 0,
    esquema: Schema => Schema.object({
      properties: Object.fromEntries(CAMPOS.map(c => [c, Schema.string()])),
      optionalProperties: [...CAMPOS],
    }),
  });
  return lerJsonIA<DadosSinais>(r, 'Não foi possível ler os dados do print. Confira se a seção "Dados do Inspecionado" está visível.');
};

// ---------------------------------------------------------------- IS por foto (página Inspeções de Saúde)

const INSTRUCOES_PRINT = [
  'A imagem é um print do SINAIS (Sistema Naval de Inspeções de Saúde, Marinha do Brasil). Há dois tipos de tela:',
  '(A) tela da IS: topo com "Num. Inspeção" e o nome, e as seções "DADOS DA INSPEÇÃO" e "DADOS DO INSPECIONADO";',
  '(B) tela da conclusão: cabeçalho (Nome, AMP, Final., Posto, Situação, NIP, IS) e as tabelas "Laudos" e "Restrições Associadas".',
  'tipo: "is" para (A), "conclusao" para (B), "outra" para qualquer outra imagem (nesse caso, não preencha mais nada).',
  'Copie o texto como aparece. Campo vazio, com "-" ou ilegível: omita. Não invente dados.',
  '',
  'Tela (A):',
  '- numInspecao: "Num. Inspeção" (só os dígitos).',
  '- junta: "Junta" (ex.: JRS/HNRE, MPI/CASSUNDÉ).',
  '- finalidadeTis: "Texto Finalidade TIS".',
  '- dataCriacao: "Data de Criação"; dataAgendamento: "Data de Agendamento"; dataLaudo: "Data do Laudo" — todas no formato AAAA-MM-DD.',
  '- ds1a: "Código DS-1A"; numTis: "Num. TIS" (ex.: 026.000.48930).',
  '- Ignore "Data de Apresentação", "Data Apreciação" e "Data da Conclusão".',
  '- Da seção "DADOS DO INSPECIONADO": nome ("Nome"), situacao ("Situação"), tipo do inspecionado em tipoInspecionado ("Tipo": Titular, Dependente…),',
  '  omSigla ("OM Inspecionado"), posto ("Posto", por extenso), corpo ("Corpo", sigla), quadro ("Quadro"), especialidade ("Especialidade"),',
  '  nip ("NIP", só os dígitos), dataNascimento ("Data Nascimento", AAAA-MM-DD). Não leia CPF nem Identidade.',
  '',
  'Tela (B):',
  '- numInspecao: campo "IS" do cabeçalho (só os dígitos); nip: "NIP" (só os dígitos); finalidade: "Final.".',
  '- laudos: uma linha por linha da tabela "Laudos": resultado ("Resultado"), finalidade ("Finalidade") e laudo ("Laudo", o texto completo).',
  '- restricoes: o texto da coluna "Restrição" de cada linha de "Restrições Associadas" (pule as linhas com a restrição vazia).',
].join('\n');

const TEXTOS_PRINT = ['numInspecao', 'junta', 'finalidadeTis', 'dataCriacao', 'dataAgendamento', 'ds1a', 'dataLaudo', 'numTis',
  'nome', 'situacao', 'tipoInspecionado', 'omSigla', 'posto', 'corpo', 'quadro', 'especialidade', 'nip', 'dataNascimento', 'finalidade'] as const;

/** Um print qualquer do SINAIS (tela da IS ou da conclusão): a IA diz qual é e lê os campos daquela tela. */
export const lerPrintDoSinais = async (base64: string, mimeType: string): Promise<LeituraPrint> => {
  const r = await gerarComGemini({
    contexto: 'print do SINAIS (IS por foto)',
    instrucoes: INSTRUCOES_PRINT,
    arquivos: [{ base64, mimeType }],
    temperature: 0,
    esquema: Schema => Schema.object({
      properties: {
        tipo: Schema.enumString({ enum: ['is', 'conclusao', 'outra'] }),
        ...Object.fromEntries(TEXTOS_PRINT.map(c => [c, Schema.string()])),
        laudos: Schema.array({
          items: Schema.object({
            properties: { resultado: Schema.string(), finalidade: Schema.string(), laudo: Schema.string() },
            optionalProperties: ['resultado', 'finalidade', 'laudo'],
          }),
        }),
        restricoes: Schema.array({ items: Schema.string() }),
      },
      optionalProperties: [...TEXTOS_PRINT, 'laudos', 'restricoes'],
    }),
  });
  return lerJsonIA<LeituraPrint>(r, 'Não foi possível ler a foto.');
};
