// Ficheiro: components/usuarios/FormUsuario.tsx
// Formulário de usuário (Administração › Usuários — auditoria v3, U4/U6): Drawer padrão do DS (lateral no
// desktop, sheet no celular) com Field em todos os campos. CRM/RQE só para perfis médicos; NIP e celular com
// máscara; e-mails sem maiúsculas; o perfil mostra a descrição do que ele acessa (lida da matriz atual).
// As regras de gravação são as de antes (nome e login em maiúsculas ao salvar; login imutável depois de criado;
// e-mail institucional só @marinha.mil.br). Ativar/desativar não fica aqui: é no detalhe, com confirmação.
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Field } from '../ui/Field';
import { emailInstitucionalValido, MSG_EMAIL_INSTITUCIONAL } from '../../utils/emails';
import { formatCelular, formatNip } from '../../utils/format';
import { SENHA_INICIAL_PADRAO } from '../../config/senha';
import { PAGE_DEFS, ROLES, canAccessPage } from '../../config/permissions';
import { PERFIL_DESCRICAO, ehPerfilMedico, rotuloPerfil } from '../../utils/administracao';
import type { UsuarioRecord } from '../../services/firestoreUsuarios';

export interface DadosFormUsuario {
  usuario: string; postoGraduacao: string; cargo: string; nome: string; nip: string;
  crmPe: string; rqe: string; email: string; gmail: string; celular: string; perfil: string;
}

export const FORM_VAZIO: DadosFormUsuario = {
  usuario: '', postoGraduacao: '', cargo: '', nome: '', nip: '', crmPe: '', rqe: '', email: '', gmail: '', celular: '', perfil: 'user_secretaria',
};

export const formDoUsuario = (u: UsuarioRecord): DadosFormUsuario => ({
  usuario: u.usuario, postoGraduacao: u.postoGraduacao || '', cargo: u.cargo || '', nome: u.nome || '', nip: formatNip(u.nip),
  crmPe: u.crmPe || '', rqe: u.rqe || '', email: u.email || '', gmail: u.gmail || '', celular: formatCelular(u.celular), perfil: u.perfil || 'user_secretaria',
});

const PERFIS = ['admin', ...ROLES.map(r => r.id)];

/** "Acessa: Inspeções de Saúde, Concursos… (N páginas)" pela matriz em uso. */
export const paginasDoPerfil = (perfil: string): string[] =>
  PAGE_DEFS.filter(p => canAccessPage(p.id, perfil)).map(p => p.label);

interface Props {
  /** Editando (login travado) ou criando. */
  editando: UsuarioRecord | null;
  onCancelar: () => void;
  /** Devolve uma mensagem de erro para mostrar no formulário, ou null em caso de sucesso. */
  onSalvar: (dados: DadosFormUsuario) => Promise<string | null>;
}

