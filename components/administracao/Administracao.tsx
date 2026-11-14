// Ficheiro: components/administracao/Administracao.tsx
// Área "Administração" (só Admin; auditoria v3, 8b/8c — U3/CF4). Um lugar para o Admin: sub-navegação 3 + 9
// (GradeIndice proporcao="3-9") com Usuários · Perfis e permissões · E-mails automáticos · Agenda das IS ·
// Integrações · Registro de alterações, e atalhos para os ajustes que continuam onde são usados (quesitos dos
// pareceres, bloqueios de agenda, importação da escala). Rotas: /administracao/{secao}; /usuarios e
// /configuracoes são aliases (config/routes.ts). No celular, /administracao é a lista de seções com o estado
// de cada uma; cada item abre a subpágina, com "‹" de volta para a lista (trilha da topbar).
// Diálogos, drawers e toasts das subpáginas vão para o <body> (NoCorpo): o GradeIndice usa @container.
import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Container, PageHeader } from '../ui/Page';
import { Card } from '../ui/Card';
import { GradeIndice } from '../ui/Grade';
import { useBreadcrumbs } from '../../context/BreadcrumbContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { administracaoPath, type SecaoAdministracao } from '../../config/routes';
import { ROLES } from '../../config/permissions';
import { TIPOS_EMAIL } from '../../config/emails';
import { listUsuarios, type UsuarioRecord } from '../../services/firestoreUsuarios';
import { observarConfigEmails } from '../../services/configEmails';
import { observarConfigAgenda } from '../../services/firestoreInspecoes';
import { listarAcoesRecentes } from '../../services/auditoriaAcoes';
import { UsuariosManagement } from '../UsuariosManagement';
import { useSituacaoContaGoogle } from '../usuarios/ContaGoogleServidor';
import { ultimoAcessoDe } from '../usuarios/DetalheUsuario';
import { PerfisPermissoes } from './PerfisPermissoes';
import { EmailsAutomaticos } from './EmailsAutomaticos';
import { AgendaIS } from './AgendaIS';
import { Integracoes } from './Integracoes';
import { RegistroAlteracoes } from './RegistroAlteracoes';
import { dataHoraCurta, plural, semAcessoHa, ultimoAcessoRelativo } from '../../utils/administracao';

interface SecaoDef { id: SecaoAdministracao; rotulo: string; icone: string; descricao: string }

export const SECOES: SecaoDef[] = [
  { id: 'usuarios', rotulo: 'Usuários', icone: 'group', descricao: 'Cadastro, perfil, último acesso e situação de cada usuário.' },
  { id: 'perfis', rotulo: 'Perfis e permissões', icone: 'verified_user', descricao: 'O que cada perfil acessa: páginas e funções.' },
  { id: 'emails', rotulo: 'E-mails automáticos', icone: 'mail', descricao: 'Destinatários fixos, assinaturas e testes de cada e-mail.' },
  { id: 'agenda', rotulo: 'Agenda das IS', icone: 'schedule', descricao: 'Turnos em que cada perito atende.' },
  { id: 'integracoes', rotulo: 'Integrações', icone: 'hub', descricao: 'Conta Google do servidor, Google Agenda e Apps Script.' },
  { id: 'registro', rotulo: 'Registro de alterações', icone: 'history', descricao: 'Quem mudou o quê e quando.' },
];

const ATALHOS: { rotulo: string; to: string }[] = [
  { rotulo: 'quesitos dos pareceres', to: '/pareceres' },
  { rotulo: 'bloqueios de agenda', to: '/inspecoes' },
  { rotulo: 'importar escala', to: '/escala' },
];

const Atalhos: React.FC = () => (
  <p className="text-xs text-ink-3 mt-3">
    Também configurável:{' '}
    {ATALHOS.map((a, i) => (
      <React.Fragment key={a.to}>
        {i > 0 && ', '}
        <Link to={a.to} className="text-blue underline underline-offset-2 hover:text-navy">{a.rotulo}</Link>
      </React.Fragment>
    ))}
    .
  </p>
);

/** Estado de cada seção (lista do celular): só carregado ali. */
const useEstadoSecoes = (ativo: boolean, usuarios: UsuarioRecord[]) => {
  const [emailsAlterado, setEmailsAlterado] = useState<Date | null>(null);
  const [peritosComTurno, setPeritosComTurno] = useState<number | null>(null);
  const [ultimoRegistro, setUltimoRegistro] = useState<Date | null | undefined>(undefined);
  useEffect(() => {
    if (!ativo) return;
    const a = observarConfigEmails((_c, m) => setEmailsAlterado(m.geral?.em ?? null));
    const b = observarConfigAgenda(c => setPeritosComTurno(Object.values(c).filter(p => Object.values(p || {}).some(d => d?.manha || d?.tarde)).length));
    listarAcoesRecentes(1).then(r => setUltimoRegistro(r[0]?.em ?? null)).catch(() => setUltimoRegistro(null));
    return () => { a(); b(); };
  }, [ativo]);
  const ativos = usuarios.filter(u => u.ativo);
  const semAcesso = ativos.filter(u => semAcessoHa(ultimoAcessoDe(u), 30)).length;
  return { ativos: ativos.length, semAcesso, emailsAlterado, peritosComTurno, ultimoRegistro };
};

