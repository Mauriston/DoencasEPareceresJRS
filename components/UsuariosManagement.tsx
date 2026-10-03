import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import {
  ROLES,
  PAGE_DEFS,
  FEATURE_DEFS,
  Role,
  FeatureKey,
  getPagePermissions,
  getFeaturePermissions,
  savePermissions,
} from '../config/permissions';
import { formatNip, formatCelular } from '../utils/format';
import { listUsuarios, updateUsuarioProfile, setUsuarioPublico, UsuarioRecord } from '../services/firestoreUsuarios';
import { criarContaEUsuario, mapAuthErrorMessage } from '../services/firebaseAuth';

export type UserRecord = UsuarioRecord;

const emptyUserForm = {
  usuario: '', postoGraduacao: '', cargo: '', nome: '', nip: '',
  crmPe: '', rqe: '', email: '', gmail: '', celular: '', perfil: 'user_secretaria',
};

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm font-semibold text-gray-800 focus:outline-none focus:border-[#050F41] transition-colors';
const labelClass = 'text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1';
const featureGroups = [...new Set(FEATURE_DEFS.map(f => f.group))];

export const UsuariosManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [perfilFilter, setPerfilFilter] = useState<string>('todos');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserRecord>>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New User Modal State
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState(emptyUserForm);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserError, setNewUserError] = useState('');

  // Permissions Matrix State
  const [pagePerms, setPagePerms] = useState(getPagePermissions());
  const [featurePerms, setFeaturePerms] = useState(getFeaturePermissions());
  const [permsDirty, setPermsDirty] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const records = await listUsuarios();
      setUsers(records);
    } catch (e) {
      console.error('Error loading users from Firestore:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleStatus = async (user: UserRecord) => {
    const updatedStatus = !user.ativo;
    setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, ativo: updatedStatus } : u)));
    try {
      await updateUsuarioProfile(user.id, { ativo: updatedStatus });
      await setUsuarioPublico(user.id, { usuario: user.usuario, ativo: updatedStatus });
      showToast(`Usuário "${user.usuario}" ${updatedStatus ? 'ativado' : 'desativado'} com sucesso.`);
    } catch {
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, ativo: !updatedStatus } : u)));
      showToast('Erro ao atualizar status do usuário.');
    }
  };

  const handleOpenEdit = (user: UserRecord) => {
    setEditingUser(user);
    setEditForm({ ...user, nip: formatNip(user.nip), celular: formatCelular(user.celular) });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editForm.nome) return;

    setSaving(true);
    try {
      // "usuario" (login) nunca é editável aqui: é a identidade do Firebase
      // Auth (e-mail sintético), imutável fora de um fluxo de recriação de conta.
      const updatedUser: UserRecord = {
        ...editingUser,
        postoGraduacao: (editForm.postoGraduacao || '').trim(),
        cargo: (editForm.cargo || '').trim(),
        nome: (editForm.nome || '').trim().toUpperCase(),
        nip: (editForm.nip || '').trim(),
        crmPe: (editForm.crmPe || '').trim(),
        rqe: (editForm.rqe || '').trim(),
        email: (editForm.email || '').trim().toLowerCase(),
        gmail: (editForm.gmail || '').trim().toLowerCase(),
        celular: (editForm.celular || '').trim(),
        perfil: editForm.perfil || 'user_secretaria',
        ativo: editForm.ativo !== undefined ? editForm.ativo : true,
      };

      await updateUsuarioProfile(editingUser.id, {
        postoGraduacao: updatedUser.postoGraduacao,
        cargo: updatedUser.cargo,
        nome: updatedUser.nome,
        nip: updatedUser.nip,
        crmPe: updatedUser.crmPe,
        rqe: updatedUser.rqe,
        email: updatedUser.email,
        gmail: updatedUser.gmail,
        celular: updatedUser.celular,
        perfil: updatedUser.perfil,
        ativo: updatedUser.ativo,
      });
      if (updatedUser.ativo !== editingUser.ativo) {
        await setUsuarioPublico(editingUser.id, { usuario: updatedUser.usuario, ativo: updatedUser.ativo });
      }

      setUsers(prev => prev.map(u => (u.id === editingUser.id ? updatedUser : u)));
      showToast(`Dados do usuário "${updatedUser.usuario}" atualizados com sucesso!`);
      setEditingUser(null);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenNewUser = () => {
    setNewUserForm(emptyUserForm);
    setNewUserError('');
    setShowNewUserModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError('');

    if (!newUserForm.usuario.trim() || !newUserForm.nome.trim()) {
      setNewUserError('Preencha o usuário (login) e o nome completo.');
      return;
    }
    if (!newUserForm.nip.trim()) {
      setNewUserError('Informe o NIP — ele será usado como senha inicial do usuário.');
      return;
    }

    const usuarioUpper = newUserForm.usuario.trim().toUpperCase();
    if (users.some(u => u.usuario.toUpperCase() === usuarioUpper)) {
      setNewUserError('Já existe um usuário com esse nome de login.');
      return;
    }

    setCreatingUser(true);
    try {
      const senhaInicial = newUserForm.nip.replace(/\D/g, '');
      const perfilData = {
        postoGraduacao: newUserForm.postoGraduacao.trim(),
        cargo: newUserForm.cargo.trim(),
        nome: newUserForm.nome.trim().toUpperCase(),
        nip: newUserForm.nip.trim(),
        crmPe: newUserForm.crmPe.trim(),
        rqe: newUserForm.rqe.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        gmail: newUserForm.gmail.trim().toLowerCase(),
        celular: newUserForm.celular.trim(),
        perfil: newUserForm.perfil,
        ativo: true,
        imageProfile: '',
        senhaTemporaria: true,
      };
      const uid = await criarContaEUsuario(usuarioUpper, senhaInicial, perfilData);

      const novoUsuario: UserRecord = { id: uid, usuario: usuarioUpper, ...perfilData };
      setUsers(prev => [...prev, novoUsuario]);
      showToast(`Usuário "${usuarioUpper}" criado com sucesso! Senha inicial: NIP (sem pontos).`);
      setShowNewUserModal(false);
    } catch (err: any) {
      setNewUserError(mapAuthErrorMessage(err?.code, 'Erro ao criar usuário.'));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleTogglePagePerm = (pageId: string, role: Role) => {
    setPagePerms(prev => ({ ...prev, [pageId]: { ...prev[pageId], [role]: !prev[pageId][role] } }));
    setPermsDirty(true);
  };

  const handleToggleFeaturePerm = (featureId: FeatureKey, role: Role) => {
    setFeaturePerms(prev => ({ ...prev, [featureId]: { ...prev[featureId], [role]: !prev[featureId][role] } }));
    setPermsDirty(true);
  };

  const handleSavePerms = () => {
    setSavingPerms(true);
    savePermissions(pagePerms, featurePerms);
    setPermsDirty(false);
    setSavingPerms(false);
    showToast('Permissões de páginas e funcionalidades atualizadas.');
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.usuario.toLowerCase().includes(search.toLowerCase()) ||
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.nip.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'todos' ? true : statusFilter === 'ativos' ? u.ativo : !u.ativo;
    const matchesPerfil = perfilFilter === 'todos' ? true : u.perfil === perfilFilter;

    return matchesSearch && matchesStatus && matchesPerfil;
  });

  const getPerfilBadge = (perfil: string) => {
    switch (perfil) {
      case 'admin':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">ADMIN</span>;
      case 'user_medicos':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">USER MÉDICOS</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">USER SECRETARIA</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header title="Gestão de Usuários" />

      {toastMessage && (
        <div className="fixed top-20 right-4 z-[100] bg-[#050F41] text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs border border-white/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px] text-[#079551]">check_circle</span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-[1600px] mx-auto w-full flex-1 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por usuário, nome, NIP ou e-mail..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-body rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#050F41] transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-[#050F41]">
              <option value="todos">Status: Todos</option>
              <option value="ativos">Status: Ativos</option>
              <option value="inativos">Status: Inativos</option>
            </select>

            <select value={perfilFilter} onChange={e => setPerfilFilter(e.target.value)} className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-[#050F41]">
              <option value="todos">Perfil: Todos</option>
              <option value="admin">Perfil: Admin</option>
              <option value="user_medicos">Perfil: User Médicos</option>
              <option value="user_secretaria">Perfil: User Secretaria</option>
            </select>

            <button
              type="button"
              onClick={handleOpenNewUser}
              className="px-4 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Adicionar Usuário</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold text-[#050F41] font-heading">{users.length}</p>
            </div>
            <span className="material-symbols-outlined text-[24px] text-gray-400 bg-gray-50 p-2 rounded-xl">group</span>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ativos</p>
              <p className="text-xl font-bold text-[#079551] font-heading">{users.filter(u => u.ativo).length}</p>
            </div>
            <span className="material-symbols-outlined text-[24px] text-[#079551] bg-green-50 p-2 rounded-xl">check_circle</span>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inativos</p>
              <p className="text-xl font-bold text-red-600 font-heading">{users.filter(u => !u.ativo).length}</p>
            </div>
            <span className="material-symbols-outlined text-[24px] text-red-500 bg-red-50 p-2 rounded-xl">block</span>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Admins</p>
              <p className="text-xl font-bold text-purple-700 font-heading">{users.filter(u => u.perfil === 'admin').length}</p>
            </div>
            <span className="material-symbols-outlined text-[24px] text-purple-600 bg-purple-50 p-2 rounded-xl">admin_panel_settings</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
              <p className="text-xs font-semibold">Carregando usuários...</p>
            </div>
          ) : loadError ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-red-400">error</span>
              <p className="text-sm font-bold text-gray-700">Não foi possível carregar os usuários</p>
              <button onClick={loadUsers} className="mt-2 px-4 py-2 bg-[#050F41] text-white rounded-xl text-xs font-bold">Tentar novamente</button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-gray-300">person_off</span>
              <p className="text-sm font-bold text-gray-700">Nenhum usuário encontrado</p>
              <p className="text-xs text-gray-400">Tente ajustar seus termos de pesquisa ou filtros.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Usuário</th>
                      <th className="py-3.5 px-4">Nome Completo</th>
                      <th className="py-3.5 px-4">Cargo</th>
                      <th className="py-3.5 px-4">NIP</th>
                      <th className="py-3.5 px-4">E-mail</th>
                      <th className="py-3.5 px-4">Perfil</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className={`hover:bg-gray-50/80 transition-colors ${!user.ativo ? 'opacity-60 bg-gray-50/40' : ''}`}>
                        <td className="py-3.5 px-4 font-bold text-[#050F41]">
                          <div className="flex items-center space-x-2">
                            {user.imageProfile ? (
                              <img src={user.imageProfile} alt={user.usuario} className="w-7 h-7 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#050F41] text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                                {user.usuario.charAt(0)}
                              </div>
                            )}
                            <span className="truncate max-w-[140px]">{user.usuario}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-800">{user.nome}</td>
                        <td className="py-3.5 px-4 text-gray-600">{user.cargo || '-'}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">{formatNip(user.nip) || '-'}</td>
                        <td className="py-3.5 px-4 text-gray-600 truncate max-w-[180px]">{user.email || '-'}</td>
                        <td className="py-3.5 px-4">{getPerfilBadge(user.perfil)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              user.ativo ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'
                            }`}
                            title={user.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${user.ativo ? 'bg-green-600' : 'bg-red-600'}`} />
                            <span>{user.ativo ? 'ATIVO' : 'INATIVO'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button type="button" onClick={() => handleOpenEdit(user)} className="p-1.5 text-gray-500 hover:text-[#050F41] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Editar dados do usuário">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${user.ativo ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                              title={user.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                            >
                              <span className="material-symbols-outlined text-[18px]">{user.ativo ? 'block' : 'check_circle'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden divide-y divide-gray-100">
                {filteredUsers.map(user => (
                  <div key={user.id} className={`p-4 flex flex-col space-y-2.5 ${!user.ativo ? 'bg-gray-50/50 opacity-70' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        {user.imageProfile ? (
                          <img src={user.imageProfile} alt={user.usuario} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#050F41] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {user.usuario.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#050F41] truncate">{user.usuario}</p>
                          <p className="text-[11px] text-gray-700 font-semibold truncate">{user.nome}</p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center space-x-1">{getPerfilBadge(user.perfil)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">NIP</span>
                        <span className="font-mono font-medium">{formatNip(user.nip) || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">E-mail</span>
                        <span className="truncate block font-medium">{user.email || '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                          user.ativo ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.ativo ? 'bg-green-600' : 'bg-red-600'}`} />
                        <span>{user.ativo ? 'ATIVO' : 'INATIVO'}</span>
                      </button>

                      <button type="button" onClick={() => handleOpenEdit(user)} className="px-3 py-1.5 bg-[#050F41] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* PERMISSÕES: PÁGINAS E FUNCIONALIDADES POR PERFIL */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-[20px] text-[#050F41]">tune</span>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#050F41]">Permissões por Perfil</h3>
                <p className="text-[11px] text-gray-500">Define quais páginas e funcionalidades cada perfil pode acessar. O perfil Admin sempre tem acesso total.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSavePerms}
              disabled={!permsDirty || savingPerms}
              className="px-4 py-2.5 bg-[#050F41] hover:bg-[#079551] disabled:opacity-40 disabled:hover:bg-[#050F41] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{savingPerms ? 'Salvando...' : 'Salvar Permissões'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-6">
            <div>
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Páginas do App</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Página</th>
                      {ROLES.map(role => (
                        <th key={role.id} className="py-2.5 px-3 text-center">{role.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {/* "Perícia Menor" não entra aqui: é controlada pelas duas
                        features (Novo/Histórico) na tabela de Funcionalidades
                        abaixo — ver canAccessPage em config/permissions.ts. */}
                    {PAGE_DEFS.filter(page => page.id !== 'pericia-menor').map(page => (
                      <tr key={page.id} className="hover:bg-gray-50/60">
                        <td className="py-2 px-3 font-semibold text-gray-800">{page.label}</td>
                        {ROLES.map(role => (
                          <td key={role.id} className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={pagePerms[page.id]?.[role.id] ?? true}
                              onChange={() => handleTogglePagePerm(page.id, role.id)}
                              className="w-4 h-4 accent-[#050F41] cursor-pointer"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {featureGroups.map(group => (
              <div key={group}>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Funcionalidades — {group}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Funcionalidade</th>
                        {ROLES.map(role => (
                          <th key={role.id} className="py-2.5 px-3 text-center">{role.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {FEATURE_DEFS.filter(feature => feature.group === group).map(feature => (
                        <tr key={feature.id} className="hover:bg-gray-50/60">
                          <td className="py-2 px-3 font-semibold text-gray-800">{feature.label}</td>
                          {ROLES.map(role => (
                            <td key={role.id} className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={featurePerms[feature.id]?.[role.id] ?? false}
                                onChange={() => handleToggleFeaturePerm(feature.id, role.id)}
                                className="w-4 h-4 accent-[#050F41] cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NOVO USUÁRIO MODAL */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-[#079551]">person_add</span>
                <h3 className="font-heading font-bold text-sm uppercase">Adicionar Usuário</h3>
              </div>
              <button onClick={() => setShowNewUserModal(false)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 overflow-y-auto space-y-4 flex-1">
              {newUserError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs md:text-sm font-semibold text-red-700">{newUserError}</div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] md:text-sm font-semibold text-blue-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">info</span>
                <span>A senha inicial do usuário será o NIP (somente números). Ele será orientado a alterá-la no primeiro acesso.</span>
              </div>

              <div>
                <label className={labelClass}>Nome de Usuário (Login)</label>
                <input type="text" required value={newUserForm.usuario} onChange={e => setNewUserForm(prev => ({ ...prev, usuario: e.target.value.toUpperCase() }))} className={inputClass} placeholder="EX.: CT MAURISTON" />
              </div>

              <div>
                <label className={labelClass}>Nome Completo</label>
                <input type="text" required value={newUserForm.nome} onChange={e => setNewUserForm(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))} className={inputClass} placeholder="NOME COMPLETO" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Posto/Graduação</label>
                  <input type="text" value={newUserForm.postoGraduacao} onChange={e => setNewUserForm(prev => ({ ...prev, postoGraduacao: e.target.value }))} className={inputClass} placeholder="Ex.: Capitão-Tenente (Md)" />
                </div>
                <div>
                  <label className={labelClass}>Cargo</label>
                  <input type="text" value={newUserForm.cargo} onChange={e => setNewUserForm(prev => ({ ...prev, cargo: e.target.value }))} className={inputClass} placeholder="Ex.: Membro" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>NIP</label>
                  <input type="text" required value={newUserForm.nip} onChange={e => setNewUserForm(prev => ({ ...prev, nip: formatNip(e.target.value) }))} className={`${inputClass} font-mono`} placeholder="00.0000.00" maxLength={10} />
                </div>
                <div>
                  <label className={labelClass}>Perfil de Acesso</label>
                  <select value={newUserForm.perfil} onChange={e => setNewUserForm(prev => ({ ...prev, perfil: e.target.value }))} className={inputClass}>
                    <option value="admin">Administrador (admin)</option>
                    <option value="user_medicos">Usuário Médicos (user_medicos)</option>
                    <option value="user_secretaria">Usuário Secretaria (user_secretaria)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CRM-PE</label>
                  <input type="text" value={newUserForm.crmPe} onChange={e => setNewUserForm(prev => ({ ...prev, crmPe: e.target.value }))} className={inputClass} placeholder="Opcional" />
                </div>
                <div>
                  <label className={labelClass}>RQE</label>
                  <input type="text" value={newUserForm.rqe} onChange={e => setNewUserForm(prev => ({ ...prev, rqe: e.target.value }))} className={inputClass} placeholder="Opcional" />
                </div>
              </div>

              <div>
                <label className={labelClass}>E-mail Institucional</label>
                <input type="email" value={newUserForm.email} onChange={e => setNewUserForm(prev => ({ ...prev, email: e.target.value }))} className={inputClass} placeholder="exemplo@marinha.mil.br" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>E-mail Google (Gmail)</label>
                  <input type="email" value={newUserForm.gmail} onChange={e => setNewUserForm(prev => ({ ...prev, gmail: e.target.value }))} className={inputClass} placeholder="exemplo@gmail.com" />
                </div>
                <div>
                  <label className={labelClass}>Celular</label>
                  <input type="text" value={newUserForm.celular} onChange={e => setNewUserForm(prev => ({ ...prev, celular: formatCelular(e.target.value) }))} className={inputClass} placeholder="(00) 00000-0000" maxLength={15} />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setShowNewUserModal(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creatingUser} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm flex items-center space-x-1">
                  {creatingUser ? <span>Criando...</span> : (<><span className="material-symbols-outlined text-[16px]">save</span><span>Criar Usuário</span></>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-[#079551]">manage_accounts</span>
                <h3 className="font-heading font-bold text-sm uppercase">Editar Dados do Usuário</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className={labelClass}>Nome de Usuário (Login)</label>
                <input type="text" disabled value={editForm.usuario || ''} className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`} />
                <p className="text-[10px] md:text-xs text-gray-400 mt-1">Não pode ser alterado após a criação (é a identidade de login).</p>
              </div>

              <div>
                <label className={labelClass}>Nome Completo</label>
                <input type="text" required value={editForm.nome || ''} onChange={e => setEditForm(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Posto/Graduação</label>
                  <input type="text" value={editForm.postoGraduacao || ''} onChange={e => setEditForm(prev => ({ ...prev, postoGraduacao: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cargo</label>
                  <input type="text" value={editForm.cargo || ''} onChange={e => setEditForm(prev => ({ ...prev, cargo: e.target.value }))} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>NIP</label>
                  <input type="text" value={editForm.nip || ''} onChange={e => setEditForm(prev => ({ ...prev, nip: formatNip(e.target.value) }))} className={`${inputClass} font-mono`} maxLength={10} />
                </div>
                <div>
                  <label className={labelClass}>Perfil de Acesso</label>
                  <select value={editForm.perfil || 'user_secretaria'} onChange={e => setEditForm(prev => ({ ...prev, perfil: e.target.value }))} className={inputClass}>
                    <option value="admin">Administrador (admin)</option>
                    <option value="user_medicos">Usuário Médicos (user_medicos)</option>
                    <option value="user_secretaria">Usuário Secretaria (user_secretaria)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CRM-PE</label>
                  <input type="text" value={editForm.crmPe || ''} onChange={e => setEditForm(prev => ({ ...prev, crmPe: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>RQE</label>
                  <input type="text" value={editForm.rqe || ''} onChange={e => setEditForm(prev => ({ ...prev, rqe: e.target.value }))} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>E-mail Institucional</label>
                <input type="email" value={editForm.email || ''} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>E-mail Google (Gmail)</label>
                  <input type="email" value={editForm.gmail || ''} onChange={e => setEditForm(prev => ({ ...prev, gmail: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Celular</label>
                  <input type="text" value={editForm.celular || ''} onChange={e => setEditForm(prev => ({ ...prev, celular: formatCelular(e.target.value) }))} className={inputClass} maxLength={15} />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-bold text-[#050F41]">Status da Conta</p>
                  <p className="text-[11px] md:text-sm text-gray-500">{editForm.ativo ? 'Usuário ativo e autorizado no sistema.' : 'Usuário desativado (sem acesso).'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, ativo: !prev.ativo }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editForm.ativo ? 'bg-[#079551]' : 'bg-gray-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editForm.ativo ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm flex items-center space-x-1">
                  {saving ? <span>Salvando...</span> : (<><span className="material-symbols-outlined text-[16px]">save</span><span>Salvar Alterações</span></>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
