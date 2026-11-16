// Ficheiro: components/ficha/AbrirISFicha.tsx
// "Abrir IS" do cabeçalho da Ficha do inspecionado (Manualmente · Por print): o MESMO formulário da página
// Inspeções de Saúde (InspecaoForm / ISPorFotoForm), no painel principal da aba Inspeções de Saúde em telas
// grandes e em bottom sheet no celular. Manualmente já vem com o inspecionado da ficha.
// Depois de gravar: Google Agenda (IS agendada) aqui; guias de exames e e-mails de abertura/guias (PosCriacaoIS)
// e o e-mail de agendamento ficam com a página da ficha (onCriada), que já abre a IS nova no painel.
// A base de inspecionados, os peritos, a agenda e as IS (ocupação) só são lidos enquanto o formulário está aberto.
import React, { useEffect, useState } from 'react';
import { InspecaoForm, type DadosInspecionadoIS } from '../inspecoes/InspecaoForm';
import { ISPorFotoForm } from '../inspecoes/ISPorFotoForm';
import { useNav } from '../../context/NavContext';
import { canUseFeature } from '../../config/permissions';
import { carregarPeritos, type PeritoIS } from '../../services/peritosIS';
import { observarBloqueios, observarConfigAgenda, observarInspecoes, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { observarMilitares, type MilitarRecord } from '../../services/firestoreMilitares';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import { avisarAgendamento } from '../../services/emailAgendamentoIS';
import type { BloqueioAgenda, ConfigAgenda } from '../../utils/inspecoes';
import type { CascaForm } from './CascaFormulario';

export type ModoAbrirIS = 'manual' | 'print';

interface Props {
  modo: ModoAbrirIS;
  /** NIP do inspecionado da ficha (pré-preenche o formulário manual). */
  nip: string;
  casca: CascaForm;
  onClose: () => void;
  /** IS cadastrada pelo formulário manual (a ficha fecha o formulário, abre a IS e segue com o pós-criação). */
  onCriada: (is: InspecaoRecord, dados: DadosInspecionadoIS) => void;
  /** IS por print gravada(s): a ficha fecha o formulário e abre a IS (quando só uma). */
  onGravadasPorPrint: (unica: InspecaoRecord | null) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const AbrirISFicha: React.FC<Props> = ({ modo, nip, casca, onClose, onCriada, onGravadasPorPrint, onAviso }) => {
  const nav = useNav();
  const usuario = nav?.authUser;
  const perfil = usuario?.perfil;

  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [peritos, setPeritos] = useState<PeritoIS[] | null>(null);
  const [config, setConfig] = useState<ConfigAgenda | null>(null);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [inspecoes, setInspecoes] = useState<InspecaoRecord[] | null>(null);

  useEffect(() => observarMilitares(setMilitares), []);
  useEffect(() => { carregarPeritos().then(setPeritos).catch(() => setPeritos([])); }, []);
  useEffect(() => observarConfigAgenda(setConfig, () => setConfig({})), []);
  useEffect(() => observarBloqueios(setBloqueios), []);
  useEffect(() => observarInspecoes(setInspecoes, () => setInspecoes([])), []);

  const sincronizar = (is: InspecaoRecord, rotulo: string) => sincronizarAgendaIS(is).then(r => {
    if (!r.ok) onAviso(`IS ${is.is} ${rotulo}, mas o Google Agenda não foi atualizado: ${r.erro}`, 'error');
  });

  const aoCriada = (is: InspecaoRecord, dados: DadosInspecionadoIS = {}) => {
    if (is.dataEntrevista) { onAviso(`IS ${is.is} cadastrada e agendada.`); void sincronizar(is, 'cadastrada'); }
    else onAviso(`IS ${is.is} cadastrada.`);
    onCriada(is, dados);
  };

  if (!usuario) return null;
  const carregando = !peritos || !config || !inspecoes;
  const comum = {
    militares, peritos: peritos ?? [], config: config ?? {}, bloqueios, inspecoes: inspecoes ?? [],
    usuario: { uid: usuario.uid, usuario: usuario.usuario, perfil: usuario.perfil },
    podeCadastrarInspecionado: canUseFeature('militares.cadastrar', perfil), casca,
  };

  return (
    <>
      {carregando ? (
        casca === 'inline' ? (
          <div className="bg-white border border-line rounded-xl flex items-center justify-center py-20" role="status" aria-label="Carregando o formulário">
            <span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" />
          </div>
        ) : (
          <div className="fixed inset-0 z-dialog bg-black/40 flex items-center justify-center" role="status" aria-label="Carregando o formulário">
            <span className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        )
      ) : modo === 'manual' ? (
        <InspecaoForm {...comum} podeAgendar={canUseFeature('inspecoes.agendar', perfil)} inicial={{ inspecionadoId: nip }} onClose={onClose} onCriada={aoCriada} />
      ) : (
        <ISPorFotoForm
          {...comum} onClose={onClose}
          onGravada={(is, _criada, reservada) => {
            if (reservada) void sincronizar(is, 'gravada');
            if (reservada && is.dataEntrevista) avisarAgendamento(is, is.dataEntrevista);
          }}
          onConcluido={(gravadas, unica) => {
            onAviso(unica ? `IS ${unica.is} gravada.` : `${gravadas} IS gravada${gravadas !== 1 ? 's' : ''}.`);
            onGravadasPorPrint(unica);
          }}
        />
      )}
    </>
  );
};
