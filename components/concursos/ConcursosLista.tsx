// Ficheiro: components/concursos/ConcursosLista.tsx
// Lista de concursos (auditoria v3, 2c): abas de situação + busca + ano + vista numa linha; KPIs no
// contexto do filtro (situação e ano), visíveis também no celular; cards que respondem "como está"
// (barra empilhada) na grade B 8 + 4 com "Próximos dias" e "Em breve" no apoio; tabela opcional
// só a partir de md (no celular são sempre cards — inclusive para a Secretaria, M6).
// Filtros na URL: /concursos?situacao=em_andamento|em_breve|encerrado&ano=AAAA (Início e Painel).
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, PageHeader } from '../ui/Page';
import { concursosDiaPath } from '../../config/routes';
import { useDiasConcursos } from '../../hooks/useDiasConcursos';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { hojeISO } from '../../utils/inspecoes';
import { CalendarioConcursos } from './CalendarioConcursos';
import { useNav } from '../../context/NavContext';
import { observarCandidatos, gerarMinutaResultados, abrirConcurso, voltarParaEmBreve, encerrarConcurso, listarMensagens, type ConcursoRecord, type EstatisticaConcursoStatus } from '../../services/firestoreConcursos';
import { EnviarExamesModal } from './ExamesCandidato';
import { anoDoConcurso } from '../../services/driveConcursos';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { SearchField, controlClass } from '../ui/Field';
import { ConfirmDialog, Dialog } from '../ui/Dialog';
import { MenuAcoes } from '../ui/MenuAcoes';
import { GradePainel } from '../ui/Grade';
import { Toast } from '../ui/Toast';
import { ConfirmDialogState, isoParaBR } from './compartilhado';
import { ModalAdicionarCandidato, ModalDefinirPeriodoAgendamento, ModalKpiBarChart, ModalListarMensagens, ModalRegistrarMensagemArquivo } from './ModaisConcurso';
import { MenuAcoesConcurso, MenuAcoesConcursoProps, itensMenuAcoesConcurso } from './MenuAcoesConcurso';
import { VistaIcones } from './AbasSituacao';
import { AbasSublinhadas } from '../periciaMenor/partes';
import { CardConcurso, KpisContexto, ProximosDias, periodoCurto, plural, type ResumoConcurso } from './PainelConcursos';

export interface ConcursosListaProps {
  concursos: ConcursoRecord[];
  loading: boolean;
  perfil?: string;
  podeRegistrarMensagem: boolean;
  podeGerarMinutaResultados: boolean;
  podeImportarCsv: boolean;
  podeAbrirEncerrar: boolean;
  podeRegistrarMensagemArquivo: boolean;
  podeListarMensagens: boolean;
  podeAdicionarCandidato: boolean;
  podeEnviarExames: boolean;
  podeVisualizarTabela: boolean;
  onSelecionar: (id: string) => void;
  onNovoConcursoClick: () => void;
  onImportarCsvClick: () => void;
  onRecarregar: () => void;
}

export const GRUPOS_STATUS: { status: ConcursoRecord['status']; titulo: string }[] = [
  { status: 'encerrado', titulo: 'Encerrados' },
  { status: 'em_andamento', titulo: 'Em andamento' },
  { status: 'em_breve', titulo: 'Em breve' },
];

const GRUPOS_STATUS_ORDEM: { status: ConcursoRecord['status']; titulo: string }[] = [
  { status: 'em_andamento', titulo: 'Em andamento' },
  { status: 'em_breve', titulo: 'Em breve' },
  { status: 'encerrado', titulo: 'Encerrados' },
];
const SITUACOES = GRUPOS_STATUS_ORDEM.map(g => g.status);
const ehSituacao = (v: string | null): v is ConcursoRecord['status'] => !!v && (SITUACOES as string[]).includes(v);

// Concursos "Em breve" ainda não têm movimentação — zero nessas colunas é
// apenas ausência de dado, então a célula fica em branco em vez de "0".
export const celulaNumericaTabela = (valor: number, status: ConcursoRecord['status']): React.ReactNode =>
  valor === 0 && status === 'em_breve' ? '' : valor;

interface ResumoComLancamento extends ResumoConcurso { temLancamento: boolean }

