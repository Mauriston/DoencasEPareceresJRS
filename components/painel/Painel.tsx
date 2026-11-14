// Ficheiro: components/painel/Painel.tsx
// Página "Painel" (auditoria v3, seção 7): responde "como estamos no período" — tendências, comparações e
// distribuição —, enquanto a Início responde "o que faço hoje". Seções montadas pela permissão (7a):
//   Inspeções de Saúde → canAccessPage('inspecoes')   (Médicos: minhas ⇄ todas · MPI: só MPI ⇄ todas)
//   Perícias Menores   → pericia-menor.historico      (User Médicos Geral: só os próprios atestados)
//   Concursos          → canAccessPage('concursosJRS')
//   Uso do app         → só Admin
// Um filtro de período no topo vale para todas as seções; cada KPI compara com o período anterior equivalente.
// Desktop: índice fixo no topo e as seções em sequência; celular: uma seção por aba, KPIs 2 × 2.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNav } from '../../context/NavContext';
import { canAccessPage, canUseFeature } from '../../config/permissions';
import { hojeISO } from '../../utils/inspecoes';
import { janelaDoPeriodo, inicioDaLeitura, PERIODOS_PAINEL, type PeriodoPainel, type RecortePericias } from '../../utils/painel';
import { usePainel, type SecaoPainel } from '../../hooks/usePainel';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Container, PageHeader } from '../ui/Page';
import { Segmented } from '../ui/Segmented';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { EmptyState } from '../ui/EmptyState';
import { Carregando, ErroSecao, fmtQuando } from './partes';
import { SecaoInspecoes } from './SecaoInspecoes';
import { SecaoPericias } from './SecaoPericias';
import { SecaoConcursos } from './SecaoConcursos';
import { SecaoUso } from './SecaoUso';

const DEF_SECOES: Record<SecaoPainel, { rotulo: string; icone: string }> = {
  inspecoes: { rotulo: 'Inspeções', icone: 'event_available' },
  pericias: { rotulo: 'Perícias', icone: 'personal_injury' },
  concursos: { rotulo: 'Concursos', icone: 'fact_check' },
  uso: { rotulo: 'Uso do app', icone: 'monitoring' },
};

const PERIODO_KEY = 'jrs_painel_periodo';
const lerPeriodo = (): PeriodoPainel => {
  try { const v = localStorage.getItem(PERIODO_KEY); return PERIODOS_PAINEL.some(p => p.id === v) ? (v as PeriodoPainel) : '3m'; } catch { return '3m'; }
};

/** Abas sublinhadas (ouro = ativa) do celular: uma por seção. */
const AbasSecoes: React.FC<{ secoes: SecaoPainel[]; ativa: SecaoPainel; onChange: (s: SecaoPainel) => void }> = ({ secoes, ativa, onChange }) => (
  <div role="tablist" aria-label="Seções do Painel" className="flex gap-4 overflow-x-auto border-b border-line -mx-4 px-4 mb-4">
    {secoes.map(s => (
      <button key={s} type="button" role="tab" id={`painel-aba-${s}`} aria-selected={s === ativa} aria-controls="painel-secao"
        onClick={() => onChange(s)}
        className={`shrink-0 h-11 text-sm font-bold border-b-2 -mb-px ${s === ativa ? 'border-gold text-navy' : 'border-transparent text-ink-3'}`}>
        {DEF_SECOES[s].rotulo}
      </button>
    ))}
  </div>
);

