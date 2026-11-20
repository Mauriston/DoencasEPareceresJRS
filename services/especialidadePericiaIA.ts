// Ficheiro: services/especialidadePericiaIA.ts
// Categoriza a Perícia Menor numa especialidade médica a partir do CID, pelo Gemini (Firebase AI Logic,
// services/geminiAI.ts), em segundo plano: começa quando o CID é escolhido no formulário e grava o campo
// "especialidade" depois do registro, sem atrasar o envio. Também completa os registros antigos sem o campo.
// Um CID → uma especialidade: o resultado fica em cache na sessão (uma chamada por CID distinto).
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { gerarComGemini, lerJsonIA } from './geminiAI';
import { logErroSeguro } from '../utils/logSeguro';
import {
  ESPECIALIDADES, codigoCidDaPericia, ehEspecialidade, especialidadePorCapitulo, normalizarCodigoCid, type Especialidade,
} from '../utils/especialidadePericia';

const db = getFirestore(app);
const cache = new Map<string, Promise<Especialidade>>();

interface ItemCid { codigo: string; descricao: string }

/** Classifica vários CIDs numa só chamada; o que a IA não devolver (ou se falhar) cai na tabela por capítulo. */
const classificarLote = async (itens: ItemCid[]): Promise<Map<string, Especialidade>> => {
  const saida = new Map<string, Especialidade>();
  try {
    const r = await gerarComGemini({
      contexto: 'especialidade da perícia menor',
      temperature: 0,
      arquivos: [],
      instrucoes: [
        'Você é médico perito. Para cada CID-10 abaixo, indique a especialidade médica que mais tipicamente',
        'assiste a condição que gerou o atestado, escolhendo EXATAMENTE uma destas:',
        ESPECIALIDADES.join(' | ') + '.',
        'Regras: neoplasias malignas → Oncologia; transtornos mentais → Psiquiatria; gestação, parto e doenças',
        'ginecológicas → Gineco-Obstetrícia; lesões do aparelho locomotor e dorsalgias → Ortopedia; olhos → Oftalmologia;',
        'ouvido, nariz, garganta e laringe → Otorrino; doenças cardíacas → Cardiologia; SNC, cefaleias e epilepsia →',
        'Neurologia; abdome agudo, hérnias e pós-operatórios de cirurgia geral → Cirurgia Geral; demais (infecções,',
        'viroses, gastroenterites, sintomas gerais) → Clínica Médica.',
        'Responda em JSON: {"itens":[{"codigo":"...","especialidade":"..."}]} com o código exatamente como recebido.',
        '',
        ...itens.map(i => `${i.codigo} - ${i.descricao}`),
      ].join('\n'),
      esquema: S => S.object({
        properties: {
          itens: S.array({ items: S.object({ properties: { codigo: S.string(), especialidade: S.enumString({ enum: [...ESPECIALIDADES] }) } }) }),
        },
      }),
    });
    const { itens: res } = lerJsonIA<{ itens?: { codigo?: string; especialidade?: string }[] }>(r, 'Resposta inválida da IA.');
    (res ?? []).forEach(x => { if (x.codigo && ehEspecialidade(x.especialidade)) saida.set(normalizarCodigoCid(x.codigo), x.especialidade); });
  } catch (e) {
    logErroSeguro('Classificação de especialidade pela IA falhou; usando a tabela por capítulo', e);
  }
  itens.forEach(i => { if (!saida.has(i.codigo)) saida.set(i.codigo, especialidadePorCapitulo(i.codigo)); });
  return saida;
};

/** Especialidade de um CID (em cache). Chamar assim que o CID é escolhido: a promessa segue em segundo plano. */
export const especialidadeDoCid = (codigo: string, descricao = ''): Promise<Especialidade> => {
  const c = normalizarCodigoCid(codigo);
  if (!c) return Promise.resolve('Clínica Médica');
  let p = cache.get(c);
  if (!p) {
    p = classificarLote([{ codigo: c, descricao }]).then(m => m.get(c) ?? especialidadePorCapitulo(c));
    cache.set(c, p);
  }
  return p;
};

/** Grava a especialidade na perícia (firestore.rules permite ao médico alterar só este campo). Silencioso. */
export const gravarEspecialidade = async (id: string, especialidade: Especialidade): Promise<void> => {
  try { await updateDoc(doc(db, 'periciasMenores', id), { especialidade }); } catch (e) { logErroSeguro('Gravar especialidade da perícia falhou', e); }
};

/** Depois do registro/edição: espera a classificação do CID (iniciada antes) e grava. Não bloqueia quem chama. */
export const categorizarPericiaEmSegundoPlano = (id: string, codigo: string, descricao = ''): void => {
  void especialidadeDoCid(codigo, descricao).then(e => gravarEspecialidade(id, e));
};

let completando = false;
/**
 * Completa os registros sem especialidade (ou com CID trocado na edição): agrupa por CID, classifica em lotes de 40
 * CID por chamada e grava. Roda uma vez por sessão por registro (só para quem pode gravar: médicos e Admin).
 */
export const completarEspecialidadesPendentes = async (
  lista: { id: string; cid?: string; cidCodigo?: string; especialidade?: string }[],
): Promise<void> => {
  if (completando) return;
  const pendentes = lista.filter(p => !ehEspecialidade(p.especialidade) && codigoCidDaPericia(p));
  if (!pendentes.length) return;
  completando = true;
  try {
    const porCid = new Map<string, { descricao: string; ids: string[] }>();
    pendentes.forEach(p => {
      const c = codigoCidDaPericia(p);
      const g = porCid.get(c) ?? { descricao: String(p.cid || '').replace(/^\s*\S+\s*-?\s*/, ''), ids: [] };
      g.ids.push(p.id);
      porCid.set(c, g);
    });
    const novos = [...porCid.keys()].filter(c => !cache.has(c));
    for (let i = 0; i < novos.length; i += 40) {
      const lote = novos.slice(i, i + 40);
      const prom = classificarLote(lote.map(c => ({ codigo: c, descricao: porCid.get(c)!.descricao })));
      lote.forEach(c => cache.set(c, prom.then(m => m.get(c) ?? especialidadePorCapitulo(c))));
      await prom;
    }
    for (const [c, g] of porCid) {
      const esp = await especialidadeDoCid(c);
      await Promise.all(g.ids.map(id => gravarEspecialidade(id, esp)));
    }
  } finally {
    completando = false;
  }
};
