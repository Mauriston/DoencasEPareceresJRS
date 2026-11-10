// Ficheiro: services/sinaisIA.ts
// Lê um print da tela de uma IS do SINAIS e devolve a seção "DADOS DO INSPECIONADO" (Gemini via
// Firebase AI Logic, services/geminiAI.ts), para pré-preencher o cadastro de novo inspecionado
// (utils/inspecionadoSinais.ts faz a conversão para os campos do formulário), e — na "IS por foto" — a
// tela da IS e a da conclusão (utils/importacaoIS.ts monta a IS a criar ou atualizar).
import { gerarComGemini, lerJsonIA } from './geminiAI';
import type { DadosSinais } from '../utils/inspecionadoSinais';
import type { ConclusaoSinais, DadosISSinais } from '../utils/importacaoIS';

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

const INSTRUCOES_IS = [
  'A imagem é um print da tela de uma Inspeção de Saúde do SINAIS (Sistema Naval de Inspeções de Saúde, Marinha do Brasil).',
  'Devolva os campos do esquema, copiando o texto como aparece. Do topo e da seção "DADOS DA INSPEÇÃO":',
  '- numInspecao: "Num. Inspeção" (no topo, ao lado do nome; só os dígitos).',
  '- junta: campo "Junta" (ex.: JRS/HNRE, MPI/CASSUNDÉ).',
  '- finalidadeTis: campo "Texto Finalidade TIS".',
  '- dataCriacao: campo "Data de Criação", no formato AAAA-MM-DD.',
  '- dataAgendamento: campo "Data de Agendamento", no formato AAAA-MM-DD.',
  '- ds1a: campo "Código DS-1A".',
  '- dataLaudo: campo "Data do Laudo", no formato AAAA-MM-DD.',
  '- numTis: campo "Num. TIS" (ex.: 026.000.48930).',
  'Ignore "Data de Apresentação", "Data Apreciação" e "Data da Conclusão".',
  'Da seção "DADOS DO INSPECIONADO":',
  '- nome: "Nome"; situacao: "Situação" (ex.: Ativa, Reserva); tipo: "Tipo" (ex.: Titular, Dependente);',
  '- omSigla: "OM Inspecionado"; posto: "Posto" (por extenso, como aparece); corpo: "Corpo" (sigla);',
  '- quadro: "Quadro"; especialidade: "Especialidade"; nip: "NIP" (só os dígitos);',
  '- dataNascimento: "Data Nascimento", no formato AAAA-MM-DD.',
  'Não leia CPF nem Identidade. Campo vazio, com "-" ou ilegível: omita. Não invente dados.',
].join('\n');

const CAMPOS_IS = ['numInspecao', 'junta', 'finalidadeTis', 'dataCriacao', 'dataAgendamento', 'ds1a', 'dataLaudo', 'numTis', ...CAMPOS] as const;

/** Foto 1: a tela da IS no SINAIS ("Dados da Inspeção" + "Dados do Inspecionado"). */
export const lerISDoSinais = async (base64: string, mimeType: string): Promise<DadosISSinais> => {
  const r = await gerarComGemini({
    contexto: 'print do SINAIS (IS por foto)',
    instrucoes: INSTRUCOES_IS,
    arquivos: [{ base64, mimeType }],
    temperature: 0,
    esquema: Schema => Schema.object({
      properties: Object.fromEntries(CAMPOS_IS.map(c => [c, Schema.string()])),
      optionalProperties: [...CAMPOS_IS],
    }),
  });
  return lerJsonIA<DadosISSinais>(r, 'Não foi possível ler a foto da IS. Confira se "Dados da Inspeção" está visível.');
};

const INSTRUCOES_CONCLUSAO = [
  'A imagem é um print da tela de conclusão de uma Inspeção de Saúde do SINAIS (Marinha do Brasil): cabeçalho',
  '(Nome, AMP, Final., Posto, Situação, NIP, IS), a tabela "Laudos" e a tabela "Restrições Associadas".',
  'Devolva os campos do esquema, copiando o texto como aparece:',
  '- numInspecao: campo "IS" do cabeçalho (só os dígitos).',
  '- nip: campo "NIP" do cabeçalho (só os dígitos).',
  '- finalidade: campo "Final." do cabeçalho.',
  '- laudos: uma linha por linha da tabela "Laudos", com resultado ("Resultado"), finalidade ("Finalidade") e laudo ("Laudo", o texto completo).',
  '- restricoes: o texto da coluna "Restrição" de cada linha da tabela "Restrições Associadas" (pule as linhas com a restrição vazia).',
  'Não invente dados. Tabela ausente ou vazia: devolva a lista vazia.',
].join('\n');

/** Foto 2: a conclusão da IS no SINAIS (laudos e restrições associadas). */
export const lerConclusaoDoSinais = async (base64: string, mimeType: string): Promise<ConclusaoSinais> => {
  const r = await gerarComGemini({
    contexto: 'print do SINAIS (conclusão da IS por foto)',
    instrucoes: INSTRUCOES_CONCLUSAO,
    arquivos: [{ base64, mimeType }],
    temperature: 0,
    esquema: Schema => Schema.object({
      properties: {
        numInspecao: Schema.string(),
        nip: Schema.string(),
        finalidade: Schema.string(),
        laudos: Schema.array({
          items: Schema.object({
            properties: { resultado: Schema.string(), finalidade: Schema.string(), laudo: Schema.string() },
            optionalProperties: ['resultado', 'finalidade', 'laudo'],
          }),
        }),
        restricoes: Schema.array({ items: Schema.string() }),
      },
      optionalProperties: ['numInspecao', 'nip', 'finalidade', 'laudos', 'restricoes'],
    }),
  });
  return lerJsonIA<ConclusaoSinais>(r, 'Não foi possível ler a foto da conclusão. Confira se a tabela "Laudos" está visível.');
};
