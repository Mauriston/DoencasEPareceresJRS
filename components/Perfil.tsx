import { emailInstitucionalValido, MSG_EMAIL_INSTITUCIONAL } from '../utils/emails';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Page } from './ui/Page';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Field } from './ui/Field';
import { Segmented } from './ui/Segmented';
import { useTema, type ModoTema, type VarianteEscuro } from '../hooks/useTema';
import { Toast } from './ui/Toast';
import { NavContext } from '../context/NavContext';
import { uploadProfileImage } from '../services/profileImage';
import { formatNip, formatCelular } from '../utils/format';
import { trocarSenha, mapAuthErrorMessage } from '../services/firebaseAuth';
import { updateUsuarioProfile } from '../services/firestoreUsuarios';
import { estadoNotificacoes, ativarNotificacoes, testarNotificacao, type EstadoNotificacoes } from '../services/notificacoesPush';


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
    <Card as="section" title="Notificações" className="space-y-3">
      <p className={`text-sm font-bold ${estado === 'ativadas' ? 'text-green' : estado === 'bloqueadas' ? 'text-wine' : 'text-navy'}`}>{titulo}</p>
      <p className="text-xs text-ink-3 leading-relaxed">{texto}</p>
      {estado === 'ativadas' && (
        <div className="pt-2 flex flex-col items-end gap-2">
          <Button variant="secondary" icon="send" loading={testando} onClick={testar}>{testando ? 'Enviando…' : 'Enviar notificação de teste'}</Button>
          {resultadoTeste && (
            <p className={`text-xs font-semibold self-stretch ${resultadoTeste.ok ? 'text-green' : 'text-wine'}`}>{resultadoTeste.msg}</p>
          )}
        </div>
      )}
      {estado === 'pendente' && (
        <div className="pt-2 flex justify-end">
          <Button icon="notifications_active" loading={ativando} onClick={ativar}>{ativando ? 'Ativando…' : 'Ativar notificações'}</Button>
        </div>
      )}
    </Card>
  );
};

const InfoField: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div>
    <span className="text-xs font-semibold text-ink-3 block">{label}</span>
    <span className="text-sm font-semibold text-navy">{value || '—'}</span>
  </div>
);

const VARIANTES_DESCRICAO: Record<VarianteEscuro, string> = {
  marinho: 'Superfícies derivadas do azul marinho: mantém a identidade da Marinha.',
  grafite: 'Cinzas neutros: melhor para leitura longa (normas, laudos).',
  oled: 'Preto real: menos brilho e bateria em telas OLED, no plantão noturno.',
};