export const ConcursosLista: React.FC<ConcursosListaProps> = ({ concursos, loading, perfil, podeRegistrarMensagem, podeGerarMinutaResultados, podeImportarCsv, podeAbrirEncerrar, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato, podeEnviarExames, podeVisualizarTabela, onSelecionar, onNovoConcursoClick, onImportarCsvClick, onRecarregar }) => {
  const navLista = useNav();
  const { dias: diasConcursos } = useDiasConcursos();
  const isDesktop = useIsDesktop();
  // Contagem de mensagens arquivadas por concurso — decide se "Listar mensagens" entra no menu.
  const [mensagensCount, setMensagensCount] = useState<Record<string, number>>({});
  // Filtros da lista na URL (?situacao=…&ano=…): a Início e o Painel abrem a lista já filtrada.
  const [searchParams, setSearchParams] = useSearchParams();
  const situacaoUrl = searchParams.get('situacao');
  const statusSel: ConcursoRecord['status'] | null = ehSituacao(situacaoUrl) ? situacaoUrl : null;
  const anoUrl = searchParams.get('ano') ?? '';
  const anoFiltro = /^\d{4}$/.test(anoUrl) ? anoUrl : '';
  const atualizarFiltro = (chave: 'situacao' | 'ano', valor: string) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (valor) p.set(chave, valor); else p.delete(chave);
      return p;
    }, { replace: true });
  };
  const [busca, setBusca] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    try { return localStorage.getItem('jrs.concursos.vista') === 'tabela' ? 'tabela' : 'cards'; } catch { return 'cards'; }
  });
  const definirViewMode = (v: 'cards' | 'tabela') => {
    setViewMode(v);
    try { localStorage.setItem('jrs.concursos.vista', v); } catch { /* preferência é opcional */ }
  };
  // A tabela (860 px) é opção só a partir de md; no celular os cards já trazem aptos/inaptos/faltas/IDM (M6).
  const efetivoViewMode: 'cards' | 'tabela' = podeVisualizarTabela && isDesktop ? viewMode : 'cards';

  const [kpiModal, setKpiModal] = useState<{ titulo: string; corBarra: string; itens: EstatisticaConcursoStatus[] } | null>(null);
  const [calendarioAberto, setCalendarioAberto] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [minutaResultados, setMinutaResultados] = useState<string | null>(null);
  const [pendentesFinalizacao, setPendentesFinalizacao] = useState<{ id: string; nome: string }[] | null>(null);
  const [gerandoMinuta, setGerandoMinuta] = useState(false);
  const [registrarMensagemAlvo, setRegistrarMensagemAlvo] = useState<{ id: string; nome: string; criadoEm?: string } | null>(null);
  const [listarMensagensAlvo, setListarMensagensAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [periodoAgendamentoAlvo, setPeriodoAgendamentoAlvo] = useState<{ id: string; nome: string; inicioISO: string; fimISO: string } | null>(null);
  const [adicionarCandidatoAlvo, setAdicionarCandidatoAlvo] = useState<{ id: string; nome: string } | null>(null);
  // Envio dos exames de um candidato: pelo menu ⋮ de um concurso (só os candidatos dele) ou pelo botão
  // "Enviar exames" do cabeçalho (os de todos os concursos em andamento — antes ficava na Início). O
  // candidato é escolhido no próprio diálogo (autocomplete).
  const [enviarExamesConcursos, setEnviarExamesConcursos] = useState<ConcursoRecord[] | null>(null);
  const emAndamento = useMemo(() => concursos.filter(c => c.status === 'em_andamento'), [concursos]);
  // Só existe com concurso em andamento: fora disso não há candidato a quem anexar os laudos.
  const mostrarEnviarExames = podeEnviarExames && emAndamento.length > 0;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ----- Filtro -----
  const contagemPorStatus = {
    em_andamento: concursos.filter(c => c.status === 'em_andamento').length,
    em_breve: concursos.filter(c => c.status === 'em_breve').length,
    encerrado: concursos.filter(c => c.status === 'encerrado').length,
  } as Record<ConcursoRecord['status'], number>;
  const statusPadrao: ConcursoRecord['status'] = contagemPorStatus.em_andamento ? 'em_andamento' : contagemPorStatus.em_breve ? 'em_breve' : 'encerrado';
  const statusAtivo = statusSel ?? statusPadrao;
  const anoDe = (c: ConcursoRecord) => (c.periodoInicioISO ? c.periodoInicioISO.slice(0, 4) : '');
  const anosDisponiveis = Array.from(new Set([...concursos.map(anoDe).filter(Boolean), ...(anoFiltro ? [anoFiltro] : [])])).sort().reverse();
  // Contexto dos KPIs = situação + ano (a busca só estreita a lista).
  const noContexto = concursos
    .filter(c => c.status === statusAtivo)
    .filter(c => !anoFiltro || anoDe(c) === anoFiltro)
    .sort((a, b) => (a.periodoInicioISO || '9999-99-99').localeCompare(b.periodoInicioISO || '9999-99-99'));
  const itensFiltrados = noContexto.filter(c => !busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  // ----- Resumo dos candidatos (tempo real) -----
  // Uma assinatura por concurso em andamento (menu: encerrar/voltar) e por concurso do contexto (cards, KPIs, tabela).
  const idsAssinados = useMemo(
    () => [...new Set(concursos.filter(c => c.status === 'em_andamento' || noContexto.includes(c)).map(c => c.id))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [concursos, statusAtivo, anoFiltro],
  );
  const chaveIds = idsAssinados.join('|');
  const [resumos, setResumos] = useState<Record<string, ResumoComLancamento>>({});
  useEffect(() => {
    const offs = idsAssinados.map(id =>
      observarCandidatos(id, lista => {
        const fin = lista.filter(x => x.finalizado);
        setResumos(prev => ({ ...prev, [id]: {
          total: lista.length,
          finalizados: fin.length,
          apto: fin.filter(x => x.status === 'APTO').length,
          inapto: fin.filter(x => x.status === 'INAPTO').length,
          faltou: fin.filter(x => x.status === 'FALTOU').length,
          idm: fin.filter(x => x.status === 'INSUF DOCUMENTAL').length,
          temLancamento: lista.some(x => x.status !== '' || x.numTIS !== '' || x.observacoes !== ''),
        } }));
      }),
    );
    return () => offs.forEach(off => off());
  }, [chaveIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const entradas = await Promise.all(concursos.map(async c => [c.id, (await listarMensagens(c.id)).length] as const));
      if (!cancelado) setMensagensCount(Object.fromEntries(entradas));
    })();
    return () => { cancelado = true; };
  }, [concursos]);

  const somaContexto: ResumoConcurso | null = useMemo(() => {
    if (noContexto.length === 0) return null;
    const zero: ResumoConcurso = { total: 0, finalizados: 0, apto: 0, inapto: 0, faltou: 0, idm: 0 };
    return noContexto.reduce((s: ResumoConcurso, c: ConcursoRecord): ResumoConcurso => {
      const r = resumos[c.id];
      if (!r) return { ...s, total: s.total + c.totalCandidatos };
      return { total: s.total + r.total, finalizados: s.finalizados + r.finalizados, apto: s.apto + r.apto, inapto: s.inapto + r.inapto, faltou: s.faltou + r.faltou, idm: s.idm + r.idm };
    }, zero);
  }, [noContexto, resumos]);
  const tituloSituacao = GRUPOS_STATUS_ORDEM.find(g => g.status === statusAtivo)!.titulo;
  const contextoTexto = [tituloSituacao, anoFiltro || 'Todos os anos', plural(noContexto.length, 'concurso', 'concursos'), plural(somaContexto?.total ?? 0, 'candidato', 'candidatos')].join(' · ');

  const abrirRanking = (k: 'inapto' | 'faltou' | 'idm') => {
    const meta = { inapto: { titulo: 'Inaptos', cor: 'bg-wine' }, faltou: { titulo: 'Faltas', cor: 'bg-gold' }, idm: { titulo: 'IDM', cor: 'bg-ink-3' } }[k];
    const itens = noContexto
      .map(c => ({ concursoId: c.id, concursoNome: c.nome, quantidade: resumos[c.id]?.[k] ?? 0 }))
      .filter(i => i.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 4);
    setKpiModal({ titulo: meta.titulo, corBarra: meta.cor, itens });
  };

  // Próximo dia com candidatos de cada concurso (rodapé do card).
  const proximoDiaDe = useMemo(() => {
    const hoje = hojeISO();
    const m = new Map<string, { data: string; total: number }>();
    [...diasConcursos].sort((a, b) => a.data.localeCompare(b.data)).forEach(d => {
      if (d.data >= hoje && !m.has(d.concursoId)) m.set(d.concursoId, { data: d.data, total: d.total });
    });
    return m;
  }, [diasConcursos]);

  const handleAbrir = (id: string, nome: string) => {
    setConfirmDialog({
      title: 'Abrir concurso',
      message: `Deseja abrir o concurso "${nome}" agora? Ele ficará com situação "Em andamento".`,
      confirmLabel: 'Abrir concurso',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await abrirConcurso(id);
          showToast('Concurso aberto.');
          onRecarregar();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao abrir o concurso.');
        }
      },
    });
  };

  const handleVoltarParaEmBreve = (id: string, nome: string) => {
    setConfirmDialog({
      title: 'Voltar para em breve',
      message: `Deseja alterar o concurso "${nome}" para a situação "Em breve"?`,
      confirmLabel: 'Confirmar',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await voltarParaEmBreve(id);
          showToast('Concurso alterado para "Em breve".');
          onRecarregar();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao alterar o status do concurso.');
        }
      },
    });
  };

  const handleEncerrar = (id: string, nome: string) => {
    setConfirmDialog({
      title: 'Encerrar concurso',
      message: `Deseja encerrar o concurso "${nome}" agora? Ele ficará com situação "Encerrado".`,
      confirmLabel: 'Encerrar concurso',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await encerrarConcurso(id);
          showToast('Concurso encerrado.');
          onRecarregar();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao encerrar o concurso.');
        }
      },
    });
  };

  const handleMinutaResultados = async (id: string) => {
    setGerandoMinuta(true);
    setMinutaResultados(null);
    setPendentesFinalizacao(null);
    try {
      const resultado = await gerarMinutaResultados(id);
      if ('minuta' in resultado) setMinutaResultados(resultado.minuta);
      else setPendentesFinalizacao(resultado.pendentes);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar a minuta de resultados.');
    } finally {
      setGerandoMinuta(false);
    }
  };

  const handleCopiarTexto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      showToast('Minuta copiada para a área de transferência.');
    } catch {
      showToast('Não foi possível copiar automaticamente.');
    }
  };

  const contadorMenu = (c: ConcursoRecord) => {
    // Mesma regra de antes: só os concursos em andamento têm contagem real para encerrar/voltar.
    if (c.status !== 'em_andamento') return { total: c.totalCandidatos, finalizados: 0, temLancamento: false };
    return resumos[c.id];
  };

  const montarMenuProps = (c: ConcursoRecord): MenuAcoesConcursoProps => {
    const contagem = contadorMenu(c);
    const podeEncerrar = !!contagem && contagem.total > 0 && contagem.finalizados === contagem.total;
    const podeVoltarParaEmBreve = !contagem?.temLancamento;
    return {
      status: c.status,
      podeAbrirEncerrar, podeGerarMinutaResultados, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato, podeEnviarExames,
      podeEncerrar, podeVoltarParaEmBreve,
      minutaHabilitada: c.status === 'encerrado' || podeEncerrar,
      temPeriodoConfigurado: !!c.periodoInicioISO,
      temMensagensRegistradas: !!mensagensCount[c.id],
      ehAdmin: perfil === 'admin',
      onAbrir: () => handleAbrir(c.id, c.nome),
      onVoltarParaEmBreve: () => handleVoltarParaEmBreve(c.id, c.nome),
      onEncerrar: () => handleEncerrar(c.id, c.nome),
      onMinutaResultados: () => handleMinutaResultados(c.id),
      onRegistrarMensagem: () => setRegistrarMensagemAlvo({ id: c.id, nome: c.nome, criadoEm: c.criadoEm }),
      onListarMensagens: () => setListarMensagensAlvo({ id: c.id, nome: c.nome }),
      onDefinirPeriodoAgendamento: () => setPeriodoAgendamentoAlvo({ id: c.id, nome: c.nome, inicioISO: c.periodoInicioISO, fimISO: c.periodoFimISO }),
      onAdicionarCandidato: () => setAdicionarCandidatoAlvo({ id: c.id, nome: c.nome }),
      onEnviarExames: () => setEnviarExamesConcursos([c]),
    };
  };

  const fecharMinuta = () => { setMinutaResultados(null); setPendentesFinalizacao(null); };
  const emBreveApoio = statusAtivo !== 'em_breve' ? concursos.filter(c => c.status === 'em_breve').sort((a, b) => (a.periodoInicioISO || '9999').localeCompare(b.periodoInicioISO || '9999')) : [];
  const celulaResumo = (c: ConcursoRecord, k: keyof ResumoConcurso) => {
    const r = resumos[c.id];
    return r ? celulaNumericaTabela(r[k], c.status) : '…';
  };

  const cards = (
    <div className="@container">
      <ul className="grid grid-cols-1 @xl:grid-cols-2 gap-4" aria-label="Concursos">
        {itensFiltrados.map(c => (
          <li key={c.id} className="min-w-0">
            <CardConcurso
              concurso={c}
              resumo={resumos[c.id]}
              proximoDia={proximoDiaDe.get(c.id) ?? null}
              itensMenu={itensMenuAcoesConcurso(montarMenuProps(c))}
              onAbrirPlanilha={() => onSelecionar(c.id)}
              onAbrirConcurso={podeAbrirEncerrar && c.status === 'em_breve' ? () => handleAbrir(c.id, c.nome) : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );

  const apoio = (
    <div className="space-y-6 @split:sticky @split:top-4">
      <ProximosDias dias={diasConcursos} onSelecionarDia={d => navLista?.navigate(concursosDiaPath(d))} onVerMes={() => setCalendarioAberto(true)} />
      {emBreveApoio.length > 0 && (
        <Card padding="none" as="section" title="Em breve" titleAs="h2">
          <ul>
            {emBreveApoio.map(c => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-line">
                <div className="flex-1 min-w-0">
                  <button type="button" onClick={() => onSelecionar(c.id)} title={c.nome} className="block max-w-full text-left text-sm font-bold text-navy truncate hover:underline underline-offset-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">{c.nome}</button>
                  <span className="block text-xs text-ink-3">{c.periodoInicioISO ? `Inicia ${isoParaBR(c.periodoInicioISO)}` : periodoCurto(c)} · {plural(c.totalCandidatos, 'candidato', 'candidatos')}</span>
                </div>
                {podeAbrirEncerrar && (
                  <Button variant="secondary" size="sm" icon="play_circle" onClick={() => handleAbrir(c.id, c.nome)} aria-label={`Abrir o concurso ${c.nome}`}>Abrir</Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );

  const tabela = (
    <Card padding="none" className="overflow-x-auto scroll-x-visible">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="bg-thead border-b border-line text-xs font-semibold text-ink-3">
            <th scope="col" className="py-3 px-4">Concurso</th>
            <th scope="col" className="py-3 px-4">Período</th>
            <th scope="col" className="py-3 px-4 text-center">Candidatos</th>
            <th scope="col" className="py-3 px-4 text-center">Finalizados</th>
            <th scope="col" className="py-3 px-4 text-center">Aptos</th>
            <th scope="col" className="py-3 px-4 text-center">Inaptos</th>
            <th scope="col" className="py-3 px-4 text-center">IDM</th>
            <th scope="col" className="py-3 px-4 text-center">Faltas</th>
            <th scope="col" className="py-3 px-4 text-right"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-sm tabular-nums">
          {itensFiltrados.map(c => (
            <tr key={c.id} onClick={() => onSelecionar(c.id)} className="hover:bg-thead cursor-pointer transition-colors">
              <td className="py-2 px-4">
                <button type="button" onClick={e => { e.stopPropagation(); onSelecionar(c.id); }} className="text-left font-bold text-navy hover:underline underline-offset-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">{c.nome}</button>
              </td>
              <td className="py-2 px-4 text-ink whitespace-nowrap">{c.periodoInicioISO ? `${isoParaBR(c.periodoInicioISO)} a ${isoParaBR(c.periodoFimISO)}` : '—'}</td>
              <td className="py-2 px-4 text-center font-bold text-navy">{celulaNumericaTabela(resumos[c.id]?.total ?? c.totalCandidatos, c.status)}</td>
              <td className="py-2 px-4 text-center font-bold text-navy">{celulaResumo(c, 'finalizados')}</td>
              <td className="py-2 px-4 text-center font-bold text-green-700">{celulaResumo(c, 'apto')}</td>
              <td className="py-2 px-4 text-center font-bold text-wine">{celulaResumo(c, 'inapto')}</td>
              <td className="py-2 px-4 text-center font-bold text-navy">{celulaResumo(c, 'idm')}</td>
              <td className="py-2 px-4 text-center font-bold text-navy">{celulaResumo(c, 'faltou')}</td>
              <td className="py-2 px-4 text-right" onClick={e => e.stopPropagation()}>
                <MenuAcoesConcurso nome={c.nome} {...montarMenuProps(c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  return (
    <div className="flex flex-col flex-1">

      <Toast message={toastMessage} />

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destrutivo}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => { setConfirmDialog(null); confirmDialog.onCancel?.(); }}
        />
      )}

      {(minutaResultados !== null || pendentesFinalizacao !== null || gerandoMinuta) && (
        <Dialog
          title="Minuta de resultados da IS"
          icon="summarize"
          size="md"
          travado={gerandoMinuta}
          onClose={fecharMinuta}
          footer={(
            <>
              <Button variant={minutaResultados ? 'secondary' : 'primary'} onClick={fecharMinuta}>Fechar</Button>
              {minutaResultados && <Button icon="content_copy" onClick={() => handleCopiarTexto(minutaResultados)}>Copiar minuta</Button>}
            </>
          )}
        >
          {gerandoMinuta ? (
            <div className="text-center py-8 text-ink-3" role="status" aria-label="Gerando a minuta">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy" aria-hidden="true">progress_activity</span>
            </div>
          ) : pendentesFinalizacao && pendentesFinalizacao.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-gold-50 border border-gold-200 rounded-xl p-3">
                <p className="text-sm font-bold text-gold-800">
                  {pendentesFinalizacao.length === 1 ? 'Ainda há 1 candidato não finalizado.' : `Ainda há ${pendentesFinalizacao.length} candidatos não finalizados.`} Finalize todos antes de gerar a minuta de resultados.
                </p>
              </div>
              <ul className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                {pendentesFinalizacao.map(p => (
                  <li key={p.id} className="p-2.5 text-sm flex items-center justify-between gap-3">
                    <span className="tabular-nums font-bold text-navy">{p.id}</span>
                    <span className="text-ink text-right">{p.nome}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <textarea readOnly aria-label="Minuta de resultados" value={minutaResultados ?? ''} rows={16} className={`${controlClass} tabular-nums text-navy resize-none whitespace-pre-wrap`} />
          )}
        </Dialog>
      )}

      {calendarioAberto && (
        <Dialog title="Dias de concurso" icon="calendar_month" size="md" onClose={() => setCalendarioAberto(false)}>
          <CalendarioConcursos dias={diasConcursos} onSelecionarDia={d => { setCalendarioAberto(false); navLista?.navigate(concursosDiaPath(d)); }} />
        </Dialog>
      )}

      {registrarMensagemAlvo && (
        <ModalRegistrarMensagemArquivo
          concursoId={registrarMensagemAlvo.id}
          concursoNome={registrarMensagemAlvo.nome}
          concursoAno={anoDoConcurso(registrarMensagemAlvo.criadoEm)}
          concursoStorage={registrarMensagemAlvo.armazenamento === 'storage'}
          onClose={() => setRegistrarMensagemAlvo(null)}
        />
      )}
      {listarMensagensAlvo && (
        <ModalListarMensagens
          concursoId={listarMensagensAlvo.id}
          concursoNome={listarMensagensAlvo.nome}
          onClose={() => setListarMensagensAlvo(null)}
        />
      )}
      {periodoAgendamentoAlvo && (
        <ModalDefinirPeriodoAgendamento
          concursoId={periodoAgendamentoAlvo.id}
          concursoNome={periodoAgendamentoAlvo.nome}
          periodoInicioAtualISO={periodoAgendamentoAlvo.inicioISO}
          periodoFimAtualISO={periodoAgendamentoAlvo.fimISO}
          onClose={(atualizado) => { setPeriodoAgendamentoAlvo(null); if (atualizado) onRecarregar(); }}
        />
      )}
      {enviarExamesConcursos && (
        <EnviarExamesModal
          concursos={enviarExamesConcursos}
          usuarioNome={navLista?.authUser?.nome}
          onClose={() => setEnviarExamesConcursos(null)}
        />
      )}
      {adicionarCandidatoAlvo && (
        <ModalAdicionarCandidato
          concursoId={adicionarCandidatoAlvo.id}
          concursoNome={adicionarCandidatoAlvo.nome}
          onClose={atualizado => { setAdicionarCandidatoAlvo(null); if (atualizado) onRecarregar(); }}
        />
      )}
      {kpiModal && (
        <ModalKpiBarChart
          titulo={kpiModal.titulo}
          corBarra={kpiModal.corBarra}
          itens={kpiModal.itens}
          onSelecionarConcurso={onSelecionar}
          onClose={() => setKpiModal(null)}
        />
      )}

      <Container size="data" className={`pt-0 md:pt-8 flex flex-col gap-6 ${podeRegistrarMensagem || podeImportarCsv || mostrarEnviarExames ? 'pb-28 md:pb-10' : 'pb-10'}`}>
        <PageHeader
          title="Concursos"
          description="Planilhas de controle dos candidatos de cada concurso."
          // Secundárias: no desktop ao lado da primária; no celular na pilha do FAB (com "Novo concurso").
          secundarias={[
            { id: 'exames', rotulo: 'Enviar exames', icone: 'lab_profile', onClick: () => setEnviarExamesConcursos(emAndamento), permitido: mostrarEnviarExames },
            { id: 'csv', rotulo: 'Importar CSV', icone: 'upload_file', onClick: onImportarCsvClick, permitido: podeImportarCsv },
          ]}
          fab={podeRegistrarMensagem ? { icon: 'add', label: 'Novo concurso', onClick: onNovoConcursoClick } : undefined}
        />

        {loading ? (
          <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2" role="status" aria-label="Carregando">
            <span className="material-symbols-outlined animate-spin text-[32px] text-navy" aria-hidden="true">progress_activity</span>
          </div>
        ) : concursos.length === 0 ? (
          <Card padding="none">
            <EmptyState icon="fact_check" title="Nenhum concurso cadastrado" description={podeRegistrarMensagem ? 'Registre a mensagem administrativa inicial para criar o primeiro.' : undefined} />
          </Card>
        ) : (
          <>
            {/* C2/G2: abas sublinhadas de situação + busca + ano + vista (só ícone) numa linha; KPIs do filtro abaixo. */}
            <Card padding="none" className="@container -mx-4 md:mx-0 rounded-none md:rounded-xl border-x-0 md:border-x">
              <div className="flex flex-col @split:flex-row @split:items-end @split:justify-between gap-x-4 px-4 border-b border-line">
                <AbasSublinhadas<ConcursoRecord['status']>
                  idBase="concursos-situacao"
                  rotulo="Situação do concurso"
                  ativa={statusAtivo}
                  onChange={v => atualizarFiltro('situacao', v)}
                  abas={GRUPOS_STATUS_ORDEM.map(g => ({ id: g.status, rotulo: g.titulo, contagem: contagemPorStatus[g.status] }))}
                  linha={false}
                  className="-mb-px -mx-4 px-4 @split:mx-0 @split:px-0"
                />
                <div className="flex items-center gap-2 py-2 @split:py-0 @split:mb-1.5">
                  <SearchField value={busca} onChange={setBusca} label="Buscar concurso" placeholder="Buscar concurso…" autoComplete="off" className="flex-1 min-w-0 @split:w-60 @split:flex-none" />
                  <div className="w-36 shrink-0">
                    <select aria-label="Filtrar por ano" value={anoFiltro} onChange={e => atualizarFiltro('ano', e.target.value)} className={controlClass}>
                      <option value="">Todos os anos</option>
                      {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  {podeVisualizarTabela && isDesktop && (
                    <VistaIcones
                      ariaLabel="Vista da lista"
                      className="shrink-0"
                      value={viewMode}
                      onChange={definirViewMode}
                      opcoes={[{ value: 'cards', icone: 'grid_view', rotulo: 'Cards' }, { value: 'tabela', icone: 'table_rows', rotulo: 'Tabela' }]}
                    />
                  )}
                </div>
              </div>
              <KpisContexto contexto={contextoTexto} soma={statusAtivo === 'em_breve' ? null : somaContexto} onAbrirRanking={abrirRanking} />
            </Card>

            <div id="concursos-situacao-painel" role="tabpanel" aria-labelledby={`concursos-situacao-aba-${statusAtivo}`}>
              {itensFiltrados.length === 0 ? (
                <GradePainel
                  principal={<Card padding="none"><EmptyState icon="fact_check" title="Nenhum concurso neste filtro" description="Troque a situação, o ano ou a busca para ver outros concursos." /></Card>}
                  apoio={apoio}
                  rotuloApoio="Próximos dias de concurso"
                />
              ) : efetivoViewMode === 'tabela' ? tabela : (
                <GradePainel principal={cards} apoio={apoio} rotuloApoio="Próximos dias de concurso" />
              )}
            </div>
          </>
        )}
      </Container>
    </div>
  );
};
