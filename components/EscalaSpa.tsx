// Ficheiro: components/EscalaSpa.tsx
// Página "Escala de Serviço": escala de serviço do SPA (coleção "escalaSpa", enviada pelo Admin em CSV).
//  - Desktop: calendário do mês no mesmo estilo da página de supervisão (github.com/Mauriston/escalasupervisao):
//    grade navy, dias úteis em branco, sábados/domingos/feriados em vinho claro e festas maiores em azul claro, hoje com
//    contorno dourado. Tocar num dia GIRA todos os cards (como um jogo da memória): numa face a supervisão
//    (escalado + retém), na outra os plantões de 12 h (D: … · N: …). A face inicial é a do serviço do usuário.
//  - Celular: abas "Todos · Meus serviços" e a lista por dia, como a "Programação" do Google Agenda
//    (Supervisão · Dia · Noite): escalados um por linha, sem o retém — que fica num ícone de info (toque abre).
//  - Admin: baixa o modelo CSV e envia a escala do mês.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { IconButton } from './ui/IconButton';
import { controlClass } from './ui/Field';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { useNav } from '../context/NavContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { observarEscalaPeriodo, type EscalaDia } from '../services/firestoreEscala';
import { chaveDia, chaveNome, corDoDia, faceInicial, feriados, nomeExibicao, type CorDia } from '../utils/escalaSpa';
import { ImportarEscalaCsv, baixarModeloEscala } from './escala/ImportarEscalaCsv';
import { AbasSublinhadas } from './periciaMenor/partes';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MES_ABR = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
const pad = (n: number) => String(n).padStart(2, '0');
const CHAVE_MES = 'jrs_escala_mes';

/** Fundo do card por cor do dia — tokens do DS (seguem o tema escuro), mantendo a distinção da página
 *  de supervisão: fim de semana/feriado em vinho claro (era #F3DEDA) e festas maiores em azul claro (era #E6DDF5). */
const FUNDO: Record<CorDia, string> = { branca: 'bg-white', vermelha: 'bg-wine-50', roxa: 'bg-blue-50' };
const PONTO: Record<CorDia, string> = { branca: 'bg-line', vermelha: 'bg-wine-300', roxa: 'bg-blue-300' };

type Face = 'supervisao' | 'plantao';

const hojeChave = () => { const d = new Date(); return chaveDia(d.getFullYear(), d.getMonth(), d.getDate()); };

