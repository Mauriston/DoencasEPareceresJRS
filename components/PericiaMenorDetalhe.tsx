// Ficheiro: components/PericiaMenorDetalhe.tsx
import React, { useMemo } from 'react';
import { Header } from './Header';

interface PericiaMenorRecord {
  inspecionado: string;
  om: string;
  cid: string;
  dispensas: string;
  dataAtestado: string;
  dataAtestadoTs: number;
  tempoAtestado: string;
  vigente: boolean;
  concluido: boolean;
  vdf: boolean;
  link: string;
}

interface Props {
  person: string;
  records: PericiaMenorRecord[];
  onBack: () => void;
}

const parseDias = (val: string): number => {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
};

export const PericiaMenorDetalhe: React.FC<Props> = ({ person, records, onBack }) => {
  const now = Date.now();
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
  const last30 = now - 30 * 24 * 60 * 60 * 1000;

  const stats = useMemo(() => {
    const total = records.length;
    const vigentes = records.filter(r => r.vigente).length;
    const vdfCount = records.filter(r => r.vdf).length;

    const isAfastado = (r: PericiaMenorRecord) =>
      r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES');
    const isRestricao = (r: PericiaMenorRecord) =>
      r.dispensas.trim() !== '' && !r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES');

    const diasAfastadoTotal = records.filter(isAfastado).reduce((s, r) => s + parseDias(r.tempoAtestado), 0);
    const diasAfastadoAno   = records.filter(r => isAfastado(r) && r.dataAtestadoTs >= startOfYear).reduce((s, r) => s + parseDias(r.tempoAtestado), 0);
    const diasAfastado30    = records.filter(r => isAfastado(r) && r.dataAtestadoTs >= last30).reduce((s, r) => s + parseDias(r.tempoAtestado), 0);

    const diasRestricaoTotal = records.filter(isRestricao).reduce((s, r) => s + parseDias(r.tempoAtestado), 0);
    const diasRestricaoAno   = records.filter(r => isRestricao(r) && r.dataAtestadoTs >= startOfYear).reduce((s, r) => s + parseDias(r.tempoAtestado), 0);
    const diasRestricao30    = records.filter(r => isRestricao(r) && r.dataAtestadoTs >= last30).reduce((s, r) => s + parseDias(r.tempoAtestado), 0);

    const cidMap: Record<string, number> = {};
    records.forEach(r => { if (r.cid) cidMap[r.cid] = (cidMap[r.cid] || 0) + 1; });
    const topCids = Object.entries(cidMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { total, vigentes, vdfCount, diasAfastadoTotal, diasAfastadoAno, diasAfastado30, diasRestricaoTotal, diasRestricaoAno, diasRestricao30, topCids };
  }, [records]);

  const sorted = [...records].sort((a, b) => b.dataAtestadoTs - a.dataAtestadoTs);
  const om = records[0]?.om || '';

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      <Header onBack={onBack} />

      {/* Título / subtítulos abaixo da barra de topo */}
      <div className="bg-[#050F41] px-4 pb-4 pt-1">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Histórico de Perícias Menores</p>
        <h2 className="text-white font-bold text-sm leading-snug mt-1 truncate">{person}</h2>
        {om && <p className="text-white/60 text-xs mt-0.5">OM: {om}</p>}
      </div>

      <div className="px-4 pt-4 pb-28 w-full max-w-2xl mx-auto space-y-4">

        {/* KPI — Perícias Menores Realizadas */}
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Perícias Menores Realizadas</p>
        <div className="grid grid-cols-3 gap-2 -mt-2">
          {[
            { label: 'Total', value: stats.total, color: 'text-[#050F41]' },
            { label: 'Vigentes', value: stats.vigentes, color: stats.vigentes > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: 'VDF', value: stats.vdfCount, color: stats.vdfCount > 0 ? 'text-amber-500' : 'text-gray-400' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-3 text-center shadow-sm">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* DIAS AFASTADOS */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-bold text-[#050F41] uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-red-500">event_busy</span>
            Dias Afastados
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Histórico', value: stats.diasAfastadoTotal },
              { label: `Ano ${new Date().getFullYear()}`, value: stats.diasAfastadoAno },
              { label: 'Últimos 30d', value: stats.diasAfastado30 },
            ].map(k => (
              <div key={k.label} className="bg-red-50 rounded-xl p-2.5 text-center border border-red-100">
                <p className="text-xl font-bold text-red-600">{k.value}</p>
                <p className="text-[9px] text-red-400 font-semibold uppercase tracking-wide mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* DIAS EM RESTRIÇÕES */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-bold text-[#050F41] uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-500">warning</span>
            Dias em Restrições
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Histórico', value: stats.diasRestricaoTotal },
              { label: `Ano ${new Date().getFullYear()}`, value: stats.diasRestricaoAno },
              { label: 'Últimos 30d', value: stats.diasRestricao30 },
            ].map(k => (
              <div key={k.label} className="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
                <p className="text-xl font-bold text-amber-600">{k.value}</p>
                <p className="text-[9px] text-amber-400 font-semibold uppercase tracking-wide mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top CIDs */}
        {stats.topCids.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-bold text-[#050F41] uppercase tracking-wider flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[16px] text-[#079551]">diagnosis</span>
              Principais CID
            </h3>
            <div className="space-y-1.5">
              {stats.topCids.map(([cid, count]) => (
                <div key={cid} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#050F41] w-20 shrink-0">{cid}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-[#079551] h-1.5 rounded-full" style={{ width: `${(count / stats.topCids[0][1]) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de Perícias */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#050F41]/5 px-4 py-2.5 border-b border-gray-100">
            <h3 className="text-xs font-bold text-[#050F41] uppercase tracking-wider">Histórico de Perícias</h3>
          </div>
          {sorted.map((rec, i) => (
            <div key={i} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-800">{rec.dataAtestado}</span>
                    {rec.tempoAtestado && (
                      <span className="text-[10px] text-gray-400">{rec.tempoAtestado.replace(/^(\d+)$/, '$1 dias')}</span>
                    )}
                    {rec.vigente && (
                      <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">vigente</span>
                    )}
                    {rec.vdf && (
                      <span className="bg-amber-100 text-amber-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">VDF</span>
                    )}
                  </div>
                  {rec.cid && <p className="text-[11px] text-gray-500 mt-0.5">{rec.cid}</p>}
                  {rec.dispensas && <p className="text-[10px] text-gray-400 mt-0.5">{rec.dispensas}</p>}
                </div>
                {rec.link && (
                  <a href={rec.link} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 w-8 h-8 bg-gray-100 hover:bg-[#050F41] text-gray-500 hover:text-white rounded-full flex items-center justify-center transition-colors"
                    title="Abrir documento">
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
