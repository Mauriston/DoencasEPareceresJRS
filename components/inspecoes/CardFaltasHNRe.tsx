// Ficheiro: components/inspecoes/CardFaltasHNRe.tsx
// Card da Início (só Admin e Secretaria): faltas às IS de inspecionados do HNRe ainda não comunicadas à Divisão de
// Pessoal (utils/emailFaltasHNRe.ts). Sem pendências, não aparece. Mostra as 5 faltas mais antigas, o total no badge,
// "Enviar e-mail" (EmailFaltasDialog) e o link para Inspeções de Saúde. A moldura (`Secao`) é a da própria Início.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Toast } from '../ui/Toast';
import { EmailFaltasDialog } from './EmailFaltasDialog';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { observarMilitares, type MilitarRecord } from '../../services/firestoreMilitares';
import { faltasPendentesHNRe } from '../../utils/emailFaltasHNRe';
import { dataBr, dataDeEntrevista } from '../../utils/inspecoes';
import { extrairNomeInspecionado } from '../../utils/format';

const MAX_LINHAS = 5;

type Moldura = React.FC<{ id: string; titulo: string; badge?: number; badgeRotulo?: string; acao?: React.ReactNode; children: React.ReactNode }>;

interface Props {
  inspecoes: InspecaoRecord[];
  /** O cartão padrão da Início (Secao de Home.tsx). */
  Secao: Moldura;
}

export const CardFaltasHNRe: React.FC<Props> = ({ inspecoes, Secao }) => {
  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  useEffect(() => observarMilitares(setMilitares, () => { /* silencioso: não derruba a Início */ }), []);
  const pendentes = useMemo(() => {
    const omPorId = new Map<string, string>(militares.map(m => [m.id, m.om]));
    return faltasPendentesHNRe(inspecoes, id => omPorId.get(id));
  }, [inspecoes, militares]);
  const [aberto, setAberto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  return (
    <>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      {pendentes.length > 0 && (
        <Secao
          id="home-faltas-hnre" titulo="Faltas do HNRe a comunicar" badge={pendentes.length}
          acao={<Link to="/inspecoes" className="text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Ver inspeções</Link>}
        >
          <ul className="divide-y divide-line">
            {pendentes.slice(0, MAX_LINHAS).map(i => (
              <li key={i.id} className="flex items-center gap-3 px-4 min-h-[56px] py-2">
                <span className="w-10 h-10 rounded-lg bg-thead flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[22px] text-wine" aria-hidden="true">person_off</span></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-navy truncate">{extrairNomeInspecionado(i.inspecionado) || i.inspecionado}</span>
                  <span className="block text-xs text-ink-3 truncate">Faltou em {dataBr(dataDeEntrevista(i.dataEntrevista))} · IS {i.is} · {i.finalidade}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-line">
            <span className="text-xs text-ink-3">{pendentes.length > MAX_LINHAS ? `+${pendentes.length - MAX_LINHAS} em Inspeções de Saúde` : 'Ainda não comunicadas à Divisão de Pessoal'}</span>
            <button type="button" onClick={() => setAberto(true)} className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover transition-colors">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">unsubscribe</span>Enviar e-mail
            </button>
          </div>
        </Secao>
      )}
      {aberto && (
        <EmailFaltasDialog
          pendentes={pendentes}
          onClose={() => setAberto(false)}
          onEnviado={(msg, tom) => { setAberto(false); avisar(msg, tom); }}
        />
      )}
    </>
  );
};
