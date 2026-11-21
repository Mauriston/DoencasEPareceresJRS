// Ficheiro: components/ficha/assessor/AssessorIAModal.tsx
// Assessor IA — chat em tela cheia aberto pelo botão "Assessor IA" do cabeçalho da Ficha do inspecionado (só
// Admin, user_medicos e user_medicos_mpi; só com IS em andamento — utils/assessorIA.ts).
//   - Ao abrir, sugestões de comando para a IS escolhida (tocar põe o texto na caixa, para completar e enviar).
//   - Com mais de uma IS em andamento, o seletor do topo troca a IS (e recomeça a conversa).
//   - Cada resposta traz a mensagem do Assessor e os campos gerados — Entrevista, Exame Clínico, Conclusão,
//     Laudo (um por finalidade) e CID —, cada um em bloco de código com o ícone Copiar, que copia o texto E o insere
//     no campo da IS (services/assessorIA.ts). Substituir um texto já gravado diferente pede confirmação.
//   - A conversa vive só nesta tela (não é gravada). O servidor junta os dados da IS a cada pedido
//     (servidor/assessor/: documentos em PDF já transcritos, entrevistas gravadas e histórico de IS).
// O texto da IA é mostrado como texto simples (nunca como HTML).
// Tema: SEMPRE escuro, em preto, independente do tema escolhido pelo usuário (cores explícitas black/white com
// transparência; nenhuma classe que mude com o tema do app).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '../../ui/Dialog';
import { useEscapeEmpilhado } from '../../../hooks/useEscapeEmpilhado';
import { conversarComAssessor, inserirCidNaIS, inserirLaudoNaIS, inserirRedacaoNaIS, textoDaResposta, type MensagemAssessor, type RespostaAssessorIA } from '../../../services/assessorIA';
import { CAMPOS_REDACAO, sugestoesDoAssessor, type CampoRedacao } from '../../../utils/assessorIA';
import { laudosDaIS } from '../../../utils/finalidadesMultiplas';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';

const Icone: React.FC<{ nome: string; girando?: boolean; tamanho?: number }> = ({ nome, girando, tamanho = 16 }) => (
  <span className={`material-symbols-outlined${girando ? ' animate-spin' : ''}`} style={{ fontSize: tamanho }} aria-hidden="true">{nome}</span>
);

interface Props {
  /** IS em andamento do inspecionado (a primeira é a padrão, salvo `isInicialId`). */
  inspecoes: InspecaoRecord[];
  isInicialId?: string | null;
  perfil: string | undefined;
  onClose: () => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

type Item =
  | { id: number; papel: 'usuario'; texto: string }
  | { id: number; papel: 'assessor'; resposta: RespostaAssessorIA };

/** Um campo gerado pela IA e o que inseri-lo grava. */
interface CampoGerado { chave: string; titulo: string; texto: string; atual: string; inserir: () => Promise<void> }

const CHAVE_RESPOSTA: Record<CampoRedacao, 'entrevista' | 'exameClinico' | 'conclusao'> = {
  redacaoEntrevista: 'entrevista', redacaoExameClinico: 'exameClinico', redacaoConclusao: 'conclusao',
};

/** Campo gerado em bloco de código: título acima, "txt" no canto e o ícone Copiar, que copia e insere na IS. */
const BlocoCampo: React.FC<{ campo: CampoGerado; inserido: boolean; inserindo: boolean; onCopiar: () => void }> = ({ campo, inserido, inserindo, onCopiar }) => {
  const rotulo = inserido ? 'Copiado e inserido na IS' : 'Copiar';
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/90">{campo.titulo}</h3>
      <div className="relative rounded-xl border border-white/10 bg-white/[0.04]">
        <span className="absolute left-4 top-2.5 text-xs text-white/40">txt</span>
        <div className="absolute right-2 top-1.5 group">
          <button type="button" onClick={onCopiar} disabled={inserindo} aria-busy={inserindo || undefined}
            aria-label={`${rotulo}: ${campo.titulo}`}
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <Icone nome={inserindo ? 'progress_activity' : inserido ? 'check' : 'content_copy'} girando={inserindo} tamanho={18} />
          </button>
          <span role="tooltip" className="pointer-events-none absolute right-0 top-9 whitespace-nowrap rounded-md bg-white/15 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">{rotulo}</span>
        </div>
        <pre className="pt-9 pb-4 px-4 text-sm text-white/90 whitespace-pre overflow-x-auto leading-relaxed"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>{campo.texto}</pre>
      </div>
    </section>
  );
};

