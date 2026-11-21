# Assessor Pericial DGPM-406 (skill)

Fonte única da skill **Assessor Pericial DGPM-406**, usada no Claude Code e, futuramente, no "Assessor IA" do app
(servidor → Claude no Vertex AI).

- `skill/SKILL.md` — instruções da skill.
- `skill/referencias/` — DGPM-406 (capítulos e Anexos N/O/U/V em `.md`), formas de conclusão, CID-10, corpos e
  quadros, legislação, Portaria 3.551/2021, errata (`correcoes.md`).
- `skill/scripts/buscar-is.mjs` — leitura (somente leitura) da IS no Firestore: IS, inspecionado, PDFs já
  transcritos, entrevistas e histórico.

Fora do repo:
- **PDF integral da DGPM-406** (`referencias/dgpm-406/DGPM-406-9a-rev.pdf`, 2,7 MB): fica no Firebase Storage e
  na skill instalada; só é lido para os Anexos não transcritos.
- **Correções do dia a dia**: previstas para o Firestore (`config/assessorCorrecoes`), com precedência sobre a
  errata, e consolidadas aqui periodicamente.

Nenhum dado real de inspecionado deve ser gravado nesta pasta.
