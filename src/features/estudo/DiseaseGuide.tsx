// Ficheiro: components/DiseaseGuide.tsx
import React, { useState, useEffect, useContext } from 'react';
import DISEASES from '@/../content/doencas/all.json';
import { Disease, Diagnosis } from '@/types';
import { ChevronRight, Info, Brain, HeartPulse, EyeOff, Radiation, Accessibility, Stethoscope, Ribbon, X, Download, ArrowLeft } from '@/components/ui/icons';
import { jsPDF } from 'jspdf';
import { Container, PageHeader } from '@/components/ui/Page';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { NavContext } from '@/context/NavContext';
import { canAccessPage } from '@/config/permissions';
import { pathForView, PUBLICO_DOENCAS, PUBLICO_PORTARIA } from '@/config/routes';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBreadcrumbs } from '@/context/BreadcrumbContext';
import { doencaPath } from '@/config/routes';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { StatusTag, type StatusTone } from '@/components/ui/StatusTag';
import { controlClass, controlErrorClass } from '@/components/ui/Field';

const cdrData = [
  { id: 'M', nome: 'Memória', sigla: '(M)', opcoes: [
      { pt: 0, desc: "Sem perda de memória ou perda leve e inconstante." },
      { pt: 0.5, desc: "Esquecimento constante, recordação parcial de eventos." },
      { pt: 1, desc: "Perda de memória moderada, mais para eventos recentes, atrapalha as atividades de vida diária." },
      { pt: 2, desc: "Perda grave de memória, apenas assunto altamente aprendido é recordado." },
      { pt: 3, desc: "Perda de memória grave. Apenas fragmentos são recordados." }
  ]},
  { id: 'O', nome: 'Orientação', sigla: '(O)', opcoes: [
      { pt: 0, desc: "Completa orientação." },
      { pt: 0.5, desc: "Completamente orientado com dificuldade leve em relação ao tempo." },
      { pt: 1, desc: "Dificuldade moderada com relação ao tempo, orientado em áreas familiares." },
      { pt: 2, desc: "Dificuldade grave com relação ao tempo, desorientado quase sempre no espaço." },
      { pt: 3, desc: "Apenas orientado em relação a pessoas." }
  ]},
  { id: 'JSP', nome: 'Julgamento e solução de problemas', sigla: '(JSP)', opcoes: [
      { pt: 0, desc: "Resolve problemas diários; julgamento preservado." },
      { pt: 0.5, desc: "Dificuldade leve para solucionar problemas." },
      { pt: 1, desc: "Dificuldade moderada; julgamento social mantido." },
      { pt: 2, desc: "Dificuldade séria; julgamento social danificado." },
      { pt: 3, desc: "Incapaz de fazer julgamento ou resolver problemas." }
  ]},
  { id: 'RC', nome: 'Relações comunitárias', sigla: '(RC)', opcoes: [
      { pt: 0, desc: "Função independente no trabalho, compras, grupos sociais." },
      { pt: 0.5, desc: "Leve dificuldade nestas tarefas." },
      { pt: 1, desc: "Não é independente nestas atividades." },
      { pt: 2, desc: "Não há independência fora de casa, parece bem o bastante para ser levado fora." },
      { pt: 3, desc: "Não há independência fora de casa, parece doente o bastante para ser levado fora." }
  ]},
  { id: 'LP', nome: 'Lar e passatempos', sigla: '(LP)', opcoes: [
      { pt: 0, desc: "Vida em casa, passatempos e interesses intelectuais bem mantidos." },
      { pt: 0.5, desc: "Levemente prejudicados." },
      { pt: 1, desc: "Prejuízo suave; tarefas mais difíceis abandonadas." },
      { pt: 2, desc: "Apenas tarefas simples preservadas." },
      { pt: 3, desc: "Sem função significativa em casa." }
  ]},
  { id: 'CP', nome: 'Cuidados pessoais', sigla: '(CP)', opcoes: [
      { pt: 0, desc: "Completamente capaz de cuidar-se." },
      { pt: 0.5, desc: "Completamente capaz de cuidar-se." },
      { pt: 1, desc: "Necessita de ajuda." },
      { pt: 2, desc: "Requer assistência ao vestir-se, para higiene." },
      { pt: 3, desc: "Muita ajuda para cuidados pessoais, incontinências frequentes." }
  ]}
];

function calcularGlobalCDR(M: number, secScores: number[]) {
  const count = (conditionFn: (s: number) => boolean) => secScores.filter(conditionFn).length;
  if (M === 0) { if (count(s => s >= 0.5) >= 2) return 0.5; return 0; }
  if (M === 0.5) { if (count(s => s >= 1) >= 3) return 1; return 0.5; }
  const greater = count(s => s > M);
  const less = count(s => s < M);
  const equal = count(s => s === M);
  if (equal >= 3) return M;
  if (count(s => s === 0) >= 3) return 0.5;
  if (greater >= 3 || less >= 3) {
    if ((greater === 3 && less === 2) || (less === 3 && greater === 2)) return M;
    const maioriaArray = greater >= 3 ? secScores.filter(s => s > M) : secScores.filter(s => s < M);
    let freqs: Record<number, number> = {};
    maioriaArray.forEach(s => freqs[s] = (freqs[s] || 0) + 1);
    let maxFreq = 0;
    for (let k in freqs) if (freqs[k] > maxFreq) maxFreq = freqs[k];
    const modas = Object.keys(freqs).filter(k => freqs[Number(k)] === maxFreq).map(Number);
    if (modas.length === 1) return modas[0];
    let closest = modas[0]; let minDiff = Math.abs(modas[0] - M);
    for (let i = 1; i < modas.length; i++) { const diff = Math.abs(modas[i] - M); if (diff < minDiff) { closest = modas[i]; minDiff = diff; } }
    return closest;
  }
  return M;
}

function getStageText(globalScore: number) {
  switch(globalScore) {
    case 0: return { titulo: "Normal", sub: "sem demência" };
    case 0.5: return { titulo: "Questionável", sub: "a muito leve" };
    case 1: return { titulo: "Leve", sub: "demência" };
    case 2: return { titulo: "Moderada", sub: "demência" };
    case 3: return { titulo: "Grave", sub: "demência" };
    default: return { titulo: "", sub: "" };
  }
}

const TOM_ESTAGIO: Record<number, StatusTone> = { 0: 'success', 0.5: 'neutral', 1: 'attention', 2: 'danger', 3: 'danger' };

