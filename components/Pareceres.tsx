// Ficheiro: components/Pareceres.tsx
// Pedidos de Parecer Médico: tabela dos pedidos (Firestore, coleção "pareceres") com
// status Solicitado / Atrasado (20 dias ou mais sem conclusão) / Concluído, PDF de
// cada pedido e caixa para marcar como concluído. Quem pode gerar (Admin e médicos)
// também vê "Novo parecer" (barra lateral/bottom sheet); o Admin ainda configura os
// quesitos por especialidade.
import { abrirPdf } from '../services/abrirPdf';
import React, { useEffect, useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { AbasSublinhadas } from './periciaMenor/partes';
import { FilterChip } from './ui/FilterChip';
import { StatusTag } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { controlClass, SearchField } from './ui/Field';
import { NovoParecerForm } from './pareceres/NovoParecerForm';
import { QuesitosConfig } from './pareceres/QuesitosConfig';
import { ParecerDetalhe, STATUS_PARECER, diasDesde } from './pareceres/ParecerDetalhe';
import { EnviarImpressaoDialog, type AlvoImpressao } from './pareceres/EnviarImpressaoDialog';
import { IconButton } from './ui/IconButton';
import { useQueryParam } from '../hooks/useQueryParam';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';
import { observarPareceres, marcarConcluido, statusEfetivo, type ParecerRecord, type StatusParecer } from '../services/firestorePareceres';
import { normalizarBusca } from '../utils/corposQuadros';
import { extrairNomeInspecionado } from '../utils/format';

type Filtro = 'todos' | StatusParecer;

const SITUACAO_URL: Record<string, Filtro> = {
  atrasado: 'atrasado', atrasados: 'atrasado', solicitado: 'solicitado', solicitados: 'solicitado', concluido: 'concluido', concluidos: 'concluido',
};

const solicitanteDe = (p: ParecerRecord): string => p.solicitanteUsuario || p.solicitanteNome;

const formatarData = (p: ParecerRecord): string => p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? 'agora';

export const Pareceres: React.FC = () => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const podeGerar = canUseFeature('pareceres.gerar', perfil);
  const ehAdmin = perfil === 'admin';

  const [lista, setLista] = useState<ParecerRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  // Situação na URL (/pareceres?situacao=atrasados|solicitados|concluidos), para os contadores da
  // Início e do Painel abrirem a lista já filtrada. Aceita singular ou plural.
  const [situacaoParam, setSituacaoParam] = useQueryParam('situacao');
  const filtro: Filtro = SITUACAO_URL[situacaoParam ?? ''] ?? 'todos';
  const setFiltro = (f: Filtro) => setSituacaoParam(f === 'todos' ? null : `${f}s`, { replace: true });
  const [busca, setBusca] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [soMeus, setSoMeus] = useState(false);
  const [novo, setNovo] = useState(false);
  const [duplicando, setDuplicando] = useState<ParecerRecord | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [config, setConfig] = useState(false);
  // Enviar para Impressão: aberto logo após gerar um parecer (aposGerar) ou pelo ícone da lista.
  const [impressao, setImpressao] = useState<{ alvo: AlvoImpressao; aposGerar: boolean } | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error'; acao?: { rotulo: string; onClick: () => void } } | null>(null);
  const [agora] = useState(() => Date.now());
  const [novoParam, setNovoParam] = useQueryParam('novo');
  // /pareceres?novo=1&militar=<nip> (link da Ficha do inspecionado): abre o formulário já com o militar.
  const [militarParam, setMilitarParam] = useQueryParam('militar');
  const [prefill, setPrefill] = useState<{ militarId: string; finalidade: string } | null>(null);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success', acao?: { rotulo: string; onClick: () => void }) => {
    setToast({ msg, tone, acao });
    window.setTimeout(() => setToast(null), acao ? 6000 : 4000);
  };

  useEffect(() => observarPareceres(setLista, e => setErroCarga(e.message || 'Não foi possível carregar os pareceres.')), []);
  // Atalho da Início: /pareceres?novo=1 abre o formulário de novo parecer.
  useEffect(() => {
    if (novoParam === '1') {
      if (podeGerar) { setPrefill(militarParam ? { militarId: militarParam, finalidade: '' } : null); setNovo(true); }
      setNovoParam(null, { replace: true });
      if (militarParam) setMilitarParam(null, { replace: true });
    }
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

  // O PDF (Drive ou, nos mais antigos, Storage) abre sempre numa nova janela, no desktop e no mobile.
  const abrir = (p: ParecerRecord) => { abrirPdf(p.pdfUrl).catch(() => { /* aba fechada */ }); };
  const pedirImpressao = (p: ParecerRecord) =>
    setImpressao({ alvo: { nome: extrairNomeInspecionado(p.inspecionado), pdfUrl: p.pdfUrl, remetente: solicitanteDe(p) }, aposGerar: false });

  const nomeDe = (p: ParecerRecord) => {
    const nome = extrairNomeInspecionado(p.inspecionado);
    const prefixo = p.inspecionado.slice(0, p.inspecionado.indexOf(nome)).trim();
    return (<><span className="block font-semibold text-navy break-words">{nome}</span>{prefixo && <span className="block text-xs text-ink-3">{prefixo}</span>}</>);
  };
  const quando = (p: ParecerRecord, status: StatusParecer) => {
    const d = formatarData(p);
    if (status === 'concluido') return <><span className="block text-ink">{d}</span><span className="block text-xs text-ink-3">concluído{p.concluidoEm?.toDate ? ` ${p.concluidoEm.toDate().toLocaleDateString('pt-BR').slice(0, 5)}` : ''}</span></>;
    const dias = diasDesde(p, agora);
    return <><span className="block text-ink">{d}</span><span className={`block text-xs ${status === 'atrasado' ? 'font-semibold text-wine' : 'text-ink-3'}`}>{dias === 0 ? 'hoje' : `há ${dias} dia${dias !== 1 ? 's' : ''}`}</span></>;
  };

  // Células compartilhadas entre a lista do celular e a tabela do desktop (auditoria v3, M10):
  // o mesmo dado sai da mesma função nas duas larguras.
  const tagStatus = (status: StatusParecer) => <StatusTag tone={STATUS_PARECER[status].tom}>{STATUS_PARECER[status].rotulo}</StatusTag>;
  const botaoImprimir = (p: ParecerRecord) => (p.pdfUrl
    ? <IconButton icon="print" variant="secondary" size="sm" label={`Enviar para impressão o parecer de ${extrairNomeInspecionado(p.inspecionado)}`} onClick={e => { e.stopPropagation(); pedirImpressao(p); }} />
    : null);

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} acao={toast?.acao} />
      <Container size="data" className={`pt-0 md:pt-8 ${podeGerar ? 'pb-28 md:pb-10' : 'pb-10'} flex flex-col gap-4`}>
        <PageHeader
          title="Pareceres"
          description="Pedidos de parecer por especialidade e o andamento de cada um."
          secundarias={[{ id: 'quesitos', rotulo: 'Quesitos', icone: 'tune', onClick: () => setConfig(true), permitido: ehAdmin }]}
          fab={podeGerar ? { icon: 'add', label: 'Novo parecer', onClick: () => setNovo(true) } : undefined}
        />

        {/* Situação em abas sublinhadas (G2 — mesmo padrão de Inspeções, Concursos e Perícia Menor): ouro = ativa,
            contagem em pílula (vinho em "Atrasados" quando há atraso). Abaixo, busca + especialidade + "Minhas
            solicitações" (FilterChip); a lista é o painel das abas. */}
        <section aria-label="Lista de pareceres" className="bg-white border-y border-line md:border md:rounded-xl overflow-clip -mx-4 md:mx-0">
          <AbasSublinhadas<Filtro>
            rotulo="Situação do parecer" idBase="pareceres-situacao" ativa={filtro} onChange={setFiltro} className="px-4"
            abas={[
              { id: 'todos', rotulo: 'Todos', contagem: totais.todos },
              { id: 'atrasado', rotulo: 'Atrasados', contagem: totais.atrasado, alerta: true },
              { id: 'solicitado', rotulo: 'Solicitados', contagem: totais.solicitado },
              { id: 'concluido', rotulo: 'Concluídos', contagem: totais.concluido },
            ]}
          />
          <div className="p-4 flex flex-col md:flex-row md:items-center gap-2">
            <SearchField className="md:flex-1 md:max-w-md" label="Buscar parecer" value={busca} onChange={setBusca} placeholder="Inspecionado ou NIP…" autoComplete="off" />
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Filtrar por especialidade" value={especialidade} onChange={e => setEspecialidade(e.target.value)} className={`${controlClass} flex-1 md:flex-none md:w-56`}>
                <option value="">Todas as especialidades</option>
                {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              {podeGerar && <FilterChip ativo={soMeus} icon="person" onAlternar={() => setSoMeus(v => !v)} className="shrink-0">Minhas solicitações</FilterChip>}
            </div>
          </div>

          <div id="pareceres-situacao-painel" role="tabpanel" aria-labelledby={`pareceres-situacao-aba-${filtro}`} className="border-t border-line">
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
                  <li key={p.id} className="flex items-center gap-1 pr-3">
                    <button type="button" onClick={() => setDetalheId(p.id)} className="flex-1 min-w-0 text-left px-4 py-3 space-y-1 hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">{nomeDe(p)}</span>
                        {tagStatus(status)}
                      </span>
                      <span className="block text-xs text-ink">{p.especialidade} · {p.finalidade}</span>
                      <span className="block text-xs">{quando(p, status)}</span>
                    </button>
                    {botaoImprimir(p)}
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
                      <th scope="col" className="px-4 py-3 text-center font-semibold whitespace-nowrap">Imprimir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtrada.map(({ p, status }) => (
                      <tr
                        key={p.id}
                        onClick={() => setDetalheId(p.id)}
                        className={`cursor-pointer hover:bg-thead transition-colors ${p.id === detalheId ? 'bg-thead shadow-[inset_3px_0_0_rgb(var(--c-gold-400))]' : ''}`}
                      >
                        <td className="px-4 py-3 align-top">
                          <button type="button" onClick={e => { e.stopPropagation(); setDetalheId(p.id); }} className="text-left w-full rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label={`Abrir detalhe do parecer de ${extrairNomeInspecionado(p.inspecionado)}`}>{nomeDe(p)}</button>
                        </td>
                        <td className="px-4 py-3 align-top"><span className="block text-ink">{p.especialidade}</span><span className="block text-xs text-ink-3">{p.finalidade}</span></td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">{tagStatus(status)}</td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">{quando(p, status)}</td>
                        <td className="px-4 py-2 align-top text-center">
                          {botaoImprimir(p)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-line text-xs text-ink-3" role="status">{filtrada.length} {filtrada.length === 1 ? 'parecer' : 'pareceres'}</div>
            </>
          )}
          </div>
        </section>
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
          prefill={prefill ?? undefined}
          onClose={() => { setNovo(false); setDuplicando(null); setPrefill(null); }}
          onGerado={(nome, pdfUrl) => {
            setNovo(false); setDuplicando(null); setPrefill(null);
            setImpressao({ alvo: { nome, pdfUrl, remetente: nav?.authUser?.usuario || nav?.authUser?.nome || '' }, aposGerar: true });
          }}
        />
      )}
      {impressao && (
        <EnviarImpressaoDialog
          alvo={impressao.alvo}
          aposGerar={impressao.aposGerar}
          onClose={() => { if (impressao.aposGerar) avisar(`Pedido de parecer gerado para ${impressao.alvo.nome}.`); setImpressao(null); }}
          onEnviado={msg => { setImpressao(null); avisar(msg); }}
        />
      )}
      {config && ehAdmin && <QuesitosConfig onClose={() => setConfig(false)} onAviso={avisar} />}
    </div>
  );
};