/** Meu perfil → Aparência (auditoria v3, 4f): Sistema · Claro · Escuro e a variante do escuro. */
const AparenciaCard: React.FC<{ uid?: string }> = ({ uid }) => {
  const tema = useTema();
  const salvar = (p: Partial<{ modo: ModoTema; variante: VarianteEscuro }>) => {
    const novo = tema.definir(p);
    if (uid) updateUsuarioProfile(uid, { aparencia: novo }).catch(() => { /* fica só neste aparelho */ });
  };
  return (
    <Card as="section" title="Aparência">
      <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-ink-3 mb-1">Tema</p>
        <Segmented<ModoTema>
          ariaLabel="Tema"
          value={tema.modo}
          onChange={modo => salvar({ modo })}
          options={[
            { value: 'sistema', label: 'Sistema', icon: 'contrast' },
            { value: 'claro', label: 'Claro', icon: 'light_mode' },
            { value: 'escuro', label: 'Escuro', icon: 'dark_mode' },
          ]}
        />
        <p className="mt-1 text-xs text-ink-3">“Sistema” segue o claro/escuro do aparelho. PDFs, e-mails e minutas não mudam.</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-ink-3 mb-1">Variante do tema escuro</p>
        <Segmented<VarianteEscuro>
          ariaLabel="Variante do tema escuro"
          value={tema.variante}
          onChange={variante => salvar({ variante })}
          options={[
            { value: 'marinho', label: 'Marinho' },
            { value: 'grafite', label: 'Grafite' },
            { value: 'oled', label: 'OLED' },
          ]}
        />
        <p className="mt-1 text-xs text-ink-3">{VARIANTES_DESCRICAO[tema.variante]}</p>
      </div>
      </div>
    </Card>
  );
};

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
    if (!emailInstitucionalValido(email)) { showToast('error', MSG_EMAIL_INSTITUCIONAL); return; }
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
    <Page size="form" title="Meu perfil" description="Seus dados de contato, foto, aparência e senha de acesso.">
      <Toast message={toast?.msg ?? null} tone={toast?.type === 'error' ? 'error' : 'success'} />

      <div className="space-y-6">
        {/* FOTO DE PERFIL EM DESTAQUE */}
        <Card className="flex flex-col items-center">
          <div className="relative">
            {authUser?.imageProfile ? (
              <img
                src={authUser.imageProfile}
                alt={authUser?.nome}
                className="w-28 h-28 rounded-full object-cover border-4 border-line "
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-thead border-4 border-line flex items-center justify-center">
                <span className="material-symbols-outlined text-[56px] text-ink-3">person</span>
              </div>
            )}
            <IconButton
              icon={uploading ? 'progress_activity' : 'photo_camera'}
              label="Alterar foto de perfil"
              variant="primary"
              size="sm"
              onClick={handleImageClick}
              disabled={uploading}
              className={`absolute bottom-0 right-0 !rounded-full ring-2 ring-white ${uploading ? '[&>span]:animate-spin' : ''}`}
            />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>
          <h2 className="mt-4 text-h2 text-navy text-center">{authUser?.nome}</h2>
          <p className="text-xs text-ink-3 font-semibold">{authUser?.postoGraduacao || authUser?.usuario}</p>
        </Card>

        {/* DADOS FUNCIONAIS (SOMENTE LEITURA) */}
        <Card as="section" title="Dados funcionais">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoField label="Usuário" value={authUser?.usuario} />
            <InfoField label="Posto/Graduação" value={authUser?.postoGraduacao} />
            <InfoField label="Cargo" value={authUser?.cargo} />
            <InfoField label="NIP" value={formatNip(authUser?.nip)} />
            <InfoField label="CRM-PE" value={authUser?.crmPe} />
            <InfoField label="RQE" value={authUser?.rqe} />
          </div>
        </Card>

        {/* CONTATO (EDITÁVEL) */}
        <form onSubmit={handleSalvarContato}>
          <Card as="section" title="Informações de contato" className="space-y-4">
            <Field label="E-mail institucional" error={!emailInstitucionalValido(email) ? MSG_EMAIL_INSTITUCIONAL : undefined}>
              {a => <input {...a} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@marinha.mil.br" />}
            </Field>
            <Field label="E-mail Google (Gmail)">
              {a => <input {...a} type="email" value={gmail} onChange={e => setGmail(e.target.value)} placeholder="nome@gmail.com" />}
            </Field>
            <Field label="Celular">
              {a => <input {...a} type="tel" inputMode="tel" value={celular} onChange={e => setCelular(formatCelular(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />}
            </Field>

            <div className="pt-2 flex justify-end">
              <Button type="submit" icon="save" loading={savingContato}>{savingContato ? 'Salvando…' : 'Salvar contato'}</Button>
            </div>
          </Card>
        </form>

        {/* APARÊNCIA (TEMA) */}
        <AparenciaCard uid={authUser?.uid} />

        {/* NOTIFICAÇÕES PUSH (POR APARELHO) */}
        {authUser && authUser.perfil !== 'user_medicos_geral' && <NotificacoesCard usuario={authUser.usuario} />}

        {/* ALTERAR SENHA (SOMENTE O PRÓPRIO USUÁRIO) */}
        <form onSubmit={handleSalvarSenha}>
          <Card as="section" title="Alterar senha" className="space-y-4">
            <Field label="Senha atual" required>
              {a => <input {...a} type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} autoComplete="current-password" required />}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nova senha" required help="Mínimo 6 caracteres">
                {a => <input {...a} type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" required />}
              </Field>
              <Field label="Confirmar nova senha" required>
                {a => <input {...a} type="password" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} autoComplete="new-password" required />}
              </Field>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" icon="key" loading={savingSenha}>{savingSenha ? 'Salvando…' : 'Alterar senha'}</Button>
            </div>
          </Card>
        </form>
      </div>
    </Page>
  );
};
