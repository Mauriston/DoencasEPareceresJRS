// Ficheiro: components/periciaMenor/DispensasModal.tsx
// Lista de dispensas da Perícia Menor com caixas de seleção (uma ou mais). "TODAS AS ATIVIDADES"
// é exclusiva: marcada, desabilita as demais; e só pode ser marcada com nenhuma outra escolhida.
// Duas dispensas têm um complemento obrigatório digitado pelo médico, gravado no próprio texto:
//   "Movimentos repetitivos com sobrecarga do joelho esquerdo"
//   "Permanecer em pé por mais de 2 horas"
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { controlClass } from '../ui/Field';

export const TODAS_ATIVIDADES = 'TODAS AS ATIVIDADES';

/** Dispensas com complemento: rótulo na lista, prefixo/sufixo do texto gravado e o tipo do campo. */
interface DispensaComplemento { chave: string; prefixo: string; sufixo: string; numerico: boolean; placeholder: string; erro: string }
const SOBRECARGA: DispensaComplemento = {
  chave: 'Movimentos repetitivos com sobrecarga', prefixo: 'Movimentos repetitivos com sobrecarga ', sufixo: '',
  numerico: false, placeholder: 'do joelho esquerdo, do ombro direito…', erro: 'Informe onde é a sobrecarga.',
};
const EM_PE: DispensaComplemento = {
  chave: 'Permanecer em pé por mais de', prefixo: 'Permanecer em pé por mais de ', sufixo: ' horas',
  numerico: true, placeholder: 'h', erro: 'Informe as horas (1 ou 2 dígitos).',
};
const COMPLEMENTOS = [SOBRECARGA, EM_PE];
const complementoDe = (chave: string) => COMPLEMENTOS.find(c => c.chave === chave);

/** Dispensas possíveis numa Perícia Menor (lista fixa; as com complemento aparecem pela chave). */
export const DISPENSAS = [
  TODAS_ATIVIDADES,
  'Carregar peso',
  'Dirigir ou manobrar veículos Automotores',
  'Embarque',
  'Esforços físicos intensos e extenuantes',
  'Formatura',
  'Manobras Operativas',
  'Marchas',
  SOBRECARGA.chave,
  'Operar equipamentos de precisão',
  EM_PE.chave,
  'Segurança / escolta',
  'Serviço Armado',
  'Serviço Noturno',
  'Serviços em locais elevados',
  'Subir e descer escadas repetidamente',
  'TAF/TFM',
  'TAF/TFM (Exceto caminhadas)',
  'TAF/TFM (Exceto natação)',
  'TAF/TFM(Exceto Caminhadas e Natação)',
  'Uso de calçado fechado',
];

/** Separa a lista gravada em chaves marcadas + complementos digitados. */
const lerInicial = (inicial: string[]) => {
  const marcadas: string[] = [];
  const textos: Record<string, string> = {};
  inicial.forEach(d => {
    const c = COMPLEMENTOS.find(x => d.startsWith(x.prefixo.trim()));
    if (c) {
      marcadas.push(c.chave);
      textos[c.chave] = d.slice(c.prefixo.length, c.sufixo ? d.length - c.sufixo.length : undefined).trim();
    } else marcadas.push(d);
  });
  return { marcadas, textos };
};

interface Props {
  inicial: string[];
  onConfirmar: (dispensas: string[]) => void;
  onCancelar: () => void;
}

export const DispensasModal: React.FC<Props> = ({ inicial, onConfirmar, onCancelar }) => {
  const [estado] = useState(() => lerInicial(inicial));
  const [marcadas, setMarcadas] = useState<string[]>(estado.marcadas);
  const [textos, setTextos] = useState<Record<string, string>>(estado.textos);
  const [tentou, setTentou] = useState(false);

  const alternar = (d: string) => setMarcadas(atual => {
    if (d === TODAS_ATIVIDADES) return atual.includes(d) ? [] : [d];
    const resto = atual.filter(x => x !== TODAS_ATIVIDADES);
    return resto.includes(d) ? resto.filter(x => x !== d) : [...resto, d];
  });

  const valido = (c: DispensaComplemento) => {
    const v = (textos[c.chave] || '').trim();
    return c.numerico ? /^\d{1,2}$/.test(v) && Number(v) > 0 : v.length > 0;
  };
  const pendentes = COMPLEMENTOS.filter(c => marcadas.includes(c.chave) && !valido(c));

  const confirmar = () => {
    setTentou(true);
    if (pendentes.length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-complemento][aria-invalid="true"]')?.focus());
      return;
    }
    // Mantém a ordem da lista; as com complemento viram o texto completo.
    onConfirmar(DISPENSAS.filter(d => marcadas.includes(d)).map(d => {
      const c = complementoDe(d);
      return c ? `${c.prefixo}${(textos[d] || '').trim()}${c.sufixo}` : d;
    }));
  };

  return (
    <Dialog
      title="Dispensas"
      icon="checklist"
      size="md"
      onClose={onCancelar}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
          <Button icon="check" onClick={confirmar}>Confirmar{marcadas.length > 0 ? ` (${marcadas.length})` : ''}</Button>
        </>
      )}
    >
      <div role="group" aria-label="Dispensas" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DISPENSAS.map(d => {
          const selecionada = marcadas.includes(d);
          const desabilitada = d === TODAS_ATIVIDADES ? marcadas.length > 0 && !selecionada : marcadas.includes(TODAS_ATIVIDADES);
          const c = complementoDe(d);
          const invalido = !!c && selecionada && tentou && !valido(c);
          return (
            <div
              key={d}
              className={`rounded-lg border text-sm ${c && selecionada ? 'sm:col-span-2' : ''} ${selecionada ? 'border-navy bg-thead font-semibold text-navy' : 'border-line text-ink'} ${desabilitada ? 'opacity-40' : ''}`}
            >
              <label className={`flex items-center gap-3 px-3 min-h-[44px] ${desabilitada ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-thead rounded-lg'}`}>
                <input type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={selecionada} disabled={desabilitada} onChange={() => alternar(d)} />
                <span className="break-words min-w-0">{c ? `${d} ${c.numerico ? '__ horas' : '___'}` : d}</span>
              </label>
              {c && selecionada && (
                <div className="px-3 pb-3 -mt-1">
                  <div className="flex items-center gap-2 font-normal text-ink pl-8">
                    <input
                      data-complemento
                      type="text"
                      inputMode={c.numerico ? 'numeric' : 'text'}
                      maxLength={c.numerico ? 2 : 60}
                      aria-label={`Complemento: ${d}`}
                      aria-invalid={invalido || undefined}
                      value={textos[d] || ''}
                      placeholder={c.placeholder}
                      onChange={e => setTextos(t => ({ ...t, [d]: c.numerico ? e.target.value.replace(/\D/g, '').slice(0, 2) : e.target.value }))}
                      className={`${controlClass} !min-h-[40px] ${c.numerico ? '!w-16 text-center' : 'flex-1 min-w-0'} ${invalido ? '!border-wine' : ''}`}
                    />
                    {c.sufixo && <span className="text-xs text-ink-3 shrink-0">{c.sufixo.trim()}</span>}
                  </div>
                  {invalido && <p role="alert" className="mt-1 text-xs font-semibold text-wine">{c.erro}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
};
