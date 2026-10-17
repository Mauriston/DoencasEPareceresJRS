// Ficheiro: components/Pareceres.tsx
// Pedidos de Parecer Médico: tabela dos pedidos (Firestore, coleção "pareceres") com
// status Solicitado / Atrasado (20 dias ou mais sem conclusão) / Concluído, PDF de
// cada pedido e caixa para marcar como concluído. Quem pode gerar (Admin e médicos)
// também vê "Novo parecer" (barra lateral/bottom sheet); o Admin ainda configura os
// quesitos por especialidade.
import React, { useEffect, useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { StatusTag, type StatusTone } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { controlClass } from './ui/Field';
import { NovoParecerForm } from './pareceres/NovoParecerForm';
import { QuesitosConfig } from './pareceres/QuesitosConfig';
import { useNav } from '../context/NavContext';
import { useStoragePdf } from '../hooks/useStoragePdf';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { canUseFeature } from '../config/permissions';
import { observarPareceres, marcarConcluido, statusEfetivo, type ParecerRecord, type StatusParecer } from '../services/firestorePareceres';
import { normalizarBusca } from '../utils/corposQuadros';
import { extrairNomeInspecionado } from '../utils/format';

type Filtro = 'todos' | StatusParecer;

const STATUS: Record<StatusParecer, { rotulo: string; tom: StatusTone }> = {
  solicitado: { rotulo: 'Solicitado', tom: 'navyOutline' },
  atrasado: { rotulo: 'Atrasado', tom: 'danger' },
  concluido: { rotulo: 'Concluído', tom: 'success' },
};

const formatarData = (p: ParecerRecord): string => p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? 'agora';

export const Pareceres: React.FC = () => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const podeGerar = canUseFeature('pareceres.gerar', perfil);
  const ehAdmin = perfil === 'admin';
  const { openUrl: abrirPdf, modalElement: pdfModal } = useStoragePdf();
  const isDesktop = useIsDesktop();

  const [lista, setLista] = useState<ParecerRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [soMeus, setSoMeus] = useState(false);
  const [novo, setNovo] = useState(false);
  const [config, setConfig] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [agora] = useState(() => Date.now());

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), 4000); };

  useEffect(() => observarPareceres(setLista, e => setErroCarga(e.message || 'Não foi possível carregar os pareceres.')), []);

  const comStatus = useMemo(() => (lista ?? []).map(p => ({ p, status: statusEfetivo(p, agora) })), [lista, agora]);
  const totais = useMemo(() => ({
    todos: comStatus.length,
    solicitado: comStatus.filter(x => x.status === 'solicitado').length,
    atrasado: comStatus.filter(x => x.status === 'atrasado').length,
    concluido: comStatus.filter(x => x.status === 'concluido').length,
  }), [comStatus]);
  const especialidades = useMemo(() => Array.from(new Set(comStatus.map(x => x.p.especialidade).filter(Boolean))).sort(), [comStatus]);

  const filtrada = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return comStatus
      .filter(x => filtro === 'todos' || x.status === filtro)
      .filter(x => !especialidade || x.p.especialidade === especialidade)
      .filter(x => !soMeus || x.p.solicitanteUid === nav?.authUser?.uid)
      .filter(x => { const alvo = normalizarBusca(`${x.p.inspecionado} ${x.p.especialidade} ${x.p.finalidade} ${x.p.solicitanteNome}`); return termos.every(t => alvo.includes(t)); });
  }, [comStatus, filtro, especialidade, busca, soMeus, nav?.authUser?.uid]);

  const alternarConcluido = async (p: ParecerRecord, concluido: boolean) => {
    try {
      await marcarConcluido(p.id, concluido, nav?.authUser?.nome || '');
      avisar(concluido ? 'Parecer marcado como concluído.' : 'Parecer reaberto.');
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível alterar o status.', 'error');
    }
  };

  const abrir = (p: ParecerRecord) => abrirPdf(p.pdfUrl, `Pedido de Parecer — ${p.especialidade} — ${extrairNomeInspecionado(p.inspecionado)}`);

  const caixa = (p: ParecerRecord, status: StatusParecer) => (
    <label className="inline-flex items-center justify-center w-11 h-11 cursor-pointer" title={status === 'concluido' ? 'Concluído — desmarque para reabrir' : 'Marcar como concluído'}>
      <input type="checkbox" checked={status === 'concluido'} onChange={e => alternarConcluido(p, e.target.checked)} aria-label={`Parecer de ${extrairNomeInspecionado(p.inspecionado)} concluído`} className="w-5 h-5 accent-navy" />
    </label>
  );

  const nomeDe = (p: ParecerRecord) => {
    const nome = extrairNomeInspecionado(p.inspecionado);
    const prefixo = p.inspecionado.slice(0, p.inspecionado.indexOf(nome)).trim();
    return (<><span className="block font-semibold text-navy break-words">{nome}</span>{prefixo && <span className="block text-xs text-ink-3">{prefixo}</span>}</>);
  };

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader
          title="Pareceres"
          description="Pedidos de parecer médico assistencial por especialidade, com acompanhamento do status."
          actions={(
            <>
              {ehAdmin && <Button variant="secondary" icon="tune" onClick={() => setConfig(true)}>Quesitos</Button>}
              {podeGerar && <Button icon="add" onClick={() => setNovo(true)}>Novo parecer</Button>}
            </>
          )}
        />

        <div className="bg-white rounded-xl border border-line p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
              <input type="search" aria-label="Buscar parecer" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por inspecionado, finalidade ou solicitante…" className={`${controlClass} pl-10`} autoComplete="off" />
            </div>
            <select aria-label="Filtrar por especialidade" value={especialidade} onChange={e => setEspecialidade(e.target.value)} className={`${controlClass} sm:w-56`}>
              <option value="">Todas as especialidades</option>
              {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              ariaLabel="Situação do parecer"
              className="overflow-x-auto"
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: 'todos', label: 'Todos', badge: totais.todos, badgeTone: 'neutro' },
                { value: 'solicitado', label: 'Solicitados', badge: totais.solicitado, badgeTone: 'neutro' },
                { value: 'atrasado', label: 'Atrasados', badge: totais.atrasado, badgeTone: 'neutro' },
                { value: 'concluido', label: 'Concluídos', badge: totais.concluido, badgeTone: 'neutro' },
              ]}
            />
            {podeGerar && <Button variant={soMeus ? 'primary' : 'secondary'} icon="person" aria-pressed={soMeus} onClick={() => setSoMeus(v => !v)}>Minhas solicitações</Button>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-line overflow-clip">
          {erroCarga ? (
            <p role="alert" className="p-6 text-sm font-semibold text-wine">{erroCarga}</p>
          ) : lista === null ? (
            <p className="p-10 text-center text-sm text-ink-3" role="status">Carregando pareceres…</p>
          ) : filtrada.length === 0 ? (
            <EmptyState icon="description" title={lista.length === 0 ? 'Nenhum parecer solicitado' : 'Nenhum resultado'} description={lista.length === 0 ? 'Os pedidos de parecer gerados aparecem aqui.' : 'Ajuste a busca ou os filtros.'} />
          ) : (
            <>
              {/* Mobile: cartões */}
              <ul className="md:hidden divide-y divide-line">
                {filtrada.map(({ p, status }) => (
                  <li key={p.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">{nomeDe(p)}</div>
                      <StatusTag tone={STATUS[status].tom}>{STATUS[status].rotulo}</StatusTag>
                    </div>
                    <p className="text-xs text-ink-2">{p.especialidade} · {p.finalidade}</p>
                    <p className="text-xs text-ink-3">{formatarData(p)} · {p.solicitanteNome}</p>
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" icon="picture_as_pdf" disabled={!p.pdfUrl} onClick={() => abrir(p)}>Ver PDF</Button>
                      {podeGerar && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-3">Concluído{caixa(p, status)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {/* Desktop: tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-thead text-ink-3 text-xs border-b border-line">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-semibold whitespace-nowrap">Data</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Inspecionado</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Especialidade</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold hidden 2xl:table-cell">Finalidade</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Solicitante</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold"><span className="sr-only">PDF</span></th>
                      {podeGerar && <th scope="col" className="px-4 py-3 text-center font-semibold">Concluído</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtrada.map(({ p, status }) => (
                      <tr key={p.id} className="hover:bg-thead transition-colors">
                        <td className="px-4 py-3 text-ink-2 whitespace-nowrap align-top">{formatarData(p)}</td>
                        <td className="px-4 py-3 align-top">{nomeDe(p)}</td>
                        <td className="px-4 py-3 text-ink-2 align-top">{p.especialidade}<span className="block text-xs text-ink-3 2xl:hidden">{p.finalidade}</span></td>
                        <td className="px-4 py-3 text-ink-2 align-top hidden 2xl:table-cell">{p.finalidade}</td>
                        <td className="px-4 py-3 text-ink-2 align-top">{p.solicitanteNome}</td>
                        <td className="px-4 py-3 align-top whitespace-nowrap"><StatusTag tone={STATUS[status].tom}>{STATUS[status].rotulo}</StatusTag></td>
                        <td className="px-4 py-1 text-right align-top whitespace-nowrap"><Button variant="ghost" icon="picture_as_pdf" disabled={!p.pdfUrl} onClick={() => abrir(p)}>Ver PDF</Button></td>
                        {podeGerar && <td className="px-4 py-1 text-center align-top">{caixa(p, status)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-line text-xs text-ink-3" role="status">{filtrada.length} parecer{filtrada.length !== 1 ? 'es' : ''}</div>
            </>
          )}
        </div>
      </Container>

      {novo && podeGerar && (
        <NovoParecerForm
          onClose={() => setNovo(false)}
          onGerado={(nome, url) => {
            setNovo(false);
            avisar(`Pedido de parecer gerado para ${nome}.`);
            if (isDesktop) abrirPdf(url, `Pedido de Parecer — ${nome}`); // no mobile, o PDF abre por "Ver PDF" (pop-up bloqueado após o envio)
          }}
        />
      )}
      {config && ehAdmin && <QuesitosConfig onClose={() => setConfig(false)} onAviso={avisar} />}
      {pdfModal}
    </div>
  );
};
