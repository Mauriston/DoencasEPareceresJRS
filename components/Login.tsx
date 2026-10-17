// Ficheiro: components/Login.tsx
// Splash + login (Splash Login JRS, Claude Design): o brasão da JRS/HNRe flutua
// sobre a fachada do hospital; ao tocar, o brasão encolhe e o formulário se
// revela. A autenticação (usuário em lista/manual + senha → loginUsuario) é a
// mesma de antes — só a apresentação mudou.
import React, { useEffect, useRef, useState } from 'react';
import { loginUsuario, mapAuthErrorMessage } from '../services/firebaseAuth';
import { listUsuariosPublicos, UsuarioPublico } from '../services/firestoreUsuarios';
import iconeJrs from '../assets/icone-jrs.png';
import fachadaHnre from '../assets/hnre-fachada.jpg';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const BOUNCE = 'cubic-bezier(.34,1.56,.64,1)';

const campoClass =
  'w-full box-border bg-white/[.18] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-[inherit] outline-none transition-all ' +
  'placeholder:text-white/25 focus:border-green focus:bg-white/[.24]';
const rotuloClass = 'block text-[11px] font-bold uppercase tracking-[.1em] text-white/60';

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

  const [splash, setSplash] = useState(true);
  const [montado, setMontado] = useState(false);
  const [formVisivel, setFormVisivel] = useState(false);
  const usuarioRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setMontado(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    listUsuariosPublicos()
      .then(lista => setUsuariosLista(lista.filter(u => u.ativo).sort((a, b) => a.usuario.localeCompare(b.usuario))))
      .catch(() => setListaFalhou(true));
  }, []);

  const avancar = () => {
    if (!splash) return;
    setSplash(false);
    window.setTimeout(() => { setFormVisivel(true); window.setTimeout(() => usuarioRef.current?.focus(), 700); }, 120);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !senha) return;
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

  const usarCampoTexto = entradaManual || listaFalhou || usuariosLista.length === 0;
  const desabilitado = loginLoading || !usuario || !senha;
  const entrada = (atraso: number): React.CSSProperties => ({
    opacity: montado ? 1 : 0,
    transform: montado ? 'translateY(0) scale(1)' : 'translateY(40px) scale(.6)',
    transition: `opacity .5s ease ${atraso}s, transform 1s ${BOUNCE} ${atraso}s`,
  });
  const tamanhoIcone = splash ? 168 : 88;

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-navy"
      onClick={avancar}
      onKeyDown={e => { if (splash && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); avancar(); } }}
      tabIndex={splash ? 0 : -1}
      aria-label={splash ? 'Toque para continuar' : 'Acesso ao sistema'}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `url(${fachadaHnre})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'invert(1)', mixBlendMode: 'screen', opacity: 0.35 }}
      />
      <div className="absolute inset-0 overflow-y-auto" style={{ cursor: splash ? 'pointer' : 'default' }}>
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-4 box-border">
          <div className="flex flex-col items-center w-full max-w-sm">
            <div style={entrada(0)} className="splash-animado">
              <img
                src={iconeJrs}
                alt="Brasão JRS/HNRe"
                className="splash-animado block object-contain"
                style={{
                  width: tamanhoIcone, height: tamanhoIcone,
                  filter: 'drop-shadow(0 18px 28px rgba(0,0,0,.45))',
                  animation: splash ? 'icone-flutuar 2.6s ease-in-out infinite' : 'none',
                  transition: `width 1.2s ${EASE}, height 1.2s ${EASE}`,
                }}
              />
            </div>
            <div style={entrada(0.12)} className="splash-animado">
              <h1
                className="!text-white font-heading font-extrabold uppercase text-center leading-[1.1] tracking-[.02em]"
                style={{ fontSize: splash ? 28 : 20, margin: splash ? '20px 0 0' : '10px 0 0', transition: `font-size 1.2s ${EASE}, margin 1.2s ${EASE}` }}
              >
                JRS/HNRe
              </h1>
            </div>
            <div
              className="overflow-hidden splash-animado"
              style={{ maxHeight: splash ? 28 : 0, opacity: splash ? 1 : 0, marginTop: splash ? 28 : 0, transition: `all .45s ${EASE}` }}
            >
              <span
                className="splash-animado text-xs font-bold uppercase tracking-[.08em] text-white/60 whitespace-nowrap"
                style={{ animation: 'dica-pulsar 2.6s ease-in-out infinite' }}
              >
                Toque para continuar
              </span>
            </div>
          </div>

          <div
            className="w-full shrink-0 overflow-hidden splash-animado"
            onClick={e => e.stopPropagation()}
            style={{
              maxHeight: formVisivel ? 800 : 0, opacity: formVisivel ? 1 : 0,
              transform: formVisivel ? 'translateY(0)' : 'translateY(20px)',
              marginTop: formVisivel ? 28 : 0,
              visibility: formVisivel ? 'visible' : 'hidden',
              transition: `max-height 1.2s ${EASE}, opacity 1s ease .1s, transform 1.2s ${EASE}, margin-top 1.2s ${EASE}`,
            }}
          >
            <form onSubmit={handleLogin} className="w-full max-w-sm mx-auto flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label htmlFor="login-usuario" className={rotuloClass}>Usuário</label>
                  {!listaFalhou && usuariosLista.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEntradaManual(prev => !prev)}
                      className="shrink-0 whitespace-nowrap min-h-[44px] -my-3 text-[11px] font-semibold uppercase tracking-[.05em] text-white/60 hover:text-white transition-colors"
                    >
                      {entradaManual ? 'Ver lista' : 'Não achou seu usuário?'}
                    </button>
                  )}
                </div>
                {usarCampoTexto ? (
                  <input
                    id="login-usuario"
                    ref={el => { usuarioRef.current = el; }}
                    type="text"
                    value={usuario}
                    onChange={e => setUsuario(e.target.value.toUpperCase())}
                    className={campoClass}
                    placeholder="Ex.: CT MAURISTON"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    autoComplete="username"
                  />
                ) : (
                  <select
                    id="login-usuario"
                    ref={el => { usuarioRef.current = el; }}
                    value={usuario}
                    onChange={e => setUsuario(e.target.value)}
                    className={`${campoClass} appearance-none cursor-pointer ${usuario ? '' : '!text-white/50'}`}
                  >
                    <option value="" className="text-gray-500">Selecione seu usuário</option>
                    {usuariosLista.map(u => <option key={u.usuario} value={u.usuario} className="text-gray-900">{u.usuario}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="login-senha" className={`${rotuloClass} mb-1.5`}>Senha</label>
                <input
                  id="login-senha"
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className={campoClass}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {loginError && <p role="alert" className="text-xs text-center pt-1 m-0 text-red-300 font-semibold">{loginError}</p>}

              <button
                type="submit"
                disabled={desabilitado}
                aria-busy={loginLoading || undefined}
                className="w-full min-h-[44px] bg-green text-white font-bold text-sm rounded-xl px-4 py-3.5 border-0 transition-colors hover:bg-[#067a43] active:bg-[#056635] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginLoading ? 'Verificando…' : 'Entrar'}
              </button>

              <p className="text-xs text-center text-white/60 m-0">
                Esqueceu a senha ou não tem acesso? Solicite ao administrador do sistema (Presidente da JRS).
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};
