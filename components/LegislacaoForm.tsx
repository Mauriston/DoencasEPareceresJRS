// Ficheiro: components/LegislacaoForm.tsx
// Sidebar (Drawer) para cadastrar uma nova legislação: dados + upload do PDF
// para o Firebase Storage. Só o Admin chega aqui (botão "Novo" da página).
import React, { useState } from 'react';
import { Drawer } from './ui/Drawer';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { criarLegislacao, IMAGEM_PADRAO_LEGISLACAO } from '../services/firestoreLegislacao';

interface Props {
  proximaOrdem: number;
  onClose: () => void;
  onCriada: (legislacao: string) => void;
}

const LIMITE_MB = 25;

export const LegislacaoForm: React.FC<Props> = ({ proximaOrdem, onClose, onCriada }) => {
  const [legislacao, setLegislacao] = useState('');
  const [titulo, setTitulo] = useState('');
  const [providencias, setProvidencias] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const erroArquivo = arquivo && arquivo.size > LIMITE_MB * 1024 * 1024 ? `O PDF deve ter até ${LIMITE_MB} MB.` : '';
  const valido = legislacao.trim() && titulo.trim() && providencias.trim() && arquivo && !erroArquivo;

  const salvar = async () => {
    if (!valido || !arquivo) return;
    setSalvando(true);
    setErro('');
    try {
      await criarLegislacao({ legislacao, titulo, providencias, imageUrl }, arquivo, proximaOrdem);
      onCriada(legislacao.trim());
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar a legislação.');
      setSalvando(false);
    }
  };

  return (
    <Drawer
      title="Nova legislação"
      icon="gavel"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button icon="save" onClick={salvar} loading={salvando} disabled={!valido}>Salvar</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <Field label="Legislação" required help="Identificação curta. Ex.: LEI nº 6.880/1980">
          {aria => <input {...aria} value={legislacao} onChange={e => setLegislacao(e.target.value)} />}
        </Field>
        <Field label="Título" required help="Ex.: Estatuto dos Militares">
          {aria => <input {...aria} value={titulo} onChange={e => setTitulo(e.target.value)} />}
        </Field>
        <Field label="Providências (ementa)" required>
          {aria => <textarea {...aria} rows={5} value={providencias} onChange={e => setProvidencias(e.target.value)} />}
        </Field>
        <Field label="URL da imagem" help="Opcional. Se vazio, usa o Brasão da República.">
          {aria => <input {...aria} type="url" placeholder={IMAGEM_PADRAO_LEGISLACAO} value={imageUrl} onChange={e => setImageUrl(e.target.value)} />}
        </Field>
        <Field label="Arquivo PDF" required error={erroArquivo} help={arquivo ? arquivo.name : `PDF de até ${LIMITE_MB} MB.`}>
          {aria => (
            <input
              {...aria}
              type="file"
              accept="application/pdf,.pdf"
              onChange={e => setArquivo(e.target.files?.[0] ?? null)}
              className={`${aria.className} file:mr-3 file:border-0 file:bg-transparent file:font-bold file:text-navy`}
            />
          )}
        </Field>
        {erro && <p role="alert" className="text-xs font-semibold text-wine">{erro}</p>}
      </div>
    </Drawer>
  );
};
