import React, { useState } from 'react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec';

async function sha256(message: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  onLogin: (nome: string, perfil: 'admin' | 'user', usuario: string, senhaHash: string) => void;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const senhaHash = await sha256(senha);
      const res = await fetch(`${GAS_URL}?action=login&usuario=${encodeURIComponent(usuario)}&senhaHash=${encodeURIComponent(senhaHash)}`);
      const json = await res.json();
      if (json.success) {
        onLogin(json.nome, json.perfil, usuario, senhaHash);
      } else {
        setError(json.error || 'Usuário ou senha incorretos');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050F41] flex flex-col items-center justify-center px-6">
      <img
        src="https://i.imgur.com/5JjsbwG.png"
        alt="JRS/HNRe"
        className="w-56 mb-10 opacity-95"
      />

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-1.5">
            Usuário
          </label>
          <input
            type="text"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#079551] focus:bg-white/15 transition-all"
            placeholder="seu.usuario"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
          />
        </div>

        <div>
          <label className="text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-1.5">
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#079551] focus:bg-white/15 transition-all"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center pt-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !usuario || !senha}
          className="w-full bg-[#079551] hover:bg-[#067a43] active:bg-[#056635] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm transition-colors mt-2"
        >
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};