export const FormUsuario: React.FC<Props> = ({ editando, onCancelar, onSalvar }) => {
  const [f, setF] = useState<DadosFormUsuario>(() => (editando ? formDoUsuario(editando) : FORM_VAZIO));
  const [erro, setErro] = useState('');
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const set = (patch: Partial<DadosFormUsuario>) => setF(x => ({ ...x, ...patch }));

  const erros = {
    usuario: !editando && !f.usuario.trim() ? 'Informe o login.' : '',
    nome: !f.nome.trim() ? 'Informe o nome completo.' : '',
    nip: !editando && !f.nip.trim() ? 'Informe o NIP — é com ele que o usuário faz login.' : '',
    email: !emailInstitucionalValido(f.email) ? MSG_EMAIL_INSTITUCIONAL : '',
  };
  const temErro = Object.values(erros).some(Boolean);
  const medico = ehPerfilMedico(f.perfil);
  const paginas = paginasDoPerfil(f.perfil);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setTentou(true);
    setErro('');
    if (temErro) return;
    setSalvando(true);
    try {
      const msg = await onSalvar(f);
      if (msg) setErro(msg);
    } finally {
      setSalvando(false);
    }
  };
  const mostrar = (k: keyof typeof erros) => (tentou || k === 'email' ? erros[k] || undefined : undefined);
  const formId = 'form-usuario';

  return (
    <Drawer
      title={editando ? 'Editar usuário' : 'Adicionar usuário'}
      icon={editando ? 'manage_accounts' : 'person_add'}
      onClose={() => { if (!salvando) onCancelar(); }}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancelar} disabled={salvando}>Cancelar</Button>
          <Button type="submit" form={formId} icon="save" loading={salvando}>{editando ? 'Salvar alterações' : 'Criar usuário'}</Button>
        </>
      )}
    >
      <form id={formId} onSubmit={enviar} noValidate className="space-y-4">
        {erro && <p role="alert" className="rounded-lg border border-wine/30 bg-wine/10 p-3 text-sm font-semibold text-wine">{erro}</p>}
        {!editando && (
          <p className="flex items-start gap-2 rounded-lg border border-line bg-paper p-3 text-sm text-ink">
            <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">info</span>
            O login é feito com o NIP, e a senha inicial é {SENHA_INICIAL_PADRAO}. O usuário será orientado a trocá-la no primeiro acesso.
          </p>
        )}

        <Field label="Perfil de acesso" required help={`${PERFIL_DESCRICAO[f.perfil] || ''} Acessa ${paginas.length} ${paginas.length === 1 ? 'página' : 'páginas'}: ${paginas.slice(0, 6).join(', ')}${paginas.length > 6 ? '…' : '.'}`}>
          {a => (
            <select {...a} value={f.perfil} onChange={e => set({ perfil: e.target.value })}>
              {PERFIS.map(p => <option key={p} value={p}>{rotuloPerfil(p)}</option>)}
            </select>
          )}
        </Field>

        <Field label="Login (nome de usuário)" required={!editando} error={mostrar('usuario')} help={editando ? 'Não pode ser alterado depois de criado (é a identidade de login).' : 'Posto e nome de guerra, ex.: CT MAURISTON. Gravado em maiúsculas.'}>
          {a => <input {...a} value={f.usuario} disabled={!!editando} autoComplete="off" onChange={e => set({ usuario: e.target.value })} />}
        </Field>

        <Field label="Nome completo" required error={mostrar('nome')} help="Gravado em maiúsculas.">
          {a => <input {...a} value={f.nome} autoComplete="off" onChange={e => set({ nome: e.target.value })} />}
        </Field>

        <div className="@container">
          <div className="grid gap-4 @md:grid-cols-2">
            <Field label="Posto/graduação">
              {a => <input {...a} value={f.postoGraduacao} placeholder="Ex.: Capitão-Tenente (Md)" onChange={e => set({ postoGraduacao: e.target.value })} />}
            </Field>
            <Field label="Cargo">
              {a => <input {...a} value={f.cargo} placeholder="Ex.: Membro" onChange={e => set({ cargo: e.target.value })} />}
            </Field>
            <Field label="NIP" required={!editando} error={mostrar('nip')}>
              {a => <input {...a} value={f.nip} inputMode="numeric" placeholder="00.0000.00" maxLength={10} className={`${a.className} tabular-nums`} onChange={e => set({ nip: formatNip(e.target.value) })} />}
            </Field>
            <Field label="Celular">
              {a => <input {...a} value={f.celular} inputMode="tel" placeholder="(00) 00000-0000" maxLength={15} className={`${a.className} tabular-nums`} onChange={e => set({ celular: formatCelular(e.target.value) })} />}
            </Field>
            {medico && (
              <>
                <Field label="CRM-PE" help="Opcional.">
                  {a => <input {...a} value={f.crmPe} inputMode="numeric" onChange={e => set({ crmPe: e.target.value })} />}
                </Field>
                <Field label="RQE" help="Opcional.">
                  {a => <input {...a} value={f.rqe} inputMode="numeric" onChange={e => set({ rqe: e.target.value })} />}
                </Field>
              </>
            )}
          </div>
        </div>

        <Field label="E-mail institucional" error={mostrar('email')} help="Termina em @marinha.mil.br.">
          {a => <input {...a} type="email" inputMode="email" autoCapitalize="off" spellCheck={false} value={f.email} placeholder="exemplo@marinha.mil.br" onChange={e => set({ email: e.target.value })} />}
        </Field>
        <Field label="E-mail Google (Gmail)" help="Usado nos convites do Google Agenda.">
          {a => <input {...a} type="email" inputMode="email" autoCapitalize="off" spellCheck={false} value={f.gmail} placeholder="exemplo@gmail.com" onChange={e => set({ gmail: e.target.value })} />}
        </Field>
      </form>
    </Drawer>
  );
};
