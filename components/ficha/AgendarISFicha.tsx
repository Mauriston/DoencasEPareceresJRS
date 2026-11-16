// Ficheiro: components/ficha/AgendarISFicha.tsx
// "Agendar IS" / "Reagendar IS" a partir da Ficha do inspecionado (aba Inspeções de Saúde): o mesmo
// AgendarDialog da página Inspeções de Saúde (data, horário e perito responsável). A ocupação da agenda
// (todas as IS), os bloqueios, a configuração dos turnos e os peritos só são lidos enquanto o dialog está
// aberto — a ficha continua lendo só os registros do NIP (MF2).
import React, { useEffect, useState } from 'react';
import { AgendarDialog } from '../inspecoes/AgendarDialog';
import { carregarPeritos, type PeritoIS } from '../../services/peritosIS';
import { observarBloqueios, observarConfigAgenda, observarInspecoes, type InspecaoRecord } from '../../services/firestoreInspecoes';
import type { BloqueioAgenda, ConfigAgenda } from '../../utils/inspecoes';

interface Props {
  inspecao: InspecaoRecord;
  onClose: () => void;
  onAgendada: (mensagem: string, tom?: 'success' | 'error') => void;
}

export const AgendarISFicha: React.FC<Props> = ({ inspecao, onClose, onAgendada }) => {
  const [peritos, setPeritos] = useState<PeritoIS[] | null>(null);
  const [config, setConfig] = useState<ConfigAgenda | null>(null);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [inspecoes, setInspecoes] = useState<InspecaoRecord[] | null>(null);

  useEffect(() => { carregarPeritos().then(setPeritos).catch(() => setPeritos([])); }, []);
  useEffect(() => observarConfigAgenda(setConfig, () => setConfig({})), []);
  useEffect(() => observarBloqueios(setBloqueios), []);
  useEffect(() => observarInspecoes(setInspecoes, () => setInspecoes([])), []);

  if (!peritos || !config || !inspecoes) {
    return (
      <div className="fixed inset-0 z-dialog bg-black/40 flex items-center justify-center" role="status" aria-label="Carregando a agenda">
        <span className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <AgendarDialog
      inspecao={inspecoes.find(i => i.id === inspecao.id) ?? inspecao}
      peritos={peritos} config={config} bloqueios={bloqueios} inspecoes={inspecoes}
      peritoInicial={inspecao.peritoUid || undefined}
      onClose={onClose} onAgendada={onAgendada}
    />
  );
};
