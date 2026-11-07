// Ficheiro: servidor/entrevistas/prompt.ts
// Prompt do Gemini que organiza a entrevista da IS como anamnese médico-pericial. Função pura e testada.

import { ROTULO_PAPEL, type FalaTranscrita, type ParticipanteEntrevista } from '../../config/entrevistas';

export interface EntradaPrompt {
  finalidade: string;
  participantes: ParticipanteEntrevista[];
  transcricao: FalaTranscrita[];
  /** Mapa rótulo → nome já confirmado pelo perito (reorganização). Ausente: a IA sugere. */
  mapaConfirmado?: Record<string, string> | null;
}

/** "75.3" → "01:15" (mm:ss; h:mm:ss acima de 1 h). */
export const formatarTempo = (seg: number): string => {
  const s = Math.max(0, Math.floor(Number(seg) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dd = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${dd(m)}:${dd(r)}` : `${dd(m)}:${dd(r)}`;
};

// ------------------------------------------------------------------ roteiro mínimo por finalidade (puro)

const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ROTEIRO_GENERICO = [
  'início dos sintomas', 'evolução', 'localização e lateralidade', 'intensidade', 'fatores de piora e de melhora',
  'tratamentos e medicações', 'afastamentos e dispensas médicas', 'exames realizados',
];
const ROTEIRO_OSTEOMUSCULAR = [
  'lateralidade (lado acometido)', 'mecanismo do trauma', 'sintomas mecânicos (bloqueio, falseio)', 'uso de órteses ou muletas', 'analgesia em uso',
];
const ROTEIROS: Array<{ id: string; chaves: RegExp; sigla?: RegExp; itens: string[] }> = [
  {
    id: 'ao',
    // "ao" é preposição comum: a sigla AO/ISO casa só em maiúsculas (ver `casa`).
    chaves: /atestado de origem|inquerito sanitario de origem|acidente/,
    sigla: /\b(AO|ISO)\b/,
    itens: ['circunstância do acidente', 'data, hora e local', 'testemunhas', 'se estava em serviço', 'registro do fato (parte, comunicação)'],
  },
  {
    id: 'vdf',
    chaves: /\bvdf\b|deficiencia funcional|verificacao de deficiencia/,
    itens: ['limitações nas atividades diárias e no serviço', 'atividades que deixou de fazer', 'necessidade de ajuda de terceiros ou de dispositivos', 'evolução da limitação e tratamento atual'],
  },
  {
    id: 'termino',
    chaves: /termino|restric|incapacidade|licenca|\blts\b/,
    itens: ['evolução desde o afastamento ou restrição', 'tratamento realizado', 'sintomas atuais', 'retorno às atividades'],
  },
  {
    id: 'beneficio',
    chaves: /beneficio|doenca especificada|especificada em lei|isencao|reforma/,
    itens: ['diagnóstico', 'data do diagnóstico', 'tratamento', 'evolução', 'limitações atuais'],
  },
];
/** Palavras que indicam lesão osteomuscular (na finalidade ou no conteúdo da entrevista). */
const OSTEOMUSCULAR = /joelho|ombro|coluna|lombar|cervical|tornozelo|punho|cotovelo|quadril|menisco|ligamento|tendao|tendin|fratura|entorse|luxacao|\blca\b|lombalgia|hernia de disco|osteomuscular|ortoped/;

/**
 * Roteiro mínimo da anamnese para a finalidade (casamento por palavras-chave sem acento/caixa): o da
 * finalidade + o genérico; com indício de lesão osteomuscular (na finalidade ou no `contexto`, ex.:
 * a transcrição), acrescenta os itens osteomusculares. Sem duplicatas.
 */
export const roteiroMinimo = (finalidade: string, contexto = ''): string[] => {
  const original = String(finalidade || '');
  const f = semAcento(original);
  const itens: string[] = [];
  for (const r of ROTEIROS) if (r.chaves.test(f) || r.sigla?.test(original)) itens.push(...r.itens);
  itens.push(...ROTEIRO_GENERICO);
  if (OSTEOMUSCULAR.test(f) || OSTEOMUSCULAR.test(semAcento(String(contexto || '')))) itens.push(...ROTEIRO_OSTEOMUSCULAR);
  return [...new Set(itens)];
};

const limpar = (t: unknown, max = 400) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export const montarPromptAnamnese = ({ finalidade, participantes, transcricao, mapaConfirmado }: EntradaPrompt): string => {
  const listaParticipantes = participantes.length
    ? participantes.map((p, i) => `${i + 1}. ${limpar(p.nome, 120) || 'Sem nome'} — ${ROTULO_PAPEL[p.papel] || 'Outro'}`).join('\n')
    : '(não informados)';
  const rotulos = [...new Set(transcricao.map(f => f.falante))];
  const linhas = transcricao.map(f => `[${f.falante} ${formatarTempo(f.inicioSeg)}–${formatarTempo(f.fimSeg)} | ${f.inicioSeg}s] ${String(f.texto ?? '').replace(/\s+/g, ' ').trim()}`).join('\n');
  const roteiro = roteiroMinimo(finalidade, transcricao.map(f => f.texto).join(' '));
  const mapa = mapaConfirmado && Object.keys(mapaConfirmado).length
    ? `\nMAPA DE FALANTES CONFIRMADO PELO PERITO (use-o como verdade; devolva-o inalterado em "mapaFalantes"):\n${rotulos.map(r => `- ${r} = ${limpar(mapaConfirmado[r], 120) || 'não identificado'}`).join('\n')}\n`
    : '';

  return `Você é assistente de perito médico da Junta Regular de Saúde (JRS) da Marinha do Brasil (Hospital Naval de Recife). Sua tarefa é organizar a entrevista gravada de uma Inspeção de Saúde (IS) como ANAMNESE MÉDICO-PERICIAL estruturada, para apoiar o perito. Você NÃO é o perito e NÃO decide nada.

FINALIDADE DA IS: ${limpar(finalidade, 300) || 'Não informada'}

PARTICIPANTES (nome — papel):
${listaParticipantes}
${mapa}
TRANSCRIÇÃO AUTOMÁTICA (rótulos de falante ${rotulos.join(', ') || '—'} atribuídos pelo reconhecimento de fala; tempos do áudio; pode conter erros de reconhecimento e de separação de falantes):
${linhas || '(vazia)'}

TAREFAS
a) Mapeie cada rótulo (${rotulos.join(', ') || 'F1…Fn'}) a um participante pelo contexto: quem conduz e faz as perguntas é o perito ou membro da junta; quem relata sintomas, história e queixas é o inspecionado; acompanhante é quem fala em nome do inspecionado ou complementa o relato. Use exatamente os nomes da lista de participantes. Se não for possível identificar, use "Não identificado".${mapa ? ' (Aqui o mapa já foi confirmado: apenas repita-o.)' : ''}
b) Reorganize o conteúdo na ORDEM LÓGICA DA ANAMNESE MÉDICO-PERICIAL (queixa principal, história da doença atual, antecedentes, medicações, tratamentos, exames citados, repercussão funcional), mesmo que as perguntas tenham sido feitas fora de ordem na entrevista.
c) Monte a história em ORDEM CRONOLÓGICA: cada item com quando ocorreu (como foi dito, ex.: "mar/2024", "há 2 anos"; "Não referido" se não houver), o evento, a fonte da informação e o tempo do áudio (em segundos) onde foi dito. Consultas e exames entram aqui (e em "examesCitados"), não em "tratamentos".
d) Separe o que o inspecionado ALEGA (relato subjetivo, em "alegacoesInspecionado") do que o perito observa ou constata durante a entrevista (fonte "perito"). Não transforme alegação em fato.
e) FONTE RIGOROSA DO EXAME FÍSICO: só registre achado de exame físico quando o perito descrever explicitamente que examinou ou observou ("ao exame…", "estou vendo…", palpação, manobra, inspeção). Achados de exames complementares trazidos pelo inspecionado (laudos, ultrassonografia, ressonância, radiografia) vão em "examesCitados" com a origem (ex.: "US de joelho direito (laudo trazido pelo inspecionado): edema…") e NUNCA são atribuídos ao exame físico. Errado: "ao exame físico pericial, constatou-se edema" quando o edema estava no laudo do ultrassom.
f) "tratamentos": só medidas terapêuticas (medicação, imobilização, fisioterapia, repouso, cirurgia, afastamento/dispensa médica).
g) "repercussaoFuncional": só as limitações que o INSPECIONADO relatou. Restrições propostas pelo perito não entram aqui.
h) "condutaPerito" (Conduta e encaminhamentos do perito): restrições propostas, prazos, exames ou pareceres solicitados e orientações DITOS PELO PERITO na entrevista. Isso não entra em "repercussaoFuncional" nem como fato no resumo; se o resumo citar, deixe claro que é proposta do perito. Lista vazia se o perito não disse nada disso.
i) "secaoFinalidade": título adequado à finalidade e apenas a ORGANIZAÇÃO dos elementos da entrevista relevantes para ela (por exemplo, circunstâncias e relação temporal com o serviço no Atestado de Origem; limitações relatadas na verificação de deficiência funcional). PROIBIDO juízo ou conclusão: não escreva "impossibilita definir", "apto", "inapto", "capacidade", "incapacidade", "compatível", "nexo" ou equivalentes.
j) "pontosAEsclarecer" contém SOMENTE:
   1. pendências DITAS na entrevista (documentos ou exames que alguém disse ter e não apresentou, ou que ficou dito que serão trazidos);
   2. inconsistências e contradições do próprio relato (datas imprecisas, falas que se contradizem);
   3. lacunas do ROTEIRO MÍNIMO abaixo, cada uma no formato "Não abordado na entrevista: <item>" (só os itens que de fato não foram abordados).
   Nada de recomendações: você NUNCA sugere exames, relatórios, pareceres, documentos ou condutas por conta própria. Se o perito pediu algo, isso vai em "condutaPerito", não aqui.
   Exemplo do que NÃO fazer: "Apresentação de relatório médico detalhado do ortopedista assistente após o resultado da ressonância" — se isso não foi dito no áudio, é exigência inventada e não pode aparecer.
k) Selecione citações LITERAIS relevantes (texto exato da transcrição), com o rótulo do falante e o tempo em segundos.
l) Faça um resumo executivo objetivo (3 a 6 frases).

ROTEIRO MÍNIMO PARA ESTA FINALIDADE (use só para apontar lacunas em "pontosAEsclarecer"):
${roteiro.map(i => `- ${i}`).join('\n')}

REGRAS
- Não invente nada: use apenas o que está na transcrição. Quando a informação não aparecer, escreva "Não referido" (ou deixe a lista vazia).
- Não emita conclusão pericial, diagnóstico definitivo, enquadramento legal nem juízo de capacidade/incapacidade, aptidão ou nexo causal.
- Português formal, terceira pessoa, terminologia médica correta; corrija erros evidentes de reconhecimento de fala só quando o sentido for inequívoco (nomes de medicamentos, termos médicos).
- Nomes: na anamnese, quando um nome de participante estiver visivelmente mal transcrito (ex.: saudação "Bom dia, meu amado irmão" no lugar de um sobrenome da lista), use a grafia correta da lista de participantes. Não altere as citações literais.
- Tempos sempre em segundos (número), tirados dos tempos da transcrição.
- Responda SOMENTE com o JSON no esquema pedido.`;
};
