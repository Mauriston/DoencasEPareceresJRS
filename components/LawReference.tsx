// Ficheiro: components/LawReference.tsx
// Página Legislação: itens vindos do Firestore (coleção "legislacao"); o clique
// abre o PDF do Firebase Storage num modal em tela cheia.
import React, { useEffect, useState } from 'react';
import { Info } from './ui/icons';
import { Container, PageHeader } from './ui/Page';
import { PdfFullscreenModal } from './PdfFullscreenModal';
import { Button } from './ui/Button';
import { Toast } from './ui/Toast';
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
  const [modal, setModal] = useState<{ title: string; url: string } | null>(null);

  const carregar = () => listarLegislacao().then(setItens).catch(() => setErro(true));
  useEffect(() => { carregar(); }, []);

  const abrir = async (law: LegislacaoDoc) => {
    if (!law.pdfPath) { alert('O PDF desta norma ainda não está disponível.'); return; }
    setAbrindo(law.id);
    try {
      const url = await getStoragePdfUrl(law.pdfPath);
      if (!url) { alert('O PDF desta norma ainda não está disponível.'); return; }
      setModal({ title: `${law.legislacao} — ${law.titulo}`, url });
    } catch {
      alert('Não foi possível abrir o PDF. Tente novamente.');
    } finally {
      setAbrindo(null);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Container size="data" className="py-6 md:py-8 pb-10 ">
        <PageHeader title="Legislação" description="Pesquise as leis que fundamentam as inspeções de saúde."
          actions={podeCadastrar ? <Button icon="add" onClick={() => setNovo(true)}>Novo</Button> : undefined}
        />

        {erro && <p className="text-sm text-ink-3">Não foi possível carregar a legislação.</p>}
        {!erro && itens === null && <p className="text-sm text-ink-3">Carregando…</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {(itens ?? []).map((law) => {
            const isBrasao = law.imageUrl.includes('brasao-da-republica');

            return (
              <div key={law.id} className="relative group bg-white rounded-xl border border-line/60 hover:border-navy hover:shadow-md transition-all overflow-hidden flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => abrir(law)}
                  disabled={abrindo === law.id}
                  className="flex-1 min-w-0 flex items-center gap-3 p-4 active:bg-paper transition-colors focus:outline-none cursor-pointer text-left disabled:opacity-60"
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
                    <h3 className="text-navy font-heading font-bold text-sm leading-snug mb-0.5 group-hover:text-navy transition-colors">
                      {law.legislacao}
                    </h3>
                    <p className="text-ink-3 font-body text-xs font-medium leading-relaxed">
                      {law.titulo}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => alert(law.providencias)}
                  title={law.providencias}
                  className="text-ink-3 hover:text-navy transition-colors flex-shrink-0 focus:outline-none p-1.5 mr-3"
                >
                  <Info size={18} />
                </button>
              </div>
            );
          })}
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
      {modal && <PdfFullscreenModal title={modal.title} url={modal.url} onClose={() => setModal(null)} />}
    </div>
  );
};
