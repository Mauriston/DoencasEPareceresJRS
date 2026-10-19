// Ficheiro: components/Home.tsx
// Início como PAINEL DE TRABALHO (auditoria v2, N4/G3/L4): "Precisa de atenção" (pareceres
// atrasados, perícias vigentes, concurso em andamento, IS marcadas para hoje, senha temporária),
// "Próximas Inspeções", "Pareceres não concluídos" e "Perícias Menores Vigentes" (cada um só aparece
// quando há itens), "Acesso rápido" (até 6 páginas, editável e guardado no
// aparelho) e "Avisos" (Casos Periciais e instalação do app — antes eram diálogos em
// sequência no login). O menu lateral já lista as páginas: a Home não o repete.
// Tudo respeita a matriz de permissões: cada bloco só aparece para quem tem acesso.
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from './ui/Page';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { StatusTag, type StatusTone } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { NavContext, getPrimeiroNome } from '../context/NavContext';
import { getNavCategories } from '../config/navigation';
import { canAccessPage, canUseFeature } from '../config/permissions';
import { pathForView, concursoPath, concursosDiaPath } from '../config/routes';
import { observarConcursos, type ConcursoRecord } from '../services/firestoreConcursos';
import { observarPareceres, statusEfetivo, type ParecerRecord } from '../services/firestorePareceres';
import { observarInspecoes, type InspecaoRecord } from '../services/firestoreInspecoes';
import { MiniCalendarioIS } from './inspecoes/MiniCalendarioIS';
import { useDiasConcursos } from '../hooks/useDiasConcursos';
import { hojeISO, dataDeEntrevista, horaDeEntrevista, dataBr } from '../utils/inspecoes';
import { observarPericiasMenores, statusPericia, dataBR, type PericiaMenorRecord } from '../services/firestorePericiasMenores';
import { extrairNomeInspecionado } from '../utils/format';
import { useIsDesktop } from '../hooks/useIsDesktop';
import type { NavItem } from '../types';

interface Atencao {
  id: string;
  icone: string;
  titulo: string;
  detalhe: string;
  tag: string;
  tom: StatusTone;
  to: string;
}

const PADRAO_RAPIDO: NavItem[] = ['guide', 'exames', 'dgpm406', 'concursosJRS', 'concursos'];
const MAX_RAPIDO = 6;

