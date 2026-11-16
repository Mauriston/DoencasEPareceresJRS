// Ficheiro: components/ficha/guias/PainelGuias.tsx
// Ficha do inspecionado › aba Guias: painel principal de UMA IS com guias de exames geradas na abertura.
//   corpo: as páginas do PDF das guias em carrossel (PaginasPdf — pdf.js sobre o próprio PDF do Storage);
//   barra inferior (CascaPainelFicha):
//     - "Confirmar entrega": registra a entrega presencial de hoje (Aberta → Realizando Exames, como a caixa do
//       detalhe da IS). Entregue (presencial ou por e-mail), vira o estado verde "Entregue em dd/mm" / "Entregue
//       por e-mail" com ícone de check (desfazer a entrega presencial continua na caixa do detalhe da IS);
//     - "Enviar por email ▾": "Para o Inspecionado" (✓ e desabilitado depois do envio) e "Para SEC-JRS" — cada um
//       abre o EnviarGuiasDialog já com o destinatário (o template do e-mail segue o destinatário no servidor);
//     - "Imprimir": abre o PDF numa NOVA guia do navegador (no iPhone com o app instalado, abre na visualização
//       do Safari dentro do app — SFSafariViewController).
// Entrega e e-mail: inspecoes.enviarEmails, com a IS não finalizada; imprimir: quem vê a aba.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { buttonClass } from '../../ui/Button';
import { MenuAcoes } from '../../ui/MenuAcoes';
import { StatusTag } from '../../ui/StatusTag';
import { CascaPainelFicha, type AcaoBarraFicha } from '../CascaPainelFicha';
import { PaginasPdf } from './PaginasPdf';
import { EnviarGuiasDialog } from '../../inspecoes/guias/EnviarGuiasDialog';
import { useNav } from '../../../context/NavContext';
import { canUseFeature } from '../../../config/permissions';
import { registrarEntregaGuias, type InspecaoRecord } from '../../../services/firestoreInspecoes';
import { caminhoGuiasExames, urlDasGuias } from '../../../services/guiasExames';
import { baixarDoServidor } from '../../../services/apiClient';
import { entregaEditavel, guiasEnviadasAoInspecionado, situacaoGuias } from '../../../utils/guiasExamesIS';
import { dataBr, hojeISO } from '../../../utils/inspecoes';

