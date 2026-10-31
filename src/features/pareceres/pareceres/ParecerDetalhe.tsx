// Ficheiro: components/pareceres/ParecerDetalhe.tsx
// Detalhe de um pedido de parecer em barra lateral (bottom sheet no mobile): histórico,
// quesitos, PDF, solicitante e as ações do pedido — duplicar e marcar como concluído
// (com "Desfazer" no aviso). Auditoria v2: C2/C7/G2.
import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { StatusTag, type StatusTone } from '@/components/ui/StatusTag';
import { extrairNomeInspecionado } from '@/utils/format';
import { statusEfetivo, type ParecerRecord, type StatusParecer } from '@/services/firestorePareceres';

export const STATUS_PARECER: Record<StatusParecer, { rotulo: string; tom: StatusTone }> = {
  solicitado: { rotulo: 'Solicitado', tom: 'navyOutline' },
  atrasado: { rotulo: 'Atrasado', tom: 'danger' },
  concluido: { rotulo: 'Concluído', tom: 'success' },
};

export const diasDesde = (p: ParecerRecord, agora = Date.now()): number =>
  Math.max(0, Math.floor((agora - (p.criadoEm?.toMillis?.() ?? agora)) / 86_400_000));

const Linha: React.FC<{ rotulo: string; valor?: string }> = ({ rotulo, valor }) => (
  <div><dt className="text-xs font-semibold text-ink-3">{rotulo}</dt><dd className="text-sm text-ink break-words">{valor || '—'}</dd></div>
);

interface Props {
  parecer: ParecerRecord;
  podeGerar: boolean;
  onClose: () => void;
  onAbrirPdf: () => void;
  onConcluir: (concluido: boolean) => void;
  onDuplicar: () => void;
}

export const ParecerDetalhe: React.FC<Props> = ({ parecer: p, podeGerar, onClose, onAbrirPdf, onConcluir, onDuplicar }) => {
  const status = statusEfetivo(p);
  const nome = extrairNomeInspecionado(p.inspecionado);
  const prefixo = p.inspecionado.slice(0, p.inspecionado.indexOf(nome)).trim();
  const data = p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? 'agora';
  const dias = diasDesde(p);

  return (
    <Drawer
      title="Pedido de parecer"
      icon="assignment"
      onClose={onClose}
      footer={podeGerar ? (
        <>
          <Button variant="secondary" icon="content_copy" onClick={onDuplicar}>Duplicar</Button>
          {status === 'concluido'
            ? <Button variant="secondary" icon="undo" onClick={() => onConcluir(false)}>Reabrir</Button>
            : <Button icon="task_alt" onClick={() => onConcluir(true)}>Marcar como concluído</Button>}
        </>
      ) : <Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      <div className="space-y-5">
        <div className="space-y-1">
          {prefixo && <p className="text-xs font-semibold text-ink-3">{prefixo}</p>}
          <h3 className="text-h2 font-extrabold text-navy break-words">{nome}</h3>
          <StatusTag tone={STATUS_PARECER[status].tom}>
            {STATUS_PARECER[status].rotulo}{status === 'atrasado' ? ` · ${dias} dias` : ''}
          </StatusTag>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Linha rotulo="Especialidade" valor={p.especialidade} />
          <Linha rotulo="Finalidade" valor={p.finalidade} />
          <Linha rotulo="Solicitante" valor={p.solicitanteUsuario || p.solicitanteNome} />
          <Linha rotulo="Pedido em" valor={data} />
          {status === 'concluido' && p.concluidoEm && <Linha rotulo="Concluído em" valor={p.concluidoEm.toDate?.().toLocaleDateString('pt-BR')} />}
          {status === 'concluido' && p.concluidoPor && <Linha rotulo="Concluído por" valor={p.concluidoPor} />}
        </dl>

        <div>
          <h4 className="text-h3 font-bold text-navy mb-1">Histórico</h4>
          <p className="text-sm text-ink whitespace-pre-line break-words">{p.historico || '—'}</p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-h3 font-bold text-navy">Quesitos</h4>
            <span className="text-xs font-bold text-ink-3 bg-thead rounded-full px-2 py-0.5">{p.quesitos?.length ?? 0}</span>
          </div>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-ink">
            {(p.quesitos ?? []).map((q, i) => <li key={i} className="whitespace-pre-line break-words">{q}</li>)}
          </ol>
        </div>

        <button
          type="button" onClick={onAbrirPdf} disabled={!p.pdfUrl}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-line hover:border-navy text-left transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[28px] text-navy shrink-0" aria-hidden="true">picture_as_pdf</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-navy">Pedido de parecer.pdf</span>
            <span className="block text-xs text-ink-3">gerado em {data}</span>
          </span>
          <span className="text-sm font-bold text-blue underline underline-offset-2">Abrir</span>
        </button>
      </div>
    </Drawer>
  );
};
