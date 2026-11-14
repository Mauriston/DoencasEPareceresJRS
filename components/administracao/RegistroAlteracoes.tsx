// Ficheiro: components/administracao/RegistroAlteracoes.tsx
// Administração › Registro de alterações (auditoria v3, 8b): quem mudou o quê e quando, a partir de
// auditoria_acoes (só o Admin lê; registros imutáveis). Gravam aqui: permissões, criação/edição/perfil/
// ativação/exclusão/senha de usuários, e-mails automáticos e turnos da agenda — além das ações sensíveis que
// já eram registradas (exclusões, importações, documentos gerados, afastamentos), visíveis em "Tudo".
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { SearchField } from '../ui/Field';
import { FilterChip } from '../ui/FilterChip';
import { listarAcoesRecentes, type RegistroAcao } from '../../services/auditoriaAcoes';
import type { UsuarioRecord } from '../../services/firestoreUsuarios';
import { dataHoraCurta } from '../../utils/administracao';

const ROTULO_ACAO: Record<string, string> = {
  'permissoes.alterar': 'Permissões alteradas',
  'usuario.criar': 'Usuário criado',
  'usuario.editar': 'Dados do usuário alterados',
  'usuario.perfil': 'Perfil do usuário alterado',
  'usuario.ativacao': 'Ativação do usuário',
  'usuario.excluir': 'Usuário excluído',
  'usuario.senha': 'Senha redefinida',
  'militar.excluir': 'Inspecionado excluído',
  'militar.importarCsv': 'Inspecionados importados (CSV)',
  'inspecao.excluir': 'IS excluída',
  'documento.gerar': 'Documento gerado',
  'afastamento.criar': 'Afastamento criado',
  'afastamento.alterar': 'Afastamento alterado',
  'afastamento.apagar': 'Afastamento apagado',
};

export const rotuloAcao = (r: Pick<RegistroAcao, 'acao' | 'alvo'>): string => {
  if (r.acao === 'config.alterar') return r.alvo === 'emails' ? 'E-mails automáticos alterados' : r.alvo === 'agendaIS' ? 'Turnos da agenda alterados' : 'Configuração alterada';
  return ROTULO_ACAO[r.acao] || r.acao;
};

type Filtro = 'config' | 'tudo';
const DA_ADMINISTRACAO = (a: string) => a.startsWith('usuario.') || a === 'permissoes.alterar' || a === 'config.alterar';

/** Alvo legível: login do usuário (resolvido pelo uid) ou o documento alterado. */
const alvoLegivel = (r: RegistroAcao, porUid: Map<string, UsuarioRecord>): string => {
  if (r.acao.startsWith('usuario.')) return porUid.get(r.alvo)?.usuario || 'usuário excluído';
  return '';
};

export const ListaRegistros: React.FC<{ registros: RegistroAcao[]; usuarios: UsuarioRecord[]; compacta?: boolean }> = ({ registros, usuarios, compacta = false }) => {
  const porUid = useMemo(() => new Map(usuarios.map(u => [u.id, u])), [usuarios]);
  return (
    <ul className="divide-y divide-line">
      {registros.map(r => {
        const alvo = alvoLegivel(r, porUid);
        return (
          <li key={r.id} className={`py-2.5 ${compacta ? '' : 'px-5'} grid gap-1 @[40rem]:grid-cols-[8rem_minmax(0,1fr)]`}>
            <span className="text-xs text-ink-3 tabular-nums">{dataHoraCurta(r.em)}</span>
            <span className="min-w-0">
              <span className="block text-sm text-ink">
                <strong className="text-navy">{rotuloAcao(r)}</strong>
                {alvo && <> · {alvo}</>}
                {!compacta && <span className="text-ink-3"> · por {r.usuario || 'usuário'}</span>}
              </span>
              {r.detalhe.length > 0 && (
                <ul className="mt-0.5 text-xs text-ink-3 space-y-0.5">
                  {r.detalhe.slice(0, 8).map((d, i) => <li key={i} className="break-words">{d}</li>)}
                  {r.detalhe.length > 8 && <li>… e mais {r.detalhe.length - 8}</li>}
                </ul>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export const RegistroAlteracoes: React.FC<{ usuarios: UsuarioRecord[] }> = ({ usuarios }) => {
  const [registros, setRegistros] = useState<RegistroAcao[] | null>(null);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('config');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setErro('');
    setRegistros(null);
    try { setRegistros(await listarAcoesRecentes(300)); } catch { setErro('Não foi possível carregar o registro.'); setRegistros([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const porUid = useMemo(() => new Map(usuarios.map(u => [u.id, u])), [usuarios]);
  const visiveis = (registros || []).filter(r => {
    if (filtro === 'config' && !DA_ADMINISTRACAO(r.acao)) return false;
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return [rotuloAcao(r), r.usuario, alvoLegivel(r, porUid), ...r.detalhe].some(t => t.toLowerCase().includes(q));
  });

  return (
    <Card as="section" padding="none" titleAs="h2" title="Registro de alterações" actions={<Button size="sm" variant="ghost" icon="refresh" onClick={carregar}>Atualizar</Button>}>
      <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
        <FilterChip ativo={filtro === 'config'} onAlternar={() => setFiltro('config')}>Administração</FilterChip>
        <FilterChip ativo={filtro === 'tudo'} onAlternar={() => setFiltro('tudo')}>Tudo</FilterChip>
        <SearchField value={busca} onChange={setBusca} label="Buscar no registro" placeholder="Ação, quem ou detalhe" className="flex-1 min-w-[14rem]" />
      </div>
      <div className="border-t border-line @container">
        {registros === null ? <p className="px-5 py-6 text-sm text-ink-3">Carregando…</p>
          : erro ? <p className="px-5 py-6 text-sm font-semibold text-wine" role="alert">{erro}</p>
          : visiveis.length === 0 ? <EmptyState icon="history" title="Nada registrado" description={filtro === 'config' ? 'As alterações de permissões, usuários, e-mails e agenda feitas a partir de agora aparecem aqui.' : 'Nenhum registro encontrado.'} />
          : <ListaRegistros registros={visiveis} usuarios={usuarios} />}
      </div>
      {registros && registros.length >= 300 && <p className="px-5 py-3 border-t border-line text-xs text-ink-3">Mostrando os 300 registros mais recentes.</p>}
    </Card>
  );
};
