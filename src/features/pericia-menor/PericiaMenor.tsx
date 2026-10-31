// Ficheiro: components/PericiaMenor.tsx
// Perícias Menores: tabela das perícias registradas (Firestore, coleção "periciasMenores") com
// status dinâmico Vigente / Concluída (pela data de término) e filtros de situação e tipo de
// dispensa. Quem pode registrar (feature "pericia-menor.novo") vê "Novo" (barra lateral/bottom
// sheet). Tocar numa linha abre o detalhe; dali se chega ao histórico do militar.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';
import { controlClass } from '@/components/ui/Field';
import { PericiaStatusTags, isAfastamentoLts, isRestricaoPericia, registroPericia } from '@/components/ui/PericiaStatusTags';
import { PericiaMenorDetalhe } from './PericiaMenorDetalhe';
import { NovaPericiaMenorForm } from './periciaMenor/NovaPericiaMenorForm';
import { PericiaMenorDrawer } from './periciaMenor/PericiaMenorDrawer';
import { useQueryParam } from '@/hooks/useQueryParam';
import { useNav } from '@/context/NavContext';
import { canUseFeature } from '@/config/permissions';
import { periciaMenorPath } from '@/config/routes';
import { observarPericiasMenores, chaveMilitar, dataBR, statusPericia, type PericiaMenorRecord } from '@/services/firestorePericiasMenores';
import { normalizarBusca } from '@/utils/corposQuadros';
import { extrairNomeInspecionado } from '@/utils/format';

type FiltroSituacao = 'todas' | 'vigentes' | 'concluidas';
type FiltroTipo = 'todos' | 'lts' | 'restricoes';

const dias = (n: number) => `${n} dia${n !== 1 ? 's' : ''}`;

const nomeDe = (p: PericiaMenorRecord) => {
  const nome = extrairNomeInspecionado(p.inspecionado);
  const prefixo = p.inspecionado.slice(0, p.inspecionado.indexOf(nome)).trim();
  return (<><span className="block font-semibold text-navy break-words">{nome}</span>{prefixo && <span className="block text-xs text-ink-3">{prefixo}</span>}</>);
};

