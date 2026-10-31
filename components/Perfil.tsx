import React, { useContext, useEffect, useRef, useState } from 'react';
import { Page } from './ui/Page';
import { Toast } from './ui/Toast';
import { NavContext } from '../context/NavContext';
import { uploadProfileImage } from '../services/profileImage';
import { formatNip, formatCelular } from '../utils/format';
import { trocarSenha, mapAuthErrorMessage } from '../services/firebaseAuth';
import { updateUsuarioProfile } from '../services/firestoreUsuarios';
import { estadoNotificacoes, ativarNotificacoes, testarNotificacao, type EstadoNotificacoes } from '../services/notificacoesPush';

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-xs font-semibold text-navy focus:outline-none focus:border-navy transition-colors';
const labelClass = 'text-xs font-bold text-ink-3 uppercase tracking-wider block mb-1';

const TEXTO_NOTIFICACOES: Record<EstadoNotificacoes, { titulo: string; texto: string }> = {
  ativadas: { titulo: 'Ativadas neste aparelho', texto: 'Você recebe aqui os avisos da JRS mesmo com o app fechado. Para receber em outro aparelho, ative também nele.' },
  pendente: { titulo: 'Desativadas', texto: 'Ative para receber neste aparelho os laudos de inaptidão e IDM exarados nos concursos e a conclusão das IS do dia.' },
  bloqueadas: { titulo: 'Bloqueadas no navegador', texto: 'O app não pode mais pedir a permissão. Para liberar: toque no cadeado (ou em "Configurações do site") ao lado do endereço, permita as Notificações e recarregue a página. No celular com o app instalado, libere em Configurações > Notificações do aparelho.' },
  'instalar-ios': { titulo: 'Instale o app', texto: 'No iPhone/iPad, as notificações só funcionam com o app adicionado à Tela de Início. Instale-o (Compartilhar > Adicionar à Tela de Início) e ative-as abrindo pelo ícone.' },
  indisponivel: { titulo: 'Indisponíveis', texto: 'Este navegador não oferece notificações push.' },
};

