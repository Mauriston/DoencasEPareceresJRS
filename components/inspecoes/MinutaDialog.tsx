// Ficheiro: components/inspecoes/MinutaDialog.tsx
// Minuta de mensagem em campos editáveis (PARA, INFO, Assunto, Texto), cada um com botão de copiar.
// Formato retrato, alto, com rolagem interna. Fecha pelo X, Esc ou clique fora. Com `confirmar`, o rodapé
// traz a ação principal, que copia a minuta inteira e executa a ação (ex.: cancelar a IS atrasada).
// Aceita a minuta em campos (`campos`) ou como texto único (`textoInicial`, separado pelos cabeçalhos).
// Com `sugerirDestinatarios`, quando PARA/INFO ficaram "[preencher]" (a tabela do Anexo M não decidiu sozinha),
// oferece a sugestão por IA: a IA escolhe a linha da tabela e PARA/INFO vêm da própria tabela.
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { CampoCopiavel, copiarTexto } from './CampoCopiavel';
import { contarPreencher, juntarMinuta, separarMinuta, type MinutaCampos } from '../../utils/minutaMensagemResultado';

/** Sugestão de destinatários com a linha da tabela usada (rastreabilidade para o perito). */
export interface SugestaoPara { para: string; info: string; origem: string }

interface Props {
  titulo: string;
  /** Minuta em campos (preferível). */
  campos?: MinutaCampos;
  /** Minuta como texto único; usado quando `campos` não vem. */
  textoInicial?: string;
  /** Ação principal que depende da minuta (recebe o texto completo). */
  confirmar?: { rotulo: string; icone: string; destrutiva?: boolean; aviso?: string; onConfirmar: (texto: string) => Promise<void> };
  /** Sugere PARA/INFO por IA (null = sem linha segura na tabela). */
  sugerirDestinatarios?: () => Promise<SugestaoPara | null>;
  onClose: () => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

type Chave = 'de' | 'para' | 'info' | 'assunto';
const CABECALHOS: { chave: Chave; rotulo: string }[] = [
  { chave: 'de', rotulo: 'DE:' },
  { chave: 'para', rotulo: 'PARA:' },
  { chave: 'info', rotulo: 'INFO:' },
  { chave: 'assunto', rotulo: 'Assunto:' },
];

export const MinutaDialog: React.FC<Props> = ({ titulo, campos: camposIniciais, textoInicial = '', confirmar, sugerirDestinatarios, onClose, onAviso }) => {
  const [campos, setCampos] = useState<MinutaCampos>(() => camposIniciais ?? separarMinuta(textoInicial));
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState('');
  const textoCompleto = juntarMinuta(campos);
  const pendentes = contarPreencher(textoCompleto);
  const set = (k: keyof MinutaCampos) => (v: string) => setCampos(c => ({ ...c, [k]: v }));
  const [sugerindo, setSugerindo] = useState(false);
  const [origemSugestao, setOrigemSugestao] = useState('');
  const faltaDestino = /\[preencher\b/.test(`${campos.para} ${campos.info ?? ''}`);
  const sugerir = async () => {
    if (!sugerirDestinatarios) return;
    setSugerindo(true); setErro('');
    try {
      const s = await sugerirDestinatarios();
      if (!s) { onAviso('A IA não encontrou linha segura na tabela do Anexo M; preencha PARA/INFO manualmente.', 'error'); return; }
      setCampos(c => ({ ...c, para: s.para, info: s.info }));
      setOrigemSugestao(s.origem);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível obter a sugestão da IA.');
    } finally {
      setSugerindo(false);
    }
  };
  const erroCopiar = () => onAviso('Não foi possível copiar; selecione o texto e copie manualmente.', 'error');

  const executar = async () => {
    if (!confirmar) return;
    setExecutando(true); setErro('');
    const copiou = await copiarTexto(textoCompleto);
    try {
      await confirmar.onConfirmar(textoCompleto);
      onAviso(copiou ? 'Minuta copiada e ação concluída.' : 'Ação concluída; copie a minuta manualmente.', copiou ? 'success' : 'error');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível concluir a ação.');
      setExecutando(false);
    }
  };

  return (
    <Dialog
      title={titulo}
      icon="mail"
      size="md"
      onClose={onClose}
      footer={confirmar ? (
        <Button variant={confirmar.destrutiva ? 'destructive' : 'primary'} icon={confirmar.icone} loading={executando} onClick={executar}>{confirmar.rotulo}</Button>
      ) : undefined}
    >
      <div className={`flex flex-col gap-3 min-h-[420px] ${confirmar ? 'h-[calc(90vh-11rem)]' : 'h-[calc(90vh-7.5rem)]'}`}>
        {confirmar?.aviso && <p className="text-ink-3">{confirmar.aviso}</p>}
        {pendentes > 0 && <p className="text-xs font-semibold text-wine">{pendentes === 1 ? '1 campo' : `${pendentes} campos`} “[preencher]” a completar.</p>}
        {sugerirDestinatarios && faltaDestino && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper p-3">
            <p className="text-xs text-ink-3 flex-1 min-w-[12rem]">A tabela de destinatários (DGPM-406, Anexo M) não decidiu PARA/INFO sozinha para esta IS.</p>
            <Button variant="secondary" icon="auto_awesome" loading={sugerindo} onClick={sugerir}>Sugerir PARA/INFO (IA)</Button>
          </div>
        )}
        {origemSugestao && <p role="status" className="text-xs text-ink-3"><strong>Sugestão da IA</strong> — confira antes de enviar. {origemSugestao}</p>}
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
        {CABECALHOS.filter(h => campos[h.chave] !== undefined).map(h => (
          <CampoCopiavel key={h.chave} rotulo={h.rotulo} valor={campos[h.chave] ?? ''} onChange={set(h.chave)} onErroCopiar={erroCopiar} />
        ))}
        <CampoCopiavel rotulo="Texto:" valor={campos.texto} onChange={set('texto')} multilinha onErroCopiar={erroCopiar} />
      </div>
    </Dialog>
  );
};
