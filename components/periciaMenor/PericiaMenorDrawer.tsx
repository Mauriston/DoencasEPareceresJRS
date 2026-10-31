// Ficheiro: components/periciaMenor/PericiaMenorDrawer.tsx
// Detalhe de uma perícia menor em barra lateral (bottom sheet no mobile): militar, serviço,
// atestado, homologação, perito, PDF do atestado e atalho para o histórico do militar.
import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { PericiaStatusTags, registroPericia } from '../ui/PericiaStatusTags';
import { extrairNomeInspecionado } from '../../utils/format';
import { dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';

const Linha: React.FC<{ rotulo: string; valor?: string }> = ({ rotulo, valor }) => (
  <div><dt className="text-xs font-semibold text-ink-3">{rotulo}</dt><dd className="text-sm text-ink break-words">{valor || '—'}</dd></div>
);

const dias = (n: number) => `${n} dia${n !== 1 ? 's' : ''}`;

interface Props {
  pericia: PericiaMenorRecord;
  onClose: () => void;
  onHistorico: () => void;
}

export const PericiaMenorDrawer: React.FC<Props> = ({ pericia: p, onClose, onHistorico }) => {
  const nome = extrairNomeInspecionado(p.inspecionado);
  const prefixo = p.inspecionado.slice(0, p.inspecionado.indexOf(nome)).trim();
  return (
    <Drawer
      title="Perícia menor"
      icon="personal_injury"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button icon="history" onClick={onHistorico}>Histórico do militar</Button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="space-y-1">
          {prefixo && <p className="text-xs font-semibold text-ink-3">{prefixo}</p>}
          <h3 className="text-h2 font-extrabold text-navy break-words">{nome}</h3>
          <PericiaStatusTags registro={registroPericia(p)} mostrarVdf />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Linha rotulo="OM" valor={p.om} />
          {p.servico && <Linha rotulo="Serviço do HNRe" valor={p.servico} />}
          <Linha rotulo="Data do atestado" valor={dataBR(p.dataAtestado)} />
          <Linha rotulo="Tempo do atestado" valor={dias(p.tempoAtestado)} />
          <Linha rotulo="Tempo homologado" valor={dias(p.tempoHomologado)} />
          <Linha rotulo="Término" valor={dataBR(p.dataTermino)} />
          <Linha rotulo="Perito" valor={p.peritoUsuario || p.peritoNome} />
          <Linha rotulo="Registrada em" valor={p.criadoEm?.toDate?.().toLocaleDateString('pt-BR')} />
        </dl>

        <div>
          <h4 className="text-h3 font-bold text-navy mb-1">CID</h4>
          <p className="text-sm text-ink break-words">{p.cid || '—'}</p>
        </div>

        <div>
          <h4 className="text-h3 font-bold text-navy mb-1">Dispensas</h4>
          <p className="text-sm text-ink break-words">{(p.dispensas ?? []).join(', ') || '—'}</p>
        </div>

        {p.pdfUrl && (
          <a
            href={p.pdfUrl} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-line hover:border-navy text-left transition-colors"
          >
            <span className="material-symbols-outlined text-[28px] text-navy shrink-0" aria-hidden="true">picture_as_pdf</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-navy">Atestado.pdf</span>
              <span className="block text-xs text-ink-3">documento do atestado</span>
            </span>
            <span className="text-sm font-bold text-blue underline underline-offset-2">Abrir</span>
          </a>
        )}
      </div>
    </Drawer>
  );
};
