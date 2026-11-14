// Ficheiro: components/ConcursosJRS.tsx
// Página Concursos: alterna entre a lista, a planilha de um concurso, a criação (/concursos/novo) e as
// visões de um dia (/concursos/dia/AAAA-MM-DD) e de IS atrasadas (/concursos/atrasadas).
import React, { useEffect, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Card } from './ui/Card';
import { useParams } from 'react-router-dom';
import { useBreadcrumbs } from '../context/BreadcrumbContext';
import { hojeISO } from '../utils/inspecoes';
import { concursoPath } from '../config/routes';
import { useDiasConcursos } from '../hooks/useDiasConcursos';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';
import { listarConcursos, observarConcursos, type ConcursoRecord } from '../services/firestoreConcursos';
import { EmptyState } from './ui/EmptyState';
import { AccessDenied } from './ui/AccessDenied';
import { isoParaBR } from './concursos/compartilhado';
import { ModalRegistrarMensagem } from './concursos/ModalRegistrarMensagem';
import { ModalImportarCsv } from './concursos/ModalImportarCsv';
import { ConcursosLista } from './concursos/ConcursosLista';
import { ConcursoDetalhe } from './concursos/ConcursoDetalhe';

// =========================================================================
// DIA DE CONCURSO — candidatos agendados no dia, uma tabela por concurso (linhas agrupadas por concurso)
// =========================================================================

const Carregando: React.FC = () => (
  <div className="flex justify-center py-16" role="status" aria-label="Carregando"><span className="material-symbols-outlined animate-spin text-[32px] text-navy" aria-hidden="true">progress_activity</span></div>
);

/** P2: a rota tem o seu h1 (PageHeader) e cada concurso entra como seção h2 (ConcursoDetalhe embutido). */
const CabecalhoRota: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <Container size="data" className="pt-6 md:pt-8">
    <PageHeader title={title} description={description} />
  </Container>
);

const ConcursosDia: React.FC<{ data: string }> = ({ data }) => {
  const nav = useNav();
  const { dias, concursosAtivos } = useDiasConcursos();
  useBreadcrumbs([{ label: isoParaBR(data) }]);
  const doDia = dias.filter(d => d.data === data);
  const totalDia = doDia.reduce((s, d) => s + d.total, 0);
  return (
    <div>
      <CabecalhoRota
        title={`Concursos de ${isoParaBR(data).slice(0, 5)}`}
        description={concursosAtivos === null ? undefined : doDia.length === 0 ? isoParaBR(data) : `${isoParaBR(data)} · ${doDia.length} concurso${doDia.length === 1 ? '' : 's'} · ${totalDia} candidato${totalDia === 1 ? '' : 's'}`}
      />
      {concursosAtivos === null ? <Carregando /> : doDia.length === 0 ? (
        <Container size="data" className="pt-6">
          <Card padding="none">
            <EmptyState icon="event_busy" title={`Nenhum concurso agendado em ${isoParaBR(data)}`} description="Volte à lista e escolha um dia em Próximos dias." />
          </Card>
        </Container>
      ) : (
        doDia.map(d => (
          <section key={d.concursoId} aria-label={d.nome}>
            <ConcursoDetalhe concursoId={d.concursoId} dataFixa={data} embutido onVoltar={() => nav?.navigate('/concursos')} />
          </section>
        ))
      )}
    </div>
  );
};

/** IS atrasadas de todos os concursos Em andamento / Em breve, uma tabela por concurso (vem da Início). */
const ConcursosAtrasadas: React.FC = () => {
  const nav = useNav();
  const { dias, concursosAtivos } = useDiasConcursos();
  useBreadcrumbs([{ label: 'IS atrasadas' }]);
  const hoje = hojeISO();
  const concursoIds = [...new Set(dias.filter(d => d.data < hoje && d.candidatos.some(c => !c.finalizado)).map(d => d.concursoId))];
  return (
    <div>
      <CabecalhoRota
        title="IS de concurso atrasadas"
        description={concursosAtivos === null ? undefined : 'Candidatos agendados até ontem e ainda não finalizados.'}
      />
      {concursosAtivos === null ? <Carregando /> : concursoIds.length === 0 ? (
        <Container size="data" className="pt-6">
          <Card padding="none">
            <EmptyState icon="event_available" title="Nenhuma IS atrasada" description="Todas as IS de concurso agendadas até ontem já foram finalizadas." />
          </Card>
        </Container>
      ) : (
        concursoIds.map(id => (
          <section key={id}>
            <ConcursoDetalhe concursoId={id} apenasAtrasadas embutido onVoltar={() => nav?.navigate('/concursos')} />
          </section>
        ))
      )}
    </div>
  );
};

