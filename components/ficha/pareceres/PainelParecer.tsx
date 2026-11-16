// Ficheiro: components/ficha/pareceres/PainelParecer.tsx
// Painel principal da aba Pareceres da Ficha do inspecionado: o PEDIDO (especialidade, finalidade, histórico,
// quesitos e quem assina) e, se houver, a RESPOSTA do especialista — a transcrição da IA num campo só de
// leitura, com o ícone de copiar à direita. Barra: Abrir pedido (PDF) · Abrir resposta (PDF) · Enviar resposta
// (pedido sem resposta; leva a ?criar=resposta — RespostaParecerForm).
import React, { useState } from 'react';
import { CascaPainelFicha, type AcaoBarraFicha } from '../CascaPainelFicha';
import { StatusTag } from '../../ui/StatusTag';
import { IconButton } from '../../ui/IconButton';
import { STATUS_PARECER } from '../../pareceres/ParecerDetalhe';
import { statusEfetivo, type ParecerRecord } from '../../../services/firestorePareceres';

const dataBr = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);
const dataDe = (ts: { toDate?: () => Date } | null | undefined) => ts?.toDate?.().toLocaleDateString('pt-BR') ?? '';

const Dado: React.FC<{ rotulo: string; children?: React.ReactNode; largo?: boolean }> = ({ rotulo, children, largo }) => (
  <div className={largo ? 'col-span-2' : undefined}>
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className="text-sm text-ink break-words">{children || '—'}</dd>
  </div>
);

/** Texto longo só de leitura com o botão de copiar à direita. */
export const TextoCopiavel: React.FC<{ rotulo: string; texto: string }> = ({ rotulo, texto }) => {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(texto).then(() => { setCopiado(true); window.setTimeout(() => setCopiado(false), 2000); }).catch(() => { /* sem área de transferência */ });
  };
  return (
    <div>
      <span className="block text-xs font-semibold text-ink-3 mb-1">{rotulo}</span>
      <div className="flex items-start gap-2">
        <textarea readOnly value={texto} aria-label={rotulo} rows={Math.min(16, Math.max(4, texto.split('\n').length + 1))}
          className="flex-1 min-w-0 rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink whitespace-pre-wrap resize-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" />
        <IconButton icon={copiado ? 'check' : 'content_copy'} label={copiado ? 'Copiado' : 'Copiar transcrição'} variant="secondary" onClick={copiar} />
      </div>
      <span className="sr-only" aria-live="polite">{copiado ? 'Transcrição copiada.' : ''}</span>
    </div>
  );
};

interface Props {
  parecer: ParecerRecord;
  agora: number;
  /** Mostra "Enviar resposta" (pedido sem resposta e permissão pareceres.resposta). */
  podeResponder: boolean;
  onAbrirPdf: (titulo: string, url: string) => void;
  onResponder: () => void;
}

export const PainelParecer: React.FC<Props> = ({ parecer: p, agora, podeResponder, onAbrirPdf, onResponder }) => {
  const st = statusEfetivo(p, agora);
  const desde = dataDe(p.criadoEm);
  const r = p.resposta;
  const titulo = `Parecer de ${p.especialidade}${p.is ? ` — IS ${p.is}` : ''}`;
  const responder = !r && podeResponder && st !== 'concluido';
  // A ação principal (azul) vai por último: Enviar resposta, Abrir resposta ou, sem elas, Abrir pedido.
  const acoes: AcaoBarraFicha[] = [];
  if (p.pdfUrl) acoes.push({ id: 'pdf', rotulo: 'Abrir pedido', icone: 'picture_as_pdf', variante: r || responder ? 'secondary' : 'primary', onClick: () => onAbrirPdf(`Pedido — ${titulo}`, p.pdfUrl) });
  if (r?.pdfUrl) acoes.push({ id: 'resposta-pdf', rotulo: 'Abrir resposta', icone: 'picture_as_pdf', onClick: () => onAbrirPdf(`Resposta — ${titulo}`, r.pdfUrl) });
  if (responder) acoes.push({ id: 'responder', rotulo: 'Enviar resposta', icone: 'upload_file', onClick: onResponder });
  return (
    <CascaPainelFicha
      titulo={`Parecer de ${p.especialidade}`} icone="assignment" tituloExtra={<StatusTag tone={STATUS_PARECER[st].tom}>{STATUS_PARECER[st].rotulo}</StatusTag>}
      subtitulo={[p.is ? `IS ${p.is}` : '', desde ? `solicitado em ${desde}` : '', p.solicitanteUsuario || p.solicitanteNome].filter(Boolean).join(' · ')}
      acoes={acoes}
    >
      <div className="space-y-6">
        <section aria-labelledby={`pedido-${p.id}`} className="space-y-3">
          <h3 id={`pedido-${p.id}`} className="text-sm font-bold text-navy">Pedido</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Dado rotulo="Especialidade">{p.especialidade}</Dado>
            <Dado rotulo="Finalidade">{p.finalidade}</Dado>
            {p.assinanteNome && <Dado rotulo="Assinado por">{p.assinanteNome}</Dado>}
            {p.historico && <Dado rotulo="Histórico" largo><span className="whitespace-pre-line">{p.historico}</span></Dado>}
            {p.quesitos?.length > 0 && (
              <Dado rotulo="Quesitos" largo>
                <ol className="list-decimal pl-5 space-y-1">{p.quesitos.map((q, i) => <li key={i} className="whitespace-pre-line">{q}</li>)}</ol>
              </Dado>
            )}
            {p.concluidoPor && <Dado rotulo="Concluído por">{p.concluidoPor}</Dado>}
          </dl>
        </section>

        {r ? (
          <section aria-labelledby={`resposta-${p.id}`} className="space-y-3 border-t border-line pt-5">
            <h3 id={`resposta-${p.id}`} className="text-sm font-bold text-navy">Resposta</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Dado rotulo="Especialista">{r.emissor}</Dado>
              <Dado rotulo="Data">{r.data ? dataBr(r.data) : ''}</Dado>
              <Dado rotulo="Enviada por">{[r.enviadoPor?.usuario, dataDe(r.enviadoEm)].filter(Boolean).join(' · ')}</Dado>
            </dl>
            <TextoCopiavel rotulo="Transcrição da resposta" texto={r.transcricao} />
            {r.textoIncompleto && <p className="text-xs text-ink-3">A transcrição pode estar incompleta: confira no PDF.</p>}
          </section>
        ) : (
          <p className="text-sm text-ink-3 border-t border-line pt-5">Resposta ainda não enviada.</p>
        )}
      </div>
    </CascaPainelFicha>
  );
};