// Calculadora CDR dentro do shell (auditoria v2, C1): página com Page/Card, cada domínio um grupo de
// rádios de 44 px acessível por teclado e leitor de tela, resultado num painel fixo no fim do fluxo.
const CdrCalculator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [scores, setScores] = useState({ M: 0, O: 0, JSP: 0, RC: 0, LP: 0, CP: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const secScores = [scores.O, scores.JSP, scores.RC, scores.LP, scores.CP];
  const globalScore = calcularGlobalCDR(scores.M, secScores);
  const sbScore = scores.M + secScores.reduce((acc, val) => acc + val, 0);
  const stage = getStageText(globalScore);

  const handleCopy = async () => {
    const text = `CLINICAL DEMENTIA RATING:\n\n- M = ${scores.M}\n- O = ${scores.O}\n- JSP = ${scores.JSP}\n- RC = ${scores.RC}\n- LP = ${scores.LP}\n- CP = ${scores.CP}\n-------------------------------\n- Global CDR = ${globalScore}\n- CDR-SB = ${sbScore}\n\n- RESULTADO: ${stage.titulo.toUpperCase()} (${stage.sub})`;
    try { await navigator.clipboard.writeText(text); setIsCopied(true); if (navigator.share) await navigator.share({ title: 'Avaliação CDR Score', text }); } catch (err) { if ((err as Error).name !== 'AbortError') console.error(err); }
  };

  const escolher = (id: string, pt: number) => { setScores(sc => ({ ...sc, [id]: pt })); setIsCopied(false); };

  return (
    <div className="flex flex-col flex-1">
      <Container size="form" className="py-6 md:py-8 pb-6 space-y-5">
        <PageHeader
          title="CDR Score"
          description="Calculadora do Clinical Dementia Rating, validada em português."
          actions={<Button variant="secondary" icon="arrow_back" onClick={onClose}>Voltar à doença</Button>}
        />
        {cdrData.map(cat => (
          <div key={cat.id} role="radiogroup" aria-labelledby={`cdr-${cat.id}`} className="bg-white border border-line rounded-xl overflow-hidden">
            <h2 id={`cdr-${cat.id}`} className="text-h3 font-bold text-navy px-4 pt-4 pb-2">{cat.nome} <span className="text-ink-3 font-normal">{cat.sigla}</span></h2>
            <div className="flex flex-col">
              {cat.opcoes.map(opt => {
                const marcado = scores[cat.id as keyof typeof scores] === opt.pt;
                return (
                  <label
                    key={opt.pt}
                    className={`relative flex items-center gap-3 min-h-[44px] px-4 py-3 cursor-pointer border-t border-line transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-gold ${marcado ? 'bg-navy text-white' : 'bg-white text-ink hover:bg-thead'}`}
                  >
                    <input type="radio" name={`cdr-${cat.id}`} checked={marcado} onChange={() => escolher(cat.id, opt.pt)} className="sr-only" />
                    <span className="flex-1 text-sm leading-snug">{opt.desc}</span>
                    <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded tabular-nums ${marcado ? 'bg-white/20 text-white' : 'bg-thead text-ink-3'}`}>{opt.pt === 0 ? '0' : '+' + opt.pt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </Container>

      <div className="sticky bottom-0 mt-auto z-sticky bg-white border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto w-full max-w-form px-4 py-3 flex flex-wrap items-center justify-between gap-3" role="status" aria-live="polite">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-semibold text-ink-3">Escore global CDR</p>
              <p className="text-kpi font-extrabold text-navy tabular-nums">{globalScore}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-3">CDR-SB</p>
              <p className="text-h2 font-bold text-ink tabular-nums">{sbScore}</p>
            </div>
            <StatusTag tone={TOM_ESTAGIO[globalScore] ?? 'neutral'}>{stage.titulo} ({stage.sub})</StatusTag>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon="info" onClick={() => setIsModalOpen(true)}>Interpretação</Button>
            <Button icon={isCopied ? 'done_all' : 'content_copy'} disabled={isCopied} onClick={handleCopy}>{isCopied ? 'Copiado' : 'Copiar resultado'}</Button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Dialog title="Interpretação dos resultados" icon="info" size="md" onClose={() => setIsModalOpen(false)} footer={<Button variant="secondary" onClick={() => setIsModalOpen(false)}>Fechar</Button>}>
          <div className="overflow-x-auto scroll-x-visible">
            <table className="w-full text-left text-sm text-ink border-collapse">
              <thead className="bg-thead text-ink-3 text-xs">
                <tr><th scope="col" className="px-3 py-2 border-b border-line">Global CDR</th><th scope="col" className="px-3 py-2 border-b border-line">CDR-SB</th><th scope="col" className="px-3 py-2 border-b border-line">Demência</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr><td className="px-3 py-2 font-medium">0</td><td className="px-3 py-2">0</td><td className="px-3 py-2">Normal (sem demência)</td></tr>
                <tr><td className="px-3 py-2 font-medium">0.5</td><td className="px-3 py-2">0.5-4.0</td><td className="px-3 py-2">Questionável a muito leve</td></tr>
                <tr><td className="px-3 py-2 font-medium">1</td><td className="px-3 py-2">4.5-9.0</td><td className="px-3 py-2">Leve</td></tr>
                <tr className="bg-wine-50"><td className="px-3 py-2 font-medium">2</td><td className="px-3 py-2">9.5-15.5</td><td className="px-3 py-2 font-medium text-navy">Moderada</td></tr>
                <tr className="bg-wine-100"><td className="px-3 py-2 font-bold text-wine-800">3</td><td className="px-3 py-2">16.0-18.0</td><td className="px-3 py-2 font-bold text-wine-800">Grave</td></tr>
              </tbody>
            </table>
          </div>
        </Dialog>
      )}
    </div>
  );
};

// Escala de Webster para Doença de Parkinson — 10 domínios, 0 a 3 pontos cada (total 0 a 30).
// Fonte: planilha da JRS (Escala/Interpretação), tradução livre do MDCalc.
const websterData = [
  { id: 1, nome: 'Bradicinesia das mãos', opcoes: [
      "Nenhuma.",
      "Lentificação detectável da velocidade de pronossupinação; dificuldade inicial no manuseio de ferramentas, para abotoar roupas e na escrita.",
      "Lentificação moderada da pronossupinação (um ou ambos os lados); comprometimento moderado da função da mão; escrita muito prejudicada, com micrografia.",
      "Lentificação grave da pronossupinação; incapaz de escrever ou abotoar roupas; dificuldade acentuada no manuseio de utensílios."
  ]},
  { id: 2, nome: 'Rigidez', opcoes: [
      "Não detectável.",
      "Rigidez detectável no pescoço e nos ombros; fenômeno de ativação presente; rigidez de repouso nos braços leve ou ausente (um ou ambos).",
      "Rigidez moderada (pescoço e ombros); rigidez de repouso presente se o paciente estiver sem medicação.",
      "Rigidez grave (pescoço e ombros); rigidez de repouso não revertida pela medicação."
  ]},
  { id: 3, nome: 'Postura', opcoes: [
      "Postura normal; cabeça fletida para a frente < 10 cm.",
      "Início de coluna rígida em bloco (\"poker spine\"); cabeça fletida para a frente > 13 cm.",
      "Início de flexão dos braços; cabeça fletida até 15 cm; braços elevados (um ou ambos), mas ainda abaixo da cintura.",
      "Início de postura simiesca; cabeça fletida para a frente > 15 cm; mãos elevadas acima da cintura (uma ou ambas); flexão acentuada das mãos; início de extensão interfalangiana e de flexão dos joelhos."
  ]},
  { id: 4, nome: 'Balanço dos membros superiores', opcoes: [
      "Balança bem os dois braços.",
      "Balanço de um braço nitidamente diminuído.",
      "Um braço não balança.",
      "Os dois braços não balançam."
  ]},
  { id: 5, nome: 'Marcha', opcoes: [
      "Passada de 46 a 76 cm; gira sem esforço.",
      "Passada encurtada para 30 a 46 cm; começa a bater um calcanhar no chão; giro mais lento, exigindo vários passos.",
      "Passada moderadamente encurtada para 15 a 30 cm; os dois calcanhares começam a bater no chão com força.",
      "Início de marcha arrastada; passos < 7,6 cm; bloqueios ou hesitações ocasionais da marcha; anda na ponta dos pés; gira muito lentamente."
  ]},
  { id: 6, nome: 'Tremor', opcoes: [
      "Sem tremor detectável.",
      "Amplitude pico a pico < 2,5 cm nos membros ou na cabeça, em repouso, ou em qualquer das mãos ao caminhar ou na prova índex-nariz.",
      "Amplitude máxima do tremor não excede 10 cm; tremor intenso, mas não constante; o paciente mantém algum controle das mãos.",
      "Amplitude do tremor > 10 cm; tremor intenso e constante, persistente durante a vigília (salvo tremor cerebelar puro); escrever e alimentar-se sozinho são impossíveis."
  ]},
  { id: 7, nome: 'Fácies', opcoes: [
      "Normal; mímica plena; sem olhar fixo.",
      "Imobilidade detectável; boca fechada; início de traços de ansiedade ou depressão.",
      "Imobilidade moderada; a emoção só se manifesta com limiar muito aumentado; lábios entreabertos parte do tempo; aparência moderada de ansiedade ou depressão; pode haver sialorreia.",
      "Fácies congelada; boca aberta ≥ 0,6 cm; sialorreia intensa."
  ]},
  { id: 8, nome: 'Seborreia', opcoes: [
      "Nenhuma.",
      "Aumento da transpiração; secreções finas.",
      "Oleosidade evidente; secreção bem mais espessa.",
      "Seborreia acentuada; face e couro cabeludo inteiramente cobertos por secreção espessa."
  ]},
  { id: 9, nome: 'Fala', opcoes: [
      "Clara, alta, ressonante, facilmente compreendida.",
      "Início de rouquidão, perda de inflexão e ressonância; bom volume, ainda facilmente compreendida.",
      "Rouquidão ou fraqueza vocal moderada; monotonia constante, sem variação de tom; início de disartria, hesitação e gagueira; difícil de compreender.",
      "Aspereza ou fraqueza vocal acentuada; muito difícil de ouvir e compreender."
  ]},
  { id: 10, nome: 'Autocuidado', opcoes: [
      "Sem comprometimento.",
      "Ainda realiza todo o autocuidado, mas a velocidade para se vestir está nitidamente reduzida; capaz de morar sozinho; pode manter atividade laboral.",
      "Necessita de ajuda em algumas áreas críticas; muito lento na maioria das atividades, mas as realiza levando muito tempo.",
      "Incapacidade contínua; incapaz de vestir-se, alimentar-se ou andar sozinho."
  ]}
];

function getWebsterGrau(total: number): { titulo: string; tom: StatusTone } {
  if (total >= 21) return { titulo: 'Doença grave ou avançada', tom: 'danger' };
  if (total >= 11) return { titulo: 'Incapacidade moderada', tom: 'attention' };
  if (total >= 1) return { titulo: 'Doença inicial', tom: 'neutral' };
  return { titulo: 'Sem achados', tom: 'success' };
}

// Calculadora de Webster no mesmo padrão da CDR: rádios de 44 px por domínio e painel fixo com o
// total. Começa sem marcações (como a planilha): o resultado só é dado com os 10 itens preenchidos.
const WebsterCalculator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const preenchidos = websterData.filter(d => scores[d.id] !== undefined).length;
  const completo = preenchidos === websterData.length;
  const total = websterData.reduce((acc, d) => acc + (scores[d.id] ?? 0), 0);
  const grau = getWebsterGrau(total);

  const handleCopy = async () => {
    const text = `WEBSTER RATING SCALE FOR PARKINSON'S DISEASE:\n\n${websterData.map(d => `- ${d.nome} = ${scores[d.id]}`).join('\n')}\n-------------------------------\n- Pontuação total = ${total}/30\n\n- RESULTADO: ${grau.titulo.toUpperCase()}`;
    try { await navigator.clipboard.writeText(text); setIsCopied(true); if (navigator.share) await navigator.share({ title: 'Avaliação Escala de Webster', text }); } catch (err) { if ((err as Error).name !== 'AbortError') console.error(err); }
  };

  const escolher = (id: number, pt: number) => { setScores(sc => ({ ...sc, [id]: pt })); setIsCopied(false); };

  return (
    <div className="flex flex-col flex-1">
      <Container size="form" className="py-6 md:py-8 pb-6 space-y-5">
        <PageHeader
          title="Escala de Webster"
          description="Webster Rating Scale for Parkinson’s Disease: 10 domínios, de 0 a 3 pontos cada."
          actions={<Button variant="secondary" icon="arrow_back" onClick={onClose}>Voltar à doença</Button>}
        />
        {websterData.map(cat => (
          <div key={cat.id} role="radiogroup" aria-labelledby={`webster-${cat.id}`} className="bg-white border border-line rounded-xl overflow-hidden">
            <h2 id={`webster-${cat.id}`} className="text-h3 font-bold text-navy px-4 pt-4 pb-2"><span className="text-ink-3 font-normal">{cat.id}.</span> {cat.nome}</h2>
            <div className="flex flex-col">
              {cat.opcoes.map((desc, pt) => {
                const marcado = scores[cat.id] === pt;
                return (
                  <label
                    key={pt}
                    className={`relative flex items-center gap-3 min-h-[44px] px-4 py-3 cursor-pointer border-t border-line transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-gold ${marcado ? 'bg-navy text-white' : 'bg-white text-ink hover:bg-thead'}`}
                  >
                    <input type="radio" name={`webster-${cat.id}`} checked={marcado} onChange={() => escolher(cat.id, pt)} className="sr-only" />
                    <span className="flex-1 text-sm leading-snug">{desc}</span>
                    <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded tabular-nums ${marcado ? 'bg-white/20 text-white' : 'bg-thead text-ink-3'}`}>{pt === 0 ? '0' : '+' + pt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </Container>

      <div className="sticky bottom-0 mt-auto z-sticky bg-white border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto w-full max-w-form px-4 py-3 flex flex-wrap items-center justify-between gap-3" role="status" aria-live="polite">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-semibold text-ink-3">Pontuação total</p>
              <p className="text-kpi font-extrabold text-navy tabular-nums">{total}<span className="text-h3 font-bold text-ink-3">/30</span></p>
            </div>
            {completo
              ? <StatusTag tone={grau.tom}>{grau.titulo}</StatusTag>
              : <StatusTag tone="neutral">Preencha os 10 itens ({preenchidos}/10)</StatusTag>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon="info" onClick={() => setIsModalOpen(true)}>Interpretação</Button>
            <Button icon={isCopied ? 'done_all' : 'content_copy'} disabled={isCopied || !completo} onClick={handleCopy}>{isCopied ? 'Copiado' : 'Copiar resultado'}</Button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Dialog title="Interpretação dos resultados" icon="info" size="md" onClose={() => setIsModalOpen(false)} footer={<Button variant="secondary" onClick={() => setIsModalOpen(false)}>Fechar</Button>}>
          <p className="text-sm text-ink-3 mb-3">Pontuação total de 0 a 30 (10 itens, 0 a 3 pontos cada).</p>
          <div className="overflow-x-auto scroll-x-visible">
            <table className="w-full text-left text-sm text-ink border-collapse">
              <thead className="bg-thead text-ink-3 text-xs">
                <tr><th scope="col" className="px-3 py-2 border-b border-line">Pontuação</th><th scope="col" className="px-3 py-2 border-b border-line">Grau de incapacidade</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr><td className="px-3 py-2 font-medium">1 a 10</td><td className="px-3 py-2">Doença inicial</td></tr>
                <tr className="bg-wine-50"><td className="px-3 py-2 font-medium">11 a 20</td><td className="px-3 py-2 font-medium text-navy">Incapacidade moderada</td></tr>
                <tr className="bg-wine-100"><td className="px-3 py-2 font-bold text-wine-800">21 a 30</td><td className="px-3 py-2 font-bold text-wine-800">Doença grave ou avançada</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-3 mt-3 leading-relaxed">Webster DD. Critical analysis of the disability in Parkinson's disease. Mod Treat. 1968;5(2):257-82. Tradução livre a partir do MDCalc.</p>
        </Dialog>
      )}
    </div>
  );
};

// Child-Pugh: três exames digitados (a pontuação sai das faixas) e dois achados clínicos escolhidos
// como nas calculadoras CDR e Webster. Cada variável vale de 1 a 3 pontos (total 5 a 15).
const childPughLab = [
  { id: 'bili', nome: 'Bilirrubina total', unidade: 'mg/dL',
    pontos: (v: number) => (v < 2 ? 1 : v <= 3 ? 2 : 3) },
  { id: 'alb', nome: 'Albumina', unidade: 'g/dL',
    pontos: (v: number) => (v > 3.5 ? 1 : v >= 2.8 ? 2 : 3) },
  { id: 'inr', nome: 'INR', unidade: '',
    pontos: (v: number) => (v < 1.7 ? 1 : v <= 2.3 ? 2 : 3) },
] as const;

const childPughClinico = [
  { id: 'ascite', nome: 'Ascite', opcoes: ['Ausente', 'Leve', 'Moderada'] },
  { id: 'encef', nome: 'Encefalopatia hepática', opcoes: ['Sem encefalopatia', 'Grau 1-2', 'Grau 3-4'] },
] as const;

const grausEncefalopatia = [
  { grau: 'Grau 0', desc: 'Consciência, personalidade, exame neurológico e eletroencefalograma normais.' },
  { grau: 'Grau 1', desc: 'Inquietação, distúrbio do sono, irritabilidade/agitação, tremor, escrita prejudicada; ondas de 5 ciclos/s.' },
  { grau: 'Grau 2', desc: 'Letargia, desorientação temporal, comportamento inadequado, asterixis, ataxia; ondas trifásicas lentas.' },
  { grau: 'Grau 3', desc: 'Sonolência, estupor, desorientação espacial, hiper-reflexia, rigidez; ondas mais lentas.' },
  { grau: 'Grau 4', desc: 'Coma sem resposta a estímulos, sem personalidade/comportamento, descerebração; atividade delta lenta de 2-3 ciclos/s.' },
];

function getChildPughClasse(total: number): { classe: string; prognostico: string; tom: StatusTone } {
  if (total >= 10) return { classe: 'C', prognostico: 'mau prognóstico', tom: 'danger' };
  if (total >= 7) return { classe: 'B', prognostico: 'prognóstico intermediário', tom: 'attention' };
  return { classe: 'A', prognostico: 'bom prognóstico', tom: 'success' };
}

const lerNumero = (txt: string) => {
  const v = parseFloat(txt.replace(',', '.'));
  return txt.trim() !== '' && Number.isFinite(v) && v >= 0 ? v : null;
};

const ChildPughCalculator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [valores, setValores] = useState<Record<string, string>>({ bili: '', alb: '', inr: '' });
  const [clinico, setClinico] = useState<Record<string, number>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEncefOpen, setIsEncefOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const labPontos = childPughLab.map(v => { const n = lerNumero(valores[v.id]); return n === null ? null : v.pontos(n); });
  const preenchidos = labPontos.filter(p => p !== null).length + childPughClinico.filter(c => clinico[c.id] !== undefined).length;
  const completo = preenchidos === 5;
  const total = labPontos.reduce<number>((acc, p) => acc + (p ?? 0), 0) + childPughClinico.reduce((acc, c) => acc + (clinico[c.id] !== undefined ? clinico[c.id] + 1 : 0), 0);
  const res = getChildPughClasse(total);

  const handleCopy = async () => {
    const linhasLab = childPughLab.map((v, i) => `- ${v.nome} = ${valores[v.id].trim().replace('.', ',')}${v.unidade ? ' ' + v.unidade : ''} (+${labPontos[i]})`);
    const linhasClin = childPughClinico.map(c => `- ${c.nome} = ${c.opcoes[clinico[c.id]]} (+${clinico[c.id] + 1})`);
    const text = `CHILD-PUGH SCORE:\n\n${[...linhasLab, ...linhasClin].join('\n')}\n-------------------------------\n- Pontuação total = ${total}\n\n- RESULTADO: CLASSE ${res.classe} (${res.prognostico.toUpperCase()})`;
    try { await navigator.clipboard.writeText(text); setIsCopied(true); if (navigator.share) await navigator.share({ title: 'Avaliação Child-Pugh', text }); } catch (err) { if ((err as Error).name !== 'AbortError') console.error(err); }
  };

  const alterarValor = (id: string, txt: string) => { setValores(v => ({ ...v, [id]: txt })); setIsCopied(false); };
  const escolher = (id: string, idx: number) => { setClinico(c => ({ ...c, [id]: idx })); setIsCopied(false); };

  return (
    <div className="flex flex-col flex-1">
      <Container size="form" className="py-6 md:py-8 pb-6 space-y-5">
        <PageHeader
          title="Child-Pugh"
          description="Classificação de Child-Turcotte-Pugh: 5 variáveis, de 1 a 3 pontos cada."
          actions={<Button variant="secondary" icon="arrow_back" onClick={onClose}>Voltar à doença</Button>}
        />
        {childPughLab.map((v, i) => (
          <div key={v.id} className="bg-white border border-line rounded-xl p-4">
            <label htmlFor={`cp-${v.id}`} className="block text-h3 font-bold text-navy mb-3">{v.nome}{v.unidade && <span className="text-ink-3 font-normal"> ({v.unidade})</span>}</label>
            <div className="flex items-center gap-3">
              <input
                id={`cp-${v.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Valor do exame"
                value={valores[v.id]}
                onChange={e => alterarValor(v.id, e.target.value)}
                aria-invalid={valores[v.id].trim() !== '' && labPontos[i] === null ? true : undefined}
                className={`${controlClass} ${valores[v.id].trim() !== '' && labPontos[i] === null ? controlErrorClass : ''}`}
              />
              <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded tabular-nums ${labPontos[i] !== null ? 'bg-navy text-white' : 'bg-thead text-ink-3'}`}>{labPontos[i] !== null ? '+' + labPontos[i] : '—'}</span>
            </div>
          </div>
        ))}
        {childPughClinico.map(cat => (
          <div key={cat.id} role="radiogroup" aria-labelledby={`cp-${cat.id}`} className="bg-white border border-line rounded-xl overflow-hidden">
            <h2 id={`cp-${cat.id}`} className="text-h3 font-bold text-navy px-4 pt-4 pb-2">
              {cat.id === 'encef' ? (
                <button type="button" onClick={() => setIsEncefOpen(true)} className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
                  {cat.nome}
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
                  <span className="sr-only">(ver graus de encefalopatia)</span>
                </button>
              ) : cat.nome}
            </h2>
            <div className="flex flex-col">
              {cat.opcoes.map((desc, idx) => {
                const marcado = clinico[cat.id] === idx;
                return (
                  <label
                    key={idx}
                    className={`relative flex items-center gap-3 min-h-[44px] px-4 py-3 cursor-pointer border-t border-line transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-gold ${marcado ? 'bg-navy text-white' : 'bg-white text-ink hover:bg-thead'}`}
                  >
                    <input type="radio" name={`cp-${cat.id}`} checked={marcado} onChange={() => escolher(cat.id, idx)} className="sr-only" />
                    <span className="flex-1 text-sm leading-snug">{desc}</span>
                    <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded tabular-nums ${marcado ? 'bg-white/20 text-white' : 'bg-thead text-ink-3'}`}>+{idx + 1}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </Container>

      <div className="sticky bottom-0 mt-auto z-sticky bg-white border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto w-full max-w-form px-4 py-3 flex flex-wrap items-center justify-between gap-3" role="status" aria-live="polite">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-semibold text-ink-3">Pontuação total</p>
              <p className="text-kpi font-extrabold text-navy tabular-nums">{completo ? total : '—'}</p>
            </div>
            {completo
              ? <StatusTag tone={res.tom}>Classe {res.classe} ({res.prognostico})</StatusTag>
              : <StatusTag tone="neutral">Preencha as 5 variáveis ({preenchidos}/5)</StatusTag>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon="info" onClick={() => setIsModalOpen(true)}>Interpretação</Button>
            <Button icon={isCopied ? 'done_all' : 'content_copy'} disabled={isCopied || !completo} onClick={handleCopy}>{isCopied ? 'Copiado' : 'Copiar resultado'}</Button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Dialog title="Interpretação dos resultados" icon="info" size="md" onClose={() => setIsModalOpen(false)} footer={<Button variant="secondary" onClick={() => setIsModalOpen(false)}>Fechar</Button>}>
          <div className="overflow-x-auto scroll-x-visible">
            <table className="w-full text-left text-sm text-ink border-collapse">
              <thead className="bg-thead text-ink-3 text-xs">
                <tr><th scope="col" className="px-3 py-2 border-b border-line">Pontuação</th><th scope="col" className="px-3 py-2 border-b border-line">Classe</th><th scope="col" className="px-3 py-2 border-b border-line">Prognóstico</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr><td className="px-3 py-2 font-medium">5 a 6</td><td className="px-3 py-2">A</td><td className="px-3 py-2">Bom prognóstico</td></tr>
                <tr className="bg-wine-50"><td className="px-3 py-2 font-medium">7 a 9</td><td className="px-3 py-2 font-medium text-navy">B</td><td className="px-3 py-2 font-medium text-navy">Prognóstico intermediário</td></tr>
                <tr className="bg-wine-100"><td className="px-3 py-2 font-bold text-wine-800">10 a 15</td><td className="px-3 py-2 font-bold text-wine-800">C</td><td className="px-3 py-2 font-bold text-wine-800">Mau prognóstico</td></tr>
              </tbody>
            </table>
          </div>
        </Dialog>
      )}

      {isEncefOpen && (
        <Dialog title="Graus de encefalopatia" icon="info" size="md" onClose={() => setIsEncefOpen(false)} footer={<Button variant="secondary" onClick={() => setIsEncefOpen(false)}>Fechar</Button>}>
          <ul className="space-y-3">
            {grausEncefalopatia.map(g => (
              <li key={g.grau} className="text-sm text-ink leading-relaxed"><span className="font-bold text-navy">{g.grau}:</span> {g.desc}</li>
            ))}
          </ul>
          <p className="text-xs text-ink-3 mt-3">Fonte: FDA (via MDCalc). Tradução livre.</p>
        </Dialog>
      )}
    </div>
  );
};

const getDiseaseIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("espondilite")) return <span className="material-symbols-outlined text-[22px] text-navy">orthopedics</span>;
  if (lower.includes("neoplasia")) return <span className="material-symbols-outlined text-[22px] text-navy">oncology</span>;
  if (lower.includes("pênfigo") || lower.includes("penfigo")) return <span className="material-symbols-outlined text-[22px] text-navy">dermatology</span>;
  if (lower.includes("hanseníase") || lower.includes("hanseniase")) return <span className="material-symbols-outlined text-[22px] text-navy">dermatology</span>;
  if (lower.includes("fibrose")) return <span className="material-symbols-outlined text-[22px] text-navy">pulmonology</span>;
  if (lower.includes("tuberculose")) return <span className="material-symbols-outlined text-[22px] text-navy">pulmonology</span>;
  if (lower.includes("nefropatia")) return <span className="material-symbols-outlined text-[22px] text-navy">nephrology</span>;
  if (lower.includes("paget")) return <span className="material-symbols-outlined text-[22px] text-navy">skeleton</span>;
  if (lower.includes("alienação") || lower.includes("alienacao")) return <span className="material-symbols-outlined text-[22px] text-navy">psychology</span>;
  if (lower.includes("parkinson")) return <span className="material-symbols-outlined text-[22px] text-navy">neurology</span>;
  if (lower.includes("esclerose")) return <span className="material-symbols-outlined text-[22px] text-navy">neurology</span>;
  if (lower.includes("hepatopatia")) return <span className="material-symbols-outlined text-[22px] text-navy">gastroenterology</span>;

  switch(name) {
    case "Cardiopatia Grave": return <HeartPulse className="text-navy" size={22} />;
    case "Cegueira": return <EyeOff className="text-navy" size={22} />;
    case "Contaminação por Radiação": return <Radiation className="text-navy" size={22} />;
    case "Paralisia Irreversível e Incapacitante": return <Accessibility className="text-navy" size={22} />;
    case "SIDA/AIDS": return <Ribbon className="text-navy" size={22} />;
    default: return <span className="material-symbols-outlined text-[22px] text-navy">stethoscope</span>;
  }
};

const getShortDiseaseName = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("alienação") || lower.includes("alienacao")) return "ALIENAÇÃO";
  if (lower.includes("cardiopatia")) return "CARDIOPATIA";
  if (lower.includes("cegueira")) return "CEGUEIRA";
  if (lower.includes("radiação") || lower.includes("radiacao")) return "RADIAÇÃO";
  if (lower.includes("parkinson")) return "PARKINSON";
  if (lower.includes("esclerose")) return "ESCLEROSE";
  if (lower.includes("espondilite")) return "ESPONDILITE";
  if (lower.includes("paget")) return "PAGET";
  if (lower.includes("fibrose")) return "FIBROSE CÍSTICA";
  if (lower.includes("hanseníase") || lower.includes("hanseniase")) return "HANSENÍASE";
  if (lower.includes("hepatopatia")) return "HEPATOPATIA";
  if (lower.includes("nefropatia")) return "NEFROPATIA";
  if (lower.includes("neoplasia")) return "NEOPLASIA";
  if (lower.includes("paralisia")) return "PARALISIA";
  if (lower.includes("pênfigo") || lower.includes("penfigo")) return "PÊNFIGO";
  if (lower.includes("sida") || lower.includes("aids")) return "SIDA/AIDS";
  if (lower.includes("tuberculose")) return "TUBERCULOSE";
  return name.toUpperCase();
};

interface DiseaseGuideProps {
  /**
   * Versão pública (sem login, ver components/publico/AppPublico.tsx): os
   * links passam a apontar para /publico/doencas e para a Portaria pública.
   * O conteúdo é o mesmo — vem todo de constants.ts, sem Firestore.
   */
  publico?: boolean;
}

export const DiseaseGuide: React.FC<DiseaseGuideProps> = ({ publico = false }) => {
  // Os três níveis são rotas: /beneficios/doencas · /:doencaId · /:doencaId/:diagnosticoIdx
  const navigate = useNavigate();
  const nav = useContext(NavContext);
  const { doencaId, diagnosticoIdx } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const selectedDisease: Disease | null = DISEASES.find(d => d.id === doencaId) ?? null;
  // Doença com um único diagnóstico abre direto o detalhe (sem o nível intermediário).
  const diagIdx = diagnosticoIdx !== undefined ? Number(diagnosticoIdx) : (selectedDisease?.diagnoses.length === 1 ? 0 : -1);
  const selectedDiagnosis: Diagnosis | null = selectedDisease?.diagnoses[diagIdx] ?? null;
  const documentos = selectedDiagnosis?.documents ?? selectedDisease?.documents ?? [];
  // Mesma tela em dois endereços: /beneficios/doencas (app) e /publico/doencas.
  const dPath = (id: string, idx?: number) => doencaPath(id, idx, publico ? PUBLICO_DOENCAS : undefined);
  useBreadcrumbs(
    !selectedDisease ? [] :
    selectedDiagnosis && selectedDisease.diagnoses.length > 1
      ? [{ label: selectedDisease.name, to: dPath(selectedDisease.id) }, { label: selectedDiagnosis.name }]
      : [{ label: selectedDisease.name }]
  );
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null);
  const [isPragmatismModalOpen, setIsPragmatismModalOpen] = useState(false);
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const [isCdrImageOpen, setIsCdrImageOpen] = useState(false);
  const [isRettModalOpen, setIsRettModalOpen] = useState(false);
  const [isAutismModalOpen, setIsAutismModalOpen] = useState(false);
  const [isCatAModalOpen, setIsCatAModalOpen] = useState(false);
  const [isCatBModalOpen, setIsCatBModalOpen] = useState(false);
  const [isCatCModalOpen, setIsCatCModalOpen] = useState(false);
  const [isBavModalOpen, setIsBavModalOpen] = useState(false);
  const [isBavImageExpanded, setIsBavImageExpanded] = useState(false);
  const [calculadoraAberta, setCalculadoraAberta] = useState<'cdr' | 'webster' | 'childpugh' | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  // Checklist de documentos reunidos: guardado neste aparelho, por doença/diagnóstico.
  const [docsMarcados, setDocsMarcados] = useState<Set<number>>(new Set());
  const chaveDocs = `jrs_docs_${selectedDisease?.id ?? ''}_${selectedDiagnosis?.name ?? ''}`;
  const alterarDocs = (atualiza: (s: Set<number>) => Set<number>) => setDocsMarcados(prev => {
    const proximo = atualiza(prev);
    try { localStorage.setItem(chaveDocs, JSON.stringify(Array.from(proximo))); } catch { /* sem localStorage */ }
    return proximo;
  });
  const podeVerPortaria = publico || canAccessPage('portaria', nav?.authUser?.perfil);
  const portariaPath = publico ? PUBLICO_PORTARIA : pathForView('portaria');

  useEffect(() => {
    setIsCopied(false);
    try { setDocsMarcados(new Set(JSON.parse(localStorage.getItem(chaveDocs) || '[]'))); } catch { setDocsMarcados(new Set()); }
  }, [chaveDocs]);

  const handleDiseaseClick = (disease: Disease) => navigate(dPath(disease.id));

  const handleCopy = async () => {
    if (!selectedDisease || !selectedDiagnosis) return;
    const copyText = `Doença: ${selectedDisease.name}\nDiagnóstico: ${selectedDiagnosis.name}\n\nDefinição:\n${selectedDisease.definition}\n\nCritérios de Gravidade:\n${selectedDiagnosis.criteria.map(c => `- ${c}`).join('\n')}\n\nDocumentos Necessários:\n${documentos.map(d => `- ${d}`).join('\n')}`;
    try { await navigator.clipboard.writeText(copyText); setIsCopied(true); } catch (error) { console.error(error); }
  };

  const handleDownloadPDF = () => {
    if (!selectedDisease || !selectedDiagnosis) return;
    const doc = new jsPDF();
    let yPos = 20;
    const margin = 15;
    const maxLineWidth = doc.internal.pageSize.width - margin * 2;
    doc.setFontSize(18); doc.setTextColor(5, 15, 65); doc.text(selectedDisease.name, margin, yPos); yPos += 8;
    if (selectedDisease.diagnoses.length > 1) { doc.setFontSize(12); doc.setTextColor(100,100,100); doc.text(`Diagnóstico: ${selectedDiagnosis.name}`, margin, yPos); yPos += 12; } else yPos += 4;
    doc.setFontSize(14); doc.setTextColor(5,15,65); doc.text("Definição", margin, yPos); yPos += 6;
    doc.setFontSize(10); doc.setTextColor(60,60,60);
    const defLines = doc.splitTextToSize(selectedDisease.definition, maxLineWidth);
    doc.text(defLines, margin, yPos); yPos += defLines.length * 5 + 8;
    doc.setFontSize(14); doc.setTextColor(5,15,65); doc.text("Critérios de Gravidade", margin, yPos); yPos += 6;
    doc.setFontSize(10); doc.setTextColor(60,60,60);
    selectedDiagnosis.criteria.forEach(crit => {
      const lines = doc.splitTextToSize(`• ${crit}`, maxLineWidth);
      if (yPos + lines.length * 5 > doc.internal.pageSize.height - margin) { doc.addPage(); yPos = margin + 10; }
      doc.text(lines, margin, yPos); yPos += lines.length * 5 + 3;
    });
    const safeName = selectedDisease.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    doc.save(`guia-${safeName}.pdf`);
  };

  const filteredDiseases = DISEASES.filter(disease => {
    const query = searchQuery.toLowerCase();
    return disease.name.toLowerCase().includes(query) || disease.diagnoses.some(diag =>
      diag.name.toLowerCase().includes(query) || diag.criteria.some(crit => crit.toLowerCase().includes(query)));
  });

  const searchResults: { type: string, id: string, name: string, sub?: string, disease: Disease, diagnosis?: Diagnosis }[] = [];
  if (searchQuery.trim().length > 0) {
    const query = searchQuery.toLowerCase();
    DISEASES.forEach(disease => {
      if (disease.name.toLowerCase().includes(query)) searchResults.push({ type: 'disease', id: `dz-${disease.id}`, name: disease.name, disease });
      disease.diagnoses.forEach((diag, idx) => {
        if (diag.name.toLowerCase().includes(query)) searchResults.push({ type: 'diagnosis', id: `dg-${disease.id}-${idx}`, name: diag.name, sub: `em ${disease.name}`, disease, diagnosis: diag });
        diag.criteria.forEach((crit, critIdx) => {
          if (crit.toLowerCase().includes(query)) searchResults.push({ type: 'criterion', id: `crit-${disease.id}-${idx}-${critIdx}`, name: crit, sub: `Critério para ${diag.name}`, disease, diagnosis: diag });
        });
      });
    });
  }

  const handleSearchResultClick = (result: any) => {
    if (result.diagnosis) {
      navigate(dPath(result.disease.id, result.disease.diagnoses.indexOf(result.diagnosis)));
    } else {
      navigate(dPath(result.disease.id));
      setSearchQuery("");
    }
  };

  if (calculadoraAberta === 'cdr') return <CdrCalculator onClose={() => setCalculadoraAberta(null)} />;
  if (calculadoraAberta === 'webster') return <WebsterCalculator onClose={() => setCalculadoraAberta(null)} />;
  if (calculadoraAberta === 'childpugh') return <ChildPughCalculator onClose={() => setCalculadoraAberta(null)} />;

  // PAGE LEVEL 2: Diagnoses List for a specific disease
  if (selectedDisease && !selectedDiagnosis) {
    return (
      <div className="flex flex-col flex-1 relative">
        <Container size="reading" className="py-6 md:py-8 pb-10 space-y-6">
          <PageHeader title={selectedDisease.name} description="Selecione o diagnóstico pericial associado" />

          <div className="grid grid-cols-1 gap-3">
            {selectedDisease.diagnoses.map((diagnosis, idx) => (
              <Link
                key={idx}
                to={dPath(selectedDisease.id, idx)}
                className="bg-white rounded-xl p-4 border border-line hover:border-navy transition-colors flex items-center justify-between gap-3 min-h-[64px] group"
              >
                <span className="flex items-center gap-3.5 min-w-0">
                  <span className="w-10 h-10 rounded-lg bg-thead flex items-center justify-center shrink-0 [&>svg]:text-navy">
                    {getDiseaseIcon(selectedDisease.name)}
                  </span>
                  <span className="text-base font-bold text-navy">{diagnosis.name}</span>
                </span>
                <ChevronRight size={20} className="text-ink-4 group-hover:text-navy shrink-0" />
              </Link>
            ))}
          </div>
        </Container>
      </div>
    );
  }

  // PAGE LEVEL 3: Final Detail — leitura em 8 colunas (≈70 caracteres por linha)
  // + aside de 4 com os documentos necessários (checklist) e as ações rotuladas.
  if (selectedDisease && selectedDiagnosis) {
    const isDemencia = selectedDisease.name === "Alienação Mental" && selectedDiagnosis.name === "Demência";
    const isParkinson = selectedDisease.id === "doenca_de_parkinson";
    const isHepatopatia = selectedDisease.id === "hepatopatias_graves";
    const totalDocs = documentos.length;
    const secao = 'bg-white rounded-xl p-5 md:p-6 border border-line';
    const tituloSecao = 'font-heading font-bold text-h2 text-navy mb-3 pb-2 border-b border-line';
    return (
      <div className="flex flex-col flex-1 relative">
        <Container size="data" className="@container py-6 md:py-8 pb-6 md:pb-10">
          <PageHeader
            title={selectedDisease.name}
            description={selectedDisease.diagnoses.length > 1 ? `Diagnóstico pericial: ${selectedDiagnosis.name}` : undefined}
          />

          <div className="@split:grid @split:grid-cols-12 @split:gap-8 @split:items-start space-y-6 @split:space-y-0">
            <div className="@split:col-span-8 space-y-6 min-w-0">
              <section className={secao}>
                <h2 className={tituloSecao}>Definição
                </h2>
                <p className="text-base text-ink leading-relaxed">{selectedDisease.definition}</p>
              </section>

              {selectedDisease.sections?.map(sec => (
                <section key={sec.title} className={secao}>
                  <h2 className={tituloSecao}>{sec.title}
                  </h2>
                  <ul className="space-y-2 list-disc pl-5 marker:text-navy">
                    {sec.items.map((item, idx) => <li key={idx} className="text-base text-ink leading-relaxed">{item}</li>)}
                  </ul>
                </section>
              ))}

              {isHepatopatia && (
                <section className={secao}>
                  <h2 className={tituloSecao}>Classificação de Child-Pugh
                  </h2>
                  <p className="text-sm text-ink-3 mb-4">A classe de Child-Pugh estima a gravidade da doença hepática e fundamenta o enquadramento como doença prevista em lei.</p>
                  <Button icon="calculate" fullWidth onClick={() => setCalculadoraAberta('childpugh')}>Child-Pugh Score Calculator</Button>
                </section>
              )}

              {selectedDisease.name === "SIDA/AIDS" && (
                <section className={secao}>
                  <h2 className={tituloSecao}>Classificação
                  </h2>
                  <div className="overflow-x-auto scroll-x-visible">
                    <table className="w-full text-left text-sm text-ink border-collapse border border-line">
                      <thead className="bg-thead text-navy">
                        <tr>{['Grupo', 'CD4', 'A', 'B', 'C'].map(h => <th key={h} scope="col" className="px-3 py-2 border border-line font-bold">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {[['I', '≥ 500'], ['II', '200-499'], ['III', '< 200']].map(([grupo, cd4], i) => (
                          <tr key={grupo}>
                            <th scope="row" className="px-3 py-2 border border-line font-normal">{grupo}</th>
                            <td className="px-3 py-2 border border-line">{cd4}</td>
                            {['A', 'B', 'C'].map(cat => {
                              const aids = cat === 'C' || i === 2;
                              return <td key={cat} className={`px-3 py-2 border border-line ${aids ? 'bg-wine-100 font-bold text-wine-800' : ''}`}>{cat}{i + 1}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-ink-3 italic mt-3">A3, B3 e C são considerados SIDA/AIDS.</p>
                </section>
              )}

              {isDemencia && (
                <section className={secao}>
                  <h2 className={tituloSecao}>Avaliação de cognição
                  </h2>
                  <p className="text-sm text-ink-3 mb-4">A avaliação do escore CDR é fundamental para quantificar a gravidade do comprometimento cognitivo.</p>
                  <Button icon="calculate" fullWidth onClick={() => setCalculadoraAberta('cdr')}>CDR Score Calculator</Button>
                </section>
              )}

              {isParkinson && (
                <section className={secao}>
                  <h2 className={tituloSecao}>Avaliação da incapacidade
                  </h2>
                  <p className="text-sm text-ink-3 mb-4">A Escala de Webster quantifica o grau de incapacidade na Doença de Parkinson e fundamenta o enquadramento como doença prevista em lei.</p>
                  <Button icon="calculate" fullWidth onClick={() => setCalculadoraAberta('webster')}>Webster Rating Scale Calculator</Button>
                </section>
              )}

              <section className={secao}>
                <h2 className={tituloSecao}>Critérios de gravidade
                </h2>
                <ol className="space-y-4">
                  {selectedDiagnosis.criteria.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-base text-ink">
                      <span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{idx + 1}</span>
                      <span className={`leading-relaxed flex-1 ${selectedDiagnosis.highlight?.includes(idx) ? 'font-bold' : ''}`}>{item}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {isParkinson && (
                <section className={secao}>
                  <h2 className={tituloSecao}>O portador de Doença de Parkinson será enquadrado enquanto Doença Prevista em Lei:
                  </h2>
                  <ol className="space-y-4">
                    {[
                      'Quando as manifestações clínicas e a evolução da doença determinarem o impedimento ao desempenho das atividades laborativas e realização das atividades normais da vida diária;',
                      'Com base na pontuação da tabela de Webster, todos os que apresentarem doença grave ou avançada. Os portadores de incapacidade moderada serão avaliados considerando-se a condição clínica e sua atividade laboral; ou',
                      'Quando não for possível o controle terapêutico da enfermidade.'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-base text-ink">
                        <span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{idx + 1}</span>
                        <span className="leading-relaxed flex-1">{item}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            <aside className="@split:col-span-4 @split:sticky @split:top-6 space-y-4 min-w-0" aria-label="Documentos e ações">
              <section className={secao}>
                <h2 className={tituloSecao}>Documentos necessários
                </h2>
                <p className="text-xs font-semibold text-ink-3 mb-2" aria-live="polite">{docsMarcados.size} de {totalDocs} reunidos</p>
                <ul className="space-y-1">
                  {documentos.map((item, idx) => (
                    <li key={idx}>
                      <label className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer rounded-lg hover:bg-thead px-1">
                        <input
                          type="checkbox"
                          checked={docsMarcados.has(idx)}
                          onChange={() => alterarDocs(prev => { const proximo = new Set(prev); if (proximo.has(idx)) proximo.delete(idx); else proximo.add(idx); return proximo; })}
                          className="mt-1 w-5 h-5 shrink-0 accent-navy"
                        />
                        <span className={`text-sm leading-snug ${docsMarcados.has(idx) ? 'text-ink-3 line-through' : 'text-ink'}`}>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Na versão pública a coluna vale para todas as larguras (é onde o
                  link da Portaria aparece no celular) e não traz PDF nem cópia,
                  que são ferramentas de trabalho do perito. */}
              <div className={`${publico ? 'flex' : 'hidden md:flex'} flex-col gap-2`}>
                {!publico && <Button icon="download" fullWidth onClick={handleDownloadPDF}>Baixar PDF</Button>}
                {!publico && <Button variant="secondary" icon={isCopied ? 'done_all' : 'content_copy'} disabled={isCopied} fullWidth onClick={handleCopy}>{isCopied ? 'Copiado' : 'Copiar texto'}</Button>}
                {podeVerPortaria && (
                  <Link to={portariaPath} className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold text-navy hover:bg-thead transition-colors">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">article</span>
                    Ler a Portaria GM-MD nº 3.551/2021
                  </Link>
                )}
              </div>
            </aside>
          </div>
        </Container>

        {/* Mobile: barra de ações rotulada, sticky no fim do fluxo (sem padding
            compensatório). Só no app — as duas ações não existem na versão pública. */}
        {!publico && (
          <div className="md:hidden sticky bottom-0 mt-auto z-10 bg-white border-t border-line p-3 flex gap-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <Button variant="secondary" icon={isCopied ? 'done_all' : 'content_copy'} disabled={isCopied} onClick={handleCopy} className="flex-1">{isCopied ? 'Copiado' : 'Copiar'}</Button>
            <Button icon="download" onClick={handleDownloadPDF} className="flex-1">Baixar PDF</Button>
          </div>
        )}
      </div>
    );
  }

  // PAGE LEVEL 1: lista de doenças com busca no topo (nome, diagnóstico e critério).
  const consultaAtiva = searchQuery.trim().length > 0;
  const tituloTipo: Record<string, string> = { disease: 'Doenças', diagnosis: 'Diagnósticos', criterion: 'Critérios' };
  return (
    <div className="flex flex-col flex-1">
      <Container size="data" className="@container py-6 md:py-8 pb-10 space-y-6">
        <PageHeader title="Doenças previstas em lei" description="Verifique as definições, os critérios clínicos e os documentos necessários para o enquadramento." />

        <div className="relative max-w-form">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Buscar doença, diagnóstico ou critério"
            placeholder="Buscar por doença, diagnóstico ou critério…"
            autoComplete="off"
            className="w-full min-h-[44px] pl-10 pr-4 rounded-lg border border-line bg-white text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
          />
        </div>

        {consultaAtiva ? (
          <div className="space-y-5" role="region" aria-label="Resultados da busca" aria-live="polite">
            {searchResults.length === 0 ? (
              <div className="bg-white border border-line rounded-xl"><EmptyState icon="search_off" title="Nenhum resultado" description={`Nada encontrado para “${searchQuery}”.`} /></div>
            ) : (['disease', 'diagnosis', 'criterion'] as const).map(tipo => {
              const itens = searchResults.filter(r => r.type === tipo).slice(0, 12);
              if (itens.length === 0) return null;
              return (
                <section key={tipo}>
                  <h2 className="eyebrow mb-2">{tituloTipo[tipo]} ({searchResults.filter(r => r.type === tipo).length})</h2>
                  <ul className="bg-white border border-line rounded-xl divide-y divide-line overflow-clip">
                    {itens.map(r => (
                      <li key={r.id}>
                        <button type="button" onClick={() => handleSearchResultClick(r)} className="w-full text-left px-4 min-h-[52px] py-2.5 hover:bg-thead transition-colors">
                          <span className="block text-sm font-bold text-navy">{r.name}</span>
                          {r.sub && <span className="block text-xs text-ink-3 mt-0.5">{r.sub}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 @2xl:grid-cols-2 @4xl:grid-cols-3 gap-4">
            {DISEASES.map((disease) => (
              <Link key={disease.id} to={dPath(disease.id)} className="bg-white rounded-xl border border-line hover:border-navy transition-colors p-4 flex items-center justify-between gap-2 min-h-[64px]">
                <span className="flex items-center gap-3 min-w-0">
                  {getDiseaseIcon(disease.name)}
                  <span className="text-navy font-heading text-base font-semibold truncate">
                    {disease.name.toLowerCase().includes("paget") ? "Doença de Paget" : disease.name}
                  </span>
                </span>
                <ChevronRight size={20} className="text-ink-4 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
};
