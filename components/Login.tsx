import React, { useEffect, useState } from 'react';
import { loginUsuario, criarContaEUsuario, mapAuthErrorMessage } from '../services/firebaseAuth';
import { listUsuariosPublicos, UsuarioPublico } from '../services/firestoreUsuarios';

const loginBg = 'https://i.imgur.com/c2aHsZU.png';

type View = 'login' | 'register';

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#079551] focus:bg-white/15 transition-all';
const labelClass = 'text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-1.5';

export const Login: React.FC = () => {
  const [view, setView] = useState<View>('login');

  // Login state
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [usuariosLista, setUsuariosLista] = useState<UsuarioPublico[]>([]);
  const [listaFalhou, setListaFalhou] = useState(false);

  useEffect(() => {
    listUsuariosPublicos()
      .then(lista => setUsuariosLista(lista.filter(u => u.ativo).sort((a, b) => a.usuario.localeCompare(b.usuario))))
      .catch(() => setListaFalhou(true));
  }, []);

  // Register state
  const [regNome, setRegNome] = useState('');
  const [regUsuario, setRegUsuario] = useState('');
  const [regNip, setRegNip] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirma, setRegConfirma] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regSenha !== regConfirma) { setRegError('As senhas não coincidem'); return; }
    if (regSenha.length < 6) { setRegError('A senha deve ter no mínimo 6 caracteres'); return; }
    setRegLoading(true);
    setRegError('');
    try {
      const usuarioUpper = regUsuario.trim().toUpperCase();
      await criarContaEUsuario(usuarioUpper, regSenha, {
        postoGraduacao: '',
        cargo: '',
        nome: regNome.trim().toUpperCase(),
        nip: regNip.trim(),
        crmPe: '',
        rqe: '',
        email: regEmail.trim(),
        gmail: '',
        celular: '',
        perfil: 'user_secretaria',
        ativo: true,
        imageProfile: '',
        senhaTemporaria: false,
      });
      setRegSuccess(true);
    } catch (err: any) {
      setRegError(mapAuthErrorMessage(err?.code, 'Erro ao criar usuário.'));
    } finally {
      setRegLoading(false);
    }
  };

  const goToLogin = (u?: string) => {
    setView('login');
    if (u) setUsuario(u);
    setRegNome(''); setRegUsuario(''); setRegNip(''); setRegEmail(''); setRegSenha(''); setRegConfirma('');
    setRegError(''); setRegSuccess(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
      {/* Metade superior — imagem visível */}
      <div className="flex-1" />

      {/* Metade inferior — conteúdo sobre overlay */}
      <div className="h-1/2 bg-[#050F41]/90 backdrop-blur-sm flex flex-col items-center justify-center px-6 overflow-y-auto py-4">

      {/* ── TELA DE LOGIN ── */}
      {view === 'login' && (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div>
            <label className={labelClass}>Usuário</label>
            {listaFalhou || usuariosLista.length === 0 ? (
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
              <p className="text-white/60 text-xs">Você já pode fazer login com o usuário <span className="text-white font-semibold">{regUsuario.toUpperCase()}</span>.</p>
              <button
                onClick={() => goToLogin(regUsuario.toUpperCase())}
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
                <input type="text" value={regNome} onChange={e => setRegNome(e.target.value.toUpperCase())} className={inputClass} placeholder="SEU NOME COMPLETO" autoCapitalize="characters" autoComplete="name" />
              </div>

              <div>
                <label className={labelClass}>Nome de usuário</label>
                <input
                  type="text"
                  value={regUsuario}
                  onChange={e => setRegUsuario(e.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="Ex.: CT FUSMÁTICO"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className={labelClass}>NIP</label>
                <input
                  type="text"
                  value={regNip}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                    let masked = digits;
                    if (digits.length > 2) masked = digits.slice(0, 2) + '.' + digits.slice(2);
                    if (digits.length > 6) masked = digits.slice(0, 2) + '.' + digits.slice(2, 6) + '.' + digits.slice(6);
                    setRegNip(masked);
                  }}
                  className={inputClass}
                  placeholder="00.0000.00"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                />
              </div>

              <div>
                <label className={labelClass}>E-mail institucional</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className={inputClass} placeholder="nome@marinha.mil.br" autoComplete="email" />
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
                disabled={regLoading || !regNome || !regUsuario || !regSenha || !regConfirma || !regNip || !regEmail}
                className="w-full bg-[#079551] hover:bg-[#067a43] active:bg-[#056635] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm transition-colors mt-1"
              >
                {regLoading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
