// Ficheiro: components/UsuariosManagement.tsx
// Administração › Usuários (auditoria v3, 8b — U1/U3/U4/U5/U6). Chips com contagem (Ativos · Inativos · Sem
// acesso há 30 dias) no lugar dos 4 KPIs, perfil e busca; tabela com Usuário · Perfil · Último acesso ·
// Situação e ações no ⋮; detalhe ao lado (abas Dados · Acesso · Atividade — components/usuarios/DetalheUsuario).
// Ativar/desativar só pelo detalhe, com confirmação e impacto. Formulário no Drawer padrão
// (components/usuarios/FormUsuario). A matriz de permissões foi para "Perfis e permissões" e a conta Google do
// servidor para "Integrações". Cada criação, edição, mudança de perfil, ativação, exclusão e redefinição de
// senha grava em auditoria_acoes (alvo = uid; sem nome/NIP/e-mail). A lista de usuários vem da página
// Administração (components/administracao/Administracao.tsx), que a compartilha com as outras subpáginas.
// Filtro por URL: ?situacao=ativos|inativos|sem-acesso-30 e ?perfil=<id> (ex.: o "Sem acesso há 30 dias" do Painel).
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ConfirmDialog } from './ui/Dialog';
import { Drawer } from './ui/Drawer';
import { EmptyState } from './ui/EmptyState';
import { FabAcoes } from './ui/Fab';
import { SearchField, controlClass } from './ui/Field';
import { FilterChip } from './ui/FilterChip';
import { IconButton } from './ui/IconButton';
import { MenuAcoes } from './ui/MenuAcoes';
import { StatusTag } from './ui/StatusTag';
import { Toast } from './ui/Toast';
import { NoCorpo } from './administracao/NoCorpo';
import { DetalheUsuario, ultimoAcessoDe, useImpactoPerito } from './usuarios/DetalheUsuario';
import { FormUsuario, type DadosFormUsuario } from './usuarios/FormUsuario';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { resetarSenhaUsuario, excluirUsuario } from '../services/loginNip';
import { SENHA_INICIAL_PADRAO } from '../config/senha';
import { ROLES } from '../config/permissions';
import { formatNip } from '../utils/format';
import { updateUsuarioProfile, setUsuarioPublico, type UsuarioRecord } from '../services/firestoreUsuarios';
import { criarContaEUsuario, mapAuthErrorMessage } from '../services/firebaseAuth';
import { registrarAcaoSensivel } from '../services/auditoriaAcoes';
import { PERFIS_PERITO, ehPerfilMedico, plural, rotuloPerfil, semAcessoHa, ultimoAcessoRelativo } from '../utils/administracao';

export type UserRecord = UsuarioRecord;

type Situacao = 'ativos' | 'inativos' | 'sem-acesso-30' | '';
const SITUACOES: Situacao[] = ['ativos', 'inativos', 'sem-acesso-30'];
const PERFIS = ['admin', ...ROLES.map(r => r.id)];

const ROTULO_CAMPO: Record<string, string> = {
  postoGraduacao: 'Posto/graduação', cargo: 'Cargo', nome: 'Nome', nip: 'NIP', crmPe: 'CRM-PE', rqe: 'RQE', especialidade: 'Especialidade',
  email: 'E-mail institucional', gmail: 'Gmail', celular: 'Celular', dataNascimento: 'Data de nascimento',
};

