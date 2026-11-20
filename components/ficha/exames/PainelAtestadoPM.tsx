// Ficheiro: components/ficha/exames/PainelAtestadoPM.tsx
// Ficha do inspecionado › aba Atestados e Laudos: painel principal do atestado apresentado numa Perícia Menor
// (homologação; periciasMenores/{id}.pdfUrl). Mesmo padrão do PainelDocumentoIS: a transcrição feita pela IA
// (periciasMenores/{id}.transcricao — services/atestadoIA.ts) num campo só de leitura com o copiar, e a barra
// com "Imprimir" (abre o PDF numa nova guia). Registros sem transcrição mostram o aviso e o PDF.
import React from 'react';
import { buttonClass } from '../../ui/Button';
import { StatusTag } from '../../ui/StatusTag';
import { BotaoCopiar } from '../../ui/BotaoCopiar';
import { CascaPainelFicha, type AcaoBarraFicha } from '../CascaPainelFicha';
import { dataBR, type PericiaMenorRecord } from '../../../services/firestorePericiasMenores';
import { ROTULO_CATEGORIA } from '../../../utils/examesIS';

export const PainelAtestadoPM: React.FC<{ pericia: PericiaMenorRecord }> = ({ pericia: p }) => {
  const t = p.transcricao;
  const data = t?.dataEmissao || p.dataAtestado;
  const emissor = t?.emissor || [p.medicoEmissor, p.crmEmissor ? `CRM ${p.crmEmissor}` : ''].filter(Boolean).join(' · ');
  const titulo = [ROTULO_CATEGORIA[t?.categoria ?? 'atestado'], t?.especialidade || p.especialidade].filter(Boolean).join(' ');
  const copia = t?.texto ? [[titulo.toUpperCase(), data ? dataBR(data) : ''].filter(Boolean).join(' — '), t.texto].join('\n') : '';
  const acoes: AcaoBarraFicha[] = [{
    id: 'imprimir',
    node: (
      <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className={`${buttonClass('primary')} w-full sm:w-auto`}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">print</span>Imprimir
      </a>
    ),
  }];
  return (
    <CascaPainelFicha
      titulo={titulo} icone="note_alt"
      tituloExtra={<StatusTag tone="navyOutline" dot={false}>Perícia Menor</StatusTag>}
      subtitulo={[data ? dataBR(data) : '', emissor].filter(Boolean).join(' | ')}
      acoes={acoes}
    >
      <div className="space-y-3">
        <div className="relative rounded-lg border border-line bg-surface-2">
          <p id={`transcricao-pm-${p.id}`} className="sr-only">Transcrição do documento (somente leitura)</p>
          <div role="document" aria-labelledby={`transcricao-pm-${p.id}`} aria-readonly="true"
            className="p-3 pr-14 max-h-[60vh] overflow-y-auto overscroll-contain space-y-4 select-text">
            {t?.texto
              ? <p className="text-sm text-ink whitespace-pre-wrap break-words leading-relaxed">{t.texto}</p>
              : <p className="text-sm text-ink-3">Sem transcrição do documento. Abra o PDF em "Imprimir".</p>}
          </div>
          {copia && <BotaoCopiar texto={copia} titulo="Copiar a transcrição" className="absolute top-1.5 right-1.5 bg-white border border-line" />}
        </div>
        {t?.textoIncompleto && <p className="text-xs text-ink-3">A transcrição pode estar incompleta: confira no PDF.</p>}
      </div>
    </CascaPainelFicha>
  );
};