export const AssessorIAModal: React.FC<Props> = ({ inspecoes, isInicialId, perfil, onClose, onAviso }) => {
  const [isId, setIsId] = useState<string>(() => (inspecoes.some(i => i.id === isInicialId) ? String(isInicialId) : inspecoes[0]?.id ?? ''));
  const is = inspecoes.find(i => i.id === isId) ?? inspecoes[0];
  const [itens, setItens] = useState<Item[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [inseridos, setInseridos] = useState<Set<string>>(new Set());
  const [inserindo, setInserindo] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ chave: string; campo: CampoGerado } | null>(null);
  const seq = useRef(0);
  const fimRef = useRef<HTMLDivElement>(null);
  const caixaRef = useRef<HTMLTextAreaElement>(null);
  useEscapeEmpilhado(onClose, !confirmar);

  // Trocar de IS recomeça a conversa.
  useEffect(() => { setItens([]); setErro(''); setInseridos(new Set()); }, [isId]);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [itens.length, enviando]);
  useEffect(() => { caixaRef.current?.focus(); }, []);

  const sugestoes = useMemo(() => (is ? sugestoesDoAssessor(is) : []), [is]);

  if (!is) return null;

  const enviar = async (comando: string) => {
    const t = comando.trim();
    if (!t || enviando) return;
    const usuario: Item = { id: ++seq.current, papel: 'usuario', texto: t };
    const proximos = [...itens, usuario];
    setItens(proximos);
    setTexto('');
    setErro('');
    setEnviando(true);
    const conversa: MensagemAssessor[] = proximos.map(i => (i.papel === 'usuario' ? { papel: 'usuario', texto: i.texto } : { papel: 'assessor', texto: textoDaResposta(i.resposta) }));
    try {
      const resposta = await conversarComAssessor(is.id, conversa);
      setItens(atual => [...atual, { id: ++seq.current, papel: 'assessor', resposta }]);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível falar com o Assessor.');
      // Devolve o comando à caixa para tentar de novo.
      setItens(atual => atual.filter(i => i.id !== usuario.id));
      setTexto(t);
    } finally {
      setEnviando(false);
    }
  };

  /** Campos gerados numa resposta, já ligados ao que gravam na IS. */
  const camposDa = (r: RespostaAssessorIA): CampoGerado[] => {
    const lista: CampoGerado[] = [];
    for (const { campo, rotulo } of CAMPOS_REDACAO) {
      const valor = r[CHAVE_RESPOSTA[campo]];
      if (valor) lista.push({ chave: campo, titulo: rotulo, texto: valor, atual: String(is[campo] ?? ''), inserir: () => inserirRedacaoNaIS(is.id, campo, valor) });
    }
    const atuais = laudosDaIS(is);
    r.laudos.forEach((l, i) => lista.push({
      chave: `laudo:${l.finalidade}`,
      titulo: r.laudos.length > 1 || atuais.length > 1 ? `Laudo — ${l.finalidade}` : 'Laudo',
      texto: l.laudo,
      atual: atuais.find(a => a.finalidade === l.finalidade)?.laudo ?? (i === 0 ? is.laudo || '' : ''),
      inserir: () => inserirLaudoNaIS(is.id, l.finalidade, l.laudo, perfil),
    }));
    if (r.cid) {
      const cid = r.cid;
      lista.push({ chave: 'cid', titulo: 'CID principal', texto: cid.descrAbrev, atual: is.cid || '', inserir: () => inserirCidNaIS(is.id, { descrAbrev: cid.descrAbrev, subcat: cid.subcat }) });
    }
    return lista;
  };

  const executarInsercao = async (chaveItem: string, campo: CampoGerado) => {
    setInserindo(chaveItem);
    try {
      await campo.inserir();
      setInseridos(s => new Set(s).add(chaveItem));
      onAviso(`${campo.titulo} copiado e inserido na IS ${is.is}.`);
    } catch (e: any) {
      onAviso(e?.message || `Não foi possível inserir ${campo.titulo}.`, 'error');
    } finally {
      setInserindo(null);
    }
  };
  /** Ícone Copiar: copia para a área de transferência e insere no campo da IS (substituir texto diferente pede confirmação). */
  const copiarEInserir = async (chaveItem: string, campo: CampoGerado) => {
    try { await navigator.clipboard.writeText(campo.texto); } catch { onAviso('Não foi possível copiar para a área de transferência.', 'error'); }
    if (campo.atual.trim() === campo.texto.trim()) { setInseridos(s => new Set(s).add(chaveItem)); onAviso(`${campo.titulo} copiado (já estava na IS).`); return; }
    if (campo.atual.trim()) setConfirmar({ chave: chaveItem, campo });
    else void executarInsercao(chaveItem, campo);
  };

  const tituloIS = (i: InspecaoRecord) => `IS ${i.is} · ${i.finalidade}`;

  const vazio = itens.length === 0;
  const chips = (
    <div className="flex flex-wrap justify-center gap-2">
      {sugestoes.map(s => (
        <button key={s.rotulo} type="button" disabled={enviando}
          onClick={() => { setTexto(s.comando); requestAnimationFrame(() => { const c = caixaRef.current; if (c) { c.focus(); c.setSelectionRange(c.value.length, c.value.length); } }); }}
          className="h-8 px-3 rounded-lg border border-white/15 text-sm text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50">
          {s.rotulo}
        </button>
      ))}
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Assessor IA" className="fixed inset-0 z-dialog bg-black text-white flex flex-col animate-fade-in [color-scheme:dark]">
      <div className="h-14 px-3 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0 pl-1">
          <h2 className="text-sm font-semibold text-white truncate">Assessor IA</h2>
          {inspecoes.length > 1 ? (
            <label className="block text-xs text-white/50">
              <span className="sr-only">Inspeção de Saúde</span>
              <select value={is.id} onChange={e => setIsId(e.target.value)} disabled={enviando}
                className="max-w-[70vw] bg-black text-white/70 hover:text-white rounded text-xs truncate focus:outline-none">
                {inspecoes.map(i => <option key={i.id} value={i.id}>{tituloIS(i)}</option>)}
              </select>
            </label>
          ) : <p className="text-xs text-white/50 truncate">{tituloIS(is)}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Icone nome="close" tamanho={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" aria-live="polite">
        <div className={`mx-auto w-full max-w-3xl px-4 ${vazio ? 'h-full flex flex-col justify-center' : 'py-6 space-y-6'}`}>
          {vazio ? (
            <div className="text-center space-y-3 -mt-10">
              <h3 className="font-heading text-h2 text-white">Como posso ajudar com a IS {is.is}?</h3>
              <p className="text-sm text-white/50 max-w-xl mx-auto">
                Redijo a Entrevista, o Exame Clínico, a Conclusão, o Laudo e o CID com os documentos em PDF, as entrevistas gravadas e o histórico de IS do inspecionado.
              </p>
            </div>
          ) : itens.map(item => item.papel === 'usuario' ? (
            <div key={item.id} className="flex justify-end">
              <p className="max-w-[85%] bg-white/10 text-white rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words">{item.texto}</p>
            </div>
          ) : (
            <div key={item.id} className="space-y-4">
              {item.resposta.mensagem && <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap break-words">{item.resposta.mensagem}</p>}
              {item.resposta.avisos.map(a => (
                <p key={a} role="note" className="flex gap-2 text-xs text-gold">
                  <Icone nome="warning" />{a}
                </p>
              ))}
              {camposDa(item.resposta).map(c => {
                const chaveItem = `${item.id}:${c.chave}`;
                return <BlocoCampo key={chaveItem} campo={c} inserido={inseridos.has(chaveItem)} inserindo={inserindo === chaveItem} onCopiar={() => void copiarEInserir(chaveItem, c)} />;
              })}
            </div>
          ))}

          {enviando && (
            <div role="status" className="flex items-center gap-2 text-sm text-white/50">
              <Icone nome="progress_activity" girando tamanho={18} />
              Lendo os dados da IS e redigindo… pode levar até um minuto.
            </div>
          )}
          {erro && <p role="alert" className="flex gap-2 text-sm text-white"><Icone nome="error" tamanho={18} />{erro}</p>}
          <div ref={fimRef} />
        </div>
      </div>

      <form className="shrink-0 px-4 pb-4" onSubmit={e => { e.preventDefault(); void enviar(texto); }}>
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <div className="rounded-2xl border border-white/15 bg-white/5 focus-within:border-white/30 px-4 pt-3 pb-2 transition-colors">
            <label htmlFor="assessor-comando" className="sr-only">Comando para o Assessor</label>
            <textarea
              id="assessor-comando" ref={caixaRef} value={texto} onChange={e => setTexto(e.target.value)} rows={2}
              placeholder={`Ex.: Redija a IS ${is.is}. Inspecionado relata…`}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(texto); } }}
              className="w-full max-h-60 resize-none bg-transparent text-base md:text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-white/40">Enter envia · Shift+Enter quebra a linha</span>
              <button type="submit" disabled={!texto.trim() || enviando} aria-busy={enviando || undefined} aria-label="Enviar comando" title="Enviar"
                className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center hover:bg-white/85 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed transition-colors">
                <Icone nome={enviando ? 'progress_activity' : 'arrow_upward'} girando={enviando} tamanho={18} />
              </button>
            </div>
          </div>
          {vazio && chips}
          <p className="text-center text-xs text-white/40">A IA pode errar: confira cada texto antes de copiar para a IS — o laudo é ato do perito.</p>
        </div>
      </form>

      {confirmar && (
        <ConfirmDialog
          title={`Substituir ${confirmar.campo.titulo}?`}
          message={<>O texto foi copiado. A IS já tem um texto diferente neste campo: substituir pelo texto do Assessor?</>}
          confirmLabel="Substituir"
          onConfirm={() => { const c = confirmar; setConfirmar(null); void executarInsercao(c.chave, c.campo); }}
          onCancel={() => setConfirmar(null)}
        />
      )}
    </div>
  );
};
