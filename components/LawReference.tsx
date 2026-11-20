// Ficheiro: components/LawReference.tsx
// Página Legislação: itens vindos do Firestore (coleção "legislacao"), agrupados
// em abas (Leis e Decretos · Portarias · DGPM · Res CFM, ?grupo=). O clique abre o
// texto da norma (?doc=<id>, content/legislacao/<id>.md) com índice e botão Download;
// sem texto convertido, abre o PDF do Storage em nova aba.
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, PageHeader } from './ui/Page';
import { abrirPdf } from '../services/abrirPdf';
import { Card } from './ui/Card';
import { GradeCards } from './ui/Grade';
import { IconButton } from './ui/IconButton';
import { Toast } from './ui/Toast';
import { Segmented } from './ui/Segmented';
import { LegislacaoDocumento } from './LegislacaoDocumento';
import { GRUPOS_LEGISLACAO, grupoDaLegislacao, textoDaLegislacao, type GrupoLegislacao } from '../utils/legislacao';
import { getMainScroller } from '../utils/dom';
import { LegislacaoForm } from './LegislacaoForm';
import { listarLegislacao, LegislacaoDoc } from '../services/firestoreLegislacao';
import { getStoragePdfUrl } from '../services/firebaseStorageNormas';

interface LawReferenceProps {
  /** Só o Admin cadastra novas legislações. */
  podeCadastrar?: boolean;
}

export const LawReference: React.FC<LawReferenceProps> = ({ podeCadastrar = false }) => {
  const [itens, setItens] = useState<LegislacaoDoc[] | null>(null);
  const [erro, setErro] = useState(false);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const [params, setParams] = useSearchParams();
  const grupoParam = params.get('grupo') as GrupoLegislacao | null;
  const grupo: GrupoLegislacao = GRUPOS_LEGISLACAO.some(g => g.value === grupoParam) ? grupoParam! : 'leis';
  const docId = params.get('doc');

  const carregar = () => listarLegislacao().then(setItens).catch(() => setErro(true));
  useEffect(() => { carregar(); }, []);

  const contagem = useMemo(() => {
    const c: Record<GrupoLegislacao, number> = { leis: 0, portarias: 0, dgpm: 0, cfm: 0 };
    (itens ?? []).forEach(i => { c[grupoDaLegislacao(i.id, i.legislacao)]++; });
    return c;
  }, [itens]);
  const visiveis = (itens ?? []).filter(i => grupoDaLegislacao(i.id, i.legislacao) === grupo);

  const rolarAoTopo = () => (getMainScroller() ?? window).scrollTo({ top: 0 });
  const mudarParams = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(params);
    mut(p);
    setParams(p);
  };
  const escolherGrupo = (g: GrupoLegislacao) => mudarParams(p => { p.set('grupo', g); p.delete('doc'); });
  const voltar = () => { mudarParams(p => p.delete('doc')); rolarAoTopo(); };

  const abrir = async (law: LegislacaoDoc) => {
    if (textoDaLegislacao(law.id)) {
      mudarParams(p => { p.set('grupo', grupoDaLegislacao(law.id, law.legislacao)); p.set('doc', law.id); });
      rolarAoTopo();
      return;
    }
    if (!law.pdfPath) { alert('O PDF desta norma ainda não está disponível.'); return; }
    setAbrindo(law.id);
    try {
      const pdfPath = law.pdfPath;
      let indisponivel = false;
      await abrirPdf(async () => { const url = await getStoragePdfUrl(pdfPath); if (!url) indisponivel = true; return url || ''; })
        .catch(e => { if (!indisponivel) throw e; });
      if (indisponivel) { alert('O PDF desta norma ainda não está disponível.'); return; }
    } catch {
      alert('Não foi possível abrir o PDF. Tente novamente.');
    } finally {
      setAbrindo(null);
    }
  };

  const lawAberta = docId ? (itens ?? []).find(i => i.id === docId) : undefined;
  const textoAberto = lawAberta ? textoDaLegislacao(lawAberta.id) : null;
  if (lawAberta && textoAberto) return <LegislacaoDocumento law={lawAberta} markdown={textoAberto} onVoltar={voltar} />;

  return (
    <div className="flex flex-col flex-1">
      <Container size="data" className={`py-6 md:py-8 pt-4 md:pt-8 ${podeCadastrar ? 'pb-28 md:pb-10' : 'pb-10'}`}>
        <PageHeader title="Legislação" description="Pesquise as leis que fundamentam as inspeções de saúde."
          fab={podeCadastrar ? { icon: 'add', label: 'Cadastrar lei', onClick: () => setNovo(true) } : undefined}
        />

        {erro && <p className="text-sm text-ink-3">Não foi possível carregar a legislação.</p>}
        {!erro && itens === null && <p className="text-sm text-ink-3">Carregando…</p>}

        <Segmented
          papel="tab"
          idBase="legislacao"
          ariaLabel="Grupos de legislação"
          className="mb-6 max-w-full overflow-x-auto"
          value={grupo}
          onChange={escolherGrupo}
          options={GRUPOS_LEGISLACAO.map(g => ({ ...g, badge: itens ? contagem[g.value] : undefined, badgeTone: 'neutro' as const }))}
        />

        <div id="legislacao-painel" role="tabpanel" aria-labelledby={`legislacao-aba-${grupo}`}>
        {itens !== null && visiveis.length === 0 && <p className="text-sm text-ink-3">Nenhuma norma neste grupo.</p>}
        <GradeCards colunas={3}>
          {visiveis.map((law) => {
            const isBrasao = law.imageUrl.includes('brasao-da-republica');

            return (
              <Card key={law.id} padding="none" className="relative group hover:border-navy transition-colors flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => abrir(law)}
                  disabled={abrindo === law.id}
                  className="flex-1 min-w-0 flex items-center gap-3 p-4 hover:bg-paper transition-colors cursor-pointer text-left disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-paper rounded-full overflow-hidden border border-line flex items-center justify-center p-0.5">
                    <img
                      src={law.imageUrl}
                      alt={law.legislacao}
                      className={`w-full h-full object-contain transition-transform duration-300 ${
                        isBrasao ? 'scale-[1.5]' : ''
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="text-h3 text-navy mb-0.5">
                      {law.legislacao}
                    </h3>
                    <p className="text-ink-3 font-body text-xs font-medium leading-relaxed">
                      {law.titulo}
                    </p>
                  </div>
                </button>

                <IconButton
                  icon="info"
                  label={`Ementa: ${law.providencias}`}
                  variant="ghost"
                  size="sm"
                  className="mr-3"
                  onClick={() => alert(law.providencias)}
                />
              </Card>
            );
          })}
        </GradeCards>
        </div>
      </Container>
      <Toast message={aviso} />
      {novo && (
        <LegislacaoForm
          proximaOrdem={Math.max(0, ...(itens ?? []).map(i => i.ordem ?? 0)) + 1}
          onClose={() => setNovo(false)}
          onCriada={nome => {
            setNovo(false);
            carregar();
            setAviso(`${nome} cadastrada.`);
            window.setTimeout(() => setAviso(null), 4000);
          }}
        />
      )}
    </div>
  );
};
