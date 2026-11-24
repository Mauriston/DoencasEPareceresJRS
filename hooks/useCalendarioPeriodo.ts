// Ficheiro: hooks/useCalendarioPeriodo.ts
// Navegação comum dos calendários de mês inteiro: no celular (< md) mostram UMA SEMANA por vez (poupa altura) e
// as setas andam de semana em semana; no desktop continuam com o mês inteiro. `referencia` é o dia que dá nome
// ao rótulo do período (no celular, o meio da semana; no desktop, o dia 1 do mês).
import { useState } from 'react';
import { useIsDesktop } from './useIsDesktop';
import { deISO, inicioDaSemana, inicioDoMes, paraISO, somarDias } from '../utils/inspecoes';
import { gradeDoMes } from '../utils/disponibilidadeAgenda';

export const useCalendarioPeriodo = (ancoraInicial: string) => {
  const semanal = !useIsDesktop();
  const [ancora, setAncora] = useState(ancoraInicial);
  const mes = inicioDoMes(ancora);
  const inicioSemana = inicioDaSemana(ancora);
  const dias = semanal ? Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i)) : gradeDoMes(mes);
  const referencia = semanal ? somarDias(inicioSemana, 3) : mes;
  const mudar = (n: number) => {
    if (semanal) { setAncora(somarDias(ancora, 7 * n)); return; }
    const d = deISO(mes); d.setMonth(d.getMonth() + n, 1); setAncora(paraISO(d));
  };
  /** Dia de outro mês (só no modo mensal; na semana todos os dias contam). */
  const foraDoPeriodo = (d: string) => !semanal && d.slice(0, 7) !== mes.slice(0, 7);
  return { semanal, ancora, setAncora, dias, referencia, mudar, foraDoPeriodo };
};
