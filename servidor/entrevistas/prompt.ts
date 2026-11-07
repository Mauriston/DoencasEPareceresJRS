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

const limpar = (t: unknown, max = 400) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export const montarPromptAnamnese = ({ finalidade, participantes, transcricao, mapaConfirmado }: EntradaPrompt): string => {
  const listaParticipantes = participantes.length
    ? participantes.map((p, i) => `${i + 1}. ${limpar(p.nome, 120) || 'Sem nome'} — ${ROTULO_PAPEL[p.papel] || 'Outro'}`).join('\n')
    : '(não informados)';
  const rotulos = [...new Set(transcricao.map(f => f.falante))];
  const linhas = transcricao.map(f => `[${f.falante} ${formatarTempo(f.inicioSeg)}–${formatarTempo(f.fimSeg)} | ${f.inicioSeg}s] ${String(f.texto ?? '').replace(/\s+/g, ' ').trim()}`).join('\n');
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
c) Monte a história em ORDEM CRONOLÓGICA: cada item com quando ocorreu (como foi dito, ex.: "mar/2024", "há 2 anos"; "Não referido" se não houver), o evento, a fonte da informação e o tempo do áudio (em segundos) onde foi dito.
d) Separe o que o inspecionado ALEGA (relato subjetivo, em "alegacoesInspecionado") do que o perito observa ou constata durante a entrevista (fonte "perito"). Não transforme alegação em fato.
e) Redija a seção específica da finalidade da IS ("secaoFinalidade"): título adequado à finalidade e o que a entrevista trouxe de relevante para ela (por exemplo, circunstâncias e relação temporal com o serviço no Atestado de Origem; repercussão nas atividades e no serviço para verificação de capacidade), sem concluir.
f) Liste os pontos a esclarecer: lacunas, contradições, datas imprecisas, documentos citados e não apresentados, inconsistências entre falas.
g) Selecione citações LITERAIS relevantes (texto exato da transcrição), com o rótulo do falante e o tempo em segundos.
h) Faça um resumo executivo objetivo (3 a 6 frases).

REGRAS
- Não invente nada: use apenas o que está na transcrição. Quando a informação não aparecer, escreva "Não referido" (ou deixe a lista vazia).
- Não emita conclusão pericial, diagnóstico definitivo, enquadramento legal nem juízo de capacidade/incapacidade, aptidão ou nexo causal.
- Português formal, terceira pessoa, terminologia médica correta; corrija erros evidentes de reconhecimento de fala só quando o sentido for inequívoco (nomes de medicamentos, termos médicos).
- Tempos sempre em segundos (número), tirados dos tempos da transcrição.
- Responda SOMENTE com o JSON no esquema pedido.`;
};
