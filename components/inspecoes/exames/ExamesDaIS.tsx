// Ficheiro: components/inspecoes/exames/ExamesDaIS.tsx
// Exames da IS no detalhe: um cartão por documento identificado nos PDFs (tipo, título e data). O cartão
// abre o laudo na íntegra, com "Copiar" (área de transferência), "Abrir PDF" e — enquanto a IS não está
// finalizada — "Apagar". Com mais de um documento, "Copiar todos" junta os laudos.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, ConfirmDialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { StatusTag } from '../../ui/StatusTag';
import { cardConclusaoClass } from '../entrevista/SecaoEntrevista';
import { copiarTexto } from '../CampoCopiavel';
import { apagarExameIS, observarExamesDaIS, urlDoExame, type ExameISRecord } from '../../../services/examesIS';
import { ICONE_TIPO, ROTULO_TIPO, textoParaCopiar, textosParaCopiar, type ItemExame } from '../../../utils/examesIS';
import { dataBr } from '../../../utils/inspecoes';

interface Props {
  isId: string;
  /** IS finalizada: só leitura (sem apagar). */
  podeApagar: boolean;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

interface Aberto { exame: ExameISRecord; item: ItemExame }

/** Botão de copiar com "Copiado" por ~1,5 s. */
const BotaoCopiar: React.FC<{ texto: string; rotulo: string; variante?: 'primary' | 'secondary'; onErro: () => void }> = ({ texto, rotulo, variante = 'primary', onErro }) => {
  const [ok, setOk] = useState(false);
  const t = useRef<number>();
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <Button
      variant={variante} icon={ok ? 'check' : 'content_copy'}
      onClick={async () => { if (await copiarTexto(texto)) { setOk(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setOk(false), 1500); } else onErro(); }}
    >
      {ok ? 'Copiado' : rotulo}
    </Button>
  );
};

export const ExamesDaIS: React.FC<Props> = ({ isId, podeApagar, onAviso }) => {
  const [exames, setExames] = useState<ExameISRecord[]>([]);
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [apagando, setApagando] = useState<ExameISRecord | null>(null);
  const [abrindoPdf, setAbrindoPdf] = useState(false);
  useEffect(() => observarExamesDaIS(isId, setExames, () => setExames([])), [isId]);

  const itens = exames.flatMap(exame => exame.itens.map((item, i) => ({ exame, item, chave: `${exame.id}-${i}` })));
  if (!itens.length) return null;
  const erroCopiar = () => onAviso('Não foi possível copiar. Selecione o texto e copie manualmente.', 'error');

  const abrirPdf = async (exame: ExameISRecord) => {
    // Abre a aba já no clique (bloqueadores de pop-up) e depois aponta para o PDF.
    const aba = window.open('about:blank', '_blank');
    setAbrindoPdf(true);
    try { const url = await urlDoExame(exame); if (aba) aba.location.href = url; else window.location.href = url; }
    catch { aba?.close(); onAviso('Não foi possível abrir o PDF.', 'error'); }
    finally { setAbrindoPdf(false); }
  };

  const confirmarApagar = async () => {
    if (!apagando) return;
    try { await apagarExameIS(isId, apagando); onAviso('Exame apagado.'); setAberto(null); }
    catch { onAviso('Não foi possível apagar o exame.', 'error'); }
    finally { setApagando(null); }
  };

  return (
    <section aria-label="Exames" className="w-full space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-h3 font-bold text-navy">Exames</h3>
        {itens.length > 1 && <BotaoCopiar variante="secondary" rotulo="Copiar todos" texto={textosParaCopiar(itens.map(x => x.item))} onErro={erroCopiar} />}
      </div>
      <div className="flex flex-wrap gap-2">
        {itens.map(({ exame, item, chave }) => (
          <button key={chave} type="button" onClick={() => setAberto({ exame, item })} className={`${cardConclusaoClass} max-w-full`}>
            <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">{ICONE_TIPO[item.tipo]}</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-navy truncate">{item.titulo}</span>
              <span className="block text-xs text-ink-3">{ROTULO_TIPO[item.tipo]}{item.data ? ` · ${dataBr(item.data)}` : ''}</span>
            </span>
          </button>
        ))}
      </div>

      {aberto && createPortal(
        <Dialog
          title={aberto.item.titulo} icon={ICONE_TIPO[aberto.item.tipo]} size="lg" onClose={() => setAberto(null)}
          footer={(
            <>
              {podeApagar && <Button variant="secondary" icon="delete" onClick={() => setApagando(aberto.exame)}>Apagar</Button>}
              <Button variant="secondary" icon="picture_as_pdf" loading={abrindoPdf} onClick={() => void abrirPdf(aberto.exame)}>Abrir PDF</Button>
              <BotaoCopiar rotulo="Copiar" texto={textoParaCopiar(aberto.item)} onErro={erroCopiar} />
            </>
          )}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
              <StatusTag tone="navyOutline" dot={false}>{ROTULO_TIPO[aberto.item.tipo]}</StatusTag>
              {aberto.item.data && <span>{dataBr(aberto.item.data)}</span>}
              {aberto.item.emissor && <span>· {aberto.item.emissor}</span>}
            </div>
            {aberto.exame.textoIncompleto && <p className="text-xs font-semibold text-wine" role="alert">Documento longo: o texto pode estar incompleto. Confira no PDF.</p>}
            <p className="whitespace-pre-line text-sm text-ink leading-relaxed select-text">{aberto.item.texto || '—'}</p>
          </div>
        </Dialog>,
        document.body,
      )}

      {apagando && createPortal(
        <ConfirmDialog
          title="Apagar exame" destructive confirmLabel="Apagar"
          message={`O PDF "${apagando.nomeArquivo}" e o texto lido serão apagados.`}
          onConfirm={() => void confirmarApagar()} onCancel={() => setApagando(null)}
        />,
        document.body,
      )}
    </section>
  );
};