const Avatar: React.FC<{ u: UsuarioRecord }> = ({ u }) => (u.imageProfile
  ? <img src={u.imageProfile} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
  : <span aria-hidden="true" className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">{u.usuario.charAt(0)}</span>);

interface Props {
  usuarios: UsuarioRecord[];
  setUsuarios: React.Dispatch<React.SetStateAction<UsuarioRecord[]>>;
  carregando: boolean;
  erroCarga: boolean;
  recarregar: () => void;
}

export const UsuariosManagement: React.FC<Props> = ({ usuarios: users, setUsuarios: setUsers, carregando: loading, erroCarga: loadError, recarregar }) => {
  const isDesktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const situacao = (SITUACOES.includes(params.get('situacao') as Situacao) ? params.get('situacao') : '') as Situacao;
  const perfilFiltro = PERFIS.includes(params.get('perfil') || '') ? params.get('perfil')! : '';
  const setFiltro = (chave: 'situacao' | 'perfil', valor: string) => setParams(p => {
    const n = new URLSearchParams(p);
    if (valor) n.set(chave, valor); else n.delete(chave);
    return n;
  }, { replace: true });
  const [busca, setBusca] = useState('');
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [form, setForm] = useState<{ editando: UsuarioRecord | null } | null>(null);
  const [resetAlvo, setResetAlvo] = useState<UsuarioRecord | null>(null);
  const [excluirAlvo, setExcluirAlvo] = useState<UsuarioRecord | null>(null);
  const [ativacaoAlvo, setAtivacaoAlvo] = useState<UsuarioRecord | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const selecionado = users.find(u => u.id === selecionadoId) || null;
  const impacto = useImpactoPerito(selecionado);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  const contagem = useMemo(() => ({
    ativos: users.filter(u => u.ativo).length,
    inativos: users.filter(u => !u.ativo).length,
    semAcesso: users.filter(u => u.ativo && semAcessoHa(ultimoAcessoDe(u), 30)).length,
  }), [users]);

  const filtrados = users.filter(u => {
    const q = busca.trim().toLowerCase();
    const qNip = q.replace(/\D/g, '');
    const okBusca = !q || u.usuario.toLowerCase().includes(q) || (u.nome || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q) || (qNip.length >= 2 && (u.nip || '').replace(/\D/g, '').includes(qNip));
    const okSit = situacao === 'ativos' ? u.ativo : situacao === 'inativos' ? !u.ativo : situacao === 'sem-acesso-30' ? u.ativo && semAcessoHa(ultimoAcessoDe(u), 30) : true;
    return okBusca && okSit && (!perfilFiltro || u.perfil === perfilFiltro);
  }).sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.usuario.localeCompare(b.usuario, 'pt-BR'));

  // ------------------------------------------------------------ ações

  const confirmarAtivacao = async () => {
    if (!ativacaoAlvo) return;
    const user = ativacaoAlvo;
    const novo = !user.ativo;
    setOcupado(true);
    setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, ativo: novo } : u)));
    try {
      await updateUsuarioProfile(user.id, { ativo: novo });
      await setUsuarioPublico(user.id, { usuario: user.usuario, ativo: novo });
      void registrarAcaoSensivel('usuario.ativacao', user.id, [novo ? 'Ativado' : 'Desativado']);
      avisar(`Usuário "${user.usuario}" ${novo ? 'ativado' : 'desativado'}.`);
    } catch {
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, ativo: !novo } : u)));
      avisar('Não foi possível atualizar a situação do usuário.', 'error');
    } finally {
      setOcupado(false);
      setAtivacaoAlvo(null);
    }
  };

  const confirmarReset = async () => {
    if (!resetAlvo) return;
    const alvo = resetAlvo;
    setOcupado(true);
    try {
      await resetarSenhaUsuario(alvo.id);
      setUsers(prev => prev.map(u => (u.id === alvo.id ? { ...u, senhaTemporaria: true } : u)));
      void registrarAcaoSensivel('usuario.senha', alvo.id, ['Senha redefinida para a inicial']);
      avisar(`Senha de "${alvo.usuario}" redefinida para a inicial (${SENHA_INICIAL_PADRAO}).`);
    } catch (err: any) {
      avisar(err?.message || 'Não foi possível redefinir a senha.', 'error');
    } finally {
      setOcupado(false);
      setResetAlvo(null);
    }
  };

  const confirmarExcluir = async () => {
    if (!excluirAlvo) return;
    const alvo = excluirAlvo;
    setOcupado(true);
    try {
      await excluirUsuario(alvo.id);
      setUsers(prev => prev.filter(u => u.id !== alvo.id));
      void registrarAcaoSensivel('usuario.excluir', alvo.id, [`Perfil: ${rotuloPerfil(alvo.perfil)}`]);
      if (selecionadoId === alvo.id) setSelecionadoId(null);
      avisar(`Usuário "${alvo.usuario}" excluído definitivamente.`);
    } catch (err: any) {
      avisar(err?.message || 'Não foi possível excluir o usuário.', 'error');
    } finally {
      setOcupado(false);
      setExcluirAlvo(null);
    }
  };

  /** Cria ou edita; devolve a mensagem de erro (fica no formulário) ou null. */
  const salvarForm = async (f: DadosFormUsuario): Promise<string | null> => {
    const editando = form?.editando ?? null;
    const medico = ehPerfilMedico(f.perfil);
    const base = {
      postoGraduacao: f.postoGraduacao.trim(),
      cargo: f.cargo.trim(),
      nome: f.nome.trim().toUpperCase(),
      nip: f.nip.trim(),
      // CRM/RQE só para perfis médicos; mudar para um perfil não médico mantém o que já estava gravado.
      crmPe: medico ? f.crmPe.trim() : (editando?.crmPe || ''),
      rqe: medico ? f.rqe.trim() : (editando?.rqe || ''),
      especialidade: medico ? f.especialidade.trim() : (editando?.especialidade || ''),
      email: f.email.trim().toLowerCase(),
      gmail: f.gmail.trim().toLowerCase(),
      celular: f.celular.trim(),
      dataNascimento: f.dataNascimento,
      perfil: f.perfil || 'user_secretaria',
    };
    if (editando) {
      // "usuario" (login) nunca é editável: é a identidade do Firebase Auth (e-mail sintético).
      try {
        await updateUsuarioProfile(editando.id, { ...base, ativo: editando.ativo });
        const mudou = (Object.keys(ROTULO_CAMPO) as (keyof typeof base)[]).filter(k => String(editando[k] ?? '') !== String(base[k] ?? ''));
        if (editando.perfil !== base.perfil) void registrarAcaoSensivel('usuario.perfil', editando.id, [`Perfil: ${rotuloPerfil(editando.perfil)} → ${rotuloPerfil(base.perfil)}`]);
        if (mudou.length) void registrarAcaoSensivel('usuario.editar', editando.id, [`Alterado: ${mudou.map(k => ROTULO_CAMPO[k]).join(', ')}`]);
        setUsers(prev => prev.map(u => (u.id === editando.id ? { ...u, ...base } : u)));
        avisar(`Dados de "${editando.usuario}" atualizados.`);
        setForm(null);
        return null;
      } catch (err: any) {
        return err?.message || 'Não foi possível salvar as alterações.';
      }
    }
    const login = f.usuario.trim().toUpperCase();
    if (users.some(u => u.usuario.toUpperCase() === login)) return 'Já existe um usuário com esse login.';
    try {
      const perfilData = { ...base, ativo: true, imageProfile: '', senhaTemporaria: true };
      const uid = await criarContaEUsuario(login, SENHA_INICIAL_PADRAO, perfilData);
      setUsers(prev => [...prev, { id: uid, usuario: login, ...perfilData }]);
      void registrarAcaoSensivel('usuario.criar', uid, [`Perfil: ${rotuloPerfil(base.perfil)}`]);
      avisar(`Usuário "${login}" criado. Senha inicial: ${SENHA_INICIAL_PADRAO}.`);
      setForm(null);
      setSelecionadoId(uid);
      return null;
    } catch (err: any) {
      return mapAuthErrorMessage(err?.code, 'Erro ao criar usuário.');
    }
  };

  // ------------------------------------------------------------ render

  const itensMenu = (u: UsuarioRecord) => [
    { rotulo: 'Ver detalhes', icone: 'person', onClick: () => setSelecionadoId(u.id) },
    { rotulo: 'Editar', icone: 'edit', onClick: () => setForm({ editando: u }) },
    { rotulo: 'Redefinir senha', icone: 'lock_reset', onClick: () => setResetAlvo(u) },
    ...(!u.ativo ? [{ rotulo: 'Excluir', icone: 'delete', perigo: true, onClick: () => setExcluirAlvo(u) }] : []),
  ];

  const detalhe = selecionado && (
    <DetalheUsuario
      usuario={selecionado}
      usuarios={users}
      impacto={impacto}
      onEditar={() => setForm({ editando: selecionado })}
      onRedefinirSenha={() => setResetAlvo(selecionado)}
      onAlternarAtivo={() => setAtivacaoAlvo(selecionado)}
      onExcluir={() => setExcluirAlvo(selecionado)}
    />
  );

  const cabecalhoDetalhe = selecionado && (
    <div className="flex items-start gap-3 mb-3">
      <Avatar u={selecionado} />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-navy truncate">{selecionado.usuario}</p>
        <p className="text-xs text-ink-3 break-words">{[selecionado.nome, selecionado.cargo].filter(Boolean).join(' · ')}</p>
      </div>
      <IconButton icon="close" label="Fechar detalhe" variant="ghost" size="sm" onClick={() => setSelecionadoId(null)} />
    </div>
  );

  const tabela = (
    <Card padding="none">
      {loading ? (
        <p className="p-10 text-center text-sm text-ink-3">Carregando usuários…</p>
      ) : loadError ? (
        <EmptyState icon="error" title="Não foi possível carregar os usuários" action={<Button variant="secondary" icon="refresh" onClick={recarregar}>Tentar novamente</Button>} />
      ) : filtrados.length === 0 ? (
        <EmptyState icon="person_off" title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros." />
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Usuários</caption>
          <thead className="bg-thead text-xs font-semibold text-ink-3">
            <tr>
              <th scope="col" className="px-4 py-2.5">Usuário</th>
              <th scope="col" className="px-3 py-2.5 hidden @[34rem]:table-cell">Perfil</th>
              <th scope="col" className="px-3 py-2.5 hidden @[28rem]:table-cell">Último acesso</th>
              <th scope="col" className="px-3 py-2.5">Situação</th>
              <th scope="col" className="px-2 py-2.5"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtrados.map(u => {
              const ativo = u.id === selecionadoId;
              const acesso = ultimoAcessoDe(u);
              return (
                <tr key={u.id} className={`cursor-pointer transition-colors ${ativo ? 'bg-thead' : 'hover:bg-paper'}`} onClick={() => setSelecionadoId(u.id)}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar u={u} />
                      <div className="min-w-0">
                        <button type="button" className="block max-w-full text-left font-bold text-navy truncate hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-current={ativo ? 'true' : undefined} onClick={e => { e.stopPropagation(); setSelecionadoId(u.id); }} title={u.nome}>
                          {u.usuario}
                        </button>
                        <span className="block text-xs text-ink-3 truncate">{u.cargo || formatNip(u.nip)}<span className="@[34rem]:hidden"> · {rotuloPerfil(u.perfil)}</span></span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-ink hidden @[34rem]:table-cell whitespace-nowrap">{rotuloPerfil(u.perfil).replace(/^User /, '')}</td>
                  <td className="px-3 py-2.5 text-ink-3 hidden @[28rem]:table-cell whitespace-nowrap tabular-nums" title={acesso ? acesso.toLocaleString('pt-BR') : undefined}>{ultimoAcessoRelativo(acesso)}</td>
                  <td className="px-3 py-2.5">{u.ativo ? <span className="text-ink">Ativo</span> : <StatusTag tone="muted">Inativo</StatusTag>}</td>
                  <td className="px-2 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                    <MenuAcoes rotulo={`Ações de ${u.usuario}`} itens={itensMenu(u)} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );

  return (
    <div>
      <NoCorpo>
        <Toast message={toast?.msg ?? null} tone={toast?.tone} />
        <FabAcoes acoes={[{ id: 'adicionar', rotulo: 'Adicionar usuário', icone: 'person_add', onClick: () => setForm({ editando: null }) }]} />
      </NoCorpo>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterChip ativo={situacao === 'ativos'} onAlternar={() => setFiltro('situacao', situacao === 'ativos' ? '' : 'ativos')}>Ativos <span className="tabular-nums">{contagem.ativos}</span></FilterChip>
        <FilterChip ativo={situacao === 'inativos'} onAlternar={() => setFiltro('situacao', situacao === 'inativos' ? '' : 'inativos')}>Inativos <span className="tabular-nums">{contagem.inativos}</span></FilterChip>
        <FilterChip ativo={situacao === 'sem-acesso-30'} onAlternar={() => setFiltro('situacao', situacao === 'sem-acesso-30' ? '' : 'sem-acesso-30')} title="Ativos que não abrem o app há 30 dias ou mais">Sem acesso há 30 dias <span className="tabular-nums">{contagem.semAcesso}</span></FilterChip>
        <select aria-label="Perfil" value={perfilFiltro} onChange={e => setFiltro('perfil', e.target.value)} className={`${controlClass} w-auto`}>
          <option value="">Perfil: todos</option>
          {PERFIS.map(p => <option key={p} value={p}>{rotuloPerfil(p)}</option>)}
        </select>
        <SearchField value={busca} onChange={setBusca} label="Buscar usuário" placeholder="Nome, NIP ou e-mail" className="flex-1 min-w-[12rem]" />
        <span className="hidden md:inline-flex"><Button icon="person_add" onClick={() => setForm({ editando: null })}>Adicionar usuário</Button></span>
      </div>
      <p className="sr-only" aria-live="polite">{plural(filtrados.length, 'usuário', 'usuários')}</p>

      <div className="@container">
        <div className={`grid gap-4 items-start ${selecionado && isDesktop ? '@[52rem]:grid-cols-[minmax(0,1fr)_21rem]' : ''}`}>
          <div className={`min-w-0 @container ${selecionado && isDesktop ? 'order-2 @[52rem]:order-none' : ''}`}>{tabela}</div>
          {selecionado && isDesktop && (
            <Card as="section" aria-label={`Detalhe de ${selecionado.usuario}`} className="order-1 @[52rem]:order-none @[52rem]:sticky @[52rem]:top-4">
              {cabecalhoDetalhe}
              {detalhe}
            </Card>
          )}
        </div>
      </div>

      {selecionado && !isDesktop && !form && !ativacaoAlvo && !resetAlvo && !excluirAlvo && (
        <NoCorpo>
          <Drawer title={selecionado.usuario} icon="person" onClose={() => setSelecionadoId(null)}>
            <p className="text-xs text-ink-3 -mt-2 mb-3 break-words">{[selecionado.nome, selecionado.cargo].filter(Boolean).join(' · ')}</p>
            {detalhe}
          </Drawer>
        </NoCorpo>
      )}

      {form && (
        <NoCorpo>
          <FormUsuario editando={form.editando} onCancelar={() => setForm(null)} onSalvar={salvarForm} />
        </NoCorpo>
      )}

      {ativacaoAlvo && (
        <NoCorpo>
          <ConfirmDialog
            title={ativacaoAlvo.ativo ? 'Desativar usuário' : 'Ativar usuário'}
            destructive={ativacaoAlvo.ativo}
            confirmLabel={ocupado ? 'Aguarde…' : ativacaoAlvo.ativo ? 'Desativar' : 'Ativar'}
            message={ativacaoAlvo.ativo ? (
              <>
                <strong>{ativacaoAlvo.usuario}</strong> deixa de entrar no app a partir de agora.
                {PERFIS_PERITO.includes(ativacaoAlvo.perfil) && (
                  <> Como perito, {ativacaoAlvo.id === selecionadoId && impacto !== null
                    ? <>tem <strong>{plural(impacto, 'IS marcada', 'IS marcadas')}</strong> nos próximos 7 dias{impacto > 0 ? ', que precisarão ser reagendadas com outro perito' : ''}.</>
                    : 'pode ter IS marcadas: confira a agenda antes.'}</>
                )}
                {' '}O cadastro é mantido e pode ser reativado.
              </>
            ) : <><strong>{ativacaoAlvo.usuario}</strong> volta a entrar no app com o perfil {rotuloPerfil(ativacaoAlvo.perfil)}.</>}
            onConfirm={() => { if (!ocupado) void confirmarAtivacao(); }}
            onCancel={() => { if (!ocupado) setAtivacaoAlvo(null); }}
          />
        </NoCorpo>
      )}
      {excluirAlvo && (
        <NoCorpo>
          <ConfirmDialog
            title="Excluir usuário"
            destructive
            confirmLabel={ocupado ? 'Aguarde…' : 'Excluir'}
            message={<>Excluir definitivamente o usuário inativo <strong>{excluirAlvo.usuario}</strong> ({excluirAlvo.nome})? A conta de acesso e o cadastro são apagados, e isso não pode ser desfeito. O histórico das IS e documentos dele continua.</>}
            onConfirm={() => { if (!ocupado) void confirmarExcluir(); }}
            onCancel={() => { if (!ocupado) setExcluirAlvo(null); }}
          />
        </NoCorpo>
      )}
      {resetAlvo && (
        <NoCorpo>
          <ConfirmDialog
            title="Redefinir senha"
            confirmLabel={ocupado ? 'Aguarde…' : 'Redefinir senha'}
            message={<>Redefinir a senha de <strong>{resetAlvo.usuario}</strong> para a senha inicial (<strong>{SENHA_INICIAL_PADRAO}</strong>)? Ele será orientado a trocá-la no próximo acesso.</>}
            onConfirm={() => { if (!ocupado) void confirmarReset(); }}
            onCancel={() => { if (!ocupado) setResetAlvo(null); }}
          />
        </NoCorpo>
      )}
    </div>
  );
};