// =========================================================================
// COMPONENTE PRINCIPAL — alterna entre a lista de concursos e o detalhe
// =========================================================================

export const ConcursosJRS: React.FC = () => {
  const nav = useNav();
  // O concurso aberto é um nível da URL: /concursos/:concursoId (deep link e botão voltar).
  const { concursoId: concursoParam } = useParams();
  const { data: diaParam } = useParams();
  const selectedConcursoId = concursoParam ? decodeURIComponent(concursoParam) : null;
  const setSelectedConcursoId = (id: string | null) => nav?.navigate(id ? concursoPath(id) : '/concursos');
  const perfil = nav?.authUser?.perfil;
  const isAdmin = perfil === 'admin';
  const podeRegistrarMensagem = canUseFeature('concursosJRS.registrarMensagemPDF', perfil);
  const podeGerarMinutaResultados = canUseFeature('concursosJRS.gerarMinutaResultados', perfil);
  const podeImportarCsv = canUseFeature('concursosJRS.importarCsv', perfil);
  const podeAbrirEncerrar = canUseFeature('concursosJRS.abrirEncerrarConcurso', perfil);
  const podeRegistrarMensagemArquivo = canUseFeature('concursosJRS.registrarMensagemArquivo', perfil);
  const podeListarMensagens = canUseFeature('concursosJRS.listarMensagens', perfil);
  const podeAdicionarCandidato = canUseFeature('concursosJRS.adicionarCandidato', perfil);
  const podeEnviarExames = canUseFeature('concursosJRS.enviarExamesCandidato', perfil);
  const podeVisualizarTabela = canUseFeature('concursosJRS.visualizarTabela', perfil);

  const [concursos, setConcursos] = useState<ConcursoRecord[]>([]);
  const [loadingConcursos, setLoadingConcursos] = useState(true);
  const [showImportarCsvModal, setShowImportarCsvModal] = useState(false);

  const carregarConcursos = async () => {
    setLoadingConcursos(true);
    try {
      setConcursos(await listarConcursos());
    } finally {
      setLoadingConcursos(false);
    }
  };

  useEffect(() => {
    setLoadingConcursos(true);
    return observarConcursos(
      lista => { setConcursos(lista); setLoadingConcursos(false); },
      () => setLoadingConcursos(false),
    );
  }, []);

  const handleFecharModalUpload = (concursoIdCriado?: string) => {
    carregarConcursos();
    setSelectedConcursoId(concursoIdCriado ?? null);
  };

  const handleFecharModalImportarCsv = (concursoIdCriado?: string) => {
    setShowImportarCsvModal(false);
    carregarConcursos();
    if (concursoIdCriado) setSelectedConcursoId(concursoIdCriado);
  };

  // /concursos/novo: criação do concurso como página própria (F60), com a mesma permissão do botão.
  if (diaParam) return <ConcursosDia data={diaParam} />;
  if (selectedConcursoId === 'atrasadas') return <ConcursosAtrasadas />;

  if (selectedConcursoId === 'novo') {
    return podeRegistrarMensagem
      ? <ModalRegistrarMensagem onClose={handleFecharModalUpload} isAdmin={isAdmin} />
      : <AccessDenied pagina="Novo concurso" />;
  }

  if (selectedConcursoId) {
    return (
      <ConcursoDetalhe
        concursoId={selectedConcursoId}
        onVoltar={() => { setSelectedConcursoId(null); carregarConcursos(); }}
      />
    );
  }

  return (
    <>
      <ConcursosLista
        concursos={concursos}
        loading={loadingConcursos}
        perfil={perfil}
        podeRegistrarMensagem={podeRegistrarMensagem}
        podeGerarMinutaResultados={podeGerarMinutaResultados}
        podeImportarCsv={podeImportarCsv}
        podeAbrirEncerrar={podeAbrirEncerrar}
        podeRegistrarMensagemArquivo={podeRegistrarMensagemArquivo}
        podeListarMensagens={podeListarMensagens}
        podeAdicionarCandidato={podeAdicionarCandidato}
        podeEnviarExames={podeEnviarExames}
        podeVisualizarTabela={podeVisualizarTabela}
        onSelecionar={setSelectedConcursoId}
        onNovoConcursoClick={() => nav?.navigate('/concursos/novo')}
        onImportarCsvClick={() => setShowImportarCsvModal(true)}
        onRecarregar={carregarConcursos}
      />
      {showImportarCsvModal && <ModalImportarCsv onClose={handleFecharModalImportarCsv} />}
    </>
  );
};
