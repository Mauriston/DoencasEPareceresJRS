// Ficheiro: components/ficha/inspecoes/PainelMensagemIS.tsx
// Aba Mensagens da Ficha do inspecionado: painel principal da mensagem tramitada registrada a partir da minuta de
// uma IS concluída ("Minutar MSG"). Campos NÃO editáveis (DE, PARA, INFO, ASSUNTO, TEXTO), cada um com o ícone de
// copiar à direita, dentro do campo (feedback "Copiado" por ~1,5 s).
import React, { useEffect, useId, useRef, useState } from 'react';
import { CascaPainelFicha } from '../CascaPainelFicha';
import { copiarTexto } from '../../inspecoes/CampoCopiavel';
import { linhasMinuta } from '../../../utils/mensagensIS';
import type { MensagemISRecord } from '../../../services/mensagensIS';

const CampoLeituraCopiavel: React.FC<{ rotulo: string; valor: string; multilinha?: boolean; onErro: () => void }> = ({ rotulo, valor, multilinha, onErro }) => {
  const id = useId();
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copiar = async () => {
    if (!(await copiarTexto(valor))) { onErro(); return; }
    setCopiado(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiado(false), 1500);
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span id={id} className="text-xs font-semibold text-ink-3">{rotulo}</span>
        {copiado && <span role="status" className="text-xs font-semibold text-green">Copiado</span>}
      </div>
      <div className="relative">
        <div aria-labelledby={id} role="textbox" aria-readonly="true" aria-multiline={multilinha || undefined}
          className={`w-full rounded-lg border border-line bg-surface-2 pl-3 pr-12 py-2.5 text-sm text-ink break-words ${multilinha ? 'whitespace-pre-line min-h-[120px]' : ''}`}>
          {valor || '—'}
        </div>
        <button type="button" onClick={() => { void copiar(); }} aria-label={`Copiar ${rotulo}`} title={`Copiar ${rotulo}`}
          className="absolute right-1.5 top-1.5 w-9 h-9 inline-flex items-center justify-center rounded-md text-navy hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{copiado ? 'check' : 'content_copy'}</span>
        </button>
      </div>
    </div>
  );
};

const dataHora = (m: MensagemISRecord) => {
  const d = m.registradoEm?.toDate?.();
  return d ? `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '';
};

export const PainelMensagemIS: React.FC<{ mensagem: MensagemISRecord; onAviso: (msg: string, tom?: 'success' | 'error') => void }> = ({ mensagem: m, onAviso }) => (
  <CascaPainelFicha
    titulo={m.assunto || `Mensagem da IS ${m.is}`} icone="chat"
    subtitulo={[`IS ${m.is}`, m.finalidade, dataHora(m) ? `registrada em ${dataHora(m)}` : '', m.registradoPor?.usuario ? `por ${m.registradoPor.usuario}` : ''].filter(Boolean).join(' · ')}
  >
    <div className="space-y-4">
      {linhasMinuta({ de: m.de || '', para: m.para || '', info: m.info || '', assunto: m.assunto || '', texto: m.texto || '' }).map(l => (
        <CampoLeituraCopiavel key={l.rotulo} rotulo={l.rotulo} valor={l.valor} multilinha={l.rotulo === 'TEXTO'}
          onErro={() => onAviso('Não foi possível copiar; selecione o texto e copie manualmente.', 'error')} />
      ))}
    </div>
  </CascaPainelFicha>
);
