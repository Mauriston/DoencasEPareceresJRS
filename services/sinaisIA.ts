// Ficheiro: services/sinaisIA.ts
// Lê um print da tela de uma IS do SINAIS e devolve a seção "DADOS DO INSPECIONADO" (Gemini via
// Firebase AI Logic, services/geminiAI.ts), para pré-preencher o cadastro de novo inspecionado
// (utils/inspecionadoSinais.ts faz a conversão para os campos do formulário).
import { gerarComGemini, lerJsonIA } from './geminiAI';
import type { DadosSinais } from '../utils/inspecionadoSinais';

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