export const EscalaSpa: React.FC = () => {
  const nav = useNav();
  const usuario = nav?.authUser?.usuario;
  const ehAdmin = nav?.authUser?.perfil === 'admin';
  const isDesktop = useIsDesktop();
  const eu = chaveNome(usuario);
  const hoje = hojeChave();

  const [mes, setMes] = useState<{ y: number; m: number }>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE_MES) || 'null');
      if (s && typeof s.y === 'number' && typeof s.m === 'number') return s;
    } catch { /* sem localStorage */ }
    const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [dias, setDias] = useState<EscalaDia[] | null>(null);
  const [erro, setErro] = useState('');
  const [virado, setVirado] = useState(false);
  const [importando, setImportando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Celular: "Todos" os dias ou só os "Meus serviços" (dias em que o usuário está escalado, retém incluído).
  const [filtroDias, setFiltroDias] = useState<'todos' | 'meus'>('todos');
  // Retém aberto (um por vez) no ícone de info da linha — chave "AAAA-MM-DD|Dia".
  const [retemAberto, setRetemAberto] = useState<string | null>(null);
  useEffect(() => {
    if (!retemAberto) return;
    const fechar = (ev: Event) => { const el = ev.target as HTMLElement | null; if (!el?.closest?.('[data-retem]')) setRetemAberto(null); };
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setRetemAberto(null); };
    document.addEventListener('pointerdown', fechar); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fechar); document.removeEventListener('keydown', tecla); };
  }, [retemAberto]);

  const irPara = (y: number, m: number) => {
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMes({ y, m }); setVirado(false);
    try { localStorage.setItem(CHAVE_MES, JSON.stringify({ y, m })); } catch { /* sem localStorage */ }
  };

  const inicio = chaveDia(mes.y, mes.m, 1);
  const totalDias = new Date(mes.y, mes.m + 1, 0).getDate();
  const fim = chaveDia(mes.y, mes.m, totalDias);
  useEffect(() => {
    setDias(null); setErro('');
    return observarEscalaPeriodo(inicio, fim, setDias, e => setErro(e.message || 'Não foi possível carregar a escala.'));
  }, [inicio, fim]);

  const porData = useMemo(() => new Map((dias ?? []).map(d => [d.data, d])), [dias]);
  const temPlantao = (dias ?? []).some(d => (d.dia?.length ?? 0) > 0 || (d.noite?.length ?? 0) > 0);
  const inicial: Face = useMemo(() => (dias ? faceInicial(dias, usuario) : 'supervisao'), [dias, usuario]);
  const face: Face = virado ? (inicial === 'supervisao' ? 'plantao' : 'supervisao') : inicial;
  const fer = useMemo(() => feriados(mes.y), [mes.y]);
  const anos = useMemo(() => { const a = new Date().getFullYear(); return [...new Set([a - 1, a, a + 1, mes.y])].sort(); }, [mes.y]);

  const souEu = (n?: string) => !!eu && chaveNome(n) === eu;
  // O nome nunca quebra entre o posto e o nome ("1T MÔNICA VIRGÍNIA" fica junto): se não couber na
  // linha, desce inteiro; se não couber nem sozinho, termina em "…" (nome completo no title).
  const Nome: React.FC<{ n?: string; forte?: boolean }> = ({ n, forte }) => {
    const texto = n ? nomeExibicao(n) : '—';
    return (
      <span title={n ? texto : undefined} className={`inline-block max-w-full truncate align-bottom ${souEu(n) ? 'bg-gold/30 rounded px-0.5 -mx-0.5' : ''} ${forte ? 'font-extrabold text-navy' : 'font-semibold text-ink'}`}>{texto}</span>
    );
  };
  const dupla = (lista?: string[]) => (lista && lista.length
    ? lista.map((n, i) => <React.Fragment key={n + i}>{i > 0 && <span className="text-ink-4"> - </span>}<Nome n={n} forte /></React.Fragment>)
    : <span className="text-ink-4">—</span>);

  // ---- Seletor de mês (‹ Mês/Ano ›) ----
  const seletor = (
    <div className="flex items-center gap-2">
      <IconButton icon="chevron_left" label="Mês anterior" variant="secondary" onClick={() => irPara(mes.y, mes.m - 1)} />
      <select aria-label="Mês" value={mes.m} onChange={e => irPara(mes.y, Number(e.target.value))} className={`${controlClass} !w-auto font-bold text-navy cursor-pointer`}>
        {MESES.map((nome, i) => <option key={nome} value={i}>{nome}</option>)}
      </select>
      <select aria-label="Ano" value={mes.y} onChange={e => irPara(Number(e.target.value), mes.m)} className={`${controlClass} !w-auto font-bold text-navy cursor-pointer tabular-nums`}>
        {anos.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <IconButton icon="chevron_right" label="Próximo mês" variant="secondary" onClick={() => irPara(mes.y, mes.m + 1)} />
    </div>
  );

  // ---- Desktop: calendário com cards que giram ----
  const offset = new Date(mes.y, mes.m, 1).getDay();
  const celulas = Math.ceil((offset + totalDias) / 7) * 7;
  const calendario = (
    <Card padding="none">
      <div className="grid grid-cols-7 gap-2 px-3.5 py-2 bg-thead border-b border-line">
        {SEMANA.map(s => <div key={s} className="text-center text-xs font-bold tracking-wide text-ink-3">{s}</div>)}
      </div>
      <div className="bg-navy p-3.5 grid grid-cols-7 gap-2 [perspective:1400px]" role="grid" aria-label={`Escala de ${MESES[mes.m]} de ${mes.y}`}>
        {Array.from({ length: celulas }, (_, i) => {
          const d = i - offset + 1;
          if (d < 1 || d > totalDias) return <div key={i} aria-hidden="true" />;
          const k = chaveDia(mes.y, mes.m, d);
          const e = porData.get(k);
          const cor = corDoDia(k);
          const rotulo = `${pad(d)}/${MES_ABR[mes.m]}`;
          const faceBase = `[grid-area:1/1] [backface-visibility:hidden] rounded-md px-2 pt-1.5 pb-1 flex flex-col gap-1 min-w-0 ${FUNDO[cor]} ${k === hoje ? 'outline outline-2 outline-gold -outline-offset-2' : ''}`;
          const data = <div className="text-center text-xs font-semibold text-ink mb-0.5"><span title={fer[k] ? `Feriado: ${fer[k]}` : undefined} className={fer[k] ? 'cursor-help' : ''}>{rotulo}</span></div>;
          const frenteSupervisao = (
            <>
              {data}
              <span className="text-sm leading-tight text-navy text-pretty"><Nome n={e?.supervisor} forte /></span>
              <span className="text-xs leading-snug text-ink-3 text-pretty">Retém: <Nome n={e?.retemSupervisao} /></span>
            </>
          );
          const frentePlantao = (
            <>
              {data}
              <span className="text-xs leading-snug text-pretty"><b className="text-ink-3">D: </b>{dupla(e?.dia)}</span>
              <span className="text-xs leading-snug text-pretty"><b className="text-ink-3">N: </b>{dupla(e?.noite)}</span>
            </>
          );
          const [frente, verso] = inicial === 'supervisao' ? [frenteSupervisao, frentePlantao] : [frentePlantao, frenteSupervisao];
          return (
            <button
              key={i} type="button" role="gridcell" onClick={() => setVirado(v => !v)}
              aria-label={`${rotulo}: supervisão ${nomeExibicao(e?.supervisor) || 'sem escala'}${e?.retemSupervisao ? `, retém ${nomeExibicao(e.retemSupervisao)}` : ''}; dia ${(e?.dia ?? []).map(nomeExibicao).join(' e ') || '—'}; noite ${(e?.noite ?? []).map(nomeExibicao).join(' e ') || '—'}. Toque para girar os cards.`}
              className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded-md"
            >
              <div
                className={`grid min-h-[96px] h-full transition-transform duration-500 [transform-style:preserve-3d] ${virado ? '[transform:rotateY(180deg)]' : ''}`}
                style={{ transitionDelay: `${(i % 7) * 25 + Math.floor(i / 7) * 15}ms` }}
              >
                <div className={faceBase}>{frente}</div>
                <div className={`${faceBase} [transform:rotateY(180deg)]`}>{verso}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );

  // ---- Celular: lista por dia (Supervisão · Dia · Noite) ----
  const refHoje = useRef<HTMLLIElement>(null);
  useEffect(() => { if (!isDesktop && dias) refHoje.current?.scrollIntoView({ block: 'start' }); }, [isDesktop, dias]);
  // Escalados um por linha (sem o " - "): a dupla do plantão fica empilhada.
  const empilhados = (lista?: string[]) => (lista && lista.length
    ? lista.map((n, i) => <React.Fragment key={n + i}>{i > 0 && <br />}<Nome n={n} forte /></React.Fragment>)
    : <span className="text-ink-4">—</span>);
  const linhaEvento = (chave: string, rotulo: string, conteudo: React.ReactNode, minha: boolean, retem?: string) => {
    const id = `${chave}|${rotulo}`;
    const aberto = retemAberto === id;
    return (
      <div className={`relative flex items-start gap-2 text-sm py-1 px-2 -mx-2 rounded ${minha ? 'bg-gold/20' : ''}`} data-retem={retem ? id : undefined}>
        <span className="w-[5.5rem] shrink-0 text-xs font-bold text-ink-3 uppercase tracking-wide pt-0.5">{rotulo}</span>
        <span className="min-w-0 flex-1 text-pretty">{conteudo}</span>
        {retem && (
          <>
            <button
              type="button"
              aria-label={`Retém de ${rotulo.toLowerCase()}: ${nomeExibicao(retem)}`}
              aria-expanded={aberto}
              onClick={() => setRetemAberto(aberto ? null : id)}
              className="shrink-0 -my-1 -mr-1 w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-4 hover:text-navy hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
            </button>
            {aberto && (
              <span role="tooltip" className="absolute right-0 top-full mt-1 z-dropdown max-w-[16rem] rounded-lg bg-navy text-white text-xs font-semibold px-3 py-2 shadow-lg">
                Retém: <span className={souEu(retem) ? 'text-gold' : ''}>{nomeExibicao(retem)}</span>
              </span>
            )}
          </>
        )}
      </div>
    );
  };
  const meuDia = (e?: EscalaDia) => !!e && (souEu(e.supervisor) || souEu(e.retemSupervisao) || (e.dia ?? []).some(souEu) || souEu(e.retemDia) || (e.noite ?? []).some(souEu) || souEu(e.retemNoite));
  const diasDoMes = Array.from({ length: totalDias }, (_, i) => i + 1);
  const diasVisiveis = filtroDias === 'meus' ? diasDoMes.filter(d => meuDia(porData.get(chaveDia(mes.y, mes.m, d)))) : diasDoMes;
  const totalMeus = diasDoMes.filter(d => meuDia(porData.get(chaveDia(mes.y, mes.m, d)))).length;
  const lista = diasVisiveis.length === 0 ? (
    <Card padding="none"><EmptyState icon="event_busy" title={`Sem serviços seus em ${MESES[mes.m].toLowerCase()} de ${mes.y}`} description="Toque em “Todos” para ver a escala completa do mês." /></Card>
  ) : (
    <ul className="bg-white rounded-xl border border-line divide-y divide-line overflow-clip">
      {diasVisiveis.map(d => {
        const k = chaveDia(mes.y, mes.m, d);
        const e = porData.get(k);
        const cor = corDoDia(k);
        const dow = new Date(mes.y, mes.m, d).getDay();
        const ehHoje = k === hoje;
        return (
          <li key={k} ref={ehHoje ? refHoje : undefined} className={`flex gap-3 px-3 py-2.5 scroll-mt-20 ${ehHoje ? 'shadow-[inset_3px_0_0_rgb(var(--c-gold-400))]' : ''}`}>
            <div className="w-11 shrink-0 text-center pt-0.5">
              <div className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center text-base font-extrabold ${ehHoje ? 'bg-navy text-white' : 'text-navy'}`}>{d}</div>
              <div className="text-xs font-semibold text-ink-3 flex items-center justify-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${PONTO[cor]}`} aria-hidden="true" />{SEMANA[dow]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              {fer[k] && <p className="text-xs font-semibold text-wine mb-0.5">{fer[k]}</p>}
              {e ? (
                <>
                  {linhaEvento(k, 'Supervisão', <Nome n={e.supervisor} forte />, souEu(e.supervisor) || souEu(e.retemSupervisao), e.retemSupervisao)}
                  {linhaEvento(k, 'Dia', empilhados(e.dia), (e.dia ?? []).some(souEu) || souEu(e.retemDia), e.retemDia)}
                  {linhaEvento(k, 'Noite', empilhados(e.noite), (e.noite ?? []).some(souEu) || souEu(e.retemNoite), e.retemNoite)}
                </>
              ) : <p className="text-sm text-ink-4 py-1">Sem escala registrada.</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast} tone="success" />
      <Container size="data" className="pt-0 md:pt-8 pb-10 flex flex-col gap-6">
        <PageHeader
          title="Escala de Serviço"
          description="Supervisão do SPA (24 h, com retém) e plantões de 12 h (dia e noite)."
          actions={ehAdmin ? (
            <>
              <Button variant="secondary" icon="download" onClick={baixarModeloEscala}>Modelo CSV</Button>
              <Button icon="upload_file" onClick={() => setImportando(true)}>Enviar escala</Button>
            </>
          ) : undefined}
        />

        {!isDesktop && (
          <AbasSublinhadas<'todos' | 'meus'>
            rotulo="Dias da escala" idBase="escala-dias" ativa={filtroDias} onChange={setFiltroDias}
            className="-mx-4 px-4 bg-white"
            abas={[{ id: 'todos', rotulo: 'Todos', contagem: totalDias }, { id: 'meus', rotulo: 'Meus serviços', contagem: totalMeus }]}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {seletor}
          {isDesktop && dias && dias.length > 0 && (
            <p className="text-xs text-ink-3 flex items-center gap-1.5" role="status">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">touch_app</span>
              {face === 'supervisao' ? 'Supervisão' : 'Plantões dia/noite'} · toque num dia para ver {face === 'supervisao' ? (temPlantao ? 'os plantões' : 'os plantões (não registrados neste mês)') : 'a supervisão'}
            </p>
          )}
        </div>

        {erro ? (
          <Card role="alert" className="text-sm font-semibold text-wine">{erro}</Card>
        ) : dias === null ? (
          <Card role="status" className="p-10 text-center text-sm text-ink-3">Carregando a escala…</Card>
        ) : dias.length === 0 ? (
          <Card padding="none">
            <EmptyState icon="calendar_month" title={`Sem escala para ${MESES[mes.m].toLowerCase()} de ${mes.y}`} description={ehAdmin ? 'Envie o CSV da escala do mês pelo botão "Enviar escala".' : 'A escala deste mês ainda não foi publicada.'} />
          </Card>
        ) : isDesktop ? calendario : (
          // Painel das abas "Todos · Meus serviços" (celular): liga o tablist à lista (aria-controls).
          <div id="escala-dias-painel" role="tabpanel" aria-labelledby={`escala-dias-aba-${filtroDias}`}>{lista}</div>
        )}
      </Container>

      {importando && ehAdmin && (
        <ImportarEscalaCsv
          onClose={() => setImportando(false)}
          onImportado={(n, meses) => {
            setImportando(false);
            setToast(`Escala gravada: ${n} dia${n !== 1 ? 's' : ''}.`);
            window.setTimeout(() => setToast(null), 4000);
            const [y, m] = (meses[0] || '').split('-').map(Number);
            if (y && m) irPara(y, m - 1);
          }}
        />
      )}
    </div>
  );
};
