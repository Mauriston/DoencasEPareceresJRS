// Ficheiro: components/ficha/guias/PaginasPdf.tsx
// Carrossel das páginas de um PDF (Ficha › Guias e Ficha › Outros): DUAS páginas lado a lado (uma em telas
// estreitas), cada uma desenhada num <canvas> pelo pdf.js a
// partir do PRÓPRIO PDF gerado no servidor (o mesmo que é impresso e enviado por e-mail — sem divergência
// entre a tela e o documento). Setas ‹ › (também ← → no teclado e arrastar para o lado no toque) e
// "Páginas X–Y de N"; avança de 2 em 2. O tamanho da página (proporção A4) sai da ALTURA livre da janela
// (100dvh menos o que está acima do visor e a barra das setas), para o visor inteiro caber sem rolar; é o
// mesmo em Guias e Outros. PDF de uma página: centralizada, sem setas. A nitidez segue o devicePixelRatio.
// O pdf.js (pdfjs-dist, build "legacy" — Safari/iOS mais antigos) só é baixado quando a aba Guias abre.
// Recebe os BYTES do PDF (quem monta baixa pelo repasse do servidor — o Storage não libera leitura direta
// por script de outro domínio, CORS), não a URL.
import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '../../ui/IconButton';

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPagina>; destroy: () => Promise<void> };
type PdfPagina = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement; viewport: { width: number; height: number } }) => { promise: Promise<void>; cancel: () => void };
};

let pdfjsPromise: Promise<{ getDocument: (o: { data: Uint8Array }) => { promise: Promise<PdfDoc>; destroy: () => Promise<void> } }> | null = null;
const carregarPdfjs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs as never;
    }).catch(e => { pdfjsPromise = null; throw e; });
  }
  return pdfjsPromise;
};

const A4 = Math.SQRT2; // altura / largura
const LARGURA_PAGINA_MAX = 560;
const ALTURA_MIN = 240;
const LARGURA_DUAS = 560; // abaixo disto (largura útil do visor), uma página por vez
const GAP = 12;
const ALTURA_BARRA = 56; // setas + "Páginas X–Y de N" + espaçamento
const MARGEM_INFERIOR = 88; // barra de ações da aba (fixa no rodapé a partir de md) + folga

/** Tamanho (px CSS) de cada página: cabe na altura livre e na largura útil, em proporção A4. Puro (testável). */
export const tamanhoPagina = (larguraUtil: number, alturaLivre: number): { porVez: 1 | 2; largura: number; altura: number } => {
  const porVez: 1 | 2 = larguraUtil >= LARGURA_DUAS ? 2 : 1;
  const porLargura = (larguraUtil - GAP * (porVez - 1)) / porVez;
  const porAltura = Math.max(ALTURA_MIN, alturaLivre) / A4;
  const largura = Math.max(0, Math.floor(Math.min(LARGURA_PAGINA_MAX, porLargura, porAltura)));
  return { porVez, largura, altura: Math.floor(largura * A4) };
};

const PaginaCanvas: React.FC<{ doc: PdfDoc; n: number; total: number; largura: number; altura: number; onErro: (m: string) => void }> = ({ doc, n, total, largura, altura, onErro }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [desenhando, setDesenhando] = useState(false);
  useEffect(() => {
    if (!largura || !canvas.current) return;
    let vivo = true;
    let render: { cancel: () => void } | null = null;
    setDesenhando(true);
    doc.getPage(n).then(p => {
      if (!vivo || !canvas.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const base = p.getViewport({ scale: 1 });
      // Cabe na caixa A4 (largura × altura) mantendo a proporção da própria página.
      const escala = Math.min(largura / base.width, altura / base.height);
      const vp = p.getViewport({ scale: escala * dpr });
      const c = canvas.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      c.style.width = `${Math.floor(base.width * escala)}px`;
      c.style.height = `${Math.floor(base.height * escala)}px`;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const t = p.render({ canvasContext: ctx, canvas: c, viewport: vp });
      render = t;
      return t.promise;
    }).catch(e => { if (vivo && (e as { name?: string })?.name !== 'RenderingCancelledException') onErro('Não foi possível desenhar a página.'); })
      .finally(() => { if (vivo) setDesenhando(false); });
    return () => { vivo = false; render?.cancel(); };
  }, [doc, n, largura, altura]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: largura, height: altura }}>
      <canvas ref={canvas} aria-label={`Página ${n} de ${total}`} role="img" className="bg-white border border-line max-w-full" />
      {desenhando && (
        <span className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Carregando página">
          <span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" />
        </span>
      )}
    </div>
  );
};

interface Props {
  /** Bytes do PDF. null = ainda baixando. */
  dados: ArrayBuffer | null;
  /** Rótulo acessível do documento (ex.: "Guias de exames da IS 123"). */
  rotulo: string;
  /** Erro ao obter o PDF (ex.: PDF apagado). */
  erroUrl?: string;
}

