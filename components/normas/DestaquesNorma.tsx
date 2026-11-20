// Ficheiro: components/normas/DestaquesNorma.tsx
// "Destaques do Presidente": formatação de trechos pelo Admin sobre o texto renderizado das normas (Portaria,
// DGPM-406, Legislação), gravada no Firestore (services/destaquesNormas.ts) sem alterar os .md.
// - Admin: botão direito sobre a seleção (no celular, toque longo / seleção) abre o menu: negrito, destaque
//   amarelo, ambos, sublinhado, citação (o parágrafo inteiro), nota e remover.
// - Todos os logados veem as marcações, com estilo próprio (styles/app.css, .jrs-*), a legenda
//   "Destaques do Presidente" e o botão para ocultá-las (preferência deste aparelho).
// - Marcação cujo trecho não existe mais no texto fica "órfã": o Admin as revê numa lista.
// As marcações vão no DOM só dentro de .md-content (HTML do marked, que o React não reconcilia) e são
// reaplicadas a cada renderização da página (o HTML do texto pode ser recriado).
import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavContext } from '../../context/NavContext';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import {
  criarDestaque, observarDestaques, removerDestaque, type DestaqueRecord, type PaginaNorma,
} from '../../services/destaquesNormas';
import { criarAncora, localizarAncora, TIPOS_DESTAQUE, type TipoDestaque } from '../../utils/destaquesTexto';

const CHAVE_OCULTOS = 'jrs-destaques-ocultos';
const BLOCOS = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th, .md-item';
const rotuloTipo = (t: TipoDestaque) => TIPOS_DESTAQUE.find(x => x.tipo === t)?.rotulo ?? t;

// ─── DOM ─────────────────────────────────────────────────────────────────────

const nosDeTexto = (raiz: HTMLElement): Text[] => {
  const nos: Text[] = [];
  raiz.querySelectorAll<HTMLElement>('.md-content').forEach(bloco => {
    const w = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) nos.push(n as Text);
  });
  return nos;
};

/** Posição de um ponto do DOM no texto concatenado dos .md-content; null fora deles. */
const posicaoNoTexto = (nos: Text[], no: Node, offset: number): number | null => {
  const ponto = document.createRange();
  ponto.setStart(no, offset);
  let acc = 0;
  for (const t of nos) {
    if (t === no) return acc + offset;
    if (ponto.comparePoint(t, 0) >= 0) return acc; // este nó começa depois do ponto
    acc += t.length;
  }
  return null;
};

const limpar = (raiz: HTMLElement) => {
  raiz.querySelectorAll('span.jrs-d').forEach(s => {
    const pai = s.parentNode;
    if (!pai) return;
    while (s.firstChild) pai.insertBefore(s.firstChild, s);
    pai.removeChild(s);
  });
  raiz.querySelectorAll('.jrs-citacao').forEach(b => b.classList.remove('jrs-citacao'));
  raiz.querySelectorAll<HTMLElement>('.md-content').forEach(b => b.normalize());
};

