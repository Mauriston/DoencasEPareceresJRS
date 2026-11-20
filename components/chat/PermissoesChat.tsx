// Ficheiro: components/chat/PermissoesChat.tsx
// Administração › Chat: matriz por perfil (Admin, User Médicos, MPI, Geral e Secretaria) com três chaves —
// enviar chat, receber chat e enviar anexos. Grava em config/chat (services/chat.ts); vale no app
// (ChatContext), nas regras do Firestore/Storage e no servidor (/api/chat/notificar).
import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { Interruptor } from '../administracao/Interruptor';
import { observarConfigChat, salvarConfigChat } from '../../services/chat';
import { registrarAcaoSensivel } from '../../services/auditoriaAcoes';
import { CHAVES_CHAT, PERFIS_CHAT, matrizCompleta, type ChavePermissaoChat, type PerfilChat, type PermissaoChat } from '../../utils/chat';

type Matriz = Record<PerfilChat, PermissaoChat>;

export const PermissoesChat: React.FC = () => {
  const [salvo, setSalvo] = useState<Matriz | null>(null);
  const [rascunho, setRascunho] = useState<Matriz | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => observarConfigChat(m => {
    const c = matrizCompleta(m);
    setSalvo(c);
    setRascunho(r => r ?? c);
  }), []);

  const difs = useMemo(() => {
    if (!salvo || !rascunho) return [];
    const r: string[] = [];
    PERFIS_CHAT.forEach(p => CHAVES_CHAT.forEach(k => {
      if (salvo[p.id][k.id] !== rascunho[p.id][k.id]) r.push(`${p.rotulo} · Chat › ${k.rotulo}: ${rascunho[p.id][k.id] ? 'ligado' : 'desligado'}`);
    }));
    return r;
  }, [salvo, rascunho]);

  if (!rascunho) return <p className="text-sm text-ink-3" role="status">Carregando…</p>;

  const alternar = (perfil: PerfilChat, chave: ChavePermissaoChat, v: boolean) =>
    setRascunho(r => {
      const p = { ...r![perfil], [chave]: v };
      if (chave === 'enviar' && !v) p.anexos = false; // sem enviar não há anexo
      return { ...r!, [perfil]: p };
    });

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarConfigChat(rascunho);
      void registrarAcaoSensivel('config.alterar', 'chat', difs);
      setSalvo(rascunho);
      setToast({ msg: 'Permissões do chat salvas. Valem na hora.', tone: 'success' });
    } catch {
      setToast({ msg: 'Não foi possível salvar. Tente de novo.', tone: 'error' });
    } finally {
      setSalvando(false);
      window.setTimeout(() => setToast(null), 4500);
    }
  };

  return (
    <div className="space-y-4">
      <Card as="section" title="Chat entre usuários" padding="none">
        <p className="px-4 pt-3 text-sm text-ink-3">
          Quem não pode enviar nem receber não vê o Chat; quem não recebe não aparece como destinatário; sem "enviar anexos", o botão de anexo some.
          As regras do Firestore e do Storage e o servidor aplicam a mesma matriz.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <caption className="sr-only">Permissões do chat por perfil</caption>
            <thead>
              <tr className="border-b border-line bg-thead">
                <th scope="col" className="text-left font-bold text-navy px-4 py-2">Perfil</th>
                {CHAVES_CHAT.map(k => <th key={k.id} scope="col" className="font-bold text-navy px-4 py-2 text-center whitespace-nowrap">{k.rotulo}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PERFIS_CHAT.map(p => (
                <tr key={p.id}>
                  <th scope="row" className="text-left font-semibold text-ink px-4 py-2 whitespace-nowrap">{p.rotulo}</th>
                  {CHAVES_CHAT.map(k => {
                    const travado = k.id === 'anexos' && !rascunho[p.id].enviar;
                    return (
                      <td key={k.id} className="px-4 py-1 text-center">
                        <span className="inline-flex items-center justify-center min-w-[44px] min-h-[44px]">
                          <Interruptor
                            ligado={rascunho[p.id][k.id]}
                            onAlternar={v => alternar(p.id, k.id, v)}
                            rotulo={`${p.rotulo}: ${k.rotulo}`}
                            disabled={travado}
                            dica={travado ? 'Ligue "Enviar chat" primeiro' : undefined}
                          />
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex items-center justify-end gap-2">
        {difs.length > 0 && <span className="text-sm text-ink-3 mr-auto">{difs.length} alteração(ões) não salva(s)</span>}
        <Button variant="secondary" disabled={!difs.length || salvando} onClick={() => setRascunho(salvo)}>Descartar</Button>
        <Button disabled={!difs.length || salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
      </div>
      {toast && <Toast message={toast.msg} tone={toast.tone} />}
    </div>
  );
};
