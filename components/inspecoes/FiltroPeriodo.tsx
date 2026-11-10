// Ficheiro: components/inspecoes/FiltroPeriodo.tsx
// Filtro de período da visão Tabela das Inspeções de Saúde (pela data da entrevista): Hoje, Esta semana,
// Este mês, Este trimestre, Este semestre, Este ano e Customizado. "Customizado" mostra, no mesmo
// popover, as datas de início e fim (inputs date do DS) e o botão "Aplicar". Intervalos em utils/periodos.ts.
import React, { useId, useState } from 'react';
import { FiltroPopover } from './FiltroPopover';
import { Button } from '../ui/Button';
import { controlClass, controlErrorClass } from '../ui/Field';
import { PERIODOS, intervaloDoPeriodo, rotuloDoPeriodo, type Intervalo, type PeriodoId } from '../../utils/periodos';

export interface FiltroPeriodoValor { id: PeriodoId; custom?: Intervalo }

const PainelPeriodo: React.FC<{ value: FiltroPeriodoValor; onChange: (v: FiltroPeriodoValor) => void; fechar: () => void }> = ({ value, onChange, fechar }) => {
  const [escolha, setEscolha] = useState<PeriodoId>(value.id);
  const inicial = value.custom ?? intervaloDoPeriodo('mes');
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const nome = useId();
  const invertido = !!inicio && !!fim && inicio > fim;
  const valido = !!inicio && !!fim && !invertido;

  const escolher = (id: PeriodoId) => {
    setEscolha(id);
    if (id !== 'custom') { onChange({ id }); fechar(); }
  };

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Período da entrevista</legend>
        {PERIODOS.map(p => (
          <label key={p.id} className="flex items-center gap-3 min-h-[44px] px-3 cursor-pointer hover:bg-thead">
            <input type="radio" name={nome} className="w-5 h-5 shrink-0 accent-navy" checked={escolha === p.id} onChange={() => escolher(p.id)} onClick={() => { if (p.id !== 'custom' && escolha === p.id) fechar(); }} />
            <span className={`text-sm ${escolha === p.id ? 'font-bold text-navy' : 'font-semibold text-ink'}`}>{p.rotulo}</span>
          </label>
        ))}
      </fieldset>
      {escolha === 'custom' && (
        <form
          className="border-t border-line mt-1 px-3 pt-3 pb-2 space-y-3"
          onSubmit={e => { e.preventDefault(); if (!valido) return; onChange({ id: 'custom', custom: { inicio, fim } }); fechar(); }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-xs font-semibold text-ink-3 mb-1">Início</span>
              <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} max={fim || undefined} required className={`${controlClass} ${invertido ? controlErrorClass : ''}`} />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-ink-3 mb-1">Fim</span>
              <input type="date" value={fim} onChange={e => setFim(e.target.value)} min={inicio || undefined} required className={`${controlClass} ${invertido ? controlErrorClass : ''}`} />
            </label>
          </div>
          {invertido && <p role="alert" className="text-xs font-semibold text-wine">O início deve ser anterior ao fim.</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={!valido}>Aplicar</Button>
          </div>
        </form>
      )}
    </div>
  );
};

export const FiltroPeriodo: React.FC<{ value: FiltroPeriodoValor; onChange: (v: FiltroPeriodoValor) => void; className?: string }> = ({ value, onChange, className }) => (
  <FiltroPopover nome="Período" icone="date_range" resumo={rotuloDoPeriodo(value.id, value.custom)} className={className}>
    {fechar => <PainelPeriodo value={value} onChange={onChange} fechar={fechar} />}
  </FiltroPopover>
);
