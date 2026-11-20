// Ficheiro: components/normas/BuscaNoTexto.tsx
// Busca no texto das normas renderizadas (Portaria, DGPM-406): destaca as ocorrências
// em <mark> dentro de .md-content e navega "3 de 12".
import React, { useEffect, useState } from 'react';
import { IconButton } from '../ui/IconButton';
import { acharOcorrencias } from '../../utils/normaMarkdown';


export const limparMarcas = (raiz: HTMLElement) => {
  raiz.querySelectorAll('mark.md-busca').forEach(m => {
    const pai = m.parentNode;
    if (!pai) return;
    pai.replaceChild(document.createTextNode(m.textContent ?? ''), m);
    pai.normalize();
  });
};

/** Envolve as ocorrências em <mark> — só dentro de .md-content (HTML do marked, que o React não reconcilia). */
const marcarOcorrencias = (raiz: HTMLElement, termo: string): HTMLElement[] => {
  const marcas: HTMLElement[] = [];
  raiz.querySelectorAll<HTMLElement>('.md-content').forEach(bloco => {
    const walker = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT);
    const nos: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if ((n.parentElement?.closest('.sr-only'))) continue;
      nos.push(n as Text);
    }
    for (const no of nos) {
      const texto = no.data;
      const ocorr = acharOcorrencias(texto, termo);
      if (!ocorr.length) continue;
      const frag = document.createDocumentFragment();
      let pos = 0;
      for (const [ini, fim] of ocorr) {
        if (ini > pos) frag.appendChild(document.createTextNode(texto.slice(pos, ini)));
        const mark = document.createElement('mark');
        mark.className = 'md-busca';
        mark.textContent = texto.slice(ini, fim);
        frag.appendChild(mark);
        marcas.push(mark);
        pos = fim;
      }
      if (pos < texto.length) frag.appendChild(document.createTextNode(texto.slice(pos)));
      no.parentNode?.replaceChild(frag, no);
    }
  });
  return marcas;
};

export const useBuscaNoTexto = (raiz: React.RefObject<HTMLElement | null>, termo: string, chave?: unknown) => {
  const [marcas, setMarcas] = useState<HTMLElement[]>([]);
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const t = setTimeout(() => {
      limparMarcas(el);
      const novas = termo.trim().length >= 2 ? marcarOcorrencias(el, termo) : [];
      setMarcas(novas);
      setAtual(0);
    }, 250);
    return () => clearTimeout(t);
  }, [raiz, termo, chave]);

  useEffect(() => {
    marcas.forEach((m, i) => m.classList.toggle('md-busca-atual', i === atual));
    marcas[atual]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [marcas, atual]);

  const total = marcas.length;
  return {
    total,
    atual,
    proxima: () => total && setAtual(i => (i + 1) % total),
    anterior: () => total && setAtual(i => (i - 1 + total) % total),
  };
};


export const CampoBusca: React.FC<{
  valor: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean;
  onEnter?: (shift: boolean) => void; id?: string;
}> = ({ valor, onChange, placeholder, autoFocus, onEnter, id }) => (
  <label className="flex items-center gap-2 h-10 px-2.5 rounded-lg border border-line bg-white focus-within:border-navy min-w-0">
    <span className="material-symbols-outlined text-[20px] text-ink-3 shrink-0" aria-hidden="true">search</span>
    <input
      id={id}
      type="search"
      value={valor}
      autoFocus={autoFocus}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.(e.shiftKey); } }}
      placeholder={placeholder}
      aria-label={placeholder}
      // 16 px: sem zoom automático no iPhone.
      className="flex-1 min-w-0 bg-transparent text-base md:text-sm text-ink placeholder:text-ink-4 focus:outline-none"
    />
  </label>
);

export const ContadorBusca: React.FC<{ total: number; atual: number; termo: string; anterior: () => void; proxima: () => void }> = ({ total, atual, termo, anterior, proxima }) => {
  if (termo.trim().length < 2) return null;
  return (
    <div className="flex items-center gap-1 shrink-0" aria-live="polite">
      <span className="text-xs text-ink-3 tabular-nums whitespace-nowrap px-1">{total ? `${atual + 1} de ${total}` : 'Nenhuma'}</span>
      <IconButton icon="keyboard_arrow_up" label="Ocorrência anterior" variant="secondary" className="!w-9 !h-9 border-line" onClick={anterior} disabled={!total} />
      <IconButton icon="keyboard_arrow_down" label="Próxima ocorrência" variant="secondary" className="!w-9 !h-9 border-line" onClick={proxima} disabled={!total} />
    </div>
  );
};
