// Ficheiro: components/inspecoes/guias/GerarGuiasDialog.tsx
// Gera as guias de exames da IS (PDF no servidor — services/guiasExames.ts). Usado logo depois de abrir a IS
// (automatico: começa sozinho) e pelo botão "Gerar guias" do detalhe. Etapas:
//  1. dados: só quando faltam a data de nascimento e/ou o sexo no cadastro (pede, com o sexo sugerido pela IA
//     a partir do primeiro nome; grava no cadastro, best effort);
//  2. gerando: a IA identifica a finalidade do Anexo O (services/guiasExamesIA.ts) e o servidor gera o PDF;
//  3. erro: mensagem com "Tentar de novo" (e "Agora não").
import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { atualizarMilitar, OPCOES_SEXO, type MilitarRecord, type SexoInspecionado } from '../../../services/firestoreMilitares';
import { gerarGuiasExames, type ResultadoGuias } from '../../../services/guiasExames';
import { identificarDadosGuias, sugerirSexoPeloNome } from '../../../services/guiasExamesIA';
import { erroDataNascimento } from '../../../utils/guiasExamesIS';
import { hojeISO } from '../../../utils/inspecoes';
import type { DadosInspecionadoIS } from '../InspecaoForm';

interface Props {
  is: Pick<InspecaoRecord, 'id' | 'is' | 'finalidade' | 'grupoFinalidade' | 'inspecionadoId'>;
  militar: MilitarRecord | null | undefined;
  /** Dados já completados (formulário de abertura); prevalecem sobre o cadastro. */
  dados?: DadosInspecionadoIS;
  /** Começa a gerar sozinho quando os dados estão completos. */
  automatico?: boolean;
  onClose: () => void;
  /** Terminou: gerou (resultado.gerado) ou o servidor/IA disse que não há guia (motivo). */
  onConcluido: (r: ResultadoGuias) => void;
}

type Etapa = 'dados' | 'gerando' | 'erro';

export const GerarGuiasDialog: React.FC<Props> = ({ is, militar, dados, automatico = false, onClose, onConcluido }) => {
  const sexoCadastro = dados?.sexo || militar?.sexo || '';
  const nascimentoCadastro = dados?.dataNascimento || militar?.dataNascimento || '';
  const completo = !!sexoCadastro && !!nascimentoCadastro;

  const [etapa, setEtapa] = useState<Etapa>(completo && automatico ? 'gerando' : 'dados');
  const [passo, setPasso] = useState('Gerando guias…');
  const [erro, setErro] = useState('');
  const [sexo, setSexo] = useState<SexoInspecionado | ''>(sexoCadastro);
  const [sexoSugerido, setSexoSugerido] = useState(false);
  const [nascimento, setNascimento] = useState(nascimentoCadastro);
  const [erros, setErros] = useState<{ sexo?: string; nascimento?: string }>({});
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  // Sem sexo no cadastro: sugestão da IA pelo primeiro nome (o usuário confirma).
  useEffect(() => {
    if (sexoCadastro || !militar?.nome) return;
    sugerirSexoPeloNome(militar.nome).then(s => { if (s && vivo.current) { setSexo(a => a || s); setSexoSugerido(true); } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const gerar = async (s: SexoInspecionado, dn: string) => {
    setEtapa('gerando'); setErro(''); setPasso('Identificando finalidade, sexo e idade…');
    try {
      const id = await identificarDadosGuias({ finalidade: is.finalidade, grupoFinalidade: is.grupoFinalidade, sexo: s, dataNascimento: dn, hoje: hojeISO() });
      if (!vivo.current) return;
      if (!id.finalidadeAnexoO || !id.temExames) {
        onConcluido({ gerado: false, motivo: 'A finalidade desta IS não tem exames mínimos com guia.' });
        return;
      }
      setPasso('Gerando guias…');
      const r = await gerarGuiasExames({ isId: is.id, sexo: s, dataNascimento: dn, finalidadeAnexoO: id.finalidadeAnexoO });
      if (vivo.current) onConcluido(r);
    } catch (e: any) {
      if (!vivo.current) return;
      setErro(e?.message || 'Não foi possível gerar as guias.');
      setEtapa('erro');
    }
  };

  // Automático com os dados completos: começa ao abrir.
  const iniciou = useRef(false);
  useEffect(() => {
    if (iniciou.current || etapa !== 'gerando' || !completo) return;
    iniciou.current = true;
    void gerar(sexoCadastro as SexoInspecionado, nascimentoCadastro);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmarDados = async () => {
    const e: typeof erros = {};
    const erroData = erroDataNascimento(nascimento, hojeISO());
    if (erroData) e.nascimento = erroData;
    if (!sexo) e.sexo = 'Informe o sexo.';
    setErros(e);
    if (Object.keys(e).length) return;
    const completar = {
      ...(!nascimentoCadastro ? { dataNascimento: nascimento } : {}),
      ...(!sexoCadastro && sexo ? { sexo } : {}),
    };
    if (militar && Object.keys(completar).length) await atualizarMilitar(militar.id, completar).catch(() => { /* sem permissão ou offline */ });
    void gerar(sexo as SexoInspecionado, nascimento);
  };

  const tentarDeNovo = () => {
    const s = (sexo || sexoCadastro) as SexoInspecionado;
    const dn = nascimento || nascimentoCadastro;
    if (s && dn) void gerar(s, dn); else setEtapa('dados');
  };

  const gerando = etapa === 'gerando';
  return (
    <Dialog
      title={`Guias de exames — IS ${is.is}`}
      icon="lab_profile"
      size="md"
      travado={gerando}
      onClose={() => { if (!gerando) onClose(); }}
      footer={etapa === 'gerando' ? undefined : (
        <>
          <Button variant="secondary" onClick={onClose}>Agora não</Button>
          {etapa === 'dados'
            ? <Button icon="lab_profile" onClick={() => { void confirmarDados(); }}>Gerar guias</Button>
            : <Button icon="refresh" onClick={tentarDeNovo}>Tentar de novo</Button>}
        </>
      )}
    >
      {etapa === 'gerando' && (
        <p role="status" className="flex items-center gap-3 py-4 text-sm font-semibold text-navy">
          <span className="w-5 h-5 shrink-0 border-2 border-navy/20 border-t-navy rounded-full animate-spin" aria-hidden="true" />
          {passo}
        </p>
      )}
      {etapa === 'erro' && <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>}
      {etapa === 'dados' && (
        <div className="space-y-4">
          <p className="text-sm text-ink">Para as guias, informe o que falta no cadastro do inspecionado. Será salvo no cadastro.</p>
          {!nascimentoCadastro && (
            <Field label="Data de nascimento" required error={erros.nascimento}>
              {a => <input {...a} type="date" max={hojeISO()} value={nascimento} onChange={ev => { setNascimento(ev.target.value); setErros(x => ({ ...x, nascimento: '' })); }} />}
            </Field>
          )}
          {!sexoCadastro && (
            <div>
              <ChoiceGroup<SexoInspecionado>
                label="Sexo" required emLinha options={OPCOES_SEXO} value={sexo} error={erros.sexo}
                onChange={v => { setSexo(v); setSexoSugerido(false); setErros(x => ({ ...x, sexo: '' })); }}
              />
              {sexoSugerido && sexo && <p className="mt-1 text-xs text-ink-3">Sugerido pela IA a partir do nome. Confira.</p>}
            </div>
          )}
          {nascimentoCadastro && sexoCadastro && <p className="text-sm text-ink">Gerar as guias dos exames mínimos desta IS?</p>}
        </div>
      )}
    </Dialog>
  );
};
