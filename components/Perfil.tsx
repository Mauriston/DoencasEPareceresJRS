import React, { useContext, useRef, useState } from 'react';
import { Header } from './Header';
import { NavContext } from '../context/NavContext';
import { uploadProfileImage } from '../services/profileImage';
import { formatNip, formatCelular } from '../utils/format';

const GAS_URL = 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec';

async function sha256(message: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#050F41] transition-colors';
const labelClass = 'text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1';

const InfoField: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div>
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{label}</span>
    <span className="text-sm font-semibold text-gray-800">{value || '—'}</span>
  </div>
);

export const Perfil: React.FC = () => {
  const nav = useContext(NavContext);
  const authUser = nav?.authUser || null;
  const setCurrentView = nav?.setCurrentView || (() => {});
  const updateAuthUser = nav?.updateAuthUser || (() => {});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [email, setEmail] = useState(authUser?.email || '');
  const [gmail, setGmail] = useState(authUser?.gmail || '');
  const [celular, setCelular] = useState(formatCelular(authUser?.celular || ''));
  const [savingContato, setSavingContato] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [savingSenha, setSavingSenha] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !authUser) return;
    setUploading(true);
    try {
      const url = await uploadProfileImage(authUser.usuario, file);
      const q = new URLSearchParams({ action: 'updateUsuario', usuario: authUser.usuario, imageProfile: url }).toString();
      const res = await fetch(`${GAS_URL}?${q}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erro ao salvar imagem.');
      updateAuthUser({ imageProfile: url });
      showToast('success', 'Foto de perfil atualizada com sucesso!');
    } catch (err: any) {
      showToast('error', err?.message || 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSalvarContato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    setSavingContato(true);
    try {
      const q = new URLSearchParams({
        action: 'updateUsuario',
        usuario: authUser.usuario,
        email: email.trim(),
        gmail: gmail.trim(),
        celular: celular.trim(),
      }).toString();
      const res = await fetch(`${GAS_URL}?${q}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erro ao salvar dados.');
      updateAuthUser({ email: email.trim(), gmail: gmail.trim(), celular: celular.trim() });
      showToast('success', 'Dados de contato atualizados com sucesso!');
    } catch (err: any) {
      showToast('error', err?.message || 'Erro de conexão.');
    } finally {
      setSavingContato(false);
    }
  };

  const handleSalvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    if (novaSenha.length < 6) { showToast('error', 'A nova senha deve ter no mínimo 6 caracteres.'); return; }
    if (novaSenha !== confirmaSenha) { showToast('error', 'As senhas não coincidem.'); return; }
    setSavingSenha(true);
    try {
      const senhaAtualHash = await sha256(senhaAtual);
      const novaSenhaHash = await sha256(novaSenha);
      const q = new URLSearchParams({
        action: 'updateSenha',
        usuario: authUser.usuario,
        senhaAtualHash,
        novaSenhaHash,
      }).toString();
      const res = await fetch(`${GAS_URL}?${q}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erro ao alterar senha.');
      updateAuthUser({ senhaTemporaria: false });
      localStorage.setItem('jrs_auth', JSON.stringify({ usuario: authUser.usuario, senhaHash: novaSenhaHash }));
      setSenhaAtual(''); setNovaSenha(''); setConfirmaSenha('');
      showToast('success', 'Senha alterada com sucesso!');
    } catch (err: any) {
      showToast('error', err?.message || 'Erro de conexão.');
    } finally {
      setSavingSenha(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header title="Meu Perfil" onBack={() => setCurrentView('home')} />

      {toast && (
        <div className={`fixed top-20 right-4 z-[100] px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs border animate-fade-in ${
          toast.type === 'success' ? 'bg-[#050F41] text-white border-white/20' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <span className={`material-symbols-outlined text-[18px] ${toast.type === 'success' ? 'text-[#079551]' : 'text-red-600'}`}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-3xl mx-auto w-full flex-1 space-y-5">
        {/* FOTO DE PERFIL EM DESTAQUE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 flex flex-col items-center">
          <div className="relative">
            {authUser?.imageProfile ? (
              <img
                src={authUser.imageProfile}
                alt={authUser?.nome}
                className="w-28 h-28 rounded-full object-cover border-4 border-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gray-100 border-4 border-gray-100 shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-[56px] text-gray-400">person</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleImageClick}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#050F41] hover:bg-[#079551] text-white flex items-center justify-center shadow-md border-2 border-white transition-colors disabled:opacity-50"
              title="Alterar foto de perfil"
            >
              <span className="material-symbols-outlined text-[18px]">
                {uploading ? 'progress_activity' : 'photo_camera'}
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>
          <h2 className="mt-4 font-heading font-bold text-base text-[#050F41] text-center">{authUser?.nome}</h2>
          <p className="text-xs text-gray-500 font-semibold">{authUser?.postoGraduacao || authUser?.usuario}</p>
        </div>

        {/* DADOS FUNCIONAIS (SOMENTE LEITURA) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5">
          <h3 className="font-heading font-bold text-sm text-[#050F41] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">badge</span>
            Dados Funcionais
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoField label="Usuário" value={authUser?.usuario} />
            <InfoField label="Posto/Graduação" value={authUser?.postoGraduacao} />
            <InfoField label="Cargo" value={authUser?.cargo} />
            <InfoField label="NIP" value={formatNip(authUser?.nip)} />
            <InfoField label="CRM-PE" value={authUser?.crmPe} />
            <InfoField label="RQE" value={authUser?.rqe} />
          </div>
        </div>

        {/* CONTATO (EDITÁVEL) */}
        <form onSubmit={handleSalvarContato} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5 space-y-4">
          <h3 className="font-heading font-bold text-sm text-[#050F41] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">contact_mail</span>
            Informações de Contato
          </h3>

          <div>
            <label className={labelClass}>E-mail Institucional</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="nome@marinha.mil.br" />
          </div>
          <div>
            <label className={labelClass}>E-mail Google (Gmail)</label>
            <input type="email" value={gmail} onChange={e => setGmail(e.target.value)} className={inputClass} placeholder="nome@gmail.com" />
          </div>
          <div>
            <label className={labelClass}>Celular</label>
            <input type="text" value={celular} onChange={e => setCelular(formatCelular(e.target.value))} className={inputClass} placeholder="(00) 00000-0000" maxLength={15} />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingContato}
              className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{savingContato ? 'Salvando...' : 'Salvar Contato'}</span>
            </button>
          </div>
        </form>

        {/* ALTERAR SENHA (SOMENTE O PRÓPRIO USUÁRIO) */}
        <form onSubmit={handleSalvarSenha} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5 space-y-4">
          <h3 className="font-heading font-bold text-sm text-[#050F41] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            Alterar Senha
          </h3>

          <div>
            <label className={labelClass}>Senha Atual</label>
            <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} className={inputClass} autoComplete="current-password" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nova Senha</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" autoComplete="new-password" required />
            </div>
            <div>
              <label className={labelClass}>Confirmar Nova Senha</label>
              <input type="password" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} className={inputClass} autoComplete="new-password" required />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSenha}
              className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              <span>{savingSenha ? 'Salvando...' : 'Alterar Senha'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
