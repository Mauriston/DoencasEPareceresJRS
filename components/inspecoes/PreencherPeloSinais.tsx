// Ficheiro: components/inspecoes/PreencherPeloSinais.tsx
// Campo opcional da edição da IS (InspecaoDetalhe): envia um ou mais prints de tela do SINAIS (tela da IS
// e/ou da conclusão); a IA (Firebase AI Logic — services/sinaisIA.ts) lê cada um e o detalhe preenche SÓ
// os campos vazios da IS (utils/edicaoIS.ts). Mostra o progresso da leitura e o erro, se houver.
import React, { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { arquivoParaBase64IA } from '../../services/geminiAI';
import { lerPrintDoSinaisParaEdicao } from '../../services/sinaisIA';
import type { LeituraEdicaoIS } from '../../utils/edicaoIS';

interface Props {
  /** Recebe as leituras (uma por imagem; vazia quando a imagem não pôde ser lida) e devolve o resumo a exibir. */
  onLeituras: (leituras: LeituraEdicaoIS[]) => Promise<{ resumo: string; avisos: string[] }>;
  disabled?: boolean;
}

export const PreencherPeloSinais: React.FC<Props> = ({ onLeituras, disabled }) => {
  const input = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState<{ feitas: number; total: number } | null>(null);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<{ resumo: string; avisos: string[] } | null>(null);

  const ler = async (arquivos: File[]) => {
    const imagens = arquivos.filter(f => f.type.startsWith('image/'));
    if (!imagens.length) { setErro('Envie imagens (prints de tela do SINAIS).'); return; }
    setErro(''); setResultado(null); setLendo({ feitas: 0, total: imagens.length });
    try {
      const leituras: LeituraEdicaoIS[] = [];
      for (const f of imagens) {
        try { leituras.push(await lerPrintDoSinaisParaEdicao(await arquivoParaBase64IA(f), f.type || 'image/png')); }
        catch (e) {
          // Limite de uso, App Check ou IA fora do ar: para tudo e mostra o motivo.
          if (/Limite|App Check|indisponível/.test(String((e as Error)?.message))) throw e;
          leituras.push({});
        }
        setLendo(l => (l ? { ...l, feitas: l.feitas + 1 } : l));
      }
      setResultado(await onLeituras(leituras));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível ler os prints.');
    } finally {
      setLendo(null);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-line p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy">Preencher pelo SINAIS <span className="font-normal text-ink-3">(opcional)</span></p>
          <p className="text-xs text-ink-3">Envie print(s) da tela da IS e/ou da conclusão. Só os campos vazios são preenchidos.</p>
        </div>
        <Button
          variant="secondary" size="sm" icon="add_photo_alternate" loading={!!lendo} disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {lendo ? `Lendo ${Math.min(lendo.feitas + 1, lendo.total)} de ${lendo.total}…` : 'Enviar prints'}
        </Button>
        <input
          ref={input} type="file" accept="image/*" multiple className="hidden" aria-label="Prints de tela do SINAIS"
          onChange={e => { const l: File[] = e.target.files ? Array.from(e.target.files) : []; e.target.value = ''; if (l.length) ler(l); }}
        />
      </div>
      {lendo && <p role="status" className="text-xs text-ink-3">A IA está lendo os prints. Isso pode levar alguns segundos.</p>}
      {erro && <p role="alert" className="text-xs font-semibold text-wine">{erro}</p>}
      {resultado && (
        <div role="status" className="space-y-1">
          <p className="text-xs font-semibold text-green-700">{resultado.resumo}</p>
          {resultado.avisos.map(a => <p key={a} className="text-xs text-ink-3">{a}</p>)}
        </div>
      )}
    </div>
  );
};
