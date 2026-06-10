export interface ExtraItem {
  id: string; // generated unique id
  format: 'Vídeos' | 'Aulas' | string;
  title: string;
  description: string;
  link: string;
  youtubeId?: string; // Extracted youtube ID if any
  canvaEmbedUrl?: string; // Extracted canva embed URL if format = Aulas
  canvaViewUrl?: string; // Extracted canva view URL if format = Aulas
  imageUrl?: string;
}

/**
 * Character-by-character CSV parser that correctly handles escaped quotes and commas within cells.
 */
function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentToken = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentToken += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentToken += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentToken.trim());
        currentToken = '';
      } else if (char === '\n' || char === '\r') {
        row.push(currentToken.trim());
        currentToken = '';
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip LF if CRLF
        }
      } else {
        currentToken += char;
      }
    }
  }

  if (currentToken !== '' || row.length > 0) {
    row.push(currentToken.trim());
    result.push(row);
  }

  return result;
}

/**
 * Parses a YouTube ID from an embed code or URL
 */
function extractYoutubeId(link: string): string | undefined {
  if (!link) return undefined;
  // If it's a raw embed iframe string, extract from src
  // Match youtube.com/embed/XXXXXXXXXXX or similar
  const embedMatch = link.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  // Fallback match standard youtube URLs: youtube.com/watch?v=XXXXXXXXXXX or youtu.be/XXXXXXXXXXX
  const urlParamsMatch = link.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
  if (urlParamsMatch && urlParamsMatch[1]) {
    return urlParamsMatch[1];
  }

  return undefined;
}

const SHEET_ID = '1vWl2ANgGDYLa5vTtCTUrjitDnuqz8IA3qGhD1Ha9C6Q';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

export async function fetchExtras(): Promise<ExtraItem[]> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error('Falha ao buscar dados da planilha do Google.');
    }
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length <= 1) {
      return [];
    }

    // Skip header row
    const dataRows = rows.slice(1);
    
    return dataRows.map((row, idx) => {
      const rawFormat = (row[0] || '').trim();
      const formatStr = rawFormat.toLowerCase();
      let format = rawFormat;
      if (formatStr.includes('aula')) {
        format = 'Aulas';
      } else if (formatStr.includes('víd') || formatStr.includes('vid')) {
        format = 'Vídeos';
      } else if (formatStr.includes('infogr')) {
        format = 'Infográficos';
      }
      
      const title = row[1] || '';
      const description = row[2] || '';
      const link = row[3] || '';
      const youtubeId = format === 'Vídeos' ? extractYoutubeId(link) : undefined;

      let canvaEmbedUrl: string | undefined = undefined;
      let canvaViewUrl: string | undefined = undefined;

      if (format === 'Aulas') {
        const trimmed = link.trim();
        // Extract iframe src if HTML code snippet
        if (trimmed.includes('<iframe')) {
          const srcMatch = trimmed.match(/src="([^"]+)"/);
          if (srcMatch && srcMatch[1]) {
            canvaEmbedUrl = srcMatch[1].replace(/&amp;/g, '&');
          }
          
          // Also try to extract the href from <a> tag if any
          const hrefMatch = trimmed.match(/href="([^"]+)"/);
          if (hrefMatch && hrefMatch[1]) {
            // Unescape entities like &#x2F; and &amp;
            canvaViewUrl = hrefMatch[1]
              .replace(/&#x2F;/g, '/')
              .replace(/&amp;/g, '&');
          }
        }
        
        // If not HTML but a direct design link
        if (!canvaEmbedUrl && trimmed.includes('canva.com/design/')) {
          canvaViewUrl = trimmed;
          if (trimmed.includes('/view')) {
            if (!trimmed.includes('embed')) {
              const glue = trimmed.includes('?') ? '&' : '?';
              canvaEmbedUrl = `${trimmed}${glue}embed`;
            } else {
              canvaEmbedUrl = trimmed;
            }
          } else {
            canvaEmbedUrl = trimmed;
          }
        }
        
        // Fallbacks
        if (!canvaEmbedUrl) {
          canvaEmbedUrl = trimmed;
        }
        if (!canvaViewUrl) {
          canvaViewUrl = canvaEmbedUrl;
        }
      }

      return {
        id: `extra-${idx}`,
        format,
        title,
        description,
        link,
        youtubeId,
        canvaEmbedUrl,
        canvaViewUrl,
        imageUrl: row[4] || undefined
      };
    });
  } catch (error) {
    console.error('Erro no fetchExtras:', error);
    throw error;
  }
}
