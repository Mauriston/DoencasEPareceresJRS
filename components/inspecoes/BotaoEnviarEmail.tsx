// Ficheiro: components/inspecoes/BotaoEnviarEmail.tsx
// Itens do menu "Enviar e-mails" do cabeçalho de Inspeções de Saúde (Admin e Secretaria): os e-mails da JRS e, à
// direita de cada item, quantos estão pendentes (listas em utils/pendenciasEmailIS.ts). O badge do botão soma as
// pendências de agendamento, resultado, resultado de Benefícios, faltas (HNRe) e NAC.
//  - E-mails de agendamento: IS (todos os grupos) agendadas ou reagendadas, de hoje em diante, sem o e-mail daquela
//    data (lista → dialog de confirmação, que diz se é agendamento ou reagendamento).
//  - E-mails de resultado: IS finalizadas de Verificações e Términos sem o resultado enviado (lista → envio individual).
//  - Resultado (Benefícios): IS de Benefícios finalizadas (TIS assinado) sem o e-mail de resultado de Benefícios
//    (lista → dialog com o modelo sugerido pela IA).
//  - E-mail de faltas (HNRe): mantém a regra — desabilitado sem faltas pendentes.
//  - E-mail ao NAC: IS finalizadas de Verificações e Términos ainda não enviadas.
// O e-mail "IS agendadas" do dia seguinte saiu do menu: é automático (Cloud Scheduler, 18h — servidor/email/agendaIS.ts).
// Admin (`podeLimpar`): os modais ganham caixas de seleção e o botão "Limpar", que tira as IS marcadas da lista de
// pendências sem enviar o e-mail (utils/emailsDispensados.ts). `abrir(tipo)` abre o modal de um tipo — usado pelo
// ?email=tipo de /inspecoes (itens de e-mail do card "Pendências" da Início).
import React, { useMemo, useState } from 'react';
import type { ItemMenu } from '../ui/MenuAcoes';
import { EmailFaltasDialog } from './EmailFaltasDialog';
import { EmailNacDialog } from './EmailNacDialog';
import { EscolherISDialog } from './EscolherISDialog';
import { dispensarEmailsPendentes, type InspecaoRecord } from '../../services/firestoreInspecoes';
import type { MilitarRecord } from '../../services/firestoreMilitares';
import { pendenciasEmailIS, TIPOS_EMAIL_PENDENTE } from '../../utils/pendenciasEmailIS';
import type { TipoEmailPendente } from '../../utils/emailsDispensados';
import { ehReagendamentoEmail } from '../../utils/confirmacaoAgendamentoIS';
import { dataBr, dataHoraBr } from '../../utils/inspecoes';

export interface EmailsISProps {
  inspecoes: InspecaoRecord[];
  militares: MilitarRecord[];
  hoje: string;
  /** Admin: caixas de seleção e "Limpar" nos modais. */
  podeLimpar: boolean;
  /** Abre o envio do e-mail de agendamento da IS. */
  onEnviarAgendamento: (is: InspecaoRecord) => void;
  /** Abre o envio do e-mail de resultado da IS. */
  onEnviarResultado: (is: InspecaoRecord) => void;
  /** Abre o envio do e-mail de resultado de Benefícios. */
  onEnviarResultadoBeneficios: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
  /** Só estes tipos (ex.: na Ficha do inspecionado, os de natureza individual); padrão: todos. */
  tipos?: TipoEmailPendente[];
  /** Só os itens com pendência (sem itens desabilitados). */
  somentePendentes?: boolean;
}