const NotificacoesCard: React.FC<{ usuario: string }> = ({ usuario }) => {
  const [estado, setEstado] = useState<EstadoNotificacoes | null>(null);
  const [ativando, setAtivando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; msg: string } | null>(null);
  useEffect(() => { estadoNotificacoes().then(setEstado); }, []);
  if (!estado) return null;

  const ativar = async () => {
    setAtivando(true);
    try { setEstado(await ativarNotificacoes(usuario)); } catch (e) { console.error('Falha ao ativar notificações:', e); } finally { setAtivando(false); }
  };
  const testar = async () => {
    setTestando(true);
    setResultadoTeste(null);
    try { setResultadoTeste({ ok: true, msg: await testarNotificacao(usuario) }); }
    catch (e: any) { setResultadoTeste({ ok: false, msg: e?.message || 'Falha ao enviar o teste.' }); }
    finally { setTestando(false); }
  };
  const { titulo, texto } = TEXTO_NOTIFICACOES[estado];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-line/60 p-5 space-y-3">
      <h3 className="font-heading font-bold text-sm text-navy flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">notifications</span>
        Notificações
      </h3>
      <p className={`text-sm font-bold ${estado === 'ativadas' ? 'text-green' : estado === 'bloqueadas' ? 'text-wine' : 'text-navy'}`}>{titulo}</p>
      <p className="text-xs text-ink-3 leading-relaxed">{texto}</p>
      {estado === 'ativadas' && (
        <div className="pt-2 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={testar}
            disabled={testando}
            className="px-5 py-2.5 border border-navy text-navy hover:bg-navy/5 disabled:opacity-50 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>{testando ? 'Enviando...' : 'Enviar notificação de teste'}</span>
          </button>
          {resultadoTeste && (
            <p className={`text-xs font-semibold self-stretch ${resultadoTeste.ok ? 'text-green' : 'text-wine'}`}>{resultadoTeste.msg}</p>
          )}
        </div>
      )}
      {estado === 'pendente' && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={ativar}
            disabled={ativando}
            className="px-5 py-2.5 bg-navy hover:bg-navy-hover disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">notifications_active</span>
            <span>{ativando ? 'Ativando...' : 'Ativar notificações'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

const InfoField: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div>
    <span className="text-xs font-bold text-ink-3 uppercase tracking-wider block">{label}</span>
    <span className="text-sm font-semibold text-navy">{value || '—'}</span>
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
      await updateUsuarioProfile(authUser.uid, { imageProfile: url });
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
      const patch = { email: email.trim(), gmail: gmail.trim(), celular: celular.trim() };
      await updateUsuarioProfile(authUser.uid, patch);
      updateAuthUser(patch);
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
      await trocarSenha(authUser.usuario, senhaAtual, novaSenha);
      await updateUsuarioProfile(authUser.uid, { senhaTemporaria: false });
      updateAuthUser({ senhaTemporaria: false });
      setSenhaAtual(''); setNovaSenha(''); setConfirmaSenha('');
      showToast('success', 'Senha alterada com sucesso!');
    } catch (err: any) {
      showToast('error', mapAuthErrorMessage(err?.code, 'Erro ao alterar senha.'));
    } finally {
      setSavingSenha(false);
    }
  };

  return (
    <Page size="form" title="Meu perfil" description="Seus dados de contato, foto e senha de acesso.">
      <Toast message={toast?.msg ?? null} tone={toast?.type === 'error' ? 'error' : 'success'} />

      <div className="space-y-5">
        {/* FOTO DE PERFIL EM DESTAQUE */}
        <div className="bg-white rounded-2xl shadow-sm border border-line/60 p-6 flex flex-col items-center">
          <div className="relative">
            {authUser?.imageProfile ? (
              <img
                src={authUser.imageProfile}
                alt={authUser?.nome}
                className="w-28 h-28 rounded-full object-cover border-4 border-line shadow-sm"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-thead border-4 border-line shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-[56px] text-ink-3">person</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleImageClick}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-navy hover:bg-navy-hover text-white flex items-center justify-center shadow-md border-2 border-white transition-colors disabled:opacity-50"
              title="Alterar foto de perfil"
            >
              <span className="material-symbols-outlined text-[18px]">
                {uploading ? 'progress_activity' : 'photo_camera'}
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>
          <h2 className="mt-4 font-heading font-bold text-base text-navy text-center">{authUser?.nome}</h2>
          <p className="text-xs text-ink-3 font-semibold">{authUser?.postoGraduacao || authUser?.usuario}</p>
        </div>

        {/* DADOS FUNCIONAIS (SOMENTE LEITURA) */}
        <div className="bg-white rounded-2xl shadow-sm border border-line/60 p-5">
          <h3 className="font-heading font-bold text-sm text-navy mb-4 flex items-center gap-2">
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
        <form onSubmit={handleSalvarContato} className="bg-white rounded-2xl shadow-sm border border-line/60 p-5 space-y-4">
          <h3 className="font-heading font-bold text-sm text-navy flex items-center gap-2">
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
              className="px-5 py-2.5 bg-navy hover:bg-navy-hover disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{savingContato ? 'Salvando...' : 'Salvar Contato'}</span>
            </button>
          </div>
        </form>

        {/* NOTIFICAÇÕES PUSH (POR APARELHO) */}
        {authUser && <NotificacoesCard usuario={authUser.usuario} />}

        {/* ALTERAR SENHA (SOMENTE O PRÓPRIO USUÁRIO) */}
        <form onSubmit={handleSalvarSenha} className="bg-white rounded-2xl shadow-sm border border-line/60 p-5 space-y-4">
          <h3 className="font-heading font-bold text-sm text-navy flex items-center gap-2">
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
              className="px-5 py-2.5 bg-navy hover:bg-navy-hover disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              <span>{savingSenha ? 'Salvando...' : 'Alterar Senha'}</span>
            </button>
          </div>
        </form>
      </div>
    </Page>
  );
};
