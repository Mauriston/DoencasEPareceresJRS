import React, { useState, useEffect } from 'react';
import { Header } from './Header';

const GAS_URL = 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec';

export interface UserRecord {
  id: string;
  usuario: string;
  nome: string;
  nip: string;
  email: string;
  perfil: 'admin' | 'user_hnre' | 'user_outros' | string;
  ativo: boolean;
  dataCriacao?: string;
}

const DEFAULT_USERS: UserRecord[] = [
  {
    id: 'usr-1',
    usuario: 'CT MAURISTON',
    nome: 'CT MAURISTON',
    nip: '',
    email: '',
    perfil: 'admin',
    ativo: true,
  },
  {
    id: 'usr-2',
    usuario: 'CT JÚLIO CÉSAR',
    nome: 'CT JÚLIO CÉSAR',
    nip: '',
    email: '',
    perfil: 'user_hnre',
    ativo: true,
  },
  {
    id: 'usr-3',
    usuario: '1T MÔNICA VIRGÍNIA',
    nome: '1T MÔNICA VIRGÍNIA',
    nip: '',
    email: '',
    perfil: 'user_hnre',
    ativo: true,
  },
  {
    id: 'usr-4',
    usuario: 'GM CASSUNDÉ',
    nome: 'GM CASSUNDÉ',
    nip: '',
    email: '',
    perfil: 'user_outros',
    ativo: true,
  },
];

