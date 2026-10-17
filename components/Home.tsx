// Ficheiro: components/Home.tsx
// Página Inicial como PAINEL (auditoria F17/F26): o que precisa de atenção
// (perícias vigentes, concurso em andamento, senha temporária), os atalhos por
// área — com os subitens sempre visíveis, sem reorganizar o layout ao clicar —
// e os últimos documentos gerados. Tudo respeita a matriz de permissões do
// perfil: cada bloco só aparece para quem tem acesso à página correspondente.
import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from './ui/Page';
import { NavContext, getPrimeiroNome } from '../context/NavContext';
import { getNavCategories, type NavCategory } from '../config/navigation';
import { canAccessPage } from '../config/permissions';
import { pathForView, concursoPath } from '../config/routes';
import { observarConcursos, type ConcursoRecord } from '../services/firestoreConcursos';
import { buscarDocumentosRecentes, type DocumentoRecente } from '../services/documentosRecentes';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { StatusTag } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';

interface Pendencia {
  id: string;
  icone: string;
  rotulo: string;
  valor: string | number;
  detalhe: string;
  to: string;
  /** Cor do número: vinho = exige ação com prazo. */
  tom: 'wine' | 'navy';
}

const CartaoPendencia: React.FC<{ p: Pendencia }> = ({ p }) => (
  <Link
    to={p.to}
    className="group flex items-start gap-3 bg-white border border-line rounded-xl p-4 hover:border-navy transition-colors"
  >
    <span className="material-symbols-outlined text-[28px] text-navy shrink-0" aria-hidden="true">{p.icone}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-semibold text-ink-3">{p.rotulo}</span>
      <span className={`block text-2xl font-extrabold leading-tight ${p.tom === 'wine' ? 'text-wine' : 'text-navy'}`}>{p.valor}</span>
      {p.detalhe && <span className="block text-sm text-ink mt-0.5">{p.detalhe}</span>}
    </span>
    <span className="material-symbols-outlined text-[20px] text-ink-4 group-hover:text-navy self-center" aria-hidden="true">chevron_right</span>
  </Link>
);

