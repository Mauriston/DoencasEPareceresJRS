// Ficheiro: components/ficha/afastamentos/PainelAfastamentos.tsx
// Ficha do inspecionado › aba Afastamentos: painel SÓ DE LEITURA (dashboard), sem barra de ações e sem lista de
// histórico. Reúne os resumos que ficavam nas guias da ficha antes da reformulação de 16/11/2026:
//   principal — Inspeções de Saúde: faixa dos últimos 12 meses (LTS/Restrições), resumo do ano e os períodos de
//     afastamento de cada IS (afastamentosDaIS); Perícias Menores: faixa dos 12 meses (Dispensa total/Restrições),
//     dias em 30 dias/12 meses/total e o saldo acumulado de 30 dias;
//   apoio (cards) — situação atual (afastamento vigente hoje), totais e CIDs (IS e perícias).
// Os dados das IS aparecem também para o User Médicos Geral (decisão do Presidente da JRS): só os afastamentos,
// nunca o detalhe da IS.
import React, { useMemo } from 'react';
import { Card } from '../../ui/Card';
import { StatusTag } from '../../ui/StatusTag';
import { CidCodigo, SaldoAcumulado, TextoContagem } from '../../periciaMenor/partes';
import { CascaPainelFicha } from '../CascaPainelFicha';
import { dataBR, type PericiaMenorRecord } from '../../../services/firestorePericiasMenores';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { saldoAcumulado } from '../../../utils/periciaMenorRegras';
import {
  ROTULO_TIPO_PERICIA, cidsFrequentes, contagemTermino, diaMes, faixa12Meses, partesCid, resumoPericias, tipoDaPericia,
} from '../../../utils/periciaMenorResumo';
import { afastamentosDaIS, cidsDaIS, faixaPeriodos12Meses, listaCidsDasIS, resumoISNoAno, type TipoAfastamentoIS } from '../../../utils/fichaInspecionado';

interface Dados {
  inspecoes: InspecaoRecord[];
  pericias: PericiaMenorRecord[];
  hoje: string;
  cidAbrev: ReadonlyMap<string, string> | null;
  /** Termos do perfil: "atestado(s)" para o User Médicos Geral. */
  atestado: boolean;
  /** Mostrar a parte das IS / das perícias (o perfil lê cada coleção). */
  comIS: boolean;
  comPericias: boolean;
}

const dias = (n: number) => `${n} dia${n !== 1 ? 's' : ''}`;
const ROTULO_IS: Record<TipoAfastamentoIS, string> = { lts: 'LTS', restricoes: 'Restrições' };

const LEGENDA_IS: { tipo: TipoAfastamentoIS; rotulo: string; classe: string }[] = [
  { tipo: 'lts', rotulo: 'LTS', classe: 'bg-navy' },
  { tipo: 'restricoes', rotulo: 'Restrições', classe: 'bg-gold' },
];
const LEGENDA_PM: { tipo: 'dispensa' | 'restricoes'; rotulo: string; classe: string }[] = [
  { tipo: 'dispensa', rotulo: 'Dispensa total', classe: 'bg-navy' },
  { tipo: 'restricoes', rotulo: 'Restrições', classe: 'bg-gold' },
];

