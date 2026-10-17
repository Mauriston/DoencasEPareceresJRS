// Ficheiro: components/militares/MilitarDetalhe.tsx
// Ficha completa do militar em barra lateral à direita (bottom sheet no mobile).
import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { StatusTag } from '../ui/StatusTag';
import { formatNip, formatCelular, formatCpf, formatIdentidadeMilitar, formatDataBr } from '../../utils/format';
import type { MilitarRecord } from '../../services/firestoreMilitares';

const Linha: React.FC<{ rotulo: string; valor?: string | null; mono?: boolean }> = ({ rotulo, valor, mono }) => {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
      <dd className={`text-sm text-ink break-words ${mono ? 'font-mono' : ''}`}>{valor}</dd>
    </div>
  );
};

export const MilitarDetalhe: React.FC<{ militar: MilitarRecord; onClose: () => void; onEditar: () => void }> = ({ militar: m, onClose, onEditar }) => {
  const extras = [m.nomeGuerra, m.especialidade, m.emailPessoal, m.celular, m.dataNascimento, m.cpf, m.identidadeMilitar, m.crm, m.rqe].some(Boolean);
  return (
    <Drawer
      title="Detalhes do militar"
      icon="badge"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button icon="edit" onClick={onEditar}>Editar</Button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 shrink-0 rounded-full bg-thead border border-line overflow-hidden flex items-center justify-center">
            {m.fotoUrl ? <img src={m.fotoUrl} alt={`Foto de ${m.nome}`} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[40px] text-ink-4" aria-hidden="true">person</span>}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-navy break-words">{m.nome}</p>
            <p className="text-sm text-ink-2">{m.pgq}</p>
            <div className="mt-1"><StatusTag tone={m.ativo ? 'success' : 'muted'}>{m.ativo ? 'Ativo' : 'Inativo'}</StatusTag></div>
          </div>
        </div>

        <dl className="space-y-3">
          <Linha rotulo="Inspecionado" valor={m.inspecionado} />
          <Linha rotulo="NIP" valor={formatNip(m.nip)} mono />
          <Linha rotulo="OM" valor={m.om} />
          <Linha rotulo="Vínculo" valor={m.temporario ? 'Temporário' : 'Carreira'} />
          <Linha rotulo="E-mail" valor={m.email} />
          <Linha rotulo="Serviço do HNRe" valor={m.servico_label} />
        </dl>

        {extras && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-3 border-t border-line pt-4 mb-3">Informações adicionais</h3>
            <dl className="space-y-3">
              <Linha rotulo="Nome de guerra" valor={m.nomeGuerra} />
              <Linha rotulo="Especialidade" valor={m.especialidade} />
              <Linha rotulo="RQE" valor={m.rqe} />
              <Linha rotulo="CRM-PE" valor={m.crm} />
              <Linha rotulo="E-mail pessoal" valor={m.emailPessoal} />
              <Linha rotulo="Celular" valor={formatCelular(m.celular)} />
              <Linha rotulo="Data de nascimento" valor={formatDataBr(m.dataNascimento)} />
              <Linha rotulo="CPF" valor={formatCpf(m.cpf)} mono />
              <Linha rotulo="Identidade militar" valor={formatIdentidadeMilitar(m.identidadeMilitar)} mono />
            </dl>
          </div>
        )}
      </div>
    </Drawer>
  );
};
