export interface ExtraItem {
  id: string;
  format: 'Vídeos' | 'Aulas' | 'Infográficos' | string;
  title: string;
  description: string;
  link: string;
  youtubeId?: string;
  canvaEmbedUrl?: string;
  canvaViewUrl?: string;
  imageUrl?: string;
}

const GAS_URL = "https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec";

function extractYoutubeId(link: string): string | undefined {
  if (!link) return undefined;
  const embedMatch = link.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  const urlMatch = link.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
  if (urlMatch) return urlMatch[1];
  return undefined;
}

function normalizeFormat(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('aula')) return 'Aulas';
  if (lower.includes('víd') || lower.includes('vid')) return 'Vídeos';
  if (lower.includes('infogr')) return 'Infográficos';
  return raw;
}

function buildCanvaUrls(link: string): { canvaEmbedUrl?: string; canvaViewUrl?: string } {
  const trimmed = link.trim();
  let canvaEmbedUrl: string | undefined;
  let canvaViewUrl: string | undefined;

  if (trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src="([^"]+)"/);
    if (srcMatch) canvaEmbedUrl = srcMatch[1].replace(/&amp;/g, '&');
    const hrefMatch = trimmed.match(/href="([^"]+)"/);
    if (hrefMatch) canvaViewUrl = hrefMatch[1].replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
  } else if (trimmed.includes('canva.com/design/')) {
    canvaViewUrl = trimmed;
    if (trimmed.includes('/view')) {
      const glue = trimmed.includes('?') ? '&' : '?';
      canvaEmbedUrl = trimmed.includes('embed') ? trimmed : `${trimmed}${glue}embed`;
    } else {
      canvaEmbedUrl = trimmed;
    }
  }

  if (!canvaEmbedUrl) canvaEmbedUrl = trimmed;
  if (!canvaViewUrl) canvaViewUrl = canvaEmbedUrl;

  return { canvaEmbedUrl, canvaViewUrl };
}

export async function fetchExtras(): Promise<ExtraItem[]> {
  const response = await fetch(`${GAS_URL}?action=getExtras`);
  if (!response.ok) throw new Error('Falha ao buscar dados do servidor.');

  const json = await response.json();
  if (!json.success || !json.data) throw new Error(json.message || 'Resposta inválida do servidor.');

  return json.data.map((row: any, idx: number) => {
    const format = normalizeFormat(row.format || '');
    const link: string = row.link || '';
    const youtubeId = format === 'Vídeos' ? extractYoutubeId(link) : undefined;
    const canva = format === 'Aulas' ? buildCanvaUrls(link) : {};

    return {
      id: `extra-${idx}`,
      format,
      title: row.title || '',
      description: row.description || '',
      link,
      youtubeId,
      imageUrl: row.imageUrl || undefined,
      ...canva,
    };
  });
}