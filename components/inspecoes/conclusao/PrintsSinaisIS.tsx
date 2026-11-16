// Ficheiro: components/inspecoes/conclusao/PrintsSinaisIS.tsx
// "Prints do SINAIS" (opcional) na Conclusão do detalhe da IS: o usuário envia (ou fotografa) os prints da tela
// da IS e/ou da conclusão no SINAIS; a IA lê cada print (Firebase AI Logic — services/sinaisIA.lerPrintDoSinais,
// a mesma leitura da "IS por foto") e as regras de utils/importacaoIS.ts (agruparPrints → proporImportacao →
// preenchimentoDosPrints) dizem o que completar. Só os campos VAZIOS da IS são preenchidos (Laudo, Data do
// laudo, CID principal, Restrições, Nº do TIS, DS-1a, Data da Conclusão — esta nunca anterior à Data do laudo);
// quem grava é o detalhe (onPreencher), pelas mesmas regras do autosave.
import React, { useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { arquivoParaBase64IA } from '../../../services/geminiAI';
import { lerPrintDoSinais } from '../../../services/sinaisIA';
import { carregarFinalidadesIS, carregarRestricoesIS } from '../../../utils/corposQuadros';
import { opcoesDeRestricoes } from '../../../utils/conclusaoIS';
import {
  agruparPrints, proporImportacao, preenchimentoDosPrints,
  type ConclusaoAtualIS, type LeituraPrint, type PreenchimentoPrints,
} from '../../../utils/importacaoIS';

interface Props {
  /** Nº da IS (id do documento): os prints têm de ser desta IS. */
  isId: string;
  inspecionadoId: string;
  finalidade: string;
  dataAbertura: string;
  /** Campos da Conclusão como estão agora (o que já tem valor não é sobrescrito). */
  atual: () => ConclusaoAtualIS;
  /** Grava o preenchimento; devolve os rótulos dos campos efetivamente preenchidos. */
  onPreencher: (p: PreenchimentoPrints) => Promise<string[]>;
}

const LEITURAS_SIMULTANEAS = 3;

export const PrintsSinaisIS: React.FC<Props> = ({ isId, inspecionadoId, finalidade, dataAbertura, atual, onPreencher }) => {
  const input = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState<{ feitas: number; total: number } | null>(null);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const ler = async (arquivos: File[]) => {
    const imagens = arquivos.filter(f => f.type.startsWith('image/'));
    if (!imagens.length) { setMensagem({ texto: 'Envie imagens (prints da tela do SINAIS).', erro: true }); return; }
    setMensagem(null);
    setLendo({ feitas: 0, total: imagens.length });
    try {
      const [grupos, restr] = await Promise.all([
        carregarFinalidadesIS(),
        carregarRestricoesIS().then(opcoesDeRestricoes).catch(() => [] as string[]),
      ]);
      const lidos: { leitura: LeituraPrint; origem: number }[] = new Array(imagens.length);
      let proxima = 0;
      await Promise.all(Array.from({ length: Math.min(LEITURAS_SIMULTANEAS, imagens.length) }, async () => {
        while (proxima < imagens.length) {
          const k = proxima++;
          const f = imagens[k];
          try { lidos[k] = { leitura: await lerPrintDoSinais(await arquivoParaBase64IA(f), f.type || 'image/png'), origem: k }; }
          catch (e) { if (/Limite|App Check|indisponível/.test(String((e as Error)?.message))) throw e; lidos[k] = { leitura: {} as LeituraPrint, origem: k }; }
          setLendo(l => (l ? { ...l, feitas: l.feitas + 1 } : l));
        }
      }));
      const { grupos: porIs } = agruparPrints(lidos);
      const desta = porIs.find(g => g.numero === isId);
      if (!desta) {
        const outras = porIs.map(g => g.numero);
        setMensagem({ texto: outras.length ? `Os prints são da IS ${outras.join(', ')}, não da IS ${isId}.` : 'Nenhum print foi reconhecido como tela de IS do SINAIS.', erro: true });
        return;
      }
      const { proposta, erro } = proporImportacao(desta.dados?.leitura, desta.conclusao?.leitura, grupos, restr, { inspecionadoId, finalidade, dataAbertura });
      if (!proposta) { setMensagem({ texto: erro || 'Não foi possível ler os prints.', erro: true }); return; }
      const preenchimento = preenchimentoDosPrints(atual(), proposta, desta.conclusao?.leitura.cids ?? []);
      if (!Object.keys(preenchimento).length) { setMensagem({ texto: 'Nada a completar: os campos lidos já estão preenchidos (ou não constam nos prints).', erro: false }); return; }
      const feitos = await onPreencher(preenchimento);
      setMensagem(feitos.length
        ? { texto: `Preenchido pelos prints: ${feitos.join(', ')}. Confira.`, erro: false }
        : { texto: 'Nada a completar.', erro: false });
    } catch (e: any) {
      setMensagem({ texto: e?.message || 'Não foi possível ler os prints.', erro: true });
    } finally {
      setLendo(null);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-line p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy">Prints do SINAIS <span className="font-normal text-ink-3">(opcional)</span></p>
          <p className="text-xs text-ink-3">A IA lê os prints e completa só os campos vazios desta IS.</p>
        </div>
        <Button variant="secondary" icon="add_photo_alternate" onClick={() => input.current?.click()} loading={!!lendo} disabled={!!lendo}>
          {lendo ? `Lendo ${lendo.feitas} de ${lendo.total}…` : 'Enviar prints'}
        </Button>
      </div>
      <input
        ref={input} type="file" accept="image/*" multiple className="hidden" aria-label="Prints do SINAIS"
        onChange={e => { const l: File[] = Array.from(e.target.files ?? []); e.target.value = ''; void ler(l); }}
      />
      {mensagem && <p role={mensagem.erro ? 'alert' : 'status'} className={`text-xs font-semibold ${mensagem.erro ? 'text-wine' : 'text-green-700'}`}>{mensagem.texto}</p>}
    </div>
  );
};