export const Painel: React.FC = () => {
  const { authUser } = useNav();
  const perfil = authUser?.perfil ?? '';
  const uid = authUser?.uid ?? '';
  const desktop = useIsDesktop();
  const hoje = hojeISO();

  const recortePericias: RecortePericias | null = perfil === 'user_medicos_geral'
    ? (canUseFeature('pericia-menor.novo', perfil) || canUseFeature('pericia-menor.historico', perfil) ? 'minhas' : null)
    : canUseFeature('pericia-menor.historico', perfil) ? 'todas' : null;
  const secoes = useMemo(() => {
    const s: SecaoPainel[] = [];
    if (canAccessPage('inspecoes', perfil)) s.push('inspecoes');
    if (recortePericias) s.push('pericias');
    if (canAccessPage('concursosJRS', perfil)) s.push('concursos');
    if (perfil === 'admin') s.push('uso');
    return s;
  }, [perfil, recortePericias]);

  const [periodo, setPeriodoEstado] = useState<PeriodoPainel>(lerPeriodo);
  const setPeriodo = (p: PeriodoPainel) => { setPeriodoEstado(p); try { localStorage.setItem(PERIODO_KEY, p); } catch { /* sem localStorage */ } };
  const janela = useMemo(() => janelaDoPeriodo(periodo, hoje), [periodo, hoje]);
  const dados = usePainel(secoes, inicioDaLeitura(janela, hoje), hoje);

  const [aba, setAba] = useState<SecaoPainel>(secoes[0] ?? 'inspecoes');
  useEffect(() => { if (secoes.length && !secoes.includes(aba)) setAba(secoes[0]); }, [secoes, aba]);

  // "atualizado há N min" se mantém em dia sem recarregar.
  const [, tique] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tique(x => x + 1), 60_000); return () => window.clearInterval(t); }, []);

  const refs = useRef<Partial<Record<SecaoPainel, HTMLElement | null>>>({});
  const irPara = (s: SecaoPainel) => refs.current[s]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!secoes.length) {
    return (
      <div className="py-6 md:py-8 pb-10">
        <Container size="data">
          <PageHeader title="Painel" />
          <EmptyState icon="monitoring" title="Nenhuma seção disponível" description="O seu perfil não tem acesso às áreas acompanhadas pelo Painel." />
        </Container>
      </div>
    );
  }

  const conteudo = (s: SecaoPainel) => {
    const e = dados[s];
    if (e.erro && !e.dados) return <ErroSecao texto={e.erro} />;
    if (!e.dados) return <Carregando />;
    switch (s) {
      case 'inspecoes': return <SecaoInspecoes lista={dados.inspecoes.dados!} janela={janela} hoje={hoje} uid={uid} perfil={perfil} desktop={desktop} />;
      case 'pericias': return <SecaoPericias lista={dados.pericias.dados!} janela={janela} hoje={hoje} uid={uid} recorte={recortePericias ?? 'minhas'} desktop={desktop} />;
      case 'concursos': return <SecaoConcursos concursos={dados.concursos.dados!} janela={janela} desktop={desktop} />;
      case 'uso': return <SecaoUso dias={dados.uso.dados!.dias} usuarios={dados.uso.dados!.usuarios} janela={janela} hoje={hoje} desktop={desktop} />;
    }
  };

  const carregando = secoes.some(s => dados[s].carregando);
  const filtroPeriodo = (
    <Segmented ariaLabel="Período" value={periodo} onChange={setPeriodo}
      options={PERIODOS_PAINEL.map(p => ({ value: p.id, label: desktop ? p.rotulo : p.curto }))} />
  );
  const legendaPeriodo = <span className="text-xs text-ink-3">{janela.rotulo} · comparação com {janela.rotuloAnterior}</span>;

  return (
    <div className="py-6 md:py-8 pb-10 print:py-0">
      <Container size="data">
        <PageHeader
          title="Painel"
          description={`Tendências do período · ${dados.atualizadoEm ? `atualizado ${fmtQuando(dados.atualizadoEm)}` : 'carregando…'}`}
          actions={(
            <>
              <IconButton icon="refresh" label="Atualizar" variant="ghost" onClick={dados.atualizar} disabled={carregando} />
              {desktop && <Button variant="secondary" icon="print" onClick={() => window.print()}>Imprimir</Button>}
            </>
          )}
        />

        {desktop ? (
          <>
            {/* Índice fixo no topo (7b): período e atalhos para as seções. */}
            <div className="sticky top-0 z-sticky -mx-4 md:-mx-6 xl:-mx-8 px-4 md:px-6 xl:px-8 py-3 mb-4 bg-canvas border-b border-line print:static">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {filtroPeriodo}
                  {legendaPeriodo}
                </div>
                {secoes.length > 1 && (
                  <nav aria-label="Seções do Painel" className="flex flex-wrap gap-2 print:hidden">
                    {secoes.map(s => (
                      <button key={s} type="button" onClick={() => irPara(s)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-line bg-white text-sm font-bold text-navy hover:border-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{DEF_SECOES[s].icone}</span>
                        {DEF_SECOES[s].rotulo}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-10">
              {secoes.map(s => (
                <section key={s} ref={el => { refs.current[s] = el; }} aria-labelledby={`painel-${s}-titulo`} className="scroll-mt-20">
                  {conteudo(s)}
                </section>
              ))}
            </div>
          </>
        ) : (
          <>
            {secoes.length > 1 && <AbasSecoes secoes={secoes} ativa={aba} onChange={setAba} />}
            <div className="flex flex-col gap-2 mb-4">
              {filtroPeriodo}
              {legendaPeriodo}
            </div>
            <section id="painel-secao" role={secoes.length > 1 ? 'tabpanel' : undefined} aria-labelledby={secoes.length > 1 ? `painel-aba-${aba}` : undefined}>
              {conteudo(aba)}
            </section>
          </>
        )}
      </Container>
    </div>
  );
};
