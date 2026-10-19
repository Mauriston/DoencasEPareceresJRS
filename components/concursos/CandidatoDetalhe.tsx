// Ficheiro: components/concursos/CandidatoDetalhe.tsx
// Detalhamento da IS de um candidato em barra lateral à direita (desktop): dados da IS e
// lista dos documentos gerados (termos, pedidos de parecer, solicitações de exames), que abrem
// numa nova janela. Mesmo padrão visual da ficha do militar.
import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { formatDataBr } from '../../utils/format';
import { urlVisualizacao } from '../../services/driveConcursos';
import type { CandidatoRecord, SolicitacaoDoc } from '../../services/firestoreConcursos';

const Linha: React.FC<{ rotulo: string; valor?: string | null; mono?: boolean }> = ({ rotulo, valor, mono }) => {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
      <dd className={`text-sm text-ink break-words whitespace-pre-wrap ${mono ? 'font-mono' : ''}`}>{valor}</dd>
    </div>
  );
};

const ItemDocumento: React.FC<{ icone: string; titulo: string; detalhe?: string; url: string }> = ({ icone, titulo, detalhe, url }) => (
  <a
    href={urlVisualizacao(url)} target="_blank" rel="noopener noreferrer"
    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-line hover:border-navy transition-colors"
  >
    <span className="material-symbols-outlined text-[22px] text-green-700 shrink-0" aria-hidden="true">{icone}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-navy break-words">{titulo}</span>
      {detalhe && <span className="block text-xs text-ink-3 break-words">{detalhe}</span>}
    </span>
    <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">open_in_new</span>
  </a>
);

const dataDoDocumento = (d: SolicitacaoDoc): string => {
  const data = d.criadoEm ? new Date(d.criadoEm) : null;
  return data && !isNaN(data.getTime()) ? `Gerado em ${data.toLocaleDateString('pt-BR')}` : '';
};

interface Props {
  candidato: CandidatoRecord;
  concursoNome: string;
  statusTag: React.ReactNode;
  onClose: () => void;
}

export const CandidatoDetalhe: React.FC<Props> = ({ candidato: c, concursoNome, statusTag, onClose }) => {
  const qtdDocs = (c.termoRecursoUrl ? 1 : 0) + (c.termoCientificacaoUrl ? 1 : 0) + c.solicitacoesParecer.length + c.solicitacoesExames.length;
  return (
    <Drawer
      title="Detalhes da IS"
      icon="assignment_ind"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      <div className="space-y-5">
        <div>
          <p className="text-base font-bold text-navy break-words">{c.nome}</p>
          <p className="text-sm text-ink-2 font-mono">{c.id}</p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {statusTag}
            {c.finalizado && <span className="text-xs font-semibold text-green-800">IS finalizada</span>}
          </div>
        </div>

        <dl className="space-y-3">
          <Linha rotulo="Concurso" valor={concursoNome} />
          <Linha rotulo="Data agendada" valor={formatDataBr(c.dataAgendamento)} />
          <Linha rotulo="Observações" valor={c.observacoes} />
          <Linha rotulo="Nº TIS" valor={c.numTIS} />
          <Linha rotulo="Data do laudo" valor={c.dataLaudo} />
          <Linha rotulo="Laudo" valor={c.laudo} />
          <Linha rotulo="Recurso" valor={c.recurso ? 'Termo de recurso gerado' : ''} />
        </dl>

        <section aria-label="Documentos gerados">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-3 border-t border-line pt-4 mb-3">
            Documentos gerados {qtdDocs > 0 && <span className="text-xs font-bold text-ink-3 bg-thead rounded-full px-2 py-0.5 align-middle normal-case">{qtdDocs}</span>}
          </h3>
          {qtdDocs === 0 ? (
            <p className="text-sm text-ink-3">Nenhum documento gerado para esta IS.</p>
          ) : (
            <ul className="space-y-2">
              {c.termoRecursoUrl && <li><ItemDocumento icone="description" titulo="Termo de Recurso e Cientificação" url={c.termoRecursoUrl} /></li>}
              {c.termoCientificacaoUrl && <li><ItemDocumento icone="assignment_turned_in" titulo="Termo de Cientificação de Resultado" url={c.termoCientificacaoUrl} /></li>}
              {c.solicitacoesParecer.map((d, i) => (
                <li key={`p${i}`}><ItemDocumento icone="clinical_notes" titulo={`Pedido de Parecer · ${d.rotulo}`} detalhe={dataDoDocumento(d)} url={d.url} /></li>
              ))}
              {c.solicitacoesExames.map((d, i) => (
                <li key={`e${i}`}><ItemDocumento icone="lab_panel" titulo={`Solicitação de Exames · ${d.rotulo}`} detalhe={dataDoDocumento(d)} url={d.url} /></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
};
