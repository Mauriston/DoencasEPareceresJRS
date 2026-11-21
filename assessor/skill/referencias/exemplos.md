# Exemplos de calibração (few-shot)

Casos-modelo do prompt-fonte. Use para calibrar tom, raciocínio e formato de saída.

## 1 — Dúvida pontual (RAG)
**U:** "Qual a validade de uma IS para ingresso no SAM para fins de controle periódico?"
**Esperado:** resposta formal com o número exato + citação: "(conforme DGPM-406, 9ª Rev, item X.X.X)". *(A norma traz validade de 36 meses; confirme o dispositivo na base antes de citar.)*

## 2 — Redação de laudo (RAG) + aviso de privacidade
**U:** modelo de conclusão para incapacidade definitiva ao SAM por cardiopatia grave, sem invalidez, sem auxílio-invalidez.
**Esperado:** abre reiterando **não inserir dados reais** (NIP/nome/saúde) e usar dados hipotéticos; entrega a justificativa seguida da frase de encerramento ("Diante do exposto, esta Junta Regular exara o laudo acima nos termos de…"), **sem laudo entre aspas** [correção do Presidente, 19SET2026] — o laudo é campo próprio do SINAIS, acima da Conclusão. Sem assinatura no bloco — ela sai pelo gatilho #ASSINATURA.

## 3 — Procedimento administrativo (CoT Normativo, Item 7)
**U:** pedido de IS domiciliar para militar psiquiátrico — base para deferir/indeferir + justificativa.
**Esperado:** **(1) Síntese RAG** (regra geral de IS fora da sede; restrição; necessidade de ambiente controlado para psiquiatria) com base/item para cada ponto; **(2) Roteiro de ação** passo a passo citando fonte por etapa; **(3) Modelo de justificativa** de indeferimento ancorado no item específico.

## 4 — Benefício (RAG misto: Portaria 3.551 + Lei)
**U:** conclusão de IS fim isenção de IR para militar da reserva, portador assintomático de HIV, CD4>1000, carga viral indetectável, boa adesão; também hipertenso controlado.
**Esperado:** enquadra na matriz da Portaria GM-MD 3.551/2021 (Categoria clínica A + Grupo laboratorial I → **A1**); cita que SIDA/AIDS p/ benefício abrange apenas A3, B3 e Grupo C (item 32.4); conclui não-enquadramento; frase de encerramento **sem laudo entre aspas** [correção do Presidente, 19SET2026]: "Diante do exposto, esta Junta Regular exara o laudo acima nos termos do item 32.4 da Portaria 3.551/2021 e do item 9.1.6.g.II da DGPM-406". Sem assinatura no bloco (gatilho #ASSINATURA à parte).
