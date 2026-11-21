// Ficheiro: components/ficha/exames/PainelDocumentoIS.tsx
// Ficha do inspecionado › abas Exames e Atestados e Laudos: painel principal de UM PDF enviado numa IS
// (inspecoes/{isId}/exames/{id}; services/examesIS.ts).
//   corpo: a transcrição feita pela IA num ÚNICO campo só de leitura, com o ícone de copiar (área de
//   transferência) alinhado à direita dentro do campo — copia o PDF inteiro no padrão dos concursos
//   (utils/examesFicha.ts → textoTranscricao). Laboratoriais com os analitos lidos: a grade "Analito · valor" com
//   o copiar de cada um, como em components/concursos/ExamesCandidato.tsx (BotaoCopiar e textoItem reutilizados);
//   barra inferior: "Zimbra SEC-JRS" (função ficha.zimbraSecretaria — EnviarDocumentoSecretariaDialog) e
//   "Imprimir" (abre o PDF numa NOVA guia do navegador, como em Ficha › Guias).
import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { buttonClass } from '../../ui/Button';
import { StatusTag } from '../../ui/StatusTag';
import { CascaPainelFicha, type AcaoBarraFicha } from '../CascaPainelFicha';
import { BotaoCopiar } from '../../ui/BotaoCopiar';
import { EnviarDocumentoSecretariaDialog } from './EnviarDocumentoSecretariaDialog';
import { apagarExameIS, urlDoExame } from '../../../services/examesIS';
import { ConfirmDialog } from '../../ui/Dialog';
import { textoItem } from '../../../utils/examesCandidato';
import { classeDoExame, ROTULO_CLASSE, type ItemExame, type ValorExame } from '../../../utils/examesIS';
import { avaliarValidade, type AvaliacaoValidade } from '../../../utils/validadeExames';
import { nomeDoItem, textoTranscricao, type AbaDocumentoFicha } from '../../../utils/examesFicha';
import type { ExameDaFicha } from '../useExamesDasIS';

