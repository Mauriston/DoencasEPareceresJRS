// Ficheiro: components/usuarios/DetalheUsuario.tsx
// Detalhe do usuário ao lado da tabela (Administração › Usuários — auditoria v3, U1/U5), com abas Dados ·
// Acesso · Atividade. Ativar/desativar só daqui, com confirmação e o impacto (IS marcadas com o perito nos
// próximos 7 dias). No celular o mesmo conteúdo abre num Drawer (decidido por UsuariosManagement).
import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { StatusTag } from '../ui/StatusTag';
import { listarAcoesPor, type RegistroAcao } from '../../services/auditoriaAcoes';
import { contarISAgendadasDoPerito } from '../../services/administracao';
import type { UsuarioRecord } from '../../services/firestoreUsuarios';
import { formatCelular, formatNip } from '../../utils/format';
import { PERFIL_DESCRICAO, PERFIS_PERITO, ehPerfilMedico, plural, rotuloPerfil, ultimoAcessoRelativo, dataHoraCurta } from '../../utils/administracao';
import { paginasDoPerfil } from './FormUsuario';
import { ListaRegistros } from '../administracao/RegistroAlteracoes';

export type AbaDetalhe = 'dados' | 'acesso' | 'atividade';
const ABAS: { id: AbaDetalhe; rotulo: string }[] = [
  { id: 'dados', rotulo: 'Dados' },
  { id: 'acesso', rotulo: 'Acesso' },
  { id: 'atividade', rotulo: 'Atividade' },
];

export const ultimoAcessoDe = (u: UsuarioRecord): Date | null => (u.ultimoAcesso && typeof u.ultimoAcesso.toDate === 'function' ? u.ultimoAcesso.toDate() : null);

/** IS do perito nos próximos 7 dias (null = não é perito ou ainda carregando). */
export const useImpactoPerito = (u: UsuarioRecord | null): number | null => {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    setN(null);
    if (!u || !PERFIS_PERITO.includes(u.perfil)) return;
    let vivo = true;
    contarISAgendadasDoPerito(u.id).then(x => { if (vivo) setN(x); }).catch(() => { /* sem impacto conhecido */ });
    return () => { vivo = false; };
  }, [u?.id, u?.perfil]);
  return n;
};

const Dado: React.FC<{ rotulo: string; children: React.ReactNode }> = ({ rotulo, children }) => (
  <div className="py-2">
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className="text-sm text-ink break-words">{children || '—'}</dd>
  </div>
);

interface Props {
  usuario: UsuarioRecord;
  usuarios: UsuarioRecord[];
  impacto: number | null;
  onEditar: () => void;
  onRedefinirSenha: () => void;
  onAlternarAtivo: () => void;
  onExcluir: () => void;
}