const saudacao = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
const dataPorExtenso = (): string => {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const Secao: React.FC<{ id: string; titulo: string; acao?: React.ReactNode; children: React.ReactNode }> = ({ id, titulo, acao, children }) => (
  <section aria-labelledby={id} className="bg-white border border-line rounded-xl">
    <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
      <h2 id={id} className="text-h3 font-bold text-navy">{titulo}</h2>
      {acao}
    </div>
    {children}
  </section>
);

/** Linha de documento: abre o PDF (nova aba) quando existe; senão leva à página do assunto. */
const LinhaDocumento: React.FC<{ icone: string; titulo: string; detalhe: string; data: string; link: string; to: string; tag: React.ReactNode }> = ({ icone, titulo, detalhe, data, link, to, tag }) => {
  const corpo = (
    <>
      <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-navy truncate">{titulo}</span>
        <span className="block text-xs text-ink-3 truncate">{detalhe}</span>
      </span>
      <span className="text-xs text-ink-3 shrink-0">{data}</span>
      {tag}
      <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">{link ? 'open_in_new' : 'chevron_right'}</span>
    </>
  );
  const classe = 'flex items-center gap-3 px-4 min-h-[56px] py-2 hover:bg-thead transition-colors';
  return link
    ? <a href={link} target="_blank" rel="noopener noreferrer" className={classe}>{corpo}</a>
    : <Link to={to} className={classe}>{corpo}</Link>;
};

export const Home: React.FC = () => {
  const nav = useContext(NavContext);
  const authUser = nav?.authUser || null;
  const perfil = authUser?.perfil;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;
  const isDesktop = useIsDesktop();

  const categorias = getNavCategories(perfil, periciaMenorVigentes, isDesktop);
  const paginas = categorias.flatMap(c => c.subitems);
  const primeiroNome = getPrimeiroNome(authUser);

  const podeConcursos = canAccessPage('concursosJRS', perfil);
  const podePareceres = canAccessPage('pareceres', perfil);
  const podeInspecoes = canAccessPage('inspecoes', perfil);
  const podePericiaMenor = canAccessPage('pericia-menor', perfil);
  const podeGerarParecer = podePareceres && canUseFeature('pareceres.gerar', perfil);
  const podeNovaPericia = canUseFeature('pericia-menor.novo', perfil);

  const [concursos, setConcursos] = useState<ConcursoRecord[]>([]);
  useEffect(() => observarConcursos(setConcursos, () => { /* silencioso: não bloqueia a Home */ }), []);
  const emAndamento = concursos.filter(c => c.status === 'em_andamento');

  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  useEffect(() => (podePareceres ? observarPareceres(setPareceres, () => { /* silencioso */ }) : undefined), [podePareceres]);
  const atrasados = useMemo(() => pareceres.filter(p => statusEfetivo(p) === 'atrasado'), [pareceres]);

  // Inspeções de Saúde agendadas: "Próximas Inspeções", item de atenção (hoje) e mini calendário.
  const [inspecoes, setInspecoes] = useState<InspecaoRecord[]>([]);
  useEffect(() => (podeInspecoes ? observarInspecoes(setInspecoes, () => { /* silencioso */ }) : undefined), [podeInspecoes]);
  const { dias: diasConcursos } = useDiasConcursos(podeInspecoes || podeConcursos);
  const hoje = hojeISO();
  const proximas = useMemo(() => inspecoes
    .filter(i => i.dataEntrevista && i.status !== 'cancelada' && i.situacao !== 'finalizada' && dataDeEntrevista(i.dataEntrevista) >= hoje)
    .sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista) || a.is - b.is), [inspecoes, hoje]);
  const deHoje = useMemo(() => proximas.filter(i => dataDeEntrevista(i.dataEntrevista) === hoje), [proximas, hoje]);
  const nomeDe = (i: InspecaoRecord) => i.inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '') || i.inspecionado;

  // Pareceres ainda não concluídos (solicitados e atrasados), os mais antigos primeiro.
  const naoConcluidos = useMemo(() => pareceres
    .filter(p => p.status !== 'concluido')
    .sort((a, b) => (a.criadoEm?.toMillis?.() ?? 0) - (b.criadoEm?.toMillis?.() ?? 0)), [pareceres]);

  // Perícias menores vigentes (dispensa em curso), as que terminam primeiro no topo.
  const [pericias, setPericias] = useState<PericiaMenorRecord[]>([]);
  useEffect(() => (podePericiaMenor ? observarPericiasMenores(setPericias, () => { /* silencioso */ }) : undefined), [podePericiaMenor]);
  const vigentes = useMemo(() => pericias.filter(p => statusPericia(p) === 'vigente').sort((a, b) => a.dataTermino.localeCompare(b.dataTermino)), [pericias]);

  const atencao: Atencao[] = [];
  if (authUser?.senhaTemporaria) {
    atencao.push({ id: 'senha', icone: 'key', titulo: 'Senha temporária', detalhe: 'Altere a senha inicial por uma só sua.', tag: 'Segurança', tom: 'danger', to: '/perfil' });
  }
  if (podePareceres && atrasados.length > 0) {
    const esps = Array.from(new Set(atrasados.map(p => p.especialidade))).slice(0, 3).join(', ');
    atencao.push({
      id: 'pareceres', icone: 'assignment_late', titulo: `${atrasados.length} parecer${atrasados.length !== 1 ? 'es' : ''} atrasado${atrasados.length !== 1 ? 's' : ''}`,
      detalhe: `Sem conclusão há 20 dias ou mais${esps ? ` · ${esps}` : ''}`, tag: 'Atrasado', tom: 'danger', to: '/pareceres',
    });
  }
  if (podeInspecoes && deHoje.length > 0) {
    const agora = new Date().toTimeString().slice(0, 5);
    const proxima = deHoje.find(i => horaDeEntrevista(i.dataEntrevista) >= agora) ?? deHoje[0];
    atencao.push({
      id: 'is-hoje', icone: 'event_available', titulo: `${deHoje.length} inspeç${deHoje.length !== 1 ? 'ões' : 'ão'} marcada${deHoje.length !== 1 ? 's' : ''} para hoje`,
      detalhe: `${horaDeEntrevista(proxima.dataEntrevista)} · ${nomeDe(proxima)}${deHoje.length > 1 ? ` e mais ${deHoje.length - 1}` : ''}`, tag: 'Hoje', tom: 'attention', to: '/inspecoes',
    });
  }
  // IS de concurso agendadas para hoje (todos os concursos do dia): abre a tabela do dia.
  const concursosHoje = diasConcursos.filter(d => d.data === hoje);
  if (podeConcursos && concursosHoje.length > 0) {
    const totalHoje = concursosHoje.reduce((n, d) => n + d.total, 0);
    const feitas = concursosHoje.reduce((n, d) => n + d.candidatos.filter(c => c.finalizado).length, 0);
    atencao.push({
      id: 'is-concurso-hoje', icone: 'groups', titulo: `${totalHoje} inspeç${totalHoje !== 1 ? 'ões' : 'ão'} de concurso para hoje`,
      detalhe: `${concursosHoje.map(d => d.nome).join(' e ')} · ${feitas} de ${totalHoje} finalizada${feitas !== 1 ? 's' : ''}`,
      tag: 'Hoje', tom: feitas === totalHoje ? 'success' : 'attention', to: concursosDiaPath(hoje),
    });
  }
  if (podePericiaMenor && periciaMenorVigentes > 0) {
    atencao.push({
      id: 'pm', icone: 'personal_injury', titulo: `${periciaMenorVigentes} perícia${periciaMenorVigentes !== 1 ? 's' : ''} menor${periciaMenorVigentes !== 1 ? 'es' : ''} vigente${periciaMenorVigentes !== 1 ? 's' : ''}`,
      detalhe: periciaMenorVigentes === 1 ? 'Militar com dispensa em curso' : 'Militares com dispensa em curso', tag: 'Vigente', tom: 'danger', to: '/pericia-menor/historico',
    });
  }
  if (podeConcursos && emAndamento.length > 0) {
    atencao.push({
      id: 'concurso', icone: 'fact_check', titulo: emAndamento.length === 1 ? emAndamento[0].nome : `${emAndamento.length} concursos em andamento`,
      detalhe: emAndamento.length === 1 ? 'Concurso em andamento · planilha de candidatos' : 'Planilhas de candidatos', tag: 'Em andamento', tom: 'navy',
      to: emAndamento.length === 1 ? concursoPath(emAndamento[0].id) : '/concursos',
    });
  }

  // Acesso rápido: escolha do usuário (até 6, guardada no aparelho) ou o padrão do perfil.
  const chaveRapido = `jrs_acesso_rapido_${authUser?.uid ?? ''}`;
  const [escolhidas, setEscolhidas] = useState<NavItem[] | null>(() => {
    try { const s = localStorage.getItem(chaveRapido); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [editandoRapido, setEditandoRapido] = useState(false);
  const [rascunho, setRascunho] = useState<NavItem[]>([]);
  const mapa = new Map(paginas.map(p => [p.id, p]));
  const rapido = (escolhidas ?? [...PADRAO_RAPIDO, ...paginas.map(p => p.id)])
    .filter((id, i, a) => mapa.has(id) && a.indexOf(id) === i)
    .slice(0, MAX_RAPIDO)
    .map(id => mapa.get(id)!);
  const salvarRapido = () => {
    setEscolhidas(rascunho);
    try { localStorage.setItem(chaveRapido, JSON.stringify(rascunho)); } catch { /* sem localStorage */ }
    setEditandoRapido(false);
  };

  const mostrarAvisos = !!nav?.avisos?.casosPendente || !!nav?.avisos?.pwaPendente;

  return (
    <Container size="data" className="py-6 md:py-8 pb-10 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="eyebrow">{dataPorExtenso()}</p>
          <h1 className="text-display font-extrabold text-navy">{saudacao()}, {primeiroNome || 'Perito'}</h1>
        </div>
        {(podeNovaPericia && podePericiaMenor || podeGerarParecer) && (
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            {podeNovaPericia && podePericiaMenor && <Link to="/pericia-menor?novo=1" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-white text-navy border border-navy hover:bg-thead transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">personal_injury</span>Nova perícia menor</Link>}
            {podeGerarParecer && <Link to="/pareceres?novo=1" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>Novo parecer</Link>}
          </div>
        )}
      </header>

      <div className="@container">
        <div className="grid grid-cols-1 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            <Secao id="home-atencao" titulo="Precisa de atenção">
              {atencao.length > 0 ? (
                <ul className="divide-y divide-line">
                  {atencao.map(a => (
                    <li key={a.id}>
                      <Link to={a.to} className="flex items-center gap-3 px-4 min-h-[64px] py-3 hover:bg-thead transition-colors">
                        <span className="w-10 h-10 rounded-lg bg-thead flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{a.icone}</span></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-navy truncate">{a.titulo}</span>
                          <span className="block text-xs text-ink-3 truncate">{a.detalhe}</span>
                        </span>
                        <StatusTag tone={a.tom} className="shrink-0">{a.tag}</StatusTag>
                        <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">chevron_right</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="task_alt" title="Nada pendente" description="Não há pareceres atrasados, perícias vigentes, inspeções de hoje nem concursos em andamento ou de hoje para você agora." />
              )}
            </Secao>

            {podeInspecoes && (
              <Secao id="home-proximas" titulo="Próximas Inspeções" acao={<Link to="/inspecoes" className="text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Ver inspeções</Link>}>
                {proximas.length === 0 ? (
                  <EmptyState icon="event_available" title="Nenhuma inspeção agendada" description="As IS com entrevista marcada aparecem aqui." />
                ) : (
                  <ul className="divide-y divide-line">
                    {proximas.slice(0, 6).map(i => {
                      const ehHoje = dataDeEntrevista(i.dataEntrevista) === hoje;
                      return (
                        <li key={i.id}>
                          <Link to="/inspecoes" className="flex items-center gap-3 px-4 min-h-[56px] py-2 hover:bg-thead transition-colors">
                            <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">event_available</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-navy truncate">{nomeDe(i)}</span>
                              <span className="block text-xs text-ink-3 truncate">IS {i.is} · {i.finalidade} · {i.amp}{i.peritoNome ? ` · ${i.peritoNome}` : ''}</span>
                            </span>
                            <span className="text-xs text-ink-3 shrink-0 text-right">{ehHoje ? <strong className="text-navy">Hoje</strong> : dataBr(dataDeEntrevista(i.dataEntrevista)).slice(0, 5)} · {horaDeEntrevista(i.dataEntrevista)}</span>
                            <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">chevron_right</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Secao>
            )}

            {podePareceres && naoConcluidos.length > 0 && (
              <Secao id="home-pareceres" titulo={`Pareceres não concluídos (${naoConcluidos.length})`} acao={<Link to="/pareceres" className="text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Ver pareceres</Link>}>
                <ul className="divide-y divide-line">
                  {naoConcluidos.slice(0, 6).map(p => {
                    const atrasado = statusEfetivo(p) === 'atrasado';
                    return (
                      <li key={p.id}>
                        <LinhaDocumento
                          icone="description" titulo={extrairNomeInspecionado(p.inspecionado)} detalhe={`Parecer · ${p.especialidade}`}
                          data={p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? ''} link={p.pdfUrl} to="/pareceres"
                          tag={<StatusTag tone={atrasado ? 'danger' : 'navyOutline'} className="shrink-0">{atrasado ? 'Atrasado' : 'Solicitado'}</StatusTag>}
                        />
                      </li>
                    );
                  })}
                </ul>
                {naoConcluidos.length > 6 && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line">+{naoConcluidos.length - 6} em Pareceres.</p>}
              </Secao>
            )}

            {podePericiaMenor && vigentes.length > 0 && (
              <Secao id="home-pericias" titulo={`Perícias Menores Vigentes (${vigentes.length})`} acao={<Link to="/pericia-menor/historico" className="text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Ver perícias</Link>}>
                <ul className="divide-y divide-line">
                  {vigentes.slice(0, 6).map(p => (
                    <li key={p.id}>
                      <LinhaDocumento
                        icone="personal_injury" titulo={extrairNomeInspecionado(p.inspecionado)} detalhe={`Perícia Menor · ${p.cid}`}
                        data={`até ${dataBR(p.dataTermino)}`} link={p.pdfUrl} to="/pericia-menor/historico"
                        tag={<StatusTag tone="danger" className="shrink-0">Vigente</StatusTag>}
                      />
                    </li>
                  ))}
                </ul>
                {vigentes.length > 6 && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line">+{vigentes.length - 6} em Perícia Menor.</p>}
              </Secao>
            )}
          </div>

          <div className="space-y-6 min-w-0">
            <Secao
              id="home-rapido" titulo="Acesso rápido"
              acao={<button type="button" onClick={() => { setRascunho(rapido.map(r => r.id)); setEditandoRapido(true); }} className="min-h-[44px] px-2 text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Editar</button>}
            >
              <div className="grid grid-cols-2 gap-2 p-3 pt-1">
                {rapido.map(r => (
                  <Link key={r.id} to={pathForView(r.id)} className="flex flex-col items-start gap-2 min-h-[80px] p-3 rounded-lg border border-line hover:border-navy transition-colors">
                    <span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{r.icon}</span>
                    <span className="text-sm font-bold text-navy leading-tight">{r.label}</span>
                  </Link>
                ))}
              </div>
            </Secao>

            {podeInspecoes && (
              <Secao id="home-agenda" titulo="Agenda de inspeções">
                <MiniCalendarioIS inspecoes={inspecoes} diasConcursos={diasConcursos} concursosClicaveis={podeConcursos} />
              </Secao>
            )}

            {mostrarAvisos && (
              <Secao id="home-avisos" titulo="Avisos">
                <ul className="divide-y divide-line">
                  {nav?.avisos?.casosPendente && (
                    <li className="flex items-start gap-3 px-4 py-3">
                      <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">quiz</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-navy">Casos Periciais</span>
                        <span className="block text-xs text-ink-3">24 questões comentadas sobre a DGPM-406. Faça quando puder.</span>
                        <Link to={pathForView('casos')} className="inline-flex items-center min-h-[44px] text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Responder</Link>
                      </span>
                    </li>
                  )}
                  {nav?.avisos?.pwaPendente && (
                    <li className="flex items-start gap-3 px-4 py-3">
                      <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">install_mobile</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-navy">Use no celular</span>
                        <span className="block text-xs text-ink-3">{isDesktop ? 'Abra o QR code e instale o app na tela inicial.' : 'Instale o app na tela inicial do aparelho.'}</span>
                        <button type="button" onClick={() => nav?.abrirInstalacaoApp()} className="inline-flex items-center min-h-[44px] text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">{isDesktop ? 'Mostrar QR code' : 'Ver como instalar'}</button>
                      </span>
                    </li>
                  )}
                </ul>
              </Secao>
            )}
          </div>
        </div>
      </div>

      {editandoRapido && (
        <Dialog
          title="Acesso rápido" icon="bolt" onClose={() => setEditandoRapido(false)}
          footer={<><Button variant="secondary" onClick={() => setEditandoRapido(false)}>Cancelar</Button><Button onClick={salvarRapido}>Salvar</Button></>}
        >
          <p className="text-ink-3 mb-3">Escolha até {MAX_RAPIDO} páginas. A escolha fica guardada neste aparelho.</p>
          <ul className="space-y-1" role="group" aria-label="Páginas do acesso rápido">
            {paginas.map(p => {
              const marcado = rascunho.includes(p.id);
              const cheio = !marcado && rascunho.length >= MAX_RAPIDO;
              return (
                <li key={p.id}>
                  <label className={`flex items-center gap-3 min-h-[44px] px-2 rounded-lg ${cheio ? 'opacity-50' : 'cursor-pointer hover:bg-thead'}`}>
                    <input type="checkbox" checked={marcado} disabled={cheio} onChange={() => setRascunho(r => (marcado ? r.filter(x => x !== p.id) : [...r, p.id]))} className="w-5 h-5 accent-navy" />
                    <span className="material-symbols-outlined text-[20px] text-ink-3" aria-hidden="true">{p.icon}</span>
                    <span className="text-sm font-semibold text-ink">{p.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Dialog>
      )}
    </Container>
  );
};