const CartaoArea: React.FC<{ cat: NavCategory; emAndamento: boolean }> = ({ cat, emAndamento }) => {
  const badge = cat.subitems.reduce((acc, s) => acc + (s.badge || 0), 0);
  const unico = cat.subitems.length === 1;
  const corpo = (
    <>
      <span className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[28px] text-navy shrink-0" aria-hidden="true">{cat.icon}</span>
        <span className="text-base font-bold text-navy leading-tight">{cat.label}</span>
        {emAndamento && <StatusTag tone="navy" className="ml-auto">Em andamento</StatusTag>}
        {badge > 0 && <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-wine text-white text-xs font-bold flex items-center justify-center">{badge}</span>}
      </span>
      <span className="block text-sm text-ink-3 mt-1.5">{cat.subtitle}</span>
    </>
  );

  if (unico) {
    return (
      <Link to={pathForView(cat.subitems[0].id)} className="block bg-white border border-line rounded-xl p-4 hover:border-navy transition-colors">
        {corpo}
      </Link>
    );
  }
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      {corpo}
      <ul className="mt-3 border-t border-line pt-2 -mx-1">
        {cat.subitems.map(sub => (
          <li key={sub.id}>
            <Link to={pathForView(sub.id)} className="flex items-center gap-2 min-h-[44px] px-2 rounded-lg text-sm font-semibold text-navy hover:bg-thead transition-colors">
              <span className="material-symbols-outlined text-[20px] text-ink-3" aria-hidden="true">{sub.icon}</span>
              <span className="truncate">{sub.label}</span>
              {sub.badge ? <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-wine text-white text-xs font-bold flex items-center justify-center">{sub.badge}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const Home: React.FC = () => {
  const nav = useContext(NavContext);
  const authUser = nav?.authUser || null;
  const perfil = authUser?.perfil;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;
  const isDesktop = useIsDesktop();

  const categories = getNavCategories(perfil, periciaMenorVigentes, isDesktop);
  const primeiroNome = getPrimeiroNome(authUser);

  const podeConcursos = canAccessPage('concursosJRS', perfil);
  const podePareceres = canAccessPage('pareceres', perfil);
  const podePericiaMenor = canAccessPage('pericia-menor', perfil);

  const [concursos, setConcursos] = useState<ConcursoRecord[]>([]);
  useEffect(() => observarConcursos(
    lista => setConcursos(lista),
    () => { /* silencioso: não bloqueia a Home se a checagem falhar */ },
  ), []);
  const emAndamento = concursos.filter(c => c.status === 'em_andamento');

  const [recentes, setRecentes] = useState<DocumentoRecente[] | null>(null);
  useEffect(() => {
    if (!podePareceres && !podePericiaMenor) { setRecentes([]); return; }
    let ativo = true;
    buscarDocumentosRecentes({ pareceres: podePareceres, periciaMenor: podePericiaMenor })
      .then(lista => { if (ativo) setRecentes(lista); })
      .catch(() => { if (ativo) setRecentes([]); });
    return () => { ativo = false; };
  }, [podePareceres, podePericiaMenor]);

  const pendencias: Pendencia[] = [];
  if (authUser?.senhaTemporaria) {
    pendencias.push({ id: 'senha', icone: 'key', rotulo: 'Segurança', valor: 'Senha temporária', detalhe: 'Altere a senha inicial.', to: '/perfil', tom: 'wine' });
  }
  if (podePericiaMenor && periciaMenorVigentes > 0) {
    pendencias.push({ id: 'pm', icone: 'personal_injury', rotulo: 'Perícias menores vigentes', valor: periciaMenorVigentes, detalhe: periciaMenorVigentes === 1 ? 'militar com dispensa em curso' : 'militares com dispensa em curso', to: '/pericia-menor/historico', tom: 'wine' });
  }
  if (podeConcursos && emAndamento.length > 0) {
    pendencias.push({
      id: 'concurso', icone: 'fact_check', rotulo: emAndamento.length === 1 ? 'Concurso em andamento' : 'Concursos em andamento', valor: emAndamento.length,
      detalhe: emAndamento.length === 1 ? emAndamento[0].nome : '',
      to: emAndamento.length === 1 ? concursoPath(emAndamento[0].id) : '/concursos', tom: 'navy',
    });
  }

  return (
    <Page size="data" title={`Olá, ${primeiroNome || 'Perito'}!`} description="Resumo do que precisa da sua atenção e atalhos para o seu trabalho.">
      <div className="space-y-8">
        <section aria-labelledby="home-pendencias">
          <h2 id="home-pendencias" className="eyebrow mb-3">Pendências</h2>
          {pendencias.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendencias.map(p => <CartaoPendencia key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="bg-white border border-line rounded-xl">
              <EmptyState icon="task_alt" title="Nada pendente" description="Não há perícias vigentes, concurso em andamento ou avisos de segurança para você agora." />
            </div>
          )}
        </section>

        <section aria-labelledby="home-atalhos">
          <h2 id="home-atalhos" className="eyebrow mb-3">Atalhos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {categories.map(cat => <CartaoArea key={cat.id} cat={cat} emAndamento={cat.id === 'concursos' && emAndamento.length > 0} />)}
          </div>
        </section>

        {(podePareceres || podePericiaMenor) && (
          <section aria-labelledby="home-recentes">
            <h2 id="home-recentes" className="eyebrow mb-3">Últimos documentos gerados</h2>
            <div className="bg-white border border-line rounded-xl overflow-clip">
              {recentes === null ? (
                <p className="p-5 text-sm text-ink-3" role="status">Carregando documentos…</p>
              ) : recentes.length === 0 ? (
                <EmptyState icon="description" title="Nenhum documento recente" description="Os pareceres e as perícias menores gerados aparecem aqui." />
              ) : (
                <ul className="divide-y divide-line">
                  {recentes.map((d, i) => (
                    <li key={`${d.tipo}-${i}`}>
                      <a
                        href={d.link || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 px-4 min-h-[56px] py-2 ${d.link ? 'hover:bg-thead' : 'pointer-events-none'} transition-colors`}
                      >
                        <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{d.tipo === 'parecer' ? 'description' : 'personal_injury'}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-navy truncate">{d.titulo}</span>
                          <span className="block text-xs text-ink-3 truncate">{d.tipo === 'parecer' ? 'Parecer' : 'Perícia Menor'}{d.detalhe ? ` · ${d.detalhe}` : ''}</span>
                        </span>
                        <span className="text-xs text-ink-3 shrink-0">{d.data}</span>
                        {d.link && <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">open_in_new</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </Page>
  );
};