export const DetalheUsuario: React.FC<Props> = ({ usuario: u, usuarios, impacto, onEditar, onRedefinirSenha, onAlternarAtivo, onExcluir }) => {
  const [aba, setAba] = useState<AbaDetalhe>('dados');
  const [feitas, setFeitas] = useState<RegistroAcao[] | null>(null);
  const [recebidas, setRecebidas] = useState<RegistroAcao[] | null>(null);

  useEffect(() => { setAba('dados'); setFeitas(null); setRecebidas(null); }, [u.id]);
  useEffect(() => {
    if (aba !== 'atividade' || feitas) return;
    listarAcoesPor('uid', u.id, 30).then(setFeitas).catch(() => setFeitas([]));
    listarAcoesPor('alvo', u.id, 30).then(setRecebidas).catch(() => setRecebidas([]));
  }, [aba, u.id, feitas]);

  const acesso = ultimoAcessoDe(u);
  const paginas = paginasDoPerfil(u.perfil);
  const perito = PERFIS_PERITO.includes(u.perfil);

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="Detalhe do usuário" className="flex gap-4 border-b border-line mb-3">
        {ABAS.map(a => (
          <button
            key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}
            className={`-mb-px min-h-[40px] border-b-2 text-sm transition-colors ${aba === a.id ? 'border-gold text-navy font-bold' : 'border-transparent text-ink-3 font-semibold hover:text-navy'}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="min-h-[10rem]">
        {aba === 'dados' && (
          <dl className="divide-y divide-line">
            <Dado rotulo="Perfil">{rotuloPerfil(u.perfil)}</Dado>
            <Dado rotulo="Posto/graduação · cargo">{[u.postoGraduacao, u.cargo].filter(Boolean).join(' · ')}</Dado>
            <Dado rotulo="NIP"><span className="tabular-nums">{formatNip(u.nip)}</span></Dado>
            {ehPerfilMedico(u.perfil) && <Dado rotulo="CRM-PE · RQE"><span className="tabular-nums">{[u.crmPe || '—', u.rqe || '—'].join(' · ')}</span></Dado>}
            <Dado rotulo="E-mail institucional">{u.email}</Dado>
            <Dado rotulo="Gmail (agenda)">{u.gmail}</Dado>
            <Dado rotulo="Celular"><span className="tabular-nums">{formatCelular(u.celular)}</span></Dado>
            <Dado rotulo="Data de nascimento"><span className="tabular-nums">{u.dataNascimento ? u.dataNascimento.split('-').reverse().join('/') : '—'}</span></Dado>
          </dl>
        )}
        {aba === 'acesso' && (
          <dl className="divide-y divide-line">
            <Dado rotulo="Situação">{u.ativo ? 'Ativo' : 'Inativo — não consegue entrar no app'}</Dado>
            <Dado rotulo="Último acesso">{acesso ? `${ultimoAcessoRelativo(acesso)} (${dataHoraCurta(acesso)})` : 'Nunca acessou (ou antes do registro de acesso)'}</Dado>
            <Dado rotulo="Senha">{u.senhaTemporaria ? 'Ainda com a senha inicial' : 'Trocada pelo usuário'}</Dado>
            <Dado rotulo="Perfil">{PERFIL_DESCRICAO[u.perfil] || rotuloPerfil(u.perfil)}</Dado>
            <Dado rotulo={`Páginas que acessa (${paginas.length})`}>
              <span className="flex flex-wrap gap-1 mt-1">{paginas.map(p => <StatusTag key={p} tone="muted" dot={false}>{p}</StatusTag>)}</span>
            </Dado>
          </dl>
        )}
        {aba === 'atividade' && (
          <div className="space-y-4 @container">
            <p className="text-sm text-ink">Último acesso: <strong>{ultimoAcessoRelativo(acesso)}</strong></p>
            <div>
              <h4 className="text-xs font-semibold text-ink-3 mb-1">Alterações neste cadastro</h4>
              {recebidas === null ? <p className="text-sm text-ink-3">Carregando…</p>
                : recebidas.length ? <ListaRegistros registros={recebidas} usuarios={usuarios} compacta />
                : <p className="text-sm text-ink-3">Nenhuma registrada.</p>}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ink-3 mb-1">Ações registradas feitas por ele</h4>
              {feitas === null ? <p className="text-sm text-ink-3">Carregando…</p>
                : feitas.length ? <ListaRegistros registros={feitas} usuarios={usuarios} compacta />
                : <p className="text-sm text-ink-3">Nenhuma registrada.</p>}
            </div>
          </div>
        )}
      </div>

      {perito && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink">
          <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">event_available</span>
          <span>Perito · {impacto === null ? 'consultando IS…' : `${plural(impacto, 'IS marcada', 'IS marcadas')} nos próximos 7 dias`}</span>
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-line flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" icon="lock_reset" onClick={onRedefinirSenha}>Redefinir senha</Button>
        {!u.ativo && <Button size="sm" variant="destructive" icon="delete" onClick={onExcluir}>Excluir</Button>}
        <Button size="sm" variant={u.ativo ? 'destructive' : 'secondary'} icon={u.ativo ? 'block' : 'check_circle'} onClick={onAlternarAtivo}>{u.ativo ? 'Desativar' : 'Ativar'}</Button>
        <Button size="sm" variant="secondary" icon="edit" onClick={onEditar}>Editar</Button>
      </div>
    </div>
  );
};
