// Ficheiro: components/ficha/guias/PaginasPdf.tsx
// Carrossel das páginas de um PDF (Ficha › Guias): uma página por vez, desenhada num <canvas> pelo pdf.js a
// partir do PRÓPRIO PDF gerado no servidor (o mesmo que é impresso e enviado por e-mail — sem divergência
// entre a tela e o documento). Setas ‹ › (também ← → no teclado e arrastar para o lado no toque) e
// "Página X de N". A largura acompanha o painel (até 640 px); a nitidez segue o devicePixelRatio.
// O pdf.js (pdfjs-dist, build "legacy" — Safari/iOS mais antigos) só é baixado quando a aba Guias abre.
import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '../../ui/IconButton';

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPagina>; destroy: () => Promise<void> };
type PdfPagina = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement; viewport: { width: number; height: number } }) => { promise: Promise<void>; cancel: () => void };
};

let pdfjsPromise: Promise<{ getDocument: (o: { url: string }) => { promise: Promise<PdfDoc>; destroy: () => Promise<void> } }> | null = null;
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

const LARGURA_MAX = 640;

interface Props {
  /** URL do PDF (download do Storage). null = ainda buscando a URL. */
  url: string | null;
  /** Rótulo acessível do documento (ex.: "Guias de exames da IS 123"). */
  rotulo: string;
  /** Erro ao obter a URL (ex.: PDF apagado). */
  erroUrl?: string;
}

export const PaginasPdf: React.FC<Props> = ({ url, rotulo, erroUrl }) => {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState('');
  const [desenhando, setDesenhando] = useState(false);
  const [largura, setLargura] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const toque = useRef<number | null>(null);

  // Abre o PDF (novo URL → volta à página 1).
  useEffect(() => {
    setDoc(null); setPagina(1); setErro('');
    if (!url) return;
    let vivo = true;
    let tarefa: { destroy: () => Promise<void> } | null = null;
    carregarPdfjs()
      .then(pdfjs => { tarefa = pdfjs.getDocument({ url }); return (tarefa as unknown as { promise: Promise<PdfDoc> }).promise; })
      .then(d => { if (vivo) setDoc(d); else void d.destroy(); })
      .catch(() => { if (vivo) setErro('Não foi possível abrir as páginas do PDF.'); });
    return () => { vivo = false; void tarefa?.destroy(); };
  }, [url]);

  // Largura disponível no painel.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => {
      const cs = getComputedStyle(el);
      const util = el.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
      setLargura(Math.max(0, Math.min(LARGURA_MAX, Math.floor(util))));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Desenha a página atual.
  useEffect(() => {
    if (!doc || !largura || !canvas.current) return;
    let vivo = true;
    let render: { cancel: () => void } | null = null;
    setDesenhando(true);
    doc.getPage(pagina).then(p => {
      if (!vivo || !canvas.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const base = p.getViewport({ scale: 1 });
      const vp = p.getViewport({ scale: (largura * dpr) / base.width });
      const c = canvas.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      c.style.width = `${largura}px`;
      c.style.height = `${Math.floor((vp.height / vp.width) * largura)}px`;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const t = p.render({ canvasContext: ctx, canvas: c, viewport: vp });
      render = t;
      return t.promise;
    }).catch(e => { if (vivo && (e as { name?: string })?.name !== 'RenderingCancelledException') setErro('Não foi possível desenhar a página.'); })
      .finally(() => { if (vivo) setDesenhando(false); });
    return () => { vivo = false; render?.cancel(); };
  }, [doc, pagina, largura]);

  const total = doc?.numPages ?? 0;
  const ir = (n: number) => { if (total) setPagina(Math.min(total, Math.max(1, n))); };
  const mensagem = erroUrl || erro;

  return (
    <div
      role="group" aria-roledescription="carrossel" aria-label={rotulo} tabIndex={0}
      onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); ir(pagina + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); ir(pagina - 1); } }}
      className="space-y-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <div ref={caixa} className="relative w-full flex justify-center rounded-xl bg-surface-2 border border-line p-2 sm:p-4 min-h-[240px]"
        onTouchStart={e => { toque.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={e => {
          const x0 = toque.current; toque.current = null;
          const x1 = e.changedTouches[0]?.clientX;
          if (x0 === null || x1 === undefined || Math.abs(x1 - x0) < 50) return;
          ir(x1 < x0 ? pagina + 1 : pagina - 1);
        }}>
        {mensagem ? (
          <p role="alert" className="self-center text-sm text-ink-3 text-center px-4">{mensagem}</p>
        ) : (
          <>
            <canvas ref={canvas} aria-label={total ? `Página ${pagina} de ${total}` : 'Carregando página'} role="img"
              className={`bg-white border border-line max-w-full ${doc ? '' : 'invisible'}`} />
            {(!doc || desenhando) && (
              <span className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Carregando página">
                <span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" />
              </span>
            )}
          </>
        )}
      </div>
      {total > 0 && (
        <div className="flex items-center justify-center gap-3">
          <IconButton icon="chevron_left" label="Página anterior" variant="secondary" disabled={pagina <= 1} onClick={() => ir(pagina - 1)} />
          <span className="text-sm font-semibold text-ink tabular-nums min-w-[7rem] text-center" aria-live="polite">Página {pagina} de {total}</span>
          <IconButton icon="chevron_right" label="Próxima página" variant="secondary" disabled={pagina >= total} onClick={() => ir(pagina + 1)} />
        </div>
      )}
    </div>
  );
};
