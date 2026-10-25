// Ficheiro: components/concursos/CandidatoDetalhe.tsx
// Detalhamento da IS de um candidato em barra lateral à direita (desktop): dados da IS,
// lista dos documentos gerados (termos, pedidos de parecer, solicitações de exames) e os
// exames que o candidato entregou — todos abrindo numa nova janela. Mesmo padrão visual
// da ficha do militar.
import React, { useEffect, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { formatDataBr } from '../../utils/format';
import { urlVisualizacao } from '../../services/driveConcursos';
import { listarExamesCandidato, type CandidatoRecord, type ExamesEnvioRecord, type SolicitacaoDoc } from '../../services/firestoreConcursos';

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

/** Mesma moldura do ItemDocumento, mas para uma ação dentro do app (não abre nova janela). */
const ItemAcao: React.FC<{ icone: string; titulo: string; detalhe?: string; onClick: () => void }> = ({ icone, titulo, detalhe, onClick }) => (
  <button
    type="button" onClick={onClick}
    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border border-line hover:border-navy transition-colors"
  >
    <span className="material-symbols-outlined text-[22px] text-blue-700 shrink-0" aria-hidden="true">{icone}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-navy break-words">{titulo}</span>
      {detalhe && <span className="block text-xs text-ink-3 break-words">{detalhe}</span>}
    </span>
    <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">chevron_right</span>
  </button>
);

const dataDoDocumento = (d: SolicitacaoDoc): string => {
  const data = d.criadoEm ? new Date(d.criadoEm) : null;
  return data && !isNaN(data.getTime()) ? `Gerado em ${data.toLocaleDateString('pt-BR')}` : '';
};

const dataDoEnvio = (e: ExamesEnvioRecord): string => {
  const data = e.criadoEm ? new Date(e.criadoEm) : null;
  return data && !isNaN(data.getTime()) ? `Enviado em ${data.toLocaleDateString('pt-BR')}` : '';
};

interface Props {
  candidato: CandidatoRecord;
  concursoId: string;
  concursoNome: string;
  statusTag: React.ReactNode;
  onClose: () => void;
  /** Abre a tela cheia com os exames transcritos (só existe no desktop). */
  onVerExames?: () => void;
}

export const CandidatoDetalhe: React.FC<Props> = ({ candidato: c, concursoId, concursoNome, statusTag, onClose, onVerExames }) => {
  const qtdDocs = (c.termoRecursoUrl ? 1 : 0) + (c.termoCientificacaoUrl ? 1 : 0) + c.solicitacoesParecer.length + c.solicitacoesExames.length;

  // Os exames ficam numa subcoleção (ver firestoreConcursos): só são lidos quando o
  // candidato tem algum, e só ao abrir esta barra — a planilha não os carrega.
  const [envios, setEnvios] = useState<ExamesEnvioRecord[] | null>(null);
  const [erroExames, setErroExames] = useState(false);
  useEffect(() => {
    if (c.examesQtd === 0) { setEnvios([]); return; }
    let ativo = true;
    setEnvios(null);
    setErroExames(false);
    listarExamesCandidato(concursoId, c.id)
      .then(lista => { if (ativo) setEnvios(lista); })
      .catch(() => { if (ativo) { setEnvios([]); setErroExames(true); } });
    return () => { ativo = false; };
  }, [concursoId, c.id, c.examesQtd]);

  const nomesDosExames = (envios ?? []).flatMap(e => e.exames.map(x => x.nome)).filter(Boolean);

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

        <section aria-label="Exames enviados">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-3 border-t border-line pt-4 mb-3">
            Exames enviados {c.examesQtd > 0 && <span className="text-xs font-bold text-ink-3 bg-thead rounded-full px-2 py-0.5 align-middle normal-case">{c.examesQtd}</span>}
          </h3>
          {c.examesQtd === 0 ? (
            <p className="text-sm text-ink-3">Nenhum exame enviado para este candidato.</p>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2">
                {/* Um candidato pode ter entregue os exames em mais de um PDF. */}
                {(envios ?? []).filter(e => e.pdfUrl).map(envio => (
                  <li key={envio.id}>
                    <ItemDocumento
                      icone="lab_profile"
                      titulo={envio.nomeArquivo || 'Exames do candidato'}
                      detalhe={dataDoEnvio(envio)}
                      url={envio.pdfUrl}
                    />
                  </li>
                ))}
                {onVerExames && (
                  <li>
                    <ItemAcao
                      icone="content_paste_search"
                      titulo="Ver exames transcritos"
                      detalhe={`${c.examesQtd} exame${c.examesQtd === 1 ? '' : 's'} para ler e copiar`}
                      onClick={onVerExames}
                    />
                  </li>
                )}
              </ul>

              {envios === null && (
                <p className="text-sm text-ink-3 flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[18px] text-navy" aria-hidden="true">progress_activity</span>
                  Carregando os exames...
                </p>
              )}
              {erroExames && <p className="text-sm text-wine-700">Não foi possível carregar a lista de exames.</p>}

              {nomesDosExames.length > 0 && (
                <ul className="list-disc pl-5 space-y-0.5 text-sm text-ink marker:text-ink-4">
                  {nomesDosExames.map((nome, i) => <li key={`${nome}-${i}`} className="break-words">{nome}</li>)}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </Drawer>
  );
};