/** Aplica as marcações; devolve os ids das órfãs. */
const aplicar = (raiz: HTMLElement, destaques: DestaqueRecord[]): string[] => {
  limpar(raiz);
  const nos = nosDeTexto(raiz);
  const completo = nos.map(n => n.data).join('');
  const orfas: string[] = [];
  const faixas: { d: DestaqueRecord; ini: number; fim: number }[] = [];
  destaques.forEach(d => {
    const pos = localizarAncora(completo, d);
    if (pos) faixas.push({ d, ini: pos[0], fim: pos[1] }); else orfas.push(d.id);
  });
  if (!faixas.length) return orfas;
  // Por nó: corta nas bordas de todas as faixas e embrulha cada pedaço com as classes que o cobrem.
  let acc = 0;
  for (const no of nos) {
    const a = acc, b = acc + no.length;
    acc = b;
    const aqui = faixas.filter(f => f.ini < b && f.fim > a);
    if (!aqui.length) continue;
    const cortes = new Set<number>([0, no.length]);
    aqui.forEach(f => { cortes.add(Math.max(0, f.ini - a)); cortes.add(Math.min(no.length, f.fim - a)); });
    const pontos = [...cortes].sort((x, y) => x - y);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < pontos.length - 1; i++) {
      const [p, q] = [pontos[i], pontos[i + 1]];
      if (p === q) continue;
      const txt = document.createTextNode(no.data.slice(p, q));
      const cobrem = aqui.filter(f => f.ini <= a + p && f.fim >= a + q);
      if (!cobrem.length) { frag.appendChild(txt); continue; }
      const span = document.createElement('span');
      span.className = ['jrs-d', ...cobrem.map(f => (f.d.tipo === 'citacao' ? 'jrs-cit' : `jrs-${f.d.tipo}`))].join(' ');
      span.dataset.jrsIds = cobrem.map(f => f.d.id).join(' ');
      const nota = cobrem.find(f => f.d.tipo === 'nota' && f.fim === a + q);
      if (nota) { span.classList.add('jrs-nota-fim'); span.dataset.nota = nota.d.nota ?? ''; span.tabIndex = 0; span.setAttribute('role', 'button'); span.setAttribute('aria-label', `Nota do Presidente: ${nota.d.nota ?? ''}`); }
      span.appendChild(txt);
      frag.appendChild(span);
    }
    const bloco = no.parentElement?.closest(BLOCOS);
    if (bloco && aqui.some(f => f.d.tipo === 'citacao')) bloco.classList.add('jrs-citacao');
    no.parentNode?.replaceChild(frag, no);
  }
  return orfas;
};

// ─── Componente ──────────────────────────────────────────────────────────────

interface Menu {
  x: number; y: number;
  faixa: [number, number] | null;
  alvos: string[];
  etapaNota?: boolean;
}

