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
import { FilterChip } from './ui/FilterChip';
import { StatusTag } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { controlClass } from './ui/Field';
import { NovoParecerForm } from './pareceres/NovoParecerForm';
import { QuesitosConfig } from './pareceres/QuesitosConfig';
import { ParecerDetalhe, STATUS_PARECER, diasDesde } from './pareceres/ParecerDetalhe';
import { useQueryParam } from '../hooks/useQueryParam';
import { useNav } from '../context/NavContext';
import { useStoragePdf } from '../hooks/useStoragePdf';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { canUseFeature } from '../config/permissions';
import { observarPareceres, marcarConcluido, statusEfetivo, type ParecerRecord, type StatusParecer } from '../services/firestorePareceres';
import { normalizarBusca } from '../utils/corposQuadros';
import { extrairNomeInspecionado } from '../utils/format';

type Filtro = 'todos' | StatusParecer;

const solicitanteDe = (p: ParecerRecord): string => p.solicitanteUsuario || p.solicitanteNome;

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
  const [duplicando, setDuplicando] = useState<ParecerRecord | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [config, setConfig] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error'; acao?: { rotulo: string; onClick: () => void } } | null>(null);
  const [agora] = useState(() => Date.now());
  const [novoParam, setNovoParam] = useQueryParam('novo');

  const avisar = (msg: string, tone: 'success' | 'error' = 'success', acao?: { rotulo: string; onClick: () => void }) => {
    setToast({ msg, tone, acao });
    window.setTimeout(() => setToast(null), acao ? 6000 : 4000);
  };

  useEffect(() => observarPareceres(setLista, e => setErroCarga(e.message || 'Não foi possível carregar os pareceres.')), []);
  // Atalho da Início: /pareceres?novo=1 abre o formulário de novo parecer.
  useEffect(() => {
    if (novoParam === '1') { if (podeGerar) setNovo(true); setNovoParam(null, { replace: true }); }
  }, [novoParam]); // eslint-disable-line react-hooks/exhaustive-deps

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
      .filter(x => { const alvo = normalizarBusca(`${x.p.inspecionado} ${x.p.especialidade} ${x.p.finalidade} ${solicitanteDe(x.p)} ${x.p.militarId}`); return termos.every(t => alvo.includes(t)); });
  }, [comStatus, filtro, especialidade, busca, soMeus, nav?.authUser?.uid]);

  const detalhe = lista?.find(p => p.id === detalheId) ?? null;

  const alternarConcluido = async (p: ParecerRecord, concluido: boolean) => {
    const nome = extrairNomeInspecionado(p.inspecionado);
    try {
      await marcarConcluido(p.id, concluido, nav?.authUser?.nome || '');
      if (concluido) {
        avisar(`Parecer de ${nome} marcado como concluído.`, 'success', {
          rotulo: 'Desfazer',
          onClick: () => { marcarConcluido(p.id, false, '').then(() => avisar('Conclusão desfeita.')).catch(() => avisar('Não foi possível desfazer.', 'error')); },
        });
      } else {
        avisar('Parecer reaberto.');
      }
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível alterar o status.', 'error');
    }
  };

  const abrir = (p: ParecerRecord) => abrirPdf(p.pdfUrl, `Pedido de Parecer — ${p.especialidade} — ${extrairNomeInspecionado(p.inspecionado)}`);

  const nomeDe = (p: ParecerRecord) => {
    const nome = extrairNomeInspecionado(p.inspecionado);
    const prefixo = p.inspecionado.slice(0, p.inspecionado.indexOf(nome)).trim();
    return (<><span className="block font-semibold text-navy break-words">{nome}</span>{prefixo && <span className="block text-xs text-ink-3">{prefixo}</span>}</>);
  };
  const quando = (p: ParecerRecord, status: StatusParecer) => {
    const d = formatarData(p);
    if (status === 'concluido') return <><span className="block text-ink-2">{d}</span><span className="block text-xs text-ink-3">concluído{p.concluidoEm?.toDate ? ` ${p.concluidoEm.toDate().toLocaleDateString('pt-BR').slice(0, 5)}` : ''}</span></>;
    const dias = diasDesde(p, agora);
    return <><span className="block text-ink-2">{d}</span><span className={`block text-xs ${status === 'atrasado' ? 'font-semibold text-wine' : 'text-ink-3'}`}>{dias === 0 ? 'hoje' : `há ${dias} dia${dias !== 1 ? 's' : ''}`}</span></>;
  };

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} acao={toast?.acao} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader
          title="Pareceres"
          description="Pedidos de parecer por especialidade e o andamento de cada um."
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
              <input type="search" aria-label="Buscar parecer" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Inspecionado ou NIP…" className={`${controlClass} pl-10`} autoComplete="off" />
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
                { value: 'atrasado', label: 'Atrasados', badge: totais.atrasado, badgeTone: 'alerta' },
                { value: 'solicitado', label: 'Solicitados', badge: totais.solicitado, badgeTone: 'neutro' },
                { value: 'concluido', label: 'Concluídos', badge: totais.concluido, badgeTone: 'neutro' },
              ]}
            />
            {podeGerar && <FilterChip ativo={soMeus} icon="person" onAlternar={() => setSoMeus(v => !v)}>Minhas solicitações</FilterChip>}
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
              {/* Mobile: cartões — tocar abre o detalhe */}
              <ul className="md:hidden divide-y divide-line">
                {filtrada.map(({ p, status }) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setDetalheId(p.id)} className="w-full text-left px-4 py-3 space-y-1 hover:bg-thead">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">{nomeDe(p)}</span>
                        <StatusTag tone={STATUS_PARECER[status].tom}>{STATUS_PARECER[status].rotulo}</StatusTag>
                      </span>
                      <span className="block text-xs text-ink-2">{p.especialidade} · {p.finalidade}</span>
                      <span className="block text-xs text-ink-3">{formatarData(p)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {/* Desktop: tabela enxuta — a linha abre o detalhe */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-thead text-ink-3 text-xs border-b border-line">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Inspecionado</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Especialidade · Finalidade</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold whitespace-nowrap">Pedido em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtrada.map(({ p, status }) => (
                      <tr
                        key={p.id}
                        onClick={() => setDetalheId(p.id)}
                        className={`cursor-pointer hover:bg-thead transition-colors ${p.id === detalheId ? 'bg-thead shadow-[inset_3px_0_0_#FAB932]' : ''}`}
                      >
                        <td className="px-4 py-3 align-top">
                          <button type="button" onClick={e => { e.stopPropagation(); setDetalheId(p.id); }} className="text-left w-full" aria-label={`Abrir detalhe do parecer de ${extrairNomeInspecionado(p.inspecionado)}`}>{nomeDe(p)}</button>
                        </td>
                        <td className="px-4 py-3 align-top"><span className="block text-ink-2">{p.especialidade}</span><span className="block text-xs text-ink-3">{p.finalidade}</span></td>
                        <td className="px-4 py-3 align-top whitespace-nowrap"><StatusTag tone={STATUS_PARECER[status].tom}>{STATUS_PARECER[status].rotulo}</StatusTag></td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">{quando(p, status)}</td>
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

      {detalhe && (
        <ParecerDetalhe
          parecer={detalhe}
          podeGerar={podeGerar}
          onClose={() => setDetalheId(null)}
          onAbrirPdf={() => abrir(detalhe)}
          onConcluir={concluido => alternarConcluido(detalhe, concluido)}
          onDuplicar={() => { setDuplicando(detalhe); setDetalheId(null); setNovo(true); }}
        />
      )}
      {novo && podeGerar && (
        <NovoParecerForm
          inicial={duplicando}
          onClose={() => { setNovo(false); setDuplicando(null); }}
          onGerado={(nome, url) => {
            setNovo(false); setDuplicando(null);
            avisar(`Pedido de parecer gerado para ${nome}.`);
            if (isDesktop) abrirPdf(url, `Pedido de Parecer — ${nome}`); // no mobile, o PDF abre pelo detalhe (pop-up bloqueado após o envio)
          }}
        />
      )}
      {config && ehAdmin && <QuesitosConfig onClose={() => setConfig(false)} onAviso={avisar} />}
      {pdfModal}
    </div>
  );
};
