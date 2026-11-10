// Ficheiro: components/PericiaMenor.tsx
// Perícias Menores: tabela das perícias registradas (Firestore, coleção "periciasMenores") com
// status dinâmico Vigente / Concluída (pela data de término) e filtros de situação e tipo de
// dispensa. Quem pode registrar (feature "pericia-menor.novo") vê "Novo" (barra lateral/bottom
// sheet). Tocar numa linha abre o detalhe; dali se chega ao histórico do militar.
// Colunas (pedido do Presidente da JRS): Data (perícia ou, na homologação, emissão do atestado,
// com os dias abaixo) · Inspecionado · Médico ("CT Mauriston") · CID (descrição abreviada do
// cid.json) · Dispensas (tags "Dispensas"/"Restrições"). Regras puras em utils/periciaMenorLista.ts.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { controlClass } from './ui/Field';
import { StatusTag } from './ui/StatusTag';
import { PericiaMenorDetalhe } from './PericiaMenorDetalhe';
import { NovaPericiaMenorForm } from './periciaMenor/NovaPericiaMenorForm';
import { PericiaMenorDrawer } from './periciaMenor/PericiaMenorDrawer';
import { useQueryParam } from '../hooks/useQueryParam';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';
import { termosPericia } from '../config/termosPericia';
import { periciaMenorPath } from '../config/routes';
import { observarPericiasMenores, chaveMilitar, dataBR, statusPericia, type PericiaMenorRecord } from '../services/firestorePericiasMenores';
import { carregarCid, normalizarBusca } from '../utils/corposQuadros';
import { dataReferenciaPericia, indiceCidAbreviado, medicoDaPericia, rotuloCidAbreviado, tiposDispensa } from '../utils/periciaMenorLista';
import { extrairNomeInspecionado } from '../utils/format';

// '' = sem filtro (todas as situações / todos os tipos): os botões são desmarcáveis.
type FiltroSituacao = '' | 'vigentes' | 'concluidas';
type FiltroTipo = '' | 'dispensa' | 'restricoes';

const dias = (n: number) => `${n} dia${n !== 1 ? 's' : ''}`;

const TagsDispensa: React.FC<{ tipos: { dispensa: boolean; restricoes: boolean } }> = ({ tipos }) => (
  <span className="flex gap-1.5 flex-wrap">
    {tipos.dispensa && <StatusTag tone="danger" title="Dispensa de todas as atividades">Dispensas</StatusTag>}
    {tipos.restricoes && <StatusTag tone="attention">Restrições</StatusTag>}
    {!tipos.dispensa && !tipos.restricoes && <span className="text-ink-4">—</span>}
  </span>
);

const nomeDe = (p: PericiaMenorRecord) => {
  const nome = extrairNomeInspecionado(p.inspecionado);
  const prefixo = p.inspecionado.slice(0, p.inspecionado.indexOf(nome)).trim();
  // Após o NIP, a sigla da OM.
  const linha2 = [prefixo, p.om].filter(Boolean).join(' · ');
  return (<><span className="block font-semibold text-navy break-words">{nome}</span>{linha2 && <span className="block text-xs text-ink-3">{linha2}</span>}</>);
};

