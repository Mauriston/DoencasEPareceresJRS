import React, { useState, useEffect } from "react";
import { Header } from "./Header";

interface Template {
  Template_Documento: string;
  Descrição: string;
  ID: string;
  Link_Copia: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    Template_Documento: "DGPM-406 Anexo E",
    Descrição: "Exame de Sanidade",
    ID: "1WDthrv8_6sQjxZytEfWr2eYJ34o3LLmxWNroT55F0jc",
    Link_Copia: "https://docs.google.com/document/d/1WDthrv8_6sQjxZytEfWr2eYJ34o3LLmxWNroT55F0jc/copy",
  },
  {
    Template_Documento: "DGPM-406 Anexo E Campo III",
    Descrição: "Atestado de Origem Campo III Registro Médico",
    ID: "1AMJCB_XJ2jpEvgcP218OOWORdKls3lEDGP6qPt05-V0",
    Link_Copia: "https://docs.google.com/document/d/1AMJCB_XJ2jpEvgcP218OOWORdKls3lEDGP6qPt05-V0/copy",
  },
  {
    Template_Documento: "DGPM-406 Anexo G",
    Descrição: "Guia Atendimento de Perícia Menor",
    ID: "130zzSeDRw2nso-QgfwIjOzbyet67Uvy1FQzL-V5X6do",
    Link_Copia: "https://docs.google.com/document/d/130zzSeDRw2nso-QgfwIjOzbyet67Uvy1FQzL-V5X6do/copy",
  },
  {
    Template_Documento: "DGPM-406 Anexo I",
    Descrição: "Papeleta de Dispensa",
    ID: "1HD-iUN18lDQHpCEM08uKjw_ZEl5qPk9aHtM2T_46xWk",
    Link_Copia: "https://docs.google.com/document/d/1HD-iUN18lDQHpCEM08uKjw_ZEl5qPk9aHtM2T_46xWk/copy",
  },
  {
    Template_Documento: "DGPM-406 Anexo J",
    Descrição: "TCLE Exame Toxicológico",
    ID: "1nf_3DnxbimFgQ-0xlDR6OaT7jnxoFwI6XtRJMECvbU8",
    Link_Copia: "https://docs.google.com/document/d/1nf_3DnxbimFgQ-0xlDR6OaT7jnxoFwI6XtRJMECvbU8/copy",
  },
  {
    Template_Documento: "DGPM-406 Anexo K",
    Descrição: "Perícia Menor Gestante Saudável",
    ID: "15Y8tp3oJxri6-CpQzGK9ydykHvTQV34zmWOgD8pI8VM",
    Link_Copia: "https://docs.google.com/document/d/15Y8tp3oJxri6-CpQzGK9ydykHvTQV34zmWOgD8pI8VM/copy",
  },
  {
    Template_Documento: "DGPM-406 Anexo T",
    Descrição: "Reconhecimento de Recurso",
    ID: "1HLg5ndXWqdfeUfRtFA6pm-4PXW_lvo-LNPZ14ThzmSo",
    Link_Copia: "https://docs.google.com/document/d/1HLg5ndXWqdfeUfRtFA6pm-4PXW_lvo-LNPZ14ThzmSo/copy",
  },
];

export const TemplatesGuide: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const GAS_URL = "https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec";
        const resp = await fetch(`${GAS_URL}?action=getTemplatesDocumentos`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.data && data.data.length > 0) {
            setTemplates(data.data);
          }
        }
      } catch (err) {
        console.error("Falha ao buscar templates do sheets, usando lista padrão:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-light relative pb-20">
      <Header title="TEMPLATES" />

      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading && templates === DEFAULT_TEMPLATES ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <span className="material-symbols-outlined animate-spin mb-2" style={{ fontSize: "32px" }}>sync</span>
            <p className="text-sm">Buscando da planilha...</p>
          </div>
        ) : (
          templates.map((tpl, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:shadow transition-shadow">
              <div className="flex flex-col pr-4 flex-1">
                <h3 className="font-heading font-medium text-navy text-base mb-1">{tpl.Template_Documento}</h3>
                <p className="text-gray-600 text-sm font-body">{tpl.Descrição}</p>
              </div>
              <a
                href={tpl.Link_Copia}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(tpl.Link_Copia, '_blank');
                }}
                title="Copiar Template"
                className="shrink-0 p-2 text-navy hover:text-gold hover:bg-navy/5 rounded-full transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>content_copy</span>
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