export const DestaquesNorma: React.FC<{
  pagina: PaginaNorma;
  doc: string;
  raiz: React.RefObject<HTMLElement | null>;
  className?: string;
}> = ({ pagina, doc, raiz, className = '' }) => {
  const nav = useContext(NavContext);
  const admin = nav?.authUser?.perfil === 'admin';
  const [todos, setTodos] = useState<DestaqueRecord[]>([]);
  const [ocultos, setOcultos] = useState(() => { try { return localStorage.getItem(CHAVE_OCULTOS) === '1'; } catch { return false; } });
  const [orfas, setOrfas] = useState<string[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [nota, setNota] = useState('');
  const [verNota, setVerNota] = useState<{ x: number; y: number; texto: string } | null>(null);
  const [revisarOrfas, setRevisarOrfas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => (nav?.authUser ? observarDestaques(pagina, setTodos) : undefined), [pagina, nav?.authUser]);
  const destaques = useMemo(() => todos.filter(d => d.doc === doc), [todos, doc]);

  // Reaplica a cada renderização (sem deps): o texto pode ter sido recriado pelo React.
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const novas = aplicar(el, destaques);
    el.classList.toggle('jrs-ocultos', ocultos);
    setOrfas(prev => (prev.join() === novas.join() ? prev : novas));
  });

  useEffect(() => { try { localStorage.setItem(CHAVE_OCULTOS, ocultos ? '1' : '0'); } catch { /* sem armazenamento */ } }, [ocultos]);

  // Menu do Admin: botão direito (desktop) e seleção por toque longo (celular).
  useEffect(() => {
    const el = raiz.current;
    if (!el || !admin) return;
    const abrir = (x: number, y: number, alvo: Element | null) => {
      const sel = window.getSelection();
      const nos = nosDeTexto(el);
      let faixa: [number, number] | null = null;
      let alvos: string[] = [];
      if (sel && !sel.isCollapsed && sel.rangeCount) {
        const r = sel.getRangeAt(0);
        const ini = posicaoNoTexto(nos, r.startContainer, r.startOffset);
        const fim = posicaoNoTexto(nos, r.endContainer, r.endOffset);
        if (ini !== null && fim !== null && fim > ini) faixa = [ini, fim];
        (el.querySelectorAll('span.jrs-d') as NodeListOf<HTMLElement>).forEach(s => { if (r.intersectsNode(s)) alvos.push(...(s.dataset.jrsIds ?? '').split(' ')); });
      }
      const s = alvo?.closest("span.jrs-d") as HTMLElement | null | undefined;
      if (s) alvos.push(...(s.dataset.jrsIds ?? '').split(' '));
      alvos = [...new Set(alvos.filter(Boolean))];
      if (!faixa && !alvos.length) return false;
      setNota('');
      setErro(null);
      setMenu({ x, y, faixa, alvos });
      return true;
    };
    const aoMenu = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.md-content')) return;
      if (abrir(e.clientX, e.clientY, e.target as Element)) e.preventDefault();
    };
    // Celular: o toque longo seleciona; com a seleção parada, o menu abre logo abaixo dela.
    let t: ReturnType<typeof setTimeout> | undefined;
    const toque = window.matchMedia('(pointer: coarse)');
    const aoSelecionar = () => {
      clearTimeout(t);
      if (!toque.matches) return;
      t = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount || !el.contains(sel.anchorNode)) return;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        abrir(rect.left + rect.width / 2, rect.bottom + 8, null);
      }, 700);
    };
    el.addEventListener('contextmenu', aoMenu);
    document.addEventListener('selectionchange', aoSelecionar);
    return () => { el.removeEventListener('contextmenu', aoMenu); document.removeEventListener('selectionchange', aoSelecionar); clearTimeout(t); };
  }, [raiz, admin]);

  // Notas: clique (ou Enter) no trecho mostra o texto.
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const mostrar = (alvo: Element | null) => {
      const s = alvo?.closest("span.jrs-nota-fim") as HTMLElement | null | undefined;
      if (!s || el.classList.contains('jrs-ocultos')) return false;
      const r = s.getBoundingClientRect();
      setVerNota({ x: r.left, y: r.bottom + 6, texto: s.dataset.nota ?? '' });
      return true;
    };
    const clique = (e: MouseEvent) => { mostrar(e.target as Element); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Enter' && mostrar(e.target as Element)) e.preventDefault(); };
    el.addEventListener('click', clique);
    el.addEventListener('keydown', tecla);
    return () => { el.removeEventListener('click', clique); el.removeEventListener('keydown', tecla); };
  }, [raiz]);

  // Fecha menu/nota com Esc ou clique fora.
  useEffect(() => {
    if (!menu && !verNota) return;
    const fora = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) { setMenu(null); setVerNota(null); } };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setVerNota(null); } };
    const t = setTimeout(() => document.addEventListener('mousedown', fora), 0);
    document.addEventListener('keydown', esc);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [menu, verNota]);

  const salvar = async (tipo: TipoDestaque, textoNota?: string) => {
    const el = raiz.current;
    if (!el || !menu?.faixa || !nav?.authUser) return;
    const completo = nosDeTexto(el).map(n => n.data).join('');
    const ancora = criarAncora(completo, menu.faixa[0], menu.faixa[1]);
    if (!ancora.texto.trim()) { setErro('Selecione um trecho com texto.'); return; }
    try {
      await criarDestaque({ pagina, doc, tipo, ...ancora, ...(textoNota ? { nota: textoNota } : {}), criadoPor: nav.authUser.uid });
      window.getSelection()?.removeAllRanges();
      setMenu(null);
    } catch {
      setErro('Não foi possível salvar o destaque.');
    }
  };
  const remover = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(removerDestaque));
      setMenu(null);
    } catch {
      setErro('Não foi possível remover.');
    }
  };

  const listaOrfas = destaques.filter(d => orfas.includes(d.id));
  const tiposUsados: TipoDestaque[] = Array.from(new Set<TipoDestaque>(destaques.filter(d => !orfas.includes(d.id)).map(d => d.tipo)));
  const pos = (x: number, y: number, w: number) => ({
    left: Math.max(8, Math.min(x, window.innerWidth - w - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - 340)),
  });

  if (!destaques.length && !admin) return null;
  return (
    <>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink-3 ${className}`}>
        <span className="inline-flex items-center gap-1.5 font-bold text-navy">
          <span className="material-symbols-outlined text-[18px] text-gold-ink" aria-hidden="true">ink_highlighter</span>
          Destaques do Presidente
        </span>
        {tiposUsados.length > 0 ? (
          <span className="flex flex-wrap items-center gap-2" aria-label="Legenda">
            {tiposUsados.map(t => <span key={t} className={`jrs-legenda jrs-d jrs-${t}`}>{rotuloTipo(t)}</span>)}
          </span>
        ) : admin && <span>Selecione um trecho e use o botão direito (no celular, toque longo) para formatar.</span>}
        <span className="flex-1" />
        {admin && listaOrfas.length > 0 && (
          <Button variant="secondary" size="sm" icon="link_off" onClick={() => setRevisarOrfas(true)}>
            {listaOrfas.length} {listaOrfas.length === 1 ? 'órfã' : 'órfãs'}
          </Button>
        )}
        {destaques.length > 0 && (
          <Button variant="ghost" size="sm" icon={ocultos ? 'visibility' : 'visibility_off'} onClick={() => setOcultos(o => !o)} aria-pressed={ocultos}>
            {ocultos ? 'Mostrar destaques' : 'Ocultar destaques'}
          </Button>
        )}
      </div>

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Formatar trecho"
          className="fixed z-dropdown w-64 rounded-xl border border-line bg-white p-1.5 shadow-lg"
          style={pos(menu.x, menu.y, 256)}
        >
          {menu.etapaNota ? (
            <div className="flex flex-col gap-2 p-1.5">
              <label htmlFor="jrs-nota" className="text-xs font-bold text-ink-3">Nota do Presidente</label>
              <textarea
                id="jrs-nota" autoFocus rows={3} value={nota} onChange={e => setNota(e.target.value)}
                className="w-full rounded-lg border border-line bg-white p-2 text-base md:text-sm text-ink focus:outline-none focus:border-navy"
              />
              <div className="flex justify-end gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setMenu(m => (m ? { ...m, etapaNota: false } : m))}>Voltar</Button>
                <Button variant="primary" size="sm" disabled={!nota.trim()} onClick={() => salvar('nota', nota.trim())}>Salvar nota</Button>
              </div>
            </div>
          ) : (
            <>
              {TIPOS_DESTAQUE.map(t => (
                <button
                  key={t.tipo} type="button" role="menuitem" disabled={!menu.faixa}
                  onClick={() => (t.tipo === 'nota' ? setMenu(m => (m ? { ...m, etapaNota: true } : m)) : salvar(t.tipo))}
                  className="w-full flex items-center gap-2.5 px-2.5 min-h-10 rounded-lg text-sm text-ink text-left hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">{t.icone}</span>
                  {t.rotulo}
                </button>
              ))}
              <div className="my-1 border-t border-line" />
              <button
                type="button" role="menuitem" disabled={!menu.alvos.length} onClick={() => remover(menu.alvos)}
                className="w-full flex items-center gap-2.5 px-2.5 min-h-10 rounded-lg text-sm text-wine text-left hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">format_clear</span>
                Remover{menu.alvos.length > 1 ? ` (${menu.alvos.length})` : ''}
              </button>
            </>
          )}
          {erro && <p role="alert" className="px-2.5 pb-1.5 pt-1 text-xs text-wine">{erro}</p>}
        </div>
      )}

      {verNota && (
        <div ref={menuRef} role="dialog" aria-label="Nota do Presidente" className="fixed z-dropdown max-w-xs rounded-xl border border-line bg-white p-3 shadow-lg" style={pos(verNota.x, verNota.y, 320)}>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-gold-ink shrink-0" aria-hidden="true">sticky_note_2</span>
            <p className="flex-1 text-sm text-ink whitespace-pre-wrap">{verNota.texto}</p>
            <IconButton icon="close" label="Fechar a nota" variant="secondary" className="!w-8 !h-8 border-line shrink-0" onClick={() => setVerNota(null)} />
          </div>
        </div>
      )}

      {revisarOrfas && (
        <Drawer title="Destaques órfãos" icon="link_off" onClose={() => setRevisarOrfas(false)}>
          <p className="text-sm text-ink-3 mb-3">O trecho destas marcações não foi encontrado no texto atual (o texto da norma mudou). Recrie-as no ponto certo e remova as antigas.</p>
          <ul className="divide-y divide-line">
            {listaOrfas.map(d => (
              <li key={d.id} className="flex items-start gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink-3">{rotuloTipo(d.tipo)}</p>
                  <p className="text-sm text-ink break-words">“{d.texto}”</p>
                  {d.nota && <p className="text-xs text-ink-3 mt-1">Nota: {d.nota}</p>}
                </div>
                <Button variant="secondary" size="sm" icon="delete" onClick={() => remover([d.id])}>Remover</Button>
              </li>
            ))}
          </ul>
        </Drawer>
      )}
    </>
  );
};
