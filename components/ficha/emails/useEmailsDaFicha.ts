// Ficheiro: components/ficha/emails/useEmailsDaFicha.ts
// Ficha do inspecionado › aba Emails: todos os e-mails enviados que envolvem o inspecionado, do mais recente:
//  - envios com conteúdo: emails_enviados where nips array-contains NIP (services/emailsEnviados.ts) — e-mails das
//    IS dele (inclusive os em lote: NAC, faltas, agenda do dia) e os ligados ao NIP fora das IS (pedido de
//    impressão do parecer);
//  - histórico antigo de cada IS (inspecoes/{isId}/emails e campos antigos da IS — um ouvinte por IS, sem consulta
//    à coleção inteira), sem repetir o que já veio com conteúdo (utils/emailsEnviados.ts → emailsDaFicha).
// Sem permissão de leitura de emails_enviados (perfil fora da equipe), a aba mostra só o histórico das IS.
import { useEffect, useMemo, useState } from 'react';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { observarEmailsDaIS, type RegistroEmailISRecord } from '../../../services/historicoEmailsIS';
import { observarEmailsDoInspecionado, type EmailEnviadoRecord } from '../../../services/emailsEnviados';
import { emailsDaFicha, type ItemEmailFicha } from '../../../utils/emailsEnviados';

export const useEmailsDaFicha = (
  nip: string,
  inspecoes: InspecaoRecord[],
  ativo: boolean,
  usuarioDoUid?: (uid: string) => string | undefined,
): ItemEmailFicha[] => {
  const [enviados, setEnviados] = useState<EmailEnviadoRecord[]>([]);
  const [porIS, setPorIS] = useState<Record<string, RegistroEmailISRecord[]>>({});

  useEffect(() => {
    setEnviados([]);
    if (!ativo || !nip) return;
    return observarEmailsDoInspecionado(nip, setEnviados, () => setEnviados([]));
  }, [nip, ativo]);

  const chave = inspecoes.map(i => i.id).join('|');
  useEffect(() => {
    setPorIS({});
    if (!ativo || !chave) return;
    const parar = chave.split('|').map(id => observarEmailsDaIS(
      id,
      lista => setPorIS(m => ({ ...m, [id]: lista })),
      () => setPorIS(m => ({ ...m, [id]: [] })),
    ));
    return () => parar.forEach(f => f());
  }, [chave, ativo]);

  return useMemo(
    () => emailsDaFicha(enviados, inspecoes.map(is => ({ is, registros: porIS[is.id] ?? [] })), usuarioDoUid),
    [enviados, porIS, inspecoes, usuarioDoUid],
  );
};
