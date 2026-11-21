// Ficheiro: components/inspecoes/conclusao/CampoRedacaoIS.tsx
// Campos de redação da IS — Entrevista, Exame Clínico e Conclusão — preenchidos pelo "Inserir na IS" do Assessor IA
// (utils/assessorIA.ts). Só aparecem depois da primeira inserção (a chave existe no doc da IS); não são
// obrigatórios. Editáveis (gravação automática, como os demais campos da Conclusão) e com o ícone de copiar no
// canto superior direito, por dentro do campo. Em leitura (IS finalizada/sem permissão), o texto com o mesmo ícone.
import React, { useId } from 'react';
import { BotaoCopiar } from '../../ui/BotaoCopiar';
import { controlClass } from '../../ui/Field';

interface Props {
  rotulo: string;
  valor: string;
  /** Sem onChange: só leitura. */
  onChange?: (v: string) => void;
  onBlur?: () => void;
}

export const CampoRedacaoIS: React.FC<Props> = ({ rotulo, valor, onChange, onBlur }) => {
  const id = useId();
  const copiar = <BotaoCopiar texto={valor} titulo={`Copiar ${rotulo}`} className="bg-white/90 border border-line" />;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-ink-3">{rotulo}</label>
      <div className="relative">
        {onChange ? (
          <textarea id={id} value={valor} onChange={e => onChange(e.target.value)} onBlur={onBlur}
            className={`${controlClass} min-h-[160px] resize-y pr-12 leading-relaxed`} />
        ) : (
          <pre id={id} className="min-h-10 bg-thead/40 border border-line rounded-lg px-3 py-2 pr-12 text-sm text-ink whitespace-pre-wrap break-words font-sans leading-relaxed">{valor || '—'}</pre>
        )}
        {valor.trim() && <div className="absolute top-1.5 right-1.5">{copiar}</div>}
      </div>
    </div>
  );
};
