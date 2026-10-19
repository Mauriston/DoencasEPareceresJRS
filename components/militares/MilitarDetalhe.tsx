// Ficheiro: components/militares/MilitarDetalhe.tsx
// Ficha completa do militar em barra lateral à direita (bottom sheet no mobile).
import React, { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { StatusTag } from '../ui/StatusTag';
import { formatNip, formatCelular, formatCpf, formatIdentidadeMilitar, formatDataBr } from '../../utils/format';
import { tipoDoInspecionado, type MilitarRecord } from '../../services/firestoreMilitares';
import { observarPareceres, statusEfetivo, type ParecerRecord } from '../../services/firestorePareceres';
import { observarPericiasDoMilitar, dataBR, statusPericia, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';

const TOM_PARECER = { solicitado: 'navyOutline', atrasado: 'danger', concluido: 'success' } as const;
const ROTULO_PARECER = { solicitado: 'Solicitado', atrasado: 'Atrasado', concluido: 'Concluído' } as const;

const ItemHistorico: React.FC<{ titulo: string; detalhe: string; data: string; tag: React.ReactNode; link?: string }> = ({ titulo, detalhe, data, tag, link }) => {
  const corpo = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-navy break-words">{titulo}</span>
        <span className="block text-xs text-ink-3 break-words">{detalhe}</span>
        <span className="block text-xs text-ink-3">{data}</span>
      </span>
      <span className="shrink-0 flex items-center gap-2">{tag}{link && <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">open_in_new</span>}</span>
    </>
  );
  return link
    ? <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 px-3 py-2 rounded-lg border border-line hover:border-navy transition-colors">{corpo}</a>
    : <div className="flex items-start gap-3 px-3 py-2 rounded-lg border border-line">{corpo}</div>;
};

const Linha: React.FC<{ rotulo: string; valor?: string | null; mono?: boolean }> = ({ rotulo, valor, mono }) => {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
      <dd className={`text-sm text-ink break-words ${mono ? 'font-mono' : ''}`}>{valor}</dd>
    </div>
  );
};

export const MilitarDetalhe: React.FC<{ militar: MilitarRecord; onClose: () => void }> = ({ militar: m, onClose }) => {
  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  const [pericias, setPericias] = useState<PericiaMenorRecord[]>([]);
  useEffect(() => observarPareceres(lista => setPareceres(lista.filter(p => p.militarId === m.id)), () => { /* sem histórico de pareceres */ }), [m.id]);
  useEffect(() => observarPericiasDoMilitar(m.id, setPericias, () => { /* sem histórico de perícias */ }), [m.id]);
  const temHistorico = pareceres.length > 0 || pericias.length > 0;
  const agora = useMemo(() => Date.now(), []);

  const extras = [m.nomeGuerra, m.especialidade, m.emailPessoal, m.celular, m.dataNascimento, m.cpf, m.identidadeMilitar, m.crm, m.rqe].some(Boolean);
  return (
    <Drawer
      title={tipoDoInspecionado(m) === 'dependente' ? 'Detalhes do dependente' : tipoDoInspecionado(m) === 'pensionista' ? 'Detalhes do pensionista' : 'Detalhes do militar'}
      icon="badge"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
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
          <Linha rotulo="Tipo" valor={tipoDoInspecionado(m) === 'dependente' ? 'Dependente' : tipoDoInspecionado(m) === 'pensionista' ? 'Pensionista' : undefined} />
          <Linha rotulo="Titular" valor={m.titularNome ? `${m.titularPosto ?? ''} ${m.titularNome}`.trim() : undefined} />
          <Linha rotulo="OM" valor={m.om} />
          {tipoDoInspecionado(m) === 'militar' && <Linha rotulo="Vínculo" valor={m.temporario ? 'Temporário' : (m.rm1 || m.refo) ? 'Inativo' : 'Carreira'} />}
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

        {temHistorico && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-3 border-t border-line pt-4 mb-3">Histórico</h3>
            <div className="space-y-4">
              {pareceres.length > 0 && (
                <section aria-label="Pareceres solicitados">
                  <h4 className="text-h3 font-bold text-navy mb-2">Pareceres <span className="text-xs font-bold text-ink-3 bg-thead rounded-full px-2 py-0.5 align-middle">{pareceres.length}</span></h4>
                  <ul className="space-y-2">
                    {pareceres.map(p => {
                      const st = statusEfetivo(p, agora);
                      return (
                        <li key={p.id}>
                          <ItemHistorico
                            titulo={p.especialidade} detalhe={p.finalidade}
                            data={`Pedido em ${p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? 'agora'}`}
                            tag={<StatusTag tone={TOM_PARECER[st]}>{ROTULO_PARECER[st]}</StatusTag>}
                            link={p.pdfUrl || undefined}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
              {pericias.length > 0 && (
                <section aria-label="Perícias menores">
                  <h4 className="text-h3 font-bold text-navy mb-2">Perícias menores <span className="text-xs font-bold text-ink-3 bg-thead rounded-full px-2 py-0.5 align-middle">{pericias.length}</span></h4>
                  <ul className="space-y-2">
                    {pericias.map((p, i) => (
                      <li key={`${p.dataAtestado}-${i}`}>
                        <ItemHistorico
                          titulo={p.cid || 'Perícia menor'} detalhe={p.dispensas.join(', ') || 'Sem dispensas registradas'}
                          data={p.dataAtestado ? `Atestado em ${dataBR(p.dataAtestado)}` : ''}
                          tag={statusPericia(p) === 'vigente' ? <StatusTag tone="danger">Vigente</StatusTag> : <StatusTag tone="success">Concluída</StatusTag>}
                          link={p.pdfUrl || undefined}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
