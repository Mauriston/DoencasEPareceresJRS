import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  app.post("/api/gemini/analyze-image", async (req, res) => {
    try {
      const { image, prompt } = req.body; // image as base64 string
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      };
      
      const textPart = {
        text: prompt || "Extraia informações relevantes dessa imagem",
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts: [imagePart, textPart] },
      });

      res.json({ success: true, text: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Transcrição literal do PDF da mensagem administrativa (SIGAD-MB) do menu
  // Concursos, usada no lugar do OCR do Google Drive (Apps Script). O texto
  // devolvido é interpretado no cliente pelos mesmos regex já validados de
  // CodeConcursos.gs (ver utils/concursosUtils.ts) — este endpoint só
  // transcreve, nunca interpreta ou resume o conteúdo.
  app.post("/api/concursos/ocr-pdf", async (req, res) => {
    try {
      const { fileBase64, mimeType } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const filePart = {
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: fileBase64,
        },
      };

      const textPart = {
        text: [
          'Transcreva TODO o texto deste documento de forma EXATA E LITERAL, do início ao fim.',
          'Não resuma, não parafraseie, não corrija erros de digitação nem formate como Markdown.',
          'Preserve números, matrículas, datas e nomes exatamente como aparecem no documento, mantendo as quebras de linha originais sempre que possível.',
          'Responda apenas com o texto transcrito, sem nenhum comentário ou explicação adicional.',
        ].join(' '),
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts: [filePart, textPart] },
      });

      res.json({ success: true, texto: response.text });
    } catch (error: any) {
      console.error("Gemini OCR error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
