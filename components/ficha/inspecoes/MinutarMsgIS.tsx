// Ficheiro: components/ficha/inspecoes/MinutarMsgIS.tsx
// "Minutar MSG" da IS concluída (barra da aba Inspeções de Saúde da Ficha do inspecionado):
//  1. dialog de escolha (radios): "Apenas ver a minuta" ou "Ver minuta e registrar mensagem tramitada" · Cancelar/Confirmar;
//  2. a minuta (utils/mensagensIS.ts → minuta de resultado da página Inspeções de Saúde, com PARA/INFO sugeridos pela
//     IA quando a tabela do Anexo M não decide sozinha) num modal SÓ LEITURA, em texto corrido (DE, PARA, INFO,
//     ASSUNTO, TEXTO), sem copiar: "OK" (só ver) ou Cancelar/"Registrar" — que grava a mensagem (services/mensagensIS.ts)
//     e devolve o id para a página abrir a aba Mensagens.
import React, { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { useNav } from '../../../context/NavContext';
import { camposMinutaMsgIS, faltaDestinatario, linhasMinuta, type CamposMsgIS } from '../../../utils/mensagensIS';
import { postoDoInspecionado, sugerirDestinatariosIA } from '../../../services/destinatariosIA';
import { registrarMensagemIS } from '../../../services/mensagensIS';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';

type Modo = 'ver' | 'registrar';

interface Props {
  is: InspecaoRecord;
  /** OM e vínculo do inspecionado (cadastro), para PARA/INFO e o assunto. */
  om?: string;
  vinculo?: string;
  onClose: () => void;
  onRegistrada: (mensagemId: string) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const MinutarMsgIS: React.FC<Props> = ({ is, om, vinculo, onClose, onRegistrada, onAviso }) => {
  const nav = useNav();
  const [modo, setModo] = useState<Modo>('ver');
  const [campos, setCampos] = useState<CamposMsgIS | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const preparar = async () => {
    setPreparando(true);
    let c = camposMinutaMsgIS(is, { om, vinculo });
    if (faltaDestinatario(c)) {
      try {
        const s = await sugerirDestinatariosIA({ finalidade: is.finalidade, grupoFinalidade: is.grupoFinalidade, vinculo, posto: postoDoInspecionado(is.inspecionado), laudo: is.laudo || '' });
        if (s) c = { ...c, para: s.para, info: s.info };
      } catch { /* fica o "[preencher]" da tabela */ }
    }
    setCampos(c);
    setPreparando(false);
  };

  const registrar = async () => {
    const quem = nav?.authUser;
    if (!campos || !quem) return;
    setRegistrando(true);
    try {
      const id = await registrarMensagemIS(is, campos, { uid: quem.uid, usuario: quem.usuario || quem.nome || '' });
      onAviso('Mensagem tramitada registrada.');
      onRegistrada(id);
    } catch (e: any) {
      onAviso(e?.message || 'Não foi possível registrar a mensagem.', 'error');
      setRegistrando(false);
    }
  };

  if (campos) {
    const pendente = faltaDestinatario(campos);
    return (
      <Dialog
        title={`Minuta MSG — IS ${is.is}`} icon="mail" size="lg" onClose={onClose} travado={registrando}
        footer={modo === 'ver' ? <Button onClick={onClose}>OK</Button> : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={registrando}>Cancelar</Button>
            <Button icon="send" onClick={() => { void registrar(); }} loading={registrando}>Registrar</Button>
          </>
        )}
      >
        {pendente && <p className="mb-3 text-xs font-semibold text-wine">PARA/INFO não definidos pela tabela do Anexo M: confira antes de tramitar.</p>}
        {/* Só leitura e sem cópia (a mensagem é copiada pela aba Mensagens, depois de registrada). */}
        <div className="space-y-3 select-none" onCopy={e => e.preventDefault()}>
          {linhasMinuta(campos).map(l => (
            <p key={l.rotulo} className="text-sm text-ink whitespace-pre-line break-words">
              <strong className="text-navy">{l.rotulo}:</strong>{l.rotulo === 'TEXTO' ? '\n' : ' '}{l.valor}
            </p>
          ))}
        </div>
      </Dialog>
    );
  }

  const opcoes: { valor: Modo; rotulo: string }[] = [
    { valor: 'ver', rotulo: 'Apenas ver a minuta' },
    { valor: 'registrar', rotulo: 'Ver minuta e registrar mensagem tramitada' },
  ];
  return (
    <Dialog
      title={`Minutar MSG — IS ${is.is}`} icon="mail" onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { void preparar(); }} loading={preparando}>Confirmar</Button>
        </>
      )}
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">O que fazer com a minuta</legend>
        {opcoes.map(o => (
          <label key={o.valor} className="flex items-center gap-3 min-h-[44px] rounded-lg border border-line px-3 cursor-pointer has-[:checked]:border-navy has-[:checked]:bg-thead">
            <input type="radio" name={`minuta-${is.id}`} value={o.valor} checked={modo === o.valor} onChange={() => setModo(o.valor)} className="accent-navy w-4 h-4" />
            <span className="text-sm text-ink">{o.rotulo}</span>
          </label>
        ))}
      </fieldset>
    </Dialog>
  );
};
