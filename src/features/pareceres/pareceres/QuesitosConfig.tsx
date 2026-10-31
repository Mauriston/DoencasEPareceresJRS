// Ficheiro: components/pareceres/QuesitosConfig.tsx
// Configuração (só Admin) dos modelos de quesitos por especialidade: editar a lista,
// criar especialidades novas e apagar. É a fonte das sugestões do "Novo parecer".
import React, { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ListaQuesitos } from './QuesitosEditor';
import { observarQuesitos, salvarQuesitos, apagarQuesitos, idDaEspecialidade, type QuesitosEspecialidade } from '@/services/firestoreQuesitos';

const NOVA = '__nova__';

export const QuesitosConfig: React.FC<{ onClose: () => void; onAviso: (msg: string, tom?: 'success' | 'error') => void }> = ({ onClose, onAviso }) => {
  const [modelos, setModelos] = useState<QuesitosEspecialidade[] | null>(null);
  const [selecionada, setSelecionada] = useState('');
  const [nome, setNome] = useState('');
  const [lista, setLista] = useState<string[]>([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmaApagar, setConfirmaApagar] = useState(false);

  useEffect(() => observarQuesitos(setModelos, e => setErro(e.message)), []);

  // Seleciona a primeira especialidade ao carregar.
  useEffect(() => { if (modelos && !selecionada && modelos.length) escolher(modelos[0].id, modelos); }, [modelos]); // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = (id: string, base = modelos) => {
    setSelecionada(id); setErro(''); setConfirmaApagar(false);
    if (id === NOVA) { setNome(''); setLista(['']); return; }
    const m = base?.find(x => x.id === id);
    setNome(m?.especialidade ?? ''); setLista(m?.quesitos.length ? m.quesitos.slice() : ['']);
  };

  const salvar = async () => {
    const nomeFinal = nome.trim().toUpperCase();
    const id = selecionada === NOVA ? idDaEspecialidade(nomeFinal) : selecionada;
    if (!nomeFinal || !id) { setErro('Informe o nome da especialidade.'); return; }
    if (selecionada === NOVA && modelos?.some(m => m.id === id)) { setErro('Já existe uma especialidade com este nome.'); return; }
    if (lista.every(q => !q.trim())) { setErro('Inclua ao menos um quesito.'); return; }
    setSalvando(true);
    try {
      await salvarQuesitos(id, nomeFinal, lista);
      setSelecionada(id);
      onAviso(`Quesitos de ${nomeFinal} salvos.`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async () => {
    try {
      await apagarQuesitos(selecionada);
      onAviso(`${nome} removida.`);
      setSelecionada(''); setConfirmaApagar(false);
      const restantes = (modelos ?? []).filter(m => m.id !== selecionada);
      if (restantes.length) escolher(restantes[0].id, restantes); else { setNome(''); setLista([]); }
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível apagar.');
    }
  };

  const existente = selecionada && selecionada !== NOVA;

  return (
    <Dialog
      title="Quesitos por especialidade"
      icon="tune"
      size="xl"
      onClose={onClose}
      footer={(
        <>
          {existente && (confirmaApagar
            ? <Button variant="ghost" icon="delete" className="!text-wine sm:mr-auto" onClick={apagar}>Confirmar: apagar {nome}</Button>
            : <Button variant="ghost" icon="delete" className="!text-wine sm:mr-auto" onClick={() => setConfirmaApagar(true)}>Apagar especialidade</Button>)}
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button icon="save" loading={salvando} disabled={!selecionada} onClick={salvar}>Salvar quesitos</Button>
        </>
      )}
    >
      {modelos === null ? (
        <p className="py-6 text-center text-ink-3" role="status">Carregando…</p>
      ) : (
        <div className="space-y-4">
          <p className="text-ink-3">Estes são os quesitos sugeridos ao gerar um pedido de parecer. Quem gera ainda pode ajustá-los em cada pedido.</p>
          {erro && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Especialidade">
              {a => (
                <select {...a} value={selecionada} onChange={e => escolher(e.target.value)}>
                  {!selecionada && <option value="">Selecione…</option>}
                  {modelos.map(m => <option key={m.id} value={m.id}>{m.especialidade}</option>)}
                  <option value={NOVA}>+ Nova especialidade…</option>
                </select>
              )}
            </Field>
            {selecionada === NOVA && (
              <Field label="Nome da nova especialidade" required>
                {a => <input {...a} type="text" value={nome} onChange={e => setNome(e.target.value.toUpperCase())} className={`${a.className} uppercase`} autoComplete="off" />}
              </Field>
            )}
          </div>
          {selecionada && <ListaQuesitos lista={lista} onChange={setLista} />}
        </div>
      )}
    </Dialog>
  );
};
