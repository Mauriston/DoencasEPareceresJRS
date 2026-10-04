// Ficheiro: components/DGPM406Guide.tsx
import React, { useState } from 'react';
import { Header } from './Header';
import { MarkdownDocPage } from './MarkdownDocPage';
import { PdfViewerPage } from './PdfViewerPage';
import { getDriveEmbedUrl } from '../utils/googleDrive';
import { BookOpen, Paperclip } from 'lucide-react';

interface Chapter {
  id: string;
  chapter: string;
  title: string;
  link: string;
  mdKey?: string;
}

interface Anexo {
  id: string;
  anexo: string;
  title: string;
  link: string;
  mdKey?: string;
}

// Texto-fonte dos capítulos/anexos (extraído da DGPM-406, 9ª Rev). Só os
// itens com arquivo .md correspondente ganham um "mdKey" e abrem a página
// renderizada; os demais continuam apontando para o PDF no Drive.
const chapterModules = import.meta.glob('../content/dgpm-406/capitulo-*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const anexoModules = import.meta.glob('../content/dgpm-406/anexos/anexo-*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const getModule = (modules: Record<string, string>, fileName: string): string | undefined => {
  const key = Object.keys(modules).find(k => k.endsWith(`/${fileName}`));
  return key ? modules[key] : undefined;
};

const toSentenceCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// "Capítulo 4" -> "CAP 4 - {título sem capitalização}"; itens que não seguem
// esse padrão (ex.: "DGPM-406 9ª REV", o card do PDF na íntegra) ficam como estão.
const chapterNavLabel = (item: Chapter): string => {
  const match = item.chapter.match(/^Capítulo (\d+)$/);
  return match ? `CAP ${match[1]} - ${toSentenceCase(item.title)}` : item.chapter;
};

const CHAPTERS: Chapter[] = [
  { id: 'c0', chapter: 'DGPM-406 9ª REV', title: 'NORMAS REGULADORAS PARA INSPEÇÕES DE SAÚDE NA MARINHA', link: 'https://drive.google.com/open?id=1NlCZR1I24epU0-nucN4zHd2fUmO7SOFn' },
  { id: 'c1', chapter: 'Capítulo 1', title: 'ESTRUTURA DO SUBSISTEMA MÉDICO-PERICIAL DA MB', link: 'https://drive.google.com/open?id=1nVX3dkkGHHyWDwVhPdVjw7DWItD0y1sy', mdKey: 'capitulo-01.md' },
  { id: 'c2', chapter: 'Capítulo 2', title: 'PROCESSOS DAS INSPEÇÕES DE SAÚDE NA MB', link: 'https://drive.google.com/open?id=1L7TLBKFsRGaRI-rpaMEVvwg9bV_Y2A58', mdKey: 'capitulo-02.md' },
  { id: 'c3', chapter: 'Capítulo 3', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INGRESSAR NO SERVIÇO ATIVO NA MARIINHA', link: 'https://drive.google.com/open?id=1FielRLlQ7rmcjtaVJafdGF2x1SN90DE3', mdKey: 'capitulo-03.md' },
  { id: 'c4', chapter: 'Capítulo 4', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PÓS-ADMISSIONAIS', link: 'https://drive.google.com/open?id=1lblyFP5bbCKdQyXuO1--JCz1VmlJOG38', mdKey: 'capitulo-04.md' },
  { id: 'c5', chapter: 'Capítulo 5', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PARA ATIVIDADES ESPECIAIS', link: 'https://drive.google.com/open?id=1NlCZR1I24epU0-nucN4zHd2fUmO7SOFn', mdKey: 'capitulo-05.md' },
  { id: 'c6', chapter: 'Capítulo 6', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PÓS-ADMISSIONAIS', link: 'https://drive.google.com/open?id=1Lus5R4-UjHGZ8Ff5sylgfl8cN6qQpeo5', mdKey: 'capitulo-06.md' },
  { id: 'c7', chapter: 'Capítulo 7', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA IS DE JUSTIÇA E DISCIPLINA', link: 'https://drive.google.com/file/d/1fWgkRno35s4AzhA9BJqw_3eHXePYF2YC/view?usp=drivesdk', mdKey: 'capitulo-07.md' },
  { id: 'c8', chapter: 'Capítulo 8', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA EXCLUSÃO DO SERVIÇO ATIVO DA MARINHA', link: 'https://drive.google.com/open?id=1ozUl0F2YNU_SEVkzDI8Dl-CeIn_gN6XC', mdKey: 'capitulo-08.md' },
  { id: 'c9', chapter: 'Capítulo 9', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PARA CONCESSÃO DE BENEFÍCIOS NA MB', link: 'https://drive.google.com/open?id=1JlzkalbaF4R7zrjt8qk9XvFu_jp4BMhL', mdKey: 'capitulo-09.md' },
  { id: 'c10', chapter: 'Capítulo 10', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE DE SERVIDORES CIVIS DA MB', link: 'https://drive.google.com/open?id=1LusI_DszPSwjbLPIJqTJkh1E9hP4RtxQ', mdKey: 'capitulo-10.md' },
  { id: 'c11', chapter: 'Capítulo 11', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA O SERVIÇO MILITAR TEMPORÁRIO', link: 'https://drive.google.com/open?id=1jFWJMETC-w6L8t7ylJyQgBVVQDfKDJNV', mdKey: 'capitulo-11.md' },
  { id: 'c12', chapter: 'Capítulo 12', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE EM GRAU DE REVISÃO E RECURSOS', link: 'https://drive.google.com/file/d/1G5_BSDseclb32cu4T3ZaUVyFnmH5Rf9E/view?usp=drive_link', mdKey: 'capitulo-12.md' },
  { id: 'c13', chapter: 'Capítulo 13', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA COMPROVAÇÃO DE NEXO CAUSAL LABORATIVO', link: 'https://drive.google.com/open?id=1K17M2dVRqpRVpRrqbSaYHvX0Gt31jxdN', mdKey: 'capitulo-13.md' },
  { id: 'c14', chapter: 'Capítulo 14', title: 'PRONTUÁRIO MÉDICO INDIVIDUAL E GUIA SANITÁRIA', link: 'https://drive.google.com/open?id=121eIh1v3YPehkFJktqr70sDI0mSrw6Qs', mdKey: 'capitulo-14.md' },
  { id: 'c15', chapter: 'Capítulo 15', title: 'ESTRUTURA E ROTINA DE FUNCIONAMENTO DO DEPARTAMENTO DE AUDITORIA MÉDICO-PERICIAL', link: 'https://drive.google.com/open?id=1sUi1tvbGMtQkWAcqJc9wXz7n8koZLizM', mdKey: 'capitulo-15.md' },
  { id: 'c16', chapter: 'Capítulo 16', title: 'REVISÃO DE REFORMA POR INCAPACIDADE DEFINITIVA PARA O SAM OU INVALIDEZ', link: 'https://drive.google.com/open?id=1sUi1tvbGMtQkWAcqJc9wXz7n8koZLizM', mdKey: 'capitulo-16.md' },
  { id: 'c17', chapter: 'Capítulo 17', title: 'EXAME TOXICOLÓGICO', link: 'https://drive.google.com/open?id=1CL-hNZs5mhJlfqhJWe4Sq3YJwQPtnE2p', mdKey: 'capitulo-17.md' },
  { id: 'c18', chapter: 'Capítulo 18', title: 'INSPEÇÃO DE SAÚDE DE VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL E DETÉRMINO DE INCAPACIDADE NO SERVIÇO DE PRATICAGEM', link: 'https://drive.google.com/open?id=1_CJ9YqoixMsXp7Hjm25EyISFPitHBLaS', mdKey: 'capitulo-18.md' },
];

const ANEXOS: Anexo[] = [
  { id: 'a1', anexo: 'ANEXO A', title: 'Estrutura básica do SMP', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a2', anexo: 'ANEXO D', title: 'Pedido de parecer DS-2', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a3', anexo: 'ANEXO E', title: 'Atestado de Origem', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a4', anexo: 'ANEXO E', title: 'EXAME DE SANIDADE', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a5', anexo: 'ANEXO G', title: 'Guia de atendimento médico para perícia menor', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a6', anexo: 'ANEXO I', title: 'Papeleta de dispensa', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a7', anexo: 'ANEXO J', title: 'TCLE para realização de exame toxicológico', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a8', anexo: 'ANEXO K', title: 'Perícia menor para gestantes saudáveis', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a9', anexo: 'ANEXO M', title: 'Tramitação de documentos e conclusões médico periciais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a10', anexo: 'ANEXO N', title: 'Padrões psicofísicos admissionais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC', mdKey: 'anexo-n.md' },
  { id: 'a11', anexo: 'ANEXO O', title: 'Exames mínimos', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC', mdKey: 'anexo-o.md' },
  { id: 'a12', anexo: 'ANEXO P', title: 'Padrões psicofísicos pós-admissionais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a13', anexo: 'ANEXO R', title: 'Modelos da processualística do ISO', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a14', anexo: 'ANEXO T', title: 'Reconhecimento de recurso', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a15', anexo: 'ANEXO U', title: 'Doenças previstas em lei', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC', mdKey: 'anexo-u.md' },
  { id: 'a16', anexo: 'ANEXO V', title: 'Documentação médica pertinente às doenças previstas em lei', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC', mdKey: 'anexo-v.md' },
  { id: 'a17', anexo: 'ANEXO W', title: 'Folha de anamnese dirigida', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a18', anexo: 'ANEXO Y', title: 'Cientificação resultado ingresso', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a19', anexo: 'ANEXO AB', title: 'Índices mínimos e condições incapacitantes para o serviço de praticagem', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
];

type SelectedDoc =
  | { kind: 'markdown'; source: 'capitulo' | 'anexo'; title: string; subtitle: string; markdown: string }
  | { kind: 'pdf'; source: 'capitulo' | 'anexo'; title: string; subtitle: string; embedUrl: string };

interface DGPM406GuideProps {
  onBack?: () => void;
}

export const DGPM406Guide: React.FC<DGPM406GuideProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'capitulos' | 'anexos'>('capitulos');
  const [selectedDoc, setSelectedDoc] = useState<SelectedDoc | null>(null);

  const handleChapterClick = (item: Chapter) => {
    const md = item.mdKey && getModule(chapterModules, item.mdKey);
    if (md) {
      setSelectedDoc({ kind: 'markdown', source: 'capitulo', title: item.chapter, subtitle: item.title, markdown: md });
      return;
    }
    const embedUrl = getDriveEmbedUrl(item.link);
    if (embedUrl) {
      setSelectedDoc({ kind: 'pdf', source: 'capitulo', title: item.chapter, subtitle: item.title, embedUrl });
    } else {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAnexoClick = (item: Anexo) => {
    const md = item.mdKey && getModule(anexoModules, item.mdKey);
    if (md) {
      setSelectedDoc({ kind: 'markdown', source: 'anexo', title: item.anexo, subtitle: item.title, markdown: md });
      return;
    }
    const embedUrl = getDriveEmbedUrl(item.link);
    if (embedUrl) {
      setSelectedDoc({ kind: 'pdf', source: 'anexo', title: item.anexo, subtitle: item.title, embedUrl });
    } else {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  };

  // Card fixo à esquerda (desktop) com a lista de capítulos, para navegar
  // entre eles sem voltar à grade — só faz sentido quando o documento aberto
  // é um capítulo (não um anexo).
  const chapterNav = (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-3 max-h-[calc(100vh-140px)] overflow-y-auto">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-2 mb-1 border-b border-gray-100">
        Capítulos
      </h3>
      <nav className="space-y-0.5">
        {CHAPTERS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleChapterClick(item)}
            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold leading-snug transition-colors ${
              selectedDoc?.source === 'capitulo' && selectedDoc.title === item.chapter
                ? 'bg-[#050F41] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {chapterNavLabel(item)}
          </button>
        ))}
      </nav>
    </div>
  );

  if (selectedDoc?.kind === 'markdown') {
    return (
      <MarkdownDocPage
        title={selectedDoc.title}
        subtitle={selectedDoc.subtitle}
        markdown={selectedDoc.markdown}
        onBack={() => setSelectedDoc(null)}
        sidebar={selectedDoc.source === 'capitulo' ? chapterNav : undefined}
      />
    );
  }

  if (selectedDoc?.kind === 'pdf') {
    return (
      <PdfViewerPage
        title={selectedDoc.title}
        subtitle={selectedDoc.subtitle}
        embedUrl={selectedDoc.embedUrl}
        onBack={() => setSelectedDoc(null)}
        sidebar={selectedDoc.source === 'capitulo' ? chapterNav : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 animate-fade-in relative">
      <Header title="DGPM-406" onBack={onBack} />

      <div className="bg-[#050F41] px-2 pt-1 flex justify-around z-10 flex-shrink-0">
        <button
          onClick={() => setActiveTab('capitulos')}
          className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 mx-0.5 text-sm font-bold transition-all focus:outline-none rounded-t-2xl ${activeTab === 'capitulos' ? 'bg-[#079551] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <BookOpen size={16} />
          <span>Capítulos</span>
        </button>

        <button
          onClick={() => setActiveTab('anexos')}
          className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 mx-0.5 text-sm font-bold transition-all focus:outline-none rounded-t-2xl ${activeTab === 'anexos' ? 'bg-[#079551] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Paperclip size={16} />
          <span>Anexos</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full pb-24 md:pb-12">
        {/* Lista simples (não mais cards em grade) — 1 coluna no mobile, 2
            no desktop. O ícone indica o que o clique faz: abre/renderiza um
            PDF (file_open) ou navega para uma página com o texto já
            renderizado (single_arrow, só os itens com .md). */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {activeTab === 'capitulos' ? (
            CHAPTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleChapterClick(item)}
                className="group flex items-center gap-3 bg-white rounded-xl border border-gray-200/60 px-4 py-3 hover:shadow-md hover:border-[#079551] transition-all duration-200 cursor-pointer text-left"
              >
                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-[#050F41] transition-colors shrink-0">
                  {item.mdKey ? 'single_arrow' : 'file_open'}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className="text-[#050F41] font-heading font-bold text-sm leading-snug group-hover:text-[#079551] transition-colors">
                    {item.chapter}
                  </h3>
                  <p className="text-gray-500 font-body text-xs font-medium leading-relaxed line-clamp-2">
                    {item.title}
                  </p>
                </div>
              </button>
            ))
          ) : (
            ANEXOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAnexoClick(item)}
                className="group flex items-center gap-3 bg-white rounded-xl border border-gray-200/60 px-4 py-3 hover:shadow-md hover:border-[#079551] transition-all duration-200 cursor-pointer text-left"
              >
                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-[#050F41] transition-colors shrink-0">
                  {item.mdKey ? 'single_arrow' : 'file_open'}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className="text-[#050F41] font-heading font-bold text-sm leading-snug group-hover:text-[#079551] transition-colors">
                    {item.anexo}
                  </h3>
                  <p className="text-gray-500 font-body text-xs font-medium leading-relaxed line-clamp-2">
                    {item.title}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