/** Itens de e-mail (com contadores), o total de pendências, `abrir(tipo)` e os diálogos que eles abrem (renderize `dialogos`). */
export const useEmailsIS = ({ inspecoes, militares, hoje, podeLimpar, onEnviarAgendamento, onEnviarResultado, onEnviarResultadoBeneficios, onAviso, tipos, somentePendentes }: EmailsISProps): {
  itens: ItemMenu[]; total: number; abrir: (tipo: TipoEmailPendente) => void; dialogos: React.ReactNode;
} => {
  const [aberto, setAberto] = useState<TipoEmailPendente | null>(null);
  const listas = useMemo(() => {
    const omPorId = new Map<string, string>(militares.map(m => [m.id, m.om]));
    return pendenciasEmailIS(inspecoes, id => omPorId.get(id), hoje);
  }, [inspecoes, militares, hoje]);
  const tiposVisiveis = TIPOS_EMAIL_PENDENTE.filter(t => !tipos || tipos.includes(t.tipo));
  const total = tiposVisiveis.reduce((n, t) => n + listas[t.tipo].length, 0);

  const itens: ItemMenu[] = tiposVisiveis.filter(t => !somentePendentes || listas[t.tipo].length > 0).map(t => ({
    rotulo: t.rotulo, icone: t.icone, contador: listas[t.tipo].length, desabilitado: listas[t.tipo].length === 0, onClick: () => setAberto(t.tipo),
  }));

  const fechar = (msg?: string, tom?: 'success' | 'error') => { setAberto(null); if (msg) onAviso(msg, tom); };
  const limpar = (tipo: TipoEmailPendente) => (podeLimpar
    ? async (lista: InspecaoRecord[]) => {
      if (!lista.length) return;
      await dispensarEmailsPendentes(tipo, lista);
      onAviso(`${lista.length} pendência${lista.length !== 1 ? 's' : ''} removida${lista.length !== 1 ? 's' : ''} da lista.`);
    }
    : undefined);

  const dialogos = (
    <>
      {aberto === 'agendamento' && (
        <EscolherISDialog
          titulo="E-mails de agendamento pendentes" icone="forward_to_inbox" pendentes={listas.agendamento}
          descricao="IS agendadas ou reagendadas (hoje ou depois) sem o e-mail daquela data ao inspecionado. Escolha a IS para conferir e enviar."
          vazio="Nenhum e-mail de agendamento pendente." detalhe={i => `${dataHoraBr(i.dataEntrevista)}${ehReagendamentoEmail(i) ? ' · reagendamento' : ''}`}
          onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarAgendamento(is); }} onLimpar={limpar('agendamento')}
        />
      )}
      {aberto === 'resultado' && (
        <EscolherISDialog
          titulo="E-mails de resultado pendentes" icone="mark_email_unread" pendentes={listas.resultado}
          descricao="IS finalizadas de Verificações e Términos cujo resultado ainda não foi enviado ao inspecionado. O e-mail é individual: escolha a IS."
          vazio="Nenhum e-mail de resultado pendente." detalhe={i => `laudo ${dataBr(i.dataLaudo) || '—'}`}
          onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarResultado(is); }} onLimpar={limpar('resultado')}
        />
      )}
      {aberto === 'beneficios' && (
        <EscolherISDialog
          titulo="Resultados de Benefícios pendentes" icone="mark_email_unread" pendentes={listas.beneficios}
          descricao="IS de Benefícios finalizadas cujo resultado ainda não foi enviado ao inspecionado. Escolha a IS: a IA sugere o modelo e você confere antes de enviar."
          vazio="Nenhum resultado de Benefícios pendente." detalhe={i => `TIS ${i.tis || '—'}`}
          onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarResultadoBeneficios(is); }} onLimpar={limpar('beneficios')}
        />
      )}
      {aberto === 'faltas' && <EmailFaltasDialog pendentes={listas.faltas} onClose={() => fechar()} onEnviado={fechar} onLimpar={limpar('faltas')} />}
      {aberto === 'nac' && <EmailNacDialog pendentes={listas.nac} onClose={() => fechar()} onEnviado={fechar} onLimpar={limpar('nac')} />}
    </>
  );
  return { itens, total, abrir: setAberto, dialogos };
};