export const PericiaMenor: React.FC = () => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const podeNovo = canUseFeature('pericia-menor.novo', perfil);
  const podeConsultar = canUseFeature('pericia-menor.historico', perfil);
  const t = termosPericia(perfil);
  const { pessoa: pessoaParam } = useParams();
  const pessoa = pessoaParam ? decodeURIComponent(pessoaParam) : null;

  const [lista, setLista] = useState<PericiaMenorRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [situacao, setSituacao] = useState<FiltroSituacao>('');
  const [tipo, setTipo] = useState<FiltroTipo>('');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [hoje] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const [novoParam, setNovoParam] = useQueryParam('novo');
  // SUBCAT → DESCRABREV (public/cid.json, cacheado): até carregar, mostra o rótulo gravado.
  const [cidAbrev, setCidAbrev] = useState<Map<string, string> | null>(null);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!podeConsultar) return;
    return observarPericiasMenores(setLista, e => setErroCarga(e.message || `Não foi possível carregar os registros.`));
  }, [podeConsultar]);
  useEffect(() => {
    if (!podeConsultar) return;
    let vivo = true;
    carregarCid().then(l => { if (vivo) setCidAbrev(indiceCidAbreviado(l)); }).catch(() => { /* fica o rótulo gravado */ });
    return () => { vivo = false; };
  }, [podeConsultar]);
  // Atalho da Início: /pericia-menor?novo=1 abre o formulário de nova perícia.
  useEffect(() => {
    if (novoParam === '1') { if (podeNovo) setNovo(true); setNovoParam(null, { replace: true }); }
  }, [novoParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ordem padrão: pela data mostrada na 1ª coluna, da mais recente para a mais antiga.
  const comStatus = useMemo(() => (lista ?? [])
    .map(p => ({ p, vigente: statusPericia(p, hoje) === 'vigente', ref: dataReferenciaPericia(p), tipos: tiposDispensa(p.dispensas), medico: medicoDaPericia(p), cid: rotuloCidAbreviado(p, cidAbrev) }))
    .sort((a, b) => b.ref.data.localeCompare(a.ref.data)), [lista, hoje, cidAbrev]);
  const totais = useMemo(() => ({
    vigentes: comStatus.filter(x => x.vigente).length,
    concluidas: comStatus.filter(x => !x.vigente).length,
    dispensa: comStatus.filter(x => x.tipos.dispensa).length,
    restricoes: comStatus.filter(x => x.tipos.restricoes).length,
  }), [comStatus]);

  const filtrada = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return comStatus
      .filter(x => !situacao || (situacao === 'vigentes') === x.vigente)
      .filter(x => !tipo || (tipo === 'dispensa' ? x.tipos.dispensa : x.tipos.restricoes))
      .filter(x => { const alvo = normalizarBusca(`${x.p.inspecionado} ${x.p.militarId} ${x.p.cid} ${x.cid} ${x.p.om} ${x.medico}`); return termos.every(t => alvo.includes(t)); });
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

  const dataCelula = (ref: { data: string; dias: number }, homologacao?: boolean) => (
    <><span className="block text-ink-2 font-semibold">{dataBR(ref.data)}</span><span className="block text-xs text-ink-3" title={homologacao ? 'Dias homologados' : 'Dias de dispensa'}>{dias(ref.dias)}{homologacao ? ' homolog.' : ''}</span></>
  );

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader
          title={t.pagina}
          actions={podeNovo ? <Button icon="add" onClick={() => setNovo(true)}>Novo</Button> : undefined}
        />

        {!podeConsultar ? (
          <div className="bg-white rounded-xl border border-line">
            <EmptyState icon="personal_injury" title={`Registre um${t.singular === 'atestado' ? '' : 'a'} ${t.singular}`} description={`Use o botão Novo. Seu perfil não consulta o histórico de ${t.plural}.`} />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-line p-4 space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
                <input type="search" aria-label={`Buscar ${t.singular}`} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Inspecionado, NIP, OM, médico ou CID…" className={`${controlClass} pl-10`} autoComplete="off" />
              </div>
              <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
                <Segmented
                  ariaLabel="Situação da perícia"
                  className="overflow-x-auto"
                  value={situacao}
                  onChange={setSituacao}
                  onDesmarcar={() => setSituacao('')}
                  options={[
                    { value: 'vigentes', label: 'Vigentes', badge: totais.vigentes, badgeTone: 'alerta' },
                    { value: 'concluidas', label: 'Concluídas', badge: totais.concluidas, badgeTone: 'neutro' },
                  ]}
                />
                <Segmented
                  ariaLabel="Tipo de dispensa"
                  className="overflow-x-auto"
                  value={tipo}
                  onChange={setTipo}
                  onDesmarcar={() => setTipo('')}
                  options={[
                    { value: 'dispensa', label: 'Dispensa', badge: totais.dispensa, badgeTone: 'neutro' },
                    { value: 'restricoes', label: 'Restrições', badge: totais.restricoes, badgeTone: 'neutro' },
                  ]}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-line overflow-clip">
              {erroCarga ? (
                <p role="alert" className="p-6 text-sm font-semibold text-wine">{erroCarga}</p>
              ) : lista === null ? (
                <p className="p-10 text-center text-sm text-ink-3" role="status">Carregando {t.plural}…</p>
              ) : filtrada.length === 0 ? (
                <EmptyState icon="personal_injury" title={lista.length === 0 ? `Nenhum${t.singular === 'atestado' ? '' : 'a'} ${t.singular} registrad${t.singular === 'atestado' ? 'o' : 'a'}` : 'Nenhum resultado'} description={lista.length === 0 ? `Os ${t.plural === 'atestados' ? 'atestados registrados aparecem' : 'registros de perícias menores aparecem'} aqui.` : 'Ajuste a busca ou os filtros.'} />
              ) : (
                <>
                  {/* Mobile: cartões — tocar abre o detalhe */}
                  <ul className="md:hidden divide-y divide-line">
                    {filtrada.map(({ p, ref, tipos, medico, cid }) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => setDetalheId(p.id)} className="w-full text-left px-4 py-3 space-y-1 hover:bg-thead">
                          <span className="block text-xs text-ink-3"><span className="font-semibold text-ink-2">{dataBR(ref.data)}</span> · {dias(ref.dias)}{p.homologacao ? ' homolog.' : ''}{medico ? ` · ${medico}` : ''}</span>
                          <span className="block min-w-0">{nomeDe(p)}</span>
                          <span className="block text-xs text-ink-2 break-words">{cid}</span>
                          <span className="block pt-0.5"><TagsDispensa tipos={tipos} /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {/* Desktop: tabela enxuta — a linha abre o detalhe */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-thead text-ink-3 text-xs border-b border-line">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left font-semibold whitespace-nowrap">Data</th>
                          <th scope="col" className="px-4 py-3 text-left font-semibold">Inspecionado</th>
                          <th scope="col" className="px-4 py-3 text-left font-semibold">Médico</th>
                          <th scope="col" className="px-4 py-3 text-left font-semibold">CID</th>
                          <th scope="col" className="px-4 py-3 text-left font-semibold">Dispensas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filtrada.map(({ p, ref, tipos, medico, cid }) => (
                          <tr
                            key={p.id}
                            onClick={() => setDetalheId(p.id)}
                            className={`cursor-pointer hover:bg-thead transition-colors ${p.id === detalheId ? 'bg-thead shadow-[inset_3px_0_0_#FAB932]' : ''}`}
                          >
                            <td className="px-4 py-3 align-top whitespace-nowrap">{dataCelula(ref, p.homologacao)}</td>
                            <td className="px-4 py-3 align-top">
                              <button type="button" onClick={e => { e.stopPropagation(); setDetalheId(p.id); }} className="text-left w-full" aria-label={`Abrir detalhe ${t.singular === 'atestado' ? 'do atestado' : 'da perícia'} de ${extrairNomeInspecionado(p.inspecionado)}`}>{nomeDe(p)}</button>
                            </td>
                            <td className="px-4 py-3 align-top whitespace-nowrap text-ink-2">{medico || '—'}</td>
                            <td className="px-4 py-3 align-top text-ink-2">{cid}</td>
                            <td className="px-4 py-3 align-top"><TagsDispensa tipos={tipos} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-line text-xs text-ink-3" role="status">{t.singular === 'atestado' ? `${filtrada.length} atestado${filtrada.length !== 1 ? 's' : ''}` : `${filtrada.length} perícia${filtrada.length !== 1 ? 's' : ''} menor${filtrada.length !== 1 ? 'es' : ''}`}</div>
                </>
              )}
            </div>
          </>
        )}
      </Container>

      {detalhe && (
        <PericiaMenorDrawer
          pericia={detalhe}
          titulo={t.singular === 'atestado' ? 'Atestado' : 'Perícia menor'}
          onClose={() => setDetalheId(null)}
          onHistorico={() => { setDetalheId(null); nav?.navigate(periciaMenorPath('historico', chaveMilitar(detalhe))); }}
        />
      )}
      {novo && podeNovo && (
        <NovaPericiaMenorForm
          onClose={() => setNovo(false)}
          titulo={t.novo}
          onRegistrado={nome => { setNovo(false); avisar(t.singular === 'atestado' ? `Atestado de ${nome} registrado.` : `Perícia menor de ${nome} registrada.`); }}
        />
      )}
    </div>
  );
};
