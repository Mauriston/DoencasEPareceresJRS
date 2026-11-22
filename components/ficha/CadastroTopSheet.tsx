// Ficheiro: components/ficha/CadastroTopSheet.tsx
// Top sheet da Ficha do inspecionado: desce da topbar (faixa horizontal de largura total, abaixo dela) ao tocar no nome
// do inspecionado e mostra os dados cadastrais (o que antes era o card "Cadastro" da coluna de apoio).
// Modal: fecha no X, com Esc (pilha de camadas) e ao tocar fora; o foco vai para o painel ao abrir.
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';

export interface DadoCadastro { rotulo: string; valor?: string | null }

interface Props {
  titulo: string;
  /** Linha de identificação (posto · NIP · OM). */
  subtitulo?: React.ReactNode;
  dados: DadoCadastro[];
  /** Sem cadastro completo (perfil sem acesso a Inspecionados ou sem documento em "militares"). */
  aviso?: string;
  onEditar?: () => void;
  onClose: () => void;
}

export const CadastroTopSheet: React.FC<Props> = ({ titulo, subtitulo, dados, aviso, onEditar, onClose }) => {
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);
  useEffect(() => { painel.current?.focus(); }, []);
  useEscapeEmpilhado(onClose);
  const visiveis = dados.filter(d => d.valor);

  return createPortal(
    // Começa embaixo da topbar (3,5 rem + área segura): o sheet desce dela, não por cima; overflow-hidden recorta a animação.
    <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-drawer overflow-hidden">
      <div className="absolute inset-0 bg-black/50 animate-backdrop-in" onMouseDown={onClose} aria-hidden="true" />
      <div
        ref={painel} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1}
        className="absolute left-0 right-0 top-0 bg-white border-b border-line rounded-b-2xl shadow-2xl max-h-full flex flex-col animate-sheet-down focus:outline-none"
      >
        <div className="w-full px-4 md:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-data flex items-start justify-between gap-3 py-4 border-b border-line">
            <div className="min-w-0">
              <h2 id={tituloId} className="text-h2 font-extrabold text-navy break-words">{titulo}</h2>
              {subtitulo && <div className="text-sm text-ink-3 mt-0.5">{subtitulo}</div>}
            </div>
            <div className="flex items-center gap-1 shrink-0 -mr-2">
              {onEditar && <Button variant="ghost" size="sm" icon="edit" onClick={onEditar}>Editar</Button>}
              <button type="button" onClick={onClose} aria-label="Fechar" className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-3 hover:text-navy hover:bg-thead transition-colors">
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto px-4 md:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-data py-4">
            {aviso && <p className="text-sm text-ink-3 mb-3">{aviso}</p>}
            {visiveis.length > 0 && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                {visiveis.map(d => (
                  <div key={d.rotulo} className="min-w-0">
                    <dt className="text-xs font-semibold text-ink-3">{d.rotulo}</dt>
                    <dd className="text-sm text-ink break-words">{d.valor}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
        <div className="flex justify-center pb-2 pt-1 shrink-0" aria-hidden="true"><span className="w-10 h-1 rounded-full bg-line" /></div>
      </div>
    </div>,
    document.body,
  );
};
