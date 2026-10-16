import React, { useEffect, useState } from 'react';
import { loginUsuario, mapAuthErrorMessage } from '../services/firebaseAuth';
import { listUsuariosPublicos, UsuarioPublico } from '../services/firestoreUsuarios';

const loginBg = 'https://i.imgur.com/c2aHsZU.png';

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 text-sm focus:outline-none focus:border-[#079551] focus:bg-white/15 transition-all';
const labelClass = 'text-white/60 text-xs font-bold uppercase tracking-widest block mb-1.5';

// Não há mais cadastro próprio nesta tela — todo usuário novo é criado pelo
// Admin em Usuários (ver UsuariosManagement.tsx), que já define o perfil de
// acesso corretamente na criação.
export const Login: React.FC = () => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [usuariosLista, setUsuariosLista] = useState<UsuarioPublico[]>([]);
  const [listaFalhou, setListaFalhou] = useState(false);
  const [entradaManual, setEntradaManual] = useState(false);

  useEffect(() => {
    listUsuariosPublicos()
      .then(lista => setUsuariosLista(lista.filter(u => u.ativo).sort((a, b) => a.usuario.localeCompare(b.usuario))))
      .catch(() => setListaFalhou(true));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await loginUsuario(usuario.trim().toUpperCase(), senha);
      // Sucesso: o listener onAuthStateChanged em App.tsx assume o resto.
    } catch (err: any) {
      setLoginError(mapAuthErrorMessage(err?.code, 'Erro de conexão. Tente novamente.'));
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
      {/* Metade superior — imagem visível */}
      <div className="flex-1" />

      {/* Metade inferior — conteúdo sobre overlay */}
      <div className="h-1/2 bg-[#050F41]/90 backdrop-blur-sm flex flex-col items-center justify-center px-6 overflow-y-auto py-4">

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass}>Usuário</label>
            {!listaFalhou && usuariosLista.length > 0 && (
              <button
                type="button"
                onClick={() => setEntradaManual(prev => !prev)}
                className="text-white/70 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                {entradaManual ? 'Ver lista' : 'Não achou seu usuário?'}
              </button>
            )}
          </div>
          {entradaManual || listaFalhou || usuariosLista.length === 0 ? (
            <input
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value.toUpperCase())}
              className={inputClass}
              placeholder="Ex.: CT MAURISTON"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="username"
            />
          ) : (
            <select
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              className={`${inputClass} appearance-none`}
            >
              <option value="" className="text-gray-500">Selecione seu usuário</option>
              {usuariosLista.map(u => (
                <option key={u.usuario} value={u.usuario} className="text-gray-900">{u.usuario}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className={labelClass}>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {loginError && <p className="text-red-400 text-xs text-center pt-1">{loginError}</p>}

        <button
          type="submit"
          disabled={loginLoading || !usuario || !senha}
          className="w-full bg-[#079551] hover:bg-[#067a43] active:bg-[#056635] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm transition-colors"
        >
          {loginLoading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
      </div>
    </div>
  );
};