interface Props {
  is: InspecaoRecord;
  /** E-mail do cadastro do inspecionado ('' = sem e-mail). */
  emailCadastrado: string;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

const dataDe = (t: unknown): string => (t as { toDate?: () => Date } | null)?.toDate?.().toLocaleDateString('pt-BR') ?? '';
const ddmm = (iso?: string) => (iso ? dataBr(iso).slice(0, 5) : '');

export const PainelGuias: React.FC<Props> = ({ is, emailCadastrado, onAviso }) => {
  const nav = useNav();
  const usuario = nav?.authUser;
  const podeEnviar = canUseFeature('inspecoes.enviarEmails', usuario?.perfil);
  const apagadas = situacaoGuias(is, true) === 'apagadas';
  const caminho = is.guiasExames?.caminho || caminhoGuiasExames(is.id);

  // URL de download (Imprimir: abre em nova guia) e os bytes do PDF para desenhar as páginas — pelo repasse do
  // servidor (POST /api/arquivos/baixar, só a equipe), porque o Storage não deixa um script de outro domínio
  // ler o arquivo (CORS); sem o repasse, tenta a leitura direta.
  const [url, setUrl] = useState<string | null>(null);
  const [dados, setDados] = useState<ArrayBuffer | null>(null);
  const [erroUrl, setErroUrl] = useState('');
  useEffect(() => {
    setUrl(null); setDados(null); setErroUrl('');
    if (apagadas) return;
    let vivo = true;
    const urlP = urlDasGuias(caminho);
    urlP.then(u => { if (vivo) setUrl(u); }).catch(() => { /* tratado abaixo */ });
    baixarDoServidor('/api/arquivos/baixar', { caminho }, { timeoutMs: 60_000 })
      .catch(() => urlP.then(u => fetch(u)).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); }))
      .then(b => b.arrayBuffer())
      .then(buf => { if (vivo) setDados(buf); })
      .catch(() => { if (vivo) setErroUrl('Não foi possível baixar o PDF das guias.'); });
    return () => { vivo = false; };
  }, [caminho, apagadas, is.guiasExames?.geradoEm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entrega: reflete o clique na hora (o banco confirma pelo onSnapshot).
  const [entregueLocal, setEntregueLocal] = useState(false);
  useEffect(() => { setEntregueLocal(false); }, [is.guiasEntregues]);
  const [salvando, setSalvando] = useState(false);
  const [envio, setEnvio] = useState<'inspecionado' | 'secretaria' | null>(null);

  const entregue = !!is.guiasEntregues || entregueLocal;
  const ativa = is.situacao !== 'finalizada';
  const editavel = podeEnviar && entregaEditavel({ ...is, situacao: is.situacao }) && !salvando;
  const enviadoInspecionado = guiasEnviadasAoInspecionado(is);

  const confirmarEntrega = async () => {
    if (!usuario) return;
    setEntregueLocal(true); setSalvando(true);
    try {
      await registrarEntregaGuias(is, true, usuario.usuario, hojeISO());
      onAviso(`IS ${is.is}: guias entregues.${is.status === 'aberta' ? ' Status: Realizando Exames.' : ''}`);
    } catch (e: any) {
      setEntregueLocal(false);
      onAviso(e?.message || 'Não foi possível registrar a entrega.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const guias = is.guiasExames;
  const geradoEm = dataDe(guias?.geradoEm);
  const acoes: AcaoBarraFicha[] = [];
  if (!apagadas && guias) {
    acoes.push(entregue ? {
      id: 'entregue',
      node: (
        <span role="status" title={is.guiasEntreguesPor ? `Registrado por ${is.guiasEntreguesPor}` : undefined}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-green bg-green-50 text-green-800 text-sm font-bold whitespace-nowrap">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">task_alt</span>
          {is.guiasEntreguesVia === 'email' ? 'Entregue por e-mail' : `Entregue${is.guiasEntreguesEm ? ` em ${ddmm(is.guiasEntreguesEm)}` : ''}`}
        </span>
      ),
    } : {
      id: 'entregar', rotulo: 'Confirmar entrega', icone: 'how_to_reg', variante: 'secondary',
      onClick: () => { void confirmarEntrega(); }, disabled: !editavel, loading: salvando,
    });
    if (podeEnviar && ativa) {
      acoes.push({
        id: 'email',
        node: (
          <MenuAcoes rotulo="Enviar guias por email" classeGatilho="w-full sm:w-auto" botao={{ texto: 'Enviar por email', icone: 'forward_to_inbox' }} itens={[
            {
              rotulo: 'Para o Inspecionado', icone: enviadoInspecionado ? 'check' : 'person', desabilitado: enviadoInspecionado,
              dica: enviadoInspecionado ? `Enviado${dataDe(is.emailGuiasInspecionadoEm) ? ` em ${dataDe(is.emailGuiasInspecionadoEm)}` : ''}` : undefined,
              onClick: () => setEnvio('inspecionado'),
            },
            { rotulo: 'Para SEC-JRS', icone: 'groups', onClick: () => setEnvio('secretaria') },
          ]} />
        ),
      });
    }
    acoes.push({
      id: 'imprimir',
      node: url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`${buttonClass('primary')} w-full sm:w-auto`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">print</span>Imprimir
        </a>
      ) : (
        <span aria-disabled="true" className={`${buttonClass('primary')} w-full sm:w-auto`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">print</span>Imprimir
        </span>
      ),
    });
  }

  const totalExames = guias?.grupos.reduce((n, g) => n + g.exames.length, 0) ?? 0;
  return (
    <CascaPainelFicha
      titulo={`Guias de exames · IS ${is.is}`} icone="receipt_long"
      tituloExtra={entregue ? <StatusTag tone="success">Entregues</StatusTag> : <StatusTag tone="navyOutline">Não entregues</StatusTag>}
      subtitulo={[is.finalidade, geradoEm ? `assinadas em ${geradoEm}` : '', guias ? `${guias.paginas} pág. · ${totalExames} exame${totalExames !== 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')}
      acoes={acoes}
    >
      {apagadas || !guias ? (
        <p className="flex items-center gap-2 text-sm text-ink-3">
          <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">auto_delete</span>
          Guias apagadas 15 dias após a finalização da IS.
        </p>
      ) : (
        <PaginasPdf dados={dados} erroUrl={erroUrl} rotulo={`Páginas das guias de exames da IS ${is.is}`} />
      )}

      {envio && createPortal(
        <EnviarGuiasDialog
          inspecao={is} emailCadastrado={emailCadastrado} destino={envio}
          onClose={() => setEnvio(null)}
          onEnviado={msg => { setEnvio(null); onAviso(msg); }}
        />,
        document.body,
      )}
    </CascaPainelFicha>
  );
};