/** Faixa dos últimos 12 meses (um quadradinho por mês) com legenda. */
function Faixa12Meses<T extends string>({ meses, legenda, rotulo }: { meses: { chave: string; rotulo: string; tipo: T | null }[]; legenda: { tipo: T; rotulo: string; classe: string }[]; rotulo: string }) {
  const classeDe = (t: T | null) => legenda.find(l => l.tipo === t)?.classe ?? 'bg-line';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-ink-3">Últimos 12 meses</h4>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          {legenda.map(l => <span key={l.tipo} className="inline-flex items-center gap-1"><span className={`w-3 h-3 rounded-sm ${l.classe}`} aria-hidden="true" />{l.rotulo}</span>)}
        </span>
      </div>
      <ol className="grid grid-cols-12 gap-0.5 sm:gap-1" aria-label={rotulo}>
        {meses.map(m => (
          <li key={m.chave} className="flex flex-col items-center gap-1 min-w-0">
            <span className={`w-full h-5 rounded ${classeDe(m.tipo)}`} aria-hidden="true" />
            <span className="text-xs font-semibold text-ink-3 truncate max-w-full">{m.rotulo}<span className="sr-only">: {legenda.find(l => l.tipo === m.tipo)?.rotulo ?? 'nenhum'}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const Kpi: React.FC<{ rotulo: string; valor: React.ReactNode }> = ({ rotulo, valor }) => (
  <div className="rounded-xl border border-line p-3 flex flex-col-reverse">
    <dt className="text-xs text-ink-3">{rotulo}</dt>
    <dd className="text-kpi text-navy tabular-nums">{valor}</dd>
  </div>
);

/** Cálculos comuns ao painel e aos cards. */
const useResumo = ({ inspecoes, pericias, hoje, cidAbrev }: Dados) => useMemo(() => {
  const periodosIS = inspecoes.flatMap(i => afastamentosDaIS(i as unknown as Record<string, unknown>).map(p => ({ ...p, is: i.is })))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  return {
    periodosIS,
    resumoIS: resumoISNoAno(inspecoes as unknown as Record<string, unknown>[], hoje),
    faixaIS: faixaPeriodos12Meses(periodosIS, hoje, ['lts', 'restricoes'] as const),
    resumoPM: resumoPericias(pericias, hoje),
    faixaPM: faixa12Meses(pericias, hoje),
    saldo: saldoAcumulado(pericias, hoje),
    cidsIS: listaCidsDasIS(inspecoes.map(i => ({ is: i.is, cids: cidsDaIS(i as unknown as Record<string, unknown>) }))),
    cidsPM: cidsFrequentes(pericias, cidAbrev, Number.POSITIVE_INFINITY),
    vigenteIS: periodosIS.find(p => p.inicio <= hoje && p.fim >= hoje) ?? null,
    vigentePM: pericias.find(p => p.dataTermino >= hoje && p.dataAtestado <= hoje) ?? null,
  };
}, [inspecoes, pericias, hoje, cidAbrev]);

export const PainelAfastamentos: React.FC<Dados & { nome: string }> = props => {
  const { atestado, comIS, comPericias, nome } = props;
  const r = useResumo(props);
  const doLaudo = r.periodosIS.some(p => p.origem === 'laudo');
  const termoPM = atestado ? 'Atestados' : 'Perícias Menores';
  return (
    <CascaPainelFicha titulo="Afastamentos" icone="event_busy" subtitulo={`Resumo dos afastamentos de ${nome}`}>
      <div className="space-y-8">
        {comIS && (
          <section aria-labelledby="afast-is" className="space-y-4">
            <h3 id="afast-is" className="text-h3 font-bold text-navy">Inspeções de Saúde</h3>
            <Faixa12Meses meses={r.faixaIS} legenda={LEGENDA_IS} rotulo="LTS e restrições por mês nos últimos 12 meses" />
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Kpi rotulo={`IS abertas em ${r.resumoIS.ano}`} valor={r.resumoIS.inspecoes} />
              <Kpi rotulo={`dias de LTS em ${r.resumoIS.ano}`} valor={r.resumoIS.diasLts} />
              <Kpi rotulo={`dias de Restrições em ${r.resumoIS.ano}`} valor={r.resumoIS.diasRestricoes} />
            </dl>
            {r.periodosIS.length === 0 ? (
              <p className="text-sm text-ink-3">Nenhum afastamento registrado nas Inspeções de Saúde.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-sm tabular-nums">
                  <caption className="sr-only">Períodos de afastamento das Inspeções de Saúde</caption>
                  <thead className="bg-thead text-xs text-ink-3">
                    <tr>
                      <th scope="col" className="text-left font-semibold px-3 py-2">Tipo</th>
                      <th scope="col" className="text-left font-semibold px-3 py-2">Período</th>
                      <th scope="col" className="text-right font-semibold px-3 py-2">Dias</th>
                      <th scope="col" className="text-right font-semibold px-3 py-2">IS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {r.periodosIS.map((p, i) => (
                      <tr key={`${p.is}-${i}`}>
                        <td className="px-3 py-2 font-semibold text-ink">{ROTULO_IS[p.tipo]}</td>
                        <td className="px-3 py-2">{dataBR(p.inicio)} a {dataBR(p.fim)}</td>
                        <td className="px-3 py-2 text-right">{p.dias}</td>
                        <td className="px-3 py-2 text-right">{p.is}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {doLaudo && <p className="text-xs text-ink-3">Alguns períodos foram lidos do texto do laudo das IS.</p>}
          </section>
        )}

        {comPericias && (
          <section aria-labelledby="afast-pm" className="space-y-4">
            <h3 id="afast-pm" className="text-h3 font-bold text-navy">{termoPM}</h3>
            <Faixa12Meses meses={r.faixaPM} legenda={LEGENDA_PM} rotulo={`${termoPM} por mês nos últimos 12 meses`} />
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">Dias de dispensa total e de restrições {atestado ? 'dos atestados' : 'das perícias menores'}</caption>
                <thead className="bg-thead text-xs text-ink-3">
                  <tr>
                    <th scope="col" className="text-left font-semibold px-3 py-2">Dias</th>
                    <th scope="col" className="text-right font-semibold px-3 py-2">30 dias</th>
                    <th scope="col" className="text-right font-semibold px-3 py-2">12 meses</th>
                    <th scope="col" className="text-right font-semibold px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {([['Dispensa total', r.resumoPM.dispensa], ['Restrições', r.resumoPM.restricoes]] as const).map(([rot, l]) => (
                    <tr key={rot}>
                      <th scope="row" className="text-left font-semibold text-ink px-3 py-2">{rot}</th>
                      <td className="text-right px-3 py-2">{l.d30}</td>
                      <td className="text-right px-3 py-2 font-bold text-navy">{l.m12}</td>
                      <td className="text-right px-3 py-2">{l.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-3">{r.resumoPM.registros} registro{r.resumoPM.registros !== 1 ? 's' : ''} · {r.resumoPM.vigentes} vigente{r.resumoPM.vigentes !== 1 ? 's' : ''} · {r.resumoPM.vdf} com VDF</p>
            <SaldoAcumulado usados={r.saldo.usados} restante={r.saldo.restante} />
          </section>
        )}
      </div>
    </CascaPainelFicha>
  );
};

/** Cards do painel de apoio da aba Afastamentos. */
export const ApoioAfastamentos: React.FC<Dados> = props => {
  const { atestado, comIS, comPericias, hoje, cidAbrev } = props;
  const r = useResumo(props);
  const vigentePM = comPericias ? r.vigentePM : null;
  const vigenteIS = comIS ? r.vigenteIS : null;
  return (
    <div className="space-y-4 md:space-y-6">
      <Card title="Situação atual">
        {!vigentePM && !vigenteIS ? (
          <p className="text-sm text-ink-3">Sem afastamento vigente hoje.</p>
        ) : (
          <ul className="space-y-3">
            {vigentePM && (
              <li className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy">{ROTULO_TIPO_PERICIA[tipoDaPericia(vigentePM.dispensas)]} até {diaMes(vigentePM.dataTermino)}</span>
                  <span className="block text-xs text-ink-3">{atestado ? 'Atestado' : 'Perícia menor'} de {diaMes(vigentePM.dataAtestado)} · saldo {r.saldo.restante} de 30 dias</span>
                </span>
                <TextoContagem contagem={contagemTermino(vigentePM.dataTermino, hoje)} curto />
              </li>
            )}
            {vigenteIS && (
              <li className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy">{ROTULO_IS[vigenteIS.tipo]} até {diaMes(vigenteIS.fim)}</span>
                  <span className="block text-xs text-ink-3">IS {vigenteIS.is} · {dias(vigenteIS.dias)} desde {diaMes(vigenteIS.inicio)}</span>
                </span>
                <StatusTag tone={vigenteIS.tipo === 'lts' ? 'navyOutline' : 'attention'}>{ROTULO_IS[vigenteIS.tipo]}</StatusTag>
              </li>
            )}
          </ul>
        )}
      </Card>

      <Card title="Totais">
        <dl className="divide-y divide-line">
          {comIS && <>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-xs text-ink-3">Afastamentos em IS</dt><dd className="text-sm text-ink tabular-nums">{r.periodosIS.length}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-xs text-ink-3">Dias de LTS (todas as IS)</dt><dd className="text-sm text-ink tabular-nums">{r.periodosIS.filter(p => p.tipo === 'lts').reduce((n, p) => n + p.dias, 0)}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-xs text-ink-3">Dias de Restrições (todas as IS)</dt><dd className="text-sm text-ink tabular-nums">{r.periodosIS.filter(p => p.tipo === 'restricoes').reduce((n, p) => n + p.dias, 0)}</dd></div>
          </>}
          {comPericias && <>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-xs text-ink-3">{atestado ? 'Atestados' : 'Perícias Menores'}</dt><dd className="text-sm text-ink tabular-nums">{r.resumoPM.registros}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-xs text-ink-3">Dias de dispensa total (total)</dt><dd className="text-sm text-ink tabular-nums">{r.resumoPM.dispensa.total}</dd></div>
          </>}
        </dl>
      </Card>

      <Card padding="none" as="section" title="CIDs">
        {(comIS ? r.cidsIS.length : 0) + (comPericias ? r.cidsPM.length : 0) === 0 ? (
          <p className="px-4 md:px-5 pb-4 -mt-1 text-sm text-ink-3">Nenhum CID registrado.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line max-h-[40vh] overflow-y-auto rounded-b-xl">
            {comIS && r.cidsIS.map(c => {
              const partes = partesCid({ cidCodigo: c.codigo.replace('.', '') }, cidAbrev);
              return (
                <li key={`is-${c.codigo}`} className="flex justify-between gap-3 px-4 md:px-5 py-2 text-sm">
                  <CidCodigo codigo={partes.codigo || c.codigo} descricao={partes.descricao} className="min-w-0" />
                  <span className="text-xs text-ink-3 tabular-nums shrink-0">IS {c.inspecoes.join(', ')}</span>
                </li>
              );
            })}
            {comPericias && r.cidsPM.map(c => (
              <li key={`pm-${c.chave}`} className="flex justify-between gap-3 px-4 md:px-5 py-2 text-sm">
                <CidCodigo codigo={c.codigo} descricao={c.descricao} className="min-w-0" />
                <span className="text-xs text-ink-3 tabular-nums shrink-0">{atestado ? 'atestados' : 'perícias'} · {c.n}×</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