export const UsuariosManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [perfilFilter, setPerfilFilter] = useState<string>('todos');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserRecord>>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const savedLocal = localStorage.getItem('jrs_usuarios_records');
      const localRecords: UserRecord[] = savedLocal ? JSON.parse(savedLocal) : [];
      const savedMap = new Map<string, UserRecord>();
      localRecords.forEach(r => {
        if (r.usuario) savedMap.set(r.usuario.toUpperCase(), r);
      });

      // Try fetching user list directly from Google Sheets (aba Usuarios)
      const res = await fetch(`${GAS_URL}?action=getUsuarios`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const fetchedUsers: UserRecord[] = json.data.map((item: any, idx: number) => {
          if (typeof item === 'string') {
            const uUpper = item.trim().toUpperCase();
            const saved = savedMap.get(uUpper);
            return {
              id: saved?.id || `usr-gas-${idx + 1}`,
              usuario: uUpper,
              nome: saved?.nome || uUpper,
              nip: saved?.nip || '',
              email: saved?.email || '',
              perfil: saved?.perfil || (uUpper === 'CT MAURISTON' ? 'admin' : (uUpper.includes('JÚLIO') || uUpper.includes('MÔNICA') ? 'user_hnre' : 'user_outros')),
              ativo: saved?.ativo !== undefined ? saved.ativo : true,
            };
          } else {
            const uUpper = String(item.usuario || '').trim().toUpperCase();
            const saved = savedMap.get(uUpper);
            return {
              id: item.id || saved?.id || `usr-${idx + 1}`,
              usuario: uUpper,
              nome: String(item.nome || saved?.nome || uUpper).trim().toUpperCase(),
              nip: String(item.nip || saved?.nip || '').trim(),
              email: String(item.email || saved?.email || '').trim().toLowerCase(),
              perfil: String(item.perfil || saved?.perfil || 'user_outros').trim(),
              ativo: item.ativo !== undefined
                ? (item.ativo === true || String(item.ativo).toUpperCase() === 'TRUE' || String(item.ativo).toUpperCase() === 'VERDADEIRO')
                : (saved?.ativo !== undefined ? saved.ativo : true),
            };
          }
        });

        setUsers(fetchedUsers);
        localStorage.setItem('jrs_usuarios_records', JSON.stringify(fetchedUsers));
      } else {
        if (localRecords.length > 0) {
          setUsers(localRecords);
        } else {
          setUsers(DEFAULT_USERS);
        }
      }
    } catch (e) {
      console.error('Error loading users from Google Sheets:', e);
      const savedLocal = localStorage.getItem('jrs_usuarios_records');
      if (savedLocal) {
        setUsers(JSON.parse(savedLocal));
      } else {
        setUsers(DEFAULT_USERS);
      }
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
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, ativo: updatedStatus } : u);
    setUsers(updatedUsers);
    localStorage.setItem('jrs_usuarios_records', JSON.stringify(updatedUsers));

    // Async sync with GAS
    try {
      const q = new URLSearchParams({
        action: 'updateUsuario',
        usuario: user.usuario,
        ativo: String(updatedStatus)
      }).toString();
      fetch(`${GAS_URL}?${q}`).catch(() => {});
    } catch {}

    showToast(`Usuário "${user.usuario}" ${updatedStatus ? 'ativado' : 'desativado'} com sucesso.`);
  };

  const handleOpenEdit = (user: UserRecord) => {
    setEditingUser(user);
    setEditForm({ ...user });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editForm.usuario || !editForm.nome) return;

    setSaving(true);
    try {
      const updatedUser: UserRecord = {
        ...editingUser,
        usuario: editForm.usuario.trim().toUpperCase(),
        nome: editForm.nome.trim().toUpperCase(),
        nip: editForm.nip ? editForm.nip.trim() : '',
        email: editForm.email ? editForm.email.trim().toLowerCase() : '',
        perfil: editForm.perfil || 'user_outros',
        ativo: editForm.ativo !== undefined ? editForm.ativo : true,
      };

      const updatedList = users.map(u => u.id === editingUser.id ? updatedUser : u);
      setUsers(updatedList);
      localStorage.setItem('jrs_usuarios_records', JSON.stringify(updatedList));

      // Attempt endpoint update
      try {
        const q = new URLSearchParams({
          action: 'updateUsuario',
          usuario: updatedUser.usuario,
          nome: updatedUser.nome,
          nip: updatedUser.nip,
          email: updatedUser.email,
          perfil: updatedUser.perfil,
          ativo: String(updatedUser.ativo)
        }).toString();
        await fetch(`${GAS_URL}?${q}`).catch(() => {});
      } catch {}

      showToast(`Dados do usuário "${updatedUser.usuario}" atualizados com sucesso!`);
      setEditingUser(null);
    } catch {
      showToast('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  // Format NIP helper
  const handleNipChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 2) masked = digits.slice(0, 2) + '.' + digits.slice(2);
    if (digits.length > 6) masked = digits.slice(0, 2) + '.' + digits.slice(2, 6) + '.' + digits.slice(6);
    setEditForm(prev => ({ ...prev, nip: masked }));
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.usuario.toLowerCase().includes(search.toLowerCase()) ||
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.nip.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' ? true :
      statusFilter === 'ativos' ? u.ativo : !u.ativo;

    const matchesPerfil =
      perfilFilter === 'todos' ? true :
      u.perfil === perfilFilter;

    return matchesSearch && matchesStatus && matchesPerfil;
  });

  const getPerfilBadge = (perfil: string) => {
    switch (perfil) {
      case 'admin':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">ADMIN</span>;
      case 'user_hnre':
      case 'hnre':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">USER HNRE</span>;
      case 'user_outros':
      case 'user':
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">USER OUTROS</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header title="Gestão de Usuários" />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-[100] bg-[#050F41] text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs border border-white/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px] text-[#079551]">check_circle</span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-6xl mx-auto w-full flex-1 space-y-4">
        {/* TOP BAR SEARCH & FILTERS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por usuário, nome, NIP ou e-mail..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-body rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#050F41] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-[#050F41]"
            >
              <option value="todos">Status: Todos</option>
              <option value="ativos">Status: Ativos</option>
              <option value="inativos">Status: Inativos</option>
            </select>

            {/* Perfil Filter */}
            <select
              value={perfilFilter}
              onChange={e => setPerfilFilter(e.target.value)}
              className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-[#050F41]"
            >
              <option value="todos">Perfil: Todos</option>
              <option value="admin">Perfil: Admin</option>
              <option value="user_hnre">Perfil: User HNRe</option>
              <option value="user_outros">Perfil: User Outros</option>
            </select>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
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

        {/* USER TABLE / LIST CONTAINER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
              <p className="text-xs font-semibold">Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-gray-300">person_off</span>
              <p className="text-sm font-bold text-gray-700">Nenhum usuário encontrado</p>
              <p className="text-xs text-gray-400">Tente ajustar seus termos de pesquisa ou filtros.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Usuário</th>
                      <th className="py-3.5 px-4">Nome Completo</th>
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
                            <div className="w-7 h-7 rounded-full bg-[#050F41] text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                              {user.usuario.charAt(0)}
                            </div>
                            <span className="truncate max-w-[140px]">{user.usuario}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          {user.nome}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">
                          {user.nip || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 truncate max-w-[180px]">
                          {user.email || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          {getPerfilBadge(user.perfil)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              user.ativo
                                ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'
                            }`}
                            title={user.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${user.ativo ? 'bg-green-600' : 'bg-red-600'}`} />
                            <span>{user.ativo ? 'ATIVO' : 'INATIVO'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 text-gray-500 hover:text-[#050F41] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar dados do usuário"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                user.ativo
                                  ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={user.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {user.ativo ? 'block' : 'check_circle'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS LIST */}
              <div className="block md:hidden divide-y divide-gray-100">
                {filteredUsers.map(user => (
                  <div key={user.id} className={`p-4 flex flex-col space-y-2.5 ${!user.ativo ? 'bg-gray-50/50 opacity-70' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#050F41] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {user.usuario.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#050F41] truncate">{user.usuario}</p>
                          <p className="text-[11px] text-gray-700 font-semibold truncate">{user.nome}</p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center space-x-1">
                        {getPerfilBadge(user.perfil)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">NIP</span>
                        <span className="font-mono font-medium">{user.nip || '-'}</span>
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
                          user.ativo
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.ativo ? 'bg-green-600' : 'bg-red-600'}`} />
                        <span>{user.ativo ? 'ATIVO' : 'INATIVO'}</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="px-3 py-1.5 bg-[#050F41] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-[#079551]">manage_accounts</span>
                <h3 className="font-heading font-bold text-sm uppercase">Editar Dados do Usuário</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Nome de Usuário (Login)
                </label>
                <input
                  type="text"
                  required
                  value={editForm.usuario || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, usuario: e.target.value.toUpperCase() }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                  placeholder="EX.: CT MAURISTON"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nome || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#050F41]"
                  placeholder="NOME COMPLETO"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    NIP
                  </label>
                  <input
                    type="text"
                    value={editForm.nip || ''}
                    onChange={e => handleNipChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-semibold text-gray-800 focus:outline-none focus:border-[#050F41]"
                    placeholder="00.0000.00"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Perfil de Acesso
                  </label>
                  <select
                    value={editForm.perfil || 'user_outros'}
                    onChange={e => setEditForm(prev => ({ ...prev, perfil: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                  >
                    <option value="admin">Administrador (admin)</option>
                    <option value="user_hnre">Usuário HNRe (user_hnre)</option>
                    <option value="user_outros">Usuário Outros (user_outros)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  E-mail Institucional
                </label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#050F41]"
                  placeholder="exemplo@marinha.mil.br"
                />
              </div>

              {/* Status Toggle Switch */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#050F41]">Status da Conta</p>
                  <p className="text-[11px] text-gray-500">
                    {editForm.ativo ? 'Usuário ativo e autorizado no sistema.' : 'Usuário desativado (sem acesso).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, ativo: !prev.ativo }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editForm.ativo ? 'bg-[#079551]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      editForm.ativo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1"
                >
                  {saving ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