export const PaginasPdf: React.FC<Props> = ({ dados, rotulo, erroUrl }) => {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [pagina, setPagina] = useState(1); // primeira página visível
  const [erro, setErro] = useState('');
  const [tam, setTam] = useState<{ porVez: 1 | 2; largura: number; altura: number }>({ porVez: 1, largura: 0, altura: 0 });
  const caixa = useRef<HTMLDivElement>(null);
  const toque = useRef<number | null>(null);

  // Abre o PDF (novos bytes → volta à página 1).
  useEffect(() => {
    setDoc(null); setPagina(1); setErro('');
    if (!dados) return;
    let vivo = true;
    let tarefa: { destroy: () => Promise<void> } | null = null;
    carregarPdfjs()
      // Cópia: o pdf.js transfere (e esvazia) o buffer para o worker.
      .then(pdfjs => { tarefa = pdfjs.getDocument({ data: new Uint8Array(dados.slice(0)) }); return (tarefa as unknown as { promise: Promise<PdfDoc> }).promise; })
      .then(d => { if (vivo) setDoc(d); else void d.destroy(); })
      .catch(e => { console.error('PaginasPdf', e); if (vivo) setErro('Não foi possível abrir as páginas do PDF.'); });
    return () => { vivo = false; void tarefa?.destroy(); };
  }, [dados]);

  // Tamanho das páginas: largura útil do visor e altura livre da janela (do topo do visor, no documento, até o
  // fim de 100dvh, menos a barra das setas) — independe da rolagem atual.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => {
      const cs = getComputedStyle(el);
      const padX = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0');
      const padY = parseFloat(cs.paddingTop || '0') + parseFloat(cs.paddingBottom || '0');
      const util = el.clientWidth - padX;
      const vh = window.visualViewport?.height || window.innerHeight;
      const topo = el.getBoundingClientRect().top + window.scrollY;
      const livre = vh - topo - padY - ALTURA_BARRA - MARGEM_INFERIOR;
      const novo = tamanhoPagina(util, livre);
      setTam(t => (t.porVez === novo.porVez && t.largura === novo.largura && t.altura === novo.altura ? t : novo));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener('resize', medir);
    return () => { ro.disconnect(); window.removeEventListener('resize', medir); };
  }, []);

  const total = doc?.numPages ?? 0;
  const porVez = tam.porVez;
  // Primeira página de cada "folha" (1, 3, 5… com 2 por vez).
  const inicio = Math.max(1, Math.min(pagina, total || 1) - ((Math.min(pagina, total || 1) - 1) % porVez));
  const fim = Math.min(total, inicio + porVez - 1);
  const ir = (n: number) => { if (total) setPagina(Math.min(total, Math.max(1, n))); };
  const avancar = () => ir(inicio + porVez);
  const voltar = () => ir(inicio - porVez);
  const mensagem = erroUrl || erro;
  const comSetas = total > porVez;

  return (
    <div
      role="group" aria-roledescription="carrossel" aria-label={rotulo} tabIndex={0}
      onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); avancar(); } if (e.key === 'ArrowLeft') { e.preventDefault(); voltar(); } }}
      className="space-y-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <div ref={caixa} className="relative w-full flex justify-center rounded-xl bg-surface-2 border border-line p-2 sm:p-3"
        style={{ minHeight: tam.altura ? tam.altura + 16 : ALTURA_MIN }}
        onTouchStart={e => { toque.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={e => {
          const x0 = toque.current; toque.current = null;
          const x1 = e.changedTouches[0]?.clientX;
          if (x0 === null || x1 === undefined || Math.abs(x1 - x0) < 50) return;
          if (x1 < x0) avancar(); else voltar();
        }}>
        {mensagem ? (
          <p role="alert" className="self-center text-sm text-ink-3 text-center px-4">{mensagem}</p>
        ) : doc && tam.largura ? (
          <div className="flex justify-center items-start" style={{ gap: GAP }}>
            {Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i).map(n => (
              <PaginaCanvas key={n} doc={doc} n={n} total={total} largura={tam.largura} altura={tam.altura} onErro={setErro} />
            ))}
          </div>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Carregando página">
            <span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" />
          </span>
        )}
      </div>
      {comSetas && !mensagem && (
        <div className="flex items-center justify-center gap-3">
          <IconButton icon="chevron_left" label="Páginas anteriores" variant="secondary" disabled={inicio <= 1} onClick={voltar} />
          <span className="text-sm font-semibold text-ink tabular-nums min-w-[8rem] text-center" aria-live="polite">
            {fim > inicio ? `Páginas ${inicio}–${fim} de ${total}` : `Página ${inicio} de ${total}`}
          </span>
          <IconButton icon="chevron_right" label="Próximas páginas" variant="secondary" disabled={fim >= total} onClick={avancar} />
        </div>
      )}
    </div>
  );
};
