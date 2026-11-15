// Ficheiro: components/painel/SecaoPericias.tsx
// Seção "Perícias Menores" do Painel: perícias e dias de dispensa no período, homologações, militares perto do
// limite de 30 dias e recorrentes; perícias por mês (dispensa total × restrições), CID mais frequentes e por OM.
// User Médicos Geral vê só os atestados que registrou (seção "Atestados").
import React, { useMemo, useState } from 'react';
import {
  aplicarRecortePericias, cidsFrequentes, periciasPorOm, resumoPericias, serieMensalPericias, variacao, ALERTA_DIAS_PERICIA,
  type JanelaPainel, type PericiaPainel, type RecortePericias,
} from '../../utils/painel';
import { GradePainel } from '../ui/Grade';
import { GraficoColunasEmpilhadas, type SerieGrafico } from './graficos';
import { Bloco, CabecalhoSecao, fmtNum, fmtPct, KpiDelta, Legenda, LinhaKpis, ListaBarras } from './partes';
import { destaqueDaJanela } from './periodo';
import { AbasSublinhadas } from '../periciaMenor/partes';

const LISTA = '/pericia-menor/historico';

const SERIES: SerieGrafico[] = [
  { nome: 'Dispensa total', traco: 'stroke-navy', preenchimento: 'fill-navy' },
  { nome: 'Restrições', traco: 'stroke-blue-400', preenchimento: 'fill-blue-400' },
];

interface Props { lista: PericiaPainel[]; janela: JanelaPainel; hoje: string; uid: string; recorte: RecortePericias; desktop: boolean }

export const SecaoPericias: React.FC<Props> = ({ lista, janela, hoje, uid, recorte: inicial, desktop }) => {
  // Abas Todos · Meus no topo da seção: o perfil começa no recorte que lhe cabe (Médicos Geral em "Meus") e alterna.
  const [recorte, setRecorte] = useState<RecortePericias>(inicial);
  const dados = useMemo(() => aplicarRecortePericias(lista, recorte, uid), [lista, recorte, uid]);
  const totais = useMemo(() => ({
    todas: aplicarRecortePericias(lista, 'todas', uid).length,
    minhas: aplicarRecortePericias(lista, 'minhas', uid).length,
  }), [lista, uid]);
  const r = useMemo(() => resumoPericias(dados, janela, hoje), [dados, janela, hoje]);
  const serie = useMemo(() => serieMensalPericias(dados, hoje, desktop ? 12 : 6), [dados, hoje, desktop]);
  const cids = useMemo(() => cidsFrequentes(dados, janela), [dados, janela]);
  const oms = useMemo(() => periciasPorOm(dados, janela), [dados, janela]);
  const vs = `vs. ${janela.rotuloAnterior}`;
  const minhas = recorte === 'minhas';

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoSecao
        id="painel-pericias" icone="personal_injury" titulo={minhas ? 'Atestados' : 'Perícias Menores'}
        subtitulo={minhas ? 'Os atestados que você registrou, com o saldo de dias dos militares' : 'Atestados registrados, dias concedidos e recorrência'}
        recorte={minhas ? 'só os meus' : 'todas as OM'}
        abrir={{ rotulo: 'Abrir Perícias Menores', to: LISTA }}
      />
      <AbasSublinhadas<RecortePericias>
        rotulo="Recorte das perícias" idBase="painel-pericias-recorte" ativa={recorte} onChange={setRecorte}
        abas={[{ id: 'todas', rotulo: 'Todos', contagem: totais.todas }, { id: 'minhas', rotulo: 'Meus', contagem: totais.minhas }]}
      />
      <LinhaKpis>
        <KpiDelta label={minhas ? 'Meus atestados' : 'Perícias no período'} value={fmtNum(r.pericias.atual)} variacao={variacao(r.pericias.atual, r.pericias.anterior)} vs={vs}
          hint={`${fmtNum(r.vigentes)} ${r.vigentes === 1 ? 'vigente' : 'vigentes'} hoje`} to={LISTA} />
        <KpiDelta label="Dias de dispensa concedidos" value={fmtNum(r.dias.atual)} variacao={variacao(r.dias.atual, r.dias.anterior)} vs={vs}
          hint={r.dias.media != null ? `média de ${fmtNum(r.dias.media)} dias` : undefined} to={LISTA} />
        <KpiDelta label="Homologações" value={fmtPct(r.homologacoes.atual)} variacao={variacao(r.homologacoes.atual, r.homologacoes.anterior, 'pp')} vs={vs} hint="atestados externos" to={LISTA} />
        <KpiDelta label="Perto do limite de 30 dias" value={fmtNum(r.pertoDoLimite)} hint={`≥ ${ALERTA_DIAS_PERICIA} dias nos últimos 12 meses`} to={LISTA} />
        <KpiDelta label="Militares com 3+ perícias" value={fmtNum(r.recorrentes)} hint="nos últimos 12 meses" to={LISTA} soDesktop />
      </LinhaKpis>
      <GradePainel
        rotuloApoio="CID mais frequentes"
        principal={(
          <Bloco titulo={desktop ? 'Perícias por mês' : 'Por mês'} acoes={<Legenda itens={SERIES.map(s => ({ nome: s.nome, classe: s.preenchimento.replace('fill-', 'bg-'), forma: 'bloco' as const }))} />}>
            <GraficoColunasEmpilhadas titulo="Perícias por mês: dispensa total e restrições" pontos={serie} series={SERIES} destaque={destaqueDaJanela(serie, janela)} />
          </Bloco>
        )}
        apoio={(
          <Bloco titulo="CID mais frequentes">
            <ListaBarras itens={cids.map(c => ({ ...c, to: LISTA }))} limite={desktop ? 5 : 3} />
          </Bloco>
        )}
      />
      {desktop && !minhas && (
        <div className="@container">
          <div className="grid grid-cols-1 @split:grid-cols-12 gap-6">
            <Bloco className="@split:col-span-7" titulo="Por OM">
              <ListaBarras itens={oms.map(o => ({ ...o, to: LISTA }))} limite={6} />
            </Bloco>
          </div>
        </div>
      )}
    </div>
  );
};
