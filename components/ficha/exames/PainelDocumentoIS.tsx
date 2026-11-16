// Ficheiro: components/ficha/exames/PainelDocumentoIS.tsx
// Ficha do inspecionado › abas Exames e Atestados e Laudos: painel principal de UM PDF enviado numa IS
// (inspecoes/{isId}/exames/{id}; services/examesIS.ts).
//   corpo: a transcrição feita pela IA num ÚNICO campo só de leitura, com o ícone de copiar (área de
//   transferência) alinhado à direita dentro do campo — copia o PDF inteiro no padrão dos concursos
//   (utils/examesFicha.ts → textoTranscricao). Laboratoriais com os analitos lidos: a grade "Analito · valor" com
//   o copiar de cada um, como em components/concursos/ExamesCandidato.tsx (BotaoCopiar e textoItem reutilizados);
//   barra inferior: "Zimbra SEC-JRS" (função ficha.zimbraSecretaria — EnviarDocumentoSecretariaDialog) e
//   "Imprimir" (abre o PDF numa NOVA guia do navegador, como em Ficha › Guias).
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { buttonClass } from '../../ui/Button';
import { StatusTag } from '../../ui/StatusTag';
import { CascaPainelFicha, type AcaoBarraFicha } from '../CascaPainelFicha';
import { BotaoCopiar } from '../../ui/BotaoCopiar';
import { EnviarDocumentoSecretariaDialog } from './EnviarDocumentoSecretariaDialog';
import { urlDoExame } from '../../../services/examesIS';
import { textoItem } from '../../../utils/examesCandidato';
import { classeDoExame, ROTULO_CLASSE, type ItemExame } from '../../../utils/examesIS';
import { nomeDoItem, textoTranscricao, type AbaDocumentoFicha } from '../../../utils/examesFicha';
import type { ExameDaFicha } from '../useExamesDasIS';

interface Props {
  aba: AbaDocumentoFicha;
  exame: ExameDaFicha;
  podeZimbra: boolean;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

const dataBR = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso);
const isoDe = (ts: { toDate?: () => Date } | null | undefined): string => {
  const d = ts?.toDate?.();
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
};

/** Título do PDF na Ficha: os nomes dos documentos (o exame mínimo enquadrado, quando há). */
export const tituloDoDocumento = (e: Pick<ExameDaFicha, 'itens' | 'nomeArquivo'>): string =>
  e.itens.map(nomeDoItem).filter(Boolean).join(' · ') || e.nomeArquivo || 'PDF';

/** Um documento dentro do campo da transcrição. */
const Documento: React.FC<{ item: ItemExame; varios: boolean }> = ({ item, varios }) => {
  const rodape = [item.emissor, item.data ? dataBR(item.data) : ''].filter(Boolean).join(' - ');
  return (
    <div className="space-y-2">
      {varios && <p className="text-xs font-bold text-navy uppercase break-words">{nomeDoItem(item)}</p>}
      {item.valores?.length ? (
        // Cada analito é copiado separadamente ("Hemoglobina: 15,4"), sem unidade (padrão dos concursos).
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          {item.valores.map((v, i) => (
            <li key={`${v.nome}-${i}`} className="flex items-center gap-2 py-1 border-b border-line/70">
              <span className="min-w-0 flex-1 text-sm text-ink truncate" title={v.nome}>{v.nome}</span>
              <span className="text-sm font-bold text-navy tabular-nums">{v.valor}</span>
              <BotaoCopiar texto={textoItem(v)} titulo={`Copiar ${v.nome}`} />
            </li>
          ))}
        </ul>
      ) : (
        item.texto && <p className="text-sm text-ink whitespace-pre-wrap break-words leading-relaxed">{item.texto}</p>
      )}
      {rodape && <p className="text-xs text-ink-3 break-words">{rodape}</p>}
    </div>
  );
};

export const PainelDocumentoIS: React.FC<Props> = ({ aba, exame: e, podeZimbra, onAviso }) => {
  // URL de download (Imprimir: abre em nova guia).
  const [url, setUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    setUrl(null);
    let vivo = true;
    urlDoExame(e).then(u => { if (vivo) setUrl(u); }).catch(() => { /* Imprimir fica desabilitado */ });
    return () => { vivo = false; };
  }, [e.caminho]); // eslint-disable-line react-hooks/exhaustive-deps

  const titulo = tituloDoDocumento(e);
  const data = e.itens.find(i => i.data)?.data || isoDe(e.enviadoEm);
  const minimos = e.itens.map(i => i.exameMinimo).filter(Boolean) as string[];
  const copia = textoTranscricao(e.itens);

  const acoes: AcaoBarraFicha[] = [];
  if (podeZimbra) acoes.push({ id: 'zimbra', rotulo: 'Zimbra SEC-JRS', icone: 'forward_to_inbox', variante: 'secondary', onClick: () => setEnviando(true) });
  acoes.push({
    id: 'imprimir',
    node: url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`${buttonClass('primary')} w-full sm:w-auto`}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">print</span>Imprimir
      </a>
    ) : (
      <span aria-disabled="true" className={`${buttonClass('primary')} w-full sm:w-auto opacity-60`}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">print</span>Imprimir
      </span>
    ),
  });

  return (
    <CascaPainelFicha
      titulo={titulo} icone={aba === 'exames' ? 'lab_profile' : 'note_alt'}
      tituloExtra={<StatusTag tone="navyOutline" dot={false}>{ROTULO_CLASSE[classeDoExame(e)]}</StatusTag>}
      subtitulo={[`IS ${e.is}`, data ? dataBR(data) : '', e.enviadoPor?.usuario ? `enviado por ${e.enviadoPor.usuario}` : ''].filter(Boolean).join(' · ')}
      acoes={acoes}
    >
      <div className="space-y-3">
        {minimos.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            Exame mínimo:{minimos.map(m => <StatusTag key={m} tone="success" dot={false}>{m}</StatusTag>)}
          </p>
        )}
        <div className="relative rounded-lg border border-line bg-surface-2">
          <p id={`transcricao-${e.id}`} className="sr-only">Transcrição do documento (somente leitura)</p>
          <div role="document" aria-labelledby={`transcricao-${e.id}`} aria-readonly="true"
            className="p-3 pr-14 max-h-[60vh] overflow-y-auto overscroll-contain space-y-4 select-text">
            {e.itens.length === 0
              ? <p className="text-sm text-ink-3">Sem transcrição do documento.</p>
              : e.itens.map((it, i) => <Documento key={i} item={it} varios={e.itens.length > 1} />)}
          </div>
          {copia && <BotaoCopiar texto={copia} titulo="Copiar a transcrição" className="absolute top-1.5 right-1.5 bg-white border border-line" />}
        </div>
        {e.textoIncompleto && <p className="text-xs text-ink-3">A transcrição pode estar incompleta: confira no PDF.</p>}
      </div>

      {enviando && createPortal(
        <EnviarDocumentoSecretariaDialog
          isId={e.isId} numeroIs={e.is} exameId={e.id} documento={titulo}
          onClose={() => setEnviando(false)}
          onEnviado={msg => { setEnviando(false); onAviso(msg); }}
        />,
        document.body,
      )}
    </CascaPainelFicha>
  );
};
