import React, { useState, useEffect } from 'react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec';

async function sha256(message: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  onLogin: (nome: string, perfil: 'admin' | 'user', usuario: string, senhaHash: string) => void;
}

type View = 'login' | 'register';

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#079551] focus:bg-white/15 transition-all';
const labelClass = 'text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-1.5';

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [view, setView] = useState<View>('login');

  // Login state
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  // Register state
  const [regNome, setRegNome] = useState('');
  const [regUsuario, setRegUsuario] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirma, setRegConfirma] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    fetch(`${GAS_URL}?action=getUsuarios`)
      .then(r => r.json())
      .then(json => { if (json.success) setUsuarios(json.data); })
      .catch(() => {})
      .finally(() => setLoadingUsuarios(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const senhaHash = await sha256(senha);
      const res = await fetch(`${GAS_URL}?action=login&usuario=${encodeURIComponent(usuario)}&senhaHash=${encodeURIComponent(senhaHash)}`);
      const json = await res.json();
      if (json.success) {
        onLogin(json.nome, json.perfil, usuario, senhaHash);
      } else {
        setLoginError(json.error || 'Usuário ou senha incorretos');
      }
    } catch {
      setLoginError('Erro de conexão. Tente novamente.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regSenha !== regConfirma) { setRegError('As senhas não coincidem'); return; }
    if (regSenha.length < 6) { setRegError('A senha deve ter no mínimo 6 caracteres'); return; }
    setRegLoading(true);
    setRegError('');
    try {
      const senhaHash = await sha256(regSenha);
      const res = await fetch(`${GAS_URL}?action=createUsuario&nome=${encodeURIComponent(regNome)}&usuario=${encodeURIComponent(regUsuario.toLowerCase())}&senhaHash=${encodeURIComponent(senhaHash)}`);
      const json = await res.json();
      if (json.success) {
        setRegSuccess(true);
        setUsuarios(prev => [...prev, regUsuario.toLowerCase()]);
      } else {
        setRegError(json.error || 'Erro ao criar usuário');
      }
    } catch {
      setRegError('Erro de conexão. Tente novamente.');
    } finally {
      setRegLoading(false);
    }
  };

  const goToLogin = (u?: string) => {
    setView('login');
    if (u) setUsuario(u);
    setRegNome(''); setRegUsuario(''); setRegSenha(''); setRegConfirma('');
    setRegError(''); setRegSuccess(false);
  };

  return (
    <div className="fixed inset-0 bg-[#050F41] flex flex-col items-center justify-center px-6">
      <img src="https://i.imgur.com/5JjsbwG.png" alt="JRS/HNRe" className="w-56 mb-10 opacity-95" />

      {/* ── TELA DE LOGIN ── */}
      {view === 'login' && (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div>
            <label className={labelClass}>Usuário</label>
            {loadingUsuarios ? (
              <div className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white/40 text-sm">
                Carregando...
              </div>
            ) : (
              <select
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#079551] focus:bg-white/15 transition-all appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
              >
                <option value="" disabled style={{ background: '#050F41' }}>Selecione o usuário</option>
                {usuarios.map(u => (
                  <option key={u} value={u} style={{ background: '#050F41' }}>{u}</option>
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

          <button
            type="button"
            onClick={() => setView('register')}
            className="w-full text-white/50 hover:text-white/80 text-xs text-center py-2 transition-colors"
          >
            Criar nova conta
          </button>
        </form>
      )}

      {/* ── TELA DE CADASTRO ── */}
      {view === 'register' && (
        <div className="w-full max-w-sm">
          {regSuccess ? (
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-[48px] text-[#079551]">check_circle</span>
              <p className="text-white font-bold text-base">Conta criada com sucesso!</p>
              <p className="text-white/60 text-xs">Você já pode fazer login com o usuário <span className="text-white font-semibold">{regUsuario.toLowerCase()}</span>.</p>
              <button
                onClick={() => goToLogin(regUsuario.toLowerCase())}
                className="w-full bg-[#079551] hover:bg-[#067a43] text-white font-bold rounded-xl py-3.5 text-sm transition-colors mt-2"
              >
                Ir para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <button type="button" onClick={() => goToLogin()} className="flex items-center gap-1 text-white/50 hover:text-white/80 text-xs mb-1 transition-colors">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>Voltar ao login
              </button>

              <div>
                <label className={labelClass}>Nome completo</label>
                <input type="text" value={regNome} onChange={e => setRegNome(e.target.value)} className={inputClass} placeholder="Seu nome completo" autoComplete="name" />
              </div>

              <div>
                <label className={labelClass}>Nome de usuário</label>
                <input
                  type="text"
                  value={regUsuario}
                  onChange={e => setRegUsuario(e.target.value)}
                  className={inputClass}
                  placeholder="ex: joao.silva"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className={labelClass}>Senha</label>
                <input type="password" value={regSenha} onChange={e => setRegSenha(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
              </div>

              <div>
                <label className={labelClass}>Confirmar senha</label>
                <input type="password" value={regConfirma} onChange={e => setRegConfirma(e.target.value)} className={inputClass} placeholder="••••••••" autoComplete="new-password" />
              </div>

              {regError && <p className="text-red-400 text-xs text-center pt-1">{regError}</p>}

              <button
                type="submit"
                disabled={regLoading || !regNome || !regUsuario || !regSenha || !regConfirma}
                className="w-full bg-[#079551] hover:bg-[#067a43] active:bg-[#056635] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm transition-colors mt-1"
              >
                {regLoading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
