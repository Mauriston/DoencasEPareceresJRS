// Ficheiro: components/militares/MilitarDetalhe.tsx
// Prévia do cadastro do inspecionado em barra lateral (bottom sheet no mobile), com "Abrir ficha":
// o histórico (IS, pareceres, perícias) mora na Ficha do inspecionado (/inspecionados/:nip — auditoria v3, seção 9).
import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Button, ButtonLink } from '../ui/Button';
import { fichaPath } from '../../config/routes';
import { StatusTag } from '../ui/StatusTag';
import { formatNip, formatCelular, formatCpf, formatIdentidadeMilitar, formatDataBr, idadeEmAnos } from '../../utils/format';
import { tipoDoInspecionado, type MilitarRecord } from '../../services/firestoreMilitares';

const Linha: React.FC<{ rotulo: string; valor?: string | null; mono?: boolean }> = ({ rotulo, valor, mono }) => {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
      <dd className={`text-sm text-ink break-words ${mono ? 'tabular-nums' : ''}`}>{valor}</dd>
    </div>
  );
};

export const MilitarDetalhe: React.FC<{ militar: MilitarRecord; onClose: () => void }> = ({ militar: m, onClose }) => {

  // Data de nascimento e idade só aparecem quando a data está cadastrada (Linha some com valor vazio).
  const idade = idadeEmAnos(m.dataNascimento);
  const extras = [m.nomeGuerra, m.especialidade, m.emailPessoal, m.celular, m.cpf, m.identidadeMilitar, m.crm, m.rqe].some(Boolean);
  return (
    <Drawer
      title={tipoDoInspecionado(m) === 'dependente' ? 'Detalhes do dependente' : tipoDoInspecionado(m) === 'pensionista' ? 'Detalhes do pensionista' : 'Detalhes do militar'}
      icon="badge"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Fechar</Button><ButtonLink to={fichaPath(m.id)} icon="id_card">Abrir ficha</ButtonLink></>}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 shrink-0 rounded-full bg-thead border border-line overflow-hidden flex items-center justify-center">
            {m.fotoUrl ? <img src={m.fotoUrl} alt={`Foto de ${m.nome}`} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[40px] text-ink-4" aria-hidden="true">person</span>}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-navy break-words">{m.nome}</p>
            <p className="text-sm text-ink">{m.pgq}</p>
            <div className="mt-1"><StatusTag tone={m.ativo ? 'success' : 'muted'}>{m.ativo ? 'Ativo' : 'Inativo'}</StatusTag></div>
          </div>
        </div>

        <dl className="space-y-3">
          <Linha rotulo="Inspecionado" valor={m.inspecionado} />
          <Linha rotulo="NIP" valor={formatNip(m.nip)} mono />
          <Linha rotulo="Tipo" valor={tipoDoInspecionado(m) === 'dependente' ? 'Dependente' : tipoDoInspecionado(m) === 'pensionista' ? 'Pensionista' : undefined} />
          <Linha rotulo="Titular" valor={m.titularNome ? `${m.titularPosto ?? ''} ${m.titularNome}`.trim() : undefined} />
          <Linha rotulo="OM" valor={m.om} />
          {tipoDoInspecionado(m) === 'militar' && <Linha rotulo="Vínculo" valor={m.temporario ? 'Temporário' : (m.rm1 || m.refo) ? 'Inativo' : 'Carreira'} />}
          <Linha rotulo="Data de nascimento" valor={formatDataBr(m.dataNascimento)} />
          <Linha rotulo="Idade" valor={idade !== null ? `${idade} ano${idade !== 1 ? 's' : ''}` : undefined} />
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
              <Linha rotulo="CPF" valor={formatCpf(m.cpf)} mono />
              <Linha rotulo="Identidade militar" valor={formatIdentidadeMilitar(m.identidadeMilitar)} mono />
            </dl>
          </div>
        )}

      </div>
    </Drawer>
  );
};
