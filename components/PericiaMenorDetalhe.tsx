// Ficheiro: components/PericiaMenorDetalhe.tsx
import React, { useMemo } from 'react';
import { Container, PageHeader } from './ui/Page';
import { useBreadcrumbs } from '../context/BreadcrumbContext';
import { periciaMenorPath } from '../config/routes';
import { PericiaStatusTags, isAfastamentoLts, isRestricaoPericia, registroPericia } from './ui/PericiaStatusTags';
import { dataBR, statusPericia, type PericiaMenorRecord } from '../services/firestorePericiasMenores';
import { extrairNomeInspecionado } from '../utils/format';

interface Props {
  person: string;
  records: PericiaMenorRecord[];
  /** Hoje (AAAA-MM-DD), para o status Vigente/Concluída. */
  hoje: string;
}

const tsDe = (r: PericiaMenorRecord): number => { const [a, m, d] = r.dataAtestado.split('-').map(Number); return new Date(a, m - 1, d).getTime(); };

export const PericiaMenorDetalhe: React.FC<Props> = ({ person, records, hoje }) => {
  useBreadcrumbs([{ label: 'Perícias menores', to: periciaMenorPath('historico') }, { label: extrairNomeInspecionado(person) }]);
  const now = Date.now();
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
  const last30 = now - 30 * 24 * 60 * 60 * 1000;

  const stats = useMemo(() => {
    const total = records.length;
    const vigentes = records.filter(r => statusPericia(r, hoje) === 'vigente').length;
    const vdfCount = records.filter(r => r.vdf).length;

    const afastados = records.filter(r => isAfastamentoLts(registroPericia(r, hoje)));
    const restricoes = records.filter(r => isRestricaoPericia(registroPericia(r, hoje)));
    const soma = (lista: PericiaMenorRecord[], desde = 0) => lista.filter(r => tsDe(r) >= desde).reduce((s, r) => s + (r.tempoHomologado || 0), 0);

    const cidMap: Record<string, number> = {};
    records.forEach(r => { if (r.cid) cidMap[r.cid] = (cidMap[r.cid] || 0) + 1; });
    const topCids = Object.entries(cidMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      total, vigentes, vdfCount, topCids,
      diasAfastadoTotal: soma(afastados), diasAfastadoAno: soma(afastados, startOfYear), diasAfastado30: soma(afastados, last30),
      diasRestricaoTotal: soma(restricoes), diasRestricaoAno: soma(restricoes, startOfYear), diasRestricao30: soma(restricoes, last30),
    };
  }, [records, hoje]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...records].sort((a, b) => b.dataAtestado.localeCompare(a.dataAtestado));
  const om = records[0]?.om || '';

  return (
    <div className="flex flex-col flex-1">
      <Container size="reading" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader title={person} description={om ? `Histórico de perícias menores · OM: ${om}` : 'Histórico de perícias menores'} />


        <div className="bg-white rounded-2xl border border-line shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-bold text-navy tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-navy">assignment</span>
            Perícias Menores Realizadas
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: stats.total, color: 'text-navy', filete: 'border-t-navy' },
              { label: 'Vigentes', value: stats.vigentes, color: stats.vigentes > 0 ? 'text-wine' : 'text-ink-3', filete: 'border-t-wine' },
              { label: 'VDF', value: stats.vdfCount, color: stats.vdfCount > 0 ? 'text-gold-ink' : 'text-ink-3', filete: 'border-t-gold' },
            ].map(k => (
              <div key={k.label} className={`bg-white rounded-xl border border-line border-t-4 ${k.filete} p-2.5 text-center`}>
                <p className={`text-kpi tabular-nums font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-ink-3 font-semibold mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-bold text-navy tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-navy">event_busy</span>
            Dias Afastados
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Histórico', value: stats.diasAfastadoTotal },
              { label: `Ano ${new Date().getFullYear()}`, value: stats.diasAfastadoAno },
              { label: 'Últimos 30d', value: stats.diasAfastado30 },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-line border-t-4 border-t-wine p-2.5 text-center">
                <p className="text-kpi tabular-nums font-bold text-wine">{k.value}</p>
                <p className="text-xs text-ink-3 font-semibold mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-bold text-navy tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-navy">warning</span>
            Dias em Restrições
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Histórico', value: stats.diasRestricaoTotal },
              { label: `Ano ${new Date().getFullYear()}`, value: stats.diasRestricaoAno },
              { label: 'Últimos 30d', value: stats.diasRestricao30 },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-line border-t-4 border-t-gold p-2.5 text-center">
                <p className="text-kpi tabular-nums font-bold text-gold-ink">{k.value}</p>
                <p className="text-xs text-ink-3 font-semibold mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {stats.topCids.length > 0 && (
          <div className="bg-white rounded-2xl border border-line shadow-sm p-4">
            <h3 className="text-xs font-bold text-navy tracking-wider flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[16px] text-green-700">diagnosis</span>
              Principais CID
            </h3>
            <div className="space-y-1.5">
              {stats.topCids.map(([cid, count]) => (
                <div key={cid} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-navy w-20 shrink-0">{cid}</span>
                  <div className="flex-1 bg-thead rounded-full h-1.5">
                    <div className="bg-green h-1.5 rounded-full" style={{ width: `${(count / stats.topCids[0][1]) * 100}%` }} />
                  </div>
                  <span className="text-xs text-ink-3 w-6 text-right">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
          <div className="bg-navy/5 px-4 py-2.5 border-b border-line">
            <h3 className="text-xs font-bold text-navy tracking-wider">Histórico de Perícias</h3>
          </div>
          {sorted.map((rec, i) => (
            <div key={i} className={`px-4 py-3 border-b border-line last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-paper/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-navy">{dataBR(rec.dataAtestado)}</span>
                    {rec.tempoHomologado > 0 && (
                      <span className="text-xs text-ink-3">{rec.tempoHomologado} dia{rec.tempoHomologado !== 1 ? 's' : ''} · até {dataBR(rec.dataTermino)}</span>
                    )}
                  </div>
                  <div className="mt-1.5"><PericiaStatusTags registro={registroPericia(rec, hoje)} mostrarVdf /></div>
                  {rec.cid && <p className="text-xs text-ink-3 mt-0.5">{rec.cid}</p>}
                  {rec.dispensas?.length > 0 && <p className="text-xs text-ink-3 mt-0.5">{rec.dispensas.join(', ')}</p>}
                </div>
                {rec.pdfUrl && (
                  <a href={rec.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 w-11 h-11 bg-thead hover:bg-navy text-ink-3 hover:text-white rounded-full flex items-center justify-center transition-colors"
                    title="Abrir documento" aria-label="Abrir documento">
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

            </Container>
    </div>
  );
};