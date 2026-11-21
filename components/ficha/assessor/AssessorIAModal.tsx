// Ficheiro: components/ficha/assessor/AssessorIAModal.tsx
// Assessor IA — chat em tela cheia aberto pelo botão "Assessor IA" do cabeçalho da Ficha do inspecionado (só
// Admin, user_medicos e user_medicos_mpi; só com IS em andamento — utils/assessorIA.ts).
//   - Ao abrir, sugestões de comando para a IS escolhida (tocar põe o texto na caixa, para completar e enviar).
//   - Com mais de uma IS em andamento, o seletor do topo troca a IS (e recomeça a conversa).
//   - Cada resposta traz a mensagem do Assessor e os campos gerados — Entrevista, Exame Clínico, Conclusão,
//     Laudo (um por finalidade) e CID —, cada um com "Copiar" e "Inserir na IS" (services/assessorIA.ts).
//     Substituir um texto já gravado diferente pede confirmação.
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

/** Botão do tema escuro: contorno claro (padrão) ou sólido branco (principal). */
const botaoEscuro = (principal = false) =>
  `inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap rounded-lg font-bold text-sm transition-colors min-h-9 px-3 ` +
  `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 disabled:cursor-not-allowed ` +
  (principal ? 'bg-white text-black hover:bg-white/85' : 'bg-transparent text-white border border-white/25 hover:bg-white/10');

const Icone: React.FC<{ nome: string; girando?: boolean }> = ({ nome, girando }) => (
  <span className={`material-symbols-outlined text-[18px]${girando ? ' animate-spin' : ''}`} aria-hidden="true">{nome}</span>
);

/** Copiar no tema escuro, com a confirmação na própria etiqueta. */
const CopiarEscuro: React.FC<{ texto: string; titulo: string }> = ({ texto, titulo }) => {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => { if (!copiado) return; const t = window.setTimeout(() => setCopiado(false), 1800); return () => window.clearTimeout(t); }, [copiado]);
  return (
    <button type="button" title={titulo} aria-label={titulo} className={botaoEscuro()}
      onClick={async () => { try { await navigator.clipboard.writeText(texto); setCopiado(true); } catch { /* sem permissão */ } }}>
      <Icone nome={copiado ? 'check' : 'content_copy'} />{copiado ? 'Copiado' : 'Copiar'}
    </button>
  );
};

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