export const Administracao: React.FC = () => {
  const { secao } = useParams<{ secao?: string }>();
  const isDesktop = useIsDesktop();
  const [usuarios, setUsuarios] = useState<UsuarioRecord[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const conta = useSituacaoContaGoogle();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga(false);
    try { setUsuarios(await listUsuarios()); } catch { setErroCarga(true); } finally { setCarregando(false); }
  }, []);
  useEffect(() => { void recarregar(); }, [recarregar]);

  const atual = SECOES.find(s => s.id === secao) || null;
  useBreadcrumbs(atual ? [{ label: atual.rotulo }] : null);
  const listaCelular = !isDesktop && !atual;
  const estado = useEstadoSecoes(listaCelular, usuarios);

  if (secao && !atual) return <Navigate to={administracaoPath('usuarios')} replace />;
  if (!secao && isDesktop) return <Navigate to={administracaoPath('usuarios')} replace />;

  const contador: Partial<Record<SecaoAdministracao, number>> = { usuarios: usuarios.length, perfis: ROLES.length, emails: TIPOS_EMAIL.length };

  const estadoDe = (id: SecaoAdministracao): string => {
    switch (id) {
      case 'usuarios': return carregando ? 'Carregando…' : `${plural(estado.ativos, 'ativo', 'ativos')} · ${estado.semAcesso} sem acesso há 30 dias`;
      case 'perfis': return plural(ROLES.length, 'perfil', 'perfis') + ' editáveis · Admin com acesso total';
      case 'emails': return `${plural(TIPOS_EMAIL.length, 'e-mail', 'e-mails')}${estado.emailsAlterado ? ` · alterado em ${dataHoraCurta(estado.emailsAlterado).split(' ')[0]}` : ''}`;
      case 'agenda': return estado.peritosComTurno === null ? 'Turnos dos peritos' : `turnos de ${plural(estado.peritosComTurno, 'perito', 'peritos')}`;
      case 'integracoes': return !conta.situacao ? (conta.erro ? 'Servidor indisponível' : 'Consultando…') : conta.situacao.autorizado ? 'Conta Google autorizada' : 'Conta Google não autorizada · Apps Script em uso';
      case 'registro': return estado.ultimoRegistro === undefined ? 'Carregando…' : estado.ultimoRegistro ? `último: ${ultimoAcessoRelativo(estado.ultimoRegistro)}` : 'Nada registrado ainda';
      default: return '';
    }
  };

  if (listaCelular) {
    return (
      <Container size="data" className="py-6 pb-10">
        <PageHeader title="Administração" description="Usuários, permissões e ajustes do app · só Admin" />
        <Card padding="none" as="section" aria-label="Seções da Administração">
          <ul className="divide-y divide-line">
            {SECOES.map(s => (
              <li key={s.id}>
                <Link to={administracaoPath(s.id)} className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-thead">
                  <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{s.icone}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-navy">{s.rotulo}</span>
                    <span className="block text-xs text-ink-3">{estadoDe(s.id)}</span>
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">chevron_right</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Atalhos />
      </Container>
    );
  }

  const conteudo = (() => {
    switch (atual!.id) {
      case 'usuarios': return <UsuariosManagement usuarios={usuarios} setUsuarios={setUsuarios} carregando={carregando} erroCarga={erroCarga} recarregar={recarregar} />;
      case 'perfis': return <PerfisPermissoes usuarios={usuarios} />;
      case 'emails': return <EmailsAutomaticos />;
      case 'agenda': return <AgendaIS />;
      case 'integracoes': return <Integracoes conta={conta} />;
      case 'registro': return <RegistroAlteracoes usuarios={usuarios} />;
      default: return null;
    }
  })();

  const indice = (
    <div>
      <ul className="space-y-0.5">
        {SECOES.map(s => {
          const ativo = s.id === atual!.id;
          return (
            <li key={s.id}>
              <Link
                to={administracaoPath(s.id)}
                aria-current={ativo ? 'page' : undefined}
                className={`relative flex items-center gap-3 min-h-[40px] px-3 rounded-lg text-sm transition-colors ${ativo ? 'bg-thead text-navy font-bold' : 'text-ink font-semibold hover:bg-thead hover:text-navy'}`}
              >
                {ativo && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-gold rounded-r-full" aria-hidden="true" />}
                <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">{s.icone}</span>
                <span className="flex-1 min-w-0 truncate">{s.rotulo}</span>
                {contador[s.id] !== undefined && <span className="text-xs text-ink-3 tabular-nums">{contador[s.id]}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <Atalhos />
    </div>
  );

  return (
    <Container size="data" className="py-6 md:py-8 pb-10">
      <PageHeader
        title={isDesktop ? 'Administração' : atual!.rotulo}
        description={isDesktop ? 'Usuários, permissões e ajustes do app · só Admin' : atual!.descricao}
      />
      {isDesktop ? (
        <GradeIndice proporcao="3-9" indiceFixo rotuloIndice="Seções da Administração" indice={indice} conteudo={conteudo} />
      ) : conteudo}
    </Container>
  );
};
