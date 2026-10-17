// Ficheiro: components/Login.tsx
// Tela de acesso (F33): marca e nome do sistema, formulário centralizado sobre o
// canvas do app e instrução de recuperação de acesso. A lógica de autenticação
// (usuário em lista/manual + senha → loginUsuario) permanece a mesma.
import React, { useEffect, useState } from 'react';
import { loginUsuario, mapAuthErrorMessage } from '../services/firebaseAuth';
import { listUsuariosPublicos, UsuarioPublico } from '../services/firestoreUsuarios';
import { Field } from './ui/Field';
import { Button } from './ui/Button';

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

  const usarCampoTexto = entradaManual || listaFalhou || usuariosLista.length === 0;

  return (
    <main className="min-h-dvh bg-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="bg-navy text-white rounded-t-xl px-6 py-5 border-b-4 border-gold text-center">
          <span className="material-symbols-outlined text-[36px] text-gold" aria-hidden="true">medical_services</span>
          <h1 className="font-heading font-extrabold text-xl mt-1 !text-white">Junta Regular de Saúde</h1>
          <p className="text-sm text-white/80">Hospital Naval de Recife · Doenças e Pareceres</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-b-xl border border-line border-t-0 p-6 space-y-4">
          <h2 className="font-heading font-bold text-navy text-base">Acesse sua conta</h2>

          <div>
            <Field label="Usuário" required>
              {a => usarCampoTexto ? (
                <input
                  {...a}
                  type="text"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value.toUpperCase())}
                  placeholder="Ex.: CT MAURISTON"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="username"
                />
              ) : (
                <select {...a} value={usuario} onChange={e => setUsuario(e.target.value)}>
                  <option value="">Selecione seu usuário</option>
                  {usuariosLista.map(u => <option key={u.usuario} value={u.usuario}>{u.usuario}</option>)}
                </select>
              )}
            </Field>
            {!listaFalhou && usuariosLista.length > 0 && (
              <button type="button" onClick={() => setEntradaManual(prev => !prev)} className="mt-1 min-h-[44px] text-sm font-bold text-navy underline underline-offset-2">
                {entradaManual ? 'Escolher da lista' : 'Não achou seu usuário? Digite-o'}
              </button>
            )}
          </div>

          <Field label="Senha" required>
            {a => <input {...a} type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="current-password" />}
          </Field>

          {loginError && (
            <p role="alert" className="text-sm font-semibold text-wine flex items-start gap-1.5">
              <span className="material-symbols-outlined text-[18px] leading-none mt-0.5" aria-hidden="true">error</span>
              {loginError}
            </p>
          )}

          <Button type="submit" fullWidth loading={loginLoading} disabled={!usuario || !senha}>
            {loginLoading ? 'Verificando…' : 'Entrar'}
          </Button>

          <p className="text-xs text-ink-3 text-center">
            Esqueceu a senha ou não tem acesso? Solicite ao administrador do sistema (Presidente da JRS) a redefinição ou a criação do seu usuário.
          </p>
        </form>
      </div>
    </main>
  );
};
