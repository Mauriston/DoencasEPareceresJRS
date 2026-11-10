// Ficheiro: components/inspecoes/MinutaDialog.tsx
// Minuta de mensagem em campos editáveis (PARA, INFO, Assunto, Texto), cada um com botão de copiar.
// Formato retrato, alto, com rolagem interna. Fecha pelo X, Esc ou clique fora. Com `confirmar`, o rodapé
// traz a ação principal, que copia a minuta inteira e executa a ação (ex.: cancelar a IS atrasada).
// Aceita a minuta em campos (`campos`) ou como texto único (`textoInicial`, separado pelos cabeçalhos).
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { CampoCopiavel, copiarTexto } from './CampoCopiavel';
import { contarPreencher, juntarMinuta, separarMinuta, type MinutaCampos } from '../../utils/minutaMensagemResultado';

interface Props {
  titulo: string;
  /** Minuta em campos (preferível). */
  campos?: MinutaCampos;
  /** Minuta como texto único; usado quando `campos` não vem. */
  textoInicial?: string;
  /** Ação principal que depende da minuta (recebe o texto completo). */
  confirmar?: { rotulo: string; icone: string; destrutiva?: boolean; aviso?: string; onConfirmar: (texto: string) => Promise<void> };
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

export const MinutaDialog: React.FC<Props> = ({ titulo, campos: camposIniciais, textoInicial = '', confirmar, onClose, onAviso }) => {
  const [campos, setCampos] = useState<MinutaCampos>(() => camposIniciais ?? separarMinuta(textoInicial));
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState('');
  const textoCompleto = juntarMinuta(campos);
  const pendentes = contarPreencher(textoCompleto);
  const set = (k: keyof MinutaCampos) => (v: string) => setCampos(c => ({ ...c, [k]: v }));
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
        {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
        {CABECALHOS.filter(h => campos[h.chave] !== undefined).map(h => (
          <CampoCopiavel key={h.chave} rotulo={h.rotulo} valor={campos[h.chave] ?? ''} onChange={set(h.chave)} onErroCopiar={erroCopiar} />
        ))}
        <CampoCopiavel rotulo="Texto:" valor={campos.texto} onChange={set('texto')} multilinha onErroCopiar={erroCopiar} />
      </div>
    </Dialog>
  );
};