export const PericiaMenor: React.FC = () => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const podeNovo = canUseFeature('pericia-menor.novo', perfil);
  const podeConsultar = canUseFeature('pericia-menor.historico', perfil);
  const { pessoa: pessoaParam } = useParams();
  const pessoa = pessoaParam ? decodeURIComponent(pessoaParam) : null;

  const [lista, setLista] = useState<PericiaMenorRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [situacao, setSituacao] = useState<FiltroSituacao>('todas');
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [hoje] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const [novoParam, setNovoParam] = useQueryParam('novo');

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!podeConsultar) return;
    return observarPericiasMenores(setLista, e => setErroCarga(e.message || 'Não foi possível carregar as perícias menores.'));
  }, [podeConsultar]);
  // Atalho da Início: /pericia-menor?novo=1 abre o formulário de nova perícia.
  useEffect(() => {
    if (novoParam === '1') { if (podeNovo) setNovo(true); setNovoParam(null, { replace: true }); }
  }, [novoParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const comStatus = useMemo(() => (lista ?? []).map(p => ({ p, vigente: statusPericia(p, hoje) === 'vigente', reg: registroPericia(p, hoje) })), [lista, hoje]);
  const totais = useMemo(() => ({
    todas: comStatus.length,
    vigentes: comStatus.filter(x => x.vigente).length,
    concluidas: comStatus.filter(x => !x.vigente).length,
    lts: comStatus.filter(x => isAfastamentoLts(x.reg)).length,
    restricoes: comStatus.filter(x => isRestricaoPericia(x.reg)).length,
  }), [comStatus]);

  const filtrada = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return comStatus
      .filter(x => situacao === 'todas' || (situacao === 'vigentes') === x.vigente)
      .filter(x => tipo === 'todos' || (tipo === 'lts' ? isAfastamentoLts(x.reg) : isRestricaoPericia(x.reg)))
      .filter(x => { const alvo = normalizarBusca(`${x.p.inspecionado} ${x.p.militarId} ${x.p.cid} ${x.p.om}`); return termos.every(t => alvo.includes(t)); });
  }, [comStatus, situacao, tipo, busca]);

  const detalhe = lista?.find(p => p.id === detalheId) ?? null;

  if (pessoa !== null && podeConsultar) {
    if (lista === null) {
      return <div className="flex flex-1 items-center justify-center py-20"><span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" role="status" aria-label="Carregando histórico" /></div>;
    }
    const registros = lista.filter(p => chaveMilitar(p) === pessoa);
    if (registros.length === 0) {
      return <Container size="reading" className="py-8"><EmptyState icon="person_search" title="Nenhum registro encontrado" description="Não há perícias menores registradas para este militar." /></Container>;
    }
    return <PericiaMenorDetalhe person={registros[0].inspecionado} records={registros} hoje={hoje} />;
  }

  const atestadoEm = (p: PericiaMenorRecord) => (
    <><span className="block text-ink-2">{dataBR(p.dataAtestado)}</span><span className="block text-xs text-ink-3">{dias(p.tempoHomologado)} · até {dataBR(p.dataTermino).slice(0, 5)}</span></>
  );

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader
          title="Perícia Menor"
          description="Perícias menores dos militares de bordo e a situação de cada uma."
          actions={podeNovo ? <Button icon="add" onClick={() => setNovo(true)}>Novo</Button> : undefined}
        />

        {!podeConsultar ? (
          <div className="bg-white rounded-xl border border-line">
            <EmptyState icon="personal_injury" title="Registre uma perícia menor" description="Use o botão Novo. Seu perfil não consulta o histórico de perícias." />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-line p-4 space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
                <input type="search" aria-label="Buscar perícia menor" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Inspecionado, NIP ou CID…" className={`${controlClass} pl-10`} autoComplete="off" />
              </div>
              <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
                <Segmented
                  ariaLabel="Situação da perícia"
                  className="overflow-x-auto"
                  value={situacao}
                  onChange={setSituacao}
                  options={[
                    { value: 'todas', label: 'Todas', badge: totais.todas, badgeTone: 'neutro' },
                    { value: 'vigentes', label: 'Vigentes', badge: totais.vigentes, badgeTone: 'alerta' },
                    { value: 'concluidas', label: 'Concluídas', badge: totais.concluidas, badgeTone: 'neutro' },
                  ]}
                />
                <Segmented
                  ariaLabel="Tipo de dispensa"
                  className="overflow-x-auto"
                  value={tipo}
                  onChange={setTipo}
                  options={[
                    { value: 'todos', label: 'Todos os tipos' },
                    { value: 'lts', label: 'LTS', badge: totais.lts, badgeTone: 'neutro' },
                    { value: 'restricoes', label: 'Restrições', badge: totais.restricoes, badgeTone: 'neutro' },
                  ]}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-line overflow-clip">
              {erroCarga ? (
                <p role="alert" className="p-6 text-sm font-semibold text-wine">{erroCarga}</p>
              ) : lista === null ? (
                <p className="p-10 text-center text-sm text-ink-3" role="status">Carregando perícias menores…</p>
              ) : filtrada.length === 0 ? (
                <EmptyState icon="personal_injury" title={lista.length === 0 ? 'Nenhuma perícia menor registrada' : 'Nenhum resultado'} description={lista.length === 0 ? 'As perícias menores registradas aparecem aqui.' : 'Ajuste a busca ou os filtros.'} />
              ) : (
                <>
                  {/* Mobile: cartões — tocar abre o detalhe */}
                  <ul className="md:hidden divide-y divide-line">
                    {filtrada.map(({ p, reg }) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => setDetalheId(p.id)} className="w-full text-left px-4 py-3 space-y-1 hover:bg-thead">
                          <span className="block min-w-0">{nomeDe(p)}</span>
                          <span className="block text-xs text-ink-2">{p.cid}</span>
                          <span className="block text-xs text-ink-3">{dataBR(p.dataAtestado)} · {dias(p.tempoHomologado)}</span>
                          <span className="block pt-0.5"><PericiaStatusTags registro={reg} /></span>
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
                          <th scope="col" className="px-4 py-3 text-left font-semibold">CID · Dispensas</th>
                          <th scope="col" className="px-4 py-3 text-left font-semibold">Situação</th>
                          <th scope="col" className="px-4 py-3 text-left font-semibold whitespace-nowrap">Atestado em</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filtrada.map(({ p, reg }) => (
                          <tr
                            key={p.id}
                            onClick={() => setDetalheId(p.id)}
                            className={`cursor-pointer hover:bg-thead transition-colors ${p.id === detalheId ? 'bg-thead shadow-[inset_3px_0_0_#FAB932]' : ''}`}
                          >
                            <td className="px-4 py-3 align-top">
                              <button type="button" onClick={e => { e.stopPropagation(); setDetalheId(p.id); }} className="text-left w-full" aria-label={`Abrir detalhe da perícia de ${extrairNomeInspecionado(p.inspecionado)}`}>{nomeDe(p)}</button>
                            </td>
                            <td className="px-4 py-3 align-top"><span className="block text-ink-2">{p.cid}</span><span className="block text-xs text-ink-3">{(p.dispensas ?? []).join(', ')}</span></td>
                            <td className="px-4 py-3 align-top"><PericiaStatusTags registro={reg} /></td>
                            <td className="px-4 py-3 align-top whitespace-nowrap">{atestadoEm(p)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-line text-xs text-ink-3" role="status">{filtrada.length} perícia{filtrada.length !== 1 ? 's' : ''} menor{filtrada.length !== 1 ? 'es' : ''}</div>
                </>
              )}
            </div>
          </>
        )}
      </Container>

      {detalhe && (
        <PericiaMenorDrawer
          pericia={detalhe}
          onClose={() => setDetalheId(null)}
          onHistorico={() => { setDetalheId(null); nav?.navigate(periciaMenorPath('historico', chaveMilitar(detalhe))); }}
        />
      )}
      {novo && podeNovo && (
        <NovaPericiaMenorForm
          onClose={() => setNovo(false)}
          onRegistrado={nome => { setNovo(false); avisar(`Perícia menor de ${nome} registrada.`); }}
        />
      )}
    </div>
  );
};
