// Ficheiro: components/Login.tsx
// Splash + login (Splash Login JRS, Claude Design): o brasão da JRS/HNRe flutua
// sobre a fachada do hospital; ao tocar, o brasão encolhe e o formulário se
// revela. A autenticação (usuário em lista/manual + senha → loginUsuario) é a
// mesma de antes — só a apresentação mudou.
import React, { useEffect, useRef, useState } from 'react';
import { loginUsuario, mapAuthErrorMessage } from '@/services/firebaseAuth';
import { resolverNip, NipError } from '@/services/loginNip';
import { formatNip } from '@/utils/format';
import { SENHA_INICIAL_PADRAO, linkWhatsappRedefinicao } from '@/config/senha';
import iconeJrs from '../../../assets/icone-jrs.png';
import fachadaHnre from '../../../assets/hnre-fachada.jpg';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const BOUNCE = 'cubic-bezier(.34,1.56,.64,1)';

// Contraste (auditoria v2, L2): placeholder ≥ 60% de branco, rótulos de 12 px, foco em ouro.
const campoClass =
  'w-full box-border bg-white/[.18] border border-white/30 rounded-xl px-4 py-3 text-white text-sm font-[inherit] outline-none transition-all ' +
  'placeholder:text-white/60 focus:border-gold focus:bg-white/[.24]';
const rotuloClass = 'block text-xs font-bold uppercase tracking-[.1em] text-white/70';

// O splash (brasão + "Toque para continuar") aparece só no 1º acesso do aparelho e nunca com
// movimento reduzido; depois disso o formulário já vem visível (auditoria v2, L1).
const CHAVE_SPLASH = 'jrs_splash_visto';
const deveMostrarSplash = (): boolean => {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    return localStorage.getItem(CHAVE_SPLASH) !== '1';
  } catch {
    return true;
  }
};

// Não há mais cadastro próprio nesta tela — todo usuário novo é criado pelo
// Admin em Usuários (ver UsuariosManagement.tsx), que já define o perfil de
// acesso corretamente na criação.
export const Login: React.FC = () => {
  const [nip, setNip] = useState('');
  const [senha, setSenha] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  // Orientação após senha errada: dica da senha inicial ou contato para redefinição.
  const [ajudaSenha, setAjudaSenha] = useState<null | { tipo: 'inicial' } | { tipo: 'redefinir'; usuario: string }>(null);

  const [splash, setSplash] = useState(deveMostrarSplash);
  const [montado, setMontado] = useState(!splash);
  const [formVisivel, setFormVisivel] = useState(!splash);
  const usuarioRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (montado) { window.setTimeout(() => usuarioRef.current?.focus(), 0); return; }
    const t = window.setTimeout(() => setMontado(true), 60);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const avancar = () => {
    if (!splash) return;
    try { localStorage.setItem(CHAVE_SPLASH, '1'); } catch { /* sem localStorage: o splash volta no próximo acesso */ }
    setSplash(false);
    window.setTimeout(() => { setFormVisivel(true); window.setTimeout(() => usuarioRef.current?.focus(), 700); }, 120);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nip.length < 10 || !senha) return;
    setLoginLoading(true);
    setLoginError('');
    setAjudaSenha(null);
    try {
      const alvo = await resolverNip(nip);
      if (!alvo.ativo) {
        setLoginError(mapAuthErrorMessage('auth/user-disabled', 'Usuário desativado.'));
        return;
      }
      try {
        await loginUsuario(alvo.usuario, senha);
        // Sucesso: o listener onAuthStateChanged em App.tsx assume o resto.
      } catch (err: any) {
        const senhaErrada = err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password';
        if (senhaErrada) {
          if (alvo.senhaTemporaria) { setLoginError('Senha incorreta.'); setAjudaSenha({ tipo: 'inicial' }); }
          else setAjudaSenha({ tipo: 'redefinir', usuario: alvo.usuario });
        } else {
          setLoginError(mapAuthErrorMessage(err?.code, 'Erro de conexão. Tente novamente.'));
        }
      }
    } catch (err: any) {
      setLoginError(err instanceof NipError ? err.message : 'Erro de conexão. Tente novamente.');
    } finally {
      setLoginLoading(false);
    }
  };

  const desabilitado = loginLoading || nip.length < 10 || !senha;
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
                <label htmlFor="login-nip" className={`${rotuloClass} mb-1.5`}>NIP</label>
                <input
                  id="login-nip"
                  ref={el => { usuarioRef.current = el; }}
                  type="text"
                  inputMode="numeric"
                  value={nip}
                  onChange={e => { setNip(formatNip(e.target.value)); setLoginError(''); setAjudaSenha(null); }}
                  className={`${campoClass} font-mono`}
                  placeholder="00.0000.00"
                  maxLength={10}
                  autoComplete="username"
                />
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

              {loginError && <p role="alert" className="text-xs text-center m-0 bg-white text-wine font-semibold rounded-lg px-3 py-2">{loginError}</p>}
              {ajudaSenha?.tipo === 'inicial' && (
                <p className="text-xs text-center m-0 text-gold font-semibold">Senha inicial: {SENHA_INICIAL_PADRAO}</p>
              )}
              {ajudaSenha?.tipo === 'redefinir' && (
                <p role="alert" className="text-xs text-center m-0 bg-white text-wine font-semibold rounded-lg px-3 py-2">
                  Senha errada. Contacte o CT Mauriston{' '}
                  <a href={linkWhatsappRedefinicao(ajudaSenha.usuario)} target="_blank" rel="noopener noreferrer" className="font-bold text-navy underline underline-offset-2">clicando aqui</a>.
                </p>
              )}

              <button
                type="submit"
                disabled={desabilitado}
                aria-busy={loginLoading || undefined}
                className="w-full min-h-[44px] bg-white text-navy font-bold text-sm rounded-xl px-4 py-3.5 border-0 transition-colors hover:bg-white/90 active:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginLoading ? 'Verificando…' : 'Entrar'}
              </button>

              <p className="text-xs text-center text-white/70 m-0">
                Entre com o seu NIP. Sem acesso? Solicite ao administrador do sistema (Presidente da JRS).
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};