const CartaoCampo: React.FC<{ campo: CampoGerado; inserido: boolean; onInserir: () => void; inserindo: boolean }> = ({ campo, inserido, onInserir, inserindo }) => (
  <section className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
    <header className="px-4 py-2 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-white">{campo.titulo}</h3>
      <div className="flex items-center gap-2">
        <CopiarEscuro texto={campo.texto} titulo={`Copiar ${campo.titulo}`} />
        <button type="button" className={botaoEscuro(!inserido)} disabled={inserido || inserindo} aria-busy={inserindo || undefined} onClick={onInserir}>
          <Icone nome={inserindo ? 'progress_activity' : inserido ? 'check' : 'input'} girando={inserindo} />{inserido ? 'Inserido' : 'Inserir na IS'}
        </button>
      </div>
    </header>
    <pre className="p-4 text-sm text-white/90 whitespace-pre-wrap break-words font-sans leading-relaxed">{campo.texto}</pre>
  </section>
);

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
      onAviso(`${campo.titulo} inserido na IS ${is.is}.`);
    } catch (e: any) {
      onAviso(e?.message || `Não foi possível inserir ${campo.titulo}.`, 'error');
    } finally {
      setInserindo(null);
    }
  };
  const pedirInsercao = (chaveItem: string, campo: CampoGerado) => {
    if (campo.atual.trim() && campo.atual.trim() !== campo.texto.trim()) setConfirmar({ chave: chaveItem, campo });
    else void executarInsercao(chaveItem, campo);
  };

  const tituloIS = (i: InspecaoRecord) => `IS ${i.is} · ${i.finalidade}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="Assessor IA" className="fixed inset-0 z-dialog bg-black text-white flex flex-col animate-fade-in [color-scheme:dark]">
      <div className="px-4 py-3 bg-black border-b border-white/10 text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[20px] text-gold shrink-0" aria-hidden="true">auto_awesome</span>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-base text-white truncate">Assessor IA</h2>
            {inspecoes.length > 1 ? (
              <label className="flex items-center gap-1 text-xs text-white/80">
                <span className="sr-only">Inspeção de Saúde</span>
                <select value={is.id} onChange={e => setIsId(e.target.value)} disabled={enviando}
                  className="max-w-[70vw] bg-black text-white border border-white/30 rounded px-1 py-0.5 text-xs truncate">
                  {inspecoes.map(i => <option key={i.id} value={i.id}>{tituloIS(i)}</option>)}
                </select>
              </label>
            ) : <p className="text-xs text-white/70 truncate">{tituloIS(is)}</p>}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" aria-live="polite">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 md:py-6 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-sm text-white/85">
              Redijo a Entrevista, o Exame Clínico, a Conclusão, o Laudo e o CID da <strong>IS {is.is}</strong> ({is.finalidade}), juntando ao seu comando os exames, atestados e relatórios já enviados em PDF, as entrevistas gravadas e o histórico de IS do inspecionado.
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-gold">Sugestões de comandos</p>
            <div className="flex flex-wrap gap-2">
              {sugestoes.map(s => (
                <button key={s.rotulo} type="button" disabled={enviando}
                  onClick={() => { setTexto(s.comando); requestAnimationFrame(() => { const c = caixaRef.current; if (c) { c.focus(); c.setSelectionRange(c.value.length, c.value.length); } }); }}
                  className="min-h-9 px-3 rounded-full border border-white/25 text-sm text-white hover:bg-white/10 disabled:opacity-50 text-left">
                  {s.rotulo}
                </button>
              ))}
            </div>
          </div>

          {itens.map(item => item.papel === 'usuario' ? (
            <div key={item.id} className="flex justify-end">
              <p className="max-w-[85%] bg-white/15 text-white rounded-xl rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap break-words">{item.texto}</p>
            </div>
          ) : (
            <div key={item.id} className="space-y-3">
              {item.resposta.mensagem && (
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-[20px] text-gold shrink-0 mt-1" aria-hidden="true">auto_awesome</span>
                  <p className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm px-4 py-2 text-sm text-white/90 whitespace-pre-wrap break-words">{item.resposta.mensagem}</p>
                </div>
              )}
              {item.resposta.avisos.map(a => (
                <p key={a} role="note" className="flex gap-2 bg-gold/15 border border-gold/30 rounded-lg px-3 py-2 text-xs text-white">
                  <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">warning</span>{a}
                </p>
              ))}
              {camposDa(item.resposta).map(c => {
                const chaveItem = `${item.id}:${c.chave}`;
                return <CartaoCampo key={chaveItem} campo={c} inserido={inseridos.has(chaveItem)} inserindo={inserindo === chaveItem} onInserir={() => pedirInsercao(chaveItem, c)} />;
              })}
            </div>
          ))}

          {enviando && (
            <div role="status" className="flex items-center gap-2 text-sm text-white/70">
              <span className="material-symbols-outlined animate-spin text-[20px] text-gold" aria-hidden="true">progress_activity</span>
              O Assessor está lendo os dados da IS e redigindo… pode levar até um minuto.
            </div>
          )}
          {erro && <div role="alert" className="bg-wine/20 border border-wine/60 rounded-xl p-3 text-sm text-white font-semibold">{erro}</div>}
          <div ref={fimRef} />
        </div>
      </div>

      <form className="shrink-0 border-t border-white/10 bg-black" onSubmit={e => { e.preventDefault(); void enviar(texto); }}>
        <div className="mx-auto w-full max-w-3xl px-4 py-3 space-y-1">
          <div className="flex items-end gap-2">
            <label htmlFor="assessor-comando" className="sr-only">Comando para o Assessor</label>
            <textarea
              id="assessor-comando" ref={caixaRef} value={texto} onChange={e => setTexto(e.target.value)} rows={3}
              placeholder={`Ex.: Redija a IS ${is.is}. Inspecionado relata…`}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void enviar(texto); } }}
              className="w-full min-h-10 max-h-60 resize-y bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-base md:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/60"
            />
            <button type="submit" className={`${botaoEscuro(true)} min-h-10 px-4`} disabled={!texto.trim() || enviando} aria-busy={enviando || undefined} aria-label="Enviar comando">
              <Icone nome={enviando ? 'progress_activity' : 'send'} girando={enviando} />Enviar
            </button>
          </div>
          <p className="text-xs text-white/50">Ctrl+Enter envia. A IA pode errar: confira cada texto antes de inserir — o laudo é ato do perito.</p>
        </div>
      </form>

      {confirmar && (
        <ConfirmDialog
          title={`Substituir ${confirmar.campo.titulo}?`}
          message={<>A IS já tem um texto diferente neste campo. Inserir o texto do Assessor substitui o atual.</>}
          confirmLabel="Substituir"
          onConfirm={() => { const c = confirmar; setConfirmar(null); void executarInsercao(c.chave, c.campo); }}
          onCancel={() => setConfirmar(null)}
        />
      )}
    </div>
  );
};
