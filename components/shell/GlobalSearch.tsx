// Ficheiro: components/shell/GlobalSearch.tsx
// Busca global da topbar: páginas que o perfil pode acessar (a mesma matriz de
// permissões do menu) e doenças/diagnósticos de Doenças de Lei. Combobox
// acessível: setas, Enter e Esc; atalho "/" ou Ctrl+K foca o campo.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavContext } from '../../context/NavContext';
import { getNavCategories } from '../../config/navigation';
import { canAccessPage } from '../../config/permissions';
import { doencaPath, pathForView } from '../../config/routes';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { DISEASES } from '../../constants';

interface Resultado {
  id: string;
  rotulo: string;
  contexto: string;
  icone: string;
  to: string;
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const GlobalSearch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const nav = useContext(NavContext);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [consulta, setConsulta] = useState('');
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [expandidoMobile, setExpandidoMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);

  // Sem useMemo de propósito: a matriz de permissões (canAccessPage) é lida de um cache que o
  // Firestore atualiza depois do 1º render; memoizar congelava o índice com permissões antigas.
  const montarIndice = (): Resultado[] => {
    const paginas = getNavCategories(nav?.authUser?.perfil, nav?.periciaMenorVigentes || 0, isDesktop)
      .flatMap(cat => cat.subitems.map(s => ({
        id: `p-${s.id}`, rotulo: s.label, contexto: cat.label === s.label ? 'Página' : cat.label, icone: s.icon, to: pathForView(s.id),
      })));
    // Doenças de Lei só entram na busca para quem pode acessar a página (mesma matriz de permissões do menu).
    const perfil = nav?.authUser?.perfil;
    const doencas = !canAccessPage('guide', perfil) ? [] : DISEASES.flatMap(d => [
      { id: `d-${d.id}`, rotulo: d.name, contexto: 'Doenças de Lei', icone: 'medical_information', to: doencaPath(d.id) },
      ...(d.diagnoses.length > 1 ? d.diagnoses.map((g, i) => ({
        id: `g-${d.id}-${i}`, rotulo: g.name, contexto: `em ${d.name}`, icone: 'diagnosis', to: doencaPath(d.id, i),
      })) : []),
    ]);
    return [...paginas, ...doencas];
  };

  const resultados = (() => {
    const termos = normalizar(consulta).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return [];
    return montarIndice()
      .filter(r => { const alvo = normalizar(`${r.rotulo} ${r.contexto}`); return termos.every(t => alvo.includes(t)); })
      .slice(0, 10);
  })();

  useEffect(() => { setAtivo(0); }, [consulta]);

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) || alvo.isContentEditable;
      if ((e.key === '/' && !digitando) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setExpandidoMobile(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', aoTecla);
    return () => window.removeEventListener('keydown', aoTecla);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => { if (!raizRef.current?.contains(e.target as Node)) { setAberto(false); setExpandidoMobile(false); } };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  const escolher = (r: Resultado) => {
    navigate(r.to);
    setConsulta('');
    setAberto(false);
    setExpandidoMobile(false);
    inputRef.current?.blur();
  };

  const aoTecla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo(i => Math.min(i + 1, Math.max(resultados.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && resultados[ativo]) { e.preventDefault(); escolher(resultados[ativo]); }
    else if (e.key === 'Escape') { setAberto(false); setExpandidoMobile(false); setConsulta(''); inputRef.current?.blur(); }
  };

  const mostrarLista = aberto && consulta.trim().length > 0;

  return (
    <div ref={raizRef} className={`relative ${className}`}>
      {/* Celular: só o ícone; ao tocar, o campo cobre a topbar. */}
      <button
        type="button"
        aria-label="Buscar"
        onClick={() => { setExpandidoMobile(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"
      >
        <span className="material-symbols-outlined text-[24px]" aria-hidden="true">search</span>
      </button>

      <div className={`${expandidoMobile ? 'fixed left-0 right-0 top-0 h-14 z-50 bg-white px-3 flex items-center border-b border-line' : 'hidden md:block'} md:static md:h-auto md:px-0 md:border-0 md:bg-transparent`}>
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={mostrarLista}
            aria-controls="busca-global-lista"
            aria-autocomplete="list"
            aria-activedescendant={mostrarLista && resultados[ativo] ? `busca-${resultados[ativo].id}` : undefined}
            aria-label="Buscar páginas e doenças"
            placeholder="Buscar páginas e doenças…  ( / )"
            value={consulta}
            onChange={e => { setConsulta(e.target.value); setAberto(true); }}
            onFocus={() => setAberto(true)}
            onKeyDown={aoTecla}
            autoComplete="off"
            className="w-full min-h-[40px] md:min-h-[40px] pl-10 pr-3 rounded-lg border border-line bg-thead text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:bg-white focus:border-navy [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        {expandidoMobile && (
          <button
            type="button"
            onClick={() => { setExpandidoMobile(false); setAberto(false); setConsulta(''); inputRef.current?.blur(); }}
            className="md:hidden shrink-0 ml-2 px-2 min-h-[44px] text-sm font-bold text-navy"
          >
            Cancelar
          </button>
        )}

        {mostrarLista && (
          <ul
            id="busca-global-lista"
            role="listbox"
            className="absolute left-3 right-3 md:left-0 md:right-0 top-[52px] md:top-11 bg-white border border-line rounded-xl shadow-lg py-1.5 max-h-[70vh] overflow-y-auto z-50"
          >
            {resultados.length === 0 ? (
              <li className="px-4 py-3 text-sm text-ink-3">Nada encontrado para “{consulta}”.</li>
            ) : resultados.map((r, i) => (
              <li key={r.id} id={`busca-${r.id}`} role="option" aria-selected={i === ativo}>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => escolher(r)}
                  onMouseEnter={() => setAtivo(i)}
                  className={`w-full text-left px-4 min-h-[44px] py-2 flex items-center gap-3 ${i === ativo ? 'bg-thead' : ''}`}
                >
                  <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">{r.icone}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-navy truncate">{r.rotulo}</span>
                    <span className="block text-xs text-ink-3 truncate">{r.contexto}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