interface Props {
  aba: AbaDocumentoFicha;
  exame: ExameDaFicha;
  podeZimbra: boolean;
  /** Mostra "Excluir" (apaga o PDF e a transcrição): Admin ou quem enviou, com a IS não finalizada (podeExcluirDocumentoIS). */
  podeExcluir?: boolean;
  /** Data de referência da validade dos exames mínimos (a data da IS; sem ela, hoje) e a finalidade da IS. */
  validade?: { referencia: string; finalidade: string };
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

/** Valor alterado: ícone de alerta com tooltip (hover/foco/toque) dos valores de referência considerados. */
const AlertaReferencia: React.FC<{ v: ValorExame }> = ({ v }) => {
  const id = useId();
  const ref = v.referencia
    ? `Referência${v.referenciaOrigem === 'usual' ? ' usual (não consta no laudo)' : ' do laudo'}: ${v.referencia}`
    : 'Valor marcado como alterado no laudo (referência não identificada).';
  return (
    <span className="relative inline-flex group shrink-0">
      <button
        type="button" aria-label={`${v.nome}: valor alterado. ${ref}`} aria-describedby={id}
        className="w-7 h-7 inline-flex items-center justify-center rounded text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">warning</span>
      </button>
      <span
        role="tooltip" id={id}
        className="pointer-events-none absolute bottom-full right-0 mb-1 z-dropdown w-max max-w-[16rem] rounded-lg bg-ink text-white text-xs px-2 py-1 shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >{ref}</span>
    </span>
  );
};

/** Aviso de validade do exame mínimo (norma: laboratoriais 90 dias, toxicológico 60, RX/ergométrico/eco/EEG 1 ano). */
const AvisoValidade: React.FC<{ a: AvaliacaoValidade }> = ({ a }) => {
  if (a.situacao === 'valido') {
    return <p className="text-xs text-ink-3"><StatusTag tone="success" dot={false}>Dentro da validade</StatusTag> <span className="ml-1">válido até {dataBR(a.validoAte || '')} · {a.regra.descricao}.</span></p>;
  }
  if (a.situacao === 'vencido') {
    return (
      <p role="alert" className="flex items-start gap-1 text-xs font-bold text-wine">
        <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">event_busy</span>
        <span>Possivelmente fora da validade: venceu em {dataBR(a.validoAte || '')} ({a.dias} dias até a data da IS). {a.regra.descricao}.</span>
      </p>
    );
  }
  return (
    <p className="text-xs text-ink-3">
      <StatusTag tone="attention" dot={false}>Conferir validade</StatusTag>{' '}
      <span className="ml-1">{a.situacao === 'sem_data' ? 'Data do laudo não identificada.' : 'Data do laudo posterior à data da IS.'} {a.regra.descricao}.</span>
    </p>
  );
};

/** Um documento dentro do campo da transcrição. */
const Documento: React.FC<{ item: ItemExame; varios: boolean; validade?: AvaliacaoValidade | null }> = ({ item, varios, validade }) => {
  const rodape = [item.emissor, item.data ? dataBR(item.data) : ''].filter(Boolean).join(' - ');
  return (
    <div className="space-y-2">
      {varios && <p className="text-xs font-bold text-navy uppercase break-words">{nomeDoItem(item)}</p>}
      {validade && <AvisoValidade a={validade} />}
      {item.valores?.length ? (
        // Cada analito é copiado separadamente ("Hemoglobina: 15,4"), sem unidade (padrão dos concursos).
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          {item.valores.map((v, i) => (
            <li key={`${v.nome}-${i}`} className="flex items-center gap-2 py-1 border-b border-line/70">
              <span className={`min-w-0 flex-1 text-sm truncate ${v.alterado ? 'font-bold text-wine' : 'text-ink'}`} title={v.nome}>{v.nome}</span>
              {v.alterado && <AlertaReferencia v={v} />}
              <span className={`text-sm font-bold tabular-nums ${v.alterado ? 'text-wine' : 'text-navy'}`}>{v.valor}</span>
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

export const PainelDocumentoIS: React.FC<Props> = ({ aba, exame: e, podeZimbra, podeExcluir = false, validade, onAviso }) => {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const excluir = async () => {
    setExcluindo(true);
    try {
      await apagarExameIS(e.isId, e);
      onAviso('Documento excluído: PDF e transcrição apagados.');
    } catch {
      onAviso('Não foi possível excluir o documento.', 'error');
    } finally {
      setExcluindo(false);
      setConfirmandoExclusao(false);
    }
  };
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
  if (podeExcluir) acoes.push({ id: 'excluir', rotulo: 'Excluir', icone: 'delete', variante: 'destructive', loading: excluindo, onClick: () => setConfirmandoExclusao(true) });
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
              : e.itens.map((it, i) => <Documento key={i} item={it} varios={e.itens.length > 1} validade={validade ? avaliarValidade(it, validade.referencia, validade.finalidade) : null} />)}
          </div>
          {copia && <BotaoCopiar texto={copia} titulo="Copiar a transcrição" className="absolute top-1.5 right-1.5 bg-white border border-line" />}
        </div>
        {e.textoIncompleto && <p className="text-xs text-ink-3">A transcrição pode estar incompleta: confira no PDF.</p>}
      </div>

      {confirmandoExclusao && createPortal(
        <ConfirmDialog
          title="Excluir documento" destructive confirmLabel="Excluir"
          message={`O PDF${e.nomeArquivo ? ` "${e.nomeArquivo}"` : ''} e a transcrição salva serão apagados. Esta ação não pode ser desfeita.`}
          onConfirm={() => void excluir()} onCancel={() => { if (!excluindo) setConfirmandoExclusao(false); }}
        />,
        document.body,
      )}
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
